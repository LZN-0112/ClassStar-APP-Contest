import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface RouteGuardProps {
  children: ReactNode;
}

/** 解析 JWT 过期时间，格式异常时按未过期处理，交给接口 401 兜底 */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

export default function RouteGuard({ children }: RouteGuardProps) {
  const token = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');

  // 无凭证，或凭证已过期且无法刷新时才拦截；有 refreshToken 时交由启动刷新与 401 兜底处理
  if (!token || (!refreshToken && isTokenExpired(token))) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}