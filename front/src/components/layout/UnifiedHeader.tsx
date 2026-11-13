import { ReactNode, RefObject, useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isNative } from '@/lib/capacitor';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import StatusBar from './StatusBar';
import BackButton from '@/components/navigation/BackButton';

/** 封面高度：滚动此距离后顶栏完全落下 */
export const COVER_H = 200;
/** 折叠后顶栏高度（不含状态栏安全区） */
const BAR_H = 56;

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** 封面底色：a 品牌蓝 / b 天蓝 / ai 首页同款品牌蓝（右上白色光斑 + 右下青色光晕），均带右上角光斑 */
const COVER_BG: Record<'a' | 'b' | 'ai', string> = {
  a: 'radial-gradient(120% 90% at 88% -12%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0) 60%), linear-gradient(158deg, #0B4FD6 0%, #2E7DFF 52%, #6EA8FF 100%)',
  b: 'radial-gradient(120% 90% at 88% -12%, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0) 60%), linear-gradient(158deg, #0B57C8 0%, #2E93F0 52%, #7CCBFF 100%)',
  ai: 'radial-gradient(120% 90% at 92% -10%, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0) 58%), radial-gradient(80% 70% at 100% 108%, rgba(34,211,238,0.30) 0%, rgba(34,211,238,0) 62%), linear-gradient(152deg, #3D93FF 0%, #0B66FF 52%, #0043BC 100%)',
};

export interface HeaderChip {
  label: string;
  onClick?: () => void;
}

/** AI 服务状态：连接中 / 在线 / 离线 */
export type AiServiceStatus = 'checking' | 'online' | 'offline';

const AI_STATUS_VIEW: Record<AiServiceStatus, { dot: string; text: string; label: string }> = {
  online: { dot: 'bg-[#34D399] shadow-[0_0_8px_#34D399]', text: 'text-[#D6E9FF]', label: '在线 · 班务星 AI' },
  checking: { dot: 'bg-[#CBD5E1] shadow-[0_0_8px_rgba(203,213,225,0.85)]', text: 'text-[#D6E9FF]', label: '连接中 · 班务星 AI' },
  offline: { dot: 'bg-[#F87171] shadow-[0_0_8px_#F87171]', text: 'text-[#FFE0E0]', label: '离线 · 班务星 AI' },
};

interface UnifiedHeaderProps {
  title: string;
  variant?: 'a' | 'b' | 'ai';
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  className?: string;
  decor?: ReactNode;
  /** 仅 ai 变体：标题下方的能力标签 */
  chips?: HeaderChip[];
  /** PhoneFrame 暴露的滚动容器：传入后启用「滚动折叠」封面头部 */
  scrollerRef?: RefObject<HTMLDivElement>;
  /** 封面高度（默认 COVER_H）；紧凑头部（如 ai）可调小 */
  coverHeight?: number;
  /** 仅 ai 变体：AI 服务实时状态，缺省按在线展示 */
  aiStatus?: AiServiceStatus;
}

/**
 * 统一折叠头部（方案 B）
 * - 顶部为品牌蓝圆角封面，大标题压在封面底部
 * - 页面滚动时封面随之上移缩小淡出，顶栏由透明渐变为白底黑字
 * - 需放在页面滚动容器内部（与正文同层），封面用绝对定位 + 流内占位撑开
 */
