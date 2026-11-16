import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneFrame from '@/components/layout/PhoneFrame';
import UnifiedHeader from '@/components/layout/UnifiedHeader';
import { api, ApiResponse } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSpeech } from '@/hooks/useSpeech';
import { toast } from 'sonner';
import {
  ArrowUp,
  BellRing,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Copy,
  FileText,
  History,
  Loader2,
  MapPin,
  Megaphone,
  Mic,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
  Vote,
  X,
} from 'lucide-react';

/** AI 封面高度：比通用头部更紧凑 */
const AI_COVER_H = 144;

type Intent = 'homework' | 'activity' | 'notice' | 'vote' | 'attendance' | 'unknown';
type Stage = 'idle' | 'parsing' | 'awaiting' | 'draft' | 'duplicate' | 'publishing' | 'done';

interface AssistantDraft {
  title?: string;
  subject?: string;
  content?: string;
  deadline?: string;
  eventDate?: string;
  eventTime?: string;
  location?: string;
  category?: string;
  description?: string;
  capacity?: number;
  options?: string[];
}

interface DuplicateHomework {
  id: string;
  title: string;
  subject?: string;
  deadline: string;
  similarity: number;
}

interface ParseResult {
  intent: Intent;
  draft: AssistantDraft;
  missing: string[];
  question: string;
  options: string[];
  fields: string[];
  duplicate?: DuplicateHomework | null;
}

interface QueryCard {
  title: string;
  subtitle?: string;
  progress?: { done: number; total: number; percent: number };
  metrics?: { label: string; value: string }[];
  people?: { name: string; meta?: string }[];
  moreCount?: number;
  note?: string;
  action?: { label: string; route: string };
}

interface UrgePayload {
  homeworkId: string;
  homeworkTitle: string;
  count: number;
  message: string;
}

interface AskResult {
  recognized: boolean;
  answer: string;
  card?: QueryCard;
  urge?: UrgePayload;
  chips?: string[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  options?: string[];
  card?: QueryCard;
  urge?: UrgePayload;
  /** 已发送的催交人数，持久化避免返回页面后重复发送 */
  urgeSent?: number;
}

interface PublishedInfo {
  intent: Exclude<Intent, 'unknown'>;
  title: string;
}

interface AssistantRecord {
  id: string;
  intent: Exclude<Intent, 'unknown'>;
  status: string;
  title: string;
  summary?: string | null;
  draft?: AssistantDraft | null;
  createdAt: string;
}

/** 离开页面再回来时保留对话（同一 WebView 会话内有效） */
interface CachedChat {
  messages: ChatMessage[];
  stage: Stage;
  intent: Intent;
  draft: AssistantDraft;
  aiFields: string[];
  awaitingField: string | null;
  published: PublishedInfo | null;
  duplicate: DuplicateHomework | null;
  input: string;
}

const CHAT_CACHE_KEY = 'banwuxing:ai-assistant-chat';

function readChatCache(): CachedChat | null {
  try {
    const raw = sessionStorage.getItem(CHAT_CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedChat) : null;
  } catch {
    return null;
  }
}

/** 内存 + sessionStorage 双份，路由切换和 WebView 重载都能恢复 */
let chatCache: CachedChat | null = readChatCache();

function saveChatCache(next: CachedChat) {
  chatCache = next;
  try {
    sessionStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(next));
  } catch {
    // 存储不可用时仅保留内存缓存，不影响页面
  }
}

