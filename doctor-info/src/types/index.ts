// ============================================
// 닥터인포 (Doctor Info) - 타입 정의
// ============================================

// --- 사용자 ---
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  created_at: string;
}

// --- 대화 ---
export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

// --- 메시지 ---
export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: KnowledgeSource[];
  created_at: string;
}

export interface KnowledgeSource {
  document_id: string;
  title: string;
  chunk_content: string;
  similarity: number;
}

// --- 지식 ---
export type KnowledgeSourceType = 'file' | 'conversation' | 'manual';

export interface KnowledgeDocument {
  id: string;
  title: string;
  source_type: KnowledgeSourceType;
  original_filename: string | null;
  uploaded_by: string;
  chunk_count?: number;
  created_at: string;
}

export interface KnowledgeChunk {
  id: string;
  document_id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  created_at: string;
}

// --- API 요청/응답 ---
export interface ChatRequest {
  message: string;
  conversation_id?: string;
}

export interface ChatSSEEvent {
  type: 'start' | 'delta' | 'sources' | 'done' | 'error';
  content?: string;
  conversation_id?: string;
  sources?: KnowledgeSource[];
  error?: string;
}

export interface KnowledgeUploadRequest {
  title: string;
  content?: string;
  source_type: KnowledgeSourceType;
}

export interface LearnFromConversationRequest {
  conversation_id: string;
  title: string;
}

// --- Teams 봇 ---
export interface TeamsBotMessage {
  text: string;
  user_id: string;
  user_name: string;
  conversation_ref: string;
}
