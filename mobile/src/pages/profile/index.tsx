import { useState } from 'react'
import type { ReactNode } from 'react'
import { View, Text, Image, Input } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { BottomNav, StatusBar } from '@/components/business'
import { Icon } from '@/components/ui'
import type { IconName } from '@/constants/icons'
import { getOrgTypeMeta } from '@/constants/org'
import { archiveApi, authApi, classesApi, request, settingsApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import type { UserInfo } from '@/types/user'
import './index.scss'

interface ActivityItem {
  id?: string
  type: string
  title: string
  time: string
}

interface OrgItem {
  id: string
  name: string
  role?: string
  memberCount?: number
  orgType?: string
}

interface MeStats {
  attendanceRate: number | null
  homeworkRate: number | null
  activityRate: number | null
  rank: number | null
  total: number
}

interface TodoCount {
  total: number
  homework: number
  attendance: number
  activity: number
  message: number
}

interface SheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #60A5FA, #2563EB)',
  'linear-gradient(135deg, #34D399, #059669)',
  'linear-gradient(135deg, #FB923C, #EA580C)',
  'linear-gradient(135deg, #C084FC, #9333EA)',
  'linear-gradient(135deg, #F472B6, #DB2777)',
  'linear-gradient(135deg, #22D3EE, #0891B2)',
  'linear-gradient(135deg, #FBBF24, #D97706)',
  'linear-gradient(135deg, #FB7185, #E11D48)'
]

function getAvatarGradient(name: string): string {
  const code = name.charCodeAt(0) || 0
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length]
}

const QUICK_ACCESS_ITEMS: {
  label: string
  url: string
  icon: IconName
  color: string
  todoKey?: 'attendance' | 'homework' | 'activity'
}[] = [
  {
    label: '我的考勤',
    url: '/pages-sub/attendance/my/index',
    icon: 'clock',
    color: '#2563EB',
    todoKey: 'attendance'
  },
  {
    label: '我的作业',
    url: '/pages-sub/homework/my/index',
    icon: 'edit',
    color: '#F97316',
    todoKey: 'homework'
  },
  {
    label: '我的活动',
    url: '/pages-sub/activity/my/index',
    icon: 'flag',
    color: '#EF4444'
  },
  {
    label: '我的报名',
    url: '/pages-sub/activity/my-registration/index',
    icon: 'clipboard-check',
    color: '#10B981',
    todoKey: 'activity'
  }
]

const SERVICE_ITEMS: {
  label: string
  url: string
  icon: IconName
  color: string
  bg: string
}[] = [
  {
    label: '班费台账',
    url: '/pages-sub/fee/ledger/index',
    icon: 'wallet',
    color: '#2563EB',
    bg: '#EFF6FF'
  },
  {
    label: '投票与抽签',
    url: '/pages-sub/vote/list/index',
    icon: 'vote',
    color: '#7C3AED',
    bg: '#F5F3FF'
  },
  {
    label: '班级资料库',
    url: '/pages-sub/material/library/index',
    icon: 'library',
    color: '#F59E0B',
    bg: '#FFF7ED'
  },
  {
    label: '班级档案',
    url: '/pages-sub/archive/class-archive/index',
    icon: 'archive',
    color: '#059669',
    bg: '#ECFDF5'
  }
]

const FEED_META: Record<string, { icon: IconName; color: string; bg: string; label: string }> = {
  attendance: { icon: 'clock', color: '#2563EB', bg: '#EFF6FF', label: '考勤' },
  homework: { icon: 'edit', color: '#F97316', bg: '#FFF7ED', label: '作业' },
  activity: { icon: 'flag', color: '#EF4444', bg: '#FEF2F2', label: '活动' },
  message: { icon: 'megaphone', color: '#EC4899', bg: '#FDF2F8', label: '通知' }
}

