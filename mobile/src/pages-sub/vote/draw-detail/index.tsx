import { useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, ListLoading } from '@/components/business'
import { drawApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface Member {
  userId: string
  studentId: string | null
  name: string | null
}

interface DrawDetail {
  id: string
  title: string
  mainCount: number
  backupCount: number
  main: Member[]
  backup: Member[]
  createdAt: string
  status?: string
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function DrawRecordDetail() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin, isCommittee } = useAuth()

  const classIdRef = { id: currentClassId || '' }
  const drawIdRef = { id: '' }

  const [detail, setDetail] = useState<DrawDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useLoad((o) => {
    if (!requireLogin()) return
    const classId = (o?.classId as string) || currentClassId
    const drawId = o?.drawId as string
    if (!classId || !drawId) {
      Taro.showToast({ title: '参数缺失', icon: 'none' })
      Taro.navigateBack()
      return
    }
    classIdRef.id = classId
    drawIdRef.id = drawId
    fetchDetail()
  })

  const fetchDetail = async () => {
    if (!classIdRef.id || !drawIdRef.id) return
    setLoading(true)
    try {
      const res: any = await drawApi.getDrawDetail(classIdRef.id, drawIdRef.id)
      setDetail(res?.data || res)
    } catch {
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!classIdRef.id || !drawIdRef.id) return
    const r = await Taro.showModal({
      title: '提示',
      content: '确定作废本次抽签？作废后不可恢复',
      confirmText: '作废',
      confirmColor: '#EF4444'
    })
    if (!r.confirm || cancelling) return
    setCancelling(true)
    try {
      await drawApi.cancelDraw(classIdRef.id, drawIdRef.id)
      Taro.showToast({ title: '已作废', icon: 'success' })
      await fetchDetail()
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '作废失败', icon: 'none' })
    } finally {
      setCancelling(false)
    }
  }

  const renderMember = (member: Member, index: number) => (
    <View className='drawdetail__row' key={member.userId || index}>
      <View className='drawdetail__row-rank'>
        <Text className='drawdetail__row-rank-text'>{index + 1}</Text>
      </View>
      <View className='drawdetail__row-avatar'>
        <Text className='drawdetail__row-avatar-text'>{(member.name || '?')[0]}</Text>
      </View>
      <View className='drawdetail__row-info'>
        <Text className='drawdetail__row-name'>{member.name || '未知'}</Text>
        {member.studentId ? <Text className='drawdetail__row-id'>学号: {member.studentId}</Text> : null}
      </View>
    </View>
  )

  if (loading) {
    return (
      <View className='drawdetail'>
        <NavBar title='抽签详情' />
        <ListLoading rows={5} />
      </View>
    )
  }

  if (!detail) {
    return (
      <View className='drawdetail'>
        <NavBar title='抽签详情' />
        <View className='drawdetail__empty'>
          <Text className='drawdetail__empty-text'>记录不存在</Text>
        </View>
      </View>
    )
  }

  const isCancelled = detail.status === 'cancelled'

  return (
    <View className='drawdetail'>
      <NavBar title='抽签详情' />

      <ScrollView scrollY className='drawdetail__scroll'>
        <View className='drawdetail__title-card'>
          <View className='drawdetail__title-row'>
            <Text className='drawdetail__title'>{detail.title}</Text>
            {isCancelled ? (
              <View className='drawdetail__cancelled'><Text className='drawdetail__cancelled-text'>已作废</Text></View>
            ) : null}
          </View>
          <Text className='drawdetail__time'>{formatDateTime(detail.createdAt)}</Text>
          <Text className='drawdetail__count'>正选 {detail.mainCount} 人 · 候补 {detail.backupCount} 人</Text>
        </View>

        <View className='drawdetail__group'>
          <Text className='drawdetail__group-title'>正选代表 · 共{detail.main.length}人</Text>
          {detail.main.map((m, i) => renderMember(m, i))}
        </View>

        {detail.backup.length > 0 ? (
          <View className='drawdetail__group'>
            <Text className='drawdetail__group-title'>候补代表 · 共{detail.backup.length}人</Text>
            {detail.backup.map((m, i) => renderMember(m, i))}
          </View>
        ) : null}

        {isCommittee && !isCancelled ? (
          <View className='drawdetail__cancel' onClick={handleCancel}>
            <Text className='drawdetail__cancel-text'>{cancelling ? '作废中...' : '作废本次抽签'}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}