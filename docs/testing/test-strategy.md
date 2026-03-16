# Test Strategy — 요구사항 분석 AI

> **최종 업데이트:** 2026-03-16
> **테스트 총 수:** 단위 77 TCs + E2E 12 TCs + 보안 3건 + 성능 4건 = **96+ 검증 항목**

---

## 1. 테스트 피라미드

```
          ┌─────────┐
          │  E2E    │  12 TCs (Playwright)
          │ Browser │  AC-001~AC-008 전체 커버
         ─┴─────────┴─
        ┌─────────────┐
        │  Integration │  15 TCs (Vitest)
        │  API 검증    │  Analyze/Upload/Export API
       ─┴─────────────┴─
      ┌─────────────────┐
      │   Unit Tests     │  62 TCs (Vitest)
      │ Schema/Parser/   │  Zod, Parser, Prompt Quality
      │ Prompt Quality   │
     ─┴─────────────────┴─
    ┌─────────────────────┐
    │ Static Analysis      │  TypeScript + ESLint
    │ Security Scan        │  npm audit + secret scan
    └─────────────────────┘
```

---

## 2. 단위 테스트 (Vitest, 77 TCs)

| 파일 | TCs | 검증 대상 |
|------|-----|-----------|
| `__tests__/schemas.test.ts` | 13 | Zod 스키마 — 6개 분석 섹션(summary, features, testPoints, ambiguity, missing, qaQuestions) 필드 검증, 타입 제약, optional 필드 |
| `__tests__/parsers.test.ts` | 4 | TXT 파서 — UTF-8 인코딩, 빈 파일, 한국어 특수문자, 대용량(30,000자) |
| `__tests__/analyzer-utils.test.ts` | 18 | parseJSON (LLM 응답 파싱), Rate Limiter (IP별 5req/min), 입력 검증 (min/max), 파일 업로드 검증 (확장자/크기) |
| `__tests__/api-integration.test.ts` | 15 | Analyze API 입력 검증, Upload API 파일 검증, Export API 요청 검증, 이미지 미디어 타입 감지 |
| `__tests__/prompt-quality.test.ts` | 27 | **모호성 탐지 정확도** (빠르게/철저/안정적/편해야 키워드 탐지, 정량적 요구사항 false positive 방지, 탐지 비율 20~40% 검증), **누락 탐지 정확도** (세션관리/MFA/감사로그/접근성/국제화 카테고리별 탐지) |

### 실행 방법

```bash
cd req-analyzer
npm test              # 전체 실행 (vitest run)
npm run test:watch    # 개발 중 watch 모드
```

### 설정

- **vitest.config.ts**: `@/` path alias, node 환경, V8 coverage provider
- **include**: `__tests__/**/*.test.ts`
- **coverage**: `src/lib/**`, `src/types/**`

---

## 3. E2E 테스트 (Playwright, 12 TCs)

| TC ID | 검증 대상 | AC 매핑 |
|-------|-----------|---------|
| TC-E2E-001 | 페이지 로드 + 제목 표시 | — |
| TC-E2E-002 | 샘플 버튼 → 데이터 로드 + 글자수 | — |
| TC-E2E-003 | 초기화 버튼 → 입력 클리어 | — |
| TC-E2E-004 | 빈 입력 시 분석 버튼 비활성화 | — |
| TC-E2E-005 | **전체 분석 흐름** (6개 탭 전환 + 콘텐츠 확인) | AC-001, AC-002, AC-003 |
| TC-E2E-006 | 에러 처리 (공백/짧은 입력) | AC-008 |
| TC-E2E-007 | **누락 요구사항 탐지** (탭 콘텐츠 + 항목 렌더링) | **AC-004** |
| TC-E2E-008 | **파일 업로드** (TXT → textarea 로드) | **AC-005** |
| TC-E2E-009 | **JSON 내보내기** (다운로드 이벤트 + 파일명) | **AC-006** |
| TC-E2E-010 | 파일 업로드 모드 토글 UI | — |
| TC-E2E-011 | 분석 후 내보내기 버튼 표시 | — |
| TC-E2E-012 | 접근성 ARIA 속성 검증 (lang, tablist, role, aria-selected) | AC-007 |

### AC 커버리지 매트릭스