export default function UnifiedHeader({
  title,
  variant = 'a',
  showBack = true,
  onBack,
  right,
  className,
  decor,
  chips,
  scrollerRef,
  coverHeight,
  aiStatus = 'online',
}: UnifiedHeaderProps) {
  const coverH = coverHeight ?? COVER_H;
  /** 顶栏文字/图标是否已切到深色（白色顶栏底） */
  const [darkInk, setDarkInk] = useState(false);
  const darkInkRef = useRef(false);
  const headerRef = useRef<HTMLElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const barBgRef = useRef<HTMLDivElement>(null);
  const blurRef = useRef(false);

  useStatusBarStyle(!darkInk);

  /** 滚动驱动头部折叠：p=0 封面铺满，p=1 顶栏完全落下 */
  useEffect(() => {
    const scroller = scrollerRef?.current;
    const header = headerRef.current;
    const cover = coverRef.current;
    if (!scroller || !header || !cover) return;

    let raf = 0;
    const apply = () => {
      raf = 0;
      const distance = Math.max(coverH - BAR_H, 1);
      const p = clamp01(scroller.scrollTop / distance);
      header.style.setProperty('--p', p.toFixed(3));
      // 顶栏标题在 p > 0.15 后淡入，与滚走的封面大标题交接
      header.style.setProperty('--title', clamp01((p - 0.15) / 0.45).toFixed(3));
      // 封面即将滚完时把白色顶栏补实，避免内容从底边渐隐区透出
      header.style.setProperty('--solid', clamp01((p - 0.55) / 0.2).toFixed(3));

      // 封面：随滚动上移 + 轻微缩小 + 淡化
      // 封面内容不在 header 内，需要单独注入进度变量
      cover.style.setProperty('--p', p.toFixed(3));
      cover.style.transformOrigin = 'top center';
      cover.style.transform = `translate3d(0, ${(-p * 28).toFixed(1)}px, 0) scale(${(1 - p * 0.03).toFixed(3)})`;
      cover.style.opacity = (1 - p * 0.12).toFixed(3);

      // 顶栏底色出现后叠加磨砂，让半透明白压在封面上时是玻璃质感
      const nextBlur = p > 0.2;
      if (nextBlur !== blurRef.current) {
        blurRef.current = nextBlur;
        const bg = barBgRef.current;
        if (bg) {
          const value = nextBlur ? 'saturate(160%) blur(14px)' : '';
          bg.style.backdropFilter = value;
          bg.style.setProperty('-webkit-backdrop-filter', value);
        }
      }

      // 明暗切换加滞回，避免在临界点来回抖动
      const nextDark = darkInkRef.current ? p > 0.38 : p > 0.5;
      if (nextDark !== darkInkRef.current) {
        darkInkRef.current = nextDark;
        setDarkInk(nextDark);
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    apply();
    scroller.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      scroller.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [scrollerRef, coverH]);

  return (
    <>
      {/* 固定顶栏：sticky + h-0 不占内容空间，内部向下溢出显示 */}
      <header ref={headerRef} className={cn('pointer-events-none sticky top-0 z-30 h-0', className)}>
        <div
          className="relative w-full"
          style={{
            paddingTop: isNative ? 'var(--safe-top, env(safe-area-inset-top, 0px))' : undefined,
          }}
        >
          {/* 顶栏底色：alpha 由滚动进度驱动；底部一段渐隐，磨砂随之淡出，避免与封面形成硬边 */}
          <div
            ref={barBgRef}
            className="absolute inset-0"
            style={{
              // ai 变体的封面文字与顶栏同区，白底提前补上，避免半透明白把文字糊成一片
              backgroundColor:
                variant === 'ai'
                  ? 'rgba(255, 255, 255, calc(var(--p, 0) * 1.9))'
                  : 'rgba(255, 255, 255, var(--p, 0))',
              maskImage: 'linear-gradient(180deg, #000 0%, #000 76%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 76%, transparent 100%)',
            }}
          />
          {/* 收尾补实：封面即将滚完时铺满，内容不会从底边透出 */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ backgroundColor: 'rgba(255, 255, 255, var(--solid, 0))' }}
          />
          {/* 顶栏下沿投影：白底与白色内容之间留一道柔性分隔 */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[10px] translate-y-full"
            style={{
              opacity: 'var(--p, 0)',
              background: 'linear-gradient(180deg, rgba(16,24,40,0.10) 0%, rgba(16,24,40,0) 100%)',
            }}
          />
          <StatusBar light={!darkInk} />
          <div className="relative flex items-center px-5" style={{ height: BAR_H }}>
            {showBack ? (
              <BackButton
                onClick={onBack}
                variant={darkInk ? 'light' : 'dark'}
                className={cn(
                  'pointer-events-auto h-10 w-10 shrink-0 rounded-full border transition-colors duration-300',
                  darkInk
                    ? 'border-black/10 bg-transparent text-[#1A1F2C]'
                    : 'border-white/30 bg-white/[0.18] text-white backdrop-blur-sm'
                )}
              />
            ) : (
              <div className="h-10 w-10 shrink-0" />
            )}
            {/* 顶栏标题：p > 0.7 后淡入，与滚走的封面大标题交接 */}
            <div
              className="pointer-events-none absolute inset-x-0 text-center text-[17px] font-semibold tracking-[0.5px] text-[#1A1F2C]"
              style={{ opacity: 'var(--title, 0)' }}
            >
              {title}
            </div>
            {right ? (
              <div
                className="pointer-events-auto ml-auto"
                style={{
                  opacity:
                    variant === 'ai' ? 'calc(1 - var(--p, 0) * 3.2)' : 'calc(1 - var(--p, 0))',
                }}
              >
                {right}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* 封面：随内容自然滚出（不接管滚动，纯 CSS 位移） */}
      <div
        ref={coverRef}
        aria-hidden={variant === 'ai' ? undefined : true}
        className="pointer-events-none absolute left-0 top-0 z-0 w-full overflow-hidden rounded-b-[24px] shadow-[0_10px_24px_-12px_rgba(11,79,214,0.55)]"
        style={{ height: coverH, backgroundImage: COVER_BG[variant] }}
      >
        {variant === 'ai' ? (
          <>
            {/* 智能感网格 + 同心圆环，只铺在右上区域，避免抢标题 */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
                backgroundSize: '26px 26px',
                maskImage: 'radial-gradient(120% 100% at 82% 0%, #000 0%, transparent 72%)',
                WebkitMaskImage: 'radial-gradient(120% 100% at 82% 0%, #000 0%, transparent 72%)',
              }}
            />
            <div className="pointer-events-none absolute -right-[74px] -top-[92px] h-[220px] w-[220px] rounded-full border border-white/[0.14]" />
            <div className="pointer-events-none absolute -right-[34px] -top-[52px] h-[150px] w-[150px] rounded-full border border-white/[0.12]" />
            {/* 顶部轻微压暗，保证状态栏图标的对比，同时保留品牌蓝本身的亮度 */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(3,20,50,0.26) 0%, rgba(3,20,50,0.08) 20%, rgba(3,20,50,0) 44%)' }} />
            <div
              className="absolute inset-x-0 top-0"
              style={{
                paddingTop: isNative ? 'var(--safe-top, env(safe-area-inset-top, 0px))' : 62,
                // 标题/标签与顶栏同区，顶栏一落白就会被糊住，随折叠快速淡出，交给顶栏标题接管
                opacity: 'calc(1 - var(--p, 0) * 6)',
              }}
            >
              <div className="flex items-center gap-2.5 pl-5 pr-[92px]" style={{ height: 44 }}>
                <span className="relative flex h-[33px] w-[33px] shrink-0 items-center justify-center rounded-[11px] border border-white/30 bg-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.28)] backdrop-blur-sm">
                  <Sparkles className="h-[16px] w-[16px]" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <div
                    className={cn(
                      'flex items-center gap-1.5 text-[9.5px] font-semibold tracking-[0.06em]',
                      AI_STATUS_VIEW[aiStatus].text
                    )}
                  >
                    <span className={cn('h-[5px] w-[5px] rounded-full', AI_STATUS_VIEW[aiStatus].dot)} />
                    {AI_STATUS_VIEW[aiStatus].label}
                  </div>
                  <h1 className="mt-0.5 truncate text-[19px] font-bold leading-tight tracking-[0.5px] text-white">
                    {title}
                  </h1>
                </div>
              </div>
              {chips?.length ? (
                <div className="flex items-center gap-1.5 px-5 pt-1">
                  {chips.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={chip.onClick}
                      className="pointer-events-auto shrink-0 whitespace-nowrap rounded-full border border-white/25 bg-white/[0.14] px-2.5 py-[5px] text-[11px] font-medium text-[#E8F3FF] backdrop-blur-sm active:scale-95"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div className="pointer-events-none absolute -right-[48px] -top-[52px] h-[170px] w-[170px] rounded-full bg-white/[0.18]" />
            <div className="pointer-events-none absolute right-[44px] top-[54px] h-[92px] w-[92px] rounded-full bg-white/[0.12]" />
            <div className="pointer-events-none absolute right-[18px] top-[96px] h-[38px] w-[38px] rounded-full bg-white/[0.16]" />
            {/* 顶部压暗：保证状态栏与右上角操作按钮的白色文字有足够对比 */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, rgba(3,12,32,0.14) 0%, rgba(3,12,32,0) 32%, rgba(3,12,32,0) 52%, rgba(3,12,32,0.42) 100%)' }}
            />
            {decor ? (
              <div className="pointer-events-none absolute bottom-5 right-5 opacity-[0.12]">{decor}</div>
            ) : null}
            <div className="absolute inset-x-0 bottom-[20px] px-5">
              <h1 className="font-heading text-[28px] font-bold leading-[1.25] tracking-[1px] text-white">
                {title}
              </h1>
            </div>
          </>
        )}
      </div>
      {/* 流内占位：让正文从封面下方开始，封面本身由绝对定位层绘制 */}
      <div className="shrink-0" style={{ height: coverH }} aria-hidden />
    </>
  );
}