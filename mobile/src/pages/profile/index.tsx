import { useState } from 'react'
import { View, Text, ScrollView, Image, Input as TaroInput } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { NavBar, Modal } from '@/components/business'
import { Icon } from '@/components/ui'
import type { IconName } from '@/constants/icons'
import { classesApi, settingsApi, archiveApi, request, authApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import type { UserInfo } from '@/types/user'
import './index.scss'

interface ActivityItem {
  id: string
  type: string
  title: string
  time: string
}

interface OrgItem {
  id: string
  name: string
  role?: string
  memberCount?: number
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

interface QuickItem {
  label: string
  icon: IconName
  color: string
  bg: string
  url: string
  todoKey?: 'homework' | 'attendance' | 'activity'
}

const QUICK_ACCESS: QuickItem[] = [
  {
    label: '我的考勤',
    icon: 'clock',
    color: '#2563EB',
    bg: '#EFF6FF',
    url: '/pages-sub/attendance/my/index',
    todoKey: 'attendance'
  },
  {
    label: '我的作业',
    icon: 'edit',
    color: '#F97316',
    bg: '#FFF7ED',
    url: '/pages-sub/homework/my/index',
    todoKey: 'homework'
  },
  {
    label: '我的活动',
    icon: 'flag',
    color: '#EF4444',
    bg: '#FEF2F2',
    url: '/pages-sub/activity/my/index'
  },
  {
    label: '我的报名',
    icon: 'award',
    color: '#10B981',
    bg: '#ECFDF5',
    url: '/pages-sub/activity/my-registration/index',
    todoKey: 'activity'
  }
]

const SERVICES: { label: string; url: string }[] = [
  { label: '班费台账', url: '/pages-sub/fee/ledger/index' },
  { label: '投票与抽签', url: '/pages-sub/vote/list/index' },
  { label: '班级资料库', url: '/pages-sub/material/library/index' },
  { label: '班级档案', url: '/pages-sub/archive/class-archive/index' }
]

const ACTIVITY_META: Record<
  string,
  { icon: IconName; color: string; bg: string; label: string; url: string }
> = {
  attendance: {
    icon: 'clock',
    color: '#2563EB',
    bg: '#EFF6FF',
    label: '考勤',
    url: '/pages-sub/attendance/my/index'
  },
  homework: {
    icon: 'edit',
    color: '#F97316',
    bg: '#FFF7ED',
    label: '作业',
    url: '/pages-sub/homework/my/index'
  },
  activity: {
    icon: 'flag',
    color: '#EF4444',
    bg: '#FEF2F2',
    label: '活动',
    url: '/pages-sub/activity/my-registration/index'
  },
  message: {
    icon: 'bell',
    color: '#EC4899',
    bg: '#FDF2F8',
    label: '通知',
    url: '/pages/notice/index'
  }
}

function readAsBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const fs = Taro.getFileSystemManager()
      // #ifndef H5
      const data = fs.readFileSync(filePath, 'base64')
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

function formatRate(value: number | null | undefined): string {
  return value === null || value === undefined ? '--' : `${value}`
}

export default function Profile() {
  const userInfo = useUserStore((s) => s.userInfo)
  const setUserInfo = useUserStore((s) => s.setUserInfo)
  const setCurrentClass = useUserStore((s) => s.setCurrentClass)
  const isLoggedIn = useUserStore((s) => s.isLoggedIn)
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [me, setMe] = useState<MeStats | null>(null)
  const [todo, setTodo] = useState<TodoCount>({
    total: 0,
    homework: 0,
    attendance: 0,
    activity: 0,
    message: 0
  })
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [showAllFeed, setShowAllFeed] = useState(false)
  const [myOrgs, setMyOrgs] = useState<OrgItem[]>([])

  // 编辑弹窗
  const [showEdit, setShowEdit] = useState(false)
  const [editMode, setEditMode] = useState<'menu' | 'name'>('menu')
  const [newName, setNewName] = useState('')
  const [bio, setBio] = useState('')
  const [editingBio, setEditingBio] = useState(false)
  const [saving, setSaving] = useState(false)

  const user = userInfo as UserInfo | null
  const name = user?.name || (isLoggedIn ? '同学' : '未登录')
  const className = user?.className || '未加入班级'
  const currentOrg = myOrgs.find((org) => org.id === currentClassId)

  const loadUserInfo = () => {
    authApi
      .getUserInfo(currentClassId || undefined)
      .then((info) => setUserInfo(info))
      .catch(() => {
        /* 保留本地缓存信息 */
      })
  }

  const loadOverview = () => {
    if (!currentClassId) {
      setMe(null)
      return
    }
    archiveApi
      .getDashboard(currentClassId)
      .then((res: any) => {
        const ranking = res?.memberRanking
        const mine = ranking?.me
        if (!mine) {
          setMe(null)
          return
        }
        setMe({
          attendanceRate: mine.attendanceRate ?? null,
          homeworkRate: mine.homeworkRate ?? null,
          activityRate: mine.activityRate ?? null,
          rank: mine.rank ?? null,
          total: ranking?.total ?? 0
        })
      })
      .catch(() => setMe(null))
  }

  const loadTodos = () => {
    classesApi
      .getOrgsTodos()
      .then((res: any) => {
        const list = Array.isArray(res) ? res : []
        const cur = list.find((org: any) => org.orgId === currentClassId)
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
      .catch(() =>
        setTodo({ total: 0, homework: 0, attendance: 0, activity: 0, message: 0 })
      )
  }

  const loadActivities = () => {
    settingsApi
      .getRecentActivities(currentClassId || undefined)
      .then((res: any) => setActivities(res?.list || []))
      .catch(() => setActivities([]))
  }

  const loadMyOrgs = () => {
    classesApi
      .getMyClasses()
      .then((res: any) => setMyOrgs(Array.isArray(res) ? res : []))
      .catch(() => setMyOrgs([]))
  }

  const loadAll = () => {
    loadUserInfo()
    loadOverview()
    loadTodos()
    loadActivities()
    loadMyOrgs()
  }

  useDidShow(() => {
    if (!requireLogin()) return
    loadAll()
  })

  const handleSwitchOrg = (org: OrgItem) => {
    setCurrentClass(org.id)
    Taro.showToast({ title: `已切换到 ${org.name}`, icon: 'none' })
    setTimeout(() => {
      Taro.switchTab({ url: '/pages/home/index' })
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
      loadMyOrgs()
      if (org.id === currentClassId) {
        setCurrentClass('')
        Taro.reLaunch({ url: '/pages/auth/join-class/index' })
      }
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '退出组织失败',
        icon: 'none'
      })
    }
  }

  const handleOrgActions = async () => {
    if (myOrgs.length === 0) return
    const itemList = [
      ...myOrgs.map((org) => (org.id === currentClassId ? `${org.name}（当前）` : org.name)),
      '退出当前组织'
    ]
    try {
      const res = await Taro.showActionSheet({ itemList })
      const index = res.tapIndex
      if (index < myOrgs.length) {
        const org = myOrgs[index]
        if (org.id !== currentClassId) handleSwitchOrg(org)
        return
      }
      const cur = myOrgs.find((org) => org.id === currentClassId)
      if (cur) handleLeaveOrg(cur)
    } catch {
      /* 用户取消 */
    }
  }

  const handleTodoTap = async () => {
    if (todo.total === 0) return
    const actions: { label: string; url: string; switchTab?: boolean }[] = []
    if (todo.homework > 0) {
      actions.push({ label: `作业 ${todo.homework} 项`, url: '/pages-sub/homework/list/index' })
    }
    if (todo.attendance > 0) {
      actions.push({ label: `考勤 ${todo.attendance} 项`, url: '/pages-sub/attendance/list/index' })
    }
    if (todo.activity > 0) {
      actions.push({ label: `活动 ${todo.activity} 项`, url: '/pages-sub/activity/list/index' })
    }
    if (todo.message > 0) {
      actions.push({ label: `通知 ${todo.message} 条`, url: '/pages/notice/index', switchTab: true })
    }
    try {
      const res = await Taro.showActionSheet({ itemList: actions.map((item) => item.label) })
      const action = actions[res.tapIndex]
      if (!action) return
      if (action.switchTab) {
        Taro.switchTab({ url: action.url })
      } else {
        Taro.navigateTo({ url: action.url })
      }
    } catch {
      /* 用户取消 */
    }
  }

  const handleAllServices = async () => {
    try {
      const res = await Taro.showActionSheet({ itemList: SERVICES.map((item) => item.label) })
      const target = SERVICES[res.tapIndex]
      if (target) Taro.navigateTo({ url: target.url })
    } catch {
      /* 用户取消 */
    }
  }

  const handleFeedTap = (item: ActivityItem) => {
    const meta = ACTIVITY_META[item.type]
    if (!meta) return
    if (item.type === 'message') {
      Taro.switchTab({ url: meta.url })
    } else {
      Taro.navigateTo({ url: meta.url })
    }
  }

  const handleSaveName = async () => {
    if (!newName.trim() || newName.trim().length < 2) {
      Taro.showToast({ title: '姓名至少需要2个字符', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      await settingsApi.updateProfile({ name: newName.trim() })
      setUserInfo(user ? { ...user, name: newName.trim() } : user)
      setShowEdit(false)
      Taro.showToast({ title: '姓名修改成功', icon: 'success' })
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '修改失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBio = async () => {
    setSaving(true)
    try {
      await settingsApi.updateProfile({ bio: (bio || '').trim() })
      setUserInfo(user ? { ...user, bio: (bio || '').trim() } : user)
      setEditingBio(false)
      Taro.showToast({ title: '简介修改成功', icon: 'success' })
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '修改失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const handlePickImage = (field: 'avatar' | 'backgroundImage') => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      success: async (res) => {
        const path = res.tempFilePaths[0]
        if (!path) return
        setSaving(true)
        try {
          let base64 = ''
          // #ifndef H5
          base64 = await readAsBase64(path)
          if (!base64) throw new Error('读取图片失败')
          // #endif
          // #ifdef H5
          base64 = await new Promise<string>((resolve) => {
            const resAny: any = res
            resolve(resAny?.base64 || path)
          })
          // #endif
          if (!base64.startsWith('data:')) {
            base64 = ''
          }
          await settingsApi.updateProfile({ [field]: base64 || path })
          setUserInfo(user ? { ...user, [field]: base64 || path } : user)
          setShowEdit(false)
          Taro.showToast({
            title: `${field === 'avatar' ? '头像' : '背景图'}修改成功`,
            icon: 'success'
          })
        } catch (err) {
          Taro.showToast({ title: err instanceof Error ? err.message : '修改失败', icon: 'none' })
        } finally {
          setSaving(false)
        }
      }
    })
  }

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
      value: '学号 · 联系方式 · 身份',
      icon: 'user',
      color: '#0062FF',
      bg: '#EBF3FF',
      onTap: () => {
        setEditMode('menu')
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
      onTap: () => Taro.navigateTo({ url: '/pages-sub/settings/account-security/index' })
    },
    {
      key: 'notification',
      label: '通知与提醒',
      value: '消息 · 再次提醒',
      icon: 'bell',
      color: '#F59E0B',
      bg: '#FFF7ED',
      onTap: () => Taro.navigateTo({ url: '/pages-sub/settings/notification/index' })
    },
    {
      key: 'help',
      label: '帮助与关于',
      value: '帮助反馈 · 版本',
      icon: 'help-circle',
      color: '#64748B',
      bg: '#F1F5F9',
      onTap: () => Taro.navigateTo({ url: '/pages-sub/settings/help-feedback/index' })
    }
  ]

  return (
    <View className='profile'>
      <ScrollView className='profile__scroll' scrollY>
        {/* 头部渐变 */}
        <View
          className='profile__header'
          style={
            user?.backgroundImage
              ? {
                  backgroundImage: `url(${user.backgroundImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }
              : {}
          }
        >
          <NavBar
            title=''
            transparent
            showBack={false}
            right={
              <View
                className='profile__settings press-opacity'
                onClick={() => Taro.navigateTo({ url: '/pages-sub/settings/index' })}
              >
                <Icon name='settings' size={40} color='#FFFFFF' />
              </View>
            }
          />

          <View className='profile__header-content'>
            <View className='profile__avatar-wrap'>
              <View className='profile__avatar'>
                {user?.avatar ? (
                  <Image className='profile__avatar-img' src={user.avatar} mode='aspectFill' />
                ) : (
                  <Text className='profile__avatar-text'>{(name || '?').charAt(0)}</Text>
                )}
              </View>
              <View
                className='profile__avatar-edit press-scale'
                onClick={() => {
                  setEditMode('menu')
                  setShowEdit(true)
                }}
              >
                <Icon name='camera' size={28} color='#FFFFFF' />
              </View>
            </View>

            <View className='profile__ident'>
              <View className='profile__name-row'>
                <Text className='profile__name'>{name}</Text>
                <View className='profile__role-tag'>
                  <Text className='profile__role-text'>{user?.role || '学生'}</Text>
                </View>
              </View>
              <Text className='profile__class'>{className}</Text>
            </View>
          </View>

          {/* 简介 */}
          <View className='profile__bio'>
            {editingBio ? (
              <View className='profile__bio-edit'>
                <TaroInput
                  className='profile__bio-input'
                  value={bio}
                  maxlength={50}
                  placeholder='写一句个人简介...'
                  placeholderClass='profile__placeholder'
                  onInput={(e) => setBio(e.detail.value)}
                />
                <View className='profile__bio-save press-opacity' onClick={handleSaveBio}>
                  <Icon name='check' size={30} color='#FFFFFF' />
                </View>
              </View>
            ) : (
              <View
                className='profile__bio-view press-bg'
                onClick={() => {
                  setBio(user?.bio || '')
                  setEditingBio(true)
                }}
              >
                <Text className='profile__bio-text'>{user?.bio || '点击添加个人简介...'}</Text>
                <Icon name='edit' size={26} color='rgba(255,255,255,0.6)' />
              </View>
            )}
          </View>
        </View>

        <View className='profile__content'>
          {/* 1 我的概览：数据 + 待办 + 排名 */}
          <View className='profile__card'>
            <View className='profile__card-head'>
              <View className='profile__card-head-left'>
                <Text className='profile__card-title'>我的概览</Text>
                <Text className='profile__card-sub'>近 30 天 · {className}</Text>
              </View>
              <View
                className='profile__rank press-opacity'
                onClick={() => Taro.switchTab({ url: '/pages/data/index' })}
              >
                <Text className='profile__rank-text'>
                  {me?.rank ? `班级第 ${me.rank} 名` : '暂无排名'}
                </Text>
                <Icon name='chevron-right' size={22} color='#0062FF' />
              </View>
            </View>

            <View className='profile__metrics'>
              <View className='profile__metric'>
                <Text className='profile__metric-label'>出勤率</Text>
                <View className='profile__metric-value-row'>
                  <Text className='profile__metric-value'>
                    {formatRate(me?.attendanceRate)}
                  </Text>
                  {me?.attendanceRate !== null && me?.attendanceRate !== undefined ? (
                    <Text className='profile__metric-unit'>%</Text>
                  ) : null}
                </View>
              </View>
              <View className='profile__metric'>
                <Text className='profile__metric-label'>作业完成</Text>
                <View className='profile__metric-value-row'>
                  <Text className='profile__metric-value'>{formatRate(me?.homeworkRate)}</Text>
                  {me?.homeworkRate !== null && me?.homeworkRate !== undefined ? (
                    <Text className='profile__metric-unit'>%</Text>
                  ) : null}
                </View>
              </View>
              <View className='profile__metric'>
                <Text className='profile__metric-label'>活动参与</Text>
                <View className='profile__metric-value-row'>
                  <Text className='profile__metric-value'>{formatRate(me?.activityRate)}</Text>
                  {me?.activityRate !== null && me?.activityRate !== undefined ? (
                    <Text className='profile__metric-unit'>%</Text>
                  ) : null}
                </View>
              </View>
            </View>

            <View
              className={`profile__todo ${todo.total === 0 ? 'profile__todo--empty' : ''}`}
              onClick={handleTodoTap}
            >
              <View className='profile__todo-dot' />
              <Text className='profile__todo-text'>
                {todo.total > 0
                  ? `${todo.total} 项待处理 · 作业 ${todo.homework} · 考勤 ${todo.attendance}`
                  : '当前没有待处理事项'}
              </Text>
              {todo.total > 0 ? (
                <View className='profile__todo-go'>
                  <Text className='profile__todo-go-text'>去处理</Text>
                  <Icon name='chevron-right' size={20} color='#B45309' />
                </View>
              ) : null}
            </View>
          </View>

          {/* 2 快捷入口 + 全部服务 */}
          <View className='profile__card'>
            <View className='profile__quick-grid'>
              {QUICK_ACCESS.map((item) => {
                const badge = item.todoKey ? todo[item.todoKey] : 0
                return (
                  <View
                    className='profile__quick-item press-scale'
                    key={item.label}
                    onClick={() => Taro.navigateTo({ url: item.url })}
                  >
                    <View className='profile__quick-icon' style={{ backgroundColor: item.bg }}>
                      <Icon name={item.icon} size={40} color={item.color} />
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

            <View className='profile__more press-opacity' onClick={handleAllServices}>
              <Text className='profile__more-label'>全部服务</Text>
              <Text className='profile__more-tags'>班费 · 投票抽签 · 资料库 · 班级档案</Text>
              <Icon name='chevron-right' size={24} color='#CBD5E1' />
            </View>
          </View>

          {/* 3 我的组织：仅当前组织一行 */}
          <View className='profile__card profile__card--tight'>
            <View className='profile__org-row'>
              <View className='profile__org-icon'>
                <Icon name='school' size={34} color='#FFFFFF' />
              </View>
              <View className='profile__org-info'>
                <View className='profile__org-name-row'>
                  <Text className='profile__org-name'>{currentOrg?.name || className}</Text>
                  <View className='profile__org-current'>
                    <Text className='profile__org-current-text'>当前</Text>
                  </View>
                </View>
                <Text className='profile__org-meta'>
                  {currentOrg?.role || user?.role || '成员'} · {currentOrg?.memberCount ?? 0} 人
                  {myOrgs.length > 1 ? ` · 另有 ${myOrgs.length - 1} 个组织` : ''}
                </Text>
              </View>
              {myOrgs.length > 0 ? (
                <View className='profile__org-switch press-opacity' onClick={handleOrgActions}>
                  <Text className='profile__org-switch-text'>切换</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* 4 最近动态：2 条 + 全部 */}
          <View className='profile__card profile__card--feed'>
            <View className='profile__card-head'>
              <Text className='profile__card-title'>最近动态</Text>
              {activities.length > 2 ? (
                <View
                  className='profile__feed-more press-opacity'
                  onClick={() => setShowAllFeed((v) => !v)}
                >
                  <Text className='profile__feed-more-text'>{showAllFeed ? '收起' : '全部'}</Text>
                  <Icon name='chevron-right' size={20} color='#0062FF' />
                </View>
              ) : null}
            </View>

            {activities.length === 0 ? (
              <Text className='profile__empty'>暂无动态</Text>
            ) : (
              (showAllFeed ? activities : activities.slice(0, 2)).map((item) => {
                const meta = ACTIVITY_META[item.type]
                return (
                  <View
                    className='profile__feed-row press-bg'
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleFeedTap(item)}
                  >
                    <View
                      className='profile__feed-icon'
                      style={{ backgroundColor: meta?.bg || '#FDF2F8' }}
                    >
                      <Icon
                        name={meta?.icon || 'bell'}
                        size={30}
                        color={meta?.color || '#EC4899'}
                      />
                    </View>
                    <View className='profile__feed-body'>
                      <Text className='profile__feed-title'>{item.title}</Text>
                      <View className='profile__feed-meta'>
                        <View
                          className='profile__feed-tag'
                          style={{ backgroundColor: meta?.bg || '#FDF2F8' }}
                        >
                          <Text
                            className='profile__feed-tag-text'
                            style={{ color: meta?.color || '#EC4899' }}
                          >
                            {meta?.label || '动态'}
                          </Text>
                        </View>
                        <Text className='profile__feed-time'>{item.time}</Text>
                      </View>
                    </View>
                    <Icon name='chevron-right' size={24} color='#CBD5E1' />
                  </View>
                )
              })
            )}
          </View>

          {/* 5 设置与服务 */}
          <View className='profile__card profile__card--list'>
            {settingRows.map((row, idx) => (
              <View
                className={`profile__set-row press-bg ${
                  idx === settingRows.length - 1 ? 'profile__set-row--last' : ''
                }`}
                key={row.key}
                onClick={row.onTap}
              >
                <View className='profile__set-icon' style={{ backgroundColor: row.bg }}>
                  <Icon name={row.icon} size={30} color={row.color} />
                </View>
                <Text className='profile__set-label'>{row.label}</Text>
                <Text className='profile__set-value'>{row.value}</Text>
                <Icon name='chevron-right' size={26} color='#CBD5E1' />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* 编辑弹窗 */}
      <Modal
        visible={showEdit}
        title='编辑资料'
        onClose={() => {
          setShowEdit(false)
          setEditingBio(false)
        }}
        position='bottom'
      >
        {editMode === 'menu' ? (
          <View className='profile__edit-menu'>
            <View
              className='profile__edit-item press-bg'
              onClick={() => {
                setNewName(name)
                setEditMode('name')
              }}
            >
              <View className='profile__edit-icon profile__edit-icon--blue'>
                <Icon name='edit' size={36} color='#2563EB' />
              </View>
              <View className='profile__edit-item-info'>
                <Text className='profile__edit-item-title'>修改姓名</Text>
                <Text className='profile__edit-item-sub'>当前：{name}</Text>
              </View>
              <Icon name='chevron-right' size={32} color='#9CA3AF' />
            </View>

            <View className='profile__edit-item press-bg' onClick={() => handlePickImage('avatar')}>
              <View className='profile__edit-icon profile__edit-icon--green'>
                <Icon name='camera' size={36} color='#16A34A' />
              </View>
              <View className='profile__edit-item-info'>
                <Text className='profile__edit-item-title'>更换头像</Text>
                <Text className='profile__edit-item-sub'>点击选择图片</Text>
              </View>
              <Icon name='chevron-right' size={32} color='#9CA3AF' />
            </View>

            <View
              className='profile__edit-item press-bg'
              onClick={() => handlePickImage('backgroundImage')}
            >
              <View className='profile__edit-icon profile__edit-icon--purple'>
                <Icon name='image' size={36} color='#9333EA' />
              </View>
              <View className='profile__edit-item-info'>
                <Text className='profile__edit-item-title'>更换背景图</Text>
                <Text className='profile__edit-item-sub'>点击选择图片</Text>
              </View>
              <Icon name='chevron-right' size={32} color='#9CA3AF' />
            </View>
          </View>
        ) : (
          <View className='profile__edit-name'>
            <Text className='profile__edit-name-label'>姓名</Text>
            <TaroInput
              className='profile__edit-name-input'
              value={newName}
              maxlength={50}
              placeholder='请输入姓名'
              placeholderClass='profile__placeholder'
              onInput={(e) => setNewName(e.detail.value)}
            />
            <View className='profile__edit-name-actions'>
              <View
                className='profile__edit-cancel press-opacity'
                onClick={() => {
                  setEditMode('menu')
                }}
              >
                <Text className='profile__edit-cancel-text'>取消</Text>
              </View>
              <View className='profile__edit-save press-opacity' onClick={handleSaveName}>
                <Text className='profile__edit-save-text'>{saving ? '保存中...' : '保存'}</Text>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </View>
  )
}
