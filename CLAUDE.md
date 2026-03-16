# CLAUDE.md — 요구사항 분석 AI 프로젝트

> 이 파일은 Claude Code가 프로젝트 컨텍스트를 자동으로 인식하기 위한 규칙 파일입니다.

## 프로젝트 개요

- **이름**: 요구사항 분석 AI (req-analyzer)
- **버전**: 1.0.0 (GA)
- **설명**: 소프트웨어 요구사항의 품질을 AI로 분석하고 개선점을 제안하는 웹 애플리케이션
- **GitHub**: https://github.com/jaehoon-sim1/req-analyzer-ai
- **배포**: https://req-analyzer-ai.vercel.app/

## 기술 스택

- **프레임워크**: Next.js 16 (App Router, Turbopack)
- **언어**: TypeScript 5
- **스타일링**: Tailwind CSS 4
- **AI**: Claude API (`@anthropic-ai/sdk`, `claude-haiku-4-5-20251001`)
- **파서**: pdf-parse, mammoth (DOCX), Claude Vision API (이미지 OCR)
- **내보내기**: ExcelJS (7 워크시트)
- **스키마 검증**: Zod 4
- **테스트**: Playwright E2E, Vitest 단위 테스트
- **배포**: Vercel
- **CI/CD**: GitHub Actions

## 프로젝트 구조

```
req-analyzer/              # Next.js 앱 (Vercel Root Directory)
  src/
    app/                   # App Router 페이지 & API 라우트
      api/analyze/         # SSE 스트리밍 분석 API
      api/upload/          # 파일 업로드 + 파싱 API
      api/export/          # Excel/JSON 내보내기 API
    components/            # React 클라이언트 컴포넌트
    lib/
      analyzer.ts          # AI 분석 코어 (Promise.allSettled 병렬 처리)
      anthropic.ts         # Anthropic SDK 클라이언트 (lazy init + 키 검증)
      useAnalysis.ts       # React hook (AbortController + SSE + 180초 타임아웃)
      parsers/             # 파일 파서 (PDF, DOCX, TXT, Image)
      prompts/v1/          # 프롬프트 템플릿 (6개 섹션, system/user 분리)
      export/excel.ts      # ExcelJS 워크북 생성
    types/
      analysis.ts          # 분석 결과 타입 정의
      schemas.ts           # Zod 스키마 (6개 섹션 런타임 검증)
    data/samples.ts        # 샘플 요구사항 데이터
  e2e/                     # Playwright E2E 테스트
  __tests__/               # 단위 테스트 (Vitest)
docs/                      # 프로젝트 문서 (ROADMAP, Sprint, ADR 등)
.github/workflows/         # GitHub Actions CI/CD 파이프라인
```

## 개발 명령어

```bash
cd req-analyzer
npm run dev          # 개발 서버 (Turbopack, localhost:3000)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint 실행
npm run typecheck    # TypeScript 타입 체크
npm run test         # 단위 테스트 (Vitest)
npm run test:e2e     # Playwright E2E 테스트
```

## 환경변수

```
ANTHROPIC_API_KEY=sk-ant-...     # Anthropic API 키 (필수)
ANTHROPIC_MODEL=claude-haiku-4-5-20251001  # 사용 모델
```

## 핵심 아키텍처 패턴

1. **SSE 스트리밍**: `/api/analyze`에서 Server-Sent Events로 실시간 진행률 전달
2. **병렬 분석**: `Promise.allSettled`로 6개 섹션 동시 AI 호출 (IM-01 해결)
3. **Zod 검증**: LLM JSON 응답을 런타임 스키마로 검증 + 실패 시 자동 재시도 (IM-04 해결)
4. **Rate Limiter**: IP별 5 req/min 인메모리 제한 (IM-06 해결)
5. **Lazy Init**: Anthropic 클라이언트 싱글톤 지연 초기화 + 빈 키 검증 (CR-01 해결)
6. **보안 분리**: system 프롬프트와 user 입력 구조적 분리 (CR-02 해결)
7. **AbortController**: 클라이언트 180초 타임아웃 강제 (CR-03 해결)

