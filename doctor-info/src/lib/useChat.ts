'use client';

import { useState, useCallback, useRef } from 'react';
import type { Message, KnowledgeSource, ChatSSEEvent } from '@/types';

interface UseChatOptions {
  conversationId?: string;
  onConversationCreated?: (id: string) => void;
}

export function useChat(options?: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef(options?.conversationId);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);
    setSources([]);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationIdRef.current || '',
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationIdRef.current || '',
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      abortRef.current = new AbortController();

      // 비로그인 모드: 클라이언트 이력을 서버에 전달
      const currentMessages = messages.filter(m => m.content.length > 0);
      const history = currentMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversation_id: conversationIdRef.current,
          history,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '요청에 실패했습니다.');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('스트리밍을 시작할 수 없습니다.');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6);

          try {
            const event: ChatSSEEvent = JSON.parse(jsonStr);

            switch (event.type) {
              case 'start':
                if (event.conversation_id) {
                  conversationIdRef.current = event.conversation_id;
                  options?.onConversationCreated?.(event.conversation_id);
                }
                break;
              case 'delta':
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === 'assistant') {
                    last.content += event.content || '';
                  }
                  return updated;
                });
                break;
              case 'sources':
                if (event.sources) {
                  setSources(event.sources);
                  setMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === 'assistant') {
                      last.sources = event.sources;
                    }
                    return updated;
                  });
                }
                break;
              case 'error':
                setError(event.error || '알 수 없는 오류');
                break;
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [isLoading, messages, options]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  return {
    messages,
    setMessages,
    isLoading,
    error,
    sources,
    sendMessage,
    stopGeneration,
    conversationId: conversationIdRef.current,
  };
}
