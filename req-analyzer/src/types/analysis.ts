// 분석 결과 전체 구조
export interface AnalysisResult {
  summary: SummarySection;
  features: FeatureSection;
  testPoints: TestPointSection;
  ambiguity: AmbiguitySection;
  missingRequirements: MissingSection;
  qaQuestions: QAQuestionSection;
  metadata: AnalysisMetadata;
}

// 신뢰도 타입
export type ConfidenceLevel = 'high' | 'medium' | 'low';

// 요약 섹션 (FR-002)
export interface SummarySection {
  overview: string;
  keyPoints: string[];
  confidence?: ConfidenceLevel;
}

// 기능 목록 (FR-003)
export interface FeatureSection {
  features: Feature[];
  confidence?: ConfidenceLevel;
}

export interface Feature {
  id: number;
  name: string;
  description: string;
  category?: string;
}

// 테스트 포인트 (FR-004)
export interface TestPointSection {
  testPoints: TestPoint[];
  confidence?: ConfidenceLevel;
}

export interface TestPoint {
  id: number;
  category: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

// 모호한 요구사항 (FR-005)
export interface AmbiguitySection {
  items: AmbiguityItem[];
  confidence?: ConfidenceLevel;
}

export interface AmbiguityItem {
  originalText: string;
  issue: string;
  suggestion: string;
  severity: 'critical' | 'warning' | 'info';
}

// 누락 가능 요구사항 (FR-006)
export interface MissingSection {
  items: MissingItem[];
  confidence?: ConfidenceLevel;
}

export interface MissingItem {
  category: string;
  description: string;
  reason: string;
}

// QA 질문 (FR-007)
export interface QAQuestionSection {
  questions: QAQuestion[];
  confidence?: ConfidenceLevel;
}

export interface QAQuestion {
  id: number;
  question: string;
  context: string;
  priority: 'high' | 'medium' | 'low';
}

// 메타데이터
export interface AnalysisMetadata {
  analyzedAt: string;
  inputLength: number;
  processingTimeMs: number;
  modelUsed: string;
  failedSections?: string[];
}

// 스트리밍 이벤트
export type StreamEventType =
  | 'analysis_start'
  | 'section_start'
  | 'section_complete'
  | 'analysis_complete'
  | 'error';

export interface StreamEvent {
  type: StreamEventType;
  section?: keyof Omit<AnalysisResult, 'metadata'>;
  data?: unknown;
  progress?: number; // 0-100
  message?: string;
}

// 입력 타입
export interface AnalysisInput {
  text: string;
  options?: AnalysisOptions;
}

export interface AnalysisOptions {
  language?: 'ko' | 'en';
  includeConfidence?: boolean;
}
