import { useCallback, useState } from 'react'
import { Input, Text, Textarea, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { SettingsHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { feedbackApi } from '@/services'
import { useAuth } from '@/utils'
import './index.scss'

interface FeedbackItem {
  id: string
  content: string
  contact?: string | null
  status: string
  createdAt: string
}

type SheetKey = 'faq' | 'guide' | 'service' | null

const MAX_CONTENT = 500
const PAGE_SIZE = 20

const FAQS = [
  {
    q: '如何加入班级？',
    a: '登录后进入「加入或创建班级」页，输入班主任提供的班级邀请码即可加入；班主任也可以在成员管理中直接邀请。'
  },
  {
    q: '为什么收不到通知？',
    a: '请先在「设置 → 通知设置」中确认对应开关已开启，并在系统设置中允许班务星发送通知。'
  },
  {
    q: '如何提交作业？',
    a: '进入「作业」列表打开对应作业，点击「提交作业」上传内容即可；若已逾期，可在作业详情中发起延期申请。'
  },
  {
    q: '如何请假？',
    a: '在考勤模块进入「请假申请」，选择请假类型与时间并填写原因，提交后等待班主任审批。'
  },
  {
    q: '如何修改密码？',
    a: '进入「我的 → 设置 → 账号与安全 → 修改密码」，验证原密码后即可设置新密码。'
  }
]

const GUIDES = [
  {
    title: '发布通知',
    desc: '首页 → 发布 → 选择「通知」，填写标题与内容后发布，可在消息统计中查看已读情况。'
  },
  {
    title: '发起考勤',
    desc: '考勤 → 发布考勤 → 设置签到方式与截止时间，学生在「签到」页完成打卡。'
  },
  {
    title: '发布作业',
    desc: '作业 → 发布作业 → 填写要求与截止时间，学生提交后可在作业详情中批阅。'
  },
  {
    title: '管理班费',
    desc: '班费 → 收支记录，可新增收入 / 支出并查看余额明细。'
  }
]

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: '待处理', className: 'hfeed__status--pending' },
  processing: { label: '处理中', className: 'hfeed__status--processing' },
  resolved: { label: '已处理', className: 'hfeed__status--resolved' }
}

const SHEET_TITLES: Record<Exclude<SheetKey, null>, string> = {
  faq: '常见问题',
  guide: '使用教程',
  service: '在线客服'
}

const HELP_ENTRIES: Array<{ key: Exclude<SheetKey, null>; title: string; icon: string }> = [
  { key: 'faq', title: '常见问题', icon: 'help-circle' },
  { key: 'guide', title: '使用教程', icon: 'book-open' },
  { key: 'service', title: '在线客服', icon: 'message-circle' }
]

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

