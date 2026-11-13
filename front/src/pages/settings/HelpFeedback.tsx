import { useCallback, useEffect, useRef, useState } from 'react';
import PhoneFrame from '@/components/layout/PhoneFrame';
import SettingsHeader from '@/components/layout/SettingsHeader';
import { toast } from 'sonner';
import { api, type ApiResponse } from '@/lib/api';
import BottomSheet from '@/components/ui/BottomSheet';

interface FeedbackItem {
  id: string;
  content: string;
  contact?: string | null;
  status: string;
  createdAt: string;
}

interface FeedbackPage {
  items: FeedbackItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

type SheetKey = 'faq' | 'guide' | 'service' | null;

const MAX_CONTENT = 500;
const PAGE_SIZE = 20;

const FAQS = [
  {
    q: '如何加入班级？',
    a: '登录后进入「加入或创建班级」页，输入班主任提供的班级邀请码即可加入；班主任也可以在成员管理中直接邀请。',
  },
  {
    q: '为什么收不到通知？',
    a: '请先在「设置 → 通知设置」中确认对应开关已开启，并在系统设置中允许班务星发送通知。',
  },
  {
    q: '如何提交作业？',
    a: '进入「作业」列表打开对应作业，点击「提交作业」上传内容即可；若已逾期，可在作业详情中发起延期申请。',
  },
  {
    q: '如何请假？',
    a: '在考勤模块进入「请假申请」，选择请假类型与时间并填写原因，提交后等待班主任审批。',
  },
  {
    q: '如何修改密码？',
    a: '进入「我的 → 设置 → 账号与安全 → 修改密码」，验证原密码后即可设置新密码。',
  },
];

const GUIDES = [
  {
    title: '发布通知',
    desc: '首页 → 发布 → 选择「通知」，填写标题与内容后发布，可在消息统计中查看已读情况。',
  },
  {
    title: '发起考勤',
    desc: '考勤 → 发布考勤 → 设置签到方式与截止时间，学生在「签到」页完成打卡。',
  },
  {
    title: '发布作业',
    desc: '作业 → 发布作业 → 填写要求与截止时间，学生提交后可在作业详情中批阅。',
  },
  {
    title: '管理班费',
    desc: '班费 → 收支记录，可新增收入 / 支出并查看余额明细。',
  },
];

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: '待处理', className: 'bg-[#FEF3C7] text-[#D97706]' },
  processing: { label: '处理中', className: 'bg-[#E0F2FE] text-[#0062FF]' },
  resolved: { label: '已处理', className: 'bg-[#DCFCE7] text-[#16A34A]' },
};

