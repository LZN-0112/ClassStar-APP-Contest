import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh } from '@tarojs/taro'

import { NavBar, ListLoading, ListEmpty, Tag } from '@/components/business'
import type { TagColor } from '@/components/business'
import { Icon } from '@/components/ui'
import type { ErrorLogItem } from '@/services/class-settings'
import { classSettingsApi } from '@/services'
import { useAuth } from '@/utils'
import './index.scss'

const PAGE_SIZE = 20

interface DashboardStats {
  total: number
  today: number
  resolved: number
}

const STATUS_CONFIG: Record<string, { label: string; color: TagColor }> = {
  new: { label: '待处理', color: 'danger' },
  processing: { label: '处理中', color: 'warning' },
  resolved: { label: '已解决', color: 'success' },
  closed: { label: '已关闭', color: 'default' }
}

function getStatusConf(status?: string) {
  return STATUS_CONFIG[status || 'new'] || STATUS_CONFIG['new']
}

function formatTime(dateStr?: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 从看板数据中安全提取统计 */
function parseDashboard(dash: any): DashboardStats {
  let resolved = 0
  if (Array.isArray(dash?.statusBreakdown)) {
    resolved = dash.statusBreakdown
      .filter((b: any) => b?.status === 'resolved' || b?.status === 'closed')
      .reduce((s: number, b: any) => s + Number(b?.count ?? 0), 0)
  }
  return {
    total: Number(dash?.total) || 0,
    today: Number(dash?.todayCount) || 0,
    resolved
  }
}

export default function ErrorDashboard() {
  const { requireAuth } = useAuth()

  const [stats, setStats] = useState<DashboardStats>({ total: 0, today: 0, resolved: 0 })
  const [logs, setLogs] = useState<ErrorLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [dash, listRes] = await Promise.all([
        classSettingsApi.getErrorDashboard(),
        classSettingsApi.getErrorLogs({ page, pageSize: PAGE_SIZE })
      ])
      const list = Array.isArray(listRes) ? listRes : listRes?.list || []
      const listTotal = Number(listRes?.total) || list.length
      const parsed = parseDashboard(dash)
      setStats({
        total: parsed.total > 0 ? parsed.total : listTotal,
        today: parsed.today,
        resolved: parsed.resolved
      })
      setLogs(list)
      setTotal(listTotal)
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '获取错误数据失败', icon: 'none' })
      setLogs([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useLoad(() => {
    if (!requireAuth('admin')) return
    fetchData()
  })

  usePullDownRefresh(() => {
    fetchData().finally(() => Taro.stopPullDownRefresh())
  })

  const changePage = (next: number) => {
    setPage(Math.max(1, Math.min(Math.ceil(total / PAGE_SIZE) || 1, next)))
  }

  const showDetail = (item: ErrorLogItem) => {
    const status = getStatusConf(item.status)
    Taro.showModal({
      title: item.errorType || '错误详情',
      content: `错误类型：${item.errorType || '-'}\n状态：${status.label}\n时间：${formatTime(item.createdAt)}\n\n${item.message || '无详细信息'}`,
      showCancel: false,
      confirmText: '知道了'
    })
  }

  const markResolved = async (item: ErrorLogItem) => {
    try {
      await classSettingsApi.updateErrorLogStatus(item.id, 'resolved')
      Taro.showToast({ title: '已标记为解决', icon: 'success' })
      await fetchData()
    } catch (err: any) {
      Taro.showToast({ title: err?.message || '操作失败', icon: 'none' })
    }
  }

  const statCards = [
    { icon: 'alert-circle', label: '错误总数', value: stats.total, color: '#DC2626' },
    { icon: 'bar-chart', label: '今日错误', value: stats.today, color: '#0062FF' },
    { icon: 'check-circle', label: '已解决', value: stats.resolved, color: '#059669' }
  ]

  return (
    <View className='edash'>
      <NavBar title='错误看板' />
      <View className='edash__body'>
        {/* 统计卡片 */}
        <View className='edash__stats'>
          {statCards.map((s) => (
            <View className='edash__stat' key={s.label}>
              <View className='edash__stat-icon' style={{ backgroundColor: `${s.color}1a` }}>
                <Icon name={s.icon} size={40} color={s.color} strokeWidth={2} />
              </View>
              <Text className='edash__stat-value' style={{ color: s.color }}>
                {s.value}
              </Text>
              <Text className='edash__stat-label'>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* 日志列表 */}
        <View className='edash__list-head'>
          <Text className='edash__list-title'>错误日志 ({total})</Text>
        </View>

        {loading ? (
          <ListLoading rows={5} />
        ) : logs.length === 0 ? (
          <ListEmpty icon='check-circle' text='暂无错误日志' />
        ) : (
          logs.map((item) => {
            const status = getStatusConf(item.status)
            const resolved = item.status === 'resolved'
            return (
              <View
                key={item.id}
                className='edash__item'
                onClick={() => showDetail(item)}
              >
                <View className='edash__item-head'>
                  <Tag text={item.errorType || '未知错误'} color='primary' type='outline' />
                  <Tag text={status.label} color={status.color} />
                </View>
                <Text className='edash__item-msg'>{item.message || '无错误信息'}</Text>
                <View className='edash__item-foot'>
                  <View className='edash__item-time'>
                    <Icon name='clock' size={28} color='#9CA3AF' strokeWidth={2} />
                    <Text>{formatTime(item.createdAt)}</Text>
                  </View>
                  {!resolved && (
                    <Text
                      className='edash__item-action'
                      onClick={(e) => {
                        e.stopPropagation()
                        markResolved(item)
                      }}
                    >
                      标记已解决
                    </Text>
                  )}
                </View>
              </View>
            )
          })
        )}

        {/* 分页 */}
        {total > PAGE_SIZE && (
          <View className='edash__pager'>
            <Text className={`edash__pager-btn ${page <= 1 ? 'edash__pager-btn--disabled' : ''}`} onClick={() => changePage(page - 1)}>
              上一页
            </Text>
            <Text className='edash__pager-info'>
              {page} / {Math.ceil(total / PAGE_SIZE) || 1}
            </Text>
            <Text
              className={`edash__pager-btn ${page >= Math.ceil(total / PAGE_SIZE) ? 'edash__pager-btn--disabled' : ''}`}
              onClick={() => changePage(page + 1)}
            >
              下一页
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}