import { useState, useEffect } from 'react'
import { View, Text, ScrollView, Image, Input as TaroInput } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { NavBar, Modal, StatCard } from '@/components/business'
import { Icon } from '@/components/ui'
import type { IconName } from '@/constants/icons'
import { classesApi, settingsApi, archiveApi, request, authApi, clearCsrfCache } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import type { UserInfo } from '@/types/user'
import './index.scss'

interface ActivityItem {
  type: string
  title: string
  time: string
}

interface OrgItem {
  id: string
  name: string
  orgType?: string
  role?: string
  memberCount?: number
}

const QUICK_ACCESS: { label: string; icon: IconName; color: string }[] = [
  { label: '我的考勤', icon: 'clock', color: '#2563EB' },
  { label: '我的作业', icon: 'edit', color: '#F97316' },
  { label: '我的活动', icon: 'flag', color: '#EF4444' },
  { label: '我的报名', icon: 'award', color: '#22C55E' }
]

const ACTIVITY_ICON: Record<string, IconName> = {
  attendance: 'clock',
  homework: 'edit',
  activity: 'flag',
  message: 'bell'
}

const ACTIVITY_COLOR: Record<string, string> = {
  attendance: '#2563EB',
  homework: '#F97316',
  activity: '#EF4444',
  message: '#EC4899'
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

export default function Profile() {
  const userInfo = useUserStore((s) => s.userInfo)
  const setUserInfo = useUserStore((s) => s.setUserInfo)
  const setCurrentClass = useUserStore((s) => s.setCurrentClass)
  const logout = useUserStore((s) => s.logout)
  const isLoggedIn = useUserStore((s) => s.isLoggedIn)
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [stats, setStats] = useState<{
    attendanceRate: number
    homeworkSubmitRate: number
    activityParticipationRate: number
  } | null>(null)

  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [myOrgs, setMyOrgs] = useState<OrgItem[]>([])
  const [orgLoading, setOrgLoading] = useState(false)

  // 编辑弹窗
  const [showEdit, setShowEdit] = useState(false)
  const [editMode, setEditMode] = useState<'menu' | 'name' | 'bio'>('menu')
  const [newName, setNewName] = useState('')
  const [bio, setBio] = useState('')
  const [editingBio, setEditingBio] = useState(false)
  const [saving, setSaving] = useState(false)

  const user = userInfo as UserInfo | null
  const name = user?.name || (isLoggedIn ? '同学' : '未登录')
  const className = user?.className || '未加入班级'
  const studentId = user?.studentId || '未设置'
  const phone = user?.phone || '未设置'
  const isCommittee = user?.isCommittee ?? false
  const enrollYear = user?.createdAt
    ? new Date(user.createdAt).getFullYear().toString()
    : '-'

  const loadStats = () => {
    if (!currentClassId) return
    archiveApi
      .getDashboard(currentClassId)
      .then((res: any) => {
        const d = res || {}
        setStats({
          attendanceRate: d.attendanceRate ?? 0,
          homeworkSubmitRate: d.homeworkSubmitRate ?? 0,
          activityParticipationRate: d.activityParticipationRate ?? 0
        })
      })
      .catch(() => setStats(null))
  }

  const loadActivities = () => {
    settingsApi
      .getRecentActivities()
      .then((res: any) => setActivities((res?.list) || []))
      .catch(() => setActivities([]))
  }

  const loadMyOrgs = () => {
    setOrgLoading(true)
    classesApi
      .getMyClasses()
      .then((res: any) => setMyOrgs(res || []))
      .catch(() => setMyOrgs([]))
      .finally(() => setOrgLoading(false))
  }

  useEffect(() => {
    if (!requireLogin()) return
    loadStats()
    loadActivities()
    loadMyOrgs()
  }, [currentClassId])

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
          Taro.showToast({ title: `${field === 'avatar' ? '头像' : '背景图'}修改成功`, icon: 'success' })
        } catch (err) {
          Taro.showToast({ title: err instanceof Error ? err.message : '修改失败', icon: 'none' })
        } finally {
          setSaving(false)
        }
      }
    })
  }

  const handleQuick = (label: string) => {
    Taro.showToast({ title: `${label}功能开发中`, icon: 'none' })
  }

  const handleLogout = async () => {
    const res = await Taro.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      confirmText: '退出',
      confirmColor: '#ef4444'
    })
    if (!res.confirm) return
    try {
      await authApi.logout()
    } catch {
      /* 服务端登出失败不阻塞本地清理 */
    }
    clearCsrfCache()
    logout()
    Taro.reLaunch({ url: '/pages/auth/login/index' })
  }

  const renderInfoItem = (icon: IconName, label: string, value: string, isLast?: boolean) => (
    <View className={`profile__info-item ${isLast ? '' : 'profile__info-item--border'}`}>
      <Icon name={icon} size={36} color='#111827' />
      <Text className='profile__info-label'>{label}</Text>
      <View className='profile__info-spacer' />
      <Text className='profile__info-value'>{value}</Text>
      <Icon name='chevron-right' size={32} color='#4B5563' />
    </View>
  )

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
              <View className='profile__settings press-opacity' onClick={() => handleQuick('设置')}>
                <Icon name='settings' size={40} color='#FFFFFF' />
              </View>
            }
          />

          <View className='profile__header-content'>
            <View className='profile__avatar-wrap'>
              <View className='profile__avatar'>
                {user?.avatar ? (
                  <Image
                    className='profile__avatar-img'
                    src={user.avatar}
                    mode='aspectFill'
                  />
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
          {/* 成就徽章 */}
          <View className='profile__badges'>
            <View className='profile__badge'>
              <Icon name='award' size={28} color='#F59E0B' />
              <Text className='profile__badge-text'>活跃成员</Text>
            </View>
            {isCommittee ? (
              <View className='profile__badge profile__badge--committee'>
                <Icon name='award' size={28} color='#EF4444' />
                <Text className='profile__badge-text'>班委</Text>
              </View>
            ) : null}
          </View>

          {/* 数据统计 */}
          <View className='profile__stats'>
            <StatCard
              icon='check-circle'
              value={stats ? `${stats.attendanceRate}%` : '--'}
              label='出勤率'
              color='#3B82F6'
            />
            <StatCard
              icon='edit'
              value={stats ? `${stats.homeworkSubmitRate}%` : '--'}
              label='作业完成率'
              color='#F97316'
            />
            <StatCard
              icon='flag'
              value={stats ? `${stats.activityParticipationRate}%` : '--'}
              label='活动参与率'
              color='#10B981'
            />
          </View>

          {/* 快捷入口 */}
          <View className='profile__quick'>
            {QUICK_ACCESS.map((item) => (
              <View
                className='profile__quick-item press-scale'
                key={item.label}
                onClick={() => handleQuick(item.label)}
              >
                <View
                  className='profile__quick-icon'
                  style={{ backgroundColor: item.color }}
                >
                  <Icon name={item.icon} size={40} color='#FFFFFF' />
                </View>
                <Text className='profile__quick-label'>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* 最近动态 */}
          <View className='profile__section'>
            <View className='profile__section-title-row'>
              <View className='profile__section-accent profile__section-accent--purple' />
              <Text className='profile__section-title'>最近动态</Text>
            </View>
            <View className='profile__section-card'>
              {activities.length === 0 ? (
                <Text className='profile__empty-text'>暂无动态</Text>
              ) : (
                activities.map((item, idx) => (
                  <View className='profile__activity' key={idx}>
                    <View
                      className='profile__activity-icon'
                      style={{ backgroundColor: ACTIVITY_COLOR[item.type] || '#EC4899' }}
                    >
                      <Icon
                        name={ACTIVITY_ICON[item.type] || 'bell'}
                        size={36}
                        color='#FFFFFF'
                      />
                    </View>
                    <Text className='profile__activity-title'>{item.title}</Text>
                    <Text className='profile__activity-time'>{item.time}</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* 我的组织 */}
          <View className='profile__section'>
            <View className='profile__section-title-row'>
              <View className='profile__section-accent profile__section-accent--violet' />
              <Text className='profile__section-title'>我的组织</Text>
            </View>
            <View className='profile__section-card'>
              {orgLoading ? (
                <Text className='profile__empty-text'>加载中...</Text>
              ) : myOrgs.length === 0 ? (
                <Text className='profile__empty-text'>暂无组织</Text>
              ) : (
                myOrgs.map((org, idx) => {
                  const isCurrent = org.id === currentClassId
                  const isLast = idx === myOrgs.length - 1
                  return (
                    <View
                      className={`profile__org ${isLast ? '' : 'profile__org--border'}`}
                      key={org.id}
                    >
                      <View className='profile__org-icon'>
                        <Icon name='users' size={30} color='#FFFFFF' />
                      </View>
                      <View className='profile__org-info'>
                        <View className='profile__org-name-row'>
                          <Text className='profile__org-name'>{org.name}</Text>
                          {isCurrent ? (
                            <View className='profile__org-current'>
                              <Text className='profile__org-current-text'>当前</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text className='profile__org-meta'>
                          {org.role || '成员'} · {org.memberCount ?? 0} 人
                        </Text>
                      </View>
                      <View className='profile__org-actions'>
                        {!isCurrent ? (
                          <View
                            className='profile__org-switch press-opacity'
                            onClick={() => handleSwitchOrg(org)}
                          >
                            <Text className='profile__org-switch-text'>切换</Text>
                          </View>
                        ) : null}
                        <View
                          className='profile__org-leave press-opacity'
                          onClick={() => handleLeaveOrg(org)}
                        >
                          <Icon name='trash-2' size={32} color='#9CA3AF' />
                        </View>
                      </View>
                    </View>
                  )
                })
              )}
            </View>
          </View>

          {/* 基础信息 */}
          <View className='profile__section'>
            <View className='profile__section-title-row'>
              <View className='profile__section-accent profile__section-accent--blue' />
              <Text className='profile__section-title'>学籍信息</Text>
            </View>
            <View className='profile__section-card'>
              {renderInfoItem('file-text', '学号', studentId)}
              {renderInfoItem('users', '班级', className)}
              {renderInfoItem('school', '入学年份', enrollYear, true)}
            </View>
          </View>

          <View className='profile__section'>
            <View className='profile__section-title-row'>
              <View className='profile__section-accent profile__section-accent--green' />
              <Text className='profile__section-title'>联系方式</Text>
            </View>
            <View className='profile__section-card'>
              {renderInfoItem('phone', '手机号', phone, true)}
            </View>
          </View>

          <View className='profile__section'>
            <View className='profile__section-title-row'>
              <View className='profile__section-accent profile__section-accent--amber' />
              <Text className='profile__section-title'>身份信息</Text>
            </View>
            <View className='profile__section-card'>
              {renderInfoItem('award', '角色', user?.role || '学生')}
              {renderInfoItem('award', '班委职务', isCommittee ? (user?.role || '班委') : '普通成员', true)}
            </View>
          </View>

          {isLoggedIn ? (
            <View className='profile__logout press-opacity' onClick={handleLogout}>
              <Text className='profile__logout-text'>退出登录</Text>
            </View>
          ) : null}
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

            <View
              className='profile__edit-item press-bg'
              onClick={() => handlePickImage('avatar')}
            >
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
                <Text className='profile__edit-save-text'>
                  {saving ? '保存中...' : '保存'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </View>
  )
}