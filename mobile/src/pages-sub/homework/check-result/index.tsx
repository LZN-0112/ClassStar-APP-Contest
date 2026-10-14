import { useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, Tabs, StatCard, Tag, Modal, ListEmpty, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import { homeworkApi } from '@/services'
import { useAuth } from '@/utils'
import { copyText } from '@/utils/native'
import './index.scss'

interface StudentItem {
  userId?: string
  studentId: string
  name: string
}

interface CheckResultData {
  checkId?: string
  totalCount?: number
  submittedCount?: number
  unmatchedCount?: number
  submittedList?: StudentItem[]
  unsubmittedList?: StudentItem[]
  unmatchedList?: string[]
}

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'submitted', label: '已交' },
  { key: 'unsubmitted', label: '未交' }
]

export default function CheckResult() {
  const { requireAuth, requireLogin } = useAuth()

  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [data, setData] = useState<CheckResultData | null>(null)
  const [detail, setDetail] = useState<StudentItem & { status: string } | null>(null)

  const paramsRef = { classId: '', homeworkId: '', homeworkTitle: '', checkId: '' }

  useLoad((o) => {
    if (!requireLogin()) return
    if (!requireAuth('committee')) return
    paramsRef.classId = (o?.classId as string) || ''
    paramsRef.homeworkId = (o?.homeworkId as string) || ''
    paramsRef.homeworkTitle = (o?.homeworkTitle as string) || ''
    paramsRef.checkId = (o?.checkId as string) || ''
    parseResult(o?.result as string)
  })

  const parseResult = (raw?: string) => {
    if (raw) {
      try {
        const parsed = JSON.parse(decodeURIComponent(raw))
        setData(normalize(parsed))
        setLoading(false)
        return
      } catch {
        // 解析失败走接口兜底
      }
    }
    // 无 result 参数时，尝试用 checkId 查询
    if (paramsRef.checkId) {
      fetchByCheckId()
    } else {
      setLoading(false)
      setData(null)
    }
  }

  const fetchByCheckId = async () => {
    if (!paramsRef.classId || !paramsRef.checkId) {
      setLoading(false)
      setData(null)
      return
    }
    setLoading(true)
    try {
      const res: any = await homeworkApi.getCheckResult(paramsRef.classId, paramsRef.checkId)
      const d: any = res?.data ?? res
      setData(normalize(d))
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const normalize = (raw: any): CheckResultData => {
    return {
      checkId: raw?.checkId,
      totalCount: Number(raw?.totalCount) || 0,
      submittedCount: Number(raw?.submittedCount) || (raw?.submittedList?.length ?? 0),
      unmatchedCount: Number(raw?.unmatchedCount) || (raw?.unmatchedList?.length ?? 0),
      submittedList: raw?.submittedList || [],
      unsubmittedList: raw?.unsubmittedList || [],
      unmatchedList: raw?.unmatchedList || []
    }
  }

  const submitted = data?.submittedList || []
  const unsubmitted = data?.unsubmittedList || []
  const unmatched = data?.unmatchedList || []

  const displayList = (() => {
    if (filter === 'submitted') return submitted.map((s) => ({ ...s, status: 'submitted' }))
    if (filter === 'unsubmitted') return unsubmitted.map((s) => ({ ...s, status: 'unsubmitted' }))
    return [
      ...submitted.map((s) => ({ ...s, status: 'submitted' })),
      ...unsubmitted.map((s) => ({ ...s, status: 'unsubmitted' }))
    ]
  })()

  const handleExport = () => {
    if (unsubmitted.length === 0) {
      Taro.showToast({ title: '暂无未交名单', icon: 'none' })
      return
    }
    const csv = ['学号,姓名', ...unsubmitted.map((m) => `${m.studentId || '-'},${m.name}`)].join('\n')
    copyText(csv)
  }

  const openDetail = (item: StudentItem & { status: string }) => {
    setDetail(item)
  }

  return (
    <View className='hwcr'>
      <NavBar
        title='核对结果'
        right={
          <View className='hwcr__export' onClick={handleExport}>
            <Icon name='download' size={32} color='#0062FF' strokeWidth={2} />
          </View>
        }
      />

      <ScrollView className='hwcr__scroll' scrollY>
        {loading ? (
          <View className='hwcr__body'>
            <ListLoading rows={4} />
          </View>
        ) : !data ? (
          <View className='hwcr__empty'>
            <ListEmpty icon='file-check' text='暂无核对结果' />
            <Text className='hwcr__empty-tip'>请通过作业核对功能进行操作</Text>
          </View>
        ) : (
          <View className='hwcr__body'>
            {/* 数据概览 */}
            <View className='hwcr__stats'>
              <StatCard icon='users' value={data.totalCount ?? 0} label='应交人数' color='#0062FF' />
              <StatCard icon='check-circle' value={data.submittedCount ?? 0} label='已交人数' color='#22C55E' />
              <StatCard icon='alert-circle' value={unsubmitted.length} label='未交人数' color='#EF4444' />
            </View>

            {/* 未匹配学号 */}
            {unmatched.length > 0 ? (
              <View className='hwcr__section'>
                <Text className='hwcr__section-title hwcr__section-title--warn'>无法匹配的学号（{unmatched.length} 个）</Text>
                <View className='hwcr__unmatched'>
                  {unmatched.map((id) => (
                    <Text key={id} className='hwcr__unmatched-chip'>{id}</Text>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Tabs 筛选 */}
            <View className='hwcr__tabs'>
              <Tabs tabs={TABS} activeKey={filter} onChange={setFilter} />
            </View>

            {/* 名单列表 */}
            <View className='hwcr__section'>
              {displayList.length === 0 ? (
                <ListEmpty icon='users' text='暂无成员' />
              ) : (
                <View className='hwcr__list'>
                  {displayList.map((item, idx) => (
                    <View key={`${item.userId || item.studentId}-${idx}`} className='hwcr__item' onClick={() => openDetail(item)}>
                      <View className={`hwcr__item-avatar ${item.status === 'unsubmitted' ? 'hwcr__item-avatar--off' : ''}`}>
                        <Text className='hwcr__item-avatar-text'>{(item.name || '?').charAt(0)}</Text>
                      </View>
                      <View className='hwcr__item-info'>
                        <Text className='hwcr__item-name'>{item.name}</Text>
                        <Text className='hwcr__item-sid'>{item.studentId || '-'}</Text>
                      </View>
                      {item.status === 'submitted' ? (
                        <Tag text='已交' color='success' />
                      ) : (
                        <Tag text='未交' color='danger' />
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 详情 Modal */}
      <Modal visible={!!detail} title='核对详情' onClose={() => setDetail(null)} position='bottom'>
        {detail ? (
          <View className='hwcr__detail'>
            <View className='hwcr__detail-row'>
              <Text className='hwcr__detail-label'>姓名</Text>
              <Text className='hwcr__detail-value'>{detail.name}</Text>
            </View>
            <View className='hwcr__detail-row'>
              <Text className='hwcr__detail-label'>学号</Text>
              <Text className='hwcr__detail-value'>{detail.studentId || '-'}</Text>
            </View>
            <View className='hwcr__detail-row'>
              <Text className='hwcr__detail-label'>核对状态</Text>
              {detail.status === 'submitted' ? <Tag text='已交' color='success' /> : <Tag text='未交' color='danger' />}
            </View>
          </View>
        ) : null}
      </Modal>
    </View>
  )
}