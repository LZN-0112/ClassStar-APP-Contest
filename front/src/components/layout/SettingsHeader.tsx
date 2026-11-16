import BackButton from '@/components/navigation/BackButton';
import StatusBar from '@/components/layout/StatusBar';
import { isNative } from '@/lib/capacitor';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';

interface SettingsHeaderProps {
  title: string;
  subtitle?: string;
}

/**
 * 设置模块统一头图：与数据看板/设置首页对齐的 200px 封面
 * 大标题 + 磨砂圆形返回 + 光晕装饰；桌面预览下渲染模拟状态栏，真机下让出系统状态栏安全区
 */
export default function SettingsHeader({ title, subtitle }: SettingsHeaderProps) {
  useStatusBarStyle(true);

  return (
    <div
      className="relative h-[200px] w-full shrink-0 overflow-hidden rounded-b-[22px] bg-no-repeat shadow-[0_10px_24px_-12px_rgba(11,79,214,0.55)]"
      style={{
        paddingTop: isNative ? 'var(--safe-top, env(safe-area-inset-top, 0px))' : undefined,
        backgroundImage:
          'radial-gradient(110% 80% at 85% -10%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0) 58%), linear-gradient(155deg, #0B4FD6 0%, #2E7DFF 52%, #7FB2FF 100%)',
        backgroundSize: '100% 100%',
      }}
    >
      <StatusBar light />

      <div className="pointer-events-none absolute -right-[48px] -top-[52px] h-[170px] w-[170px] rounded-full bg-white/[0.16]" />
      <div className="pointer-events-none absolute right-[44px] top-[54px] h-[92px] w-[92px] rounded-full bg-white/[0.12]" />
      <div className="pointer-events-none absolute right-[18px] top-[96px] h-[38px] w-[38px] rounded-full bg-white/[0.16]" />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(3,12,32,0) 52%, rgba(3,12,32,0.42) 100%)' }}
      />

      <div className="relative z-10 flex h-[56px] items-center px-[14px]">
        <BackButton
          variant="dark"
          className="h-[34px] w-[34px] rounded-full border border-white/30 bg-white/[0.18] backdrop-blur-sm"
        />
      </div>

      <div className="absolute inset-x-0 bottom-[18px] z-10 px-5">
        <div className="font-heading text-[28px] font-bold leading-[1.25] tracking-[1px] text-white">{title}</div>
        {subtitle ? (
          <div className="mt-[5px] text-[12px] tracking-[0.4px] text-white/75">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}