function clearChatCache() {
  chatCache = null;
  try {
    sessionStorage.removeItem(CHAT_CACHE_KEY);
  } catch {
    // ignore
  }
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 看起来像数据查询的输入，先走只读问答，未识别再退回发布解析 */
const QUERY_HINT =
  /(提交率|提交情况|谁|哪些|名单|多少|几个|情况|统计|进度|未交|没交|未提交|没提交|催交|催一下|催一催|提醒|报名人数|报名了|查一下|查看|看看|看下|说说|聊聊|请问|想问|签到|考勤|出勤|缺勤|请假|审批|班费|缴费|收支|余额|投票|待办|任务|周报|日报|总结|汇总|参与率|支出|收入|开销|怎么样|如何|咋样|作业清单|排行|动态|近况|新鲜事|最近|今天|本周|这周|吗|呢|什么|啥|有没有)/;

/** 明确的发布/修改指令不当作查询 */
const COMMAND_HINT = /(发布|创建|发起|组织|新增|修改|改成|群发|推送|(发|发送).{0,4}(通知|公告|消息))/;

const INTENT_META = {
  homework: { label: '作业', route: '/homework-list', color: '#0062FF', bg: '#EAF2FF', icon: FileText },
  activity: { label: '活动', route: '/activity-list', color: '#7C3AED', bg: '#F2EBFF', icon: CalendarDays },
  notice: { label: '通知', route: '/messages', color: '#EA580C', bg: '#FFF4E8', icon: Megaphone },
  vote: { label: '投票', route: '/vote-list', color: '#0E9F6E', bg: '#E9F9F1', icon: Vote },
  attendance: { label: '签到', route: '/attendance-list', color: '#DB2777', bg: '#FDEEF2', icon: MapPin },
} as const;

function intentLabel(intent: Intent): string {
  return intent === 'unknown' ? '草稿' : INTENT_META[intent].label;
}

function formatDeadline(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS[date.getDay()]} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatEventDate(dateStr?: string, timeStr?: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return '';
  const date = new Date(y, m - 1, d);
  const day = `${m}月${d}日 ${WEEKDAYS[date.getDay()]}`;
  return timeStr ? `${day} ${timeStr.slice(0, 5)}` : day;
}

const QUICK_ACTIONS = [
  {
    key: 'homework',
    label: '发布作业',
    hint: '一句话生成作业',
    icon: FileText,
    color: '#0062FF',
    bg: '#EAF2FF',
    sample: '发布数学作业，明天下午五点前交',
  },
  {
    key: 'activity',
    label: '发布活动',
    hint: '活动报名一键草拟',
    icon: CalendarDays,
    color: '#7C3AED',
    bg: '#F2EBFF',
    sample: '周五下午三点在报告厅开主题班会，30人',
  },
  {
    key: 'notice',
    label: '发布通知',
    hint: '一句话通知到全班',
    icon: Megaphone,
    color: '#EA580C',
    bg: '#FFF4E8',
    sample: '发个通知说明天带身份证',
  },
  {
    key: 'vote',
    label: '发起投票',
    hint: '选项截止一起生成',
    icon: Vote,
    color: '#0E9F6E',
    bg: '#E9F9F1',
    sample: '发起投票：春游去哪，选项公园、博物馆、周五截止',
  },
  {
    key: 'attendance',
    label: '发起签到',
    hint: '时间地点一键开签',
    icon: MapPin,
    color: '#DB2777',
    bg: '#FDEEF2',
    sample: '今天下午三点教室签到',
  },
  {
    key: 'task',
    label: '查看待办',
    hint: '班级任务不漏项',
    icon: ClipboardList,
    color: '#0E9F6E',
    bg: '#E9F9F1',
    route: '/task-board',
  },
  {
    key: 'homework-list',
    label: '作业进度',
    hint: '谁还没交一目了然',
    icon: CheckCircle2,
    color: '#F97316',
    bg: '#FFF3E8',
    route: '/homework-list',
  },
  {
    key: 'weekly-report',
    label: '班级周报',
    hint: '一周动态自动汇总',
    icon: Sparkles,
    color: '#4F46E5',
    bg: '#EEF0FF',
    sample: '班级周报',
  },
] as const;

export default function AIAssistant() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const classId = user?.classId;

  const [messages, setMessages] = useState<ChatMessage[]>(() => chatCache?.messages ?? []);
  const [stage, setStage] = useState<Stage>(() => chatCache?.stage ?? 'idle');
  const [intent, setIntent] = useState<Intent>(() => chatCache?.intent ?? 'unknown');
  const [draft, setDraft] = useState<AssistantDraft>(() => chatCache?.draft ?? {});
  const [aiFields, setAiFields] = useState<string[]>(() => chatCache?.aiFields ?? []);
  const [awaitingField, setAwaitingField] = useState<string | null>(() => chatCache?.awaitingField ?? null);
  const [published, setPublished] = useState<PublishedInfo | null>(() => chatCache?.published ?? null);
  const [duplicate, setDuplicate] = useState<DuplicateHomework | null>(() => chatCache?.duplicate ?? null);
  const [input, setInput] = useState(() => chatCache?.input ?? '');
  const [aiStatus, setAiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [cancelArmed, setCancelArmed] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyList, setHistoryList] = useState<AssistantRecord[]>([]);

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const startYRef = useRef(0);
  const cancelArmedRef = useRef(false);
  const recordingRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const busy = stage === 'parsing' || stage === 'publishing';

  const speech = useSpeech({
    onFinal: (text) => {
      closeRecording();
      const value = text.trim();
      if (!value) {
        toast.error('没有听到内容，请再说一次');
        return;
      }
      // 识别文本先落到输入框，确认或改掉错字后再发送
      setInput(value);
      window.setTimeout(() => inputRef.current?.focus(), 80);
    },
    onError: (message) => {
      closeRecording();
      toast.error(message);
    },
  });

  const scrollToBottom = useCallback(() => {
    window.setTimeout(() => {
      const el = chatRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, 60);
  }, []);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    // 空态时停在顶部，避免自动滚动把封面折叠掉
    if (messages.length === 0 && stage === 'idle') {
      el.scrollTo({ top: 0 });
      return;
    }
    scrollToBottom();
  }, [messages, stage, published, scrollToBottom]);

  // 路由切换会卸载页面、清空 state，这里持续快照对话，返回时从缓存恢复
  useEffect(() => {
    // 请求进行中不落盘该中间态，避免回来后卡在“解析中”
    const safeStage: Stage =
      stage === 'parsing' || stage === 'publishing'
        ? draft.title
          ? 'draft'
          : messages.length
            ? 'awaiting'
            : 'idle'
        : stage;
    saveChatCache({
      messages,
      stage: safeStage,
      intent,
      draft,
      aiFields,
      awaitingField,
      published,
      duplicate,
      input,
    });
  }, [messages, stage, intent, draft, aiFields, awaitingField, published, duplicate, input]);

  // 顶部“在线”取自后端真实探测结果：进入页面查一次，之后每分钟刷新
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await api.get<ApiResponse<{ status: 'online' | 'offline' }>>('/ai/assistant/status');
        if (alive) setAiStatus(res.data?.data?.status === 'online' ? 'online' : 'offline');
      } catch {
        if (alive) setAiStatus('offline');
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 60_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const closeRecording = useCallback(() => {
    recordingRef.current = false;
    setRecording(false);
    setCancelArmed(false);
    cancelArmedRef.current = false;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pushMessage = useCallback((message: Omit<ChatMessage, 'id'>) => {
    setMessages((prev) => [...prev, { ...message, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }]);
  }, []);

  const markUrgeSent = useCallback((messageId: string, sent: number) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, urgeSent: sent } : m)));
  }, []);

  const reset = useCallback(() => {
    if (speech.listening) void speech.cancel();
    clearChatCache();
    closeRecording();
    setMessages([]);
    setStage('idle');
    setIntent('unknown');
    setDraft({});
    setAiFields([]);
    setAwaitingField(null);
    setPublished(null);
    setDuplicate(null);
    setInput('');
  }, [closeRecording, speech]);

  const submit = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      if (stage === 'parsing' || stage === 'publishing') return;

      setInput('');
      pushMessage({ role: 'user', text });
      setStage('parsing');

      const compact = text.replace(/\s+/g, '');
      // 「催交刚刚发布的数学作业」也带“发布”二字，催交意图要优先走问答
      const urgeIntent = /(催交|催一下|催一催|催作业|催办)/.test(compact);
      // 带时间地点的“签到”（如“今天下午三点教室签到”）是发起签到，不是查询
      const publishLike =
        /(签到|打卡)/.test(compact) &&
        !/(谁|哪些|名单|情况|统计|没|未|多少|几个|缺勤|出勤|记录|参与)/.test(compact) &&
        /(今天|明天|后天|周|星期|上午|下午|晚上|\d{1,2}\s*[点:：])/.test(compact);
      const tryAsk =
        Boolean(classId) && !publishLike && QUERY_HINT.test(compact) && (!COMMAND_HINT.test(compact) || urgeIntent);

      try {
        if (tryAsk && classId) {
          const askRes = await api.post<ApiResponse<AskResult>>('/ai/assistant/ask', {
            text,
            classId,
          });
          const asked = askRes.data?.data;
          if (asked?.recognized) {
            pushMessage({
              role: 'assistant',
              text: asked.answer,
              options: asked.chips,
              card: asked.card,
              urge: asked.urge,
            });
            setAwaitingField(null);
            // 已发布的草稿不再作为“待发布”弹出来，避免和催交/查询组件同时出现
            setStage(draft.title?.trim() && !published ? 'draft' : 'awaiting');
            return;
          }
          // 查询类输入但白名单没命中：给出能力提示，避免误落到“发布作业还是活动”
          if (!COMMAND_HINT.test(compact) && !urgeIntent) {
            pushMessage({
              role: 'assistant',
              text: '这个问题我暂时还答不上来。你可以问我：签到出勤、班费收支、投票参与、待办任务、作业提交情况，也可以直接说「班级周报」。',
              options: ['班级周报', '签到情况', '班费余额', '我的待办'],
            });
            setAwaitingField(null);
            setStage(draft.title?.trim() && !published ? 'draft' : 'awaiting');
            return;
          }
        }

        const res = await api.post<ApiResponse<ParseResult>>('/ai/assistant/parse', {
          text,
          draft,
          awaiting: awaitingField || undefined,
          intent: intent !== 'unknown' ? intent : undefined,
          classId,
        });
        const data = res.data?.data;
        if (!data) throw new Error('解析失败');

        setIntent(data.intent);
        setDraft(data.draft || {});
        setAiFields(data.fields || []);
        setAwaitingField(data.missing?.[0] || null);
        setPublished(null);

        // 命中已发布的相似作业：先停在重复提示，不直接出发布按钮
        if (data.intent === 'homework' && data.duplicate) {
          setDuplicate(data.duplicate);
          pushMessage({
            role: 'assistant',
            text: `这条指令和已发布的「${data.duplicate.title}」高度相似，我先帮你拦一下，避免重复发布。`,
          });
          setStage('duplicate');
          return;
        }
        setDuplicate(null);

        pushMessage({
          role: 'assistant',
          text: data.question || (data.missing?.length ? '还需要补充一点信息。' : '信息齐了，确认草稿后就可以发布。'),
          options: data.missing?.length ? data.options : undefined,
        });

        if (data.intent === 'unknown' || data.missing?.length) {
          setStage('awaiting');
        } else {
          setStage('draft');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '解析失败，请重试';
        toast.error(message);
        pushMessage({ role: 'assistant', text: '刚刚网络有点问题，再说一次试试？' });
        // 已发布成功的结果不能被后续失败清掉
        setStage(published ? 'done' : draft.title?.trim() ? 'draft' : 'idle');
      }
    },
    [awaitingField, classId, draft, intent, published, pushMessage, stage],
  );

  const startRecording = useCallback(async () => {
    if (busy || speech.recognizing) return;
    if (!speech.supported) {
      toast.error('当前设备无法录音，请使用文字输入');
      return;
    }
    startedAtRef.current = Date.now();
    recordingRef.current = true;
    stopRequestedRef.current = false;
    setRecording(true);
    setRecSeconds(0);
    setCancelArmed(false);
    cancelArmedRef.current = false;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setRecSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 200);
    await speech.start();
    if (stopRequestedRef.current) {
      await speech.stop();
    }
  }, [busy, speech]);

  const finishRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    stopRequestedRef.current = true;
    const shouldCancel = cancelArmedRef.current;
    if (shouldCancel) {
      closeRecording();
      await speech.cancel();
      return;
    }
    // 停止录音后保留浮窗，等云端识别结果回来再由 onFinal/onError 关闭
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    await speech.stop();
  }, [closeRecording, speech]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    startYRef.current = event.clientY;
    void startRecording();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!recording) return;
    const armed = startYRef.current - event.clientY > 56;
    if (armed !== cancelArmedRef.current) {
      cancelArmedRef.current = armed;
      setCancelArmed(armed);
    }
  };

  const handlePointerUp = () => {
    void finishRecording();
  };

  const handlePointerCancel = () => {
    if (!recordingRef.current) return;
    void speech.cancel();
    closeRecording();
  };

  const saveHistory = useCallback(
    async (recordIntent: Exclude<Intent, 'unknown'>, summary?: string) => {
      if (!classId || !draft.title?.trim()) return;
      try {
        await api.post('/ai/assistant/records', {
          classId,
          intent: recordIntent,
          title: draft.title.trim(),
          summary,
          draft,
        });
      } catch {
        // 历史记录保存失败不影响发布结果
      }
    },
    [classId, draft],
  );

  const openHistory = useCallback(async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await api.get<ApiResponse<AssistantRecord[]>>('/ai/assistant/records', {
        params: { limit: 30 },
      });
      setHistoryList(res.data?.data || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '历史记录加载失败');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const applyRecord = useCallback(
    (record: AssistantRecord) => {
      closeRecording();
      setIntent(record.intent);
      setDraft(record.draft || {});
      setAiFields([]);
      setAwaitingField(null);
      setPublished(null);
      setMessages([]);
      setStage('draft');
      setHistoryOpen(false);
      pushMessage({
        role: 'assistant',
        text: `已载入历史草稿「${record.title}」，确认信息无误后可以重新发布。`,
      });
    },
    [closeRecording, pushMessage],
  );

  const publish = async () => {
    if (stage !== 'draft') return;
    if (!draft.title?.trim()) {
      toast.error('标题还不能为空，补充一下');
      return;
    }
    if (!classId) {
      toast.error('未找到班级信息');
      return;
    }

    if (intent === 'homework') {
      const canPublish = Boolean(
        user?.isCommittee || user?.roleLevel === 'owner' || user?.roleLevel === 'admin',
      );
      if (!canPublish) {
        toast.error('仅班委可发布作业');
        return;
      }
      if (!draft.deadline) {
        toast.error('还缺截止时间，补充一下');
        return;
      }
      const deadlineTs = new Date(draft.deadline).getTime();
      if (!Number.isFinite(deadlineTs)) {
        toast.error('截止时间格式不正确，请重新说一次');
        return;
      }
      if (deadlineTs <= Date.now()) {
        toast.error('截止时间需要晚于当前时间');
        return;
      }

      setStage('publishing');
      try {
        await api.post(`/classes/${classId}/homeworks`, {
          title: draft.title.trim(),
          subject: (draft.subject || '作业').trim(),
          deadline: draft.deadline,
          content: (draft.content || '').trim(),
        });
        setPublished({ intent: 'homework', title: draft.title });
        setStage('done');
        toast.success('作业发布成功');
        void saveHistory('homework', draft.deadline ? `截止 ${formatDeadline(draft.deadline)}` : undefined);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '发布失败，请重试');
        setStage('draft');
      }
      return;
    }

    if (intent === 'activity') {
      if (user?.roleLevel !== 'owner' && user?.roleLevel !== 'admin') {
        toast.error('仅班委可发布活动');
        return;
      }
      if (!draft.eventDate || !draft.location) {
        toast.error('活动日期和地点还不能为空');
        return;
      }

      setStage('publishing');
      try {
        await api.post(`/classes/${classId}/activities`, {
          title: draft.title.trim(),
          category: draft.category || undefined,
          eventDate: draft.eventDate,
          eventTime: draft.eventTime || undefined,
          location: draft.location.trim(),
          description: (draft.description || '').trim() || undefined,
          capacity: draft.capacity || undefined,
        });
        setPublished({ intent: 'activity', title: draft.title });
        setStage('done');
        toast.success('活动发布成功');
        void saveHistory(
          'activity',
          [formatEventDate(draft.eventDate, draft.eventTime), draft.location].filter(Boolean).join(' · '),
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '发布失败，请重试');
        setStage('draft');
      }
      return;
    }

    if (intent === 'notice') {
      if (user?.roleLevel !== 'owner' && user?.roleLevel !== 'admin') {
        toast.error('仅班委可发布通知');
        return;
      }
      if (!draft.content) {
        toast.error('还缺通知内容，补充一下');
        return;
      }

      setStage('publishing');
      try {
        await api.post(`/classes/${classId}/messages`, {
          type: 'notice',
          title: draft.title.trim(),
          content: draft.content.trim(),
        });
        setPublished({ intent: 'notice', title: draft.title });
        setStage('done');
        toast.success('通知发布成功');
        void saveHistory('notice', draft.content.trim().slice(0, 40));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '发布失败，请重试');
        setStage('draft');
      }
      return;
    }

    if (intent === 'vote') {
      if (user?.roleLevel !== 'owner' && user?.roleLevel !== 'admin') {
        toast.error('仅班委可发起投票');
        return;
      }
      if (!draft.options || draft.options.length < 2) {
        toast.error('投票至少需要两个选项');
        return;
      }
      const optionLabels = draft.options.map((option) => option.trim());
      if (optionLabels.some((label) => !label)) {
        toast.error('投票选项不能为空');
        return;
      }
      if (new Set(optionLabels).size !== optionLabels.length) {
        toast.error('投票选项不能重复');
        return;
      }
      if (!draft.deadline) {
        toast.error('还缺截止时间，补充一下');
        return;
      }
      const voteDeadline = new Date(draft.deadline).getTime();
      if (!Number.isFinite(voteDeadline)) {
        toast.error('截止时间格式不正确，请重新说一次');
        return;
      }
      if (voteDeadline <= Date.now()) {
        toast.error('投票截止时间需要晚于当前时间');
        return;
      }

      setStage('publishing');
      try {
        await api.post(`/classes/${classId}/votes`, {
          title: draft.title.trim(),
          voteType: 'single',
          deadline: draft.deadline,
          options: optionLabels,
        });
        setPublished({ intent: 'vote', title: draft.title });
        setStage('done');
        toast.success('投票发布成功');
        void saveHistory('vote', `${draft.options.length} 个选项 · 截止 ${formatDeadline(draft.deadline)}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '发布失败，请重试');
        setStage('draft');
      }
      return;
    }

    if (intent === 'attendance') {
      if (user?.roleLevel !== 'owner' && user?.roleLevel !== 'admin') {
        toast.error('仅班委可发起签到');
        return;
      }
      if (!draft.eventDate || !draft.eventTime) {
        toast.error('签到开始时间还不能为空');
        return;
      }
      const start = new Date(`${draft.eventDate}T${draft.eventTime}+08:00`);
      if (Number.isNaN(start.getTime())) {
        toast.error('签到时间格式不正确');
        return;
      }
      if (start.getTime() + 2 * 60 * 60 * 1000 <= Date.now()) {
        toast.error('签到时间已过，请换一个时间');
        return;
      }

      setStage('publishing');
      try {
        await api.post(`/classes/${classId}/attendances`, {
          title: draft.title.trim(),
          startTime: start.toISOString(),
          endTime: new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          method: 'normal',
          location: draft.location?.trim() || undefined,
        });
        setPublished({ intent: 'attendance', title: draft.title });
        setStage('done');
        toast.success('签到发布成功');
        void saveHistory(
          'attendance',
          [formatEventDate(draft.eventDate, draft.eventTime), draft.location].filter(Boolean).join(' · '),
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '发布失败，请重试');
        setStage('draft');
      }
    }
  };

  const startModify = () => {
    setStage('awaiting');
    setAwaitingField(null);
    pushMessage({
      role: 'assistant',
      text: '想改哪一项？直接告诉我，比如「标题改成数学练习」「截止时间改到明天晚上八点」。',
      options: ['修改标题', '修改时间', '修改地点'],
    });
    window.setTimeout(() => inputRef.current?.focus(), 120);
  };

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast.error('当前设备不支持语音播报');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const sendText = () => {
    if (!input.trim() || busy) return;
    void submit(input);
  };

  const canPublish = useMemo(() => {
    if (!user) return false;
    return user.roleLevel === 'owner' || user.roleLevel === 'admin';
  }, [user]);

  const empty = messages.length === 0 && stage === 'idle';
  // 已发布的草稿不再重复展示成“待发布”组件，避免和催交/查询结果同屏
  const showDraft =
    (stage === 'draft' || stage === 'publishing') && !published && Boolean(draft.title?.trim());
  const showSuccess = stage === 'done' && published;
  const showDuplicate = stage === 'duplicate' && Boolean(duplicate);
  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant') return messages[i].id;
    }
    return '';
  }, [messages]);

  return (
    <PhoneFrame className="bg-[#F3F7FE]">
      <div className="absolute inset-0 flex flex-col overflow-hidden bg-[#F3F7FE] pb-[calc(env(safe-area-inset-bottom)+66px)]">
        <style>{`
          @keyframes ai-orb-breathe { 0%,100% { transform: scale(.92); opacity:.55 } 50% { transform: scale(1.08); opacity:.9 } }
          @keyframes ai-orb-spin { to { transform: rotate(360deg) } }
          @keyframes ai-orb-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
          @keyframes ai-wave { 0%,100% { transform: scaleY(.28) } 50% { transform: scaleY(1) } }
          @keyframes ai-dot { 0%,80%,100% { opacity:.25; transform: translateY(0) } 40% { opacity:1; transform: translateY(-3px) } }
          @keyframes ai-pulse { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,.35) } 100% { box-shadow: 0 0 0 18px rgba(239,68,68,0) } }
          .ai-orb-breathe { animation: ai-orb-breathe 4.6s ease-in-out infinite }
          .ai-orb-float { animation: ai-orb-float 5.2s ease-in-out infinite }
          .ai-orb-ring { animation: ai-orb-spin 9s linear infinite }
          .ai-orb-ring-slow { animation: ai-orb-spin 16s linear infinite reverse }
          .ai-wave-bar { animation: ai-wave 1.1s ease-in-out infinite }
          .ai-dot { animation: ai-dot 1.2s ease-in-out infinite }
          .ai-mic-live { animation: ai-pulse 1.6s ease-out infinite }
          .ai-scrollbar::-webkit-scrollbar { width: 0 }
        `}</style>

        {/* 背景光斑 */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-[86px] -top-[72px] h-[240px] w-[240px] rounded-full bg-[#B7D4FF]/60 blur-[52px]" />
          <div className="absolute -right-[92px] top-[90px] h-[210px] w-[210px] rounded-full bg-[#D8E6FF]/70 blur-[56px]" />
          <div className="absolute bottom-[18%] left-[-70px] h-[190px] w-[190px] rounded-full bg-[#C9E6FF]/50 blur-[56px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.9),rgba(243,247,254,0.2)_46%,rgba(243,247,254,0.95))]" />
        </div>

        {/* 对话区：顶部蓝封面随聊天滚动折叠，与其它页面一致 */}
        <div ref={chatRef} className="ai-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto">
          <UnifiedHeader
            title="班级助手"
            variant="ai"
            coverHeight={AI_COVER_H}
            showBack={false}
            scrollerRef={chatRef}
            aiStatus={aiStatus}
            chips={[
              {
                label: '发布作业',
                onClick: () => {
                  setInput(QUICK_ACTIONS[0].sample);
                  window.setTimeout(() => inputRef.current?.focus(), 80);
                },
              },
              {
                label: '发布活动',
                onClick: () => {
                  setInput(QUICK_ACTIONS[1].sample);
                  window.setTimeout(() => inputRef.current?.focus(), 80);
                },
              },
              { label: '催交作业', onClick: () => void submit('催一下没交作业的同学') },
            ]}
            right={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="发布历史"
                  onClick={() => void openHistory()}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur active:scale-95"
                >
                  <History className="h-[16px] w-[16px]" />
                </button>
                <button
                  type="button"
                  aria-label="重新开始"
                  onClick={reset}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur active:scale-95"
                >
                  <RotateCcw className="h-[16px] w-[16px]" />
                </button>
              </div>
            }
          />

          {empty ? (
            <div className="relative z-10 flex min-h-[calc(100%_-_144px)] flex-col px-4 pb-4 pt-3">
              <div className="my-auto flex w-full flex-col items-center">
                <div className="ai-orb-float relative flex h-[88px] w-[88px] items-center justify-center">
                  <span className="ai-orb-breathe absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgba(90,166,255,0.32)_0%,rgba(90,166,255,0)_68%)]" />
                  <span className="ai-orb-ring absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,rgba(90,166,255,0)_0deg,rgba(90,166,255,.9)_60deg,rgba(11,102,255,0)_150deg,rgba(90,166,255,.55)_250deg,rgba(11,102,255,0)_330deg)] [mask:radial-gradient(farthest-side,transparent_calc(100%-2px),#000_calc(100%-1.5px))]" />
                  <span className="ai-orb-ring-slow absolute inset-[8px] rounded-full opacity-60 bg-[conic-gradient(from_180deg,rgba(0,212,255,0)_0deg,rgba(0,212,255,.8)_90deg,rgba(0,212,255,0)_190deg,rgba(0,212,255,.45)_280deg,rgba(0,212,255,0)_360deg)] [mask:radial-gradient(farthest-side,transparent_calc(100%-1.5px),#000_calc(100%-1px))]" />
                  <div className="relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-[#6FB6FF] via-[#0B66FF] to-[#0041B8] shadow-[0_18px_36px_-16px_rgba(0,84,220,0.85),inset_0_2px_6px_rgba(255,255,255,0.45)]">
                    <Mic className="h-7 w-7 text-white" strokeWidth={1.7} />
                  </div>
                </div>

                <h2 className="mt-4 text-center text-[19px] font-semibold leading-snug tracking-tight text-[#0F1F3A]">
                  说一句，就发布
                </h2>
                <p className="mt-1.5 max-w-[248px] text-center text-[12px] leading-relaxed text-[#71839E]">
                  发布作业、组织活动，或直接问提交率、谁还没交、帮我催交作业。
                </p>

                <div className="mt-4 w-full rounded-[22px] border border-white bg-white/70 p-3 shadow-[0_20px_44px_-34px_rgba(10,40,90,0.55)] backdrop-blur-md">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-[12px] font-medium text-[#5A7093]">快捷入口</span>
                    <span className="text-[10.5px] text-[#A3B2C7]">点一下填入指令</span>
                  </div>
                  <div className="grid grid-cols-4 gap-x-1 gap-y-2">
                    {QUICK_ACTIONS.map((action) => {
                      const Icon = action.icon;
                      const content = (
                        <>
                          <span
                            className="flex h-11 w-11 items-center justify-center rounded-[15px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65)]"
                            style={{ backgroundColor: action.bg }}
                          >
                            <Icon className="h-[19px] w-[19px]" style={{ color: action.color }} strokeWidth={1.9} />
                          </span>
                          <span className="mt-1.5 text-[11.5px] font-medium leading-none text-[#33475F]">
                            {action.label}
                          </span>
                        </>
                      );
                      const className =
                        'flex w-full flex-col items-center rounded-[16px] py-2 transition active:scale-[0.94] active:bg-[#F2F7FF]';
                      if ('route' in action) {
                        return (
                          <button key={action.key} type="button" className={className} onClick={() => navigate(action.route)}>
                            {content}
                          </button>
                        );
                      }
                      return (
                        <button
                          key={action.key}
                          type="button"
                          className={className}
                          onClick={() => {
                            setInput(action.sample);
                            window.setTimeout(() => inputRef.current?.focus(), 80);
                          }}
                        >
                          {content}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative z-10 flex flex-col gap-[18px] px-4 pb-5 pt-6">
              {messages.map((message) =>
                message.role === 'user' ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[82%] rounded-[18px] rounded-br-[6px] bg-gradient-to-br from-[#0B6BFF] to-[#0050D8] px-3.5 py-3 text-[13.5px] leading-relaxed text-white shadow-[0_10px_22px_-14px_rgba(0,80,220,0.9)]">
                      {message.text}
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6FB6FF] to-[#0B66FF] shadow-[0_6px_14px_-8px_rgba(0,80,220,0.9)]">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </span>
                    <div className="max-w-[84%]">
                      <div className="group relative rounded-[18px] rounded-tl-[6px] border border-white/90 bg-white/90 px-3.5 py-3 text-[13.5px] leading-relaxed text-[#1B2A44] shadow-[0_10px_24px_-20px_rgba(10,40,90,0.65)] backdrop-blur">
                        {message.text}
                        <button
                          type="button"
                          aria-label="朗读"
                          onClick={() => speak(message.text)}
                          className="absolute -right-1 -top-3 flex h-7 w-7 items-center justify-center rounded-full border border-[#E4EDFF] bg-white text-[#7C93B5] opacity-70 shadow-sm transition hover:opacity-100 active:scale-95"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {message.card ? <QueryCardView card={message.card} onOpen={(route) => navigate(route)} /> : null}
                      {message.urge ? (
                        <UrgeCardView
                          urge={message.urge}
                          classId={classId}
                          sentCount={message.urgeSent}
                          onSent={(sent) => markUrgeSent(message.id, sent)}
                        />
                      ) : null}
                      {message.options?.length && message.id === lastAssistantId && (stage === 'awaiting' || Boolean(message.card)) ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {message.options.map((option) => (
                            <button
                              key={option}
                              type="button"
                              disabled={busy}
                              onClick={() => void submit(option)}
                              className="rounded-full border border-[#CFE1FF] bg-[#F4F9FF] px-3 py-1.5 text-[12px] font-medium text-[#0B62E8] transition active:scale-95 disabled:opacity-50"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ),
              )}

              {stage === 'parsing' ? (
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6FB6FF] to-[#0B66FF]">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </span>
                  <div className="flex items-center gap-1.5 rounded-[18px] rounded-tl-[6px] border border-white/90 bg-white/90 px-4 py-3.5 shadow-sm">
                    <span className="ai-dot h-1.5 w-1.5 rounded-full bg-[#0B66FF]" />
                    <span className="ai-dot h-1.5 w-1.5 rounded-full bg-[#0B66FF]" style={{ animationDelay: '0.15s' }} />
                    <span className="ai-dot h-1.5 w-1.5 rounded-full bg-[#0B66FF]" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              ) : null}

              {showDuplicate && duplicate ? (
                <div className="relative overflow-hidden rounded-[20px] border border-white bg-white/95 p-4 shadow-[0_18px_40px_-24px_rgba(10,50,120,0.55)]">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#F59E0B] via-[#FB923C] to-[#EA580C]" />
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFF3E8]">
                      <BellRing className="h-5 w-5 text-[#EA580C]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-[#10203A]">这条作业可能已经发布过</p>
                      <p className="mt-0.5 truncate text-[12.5px] text-[#71839E]">
                        {duplicate.title} · {formatDeadline(duplicate.deadline) || '未设置截止'}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#FFF3E8] px-2 py-1 text-[11px] font-medium text-[#EA580C]">
                      相似 {duplicate.similarity}%
                    </span>
                  </div>
                  <p className="mt-3 rounded-[14px] bg-[#FFFAF3] px-3 py-2.5 text-[12.5px] leading-relaxed text-[#8A5A22]">
                    已有同名作业在相近时间截止，建议先查看已有作业；如果只是调整时间或内容，直接在原作业上处理，避免重复创建。
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/homework-detail/${duplicate.id}`)}
                      className="flex-1 rounded-[14px] bg-[#EA580C] py-2.5 text-[13px] font-semibold text-white transition active:scale-[0.98]"
                    >
                      查看已有作业
                    </button>
                    <button
                      type="button"
                      onClick={() => setStage('draft')}
                      className="flex-1 rounded-[14px] border border-[#E6EBF2] bg-white py-2.5 text-[13px] font-semibold text-[#41536B] transition active:scale-[0.98]"
                    >
                      仍然发布
                    </button>
                  </div>
                </div>
              ) : null}

              {showSuccess && published ? (
                <div className="relative overflow-hidden rounded-[20px] border border-white bg-white/95 p-4 shadow-[0_18px_40px_-24px_rgba(10,50,120,0.55)]">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#22C55E] via-[#5AA6FF] to-[#0062FF]" />
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E9FBF1]">
                      <Check className="h-5 w-5 text-[#16A34A]" strokeWidth={2.6} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-[#10203A]">发布成功</p>
                      <p className="mt-0.5 truncate text-[12.5px] text-[#71839E]">
                        {INTENT_META[published.intent].label}「{published.title}」已发出
                      </p>
                    </div>
                  </div>
                  {/* 发布后仍保留草稿信息，方便核对到底发了什么 */}
                  <div className="mt-3 space-y-2 rounded-[14px] bg-[#F7FAFF] px-3 py-2.5">
                    <DraftSummary intent={published.intent} draft={draft} emptyText="未设置" />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(INTENT_META[published.intent].route)}
                      className="flex h-10 flex-1 items-center justify-center gap-1 rounded-[12px] bg-[#0062FF] text-[13px] font-medium text-white shadow-[0_10px_20px_-12px_rgba(0,98,255,0.9)] active:scale-[0.98]"
                    >
                      查看{INTENT_META[published.intent].label}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      className="flex h-10 flex-1 items-center justify-center rounded-[12px] border border-[#DDE7F5] bg-[#F7FAFF] text-[13px] font-medium text-[#3B5273] active:scale-[0.98]"
                    >
                      再发一条
                    </button>
                  </div>
                </div>
              ) : null}

              {showDraft ? (
                <div className="relative overflow-hidden rounded-[20px] border border-white bg-white/95 p-4 shadow-[0_18px_40px_-24px_rgba(10,50,120,0.55)]">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0062FF] via-[#5AA6FF] to-[#00D4FF]" />
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                        style={{
                          backgroundColor: intent === 'unknown' ? '#F1F5FB' : INTENT_META[intent].bg,
                          color: intent === 'unknown' ? '#5B7BA6' : INTENT_META[intent].color,
                        }}
                      >
                        {intentLabel(intent)}
                      </span>
                      <h3 className="truncate text-[15px] font-semibold text-[#10203A]">{draft.title}</h3>
                    </div>
                    <span className="shrink-0 rounded-full border border-[#D9E8FF] bg-[#F6FAFF] px-2 py-0.5 text-[10px] font-medium text-[#5B7BA6]">
                      AI 草稿
                    </span>
                  </div>

                  <div className="mt-3 space-y-2.5">
                    <DraftSummary intent={intent} draft={draft} aiFields={aiFields} emptyText="待补充" />
                  </div>

                  {!canPublish ? (
                    <p className="mt-3 rounded-[10px] bg-[#FFF7ED] px-3 py-2 text-[11.5px] text-[#B45309]">
                      当前身份仅可查看草稿，发布需要班委权限。
                    </p>
                  ) : null}

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={startModify}
                      disabled={stage === 'publishing'}
                      className="h-10 flex-1 rounded-[12px] border border-[#DDE7F5] bg-[#F7FAFF] text-[13px] font-medium text-[#3B5273] active:scale-[0.98] disabled:opacity-50"
                    >
                      再改改
                    </button>
                    <button
                      type="button"
                      onClick={() => void publish()}
                      disabled={stage === 'publishing' || !canPublish}
                      className="flex h-10 flex-[1.4] items-center justify-center gap-1.5 rounded-[12px] bg-gradient-to-r from-[#0B6BFF] to-[#0050D8] text-[13px] font-medium text-white shadow-[0_12px_24px_-14px_rgba(0,98,255,0.95)] active:scale-[0.98] disabled:opacity-60"
                    >
                      {stage === 'publishing' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          发布中…
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          确认发布
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* 输入条 */}
        <div className="relative z-20 shrink-0 px-3 pb-2 pt-1">
          {empty || !speech.supported ? (
            <p className={`mb-1.5 text-center text-[10.5px] ${speech.supported ? 'text-[#8A9AB3]' : 'text-[#B45309]'}`}>
              {speech.supported ? '按住麦克风说话，松手转成文字 · 上滑取消' : '当前环境不支持语音识别，可直接输入文字'}
            </p>
          ) : null}
          <div className="rounded-[22px] border border-white/80 bg-white/85 p-2 shadow-[0_16px_36px_-22px_rgba(0,50,140,0.6)] backdrop-blur-xl">
            <div className="flex items-end gap-2">
              <button
                type="button"
                aria-label="按住说话"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onContextMenu={(event) => event.preventDefault()}
                className={`flex h-10 w-10 shrink-0 touch-none select-none items-center justify-center rounded-full text-white transition active:scale-95 ${
                  recording
                    ? 'ai-mic-live bg-gradient-to-br from-[#FF7A7A] to-[#E23B3B]'
                    : 'bg-gradient-to-br from-[#5AA6FF] to-[#0052DC] shadow-[0_10px_20px_-12px_rgba(0,90,230,0.9)]'
                } ${busy ? 'opacity-50' : ''}`}
              >
                <Mic className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                maxLength={500}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    sendText();
                  }
                }}
                placeholder={stage === 'awaiting' ? '回答上面的问题，或直接补充…' : '描述要发布的内容…'}
                className="max-h-[88px] min-h-[40px] flex-1 resize-none bg-transparent px-1 py-2.5 text-[13.5px] leading-[20px] text-[#16243D] outline-none placeholder:text-[#9AAAC2]"
              />
              <button
                type="button"
                aria-label="发送"
                onClick={sendText}
                disabled={!input.trim() || busy}
                className={`mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-95 ${
                  input.trim() && !busy
                    ? 'bg-[#0062FF] text-white shadow-[0_8px_18px_-10px_rgba(0,98,255,0.95)]'
                    : 'bg-[#EDF2F9] text-[#B3C0D2]'
                }`}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.2} />}
              </button>
            </div>
          </div>

          {/* 轻量录音浮窗：挂在输入条上方，避免与输入框/红色录音键重叠 */}
          {recording ? (
            <div className="absolute inset-x-0 bottom-[calc(100%_+_6px)] z-30">
              <div
                className={`flex items-center gap-3 rounded-[18px] border px-3.5 py-3 shadow-[0_20px_40px_-20px_rgba(10,40,90,0.55)] backdrop-blur-xl transition ${
                  cancelArmed ? 'border-[#FFD1D1] bg-[#FFF5F5]/95' : 'border-white/80 bg-white/95'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    cancelArmed ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#EAF2FF] text-[#0062FF]'
                  }`}
                >
                  {cancelArmed ? (
                    <X className="h-[18px] w-[18px]" />
                  ) : speech.recognizing ? (
                    <Loader2 className="h-[18px] w-[18px] animate-spin" />
                  ) : (
                    <Mic className="h-[18px] w-[18px]" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-[12.5px] font-medium ${cancelArmed ? 'text-[#DC2626]' : 'text-[#16243D]'}`}>
                      {cancelArmed ? '松开取消' : speech.recognizing ? '正在识别…' : '正在聆听…'}
                    </span>
                    <span className="font-data text-[11px] tabular-nums text-[#8A9AB3]">
                      {String(Math.floor(recSeconds / 60)).padStart(2, '0')}:{String(recSeconds % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <p className={`mt-0.5 truncate text-[11.5px] ${cancelArmed ? 'text-[#F87171]' : 'text-[#71839E]'}`}>
                    {cancelArmed ? '上滑已取消，松开手指' : speech.recognizing ? '正在把语音转成文字' : '松手后自动识别，上滑取消'}
                  </p>
                </div>
                {!cancelArmed && !speech.recognizing ? (
                  <div className="flex h-7 items-end gap-[3px]">
                    {[0, 1, 2, 3, 4].map((index) => (
                      <span
                        key={index}
                        className="ai-wave-bar w-[3px] rounded-full bg-[#5AA6FF]"
                        style={{ height: `${[12, 20, 26, 18, 10][index]}px`, animationDelay: `${index * 0.12}s` }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {/* 发布历史抽屉 */}
        {historyOpen ? (
          <div
            className="absolute inset-0 z-40 flex flex-col justify-end bg-[#0B1B33]/30 backdrop-blur-[2px]"
            onClick={() => setHistoryOpen(false)}
          >
            <div
              className="flex max-h-[72%] min-h-[42%] flex-col rounded-t-[26px] border-t border-white/80 bg-white/95 pb-4 shadow-[0_-24px_60px_-30px_rgba(6,30,80,0.6)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between px-5 pb-2 pt-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-[#0F1F3A]">发布历史</h2>
                  <p className="mt-0.5 text-[11px] text-[#8A9AB3]">最近 30 条由 AI 助手确认发布的内容</p>
                </div>
                <button
                  type="button"
                  aria-label="关闭"
                  onClick={() => setHistoryOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F5FB] text-[#5A6B85] active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="ai-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-1">
                {historyLoading ? (
                  <div className="flex h-32 items-center justify-center gap-2 text-[12.5px] text-[#8A9AB3]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    加载中…
                  </div>
                ) : historyList.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center text-center">
                    <History className="h-7 w-7 text-[#C3D0E2]" />
                    <p className="mt-3 text-[13px] text-[#71839E]">还没有发布记录</p>
                    <p className="mt-1 text-[11.5px] text-[#A0AEC0]">发布成功后会自动保存在这里</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {historyList.map((record) => {
                      const meta = INTENT_META[record.intent];
                      const Icon = meta.icon;
                      return (
                        <button
                          key={record.id}
                          type="button"
                          onClick={() => applyRecord(record)}
                          className="flex w-full items-start gap-3 rounded-[16px] border border-[#E8EFF9] bg-[#F8FBFF] px-3.5 py-3 text-left active:scale-[0.99]"
                        >
                          <span
                            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: meta.bg, color: meta.color }}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-[13px] font-medium text-[#16243D]">{record.title}</span>
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#B3C0D2]" />
                            </span>
                            <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#8A9AB3]">
                              <span>{meta.label}</span>
                              <span className="h-1 w-1 rounded-full bg-[#C9D6E8]" />
                              <span>{formatDeadline(record.createdAt)}</span>
                            </span>
                            {record.summary ? (
                              <span className="mt-1 block truncate text-[11.5px] text-[#71839E]">{record.summary}</span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PhoneFrame>
  );
}

function UrgeCardView({
  urge,
  classId,
  sentCount,
  onSent,
}: {
  urge: UrgePayload;
  classId?: string;
  sentCount?: number;
  onSent: (sent: number) => void;
}) {
  const [text, setText] = useState(urge.message);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  const copy = async () => {
    if (await copyText(text.trim())) toast.success('催交文案已复制');
    else toast.error('复制失败，请长按选择文案');
  };

  const send = async () => {
    if (!classId) {
      toast.error('未找到班级信息');
      return;
    }
    const message = text.trim();
    if (!message) {
      toast.error('催交文案不能为空');
      return;
    }
    setSending(true);
    try {
      const res = await api.post<ApiResponse<{ sent: number }>>('/ai/assistant/urge', {
        classId,
        homeworkId: urge.homeworkId,
        message,
      });
      const sent = res.data?.data?.sent ?? 0;
      setConfirming(false);
      onSent(sent);
      toast.success(sent > 0 ? `已提醒 ${sent} 位未交同学` : '大家都交齐了，无需提醒');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发送失败，请重试');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-2 rounded-[16px] border border-[#FFE3CC] bg-white/95 p-3.5 shadow-[0_12px_28px_-24px_rgba(120,60,10,0.6)]">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF3E8] text-[#F97316]">
          <BellRing className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#10203A]">催交提醒 · {urge.count} 人</p>
          <p className="mt-0.5 truncate text-[11px] text-[#8A9AB3]">{urge.homeworkTitle}</p>
        </div>
      </div>

      {sentCount !== undefined ? (
        <p className="mt-2.5 rounded-[10px] bg-[#E9FBF1] px-3 py-2 text-[12px] text-[#15803D]">
          已向 {sentCount} 位未交同学发送站内提醒
        </p>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            maxLength={300}
            className="mt-2.5 w-full resize-none rounded-[10px] border border-[#FFE3CC] bg-[#FFFBF6] px-2.5 py-2 text-[12px] leading-relaxed text-[#2C3E5C] outline-none"
          />
          {confirming ? (
            <div className="mt-2 rounded-[10px] bg-[#FFF7ED] px-2.5 py-2">
              <p className="text-[11.5px] text-[#B45309]">
                确认给 {urge.count} 位未交同学发送站内提醒？
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={sending}
                  className="h-8 flex-1 rounded-[9px] border border-[#F3D9BC] bg-white text-[12px] font-medium text-[#8A6234] active:scale-[0.98] disabled:opacity-50"
                >
                  再想想
                </button>
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={sending}
                  className="flex h-8 flex-[1.3] items-center justify-center gap-1 rounded-[9px] bg-[#F97316] text-[12px] font-medium text-white active:scale-[0.98] disabled:opacity-60"
                >
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {sending ? '发送中…' : '确认发送'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => void copy()}
                className="flex h-8 flex-1 items-center justify-center gap-1 rounded-[9px] border border-[#E3EDFF] bg-[#F7FAFF] text-[12px] font-medium text-[#3B5273] active:scale-[0.98]"
              >
                <Copy className="h-3.5 w-3.5" />
                复制文案
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={!classId}
                className="flex h-8 flex-[1.2] items-center justify-center gap-1 rounded-[9px] bg-[#F97316] text-[12px] font-medium text-white active:scale-[0.98] disabled:opacity-60"
              >
                <Send className="h-3.5 w-3.5" />
                发送提醒
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = value;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

function QueryCardView({ card, onOpen }: { card: QueryCard; onOpen: (route: string) => void }) {
  const percent = card.progress
    ? Math.min(Math.max(Math.round(card.progress.percent), 0), 100)
    : 0;

  return (
    <div className="mt-2 rounded-[16px] border border-[#E3EDFF] bg-white/95 p-3.5 shadow-[0_12px_28px_-24px_rgba(10,50,120,0.6)]">
      <p className="text-[13px] font-semibold text-[#10203A]">{card.title}</p>
      {card.subtitle ? <p className="mt-0.5 truncate text-[11.5px] text-[#8A9AB3]">{card.subtitle}</p> : null}

      {card.progress ? (
        <div className="mt-2.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-[#EAF1FB]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#5AA6FF] to-[#0B66FF] transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-[#71839E]">
            完成 <span className="font-semibold text-[#0B62E8]">{percent}%</span>
            <span className="ml-1">
              （{card.progress.done}/{card.progress.total}）
            </span>
          </p>
        </div>
      ) : null}

      {card.metrics?.length ? (
        <div className="mt-2.5 flex gap-2">
          {card.metrics.map((metric) => (
            <div key={metric.label} className="flex-1 rounded-[10px] bg-[#F6F9FF] px-2 py-1.5 text-center">
              <p className="text-[13px] font-semibold text-[#16243D]">{metric.value}</p>
              <p className="mt-0.5 text-[10.5px] text-[#8A9AB3]">{metric.label}</p>
            </div>
          ))}
        </div>
      ) : null}

      {card.people?.length ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {card.people.map((person, index) => (
            <span
              key={`${person.name}-${index}`}
              className="inline-flex items-center gap-1 rounded-full bg-[#F4F8FF] px-2 py-1 text-[11.5px] text-[#3A5178]"
            >
              {person.name}
              {person.meta ? <span className="text-[10px] text-[#F97316]">{person.meta}</span> : null}
            </span>
          ))}
          {card.moreCount ? (
            <span className="inline-flex items-center rounded-full bg-[#F4F8FF] px-2 py-1 text-[11.5px] text-[#8A9AB3]">
              还有 {card.moreCount} 人
            </span>
          ) : null}
        </div>
      ) : null}

      {card.note ? <p className="mt-2 text-[11px] text-[#8A9AB3]">{card.note}</p> : null}

      {card.action ? (
        <button
          type="button"
          onClick={() => onOpen(card.action!.route)}
          className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-[10px] bg-[#EAF2FF] py-2 text-[12px] font-medium text-[#0B62E8] active:scale-[0.98]"
        >
          {card.action.label}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function DraftRow({
  label,
  value,
  ai,
  emphasize,
  multiline,
}: {
  label: string;
  value: string;
  ai?: boolean;
  emphasize?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-8 shrink-0 pt-0.5 text-[11.5px] text-[#8A9AB3]">{label}</span>
      <span
        className={`min-w-0 flex-1 text-[12.5px] leading-relaxed ${
          emphasize ? 'font-medium text-[#0F1F3A]' : 'text-[#2C3E5C]'
        } ${multiline ? 'line-clamp-3' : 'truncate'}`}
      >
        {value}
      </span>
      {ai ? (
        <span className="mt-0.5 shrink-0 rounded-full bg-[#EDF4FF] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-[#4C7FC4]">
          AI
        </span>
      ) : null}
    </div>
  );
}

/** 五类发布对象的草稿字段，成功卡与草稿卡共用 */
function DraftSummary({
  intent,
  draft,
  aiFields,
  emptyText,
}: {
  intent: Intent;
  draft: AssistantDraft;
  aiFields?: string[];
  emptyText: string;
}) {
  const ai = (field: string) => Boolean(aiFields?.includes(field));

  if (intent === 'homework') {
    return (
      <>
        <DraftRow label="科目" value={draft.subject || '作业'} ai={ai('subject')} />
        <DraftRow
          label="截止"
          value={formatDeadline(draft.deadline) || emptyText}
          ai={ai('deadline')}
          emphasize
        />
        {draft.content ? <DraftRow label="内容" value={draft.content} ai={ai('content')} multiline /> : null}
      </>
    );
  }

  if (intent === 'notice') {
    return <DraftRow label="内容" value={draft.content || emptyText} ai={ai('content')} multiline />;
  }

  if (intent === 'vote') {
    return (
      <>
        <DraftRow
          label="截止"
          value={formatDeadline(draft.deadline) || emptyText}
          ai={ai('deadline')}
          emphasize
        />
        <DraftRow
          label="选项"
          value={draft.options?.length ? draft.options.join('、') : emptyText}
          ai={ai('options')}
          multiline
        />
      </>
    );
  }

  if (intent === 'attendance') {
    return (
      <>
        <DraftRow
          label="时间"
          value={formatEventDate(draft.eventDate, draft.eventTime) || emptyText}
          ai={ai('eventDate') || ai('eventTime')}
          emphasize
        />
        <DraftRow label="地点" value={draft.location || '未设置'} ai={ai('location')} />
      </>
    );
  }

  return (
    <>
      <DraftRow
        label="时间"
        value={formatEventDate(draft.eventDate, draft.eventTime) || emptyText}
        ai={ai('eventDate') || ai('eventTime')}
        emphasize
      />
      <DraftRow label="地点" value={draft.location || emptyText} ai={ai('location')} />
      {draft.category ? <DraftRow label="分类" value={draft.category} ai={ai('category')} /> : null}
      {draft.capacity ? <DraftRow label="人数" value={`${draft.capacity} 人`} ai={ai('capacity')} /> : null}
      {draft.description ? (
        <DraftRow label="详情" value={draft.description} ai={ai('description')} multiline />
      ) : null}
    </>
  );
}