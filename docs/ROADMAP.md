# Roadmap: 요구사항 분석 AI

> **PRD 기반 자동 생성** | Version 1.0 | 2026-03-13
> **방법론:** Agile Scrum (2주 스프린트)

---

## 목차

1. [PRD 분석 요약](#1-prd-분석-요약)
2. [우선순위 매트릭스 (MoSCoW)](#2-우선순위-매트릭스-moscow)
3. [마일스톤 정의](#3-마일스톤-정의)
4. [스프린트 계획](#4-스프린트-계획)
5. [의존성 맵](#5-의존성-맵)
6. [Playwright MCP 검증 시나리오](#6-playwright-mcp-검증-시나리오)
7. [리스크 및 완화 전략](#7-리스크-및-완화-전략)
8. [릴리스 전략](#8-릴리스-전략)

---

## 1. PRD 분석 요약

### 1-1. 기능 요구사항 매핑

| FR ID | 기능 | 복잡도 | 의존성 | 비즈니스 가치 |
|-------|------|--------|--------|---------------|
| FR-001 | 요구사항 분석 (AI 코어) | 🔴 High | - | Critical |
| FR-002 | 요구사항 요약 생성 | 🟡 Medium | FR-001 | High |
| FR-003 | 기능 목록 생성 | 🟡 Medium | FR-001 | High |
| FR-004 | 테스트 포인트 생성 | 🟡 Medium | FR-001 | High |
| FR-005 | 모호한 요구사항 탐지 | 🟡 Medium | FR-001 | Critical |
| FR-006 | 누락 가능 요구사항 탐지 | 🟡 Medium | FR-001 | High |
| FR-007 | QA 질문 생성 | 🟡 Medium | FR-001, FR-005, FR-006 | High |
| FR-008 | 문서 파싱 (PDF/DOCX/OCR/TXT) | 🔴 High | - | Medium |
| FR-009 | 결과 내보내기 (Excel/JSON) | 🟢 Low | FR-001~007 완료 | Medium |

### 1-2. PRD 분석 시 발견된 추가 고려사항

| # | 항목 | 설명 | 권장 조치 |
|---|------|------|-----------|
| 1 | AI 프롬프트 설계 | FR-002~007 각각에 최적화된 프롬프트 필요 | Sprint 1에서 프롬프트 엔지니어링 PoC 진행 |
| 2 | OCR 정확도 | PNG/JPG의 OCR 품질에 따른 분석 품질 저하 위험 | MVP에서 OCR 후순위 배치, 텍스트 입력 우선 |
| 3 | 스트리밍 응답 | 180초 제한 내 UX를 위해 AI 응답 스트리밍 필요 | SSE/WebSocket 기반 스트리밍 구현 |
| 4 | 프롬프트 토큰 제한 | 대용량 문서 입력 시 LLM 토큰 한계 | 문서 청킹 전략 설계 필요 |
| 5 | 결과 일관성 | AI 출력 포맷의 일관성 보장 필요 | Structured Output / JSON Mode 활용 |

---

## 2. 우선순위 매트릭스 (MoSCoW)

### Must Have (MVP - v1.0)

| 우선순위 | FR/NFR | 항목 | 근거 |
|----------|--------|------|------|
| P0 | FR-001 | AI 분석 코어 엔진 | 전체 기능의 기반, 모든 FR이 의존 |
| P0 | FR-002 | 요구사항 요약 | 핵심 가치 기능 |
| P0 | FR-003 | 기능 목록 생성 | 핵심 가치 기능 |
| P0 | FR-005 | 모호한 요구사항 탐지 | PRD의 핵심 목적(품질 개선)과 직결 |
| P0 | NFR-001 | 응답 속도 + 로딩 UI | 180초 제한, 사용자 이탈 방지 |
| P0 | NFR-002 | 3단계 UX Flow | 사용 편의성 핵심 |
| P1 | FR-004 | 테스트 포인트 생성 | QA 엔지니어 핵심 니즈 |
| P1 | FR-007 | QA 질문 생성 | QA 엔지니어 핵심 니즈 |
| P1 | NFR-005 | 에러 처리 | 안정적인 사용 경험 보장 |

### Should Have (v1.1)

| 우선순위 | FR/NFR | 항목 | 근거 |
|----------|--------|------|------|
| P2 | FR-006 | 누락 가능 요구사항 탐지 | 고급 분석 기능, MVP 이후 고도화 |
| P2 | FR-008 | 문서 파싱 (PDF/DOCX/TXT) | 텍스트 입력만으로 MVP 가능 |
| P2 | FR-009 | 결과 내보내기 (Excel/JSON) | 편의 기능, 핵심 가치에 간접 기여 |
| P2 | NFR-004 | 보안 및 데이터 처리 | 운영 환경 전 필수 |

### Could Have (v1.2+)

| 우선순위 | FR/NFR | 항목 | 근거 |
|----------|--------|------|------|
| P3 | FR-008 | OCR (PNG/JPG) | 기술 복잡도 높고 정확도 불확실 |
| P3 | - | 분석 히스토리 저장 | 반복 사용 시 편의 기능 |
| P3 | - | 다국어 지원 확장 | 한국어/영어 외 언어 |

### Won't Have (Out of Scope)

- 요구사항 버전 관리/변경 이력
- 다수 문서 교차 분석
- Jira/Confluence 외부 도구 연동
- 테스트케이스 자동 생성

---

## 3. 마일스톤 정의

```
M0          M1              M2              M3          M4
 │           │               │               │           │
 ▼           ▼               ▼               ▼           ▼
[PoC]──────[MVP]──────────[v1.1]──────────[v1.2]──────[GA]
 2주        4주              4주             3주         1주
            Sprint 1-2       Sprint 3-4      Sprint 5    Sprint 6
```

### M0: PoC (Proof of Concept) — 2주 ✅ **COMPLETED (2026-03-13)**

| 목표 | 상세 |
|------|------|
| 기간 | Week 1-2 |
| 목적 | AI 분석 코어 기술 검증 |
| 산출물 | 프롬프트 설계 문서, API 연동 프로토타입 |
| 완료 기준 | 텍스트 입력 → AI 분석 → 구조화된 결과 출력 확인 |
| **실제 결과** | **E2E 검증 통과 (44.2초, 6탭 정상), Playwright 6/6 PASS, 코드리뷰 68/100** |

### M1: MVP (Minimum Viable Product) — 4주

| 목표 | 상세 |
|------|------|
| 기간 | Week 3-6 (Sprint 1-2) |
| 포함 기능 | FR-001~005, FR-007, NFR-001, NFR-002, NFR-005 |
| 산출물 | 배포 가능한 웹 애플리케이션 |
| 완료 기준 | AC-001, AC-002, AC-003, AC-007, AC-008 통과 |

### M2: Enhanced (v1.1) — 4주

| 목표 | 상세 |
|------|------|
| 기간 | Week 7-10 (Sprint 3-4) |
| 포함 기능 | FR-006, FR-008(PDF/DOCX/TXT), FR-009, NFR-004 |
| 산출물 | 파일 업로드 + 내보내기 지원 버전 |
| 완료 기준 | AC-004, AC-005, AC-006 통과 |

### M3: Advanced (v1.2) — 3주

| 목표 | 상세 |
|------|------|
| 기간 | Week 11-13 (Sprint 5) |
| 포함 기능 | FR-008(OCR), 분석 히스토리, UX 고도화 |
| 산출물 | 전체 파일 형식 지원 버전 |
| 완료 기준 | 전체 AC 통과 + 성능 테스트 통과 |

### M4: GA (General Availability) — 1주

| 목표 | 상세 |
|------|------|
| 기간 | Week 14 (Sprint 6) |
| 활동 | 최종 QA, 보안 점검, 배포, 운영 모니터링 설정 |
| 완료 기준 | 프로덕션 배포 및 모니터링 확인 |

---

## 4. 스프린트 계획

### Sprint 0 (PoC) — Week 1~2 ✅ **DONE**

| Epic | Story | Story Points | 담당 | 상태 |
|------|-------|:---:|------|------|
| 기술 검증 | LLM API 연동 및 응답 포맷 검증 | 5 | BE | ✅ |
| 기술 검증 | 프롬프트 엔지니어링 (요약/기능목록/모호성 탐지) | 8 | BE | ✅ |
| 기술 검증 | 스트리밍 응답 PoC | 3 | BE | ✅ |
| 설계 | UI/UX 와이어프레임 확정 | 3 | FE | ✅ |
| 설계 | 기술 스택 확정 (프레임워크, 배포 환경) | 2 | 공통 | ✅ |
| | **합계** | **21** | | **ALL PASS** |

#### Sprint 0 검증 결과
- **코드 리뷰**: 68/100 (Critical 3건, Important 7건, Suggestion 8건) → Sprint 1에서 Critical 이슈 우선 해결
- **Playwright E2E**: 6/6 PASS (TC-E2E-001~006)
- **실제 AI 분석**: claude-haiku-4-5-20251001 모델, 39.7초 (NFR-001 180초 이내 ✓), 6개 섹션 정상 출력
- **이월 이슈**: CR-01(API 키 검증), CR-02(프롬프트 인젝션 방어), CR-03(클라이언트 타임아웃)

### Sprint 1 — Week 3~4

| Epic | Story | SP | 관련 FR |
|------|-------|----|---------|
| AI 코어 | AI 분석 파이프라인 구축 | 8 | FR-001 |
| AI 코어 | 요구사항 요약 프롬프트 + 파서 | 5 | FR-002 |
| AI 코어 | 기능 목록 생성 프롬프트 + 파서 | 5 | FR-003 |
| UI | 텍스트 입력 영역 구현 | 3 | NFR-002 |
| UI | 분석 결과 표시 레이아웃 | 5 | NFR-002 |
| UI | 로딩바 + 진행 단계 표시 | 3 | NFR-001 |
| | **합계** | **29** | |

### Sprint 2 — Week 5~6

| Epic | Story | SP | 관련 FR |
|------|-------|----|---------|
| AI 코어 | 테스트 포인트 생성 | 5 | FR-004 |
| AI 코어 | 모호한 요구사항 탐지 | 5 | FR-005 |
| AI 코어 | QA 질문 생성 | 5 | FR-007 |
| 안정성 | 에러 핸들링 (입력 검증, API 실패, 타임아웃) | 5 | NFR-005 |
| QA | E2E 테스트 작성 (Playwright) | 5 | AC-001~003, 007, 008 |
| QA | MVP 통합 테스트 + 버그 수정 | 3 | - |
| | **합계** | **28** | |

> **🏁 MVP 릴리스 (M1)** — Sprint 2 완료 시점

### Sprint 3 — Week 7~8

| Epic | Story | SP | 관련 FR |
|------|-------|----|---------|
| AI 코어 | 누락 가능 요구사항 탐지 | 5 | FR-006 |
| 파일 처리 | PDF 파싱 (pdf-parse 등) | 5 | FR-008 |
| 파일 처리 | DOCX 파싱 (mammoth 등) | 3 | FR-008 |
| 파일 처리 | TXT 파일 읽기 | 1 | FR-008 |
| UI | 파일 업로드 UI (drag & drop) | 5 | FR-008 |
| 보안 | 데이터 처리 정책 적용 (파일 자동 삭제 등) | 3 | NFR-004 |
| | **합계** | **22** | |

### Sprint 4 — Week 9~10

| Epic | Story | SP | 관련 FR |
|------|-------|----|---------|
| 내보내기 | Excel 내보내기 (xlsx 라이브러리) | 5 | FR-009 |
| 내보내기 | JSON 내보내기 | 2 | FR-009 |
| QA | 파일 업로드 E2E 테스트 | 5 | AC-005, AC-006 |
| QA | 내보내기 E2E 테스트 | 3 | AC-006 |
| 안정성 | 보안 점검 + 입력 검증 강화 | 3 | NFR-004 |
| UX | 결과 화면 UX 개선 (탭 전환, 하이라이트 등) | 5 | NFR-002 |
| | **합계** | **23** | |

> **🏁 v1.1 릴리스 (M2)** — Sprint 4 완료 시점

### Sprint 5 — Week 11~13

| Epic | Story | SP | 관련 FR |
|------|-------|----|---------|
| OCR | OCR 엔진 연동 (Tesseract.js 등) | 8 | FR-008 |
| OCR | 이미지 전처리 파이프라인 | 5 | FR-008 |
| UX | 분석 히스토리 (로컬 스토리지) | 5 | - |
| 성능 | 대용량 문서 청킹 전략 구현 | 5 | NFR-001 |
| QA | 전체 회귀 테스트 | 5 | 전체 AC |
| | **합계** | **28** | |

### Sprint 6 (GA) — Week 14

| Epic | Story | SP |
|------|-------|----|
| 배포 | 프로덕션 배포 + 모니터링 설정 | 3 |
| QA | 최종 보안/성능 점검 | 3 |
| 문서 | 사용자 가이드 작성 | 2 |
| | **합계** | **8** |

---

## 5. 의존성 맵

```
┌──────────────────────────────────────────────────────────────────┐
│                        의존성 다이어그램                           │
│                                                                  │
│  ┌─────────┐                                                     │
│  │ FR-001  │ ◄── AI 분석 코어 (모든 분석 기능의 기반)              │
│  │ AI Core │                                                     │
│  └────┬────┘                                                     │
│       │                                                          │
│       ├──────────┬──────────┬──────────┬──────────┐              │
│       ▼          ▼          ▼          ▼          ▼              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│  │ FR-002 │ │ FR-003 │ │ FR-004 │ │ FR-005 │ │ FR-006 │        │
│  │ 요약   │ │ 기능   │ │ TP     │ │ 모호성 │ │ 누락   │        │
│  └────────┘ └────────┘ └────────┘ └───┬────┘ └───┬────┘        │
│                                        │          │              │
│                                        └────┬─────┘              │
│                                             ▼                    │
│                                        ┌────────┐               │
│                                        │ FR-007 │               │
│                                        │ QA질문 │               │
│                                        └────────┘               │
│                                                                  │
│  ┌─────────┐                      ┌─────────┐                   │
│  │ FR-008  │ ◄── 독립 개발 가능   │ FR-009  │ ◄── 전체 FR 완료  │
│  │ 문서파싱│     (AI 코어와 병렬) │ 내보내기│     후 구현       │
│  └─────────┘                      └─────────┘                   │
│                                                                  │
│  ─────────────────────────────────────────────────               │
│  NFR 의존성:                                                     │
│  NFR-001 (응답속도) ← FR-001 스트리밍 구현 시 반영               │
│  NFR-002 (UX Flow) ← UI 레이아웃과 동시 진행                    │
│  NFR-004 (보안)     ← FR-008 파일 업로드 구현 시 반영            │
│  NFR-005 (에러)     ← 전 기능에 횡단 적용                        │
└──────────────────────────────────────────────────────────────────┘
```

### 크리티컬 패스

```
FR-001 (AI Core) → FR-005 (모호성 탐지) → FR-007 (QA 질문) → FR-009 (내보내기)
     ↓
  FR-002~004 (병렬 가능)
```

> **병목 지점:** FR-001(AI Core)이 전체 일정의 크리티컬 패스이며,
> 프롬프트 품질이 모든 하위 FR의 품질을 결정하므로 Sprint 0에서 충분한 검증 필수.

---

## 6. Playwright MCP 검증 시나리오

> 각 Acceptance Criteria에 대응하는 E2E 테스트 시나리오입니다.
> Playwright를 사용하며, MCP(Model Context Protocol) 기반 AI 응답 모킹을 포함합니다.

### 6-1. 테스트 환경 설정

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 200_000, // 180초 NFR + 여유
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
  ],
});
```

### 6-2. TC-E2E-001: 텍스트 입력 → 전체 분석 결과 생성 (AC-001, AC-002, AC-003)

```typescript
// e2e/analysis-core.spec.ts
import { test, expect } from '@playwright/test';

test.describe('FR-001~005, FR-007: AI 분석 코어', () => {

  test('TC-E2E-001: 텍스트 입력 후 전체 분석 결과가 생성된다', async ({ page }) => {
    // Step 1: 입력
    await page.goto('/');
    const textarea = page.locator('[data-testid="req-input"]');
    await textarea.fill(
      '1. 사용자는 이메일과 비밀번호로 로그인할 수 있어야 한다.\n' +
      '2. 시스템은 빠르게 응답해야 한다.\n' +
      '3. 관리자는 사용자 목록을 조회할 수 있다.'
    );

    // Step 2: 분석 실행
    await page.locator('[data-testid="analyze-btn"]').click();

    // 로딩바 표시 확인 (NFR-001)
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();

    // Step 3: 결과 확인 (180초 이내)
    await expect(page.locator('[data-testid="result-summary"]'))
      .toBeVisible({ timeout: 180_000 });

    // AC-001: 요약 + 기능 목록 생성 확인
    await expect(page.locator('[data-testid="section-summary"]')).toContainText('요약');
    await expect(page.locator('[data-testid="section-features"]')).toContainText('기능');

    // AC-002: QA 질문 리스트 확인
    await expect(page.locator('[data-testid="section-qa-questions"]')).toBeVisible();
    const qaItems = page.locator('[data-testid="qa-question-item"]');
    await expect(qaItems).toHaveCount({ minimum: 1 });

    // AC-003: 모호한 요구사항 탐지 ("빠르게" 탐지)
    await expect(page.locator('[data-testid="section-ambiguity"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-ambiguity"]'))
      .toContainText('모호');
  });

  test('TC-E2E-002: 빈 입력 시 분석 버튼 비활성화', async ({ page }) => {
    await page.goto('/');
    const analyzeBtn = page.locator('[data-testid="analyze-btn"]');
    await expect(analyzeBtn).toBeDisabled();
  });
});
```

### 6-3. TC-E2E-003: 파일 업로드 분석 (AC-005)

```typescript
// e2e/file-upload.spec.ts
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('FR-008: 문서 파싱 + 분석', () => {

  const testFiles = [
    { name: 'requirements.pdf',  type: 'PDF' },
    { name: 'requirements.docx', type: 'DOCX' },
    { name: 'requirements.txt',  type: 'TXT' },
  ];

  for (const file of testFiles) {
    test(`TC-E2E-003-${file.type}: ${file.type} 업로드 후 분석 성공`, async ({ page }) => {
      await page.goto('/');

      // 파일 업로드
      const fileInput = page.locator('[data-testid="file-upload"]');
      await fileInput.setInputFiles(path.join(__dirname, 'fixtures', file.name));

      // 파일명 표시 확인
      await expect(page.locator('[data-testid="uploaded-filename"]'))
        .toContainText(file.name);

      // 분석 실행
      await page.locator('[data-testid="analyze-btn"]').click();

      // 결과 확인 - 텍스트 입력과 동일한 6개 섹션
      await expect(page.locator('[data-testid="result-summary"]'))
        .toBeVisible({ timeout: 180_000 });

      const sections = [
        'section-summary', 'section-features', 'section-test-points',
        'section-ambiguity', 'section-missing', 'section-qa-questions'
      ];
      for (const section of sections) {
        await expect(page.locator(`[data-testid="${section}"]`)).toBeVisible();
      }
    });
  }

  test('TC-E2E-004: 지원하지 않는 파일 형식 업로드 시 오류 (AC-008)', async ({ page }) => {
    await page.goto('/');
    const fileInput = page.locator('[data-testid="file-upload"]');
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'invalid.mp4'));

    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('지원하지 않는 파일 형식');
  });
});
```

### 6-4. TC-E2E-005: 결과 내보내기 (AC-006)

```typescript
// e2e/export.spec.ts
import { test, expect } from '@playwright/test';

test.describe('FR-009: 결과 내보내기', () => {

  test.beforeEach(async ({ page }) => {
    // 사전 조건: 분석 결과가 존재하는 상태
    await page.goto('/');
    await page.locator('[data-testid="req-input"]').fill(
      '사용자는 이메일로 로그인할 수 있어야 한다.'
    );
    await page.locator('[data-testid="analyze-btn"]').click();
    await expect(page.locator('[data-testid="result-summary"]'))
      .toBeVisible({ timeout: 180_000 });
  });

  test('TC-E2E-005a: Excel 내보내기', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="export-excel-btn"]').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  });

  test('TC-E2E-005b: JSON 내보내기', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="export-json-btn"]').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });
});
```

### 6-5. TC-E2E-006: 응답 시간 및 로딩 UX (AC-007)

```typescript
// e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('NFR-001: 응답 속도', () => {

  test('TC-E2E-006: 분석 결과가 180초 이내에 표시된다', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="req-input"]').fill(
      '1. 사용자는 이메일과 비밀번호로 로그인할 수 있어야 한다.\n'.repeat(20)
    );

    const startTime = Date.now();
    await page.locator('[data-testid="analyze-btn"]').click();

    // 로딩 UI 확인
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="progress-step"]')).toBeVisible();

    // 결과 대기
    await expect(page.locator('[data-testid="result-summary"]'))
      .toBeVisible({ timeout: 180_000 });

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(180_000);
  });
});
```

### 6-6. TC-E2E-007: 3단계 UX Flow (NFR-002)

```typescript
// e2e/ux-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('NFR-002: 3단계 UX', () => {

  test('TC-E2E-007: 사용자는 3단계 이내로 결과를 확인한다', async ({ page }) => {
    await page.goto('/');

    // Step 1: 입력 영역이 즉시 보여야 함
    await expect(page.locator('[data-testid="req-input"]')).toBeVisible();

    // Step 1: 텍스트 입력 (1 action)
    await page.locator('[data-testid="req-input"]').fill('사용자는 로그인할 수 있다.');

    // Step 2: 분석 버튼 클릭 (1 action)
    await page.locator('[data-testid="analyze-btn"]').click();

    // Step 3: 결과 자동 표시 (0 action - 자동)
    await expect(page.locator('[data-testid="result-summary"]'))
      .toBeVisible({ timeout: 180_000 });

    // 추가 네비게이션 없이 모든 결과 섹션이 같은 페이지에 보여야 함
    await expect(page.locator('[data-testid="section-summary"]')).toBeAttached();
    await expect(page.locator('[data-testid="section-qa-questions"]')).toBeAttached();
  });
});
```

### 6-7. 테스트 커버리지 매핑

| TC ID | 검증 대상 | AC | FR/NFR | Sprint |
|-------|-----------|-----|--------|--------|
| TC-E2E-001 | 텍스트 분석 전체 흐름 | AC-001, 002, 003 | FR-001~005, 007 | Sprint 2 |
| TC-E2E-002 | 빈 입력 방어 | AC-008 | NFR-005 | Sprint 2 |
| TC-E2E-003 | 파일 업로드 분석 (PDF/DOCX/TXT) | AC-005 | FR-008 | Sprint 4 |
| TC-E2E-004 | 지원하지 않는 파일 형식 | AC-008 | NFR-005 | Sprint 4 |
| TC-E2E-005 | Excel/JSON 내보내기 | AC-006 | FR-009 | Sprint 4 |
| TC-E2E-006 | 180초 응답 + 로딩 UI | AC-007 | NFR-001 | Sprint 2 |
| TC-E2E-007 | 3단계 UX Flow | - | NFR-002 | Sprint 2 |

---

## 7. 리스크 및 완화 전략

| # | 리스크 | 영향도 | 발생 확률 | 완화 전략 |
|---|--------|--------|-----------|-----------|
| R1 | AI 응답 품질 불일치 | 🔴 High | 🟡 Medium | 프롬프트 반복 개선 + 출력 파서 검증 로직 |
| R2 | 180초 응답 제한 초과 | 🔴 High | 🟡 Medium | 스트리밍 응답 + 문서 청킹 + 캐싱 전략 |
| R3 | OCR 정확도 부족 | 🟡 Medium | 🔴 High | MVP에서 OCR 제외, v1.2에서 점진적 도입 |
| R4 | LLM API 비용 증가 | 🟡 Medium | 🟡 Medium | 토큰 사용량 모니터링 + 입력 크기 제한 |
| R5 | 대용량 문서 처리 실패 | 🟡 Medium | 🟡 Medium | 청킹 전략 + 최대 파일 크기 제한 (10MB) |
| R6 | 프롬프트 인젝션 | 🔴 High | 🟢 Low | 입력 검증 + 프롬프트 격리 + 출력 필터링 |

---

## 8. 릴리스 전략

### 릴리스 타임라인

```
Week  1  2  3  4  5  6  7  8  9  10  11  12  13  14
      ├──────┤
       PoC
               ├──────────────┤
                  MVP (v1.0)
                  Sprint 1-2     ├──────────────┤
                                    v1.1
                                   Sprint 3-4      ├───────────┤
                                                      v1.2
                                                     Sprint 5     ├──┤
                                                                    GA
