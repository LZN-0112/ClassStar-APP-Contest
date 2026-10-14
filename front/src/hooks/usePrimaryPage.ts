import { useLocation } from 'react-router-dom';

/**
 * 一级主页面（底部导航常驻页面）
 * 顺序与底部导航 Tab 顺序一致
 */
export const PRIMARY_ROUTES = [
  '/home',
  '/class-home',
  '/messages',
  '/data-dashboard',
  '/personal-center',
] as const;

export function useIsPrimaryPage() {
  const location = useLocation();
  return PRIMARY_ROUTES.some((route) => location.pathname === route);
}

export function usePrimaryPageIndex() {
  const location = useLocation();
  return PRIMARY_ROUTES.findIndex((route) => location.pathname === route);
}
