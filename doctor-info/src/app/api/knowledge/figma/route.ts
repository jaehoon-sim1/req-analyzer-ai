import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/server';
import { getAnthropicClient, CHAT_MODEL } from '@/lib/anthropic';
import { chunkText } from '@/lib/chunker';
import { createEmbedding } from '@/lib/embedding';
import {
  extractFigmaFileKey,
  parseFigmaFile,
  getFigmaFrameImages,
} from '@/lib/figma/parser';

export async function POST(request: NextRequest) {
  try {
    const { figma_url, title } = await request.json();

    if (!figma_url) {
      return NextResponse.json({ error: 'figma_url이 필요합니다.' }, { status: 400 });
    }

    // Figma API 토큰 확인
    const figmaToken = process.env.FIGMA_API_TOKEN;
    if (!figmaToken) {
      return NextResponse.json(
        { error: 'Figma API 토큰이 설정되지 않았습니다. 설정 탭에서 입력해주세요.' },
        { status: 400 }
      );
    }

    // 파일 키 추출
    const fileKey = extractFigmaFileKey(figma_url);
    if (!fileKey) {
      return NextResponse.json(
        { error: '유효하지 않은 Figma URL입니다.' },
        { status: 400 }
      );
    }

    // Figma 파일 파싱
    const { title: figmaTitle, content, pages } = await parseFigmaFile(fileKey, figmaToken);

    let fullContent = content;

    // 주요 프레임 이미지 → Claude Vision 분석 (선택적)
    try {
      const anthropic = getAnthropicClient();
      const allFrameIds = pages
        .flatMap(p => p.frames.map(f => f.id))
        .slice(0, 5); // 최대 5개 프레임

      if (allFrameIds.length > 0) {
        const imageUrls = await getFigmaFrameImages(fileKey, allFrameIds, figmaToken);
        const imageEntries = Object.entries(imageUrls);

        if (imageEntries.length > 0) {
          const visionResults: string[] = [];

          for (const [frameId, imageUrl] of imageEntries.slice(0, 3)) {
            if (!imageUrl) continue;
            try {
              // 이미지 다운로드
              const imgRes = await fetch(imageUrl);
              if (!imgRes.ok) continue;
              const imgBuffer = await imgRes.arrayBuffer();
              const base64 = Buffer.from(imgBuffer).toString('base64');
              const mediaType = 'image/png';

              // Claude Vision으로 화면 분석
              const frameName = pages
                .flatMap(p => p.frames)
                .find(f => f.id === frameId)?.name || frameId;

              const visionResponse = await anthropic.messages.create({
                model: CHAT_MODEL,
                max_tokens: 1024,
                messages: [{
                  role: 'user',
                  content: [
                    {
                      type: 'image',
                      source: { type: 'base64', media_type: mediaType, data: base64 },
                    },
                    {
                      type: 'text',
                      text: `이것은 "${frameName}" 화면의 Figma 디자인입니다.
UI 요소, 레이아웃, 기능, 사용자 흐름을 분석하여 한국어로 간결하게 설명해주세요.`,
                    },
                  ],
                }],
              });

              const visionText =
                visionResponse.content[0].type === 'text'
                  ? visionResponse.content[0].text
                  : '';

              if (visionText) {
                visionResults.push(`### 화면 분석: ${frameName}\n${visionText}`);
              }
            } catch {
              // 개별 이미지 분석 실패 시 무시
            }
          }

          if (visionResults.length > 0) {
            fullContent += '\n\n## AI 화면 분석\n' + visionResults.join('\n\n');
          }
        }
      }
    } catch {
      // Vision 분석 실패해도 텍스트 내용으로 진행
    }

    // 업로드 사용자 확인 (선택적)
    let userId = '00000000-0000-0000-0000-000000000000';
    try {
      const { createSupabaseServer } = await import('@/lib/supabase/server');
      const supabase = await createSupabaseServer();
      const { data } = await supabase.auth.getUser();
      if (data.user) userId = data.user.id;
    } catch { /* 비로그인 */ }

    const admin = createSupabaseAdmin();

    // 지식 문서 생성
    const { data: doc, error: docError } = await admin
      .from('knowledge_documents')
      .insert({
        title: title || figmaTitle,
        source_type: 'figma',
        original_filename: `figma:${fileKey}`,
        uploaded_by: userId,
      })
      .select('id')
      .single();

    if (docError) throw docError;

    // 청킹 + 임베딩 + 저장
    const chunks = chunkText(fullContent);
    let savedCount = 0;

    for (const chunk of chunks) {
      try {
        const embedding = await createEmbedding(chunk.content);
        await admin.from('knowledge_chunks').insert({
          document_id: doc.id,
          content: chunk.content,
          embedding,
          metadata: {
            chunk_index: chunk.index,
            figma_file_key: fileKey,
            figma_url,
          },
        });
        savedCount++;
      } catch (err) {
        console.error(`청크 ${chunk.index} 임베딩 실패:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      document_id: doc.id,
      figma_title: figmaTitle,
      total_chunks: chunks.length,
      saved_chunks: savedCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Figma 연동 실패';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
