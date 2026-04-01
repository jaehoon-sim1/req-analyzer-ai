-- ============================================
-- 닥터인포 (Doctor Info) - 초기 DB 스키마
-- Supabase PostgreSQL + pgvector
-- ============================================

-- pgvector 확장 활성화
create extension if not exists vector;

-- 사용자 프로필 (Supabase Auth와 연동)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null default '',
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "프로필 조회는 인증된 사용자" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "자기 프로필 수정" on public.profiles
  for update using (auth.uid() = id);

-- 새 사용자 가입 시 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 대화
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create policy "자기 대화 조회" on public.conversations
  for select using (auth.uid() = user_id);

create policy "자기 대화 생성" on public.conversations
  for insert with check (auth.uid() = user_id);

create policy "자기 대화 수정" on public.conversations
  for update using (auth.uid() = user_id);

create policy "자기 대화 삭제" on public.conversations
  for delete using (auth.uid() = user_id);

-- 메시지
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb default '[]',
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "대화 소유자만 메시지 접근" on public.messages
  for all using (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

-- 지식 문서
create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text not null check (source_type in ('file', 'conversation', 'manual')),
  original_filename text,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.knowledge_documents enable row level security;

-- 지식은 모든 인증 사용자가 조회 가능 (팀 공유)
create policy "지식 문서 조회" on public.knowledge_documents
  for select using (auth.role() = 'authenticated');

create policy "지식 문서 생성" on public.knowledge_documents
  for insert with check (auth.role() = 'authenticated');

-- 관리자만 삭제 가능
create policy "관리자만 지식 삭제" on public.knowledge_documents
  for delete using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- 지식 청크 (벡터 검색용)
create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  content text not null,
  embedding vector(1024),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.knowledge_chunks enable row level security;

create policy "지식 청크 조회" on public.knowledge_chunks
  for select using (auth.role() = 'authenticated');

create policy "지식 청크 생성" on public.knowledge_chunks
  for insert with check (auth.role() = 'authenticated');

create policy "지식 청크 삭제" on public.knowledge_chunks
  for delete using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- 벡터 유사도 검색 인덱스
create index knowledge_chunks_embedding_idx on public.knowledge_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 벡터 유사도 검색 함수
create or replace function public.search_knowledge(
  query_embedding vector(1024),
  match_threshold float default 0.5,
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    kc.id,
    kc.document_id,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks kc
  where 1 - (kc.embedding <=> query_embedding) > match_threshold
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;

-- Teams 봇 사용자 매핑 (Teams ID ↔ 닥터인포 사용자)
create table public.teams_user_mappings (
  id uuid primary key default gen_random_uuid(),
  teams_user_id text unique not null,
  teams_user_name text not null,
  profile_id uuid references public.profiles(id) on delete set null,
  teams_conversation_ref jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.teams_user_mappings enable row level security;

create policy "Teams 매핑 서버 접근" on public.teams_user_mappings
  for all using (auth.role() = 'service_role');

-- updated_at 자동 갱신 트리거
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function public.update_updated_at();