const FEED_ROUTE: Record<string, string> = {
  attendance: '/pages-sub/attendance/my/index',
  homework: '/pages-sub/homework/my/index',
  activity: '/pages-sub/activity/my-registration/index',
  message: '/pages/notice/index'
}

const EMPTY_TODO: TodoCount = {
  total: 0,
  homework: 0,
  attendance: 0,
  activity: 0,
  message: 0
}

function readAsBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // #ifndef H5
      const data = Taro.getFileSystemManager().readFileSync(filePath, 'base64')
      resolve(`data:image/jpeg;base64,${data}`)
      // #endif
      // #ifdef H5
      resolve(filePath)
      // #endif
    } catch (err) {
      reject(err)
    }
  })
}

function Sheet({ open, title, onClose, children, footer }: SheetProps) {
  if (!open) return null
  return (
    <View className='sheet'>
      <View className='sheet__mask' onClick={onClose} />
      <View className='sheet__panel' catchMove>
        <View className='sheet__handle-wrap'>
          <View className='sheet__handle' />
        </View>
        <View className='sheet__header'>
          <Text className='sheet__title'>{title}</Text>
        </View>
        <View className='sheet__body'>{children}</View>
        {footer ? <View className='sheet__footer'>{footer}</View> : null}
      </View>
    </View>
  )
}

