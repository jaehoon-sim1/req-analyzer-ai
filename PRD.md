# PRD: 요구사항 분석 AI

> **Version:** 1.1
> **작성일:** 2026-03-13
> **상태:** Approved

---

## 1. 기능 목적

요구사항의 모호함이나 누락으로 인해 발생하는 버그 및 커뮤니케이션 비용을 줄이고,
QA 단계 이전에 요구사항 품질을 개선한다.

---

## 2. 목표

사용자가 요구사항 문서 또는 텍스트를 입력하면 AI가 자동으로 분석하여 다음 정보를 제공한다.

- 요구사항 요약
- 기능 목록 정리
- 주요 테스트 포인트
- 모호한 요구사항 탐지
- 누락 가능 요구사항 탐지
- QA 질문 리스트 생성

---

## 3. 사용자 유형

| 사용자 | 설명 |
|--------|------|
| QA 엔지니어 | 요구사항을 검토하고 테스트 전략을 수립하는 주 사용자 |
| PM/기획자 | 요구사항 작성 후 품질을 사전 점검하는 보조 사용자 |
| 개발자 | 요구사항 모호성을 빠르게 파악하여 커뮤니케이션 비용을 줄이는 보조 사용자 |

---

## 4. 입력(Input)

사용자는 아래 방식으로 요구사항을 입력할 수 있다.

### 4-1. 텍스트 입력

요구사항 문서를 텍스트로 직접 입력한다.

- **최소 길이**: 10자
- **최대 길이**: 50,000자

### 4-2. 문서 업로드

지원 파일 형식:

| 파일 형식 | 파싱 방법 | 라이브러리 |
|-----------|----------|-----------|
| PDF | 텍스트 레이어 추출 | pdf-parse |
| DOCX | 본문 텍스트 추출 | mammoth |
| TXT | 텍스트 파일 직접 읽기 | Node.js Buffer |
| PNG/JPG | Claude Vision API OCR | @anthropic-ai/sdk |

- **최대 파일 크기**: 10MB
- 이미지(PNG/JPG)의 경우 Claude Vision API를 통해 텍스트를 추출하며, 한국어/영어 모두 지원

---

## 5. 기능 요구사항

### FR-001 요구사항 분석

사용자가 입력한 요구사항 문서를 분석해야 한다.

- 6개 섹션을 병렬(`Promise.allSettled`)로 동시 분석하여 응답 시간 최소화
- 각 섹션별 Zod 스키마 검증 + 실패 시 1회 자동 재시도

### FR-002 요구사항 요약 생성

AI는 요구사항을 요약하여 핵심 기능을 정리해야 한다.

**출력 구조:** `{ overview: string, keyPoints: string[], confidence: 'high' | 'medium' | 'low' }`

### FR-003 기능 목록 생성

요구사항을 기반으로 기능 리스트를 생성한다.

**출력 구조:** `{ features: [{ id, name, description, category }], confidence }`

### FR-004 테스트 포인트 생성

요구사항을 기반으로 QA 테스트 포인트를 생성한다.

**출력 구조:** `{ testPoints: [{ id, category, description, priority }], confidence }`

### FR-005 모호한 요구사항 탐지

AI는 요구사항 중 명확하지 않은 부분을 식별해야 한다.

**출력 구조:** `{ items: [{ originalText, issue, suggestion, severity }], confidence }`

### FR-006 누락 가능 요구사항 탐지

AI는 입력된 요구사항에서 일반적으로 포함되어야 하나 누락된 항목을 탐지한다.

**출력 구조:** `{ items: [{ category, description, reason }], confidence }`

### FR-007 QA 질문 생성

요구사항 검증을 위한 QA 질문 리스트를 생성한다.

**출력 구조:** `{ questions: [{ id, question, context, priority }], confidence }`

### FR-008 문서 파싱

업로드된 문서(PDF, DOCX, PNG, JPG, TXT)에서 텍스트를 추출한다.

- PDF: 텍스트 레이어 추출 (pdf-parse)
- DOCX: 본문 텍스트 추출 (mammoth)
- PNG/JPG: Claude Vision API를 통한 텍스트 추출
- TXT: 직접 읽기

