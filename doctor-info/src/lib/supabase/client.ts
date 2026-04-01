import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function createSupabaseClient(): SupabaseClient {
  if (client) return client;

  // 빌드 시점(프리렌더링)에서 환경변수 없이도 통과하도록 더미값 사용
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  client = createBrowserClient(url, key);
  return client;
}