export default function Profile() {
  const userInfo = useUserStore((s) => s.userInfo)
  const setUserInfo = useUserStore((s) => s.setUserInfo)
  const setCurrentClass = useUserStore((s) => s.setCurrentClass)
  const isLoggedIn = useUserStore((s) => s.isLoggedIn)
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [me, setMe] = useState<MeStats | null>(null)
  const [todo, setTodo] = useState<TodoCount>(EMPTY_TODO)
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([])
  const [showAllFeed, setShowAllFeed] = useState(false)
  const [myOrgs, setMyOrgs] = useState<OrgItem[]>([])
  const [orgLoading, setOrgLoading] = useState(false)

  const [isExpanded, setIsExpanded] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editingField, setEditingField] = useState<'name' | null>(null)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [bio, setBio] = useState('')
  const [editingBio, setEditingBio] = useState(false)

  const [showTodoSheet, setShowTodoSheet] = useState(false)
  const [showServiceSheet, setShowServiceSheet] = useState(false)
  const [showOrgSheet, setShowOrgSheet] = useState(false)

  const user = userInfo as UserInfo | null
  const displayName = user?.name || (isLoggedIn ? '同学' : '未登录')
  const displayRole = user?.role || '学生'
  const displayClassName = user?.className || '未加入班级'
  const displayStudentId = user?.studentId || '未设置'
  const displayAvatar = user?.avatar
  const displayBackgroundImage = user?.backgroundImage

  const currentOrg = myOrgs.find((org) => org.id === currentClassId) || myOrgs[0]
  const formatRate = (value: number | null | undefined) =>
    value === null || value === undefined ? '--' : `${value}`

  const loadUserInfo = () => {
    authApi
      .getUserInfo(currentClassId || undefined)
      .then((info) => {
        setUserInfo(info)
        setBio(info.bio || '')
      })
      .catch(() => {
        /* 保留本地缓存 */
      })
  }

  const loadOverview = () => {
    if (!currentClassId) {
      setMe(null)
      return
    }
    archiveApi
      .getDashboard(currentClassId)
      .then((res) => {
        const d = (res as any) || {}
        const mine = d.memberRanking?.me
        if (!mine) {
          setMe(null)
          return
        }
        setMe({
          attendanceRate: mine.attendanceRate ?? null,
          homeworkRate: mine.homeworkRate ?? null,
          activityRate: mine.activityRate ?? null,
          rank: mine.rank ?? null,
          total: d.memberRanking?.total ?? 0
        })
      })
      .catch(() => setMe(null))
  }

  const loadTodos = () => {
    classesApi
      .getOrgsTodos()
      .then((res) => {
        const list = Array.isArray(res) ? (res as any[]) : []
        const cur = list.find((item) => item.orgId === currentClassId)
        const items: { type: string }[] = cur?.todos || []
        const count = (type: string) => items.filter((item) => item.type === type).length
        setTodo({
          total: items.length,
          homework: count('homework'),
          attendance: count('attendance'),
          activity: count('activity'),
          message: count('message_ack')
        })
      })
      .catch(() => setTodo(EMPTY_TODO))
  }

  const loadActivities = () => {
    settingsApi
      .getRecentActivities(currentClassId || undefined)
      .then((res) => setRecentActivities((res as any)?.list || []))
      .catch(() => setRecentActivities([]))
  }

  const loadMyOrgs = () => {
    setOrgLoading(true)
    classesApi
      .getMyClasses()
      .then((res) => setMyOrgs(Array.isArray(res) ? (res as OrgItem[]) : []))
      .catch(() => {
        /* 静默失败 */
      })
      .finally(() => setOrgLoading(false))
  }

  useDidShow(() => {
    if (!requireLogin()) return
    loadUserInfo()
    loadOverview()
    loadTodos()
    loadActivities()
    loadMyOrgs()
  })

  const navigateTo = (url: string) => {
    Taro.navigateTo({ url })
  }

  const handleSwitchOrg = (org: OrgItem) => {
    setShowOrgSheet(false)
    setCurrentClass(org.id)
    Taro.showToast({ title: `已切换到 ${org.name}`, icon: 'none' })
    setTimeout(() => {
      Taro.reLaunch({ url: '/pages/home/index' })
    }, 300)
  }

  const handleLeaveOrg = async (org: OrgItem) => {
    const res = await Taro.showModal({
      title: '退出组织',
      content: `确定要退出「${org.name}」吗？`,
      confirmText: '退出',
      confirmColor: '#ef4444'
    })
    if (!res.confirm) return
    try {
      await request.post(`/classes/${org.id}/leave`)
      Taro.showToast({ title: '已退出组织', icon: 'success' })
      const list = await classesApi.getMyClasses()
      const remaining = Array.isArray(list) ? (list as OrgItem[]) : []
      setMyOrgs(remaining)
      if (org.id === currentClassId) {
        if (remaining.length > 0) {
          setCurrentClass(remaining[0].id)
          Taro.showToast({ title: `已切换到 ${remaining[0].name}`, icon: 'none' })
          setTimeout(() => Taro.reLaunch({ url: '/pages/home/index' }), 300)
        } else {
          setCurrentClass('')
          Taro.reLaunch({ url: '/pages/auth/join-class/index' })
        }
      }
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '退出组织失败',
        icon: 'none'
      })
    }
  }

  const handleSaveName = async () => {
    if (!newName.trim() || newName.length < 2) {
      Taro.showToast({ title: '姓名至少需要2个字符', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      await settingsApi.updateProfile({ name: newName.trim() })
      setUserInfo(user ? { ...user, name: newName.trim() } : user)
      Taro.showToast({ title: '姓名修改成功', icon: 'success' })
      setShowEdit(false)
      setEditingField(null)
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '修改失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBio = async () => {
    try {
      await settingsApi.updateProfile({ bio: bio.trim() })
      setUserInfo(user ? { ...user, bio: bio.trim() } : user)
      Taro.showToast({ title: '简介修改成功', icon: 'success' })
      setEditingBio(false)
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '修改失败', icon: 'none' })
    }
  }

  const handlePickImage = (field: 'avatar' | 'backgroundImage') => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      success: async (res) => {
        const file = res.tempFiles?.[0]
        if (!file?.path) return
        if (file.size && file.size > 5 * 1024 * 1024) {
          Taro.showToast({ title: '图片大小不能超过5MB', icon: 'none' })
          return
        }
        setSaving(true)
        try {
          let base64 = ''
          // #ifndef H5
          base64 = await readAsBase64(file.path)
          if (!base64) throw new Error('读取图片失败')
          // #endif
          // #ifdef H5
          base64 = file.path
          // #endif
          await settingsApi.updateProfile({ [field]: base64 })
          setUserInfo(user ? { ...user, [field]: base64 } : user)
          Taro.showToast({
            title: `${field === 'avatar' ? '头像' : '背景图'}修改成功`,
            icon: 'success'
          })
          setShowEdit(false)
          setEditingField(null)
        } catch (err) {
          Taro.showToast({ title: err instanceof Error ? err.message : '修改失败', icon: 'none' })
        } finally {
          setSaving(false)
        }
      }
    })
  }

  const todoActions = [
    { show: todo.homework > 0, label: `作业 ${todo.homework} 项`, url: '/pages-sub/homework/my/index' },
    {
      show: todo.attendance > 0,
      label: `考勤 ${todo.attendance} 项`,
      url: '/pages-sub/attendance/my/index'
    },
    {
      show: todo.activity > 0,
      label: `活动 ${todo.activity} 项`,
      url: '/pages-sub/activity/my-registration/index'
    },
    { show: todo.message > 0, label: `通知 ${todo.message} 条`, url: '/pages/notice/index' }
  ].filter((item) => item.show)

  const settingRows: {
    key: string
    label: string
    value: string
    icon: IconName
    color: string
    bg: string
    onTap: () => void
  }[] = [
    {
      key: 'profile',
      label: '个人资料',
      value: `学号 ${displayStudentId}`,
      icon: 'user',
      color: '#2563EB',
      bg: '#EBF3FF',
      onTap: () => {
        setEditingField(null)
        setShowEdit(true)
      }
    },
    {
      key: 'security',
      label: '账号与安全',
      value: '密码 · 手机 · 隐私',
      icon: 'shield',
      color: '#0284C7',
      bg: '#F0F9FF',
      onTap: () => navigateTo('/pages-sub/settings/account-security/index')
    },
    {
      key: 'notification',
      label: '通知与提醒',
      value: '消息 · 再次提醒',
      icon: 'bell',
      color: '#F59E0B',
      bg: '#FFF7ED',
      onTap: () => navigateTo('/pages-sub/settings/notification/index')
    },
    {
      key: 'help',
      label: '帮助与关于',
      value: '帮助反馈 · 版本',
      icon: 'help-circle',
      color: '#64748B',
      bg: '#F1F5F9',
      onTap: () => navigateTo('/pages-sub/settings/help-feedback/index')
    }
  ]

  const orgMeta = getOrgTypeMeta(currentOrg?.orgType)

  return (
    <View className='profile'>
      <View
        className={`profile__header ${isExpanded ? 'is-expanded' : ''}`}
        style={
          displayBackgroundImage
            ? {
                backgroundImage: `url(${displayBackgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }
            : {}
        }
        onClick={() => {
          setIsExpanded(!isExpanded)
          if (isExpanded) setEditingBio(false)
        }}
      >
        <StatusBar light />

        <View className='profile__header-inner'>
          <View className='profile__header-top'>
            <View
              className='profile__settings'
              onClick={(e) => {
                e.stopPropagation()
                Taro.navigateTo({ url: '/pages-sub/settings/index' })
              }}
            >
              <Icon name='settings' size={36} color='#000000' />
            </View>
          </View>

          <View className='profile__identity'>
            <View className='profile__avatar-wrap'>
              <View className='profile__avatar'>
                {displayAvatar ? (
                  <Image className='profile__avatar-img' src={displayAvatar} mode='aspectFill' />
                ) : (
                  <View
                    className='profile__avatar-fallback'
                    style={{ backgroundImage: getAvatarGradient(displayName) }}
                  >
                    <Text className='profile__avatar-text'>{displayName.charAt(0)}</Text>
                  </View>
                )}
              </View>
              <View
                className='profile__avatar-edit'
                onClick={(e) => {
                  e.stopPropagation()
                  handlePickImage('avatar')
                }}
              >
                <Icon name='camera' size={32} color='#FFFFFF' />
              </View>
            </View>

            <View className='profile__ident'>
              <View className='profile__name-row'>
                <Text className='profile__name'>{displayName}</Text>
                <View className='profile__role-tag'>
                  <Text className='profile__role-text'>{displayRole}</Text>
                </View>
                <View
                  className='profile__edit-btn'
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingField(null)
                    setShowEdit(true)
                  }}
                >
                  <Icon name='edit' size={24} color='#FFFFFF' />
                  <Text className='profile__edit-text'>编辑</Text>
                </View>
              </View>
              <Text className='profile__class'>{displayClassName}</Text>
            </View>
          </View>
        </View>

        <View className='profile__header-fade' />

        <View className='profile__badges'>
          <View className='profile__badge profile__badge--amber'>
            <Icon name='star' size={32} color='#F59E0B' />
            <Text className='profile__badge-text profile__badge-text--amber'>活跃成员</Text>
          </View>
          {user?.isCommittee ? (
            <View className='profile__badge profile__badge--red'>
              <Icon name='trophy' size={32} color='#EF4444' />
              <Text className='profile__badge-text profile__badge-text--red'>班委</Text>
            </View>
          ) : null}
        </View>

        <View className='profile__bio' onClick={(e) => e.stopPropagation()}>
          {editingBio ? (
            <View className='profile__bio-edit'>
              <Input
                className='profile__bio-input'
                value={bio}
                maxlength={50}
                placeholder='写一句个人简介...'
                placeholderClass='profile__placeholder'
                onInput={(e) => setBio(e.detail.value)}
              />
              <View className='profile__bio-save' onClick={handleSaveBio}>
                <Icon name='check' size={32} color='#FFFFFF' />
              </View>
            </View>
          ) : (
            <View
              className='profile__bio-view'
              onClick={() => {
                setBio(user?.bio || '')
                setEditingBio(true)
              }}
            >
              <Text className='profile__bio-text'>{bio || user?.bio || '点击添加个人简介...'}</Text>
              <Icon name='edit' size={28} color='rgba(255,255,255,0.6)' />
            </View>
          )}
        </View>
      </View>

      <View className='profile__content'>
        <View className='profile__card'>
          <View className='profile__card-head'>
            <View className='profile__card-head-left'>
              <Text className='profile__card-title'>我的概览</Text>
              <Text className='profile__card-sub'>近 30 天 · {displayClassName}</Text>
            </View>
            <View
              className='profile__rank'
              onClick={() => Taro.reLaunch({ url: '/pages/data/index' })}
            >
              <Text className='profile__rank-text'>
                {me?.rank ? `班级第 ${me.rank} 名` : '暂无排名'}
              </Text>
              <Icon name='chevron-right' size={24} color='#0062FF' />
            </View>
          </View>

          <View className='profile__metrics'>
            {[
              { label: '出勤率', value: me?.attendanceRate },
              { label: '作业完成', value: me?.homeworkRate },
              { label: '活动参与', value: me?.activityRate }
            ].map((item, idx) => (
              <View
                className={`profile__metric ${idx > 0 ? 'profile__metric--divider' : ''}`}
                key={item.label}
              >
                <Text className='profile__metric-label'>{item.label}</Text>
                <View className='profile__metric-value-row'>
                  <Text className='profile__metric-value'>{formatRate(item.value)}</Text>
                  {item.value !== null && item.value !== undefined ? (
                    <Text className='profile__metric-unit'>%</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          <View
            className={`profile__todo ${todo.total > 0 ? 'is-active' : ''}`}
            onClick={() => {
              if (todo.total > 0) setShowTodoSheet(true)
            }}
          >
            <View className='profile__todo-dot' />
            <Text className='profile__todo-text'>
              {todo.total > 0
                ? `${todo.total} 项待处理 · 作业 ${todo.homework} · 考勤 ${todo.attendance}`
                : '当前没有待处理事项'}
            </Text>
            {todo.total > 0 ? <Text className='profile__todo-go'>去处理</Text> : null}
          </View>
        </View>

        <View className='profile__card'>
          <View className='profile__quick-grid'>
            {QUICK_ACCESS_ITEMS.map((item) => {
              const badge = item.todoKey ? todo[item.todoKey] : 0
              return (
                <View
                  className='profile__quick-item'
                  key={item.url}
                  onClick={() => Taro.navigateTo({ url: item.url })}
                >
                  <View className='profile__quick-icon-wrap'>
                    <View
                      className='profile__quick-icon'
                      style={{ backgroundColor: item.color }}
                    >
                      <View className='profile__quick-shine' />
                      <Icon name={item.icon} size={44} color='#FFFFFF' />
                    </View>
                    {badge > 0 ? (
                      <View className='profile__quick-badge'>
                        <Text className='profile__quick-badge-text'>
                          {badge > 99 ? '99+' : badge}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text className='profile__quick-label'>{item.label}</Text>
                </View>
              )
            })}
          </View>

          <View className='profile__more' onClick={() => setShowServiceSheet(true)}>
            <Text className='profile__more-label'>全部服务</Text>
            <Text className='profile__more-tags'>班费 · 投票抽签 · 资料库 · 班级档案</Text>
            <Icon name='chevron-right' size={28} color='#CBD5E1' />
          </View>
        </View>

        <View className='profile__card profile__card--org'>
          <View className='profile__org-row'>
            <View
              className='profile__org-icon'
              style={{ backgroundColor: orgMeta.color }}
            >
              <Icon name={orgMeta.icon} size={32} color='#FFFFFF' />
            </View>
            <View className='profile__org-info'>
              <View className='profile__org-name-row'>
                <Text className='profile__org-name'>
                  {currentOrg?.name || displayClassName}
                </Text>
                <View className='profile__org-current'>
                  <Text className='profile__org-current-text'>当前</Text>
                </View>
              </View>
              <Text className='profile__org-meta'>
                {currentOrg?.role || displayRole} · {currentOrg?.memberCount ?? 0} 人
                {myOrgs.length > 1 ? ` · 另有 ${myOrgs.length - 1} 个组织` : ''}
              </Text>
            </View>
            <View className='profile__org-switch' onClick={() => setShowOrgSheet(true)}>
              <Text className='profile__org-switch-text'>切换</Text>
            </View>
          </View>
        </View>

        <View
          className='profile__help'
          onClick={() => Taro.navigateTo({ url: '/pages-sub/settings/help-feedback/index' })}
        >
          <View className='profile__help-icon'>
            <Icon name='headphones' size={40} color='#FFFFFF' />
          </View>
          <View className='profile__help-info'>
            <Text className='profile__help-title'>帮助与反馈</Text>
            <Text className='profile__help-sub'>问题反馈 · 使用指南 · 常见问题</Text>
          </View>
          <Icon name='chevron-right' size={32} color='#93B4E8' />
        </View>

        <View className='profile__card profile__card--feed'>
          <View className='profile__feed-head'>
            <Text className='profile__card-title'>最近动态</Text>
            {recentActivities.length > 2 ? (
              <View
                className='profile__feed-more'
                onClick={() => setShowAllFeed((v) => !v)}
              >
                <Text className='profile__feed-more-text'>{showAllFeed ? '收起' : '全部'}</Text>
                <Icon name='chevron-right' size={24} color='#0062FF' />
              </View>
            ) : null}
          </View>

          {recentActivities.length === 0 ? (
            <View className='profile__empty'>
              <Text className='profile__empty-text'>暂无动态</Text>
            </View>
          ) : (
            (showAllFeed ? recentActivities : recentActivities.slice(0, 2)).map((item, idx, arr) => {
              const meta = FEED_META[item.type] || FEED_META.message
              const isLast = idx === arr.length - 1
              return (
                <View
                  className={`profile__feed-row ${isLast ? 'is-last' : ''}`}
                  key={`${item.type}-${item.id || idx}`}
                  onClick={() =>
                    navigateTo(FEED_ROUTE[item.type] || '/pages/notice/index')
                  }
                >
                  <View className='profile__feed-icon' style={{ backgroundColor: meta.bg }}>
                    <Icon name={meta.icon} size={36} color={meta.color} />
                  </View>
                  <View className='profile__feed-body'>
                    <Text className='profile__feed-title'>{item.title}</Text>
                    <View className='profile__feed-meta'>
                      <View className='profile__feed-tag' style={{ backgroundColor: meta.bg }}>
                        <Text className='profile__feed-tag-text' style={{ color: meta.color }}>
                          {meta.label}
                        </Text>
                      </View>
                      <Text className='profile__feed-time'>{item.time}</Text>
                    </View>
                  </View>
                  <Icon name='chevron-right' size={32} color='#CBD5E1' />
                </View>
              )
            })
          )}
        </View>

        <View className='profile__card profile__card--list'>
          {settingRows.map((row, idx) => (
            <View
              className={`profile__set-row ${idx !== settingRows.length - 1 ? 'is-divided' : ''}`}
              key={row.key}
              onClick={row.onTap}
            >
              <View className='profile__set-icon' style={{ backgroundColor: row.bg }}>
                <Icon name={row.icon} size={36} color={row.color} />
              </View>
              <Text className='profile__set-label'>{row.label}</Text>
              <Text className='profile__set-value'>{row.value}</Text>
              <Icon name='chevron-right' size={32} color='#CBD5E1' />
            </View>
          ))}
        </View>
      </View>

      <Sheet
        open={showTodoSheet}
        title='待处理事项'
        onClose={() => setShowTodoSheet(false)}
      >
        <View className='sheet__list'>
          {todoActions.map((action) => (
            <View
              className='sheet__row'
              key={action.url}
              onClick={() => {
                setShowTodoSheet(false)
                navigateTo(action.url)
              }}
            >
              <Text className='sheet__row-text'>{action.label}</Text>
              <Icon name='chevron-right' size={32} color='#9CA3AF' />
            </View>
          ))}
        </View>
      </Sheet>

      <Sheet
        open={showServiceSheet}
        title='全部服务'
        onClose={() => setShowServiceSheet(false)}
      >
        <View className='sheet__grid'>
          {SERVICE_ITEMS.map((item) => (
            <View
              className='sheet__grid-item'
              key={item.url}
              onClick={() => {
                setShowServiceSheet(false)
                Taro.navigateTo({ url: item.url })
              }}
            >
              <View className='sheet__grid-icon' style={{ backgroundColor: item.bg }}>
                <Icon name={item.icon} size={36} color={item.color} />
              </View>
              <Text className='sheet__grid-label'>{item.label}</Text>
            </View>
          ))}
        </View>
      </Sheet>

      <Sheet
        open={showOrgSheet}
        title='我的组织'
        onClose={() => setShowOrgSheet(false)}
      >
        <View className='sheet__list'>
          {orgLoading ? (
            <View className='sheet__empty'>
              <Text className='sheet__empty-text'>加载中...</Text>
            </View>
          ) : myOrgs.length === 0 ? (
            <View className='sheet__empty'>
              <Text className='sheet__empty-text'>暂无组织</Text>
            </View>
          ) : (
            myOrgs.map((org) => {
              const isCurrent = org.id === currentClassId
              return (
                <View
                  className='sheet__org-row'
                  key={org.id}
                  onClick={() => (isCurrent ? setShowOrgSheet(false) : handleSwitchOrg(org))}
                >
                  <View className='sheet__org-info'>
                    <View className='sheet__org-name-row'>
                      <Text className='sheet__org-name'>{org.name}</Text>
                      {isCurrent ? (
                        <View className='sheet__org-current'>
                          <Text className='sheet__org-current-text'>当前</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className='sheet__org-meta'>
                      {org.role} · {org.memberCount} 人
                    </Text>
                  </View>
                  {!isCurrent ? <Text className='sheet__org-switch'>切换</Text> : null}
                </View>
              )
            })
          )}
          {currentOrg ? (
            <View
              className='sheet__leave'
              onClick={() => {
                setShowOrgSheet(false)
                handleLeaveOrg(currentOrg)
              }}
            >
              <Icon name='log-out' size={32} color='#DC2626' />
              <Text className='sheet__leave-text'>退出当前组织</Text>
            </View>
          ) : null}
        </View>
      </Sheet>

      <Sheet
        open={showEdit}
        title='编辑资料'
        onClose={() => {
          setShowEdit(false)
          setEditingField(null)
        }}
        footer={
          editingField === 'name' ? (
            <View className='sheet__footer-actions'>
              <View
                className='sheet__btn sheet__btn--cancel'
                onClick={() => {
                  setEditingField(null)
                  setShowEdit(false)
                }}
              >
                <Text className='sheet__btn-text sheet__btn-text--cancel'>取消</Text>
              </View>
              <View
                className={`sheet__btn sheet__btn--save ${saving ? 'is-disabled' : ''}`}
                onClick={handleSaveName}
              >
                <Text className='sheet__btn-text sheet__btn-text--save'>
                  {saving ? '保存中...' : '保存'}
                </Text>
              </View>
            </View>
          ) : undefined
        }
      >
        {!editingField ? (
          <View className='sheet__edit-menu'>
            <View
              className='sheet__edit-item'
              onClick={() => {
                setEditingField('name')
                setNewName(displayName)
              }}
            >
              <View className='sheet__edit-icon sheet__edit-icon--blue'>
                <Icon name='edit' size={40} color='#2563EB' />
              </View>
              <View className='sheet__edit-info'>
                <Text className='sheet__edit-title'>修改姓名</Text>
                <Text className='sheet__edit-sub'>当前: {displayName}</Text>
              </View>
              <Icon name='chevron-right' size={40} color='#9CA3AF' />
            </View>

            <View className='sheet__edit-item' onClick={() => handlePickImage('avatar')}>
              <View className='sheet__edit-icon sheet__edit-icon--green'>
                <Icon name='camera' size={40} color='#16A34A' />
              </View>
              <View className='sheet__edit-info'>
                <Text className='sheet__edit-title'>更换头像</Text>
                <Text className='sheet__edit-sub'>点击选择图片</Text>
              </View>
              <Icon name='chevron-right' size={40} color='#9CA3AF' />
            </View>

            <View className='sheet__edit-item' onClick={() => handlePickImage('backgroundImage')}>
              <View className='sheet__edit-icon sheet__edit-icon--purple'>
                <Icon name='image' size={40} color='#9333EA' />
              </View>
              <View className='sheet__edit-info'>
                <Text className='sheet__edit-title'>更换背景图</Text>
                <Text className='sheet__edit-sub'>点击选择图片</Text>
              </View>
              <Icon name='chevron-right' size={40} color='#9CA3AF' />
            </View>
          </View>
        ) : (
          <View className='sheet__name-form'>
            <Text className='sheet__name-label'>姓名</Text>
            <Input
              className='sheet__name-input'
              value={newName}
              maxlength={50}
              placeholder='请输入姓名'
              placeholderClass='profile__placeholder'
              onInput={(e) => setNewName(e.detail.value)}
            />
          </View>
        )}
      </Sheet>
      <BottomNav active='profile' />
    </View>
  )
}