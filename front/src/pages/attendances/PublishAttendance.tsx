import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  QrCode,
  Camera,
  KeyRound,
  Navigation,
  Check,
  Loader2,
  Clock,
  ShieldCheck,
  Sparkles,
  Dices,
  type LucideIcon,
} from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import PhoneFrame from '@/components/layout/PhoneFrame';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Method = 'gps' | 'qr' | 'face' | 'code';
type Duration = number | 'custom';

const METHODS: { key: Method; name: string; desc: string; icon: LucideIcon; tint: string }[] = [
  { key: 'gps', name: '定位签到', desc: '需到达指定范围', icon: MapPin, tint: 'bg-[#EFF6FF] text-[#0062FF]' },
  { key: 'qr', name: '扫码签到', desc: '现场扫描二维码', icon: QrCode, tint: 'bg-[#ECFDF5] text-[#059669]' },
  { key: 'face', name: '拍照签到', desc: '自拍水印留证', icon: Camera, tint: 'bg-[#FFF7ED] text-[#EA580C]' },
  { key: 'code', name: '口令签到', desc: '输入 4 位口令', icon: KeyRound, tint: 'bg-[#FEF2F2] text-[#DC2626]' },
];

const TITLE_PRESETS = ['班会签到', '课堂签到', '活动签到', '晚自习'];
const DURATIONS = [5, 10, 30, 60];
const RADIUS_OPTIONS = [100, 200, 500, 1000];

/** Date → datetime-local 输入框所需的本地时间字符串 */
function toDateTimeInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface SuccessInfo {
  id: string | null;
  title: string;
  methodName: string;
  durationText: string;
}

