/**
 * Vitest 단위 테스트 설정
 *
 * 총 77개 테스트 케이스 (5 파일):
 *   __tests__/schemas.test.ts         — 13 TCs (Zod 스키마 검증, 6개 분석 섹션)
 *   __tests__/parsers.test.ts         —  4 TCs (TXT 파서)
 *   __tests__/analyzer-utils.test.ts  — 18 TCs (parseJSON, Rate Limiter, 입력/파일 검증)
 *   __tests__/api-integration.test.ts — 15 TCs (Analyze/Upload/Export API 통합 검증)
 *   __tests__/prompt-quality.test.ts  — 27 TCs (모호성 탐지 정확도, 누락 탐지 정확도)
 *
 * 실행: npm test (vitest run)
 */
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/types/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
