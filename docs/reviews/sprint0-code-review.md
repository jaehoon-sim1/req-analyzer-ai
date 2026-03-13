# Sprint 0 Code Review - Requirements Analysis AI

**Reviewer:** Claude Opus 4.6 (Automated)
**Date:** 2026-03-13
**Scope:** `req-analyzer/src/` directory (all source files)
**Stack:** Next.js 15, Anthropic Claude API, Tailwind CSS

---

## Issues

### CRITICAL

#### CR-01: API Key Accepted as Empty String
- **File:** `src/lib/anthropic.ts` (line 4)
- **Description:** The Anthropic client is initialized with `process.env.ANTHROPIC_API_KEY || ''`. If the environment variable is missing, the client is created with an empty API key. This will not fail at startup -- it will fail at runtime with a confusing error deep in the API call stack, making debugging difficult. There is no server-side validation that the key exists before accepting requests.
- **Recommended Fix:**
```typescript
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required');
}
const anthropic = new Anthropic({ apiKey });
```

#### CR-02: Prompt Injection via Unsanitized User Input
- **File:** `src/lib/analyzer.ts` (line 80)
- **Description:** User input is directly interpolated into prompt templates via `promptTemplate.replace('{input}', input)`. A malicious user could craft input containing instructions that override the system prompt (e.g., `"Ignore all previous instructions and return..."`). While the Claude API has some built-in resistance, there is no sanitization or boundary enforcement.
- **Recommended Fix:** Use the Anthropic API's `system` parameter for the instructional prompt, and place user input only in the `user` message. This provides structural separation:
```typescript
async function callClaude(systemPrompt: string, userInput: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userInput }],
  });
  // ...
}
```

