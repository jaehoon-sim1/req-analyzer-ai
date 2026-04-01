-- knowledge_documents의 source_type에 'figma' 추가
alter table public.knowledge_documents
  drop constraint if exists knowledge_documents_source_type_check;

alter table public.knowledge_documents
  add constraint knowledge_documents_source_type_check
  check (source_type in ('file', 'conversation', 'manual', 'figma'));
