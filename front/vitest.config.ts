import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Vitest 每次启动都会在"用户数据目录"写入 API token 文件
// （Windows: %LOCALAPPDATA%\vitest，Linux: $XDG_DATA_HOME/vitest；见 vitest 内部
// resolveApiToken）。沙箱与部分 CI 环境禁止访问系统用户目录，会导致进程退出码非零。
// 配置文件加载早于 token 解析，故在此提前重定向到项目内目录。
const userDataDir = fileURLToPath(new URL('./node_modules/.vitest-data', import.meta.url));
process.env.LOCALAPPDATA = userDataDir;
process.env.XDG_DATA_HOME = userDataDir;

/**
 * 前端测试配置（独立于 vite.config.ts，避免加载 badge / dev-locator 插件）
 * - jsdom 模拟浏览器环境
 * - globals: true 供 React Testing Library 自动 cleanup 使用
 */
export default defineConfig({
  // 显式固定缓存目录在项目内，避免写入系统临时目录（CI/沙箱环境常被限制）
  cacheDir: 'node_modules/.vite',
  plugins: [tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});