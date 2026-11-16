// ============================================================
// AI 助手：一句话发布作业/活动，或查询班级进度、催交提醒
// 与 App 端 front/src/pages/ai-assistant/AIAssistant.tsx 视觉对齐
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { BottomNav, StatusBar } from '@/components/business'
import { Icon } from '@/components/ui'
import { request } from '@/services'
import { useUserStore } from '@/stores'
import { navigate } from '@/utils'

import './index.scss'

// ---------- 类型定义 ----------
type Intent = 'homework' | 'activity' | 'notice' | 'vote' | 'attendance' | 'unknown'
type Stage = 'idle' | 'parsing' | 'awaiting' | 'draft' | 'duplicate' | 'publishing' | 'done'
type AiStatus = 'checking' | 'online' | 'offline'
type PublishableIntent = Exclude<Intent, 'unknown'>

interface AssistantDraft {
  title?: string
  subject?: string
  content?: string
  deadline?: string
  eventDate?: string
  eventTime?: string
  location?: string
  category?: string
  description?: string
  capacity?: number
  options?: string[]
}

interface DuplicateHomework {
  id: string
  title: string
  subject?: string
  deadline?: string
  similarity: number
}

interface ParseResult {
  intent: Intent
  draft: AssistantDraft
  missing: string[]
  question: string
  options: string[]
  fields: string[]
  duplicate?: DuplicateHomework | null
}

interface QueryCard {
  title: string
  subtitle?: string
  progress?: { done: number; total: number; percent: number }
  metrics?: Array<{ label: string; value: string }>
  people?: Array<{ name: string; meta?: string }>
  moreCount?: number
  note?: string
  action?: { label: string; route: string }
}

interface UrgePayload {
  homeworkId: string
  homeworkTitle: string
  count: number
  message: string
}

interface AskResult {
  recognized: boolean
  answer: string
  card?: QueryCard | null
  urge?: UrgePayload | null
  chips?: string[]
}

interface PublishedInfo {
  intent: PublishableIntent
  title: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  options?: string[]
  card?: QueryCard | null
  urge?: UrgePayload | null
  urgeSent?: number
}

interface AssistantRecord {
  id: string
  intent: PublishableIntent
  title: string
  summary?: string | null
  draft?: AssistantDraft
  createdAt: string
}

interface CachedChat {
  messages: ChatMessage[]
  stage: Stage
  intent: Intent
  draft: AssistantDraft
  aiFields: string[]
  awaitingField: string | null
  published: PublishedInfo | null
  duplicate: DuplicateHomework | null
  input: string
}

interface QuickAction {
  key: string
  label: string
  hint: string
  icon: string
  color: string
  bg: string
  sample?: string
  route?: string
}

// ---------- 常量 ----------
const CHAT_CACHE_KEY = 'banwuxing:ai-assistant-chat'

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 看起来像数据查询的输入，先走只读问答，未识别再退回发布解析 */
const QUERY_HINT =
  /(提交率|提交情况|谁|哪些|名单|多少|几个|情况|统计|进度|未交|没交|未提交|没提交|催交|催一下|催一催|提醒|报名人数|报名了|查一下|查看|看看|看下|说说|聊聊|请问|想问|签到|考勤|出勤|缺勤|请假|审批|班费|缴费|收支|余额|投票|待办|任务|周报|日报|总结|汇总|参与率|支出|收入|开销|怎么样|如何|咋样|作业清单|排行|动态|近况|新鲜事|最近|今天|本周|这周|吗|呢|什么|啥|有没有)/

/** 明确的发布/修改指令不当作查询 */
const COMMAND_HINT = /(发布|创建|发起|组织|新增|修改|改成|群发|推送|(发|发送).{0,4}(通知|公告|消息))/

const STATUS_LABEL: Record<AiStatus, string> = {
  checking: '连接中 · 班务星 AI',
  online: '在线 · 班务星 AI',
  offline: '离线 · 班务星 AI'
}

const INTENT_LABEL: Record<PublishableIntent, string> = {
  homework: '作业',
  activity: '活动',
  notice: '通知',
  vote: '投票',
  attendance: '签到'
}

const INTENT_ROUTE: Record<PublishableIntent, string> = {
  homework: '/pages-sub/homework/list/index',
  activity: '/pages-sub/activity/list/index',
  notice: '/pages-sub/message/list/index',
  vote: '/pages-sub/vote/list/index',
  attendance: '/pages-sub/attendance/list/index'
}

const INTENT_ICON: Record<PublishableIntent, { name: string; color: string }> = {
  homework: { name: 'file-text', color: '#0062FF' },
  activity: { name: 'calendar-days', color: '#7C3AED' },
  notice: { name: 'bell', color: '#EA580C' },
  vote: { name: 'vote', color: '#0E9F6E' },
  attendance: { name: 'map-pin', color: '#DB2777' }
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    key: 'homework',
    label: '发布作业',
    hint: '一句话生成作业',
    icon: 'file-text',
    color: '#0062FF',
    bg: '#EAF2FF',
    sample: '发布数学作业，明天下午五点前交'
  },
  {
    key: 'activity',
    label: '发布活动',
    hint: '活动报名一键草拟',
    icon: 'calendar-days',
    color: '#7C3AED',
    bg: '#F2EBFF',
    sample: '周五下午三点在报告厅开主题班会，30人'
  },
  {
    key: 'notice',
    label: '发布通知',
    hint: '一句话通知到全班',
    icon: 'bell',
    color: '#EA580C',
    bg: '#FFF4E8',
    sample: '发个通知说明天带身份证'
  },
  {
    key: 'vote',
    label: '发起投票',
    hint: '选项截止一起生成',
    icon: 'vote',
    color: '#0E9F6E',
    bg: '#E9F9F1',
    sample: '发起投票：春游去哪，选项公园、博物馆、周五截止'
  },
  {
    key: 'attendance',
    label: '发起签到',
    hint: '时间地点一键开签',
    icon: 'map-pin',
    color: '#DB2777',
    bg: '#FDEEF2',
    sample: '今天下午三点教室签到'
  },
  {
    key: 'task',
    label: '查看待办',
    hint: '班级任务不漏项',
    icon: 'clipboard-list',
    color: '#0E9F6E',
    bg: '#E9F9F1',
    route: '/task-board'
  },
  {
    key: 'homework-list',
    label: '作业进度',
    hint: '谁还没交一目了然',
    icon: 'check-circle',
    color: '#F97316',
    bg: '#FFF3E8',
    route: '/homework-list'
  }
]

