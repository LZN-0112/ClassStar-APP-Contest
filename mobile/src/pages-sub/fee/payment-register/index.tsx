import { useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading } from '@/components/business'
import { Button, Icon } from '@/components/ui'
import { feeApi, classesApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import { copyText } from '@/utils/native'
import './index.scss'

interface Member {
  id: string
  userId?: string
  name: string
  avatar?: string
}

export default function PaymentRegister() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireAuth } = useAuth()

  const [members, setMembers] = useState<Member[]>([])
  const [paidMap, setPaidMap] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [accountNo, setAccountNo] = useState('')

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
      // 班费收款账号（无后端字段时使用班级 id 派生，演示复制能力）
      setAccountNo(classIdRef.id)
    } catch {
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  const toggle = (id: string) => {
    setPaidMap((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleCopy = () => {
    copyText(accountNo)
  }

  const handleSubmit = async () => {
    if (saving) return
    setSaving(true)
    try {
      // 登记已缴费同学后写入班费台账（团费口径为班费）
      const paidCount = members.filter((m) => paidMap[m.id]).length
      if (paidCount > 0) {
        await feeApi.createPayment({
          classId: classIdRef.id,
          feeType: 'class',
          type: 'income',
          amount: 50 * paidCount,
          remark: `班费收缴 ${paidCount} 人`
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
    <View className='payreg'>
      <NavBar title='班费缴费登记' />

      <View className='payreg__body'>
        <View className='payreg__info'>
          <Text className='payreg__info-title'>班费缴纳</Text>
          <Text className='payreg__info-row'>金额：¥50.00/人</Text>
          <Text className='payreg__info-deadline'>截止时间：本学期末</Text>
        </View>

        {/* 收款账号复制 */}
        <View className='payreg__account'>
          <View className='payreg__account-left'>
            <Text className='payreg__account-label'>收款账号</Text>
            <Text className='payreg__account-no'>{accountNo}</Text>
          </View>
          <Button type='ghost' size='sm' onClick={handleCopy}>
            复制
          </Button>
        </View>

        <View className='payreg__section'>
          <Text className='payreg__section-title'>已缴费人员（点击切换）</Text>
          {loading ? (
            <ListLoading rows={6} />
          ) : members.length === 0 ? (
            <ListEmpty icon='users' text='暂无班级成员' />
          ) : (
            <View className='payreg__list'>
              {members.map((member) => {
                const paid = !!paidMap[member.id]
                return (
                  <View key={member.id} className='payreg__member' onClick={() => toggle(member.id)}>
                    {member.avatar ? (
                      <Image src={member.avatar} className='payreg__avatar' mode='aspectFill' />
                    ) : (
                      <View className='payreg__avatar payreg__avatar--text'>
                        <Text className='payreg__avatar-char'>{member.name.charAt(0)}</Text>
                      </View>
                    )}
                    <Text className='payreg__member-name'>{member.name}</Text>
                    {paid && (
                      <View className='payreg__check'>
                        <Icon name='check' size={26} color='#fff' strokeWidth={3} />
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          )}
        </View>

        <View className='payreg__spacer' />

        <Button type='primary' size='lg' block loading={saving} onClick={handleSubmit}>
          {saving ? '登记中...' : '确认登记'}
        </Button>
      </View>
    </View>
  )
}