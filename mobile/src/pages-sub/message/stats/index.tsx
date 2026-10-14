import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import { messageApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

type AckTab = 'signed' | 'unsigned'

interface AckMember {
  userId: string
  name: string
  studentId?: string
  overdue?: boolean
}

interface StatsData {
  total: number
  ackedCount: number
  unackedCount: number
  ackedList: AckMember[]
  unackedList: AckMember[]
  ackDeadline?: string
}

function formatDateTime(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function MessageStats() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireAuth } = useAuth()

  const [activeTab, setActiveTab] = useState<AckTab>('unsigned')
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [reminding, setReminding] = useState(false)

  const messageIdRef = { id: '' }

  useLoad((options) => {
    if (!requireAuth('committee')) {
      setTimeout(() => Taro.navigateBack(), 1500)
      return
    }
    const messageId = options?.messageId as string
    if (!messageId) {
      Taro.showToast({ title: '通知ID缺失', icon: 'none' })
      Taro.navigateBack()
      return
    }
    messageIdRef.id = messageId

    const load = async () => {
      if (!currentClassId) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const res: any = await messageApi.getAcks(currentClassId, messageId)
        const raw = res || {}
        const num = (v: any) => Number(v) || 0
        setStats({
          total: num(raw.total) || num(raw.ackedCount) + num(raw.unackedCount),
          ackedCount: num(raw.ackedCount) || num(raw.acked),
          unackedCount: num(raw.unackedCount) || num(raw.unacked),
          ackedList: raw.ackedList || raw.ackList || [],
          unackedList: raw.unackedList || raw.unackedMembers || [],
          ackDeadline: raw.ackDeadline
        })
      } catch {
        Taro.showToast({ title: '获取签收统计失败', icon: 'none' })
      } finally {
        setLoading(false)
      }
    }
    load()
  })

  const displayList =
    activeTab === 'signed' ? stats?.ackedList || [] : stats?.unackedList || []

  const handleRemind = async () => {
    if (!stats || stats.unackedCount === 0 || !currentClassId || reminding) return
    setReminding(true)
    try {
      await messageApi.remind(currentClassId, messageIdRef.id, {
        remindAfterMinutes: 30
      })
      Taro.showToast({
        title: `已推送提醒给 ${stats.unackedCount} 位未签收同学`,
        icon: 'none'
      })
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '提醒失败',
        icon: 'none'
      })
    } finally {
      setReminding(false)
    }
  }

  const handleExport = async () => {
    if (!stats) return
    const rows = [
      ['学号', '姓名', '状态'],
      ...stats.ackedList.map((m) => [m.studentId || '', m.name, '已签收']),
      ...stats.unackedList.map((m) => [m.studentId || '', m.name, '未签收'])
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    try {
      const fs = Taro.getFileSystemManager()
      const filePath = `${Taro.env.USER_DATA_PATH}/签收名单.csv`
      fs.writeFileSync(filePath, `\ufeff${csv}`, 'utf8')
      await Taro.openDocument({ filePath })
    } catch {
      try {
        const fs = Taro.getFileSystemManager()
        const filePath = `${Taro.env.USER_DATA_PATH}/签收名单.csv`
        fs.writeFileSync(filePath, `\ufeff${csv}`, 'utf8')
        await Taro.saveFile({ tempFilePath: filePath, filePath })
        Taro.showToast({ title: '名单已导出', icon: 'success' })
      } catch {
        Taro.showToast({ title: '导出失败', icon: 'none' })
      }
    }
  }

  return (
    <View className='msgstats'>
      <NavBar title='通知统计' />

      <View className='msgstats__body'>
        {loading ? (
          <ListLoading rows={4} />
        ) : !stats ? (
          <ListEmpty icon='bell' text='暂无统计数据' />
        ) : (
          <>
            <Text className='msgstats__desc'>通知签收情况</Text>
            {stats.ackDeadline ? (
              <Text className='msgstats__deadline'>
                签收截止：{formatDateTime(stats.ackDeadline)}
              </Text>
            ) : null}

            <View className='msgstats__cards'>
              <View className='msgstats__card'>
                <Icon name='users' size={36} color='#0062FF' />
                <Text className='msgstats__num'>{stats.total}</Text>
                <Text className='msgstats__label'>总人数</Text>
              </View>
              <View className='msgstats__card'>
                <Icon name='check-circle' size={36} color='#22C55E' />
                <Text className='msgstats__num'>{stats.ackedCount}</Text>
                <Text className='msgstats__label'>已签收</Text>
              </View>
              <View className='msgstats__card'>
                <Icon name='alert-circle' size={36} color='#EF4444' />
                <Text className='msgstats__num'>{stats.unackedCount}</Text>
                <Text className='msgstats__label'>未签收</Text>
              </View>
            </View>

            <View className='msgstats__tabs'>
              <View
                className={`msgstats__tab-item ${
                  activeTab === 'signed' ? 'msgstats__tab-item--active' : ''
                }`}
                onClick={() => setActiveTab('signed')}
              >
                <Text className='msgstats__tab-text'>已签收 ({stats.ackedCount})</Text>
              </View>
              <View
                className={`msgstats__tab-item ${
                  activeTab === 'unsigned' ? 'msgstats__tab-item--active' : ''
                }`}
                onClick={() => setActiveTab('unsigned')}
              >
                <Text className='msgstats__tab-text'>未签收 ({stats.unackedCount})</Text>
              </View>
            </View>

            <View className='msgstats__list'>
              {displayList.length === 0 ? (
                <ListEmpty text='暂无人员' icon='users' />
              ) : (
                displayList.map((m) => (
                  <View className='msgstats__member' key={m.userId}>
                    <View className='msgstats__avatar'>
                      <Text className='msgstats__avatar-text'>
                        {(m.name || '?').charAt(0)}
                      </Text>
                    </View>
                    <View className='msgstats__member-info'>
                      <View className='msgstats__member-top'>
                        <Text className='msgstats__member-name'>{m.name}</Text>
                        {activeTab === 'unsigned' && m.overdue ? (
                          <View className='msgstats__overdue-tag'>
                            <Text className='msgstats__overdue-text'>已逾期</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className='msgstats__member-id'>{m.studentId || '-'}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View className='msgstats__actions'>
              <View
                className={`msgstats__btn msgstats__btn--primary ${
                  stats.unackedCount === 0 ? 'msgstats__btn--disabled' : ''
                }`}
                onClick={handleRemind}
              >
                <Text className='msgstats__btn-text'>
                  {reminding ? '提醒中...' : '一键提醒未签收'}
                </Text>
              </View>
              <View className='msgstats__btn msgstats__btn--ghost' onClick={handleExport}>
                <Text className='msgstats__btn-text--blue'>导出签收名单</Text>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  )
}