import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/server';
import { parseFile } from '@/lib/parsers';
import { chunkText } from '@/lib/chunker';
import { createEmbedding } from '@/lib/embedding';

// Vercel 제한 우회: Supabase Storage에서 꺼내 처리
// 실제 파일 업로드는 클라이언트에서 Supabase Storage로 직접 전송
// 이 API는 Storage에 올라간 파일을 파싱 + 임베딩하는 역할

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storage_path, filename, title } = body;

    if (!storage_path || !filename) {
      return NextResponse.json(
        { error: 'storage_path와 filename이 필요합니다.' },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdmin();

    // Storage에서 파일 다운로드
    const { data: fileData, error: downloadError } = await admin.storage
      .from('knowledge-files')
      .download(storage_path);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: `파일 다운로드 실패: ${downloadError?.message}` },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    // 파일 파싱
    let text: string;
    try {
      text = await parseFile(buffer, filename);
    } catch (parseErr) {
      return NextResponse.json(
        { error: `파일 파싱 실패: ${parseErr instanceof Error ? parseErr.message : '알 수 없는 오류'}` },
        { status: 400 }
      );
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: '파일에서 텍스트를 추출할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 업로드한 사용자 확인 (선택적)
    let userId = '00000000-0000-0000-0000-000000000000';
    try {
      const { createSupabaseServer } = await import('@/lib/supabase/server');
      const supabase = await createSupabaseServer();
      const { data } = await supabase.auth.getUser();
      if (data.user) userId = data.user.id;
    } catch {
      // 비로그인 모드
    }

    // 지식 문서 레코드 생성
    const { data: doc, error: docError } = await admin
      .from('knowledge_documents')
      .insert({
        title: title || filename,
        source_type: 'file',
        original_filename: filename,
        uploaded_by: userId,
      })
      .select('id')
      .single();

    if (docError) throw docError;

    // 청킹 + 임베딩 + 저장
    const chunks = chunkText(text);
    let savedCount = 0;
    const errors: string[] = [];

    for (const chunk of chunks) {
      try {
        const embedding = await createEmbedding(chunk.content);
        await admin.from('knowledge_chunks').insert({
          document_id: doc.id,
          content: chunk.content,
          embedding,
          metadata: {
            chunk_index: chunk.index,
            filename,
            storage_path,
          },
        });
        savedCount++;
      } catch (err) {
        errors.push(`청크 ${chunk.index}: ${err instanceof Error ? err.message : '실패'}`);
      }
    }

    // 처리 완료 후 Storage 파일 삭제 (선택: 보관하려면 주석 처리)
    await admin.storage.from('knowledge-files').remove([storage_path]);

    return NextResponse.json({
      success: true,
      document_id: doc.id,
      total_chunks: chunks.length,
      saved_chunks: savedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '업로드 처리 실패';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
