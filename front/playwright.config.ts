import { defineConfig } from '@playwright/test';

/**
 * L4 端到端测试配置（真实前后端，不 mock）
 *
 * - 使用系统 Edge（channel: msedge）作为浏览器通道，避免下载 Playwright 自带浏览器
 * - workers: 1 串行执行：后端注册限流为 5 次/分钟（per IP），并行会触发 429
 * - webServer 自动拉起后端（nest start --watch）与前端（vite dev），已运行则复用
 *
 * 运行：npx playwright test
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'msedge',
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'npm run start:dev',
      cwd: '../back',
      url: 'http://localhost:3000/api/v1/auth/csrf-token',
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'npm run dev',
      cwd: '.',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});