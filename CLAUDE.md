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
- **파서**: pdf-parse, mammoth (DOCX), Tesseract.js v7 (OCR)
- **내보내기**: ExcelJS (7 워크시트)
- **스키마 검증**: Zod 4
- **테스트**: Playwright E2E
- **배포**: Vercel

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
      anthropic.ts         # Anthropic SDK 클라이언트 (lazy init)
      useAnalysis.ts       # React hook (AbortController + SSE)
      parsers/             # 파일 파서 (PDF, DOCX, TXT, Image OCR)
      prompts/v1/          # 프롬프트 템플릿 (6개 섹션)
      export/excel.ts      # ExcelJS 워크북 생성
    types/
      analysis.ts          # 분석 결과 타입 정의
      schemas.ts           # Zod 스키마 (6개 섹션)
    data/samples.ts        # 샘플 요구사항 데이터
  e2e/                     # Playwright E2E 테스트
docs/                      # 프로젝트 문서 (ROADMAP.md 등)
```

## 개발 명령어

```bash
cd req-analyzer
npm run dev          # 개발 서버 (Turbopack, localhost:3000)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint 실행
npm run typecheck    # TypeScript 타입 체크
npm run test:e2e     # Playwright E2E 테스트
```

## 환경변수

```
ANTHROPIC_API_KEY=sk-ant-...     # Anthropic API 키 (필수)
ANTHROPIC_MODEL=claude-haiku-4-5-20251001  # 사용 모델
```

## 핵심 아키텍처 패턴

1. **SSE 스트리밍**: `/api/analyze`에서 Server-Sent Events로 실시간 진행률 전달
2. **병렬 분석**: `Promise.allSettled`로 6개 섹션 동시 AI 호출
3. **Zod 검증**: LLM JSON 응답을 런타임 스키마로 검증 + 재시도
4. **Rate Limiter**: IP별 5 req/min 인메모리 제한
5. **Lazy Init**: Anthropic 클라이언트 싱글톤 지연 초기화

## 코딩 컨벤션

- **언어**: UI 텍스트 및 에러 메시지는 한국어
- **컴포넌트**: `'use client'` 명시, `data-testid` 속성 필수
- **API**: Next.js Route Handlers (App Router)
- **타입**: `interface` 우선, strict TypeScript
- **커밋**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`)

## 테스트 전략

- **E2E**: Playwright 6개 테스트케이스 (TC-E2E-001~006)
- **검증 시나리오**: ROADMAP.md 8 Phase MCP 브라우저 자동화
- **DoD**: 타입체크 + ESLint + 빌드 + E2E + 콘솔에러 0건

## 주의사항

- AI 분석 API 응답 최대 180초 소요 가능 (충분한 timeout 설정)
- OCR(Tesseract.js) 첫 호출 시 모델 다운로드 지연 발생
- 파일 크기 제한 10MB, 텍스트 입력 50,000자 제한
- `.env.local` 파일은 git에 포함하지 않음
