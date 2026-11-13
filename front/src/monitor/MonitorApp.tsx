import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import MonitorGuard from './MonitorGuard';
import MonitorLayout from './MonitorLayout';
import { MonitorMobileNotice, MonitorNotFound } from './MonitorStates';
import MonitorLogin from './pages/MonitorLogin';
import Overview from './pages/Overview';
import ErrorStream from './pages/ErrorStream';
import ErrorDetail from './pages/ErrorDetail';
import Feedback from './pages/Feedback';
import Users from './pages/Users';
import Classes from './pages/Classes';
import MonitorSettings from './pages/MonitorSettings';

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    setIsDesktop(media.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  return isDesktop;
}

/**
 * 监控台入口（挂载于 /monitor/*）
 * - 桌面端：校验管理员权限后渲染独立控制台布局
 * - 窄屏：默认展示“请用桌面浏览器访问”提示，用户可点击「仍然进入」强制查看
 */
export default function MonitorApp() {
  const isDesktop = useIsDesktop();
  const [forceEnter, setForceEnter] = useState(false);

  if (!isDesktop && !forceEnter) {
    return <MonitorMobileNotice onContinue={() => setForceEnter(true)} />;
  }

  return (
    <Routes>
      {/* 独立登录页，不经过 MonitorGuard，登录成功直接进入概览 */}
      <Route path="login" element={<MonitorLogin />} />
      {/* 其余页面统一走管理员校验 + 控制台布局 */}
      <Route
        element={
          <MonitorGuard>
            <MonitorLayout />
          </MonitorGuard>
        }
      >
        <Route index element={<Overview />} />
        <Route path="errors" element={<ErrorStream />} />
        <Route path="errors/:groupId" element={<ErrorDetail />} />
        <Route path="users" element={<Users />} />
        <Route path="classes" element={<Classes />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="settings" element={<MonitorSettings />} />
        <Route path="*" element={<MonitorNotFound />} />
      </Route>
    </Routes>
  );
}