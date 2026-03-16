# Regression Test Policy

## Purpose

This document defines the regression testing strategy for the Requirements Analyzer project. Its goal is to catch regressions early, maintain confidence in each release, and establish clear ownership of test quality across the team.

## Scope

Regression testing applies to all changes merged into `master`, including feature additions, bug fixes, and dependency upgrades.

## Test Levels

### 1. Type Checking and Linting (Mandatory, every PR)

- **Tool**: TypeScript (`tsc --noEmit`) and ESLint (`next lint`)
- **When**: Runs automatically via CI on every pull request and push to `master`
- **Pass criteria**: Zero type errors, zero lint errors
- **Blocking**: Yes — PRs cannot be merged if this job fails

### 2. Security Scan (Mandatory, every PR)

- **Tool**: `npm audit`, custom secret scanner, .env tracking check
- **When**: Runs automatically in parallel with lint-and-typecheck
- **Checks**:
  - npm audit (high severity vulnerabilities)
  - Hardcoded secrets scan in `src/` (API keys, passwords)
  - Verify `.env` files are not tracked by git
- **Pass criteria**: No high-severity vulnerabilities, no hardcoded secrets, no tracked .env files
- **Blocking**: Yes

### 3. Build Verification (Mandatory, every PR)

- **Tool**: `npm run build` (Next.js production build)
- **When**: Runs automatically after lint-and-typecheck passes
- **Pass criteria**: Build completes without errors
- **Includes**: Bundle size report (JS chunks, static pages)
- **Blocking**: Yes

### 4. Unit Tests (Mandatory, every PR)

- **Tool**: Vitest v4 with V8 coverage
- **Location**: `req-analyzer/__tests__/`
- **When**: Runs automatically after lint-and-typecheck passes
- **Test files** (5 files, 77 test cases):
  - `schemas.test.ts` — Zod schema validation for all 6 analysis sections (13 TCs)
  - `parsers.test.ts` — TXT parser (UTF-8, empty file, Korean chars, large text) (4 TCs)
  - `analyzer-utils.test.ts` — parseJSON, rate limiter, input validation, file upload validation (18 TCs)
  - `api-integration.test.ts` — Analyze/Upload/Export API input validation, image type detection (15 TCs)
  - `prompt-quality.test.ts` — Ambiguity detection accuracy, missing requirement detection accuracy (27 TCs)
- **Pass criteria**: All 77 tests pass, coverage report generated
- **Blocking**: Yes
- **Artifacts**: Coverage report uploaded for 7 days

### 5. Performance Test (Advisory, every PR)

- **Tool**: curl benchmarks + Lighthouse CI (`@lhci/cli`)
- **When**: Runs automatically after build passes
- **Checks**:
  - Page load time (3 iterations)
  - API validation response time (3 iterations)
  - Security headers verification
  - Server memory usage
  - Lighthouse audit (accessibility, best practices, SEO)
- **Pass criteria**: Advisory (non-blocking) — results logged for review
- **Blocking**: No (regression gate treats as warning)

### 6. End-to-End Tests (Conditional, requires API key)

- **Tool**: Playwright v1.58 (Chromium)
- **Location**: `req-analyzer/e2e/`
- **When**: Runs automatically when `ANTHROPIC_API_KEY` secret is configured
- **Model**: `claude-haiku-4-5-20251001` (cost-efficient for CI)
- **Test cases** (12 TCs):
  - TC-E2E-001: Page loads with correct title
  - TC-E2E-002: Sample button loads sample data with correct char count
  - TC-E2E-003: Reset button clears input
  - TC-E2E-004: Analyze button disabled when textarea empty
  - TC-E2E-005: Full analysis flow with all 6 tabs (AC-001, AC-002, AC-003)
  - TC-E2E-006: Error handling for empty/whitespace submission (AC-008)
  - TC-E2E-007: Missing requirements detection (AC-004)
  - TC-E2E-008: File upload parses TXT and loads text (AC-005)
  - TC-E2E-009: Export JSON download works (AC-006)
  - TC-E2E-010: File upload mode toggle UI
  - TC-E2E-011: Export buttons appear after analysis
  - TC-E2E-012: Accessibility ARIA attributes verification (AC-007)
- **AC coverage**: AC-001 through AC-008 fully covered
- **Pass criteria**: All 12 Playwright test cases pass
- **Blocking**: Recommended but conditional on secret availability
- **Artifacts**: Test results uploaded for 7 days

### 7. Regression Gate (Mandatory, every PR)

- **When**: Runs after all other jobs complete
- **Logic**: Aggregates results from all required jobs
  - lint-and-typecheck: **must pass**
  - security-audit: **must pass**
  - build: **must pass**
  - unit-test: **must pass**
  - performance-test: **warning only** (non-blocking)
- **Pass criteria**: All required jobs succeeded
- **Blocking**: Yes — final merge gate

## CI Pipeline Flow

```
lint-and-typecheck ──┬── build ──┬── performance-test ──┐
                     │           └── e2e-test            ├── regression-gate
                     └── unit-test ─────────────────────┘
security-audit ─────────────────────────────────────────┘
```

## Regression Test Triggers

| Event | lint | security | build | unit test | performance | e2e | gate |
|---|---|---|---|---|---|---|---|
| Push to `master` | Always | Always | Always | Always | Always | If secret set | Always |
| Pull request to `master` | Always | Always | Always | Always | Always | If secret set | Always |

## Test Coverage Summary

| Test Level | Tool | Test Count | Coverage |
|---|---|---|---|
| Unit Tests | Vitest | 77 TCs (5 files) | Schemas, parsers, API validation, prompt quality |
| E2E Tests | Playwright | 12 TCs | AC-001~AC-008 full coverage |
| Security | npm audit + scanner | 3 checks | Vulnerabilities, secrets, .env |
| Performance | curl + Lighthouse | 4 checks | Load time, API time, headers, a11y |
| **Total** | | **96+ checks** | |

## Writing New Regression Tests

### Unit Tests
- Live in `req-analyzer/__tests__/` and follow the `*.test.ts` naming convention
- Use Vitest with `@/` path alias for imports
- Run with `npm test` (or `npm run test:watch` for development)

### E2E Tests
- Live in `req-analyzer/e2e/` and follow the `*.spec.ts` naming convention
- Each test must be self-contained and must not depend on test execution order
- Tests that call the Anthropic API must use the `ANTHROPIC_API_KEY` environment variable
- Tests should assert observable user-facing behavior, not internal implementation details
- Use `data-testid` attributes for element selection

## Flaky Test Policy

- A test that fails intermittently without code changes is classified as flaky.
- Flaky tests must be investigated within 2 business days of being identified.
- A flaky test may be temporarily disabled (with a linked issue) but must not remain disabled beyond one sprint.

## Ownership

- Every contributor is responsible for ensuring their PR does not break existing tests.
- If a change intentionally alters expected behavior, the corresponding test must be updated in the same PR.
- The team reviews test coverage as part of the sprint review process.
