import axios from 'axios';

/**
 * 监控台专用请求实例
 * - 与 App 端 `@/lib/api` 隔离，避免影响移动端既有行为
 * - 保留原始 axios 错误（含 HTTP status），便于识别 401 / 403
 * - 监控台全部接口均为 JWT 鉴权，CsrfGuard 对已认证请求直接放行，无需 CSRF Token
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? '/api/v1'
    : // 生产回退到访问页面的同一主机，避免局域网/手机打开时打到自己的 localhost
      `${window.location.protocol}//${window.location.hostname}:3000/api/v1`);

export const monitorApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

monitorApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

monitorApi.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // token 过期后任意监控接口返回 401：清理登录态并回到监控台登录页，避免停留在空看板
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const hasToken = Boolean(localStorage.getItem('accessToken'));
      const onLogin =
        window.location.hash.startsWith('#/login') ||
        window.location.hash.startsWith('#/monitor/login');
      if (hasToken && !onLogin) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.hash = '#/monitor/login';
      }
    }
    return Promise.reject(error);
  },
);

export interface MonitorEnvelope<T> {
  code: number;
  message: string;
  data: T;
  timestamp?: string;
}

export function getApiErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { message?: string } | undefined;
    return payload?.message || error.message || '请求失败';
  }
  return error instanceof Error ? error.message : '未知错误';
}

/** 解包统一响应结构 { code, message, data }，页面只关心 data */
export async function monitorGet<T>(
  url: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const response = await monitorApi.get<MonitorEnvelope<T>>(url, { params });
  return response.data.data;
}

export async function monitorPatch<T>(url: string, body?: unknown): Promise<T> {
  const response = await monitorApi.patch<MonitorEnvelope<T>>(url, body);
  return response.data.data;
}

export async function monitorPut<T>(url: string, body?: unknown): Promise<T> {
  const response = await monitorApi.put<MonitorEnvelope<T>>(url, body);
  return response.data.data;
}

export async function monitorPost<T>(url: string, body?: unknown): Promise<T> {
  const response = await monitorApi.post<MonitorEnvelope<T>>(url, body);
  return response.data.data;
}