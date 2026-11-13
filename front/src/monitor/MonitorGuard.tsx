import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { monitorApi, getApiErrorMessage, getApiErrorStatus } from './api';
import { MonitorForbidden, MonitorLoading, MonitorUnavailable } from './MonitorStates';

type AccessState = 'checking' | 'granted' | 'forbidden' | 'unavailable' | 'unauthenticated';

/** 已通过校验的 token 缓存，避免监控台内部切页时重复探测 */
let grantedToken: string | null = null;

export default function MonitorGuard({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('accessToken');
  const [state, setState] = useState<AccessState>(
    token && grantedToken === token ? 'granted' : 'checking',
  );
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) return;
    if (grantedToken === token) {
      setState('granted');
      return;
    }

    let cancelled = false;
    setState('checking');

    monitorApi
      .get('/monitor/filters')
      .then(() => {
        grantedToken = token;
        if (!cancelled) setState('granted');
      })
      .catch((error) => {
        if (cancelled) return;
        const status = getApiErrorStatus(error);
        setMessage(getApiErrorMessage(error));
        if (status === 401) {
          grantedToken = null;
          setState('unauthenticated');
        } else if (status === 403) {
          setState('forbidden');
        } else {
          setState('unavailable');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  if (!token || state === 'unauthenticated') {
    // 进入监控台独立登录页，避免跳到 App 的手机壳登录页
    return <Navigate to="/monitor/login" replace />;
  }

  if (state === 'checking') {
    return <MonitorLoading />;
  }

  if (state === 'forbidden') {
    return <MonitorForbidden message={message} onRetry={() => setAttempt((n) => n + 1)} />;
  }

  if (state === 'unavailable') {
    return <MonitorUnavailable message={message} onRetry={() => setAttempt((n) => n + 1)} />;
  }

  return <>{children}</>;
}