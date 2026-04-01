'use client';

import { useCallback, useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import type { Conversation } from '@/types';

interface SidebarProps {
  currentConversationId?: string;
  onSelectConversation: (id: string | null) => void;
  onNavigate: (page: 'chat' | 'knowledge' | 'settings') => void;
  currentPage: 'chat' | 'knowledge' | 'settings';
}

export function Sidebar({
  currentConversationId,
  onSelectConversation,
  onNavigate,
  currentPage,
}: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [userName, setUserName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(30);
      if (data) setConversations(data);
    } catch {
      // 실패 무시
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const supabase = createSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        if (profile) setUserName(profile.name);
        loadConversations();
      }
    } catch {
      // 비로그인 상태
    }
  }, [loadConversations]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkAuth();
  }, [checkAuth]);

  async function handleLogin() {
    window.location.href = '/login';
  }

  async function handleLogout() {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUserName('');
    setConversations([]);
  }

  const navItems = [
    {
      id: 'chat' as const,
      label: '채팅',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
    {
      id: 'knowledge' as const,
      label: '지식 관리',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      id: 'settings' as const,
      label: '설정',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="w-64 h-screen bg-gray-900 border-r border-gray-800 flex flex-col"
      data-testid="sidebar"
    >
      {/* 로고 */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            DI
          </div>
          <span className="text-white font-semibold">닥터인포</span>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="p-2 space-y-1">
        {navItems.map((item) => {
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                currentPage === item.id
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* 새 대화 버튼 */}
      <div className="px-2 mt-2">
        <button
          onClick={() => onSelectConversation(null)}
          className="w-full px-3 py-2 text-sm bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors"
          data-testid="new-chat-btn"
        >
          + 새 대화
        </button>
      </div>

      {/* 대화 목록 (로그인 시에만) */}
      <div className="flex-1 overflow-y-auto p-2 mt-2 space-y-0.5">
        {isLoggedIn ? (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                currentConversationId === conv.id
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800/50'
              }`}
            >
              {conv.title || '새 대화'}
            </button>
          ))
        ) : (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-gray-600">
              로그인하면 대화 이력이 저장됩니다
            </p>
          </div>
        )}
      </div>

      {/* 하단: 로그인/로그아웃 */}
      <div className="p-3 border-t border-gray-800">
        {isLoggedIn ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 truncate">{userName}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              data-testid="logout-btn"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="w-full px-3 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
            data-testid="login-btn"
          >
            로그인
          </button>
        )}
      </div>
    </div>
  );
}
