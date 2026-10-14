import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useDidShow, usePullDownRefresh } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import { archiveApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface ArchiveItem {
  id: string
  title?: string
  archiveYear?: string
  creatorName?: string | null
  createdAt?: string
  fileCount?: number
  downloadCount?: number
  size?: number
}

function formatDate(iso?: string) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '-'
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch {
    return '-'
  }
}

function formatSize(bytes?: number) {
  const b = Number(bytes) || 0
  if (b <= 0) return '-'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export default function ClassArchive() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [list, setList] = useState<ArchiveItem[]>([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const schoolYear =
    now.getMonth() + 1 >= 9
      ? `${now.getFullYear()}-${now.getFullYear() + 1}`
      : `${now.getFullYear() - 1}-${now.getFullYear()}`
  const currentYear = String(now.getFullYear())

  const fetchData = async () => {
    if (!currentClassId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await archiveApi.getClassArchive(currentClassId)
      const arr = Array.isArray(res) ? res : Array.isArray(res?.list) ? res.list : []
      setList(arr)
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  useLoad(() => {
    if (!requireLogin()) return
    fetchData()
  })

  useDidShow(() => {
    fetchData()
  })

  usePullDownRefresh(() => {
    fetchData().finally(() => Taro.stopPullDownRefresh())
  })

  const totalArchives = list.length
  const thisSemester = list.filter(
    (a) =>
      (a.archiveYear || '').includes(schoolYear) ||
      formatDate(a.createdAt).startsWith(currentYear)
  ).length
  const totalDownloads = list.reduce((sum, a) => sum + (Number(a.downloadCount) || 0), 0)
  const totalSize = list.reduce((sum, a) => sum + (Number(a.size) || 0), 0)

  // 按学年分组，学年降序
  const groups: { year: string; items: ArchiveItem[] }[] = []
  const yearMap = new Map<string, ArchiveItem[]>()
  list.forEach((a) => {
    const y = a.archiveYear || '其他学年'
    if (!yearMap.has(y)) yearMap.set(y, [])
    yearMap.get(y)!.push(a)
  })
  Array.from(yearMap.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .forEach(([year, items]) => groups.push({ year, items }))

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages-sub/archive/detail/index?archiveId=${id}` })
  }

  const statCards = [
    { icon: 'folder', value: totalArchives, label: '档案总数', color: '#0062FF' },
    { icon: 'calendar', value: thisSemester, label: '本学期归档', color: '#22C55E' },
    { icon: 'trending-up', value: totalDownloads, label: '下载次数', color: '#F59E0B' }
  ]

  return (
    <View className='arch'>
      <NavBar title='班级档案' />

      <View className='arch__body'>
        {/* 顶部统计 */}
        <View className='arch__stats'>
          {statCards.map((s) => (
            <View className='arch__stat' key={s.label}>
              <View className='arch__stat-icon' style={{ backgroundColor: `${s.color}1a` }}>
                <Icon name={s.icon} size={44} color={s.color} strokeWidth={2} />
              </View>
              <Text className='arch__stat-value'>{s.value}</Text>
              <Text className='arch__stat-label'>{s.label}</Text>
            </View>
          ))}
        </View>

        <View className='arch__hint'>
          <Text className='arch__hint-text'>按学期归档的班级数据 · 共 {formatSize(totalSize)}</Text>
        </View>

        {loading ? (
          <ListLoading rows={5} />
        ) : list.length === 0 ? (
          <ListEmpty icon='folder' text='暂无档案' actionText='去生成学期档案' />
        ) : (
          groups.map((group) => (
            <View className='arch__group' key={group.year}>
              <Text className='arch__group-title'>{group.year}</Text>
              {group.items.map((archive) => (
                <View
                  className='arch__card'
                  key={archive.id}
                  onClick={() => goDetail(archive.id)}
                >
                  <View className='arch__card-icon'>
                    <Icon name='folder' size={48} color='#0062FF' strokeWidth={2} />
                  </View>
                  <View className='arch__card-info'>
                    <Text className='arch__card-title'>{archive.title || '未命名档案'}</Text>
                    <Text className='arch__card-sub'>
                      {formatDate(archive.createdAt)} · {archive.fileCount || 0} 个附件
                    </Text>
                    <Text className='arch__card-meta'>
                      {formatSize(archive.size)} · 下载 {archive.downloadCount || 0} 次
                    </Text>
                  </View>
                  <Icon name='chevron-right' size={36} color='#9CA3AF' strokeWidth={2} />
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    </View>
  )
}