import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import {
  AlertCircle,
  Activity,
  CheckCircle,
  Clock,
  Filter,
  ChevronLeft,
  RefreshCw,
  AlertTriangle,
  Info,
  XCircle,
} from 'lucide-react';

interface DashboardData {
  total: number;
  bySeverity: {
    critical: number;
    major: number;
    minor: number;
    info: number;
  };
  todayCount: number;
  statusBreakdown: { status: string; count: number }[];
  topErrorTypes: { type: string; count: number }[];
  last7Days: { date: string; count: number }[];
}

interface ErrorLog {
  id: string;
  error_type: string;
  severity: string;
  message: string;
  page_path: string | null;
  device_info: string | null;
  browser_info: string | null;
  user_feedback: string | null;
  status: string;
  created_at: string;
  error_solutions: {
    id: string;
    title: string;
    steps: string;
  } | null;
}

const severityConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  critical: { label: '致命', color: '#DC2626', bgColor: '#FEE2E2', icon: XCircle },
  major: { label: '严重', color: '#D97706', bgColor: '#FEF3C7', icon: AlertTriangle },
  minor: { label: '一般', color: '#2563EB', bgColor: '#DBEAFE', icon: Info },
  info: { label: '提示', color: '#6B7280', bgColor: '#E5E7EB', icon: AlertCircle },
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  new: { label: '新建', color: '#DC2626', bgColor: '#FEE2E2' },
  processing: { label: '处理中', color: '#D97706', bgColor: '#FEF3C7' },
  resolved: { label: '已解决', color: '#059669', bgColor: '#D1FAE5' },
  closed: { label: '已关闭', color: '#6B7280', bgColor: '#E5E7EB' },
};