## 아키텍처 의사결정 기록 (ADR)

### ADR-001: 기술 스택 선정
- **결정**: Next.js 16 + Claude Haiku 4.5 + Vercel
- **근거**: SSR + API Routes 통합, Claude의 한국어 성능, Vercel 자동 배포
- **참조**: `docs/adr/ADR-001-tech-stack.md`

### ADR-002: OCR 방식 변경
- **결정**: Tesseract.js → Claude Vision API
- **근거**: Tesseract.js는 서버리스에서 ~4MB 모델 다운로드로 타임아웃 발생
- **장점**: 모델 다운로드 불필요, 한국어/영어 모두 지원, Hobby 플랜 호환

### ADR-003: 프롬프트 인젝션 방지
- **결정**: Anthropic API의 `system` 파라미터와 `user` 메시지 구조적 분리
- **근거**: 사용자 입력이 시스템 프롬프트를 오버라이드할 수 없는 구조적 방어

## 코딩 컨벤션

- **언어**: UI 텍스트 및 에러 메시지는 한국어
- **컴포넌트**: `'use client'` 명시, `data-testid` 속성 필수
- **접근성**: ARIA 속성 필수 (role, aria-label, aria-selected 등)
- **API**: Next.js Route Handlers (App Router)
- **타입**: `interface` 우선, strict TypeScript
- **커밋**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`)

## 테스트 전략

- **단위 테스트**: Vitest 77 TCs — 스키마 검증, 파서, API 입력 검증, 프롬프트 품질 검증
- **E2E 테스트**: Playwright 12 TCs (TC-E2E-001~012) — AC-001~008 전체 커버
- **보안 스캔**: npm audit, 하드코딩 시크릿 탐지, .env 추적 방지 검증
- **성능 테스트**: 페이지 로드 시간 측정, API 응답 시간 벤치마크, Lighthouse CI 감사
- **회귀 게이트**: 모든 필수 Job 통과 여부 자동 판정 (regression-gate job)
- **CI/CD**: GitHub Actions 7-Job 파이프라인
  - `lint-and-typecheck` → `security-audit` → `build` → `unit-test` (with coverage) → `performance-test` (Lighthouse) → `e2e-test` → `regression-gate`
- **DoD**: 타입체크 + ESLint + 보안스캔 + 빌드 + 단위테스트 + 성능테스트 + E2E + 콘솔에러 0건

## 프로젝트 특화 컨텍스트

### 도메인 지식
- QA 엔지니어가 주 사용자: 요구사항의 모호성, 누락, 테스트 포인트가 핵심 가치
- 한국어 요구사항 패턴: `~해야 한다`, `~할 수 있어야 한다` 가 지배적 서술 패턴
- 모호성 탐지 비율: 샘플 데이터 기준 약 27.8% (36개 중 10개)

### 입력 데이터 특성
- 5개 도메인 샘플: 로그인, 전자상거래, 게시판, 알림, 관리자 대시보드
- 평균 요구사항 수: 약 7.2개/샘플
- 모호 키워드: `빠르게`, `좋아야`, `편해야`, `적절한`, `안정적`, `철저`, `다양한`, `실시간`

### 성능 기준
- 6개 섹션 병렬 처리 시 응답 시간: 약 15~30초
- Vercel Hobby 플랜 함수 제한: 60초
- 클라이언트 타임아웃: 180초 (AbortController)

## 주의사항

- AI 분석 API 응답 최대 180초 소요 가능 (충분한 timeout 설정)
- 이미지 OCR은 Claude Vision API 사용 (Tesseract.js 제거됨)
- 파일 크기 제한 10MB, 텍스트 입력 50,000자 제한
- `.env.local` 파일은 git에 포함하지 않음
