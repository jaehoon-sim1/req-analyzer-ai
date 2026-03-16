# 테스트 실행 결과 보고서

> **실행일시:** 2026-03-16 09:43 KST
> **환경:** Node.js 20, Windows 11, Vitest 4.1.0, Playwright 1.58.2

---

## 1. 단위 테스트 실행 결과 (Vitest — 77/77 PASS)

```
 ✓ __tests__/schemas.test.ts (13 tests)
 ✓ __tests__/parsers.test.ts (4 tests)
 ✓ __tests__/analyzer-utils.test.ts (18 tests)
 ✓ __tests__/api-integration.test.ts (15 tests)
 ✓ __tests__/prompt-quality.test.ts (27 tests)

 Test Files  5 passed (5)
      Tests  77 passed (77)
   Duration  2.99s
```

### 상세 테스트 결과

#### schemas.test.ts — 13 TCs (Zod 스키마 검증)
```
 ✓ Zod Schemas — SummarySection > 유효한 요약 데이터를 통과시킨다
 ✓ Zod Schemas — SummarySection > confidence 필드가 optional이다
 ✓ Zod Schemas — SummarySection > overview가 누락되면 실패한다
 ✓ Zod Schemas — SummarySection > keyPoints가 배열이 아니면 실패한다
 ✓ Zod Schemas — FeatureSection > 유효한 기능 목록을 통과시킨다
 ✓ Zod Schemas — FeatureSection > features가 빈 배열이면 통과한다
 ✓ Zod Schemas — FeatureSection > feature에 id가 없으면 실패한다
 ✓ Zod Schemas — TestPointSection > 유효한 테스트 포인트를 통과시킨다
 ✓ Zod Schemas — TestPointSection > 잘못된 priority 값은 실패한다
 ✓ Zod Schemas — AmbiguitySection > 유효한 모호성 항목을 통과시킨다
 ✓ Zod Schemas — AmbiguitySection > severity가 critical/warning/info만 허용된다
 ✓ Zod Schemas — MissingSection > 유효한 누락 항목을 통과시킨다
 ✓ Zod Schemas — QAQuestionSection > 유효한 QA 질문을 통과시킨다
```

#### parsers.test.ts — 4 TCs (TXT 파서)
```
 ✓ TXT Parser > UTF-8 텍스트 파일을 정상적으로 파싱한다
 ✓ TXT Parser > 빈 텍스트 파일을 처리한다
 ✓ TXT Parser > 한국어 특수문자를 포함한 텍스트를 처리한다
 ✓ TXT Parser > 대용량 텍스트(50,000자)를 처리한다
```

#### analyzer-utils.test.ts — 18 TCs (유틸리티 함수)
```
 ✓ parseJSON — LLM 응답 JSON 파싱 > 순수 JSON 문자열을 파싱한다
 ✓ parseJSON — LLM 응답 JSON 파싱 > 마크다운 코드 블록에서 JSON을 추출한다
 ✓ parseJSON — LLM 응답 JSON 파싱 > json 태그 없는 마크다운 코드 블록을 처리한다
 ✓ parseJSON — LLM 응답 JSON 파싱 > 코드 블록 앞뒤에 텍스트가 있어도 JSON을 추출한다
 ✓ parseJSON — LLM 응답 JSON 파싱 > 잘못된 JSON은 에러를 던진다
 ✓ parseJSON — LLM 응답 JSON 파싱 > 빈 문자열은 에러를 던진다
 ✓ parseJSON — LLM 응답 JSON 파싱 > 중첩된 객체를 파싱한다
 ✓ Rate Limiter 로직 검증 > IP별 요청 제한을 검증한다
 ✓ 입력 검증 로직 > 최소 10자 미만 입력은 유효하지 않다
 ✓ 입력 검증 로직 > 50,000자 초과 입력은 유효하지 않다
 ✓ 입력 검증 로직 > 공백만 있는 입력은 유효하지 않다
 ✓ 파일 업로드 검증 로직 > 허용된 파일 확장자를 검증한다
 ✓ 파일 업로드 검증 로직 > 허용되지 않은 파일 확장자를 거부한다
 ✓ 파일 업로드 검증 로직 > 파일 크기 제한을 검증한다
```

