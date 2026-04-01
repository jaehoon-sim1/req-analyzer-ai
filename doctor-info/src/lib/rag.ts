import { createQueryEmbedding } from './embedding';
import { createSupabaseAdmin } from './supabase/server';
import type { KnowledgeSource } from '@/types';

export interface RAGContext {
  sources: KnowledgeSource[];
  contextText: string;
}

export async function retrieveContext(query: string): Promise<RAGContext> {
  const supabase = createSupabaseAdmin();

  const queryEmbedding = await createQueryEmbedding(query);

  const { data: chunks, error } = await supabase.rpc('search_knowledge', {
    query_embedding: queryEmbedding,
    match_threshold: 0.4,
    match_count: 5,
  });

  if (error) {
    console.error('벡터 검색 오류:', error);
    return { sources: [], contextText: '' };
  }

  if (!chunks || chunks.length === 0) {
    return { sources: [], contextText: '' };
  }

  // 문서 제목 조회
  const documentIds = [...new Set(chunks.map((c: { document_id: string }) => c.document_id))];
  const { data: documents } = await supabase
    .from('knowledge_documents')
    .select('id, title')
    .in('id', documentIds);

  const docTitleMap = new Map(
    (documents || []).map((d: { id: string; title: string }) => [d.id, d.title])
  );

  const sources: KnowledgeSource[] = chunks.map((chunk: {
    document_id: string;
    content: string;
    similarity: number;
  }) => ({
    document_id: chunk.document_id,
    title: docTitleMap.get(chunk.document_id) || '알 수 없는 문서',
    chunk_content: chunk.content,
    similarity: chunk.similarity,
  }));

  const contextText = sources
    .map((s, i) => `[참고자료 ${i + 1}: ${s.title}]\n${s.chunk_content}`)
    .join('\n\n');

  return { sources, contextText };
}

export function buildSystemPrompt(contextText: string): string {
  const base = `당신은 "닥터인포"라는 AI 비서입니다.
팀의 내부 지식을 기반으로 질문에 답변합니다.
답변 시 다음 규칙을 따르세요:
- 참고자료가 있으면 그것을 기반으로 정확하게 답변하세요.
- 참고자료에 없는 내용은 "현재 학습된 자료에서는 해당 정보를 찾을 수 없습니다"라고 안내하세요.
- 한국어로 답변하세요.
- 친절하고 전문적인 톤을 유지하세요.`;

  if (!contextText) {
    return base + '\n\n현재 참고할 수 있는 학습 자료가 없습니다. 일반 지식으로 답변하세요.';
  }

  return `${base}\n\n--- 참고자료 ---\n${contextText}`;
}
