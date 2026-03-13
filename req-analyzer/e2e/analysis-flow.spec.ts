import { test, expect } from '@playwright/test';

test.describe('Requirements Analyzer E2E Tests', () => {

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
      await expect(tabButton).toHaveText(tab.label);
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
    // because the component checks !value.trim()
    await textarea.fill('   ');
    await expect(analyzeBtn).toBeDisabled();

    // Type minimal content that passes the trim check but might cause an API error
    await textarea.fill('a');
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

});
