import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase/server';
import { getAnthropicClient, CHAT_MODEL } from '@/lib/anthropic';
import { chunkText } from '@/lib/chunker';
import { createEmbedding } from '@/lib/embedding';

// 대화 → 지식 변환 (로그인/비로그인 모두 지원)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_id, title, messages: clientMessages } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'title이 필요합니다.' },
        { status: 400 }
      );
    }

    // 인증 확인 (선택적)
    let userId: string | null = null;
    try {
      const supabase = await createSupabaseServer();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id || null;
    } catch {
      // 비로그인 상태
    }

    let conversationText = '';

    if (clientMessages && Array.isArray(clientMessages) && clientMessages.length > 0) {
      // 비로그인 사용자: 클라이언트에서 보낸 대화 내용 사용
      conversationText = clientMessages
        .map((m: { role: string; content: string }) =>
          `${m.role === 'user' ? '질문' : '답변'}: ${m.content}`
        )
        .join('\n\n');
    } else if (conversation_id && userId) {
      // 로그인 사용자: DB에서 대화 조회
      const supabase = await createSupabaseServer();
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;

      if (!messages || messages.length === 0) {
        return NextResponse.json({ error: '대화 내용이 없습니다.' }, { status: 400 });
      }

      conversationText = messages
        .map((m: { role: string; content: string }) =>
          `${m.role === 'user' ? '질문' : '답변'}: ${m.content}`
        )
        .join('\n\n');
    } else {
      return NextResponse.json(
        { error: '대화 내용이 필요합니다. (conversation_id 또는 messages)' },
        { status: 400 }
      );
    }

    // Claude로 대화 요약
    const anthropic = getAnthropicClient();

    const summary = await anthropic.messages.create({
      model: CHAT_MODEL,
      max_tokens: 2048,
      system: '대화 내용을 지식 베이스에 저장할 수 있도록 핵심 정보를 정리해주세요. Q&A 형태로 구조화하고, 중요한 사실과 절차를 명확히 기술하세요.',
      messages: [{ role: 'user', content: conversationText }],
    });

    const summaryText =
      summary.content[0].type === 'text' ? summary.content[0].text : '';

    if (!summaryText) {
      return NextResponse.json({ error: '요약 생성에 실패했습니다.' }, { status: 500 });
    }

    const admin = createSupabaseAdmin();

    // 지식 문서 생성 (비로그인은 uploaded_by를 시스템 ID로)
    const { data: doc, error: docError } = await admin
      .from('knowledge_documents')
      .insert({
        title,
        source_type: 'conversation',
        uploaded_by: userId || '00000000-0000-0000-0000-000000000000',
      })
      .select('id')
      .single();

    if (docError) throw docError;

    // 청킹 + 임베딩 + 저장
    const chunks = chunkText(summaryText);
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
            source_conversation: conversation_id || 'anonymous',
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
      total_chunks: chunks.length,
      saved_chunks: savedCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '학습 실패';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
