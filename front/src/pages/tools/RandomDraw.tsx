import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ChevronLeft, History, Megaphone, Minus, Plus, RotateCcw, Shuffle, UserMinus, X } from 'lucide-react';
import { api } from '@/lib/api';
import BottomSheet from '@/components/ui/BottomSheet';
import LoadingVeil from '@/components/ui/LoadingVeil';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import { toast } from 'sonner';

interface Member {
  id: string;
  studentId: string;
  name: string;
  isSystemAccount?: boolean;
}

// 后端返回字段为 userId/student_id，统一映射为前端 Member 结构
const mapMember = (m: any): Member => ({
  id: m.userId || m.id || '',
  studentId: m.studentId || m.student_id || '',
  name: m.name || m.userName || '',
  isSystemAccount: m.isSystemAccount === true,
});

type Phase = 'idle' | 'drawing' | 'result';

/** 彩球公转轨道半径（轨道直径 = 300，正好贴合外虚线环） */
const RING_R = 150;
/** 彩球直径 */
const ORB_SIZE = 44;
/** 揭晓后 5 颗球停靠的角度（球体上方弧线，避开底部结果抽屉） */
const SLOT_ANGLES = [-170, -130, -90, -50, -10];
/** 5 颗球的初始角度，彼此错开避免重叠 */
const START_ANGLES = [200, 300, 340, 148, 52];
/** 常态公转速度（度/秒），正负号决定转动方向 */
const BASE_SPEEDS = [92, -84, 98, -90, 86];
/** 抽取时公转加速倍数 */
const DRAW_BOOST = 6;

const ORB_SKINS = [
  { body: 'radial-gradient(circle at 32% 26%, #FFFFFF 0%, #FFC2D3 20%, #FF7FA6 62%, #E24E7C 100%)', glow: 'rgba(226,78,124,0.32)' },
  { body: 'radial-gradient(circle at 32% 26%, #FFFFFF 0%, #FFE1B0 20%, #FFB347 62%, #E2841C 100%)', glow: 'rgba(226,132,28,0.32)' },
  { body: 'radial-gradient(circle at 32% 26%, #FFFFFF 0%, #CDEEFF 20%, #6FC8FA 62%, #2A8FD0 100%)', glow: 'rgba(42,143,208,0.32)' },
  { body: 'radial-gradient(circle at 32% 26%, #FFFFFF 0%, #D6F5DC 20%, #93DC9F 62%, #48B264 100%)', glow: 'rgba(72,178,100,0.32)' },
  { body: 'radial-gradient(circle at 32% 26%, #FFFFFF 0%, #E4DCFF 20%, #B4A2FF 62%, #7C5FE0 100%)', glow: 'rgba(124,95,224,0.32)' },
];

interface OrbState {
  a: number;
  speed: number;
  factor: number;
  /** 归位后停住，等待下一轮抽签 */
  hold: boolean;
  tween: { from: number; to: number; delta: number; start: number; dur: number } | null;
}

