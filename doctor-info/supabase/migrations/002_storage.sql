-- ============================================
-- 닥터인포 - Supabase Storage 버킷 설정
-- SQL Editor에서 실행하세요
-- ============================================

-- 지식 문서용 Storage 버킷 생성 (500MB 제한)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'knowledge-files',
  'knowledge-files',
  false,
  524288000, -- 500MB (bytes)
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update set
  file_size_limit = 524288000,
  allowed_mime_types = array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ];

-- Storage RLS 정책: 인증된 사용자는 업로드 가능
create policy "인증된 사용자 업로드"
  on storage.objects for insert
  with check (
    bucket_id = 'knowledge-files'
    and auth.role() = 'authenticated'
  );

-- 비인증 사용자도 업로드 가능 (비로그인 모드 지원)
create policy "비인증 사용자 업로드"
  on storage.objects for insert
  with check (
    bucket_id = 'knowledge-files'
    and auth.role() = 'anon'
  );

-- 서비스 롤은 모든 작업 가능
create policy "서비스 롤 전체 접근"
  on storage.objects for all
  using (
    bucket_id = 'knowledge-files'
    and auth.role() = 'service_role'
  );
