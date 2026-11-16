import { describe, it, expect, beforeEach } from 'vitest';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { api } from './api';

interface RecordedCall {
  url: string;
  auth: string;
}

let calls: RecordedCall[] = [];

function ok(config: InternalAxiosRequestConfig, data: unknown): AxiosResponse {
  return { data, status: 200, statusText: 'OK', headers: {}, config };
}

function unauthorized(config: InternalAxiosRequestConfig): AxiosError {
  return new AxiosError(
    'Request failed with status code 401',
    'ERR_BAD_REQUEST',
    config,
    null,
    {
      data: { code: 401, message: '登录已过期', data: null },
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config,
    },
  );
}

function authHeader(config: InternalAxiosRequestConfig): string {
  const headers = config.headers as unknown as {
    Authorization?: string;
    get?: (name: string) => string | undefined;
  };
  return String(headers?.Authorization ?? headers?.get?.('Authorization') ?? '');
}

/** 模拟后端：仅 Bearer fresh-token 可用；refreshToken 为 valid-refresh 时可续期 */
function installAdapter() {
  api.defaults.adapter = async (config) => {
    const auth = authHeader(config);
    calls.push({ url: config.url || '', auth });

    if (config.url === '/auth/refresh') {
      const body = JSON.parse(String(config.data || '{}'));
      if (body.refreshToken === 'valid-refresh') {
        return ok(config, {
          code: 0,
          message: 'ok',
          data: { accessToken: 'fresh-token', expiresIn: 7200 },
        });
      }
      throw unauthorized(config);
    }

    if (auth === 'Bearer fresh-token') {
      return ok(config, { code: 0, message: 'ok', data: { id: 'class-1' } });
    }
    throw unauthorized(config);
  };
}

const refreshCalls = () => calls.filter((call) => call.url === '/auth/refresh');

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '#/home';
  calls = [];
  installAdapter();
});

describe('API 登录态自动续期', () => {
  it('accessToken 过期时静默续期并重放原请求', async () => {
    localStorage.setItem('accessToken', 'stale-token');
    localStorage.setItem('refreshToken', 'valid-refresh');

    const res = await api.get('/classes/1');

    expect(res.data.data.id).toBe('class-1');
    expect(localStorage.getItem('accessToken')).toBe('fresh-token');
    expect(refreshCalls()).toHaveLength(1);
    // 原请求先失败一次，续期后带新 token 重放成功
    expect(calls.filter((call) => call.url === '/classes/1')).toHaveLength(2);
  });

  it('多个请求同时 401 只发起一次续期', async () => {
    localStorage.setItem('accessToken', 'stale-token');
    localStorage.setItem('refreshToken', 'valid-refresh');

    const results = await Promise.all([api.get('/classes/1'), api.get('/classes/2')]);

    expect(results.map((res) => res.data.data.id)).toEqual(['class-1', 'class-1']);
    expect(refreshCalls()).toHaveLength(1);
  });

  it('refreshToken 也失效时清理登录态并回到登录页', async () => {
    localStorage.setItem('accessToken', 'stale-token');
    localStorage.setItem('refreshToken', 'expired-refresh');

    await expect(api.get('/classes/1')).rejects.toMatchObject({ status: 401 });

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(window.location.hash).toBe('#/login?reason=expired');
  });

  it('续期遇到网络异常时保留登录态，不误踢用户', async () => {
    localStorage.setItem('accessToken', 'stale-token');
    localStorage.setItem('refreshToken', 'valid-refresh');

    api.defaults.adapter = async (config) => {
      if (config.url === '/auth/refresh') {
        throw new AxiosError('Network Error', 'ERR_NETWORK', config);
      }
      throw unauthorized(config);
    };

    await expect(api.get('/classes/1')).rejects.toMatchObject({
      message: '网络连接异常，请检查网络后重试',
    });

    expect(localStorage.getItem('refreshToken')).toBe('valid-refresh');
    expect(localStorage.getItem('accessToken')).toBe('stale-token');
    expect(window.location.hash).toBe('#/home');
  });

  it('没有 refreshToken 时直接回登录页', async () => {
    localStorage.setItem('accessToken', 'stale-token');

    await expect(api.get('/classes/1')).rejects.toMatchObject({ status: 401 });

    expect(window.location.hash).toBe('#/login?reason=expired');
  });
});