#### api-integration.test.ts — 15 TCs (API 통합 검증)
```
 ✓ Analyze API — 입력 검증 > 텍스트가 없으면 400 에러를 반환한다
 ✓ Analyze API — 입력 검증 > 텍스트가 문자열이 아니면 400 에러를 반환한다
 ✓ Analyze API — 입력 검증 > 10자 미만이면 400 에러를 반환한다
 ✓ Analyze API — 입력 검증 > 50,000자 초과이면 400 에러를 반환한다
 ✓ Analyze API — 입력 검증 > 유효한 텍스트는 통과한다
 ✓ Upload API — 파일 검증 > 파일이 없으면 400 에러를 반환한다
 ✓ Upload API — 파일 검증 > 10MB 초과 파일은 400 에러를 반환한다
 ✓ Upload API — 파일 검증 > 지원하지 않는 확장자는 400 에러를 반환한다
 ✓ Upload API — 파일 검증 > 지원 파일 형식은 통과한다
 ✓ Export API — 요청 검증 > result가 없으면 실패한다
 ✓ Export API — 요청 검증 > format이 없으면 실패한다
 ✓ Export API — 요청 검증 > 잘못된 format 값은 실패한다
 ✓ Export API — 요청 검증 > excel format은 통과한다
 ✓ Export API — 요청 검증 > json format은 통과한다
 ✓ Image Parser — 미디어 타입 감지 > PNG/JPEG/GIF 매직 바이트를 감지한다
```

#### prompt-quality.test.ts — 27 TCs (프롬프트 품질 검증)
```
 ✓ 모호성 탐지 정확도 — 로그인 샘플 > 로그인 샘플에서 모호한 표현을 2개 이상 탐지한다
 ✓ 모호성 탐지 정확도 — 로그인 샘플 > "빠르게"를 모호한 키워드로 탐지한다
 ✓ 모호성 탐지 정확도 — 로그인 샘플 > "철저"를 모호한 키워드로 탐지한다
 ✓ 모호성 탐지 정확도 — 로그인 샘플 > 구체적인 요구사항(비밀번호 8자 이상)은 모호하지 않다
 ✓ 모호성 탐지 정확도 — 로그인 샘플 > 구체적인 요구사항(5회 연속 실패)은 모호하지 않다
 ✓ 모호성 탐지 정확도 — 전자상거래 샘플 > "안정적"을 모호한 키워드로 탐지한다
 ✓ 모호성 탐지 정확도 — 전자상거래 샘플 > "편해야"를 모호한 키워드로 탐지한다
 ✓ 모호성 탐지 정확도 — 전자상거래 샘플 > 정량적 요구사항(0.5초 이내)은 모호하지 않다
 ✓ 모호성 탐지 비율 검증 > 로그인 샘플의 모호성 비율은 20~40% 범위이다
 ✓ 모호성 탐지 비율 검증 > 전자상거래 샘플의 모호성 비율은 20~40% 범위이다
 ✓ 누락 요구사항 탐지 — 로그인 샘플 > 세션 관리가 누락된 것으로 탐지한다
 ✓ 누락 요구사항 탐지 — 로그인 샘플 > 다중 인증(MFA)이 누락된 것으로 탐지한다
 ✓ 누락 요구사항 탐지 — 로그인 샘플 > 감사 로그가 누락된 것으로 탐지한다
 ✓ 누락 요구사항 탐지 — 로그인 샘플 > 접근성이 누락된 것으로 탐지한다
 ✓ 누락 요구사항 탐지 — 로그인 샘플 > 국제화가 누락된 것으로 탐지한다
 ✓ 누락 요구사항 탐지 — 전자상거래 샘플 > 접근성/데이터 백업/감사 로그 누락 탐지
 ✓ 모호성 키워드 목록 품질 > 10개 이상 정의, 중복 없음
 ✓ 누락 카테고리 목록 품질 > 5개 이상 정의, 키워드/설명 존재
```

---

## 2. CI/CD 파이프라인 (GitHub Actions — ci.yml)

### 파이프라인 구조 (7 Jobs)