export default function HelpFeedback() {
  const { requireLogin } = useAuth()

  const [content, setContent] = useState('')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
  const [sheet, setSheet] = useState<SheetKey>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const canSubmit = content.trim().length >= 5 && !submitting

  const loadFeedbacks = useCallback(async (targetPage = 1) => {
    if (targetPage === 1) {
      setLoading(true)
      setLoadError(false)
    } else {
      setLoadingMore(true)
    }
    try {
      const res: any = await feedbackApi.getMyFeedback({ page: targetPage, pageSize: PAGE_SIZE })
      const items: FeedbackItem[] = res?.items ?? []
      setFeedbacks((prev) => (targetPage === 1 ? items : [...prev, ...items]))
      setPage(targetPage)
      setHasMore(Boolean(res?.hasMore))
    } catch {
      if (targetPage === 1) {
        setFeedbacks([])
        setLoadError(true)
      } else {
        Taro.showToast({ title: '加载更多失败，请稍后重试', icon: 'none' })
      }
    } finally {
      if (targetPage === 1) {
        setLoading(false)
      } else {
        setLoadingMore(false)
      }
    }
  }, [])

  useLoad(() => {
    if (!requireLogin()) return
    void loadFeedbacks(1)
  })

  const handleSubmit = async () => {
    const text = content.trim()
    if (submitting) return
    if (text.length < 5) {
      Taro.showToast({ title: '反馈内容至少 5 个字', icon: 'none' })
      return
    }

    setSubmitting(true)
    try {
      await feedbackApi.submitFeedback({ content: text, contact: contact.trim() || undefined })
      Taro.showToast({ title: '提交成功，感谢您的反馈', icon: 'none' })
      setContent('')
      setContact('')
      await loadFeedbacks(1)
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '提交失败，请稍后重试',
        icon: 'none'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const goToForm = () => {
    setSheet(null)
    setTimeout(() => {
      Taro.pageScrollTo({ selector: '#feedback-form', offsetTop: -80, duration: 300 })
    }, 120)
  }

  return (
    <View className='hfeed'>
      <SettingsHeader title='帮助与反馈' />

      <View className='hfeed__body'>
        {/* 帮助入口 */}
        <View className='hfeed__entries'>
          {HELP_ENTRIES.map((entry) => (
            <View
              key={entry.key}
              className='hfeed__entry'
              onClick={() => setSheet(entry.key)}
            >
              <View className='hfeed__entry-icon'>
                <Icon name={entry.icon} size={48} color='#0062FF' strokeWidth={2} />
              </View>
              <Text className='hfeed__entry-label'>{entry.title}</Text>
              <Icon name='chevron-right' size={48} color='#4B5563' strokeWidth={2} />
            </View>
          ))}
        </View>

        {/* 意见反馈表单 */}
        <View className='hfeed__form' id='feedback-form'>
          <Text className='hfeed__form-title'>意见反馈</Text>

          <View className='hfeed__input-box'>
            <Textarea
              className='hfeed__textarea'
              value={content}
              maxlength={MAX_CONTENT}
              placeholder='请输入您的意见或建议（至少 5 个字）'
              placeholderClass='hfeed__placeholder'
              onInput={(e) => setContent(e.detail.value)}
            />
            <Text className='hfeed__counter'>
              {content.length}/{MAX_CONTENT}
            </Text>
          </View>

          <Input
            className='hfeed__contact'
            value={contact}
            maxlength={100}
            placeholder='联系方式（选填，手机号 / 微信）'
            placeholderClass='hfeed__placeholder'
            onInput={(e) => setContact(e.detail.value)}
          />
        </View>

        <View
          className={`hfeed__submit ${canSubmit ? '' : 'hfeed__submit--disabled'}`}
          onClick={() => {
            if (canSubmit) void handleSubmit()
          }}
        >
          <Text className='hfeed__submit-text'>{submitting ? '提交中...' : '提交反馈'}</Text>
        </View>

        {/* 我的反馈 */}
        <View className='hfeed__list'>
          <Text className='hfeed__list-title'>我的反馈</Text>

          {loading && <Text className='hfeed__state'>加载中...</Text>}

          {!loading && loadError && (
            <View className='hfeed__retry' onClick={() => void loadFeedbacks(1)}>
              <Text className='hfeed__retry-text'>加载失败，点击重试</Text>
            </View>
          )}

          {!loading && !loadError && feedbacks.length === 0 && (
            <Text className='hfeed__state'>暂无反馈记录</Text>
          )}

          {!loading &&
            !loadError &&
            feedbacks.map((item) => {
              const meta = STATUS_META[item.status] ?? {
                label: item.status,
                className: 'hfeed__status--default'
              }
              return (
                <View key={item.id} className='hfeed__item'>
                  <View className='hfeed__item-head'>
                    <View className={`hfeed__status ${meta.className}`}>
                      <Text className='hfeed__status-text'>{meta.label}</Text>
                    </View>
                    <Text className='hfeed__item-date'>{formatDate(item.createdAt)}</Text>
                  </View>
                  <Text className='hfeed__item-content'>{item.content}</Text>
                  {item.contact && (
                    <Text className='hfeed__item-contact'>联系方式：{item.contact}</Text>
                  )}
                </View>
              )
            })}

          {!loading && !loadError && hasMore && (
            <View
              className={`hfeed__more ${loadingMore ? 'hfeed__more--disabled' : ''}`}
              onClick={() => {
                if (!loadingMore) void loadFeedbacks(page + 1)
              }}
            >
              <Text className='hfeed__more-text'>{loadingMore ? '加载中...' : '加载更多'}</Text>
            </View>
          )}
        </View>
      </View>

      {sheet && (
        <View className='hfeed__sheet'>
          <View className='hfeed__sheet-mask' onClick={() => setSheet(null)} />
          <View className='hfeed__sheet-panel'>
            <View className='hfeed__sheet-handle-wrap'>
              <View className='hfeed__sheet-handle' />
            </View>
            <View className='hfeed__sheet-header'>
              <Text className='hfeed__sheet-title'>{SHEET_TITLES[sheet]}</Text>
            </View>

            {sheet === 'faq' && (
              <View className='hfeed__sheet-body'>
                {FAQS.map((item) => (
                  <View key={item.q} className='hfeed__faq'>
                    <View className='hfeed__faq-q'>
                      <Text className='hfeed__faq-mark'>问</Text>
                      <Text className='hfeed__faq-q-text'>{item.q}</Text>
                    </View>
                    <Text className='hfeed__faq-a'>{item.a}</Text>
                  </View>
                ))}
              </View>
            )}

            {sheet === 'guide' && (
              <View className='hfeed__sheet-body'>
                {GUIDES.map((item, index) => (
                  <View key={item.title} className='hfeed__guide'>
                    <View className='hfeed__guide-index'>
                      <Text className='hfeed__guide-index-text'>{index + 1}</Text>
                    </View>
                    <View className='hfeed__guide-info'>
                      <Text className='hfeed__guide-title'>{item.title}</Text>
                      <Text className='hfeed__guide-desc'>{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {sheet === 'service' && (
              <View className='hfeed__sheet-body'>
                <Text className='hfeed__service-text'>
                  客服电话暂未开通。请直接提交反馈并留下联系方式，我们会在 1 个工作日内回复你。
                </Text>
                <View className='hfeed__service-tip'>
                  <Text className='hfeed__service-tip-text'>服务时间：工作日 9:00-18:00</Text>
                </View>
              </View>
            )}

            <View className='hfeed__sheet-footer'>
              {sheet === 'service' && (
                <View className='hfeed__sheet-btn' onClick={goToForm}>
                  <Text className='hfeed__sheet-btn-text'>去填写反馈</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  )
}