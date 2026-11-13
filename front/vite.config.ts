import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    // 上架包不输出 sourcemap，避免源码与业务逻辑随安装包分发
    sourcemap: false,
  },
  server: {
    host: '0.0.0.0',
    https: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    allowedHosts: ['localhost', '127.0.0.1'],
  },
  plugins: [
    react({
      babel: {
        // 仅在开发环境注入定位标记，生产包保持干净
        plugins: mode === 'development' ? ['react-dev-locator'] : [],
      },
    }),
    tsconfigPaths()
  ],
}))
