import { useCallback, useEffect, useRef, useState } from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { API_BASE_URL } from '@/constants/config'
import { homeworkApi } from '@/services'
import { useAuth } from '@/utils'
import './index.scss'

interface Submission {
  id: string
  content: string | null
  attachments: unknown
  status: string
  submitted_at: string
}

interface DelayApplication {
  id: string
  reason: string
  expected_deadline: string
  status: string
  created_at: string
}

interface HomeworkDetailData {
  id: string
  subject: string
  title: string
  content: string | null
  deadline: string
  publisher: { id: string; name: string } | null
  mySubmission: Submission | null
  myDelayApplication: DelayApplication | null
  submissionCount: number
  totalMembers: number
  createdAt: string
}

interface DelayReviewItem {
  id: string
  studentName: string
  reason: string
  expectedDeadline: string
  status: string
  createdAt: string
}

const SUBJECT_STYLE: Record<string, { bg: string; color: string }> = {
  语文: { bg: '#FEF2F2', color: '#DC2626' },
  数学: { bg: '#EFF6FF', color: '#2563EB' },
  英语: { bg: '#F5F3FF', color: '#7C3AED' },
  物理: { bg: '#ECFEFF', color: '#0891B2' },
  化学: { bg: '#F0FDF4', color: '#16A34A' },
  生物: { bg: '#F0FDFA', color: '#0F766E' },
  历史: { bg: '#FFFBEB', color: '#D97706' },
  地理: { bg: '#F0F9FF', color: '#0284C7' },
  政治: { bg: '#FDF2F8', color: '#DB2777' }
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  已提交: { bg: '#F0FDF4', color: '#16A34A' },
  延时审核中: { bg: '#FFFBEB', color: '#D97706' },
  已逾期: { bg: '#FEF2F2', color: '#DC2626' },
  待提交: { bg: '#EFF6FF', color: '#0062FF' },
  进行中: { bg: '#EFF6FF', color: '#0062FF' },
  已截止: { bg: '#F1F5F9', color: '#64748B' }
}

const DELAY_STATUS_TEXT: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回'
}

/** 2月3日 18:00 */
function formatDateTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hours}:${minutes}`
}

/** 剩余/逾期时间 */
function formatRemaining(dateStr: string, now: number): string {
  const diff = new Date(dateStr).getTime() - now
  if (diff <= 0) {
    const days = Math.ceil(-diff / 86400000)
    return days <= 1 ? '已逾期' : `已逾期 ${days} 天`
  }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  if (days > 0) return `剩 ${days} 天 ${hours} 小时`
  if (hours > 0) return `剩 ${hours} 小时 ${minutes} 分`
  return `剩 ${Math.max(1, minutes)} 分钟`
}

function parseAttachments(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === 'string')
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string')
      }
      return [raw]
    } catch {
      return [raw]
    }
  }
  return []
}

/** 拼接文件完整地址（MinIO 返回绝对地址时原样使用） */
function resolveFileUrl(url: string): string {
  if (!url) return ''
  if (/^(https?:)?\/\//i.test(url) || /^data:/i.test(url)) return url
  const apiBase = API_BASE_URL.replace(/\/+$/, '')
  const origin = apiBase.replace(/\/api\/v1$/, '')
  if (url.startsWith('/api/v1/')) return `${origin}${url}`
  return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`
}

