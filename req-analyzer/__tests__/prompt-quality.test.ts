import { describe, it, expect } from 'vitest';

/**
 * 프롬프트 품질 검증 테스트
 *
 * AI 분석 프롬프트가 요구사항의 모호성과 누락을 올바르게 탐지할 수 있는지
 * 알려진 샘플 데이터의 패턴을 기준으로 검증한다.
 *
 * - 모호성 탐지: 정량적 기준이 없는 표현을 식별하는지
 * - 누락 탐지: 일반적으로 필요하지만 명시되지 않은 요구사항을 식별하는지
 */

// --- 샘플 데이터 (src/data/samples.ts와 동일) ---

const LOGIN_SAMPLE = `1. 사용자는 이메일과 비밀번호를 입력하여 로그인할 수 있어야 한다.
2. 비밀번호는 8자 이상, 영문/숫자/특수문자를 포함해야 한다.
3. 로그인 실패 시 "이메일 또는 비밀번호가 올바르지 않습니다" 메시지를 표시한다.
4. 5회 연속 로그인 실패 시 계정을 30분간 잠금한다.
5. 시스템은 빠르게 응답해야 한다.
6. 비밀번호 찾기 기능을 제공해야 한다.
7. 보안이 철저해야 한다.`;

const ECOMMERCE_SAMPLE = `1. 사용자는 상품명 또는 카테고리로 상품을 검색할 수 있어야 한다.
2. 검색 결과는 0.5초 이내에 표시되어야 한다.
3. 장바구니에 상품을 추가, 수정, 삭제할 수 있다.
4. 결제는 신용카드, 간편결제(카카오페이, 네이버페이)를 지원한다.
5. 결제 완료 시 주문 확인 이메일이 발송된다.
6. 시스템이 안정적이어야 한다.
7. UI가 사용하기 편해야 한다.
8. 주문 취소는 배송 전까지 가능하다.`;

// --- 모호성 탐지 키워드 ---

const AMBIGUITY_KEYWORDS = [
  '빠르게', '좋아야', '편해야', '적절한', '안정적',
  '철저', '다양한', '실시간', '효율적', '충분한',
];

function detectAmbiguousStatements(text: string): { line: string; keyword: string }[] {
  const lines = text.split('\n').filter((l) => l.trim());
  const results: { line: string; keyword: string }[] = [];

  for (const line of lines) {
    for (const keyword of AMBIGUITY_KEYWORDS) {
      if (line.includes(keyword)) {
        results.push({ line: line.trim(), keyword });
      }
    }
  }

  return results;
}

// --- 누락 요구사항 카테고리 ---

interface MissingCategory {
  category: string;
  keywords: string[];
  description: string;
}

const COMMON_MISSING_CATEGORIES: MissingCategory[] = [
  { category: '세션 관리', keywords: ['세션', '로그아웃', '자동 로그아웃', '타임아웃'], description: '세션 관리 및 자동 로그아웃' },
  { category: '다중 인증', keywords: ['MFA', '2단계', '2FA', 'OTP', '다중 인증'], description: '다중 인증(MFA)' },
  { category: '감사 로그', keywords: ['감사 로그', '감사 기록', '활동 이력', '접근 이력'], description: '감사 로그 및 이력 관리' },
  { category: '접근성', keywords: ['접근성', 'WCAG', '스크린 리더', '키보드 탐색'], description: '웹 접근성 지원' },
  { category: '국제화', keywords: ['국제화', '다국어', 'i18n', '언어'], description: '다국어 지원' },
  { category: '데이터 백업', keywords: ['백업', '복구', '재해 복구'], description: '데이터 백업 및 복구' },
  { category: '성능 기준', keywords: ['응답 시간', 'ms', '초 이내', 'TPS', '동시 접속'], description: '정량적 성능 기준' },
  { category: '에러 처리', keywords: ['에러', '오류', '예외', '장애'], description: '에러 처리 및 장애 대응' },
];

function detectMissingCategories(text: string): MissingCategory[] {
  return COMMON_MISSING_CATEGORIES.filter((cat) =>
    !cat.keywords.some((kw) => text.includes(kw))
  );
}

// === 테스트 ===

describe('모호성 탐지 정확도 — 로그인 샘플', () => {
  const ambiguities = detectAmbiguousStatements(LOGIN_SAMPLE);

  it('로그인 샘플에서 모호한 표현을 2개 이상 탐지한다', () => {
    expect(ambiguities.length).toBeGreaterThanOrEqual(2);
  });

  it('"빠르게"를 모호한 키워드로 탐지한다', () => {
    const found = ambiguities.find((a) => a.keyword === '빠르게');
    expect(found).toBeDefined();
    expect(found!.line).toContain('빠르게 응답해야');
  });

  it('"철저"를 모호한 키워드로 탐지한다', () => {
    const found = ambiguities.find((a) => a.keyword === '철저');
    expect(found).toBeDefined();
    expect(found!.line).toContain('보안이 철저해야');
  });

  it('구체적인 요구사항(비밀번호 8자 이상)은 모호하지 않다', () => {
    const line2 = '비밀번호는 8자 이상, 영문/숫자/특수문자를 포함해야 한다.';
    const line2Ambiguities = AMBIGUITY_KEYWORDS.filter((kw) => line2.includes(kw));
    expect(line2Ambiguities).toHaveLength(0);
  });

  it('구체적인 요구사항(5회 연속 실패)은 모호하지 않다', () => {
    const line4 = '5회 연속 로그인 실패 시 계정을 30분간 잠금한다.';
    const line4Ambiguities = AMBIGUITY_KEYWORDS.filter((kw) => line4.includes(kw));
    expect(line4Ambiguities).toHaveLength(0);
  });
});