파싱 실패 시 사용자에게 오류 메시지를 표시한다.

### FR-009 결과 내보내기

분석 결과를 다음 형식으로 내보낼 수 있다.

- Excel (.xlsx) — ExcelJS 라이브러리, 7개 워크시트(섹션별 + 메타데이터)
- JSON (.json) — 구조화된 분석 결과 전체

---

## 6. 출력(Output)

AI는 분석 결과를 아래 구조로 제공한다.

| # | 출력 항목 | 관련 FR | 구현 상태 |
|---|-----------|---------|----------|
| 1 | 요구사항 요약 | FR-002 | ✅ 완료 |
| 2 | 기능 목록 | FR-003 | ✅ 완료 |
| 3 | 테스트 포인트 | FR-004 | ✅ 완료 |
| 4 | 모호한 요구사항 | FR-005 | ✅ 완료 |
| 5 | 누락 가능 요구사항 | FR-006 | ✅ 완료 |
| 6 | QA 질문 리스트 | FR-007 | ✅ 완료 |
| 7 | 파일 업로드 + OCR | FR-008 | ✅ 완료 |
| 8 | Excel/JSON 내보내기 | FR-009 | ✅ 완료 |

### 6-1. 기능별 구현 파일 매핑

| FR | 기능 | Backend (API Route) | Frontend (Component) | Core Logic |
|----|------|---------------------|----------------------|------------|
| FR-001 | 분석 엔진 | `src/app/api/analyze/route.ts` | — | `src/lib/analyzer.ts` |
| FR-002 | 요약 생성 | (analyze 내부) | `src/components/ResultSection.tsx` | `src/lib/prompts/v1/summary.ts` |
| FR-003 | 기능 목록 | (analyze 내부) | `src/components/ResultSection.tsx` | `src/lib/prompts/v1/features.ts` |
| FR-004 | 테스트 포인트 | (analyze 내부) | `src/components/ResultSection.tsx` | `src/lib/prompts/v1/test-points.ts` |
| FR-005 | 모호성 탐지 | (analyze 내부) | `src/components/ResultSection.tsx` | `src/lib/prompts/v1/ambiguity.ts` |
| FR-006 | 누락 탐지 | (analyze 내부) | `src/components/ResultSection.tsx` | `src/lib/prompts/v1/missing.ts` |
| FR-007 | QA 질문 | (analyze 내부) | `src/components/ResultSection.tsx` | `src/lib/prompts/v1/qa-questions.ts` |
| FR-008 | 파일 업로드 | `src/app/api/upload/route.ts` | `src/components/FileUpload.tsx` | `src/lib/parsers/{pdf,docx,txt,image}-parser.ts` |
| FR-009 | 내보내기 | `src/app/api/export/route.ts` | `src/components/ResultSection.tsx` | `src/lib/export/excel.ts` |

---

## 7. 비기능 요구사항

### NFR-001 응답 속도

- 요구사항 분석 결과는 **180초 이내**에 생성되어야 한다.
- 6개 섹션 병렬 처리(`Promise.allSettled`)로 실제 응답 시간 약 15~30초
- 분석 진행 상황을 SSE(Server-Sent Events)로 실시간 스트리밍 표시
  - 진행현황 로딩바 (0~100%)
  - 현재 처리 단계 텍스트 표시

### NFR-002 사용 편의성

- 사용자는 **3단계 이내**로 분석 결과를 확인할 수 있어야 한다.
  - Step 1: 요구사항 입력 (텍스트 입력 또는 파일 업로드)
  - Step 2: 분석 실행 (버튼 클릭)
  - Step 3: 결과 확인 (탭 네비게이션)

### NFR-003 결과 구조화

AI 결과는 구조화된 포맷으로 제공되어야 한다.

- Excel (.xlsx) — 7개 워크시트
- JSON (.json)

### NFR-004 보안 및 데이터 처리

