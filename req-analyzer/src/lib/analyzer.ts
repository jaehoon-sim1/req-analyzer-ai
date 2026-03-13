import { z } from 'zod';
import anthropic from './anthropic';
import type {
  AnalysisResult,
  SummarySection,
  FeatureSection,
  TestPointSection,
  AmbiguitySection,
  MissingSection,
  QAQuestionSection,
  StreamEvent,
} from '@/types/analysis';
import { SectionSchemas } from '@/types/schemas';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

async function callClaude(systemPrompt: string, userInput: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userInput }],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  return textBlock?.text || '';
}

function parseJSON<T>(text: string): T {
  // Extract JSON from markdown code blocks if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr);
}

function parseAndValidate<S extends z.ZodTypeAny>(text: string, schema: S): z.infer<S> {
  const parsed = parseJSON<unknown>(text);
  return schema.parse(parsed);
}

type SectionKey = keyof Omit<AnalysisResult, 'metadata'>;

interface SectionConfig {
  key: SectionKey;
  promptImport: string;
  label: string;
}

const SECTIONS: SectionConfig[] = [
  { key: 'summary', promptImport: 'SUMMARY_PROMPT', label: '요약 생성' },
  { key: 'features', promptImport: 'FEATURES_PROMPT', label: '기능 목록 추출' },
  { key: 'testPoints', promptImport: 'TEST_POINTS_PROMPT', label: '테스트 포인트 도출' },
  { key: 'ambiguity', promptImport: 'AMBIGUITY_PROMPT', label: '모호성 탐지' },
  { key: 'missingRequirements', promptImport: 'MISSING_PROMPT', label: '누락 요구사항 탐지' },
  { key: 'qaQuestions', promptImport: 'QA_QUESTIONS_PROMPT', label: 'QA 질문 생성' },
];

export async function analyzeRequirements(
  input: string,
  onProgress?: (event: StreamEvent) => void
): Promise<AnalysisResult> {
  const startTime = Date.now();

  onProgress?.({
    type: 'analysis_start',
    progress: 0,
    message: '분석을 시작합니다...',
  });

  // Dynamically import prompts
  const prompts = await import('./prompts/v1');

  const result: Partial<AnalysisResult> = {};

  // Fire section_start for all sections immediately before parallel execution
  SECTIONS.forEach((section) => {
    onProgress?.({
      type: 'section_start',
      section: section.key,
      progress: 0,
      message: `${section.label} 중...`,
    });
  });

  // Track completed count for incremental progress reporting
  let completedCount = 0;

  // Build per-section async tasks
  const tasks = SECTIONS.map((section) => async () => {
    const systemPrompt = (prompts as Record<string, string>)[section.promptImport];
    const response = await callClaude(systemPrompt, input);

    switch (section.key) {
      case 'summary':
        result.summary = parseAndValidate(response, SectionSchemas.summary) as SummarySection;
        break;
      case 'features':
        result.features = parseAndValidate(response, SectionSchemas.features) as FeatureSection;
        break;
      case 'testPoints':
        result.testPoints = parseAndValidate(response, SectionSchemas.testPoints) as TestPointSection;
        break;
      case 'ambiguity':
        result.ambiguity = parseAndValidate(response, SectionSchemas.ambiguity) as AmbiguitySection;
        break;
      case 'missingRequirements':
        result.missingRequirements = parseAndValidate(response, SectionSchemas.missingRequirements) as MissingSection;
        break;
      case 'qaQuestions':
        result.qaQuestions = parseAndValidate(response, SectionSchemas.qaQuestions) as QAQuestionSection;
        break;
    }

    completedCount += 1;
    const progress = Math.round((completedCount / SECTIONS.length) * 100);

    onProgress?.({
      type: 'section_complete',
      section: section.key,
      progress,
      message: `${section.label} 완료`,
      data: result[section.key],
    });
  });

  // Run all 6 section API calls concurrently
  const settledResults = await Promise.allSettled(tasks.map((task) => task()));

  // Report errors for any rejected tasks
  settledResults.forEach((settled, index) => {
    if (settled.status === 'rejected') {
      const section = SECTIONS[index];
      const error = settled.reason;
      console.error(`Failed to analyze section ${section.key}:`, error);
      onProgress?.({
        type: 'error',
        section: section.key,
        message: `${section.label} 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  });

  const processingTimeMs = Date.now() - startTime;

  const analysisResult: AnalysisResult = {
    summary: result.summary || { overview: '', keyPoints: [] },
    features: result.features || { features: [] },
    testPoints: result.testPoints || { testPoints: [] },
    ambiguity: result.ambiguity || { items: [] },
    missingRequirements: result.missingRequirements || { items: [] },
    qaQuestions: result.qaQuestions || { questions: [] },
    metadata: {
      analyzedAt: new Date().toISOString(),
      inputLength: input.length,
      processingTimeMs,
      modelUsed: MODEL,
    },
  };

  onProgress?.({
    type: 'analysis_complete',
    progress: 100,
    message: '분석 완료!',
    data: analysisResult.metadata,
  });

  return analysisResult;
}
