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

### 2. Build Verification (Mandatory, every PR)

- **Tool**: `npm run build` (Next.js production build)
- **When**: Runs automatically after lint-and-typecheck passes
- **Pass criteria**: Build completes without errors
- **Blocking**: Yes — PRs cannot be merged if this job fails

### 3. End-to-End Tests (Conditional, requires API key)

- **Tool**: Playwright (Chromium)
- **Location**: `req-analyzer/e2e/`
- **When**: Runs automatically when `ANTHROPIC_API_KEY` secret is configured in the repository
- **Model**: `claude-haiku-4-5-20251001` (cost-efficient for CI)
- **Pass criteria**: All Playwright test cases pass
- **Blocking**: Recommended but conditional on secret availability
- **Artifacts**: Test results uploaded for 7 days on every run (pass or fail)

## Regression Test Triggers

| Event | lint-and-typecheck | build | e2e-test |
|---|---|---|---|
| Push to `master` | Always | Always | If secret set |
| Pull request to `master` | Always | Always | If secret set |

## Writing New Regression Tests

- E2E tests live in `req-analyzer/e2e/` and follow the `*.spec.ts` naming convention.
- Each test must be self-contained and must not depend on test execution order.
- Tests that call the Anthropic API must use the `ANTHROPIC_API_KEY` environment variable and must not hard-code credentials.
- Tests should assert observable user-facing behavior, not internal implementation details.

## Flaky Test Policy

- A test that fails intermittently without code changes is classified as flaky.
- Flaky tests must be investigated within 2 business days of being identified.
- A flaky test may be temporarily disabled (with a linked issue) but must not remain disabled beyond one sprint.

## Ownership

- Every contributor is responsible for ensuring their PR does not break existing tests.
- If a change intentionally alters expected behavior, the corresponding test must be updated in the same PR.
- The team reviews test coverage as part of the sprint review process.
