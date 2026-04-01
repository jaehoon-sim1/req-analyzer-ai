'use client';

import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const supabase = createSupabaseClient();

    supabase.auth.getUser().then((result) => {
      const currentUser = result.data.user;
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        window.location.href = '/login';
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          window.location.href = '/login';
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return fallback || (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