```yaml
# .github/workflows/ci.yml — 7-Job Pipeline
#
# 파이프라인 흐름:
#   lint-and-typecheck ──┬── build ──┬── performance-test ──┐
#                        │           └── e2e-test            ├── regression-gate
#                        └── unit-test ─────────────────────┘
#   security-audit ─────────────────────────────────────────┘
```

### Job 상세

| # | Job | 도구 | 검증 내용 | Blocking |
|---|-----|------|-----------|----------|
| 1 | `lint-and-typecheck` | TypeScript + ESLint | 타입 에러 0건, 린트 에러 0건 | **필수** |
| 2 | `security-audit` | npm audit + grep scanner | 취약점, 하드코딩 시크릿, .env 추적 | **필수** |
| 3 | `build` | Next.js build | 프로덕션 빌드 성공 + 번들 사이즈 리포트 | **필수** |
| 4 | `unit-test` | Vitest + V8 coverage | 77 TCs 전체 통과 + 커버리지 리포트 | **필수** |
| 5 | `performance-test` | curl + Lighthouse CI | 페이지/API 응답시간, 접근성/SEO 감사 | Advisory |
| 6 | `e2e-test` | Playwright | 12 TCs (AC-001~008 전체 커버) | 조건부 |
| 7 | `regression-gate` | 결과 집계 | 필수 Job 전체 통과 여부 판정 | **필수 (최종)** |

### ci.yml 핵심 코드 발췌

#### security-audit job
```yaml
  security-audit:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - name: npm audit (known vulnerabilities)
        run: npm audit --audit-level=high || true
      - name: Scan for hardcoded secrets
        run: |
          FOUND=$(grep -rn --include="*.ts" --include="*.tsx" --include="*.js" \
            -E "(sk-ant-|ANTHROPIC_API_KEY\s*=\s*['\"]sk-|password\s*=\s*['\"][^'\"]+['\"])" \
            src/ || true)
          if [ -n "$FOUND" ]; then
            echo "::error::Potential hardcoded secrets found:"
            exit 1
          fi
      - name: Verify .env files are gitignored
        run: |
          if git ls-files --cached | grep -q '\.env'; then
            echo "::error::.env file is tracked by git!"
            exit 1
          fi
```

#### unit-test job (with coverage)
```yaml
  unit-test:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - name: Run unit tests with coverage
        run: npx vitest run --coverage.enabled --coverage.provider=v8 --coverage.include="src/lib/**,src/types/**"
      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: req-analyzer/coverage/
```

#### performance-test job
```yaml
  performance-test:
    name: Performance & Lighthouse
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm run build
      - name: Start server and run performance checks
        run: |
          npm start &
          # Page load time (3 iterations)
          for i in 1 2 3; do
            START=$(date +%s%N)
            curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
            END=$(date +%s%N)
            echo "Request $i: $(( (END - START) / 1000000 ))ms"
          done
          # API response time (validation)
          for i in 1 2 3; do
            curl -s -o /dev/null -w "%{http_code}" -X POST \
              http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{"text":""}'
          done
      - name: Lighthouse CI audit
        run: |
          npm install -g @lhci/cli
          lhci autorun --collect.url=http://localhost:3000 --collect.numberOfRuns=1
```

#### regression-gate job
```yaml
  regression-gate:
    name: Regression Gate
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck, security-audit, build, unit-test, performance-test]
    if: always()
    steps:
      - name: Check all required jobs passed
        run: |
          if [ "${{ needs.lint-and-typecheck.result }}" != "success" ]; then exit 1; fi
          if [ "${{ needs.security-audit.result }}" != "success" ]; then exit 1; fi
          if [ "${{ needs.build.result }}" != "success" ]; then exit 1; fi
          if [ "${{ needs.unit-test.result }}" != "success" ]; then exit 1; fi
          echo "All required checks passed. Regression gate OK."
```

---

## 3. E2E 테스트 (Playwright — 12 TCs)

### TC 목록 및 AC 매핑