// ---------- 工具函数 ----------
function formatDeadline(iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS[date.getDay()]} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

function formatEventDate(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return ''
  const date = new Date(y, m - 1, d)
  const day = `${m}月${d}日 ${WEEKDAYS[date.getDay()]}`
  return timeStr ? `${day} ${timeStr.slice(0, 5)}` : day
}

function intentLabel(intent: Intent): string {
  return intent === 'unknown' ? '草稿' : INTENT_LABEL[intent]
}

function readChatCache(): CachedChat | null {
  try {
    const raw = Taro.getStorageSync(CHAT_CACHE_KEY)
    if (!raw) return null
    return typeof raw === 'string' ? (JSON.parse(raw) as CachedChat) : (raw as CachedChat)
  } catch {
    return null
  }
}

/** 内存 + Storage 双份，路由切换与小程序重载都能恢复 */
let chatCache: CachedChat | null = readChatCache()

function saveChatCache(next: CachedChat) {
  chatCache = next
  try {
    Taro.setStorageSync(CHAT_CACHE_KEY, next)
  } catch {
    // 存储不可用时仅保留内存缓存，不影响页面
  }
}

function clearChatCache() {
  chatCache = null
  try {
    Taro.removeStorageSync(CHAT_CACHE_KEY)
  } catch {
    // ignore
  }
}

// ---------- 子组件 ----------
function DraftRow({
  label,
  value,
  ai,
  emphasize,
  multiline
}: {
  label: string
  value: string
  ai?: boolean
  emphasize?: boolean
  multiline?: boolean
}) {
  return (
    <View className='ai__draft-row'>
      <Text className='ai__draft-label'>{label}</Text>
      <Text
        className={`ai__draft-value${emphasize ? ' ai__draft-value--strong' : ''}${
          multiline ? ' ai__draft-value--multiline' : ''
        }`}
      >
        {value}
      </Text>
      {ai ? <Text className='ai__ai-tag'>AI</Text> : null}
    </View>
  )
}

function IntentTag({ intent }: { intent: Intent }) {
  return (
    <Text className={`ai__intent-tag ai__intent-tag--${intent}`}>{intentLabel(intent)}</Text>
  )
}

function DraftSummary({
  intent,
  draft,
  aiFields,
  emptyText
}: {
  intent: Intent
  draft: AssistantDraft
  aiFields?: string[]
  emptyText: string
}) {
  const ai = (field: string) => Boolean(aiFields?.includes(field))

  if (intent === 'homework') {
    return (
      <>
        <DraftRow label='科目' value={draft.subject || '作业'} ai={ai('subject')} />
        <DraftRow
          label='截止'
          value={formatDeadline(draft.deadline) || emptyText}
          ai={ai('deadline')}
          emphasize
        />
        {draft.content ? (
          <DraftRow label='内容' value={draft.content} ai={ai('content')} multiline />
        ) : null}
      </>
    )
  }

  if (intent === 'notice') {
    return (
      <>
        <DraftRow
          label='内容'
          value={draft.content || emptyText}
          ai={ai('content')}
          multiline
        />
      </>
    )
  }

  if (intent === 'vote') {
    return (
      <>
        <DraftRow
          label='截止'
          value={formatDeadline(draft.deadline) || emptyText}
          ai={ai('deadline')}
          emphasize
        />
        <DraftRow
          label='选项'
          value={draft.options?.length ? draft.options.join('、') : emptyText}
          ai={ai('options')}
          multiline
        />
      </>
    )
  }

  if (intent === 'attendance') {
    return (
      <>
        <DraftRow
          label='时间'
          value={formatEventDate(draft.eventDate, draft.eventTime) || emptyText}
          ai={ai('eventDate') || ai('eventTime')}
          emphasize
        />
        <DraftRow label='地点' value={draft.location || '未设置'} ai={ai('location')} />
      </>
    )
  }

  return (
    <>
      <DraftRow
        label='时间'
        value={formatEventDate(draft.eventDate, draft.eventTime) || emptyText}
        ai={ai('eventDate') || ai('eventTime')}
        emphasize
      />
      <DraftRow label='地点' value={draft.location || emptyText} ai={ai('location')} />
      {draft.category ? (
        <DraftRow label='分类' value={draft.category} ai={ai('category')} />
      ) : null}
      {draft.capacity ? (
        <DraftRow label='人数' value={`${draft.capacity} 人`} ai={ai('capacity')} />
      ) : null}
      {draft.description ? (
        <DraftRow label='详情' value={draft.description} ai={ai('description')} multiline />
      ) : null}
    </>
  )
}

