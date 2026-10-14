import { api } from './api';

interface ErrorReport {
  error_type: string;
  severity: 'critical' | 'major' | 'minor' | 'info';
  message: string;
  stack_trace?: string;
  page_path?: string;
  device_info?: string;
  browser_info?: string;
  user_feedback?: string;
}

export async function reportError(report: ErrorReport) {
  try {
    await api.post('/errors/logs', report);
  } catch (e) {
    console.error('[errorReporter] 上报失败:', e);
  }
}

export function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  let device = '未知设备';
  if (/iPhone|iPad|iPod/i.test(ua)) device = 'iOS';
  else if (/Android/i.test(ua)) device = 'Android';
  else if (/Windows/i.test(ua)) device = 'Windows';
  else if (/Macintosh/i.test(ua)) device = 'macOS';
  else if (/Linux/i.test(ua)) device = 'Linux';
  return `${device} | ${screen.width}x${screen.height}`;
}

export function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  if (/Chrome\//i.test(ua)) return 'Chrome';
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Edg\//i.test(ua)) return 'Edge';
  return '未知浏览器';
}

export function useErrorReporter() {
  return {
    report: (report: ErrorReport) =>
      reportError({
        ...report,
        device_info: getDeviceInfo(),
        browser_info: getBrowserInfo(),
        page_path: window.location.pathname,
      }),
  };
}