```

### 릴리스 체크리스트

| Phase | 항목 |
|-------|------|
| MVP (v1.0) | ✅ 텍스트 입력 분석 전체 기능 동작 |
| | ✅ 6개 출력 섹션 중 5개 (누락 탐지 제외) 정상 표시 |
| | ✅ 로딩 UI + 에러 처리 |
| | ✅ E2E 테스트 (TC-001, 002, 006, 007) 통과 |
| v1.1 | ✅ 파일 업로드 (PDF/DOCX/TXT) 지원 |
| | ✅ 누락 가능 요구사항 탐지 |
| | ✅ Excel/JSON 내보내기 |
| | ✅ E2E 테스트 전체 통과 |
| v1.2 | ✅ OCR (PNG/JPG) 지원 |
| | ✅ 분석 히스토리 |
| | ✅ 성능/보안 테스트 통과 |
| GA | ✅ 프로덕션 배포 완료 |
| | ✅ 모니터링/알림 설정 |
| | ✅ 사용자 가이드 배포 |

---

## 9. Karpathy Guidelines 평가

> `.claude/skills/karpathy-guidelines.md` 스킬 기반 자동 평가

### 원칙별 점수

| 원칙 | 배점 | 득점 | 근거 |
|------|:----:|:----:|------|
| **P1** 점진적 복잡도 | 20 | **18** | PoC→MVP→v1.1→v1.2→GA 순서 적절. OCR을 v1.2로 후순위 배치. 각 마일스톤 독립 배포 가능 |
| **P2** 데이터 우선 | 10 | **7** | 입력 제약(50,000자/10MB) 정의됨. ⚠️ 실제 사용자 요구사항 샘플 수집·분석 태스크가 Sprint 0에 명시적으로 없음 |
| **P3** 빠른 검증 | 15 | **13** | 로딩바, 진행 단계, 구조화된 결과 표시 설계됨. ⚠️ 사용자 피드백/수정 인터랙션 미정의 |
| **P4** AI 제어 | 15 | **12** | Structured Output 계획 있음. 프롬프트 인젝션 방어 포함. ⚠️ AI 신뢰도 표시 미정의, 프롬프트 버전 관리 미명시 |
| **P5** 사양 중심 | 10 | **9** | AC가 Given-When-Then으로 작성. 기술 스택 결정이 PoC에 포함. 설계 문서가 구현 앞에 배치 |
| **P6** 테스트 | 20 | **17** | 7개 E2E TC가 AC와 1:1 매핑. 성능 테스트 포함. ⚠️ CI/CD 파이프라인 구성 태스크 미명시, 회귀 테스트는 Sprint 5에만 존재 |
| **P7** 불완전성 대응 | 10 | **8** | 청킹 전략, 재시도, 비용 모니터링 계획 있음. ⚠️ 프롬프트 A/B 테스트 미계획 |
| **합계** | **100** | **84** | **등급: B (보완 후 진행 가능)** |

### 개선 권장사항

| # | 원칙 | 개선 항목 | 권장 스프린트 |
|---|------|-----------|---------------|
| 1 | P2 | Sprint 0에 "실제 QA 엔지니어 요구사항 샘플 5건 이상 수집·분석" 태스크 추가 | Sprint 0 |
| 2 | P3 | 분석 결과에 대한 사용자 피드백 UI (좋아요/수정 요청) 설계 추가 | Sprint 2 |
| 3 | P4 | AI 출력에 신뢰도(confidence) 표시 기능 추가 검토 | Sprint 2 |
| 4 | P4 | 프롬프트 버전 관리 체계 수립 (Git 기반 프롬프트 파일 관리) | Sprint 0 |
| 5 | P6 | CI/CD 파이프라인(GitHub Actions 등) 구성 태스크 Sprint 1에 추가 | Sprint 1 |
| 6 | P6 | 각 스프린트 종료 시 회귀 테스트 실행 정책 수립 | Sprint 1 |
| 7 | P7 | 프롬프트 A/B 테스트 프레임워크 설계 (분석 품질 비교) | Sprint 3 |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-03-13 | PRD v1.0 기반 로드맵 초안 생성 |
| 1.1 | 2026-03-13 | Karpathy Guidelines 스킬 기반 평가 및 개선 권장사항 추가 |
