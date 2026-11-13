import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';

export type Phase = 'focus' | 'break' | 'longBreak';
export type RunState = 'idle' | 'running' | 'paused';

export interface PomodoroStats {
  date: string;
  completed: number;
  minutes: number;
}

export interface PhaseTheme {
  accent: string;
  accentLight: string;
  soft: string;
  track: string;
}

export const ROUNDS = 4;
export const LONG_BREAK_MINUTES = 15;
export const FOCUS_OPTIONS = [15, 25, 45, 60];
export const BREAK_OPTIONS = [5, 10, 15];

// 柔和护眼色系：专注=雾蓝，短休息=鼠尾草绿，长休息=柔紫
export const POMODORO_THEME: Record<Phase, PhaseTheme> = {
  focus: { accent: '#4B72E0', accentLight: '#88A6F2', soft: '#EAF0FE', track: '#E3EAF7' },
  break: { accent: '#2F9E86', accentLight: '#6CC7B0', soft: '#E6F7F1', track: '#DFF0EA' },
  longBreak: { accent: '#7A6BE0', accentLight: '#AE9FF0', soft: '#F0EDFC', track: '#E6E1F8' },
};

const STATS_KEY = 'pomodoro:stats:v1';
const SESSION_KEY = 'pomodoro:session:v1';

function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

// 兼容旧版按日期存储的今日统计，首次迁移后继续由 store 持久化
function loadLegacyStats(): PomodoroStats {
  const empty: PomodoroStats = { date: dateKey(), completed: 0, minutes: 0 };
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as PomodoroStats;
    if (parsed.date !== empty.date) return empty;
    return {
      date: parsed.date,
      completed: Number(parsed.completed) || 0,
      minutes: Number(parsed.minutes) || 0,
    };
  } catch {
    return empty;
  }
}

export function getPhaseTotal(state: {
  phase: Phase;
  focusMinutes: number;
  breakMinutes: number;
}) {
  if (state.phase === 'focus') return state.focusMinutes * 60;
  if (state.phase === 'longBreak') return LONG_BREAK_MINUTES * 60;
  return state.breakMinutes * 60;
}

interface PomodoroState {
  focusMinutes: number;
  breakMinutes: number;
  phase: Phase;
  round: number;
  runState: RunState;
  remaining: number;
  endAt: number | null;
  taskName: string;
  stats: PomodoroStats;
  celebrateKey: number;
}

interface PomodoroActions {
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  endBreak: () => void;
  applySettings: (focusMinutes: number, breakMinutes: number) => void;
  setTaskName: (name: string) => void;
  clearCelebrate: () => void;
  tick: () => void;
}

export type PomodoroStore = PomodoroState & PomodoroActions;

const initialState: PomodoroState = {
  focusMinutes: 25,
  breakMinutes: 5,
  phase: 'focus',
  round: 1,
  runState: 'idle',
  remaining: 25 * 60,
  endAt: null,
  taskName: '',
  stats: loadLegacyStats(),
  celebrateKey: 0,
};

export const usePomodoroStore = create<PomodoroStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      start: () => {
        const total = getPhaseTotal(get());
        set({ remaining: total, endAt: Date.now() + total * 1000, runState: 'running' });
      },

      pause: () => {
        const state = get();
        const left = state.endAt
          ? Math.max(0, Math.ceil((state.endAt - Date.now()) / 1000))
          : state.remaining;
        set({ remaining: left, endAt: null, runState: 'paused' });
      },

      resume: () => {
        const state = get();
        const left = state.remaining > 0 ? state.remaining : getPhaseTotal(state);
        set({ remaining: left, endAt: Date.now() + left * 1000, runState: 'running' });
      },

      reset: () => {
        const state = get();
        set({
          runState: 'idle',
          endAt: null,
          phase: 'focus',
          remaining: state.focusMinutes * 60,
        });
      },

      endBreak: () => {
        const state = get();
        set({
          phase: 'focus',
          round: state.round >= ROUNDS ? 1 : state.round + 1,
          remaining: state.focusMinutes * 60,
          endAt: null,
          runState: 'idle',
        });
      },

      applySettings: (focusMinutes, breakMinutes) => {
        set({
          focusMinutes,
          breakMinutes,
          remaining: focusMinutes * 60,
          endAt: null,
          runState: 'idle',
        });
      },

      setTaskName: (name) => set({ taskName: name }),

      clearCelebrate: () => set({ celebrateKey: 0 }),

      tick: () => {
        const state = get();

        // 跨天后重置今日统计，避免首页/番茄钟显示昨天的数据
        const today = dateKey();
        if (state.stats.date !== today) {
          set({ stats: { date: today, completed: 0, minutes: 0 } });
        }

        if (state.runState !== 'running' || !state.endAt) return;

        const now = Date.now();
        const left = Math.max(0, Math.ceil((state.endAt - now) / 1000));
        if (left > 0) {
          if (left !== state.remaining) set({ remaining: left });
          return;
        }

        const end = state.endAt;
        if (state.phase === 'focus') {
          const nextStats: PomodoroStats =
            state.stats.date === today
              ? {
                  ...state.stats,
                  completed: state.stats.completed + 1,
                  minutes: state.stats.minutes + state.focusMinutes,
                }
              : { date: today, completed: 1, minutes: state.focusMinutes };

          const isLongBreak = state.round >= ROUNDS;
          const restMinutes = isLongBreak ? LONG_BREAK_MINUTES : state.breakMinutes;
          const breakEndAt = end + restMinutes * 60 * 1000;

          // 离开过久时休息时段也已过完，直接结算并回到下一轮待开始，避免“人不在还在休息”的错乱
          if (now >= breakEndAt) {
            set({
              stats: nextStats,
              celebrateKey: state.celebrateKey + 1,
              phase: 'focus',
              round: state.round >= ROUNDS ? 1 : state.round + 1,
              remaining: state.focusMinutes * 60,
              endAt: null,
              runState: 'idle',
            });
            toast.info('专注与休息已完成，可以开始下一轮了');
            return;
          }

          set({
            stats: nextStats,
            celebrateKey: state.celebrateKey + 1,
            phase: isLongBreak ? 'longBreak' : 'break',
            remaining: Math.max(0, Math.ceil((breakEndAt - now) / 1000)),
            endAt: breakEndAt,
            runState: 'running',
          });
          toast.success(
            isLongBreak
              ? `${ROUNDS} 轮专注完成，进入 ${LONG_BREAK_MINUTES} 分钟长休息`
              : `第 ${state.round} 轮专注完成，休息 ${state.breakMinutes} 分钟`
          );
          return;
        }

        // 休息结束 → 下一轮待开始
        set({
          phase: 'focus',
          round: state.round >= ROUNDS ? 1 : state.round + 1,
          remaining: state.focusMinutes * 60,
          endAt: null,
          runState: 'idle',
        });
        toast.info('休息结束，开始下一轮专注吧');
      },
    }),
    {
      name: SESSION_KEY,
      version: 1,
      partialize: (state) => ({
        focusMinutes: state.focusMinutes,
        breakMinutes: state.breakMinutes,
        phase: state.phase,
        round: state.round,
        runState: state.runState,
        remaining: state.remaining,
        endAt: state.endAt,
        taskName: state.taskName,
        stats: state.stats,
        celebrateKey: state.celebrateKey,
      }),
    }
  )
);