function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-soft">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#EFF6FF]">
          <Icon className="h-3.5 w-3.5 text-[#0062FF]" strokeWidth={2.2} />
        </span>
        <h2 className="font-heading text-[15px] font-semibold text-[#0F172A]">{title}</h2>
        {hint ? <span className="ml-auto text-[11px] text-[#94A3B8]">{hint}</span> : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function PublishAttendance() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const classId = user?.classId;

  const [title, setTitle] = useState('');
  const [method, setMethod] = useState<Method>('gps');
  const [location, setLocation] = useState('');
  const [duration, setDuration] = useState<Duration>(10);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [code, setCode] = useState('');
  const [checkRadius, setCheckRadius] = useState(500);
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const methodMeta = METHODS.find((m) => m.key === method) ?? METHODS[0];
  const methodName = methodMeta.name;

  const missing = useMemo(() => {
    const list: string[] = [];
    if (!title.trim()) list.push('填写签到标题');
    if (method === 'gps' && (gpsLat == null || gpsLng == null)) list.push('获取签到定位');
    if (method === 'code' && code.length !== 4) list.push('设置 4 位口令');
    if (duration === 'custom') {
      if (!startTime || !endTime) list.push('选择签到时段');
      else if (new Date(endTime) <= new Date(startTime)) list.push('结束时间需晚于开始时间');
      else if (new Date(startTime).getTime() < Date.now() - 60 * 1000)
        list.push('开始时间不能早于当前时间');
    }
    return list;
  }, [title, method, gpsLat, gpsLng, code, duration, startTime, endTime]);

  const canPublish = missing.length === 0 && !!classId;
  const durationText = duration === 'custom' ? '自定义时段' : `持续 ${duration} 分钟`;

  const handleLocate = () => {
    if (!navigator.geolocation) {
      toast.error('当前设备不支持定位');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLat(pos.coords.latitude);
        setGpsLng(pos.coords.longitude);
        setLocating(false);
        toast.success('定位成功');
      },
      () => {
        setLocating(false);
        toast.error('定位失败，请在系统设置中允许定位权限');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleRandomCode = () => {
    setCode(String(Math.floor(1000 + Math.random() * 9000)));
  };

  const goDetail = (id: string | null) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    navigate(id && classId ? `/check-in-detail/${classId}/${id}` : '/attendance-list', { replace: true });
  };

  const handlePublish = async () => {
    if (!classId) {
      toast.error('未找到班级信息');
      return;
    }
    if (!canPublish) {
      toast.error(`请先${missing[0]}`);
      return;
    }

    const startAt = duration === 'custom' ? new Date(startTime) : new Date();
    const endAt = duration === 'custom' ? new Date(endTime) : new Date(startAt.getTime() + duration * 60000);

    setPublishing(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        method,
        startTime: startAt.toISOString(),
        endTime: endAt.toISOString(),
      };
      if (location.trim()) body.location = location.trim();
      if (method === 'gps') {
        body.latitude = gpsLat;
        body.longitude = gpsLng;
        body.checkRadius = checkRadius;
      }
      if (method === 'code') body.code = code;

      const res = await api.post(`/classes/${classId}/attendances`, body);
      const created = res.data?.data ?? res.data;
      const id: string | null = created?.id ?? null;

      setSuccess({ id, title: title.trim(), methodName, durationText });
      timerRef.current = window.setTimeout(() => goDetail(id), 1800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '发布失败，请稍后重试');
    } finally {
      setPublishing(false);
    }
  };

  if (success) {
    return (
      <PhoneFrame>
        <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden bg-white px-8">
          {/* 顶部绿色光晕 */}
          <div className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#DCFCE7] opacity-70 blur-3xl" />
          <div className="relative flex flex-col items-center anim-pop-in">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-[#16A34A]/25 anim-ring" />
              <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#22C55E] to-[#15803D] shadow-[0_14px_32px_-10px_rgba(22,163,74,0.6)]">
                <svg viewBox="0 0 32 32" className="h-10 w-10 text-white" aria-hidden="true">
                  <path
                    d="M8 16.5 L13.5 22 L24 10.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="anim-check"
                  />
                </svg>
              </span>
            </div>
            <h2 className="mt-6 font-heading text-[24px] font-bold text-[#0F172A]">签到发布成功</h2>
            <p className="mt-2 text-sm text-[#64748B]">{success.title}</p>
            <div className="mt-4 flex items-center gap-2 rounded-full bg-[#F1F5F9] px-4 py-1.5 text-xs text-[#475569]">
              <Check className="h-3.5 w-3.5 text-[#16A34A]" strokeWidth={3} />
              {success.methodName} · {success.durationText}
            </div>
          </div>
          <div className="mt-12 flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={() => goDetail(success.id)}
              className="h-[52px] w-full rounded-2xl bg-[#0062FF] text-[16px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(0,98,255,0.7)] transition-transform active:scale-[0.99]"
            >
              查看签到详情
            </button>
            <button
              type="button"
              onClick={() => {
                if (timerRef.current) window.clearTimeout(timerRef.current);
                navigate('/attendance-list', { replace: true });
              }}
              className="h-11 w-full text-[14px] font-medium text-[#64748B]"
            >
              返回签到列表
            </button>
          </div>
          <p className="mt-8 text-[11px] text-[#94A3B8]">正在自动进入签到详情…</p>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PageLayout title="发起签到" onBack={() => navigate(-1)} contentClassName="bg-[#F5F7FA] px-0 pb-0 pt-4">
      <div className="flex min-h-full flex-col">
        <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
          {/* 签到主题 */}
          <Section icon={Sparkles} title="签到主题" hint="必填">
            <div className="flex flex-wrap gap-2">
              {TITLE_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTitle(p)}
                  className={cn(
                    'h-8 rounded-full border px-3 text-xs font-medium transition-all active:scale-95',
                    title === p
                      ? 'border-[#0062FF] bg-[#EFF6FF] text-[#0062FF]'
                      : 'border-[#E5E7EB] bg-white text-[#475569]',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={30}
              placeholder="输入签到标题，如：周三班会签到"
              className="mt-3 h-12 w-full rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 text-[15px] text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#0062FF] focus:bg-white"
            />
          </Section>

          {/* 签到方式 */}
          <Section icon={MapPin} title="签到方式" hint="选一种">
            <div className="grid grid-cols-2 gap-2.5">
              {METHODS.map((m) => {
                const active = method === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMethod(m.key)}
                    className={cn(
                      'relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all duration-200 active:scale-[0.98]',
                      active
                        ? 'border-[#0062FF] bg-[#EFF6FF] shadow-[0_4px_14px_-8px_rgba(0,98,255,0.6)]'
                        : 'border-[#E5E7EB] bg-white',
                    )}
                  >
                    <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', m.tint)}>
                      <m.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-[#0F172A]">{m.name}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-[#94A3B8]">{m.desc}</span>
                    </span>
                    {active && (
                      <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#0062FF]">
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* 方式配置 */}
          <Section icon={methodMeta.icon} title="签到要求" hint={methodName}>
            {method === 'gps' && (
              <div className="flex flex-col gap-3">
                {gpsLat != null && gpsLng != null ? (
                  <div className="flex items-center gap-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#16A34A]">
                      <Check className="h-4 w-4 text-white" strokeWidth={3} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-[#15803D]">已获取当前位置</div>
                      <div className="truncate font-data text-[10px] text-[#4D7C5C]">
                        {gpsLat.toFixed(4)}, {gpsLng.toFixed(4)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleLocate}
                      disabled={locating}
                      className="shrink-0 text-xs font-medium text-[#0062FF] active:opacity-60"
                    >
                      {locating ? '定位中…' : '重新定位'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleLocate}
                    disabled={locating}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#BFDBFE] bg-[#F8FAFC] py-3.5 text-[13px] font-medium text-[#0062FF] transition-transform active:scale-[0.99]"
                  >
                    {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                    {locating ? '正在获取定位…' : '获取当前位置'}
                  </button>
                )}
                <div>
                  <div className="flex items-center justify-between text-[12px] text-[#64748B]">
                    <span>有效范围</span>
                    <span className="text-[11px] text-[#94A3B8]">超出范围将无法签到</span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {RADIUS_OPTIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setCheckRadius(r)}
                        className={cn(
                          'h-9 rounded-lg border text-[12px] font-medium transition-all active:scale-95',
                          checkRadius === r
                            ? 'border-[#0062FF] bg-[#EFF6FF] text-[#0062FF]'
                            : 'border-[#E5E7EB] bg-white text-[#475569]',
                        )}
                      >
                        {r >= 1000 ? '1 km' : `${r} m`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {method === 'code' && (
              <div>
                <div className="flex items-stretch gap-2">
                  <input
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                    placeholder="0000"
                    className="h-14 min-w-0 flex-1 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-center font-data text-[24px] tracking-[0.5em] text-[#0F172A] outline-none transition-colors placeholder:text-[#CBD5E1] focus:border-[#0062FF] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleRandomCode}
                    className="flex h-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl bg-[#EFF6FF] px-3.5 text-[#0062FF] active:scale-95"
                  >
                    <Dices className="h-4 w-4" />
                    <span className="text-[10px] font-medium">随机</span>
                  </button>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-[#94A3B8]">
                  口令为 4 位数字，发布后请当面告知到场同学
                </p>
              </div>
            )}

            {(method === 'qr' || method === 'face') && (
              <div className="flex gap-2.5 rounded-xl bg-[#F8FAFC] p-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E2E8F0]">
                  <methodMeta.icon className="h-3.5 w-3.5 text-[#475569]" strokeWidth={2} />
                </span>
                <p className="text-[12px] leading-relaxed text-[#475569]">
                  {method === 'qr'
                    ? '发布后会在签到详情页生成专属二维码，同学现场扫码即可完成签到。'
                    : '同学需现场拍摄带时间水印的照片并提交，照片将作为签到凭证保存。'}
                </p>
              </div>
            )}
          </Section>

          {/* 签到地点（选填） */}
          <Section icon={MapPin} title="签到地点" hint="选填">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={40}
              placeholder="例如：教学楼 A301"
              className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 text-[15px] text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#0062FF] focus:bg-white"
            />
          </Section>

          {/* 签到时间 */}
          <Section icon={Clock} title="签到时间" hint={durationText}>
            <div className="flex gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={cn(
                    'h-9 flex-1 rounded-lg border text-[12px] font-medium transition-all active:scale-95',
                    duration === d
                      ? 'border-[#0062FF] bg-[#EFF6FF] text-[#0062FF]'
                      : 'border-[#E5E7EB] bg-white text-[#475569]',
                  )}
                >
                  {d} 分钟
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  if (duration !== 'custom') {
                    if (!startTime) {
                      const now = new Date();
                      setStartTime(toDateTimeInput(now));
                      setEndTime(toDateTimeInput(new Date(now.getTime() + 10 * 60000)));
                    }
                    setDuration('custom');
                  }
                }}
                className={cn(
                  'h-9 flex-1 rounded-lg border text-[12px] font-medium transition-all active:scale-95',
                  duration === 'custom'
                    ? 'border-[#0062FF] bg-[#EFF6FF] text-[#0062FF]'
                    : 'border-[#E5E7EB] bg-white text-[#475569]',
                )}
              >
                自定义
              </button>
            </div>

            {duration === 'custom' ? (
              <div className="mt-3 flex flex-col gap-2.5">
                <label className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-[12px] text-[#64748B]">开始</span>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 text-[13px] text-[#0F172A] outline-none focus:border-[#0062FF] focus:bg-white"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-[12px] text-[#64748B]">结束</span>
                  <input
                    type="datetime-local"
                    value={endTime}
                    min={startTime || undefined}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 text-[13px] text-[#0F172A] outline-none focus:border-[#0062FF] focus:bg-white"
                  />
                </label>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#F8FAFC] px-3 py-2.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22C55E]" />
                <span className="text-[12px] text-[#475569]">
                  发布后立即开始 · 持续 {duration} 分钟
                </span>
                <span className="ml-auto shrink-0 text-[11px] text-[#94A3B8]">无需填时间</span>
              </div>
            )}
          </Section>

          {/* 签到规则说明 */}
          <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#1E40AF]" strokeWidth={2.2} />
              <span className="text-[13px] font-semibold text-[#1E40AF]">签到规则</span>
            </div>
            <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-[#1E3A8A]">
              <li>· 签到期间可在详情页一键提醒未签到同学</li>
              <li>· 无法到场的同学可在签到结束前提交请假申请</li>
              <li>· 签到结果自动计入班级出勤统计</li>
            </ul>
          </div>
        </div>

        {/* 吸底操作栏 */}
        <div className="sticky bottom-0 z-10 border-t border-[#EEF2F7] bg-white/95 px-4 pb-[calc(10px+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="truncate text-[11px] text-[#94A3B8]">
              {!classId
                ? '未找到班级信息'
                : canPublish
                  ? `将以「${methodName}」发布 · ${durationText}`
                  : `还需：${missing[0]}`}
            </span>
            {missing.length > 1 && (
              <span className="shrink-0 text-[11px] text-[#94A3B8]">共 {missing.length} 项待完善</span>
            )}
          </div>
          <button
            type="button"
            onClick={handlePublish}
            disabled={!canPublish || publishing}
            className={cn(
              'flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-[16px] font-semibold text-white transition-all active:scale-[0.99]',
              canPublish ? 'bg-[#0062FF] shadow-[0_8px_20px_-8px_rgba(0,98,255,0.7)]' : 'bg-[#CBD5E1]',
            )}
          >
            {publishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                发布中…
              </>
            ) : (
              '发布签到'
            )}
          </button>
        </div>
      </div>
    </PageLayout>
  );
}