# 요구사항 분석 AI (Requirements Analyzer AI)

소프트웨어 요구사항 문서를 AI로 분석하여 품질을 평가하고 개선점을 제안하는 웹 애플리케이션입니다.

## 주요 기능

- **요약 생성** — 요구사항 문서의 핵심 내용을 자동으로 요약
- **기능 목록 추출** — 문서에서 기능 요구사항을 자동 식별 및 분류
- **테스트 포인트 도출** — QA 관점에서 테스트해야 할 항목을 도출
- **모호성 탐지** — 불명확하거나 해석이 분분할 수 있는 요구사항 식별
- **누락 요구사항 탐지** — 빠져 있을 가능성이 높은 요구사항 제안
- **QA 질문 생성** — 요구사항 명확화를 위한 질문 목록 생성
- **파일 업로드** — PDF, DOCX, TXT 파일 파싱 지원
- **이미지 OCR** — PNG, JPG 이미지에서 텍스트 추출 (Tesseract.js)
- **내보내기** — 분석 결과를 Excel 또는 JSON으로 다운로드

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router, Turbopack) |
| 언어 | TypeScript 5 |
| 스타일 | Tailwind CSS 4 |
| AI | Claude API (`@anthropic-ai/sdk`) |
| 검증 | Zod 4 (런타임 스키마 검증) |
| 문서 파싱 | pdf-parse, mammoth, Tesseract.js |
| 내보내기 | ExcelJS |
| E2E 테스트 | Playwright |
| CI/CD | GitHub Actions |

## 시작하기

### 사전 요구사항

- Node.js 18+
- Anthropic API Key

### 설치

```bash
git clone https://github.com/jaehoon-sim1/req-analyzer-ai.git
cd req-analyzer-ai/req-analyzer
npm install
```

### 환경 변수

`.env.local` 파일을 생성하고 아래 변수를 설정하세요:

```env
ANTHROPIC_API_KEY=your-api-key-here
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
```

### 개발 서버

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인할 수 있습니다.

### 빌드

```bash
npm run build
npm start
```

### E2E 테스트

```bash
npx playwright install chromium
npx playwright test
```

## 프로젝트 구조

```
src/
  app/
    api/
      analyze/    # SSE 스트리밍 분석 API
      upload/     # 파일 업로드 + 파싱 API
      export/     # Excel/JSON 내보내기 API
    page.tsx      # 메인 페이지
  components/
    InputSection  # 텍스트 입력 + 파일 업로드
    ProgressBar   # 실시간 진행률
    ResultSection # 6개 탭 결과 표시
    FileUpload    # 드래그 앤 드롭 업로드
    FeedbackButtons # 섹션별 피드백
    ErrorMessage  # 에러 표시
  lib/
    analyzer.ts   # 6개 섹션 병렬 분석 엔진
    anthropic.ts  # Claude API 클라이언트
    useAnalysis.ts # React 분석 훅
    parsers/      # PDF, DOCX, TXT, 이미지 파서
    prompts/      # AI 프롬프트 (v1)
    export/       # Excel 생성
  types/
    analysis.ts   # 타입 정의
    schemas.ts    # Zod 스키마
  data/
    samples.ts    # 샘플 데이터
e2e/
  analysis-flow.spec.ts  # Playwright 테스트 (6 TC)
```

## 아키텍처

1. 사용자가 요구사항 텍스트를 입력하거나 파일을 업로드
2. SSE를 통해 6개 분석 섹션을 **병렬로** Claude API에 요청
3. Zod 스키마로 LLM 응답을 실시간 검증 (실패 시 자동 재시도)
4. 각 섹션 완료 시 즉시 UI에 반영 (점진적 렌더링)
5. 결과를 Excel/JSON으로 내보내기 가능

## 라이선스

MIT
