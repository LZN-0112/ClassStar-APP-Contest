import { useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, ListLoading, Tag } from '@/components/business'
import { Button, Icon } from '@/components/ui'
import { classSettingsApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface MemberDetail {
  userId?: string
  name: string
  avatar?: string
  role?: string
  roleLevel?: 'owner' | 'admin' | 'member'
  isCommittee?: boolean
  phone?: string
  studentId?: string
  joinedAt?: string
}

function roleTag(level?: MemberDetail['roleLevel']): { text: string; color: 'primary' | 'success' | 'default' } {
  if (level === 'owner') return { text: '群主', color: 'primary' }
  if (level === 'admin') return { text: '班委', color: 'success' }
  return { text: '学生', color: 'default' }
}

export default function MemberDetailPage() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const currentUser = useUserStore((s) => s.userInfo)
  const { requireLogin } = useAuth()
  const isOwner = currentUser?.roleLevel === 'owner'

  const [member, setMember] = useState<MemberDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [roleLoading, setRoleLoading] = useState(false)
  const [transferLoading, setTransferLoading] = useState(false)

  const memberIdRef = { id: '' }

  const fetchDetail = async () => {
    if (!currentClassId || !memberIdRef.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await classSettingsApi.getMemberDetail(currentClassId, memberIdRef.id)
      setMember(res?.data ? res.data : res || null)
    } catch {
      setMember(null)
    } finally {
      setLoading(false)
    }
  }

  useLoad((o) => {
    if (!requireLogin()) return
    const mid = (o?.memberId as string) || ''
    if (!mid) {
      setLoading(false)
      return
    }
    memberIdRef.id = mid
    fetchDetail()
  })

  const handleRoleChange = async () => {
    if (!member?.userId || roleLoading) return
    const next = member.roleLevel === 'member' ? 'admin' : 'member'
    setRoleLoading(true)
    try {
      await classSettingsApi.updateMemberRoleLevel(currentClassId, member.userId, {
        roleLevel: next
      })
      Taro.showToast({
        title: next === 'admin' ? '已设为班委' : '已取消班委',
        icon: 'success'
      })
      fetchDetail()
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '操作失败', icon: 'none' })
    } finally {
      setRoleLoading(false)
    }
  }

  const handleTransfer = async () => {
    if (!member?.userId || transferLoading) return
    const conf = await Taro.showModal({
      title: '转让群主',
      content: `确定将群主转让给 ${member.name} 吗？`,
      confirmColor: '#0062FF'
    })
    if (!conf.confirm) return
    setTransferLoading(true)
    try {
      await classSettingsApi.transferOwner(currentClassId, member.userId)
      Taro.showToast({ title: '群主转让成功', icon: 'success' })
      fetchDetail()
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '转让失败', icon: 'none' })
    } finally {
      setTransferLoading(false)
    }
  }

  const canManage = isOwner && !!member && member.roleLevel !== 'owner'

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View className='mdetail__row'>
      <Text className='mdetail__row-label'>{label}</Text>
      <Text className='mdetail__row-value'>{value}</Text>
    </View>
  )

  return (
    <View className='mdetail'>
      <NavBar title='成员详情' />

      <View className='mdetail__body'>
        {loading ? (
          <ListLoading rows={4} />
        ) : !member ? (
          <View className='mdetail__empty'>
            <Icon name='user' size={72} color='#9CA3AF' strokeWidth={2} />
            <Text className='mdetail__empty-text'>未找到该成员</Text>
          </View>
        ) : (
          <>
            {/* 顶部用户卡 */}
            <View className='mdetail__head'>
              <View className='mdetail__avatar'>
                {member.avatar ? (
                  <Image className='mdetail__avatar-img' src={member.avatar} mode='aspectFill' />
                ) : (
                  <Icon name='user' size={72} color='#0062FF' strokeWidth={2} />
                )}
              </View>
              <Text className='mdetail__name'>{member.name}</Text>
              <Tag text={roleTag(member.roleLevel).text} color={roleTag(member.roleLevel).color} />
            </View>

            {/* 信息分组 */}
            <View className='mdetail__card'>
              <InfoRow label='手机号' value={member.phone || '-'} />
              <InfoRow label='学号' value={member.studentId || '-'} />
              <InfoRow label='加入时间' value={member.joinedAt || '-'} />
            </View>

            {/* 群主管理操作 */}
            {canManage ? (
              <View className='mdetail__actions'>
                <Button
                  type='primary'
                  size='lg'
                  block
                  loading={roleLoading}
                  onClick={handleRoleChange}
                >
                  {member.roleLevel === 'member' ? '设为班委' : '取消班委'}
                </Button>
                <Button
                  type='secondary'
                  size='lg'
                  block
                  className='mdetail__transfer'
                  loading={transferLoading}
                  onClick={handleTransfer}
                >
                  转让群主
                </Button>
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  )
}