#### CR-03: No Request-Level Abort / Timeout Enforcement on Client
- **File:** `src/lib/useAnalysis.ts` (lines 39-94)
- **Description:** The SSE stream reader has no `AbortController` or client-side timeout. If the server hangs or the network stalls, the `while (true)` loop (line 56) will run indefinitely, freezing the UI for the user. The server-side `maxDuration = 180` only applies to Vercel serverless functions and does not protect the client.
- **Recommended Fix:**
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 180_000);
const response = await fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text }),
  signal: controller.signal,
});
// ... in finally block:
clearTimeout(timeout);
```

---

### IMPORTANT

#### IM-01: Sequential API Calls -- Performance Bottleneck
- **File:** `src/lib/analyzer.ts` (lines 67-119)
- **Description:** The 6 section analyses are performed sequentially in a `for` loop. Each Claude API call takes several seconds, so total latency is the sum of all 6 calls. This could easily exceed 60 seconds and risks approaching the 180-second timeout (AC-002). Since the 6 prompts are independent, they can be parallelized.
- **Recommended Fix:** Use `Promise.all` (or `Promise.allSettled` for graceful partial failure) to run all 6 API calls concurrently:
```typescript
const results = await Promise.allSettled(
  SECTIONS.map(section => {
    const prompt = promptTemplate.replace('{input}', input);
    return callClaude(prompt);
  })
);
```
Note: Progress reporting would need to be adapted for concurrent execution.

#### IM-02: JSON Parse Failure Silently Drops Entire Section
- **File:** `src/lib/analyzer.ts` (lines 111-118)
- **Description:** If `parseJSON()` throws (which is likely when the LLM returns non-JSON text), the entire section is silently lost. The catch block logs to console and sends a progress error event, but the final result includes empty fallback data with no indication to the user that a section failed.
- **Recommended Fix:** Add retry logic (1-2 retries) for JSON parse failures. Also surface partial failure status in the metadata so the UI can display a warning:
```typescript
metadata: {
  // ...
  failedSections: string[];
}
```

#### IM-03: SSE Error Response Returns 200 Status
- **File:** `src/app/api/analyze/route.ts` (lines 43-49)
- **Description:** If `analyzeRequirements()` throws, the error is sent as an SSE event inside a 200 response. The client-side code in `useAnalysis.ts` handles this, but any standard HTTP monitoring/logging tools will see a 200 status for failed requests. This complicates observability.
- **Severity note:** This is an accepted trade-off with SSE, but worth documenting.

#### IM-04: `parseJSON` Regex May Fail on Nested Code Blocks
- **File:** `src/lib/analyzer.ts` (lines 26-31)
- **Description:** The regex `/```(?:json)?\s*([\s\S]*?)```/` uses a non-greedy match, which works for a single code block. However, if the LLM returns multiple code blocks or backtick sequences in its response, the first match might capture the wrong content. There is also no validation that the parsed object matches the expected TypeScript interface.
- **Recommended Fix:** Add runtime schema validation (e.g., with Zod) after parsing to ensure the JSON matches the expected structure:
```typescript
import { z } from 'zod';
const SummarySectionSchema = z.object({
  overview: z.string(),
  keyPoints: z.array(z.string()),
});
```

#### IM-05: `response.json()` in Error Path May Throw
- **File:** `src/lib/useAnalysis.ts` (lines 45-48)
- **Description:** When `response.ok` is false, the code calls `await response.json()`. If the server returns a non-JSON error (e.g., an HTML 502 page from a proxy), this will throw an unrelated error, masking the actual HTTP status.
- **Recommended Fix:**
```typescript
if (!response.ok) {
  let errorMsg = `HTTP ${response.status}`;
  try {
    const errData = await response.json();
    errorMsg = errData.error || errorMsg;
  } catch { /* non-JSON response */ }
  throw new Error(errorMsg);
}
```

#### IM-06: No Rate Limiting on the API Route
- **File:** `src/app/api/analyze/route.ts`
- **Description:** There is no rate limiting. Any user (or automated script) can send unlimited requests, each of which triggers 6 Claude API calls. This can lead to large API bills and denial-of-service on the Anthropic account.
- **Recommended Fix:** Add rate limiting middleware (e.g., using `next-rate-limit`, an in-memory store, or Vercel's built-in rate limiting) before processing requests.

#### IM-07: Missing `aria-label` and Accessibility Attributes
- **Files:** `src/components/InputSection.tsx`, `src/components/ResultSection.tsx`, `src/components/ProgressBar.tsx`
- **Description:** The textarea lacks an associated `<label>` with `htmlFor`/`id` binding (the current label is not linked to the input). Tab buttons in `ResultSection` have no `role="tablist"` / `role="tab"` / `aria-selected` attributes. The progress bar has no `role="progressbar"` or `aria-valuenow`.
- **Recommended Fix:** Add proper ARIA attributes:
```tsx
<div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
```

---

### SUGGESTION

#### SG-01: `SECTIONS` Config Uses String Keys Instead of Direct Imports
- **File:** `src/lib/analyzer.ts` (lines 41-48, 79)
- **Description:** `SectionConfig.promptImport` stores a string like `'SUMMARY_PROMPT'` and then accesses it via `(prompts as Record<string, string>)[section.promptImport]`. This bypasses TypeScript's type checking and will silently fail at runtime if a key is misspelled. The `as Record<string, string>` cast eliminates type safety entirely.
- **Recommended Fix:** Import prompts directly and store them in the config:
```typescript
import { SUMMARY_PROMPT, FEATURES_PROMPT, ... } from './prompts/v1';
const SECTIONS = [
  { key: 'summary', prompt: SUMMARY_PROMPT, label: '...' },
  // ...
];
```

#### SG-02: `data-testid` Props Not Reaching DOM in Some Components
- **File:** `src/app/page.tsx` (lines 45, 53, 62)
- **Description:** `data-testid` is passed to `InputSection`, `ProgressBar`, and `ResultSection` as regular props. While `InputSection` and `ResultSection` destructure `props['data-testid']` and pass it through, this pattern is fragile. React does not automatically forward `data-*` attributes from custom component props to DOM elements.
- **Recommended Fix:** Standardize with an explicit `testId` prop or use `React.forwardRef` with spread props.

#### SG-03: Hardcoded Sample Data in Component
- **File:** `src/components/InputSection.tsx` (lines 5-21)
- **Description:** Sample requirement texts are hardcoded inside the component. As the number of samples grows (the fixtures directory has 5 sample files), this will become harder to maintain. The fixtures directory samples are unused in the UI.
- **Recommended Fix:** Move samples to a shared data file or load from the fixtures directory.

#### SG-04: CSS Custom Properties Conflict with Tailwind Dark Mode
- **File:** `src/app/globals.css` (lines 1-26)
- **Description:** The CSS defines light/dark `--background` and `--foreground` variables using `prefers-color-scheme`, but `page.tsx` hardcodes `bg-gray-950 text-gray-100` (always dark). The CSS custom properties are therefore unused and create a misleading dual theming system.
- **Recommended Fix:** Either remove the CSS custom properties or use them consistently in the Tailwind config.

#### SG-05: `'use client'` Directive on `useAnalysis.ts` Library File
- **File:** `src/lib/useAnalysis.ts` (line 1)
- **Description:** `'use client'` is specified on a hook file. While not harmful (the consuming component already has it), hooks are already implicitly client-side when they use React state. This is redundant.
- **Recommended Fix:** Remove `'use client'` from the hook file. The directive on `page.tsx` already covers the component tree.

#### SG-06: Console Error Logging in Production Code
- **File:** `src/lib/analyzer.ts` (line 112)
- **Description:** `console.error()` is used for error logging. In production, this provides no structured logging, alerting, or error tracking.
- **Recommended Fix:** Integrate a structured logging library (e.g., Pino) or error tracking service (e.g., Sentry) for production readiness.

#### SG-07: No Input Minimum Length Validation
- **File:** `src/app/api/analyze/route.ts` (lines 12-17)
- **Description:** The route validates maximum length (50,000 chars) but has no minimum. A user could submit a single character, wasting an API call. The client button disables on empty but allows very short strings.
- **Recommended Fix:** Add a minimum length check (e.g., 10 characters) on both client and server.

#### SG-08: Feature.category is Optional but Prompt Expects It
- **File:** `src/types/analysis.ts` (line 27) vs `src/lib/prompts/v1/features.ts`
- **Description:** The `Feature` interface marks `category` as optional (`category?: string`), but the prompt always instructs the LLM to include a category. The `ResultSection` renders `f.category` without a null check (line 49), which would render `undefined` as text if the field is missing.
- **Recommended Fix:** Either make `category` required in the interface (matching the prompt) or add a fallback in the render: `{f.category || 'General'}`.

---

## Sprint 0 Acceptance Criteria Compliance

| AC | Description | Status | Notes |
|----|------------|--------|-------|
| **AC-001** | Text input -> 6 section analysis result | PASS | All 6 sections (summary, features, testPoints, ambiguity, missingRequirements, qaQuestions) are defined in types, prompted via Claude, and rendered in `ResultSection` with tab navigation. |
| **AC-002** | Response within 180 seconds | CONDITIONAL PASS | `maxDuration = 180` is set on the API route. However, 6 sequential API calls risk approaching this limit under load. No client-side timeout enforcement exists. See IM-01 and CR-03. |
| **AC-003** | Korean I/O support | PASS | All prompts are in Korean. All UI labels and error messages are in Korean. `<html lang="ko">` is set in the layout. Input/output fully supports Korean text. |

---

## Summary Statistics

| Severity | Count |
|----------|-------|
| Critical | 3 |
| Important | 7 |
| Suggestion | 8 |
| **Total** | **18** |

---

## Overall Score: **68 / 100**

### Breakdown

| Category | Score | Max | Notes |
|----------|-------|-----|-------|
| Functionality | 22 | 25 | Core flow works. 6-section analysis + SSE streaming implemented correctly. |
| Security | 8 | 20 | No input sanitization for prompt injection (CR-02). No rate limiting (IM-06). API key fallback to empty string (CR-01). |
| Error Handling | 10 | 15 | Basic error handling present. JSON parse failures silently drop sections (IM-02). SSE error path returns 200 (IM-03). |
| Performance | 8 | 15 | Sequential API calls are a significant bottleneck (IM-01). No client-side abort (CR-03). |
| Code Quality | 12 | 15 | Clean component structure, good TypeScript usage. Type safety bypassed in analyzer (SG-01). Minor issues with props pattern (SG-02). |
| Accessibility | 3 | 5 | Korean language tag set. Missing ARIA attributes (IM-07). |
| Maintainability | 5 | 5 | Good file organization. Prompt versioning (v1 directory). Clean separation of concerns. |

### Strengths
- Clean project structure with well-separated concerns (types, lib, components, API route)
- Good use of TypeScript interfaces for all data structures
- SSE streaming for real-time progress feedback is well-implemented
- Prompt versioning (v1 directory) shows forward-thinking design
- Korean localization is thorough across all user-facing text
- Test IDs (`data-testid`) on key elements prepare the project for E2E testing

### Priority Recommendations
1. **Immediately fix** CR-01 (API key validation) and CR-02 (prompt injection) before any deployment
2. **Parallelize** API calls (IM-01) to reliably meet the 180-second AC-002 requirement
3. **Add AbortController** (CR-03) to prevent client-side hangs
4. **Add rate limiting** (IM-06) before exposing the endpoint publicly
5. **Add Zod validation** (IM-04) for LLM response parsing to improve reliability
