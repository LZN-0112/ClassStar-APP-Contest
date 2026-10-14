import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useDidShow, usePullDownRefresh } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import { archiveApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface RankItem {
  name: string
  count: number
  type: 'archive' | 'file'
  sub?: string
}

function toRank(name: string, count: any, type: RankItem['type'], sub = ''): RankItem | null {
  if (!name) return null
  return { name, count: Number(count) || 0, type, sub }
}

export default function DownloadStats() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireAuth } = useAuth()

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<RankItem[]>([])

  const fetchData = async () => {
    if (!currentClassId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const combined: RankItem[] = []
      const dashboard: any = await archiveApi.getDashboard(currentClassId).catch(() => null)

      if (dashboard) {
        // 看板下钻下载排行（兼容多种字段形状）
        const rawStats: any =
          dashboard.downloadStats ||
          dashboard.downloadStatsList ||
          dashboard.downloadRanking ||
          dashboard.topDownloads ||
          []
        if (Array.isArray(rawStats)) {
          rawStats.forEach((it: any) => {
            if (!it) return
            const name =
              it.fileName || it.name || it.title || it.archiveName || it.archiveTitle || ''
            const count = it.downloadCount ?? it.count ?? it.total ?? 0
            const r = toRank(name, count, 'file', it.type || '')
            if (r) combined.push(r)
          })
        }
      }

      // 由档案列表补充档案级下载次数
      const archives: any = await archiveApi
        .getClassArchive(currentClassId)
        .catch(() => null)
      const arr = Array.isArray(archives) ? archives : archives?.list || []
      arr.forEach((a: any) => {
        const name = a?.title || ''
        const count = a?.downloadCount ?? 0
        const r = toRank(name, count, 'archive', '档案')
        if (r && r.count > 0) combined.push(r)
      })

      combined.sort((a, b) => b.count - a.count)
      setItems(combined.slice(0, 20))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useLoad(() => {
    if (!requireAuth('committee')) return
    fetchData()
  })

  useDidShow(() => {
    fetchData()
  })

  usePullDownRefresh(() => {
    fetchData().finally(() => Taro.stopPullDownRefresh())
  })

  const maxCount = items.reduce((max, it) => (it.count > max ? it.count : max), 0)

  return (
    <View className='dstat'>
      <NavBar title='下载统计' />

      <View className='dstat__body'>
        <Text className='dstat__section-title'>下载排行 TOP {items.length}</Text>

        {loading ? (
          <ListLoading rows={5} />
        ) : items.length === 0 ? (
          <ListEmpty icon='bar-chart' text='暂无下载数据' />
        ) : (
          <View className='dstat__list'>
            {items.map((item, index) => {
              const width = maxCount > 0 ? Math.max((item.count / maxCount) * 100, 2) : 0
              return (
                <View className='dstat__item' key={`${item.type}-${item.name}-${index}`}>
                  <View className='dstat__item-head'>
                    <View className='dstat__item-rankg'>
                      <Text
                        className={`dstat__item-rank ${index < 3 ? 'dstat__item-rank--top' : ''}`}
                      >
                        {index + 1}
                      </Text>
                      <Text className='dstat__item-name'>
                        {item.name}
                        {item.sub ? <Text className='dstat__item-mark'>{item.sub}</Text> : null}
                      </Text>
                    </View>
                    <View className='dstat__item-countg'>
                      <Text className='dstat__item-count'>{item.count}</Text>
                      <Icon name='trending-up' size={28} color='#0062FF' strokeWidth={2} />
                    </View>
                  </View>
                  <View className='dstat__track'>
                    <View className='dstat__fill' style={{ width: `${width}%` }} />
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </View>
    </View>
  )
}