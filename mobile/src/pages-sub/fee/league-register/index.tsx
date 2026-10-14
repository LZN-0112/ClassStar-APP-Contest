import { useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading } from '@/components/business'
import { Button, Icon } from '@/components/ui'
import { feeApi, classesApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface Member {
  id: string
  userId?: string
  name: string
  studentId?: string
  avatar?: string
}

export default function LeaguePaymentRegister() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireAuth } = useAuth()

  const [members, setMembers] = useState<Member[]>([])
  const [paidMap, setPaidMap] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const classIdRef = { id: currentClassId || '' }

  useLoad((o) => {
    if (!requireAuth('committee')) return
    const cid = (o?.classId as string) || currentClassId
    classIdRef.id = cid || ''
    fetchMembers()
  })

  const fetchMembers = async () => {
    if (!classIdRef.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await classesApi.getMembers(classIdRef.id, { pageSize: 100 })
      const list: Member[] = res?.list || []
      setMembers(list)
      setPaidMap(list.reduce((acc, m) => ({ ...acc, [m.id]: false }), {}))
    } catch {
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  const toggle = (id: string) => {
    setPaidMap((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleSubmit = async () => {
    if (saving) return
    setSaving(true)
    try {
      const paidCount = members.filter((m) => paidMap[m.id]).length
      if (paidCount > 0) {
        await feeApi.createPayment({
          classId: classIdRef.id,
          feeType: 'group',
          type: 'income',
          amount: 10 * paidCount,
          remark: `团费收缴 ${paidCount} 人`
        })
      }
      Taro.showToast({ title: '登记成功', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 600)
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '登记失败，请稍后重试', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <View className='leaguereg'>
      <NavBar title='团费缴费登记' />

      <View className='leaguereg__body'>
        <View className='leaguereg__info'>
          <Text className='leaguereg__info-title'>团费缴纳</Text>
          <Text className='leaguereg__info-row'>金额：¥10.00/人</Text>
          <Text className='leaguereg__info-deadline'>截止时间：本学期末</Text>
        </View>

        <View className='leaguereg__section'>
          <Text className='leaguereg__section-title'>已缴费人员（点击切换）</Text>
          {loading ? (
            <ListLoading rows={6} />
          ) : members.length === 0 ? (
            <ListEmpty icon='users' text='暂无班级成员' />
          ) : (
            <View className='leaguereg__list'>
              {members.map((member) => {
                const paid = !!paidMap[member.id]
                return (
                  <View key={member.id} className='leaguereg__member' onClick={() => toggle(member.id)}>
                    {member.avatar ? (
                      <Image src={member.avatar} className='leaguereg__avatar' mode='aspectFill' />
                    ) : (
                      <View className='leaguereg__avatar leaguereg__avatar--text'>
                        <Text className='leaguereg__avatar-char'>{member.name.charAt(0)}</Text>
                      </View>
                    )}
                    <View className='leaguereg__member-info'>
                      <Text className='leaguereg__member-name'>{member.name}</Text>
                      {member.studentId && <Text className='leaguereg__member-id'>{member.studentId}</Text>}
                    </View>
                    {paid && (
                      <View className='leaguereg__check'>
                        <Icon name='check' size={26} color='#fff' strokeWidth={3} />
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          )}
        </View>

        <View className='leaguereg__spacer' />

        <Button type='primary' size='lg' block loading={saving} onClick={handleSubmit}>
          {saving ? '登记中...' : '确认登记'}
        </Button>
      </View>
    </View>
  )
}