/**
 * E2E 테스트 — 요구사항 분석 AI (Playwright)
 *
 * 총 12개 테스트 케이스 (TC-E2E-001 ~ TC-E2E-012)
 * Acceptance Criteria 커버리지: AC-001 ~ AC-008 전체
 *
 * TC-E2E-001: 페이지 로드 + 제목 표시
 * TC-E2E-002: 샘플 버튼 → 데이터 로드 + 글자수 217자
 * TC-E2E-003: 초기화 버튼 → 입력 클리어
 * TC-E2E-004: 빈 입력 시 분석 버튼 비활성화
 * TC-E2E-005: 전체 분석 흐름 — 6개 탭 전환 + 콘텐츠 확인 (AC-001, AC-002, AC-003)
 * TC-E2E-006: 에러 처리 — 공백/짧은 입력 (AC-008)
 * TC-E2E-007: 누락 요구사항 탐지 — 탭 콘텐츠 + 항목 렌더링 (AC-004)
 * TC-E2E-008: 파일 업로드 — TXT 파일 → textarea 로드 (AC-005)
 * TC-E2E-009: JSON 내보내기 — 다운로드 이벤트 + 파일명 검증 (AC-006)
 * TC-E2E-010: 파일 업로드 모드 토글 UI
 * TC-E2E-011: 분석 후 내보내기 버튼(Excel/JSON) 표시
 * TC-E2E-012: 접근성 ARIA 속성 검증 — lang, tablist, role, aria-selected (AC-007)
 */
import { test, expect } from '@playwright/test';

