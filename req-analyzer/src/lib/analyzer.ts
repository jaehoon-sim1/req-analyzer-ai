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
import {
  SUMMARY_PROMPT,
  FEATURES_PROMPT,
  TEST_POINTS_PROMPT,
  AMBIGUITY_PROMPT,
  MISSING_PROMPT,
  QA_QUESTIONS_PROMPT,
} from './prompts/v1';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

// 입력 텍스트가 너무 길면 앞부분만 사용 (토큰 오버플로 방지)
const MAX_INPUT_CHARS = 30000;

function truncateInput(text: string): string {
  if (text.length <= MAX_INPUT_CHARS) return text;
  const truncated = text.slice(0, MAX_INPUT_CHARS);
  return truncated + `\n\n[... 이하 ${(text.length - MAX_INPUT_CHARS).toLocaleString()}자 생략 — 위 내용을 기반으로 분석해 주세요.]`;
}

async function callClaude(systemPrompt: string, userInput: string): Promise<string> {
  const input = truncateInput(userInput);
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: input }],
  });

  // stop_reason이 max_tokens이면 JSON이 잘렸을 가능성 높음
  if (message.stop_reason === 'max_tokens') {
    // 더 짧은 입력으로 재시도
    const shorterInput = truncateInput(userInput.slice(0, Math.min(userInput.length, 15000)));
    const retry = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: systemPrompt + '\n\n중요: 응답을 반드시 완전한 JSON으로 출력하세요. 항목 수를 줄이더라도 JSON 구조가 깨지지 않아야 합니다.',
      messages: [{ role: 'user', content: shorterInput }],
    });
    const retryText = retry.content.find((b) => b.type === 'text');
    return retryText?.text || '';
  }

  const textBlock = message.content.find((b) => b.type === 'text');
  return textBlock?.text || '';
}

function parseJSON<T>(text: string): T {
  let str = text.trim();

  // Remove markdown code fences (```json ... ``` or ``` ... ```)
  str = str.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');

  // If still not starting with { or [, try to extract JSON object/array
  str = str.trim();
  if (!str.startsWith('{') && !str.startsWith('[')) {
    const match = str.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      str = match[1];
    }
  }

  return JSON.parse(str);
}

function parseAndValidate<S extends z.ZodTypeAny>(text: string, schema: S): z.infer<S> {
  const parsed = parseJSON<unknown>(text);
  return schema.parse(parsed);
}

async function callClaudeWithRetry(
  systemPrompt: string,
  userInput: string,
  retries = 1
): Promise<string> {
  try {
    return await callClaude(systemPrompt, userInput);
  } catch (err) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return callClaudeWithRetry(systemPrompt, userInput, retries - 1);
    }
    throw err;
  }
}

type SectionKey = keyof Omit<AnalysisResult, 'metadata'>;

interface SectionConfig {
  key: SectionKey;
  prompt: string;
  label: string;
}

const SECTIONS: SectionConfig[] = [
  { key: 'summary', prompt: SUMMARY_PROMPT, label: '요약 생성' },
  { key: 'features', prompt: FEATURES_PROMPT, label: '기능 목록 추출' },
  { key: 'testPoints', prompt: TEST_POINTS_PROMPT, label: '테스트 포인트 도출' },
  { key: 'ambiguity', prompt: AMBIGUITY_PROMPT, label: '모호성 탐지' },
  { key: 'missingRequirements', prompt: MISSING_PROMPT, label: '누락 요구사항 탐지' },
  { key: 'qaQuestions', prompt: QA_QUESTIONS_PROMPT, label: 'QA 질문 생성' },
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

  const result: Partial<AnalysisResult> = {};
  const failedSections: string[] = [];

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
    let response: string;
    try {
      response = await callClaudeWithRetry(section.prompt, input, 1);
    } catch (err) {
      // API call failed after retry — fall through to fallback
      console.error(`Failed to call Claude for section ${section.key}:`, err);
      failedSections.push(section.key);
      completedCount += 1;
      onProgress?.({
        type: 'error',
        section: section.key,
        message: `${section.label} 실패: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
      return;
    }

    try {
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
    } catch (parseErr) {
      // Parse/validation failed — retry the API call once more
      console.error(`Parse failed for section ${section.key}, retrying:`, parseErr);
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const retryResponse = await callClaude(section.prompt, input);
        switch (section.key) {
          case 'summary':
            result.summary = parseAndValidate(retryResponse, SectionSchemas.summary) as SummarySection;
            break;
          case 'features':
            result.features = parseAndValidate(retryResponse, SectionSchemas.features) as FeatureSection;
            break;
          case 'testPoints':
            result.testPoints = parseAndValidate(retryResponse, SectionSchemas.testPoints) as TestPointSection;
            break;
          case 'ambiguity':
            result.ambiguity = parseAndValidate(retryResponse, SectionSchemas.ambiguity) as AmbiguitySection;
            break;
          case 'missingRequirements':
            result.missingRequirements = parseAndValidate(retryResponse, SectionSchemas.missingRequirements) as MissingSection;
            break;
          case 'qaQuestions':
            result.qaQuestions = parseAndValidate(retryResponse, SectionSchemas.qaQuestions) as QAQuestionSection;
            break;
        }
      } catch (retryErr) {
        // Both attempts failed — use fallback empty data and track in failedSections
        console.error(`Retry also failed for section ${section.key}, using fallback:`, retryErr);
        failedSections.push(section.key);
        onProgress?.({
          type: 'error',
          section: section.key,
          message: `${section.label} 실패: ${retryErr instanceof Error ? retryErr.message : 'Unknown error'}`,
        });
      }
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
  await Promise.allSettled(tasks.map((task) => task()));

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
      ...(failedSections.length > 0 ? { failedSections } : {}),
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
