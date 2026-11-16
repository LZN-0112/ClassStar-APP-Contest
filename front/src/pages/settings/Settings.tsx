import PhoneFrame from '@/components/layout/PhoneFrame';
import StatusBar from '@/components/layout/StatusBar';
import BackButton from '@/components/navigation/BackButton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import { api } from '@/lib/api';
import { unregisterPushToken } from '@/lib/push';
import { isNative } from '@/lib/capacitor';
import { cn } from '@/lib/utils';
import {
  Bell,
  ChevronRight,
  Eye,
  HelpCircle,
  Info,
  KeyRound,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/** 封面高度：与数据看板保持一致（200 ≈ 屏高的 25%，只留标题区） */
const COVER_H = 200;

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

interface SettingRowProps {
  icon: ReactNode;
  tileClassName: string;
  label: string;
  desc?: string;
  value?: string;
  valueStrong?: boolean;
  onClick: () => void;
}

function SettingRow({ icon, tileClassName, label, desc, value, valueStrong, onClick }: SettingRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex min-h-[58px] w-full items-center gap-3 px-[15px] py-[9px] text-left transition-colors active:bg-[#F7F9FC] [&:not(:first-child)]:before:absolute [&:not(:first-child)]:before:left-[62px] [&:not(:first-child)]:before:right-0 [&:not(:first-child)]:before:top-0 [&:not(:first-child)]:before:h-px [&:not(:first-child)]:before:bg-[#EEF2F7]"
    >
      <div
        className={cn(
          'relative flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-[11px] text-white',
          tileClassName
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[56%] bg-gradient-to-b from-white/30 to-transparent" />
        <span className="relative flex items-center justify-center">{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-medium leading-[1.3] tracking-[0.1px] text-[#1A1F2C]">{label}</div>
        {desc ? <div className="mt-[3px] truncate text-[12.5px] leading-[1.25] text-[#9CA3AF]">{desc}</div> : null}
      </div>
      {value ? (
        <span
          className={cn(
            'shrink-0 text-[13.5px]',
            valueStrong ? 'font-semibold text-[#0B62E8]' : 'text-[#9CA3AF]'
          )}
        >
          {value}
        </span>
      ) : null}
      <ChevronRight className="h-[18px] w-[18px] shrink-0 text-[#C7D0DC]" strokeWidth={2} />
    </button>
  );
}

/** 图标块配色：渐变底 + 同色投影 */
const TILE = {
  shield: '[background-image:linear-gradient(145deg,#6AA6FF_0%,#0B5BE0_100%)] shadow-[0_4px_10px_rgba(11,91,224,0.32)]',
  key: '[background-image:linear-gradient(145deg,#5AD39A_0%,#0E9F6E_100%)] shadow-[0_4px_10px_rgba(14,159,110,0.30)]',
  bell: '[background-image:linear-gradient(145deg,#FFB067_0%,#F97316_100%)] shadow-[0_4px_10px_rgba(249,115,22,0.30)]',
  eye: '[background-image:linear-gradient(145deg,#B79CFF_0%,#7C3AED_100%)] shadow-[0_4px_10px_rgba(124,58,237,0.30)]',
  gear: '[background-image:linear-gradient(145deg,#8494AC_0%,#334155_100%)] shadow-[0_4px_10px_rgba(51,65,85,0.26)]',
  help: '[background-image:linear-gradient(145deg,#FCD34D_0%,#D97706_100%)] shadow-[0_4px_10px_rgba(217,119,6,0.28)]',
  info: '[background-image:linear-gradient(145deg,#9AA8BC_0%,#475569_100%)] shadow-[0_4px_10px_rgba(71,85,105,0.26)]',
};

function maskPhone(phone?: string) {
  if (!phone) return '';
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
}

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [query, setQuery] = useState('');
  /** 已开启的通知项数量，用于列表右对齐摘要 */
  const [notify, setNotify] = useState<{ on: number; total: number } | null>(null);

  /** 顶栏图标/文字是否已切到深色（相对浅色顶栏底） */
  const [darkInk, setDarkInk] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const barBgRef = useRef<HTMLDivElement>(null);
  const darkInkRef = useRef(false);
  const blurRef = useRef(false);

  useStatusBarStyle(!darkInk);

  /** 滚动驱动顶部折叠：p=0 封面铺满，p=1 顶栏完全落下 */
  useEffect(() => {
    const scroller = scrollerRef.current;
    const header = headerRef.current;
    const bar = barRef.current;
    const cover = coverRef.current;
    if (!scroller || !header || !bar || !cover) return;

    let raf = 0;
    const apply = () => {
      raf = 0;
      // D = 封面高度 − 顶栏高度：p 从 0 到 1 刚好让封面完全退出顶栏
      const distance = Math.max(cover.offsetHeight - bar.offsetHeight, 1);
      const p = clamp01(scroller.scrollTop / distance);
      header.style.setProperty('--bar-a', p.toFixed(3));
      header.style.setProperty('--title-a', clamp01((p - 0.7) / 0.3).toFixed(3));
      // 封面快要滚出时把底色补实，避免滚到底后内容从底边渐隐区透出
      header.style.setProperty('--solid-a', clamp01((p - 0.86) / 0.14).toFixed(3));
      // 底色出现后叠加磨砂，让半透明白压在封面上时是玻璃质感而不是一块灰板
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
      const nextDark = darkInkRef.current ? p > 0.5 : p > 0.62;
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
  }, []);

  useEffect(() => {
    api
      .get('/settings')
      .then((res) => {
        const data = res.data?.data || res.data;
        const raw = (data?.notificationSettings || {}) as Record<string, unknown>;
        const values = Object.values(raw).filter(
          (v) => typeof v === 'boolean' || v === 'true' || v === 'false'
        );
        if (values.length > 0) {
          setNotify({
            on: values.filter((v) => v === true || v === 'true').length,
            total: values.length,
          });
        }
      })
      .catch(() => {
        // 摘要属于辅助信息，读取失败时不展示
      });
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      // 先解绑本机推送标识（需在清除 token 之前）
      await unregisterPushToken();
      await api.post('/auth/logout');
      toast.success('已退出登录');
    } catch {
      // 即使接口失败也继续清理本地状态
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentUser');
      setIsLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

  const displayName = user?.name || '同学';
  const roleLabel =
    user?.role ||
    (user?.roleLevel === 'owner' ? '创建者' : user?.roleLevel === 'admin' ? '管理员' : user?.isCommittee ? '班委' : '');
  const className = user?.className || '';
  const phone = maskPhone(user?.phone);

  interface RowDef {
    key: string;
    label: string;
    desc?: string;
    icon: ReactNode;
    tile: string;
    value?: string;
    valueStrong?: boolean;
    onClick: () => void;
  }

  const groups: { title: string; rows: RowDef[] }[] = [
    {
      title: '账号与安全',
      rows: [
        {
          key: 'account-security',
          label: '账号与安全',
          desc: phone ? `手机号 ${phone}` : undefined,
          icon: <ShieldCheck className="h-[21px] w-[21px]" strokeWidth={2} />,
          tile: TILE.shield,
          onClick: () => navigate('/account-security'),
        },
        {
          key: 'change-password',
          label: '修改密码',
          desc: '验证原密码后可重设',
          icon: <KeyRound className="h-[21px] w-[21px]" strokeWidth={2} />,
          tile: TILE.key,
          onClick: () => navigate('/change-password'),
        },
      ],
    },
    {
      title: '通知与隐私',
      rows: [
        {
          key: 'notification',
          label: '消息通知',
          desc: '班级通知、作业与考勤提醒',
          icon: <Bell className="h-[21px] w-[21px]" strokeWidth={2} />,
          tile: TILE.bell,
          value: notify ? `已开启 ${notify.on}/${notify.total}` : undefined,
          valueStrong: !!notify && notify.total > 0,
          onClick: () => navigate('/notification-settings'),
        },
        {
          key: 'privacy',
          label: '隐私设置',
          desc: '资料与动态的可见范围',
          icon: <Eye className="h-[21px] w-[21px]" strokeWidth={2} />,
          tile: TILE.eye,
          onClick: () => navigate('/privacy-settings'),
        },
      ],
    },
    {
      title: '通用',
      rows: [
        {
          key: 'general',
          label: '通用设置',
          desc: '显示、语言与存储',
          icon: <SettingsIcon className="h-[21px] w-[21px]" strokeWidth={2} />,
          tile: TILE.gear,
          onClick: () => navigate('/general-settings'),
        },
      ],
    },
    {
      title: '帮助与关于',
      rows: [
        {
          key: 'help',
          label: '帮助与反馈',
          desc: '常见问题与意见反馈',
          icon: <HelpCircle className="h-[21px] w-[21px]" strokeWidth={2} />,
          tile: TILE.help,
          onClick: () => navigate('/help-feedback'),
        },
        {
          key: 'about',
          label: '关于班务星',
          desc: '版本信息与用户协议',
          icon: <Info className="h-[21px] w-[21px]" strokeWidth={2} />,
          tile: TILE.info,
          onClick: () => navigate('/about'),
        },
      ],
    },
  ];

  const keyword = query.trim();
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      rows: group.rows.filter(
        (row) => !keyword || row.label.includes(keyword) || (row.desc || '').includes(keyword)
      ),
    }))
    .filter((group) => group.rows.length > 0);

  return (
    <PhoneFrame scrollerRef={scrollerRef}>
      <div className="relative flex min-h-full w-full flex-col bg-[#F4F6FA]">
        {/* 固定顶栏：sticky + h-0 不占内容空间，内部向下溢出显示 */}
        <header ref={headerRef} className="pointer-events-none sticky top-0 z-30 h-0">
          <div
            ref={barRef}
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
                backgroundColor: 'rgba(244, 246, 250, var(--bar-a, 0))',
                maskImage: 'linear-gradient(180deg, #000 0%, #000 76%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 76%, transparent 100%)',
              }}
            />
            {/* 收尾补实：封面即将滚完时铺满，内容不会从底边透出 */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ backgroundColor: 'rgba(244, 246, 250, var(--solid-a, 0))' }}
            />
            {/* 封面上方的压暗遮罩：保证状态栏与返回键的白字始终可读 */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-[160px] transition-opacity duration-300"
              style={{
                opacity: darkInk ? 0 : 1,
                background:
                  'linear-gradient(180deg, rgba(5,16,38,0.56) 0%, rgba(5,16,38,0.26) 52%, rgba(5,16,38,0) 100%)',
              }}
            />
            <StatusBar light={!darkInk} />
            <div className="relative flex h-[56px] items-center px-[14px]">
              <BackButton
                variant={darkInk ? 'light' : 'dark'}
                className={cn(
                  'pointer-events-auto h-[34px] w-[34px] rounded-full border transition-colors duration-300',
                  darkInk
                    ? 'border-black/10 bg-transparent text-[#1A1F2C]'
                    : 'border-white/30 bg-white/[0.18] backdrop-blur-sm'
                )}
              />
              {/* 标题：p > 0.7 后淡入，与滚走的封面大标题交接 */}
              <div
                className="pointer-events-none absolute inset-x-0 text-center text-[17px] font-semibold tracking-[0.5px] text-[#1A1F2C]"
                style={{ opacity: 'var(--title-a, 0)' }}
              >
                设置
              </div>
            </div>
          </div>
        </header>

        {/* 封面：随内容自然滚出（不接管滚动，纯 CSS 位移） */}
        <div
          ref={coverRef}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-0 w-full overflow-hidden rounded-b-[22px] shadow-[0_10px_24px_-12px_rgba(11,79,214,0.55)]"
          style={{
            height: COVER_H,
            backgroundImage:
              'radial-gradient(110% 80% at 85% -10%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0) 58%), linear-gradient(155deg, #0B4FD6 0%, #2E7DFF 52%, #7FB2FF 100%)',
          }}
        >
          <div className="pointer-events-none absolute -right-[48px] -top-[52px] h-[170px] w-[170px] rounded-full bg-white/[0.16]" />
          <div className="pointer-events-none absolute right-[44px] top-[54px] h-[92px] w-[92px] rounded-full bg-white/[0.12]" />
          <div className="pointer-events-none absolute right-[18px] top-[96px] h-[38px] w-[38px] rounded-full bg-white/[0.16]" />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, rgba(3,12,32,0) 52%, rgba(3,12,32,0.42) 100%)' }}
          />
          <div className="absolute inset-x-0 bottom-[18px] px-5">
            <div className="font-heading text-[28px] font-bold leading-[1.25] tracking-[1px] text-white">设置</div>
            <div className="mt-[5px] text-[12px] tracking-[0.4px] text-white/75">账号、通知与隐私偏好</div>
          </div>
        </div>
        {/* 流内占位：让正文从封面下方开始，封面本身由绝对定位层绘制 */}
        <div className="shrink-0" style={{ height: COVER_H }} aria-hidden />

        <div className="relative z-10 flex w-full flex-1 flex-col px-[18px] pb-7 pt-4">
          {/* 搜索 */}
          <div className="flex h-[44px] items-center gap-[9px] rounded-[13px] bg-white px-[14px] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <Search className="h-4 w-4 shrink-0 text-[#9CA3AF]" strokeWidth={2.2} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索设置项，如「通知」「密码」"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-[#1A1F2C] outline-none placeholder:text-[#9CA3AF]"
            />
            {query ? (
              <button type="button" onClick={() => setQuery('')} aria-label="清空搜索">
                <X className="h-4 w-4 text-[#C7D0DC]" strokeWidth={2.2} />
              </button>
            ) : null}
          </div>

          {/* 账号卡 */}
          <button
            type="button"
            onClick={() => navigate('/personal-center')}
            className="mt-[14px] flex w-full items-center gap-[14px] rounded-[16px] bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-opacity active:opacity-80"
          >
            <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#6C9BFF] to-[#1D5BFF] text-[20px] font-semibold text-white">
              {user?.avatar ? (
                <img src={user.avatar} alt="头像" className="h-full w-full object-cover" />
              ) : (
                displayName.charAt(0)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-[7px]">
                <span className="truncate text-[17.5px] font-semibold text-[#1A1F2C]">{displayName}</span>
                {roleLabel ? (
                  <span className="flex h-[21px] shrink-0 items-center rounded-[6px] bg-[#E8F0FF] px-[7px] text-[11px] font-semibold text-[#0B62E8]">
                    {roleLabel}
                  </span>
                ) : null}
              </div>
              <div className="mt-[5px] truncate text-[13px] text-[#9CA3AF]">
                {[className, phone].filter(Boolean).join(' · ') || '尚未加入班级'}
              </div>
            </div>
            <span className="shrink-0 text-[13px] text-[#9CA3AF]">编辑资料</span>
            <ChevronRight className="h-[18px] w-[18px] shrink-0 text-[#C7D0DC]" strokeWidth={2} />
          </button>

          {/* 设置分组 */}
          {visibleGroups.length === 0 ? (
            <div className="mt-10 text-center text-[13px] text-[#9CA3AF]">没有找到相关设置项</div>
          ) : (
            visibleGroups.map((group) => (
              <div key={group.title} className="mt-[18px]">
                <div className="px-1 pb-[9px] text-[13px] font-semibold tracking-[0.3px] text-[#8A94A6]">
                  {group.title}
                </div>
                <div className="overflow-hidden rounded-[16px] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
                  {group.rows.map((row) => (
                    <SettingRow
                      key={row.key}
                      icon={row.icon}
                      tileClassName={row.tile}
                      label={row.label}
                      desc={row.desc}
                      value={row.value}
                      valueStrong={row.valueStrong}
                      onClick={row.onClick}
                    />
                  ))}
                </div>
              </div>
            ))
          )}

          {/* 退出登录 */}
          <button
            type="button"
            disabled={isLoggingOut}
            onClick={() => setShowLogoutConfirm(true)}
            className="mt-[18px] flex h-[56px] w-full items-center justify-center rounded-[16px] bg-white text-[16px] font-semibold text-[#E5484D] shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-opacity active:opacity-80 disabled:opacity-60"
          >
            {isLoggingOut ? '退出中...' : '退出登录'}
          </button>

          <div className="mt-4 text-center text-[12px] text-[#A7B0BE]">班务星 · 已是最新版本</div>
        </div>
      </div>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="退出登录"
        description="退出后需要重新登录才能查看班级消息、考勤与作业，确定要退出吗？"
        confirmText="确认退出"
        danger
        loading={isLoggingOut}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
      />
    </PhoneFrame>
  );
}
