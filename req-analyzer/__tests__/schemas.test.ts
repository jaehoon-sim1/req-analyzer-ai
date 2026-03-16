import { describe, it, expect } from 'vitest';
import { SectionSchemas } from '@/types/schemas';

describe('Zod Schemas — SummarySection', () => {
  it('유효한 요약 데이터를 통과시킨다', () => {
    const valid = {
      overview: '로그인 시스템에 대한 요구사항입니다.',
      keyPoints: ['이메일 로그인', '비밀번호 정책'],
    };
    expect(() => SectionSchemas.summary.parse(valid)).not.toThrow();
  });

  it('confidence 필드가 optional이다', () => {
    const withConfidence = {
      overview: '요약',
      keyPoints: [],
      confidence: 'high',
    };
    const result = SectionSchemas.summary.parse(withConfidence);
    expect(result.confidence).toBe('high');
  });

  it('overview가 누락되면 실패한다', () => {
    const invalid = { keyPoints: ['포인트'] };
    expect(() => SectionSchemas.summary.parse(invalid)).toThrow();
  });

  it('keyPoints가 배열이 아니면 실패한다', () => {
    const invalid = { overview: '요약', keyPoints: '잘못된 타입' };
    expect(() => SectionSchemas.summary.parse(invalid)).toThrow();
  });
});

describe('Zod Schemas — FeatureSection', () => {
  it('유효한 기능 목록을 통과시킨다', () => {
    const valid = {
      features: [
        { id: 1, name: '로그인', description: '이메일 로그인', category: '인증' },
        { id: 2, name: '검색', description: '상품 검색' },
      ],
    };
    const result = SectionSchemas.features.parse(valid);
    expect(result.features).toHaveLength(2);
    expect(result.features[1].category).toBeUndefined();
  });

  it('features가 빈 배열이면 통과한다', () => {
    const valid = { features: [] };
    expect(() => SectionSchemas.features.parse(valid)).not.toThrow();
  });

  it('feature에 id가 없으면 실패한다', () => {
    const invalid = { features: [{ name: '로그인', description: '설명' }] };
    expect(() => SectionSchemas.features.parse(invalid)).toThrow();
  });
});

describe('Zod Schemas — TestPointSection', () => {
  it('유효한 테스트 포인트를 통과시킨다', () => {
    const valid = {
      testPoints: [
        { id: 1, category: '기능', description: '로그인 성공', priority: 'high' },
      ],
    };
    expect(() => SectionSchemas.testPoints.parse(valid)).not.toThrow();
  });

  it('잘못된 priority 값은 실패한다', () => {
    const invalid = {
      testPoints: [
        { id: 1, category: '기능', description: '테스트', priority: 'critical' },
      ],
    };
    expect(() => SectionSchemas.testPoints.parse(invalid)).toThrow();
  });
});

describe('Zod Schemas — AmbiguitySection', () => {
  it('유효한 모호성 항목을 통과시킨다', () => {
    const valid = {
      items: [
        {
          originalText: '빠르게 응답해야 한다',
          issue: '정량적 기준 없음',
          suggestion: '응답 시간 2초 이내로 명시',
          severity: 'warning',
        },
      ],
    };
    expect(() => SectionSchemas.ambiguity.parse(valid)).not.toThrow();
  });

  it('severity가 critical/warning/info만 허용된다', () => {
    const invalid = {
      items: [{
        originalText: '텍스트',
        issue: '이슈',
        suggestion: '제안',
        severity: 'low',
      }],
    };
    expect(() => SectionSchemas.ambiguity.parse(invalid)).toThrow();
  });
});

describe('Zod Schemas — MissingSection', () => {
  it('유효한 누락 항목을 통과시킨다', () => {
    const valid = {
      items: [
        { category: '보안', description: '인증 관련', reason: '누락됨' },
      ],
    };
    expect(() => SectionSchemas.missingRequirements.parse(valid)).not.toThrow();
  });
});

describe('Zod Schemas — QAQuestionSection', () => {
  it('유효한 QA 질문을 통과시킨다', () => {
    const valid = {
      questions: [
        { id: 1, question: '비밀번호 정책은?', context: '로그인', priority: 'high' },
      ],
    };
    expect(() => SectionSchemas.qaQuestions.parse(valid)).not.toThrow();
  });

  it('priority가 high/medium/low만 허용된다', () => {
    const invalid = {
      questions: [
        { id: 1, question: '질문', context: '맥락', priority: 'urgent' },
      ],
    };
    expect(() => SectionSchemas.qaQuestions.parse(invalid)).toThrow();
  });
});
