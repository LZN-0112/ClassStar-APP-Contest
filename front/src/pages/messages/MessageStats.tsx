import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Bell, Download, Users, CheckCircle, AlertCircle } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type AckTab = 'signed' | 'unsigned';

interface Member {
  userId: string;
  name: string;
  avatar?: string;
  studentId?: string;
  ackedAt?: string;
  overdue?: boolean;
}

interface StatsData {
  total: number;
  ackedCount: number;
  unackedCount: number;
  ackedList: Member[];
  unackedList: Member[];
  ackDeadline?: string;
}

function formatDateTime(iso?: string) {
  if (!iso) return '-';
  const date = new Date(iso);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

export default function MessageStats() {
  const navigate = useNavigate();
  const { messageId: routeMessageId } = useParams<{ messageId: string }>();
  const location = useLocation();
  const { user } = useCurrentUser();
  const stateMessageId = (location.state as { id?: string } | null)?.id;
  const messageId = routeMessageId || stateMessageId;

  const [activeTab, setActiveTab] = useState<AckTab>('unsigned');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reminding, setReminding] = useState(false);

  const classId = user?.classId;

  useEffect(() => {
    if (!messageId) {
      toast.error('通知ID缺失');
      navigate('/message-list', { replace: true });
      return;
    }

    const fetchStats = async () => {
      if (!classId || !messageId) return;
      setLoading(true);
      try {
        const res = await api.get(`/classes/${classId}/messages/${messageId}/acks`);
        const data = res.data.data || res.data;
        setStats(data);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '获取签收统计失败');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [messageId, classId, navigate]);

  const displayList = activeTab === 'signed' ? stats?.ackedList || [] : stats?.unackedList || [];

  const handleRemind = async () => {
    if (!stats || stats.unackedCount === 0 || !classId || !messageId || reminding) return;
    setReminding(true);
    try {
      await api.post(`/classes/${classId}/messages/${messageId}/remind`, {
        remindAfterMinutes: 30,
      });
      toast.success(`已推送提醒给 ${stats.unackedCount} 位未签收同学`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '提醒失败');
    } finally {
      setReminding(false);
    }
  };

  const handleExport = () => {
    if (!stats) return;
    const rows = [
      ['学号', '姓名', '状态'],
      ...stats.ackedList.map((m) => [m.studentId || '', m.name, '已签收']),
      ...stats.unackedList.map((m) => [m.studentId || '', m.name, '未签收']),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '签收名单.csv';
    link.click();
  };

  if (loading) {
    return (
      <PageLayout title="通知统计" variant="a" decor={<Bell className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}>
        <div className="flex w-full flex-1 items-center justify-center text-[14px] text-[#4B5563]">
          加载中...
        </div>
      </PageLayout>
    );
  }

  if (!stats) {
    return (
      <PageLayout title="通知统计" variant="a" decor={<Bell className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}>
        <div className="flex w-full flex-1 items-center justify-center text-[14px] text-[#4B5563]">
          暂无统计数据
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="通知统计" variant="a" decor={<Bell className="h-[120px] w-[120px] text-white" strokeWidth={1.5} />}>
      <div className="flex w-full flex-1 flex-col gap-5">
        <div className="text-[14px]/[normal] font-body font-normal text-[#4B5563]">
          通知签收情况
        </div>

        {/* 签收截止时间 */}
        {stats.ackDeadline && (
          <div className="text-[12px] text-[#6B7280]">
            签收截止：{formatDateTime(stats.ackDeadline)}
          </div>
        )}

        {/* 数据卡片 */}
        <div className="flex w-full flex-row gap-3">
          <div className="box-border flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-white p-4 shadow-soft">
            <Users className="h-5 w-5 text-[#0062FF]" strokeWidth={2} />
            <div className="text-[24px]/[normal] font-heading font-bold text-[#1A1A1A]">{stats.total}</div>
            <div className="text-[11px]/[normal] font-caption font-medium text-[#4B5563]">总人数</div>
          </div>
          <div className="box-border flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-white p-4 shadow-soft">
            <CheckCircle className="h-5 w-5 text-[#22C55E]" strokeWidth={2} />
            <div className="text-[24px]/[normal] font-heading font-bold text-[#1A1A1A]">{stats.ackedCount}</div>
            <div className="text-[11px]/[normal] font-caption font-medium text-[#4B5563]">已签收</div>
          </div>
          <div className="box-border flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-white p-4 shadow-soft">
            <AlertCircle className="h-5 w-5 text-[#EF4444]" strokeWidth={2} />
            <div className="text-[24px]/[normal] font-heading font-bold text-[#1A1A1A]">{stats.unackedCount}</div>
            <div className="text-[11px]/[normal] font-caption font-medium text-[#4B5563]">未签收</div>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex w-full flex-row gap-2">
          {[
            { value: 'signed' as AckTab, label: `已签收 (${stats.ackedCount})` },
            { value: 'unsigned' as AckTab, label: `未签收 (${stats.unackedCount})` },
          ].map((tab) => {
            const active = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`box-border flex h-[36px] flex-1 flex-col items-center justify-center rounded-full text-[13px]/[normal] font-body font-semibold transition-colors ${
                  active ? 'bg-[#0062FF] text-white shadow-soft' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 名单列表 */}
        <div className="flex w-full flex-1 flex-col gap-2">
          <div className="text-[11px]/[normal] font-body font-semibold text-[#6B7280]">
            {activeTab === 'signed' ? '已签收人员' : '未签收人员'}
          </div>
          <div className="flex w-full flex-col gap-2">
            {displayList.map((student) => (
              <div
                key={student.userId}
                className="box-border flex h-[52px] w-full shrink-0 flex-row items-center gap-3 rounded-xl bg-white px-4 shadow-soft"
              >
                <div className="box-border flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-full bg-[#076CAB]">
                  <div className="text-[12px]/[normal] font-body font-semibold text-white">{student.name.charAt(0)}</div>
                </div>
                <div className="flex flex-1 flex-row items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center">
                      <div className="text-[14px]/[normal] font-body font-medium text-[#1A1A1A]">{student.name}</div>
                      {activeTab === 'unsigned' && student.overdue && (
                        <span className="ml-2 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-semibold text-[#EF4444]">已逾期</span>
                      )}
                    </div>
                    <div className="text-[11px]/[normal] font-caption font-normal text-[#4B5563]">{student.studentId || '-'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={handleRemind}
            disabled={stats.unackedCount === 0 || reminding}
            className="box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center rounded-lg bg-[#0062FF] px-4 shadow-soft disabled:opacity-50 active:opacity-90"
          >
            <div className="flex items-center gap-2 text-[16px]/[normal] font-body font-semibold text-white">
              <Bell className="h-5 w-5" />
              {reminding ? '提醒中...' : '一键提醒未签收'}
            </div>
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="box-border flex h-[52px] w-full shrink-0 flex-col items-center justify-center rounded-lg border border-[#0062FF] bg-[#0062FF0D] px-4 active:opacity-90"
          >
            <div className="flex items-center gap-2 text-[16px]/[normal] font-body font-semibold text-[#0062FF]">
              <Download className="h-5 w-5" />
              导出签收名单
            </div>
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
