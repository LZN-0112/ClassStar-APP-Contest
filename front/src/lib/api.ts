import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/** 用户可读的错误文案：无响应/超时统一中文化，避免出现 "Network Error" */
function normalizeErrorMessage(error: unknown): string {
  const err = error as {
    code?: string;
    message?: string;
    response?: { data?: { message?: string } };
  };

  const serverMessage = err.response?.data?.message;
  if (serverMessage) return serverMessage;

  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
    return '请求超时，请稍后重试';
  }
  // 无 response 说明请求未到达服务器（断网 / DNS 失败 / 服务未启动 / 明文流量被拦截）
  if (!err.response) {
    return '网络连接异常，请检查网络后重试';
  }
  return err.message || '请求失败，请稍后重试';
}

// 生产环境不输出调试日志（避免 CSRF token 等信息进入控制台）
const log: (...args: unknown[]) => void = import.meta.env.DEV
  ? (...args) => console.log(...args)
  : () => {};

log('[api] baseURL:', API_BASE_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let cachedCsrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

interface CsrfTokenResponse {
  code: number;
  message: string;
  data: { token: string };
  timestamp: string;
}

async function fetchCsrfToken(): Promise<string> {
  log('[api] fetching CSRF token...');
  const { data } = await api.get<CsrfTokenResponse>('/auth/csrf-token');
  const token = data?.data?.token;
  if (!token) {
    throw new Error('获取安全令牌失败，请检查网络或接口地址配置');
  }
  cachedCsrfToken = token;
  log('[api] CSRF token fetched');
  return cachedCsrfToken;
}

async function getCsrfToken(): Promise<string> {
  if (cachedCsrfToken) {
    log('[api] using cached CSRF token');
    return cachedCsrfToken;
  }
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetchCsrfToken().finally(() => {
      csrfTokenPromise = null;
    });
  }
  return csrfTokenPromise;
}

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const method = config.method?.toLowerCase() || '';
  const isSafeMethod = ['get', 'head', 'options'].includes(method);
  const isCsrfEndpoint = config.url === '/auth/csrf-token';
  const isAuthEndpoint = config.url?.startsWith('/auth/');

  if (!isSafeMethod && !isCsrfEndpoint && !isAuthEndpoint) {
    const csrfToken = await getCsrfToken();
    config.headers['X-CSRF-Token'] = csrfToken;
    log('[api] request:', config.method?.toUpperCase(), config.url, 'CSRF: ok');
  } else {
    log('[api] request:', config.method?.toUpperCase(), config.url, '(no CSRF)');
  }

  return config;
});

/** 用 refreshToken 换新 accessToken；并发 401 时共享同一次刷新，避免重复请求 */
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('登录已过期');

  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh', { refreshToken }, { timeout: 8000 })
      .then((res) => {
        const data = res.data?.data || res.data;
        if (!data?.accessToken) throw new Error('登录已过期');
        localStorage.setItem('accessToken', data.accessToken);
        log('[api] access token refreshed');
        return data.accessToken as string;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/** 登录态确实失效：清理本地凭证并回到登录页 */
function redirectToLogin() {
  cachedCsrfToken = null;
  try {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
  } catch {
    // ignore
  }
  if (!window.location.hash.startsWith('#/login')) {
    window.location.hash = '#/login?reason=expired';
  }
}

api.interceptors.response.use(
  (response) => {
    log('[api] response:', response.status, response.config.method?.toUpperCase(), response.config.url);
    return response;
  },
  async (error) => {
    const message = normalizeErrorMessage(error);
    log('[api] response error:', error.response?.status, error.config?.method?.toUpperCase(), error.config?.url, message);

    // accessToken 只有 2 小时：401 时先静默续期并重放原请求，续期失败才回登录页
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isCredentialRequest =
        /^\/auth\/(login|register|refresh|csrf-token|wechat\/bind|wechat\/login)/.test(url);
      if (!isCredentialRequest) {
        const config = error.config as
          | (typeof error.config & { __authRetry?: boolean })
          | undefined;
        if (config && !config.__authRetry && localStorage.getItem('refreshToken')) {
          config.__authRetry = true;
          try {
            const token = await refreshAccessToken();
            config.headers.Authorization = `Bearer ${token}`;
            return api.request(config);
          } catch (refreshError) {
            // 只有刷新接口本身 401 才说明登录真失效；网络/服务异常保留登录态，避免误踢
            const refreshStatus = (refreshError as { status?: number }).status;
            if (refreshStatus !== 401) {
              return Promise.reject(refreshError);
            }
          }
        }
        redirectToLogin();
      }
    }

    if (
      message.includes('CSRF') &&
      error.config &&
      !error.config.__csrfRetry
    ) {
      cachedCsrfToken = null;
      error.config.__csrfRetry = true;
      try {
        const csrfToken = await fetchCsrfToken();
        error.config.headers['X-CSRF-Token'] = csrfToken;
        return api.request(error.config);
      } catch {
        // fallthrough to reject with original error
      }
    }

    // 保留 HTTP 状态码，便于调用方区分「登录失效(401)」与普通网络异常
    const normalized = new Error(message) as Error & { status?: number };
    normalized.status = error.response?.status;
    return Promise.reject(normalized);
  },
);

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/** 后端返回的相对文件路径（如 /uploads/xxx）转为可访问地址 */
export function resolveFileUrl(url?: string | null): string {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const apiBase = API_BASE_URL.replace(/\/+$/, '');
  const origin = apiBase.replace(/\/api\/v1$/, '');
  // 后端静态文件控制器挂在全局前缀下（/api/v1/uploads），
  // 因此相对路径必须拼到 API base 上，而不是站点根路径。
  if (/^\/api\/v1\//i.test(url)) {
    return `${origin}${url}`;
  }
  return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
}
