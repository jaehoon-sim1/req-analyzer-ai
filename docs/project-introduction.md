# 프로젝트 소개 — 요구사항 분석 AI (req-analyzer)

## 1. 프로젝트 개요

**요구사항 분석 AI**는 소프트웨어 요구사항 문서를 AI로 자동 분석하여, 모호한 표현 탐지·누락 항목 식별·테스트 포인트 추출까지 한 번에 수행하는 웹 애플리케이션입니다.

QA 엔지니어, PM, 개발자가 요구사항을 입력하면 6가지 관점에서 즉시 분석 결과를 제공하며, 분석 결과를 Excel/JSON으로 내보내 실무에 바로 활용할 수 있습니다.

- **배포 URL**: https://req-analyzer-ai.vercel.app/
- **GitHub**: https://github.com/jaehoon-sim1/req-analyzer-ai
- **기술 스택**: Next.js 16 · TypeScript 5 · Tailwind CSS 4 · Claude API · Vercel

---

## 2. 핵심 기능 (9개 FR 전체 구현 완료)

| # | 기능 | 설명 |
|---|------|------|
| 1 | **요구사항 요약** | 입력된 요구사항의 핵심 포인트를 자동 정리 |
| 2 | **기능 목록 추출** | 요구사항에서 개별 기능을 식별하고 카테고리별 분류 |
| 3 | **테스트 포인트 생성** | QA에 필요한 테스트 항목을 우선순위와 함께 자동 생성 |
| 4 | **모호한 요구사항 탐지** | "빠르게", "적절한", "안정적" 등 정량화되지 않은 표현을 식별하고 개선안 제시 |
| 5 | **누락 요구사항 탐지** | 세션 관리, MFA, 접근성, 국제화 등 일반적으로 포함되어야 할 항목의 누락 감지 |
| 6 | **QA 질문 생성** | 요구사항 검증을 위한 구체적 질문 리스트 자동 생성 |
| 7 | **다중 파일 업로드** | PDF, DOCX, TXT, PNG/JPG(OCR) 문서를 업로드하여 자동 파싱 |
| 8 | **결과 내보내기** | 분석 결과를 Excel(7개 워크시트) 또는 JSON으로 다운로드 |
| 9 | **실시간 진행률 표시** | SSE 스트리밍으로 분석 진행 상황을 실시간 표시 |

---

## 3. 프로젝트 강점

### 3-1. AI 기반 다면적 분석

단순 텍스트 분석이 아닌, **6개 관점의 병렬 AI 분석**을 수행합니다.

- `Promise.allSettled`로 6개 섹션을 동시 호출하여 응답 시간을 최소화 (15~30초)
- 각 섹션마다 전문화된 프롬프트 템플릿 적용 (`system`/`user` 구조적 분리)
- Zod 스키마로 LLM 응답을 런타임 검증하여, 비정형 AI 출력의 **구조적 안정성** 보장
- 검증 실패 시 자동 재시도 로직으로 응답 품질 향상

### 3-2. 한국어 요구사항에 최적화

한국어 소프트웨어 요구사항의 특성을 반영한 분석 체계를 갖추고 있습니다.

- 한국어 서술 패턴 인식: `~해야 한다`, `~할 수 있어야 한다` 등 지배적 서술 패턴 처리
- 한국어 모호 키워드 탐지: `빠르게`, `철저`, `편해야`, `적절한`, `안정적` 등 10개 핵심 키워드
- Claude Vision API 기반 이미지 OCR로 한국어/영어 문서 모두 지원
- UI 전체 한국어 인터페이스

### 3-3. 실무 즉시 활용 가능한 출력

분석 결과를 실무 워크플로에 바로 적용할 수 있도록 설계했습니다.

- **Excel 내보내기**: 7개 워크시트(섹션별 6개 + 메타데이터 1개)로 구조화
- **JSON 내보내기**: API 연동이나 추가 가공에 적합한 구조화된 데이터
- 탭 기반 UI로 6개 분석 섹션을 직관적으로 탐색
- 3단계 UX: 입력 → 분석 → 결과 확인 (최소한의 사용자 조작)

### 3-4. 견고한 품질 보증 체계

**96+ 검증 항목**의 다층 테스트 전략으로 소프트웨어 품질을 보장합니다.

| 테스트 레벨 | 도구 | 검증 항목 수 |
|-------------|------|-------------|
| 단위 테스트 | Vitest v4 | 77 TCs (5개 파일) |
| E2E 테스트 | Playwright v1.58 | 12 TCs (AC-001~AC-008 전체 커버) |
| 보안 스캔 | npm audit + 시크릿 탐지 | 3건 |
| 성능 테스트 | curl + Lighthouse CI | 4건 |

