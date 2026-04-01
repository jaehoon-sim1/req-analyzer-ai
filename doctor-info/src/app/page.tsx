'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatWindow } from '@/components/ChatWindow';
import { KnowledgeManager } from '@/components/KnowledgeManager';
import { SettingsPage } from '@/components/SettingsPage';

export default function HomePage() {
  const [currentPage, setCurrentPage] = useState<'chat' | 'knowledge' | 'settings'>('chat');
  const [conversationId, setConversationId] = useState<string | undefined>();

  function handleSelectConversation(id: string | null) {
    setConversationId(id || undefined);
    setCurrentPage('chat');
  }

  function handleLearnConversation(convId: string, clientMessages?: { role: string; content: string }[]) {
    const title = prompt('이 대화의 지식 제목을 입력하세요:');
    if (!title) return;

    // 비로그인: 클라이언트 메시지 전달 / 로그인: conversation_id로 DB 조회
    const payload: Record<string, unknown> = { title };
    if (convId) payload.conversation_id = convId;
    if (clientMessages && clientMessages.length > 0) payload.messages = clientMessages;

    fetch('/api/knowledge/learn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert(`지식으로 저장되었습니다! (${data.saved_chunks}개 청크)`);
        } else {
          alert(`오류: ${data.error}`);
        }
      });
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        currentConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNavigate={setCurrentPage}
        currentPage={currentPage}
      />

      <main className="flex-1">
        {currentPage === 'chat' && (
          <ChatWindow
            key={conversationId || 'new'}
            conversationId={conversationId}
            onConversationCreated={setConversationId}
            onLearnConversation={handleLearnConversation}
          />
        )}
        {currentPage === 'knowledge' && <KnowledgeManager />}
        {currentPage === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}
