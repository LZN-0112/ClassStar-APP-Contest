import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiErrorMessage } from '../api';

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string;
}

/**
 * 监控台统一查询 hook：
 * - deps 变化时重新加载（首次展示骨架屏）
 * - refresh 用于手动 / 实时事件触发的静默刷新，不打断当前内容
 * - keepPreviousData：翻页/筛选变化时保留旧数据，避免表格整块闪成骨架屏
 */
export function useMonitorQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  options?: { keepPreviousData?: boolean },
) {
  const keepPreviousData = options?.keepPreviousData ?? false;
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    loading: true,
    refreshing: false,
    error: '',
  });

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestId = useRef(0);

  const execute = useCallback(
    async (mode: 'load' | 'refresh') => {
      const id = requestId.current + 1;
      requestId.current = id;

      setState((prev) => {
        const keep = keepPreviousData && prev.data !== null;
        return {
          ...prev,
          loading: mode === 'load' && !keep,
          refreshing: mode === 'refresh' || (mode === 'load' && keep),
          error: '',
        };
      });

      try {
        const data = await fetcherRef.current();
        if (id !== requestId.current) return;
        setState({ data, loading: false, refreshing: false, error: '' });
      } catch (error) {
        if (id !== requestId.current) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          refreshing: false,
          error: getApiErrorMessage(error),
        }));
      }
    },
    [keepPreviousData],
  );

  useEffect(() => {
    void execute('load');
    return () => {
      // 依赖切换或卸载时作废在途请求，避免旧数据覆盖新筛选结果
      requestId.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback(() => execute('load'), [execute]);
  const refresh = useCallback(() => execute('refresh'), [execute]);

  return { ...state, reload, refresh };
}