export default function ErrorDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, logsRes] = await Promise.all([
        api.get('/errors/dashboard'),
        api.get('/errors/logs', {
          params: {
            severity: filterSeverity || undefined,
            status: filterStatus || undefined,
            page,
            pageSize: 20,
          },
        }),
      ]);
      setDashboard(dashRes.data.data);
      setLogs(logsRes.data.data.data);
      setTotal(logsRes.data.data.total);
    } catch (err) {
      console.error('获取错误数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterSeverity, filterStatus, page]);

  const maxCount = Math.max(...(dashboard?.last7Days.map((d) => d.count) || [1]), 1);

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] active:opacity-70"
        >
          <ChevronLeft className="h-5 w-5 text-[#4B5563]" />
        </button>
        <h1 className="text-[17px] font-semibold text-[#1A1A1A]">错误监控看板</h1>
        <button
          onClick={fetchData}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] active:opacity-70"
        >
          <RefreshCw className={`h-4 w-4 text-[#4B5563] ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !dashboard ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0062FF] border-t-transparent" />
        </div>
      ) : dashboard ? (
        <div className="px-4 py-4 space-y-4">
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DBEAFE]">
                  <Activity className="h-4 w-4 text-[#0062FF]" />
                </div>
                <span className="text-[12px] text-[#6B7280]">今日错误</span>
              </div>
              <p className="mt-2 text-[24px] font-bold text-[#1A1A1A]">{dashboard.todayCount}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FEE2E2]">
                  <AlertCircle className="h-4 w-4 text-[#DC2626]" />
                </div>
                <span className="text-[12px] text-[#6B7280]">累计错误</span>
              </div>
              <p className="mt-2 text-[24px] font-bold text-[#1A1A1A]">{dashboard.total}</p>
            </div>
          </div>

          {/* 严重程度分布 */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-3">严重程度分布</h3>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(dashboard.bySeverity).map(([key, count]) => {
                const config = severityConfig[key];
                const Icon = config?.icon || AlertCircle;
                return (
                  <div
                    key={key}
                    className="flex flex-col items-center rounded-xl p-3"
                    style={{ backgroundColor: config?.bgColor }}
                  >
                    <Icon className="h-5 w-5" style={{ color: config?.color }} />
                    <span className="mt-1 text-[11px] font-medium" style={{ color: config?.color }}>
                      {config?.label}
                    </span>
                    <span className="text-[18px] font-bold text-[#1A1A1A]">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7天趋势 */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-3">近7天趋势</h3>
            <div className="flex items-end gap-2 h-24">
              {dashboard.last7Days.map((day) => (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-[#6B7280]">{day.count}</span>
                  <div
                    className="w-full rounded-t-md bg-[#0062FF] transition-all"
                    style={{ height: `${(day.count / maxCount) * 100}%`, minHeight: day.count > 0 ? '4px' : '0px' }}
                  />
                  <span className="text-[10px] text-[#9CA3AF]">
                    {day.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 状态分布 */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-3">处理状态</h3>
            <div className="space-y-2">
              {dashboard.statusBreakdown.map((item) => {
                const config = statusConfig[item.status] || statusConfig['new'];
                const percentage = dashboard.total > 0 ? (item.count / dashboard.total) * 100 : 0;
                return (
                  <div key={item.status} className="flex items-center gap-3">
                    <span
                      className="w-14 text-[12px] font-medium"
                      style={{ color: config.color }}
                    >
                      {config.label}
                    </span>
                    <div className="flex-1 h-6 rounded-full bg-[#F3F4F6] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percentage}%`, backgroundColor: config.color }}
                      />
                    </div>
                    <span className="w-10 text-right text-[12px] text-[#6B7280]">{item.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 错误类型排行 */}
          {dashboard.topErrorTypes.length > 0 && (
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-3">错误类型排行</h3>
              <div className="space-y-2">
                {dashboard.topErrorTypes.map((item, index) => (
                  <div key={item.type} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F3F4F6] text-[10px] font-bold text-[#6B7280]">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-[13px] text-[#1A1A1A] truncate">{item.type}</span>
                    <span className="text-[12px] font-medium text-[#0062FF]">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 筛选器 */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-[#6B7280]" />
              <h3 className="text-[14px] font-semibold text-[#1A1A1A]">筛选错误日志</h3>
            </div>
            <div className="flex gap-2">
              <select
                value={filterSeverity}
                onChange={(e) => {
                  setFilterSeverity(e.target.value);
                  setPage(1);
                }}
                className="flex-1 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] outline-none focus:border-[#0062FF]"
              >
                <option value="">全部严重程度</option>
                <option value="critical">致命</option>
                <option value="major">严重</option>
                <option value="minor">一般</option>
                <option value="info">提示</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="flex-1 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] outline-none focus:border-[#0062FF]"
              >
                <option value="">全部状态</option>
                <option value="new">新建</option>
                <option value="processing">处理中</option>
                <option value="resolved">已解决</option>
                <option value="closed">已关闭</option>
              </select>
            </div>
          </div>

          {/* 错误日志列表 */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-3">
              错误日志 ({total})
            </h3>
            {logs.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-[#9CA3AF]">
                <CheckCircle className="h-12 w-12 mb-2" />
                <p className="text-[13px]">暂无错误日志</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => {
                  const severityConf = severityConfig[log.severity] || severityConfig['minor'];
                  const statusConf = statusConfig[log.status] || statusConfig['new'];
                  const SeverityIcon = severityConf.icon;
                  return (
                    <div
                      key={log.id}
                      className="rounded-xl border border-[#E5E7EB] p-3"
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: severityConf.bgColor }}
                        >
                          <SeverityIcon className="h-4 w-4" style={{ color: severityConf.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                              style={{ backgroundColor: severityConf.bgColor, color: severityConf.color }}
                            >
                              {severityConf.label}
                            </span>
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                              style={{ backgroundColor: statusConf.bgColor, color: statusConf.color }}
                            >
                              {statusConf.label}
                            </span>
                          </div>
                          <p className="mt-1 text-[13px] font-medium text-[#1A1A1A] truncate">
                            {log.error_type}
                          </p>
                          <p className="mt-0.5 text-[12px] text-[#6B7280] line-clamp-2">
                            {log.message}
                          </p>
                          {log.page_path && (
                            <p className="mt-1 text-[11px] text-[#9CA3AF] truncate">
                              页面: {log.page_path}
                            </p>
                          )}
                          {log.error_solutions && (
                            <p className="mt-1 text-[11px] text-[#059669]">
                              已匹配解决方案: {log.error_solutions.title}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-1 text-[11px] text-[#9CA3AF]">
                            <Clock className="h-3 w-3" />
                            {new Date(log.created_at).toLocaleString('zh-CN', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 分页 */}
            {total > 20 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-[12px] text-[#4B5563] disabled:opacity-40"
                >
                  上一页
                </button>
                <span className="text-[12px] text-[#6B7280]">
                  {page} / {Math.ceil(total / 20)}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(Math.ceil(total / 20), p + 1))}
                  disabled={page >= Math.ceil(total / 20)}
                  className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-[12px] text-[#4B5563] disabled:opacity-40"
                >
                  下一页
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
