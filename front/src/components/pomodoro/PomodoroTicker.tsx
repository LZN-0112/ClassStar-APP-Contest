import { useEffect } from 'react';
import { usePomodoroStore } from '@/stores/pomodoroStore';

/** 全局番茄钟节拍器：无论是否停留在番茄钟页面，都由它推进倒计时与阶段结算 */
export default function PomodoroTicker() {
  useEffect(() => {
    const tick = () => usePomodoroStore.getState().tick();

    const timer = window.setInterval(tick, 500);
    const handleVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };

    document.addEventListener('visibilitychange', handleVisible);
    tick();

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, []);

  return null;
}