function CountCard({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="box-border flex flex-1 flex-col items-center justify-center rounded-2xl bg-white/80 py-2 shadow-[0_2px_10px_rgba(58,124,180,0.10)]">
      <div className="font-body text-[10px]/[normal] text-[#6B8FAD]">{label}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <button
          type="button"
          aria-label={`减少${label}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#E8F2FB] transition-transform active:scale-90"
        >
          <Minus className="h-3 w-3 text-[#2B628F]" strokeWidth={2.5} />
        </button>
        <span className="w-5 text-center font-data text-[17px]/[normal] font-bold text-[#12395C]">{value}</span>
        <button
          type="button"
          aria-label={`增加${label}`}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#E8F2FB] transition-transform active:scale-90"
        >
          <Plus className="h-3 w-3 text-[#2B628F]" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

export default function RandomDraw() {
  const navigate = useNavigate();
  useStatusBarStyle(false); // 浅蓝渐变头部 → 系统状态栏深色(黑)图标
  const { user } = useCurrentUser();
  const classId = user?.classId;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [mainCount, setMainCount] = useState(5);
  const [backupCount, setBackupCount] = useState(3);
  const drawTitle = '随机抽签';

  // 排除人员相关状态
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [showExcludeModal, setShowExcludeModal] = useState(false);

  // 抽签流程状态机：idle（待抽取）/ drawing（抽取中）/ result（已揭晓）
  const [phase, setPhase] = useState<Phase>('idle');
  const [previewResult, setPreviewResult] = useState<{ main: Member[]; backup: Member[] } | null>(null);
  const [rollingName, setRollingName] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedDrawId, setSavedDrawId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publicized, setPublicized] = useState(false);

  const isCommittee = user?.roleLevel === 'owner' || user?.roleLevel === 'admin';

  const orbRefs = useRef<Array<HTMLDivElement | null>>([]);
  const orbStates = useRef<OrbState[]>(
    START_ANGLES.map((a, i): OrbState => ({ a, speed: BASE_SPEEDS[i], factor: 1, hold: false, tween: null }))
  );
  const boostRef = useRef(1);
  const drawingRef = useRef(false);
  const timers = useRef<number[]>([]);

  // 加载班级成员
  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }
    api.get(`/classes/${classId}/members`, { params: { page: 1, pageSize: 200 } })
      .then((res) => {
        const data = res.data.data;
        // 后端返回结构: { list: [...], total: N, page: 1, pageSize: 200 }
        const list = Array.isArray(data?.list) ? data.list : Array.isArray(data) ? data : [];
        // 平台内置账号（系统管理员）不参与抽签
        setMembers(list.map(mapMember).filter((m: Member) => !m.isSystemAccount));
      })
      .catch((err) => {
        console.error('[RandomDraw] load members error:', err);
        toast.error('加载班级成员失败');
      })
      .finally(() => setLoading(false));
  }, [classId]);

  // 候选人池（抽签进行中也要保持引用稳定，避免动画频繁重建）
  const candidates = useMemo(() => members.filter((m) => !excludedIds.has(m.id)), [members, excludedIds]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    []
  );

  // 首帧定位：避免彩球在第一次 rAF 之前全部叠在球心
  useLayoutEffect(() => {
    orbStates.current.forEach((st, i) => {
      const el = orbRefs.current[i];
      if (!el) return;
      const rad = (st.a * Math.PI) / 180;
      el.style.transform = `translate3d(${(Math.cos(rad) * RING_R).toFixed(2)}px, ${(
        Math.sin(rad) * RING_R
      ).toFixed(2)}px, 0)`;
    });
  }, []);

  // 彩球公转：单一 rAF 循环，角度做连续插值，避免位置突跳
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      orbStates.current.forEach((st, i) => {
        const el = orbRefs.current[i];
        if (!el) return;

        if (st.tween) {
          const p = Math.min(1, (now - st.tween.start) / st.tween.dur);
          const eased = 1 - Math.pow(1 - p, 3);
          st.a = st.tween.from + st.tween.delta * eased;
          if (p >= 1) {
            st.a = st.tween.to;
            st.tween = null;
            st.hold = true;
          }
        } else if (!st.hold) {
          st.factor += (boostRef.current - st.factor) * Math.min(1, dt * 6);
          st.a += st.speed * st.factor * dt;
        }

        const rad = (st.a * Math.PI) / 180;
        const x = Math.cos(rad) * RING_R;
        const y = Math.sin(rad) * RING_R;
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // 抽取中：球面文字快速滚动候选人姓名
  useEffect(() => {
    if (phase !== 'drawing' || candidates.length === 0) return;
    const id = window.setInterval(() => {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      setRollingName(pick?.name || '');
    }, 55);
    return () => window.clearInterval(id);
  }, [phase, candidates]);

  const toggleExclude = (id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 揭晓：写入结果、彩球归位到球体上方弧线，稍后拉起结果抽屉
  const finishDraw = useCallback((result: { main: Member[]; backup: Member[] }) => {
    setPreviewResult(result);
    setPhase('result');
    boostRef.current = 1;

    const now = performance.now();
    orbStates.current.forEach((st, i) => {
      const to = SLOT_ANGLES[i % SLOT_ANGLES.length];
      // 只往前走整数圈，否则会残留角度偏移导致停靠不对称
      const delta = ((((to - st.a) % 360) + 360) % 360) + 360;
      st.tween = { from: st.a, to: st.a + delta, delta, start: now, dur: 720 };
    });

    timers.current.push(window.setTimeout(() => setSheetOpen(true), 780));
  }, []);

  const runDraw = useCallback(async () => {
    if (!classId) {
      toast.error('请先加入班级');
      return;
    }
    if (candidates.length < mainCount + backupCount) {
      toast.error(`候选人不足，至少需要 ${mainCount + backupCount} 人（当前 ${candidates.length} 人）`);
      return;
    }
    if (drawingRef.current) return;

    drawingRef.current = true;
    setSheetOpen(false);
    setSaved(false);
    setSavedDrawId(null);
    setPublicized(false);
    setPreviewResult(null);
    setPhase('drawing');
    boostRef.current = DRAW_BOOST;
    // 从上一轮停靠位置重新开始公转
    orbStates.current.forEach((st) => {
      st.hold = false;
    });

    const startedAt = performance.now();
    try {
      const res = await api.post(`/classes/${classId}/random-draws/preview`, {
        title: drawTitle,
        mainCount,
        backupCount,
        excludedUserIds: Array.from(excludedIds),
      });
      const data = res.data.data || res.data;
      const result = {
        main: (data.main || []).map(mapMember),
        backup: (data.backup || []).map(mapMember),
      };
      // 动效至少跑满 900ms，避免接口太快导致一闪而过
      const wait = Math.max(0, 900 - (performance.now() - startedAt));
      timers.current.push(
        window.setTimeout(() => {
          drawingRef.current = false;
          finishDraw(result);
        }, wait)
      );
    } catch (err: any) {
      drawingRef.current = false;
      boostRef.current = 1;
      setPhase('idle');
      toast.error(err.message || '抽签失败');
    }
  }, [classId, candidates.length, mainCount, backupCount, excludedIds, finishDraw]);

  // 保存当前展示的抽签结果，返回记录 ID
  const saveDraw = useCallback(async (): Promise<string | null> => {
    if (!classId || !previewResult) return null;
    const res = await api.post(`/classes/${classId}/random-draws`, {
      title: drawTitle,
      mainCount,
      backupCount,
      excludedUserIds: Array.from(excludedIds),
      // 沿用当前展示的抽签结果，避免保存时重新随机
      mainUserIds: previewResult.main.map((m) => m.id),
      backupUserIds: previewResult.backup.map((m) => m.id),
    });
    const data = res.data.data || res.data;
    return data?.id || null;
  }, [classId, previewResult, mainCount, backupCount, excludedIds, drawTitle]);

  // 确认保存抽签结果（保存后保留结果态并标记「已保存」）
  const handleConfirmSave = useCallback(async () => {
    if (!classId || !previewResult || saved || confirming) return;
    setConfirming(true);
    try {
      const drawId = await saveDraw();
      if (!drawId) {
        throw new Error('保存抽签结果失败');
      }
      setSavedDrawId(drawId);
      setSaved(true);
      toast.success('抽签结果已保存');
    } catch (err: any) {
      toast.error(err.message || '保存抽签失败');
    } finally {
      setConfirming(false);
    }
  }, [classId, previewResult, saved, confirming, saveDraw]);

  // 一键公示：未保存时先自动保存，再将本次班委抽签结果通知全班
  const handlePublish = useCallback(async () => {
    if (!classId || publicized) return;
    setPublishing(true);
    try {
      let drawId = savedDrawId;
      if (!drawId) {
        drawId = await saveDraw();
        if (!drawId) {
          throw new Error('保存抽签结果失败');
        }
        setSavedDrawId(drawId);
        setSaved(true);
      }
      await api.post(`/classes/${classId}/random-draws/${drawId}/publish`);
      setPublicized(true);
      toast.success('已公示给全班');
    } catch (err: any) {
      toast.error(err.message || '公示失败');
    } finally {
      setPublishing(false);
    }
  }, [classId, savedDrawId, publicized, saveDraw]);

  // 收起结果抽屉 → 回到待抽取状态，彩球继续公转
  const dismissResult = () => {
    setSheetOpen(false);
    setPhase('idle');
    setSaved(false);
    setSavedDrawId(null);
    setPublicized(false);
    setPreviewResult(null);
    orbStates.current.forEach((st) => {
      st.hold = false;
    });
  };

  const isDrawing = phase === 'drawing';
  const ballValue = phase === 'result' && previewResult ? previewResult.main.length : candidates.length;
  const ballLabel = isDrawing ? '正在抽取…' : phase === 'result' ? '正选代表' : '当前候选';

  const renderResultRow = (item: Member, index: number) => (
    <div key={`${item.id}-${index}`} className="flex h-[44px] shrink-0 items-center gap-2.5 rounded-xl bg-[#F3F8FD] px-2.5">
      <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[6px] bg-[#1986E6] font-data text-[11px]/[normal] font-bold text-white">
        {index + 1}
      </span>
      <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] font-body text-[12px]/[normal] font-semibold text-[#1986E6]">
        {(item.name || '?')[0]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-body text-[13px]/[normal] font-semibold text-[#1F2937]">{item.name}</div>
        {item.studentId && (
          <div className="truncate font-caption text-[10px]/[normal] text-[#9CA3AF]">{item.studentId}</div>
        )}
      </div>
      <span className="shrink-0 rounded-full bg-[#E4F2FF] px-2 py-0.5 font-body text-[10px]/[normal] font-medium text-[#1986E6]">
        正选
      </span>
    </div>
  );

  return (
    <div className="flex min-h-[100dvh] w-full items-start justify-center overflow-x-hidden bg-gray-200 sm:items-center sm:p-6">
      <div
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden sm:h-phone sm:w-phone sm:rounded-device sm:shadow-lift"
        style={{ backgroundImage: 'linear-gradient(180deg, #D8EDFF 0%, #EAF5FF 46%, #F8FCFF 100%)' }}
      >
        {/* 页面内容（可滚动，保证小屏也能看到按钮） */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
          {/* Status Bar */}
          <div
            data-pencil-name="Status Bar"
            className="box-border flex h-[62px] w-full shrink-0 flex-row items-center justify-between gap-0 bg-transparent p-[12px_24px_0px_24px]"
          >
            <div className="font-data text-[14px]/[normal] font-semibold text-[#12395C]">9:41</div>
            <div className="flex h-fit w-fit shrink-0 flex-row items-center justify-start gap-[6px]">
              <div className="font-caption text-[14px]/[normal] font-normal text-[#12395C]">◉◉◉◉</div>
              <div className="font-data text-[14px]/[normal] font-normal text-[#12395C]">100%</div>
            </div>
          </div>

          {/* Header */}
          <div className="relative box-border flex h-[48px] w-full shrink-0 flex-row items-center justify-between px-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center text-[#12395C] transition-opacity active:opacity-60"
              aria-label="返回"
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={2} />
            </button>
            <div className="font-heading text-[17px]/[normal] font-bold text-[#12395C]">随机抽签</div>
            <button
              type="button"
              onClick={() => navigate('/draw-rules')}
              className="flex h-8 shrink-0 items-center justify-center rounded-full bg-white/60 px-3 font-body text-[12px]/[normal] font-medium text-[#1F2937] transition-transform active:scale-95"
            >
              规则
            </button>
          </div>

          {/* 舞台：一颗玻璃球 + 围着它转的彩球 */}
          <div className="relative box-border min-h-[360px] w-full flex-1">
            <motion.div
              className="absolute inset-0"
              animate={{ y: sheetOpen ? -86 : 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 26 }}
            >
              <div className="absolute left-1/2 top-1/2 h-[344px] w-[344px] -translate-x-1/2 -translate-y-1/2">
                {/* 球体背后的光晕 */}
                <div
                  className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(214,238,255,0.62) 42%, rgba(214,238,255,0) 72%)',
                  }}
                />

                {/* 双虚线轨道，反向旋转 */}
                <div className="absolute left-1/2 top-1/2 h-0 w-0">
                  <motion.div
                    className="absolute -left-[150px] -top-[150px] h-[300px] w-[300px] rounded-full border-2 border-dashed border-white/90"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 52, repeat: Infinity, ease: 'linear' }}
                  />
                  <motion.div
                    className="absolute -left-[123px] -top-[123px] h-[246px] w-[246px] rounded-full border border-dashed border-white/70"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 38, repeat: Infinity, ease: 'linear' }}
                  />
                </div>

                {/* 中央玻璃球 */}
                <div
                  className="absolute left-1/2 top-1/2 flex h-[196px] w-[196px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
                  style={{
                    background:
                      'radial-gradient(circle at 32% 26%, #FFFFFF 0%, #F2FAFF 26%, #CFEAFC 62%, #A9D6F2 100%)',
                    border: '2px solid rgba(255,255,255,0.9)',
                    boxShadow:
                      'inset 0 -12px 26px rgba(70,140,200,0.28), inset 0 10px 18px rgba(255,255,255,0.95), 0 18px 40px rgba(58,124,180,0.22)',
                  }}
                >
                  <div className="pointer-events-none absolute left-[22px] top-[16px] h-[52px] w-[80px] rounded-full bg-white/70 blur-[6px]" />
                  <div className="relative flex flex-col items-center justify-center">
                    {isDrawing ? (
                      <div className="font-heading text-[26px]/[normal] font-bold text-[#0F6FC4]">{rollingName || '…'}</div>
                    ) : (
                      <div className="flex items-end gap-1">
                        <span
                          className={`font-data font-bold leading-none ${
                            String(ballValue).length > 2 ? 'text-[40px]' : 'text-[54px]'
                          }`}
                          style={{
                            backgroundImage: 'linear-gradient(160deg, #34A9F0 0%, #0B63C4 100%)',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            color: 'transparent',
                          }}
                        >
                          {ballValue}
                        </span>
                        <span className="mb-1.5 font-body text-[12px]/[normal] font-medium text-[#5C8FB5]">人</span>
                      </div>
                    )}
                    <div className="mt-1.5 font-body text-[11px]/[normal] font-medium text-[#5C8FB5]">{ballLabel}</div>
                  </div>
                </div>

                {/* 5 颗绕球公转的彩球（transform 由 rAF 直接写） */}
                <div className="absolute left-1/2 top-1/2 h-0 w-0">
                  {ORB_SKINS.map((skin, i) => (
                    <div
                      key={i}
                      ref={(el) => {
                        orbRefs.current[i] = el;
                      }}
                      className="absolute rounded-full will-change-transform"
                      style={{
                        width: ORB_SIZE,
                        height: ORB_SIZE,
                        left: -ORB_SIZE / 2,
                        top: -ORB_SIZE / 2,
                        background: skin.body,
                        boxShadow: `0 6px 14px ${skin.glow}, inset 0 -3px 6px rgba(0,0,0,0.12), inset 0 3px 6px rgba(255,255,255,0.8)`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* 规则标签 */}
              <div
                className={`absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-2 transition-opacity duration-300 ${
                  phase === 'idle' ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <span className="rounded-full bg-white/70 px-3 py-1 font-body text-[11px]/[normal] font-medium text-[#2B628F]">
                  概率均等
                </span>
                <span className="rounded-full bg-white/70 px-3 py-1 font-body text-[11px]/[normal] font-medium text-[#2B628F]">
                  已排除 {excludedIds.size} 人
                </span>
              </div>
            </motion.div>
          </div>

          {/* 底部操作区 */}
          <div className="relative z-20 w-full shrink-0 px-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
            {/* 统计条 */}
            <div className="flex h-[46px] items-center rounded-2xl bg-white/70 shadow-[0_2px_10px_rgba(58,124,180,0.10)]">
              {[
                { label: '候选人数', value: `${candidates.length}` },
                { label: '正选人数', value: `${mainCount}` },
                { label: '候补人数', value: `${backupCount}` },
              ].map((item, i) => (
                <div
                  key={item.label}
                  className={`flex h-full flex-1 items-center justify-center gap-1 ${
                    i > 0 ? 'border-l border-[#DCEBFA]' : ''
                  }`}
                >
                  <span className="font-caption text-[11px]/[normal] text-[#6B8FAD]">{item.label}</span>
                  <span className="font-data text-[15px]/[normal] font-bold text-[#12395C]">{item.value}</span>
                </div>
              ))}
            </div>

            {/* 三格卡片 */}
            <div className="mt-2.5 flex gap-2">
              <CountCard label="正选人数" value={mainCount} min={1} max={10} onChange={setMainCount} />
              <CountCard label="候补人数" value={backupCount} min={0} max={10} onChange={setBackupCount} />
              <button
                type="button"
                onClick={() => setShowExcludeModal(true)}
                className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-white/80 py-2 shadow-[0_2px_10px_rgba(58,124,180,0.10)] transition-transform active:scale-95"
              >
                <div className="flex items-center gap-1 font-body text-[10px]/[normal] text-[#6B8FAD]">
                  <UserMinus className="h-3 w-3" strokeWidth={2} />
                  排除人员
                </div>
                <div className="mt-1 font-data text-[15px]/[normal] font-bold text-[#12395C]">{excludedIds.size} 人</div>
              </button>
            </div>

            {/* 主按钮 */}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={runDraw}
                disabled={loading || isDrawing}
                className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-[18px] font-heading text-[16px]/[normal] font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #2F9BF0 0%, #0B6FE0 100%)',
                  boxShadow: '0 10px 24px rgba(11,111,224,0.32)',
                }}
              >
                <Shuffle className="h-[18px] w-[18px]" strokeWidth={2.5} />
                {loading ? '加载中…' : isDrawing ? '抽取中…' : '开始抽签'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/draw-records')}
                aria-label="中签记录"
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[18px] bg-white/80 text-[#2B628F] shadow-[0_6px_16px_rgba(58,124,180,0.16)] transition-transform active:scale-95"
              >
                <History className="h-[20px] w-[20px]" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        {/* 结果抽屉 */}
        <BottomSheet
          open={sheetOpen && !!previewResult}
          onClose={dismissResult}
          title="本次抽签结果"
          subtitle={`正选 ${previewResult?.main.length ?? 0} 人 · 候补 ${previewResult?.backup.length ?? 0} 人`}
          maxHeight="76vh"
          headerExtra={
            <button
              type="button"
              onClick={dismissResult}
              aria-label="关闭"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B] active:opacity-70"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          }
          footer={
            <div className="flex flex-col gap-2">
              {isCommittee && (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing || publicized}
                  className="flex h-[46px] w-full items-center justify-center gap-1.5 rounded-[14px] font-body text-[14px]/[normal] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
                  style={{
                    backgroundImage: publicized
                      ? 'linear-gradient(135deg, #8FD6A8 0%, #47B36B 100%)'
                      : 'linear-gradient(135deg, #34D399 0%, #059669 100%)',
                    boxShadow: publicized ? 'none' : '0 8px 18px rgba(5,150,105,0.24)',
                  }}
                >
                  {publicized ? (
                    <>
                      <Check className="h-4 w-4" strokeWidth={2.6} />
                      已公示给全班
                    </>
                  ) : publishing ? (
                    '公示中…'
                  ) : (
                    <>
                      <Megaphone className="h-4 w-4" strokeWidth={2.2} />
                      一键公示给全班
                    </>
                  )}
                </button>
              )}
              <div className="text-center font-body text-[10px]/[normal] text-[#94A3B8]">
                {isCommittee
                  ? '一键公示会保存抽签结果并通知全班'
                  : '个人抽签记录仅自己可见'}
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={runDraw}
                  disabled={confirming || publishing}
                  className="flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-[14px] border border-[#2F9BF0] bg-white font-body text-[14px]/[normal] font-semibold text-[#0B6FE0] transition-transform active:scale-[0.98] disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" strokeWidth={2.2} />
                  再抽一次
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={confirming || saved || publishing}
                  className="flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-[14px] font-body text-[14px]/[normal] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-70"
                  style={{
                    backgroundImage: saved
                      ? 'linear-gradient(135deg, #8FD6A8 0%, #47B36B 100%)'
                      : 'linear-gradient(135deg, #2F9BF0 0%, #0B6FE0 100%)',
                  }}
                >
                  {saved ? (
                    <>
                      <Check className="h-4 w-4" strokeWidth={2.6} />
                      已保存
                    </>
                  ) : confirming ? (
                    '保存中…'
                  ) : (
                    '确认保存'
                  )}
                </button>
              </div>
            </div>
          }
        >
          <div className="px-4 pb-1">
            <div className="flex flex-col gap-2">
              {previewResult?.main.map((item, index) => renderResultRow(item, index))}
            </div>
            {!!previewResult?.backup.length && (
              <div className="mt-2.5 rounded-xl bg-[#F8FAFC] px-2.5 py-2">
                <div className="font-body text-[10px]/[normal] font-semibold text-[#7C9DB8]">候补</div>
                <div className="mt-0.5 font-body text-[12px]/[normal] text-[#334155]">
                  {previewResult.backup.map((m) => m.name).join('、')}
                </div>
              </div>
            )}
          </div>
        </BottomSheet>

        {/* 排除人员弹层 */}
        <BottomSheet
          open={showExcludeModal}
          onClose={() => setShowExcludeModal(false)}
          title="选择排除人员"
          subtitle={`已排除 ${excludedIds.size} 人 · 候选 ${members.length - excludedIds.size} 人`}
          maxHeight="78vh"
          headerExtra={
            <button
              type="button"
              onClick={() => setExcludedIds(new Set())}
              disabled={excludedIds.size === 0}
              className="shrink-0 font-body text-[14px]/[normal] font-medium text-[#0062FF] active:opacity-70 disabled:text-[#C0C4CC]"
            >
              清空
            </button>
          }
          footer={
            <button
              type="button"
              onClick={() => setShowExcludeModal(false)}
              className="flex h-[48px] w-full shrink-0 items-center justify-center rounded-[14px] bg-[#0062FF] font-body text-[15px]/[normal] font-semibold text-white shadow-[0_10px_20px_rgba(0,98,255,0.24)] active:opacity-90"
            >
              完成 · {members.length - excludedIds.size} 人参与抽签
            </button>
          }
        >
          <div className="px-2 pb-2">
            {members.length === 0 ? (
              <div className="py-8 text-center font-body text-[14px]/[normal] text-[#9CA3AF]">暂无班级成员</div>
            ) : (
              <div className="flex flex-col">
                {members.map((m) => {
                  const isExcluded = excludedIds.has(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleExclude(m.id)}
                      className="flex w-full shrink-0 cursor-pointer flex-row items-center gap-3 rounded-[14px] px-3 py-2.5 transition-colors active:bg-[#F7F9FC]"
                    >
                      <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#1986E6] font-body text-[13px]/[normal] font-semibold text-white">
                        {(m.name || '?')[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-body text-[14px]/[normal] font-medium text-[#1F2937]">{m.name}</div>
                        {m.studentId && (
                          <div className="mt-0.5 font-caption text-[11px]/[normal] text-[#9CA3AF]">{m.studentId}</div>
                        )}
                      </div>
                      <div
                        className={`flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${
                          isExcluded ? 'border-[#0062FF] bg-[#0062FF]' : 'border-[#DBE1EA] bg-white'
                        }`}
                      >
                        {isExcluded && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </BottomSheet>

        <LoadingVeil
          open={confirming || publishing}
          text={publishing ? '正在公示给全班' : '正在保存抽签结果'}
          sub="请不要关闭页面"
        />
      </div>
    </div>
  );
}
