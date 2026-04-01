import { NextRequest } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getAnthropicClient, CHAT_MODEL } from '@/lib/anthropic';
import { retrieveContext, buildSystemPrompt } from '@/lib/rag';
import type { ChatSSEEvent } from '@/types';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  function sendEvent(event: ChatSSEEvent): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
  }

  try {
    const body = await request.json();
    const { message, conversation_id, history: clientHistory } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: '메시지를 입력해주세요.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 인증 확인 (선택적)
    let user = null;
    let convId = conversation_id;

    try {
      const supabase = await createSupabaseServer();
      const { data } = await supabase.auth.getUser();
      user = data.user;

      // 로그인 사용자: DB에 대화 저장
      if (user) {
        if (!convId) {
          const { data: conv, error } = await supabase
            .from('conversations')
            .insert({ user_id: user.id, title: message.slice(0, 50) })
            .select('id')
            .single();

          if (!error && conv) convId = conv.id;
        }

        if (convId) {
          await supabase.from('messages').insert({
            conversation_id: convId,
            role: 'user',
            content: message,
          });
        }
      }
    } catch {
      // 인증 실패 시 비로그인 모드로 진행
    }

    // RAG 컨텍스트 검색 (Voyage API 키가 없으면 스킵)
    let sources: ChatSSEEvent['sources'] = [];
    let contextText = '';
    try {
      const rag = await retrieveContext(message);
      sources = rag.sources;
      contextText = rag.contextText;
    } catch {
      // RAG 실패 시 일반 채팅으로 진행
    }

    const systemPrompt = buildSystemPrompt(contextText);

    // 대화 이력 구성
    let messages: { role: 'user' | 'assistant'; content: string }[];

    if (user && convId) {
      // 로그인 사용자: DB에서 이력 조회
      const supabase = await createSupabaseServer();
      const { data: history } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        .limit(10);

      messages = (history || []).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
    } else if (clientHistory && Array.isArray(clientHistory)) {
      // 비로그인 사용자: 클라이언트에서 보낸 이력 사용
      messages = clientHistory.slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      // 현재 메시지 추가
      messages.push({ role: 'user', content: message });
    } else {
      messages = [{ role: 'user', content: message }];
    }

    // SSE 스트리밍 응답
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(sendEvent({
            type: 'start',
            conversation_id: convId || undefined,
          }));

          if (sources && sources.length > 0) {
            controller.enqueue(sendEvent({ type: 'sources', sources }));
          }

          const anthropic = getAnthropicClient();
          let fullResponse = '';

          const response = anthropic.messages.stream({
            model: CHAT_MODEL,
            max_tokens: 4096,
            system: systemPrompt,
            messages,
          });

          for await (const event of response) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const text = event.delta.text;
              fullResponse += text;
              controller.enqueue(sendEvent({ type: 'delta', content: text }));
            }
          }

          // 로그인 사용자: AI 응답 저장
          if (user && convId) {
            try {
              const supabase = await createSupabaseServer();
              await supabase.from('messages').insert({
                conversation_id: convId,
                role: 'assistant',
                content: fullResponse,
                sources: sources && sources.length > 0 ? sources : [],
              });
            } catch {
              // 저장 실패해도 응답은 계속 전달
            }
          }

          controller.enqueue(sendEvent({ type: 'done' }));
          controller.close();
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
          controller.enqueue(sendEvent({ type: 'error', error: errorMessage }));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '서버 오류';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