- **프롬프트 품질 테스트**: AI 프롬프트의 모호성 탐지 정확도와 누락 탐지 정확도를 정량적으로 검증하는 27개 테스트 케이스 포함
- **False positive 방지**: 정량적 요구사항("8자 이상", "5회 연속")이 모호로 잘못 분류되지 않는지 검증

### 3-5. 완전 자동화된 CI/CD 파이프라인

GitHub Actions 7-Job 파이프라인으로 코드 품질을 자동으로 관리합니다.

```
lint-and-typecheck ──┬── build ──┬── performance-test ──┐
                     │           └── e2e-test            ├── regression-gate
                     └── unit-test ─────────────────────┘
security-audit ─────────────────────────────────────────┘
```

- **lint-and-typecheck**: TypeScript 타입체크 + ESLint (0 errors 필수)
- **security-audit**: npm audit + 하드코딩 시크릿 스캔 + .env 추적 방지
- **build**: Next.js 프로덕션 빌드 + 번들 사이즈 리포트
- **unit-test**: Vitest 77 TCs + V8 커버리지 리포트
- **performance-test**: 페이지/API 응답시간 + Lighthouse CI 감사
- **e2e-test**: Playwright 12 TCs, AC 전체 커버리지
- **regression-gate**: 전체 필수 Job 통과 여부 자동 판정

### 3-6. 보안 설계

보안을 아키텍처 수준에서 고려했습니다.

- **프롬프트 인젝션 방지**: Anthropic API의 `system` 파라미터와 `user` 메시지를 구조적으로 분리 (ADR-003)
- **Rate Limiting**: IP별 5 req/min 인메모리 제한으로 API 남용 방지
- **클라이언트 타임아웃**: AbortController 180초 강제 타임아웃
- **API 키 보호**: 환경변수 기반 관리, Lazy Init 싱글톤 패턴, 빈 키 검증
- **CI 보안 스캔**: 매 커밋마다 하드코딩 시크릿 탐지 + .env 추적 방지 자동 검증

### 3-7. 접근성 및 사용성

- ARIA 속성 완전 적용 (`role`, `aria-label`, `aria-selected`, `tablist`)
- `data-testid` 속성으로 테스트 자동화 지원
- 다크 테마 기반 UI (눈 피로 감소)
- 반응형 레이아웃 (모바일/태블릿/데스크톱)

---

## 4. 기술적 의사결정 (ADR)

| ADR | 결정 | 근거 |
|-----|------|------|
| ADR-001 | Next.js 16 + Claude Haiku 4.5 + Vercel | SSR + API Routes 통합, Claude 한국어 성능, Vercel 자동 배포 |
| ADR-002 | Tesseract.js → Claude Vision API | 서버리스 환경에서 ~4MB 모델 다운로드 타임아웃 해결, 한국어/영어 모두 지원 |
| ADR-003 | system/user 메시지 구조적 분리 | 프롬프트 인젝션 방지를 위한 아키텍처 수준 방어 |

---

## 5. 프로젝트 구조

```
req-analyzer/
  src/
    app/                    # App Router 페이지 & API 라우트
      api/analyze/          # SSE 스트리밍 분석 API
      api/upload/           # 파일 업로드 + 파싱 API
      api/export/           # Excel/JSON 내보내기 API
    components/             # React 클라이언트 컴포넌트
    lib/
      analyzer.ts           # AI 분석 코어 (Promise.allSettled 병렬)
      anthropic.ts          # Anthropic SDK 클라이언트 (Lazy Init)
      useAnalysis.ts        # React hook (AbortController + SSE)
      parsers/              # 파일 파서 (PDF, DOCX, TXT, Image)
      prompts/v1/           # 프롬프트 템플릿 (6개 섹션)
      export/excel.ts       # ExcelJS 워크북 생성
    types/
      analysis.ts           # 분석 결과 타입 정의
      schemas.ts            # Zod 스키마 (6개 섹션 런타임 검증)
  e2e/                      # Playwright E2E 테스트 (12 TCs)
  __tests__/                # 단위 테스트 (77 TCs, 5개 파일)
docs/                       # 프로젝트 문서
.github/workflows/ci.yml    # GitHub Actions CI/CD (7-Job)
```

---

## 6. 요약

**요구사항 분석 AI**는 단순한 텍스트 분석 도구가 아닌, QA 엔지니어의 실무 워크플로에 직접 통합될 수 있는 **AI 기반 요구사항 품질 관리 플랫폼**입니다.

6가지 관점의 병렬 AI 분석, 한국어 최적화, 96+ 검증 항목의 품질 보증, 7-Job CI/CD 자동화까지 갖춘 프로덕션 수준의 웹 애플리케이션으로, 요구사항의 모호성과 누락으로 인한 커뮤니케이션 비용과 버그를 사전에 방지합니다.
