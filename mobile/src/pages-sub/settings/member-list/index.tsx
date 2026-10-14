import { useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useLoad, useDidShow, usePullDownRefresh } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading, Tag } from '@/components/business'
import { Icon, Input } from '@/components/ui'
import { classesApi } from '@/services'
import type { ClassMember } from '@/services/classes'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

type MemberTab = 'all' | 'student' | 'committee'

const TABS: { key: MemberTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'student', label: '学生' },
  { key: 'committee', label: '班委' }
]

function roleTag(member: ClassMember): { text: string; color: 'primary' | 'success' | 'default' } {
  if (member.roleLevel === 'owner') return { text: '群主', color: 'primary' }
  if (member.roleLevel === 'admin') return { text: '班委', color: 'success' }
  return { text: '学生', color: 'default' }
}

export default function MemberListPage() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { isCommittee, requireLogin } = useAuth()

  const [members, setMembers] = useState<ClassMember[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [activeTab, setActiveTab] = useState<MemberTab>('all')

  const fetchMembers = async (kw = '') => {
    if (!currentClassId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await classesApi.getMembers(currentClassId, {
        keyword: kw || undefined,
        pageSize: 200
      })
      setMembers(res?.list || [])
    } catch {
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  useLoad(() => {
    if (!requireLogin()) return
    fetchMembers()
  })

  useDidShow(() => {
    if (currentClassId) fetchMembers(keyword)
  })

  usePullDownRefresh(() => {
    fetchMembers(keyword).then(() => Taro.stopPullDownRefresh())
  })

  const handleSearch = (value: string) => {
    setKeyword(value)
    fetchMembers(value)
  }

  const filtered = members.filter((m) => {
    if (activeTab === 'student') return m.roleLevel === 'member'
    if (activeTab === 'committee') {
      return m.isCommittee || m.roleLevel === 'owner' || m.roleLevel === 'admin'
    }
    return true
  })

  const goDetail = (id?: string) => {
    if (!id || !isCommittee) return
    Taro.navigateTo({ url: `/pages-sub/settings/member-detail/index?memberId=${id}` })
  }

  const goImport = () => {
    Taro.navigateTo({ url: '/pages-sub/settings/import-students/index' })
  }

  return (
    <View className='mlist'>
      <NavBar title='成员列表' />

      <View className='mlist__body'>
        {/* 搜索 */}
        <View className='mlist__search'>
          <Icon name='search' size={40} color='#9CA3AF' strokeWidth={2} />
          <Input value={keyword} onChange={handleSearch} placeholder='搜索成员姓名' />
        </View>

        {/* Tab 分组 */}
        <View className='mlist__tabs'>
          {TABS.map((tab) => (
            <View
              key={tab.key}
              className={`mlist__tab ${activeTab === tab.key ? 'mlist__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Text
                className={`mlist__tab-label ${activeTab === tab.key ? 'mlist__tab-label--active' : ''}`}
              >
                {tab.label}
              </Text>
            </View>
          ))}
        </View>

        {loading ? (
          <ListLoading rows={5} />
        ) : filtered.length === 0 ? (
          <ListEmpty icon='users' text='暂无成员' />
        ) : (
          <View className='mlist__list'>
            {filtered.map((m) => (
              <View key={m.id || m.userId} className='mlist__item' onClick={() => goDetail(m.userId)}>
                <View className='mlist__avatar'>
                  {m.avatar ? (
                    <Image className='mlist__avatar-img' src={m.avatar} mode='aspectFill' />
                  ) : (
                    <Icon name='user' size={44} color='#0062FF' strokeWidth={2} />
                  )}
                </View>
                <View className='mlist__item-info'>
                  <Text className='mlist__item-name'>{m.name}</Text>
                  <View className='mlist__item-tags'>
                    <Tag text={roleTag(m).text} color={roleTag(m).color} />
                    {m.role ? <Text className='mlist__item-role'>{m.role}</Text> : null}
                  </View>
                </View>
                {isCommittee ? (
                  <Icon name='chevron-right' size={36} color='#4B5563' strokeWidth={2} />
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* 导入学生入口（仅班委可见） */}
        {isCommittee ? (
          <View className='mlist__import' onClick={goImport}>
            <View className='mlist__import-icon'>
              <Icon name='user-plus' size={44} color='#0062FF' strokeWidth={2} />
            </View>
            <Text className='mlist__import-text'>导入学生</Text>
            <Icon name='chevron-right' size={36} color='#4B5563' strokeWidth={2} />
          </View>
        ) : null}
      </View>
    </View>
  )
}