import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  BookOpen,
  Sparkles,
  Pencil,
} from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import PhoneFrame from '@/components/layout/PhoneFrame';
import StatusBar from '@/components/layout/StatusBar';
import BackButton from '@/components/navigation/BackButton';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import { toast } from 'sonner';
import {
  BREAK_OPTIONS,
  FOCUS_OPTIONS,
  LONG_BREAK_MINUTES,
  POMODORO_THEME as THEME,
  ROUNDS,
  getPhaseTotal,
  usePomodoroStore,
} from '@/stores/pomodoroStore';

const RADIUS = 110;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function Pomodoro() {
  useStatusBarStyle(false); // 浅色背景 → 系统状态栏深色(黑)图标

  const {
    focusMinutes,
    breakMinutes,
    phase,
    round,
    runState,
    remaining,
    taskName,
    stats,
    celebrateKey,
    start: handleStart,
    pause: handlePause,
    resume: handleResume,
    reset: handleReset,
    endBreak: toNextRound,
    applySettings: applyStoreSettings,
    setTaskName,
    clearCelebrate,
  } = usePomodoroStore();

  const [draftTask, setDraftTask] = useState('');
  const [showTaskEdit, setShowTaskEdit] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [draftFocus, setDraftFocus] = useState(25);
  const [draftBreak, setDraftBreak] = useState(5);

  const theme = THEME[phase];

  const phaseTotal = useMemo(
    () => getPhaseTotal({ phase, focusMinutes, breakMinutes }),
    [phase, focusMinutes, breakMinutes]
  );

  // 进入页面时清掉历史完成标记，避免重新进入时重播完成动效
  useEffect(() => {
    clearCelebrate();
  }, [clearCelebrate]);

  const openSettings = () => {
    if (runState !== 'idle') {
      toast.info('计时进行中，本轮结束后即可修改时长');
      return;
    }
    setDraftFocus(focusMinutes);
    setDraftBreak(breakMinutes);
    setShowSettings(true);
  };

  const applySettings = () => {
    applyStoreSettings(draftFocus, draftBreak);
    setShowSettings(false);
    toast.success(`已设置：专注 ${draftFocus} 分钟 / 休息 ${draftBreak} 分钟`);
  };

  const openTaskEdit = () => {
    setDraftTask(taskName);
    setShowTaskEdit(true);
  };

  const applyTask = () => {
    const name = draftTask.trim();
    if (!name) {
      toast.error('请输入本次专注目标');
      return;
    }
    setTaskName(name);
    setShowTaskEdit(false);
  };

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress =
    phaseTotal > 0 ? Math.min(Math.max(1 - remaining / phaseTotal, 0), 1) : 0;
  const completedRounds = phase === 'focus' ? round - 1 : round;
  const isRunning = runState === 'running';

  const phaseLabel =
    phase === 'focus'
      ? isRunning
        ? '专注中'
        : runState === 'paused'
          ? '已暂停'
          : '准备开始'
      : isRunning
        ? phase === 'longBreak'
          ? '长休息中'
          : '短休息中'
        : '休息已暂停';

  const helperText =
    phase === 'focus'
      ? isRunning
        ? '保持节奏，计时结束后自动进入休息'
        : '开始后自动计时，每完成 4 轮进入 15 分钟长休息'
      : '放松一下，休息结束后点击开始进入下一轮';

  return (
    <PhoneFrame
      className="[background-image:linear-gradient(180deg,#EDF4FC_0%,#F7FAFE_45%,#FFFFFF_100%)] bg-no-repeat bg-[length:100%_100%]"
      reserveSafeAreaTop
      safeAreaTopClassName="bg-[#EDF4FC]"
    >
      <StatusBar />
      <div className="relative flex w-full flex-1 flex-col items-center px-4 pb-[calc(16px+env(safe-area-inset-bottom))] sm:px-5">
        {/* 状态色氛围光，随专注/短休息/长休息平滑切换 */}
        <AnimatePresence initial={false}>
          <motion.div
            key={phase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[320px]"
            style={{
              background: `radial-gradient(110% 72% at 50% 0%, ${theme.soft} 0%, rgba(255,255,255,0) 72%)`,
            }}
          />
        </AnimatePresence>

        <div className="relative z-10 flex w-full flex-1 flex-col items-center">
          {/* Header */}
          <div className="flex h-12 w-full shrink-0 items-center justify-between">
            <BackButton />
            <div className="text-[17px] font-heading font-semibold text-[#1A1A1A]">番茄钟</div>
            <button
              type="button"
              aria-label="专注设置"
              onClick={openSettings}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-[#4B5563] shadow-soft transition-transform active:scale-95"
            >
              <Settings className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>

          <div className="mt-4 flex w-full flex-1 flex-col gap-3.5">
            {/* 计时主卡片 */}
            <div className="flex w-full flex-1 flex-col gap-3 rounded-[28px] bg-white/95 p-4 shadow-lift">
              <div className="flex w-full items-center justify-between px-1">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={phaseLabel}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-body font-semibold"
                    style={{ color: theme.accent, backgroundColor: theme.soft }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
                    {phaseLabel}
                  </motion.span>
                </AnimatePresence>
                <span className="text-[11px] font-body text-[#94A3B8]">
                  第 {round} / {ROUNDS} 轮
                </span>
              </div>

              {/* 倒计时环 */}
              <div className="relative mx-auto my-auto flex aspect-square w-[min(300px,80vw)] items-center justify-center">
                <motion.div
                  aria-hidden
                  className="absolute inset-2 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${theme.soft} 0%, rgba(255,255,255,0) 68%)`,
                  }}
                  animate={
                    isRunning
                      ? { opacity: [0.55, 0.9, 0.55], scale: [1, 1.025, 1] }
                      : { opacity: 0.6, scale: 1 }
                  }
                  transition={
                    isRunning
                      ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
                      : { duration: 0.4 }
                  }
                />

                <svg viewBox="0 0 264 264" className="absolute inset-0 h-full w-full" aria-hidden>
                  <defs>
                    <linearGradient id="pomodoro-progress" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={theme.accent} />
                      <stop offset="100%" stopColor={theme.accentLight} />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="132"
                    cy="132"
                    r={RADIUS}
                    fill="none"
                    stroke={theme.track}
                    strokeWidth="15"
                  />
                  <circle
                    cx="132"
                    cy="132"
                    r={RADIUS}
                    fill="none"
                    stroke="url(#pomodoro-progress)"
                    strokeWidth="15"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                    transform="rotate(-90 132 132)"
                    className="transition-[stroke-dashoffset,stroke] duration-500 ease-linear"
                  />
                </svg>

                <div className="relative z-10 flex w-[78%] flex-col items-center gap-2">
                  <motion.div
                    animate={runState === 'paused' ? { opacity: 0.75 } : { opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="font-data text-[clamp(38px,12vw,52px)] font-bold leading-none tracking-tight text-[#1E293B] tabular-nums"
                  >
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </motion.div>
                  <button
                    type="button"
                    onClick={openTaskEdit}
                    className="flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-body transition-transform active:scale-95"
                    style={{ color: taskName ? theme.accent : '#94A3B8', backgroundColor: theme.soft }}
                  >
                    {taskName ? (
                      <BookOpen className="h-3 w-3 shrink-0" strokeWidth={2} />
                    ) : (
                      <Pencil className="h-3 w-3 shrink-0" strokeWidth={2} />
                    )}
                    <span className="truncate">{taskName || '添加专注目标'}</span>
                  </button>
                </div>

                {/* 完成一轮时的扩散光效 */}
                {celebrateKey > 0 && (
                  <div
                    key={celebrateKey}
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  >
                    {[0, 0.18, 0.36].map((delay, index) => (
                      <motion.span
                        key={index}
                        className="absolute rounded-full border-2"
                        style={{ borderColor: theme.accent, width: '72%', height: '72%' }}
                        initial={{ scale: 0.6, opacity: 0.4 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ duration: 1.1, delay, ease: 'easeOut' }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 轮次进度 */}
              <div className="flex w-full items-center justify-center gap-2">
                {Array.from({ length: ROUNDS }, (_, index) => {
                  const done = index < completedRounds;
                  const current = phase === 'focus' && runState !== 'idle' && index === round - 1;
                  return (
                    <span
                      key={index}
                      className="h-2.5 w-2.5 rounded-full transition-colors duration-300"
                      style={{
                        backgroundColor: done ? theme.accent : theme.track,
                        boxShadow: current ? `0 0 0 3px ${theme.soft}` : undefined,
                      }}
                    />
                  );
                })}
                <span className="ml-1 text-[11px] font-body text-[#94A3B8]">4 轮后长休息</span>
              </div>
            </div>

            {/* 操作区 */}
            <div className="flex w-full flex-col gap-2">
              <AnimatePresence mode="wait" initial={false}>
                {runState === 'idle' ? (
                  <motion.button
                    key="start"
                    type="button"
                    onClick={handleStart}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-full text-[15px] font-body font-semibold text-white shadow-[0_10px_24px_-10px_#4B72E0AA]"
                    style={{ backgroundColor: theme.accent }}
                  >
                    <Play className="h-5 w-5" strokeWidth={2} />
                    开始专注 · {focusMinutes} 分钟
                  </motion.button>
                ) : (
                  <motion.div
                    key="running"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="flex w-full gap-3"
                  >
                    <motion.button
                      type="button"
                      onClick={phase === 'focus' ? handleReset : toNextRound}
                      whileTap={{ scale: 0.97 }}
                      className="flex h-14 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#E5EAF2] bg-white px-5 text-[14px] font-body font-semibold text-[#4B5563] transition-colors active:bg-[#F8FAFC]"
                    >
                      <RotateCcw className="h-4 w-4" strokeWidth={2} />
                      {phase === 'focus' ? '重置' : '结束休息'}
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={isRunning ? handlePause : handleResume}
                      whileTap={{ scale: 0.97 }}
                      className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full text-[14px] font-body font-semibold text-white shadow-[0_10px_24px_-12px_#0000004D]"
                      style={{ backgroundColor: theme.accent }}
                    >
                      {isRunning ? (
                        <>
                          <Pause className="h-5 w-5" strokeWidth={2} />
                          暂停
                        </>
                      ) : (
                        <>
                          <Play className="h-5 w-5" strokeWidth={2} />
                          继续
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="text-center text-[11px] leading-relaxed font-body text-[#8A97A8]">
                {helperText}
              </p>
            </div>

            {/* 今日统计 */}
            <div className="flex w-full items-stretch rounded-2xl bg-white/80 px-5 py-3.5 shadow-soft">
              <div className="flex flex-1 flex-col items-center gap-1">
                <span className="font-data text-[20px] font-bold leading-none" style={{ color: theme.accent }}>
                  {stats.completed}
                </span>
                <span className="text-[11px] font-body text-[#8A97A8]">今日番茄</span>
              </div>
              <div className="my-1 w-px bg-[#EDF1F7]" />
              <div className="flex flex-1 flex-col items-center gap-1">
                <span className="font-data text-[20px] font-bold leading-none" style={{ color: theme.accent }}>
                  {stats.minutes}
                </span>
                <span className="text-[11px] font-body text-[#8A97A8]">专注分钟</span>
              </div>
              <div className="my-1 w-px bg-[#EDF1F7]" />
              <div className="flex flex-1 flex-col items-center justify-center gap-1">
                <Sparkles className="h-5 w-5 text-[#C4A66B]" strokeWidth={2} />
                <span className="text-[11px] font-body text-[#8A97A8]">
                  {stats.completed > 0 ? '继续保持' : '今天还没开始'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 专注设置 */}
      <BottomSheet
        open={showSettings}
        onClose={() => setShowSettings(false)}
        title="专注设置"
        maxHeight="85vh"
        footer={
          <button
            type="button"
            onClick={applySettings}
            className="h-[48px] w-full rounded-[14px] font-body text-[15px] font-semibold text-white shadow-[0_10px_20px_rgba(75,114,224,0.24)] transition-transform active:scale-[0.98]"
            style={{ backgroundColor: THEME.focus.accent }}
          >
            保存设置
          </button>
        }
      >
        <div className="px-5 pb-2">
          <div className="text-[12px] font-body font-medium text-[#4B5563]">专注时长</div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {FOCUS_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDraftFocus(option)}
                className="h-10 rounded-[14px] text-[13px] font-body font-semibold transition-colors active:scale-95"
                style={
                  draftFocus === option
                    ? { backgroundColor: THEME.focus.accent, color: '#FFFFFF' }
                    : { backgroundColor: '#F3F6FA', color: '#1A1A1A' }
                }
              >
                {option} 分
              </button>
            ))}
          </div>

          <div className="mt-4 text-[12px] font-body font-medium text-[#4B5563]">休息时长</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {BREAK_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDraftBreak(option)}
                className="h-10 rounded-[14px] text-[13px] font-body font-semibold transition-colors active:scale-95"
                style={
                  draftBreak === option
                    ? { backgroundColor: THEME.break.accent, color: '#FFFFFF' }
                    : { backgroundColor: '#F3F6FA', color: '#1A1A1A' }
                }
              >
                {option} 分
              </button>
            ))}
          </div>

          <p className="mt-4 text-[11px] leading-relaxed font-body text-[#8A97A8]">
            每完成 {ROUNDS} 轮专注，会自动进入 {LONG_BREAK_MINUTES} 分钟长休息。
          </p>
        </div>
      </BottomSheet>

      {/* 编辑专注目标 */}
      <BottomSheet
        open={showTaskEdit}
        onClose={() => setShowTaskEdit(false)}
        title="本次专注目标"
        maxHeight="60vh"
        footer={
          <button
            type="button"
            onClick={applyTask}
            className="h-[48px] w-full rounded-[14px] font-body text-[15px] font-semibold text-white shadow-[0_10px_20px_rgba(75,114,224,0.24)] transition-transform active:scale-[0.98]"
            style={{ backgroundColor: THEME.focus.accent }}
          >
            保存目标
          </button>
        }
      >
        <div className="px-5 pb-2">
          <input
            type="text"
            value={draftTask}
            onChange={(event) => setDraftTask(event.target.value)}
            placeholder="例如：复习高数第三章习题"
            className="w-full rounded-[14px] border border-[#E5EAF2] px-3 py-3 text-[14px] font-body text-[#1A1A1A] outline-none focus:border-[#4B72E0]"
          />
        </div>
      </BottomSheet>
    </PhoneFrame>
  );
}