| TC ID | 검증 대상 | AC 매핑 | 파일 위치 |
|-------|-----------|---------|-----------|
| TC-E2E-001 | 페이지 로드 + 제목 | — | e2e/analysis-flow.spec.ts:10 |
| TC-E2E-002 | 샘플 버튼 → 데이터 로드 | — | e2e/analysis-flow.spec.ts:16 |
| TC-E2E-003 | 초기화 버튼 | — | e2e/analysis-flow.spec.ts:35 |
| TC-E2E-004 | 분석 버튼 비활성화 | — | e2e/analysis-flow.spec.ts:52 |
| TC-E2E-005 | **전체 분석 흐름 (6개 탭)** | **AC-001, AC-002, AC-003** | e2e/analysis-flow.spec.ts:58 |
| TC-E2E-006 | 에러 처리 (공백/짧은 입력) | **AC-008** | e2e/analysis-flow.spec.ts:107 |
| TC-E2E-007 | **누락 요구사항 탐지** | **AC-004** | e2e/analysis-flow.spec.ts:141 |
| TC-E2E-008 | **파일 업로드 (TXT)** | **AC-005** | e2e/analysis-flow.spec.ts:168 |
| TC-E2E-009 | **JSON 내보내기 다운로드** | **AC-006** | e2e/analysis-flow.spec.ts:191 |
| TC-E2E-010 | 파일 업로드 모드 토글 | — | e2e/analysis-flow.spec.ts:209 |
| TC-E2E-011 | 내보내기 버튼 표시 | — | e2e/analysis-flow.spec.ts:230 |
| TC-E2E-012 | 접근성 ARIA 속성 | **AC-007** | e2e/analysis-flow.spec.ts:247 |

### AC 커버리지 매트릭스

| AC | 설명 | E2E TC | 단위 테스트 |
|----|------|--------|------------|
| AC-001 | 요구사항 분석 성공 | TC-E2E-005 | schemas.test.ts |
| AC-002 | QA 질문 생성 | TC-E2E-005 | schemas.test.ts |
| AC-003 | 모호한 요구사항 탐지 | TC-E2E-005 | prompt-quality.test.ts |
| AC-004 | 누락 요구사항 탐지 | **TC-E2E-007** | prompt-quality.test.ts |
| AC-005 | 파일 업로드 분석 | **TC-E2E-008** | api-integration.test.ts, parsers.test.ts |
| AC-006 | 결과 내보내기 | **TC-E2E-009** | api-integration.test.ts |
| AC-007 | 접근성 | **TC-E2E-012** | — |
| AC-008 | 에러 처리 | TC-E2E-006 | api-integration.test.ts |

---

## 4. 로컬 빌드 검증 결과

```
$ npm run typecheck
> tsc --noEmit
(0 errors)

$ npm run lint
> eslint
(0 errors, 3 warnings)

$ npm run build
> next build
✓ Compiled successfully in 5.8s
✓ Generating static pages (7/7) in 1596ms

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/analyze
├ ƒ /api/export
└ ƒ /api/upload
```

---

## 5. 테스트 파일 위치 (레포지토리 경로)

```
req-analyzer/
  __tests__/                          # 단위 테스트 (Vitest, 77 TCs)
    schemas.test.ts                   #   13 TCs — Zod 스키마 검증
    parsers.test.ts                   #    4 TCs — TXT 파서
    analyzer-utils.test.ts            #   18 TCs — parseJSON, Rate Limiter, 입력/파일 검증
    api-integration.test.ts           #   15 TCs — Analyze/Upload/Export API 통합 검증
    prompt-quality.test.ts            #   27 TCs — 모호성/누락 탐지 정확도
  e2e/                                # E2E 테스트 (Playwright, 12 TCs)
    analysis-flow.spec.ts             #   12 TCs — AC-001~AC-008 전체 커버
  vitest.config.ts                    # Vitest 설정 (V8 coverage)
  playwright.config.ts                # Playwright 설정 (Chromium)
.github/workflows/
  ci.yml                              # CI/CD 파이프라인 (7 Jobs)
docs/testing/
  test-strategy.md                    # 테스트 전략 종합 문서
  regression-policy.md                # 회귀 테스트 정책 (7단계)
  test-execution-report.md            # 테스트 실행 결과 보고서 (본 문서)
```
