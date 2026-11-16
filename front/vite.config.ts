import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // 上线门禁：生产构建不得使用 http:// 明文接口。
  // 本机真机联调时在 .env.production.local 显式声明 VITE_ALLOW_HTTP=true 才放行，
  // 该文件不进版本库，发布正式包前删除即可恢复严格校验。
  const allowHttpApi = env.VITE_ALLOW_HTTP === 'true';
  if (mode === 'production' && !allowHttpApi && /^http:\/\//i.test(env.VITE_API_BASE_URL || '')) {
    throw new Error(
      '[build] VITE_API_BASE_URL 不能使用 http:// 明文地址，请改为 https://域名/api/v1（H5 同源部署可用相对路径 /api/v1）',
    );
  }

  return {
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
      allowedHosts: ['localhost', '127.0.0.1', '10.14.179.218'],
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
  };
})
