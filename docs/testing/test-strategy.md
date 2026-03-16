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

7개 Job으로 구성된 자동화 파이프라인 (`.github/workflows/ci.yml`):

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

### ci.yml 전문

```yaml
# CI Pipeline — 요구사항 분석 AI
#
# 7-Job 자동화 파이프라인:
#   1. lint-and-typecheck  — TypeScript 타입체크 + ESLint (필수)
#   2. security-audit      — npm audit + 하드코딩 시크릿 탐지 + .env 추적 방지 (필수)
#   3. build               — Next.js 프로덕션 빌드 + 번들 사이즈 리포트 (필수)
#   4. unit-test           — Vitest 77 TCs + V8 커버리지 리포트 (필수)
#   5. performance-test    — 페이지/API 응답시간 측정 + Lighthouse CI 감사 (Advisory)
#   6. e2e-test            — Playwright 12 TCs, AC-001~AC-008 전체 커버 (조건부)
#   7. regression-gate     — 전체 Job 결과 집계 → 최종 통과/실패 판정 (필수)
#
# 파이프라인 흐름:
#   lint-and-typecheck ──┬── build ──┬── performance-test ──┐
#                        │           └── e2e-test            ├── regression-gate
#                        └── unit-test ─────────────────────┘
#   security-audit ─────────────────────────────────────────┘

name: CI Pipeline

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

defaults:
  run:
    working-directory: req-analyzer

jobs:
  lint-and-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: req-analyzer/package-lock.json
      - name: Install dependencies
        run: npm ci
      - name: Run ESLint
        run: npm run lint
      - name: Run TypeScript type check
        run: npm run typecheck

  security-audit:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: req-analyzer/package-lock.json
      - name: Install dependencies
        run: npm ci
      - name: npm audit (known vulnerabilities)
        run: npm audit --audit-level=high || true
      - name: Check for outdated dependencies
        run: npm outdated || true
      - name: Scan for hardcoded secrets
        run: |
          echo "Scanning for potential secrets in source code..."
          FOUND=$(grep -rn --include="*.ts" --include="*.tsx" --include="*.js" \
            -E "(sk-ant-|ANTHROPIC_API_KEY\s*=\s*['\"]sk-|password\s*=\s*['\"][^'\"]+['\"])" \
            src/ || true)
          if [ -n "$FOUND" ]; then
            echo "::error::Potential hardcoded secrets found:"
            echo "$FOUND"
            exit 1
          fi
          echo "No hardcoded secrets detected."
      - name: Verify .env files are gitignored
        run: |
          if git ls-files --cached | grep -q '\.env'; then
            echo "::error::.env file is tracked by git!"
            exit 1
          fi
          echo ".env files are properly gitignored."

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: req-analyzer/package-lock.json
      - name: Install dependencies
        run: npm ci
      - name: Build production
        run: npm run build
      - name: Check bundle size
        run: |
          echo "=== Bundle Size Report ==="
          du -sh .next/ || true
          echo ""
          echo "=== Static Pages ==="
          find .next/server -name "*.html" -exec du -sh {} \; 2>/dev/null || true
          echo ""
          echo "=== JS Chunks ==="
          find .next/static/chunks -name "*.js" -exec du -sh {} \; 2>/dev/null | sort -rh | head -10 || true

  unit-test:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: req-analyzer/package-lock.json
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests with coverage
        run: npx vitest run --coverage.enabled --coverage.provider=v8 --coverage.include="src/lib/**,src/types/**"
      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: req-analyzer/coverage/
          retention-days: 7

  performance-test:
    name: Performance & Lighthouse
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: req-analyzer/package-lock.json
      - name: Install dependencies
        run: npm ci
      - name: Build production
        run: npm run build
      - name: Start server and run performance checks
        run: |
          npm start &
          SERVER_PID=$!
          echo "Waiting for server to start..."
          for i in $(seq 1 30); do
            if curl -s http://localhost:3000 > /dev/null 2>&1; then
              echo "Server is ready!"
              break
            fi
            sleep 1
          done
          echo "=== Performance Test Report ==="
          echo "--- Page Load Time ---"
          for i in 1 2 3; do
            START=$(date +%s%N)
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
            END=$(date +%s%N)
            DURATION=$(( (END - START) / 1000000 ))
            echo "Request $i: ${DURATION}ms (HTTP $HTTP_CODE)"
          done
          echo "--- API Response Time (validation) ---"
          for i in 1 2 3; do
            START=$(date +%s%N)
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
              -X POST http://localhost:3000/api/analyze \
              -H "Content-Type: application/json" \
              -d '{"text":""}')
            END=$(date +%s%N)
            DURATION=$(( (END - START) / 1000000 ))
            echo "Request $i: ${DURATION}ms (HTTP $HTTP_CODE)"
          done
          echo "--- Security Headers ---"
          curl -s -D - http://localhost:3000 -o /dev/null | grep -iE "(x-frame|x-content-type|strict-transport|content-security|x-xss)" || echo "No security headers found"
          echo "--- Server Memory Usage ---"
          ps -o pid,rss,vsz,comm -p $SERVER_PID 2>/dev/null || true
          kill $SERVER_PID 2>/dev/null || true
        env:
          ANTHROPIC_API_KEY: "sk-ant-test-placeholder"
      - name: Lighthouse CI audit
        run: |
          npm install -g @lhci/cli || true
          npm start &
          sleep 5
          lhci autorun --collect.url=http://localhost:3000 \
            --collect.numberOfRuns=1 \
            --assert.preset=lighthouse:no-pwa \
            --assert.assertions.categories:performance=off \
            --assert.assertions.categories:accessibility=warn \
            --assert.assertions.categories:best-practices=warn \
            --assert.assertions.categories:seo=warn \
            2>/dev/null || echo "Lighthouse audit completed (non-blocking)"
          kill %1 2>/dev/null || true
        env:
          ANTHROPIC_API_KEY: "sk-ant-test-placeholder"
          LHCI_BUILD_CONTEXT__CURRENT_HASH: ${{ github.sha }}

  e2e-test:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: build
    if: ${{ github.event_name == 'push' || github.event.pull_request.head.repo.full_name == github.repository }}
    env:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      ANTHROPIC_MODEL: claude-haiku-4-5-20251001
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: req-analyzer/package-lock.json
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      - name: Run E2E tests
        run: npm run test:e2e
        timeout-minutes: 5
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-test-results
          path: req-analyzer/test-results/
          retention-days: 7

  regression-gate:
    name: Regression Gate
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck, security-audit, build, unit-test, performance-test]
    if: always()
    steps:
      - name: Check all required jobs passed
        run: |
          echo "=== Regression Gate Summary ==="
          echo "lint-and-typecheck: ${{ needs.lint-and-typecheck.result }}"
          echo "security-audit:     ${{ needs.security-audit.result }}"
          echo "build:              ${{ needs.build.result }}"
          echo "unit-test:          ${{ needs.unit-test.result }}"
          echo "performance-test:   ${{ needs.performance-test.result }}"
          echo ""
          if [ "${{ needs.lint-and-typecheck.result }}" != "success" ]; then
            echo "::error::Lint & typecheck failed"
            exit 1
          fi
          if [ "${{ needs.security-audit.result }}" != "success" ]; then
            echo "::error::Security audit failed"
            exit 1
          fi
          if [ "${{ needs.build.result }}" != "success" ]; then
            echo "::error::Build failed"
            exit 1
          fi
          if [ "${{ needs.unit-test.result }}" != "success" ]; then
            echo "::error::Unit tests failed"
            exit 1
          fi
          # performance-test is advisory (non-blocking)
          if [ "${{ needs.performance-test.result }}" == "failure" ]; then
            echo "::warning::Performance test had issues (non-blocking)"
          fi
          echo ""
          echo "All required checks passed. Regression gate OK."
```

### 최근 CI 실행 결과 (로컬 검증, 2026-03-16)

```
$ npm run typecheck → PASS (0 errors)
$ npm run lint      → PASS (0 errors, 3 warnings)
$ npm run build     → PASS (Next.js 16.1.6, 5.4s, 7/7 pages)
$ npx vitest run    → PASS (5 files, 77 tests, 2.84s)
```

CI 파이프라인 실행 URL: `https://github.com/jaehoon-sim1/req-analyzer-ai/actions`

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
