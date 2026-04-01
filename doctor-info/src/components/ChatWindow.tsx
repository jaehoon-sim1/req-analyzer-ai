'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/lib/useChat';
import { MessageBubble } from './MessageBubble';

interface ChatWindowProps {
  conversationId?: string;
  onConversationCreated?: (id: string) => void;
  onLearnConversation?: (conversationId: string, clientMessages?: { role: string; content: string }[]) => void;
  compact?: boolean;
}

export function ChatWindow({
  conversationId,
  onConversationCreated,
  onLearnConversation,
  compact = false,
}: ChatWindowProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    isLoading,
    error,
    sources,
    sendMessage,
    stopGeneration,
    conversationId: currentConvId,
  } = useChat({ conversationId, onConversationCreated });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div
      className={`flex flex-col ${compact ? 'h-full' : 'h-screen'} bg-gray-950`}
      data-testid="chat-window"
    >
      {/* 헤더 */}
      {!compact && (
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              DI
            </div>
            <h1 className="text-lg font-semibold text-white">닥터인포</h1>
          </div>
          {onLearnConversation && messages.length >= 4 && (
            <button
              onClick={() => {
                const clientMsgs = messages
                  .filter(m => m.content.length > 0)
                  .map(m => ({ role: m.role, content: m.content }));
                onLearnConversation(currentConvId || '', clientMsgs);
              }}
              className="px-3 py-1.5 text-sm bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30 transition-colors"
              data-testid="learn-conversation-btn"
            >
              이 대화를 지식으로 저장
            </button>
          )}
        </header>
      )}

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-blue-400">DI</span>
            </div>
            <p className="text-lg font-medium text-gray-300">
              안녕하세요! 닥터인포입니다.
            </p>
            <p className="text-sm mt-1">무엇이든 물어보세요.</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {error && (
          <div
            className="mx-auto max-w-2xl p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm"
            data-testid="chat-error"
          >
            {error}
          </div>
        )}

        {sources.length > 0 && (
          <div className="mx-auto max-w-2xl">
            <details className="text-sm text-gray-400">
              <summary className="cursor-pointer hover:text-gray-300">
                참고자료 {sources.length}건
              </summary>
              <ul className="mt-2 space-y-1 pl-4">
                {sources.map((s, i) => (
                  <li key={i} className="text-gray-500">
                    {s.title} (유사도: {(s.similarity * 100).toFixed(0)}%)
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="px-4 pb-4">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-end gap-2 bg-gray-900 border border-gray-700 rounded-xl p-3 focus-within:border-blue-500 transition-colors"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none max-h-32"
            data-testid="chat-input"
          />
          {isLoading ? (
            <button
              type="button"
              onClick={stopGeneration}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
              data-testid="stop-btn"
            >
              중단
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              data-testid="send-btn"
            >
              전송
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