test.describe('Requirements Analyzer E2E Tests — 12 TCs (AC-001~AC-008)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // TC-E2E-001: Page loads with correct title
  test('TC-E2E-001: page loads with correct title', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toHaveText('요구사항 분석 AI');
  });

  // TC-E2E-002: Sample button loads sample data
  test('TC-E2E-002: sample button loads sample data with correct char count', async ({ page }) => {
    const textarea = page.locator('[data-testid="req-input"]');
    await expect(textarea).toHaveValue('');

    // Click the login sample button
    const sampleButton = page.getByRole('button', { name: '로그인 시스템' });
    await sampleButton.click();

    // Verify textarea has content
    await expect(textarea).not.toHaveValue('');
    const value = await textarea.inputValue();
    expect(value.length).toBeGreaterThan(0);

    // Verify char counter shows 217
    const charCounter = page.locator('text=217');
    await expect(charCounter).toBeVisible();
  });

  // TC-E2E-003: Reset button clears input
  test('TC-E2E-003: reset button clears input', async ({ page }) => {
    const textarea = page.locator('[data-testid="req-input"]');

    // Load sample data first
    const sampleButton = page.getByRole('button', { name: '로그인 시스템' });
    await sampleButton.click();
    await expect(textarea).not.toHaveValue('');

    // Click reset button
    const resetButton = page.getByRole('button', { name: '초기화' });
    await resetButton.click();

    // Verify textarea is cleared
    await expect(textarea).toHaveValue('');
  });

  // TC-E2E-004: Analyze button is disabled when textarea is empty
  test('TC-E2E-004: analyze button is disabled when textarea is empty', async ({ page }) => {
    const analyzeBtn = page.locator('[data-testid="analyze-btn"]');
    await expect(analyzeBtn).toBeDisabled();
  });

  // TC-E2E-005: Full analysis flow
  test('TC-E2E-005: full analysis flow with all tabs', async ({ page }) => {
    test.setTimeout(180000);

    // Click sample button to load data
    const sampleButton = page.getByRole('button', { name: '로그인 시스템' });
    await sampleButton.click();

    // Click analyze button
    const analyzeBtn = page.locator('[data-testid="analyze-btn"]');
    await expect(analyzeBtn).toBeEnabled();
    await analyzeBtn.click();

    // Wait for results to appear (up to 180s)
    const resultSection = page.locator('[data-testid="result-summary"]');
    await expect(resultSection).toBeVisible({ timeout: 180000 });

    // Verify all 6 tabs exist
    const tabDefinitions = [
      { testId: 'section-summary', label: '요약' },
      { testId: 'section-features', label: '기능 목록' },
      { testId: 'section-test-points', label: '테스트 포인트' },
      { testId: 'section-ambiguity', label: '모호한 요구사항' },
      { testId: 'section-missing', label: '누락 요구사항' },
      { testId: 'section-qa-questions', label: 'QA 질문' },
    ];

    // Verify all 6 tab buttons are present
    for (const tab of tabDefinitions) {
      const tabButton = page.locator(`button[data-testid="${tab.testId}"]`);
      await expect(tabButton).toBeVisible();
      await expect(tabButton).toContainText(tab.label);
    }

    // Click each tab and verify content renders
    for (const tab of tabDefinitions) {
      const tabButton = page.locator(`button[data-testid="${tab.testId}"]`);
      await tabButton.click();

      // The content div (not button) should be visible after clicking the tab
      const contentArea = page.locator(`div[data-testid="${tab.testId}"]`);
      await expect(contentArea).toBeVisible({ timeout: 5000 });

      // Verify content is not empty
      const innerText = await contentArea.innerText();
      expect(innerText.trim().length).toBeGreaterThan(0);
    }
  });

  // TC-E2E-006: Error handling for empty/whitespace submission
  test('TC-E2E-006: error handling for empty submission', async ({ page }) => {
    const textarea = page.locator('[data-testid="req-input"]');
    const analyzeBtn = page.locator('[data-testid="analyze-btn"]');

    // Type whitespace-only content - the button should remain disabled
    await textarea.fill('   ');
    await expect(analyzeBtn).toBeDisabled();

    // Type short content (< 10 chars) - button should remain disabled (min length validation)
    await textarea.fill('a');
    await expect(analyzeBtn).toBeDisabled();

    // Type content that meets minimum length (10+ chars) to trigger API call
    await textarea.fill('짧은 요구사항 테스트입니다.');
    await expect(analyzeBtn).toBeEnabled();
    await analyzeBtn.click();

    // Wait for either error message or result (the API might reject very short input)
    const errorOrResult = await Promise.race([
      page.locator('[data-testid="error-message"]').waitFor({ state: 'visible', timeout: 60000 }).then(() => 'error'),
      page.locator('[data-testid="result-summary"]').waitFor({ state: 'visible', timeout: 60000 }).then(() => 'result'),
    ]);

    // If we got an error, verify it's visible and has text
    if (errorOrResult === 'error') {
      const errorMsg = page.locator('[data-testid="error-message"]');
      await expect(errorMsg).toBeVisible();
      const errorText = await errorMsg.innerText();
      expect(errorText.trim().length).toBeGreaterThan(0);
    }
    // If we got a result instead of error, that's also acceptable (API handled short input)
  });

  // TC-E2E-007: AC-004 — Missing requirements detection produces results
  test('TC-E2E-007: AC-004 missing requirements are detected', async ({ page }) => {
    test.setTimeout(180000);

    // Login sample has known missing items (session management, MFA, audit log, etc.)
    await page.getByRole('button', { name: '로그인 시스템' }).click();
    await page.locator('[data-testid="analyze-btn"]').click();

    await expect(page.locator('[data-testid="result-summary"]')).toBeVisible({ timeout: 180000 });

    // Navigate to "누락 요구사항" tab
    const missingTab = page.locator('button[data-testid="section-missing"]');
    await expect(missingTab).toBeVisible();
    await missingTab.click();

    // Verify the missing section has actual content (not empty fallback)
    const missingContent = page.locator('div[data-testid="section-missing"]');
    await expect(missingContent).toBeVisible({ timeout: 5000 });
    const text = await missingContent.innerText();
    expect(text.trim().length).toBeGreaterThan(0);

    // There should be at least one detected missing item rendered
    const missingItems = missingContent.locator('.bg-gray-950');
    const count = await missingItems.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // TC-E2E-008: AC-005 — File upload parses TXT and loads text for analysis
  test('TC-E2E-008: AC-005 file upload parses and loads text', async ({ page }) => {
    test.setTimeout(180000);

    // Switch to file upload mode
    await page.locator('[data-testid="input-mode-file"]').click();
    const uploadArea = page.locator('[data-testid="file-upload"]');
    await expect(uploadArea).toBeVisible();

    // Upload the sample TXT file via the hidden file input
    const fileInput = page.locator('[data-testid="file-upload-input"]');
    await fileInput.setInputFiles('public/sample-requirements.txt');

    // After successful upload, FileUpload calls onTextExtracted → switches to text mode
    const textarea = page.locator('[data-testid="req-input"]');
    await expect(textarea).toBeVisible({ timeout: 30000 });
    const value = await textarea.inputValue();
    expect(value.length).toBeGreaterThan(10);

    // The analyze button should now be enabled
    await expect(page.locator('[data-testid="analyze-btn"]')).toBeEnabled();
  });

  // TC-E2E-009: AC-006 — Export JSON produces downloadable file
  test('TC-E2E-009: AC-006 export JSON download works', async ({ page }) => {
    test.setTimeout(180000);

    // Run analysis first
    await page.getByRole('button', { name: '로그인 시스템' }).click();
    await page.locator('[data-testid="analyze-btn"]').click();
    await expect(page.locator('[data-testid="result-summary"]')).toBeVisible({ timeout: 180000 });

    // Click JSON export and wait for download event
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.locator('[data-testid="export-json"]').click();
    const download = await downloadPromise;

    // Verify filename
    expect(download.suggestedFilename()).toBe('analysis-result.json');
  });

  // TC-E2E-010: File upload mode toggle UI
  test('TC-E2E-010: file upload mode toggle', async ({ page }) => {
    const textModeBtn = page.locator('[data-testid="input-mode-text"]');
    const fileModeBtn = page.locator('[data-testid="input-mode-file"]');

    await expect(textModeBtn).toHaveAttribute('aria-selected', 'true');
    await expect(fileModeBtn).toHaveAttribute('aria-selected', 'false');

    await fileModeBtn.click();
    await expect(fileModeBtn).toHaveAttribute('aria-selected', 'true');
    await expect(textModeBtn).toHaveAttribute('aria-selected', 'false');

    const uploadArea = page.locator('[data-testid="file-upload"]');
    await expect(uploadArea).toBeVisible();

    await textModeBtn.click();
    await expect(textModeBtn).toHaveAttribute('aria-selected', 'true');
    const textarea = page.locator('[data-testid="req-input"]');
    await expect(textarea).toBeVisible();
  });

  // TC-E2E-011: Export buttons appear after analysis
  test('TC-E2E-011: export buttons appear after analysis', async ({ page }) => {
    test.setTimeout(180000);

    await page.getByRole('button', { name: '로그인 시스템' }).click();
    await page.locator('[data-testid="analyze-btn"]').click();
    await expect(page.locator('[data-testid="result-summary"]')).toBeVisible({ timeout: 180000 });

    const excelBtn = page.locator('[data-testid="export-excel"]');
    const jsonBtn = page.locator('[data-testid="export-json"]');

    await expect(excelBtn).toBeVisible();
    await expect(jsonBtn).toBeVisible();
    await expect(excelBtn).toContainText('Excel');
    await expect(jsonBtn).toContainText('JSON');
  });

  // TC-E2E-012: Accessibility — ARIA attributes verification
  test('TC-E2E-012: accessibility attributes are present', async ({ page }) => {
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBe('ko');

    const textarea = page.locator('[data-testid="req-input"]');
    await expect(textarea).toHaveAttribute('aria-label');

    const tablist = page.locator('[role="tablist"]').first();
    await expect(tablist).toBeVisible();

    const textTab = page.locator('[data-testid="input-mode-text"]');
    await expect(textTab).toHaveAttribute('role', 'tab');
    await expect(textTab).toHaveAttribute('aria-selected', 'true');

    const analyzeBtn = page.locator('[data-testid="analyze-btn"]');
    await expect(analyzeBtn).toHaveAttribute('aria-label');

    // Trigger analysis to verify result section accessibility
    await page.getByRole('button', { name: '로그인 시스템' }).click();
    await page.locator('[data-testid="analyze-btn"]').click();

    const resultSection = page.locator('[data-testid="result-summary"]');
    await expect(resultSection).toBeVisible({ timeout: 180000 });

    const resultTablist = resultSection.locator('[role="tablist"]');
    await expect(resultTablist).toBeVisible();

    const resultTabs = resultSection.locator('[role="tab"]');
    expect(await resultTabs.count()).toBe(6);

    const tabpanel = resultSection.locator('[role="tabpanel"]');
    await expect(tabpanel).toBeVisible();
  });

});