- 업로드된 파일 및 입력 데이터는 분석 완료 후 서버에 보관하지 않는다 (메모리 내 처리)
- 사용자 데이터는 AI API 호출 시에만 전송되며, Anthropic의 데이터 처리 정책을 따른다
- API 키는 환경변수로 관리하며 클라이언트에 노출하지 않는다
- 프롬프트 인젝션 방지: system/user 메시지 구조적 분리

### NFR-005 에러 처리

- 파일 파싱 실패 시 사용자에게 명확한 오류 메시지를 표시한다
- AI 분석 실패/타임아웃 시 재시도 안내 또는 오류 메시지를 표시한다
- 지원하지 않는 파일 형식 업로드 시 안내 메시지를 표시한다
- 클라이언트 측 180초 AbortController 타임아웃 적용

### NFR-006 접근성 (Accessibility)

- WCAG 2.1 Level A 준수
- 모든 인터랙티브 요소에 적절한 ARIA 속성 적용
  - `role="tablist"`, `role="tab"`, `aria-selected`
  - `role="progressbar"`, `aria-valuenow`
  - `role="alert"` (에러 메시지)
  - `aria-label` (버튼, 입력 필드)
- `<html lang="ko">` 설정

### NFR-007 Rate Limiting

- IP별 분당 5회 요청 제한 (인메모리)
- 업로드 API에도 동일 정책 적용
- 제한 초과 시 429 상태 코드 + 한국어 안내 메시지

---

## 8. UI Flow