function QueryCardView({ card, onOpen }: { card: QueryCard; onOpen: (route?: string) => void }) {
  const percent = card.progress
    ? Math.min(Math.max(Math.round(card.progress.percent), 0), 100)
    : 0

  return (
    <View className='ai__query-card'>
      <Text className='ai__query-title'>{card.title}</Text>
      {card.subtitle ? <Text className='ai__query-sub'>{card.subtitle}</Text> : null}

      {card.progress ? (
        <View className='ai__progress'>
          <View className='ai__progress-track'>
            <View className='ai__progress-fill' style={{ width: `${percent}%` }} />
          </View>
          <Text className='ai__progress-text'>
            完成 <Text className='ai__progress-value'>{percent}%</Text>（{card.progress.done}/
            {card.progress.total}）
          </Text>
        </View>
      ) : null}

      {card.metrics?.length ? (
        <View className='ai__metrics'>
          {card.metrics.map((metric) => (
            <View key={metric.label} className='ai__metric'>
              <Text className='ai__metric-value'>{metric.value}</Text>
              <Text className='ai__metric-label'>{metric.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {card.people?.length ? (
        <View className='ai__people'>
          {card.people.map((person, index) => (
            <View key={`${person.name}-${index}`} className='ai__person'>
              <Text>{person.name}</Text>
              {person.meta ? <Text className='ai__person-meta'>{person.meta}</Text> : null}
            </View>
          ))}
          {card.moreCount ? (
            <View className='ai__person ai__person--more'>
              <Text>还有 {card.moreCount} 人</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {card.note ? <Text className='ai__query-note'>{card.note}</Text> : null}

      {card.action ? (
        <View className='ai__query-action' onClick={() => onOpen(card.action?.route)}>
          <Text>{card.action.label}</Text>
          <Icon name='chevron-right' size={28} color='#0B62E8' />
        </View>
      ) : null}
    </View>
  )
}

function UrgeCardView({
  urge,
  classId,
  sentCount,
  onSent
}: {
  urge: UrgePayload
  classId?: string
  sentCount?: number
  onSent: (sent: number) => void
}) {
  const [text, setText] = useState(urge.message)
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)

  const copyText = () => {
    Taro.setClipboardData({
      data: text.trim(),
      success: () => Taro.showToast({ title: '催交文案已复制', icon: 'none' }),
      fail: () => Taro.showToast({ title: '复制失败，请长按选择文案', icon: 'none' })
    })
  }

  const send = async () => {
    if (!classId) {
      Taro.showToast({ title: '未找到班级信息', icon: 'none' })
      return
    }
    const message = text.trim()
    if (!message) {
      Taro.showToast({ title: '催交文案不能为空', icon: 'none' })
      return
    }
    setSending(true)
    try {
      const res = await request.post<{ sent: number }>('/ai/assistant/urge', {
        classId,
        homeworkId: urge.homeworkId,
        message
      })
      const sent = res?.sent ?? 0
      setConfirming(false)
      onSent(sent)
      Taro.showToast({
        title: sent > 0 ? `已提醒 ${sent} 位未交同学` : '大家都交齐了，无需提醒',
        icon: 'none'
      })
    } catch {
      // request 层已提示错误
    } finally {
      setSending(false)
    }
  }

  return (
    <View className='ai__urge-card'>
      <View className='ai__urge-head'>
        <View className='ai__urge-icon'>
          <Icon name='bell-ring' size={32} color='#F97316' />
        </View>
        <View className='ai__urge-info'>
          <Text className='ai__urge-title'>催交提醒 · {urge.count} 人</Text>
          <Text className='ai__urge-sub'>{urge.homeworkTitle}</Text>
        </View>
      </View>

      {typeof sentCount === 'number' ? (
        <Text className='ai__urge-sent'>已向 {sentCount} 位未交同学发送站内提醒</Text>
      ) : (
        <>
          <Textarea
            className='ai__urge-textarea'
            value={text}
            maxlength={300}
            onInput={(event) => setText(event.detail.value)}
          />

          {confirming ? (
            <View className='ai__urge-confirm'>
              <Text className='ai__urge-confirm-text'>
                确认给 {urge.count} 位未交同学发送站内提醒？
              </Text>
              <View className='ai__urge-confirm-btns'>
                <View
                  className='ai__urge-btn ai__urge-btn--ghost'
                  onClick={() => {
                    if (!sending) setConfirming(false)
                  }}
                >
                  <Text>再想想</Text>
                </View>
                <View
                  className='ai__urge-btn ai__urge-btn--primary'
                  onClick={() => {
                    if (!sending) void send()
                  }}
                >
                  {sending ? (
                    <View className='ai__spinner' />
                  ) : (
                    <Icon name='send' size={26} color='#FFFFFF' />
                  )}
                  <Text>{sending ? '发送中…' : '确认发送'}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View className='ai__urge-actions'>
              <View className='ai__urge-btn ai__urge-btn--outline' onClick={copyText}>
                <Icon name='copy' size={26} color='#3B5273' />
                <Text>复制文案</Text>
              </View>
              <View
                className={`ai__urge-btn ai__urge-btn--orange${
                  classId ? '' : ' ai__urge-btn--disabled'
                }`}
                onClick={() => {
                  if (classId) setConfirming(true)
                }}
              >
                <Icon name='send' size={26} color='#FFFFFF' />
                <Text>发送提醒</Text>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  )
}

// ---------- 页面 ----------
export default function AiAssistantPage() {
  const userInfo = useUserStore((state) => state.userInfo)
  const currentClassId = useUserStore((state) => state.currentClassId)
  const classId = userInfo?.classId || currentClassId

  const [messages, setMessages] = useState<ChatMessage[]>(chatCache?.messages || [])
  const [stage, setStage] = useState<Stage>(() => {
    const cachedStage = chatCache?.stage
    if (!cachedStage) return 'idle'
    if (cachedStage === 'parsing') return 'idle'
    if (cachedStage === 'publishing') return 'draft'
    return cachedStage
  })
  const [intent, setIntent] = useState<Intent>(chatCache?.intent || 'unknown')
  const [draft, setDraft] = useState<AssistantDraft>(chatCache?.draft || {})
  const [aiFields, setAiFields] = useState<string[]>(chatCache?.aiFields || [])
  const [awaitingField, setAwaitingField] = useState<string | null>(
    chatCache?.awaitingField || null
  )
  const [published, setPublished] = useState<PublishedInfo | null>(chatCache?.published || null)
  const [duplicate, setDuplicate] = useState<DuplicateHomework | null>(
    chatCache?.duplicate || null
  )
  const [input, setInput] = useState(chatCache?.input || '')
  const [inputFocus, setInputFocus] = useState(false)
  const [aiStatus, setAiStatus] = useState<AiStatus>('checking')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyList, setHistoryList] = useState<AssistantRecord[]>([])
  const [scrollTop, setScrollTop] = useState(0)

  const busy = stage === 'parsing' || stage === 'publishing'
  const empty = messages.length === 0 && stage === 'idle'
  const canPublish =
    intent === 'homework'
      ? Boolean(
          userInfo?.isCommittee ||
            userInfo?.roleLevel === 'owner' ||
            userInfo?.roleLevel === 'admin'
        )
      : Boolean(userInfo?.roleLevel === 'owner' || userInfo?.roleLevel === 'admin')
  const showDraft = (stage === 'draft' || stage === 'publishing') && Boolean(draft.title) && !published
  const showSuccess = stage === 'done' && Boolean(published)
  const showDuplicate = stage === 'duplicate' && Boolean(duplicate)

  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant') return messages[i].id
    }
    return ''
  }, [messages])

  // 对话缓存：解析/发布中不写入瞬时状态
  useEffect(() => {
    const safeStage: Stage =
      stage === 'parsing' || stage === 'publishing'
        ? draft.title
          ? 'draft'
          : messages.length
            ? 'awaiting'
            : 'idle'
        : stage
    saveChatCache({
      messages,
      stage: safeStage,
      intent,
      draft,
      aiFields,
      awaitingField,
      published,
      duplicate,
      input
    })
  }, [messages, stage, intent, draft, aiFields, awaitingField, published, duplicate, input])

  // AI 服务在线状态
  useEffect(() => {
    let alive = true
    const check = async () => {
      try {
        const res = await request.get<{ status: 'online' | 'offline' }>('/ai/assistant/status')
        if (alive) setAiStatus(res?.status === 'online' ? 'online' : 'offline')
      } catch {
        if (alive) setAiStatus('offline')
      }
    }
    void check()
    const timer = setInterval(() => void check(), 60000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  // 消息变化时滚到底部
  useEffect(() => {
    setScrollTop((value) => value + 100000)
  }, [messages, stage, draft, duplicate, published])

  const pushMessage = (message: Omit<ChatMessage, 'id'>) => {
    setMessages((list) => [
      ...list,
      {
        ...message,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      }
    ])
  }

  const markUrgeSent = (messageId: string, sent: number) => {
    setMessages((list) =>
      list.map((message) => (message.id === messageId ? { ...message, urgeSent: sent } : message))
    )
  }

  const reset = () => {
    clearChatCache()
    setMessages([])
    setStage('idle')
    setIntent('unknown')
    setDraft({})
    setAiFields([])
    setAwaitingField(null)
    setPublished(null)
    setDuplicate(null)
    setInput('')
    setInputFocus(false)
  }

  const submit = async (raw: string) => {
    const text = raw.trim()
    if (!text) return
    if (stage === 'parsing' || stage === 'publishing') return

    setInput('')
    setInputFocus(false)
    pushMessage({ role: 'user', text })
    setStage('parsing')

    const compact = text.replace(/\s+/g, '')
    const urgeIntent = /(催交|催一下|催一催|催作业|催办)/.test(compact)
    const publishLike =
      /(签到|打卡)/.test(compact) &&
      !/(谁|哪些|名单|情况|统计|没|未|多少|几个|缺勤|出勤|记录|参与)/.test(compact) &&
      /(今天|明天|后天|周|星期|上午|下午|晚上|\d{1,2}\s*[点:：])/.test(compact)
    const tryAsk =
      Boolean(classId) && !publishLike && QUERY_HINT.test(compact) && (!COMMAND_HINT.test(compact) || urgeIntent)

    try {
      if (tryAsk && classId) {
        const asked = await request.post<AskResult>('/ai/assistant/ask', {
          text,
          classId
        })
        if (asked?.recognized) {
          pushMessage({
            role: 'assistant',
            text: asked.answer,
            options: asked.chips,
            card: asked.card,
            urge: asked.urge
          })
          setAwaitingField(null)
          setStage(draft.title && !published ? 'draft' : 'awaiting')
          return
        }
        // 查询类输入但白名单没命中：给出能力提示，避免误落到“发布作业还是活动”
        if (!COMMAND_HINT.test(compact) && !urgeIntent) {
          pushMessage({
            role: 'assistant',
            text: '这个问题我暂时还答不上来。你可以问我：签到出勤、班费收支、投票参与、待办任务、作业提交情况，也可以直接说「班级周报」。',
            options: ['班级周报', '签到情况', '班费余额', '我的待办']
          })
          setAwaitingField(null)
          setStage(draft.title && !published ? 'draft' : 'awaiting')
          return
        }
      }

      const data = await request.post<ParseResult>('/ai/assistant/parse', {
        text,
        draft,
        awaiting: awaitingField || undefined,
        intent: intent !== 'unknown' ? intent : undefined,
        classId: classId || ''
      })
      if (!data) throw new Error('解析失败')

      setIntent(data.intent)
      setDraft(data.draft || {})
      setAiFields(data.fields || [])
      setAwaitingField(data.missing?.[0] || null)
      setPublished(null)

      if (data.intent === 'homework' && data.duplicate) {
        setDuplicate(data.duplicate)
        pushMessage({
          role: 'assistant',
          text: `这条指令和已发布的「${data.duplicate.title}」高度相似，我先帮你拦一下，避免重复发布。`
        })
        setStage('duplicate')
        return
      }

      setDuplicate(null)
      pushMessage({
        role: 'assistant',
        text:
          data.question ||
          (data.missing?.length ? '还需要补充一点信息。' : '信息齐了，确认草稿后就可以发布。'),
        options: data.missing?.length ? data.options : undefined
      })
      if (data.intent === 'unknown' || data.missing?.length) {
        setStage('awaiting')
      } else {
        setStage('draft')
      }
    } catch {
      pushMessage({ role: 'assistant', text: '刚刚网络有点问题，再说一次试试？' })
      setStage(draft.title ? 'draft' : 'idle')
    }
  }

  const saveHistory = async (recordIntent: PublishableIntent, summary?: string) => {
    if (!classId || !draft.title) return
    try {
      await request.post('/ai/assistant/records', {
        classId,
        intent: recordIntent,
        title: draft.title,
        summary,
        draft
      })
    } catch {
      // 历史记录保存失败不影响发布结果
    }
  }

  const publish = async () => {
    if (stage !== 'draft' || !draft.title) return
    if (!classId) {
      Taro.showToast({ title: '未找到班级信息', icon: 'none' })
      return
    }

    if (intent === 'homework') {
      const allowed = Boolean(
        userInfo?.isCommittee || userInfo?.roleLevel === 'owner' || userInfo?.roleLevel === 'admin'
      )
      if (!allowed) {
        Taro.showToast({ title: '仅班委可发布作业', icon: 'none' })
        return
      }
      if (!draft.deadline) {
        Taro.showToast({ title: '还缺截止时间，补充一下', icon: 'none' })
        return
      }
      if (new Date(draft.deadline).getTime() <= Date.now()) {
        Taro.showToast({ title: '截止时间需要晚于当前时间', icon: 'none' })
        return
      }

      setStage('publishing')
      try {
        await request.post(`/classes/${classId}/homeworks`, {
          title: draft.title.trim(),
          subject: (draft.subject || '作业').trim(),
          deadline: draft.deadline,
          content: (draft.content || '').trim()
        })
        setPublished({ intent: 'homework', title: draft.title })
        setStage('done')
        Taro.showToast({ title: '作业发布成功', icon: 'success' })
        void saveHistory(
          'homework',
          draft.deadline ? `截止 ${formatDeadline(draft.deadline)}` : undefined
        )
      } catch {
        setStage('draft')
      }
      return
    }

    if (intent === 'activity') {
      if (userInfo?.roleLevel !== 'owner' && userInfo?.roleLevel !== 'admin') {
        Taro.showToast({ title: '仅班委可发布活动', icon: 'none' })
        return
      }
      if (!draft.eventDate || !draft.location) {
        Taro.showToast({ title: '活动日期和地点还不能为空', icon: 'none' })
        return
      }

      setStage('publishing')
      try {
        await request.post(`/classes/${classId}/activities`, {
          title: draft.title.trim(),
          category: draft.category || undefined,
          eventDate: draft.eventDate,
          eventTime: draft.eventTime || undefined,
          location: draft.location.trim(),
          description: (draft.description || '').trim() || undefined,
          capacity: draft.capacity || undefined
        })
        setPublished({ intent: 'activity', title: draft.title })
        setStage('done')
        Taro.showToast({ title: '活动发布成功', icon: 'success' })
        void saveHistory(
          'activity',
          [formatEventDate(draft.eventDate, draft.eventTime), draft.location]
            .filter(Boolean)
            .join(' · ')
        )
      } catch {
        setStage('draft')
      }
      return
    }

    if (intent === 'notice') {
      if (userInfo?.roleLevel !== 'owner' && userInfo?.roleLevel !== 'admin') {
        Taro.showToast({ title: '仅班委可发布通知', icon: 'none' })
        return
      }
      if (!draft.content) {
        Taro.showToast({ title: '还缺通知内容，补充一下', icon: 'none' })
        return
      }
      setStage('publishing')
      try {
        await request.post(`/classes/${classId}/messages`, {
          type: 'notice',
          title: draft.title.trim(),
          content: draft.content.trim()
        })
        setPublished({ intent: 'notice', title: draft.title })
        setStage('done')
        Taro.showToast({ title: '通知发布成功', icon: 'success' })
        void saveHistory('notice', draft.content.trim().slice(0, 40))
      } catch {
        setStage('draft')
      }
      return
    }

    if (intent === 'vote') {
      if (userInfo?.roleLevel !== 'owner' && userInfo?.roleLevel !== 'admin') {
        Taro.showToast({ title: '仅班委可发起投票', icon: 'none' })
        return
      }
      if (!draft.options || draft.options.length < 2) {
        Taro.showToast({ title: '投票至少需要两个选项', icon: 'none' })
        return
      }
      if (!draft.deadline) {
        Taro.showToast({ title: '还缺截止时间，补充一下', icon: 'none' })
        return
      }
      setStage('publishing')
      try {
        await request.post(`/classes/${classId}/votes`, {
          title: draft.title.trim(),
          voteType: 'single',
          deadline: draft.deadline,
          options: draft.options
        })
        setPublished({ intent: 'vote', title: draft.title })
        setStage('done')
        Taro.showToast({ title: '投票发布成功', icon: 'success' })
        void saveHistory('vote', `${draft.options.length} 个选项 · 截止 ${formatDeadline(draft.deadline)}`)
      } catch {
        setStage('draft')
      }
      return
    }

    if (intent === 'attendance') {
      if (userInfo?.roleLevel !== 'owner' && userInfo?.roleLevel !== 'admin') {
        Taro.showToast({ title: '仅班委可发起签到', icon: 'none' })
        return
      }
      if (!draft.eventDate || !draft.eventTime) {
        Taro.showToast({ title: '签到开始时间还不能为空', icon: 'none' })
        return
      }
      const start = new Date(`${draft.eventDate}T${draft.eventTime}+08:00`)
      if (Number.isNaN(start.getTime())) {
        Taro.showToast({ title: '签到时间格式不正确', icon: 'none' })
        return
      }
      setStage('publishing')
      try {
        await request.post(`/classes/${classId}/attendances`, {
          title: draft.title.trim(),
          startTime: start.toISOString(),
          endTime: new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          method: 'normal',
          location: draft.location?.trim() || undefined
        })
        setPublished({ intent: 'attendance', title: draft.title })
        setStage('done')
        Taro.showToast({ title: '签到发布成功', icon: 'success' })
        void saveHistory(
          'attendance',
          [formatEventDate(draft.eventDate, draft.eventTime), draft.location]
            .filter(Boolean)
            .join(' · ')
        )
      } catch {
        setStage('draft')
      }
    }
  }

  const startModify = () => {
    setStage('awaiting')
    setAwaitingField(null)
    pushMessage({
      role: 'assistant',
      text: '想改哪一项？直接告诉我，比如「标题改成数学练习」「截止时间改到明天晚上八点」。',
      options: ['修改标题', '修改时间', '修改地点']
    })
    setInputFocus(true)
  }

  const openHistory = async () => {
    setHistoryOpen(true)
    setHistoryLoading(true)
    try {
      const data = await request.get<AssistantRecord[]>('/ai/assistant/records', { limit: 30 })
      setHistoryList(Array.isArray(data) ? data : [])
    } catch {
      Taro.showToast({ title: '历史记录加载失败', icon: 'none' })
    } finally {
      setHistoryLoading(false)
    }
  }

  const applyRecord = (record: AssistantRecord) => {
    setIntent(record.intent)
    setDraft(record.draft || {})
    setAiFields([])
    setAwaitingField(null)
    setPublished(null)
    setDuplicate(null)
    setMessages([])
    setStage('draft')
    setHistoryOpen(false)
    pushMessage({
      role: 'assistant',
      text: `已载入历史草稿「${record.title}」，确认信息无误后可以重新发布。`
    })
  }

  const openRoute = (route?: string) => {
    if (!route) return
    if (route === '/task-board') {
      navigate('/pages-sub/material/task-board/index')
      return
    }
    if (route === '/homework-list') {
      navigate('/pages-sub/homework/list/index')
      return
    }
    if (route === '/activity-list') {
      navigate('/pages-sub/activity/list/index')
      return
    }
    if (route === '/attendance-list') {
      navigate('/pages-sub/attendance/list/index')
      return
    }
    if (route === '/leave-approval') {
      navigate('/pages-sub/attendance/leave-approval/index')
      return
    }
    if (route === '/my-attendance') {
      navigate('/pages-sub/attendance/my/index')
      return
    }
    if (route === '/vote-list') {
      navigate('/pages-sub/vote/list/index')
      return
    }
    if (route === '/fee-ledger') {
      navigate('/pages-sub/fee/ledger/index')
      return
    }
    if (route === '/finance-report') {
      navigate('/pages-sub/fee/report/index')
      return
    }
    if (route === '/payment-register') {
      navigate('/pages-sub/fee/payment-register/index')
      return
    }
    if (route === '/class-home') {
      navigate('/pages/class-home/index')
      return
    }
    if (route === '/message-list') {
      navigate('/pages-sub/message/list/index')
      return
    }
    const homeworkDetail = route.match(/^\/homework-detail\/([^/]+)/)
    if (homeworkDetail) {
      navigate(
        `/pages-sub/homework/detail/index?classId=${classId || ''}&homeworkId=${homeworkDetail[1]}`
      )
      return
    }
    const activityDetail = route.match(/^\/activity-detail\/([^/]+)/)
    if (activityDetail) {
      navigate(
        `/pages-sub/activity/detail/index?classId=${classId || ''}&activityId=${activityDetail[1]}`
      )
      return
    }
    navigate(route)
  }

  const handleMic = () => {
    Taro.showToast({ title: '小程序端暂不支持语音输入', icon: 'none' })
  }

  return (
    <View className='ai'>
      <View className='ai__glow ai__glow--one' />
      <View className='ai__glow ai__glow--two' />

      {/* ---------- 顶部封面 ---------- */}
      <View className='ai__header'>
        <View className='ai__header-grid' />
        <View className='ai__ring ai__ring--one' />
        <View className='ai__ring ai__ring--two' />
        <View className='ai__header-shade' />

        <View className='ai__header-content'>
          <StatusBar light />

          <View className='ai__topbar'>
            <View className='ai__avatar'>
              <Icon name='sparkles' size={36} color='#FFFFFF' />
            </View>

            <View className='ai__identity'>
              <View className={`ai__status ai__status--${aiStatus}`}>
                <View className='ai__status-dot' />
                <Text className='ai__status-text'>{STATUS_LABEL[aiStatus]}</Text>
              </View>
              <Text className='ai__title'>班级助手</Text>
            </View>

            <View className='ai__actions'>
              <View className='ai__action' onClick={openHistory}>
                <Icon name='history' size={34} color='#EAF3FF' />
              </View>
              <View className='ai__action' onClick={reset}>
                <Icon name='rotate-ccw' size={34} color='#EAF3FF' />
              </View>
            </View>
          </View>

          <View className='ai__chips'>
            <View
              className='ai__chip'
              onClick={() => {
                setInput(QUICK_ACTIONS[0].sample || '')
                setInputFocus(true)
              }}
            >
              <Text>发布作业</Text>
            </View>
            <View
              className='ai__chip'
              onClick={() => {
                setInput(QUICK_ACTIONS[1].sample || '')
                setInputFocus(true)
              }}
            >
              <Text>发布活动</Text>
            </View>
            <View className='ai__chip' onClick={() => void submit('催一下没交作业的同学')}>
              <Text>催交作业</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ---------- 正文 ---------- */}
      <View className='ai__body'>
        {empty ? (
          <View className='ai__empty'>
            <View className='ai__orb'>
              <View className='ai__orb-halo' />
              <View className='ai__orb-ring' />
              <View className='ai__orb-ring ai__orb-ring--slow' />
              <View className='ai__orb-core'>
                <Icon name='mic' size={72} color='#FFFFFF' />
              </View>
            </View>
            <Text className='ai__empty-title'>说一句，就发布</Text>
            <Text className='ai__empty-desc'>
              发布作业、组织活动，或直接问提交率、谁还没交、帮我催交作业。
            </Text>

            <View className='ai__quick-grid'>
              {QUICK_ACTIONS.map((action) => (
                <View
                  key={action.key}
                  className='ai__quick'
                  onClick={() => {
                    if (action.route) {
                      openRoute(action.route)
                      return
                    }
                    setInput(action.sample || '')
                    setInputFocus(true)
                  }}
                >
                  <View className='ai__quick-icon' style={{ background: action.bg }}>
                    <Icon name={action.icon} size={36} color={action.color} />
                  </View>
                  <View className='ai__quick-text'>
                    <Text className='ai__quick-label'>{action.label}</Text>
                    <Text className='ai__quick-hint'>{action.hint}</Text>
                  </View>
                  <Icon name='chevron-right' size={32} color='#B6C2D4' />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <ScrollView
            className='ai__chat'
            scrollY
            enableFlex
            scrollWithAnimation
            scrollTop={scrollTop}
          >
            <View className='ai__messages'>
              {messages.map((message) =>
                message.role === 'user' ? (
                  <View key={message.id} className='ai__row-user'>
                    <View className='ai__bubble-user'>
                      <Text>{message.text}</Text>
                    </View>
                  </View>
                ) : (
                  <View key={message.id} className='ai__row-ai'>
                    <View className='ai__ai-avatar'>
                      <Icon name='sparkles' size={26} color='#FFFFFF' />
                    </View>
                    <View className='ai__ai-body'>
                      <View className='ai__bubble-ai'>
                        <Text>{message.text}</Text>
                      </View>

                      {message.card ? <QueryCardView card={message.card} onOpen={openRoute} /> : null}

                      {message.urge ? (
                        <UrgeCardView
                          urge={message.urge}
                          classId={classId}
                          sentCount={message.urgeSent}
                          onSent={(sent) => markUrgeSent(message.id, sent)}
                        />
                      ) : null}

                      {message.options?.length &&
                      message.id === lastAssistantId &&
                      (stage === 'awaiting' || Boolean(message.card)) ? (
                        <View className='ai__options'>
                          {message.options.map((option) => (
                            <View
                              key={option}
                              className='ai__option'
                              onClick={() => {
                                if (busy) return
                                void submit(option)
                              }}
                            >
                              <Text>{option}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  </View>
                )
              )}

              {stage === 'parsing' ? (
                <View className='ai__row-ai'>
                  <View className='ai__ai-avatar'>
                    <Icon name='sparkles' size={26} color='#FFFFFF' />
                  </View>
                  <View className='ai__typing'>
                    <View className='ai__typing-dot' />
                    <View className='ai__typing-dot ai__typing-dot--delay' />
                    <View className='ai__typing-dot ai__typing-dot--delay-two' />
                  </View>
                </View>
              ) : null}

              {/* 重复作业提示 */}
              {showDuplicate && duplicate ? (
                <View className='ai__card'>
                  <View className='ai__card-topline ai__card-topline--duplicate' />
                  <View className='ai__dup-head'>
                    <View className='ai__icon-circle ai__icon-circle--orange'>
                      <Icon name='bell-ring' size={32} color='#EA580C' />
                    </View>
                    <View className='ai__dup-body'>
                      <Text className='ai__dup-title'>这条作业可能已经发布过</Text>
                      <Text className='ai__dup-meta'>
                        {duplicate.title} · {formatDeadline(duplicate.deadline) || '未设置截止'}
                      </Text>
                    </View>
                    <Text className='ai__dup-badge'>相似 {duplicate.similarity}%</Text>
                  </View>
                  <Text className='ai__dup-note'>
                    已有同名作业在相近时间截止，建议先查看已有作业；如果只是调整时间或内容，直接在原作业上处理，避免重复创建。
                  </Text>
                  <View className='ai__btn-row'>
                    <View
                      className='ai__btn ai__btn--orange'
                      onClick={() => openRoute(`/homework-detail/${duplicate.id}`)}
                    >
                      <Text>查看已有作业</Text>
                    </View>
                    <View className='ai__btn ai__btn--ghost' onClick={() => setStage('draft')}>
                      <Text>仍然发布</Text>
                    </View>
                  </View>
                </View>
              ) : null}

              {/* 发布成功 */}
              {showSuccess && published ? (
                <View className='ai__card'>
                  <View className='ai__card-topline ai__card-topline--success' />
                  <View className='ai__success-head'>
                    <View className='ai__icon-circle ai__icon-circle--green'>
                      <Icon name='check' size={36} color='#16A34A' strokeWidth={2.6} />
                    </View>
                    <View className='ai__success-body'>
                      <Text className='ai__success-title'>发布成功</Text>
                      <Text className='ai__success-meta'>
                        {INTENT_LABEL[published.intent]}「{published.title}」已发出
                      </Text>
                    </View>
                  </View>

                  <View className='ai__success-box'>
                    <DraftSummary
                      intent={published.intent}
                      draft={draft}
                      emptyText='未设置'
                    />
                  </View>

                  <View className='ai__btn-row'>
                    <View
                      className='ai__btn ai__btn--primary'
                      onClick={() => navigate(INTENT_ROUTE[published.intent])}
                    >
                      <Text>查看{INTENT_LABEL[published.intent]}</Text>
                      <Icon name='chevron-right' size={28} color='#FFFFFF' />
                    </View>
                    <View className='ai__btn ai__btn--ghost' onClick={reset}>
                      <Text>再发一条</Text>
                    </View>
                  </View>
                </View>
              ) : null}

              {/* 草稿确认 */}
              {showDraft ? (
                <View className='ai__card'>
                  <View className='ai__card-topline' />
                  <View className='ai__draft-head'>
                    <View className='ai__draft-head-left'>
                      <IntentTag intent={intent} />
                      <Text className='ai__draft-title'>{draft.title}</Text>
                    </View>
                    <Text className='ai__draft-badge'>AI 草稿</Text>
                  </View>

                  <View className='ai__draft-rows'>
                    <DraftSummary
                      intent={intent}
                      draft={draft}
                      aiFields={aiFields}
                      emptyText='待补充'
                    />
                  </View>

                  {!canPublish ? (
                    <Text className='ai__draft-warn'>
                      当前身份仅可查看草稿，发布需要班委权限。
                    </Text>
                  ) : null}

                  <View className='ai__btn-row'>
                    <View
                      className={`ai__btn ai__btn--ghost${
                        stage === 'publishing' ? ' ai__btn--disabled' : ''
                      }`}
                      onClick={() => {
                        if (stage !== 'publishing') startModify()
                      }}
                    >
                      <Text>再改改</Text>
                    </View>
                    <View
                      className={`ai__btn ai__btn--primary ai__btn--wide${
                        stage === 'publishing' || !canPublish ? ' ai__btn--disabled' : ''
                      }`}
                      onClick={() => {
                        if (!canPublish) return
                        void publish()
                      }}
                    >
                      {stage === 'publishing' ? (
                        <>
                          <View className='ai__spinner' />
                          <Text>发布中…</Text>
                        </>
                      ) : (
                        <>
                          <Icon name='check' size={28} color='#FFFFFF' strokeWidth={2.6} />
                          <Text>确认发布</Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              ) : null}

              <View className='ai__chat-bottom' />
            </View>
          </ScrollView>
        )}
      </View>

      {/* ---------- 输入栏 ---------- */}
      <View className='ai__composer'>
        <Text className='ai__composer-hint'>当前环境不支持语音识别，可直接输入文字</Text>
        <View className='ai__composer-box'>
          <View className='ai__composer-inner'>
            <View className='ai__mic' onClick={handleMic}>
              <Icon name='mic' size={36} color='#FFFFFF' />
            </View>
            <Textarea
              className='ai__input'
              value={input}
              focus={inputFocus}
              maxlength={500}
              autoHeight
              showConfirmBar={false}
              cursorSpacing={24}
              placeholder={
                stage === 'awaiting' ? '回答上面的问题，或直接补充…' : '描述要发布的内容…'
              }
              placeholderClass='ai__input-placeholder'
              onInput={(event) => setInput(event.detail.value)}
              onBlur={() => setInputFocus(false)}
            />
            <View
              className={`ai__send${
                input.trim() && !busy ? ' ai__send--active' : ' ai__send--disabled'
              }`}
              onClick={() => {
                if (busy || !input.trim()) return
                void submit(input)
              }}
            >
              <Icon
                name='arrow-up'
                size={34}
                color={input.trim() && !busy ? '#FFFFFF' : '#9DB0C7'}
              />
            </View>
          </View>
        </View>
      </View>

      {/* ---------- 发布历史 ---------- */}
      {historyOpen ? (
        <View className='ai__history'>
          <View className='ai__mask' onClick={() => setHistoryOpen(false)} />
          <View className='ai__sheet'>
            <View className='ai__sheet-grip' />
            <View className='ai__sheet-head'>
              <View className='ai__sheet-head-main'>
                <Text className='ai__sheet-title'>发布历史</Text>
                <Text className='ai__sheet-sub'>最近 30 条由 AI 助手确认发布的内容</Text>
              </View>
              <View className='ai__sheet-close' onClick={() => setHistoryOpen(false)}>
                <Icon name='x' size={30} color='#7E8FA6' />
              </View>
            </View>

            {historyLoading ? (
              <View className='ai__history-loading'>
                <View className='ai__spinner ai__spinner--blue' />
                <Text className='ai__history-loading-text'>加载中…</Text>
              </View>
            ) : historyList.length === 0 ? (
              <View className='ai__history-empty'>
                <View className='ai__history-empty-icon'>
                  <Icon name='history' size={44} color='#9DB0C7' />
                </View>
                <Text className='ai__history-empty-title'>还没有发布记录</Text>
                <Text className='ai__history-empty-sub'>发布成功后会自动保存在这里</Text>
              </View>
            ) : (
              <ScrollView className='ai__history-scroll' scrollY>
                <View className='ai__history-list'>
                  {historyList.map((record) => (
                    <View
                      key={record.id}
                      className='ai__history-item'
                      onClick={() => applyRecord(record)}
                    >
                      <View
                        className={`ai__history-icon ai__history-icon--${record.intent}`}
                      >
                        <Icon
                          name={INTENT_ICON[record.intent].name}
                          size={32}
                          color={INTENT_ICON[record.intent].color}
                        />
                      </View>
                      <View className='ai__history-body'>
                        <View className='ai__history-top'>
                          <Text className='ai__history-title'>{record.title}</Text>
                          <Icon name='chevron-right' size={28} color='#B3C0D2' />
                        </View>
                        <View className='ai__history-meta'>
                          <Text>{INTENT_LABEL[record.intent]}</Text>
                          <View className='ai__dot-sep' />
                          <Text>{formatDeadline(record.createdAt)}</Text>
                        </View>
                        {record.summary ? (
                          <Text className='ai__history-summary'>{record.summary}</Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
                <View className='ai__history-bottom' />
              </ScrollView>
            )}
          </View>
        </View>
      ) : null}

      <BottomNav active='ai' />
    </View>
  )
}