export default function HomeworkDetail() {
  const { isCommittee, requireLogin } = useAuth()

  const paramsRef = useRef({ classId: '', homeworkId: '' })
  const [data, setData] = useState<HomeworkDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  const [delayList, setDelayList] = useState<DelayReviewItem[]>([])
  const [reviewingId, setReviewingId] = useState('')
  const [showProcessed, setShowProcessed] = useState(false)

  const isManager = isCommittee

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  const load = useCallback(async () => {
    const { classId, homeworkId } = paramsRef.current
    if (!classId || !homeworkId) {
      setLoading(false)
      setData(null)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = (await homeworkApi.getDetail(classId, homeworkId)) as HomeworkDetailData
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : '作业加载失败')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDelays = useCallback(async () => {
    const { classId, homeworkId } = paramsRef.current
    if (!classId || !homeworkId) return
    try {
      const list = (await homeworkApi.getDelays(classId, homeworkId)) as DelayReviewItem[]
      setDelayList(list || [])
    } catch {
      setDelayList([])
    }
  }, [])

  useLoad((o) => {
    if (!requireLogin()) return
    paramsRef.current.classId = (o?.classId as string) || ''
    paramsRef.current.homeworkId = (o?.homeworkId as string) || ''
    load()
  })

  const firstShowRef = useRef(true)
  useDidShow(() => {
    if (firstShowRef.current) {
      firstShowRef.current = false
      return
    }
    load()
    if (isManager) loadDelays()
  })

  useEffect(() => {
    if (isManager) loadDelays()
  }, [isManager, loadDelays])

  const handleReview = async (applicationId: string, status: 'approved' | 'rejected') => {
    const { classId, homeworkId } = paramsRef.current
    if (!classId || !homeworkId || reviewingId) return
    setReviewingId(applicationId)
    try {
      await homeworkApi.reviewDelay(classId, homeworkId, applicationId, status)
      Taro.showToast({
        title: status === 'approved' ? '已通过延时申请' : '已驳回延时申请',
        icon: 'success'
      })
      loadDelays()
    } catch (e) {
      Taro.showToast({
        title: e instanceof Error ? e.message : '操作失败，请重试',
        icon: 'none'
      })
    } finally {
      setReviewingId('')
    }
  }

  const goSubmit = () => {
    const { classId, homeworkId } = paramsRef.current
    Taro.navigateTo({
      url: `/pages-sub/homework/submit/index?classId=${classId}&homeworkId=${homeworkId}`
    })
  }

  const goDelayApply = () => {
    const { classId, homeworkId } = paramsRef.current
    Taro.navigateTo({
      url: `/pages-sub/homework/delay-apply/index?classId=${classId}&homeworkId=${homeworkId}`
    })
  }

  const goOfflineCheck = () => {
    Taro.navigateTo({
      url: `/pages-sub/homework/offline-check/index?classId=${paramsRef.current.classId}`
    })
  }

  const previewAttachment = (index: number) => {
    const urls = attachments.map(resolveFileUrl).filter(Boolean)
    if (!urls.length) return
    Taro.previewImage({ current: urls[index], urls })
  }

  const delayStatus = data?.myDelayApplication?.status
  /** 延时通过后以新截止时间为准 */
  const effectiveDeadline =
    delayStatus === 'approved' && data?.myDelayApplication
      ? data.myDelayApplication.expected_deadline
      : data?.deadline || ''

  const overdue = data ? now > new Date(effectiveDeadline).getTime() : false
  const canSubmit = Boolean(data) && !overdue
  const canApplyDelay =
    Boolean(data) &&
    !data?.mySubmission &&
    delayStatus !== 'pending' &&
    !(delayStatus === 'approved' && !overdue)

  const myStatus = (() => {
    if (!data) return ''
    if (isManager) return overdue ? '已截止' : '进行中'
    if (data.mySubmission) return '已提交'
    if (delayStatus === 'pending') return '延时审核中'
    return overdue ? '已逾期' : '待提交'
  })()

  const statusStyle = STATUS_STYLE[myStatus] || STATUS_STYLE['待提交']

  const timeProgress = (() => {
    if (!data) return { ratio: 0, color: '#0062FF' }
    const start = new Date(data.createdAt).getTime()
    const end = new Date(effectiveDeadline).getTime()
    const total = end - start
    const ratio = total > 0 ? Math.min(1, Math.max(0, (end - now) / total)) : 0
    const color = ratio > 0.5 ? '#0062FF' : ratio > 0.2 ? '#F59E0B' : '#EF4444'
    return { ratio, color }
  })()

  const attachments = parseAttachments(data?.mySubmission?.attachments)
  const submitPercent = data?.totalMembers
    ? Math.min(100, Math.round(((data.submissionCount || 0) / data.totalMembers) * 100))
    : 0
  const pendingDelays = delayList.filter((item) => item.status === 'pending')
  const processedDelays = delayList.filter((item) => item.status !== 'pending')

  const remainingText =
    myStatus === '已提交'
      ? '已完成'
      : myStatus === '延时审核中' && !overdue
        ? '审核中'
        : formatRemaining(effectiveDeadline, now)

  const bodyClass = isManager
    ? ''
    : canApplyDelay
      ? 'hwdtl__body--bar-double'
      : 'hwdtl__body--bar'

  if (loading) {
    return (
      <View className='hwdtl'>
        <PageHeader title='作业详情' variant='a' />
        <View className='hwdtl__body'>
          <View className='hwdtl__skeleton hwdtl__skeleton--head' />
          <View className='hwdtl__skeleton hwdtl__skeleton--body' />
        </View>
      </View>
    )
  }

  if (error || !data) {
    return (
      <View className='hwdtl'>
        <PageHeader title='作业详情' variant='a' />
        <View className='hwdtl__error'>
          <Icon name='alert-circle' size={80} color='#EF4444' className='hwdtl__error-icon' />
          <Text className='hwdtl__error-text'>{error || '作业不存在'}</Text>
          <View className='hwdtl__error-btn' onClick={load}>
            <Icon name='refresh' size={28} color='#334155' />
            <Text className='hwdtl__error-btn-text'>重新加载</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='hwdtl'>
      <PageHeader title='作业详情' variant='a' />

      <View className={`hwdtl__body ${bodyClass}`}>
        {/* 头部信息卡 */}
        <View className='hwdtl__card'>
          <View className='hwdtl__row-between'>
            <Text
              className='hwdtl__subject'
              style={{
                backgroundColor:
                  SUBJECT_STYLE[data.subject]?.bg ?? '#F1F5F9',
                color: SUBJECT_STYLE[data.subject]?.color ?? '#475569'
              }}
            >
              {data.subject}
            </Text>
            <Text
              className='hwdtl__status'
              style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
            >
              {myStatus}
            </Text>
          </View>

          <Text className='hwdtl__title'>{data.title}</Text>
          <Text className='hwdtl__publisher'>
            {data.publisher?.name || '班委'} 发布 · {formatDateTime(data.createdAt)}
          </Text>

          <View className='hwdtl__deadline'>
            <View className='hwdtl__deadline-row'>
              <View className='hwdtl__deadline-left'>
                <Icon name='clock' size={28} color='#94A3B8' />
                <Text className='hwdtl__deadline-label'>
                  {delayStatus === 'approved' ? '已延时至 ' : '截止 '}
                  {formatDateTime(effectiveDeadline)}
                </Text>
              </View>
              <Text
                className='hwdtl__deadline-remaining'
                style={{ color: overdue ? '#DC2626' : timeProgress.color }}
              >
                {remainingText}
              </Text>
            </View>
            <View className='hwdtl__progress'>
              <View
                className='hwdtl__progress-fill'
                style={{
                  width: `${Math.round(timeProgress.ratio * 100)}%`,
                  backgroundColor: overdue ? '#DC2626' : timeProgress.color
                }}
              />
            </View>
          </View>
        </View>

        {/* 作业内容 */}
        <View className='hwdtl__card'>
          <View className='hwdtl__section-head'>
            <Icon name='file-text' size={32} color='#0062FF' />
            <Text className='hwdtl__section-title'>作业内容</Text>
          </View>
          <Text className='hwdtl__content'>
            {data.content?.trim() || '暂无详细说明'}
          </Text>
        </View>

        {isManager ? (
          <View className='hwdtl__card'>
            <View className='hwdtl__row-between'>
              <View className='hwdtl__section-head'>
                <Icon name='users' size={32} color='#0062FF' />
                <Text className='hwdtl__section-title'>班级完成情况</Text>
              </View>
              <Text className='hwdtl__count'>
                {data.submissionCount || 0}/{data.totalMembers || 0}
              </Text>
            </View>

            <View className='hwdtl__progress hwdtl__progress--tall'>
              <View
                className='hwdtl__progress-fill'
                style={{
                  width: `${submitPercent}%`,
                  backgroundColor: submitPercent === 100 ? '#16A34A' : '#0062FF'
                }}
              />
            </View>
            <View className='hwdtl__progress-meta'>
              <Text className='hwdtl__muted'>未交 {Math.max(0, (data.totalMembers || 0) - (data.submissionCount || 0))} 人</Text>
              <Text className='hwdtl__muted'>{submitPercent}%</Text>
            </View>

            <View className='hwdtl__offline-btn' onClick={goOfflineCheck}>
              <Icon name='clipboard-check' size={32} color='#0062FF' />
              <Text className='hwdtl__offline-btn-text'>离线核对提交情况</Text>
            </View>

            <View className='hwdtl__divider' />

            <View className='hwdtl__row-between'>
              <View className='hwdtl__section-head'>
                <Icon name='timer' size={32} color='#F59E0B' />
                <Text className='hwdtl__section-title'>延时申请</Text>
              </View>
              {pendingDelays.length > 0 ? (
                <Text className='hwdtl__pending-badge'>待审批 {pendingDelays.length}</Text>
              ) : (
                <Text className='hwdtl__muted'>共 {delayList.length} 条</Text>
              )}
            </View>

            {delayList.length === 0 ? (
              <Text className='hwdtl__empty'>暂无延时申请</Text>
            ) : (
              <View className='hwdtl__delay-list'>
                {pendingDelays.map((item) => (
                  <View key={item.id} className='hwdtl__delay-item'>
                    <View className='hwdtl__row-between'>
                      <Text className='hwdtl__delay-name'>{item.studentName}</Text>
                      <Text className='hwdtl__delay-deadline'>
                        申请延至 {formatDateTime(item.expectedDeadline)}
                      </Text>
                    </View>
                    <Text className='hwdtl__delay-reason'>{item.reason}</Text>
                    <View className='hwdtl__delay-actions'>
                      <View
                        className={`hwdtl__delay-btn hwdtl__delay-btn--reject ${
                          reviewingId ? 'hwdtl__delay-btn--disabled' : ''
                        }`}
                        onClick={() => handleReview(item.id, 'rejected')}
                      >
                        <Text className='hwdtl__delay-btn-text hwdtl__delay-btn-text--reject'>驳回</Text>
                      </View>
                      <View
                        className={`hwdtl__delay-btn hwdtl__delay-btn--approve ${
                          reviewingId ? 'hwdtl__delay-btn--disabled' : ''
                        }`}
                        onClick={() => handleReview(item.id, 'approved')}
                      >
                        <Text className='hwdtl__delay-btn-text'>通过</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {processedDelays.length > 0 ? (
              <View
                className='hwdtl__delay-toggle'
                onClick={() => setShowProcessed((v) => !v)}
              >
                <Text className='hwdtl__delay-toggle-text'>已处理 {processedDelays.length} 条</Text>
                <Icon
                  name='chevron-down'
                  size={28}
                  color='#94A3B8'
                  className={`hwdtl__delay-toggle-icon ${
                    showProcessed ? 'hwdtl__delay-toggle-icon--open' : ''
                  }`}
                />
              </View>
            ) : null}

            {showProcessed && processedDelays.length > 0 ? (
              <View className='hwdtl__processed-list'>
                {processedDelays.map((item) => (
                  <View key={item.id} className='hwdtl__processed-item'>
                    <View className='hwdtl__processed-left'>
                      <Text className='hwdtl__processed-name'>{item.studentName}</Text>
                      <Text className='hwdtl__processed-deadline'>
                        申请延至 {formatDateTime(item.expectedDeadline)}
                      </Text>
                    </View>
                    <Text
                      className='hwdtl__processed-status'
                      style={{
                        backgroundColor: item.status === 'approved' ? '#F0FDF4' : '#F1F5F9',
                        color: item.status === 'approved' ? '#16A34A' : '#64748B'
                      }}
                    >
                      {DELAY_STATUS_TEXT[item.status] || item.status}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 我的提交 */}
        {data.mySubmission ? (
          <View className='hwdtl__card'>
            <View className='hwdtl__row-between hwdtl__submission-head'>
              <View className='hwdtl__section-head'>
                <Icon name='check-circle' size={32} color='#22C55E' />
                <Text className='hwdtl__section-title'>我的提交</Text>
              </View>
              <Text className='hwdtl__submitted-badge'>已提交</Text>
            </View>

            {data.mySubmission.content ? (
              <Text className='hwdtl__submission-content'>{data.mySubmission.content}</Text>
            ) : null}

            {attachments.length > 0 ? (
              <View className='hwdtl__attachments'>
                {attachments.map((url, index) => (
                  <View
                    key={`${url}-${index}`}
                    className='hwdtl__attach'
                    onClick={() => previewAttachment(index)}
                  >
                    <Image className='hwdtl__attach-img' src={resolveFileUrl(url)} mode='aspectFill' />
                  </View>
                ))}
              </View>
            ) : null}

            <View className='hwdtl__submitted-at'>
              <Icon name='clock' size={28} color='#94A3B8' />
              <Text className='hwdtl__muted'>提交于 {formatDateTime(data.mySubmission.submitted_at)}</Text>
            </View>
          </View>
        ) : (
          <View className='hwdtl__card'>
            <View className='hwdtl__section-head'>
              <Icon name='paperclip' size={32} color='#94A3B8' />
              <Text className='hwdtl__section-title'>尚未提交</Text>
            </View>
            <Text className='hwdtl__hint'>
              {overdue ? '作业已截止，可申请延时后补交' : '请在截止时间前完成提交'}
            </Text>
          </View>
        )}

        {/* 我的延时申请 */}
        {data.myDelayApplication ? (
          <View className='hwdtl__card'>
            <View className='hwdtl__my-delay-head'>
              <View className='hwdtl__section-head'>
                <Icon name='timer' size={32} color='#F59E0B' />
                <Text className='hwdtl__section-title'>我的延时申请</Text>
              </View>
              <Text
                className='hwdtl__my-delay-status'
                style={
                  data.myDelayApplication.status === 'approved'
                    ? { backgroundColor: '#F0FDF4', color: '#16A34A' }
                    : data.myDelayApplication.status === 'rejected'
                      ? { backgroundColor: '#F1F5F9', color: '#64748B' }
                      : { backgroundColor: '#FFFBEB', color: '#D97706' }
                }
              >
                {DELAY_STATUS_TEXT[data.myDelayApplication.status] || data.myDelayApplication.status}
              </Text>
            </View>
            <Text className='hwdtl__my-delay-text'>
              申请延至 {formatDateTime(data.myDelayApplication.expected_deadline)}
            </Text>
            {data.myDelayApplication.reason ? (
              <Text className='hwdtl__my-delay-reason'>原因：{data.myDelayApplication.reason}</Text>
            ) : null}
            {data.myDelayApplication.status === 'pending' ? (
              <View className='hwdtl__my-delay-note hwdtl__my-delay-note--pending'>
                <Text>等待班委审批，审批通过后将按新的截止时间提交</Text>
              </View>
            ) : null}
            {data.myDelayApplication.status === 'rejected' ? (
              <View className='hwdtl__my-delay-note'>
                <Text>申请未通过，可在下方重新申请</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* 学生底部操作栏 */}
      {!isManager ? (
        <View className='hwdtl__footer'>
          {canSubmit ? (
            <View className='hwdtl__btn-primary' onClick={goSubmit}>
              <Icon name='send' size={32} color='#FFFFFF' />
              <Text className='hwdtl__btn-primary-text'>
                {data.mySubmission ? '重新提交' : '去提交作业'}
              </Text>
            </View>
          ) : (
            <View className='hwdtl__btn-disabled'>
              <Icon name='clock' size={32} color='#94A3B8' />
              <Text className='hwdtl__btn-disabled-text'>作业已截止</Text>
            </View>
          )}
          {canApplyDelay ? (
            <View className='hwdtl__btn-delay' onClick={goDelayApply}>
              <Icon name='timer' size={32} color='#475569' />
              <Text className='hwdtl__btn-delay-text'>
                {overdue ? '申请延时补交' : '需要更多时间？申请延时'}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}