```
┌─────────────────────────────────────────────┐
│  Step 1: 입력                                │
│  ┌───────────────┐  ┌────────────────────┐  │
│  │ 텍스트 입력    │  │ 파일 업로드         │  │
│  │ (textarea)    │  │ (drag & drop)      │  │
│  └───────────────┘  └────────────────────┘  │
│                                              │
│  Step 2: 분석                                │
│  ┌──────────────────────────────────────┐   │
│  │  [분석 시작] 버튼                      │   │
│  │  → SSE 스트리밍 로딩바 + 진행 단계     │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  Step 3: 결과 확인                           │
│  ┌──────────────────────────────────────┐   │
│  │  탭/섹션별 결과 표시 (6개 탭)          │   │
│  │  [Excel 내보내기] [JSON 내보내기]       │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 9. Acceptance Criteria

### AC-001 요구사항 분석 성공

- **Given** 사용자가 요구사항 문서를 입력한다
- **When** AI가 분석을 수행한다
- **Then** 요구사항 요약과 기능 목록이 생성된다

### AC-002 QA 질문 생성

- **Given** 요구사항 문서가 입력된다
- **When** AI가 분석을 수행한다
- **Then** QA 질문 리스트가 생성된다

### AC-003 모호한 요구사항 탐지

- **Given** 모호한 표현이 포함된 요구사항이 입력된다
- **When** AI가 분석을 수행한다
- **Then** 모호한 요구사항 목록과 개선 제안이 표시된다

### AC-004 누락 가능 요구사항 탐지

- **Given** 요구사항 문서가 입력된다
- **When** AI가 분석을 수행한다
- **Then** 일반적으로 필요하나 누락된 요구사항 목록이 표시된다

### AC-005 파일 업로드 분석

- **Given** 사용자가 지원 형식(PDF/DOCX/PNG/JPG/TXT)의 파일을 업로드한다
- **When** 시스템이 파일을 파싱하고 AI가 분석을 수행한다
- **Then** 텍스트 입력과 동일한 분석 결과가 생성된다

### AC-006 결과 내보내기

- **Given** 분석 결과가 생성되어 표시된다
- **When** 사용자가 Excel 또는 JSON 내보내기를 선택한다
- **Then** 해당 형식의 파일이 다운로드된다

### AC-007 응답 시간

- **Given** 사용자가 요구사항을 입력하고 분석을 실행한다
- **When** AI가 분석을 수행한다
- **Then** 180초 이내에 결과가 표시되고, 분석 중 진행 상황이 로딩바로 표시된다

### AC-008 에러 처리

- **Given** 사용자가 지원하지 않는 파일 형식을 업로드한다
- **When** 시스템이 파일을 검증한다
- **Then** "지원하지 않는 파일 형식입니다" 오류 메시지가 표시된다

---

## 10. Scope 정의

### In Scope

- 요구사항 텍스트 및 문서 기반 분석
- 단일 문서 단위 분석
- 한국어/영어 요구사항 분석
- 파일 업로드 (PDF/DOCX/TXT/PNG/JPG)
- 결과 내보내기 (Excel/JSON)

### Out of Scope

- 요구사항 버전 관리 및 변경 이력 추적
- 다수 문서 간 요구사항 교차 분석
- Jira, Confluence 등 외부 도구 연동
- 테스트케이스 자동 생성 (별도 기능으로 분리)
- 사용자 인증/로그인

---

## 11. 기술 구현 결정사항

| 항목 | 결정 | 근거 |
|------|------|------|
| AI 모델 | Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) | 비용 효율성 + 한국어 성능 우수 |
| AI SDK | `@anthropic-ai/sdk` v0.78 | 공식 SDK, 타입 안전성 |
| OCR | Claude Vision API | Tesseract.js 대비 서버리스 호환성 우수, 한국어 지원 |
| 파일 파싱 | pdf-parse, mammoth | 안정적이고 경량 |
| 프레임워크 | Next.js 16 (App Router, Turbopack) | SSR + API Routes 통합 |
| 스타일링 | Tailwind CSS 4 | 유틸리티 기반, 빠른 UI 개발 |
| 스키마 검증 | Zod 4 | 런타임 JSON 검증 + TypeScript 타입 추론 |
| 내보내기 | ExcelJS | .xlsx 생성, 다중 워크시트 지원 |
| 테스트 | Playwright | E2E 브라우저 자동화, CI 통합 용이 |
| 배포 | Vercel | Next.js 최적화, GitHub 자동 배포 |
| 호스팅 | Vercel Hobby | 무료 플랜, 60초 서버리스 함수 제한 |

---

## 12. 경쟁 솔루션 비교 및 차별점

### 12-1. 경쟁 솔루션 분석

| 솔루션 | 유형 | 강점 | 약점 |
|--------|------|------|------|
| ChatGPT / Claude 직접 사용 | 범용 AI | 유연한 대화형 분석 | 구조화된 출력 없음, 매번 프롬프트 작성 필요, 일관성 부족 |
| Jira/Confluence AI | 도구 내장 AI | 기존 워크플로우 통합 | 요구사항 품질 분석 특화 기능 없음, 유료 |
| RequirementsAI (가상) | SaaS | 대규모 팀 협업 | 복잡한 설정, 높은 비용, 한국어 미지원 |
| Manual Review | 수동 검토 | 도메인 전문성 활용 | 시간 소모 크고 일관성 없음, 누락 가능성 높음 |

### 12-2. 본 프로젝트 차별점

| 차별 요소 | 설명 |
|-----------|------|
| **QA 특화 6개 분석 섹션** | 범용 AI 대화와 달리, QA 엔지니어에게 필요한 6가지 관점을 구조화하여 제공 |
| **한국어 요구사항 최적화** | 한국어 서술 패턴(`~해야 한다`, `~할 수 있어야 한다`) 인식에 최적화된 프롬프트 |
| **즉시 사용 가능한 웹 앱** | 별도 설치나 가입 없이 URL 접속만으로 즉시 분석 가능 |
| **구조화된 출력 + 내보내기** | Excel/JSON 내보내기로 QA 업무 문서에 즉시 활용 가능 |
| **모호성 탐지 27.8% 검출률** | 5개 도메인 샘플 기반 검증, 약 28%의 모호한 표현을 자동 탐지 |
| **실시간 진행 표시 (SSE)** | 분석 중 각 섹션별 진행 상황을 실시간으로 스트리밍 표시 |
| **프롬프트 인젝션 방지** | system/user 메시지 구조적 분리로 보안성 확보 |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-03-13 | 초안 작성 |
| 1.1 | 2026-03-13 | 상태 Approved로 변경, 기술 결정사항 확정, 경쟁 분석 추가, NFR-006/007 추가, 구현 상태 반영 |
