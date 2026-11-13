import { useNavigate } from 'react-router-dom';
import { Pause, Play } from 'lucide-react';
import {
  POMODORO_THEME,
  ROUNDS,
  getPhaseTotal,
  usePomodoroStore,
} from '@/stores/pomodoroStore';

/** 首页迷你计时卡：仅在番茄钟运行/暂停时出现，空闲时不占布局位置 */
export default function PomodoroMiniCard() {
  const navigate = useNavigate();

  const runState = usePomodoroStore((state) => state.runState);
  const phase = usePomodoroStore((state) => state.phase);
  const remaining = usePomodoroStore((state) => state.remaining);
  const round = usePomodoroStore((state) => state.round);
  const focusMinutes = usePomodoroStore((state) => state.focusMinutes);
  const breakMinutes = usePomodoroStore((state) => state.breakMinutes);
  const taskName = usePomodoroStore((state) => state.taskName);
  const pause = usePomodoroStore((state) => state.pause);
  const resume = usePomodoroStore((state) => state.resume);

  if (runState === 'idle') return null;

  const theme = POMODORO_THEME[phase];
  const paused = runState === 'paused';
  const total = getPhaseTotal({ phase, focusMinutes, breakMinutes });
  const progress = total > 0 ? Math.min(Math.max(1 - remaining / total, 0), 1) : 0;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const label = paused
    ? '已暂停'
    : phase === 'focus'
      ? '专注中'
      : phase === 'longBreak'
        ? '长休息中'
        : '短休息中';
  const subText = taskName || (phase === 'focus' ? `第 ${round} / ${ROUNDS} 轮` : '休息一下');

  const accent = paused ? '#94A3B8' : theme.accent;
  const soft = paused ? '#F1F5F9' : theme.soft;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      data-pencil-name="番茄钟迷你计时卡"
      role="button"
      tabIndex={0}
      onClick={() => navigate('/pomodoro')}
      onKeyDown={(event) => {
        if (event.key === 'Enter') navigate('/pomodoro');
      }}
      className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-[#FFFFFF] p-3.5 shadow-soft transition-opacity active:opacity-80"
    >
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
        <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90" aria-hidden>
          <circle cx="20" cy="20" r={radius} fill="none" stroke={theme.track} strokeWidth="3.5" />
          <circle
            cx="20"
            cy="20"
            r={radius}
            fill="none"
            stroke={accent}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-500 ease-linear"
          />
        </svg>
        <span
          className="absolute h-[6px] w-[6px] rounded-full"
          style={{ backgroundColor: accent }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-body text-[13px] font-semibold text-[#1A1A1A]">{label}</span>
          <span className="font-data text-[15px] font-bold tabular-nums" style={{ color: accent }}>
            {timeText}
          </span>
        </div>
        <div className="mt-0.5 truncate font-body text-[11px] text-[#94A3B8]">{subText}</div>
      </div>

      <button
        type="button"
        aria-label={paused ? '继续计时' : '暂停计时'}
        onClick={(event) => {
          event.stopPropagation();
          if (paused) {
            resume();
          } else {
            pause();
          }
        }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
        style={{ backgroundColor: soft, color: accent }}
      >
        {paused ? (
          <Play className="h-4 w-4" strokeWidth={2.2} />
        ) : (
          <Pause className="h-4 w-4" strokeWidth={2.2} />
        )}
      </button>
    </div>
  );
}