| AC | 설명 | E2E TC | 단위 테스트 |
|----|------|--------|------------|
| AC-001 | 요구사항 분석 성공 | TC-E2E-005 | schemas.test.ts |
| AC-002 | QA 질문 생성 | TC-E2E-005 | schemas.test.ts |
| AC-003 | 모호한 요구사항 탐지 | TC-E2E-005 | prompt-quality.test.ts |
| AC-004 | 누락 요구사항 탐지 | **TC-E2E-007** | prompt-quality.test.ts |
| AC-005 | 파일 업로드 분석 | **TC-E2E-008** | api-integration.test.ts, parsers.test.ts |
| AC-006 | 결과 내보내기 | **TC-E2E-009** | api-integration.test.ts |
| AC-007 | 응답 시간 + 접근성 | TC-E2E-012 | — |
| AC-008 | 에러 처리 | TC-E2E-006 | api-integration.test.ts |

### 실행 방법

```bash
cd req-analyzer
npm run test:e2e      # Playwright 실행 (Chromium)
```

### 설정

- **playwright.config.ts**: Chromium only, headless, baseURL `localhost:3456`
- **webServer**: Next.js dev (Turbopack) 자동 시작

---

## 4. 보안 테스트

| 검증 항목 | 도구 | 설명 |
|-----------|------|------|
| 의존성 취약점 | `npm audit --audit-level=high` | 알려진 보안 취약점 스캔 |
| 하드코딩 시크릿 | grep 기반 커스텀 스캐너 | `src/` 내 API 키, 비밀번호 패턴 탐지 |
| .env 추적 방지 | `git ls-files --cached` | .env 파일이 git에 포함되지 않는지 확인 |
| 프롬프트 인젝션 | 구조적 분리 (ADR-003) | system/user 메시지 분리로 인젝션 방지 |

---

## 5. 성능 테스트

| 검증 항목 | 방법 | 기준 |
|-----------|------|------|
| 페이지 로드 시간 | curl 3회 반복 측정 | 응답 코드 200 |
| API 응답 시간 | curl POST /api/analyze (validation) | 입력 검증 단계 응답 시간 |
| 보안 헤더 | curl -D (X-Frame, CSP 등) | 헤더 존재 여부 |
| Lighthouse 감사 | @lhci/cli | 접근성, 모범사례, SEO 점수 |

---

## 6. CI/CD 파이프라인 (GitHub Actions)

7개 Job으로 구성된 자동화 파이프라인:

```
lint-and-typecheck ──┬── build ──┬── performance-test ──┐
                     │           └── e2e-test            ├── regression-gate
                     └── unit-test ─────────────────────┘
security-audit ─────────────────────────────────────────┘
```

| Job | 도구 | Blocking |
|-----|------|----------|
| lint-and-typecheck | TypeScript + ESLint | Yes |
| security-audit | npm audit + secret scan | Yes |
| build | Next.js build + bundle size | Yes |
| unit-test | Vitest + V8 coverage | Yes |
| performance-test | curl + Lighthouse CI | No (advisory) |
| e2e-test | Playwright | Conditional |
| regression-gate | 결과 집계 | Yes (final gate) |

---

## 7. 프롬프트 품질 검증 전략

AI 프롬프트의 출력 품질을 검증하기 위한 테스트 (`prompt-quality.test.ts`):

### 모호성 탐지 검증
- **키워드 기반**: 10개 모호 키워드 (`빠르게`, `좋아야`, `편해야`, `적절한`, `안정적`, `철저`, `다양한`, `실시간`, `효율적`, `충분한`)
- **정확도**: 로그인 샘플에서 "빠르게", "철저" 탐지 확인
- **False positive 방지**: 정량적 요구사항("8자 이상", "5회 연속")이 모호로 분류되지 않는지 확인
- **탐지 비율**: 전체 요구사항 대비 모호성 비율 20~40% 범위 검증

### 누락 탐지 검증
- **카테고리 기반**: 8개 공통 누락 카테고리 (세션 관리, MFA, 감사 로그, 접근성, 국제화, 데이터 백업, 성능 기준, 에러 처리)
- **정확도**: 로그인 샘플에서 세션 관리, MFA, 감사 로그, 접근성, 국제화 누락 탐지 확인
- **도메인별**: 전자상거래 샘플에서 접근성, 데이터 백업, 감사 로그 누락 탐지 확인
