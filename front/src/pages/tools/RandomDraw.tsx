import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, Star, Plus, Minus, ChevronLeft, Save, Bell, X, RefreshCw, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import { toast } from 'sonner';

interface Member {
  id: string;
  studentId: string;
  name: string;
}

// 后端返回字段为 userId/student_id，统一映射为前端 Member 结构
const mapMember = (m: any): Member => ({
  id: m.userId || m.id || '',
  studentId: m.studentId || m.student_id || '',
  name: m.name || m.userName || '',
});

export default function RandomDraw() {
  const navigate = useNavigate();
  useStatusBarStyle(false); // 浅蓝渐变头部 → 系统状态栏深色(黑)图标
  const { user } = useCurrentUser();
  const classId = user?.classId;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [mainCount, setMainCount] = useState(5);
  const [backupCount, setBackupCount] = useState(3);
  const [mainSelected, setMainSelected] = useState<Member[]>([]);
  const [backupSelected, setBackupSelected] = useState<Member[]>([]);
  const [drawTitle] = useState('随机抽签');

  // 排除人员相关状态
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [showExcludeModal, setShowExcludeModal] = useState(false);

  // 预览确认相关状态
  const [previewResult, setPreviewResult] = useState<{ main: Member[], backup: Member[] } | null>(null);
  const [confirming, setConfirming] = useState(false);

  // 加载班级成员
  useEffect(() => {
    if (!classId) { setLoading(false); return; }
    api.get(`/classes/${classId}/members`, { params: { page: 1, pageSize: 200 } })
      .then((res) => {
        const data = res.data.data;
        // 后端返回结构: { list: [...], total: N, page: 1, pageSize: 200 }
        const list = Array.isArray(data?.list) ? data.list : (Array.isArray(data) ? data : []);
        console.log('[RandomDraw] members response:', JSON.stringify(data).slice(0, 200));
        console.log('[RandomDraw] parsed list length:', list.length);
        const mapped: Member[] = list.map((m: any) => ({
          id: m.userId || m.id,
          studentId: m.studentId || m.student_id || '',
          name: m.userName || m.name || '',
        }));
        setMembers(mapped);
      })
      .catch((err) => {
        console.error('[RandomDraw] load members error:', err);
        toast.error('加载班级成员失败');
      })
      .finally(() => setLoading(false));
  }, [classId]);

  // 候选人池计算
  const candidates = members.filter(m => !excludedIds.has(m.id));

  // 切换排除人员选中状态
  const toggleExclude = (id: string) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDraw = useCallback(async () => {
    if (!classId) { toast.error('请先加入班级'); return; }
    if (candidates.length < mainCount + backupCount) {
      toast.error(`候选人不足，至少需要 ${mainCount + backupCount} 人（当前 ${candidates.length} 人）`);
      return;
    }

    try {
      // 第一步：调用预览接口
      const res = await api.post(`/classes/${classId}/random-draws/preview`, {
        title: drawTitle,
        mainCount,
        backupCount,
        excludedUserIds: Array.from(excludedIds),
      });
      const data = res.data.data || res.data;
      const mapMember = (m: any): Member => ({ id: m.userId || m.id, studentId: m.studentId || m.student_id || '', name: m.name || '' });
      setPreviewResult({
        main: (data.main || []).map(mapMember),
        backup: (data.backup || []).map(mapMember),
      });
    } catch (err: any) {
      toast.error(err.message || '预览抽签失败');
    }
  }, [classId, candidates.length, mainCount, backupCount, drawTitle, excludedIds]);

  // 重新抽签（再次调用预览接口）
  const handleRedraw = useCallback(async () => {
    if (!classId) return;
    try {
      const res = await api.post(`/classes/${classId}/random-draws/preview`, {
        title: drawTitle,
        mainCount,
        backupCount,
        excludedUserIds: Array.from(excludedIds),
      });
      const data = res.data.data || res.data;
      setPreviewResult({
        main: (data.main || []).map(mapMember),
        backup: (data.backup || []).map(mapMember),
      });
      toast.success('已重新抽签');
    } catch (err: any) {
      toast.error(err.message || '重新抽签失败');
    }
  }, [classId, mainCount, backupCount, drawTitle, excludedIds]);

  // 确认保存抽签结果
  const handleConfirmSave = useCallback(async () => {
    if (!classId || !previewResult) return;
    setConfirming(true);
    try {
      const res = await api.post(`/classes/${classId}/random-draws`, {
        title: drawTitle,
        mainCount,
        backupCount,
        excludedUserIds: Array.from(excludedIds),
      });
      const data = res.data.data || res.data;
      setMainSelected((data.main || []).map(mapMember));
      setBackupSelected((data.backup || []).map(mapMember));
      setPreviewResult(null);
      toast.success('抽签已保存');
    } catch (err: any) {
      toast.error(err.message || '保存抽签失败');
    } finally {
      setConfirming(false);
    }
  }, [classId, previewResult, drawTitle, mainCount, backupCount, excludedIds]);

  // 关闭预览弹层
  const handleClosePreview = () => {
    setPreviewResult(null);
  };

  const handleSave = () => {
    navigate('/draw-records');
  };

  const handleSync = () => {
    toast.success('中签结果已同步至班级通知');
    navigate('/messages');
  };

  const renderRow = (item: Member, index: number) => (
    <div
      key={item.id}
      className="box-border flex h-[26px] w-full shrink-0 flex-row items-center justify-start gap-2 rounded-lg bg-[#F3F4F6] p-[0px_10px]"
    >
      <div className="box-border flex h-[18px] w-[18px] shrink-0 flex-row items-center justify-center rounded-[5px] bg-[#1986E6]">
        <div className="text-left font-data text-[10px]/[normal] font-bold text-white">{index + 1}</div>
      </div>
      <div className="box-border flex h-[20px] w-[20px] shrink-0 flex-row items-center justify-center rounded-full bg-[#1986E6]">
        <div className="text-left font-body text-[10px]/[normal] font-semibold text-white">{item.name[0]}</div>
      </div>
      <div className="text-left font-body text-[13px]/[normal] font-medium text-[#1F2937] [white-space:nowrap]">
        {item.name}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[100dvh] w-full items-start justify-center overflow-x-hidden overflow-y-auto bg-gray-200 sm:items-center sm:p-6">
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background [background-image:linear-gradient(180deg,#85C5F4_0%,#F1F8FE_100%)] bg-no-repeat bg-[length:100%_100%] sm:h-phone sm:w-phone sm:rounded-device sm:shadow-lift">
        <div className="relative flex flex-1 flex-col items-center overflow-y-auto overflow-x-hidden">
          <div className="flex w-full min-h-full flex-col items-center">
            {/* Status Bar */}
            <div
              data-pencil-name="Status Bar"
              className="box-border flex h-[62px] w-full shrink-0 flex-row items-center justify-between gap-0 bg-[#85C5F4] p-[12px_24px_0px_24px]"
            >
              <div className="box-border text-left font-data text-[14px]/[normal] font-semibold text-[#1A1A1A] [white-space:nowrap]">
                9:41
              </div>
              <div className="box-border flex h-fit w-fit shrink-0 flex-row items-center justify-start gap-[6px]">
                <div className="box-border text-left font-caption text-[14px]/[normal] font-normal text-[#1A1A1A] [white-space:nowrap]">
                  ◉◉◉◉
                </div>
                <div className="box-border text-left font-data text-[14px]/[normal] font-normal text-[#1A1A1A] [white-space:nowrap]">
                  100%
                </div>
              </div>
            </div>

            {/* Content */}
            <div
              data-pencil-name="Content"
              className="relative flex w-full flex-1 flex-col items-center justify-start gap-2 bg-cover bg-no-repeat p-[0px_0px_56px_0px] [background-image:linear-gradient(180deg,#85C5F4_0%,#F1F8FE_100%)]"
            >
              {/* Header */}
              <div
                data-pencil-name="Header"
                className="relative box-border flex h-[48px] w-full shrink-0 flex-row items-center justify-between gap-0 bg-[#00000000] p-[0px_20px] [z-index:0]"
              >
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center text-[#1A1A1A] transition-opacity active:opacity-70"
                  aria-label="返回"
                >
                  <ChevronLeft className="h-6 w-6" strokeWidth={2} />
                </button>
                <div
                  data-pencil-name="Title"
                  className="box-border text-left font-heading text-[16px]/[normal] font-bold text-[#1A1A1A] [white-space:nowrap] [filter:drop-shadow(0px_0px_10px_#FFFFFF66)]"
                >
                  随机抽签
                </div>
                <div
                  data-pencil-name="Rules Button"
                  className="box-border flex h-[40px] w-[40px] shrink-0 cursor-pointer flex-row items-center justify-center gap-0 rounded-full border border-[#FFFFFF33] bg-[#FFFFFF33] transition-transform duration-150 active:scale-95"
                  onClick={() => navigate('/draw-rules')}
                >
                  <div className="box-border text-left font-body text-[12px]/[normal] font-medium text-[#1A1A1A] [white-space:nowrap]">
                    规则
                  </div>
                </div>
              </div>

              {/* Info Bar */}
              <div
                data-pencil-name="Info Bar"
                className="relative box-border flex h-[64px] w-[calc(100%-48px)] shrink-0 flex-row items-center justify-around gap-0 rounded-[20px] border border-[#FFFFFF30] bg-[#FFFFFF30] p-[12px] [box-shadow:0px_1px_4px_0px_#FFFFFF20] [z-index:1]"
              >
                {[
                  { label: '活动名称', value: drawTitle },
                  { label: '班级', value: user?.className || '未加入班级' },
                  { label: '候选人数', value: `候选 ${candidates.length} 人（排除 ${excludedIds.size} 人）` },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="box-border flex h-fit flex-1 flex-col items-center justify-start gap-[4px] bg-[#00000000]"
                  >
                    <div className="box-border text-left font-caption text-[11px]/[normal] font-normal text-[#1A1A1A] [white-space:nowrap]">
                      {item.label}
                    </div>
                    <div className="box-border text-left font-body text-[14px]/[normal] font-semibold text-[#1A1A1A] [white-space:nowrap]">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Announcement */}
              {mainSelected.length > 0 && (
                <div
                  data-pencil-name="Announcement"
                  className="relative box-border flex h-fit w-fit shrink-0 flex-row items-center justify-start gap-2 rounded-full bg-[#00000050] p-[0px_14px] [z-index:2]"
                >
                  <Volume2 className="h-[16px] w-[16px] text-white" strokeWidth={2} />
                  <div className="box-border text-left font-body text-[12px]/[normal] font-normal text-[#FFFFFFDD] [white-space:nowrap]">
                    恭喜{mainSelected[0]?.name}同学被抽中
                  </div>
                </div>
              )}

              {/* Visual Stack */}
              <div
                data-pencil-name="Visual Stack"
                className="relative box-border w-full min-h-[780px] flex-1 bg-[#00000000] [z-index:4]"
              >
                {/* Lottery Machine */}
                <img
                  data-pencil-name="Lottery Machine"
                  src="/images/gashapon.png"
                  alt="扭蛋机"
                  className="absolute left-1/2 top-0 z-0 box-border w-[260px] -translate-x-1/2 border-0 bg-transparent object-contain shadow-none"
                />

                {/* Settings Inputs */}
                <div
                  data-pencil-name="Settings"
                  className="absolute left-4 top-[80px] z-[4] box-border flex flex-col gap-2"
                >
                  <div className="box-border flex h-[36px] w-[120px] flex-row items-center justify-between rounded-lg border border-[#FFFFFF50] bg-[#FFFFFF40] px-2">
                    <span className="text-[11px]/[normal] font-body font-medium text-[#1F2937]">正选人数</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setMainCount((v) => Math.max(1, v - 1))}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-white/50 active:opacity-70"
                      >
                        <Minus className="h-3 w-3 text-[#1F2937]" strokeWidth={2} />
                      </button>
                      <span className="w-4 text-center font-data text-[14px]/[normal] font-bold text-[#1F2937]">{mainCount}</span>
                      <button
                        type="button"
                        onClick={() => setMainCount((v) => Math.min(10, v + 1))}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-white/50 active:opacity-70"
                      >
                        <Plus className="h-3 w-3 text-[#1F2937]" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                  <div className="box-border flex h-[36px] w-[120px] flex-row items-center justify-between rounded-lg border border-[#FFFFFF50] bg-[#FFFFFF40] px-2">
                    <span className="text-[11px]/[normal] font-body font-medium text-[#1F2937]">候补人数</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setBackupCount((v) => Math.max(0, v - 1))}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-white/50 active:opacity-70"
                      >
                        <Minus className="h-3 w-3 text-[#1F2937]" strokeWidth={2} />
                      </button>
                      <span className="w-4 text-center font-data text-[14px]/[normal] font-bold text-[#1F2937]">{backupCount}</span>
                      <button
                        type="button"
                        onClick={() => setBackupCount((v) => Math.min(10, v + 1))}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-white/50 active:opacity-70"
                      >
                        <Plus className="h-3 w-3 text-[#1F2937]" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowExcludeModal(true)}
                    className="box-border flex h-[36px] w-[120px] flex-row items-center justify-between rounded-lg border border-[#FFFFFF50] bg-[#FFFFFF40] px-2 active:opacity-70"
                  >
                    <span className="text-[11px]/[normal] font-body font-medium text-[#1F2937]">排除人员</span>
                    <span className="font-data text-[12px]/[normal] font-bold text-[#1F2937]">{excludedIds.size} 人</span>
                  </button>
                </div>

                {/* Controls */}
                <div
                  data-pencil-name="Controls"
                  className="absolute left-1/2 top-[272px] box-border flex h-[65px] w-[214px] -translate-x-1/2 flex-row items-center justify-around gap-[20px] bg-[#00000000] p-[0px_20px] [z-index:2]"
                >
                  <div
                    data-pencil-name="Start Button"
                    className="box-border flex h-[45px] w-[107px] shrink-0 cursor-pointer flex-col items-center justify-center gap-[2px] rounded-[16px] border-2 border-[#FDE68A] bg-cover bg-no-repeat [background-image:linear-gradient(180deg,#FBCFE8_0%,#FCD34D_100%)] [box-shadow:0px_6px_16px_0px_#00000026] transition-transform duration-150 active:scale-95"
                    onClick={handleDraw}
                  >
                    <div className="box-border text-left font-heading text-[16px]/[normal] font-bold text-[#FFFFFF] [white-space:nowrap]">
                      {loading ? '加载中...' : '开始抽签'}
                    </div>
                    <div className="box-border text-left font-caption text-[10px]/[normal] font-normal text-[#FFFFFFCC] [white-space:nowrap]">
                      从全班{members.length}人中抽取
                    </div>
                  </div>
                </div>

                {/* Record Link */}
                <div
                  data-pencil-name="Record Link"
                  className="absolute right-[21px] top-[327px] z-[5] flex h-[20px] w-[80px] flex-row items-start justify-end gap-0 bg-[#00000000]"
                >
                  <div
                    className="cursor-pointer text-left font-body text-[12px]/[normal] font-medium text-[#374151] transition-opacity [white-space:nowrap] active:opacity-70"
                    onClick={() => navigate('/draw-records')}
                  >
                    中签记录 &gt;
                  </div>
                </div>

                {/* Result Card - 可滚动 */}
                <div
                  data-pencil-name="Result Card"
                  className="absolute left-4 right-4 top-[352px] z-[1] box-border flex w-[calc(100%-32px)] flex-col items-center justify-start gap-2 overflow-y-auto rounded-[24px] bg-[#FFFFFF] p-[12px] [box-shadow:0px_-4px_20px_0px_#00000014]"
                  style={{ maxHeight: '280px' }}
                >
                  <div className="box-border flex h-fit w-full shrink-0 flex-row items-center justify-center gap-2 bg-[#00000000]">
                    <Star className="h-[14px] w-[14px] text-[#FCD34D]" strokeWidth={2} fill="#FCD34D" />
                    <div
                      className="box-border text-left font-heading text-[18px]/[normal] font-bold [white-space:nowrap]"
                      style={{
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        backgroundImage: 'linear-gradient(135deg, #32C9FD 0%, #1986E6 100%)',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '100% 100%',
                        color: 'transparent',
                      }}
                    >
                      中签结果榜单
                    </div>
                    <Star className="h-[14px] w-[14px] text-[#FCD34D]" strokeWidth={2} fill="#FCD34D" />
                  </div>

                  {/* Main Selected */}
                  <div className="box-border flex h-fit w-full shrink-0 flex-col items-start justify-start gap-[10px] bg-[#00000000]">
                    <div className="box-border flex h-[18px] w-full shrink-0 flex-row items-center justify-start gap-2 bg-[#00000000]">
                      <div className="box-border flex h-[12px] w-[4px] shrink-0 flex-row items-start justify-start rounded-[2px] bg-[#1986E6]"></div>
                      <div className="box-border text-left font-body text-[12px]/[normal] font-semibold text-[#1F2937] [white-space:nowrap]">
                        正选代表 · 共{mainSelected.length}人
                      </div>
                    </div>
                    {mainSelected.map((item, index) => renderRow(item, index))}
                    {mainSelected.length === 0 && (
                      <div className="text-[12px] text-[#9CA3AF] p-2">点击"开始抽签"抽取</div>
                    )}
                  </div>

                  {/* Backup Selected */}
                  <div className="box-border flex h-fit w-full shrink-0 flex-col items-start justify-start gap-[10px] bg-[#00000000]">
                    <div className="box-border flex h-[18px] w-full shrink-0 flex-row items-center justify-start gap-2 bg-[#00000000]">
                      <div className="box-border flex h-[12px] w-[4px] shrink-0 flex-row items-start justify-start rounded-[2px] bg-[#1986E6]"></div>
                      <div className="box-border text-left font-body text-[12px]/[normal] font-semibold text-[#1F2937] [white-space:nowrap]">
                        候补代表 · 共{backupSelected.length}人
                      </div>
                    </div>
                    {backupSelected.map((item, index) => renderRow(item, index))}
                    {backupSelected.length === 0 && mainSelected.length === 0 && (
                      <div className="text-[12px] text-[#9CA3AF] p-2">候补名单将在抽签后显示</div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="absolute bottom-0 left-0 right-0 z-[10] flex w-full flex-col gap-2 bg-gradient-to-t from-[#F1F8FE] via-[#F1F8FE] to-transparent px-5 pb-5 pt-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="box-border flex h-[42px] w-full shrink-0 flex-col items-center justify-center gap-2 rounded-lg bg-[#0062FF] px-4 [box-shadow:0px_4px_16px_0px_#0000001A] active:opacity-90"
                  >
                    <div className="flex items-center gap-2 text-[14px]/[normal] font-body font-semibold text-white">
                      <Save className="h-4 w-4" />
                      查看抽签记录
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleSync}
                    className="box-border flex h-[42px] w-full shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-[#0062FF] bg-[#0062FF0D] px-4 active:opacity-90"
                  >
                    <div className="flex items-center gap-2 text-[14px]/[normal] font-body font-semibold text-[#0062FF]">
                      <Bell className="h-4 w-4" />
                      结果同步至班级通知
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 排除人员弹层 */}
        {showExcludeModal && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
            onClick={() => setShowExcludeModal(false)}
          >
            <div
              className="w-full rounded-t-2xl bg-white p-4 max-h-[70vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-[16px] font-bold text-[#1F2937]">选择排除人员</div>
                <button
                  type="button"
                  onClick={() => setShowExcludeModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] active:opacity-70"
                >
                  <X className="h-4 w-4 text-[#6B7280]" />
                </button>
              </div>
              <div className="text-[12px] text-[#9CA3AF] mb-3">
                已选择 {excludedIds.size} 人排除
              </div>
              <div className="flex-1 overflow-y-auto mb-4">
                {members.length === 0 ? (
                  <div className="text-center text-[14px] text-[#9CA3AF] py-8">暂无班级成员</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {members.map((m) => {
                      const isExcluded = excludedIds.has(m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleExclude(m.id)}
                          className={`box-border flex h-[44px] w-full shrink-0 flex-row items-center justify-between rounded-lg px-3 cursor-pointer transition-colors ${
                            isExcluded ? 'bg-[#DBEAFE]' : 'bg-[#F9FAFB]'
                          } active:opacity-80`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="box-border flex h-[28px] w-[28px] shrink-0 flex-row items-center justify-center rounded-full bg-[#1986E6]">
                              <div className="text-left font-body text-[12px]/[normal] font-semibold text-white">
                                {m.name[0]}
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <div className="text-left font-body text-[14px]/[normal] font-medium text-[#1F2937]">
                                {m.name}
                              </div>
                              {m.studentId && (
                                <div className="text-left font-caption text-[11px]/[normal] text-[#9CA3AF]">
                                  {m.studentId}
                                </div>
                              )}
                            </div>
                          </div>
                          {isExcluded && (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1986E6]">
                              <Check className="h-3 w-3 text-white" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowExcludeModal(false)}
                className="box-border flex h-[44px] w-full shrink-0 flex-col items-center justify-center rounded-lg bg-[#0062FF] active:opacity-90"
              >
                <div className="text-[14px]/[normal] font-body font-semibold text-white">
                  确定
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 预览确认弹层 */}
        {previewResult && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
            <div className="w-full max-w-[360px] rounded-2xl bg-white p-5 max-h-[80vh] flex flex-col">
              <div className="text-[18px] font-bold text-[#1F2937] mb-4 text-center">
                抽签结果预览
              </div>
              <div className="flex-1 overflow-y-auto mb-4">
                {/* 正选名单 */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4 text-[#FCD34D]" fill="#FCD34D" />
                    <div className="text-[14px] font-semibold text-[#1F2937]">
                      正选代表 · 共{previewResult.main.length}人
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {previewResult.main.map((item, index) => (
                      <div
                        key={item.id}
                        className="box-border flex h-[36px] w-full shrink-0 flex-row items-center justify-start gap-3 rounded-lg bg-[#F3F4F6] px-3"
                      >
                        <div className="box-border flex h-[22px] w-[22px] shrink-0 flex-row items-center justify-center rounded-[6px] bg-[#1986E6]">
                          <div className="text-left font-data text-[11px]/[normal] font-bold text-white">
                            {index + 1}
                          </div>
                        </div>
                        <div className="box-border flex h-[24px] w-[24px] shrink-0 flex-row items-center justify-center rounded-full bg-[#1986E6]">
                          <div className="text-left font-body text-[11px]/[normal] font-semibold text-white">
                            {item.name[0]}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <div className="text-left font-body text-[14px]/[normal] font-medium text-[#1F2937]">
                            {item.name}
                          </div>
                          {item.studentId && (
                            <div className="text-left font-caption text-[11px]/[normal] text-[#9CA3AF]">
                              {item.studentId}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 候补名单 */}
                {previewResult.backup.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-4 w-4 text-[#9CA3AF]" fill="#D1D5DB" />
                      <div className="text-[14px] font-semibold text-[#1F2937]">
                        候补代表 · 共{previewResult.backup.length}人
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {previewResult.backup.map((item, index) => (
                        <div
                          key={item.id}
                          className="box-border flex h-[36px] w-full shrink-0 flex-row items-center justify-start gap-3 rounded-lg bg-[#F3F4F6] px-3"
                        >
                          <div className="box-border flex h-[22px] w-[22px] shrink-0 flex-row items-center justify-center rounded-[6px] bg-[#1986E6]">
                            <div className="text-left font-data text-[11px]/[normal] font-bold text-white">
                              {index + 1}
                            </div>
                          </div>
                          <div className="box-border flex h-[24px] w-[24px] shrink-0 flex-row items-center justify-center rounded-full bg-[#1986E6]">
                            <div className="text-left font-body text-[11px]/[normal] font-semibold text-white">
                              {item.name[0]}
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <div className="text-left font-body text-[14px]/[normal] font-medium text-[#1F2937]">
                              {item.name}
                            </div>
                            {item.studentId && (
                              <div className="text-left font-caption text-[11px]/[normal] text-[#9CA3AF]">
                                {item.studentId}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleRedraw}
                  className="box-border flex h-[44px] flex-1 shrink-0 flex-col items-center justify-center rounded-lg border border-[#0062FF] bg-white active:opacity-90"
                >
                  <div className="flex items-center gap-1 text-[14px]/[normal] font-body font-semibold text-[#0062FF]">
                    <RefreshCw className="h-4 w-4" />
                    重新抽签
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={confirming}
                  className="box-border flex h-[44px] flex-1 shrink-0 flex-col items-center justify-center rounded-lg bg-[#0062FF] active:opacity-90 disabled:opacity-50"
                >
                  <div className="text-[14px]/[normal] font-body font-semibold text-white">
                    {confirming ? '保存中...' : '确认保存'}
                  </div>
                </button>
              </div>
              <button
                type="button"
                onClick={handleClosePreview}
                className="mt-2 text-[13px] text-[#9CA3AF] active:opacity-70"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