const SHEET_TITLES: Record<Exclude<SheetKey, null>, string> = {
  faq: '常见问题',
  guide: '使用教程',
  service: '在线客服',
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function HelpFeedback() {

  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [sheet, setSheet] = useState<SheetKey>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);
  const submitRef = useRef<HTMLButtonElement | null>(null);

  const canSubmit = content.trim().length >= 5 && !submitting;

  const loadFeedbacks = useCallback(async (targetPage = 1) => {
    if (targetPage === 1) {
      setLoading(true);
      setLoadError(false);
    } else {
      setLoadingMore(true);
    }
    try {
      const res = await api.get<ApiResponse<FeedbackPage>>('/feedback/my', {
        params: { page: targetPage, pageSize: PAGE_SIZE },
      });
      const data = res.data.data;
      const items = data?.items ?? [];
      setFeedbacks((prev) => (targetPage === 1 ? items : [...prev, ...items]));
      setPage(targetPage);
      setHasMore(Boolean(data?.hasMore));
    } catch {
      if (targetPage === 1) {
        setFeedbacks([]);
        setLoadError(true);
      } else {
        toast.error('加载更多失败，请稍后重试');
      }
    } finally {
      if (targetPage === 1) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadFeedbacks(1);
  }, [loadFeedbacks]);

  // 键盘弹出时把提交按钮滚入可视区，避免被遮挡
  const keepSubmitVisible = () => {
    window.setTimeout(() => {
      submitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const handleSubmit = async () => {
    const text = content.trim();
    if (submitting) return;
    if (text.length < 5) {
      toast.error('反馈内容至少 5 个字');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/feedback', { content: text, contact: contact.trim() || undefined });
      toast.success('提交成功，感谢您的反馈');
      setContent('');
      setContact('');
      (document.activeElement as HTMLElement | null)?.blur();
      await loadFeedbacks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const goToForm = () => {
    setSheet(null);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  return (
    <PhoneFrame>
      <SettingsHeader title="帮助与反馈" />
              <div
                data-pencil-name="Content"
                className="box-border w-full [flex:1_1_0] flex flex-col gap-0 justify-start items-start bg-[#FFFFFF]"
              >
                <div
                  data-pencil-name="Body"
                  className="box-border w-full [flex:1_1_0] flex flex-col gap-4 p-[16px_20px_24px_20px] justify-start items-start"
                >
                  <div
                    data-pencil-name="Help Entries"
                    className="box-border w-full h-fit shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[4px] p-[12px] justify-start items-start bg-[#FFFFFF] rounded-lg"
                  >
                    <div
                      data-pencil-name="Row 常见问题"
                      onClick={() => setSheet('faq')}
                      className="box-border w-full h-[56px] shrink-0 cursor-pointer flex flex-row gap-[12px] p-[0px_12px] justify-start items-center rounded-lg active:bg-[#F8FAFC]"
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[40px] shrink-0 h-[40px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                      >
                        <svg
                          data-pencil-name="Icon-help-circle"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                        >
                          <path
                            d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0m9 4v0.01m0-3.01a2 2 0 0 0 0.914-3.782 1.98 1.98 0 0 0-2.414 0.483"
                            fill="#00000000"
                          ></path>
                          <path
                            d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0m9 4v0.01m0-3.01a2 2 0 0 0 0.914-3.782 1.98 1.98 0 0 0-2.414 0.483"
                            fill="none"
                            stroke="#0062FF"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          ></path>
                        </svg>
                      </div>
                      <div
                        data-pencil-name="Label"
                        className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                      >
                        常见问题
                      </div>
                      <div
                        className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"
                      ></div>
                      <svg
                        data-pencil-name="Icon-chevron-right"
                        viewBox="0 0 24 24"
                        preserveAspectRatio="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                      >
                        <path d="M9 18l6-6-6-6" fill="#00000000"></path>
                        <path
                          d="M9 18l6-6-6-6"
                          fill="none"
                          stroke="#4B5563"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        ></path>
                      </svg>
                    </div>
                    <div
                      data-pencil-name="Row 使用教程"
                      onClick={() => setSheet('guide')}
                      className="box-border w-full h-[56px] shrink-0 cursor-pointer flex flex-row gap-[12px] p-[0px_12px] justify-start items-center rounded-lg active:bg-[#F8FAFC]"
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[40px] shrink-0 h-[40px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                      >
                        <svg
                          data-pencil-name="Icon-book"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                        >
                          <path
                            d="M3 19a9 9 0 0 1 9 0 9 9 0 0 1 9 0m-18-13a9 9 0 0 1 9 0 9 9 0 0 1 9 0m-18 0v13m9-13v13m9-13v13"
                            fill="#00000000"
                          ></path>
                          <path
                            d="M3 19a9 9 0 0 1 9 0 9 9 0 0 1 9 0m-18-13a9 9 0 0 1 9 0 9 9 0 0 1 9 0m-18 0v13m9-13v13m9-13v13"
                            fill="none"
                            stroke="#0062FF"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          ></path>
                        </svg>
                      </div>
                      <div
                        data-pencil-name="Label"
                        className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                      >
                        使用教程
                      </div>
                      <div
                        className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"
                      ></div>
                      <svg
                        data-pencil-name="Icon-chevron-right"
                        viewBox="0 0 24 24"
                        preserveAspectRatio="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                      >
                        <path d="M9 18l6-6-6-6" fill="#00000000"></path>
                        <path
                          d="M9 18l6-6-6-6"
                          fill="none"
                          stroke="#4B5563"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        ></path>
                      </svg>
                    </div>
                    <div
                      data-pencil-name="Row 在线客服"
                      onClick={() => setSheet('service')}
                      className="box-border w-full h-[56px] shrink-0 cursor-pointer flex flex-row gap-[12px] p-[0px_12px] justify-start items-center rounded-lg active:bg-[#F8FAFC]"
                    >
                      <div
                        data-pencil-name="Icon Container"
                        className="box-border w-[40px] shrink-0 h-[40px] flex flex-row gap-0 justify-center items-center bg-[#0062FF0D] rounded-lg"
                      >
                        <svg
                          data-pencil-name="Icon-message-circle"
                          viewBox="0 0 24 24"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                        >
                          <path
                            d="M3 20l1.3-3.9c-2.324-3.437-1.426-7.872 2.1-10.374 3.526-2.501 8.59-2.296 11.845 0.48 3.255 2.777 3.695 7.266 1.029 10.501s-7.615 4.215-11.574 2.293z"
                            fill="#00000000"
                          ></path>
                          <path
                            d="M3 20l1.3-3.9c-2.324-3.437-1.426-7.872 2.1-10.374 3.526-2.501 8.59-2.296 11.845 0.48 3.255 2.777 3.695 7.266 1.029 10.501s-7.615 4.215-11.574 2.293z"
                            fill="none"
                            stroke="#0062FF"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                          ></path>
                        </svg>
                      </div>
                      <div
                        data-pencil-name="Label"
                        className="text-[14px]/[normal] box-border text-[#1A1A1A] font-body font-medium text-left [white-space:nowrap]"
                      >
                        在线客服
                      </div>
                      <div
                        className="box-border [flex:1_1_0] h-0 flex flex-row gap-0 justify-start items-start"
                      ></div>
                      <svg
                        data-pencil-name="Icon-chevron-right"
                        viewBox="0 0 24 24"
                        preserveAspectRatio="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="box-border w-[24px] shrink-0 h-[24px] overflow-visible"
                      >
                        <path d="M9 18l6-6-6-6" fill="#00000000"></path>
                        <path
                          d="M9 18l6-6-6-6"
                          fill="none"
                          stroke="#4B5563"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        ></path>
                      </svg>
                    </div>
                  </div>
                  <div
                    data-pencil-name="Feedback Card"
                    ref={formRef}
                    className="box-border w-full shrink-0 [box-shadow:0px_2px_8px_0px_#0000000D] flex flex-col gap-[10px] p-4 justify-start items-start bg-[#FFFFFF] rounded-lg"
                  >
                    <div
                      data-pencil-name="Card Title"
                      className="text-[16px]/[normal] box-border text-[#1A1A1A] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      意见反馈
                    </div>
                    <div
                      data-pencil-name="Input Box"
                      className="box-border w-full flex flex-col gap-[4px] p-[12px] justify-start items-start bg-[#FFFFFF] [border:1px_solid_#E5E7EB] rounded-lg focus-within:[border-color:#0062FF]"
                    >
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onFocus={keepSubmitVisible}
                        maxLength={MAX_CONTENT}
                        rows={4}
                        placeholder="请输入您的意见或建议（至少 5 个字）"
                        className="box-border w-full resize-none bg-transparent text-[14px]/[1.6] text-[#1A1A1A] placeholder:text-[#9CA3AF] outline-none"
                      />
                      <div className="self-end text-[11px] text-[#9CA3AF]">
                        {content.length}/{MAX_CONTENT}
                      </div>
                    </div>
                    <input
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      onFocus={keepSubmitVisible}
                      maxLength={100}
                      placeholder="联系方式（选填，手机号 / 微信）"
                      className="box-border w-full h-[44px] shrink-0 bg-transparent px-[12px] text-[14px] text-[#1A1A1A] placeholder:text-[#9CA3AF] outline-none [border:1px_solid_#E5E7EB] rounded-lg focus:[border-color:#0062FF]"
                    />
                  </div>
                  <button
                    type="button"
                    ref={submitRef}
                    disabled={!canSubmit}
                    onClick={handleSubmit}
                    className={`box-border w-full h-[52px] shrink-0 flex flex-col gap-0 justify-center items-center rounded-lg transition-opacity ${
                      canSubmit
                        ? 'cursor-pointer [box-shadow:0px_6px_20px_0px_#0062FF33] [background-image:linear-gradient(180deg,_#0062FF_0%,_#3B82F6_100%)] bg-no-repeat bg-[length:100%_100%] active:opacity-90'
                        : 'cursor-not-allowed bg-[#93C5FD]'
                    }`}
                  >
                    <span
                      data-pencil-name="Label"
                      className="text-[16px]/[normal] box-border text-[#FFFFFF] font-body font-semibold text-left [white-space:nowrap]"
                    >
                      {submitting ? '提交中...' : '提交反馈'}
                    </span>
                  </button>
                  <div
                    data-pencil-name="My Feedbacks"
                    className="box-border w-full shrink-0 flex flex-col gap-[10px] justify-start items-start"
                  >
                    <div className="text-[13px]/[normal] box-border text-[#4B5563] font-body font-semibold text-left">
                      我的反馈
                    </div>
                    {loading && (
                      <div className="w-full py-4 text-center text-[13px] text-[#9CA3AF]">
                        加载中...
                      </div>
                    )}
                    {!loading && loadError && (
                      <button
                        type="button"
                        onClick={() => void loadFeedbacks(1)}
                        className="w-full cursor-pointer rounded-lg bg-[#F8FAFC] py-4 text-center text-[13px] text-[#0062FF]"
                      >
                        加载失败，点击重试
                      </button>
                    )}
                    {!loading && !loadError && feedbacks.length === 0 && (
                      <div className="w-full py-4 text-center text-[13px] text-[#9CA3AF]">
                        暂无反馈记录
                      </div>
                    )}
                    {!loading &&
                      !loadError &&
                      feedbacks.map((item) => {
                        const meta = STATUS_META[item.status] ?? {
                          label: item.status,
                          className: 'bg-[#F3F4F6] text-[#4B5563]',
                        };
                        return (
                          <div
                            key={item.id}
                            className="box-border w-full flex flex-col gap-[6px] p-[12px_16px] justify-start items-start bg-[#FFFFFF] [box-shadow:0px_2px_8px_0px_#0000000D] rounded-lg"
                          >
                            <div className="box-border w-full flex flex-row gap-2 justify-between items-center">
                              <span
                                className={`rounded-[4px] px-2 py-[2px] text-[11px] font-medium ${meta.className}`}
                              >
                                {meta.label}
                              </span>
                              <span className="text-[11px] text-[#9CA3AF]">
                                {formatDate(item.createdAt)}
                              </span>
                            </div>
                            <div className="w-full whitespace-pre-wrap break-words text-[13px]/[1.6] text-[#1A1A1A]">
                              {item.content}
                            </div>
                            {item.contact && (
                              <div className="text-[11px] break-all text-[#9CA3AF]">
                                联系方式：{item.contact}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    {!loading && !loadError && hasMore && (
                      <button
                        type="button"
                        disabled={loadingMore}
                        onClick={() => void loadFeedbacks(page + 1)}
                        className="w-full cursor-pointer rounded-lg bg-[#F8FAFC] py-3 text-center text-[13px] text-[#0062FF] disabled:cursor-not-allowed disabled:text-[#9CA3AF]"
                      >
                        {loadingMore ? '加载中...' : '加载更多'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

      <BottomSheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        title={sheet ? SHEET_TITLES[sheet] : undefined}
        maxHeight="75vh"
        footer={
          sheet === 'service' ? (
            <button
              type="button"
              onClick={goToForm}
              className="h-[48px] w-full rounded-[14px] bg-[linear-gradient(180deg,#2E7DFF_0%,#0062FF_100%)] font-body text-[15px]/[normal] font-semibold text-white shadow-[0_10px_20px_rgba(0,98,255,0.24)] active:opacity-90"
            >
              去填写反馈
            </button>
          ) : undefined
        }
      >
        {sheet === 'faq' && (
          <div className="flex flex-col px-5 py-2">
            {FAQS.map((item) => (
              <div key={item.q} className="border-b border-[#F3F4F6] py-3 last:border-b-0">
                <div className="flex items-start gap-2 text-[14px] font-medium text-[#1A1A1A]">
                  <span className="text-[#0062FF]">问</span>
                  {item.q}
                </div>
                <div className="mt-2 text-[13px]/[1.6] text-[#4B5563]">{item.a}</div>
              </div>
            ))}
          </div>
        )}
        {sheet === 'guide' && (
          <div className="flex flex-col px-5 py-2">
            {GUIDES.map((item, index) => (
              <div key={item.title} className="flex gap-3 border-b border-[#F3F4F6] py-3 last:border-b-0">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0062FF] text-[11px] font-semibold text-white">
                  {index + 1}
                </span>
                <div>
                  <div className="text-[14px] font-medium text-[#1A1A1A]">{item.title}</div>
                  <div className="mt-1 text-[13px]/[1.6] text-[#4B5563]">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {sheet === 'service' && (
          <div className="flex flex-col px-5 py-4">
            <div className="text-[13px]/[1.6] text-[#4B5563]">
              客服电话暂未开通。请直接提交反馈并留下联系方式，我们会在 1 个工作日内回复你。
            </div>
            <div className="mt-3 rounded-lg bg-[#F8FAFC] px-4 py-3 text-[13px]/[1.6] text-[#6B7280]">
              服务时间：工作日 9:00-18:00
            </div>
          </div>
        )}
      </BottomSheet>
    </PhoneFrame>
  );
}