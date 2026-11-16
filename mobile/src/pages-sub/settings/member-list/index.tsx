// ============================================================
// 班级成员
// 1:1 对齐 front/src/pages/class/MemberList.tsx
// 统计三卡 + 搜索 + 全部/班委/成员筛选 + 成员列表 + 确认身份
// ============================================================
import { useMemo, useState } from 'react'
import { Image, Input, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { StatusBar } from '@/components/business'
import { Icon } from '@/components/ui'
import { classesApi, classSettingsApi } from '@/services'
import type { ClassMember } from '@/services/classes'
import { useUserStore } from '@/stores'
import './index.scss'

type FilterKey = 'all' | 'admin' | 'member'

const ROLE_LABEL: Record<string, string> = {
  owner: '群主',
  admin: '管理员',
  member: '成员'
}

const VERIFY_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMED: { label: '已确认', color: '#047857', bg: '#ECFDF5' },
  PENDING: { label: '待确认', color: '#C2410C', bg: '#FFF7ED' },
  UNVERIFIED: { label: '未核实', color: '#6B7280', bg: '#F3F4F6' }
}

const AVATAR_COLORS = ['#0062FF', '#10B981', '#F97316', '#8B5CF6', '#EF4444', '#0EA5E9']

const ROLE_RANK: Record<string, number> = { owner: 0, admin: 1, member: 2 }

