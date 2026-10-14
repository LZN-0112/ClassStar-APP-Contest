import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api/v1' : 'http://localhost:3000/api/v1');

console.log('[api] baseURL:', API_BASE_URL);

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
  console.log('[api] fetching CSRF token...');
  const { data } = await api.get<CsrfTokenResponse>('/auth/csrf-token');
  cachedCsrfToken = data.data.token;
  console.log('[api] CSRF token fetched:', cachedCsrfToken);
  return cachedCsrfToken;
}

async function getCsrfToken(): Promise<string> {
  if (cachedCsrfToken) {
    console.log('[api] using cached CSRF token:', cachedCsrfToken);
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
    console.log('[api] request:', config.method?.toUpperCase(), config.url, 'CSRF:', csrfToken);
  } else {
    console.log('[api] request:', config.method?.toUpperCase(), config.url, '(no CSRF)');
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('[api] response:', response.status, response.config.method?.toUpperCase(), response.config.url);
    return response;
  },
  async (error) => {
    const message = error.response?.data?.message || error.message || '请求失败，请稍后重试';
    console.error('[api] response error:', error.response?.status, error.config?.method?.toUpperCase(), error.config?.url, message);

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

    return Promise.reject(new Error(message));
  },
);

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}
