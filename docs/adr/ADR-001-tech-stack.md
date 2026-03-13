# ADR-001: Technology Stack Selection

## Status

Accepted

## Context

"요구사항 분석 AI" 프로젝트는 사용자가 입력한 요구사항 문서를 AI로 분석하여 요약, 기능 목록, 테스트 포인트, 모호한 요구사항, 누락 가능 요구사항, QA 질문 등을 생성하는 웹 애플리케이션이다.

다음 요구사항을 충족하는 기술 스택을 선정해야 한다:

- AI(Claude) API 연동 및 스트리밍 응답 처리
- 서버사이드 렌더링(SSR) 및 API Routes 지원
- 빠른 프로토타이핑과 반복 개발
- 타입 안전성 확보
- 테스트 자동화 (단위 테스트 + E2E 테스트)
- 간편한 배포 파이프라인

## Decision

| Category | Technology | Rationale |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | React 기반 풀스택 프레임워크. SSR, API Routes, Server Components 지원으로 프론트엔드와 백엔드를 단일 프로젝트에서 관리 가능 |
| **AI SDK** | @anthropic-ai/sdk | Claude API 직접 연동을 위한 공식 SDK. 타입 안전한 API 호출 및 스트리밍 지원 |
| **Streaming** | Vercel AI SDK (ai package) | SSE(Server-Sent Events) 기반 스트리밍 추상화 레이어. React hooks(`useChat`, `useCompletion`) 제공으로 클라이언트 측 스트리밍 UI 구현 간소화 |
| **Styling** | Tailwind CSS | 유틸리티 퍼스트 CSS 프레임워크. 빠른 UI 프로토타이핑 및 일관된 디자인 시스템 구축 가능 |
| **Testing** | Vitest (unit) + Playwright (E2E) | Vitest는 Vite 기반의 빠른 단위 테스트 프레임워크. Playwright는 크로스 브라우저 E2E 테스트 지원 |
| **Deployment** | Vercel | Next.js 네이티브 배포 플랫폼. Edge Functions, 자동 프리뷰 배포, 환경 변수 관리 등 제공 |
| **Language** | TypeScript | 정적 타입 시스템으로 컴파일 타임 오류 검출. AI 응답 파싱 시 타입 안전성 확보에 필수적 |

## Consequences

### Positive

- **풀스택 단일 프로젝트**: Next.js App Router를 통해 프론트엔드와 백엔드(API Routes)를 하나의 코드베이스에서 관리할 수 있어 개발 효율성이 높다.
- **스트리밍 UX**: Vercel AI SDK가 제공하는 추상화 레이어로 SSE 기반 실시간 스트리밍 UI를 빠르게 구현할 수 있다.
- **타입 안전성**: TypeScript를 통해 AI 응답 구조를 타입으로 정의하고, 런타임 오류를 사전에 방지할 수 있다.
- **빠른 배포**: Vercel 플랫폼과 Next.js의 네이티브 통합으로 CI/CD 파이프라인 구성이 간편하다.
- **테스트 커버리지**: Vitest(단위)와 Playwright(E2E)의 조합으로 프롬프트 로직부터 사용자 시나리오까지 포괄적 테스트가 가능하다.

### Negative

- **Vercel 종속성**: 배포 플랫폼이 Vercel에 종속될 수 있으나, Next.js 자체는 다른 환경(Docker, AWS 등)에서도 배포 가능하다.
- **AI SDK 버전 의존**: Vercel AI SDK와 Anthropic SDK 간 버전 호환성을 지속적으로 관리해야 한다.
- **학습 곡선**: App Router(Server Components, Server Actions)는 기존 Pages Router 대비 학습 곡선이 존재한다.