function avatarColor(name: string) {
  let sum = 0
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

function levelBadge(level: ClassMember['roleLevel']) {
  if (level === 'owner') return { bg: '#0062FF', color: '#FFFFFF' }
  if (level === 'admin') return { bg: '#10B981', color: '#FFFFFF' }
  return { bg: '#F3F4F6', color: '#4B5563' }
}

export default function MemberListPage() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const userInfo = useUserStore((s) => s.userInfo)

  const ownerRole = userInfo?.roleLevel === 'owner'
  const canManage = ownerRole || userInfo?.roleLevel === 'admin'

  const [members, setMembers] = useState<ClassMember[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [verifyingId, setVerifyingId] = useState<string | null>(null)

  const fetchMembers = async () => {
    if (!currentClassId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await classesApi.getMembers(currentClassId, { pageSize: 200 })
      setMembers(res?.list || [])
    } catch {
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    void fetchMembers()
  })

  const confirmMember = async (member: ClassMember) => {
    if (!currentClassId || !member.userId || verifyingId) return
    setVerifyingId(member.id)
    try {
      await classSettingsApi.verifyMember(currentClassId, member.userId, 'CONFIRMED')
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, verifyStatus: 'CONFIRMED' } : m))
      )
      Taro.showToast({ title: `已确认 ${member.name} 的身份`, icon: 'none' })
    } catch {
      // 请求层已统一 toast
    } finally {
      setVerifyingId(null)
    }
  }

  const counts = useMemo(() => {
    const manager = members.filter(
      (m) => m.roleLevel === 'owner' || m.roleLevel === 'admin'
    ).length
    return {
      all: members.length,
      admin: manager,
      member: members.length - manager
    }
  }, [members])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return members
      .filter((m) => {
        if (filter === 'admin') return m.roleLevel === 'owner' || m.roleLevel === 'admin'
        if (filter === 'member') return m.roleLevel === 'member'
        return true
      })
      .filter((m) => {
        if (!q) return true
        return (
          m.name.toLowerCase().includes(q) ||
          (m.studentId || '').toLowerCase().includes(q) ||
          (m.role || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        const rankDiff =
          (ROLE_RANK[a.roleLevel || 'member'] ?? 2) - (ROLE_RANK[b.roleLevel || 'member'] ?? 2)
        if (rankDiff !== 0) return rankDiff
        return new Date(a.joinedAt || 0).getTime() - new Date(b.joinedAt || 0).getTime()
      })
  }, [members, filter, keyword])

  const tabs: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: '全部', count: counts.all },
    { key: 'admin', label: '班委', count: counts.admin },
    { key: 'member', label: '成员', count: counts.member }
  ]

  const goBack = () => {
    if (Taro.getCurrentPages().length > 1) Taro.navigateBack()
    else Taro.reLaunch({ url: '/pages/home/index' })
  }

  const goImport = () => {
    Taro.navigateTo({ url: '/pages-sub/settings/import-students/index' })
  }

  return (
    <View className='mlist'>
      <StatusBar />

      <View className='mlist__body'>
        <View className='mlist__spacer' />

        {/* 页头 */}
        <View className='mlist__header'>
          <View className='mlist__header-left'>
            <View className='mlist__back' onClick={goBack}>
              <Icon name='chevron-left' size={44} color='#1A1A1A' strokeWidth={2} />
            </View>
            <Text className='mlist__header-title'>班级成员</Text>
          </View>
          {canManage ? (
            <View className='mlist__invite-btn' onClick={goImport}>
              <Icon name='user-plus' size={32} color='#0062FF' strokeWidth={2} />
              <Text className='mlist__invite-btn-text'>邀请/导入</Text>
            </View>
          ) : null}
        </View>

        {/* 统计 */}
        <View className='mlist__stats'>
          {[
            { label: '总人数', value: counts.all, color: '#0062FF' },
            { label: '班委', value: counts.admin, color: '#10B981' },
            { label: '普通成员', value: counts.member, color: '#6B7280' }
          ].map((item) => (
            <View className='mlist__stat' key={item.label}>
              <Text className='mlist__stat-value' style={{ color: item.color }}>
                {item.value}
              </Text>
              <Text className='mlist__stat-label'>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* 搜索 */}
        <View className='mlist__search'>
          <Icon name='search' size={34} color='#9CA3AF' strokeWidth={2} />
          <Input
            className='mlist__search-input'
            value={keyword}
            placeholder='搜索姓名、学号或职务'
            placeholderClass='mlist__search-placeholder'
            onInput={(e) => setKeyword(e.detail.value)}
          />
          {keyword ? (
            <Text className='mlist__search-clear' onClick={() => setKeyword('')}>
              清空
            </Text>
          ) : null}
        </View>

        {/* 筛选 */}
        <View className='mlist__filter'>
          {tabs.map((tab) => {
            const active = filter === tab.key
            return (
              <View
                key={tab.key}
                className={`mlist__tab ${active ? 'mlist__tab--active' : ''}`}
                onClick={() => setFilter(tab.key)}
              >
                <Text className={`mlist__tab-label ${active ? 'mlist__tab-label--active' : ''}`}>
                  {tab.label}
                </Text>
                <Text className={`mlist__tab-count ${active ? 'mlist__tab-count--active' : ''}`}>
                  {tab.count}
                </Text>
              </View>
            )
          })}
        </View>

        {!currentClassId && !loading ? (
          <View className='mlist__empty'>
            <View className='mlist__empty-icon'>
              <Icon name='users' size={64} color='#0062FF' strokeWidth={1.5} />
            </View>
            <Text className='mlist__empty-text'>你还没有加入班级</Text>
            <View
              className='mlist__primary-btn'
              onClick={() => Taro.navigateTo({ url: '/pages/auth/join-class/index' })}
            >
              <Text className='mlist__primary-btn-text'>去加入班级</Text>
            </View>
          </View>
        ) : loading ? (
          <View className='mlist__list'>
            {[0, 1, 2, 3].map((i) => (
              <View className='mlist__skeleton' key={i} />
            ))}
          </View>
        ) : filtered.length === 0 ? (
          <View className='mlist__empty-list'>
            <Icon name='users' size={72} color='#D1D5DB' strokeWidth={1.5} />
            <Text className='mlist__empty-list-text'>
              {members.length === 0 ? '暂无班级成员' : '没有找到匹配的成员'}
            </Text>
          </View>
        ) : (
          <View className='mlist__list'>
            {filtered.map((member) => {
              const level = levelBadge(member.roleLevel)
              const verify = member.verifyStatus ? VERIFY_BADGE[member.verifyStatus] : null
              const showVerify = canManage && member.roleLevel !== 'owner' && member.verifyStatus !== 'CONFIRMED'
              return (
                <View
                  className='mlist__item'
                  key={member.id}
                  onClick={() =>
                    Taro.navigateTo({
                      url: `/pages-sub/settings/member-detail/index?memberId=${member.id}`
                    })
                  }
                >
                  <View
                    className='mlist__avatar'
                    style={{ backgroundColor: member.avatar ? '#F3F4F6' : avatarColor(member.name) }}
                  >
                    {member.avatar ? (
                      <Image className='mlist__avatar-img' src={member.avatar} mode='aspectFill' />
                    ) : (
                      <Text className='mlist__avatar-text'>{member.name.charAt(0)}</Text>
                    )}
                  </View>

                  <View className='mlist__item-main'>
                    <View className='mlist__item-title-row'>
                      <Text className='mlist__item-name'>{member.name}</Text>
                      <View
                        className='mlist__badge'
                        style={{ backgroundColor: level.bg, color: level.color }}
                      >
                        <Text className='mlist__badge-text' style={{ color: level.color }}>
                          {ROLE_LABEL[member.roleLevel || 'member'] || '成员'}
                        </Text>
                      </View>
                      {member.isCommittee ? (
                        <View className='mlist__badge mlist__badge--committee'>
                          <Text className='mlist__badge-text mlist__badge-text--committee'>班委</Text>
                        </View>
                      ) : null}
                      {verify && member.roleLevel !== 'owner' ? (
                        <View className='mlist__badge' style={{ backgroundColor: verify.bg }}>
                          <Text className='mlist__badge-text' style={{ color: verify.color }}>
                            {verify.label}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className='mlist__item-sub'>
                      {member.studentId ? `学号 ${member.studentId}` : member.role || '班级成员'}
                    </Text>
                  </View>

                  {showVerify ? (
                    <View
                      className={`mlist__verify ${verifyingId === member.id ? 'mlist__verify--loading' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        void confirmMember(member)
                      }}
                    >
                      <Text
                        className={`mlist__verify-text ${
                          verifyingId === member.id ? 'mlist__verify-text--loading' : ''
                        }`}
                      >
                        {verifyingId === member.id ? '确认中' : '确认'}
                      </Text>
                    </View>
                  ) : null}

                  <Icon name='chevron-right' size={32} color='#C0C4CC' strokeWidth={2} />
                </View>
              )
            })}
          </View>
        )}
      </View>
    </View>
  )
}