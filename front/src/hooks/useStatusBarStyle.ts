import { useEffect } from 'react';
import { setStatusBarStyle } from '@/lib/capacitor';

/**
 * 根据页面顶部背景给系统状态栏图标设置深/浅色。
 * 用法：useStatusBarStyle(true) 深色头部白字；useStatusBarStyle(false) 浅色头部深字。
 * 仅在真机(App)生效，H5 预览时自动跳过。
 */
export function useStatusBarStyle(light: boolean): void {
  useEffect(() => {
    void setStatusBarStyle(light);
  }, [light]);
}