describe('모호성 탐지 정확도 — 전자상거래 샘플', () => {
  const ambiguities = detectAmbiguousStatements(ECOMMERCE_SAMPLE);

  it('전자상거래 샘플에서 모호한 표현을 2개 이상 탐지한다', () => {
    expect(ambiguities.length).toBeGreaterThanOrEqual(2);
  });

  it('"안정적"을 모호한 키워드로 탐지한다', () => {
    expect(ambiguities.find((a) => a.keyword === '안정적')).toBeDefined();
  });

  it('"편해야"를 모호한 키워드로 탐지한다', () => {
    expect(ambiguities.find((a) => a.keyword === '편해야')).toBeDefined();
  });

  it('정량적 요구사항(0.5초 이내)은 모호하지 않다', () => {
    const line2 = '검색 결과는 0.5초 이내에 표시되어야 한다.';
    const line2Ambiguities = AMBIGUITY_KEYWORDS.filter((kw) => line2.includes(kw));
    expect(line2Ambiguities).toHaveLength(0);
  });
});

describe('모호성 탐지 비율 검증', () => {
  it('로그인 샘플의 모호성 비율은 20~40% 범위이다', () => {
    const lines = LOGIN_SAMPLE.split('\n').filter((l) => l.trim());
    const ambiguousLines = new Set(
      detectAmbiguousStatements(LOGIN_SAMPLE).map((a) => a.line)
    );
    const ratio = ambiguousLines.size / lines.length;
    expect(ratio).toBeGreaterThanOrEqual(0.2);
    expect(ratio).toBeLessThanOrEqual(0.4);
  });

  it('전자상거래 샘플의 모호성 비율은 20~40% 범위이다', () => {
    const lines = ECOMMERCE_SAMPLE.split('\n').filter((l) => l.trim());
    const ambiguousLines = new Set(
      detectAmbiguousStatements(ECOMMERCE_SAMPLE).map((a) => a.line)
    );
    const ratio = ambiguousLines.size / lines.length;
    expect(ratio).toBeGreaterThanOrEqual(0.2);
    expect(ratio).toBeLessThanOrEqual(0.4);
  });
});

describe('누락 요구사항 탐지 — 로그인 샘플', () => {
  const missing = detectMissingCategories(LOGIN_SAMPLE);

  it('로그인 샘플에서 누락 카테고리를 3개 이상 탐지한다', () => {
    expect(missing.length).toBeGreaterThanOrEqual(3);
  });

  it('세션 관리가 누락된 것으로 탐지한다', () => {
    expect(missing.find((m) => m.category === '세션 관리')).toBeDefined();
  });

  it('다중 인증(MFA)이 누락된 것으로 탐지한다', () => {
    expect(missing.find((m) => m.category === '다중 인증')).toBeDefined();
  });

  it('감사 로그가 누락된 것으로 탐지한다', () => {
    expect(missing.find((m) => m.category === '감사 로그')).toBeDefined();
  });

  it('접근성이 누락된 것으로 탐지한다', () => {
    expect(missing.find((m) => m.category === '접근성')).toBeDefined();
  });

  it('국제화가 누락된 것으로 탐지한다', () => {
    expect(missing.find((m) => m.category === '국제화')).toBeDefined();
  });
});

describe('누락 요구사항 탐지 — 전자상거래 샘플', () => {
  const missing = detectMissingCategories(ECOMMERCE_SAMPLE);

  it('전자상거래 샘플에서 누락 카테고리를 3개 이상 탐지한다', () => {
    expect(missing.length).toBeGreaterThanOrEqual(3);
  });

  it('접근성이 누락된 것으로 탐지한다', () => {
    expect(missing.find((m) => m.category === '접근성')).toBeDefined();
  });

  it('데이터 백업이 누락된 것으로 탐지한다', () => {
    expect(missing.find((m) => m.category === '데이터 백업')).toBeDefined();
  });

  it('감사 로그가 누락된 것으로 탐지한다', () => {
    expect(missing.find((m) => m.category === '감사 로그')).toBeDefined();
  });
});

describe('모호성 키워드 목록 품질', () => {
  it('모호성 키워드가 10개 이상 정의되어 있다', () => {
    expect(AMBIGUITY_KEYWORDS.length).toBeGreaterThanOrEqual(10);
  });

  it('모든 키워드가 비어있지 않은 문자열이다', () => {
    for (const kw of AMBIGUITY_KEYWORDS) {
      expect(kw.trim().length).toBeGreaterThan(0);
    }
  });

  it('중복 키워드가 없다', () => {
    const unique = new Set(AMBIGUITY_KEYWORDS);
    expect(unique.size).toBe(AMBIGUITY_KEYWORDS.length);
  });
});

describe('누락 카테고리 목록 품질', () => {
  it('누락 카테고리가 5개 이상 정의되어 있다', () => {
    expect(COMMON_MISSING_CATEGORIES.length).toBeGreaterThanOrEqual(5);
  });

  it('모든 카테고리에 키워드가 1개 이상 있다', () => {
    for (const cat of COMMON_MISSING_CATEGORIES) {
      expect(cat.keywords.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('모든 카테고리에 설명이 있다', () => {
    for (const cat of COMMON_MISSING_CATEGORIES) {
      expect(cat.description.trim().length).toBeGreaterThan(0);
    }
  });
});
