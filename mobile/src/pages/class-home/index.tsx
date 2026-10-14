import { useState, useRef } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useDidShow, usePullDownRefresh } from '@tarojs/taro'

import { NavBar, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import type { IconName } from '@/constants/icons'
import { classesApi, messageApi } from '@/services'
import type { ClassDetail, ClassMember } from '@/services/classes'
import { useUserStore } from '@/stores'
import './index.scss'

interface Stats {
  unreadNotices: number
  pendingHomework: number
  recentAttendance: number
  upcomingActivity: number
}

const STAT_UNITS: Record<string, string> = {
  bell: '条',
  'file-text': '个',
  'check-circle': '次',
  flag: '个'
}

const STAT_COLORS: Record<string, string> = {
  bell: '#EF4444',
  'file-text': '#F97316',
  'check-circle': '#2563EB',
  flag: '#22C55E'
}

const STAT_BG: Record<string, string> = {
  bell: '#EF444414',
  'file-text': '#F9731614',
  'check-circle': '#2563EB14',
  flag: '#22C55E14'
}

export default function ClassHome() {
  const currentClassId = useUserStore((s) => s.currentClassId)

  const [classInfo, setClassInfo] = useState<ClassDetail | null>(null)
  const [members, setMembers] = useState<ClassMember[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    unreadNotices: 0,
    pendingHomework: 0,
    recentAttendance: 0,
    upcomingActivity: 0
  })
  const firstShowRef = useRef(true)

  const fetchData = async () => {
    if (!currentClassId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [info, memberRes] = await Promise.all([
        classesApi.getClassDetail(currentClassId),
        classesApi.getMembers(currentClassId, { pageSize: 200 })
      ])
      setClassInfo(info)
      setMembers(memberRes?.list || [])
    } catch {
      Taro.showToast({ title: '获取班级信息失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    if (!currentClassId) return
    try {
      const res: any = await messageApi.getList(currentClassId, { page: 1, pageSize: 100 })
      const list = res?.list || []
      const unread = list.filter(
        (m: any) => !m.isRead && m.read !== true
      ).length
      setStats((s) => ({ ...s, unreadNotices: unread }))
    } catch {
      // 静默失败，保持默认值
    }
  }

  const refresh = () => {
    fetchData()
    loadStats()
  }

  useLoad(() => {
    refresh()
  })

  useDidShow(() => {
    // 返回本页时重新拉取（首帧由 useLoad 触发，避免重复）
    if (firstShowRef.current) {
      firstShowRef.current = false
      return
    }
    refresh()
  })

  usePullDownRefresh(() => {
    refresh()
    Taro.stopPullDownRefresh()
  })

  const owner = members.find((m) => m.roleLevel === 'owner')
  const admins = members.filter((m) => m.roleLevel === 'admin')
  const displayAdmins = admins.slice(0, 3)
  const adminOverflow = admins.length - 3

  const formattedCode = classInfo?.code
    ? classInfo.code.length > 4
      ? `${classInfo.code.slice(0, 4)} ${classInfo.code.slice(4)}`
      : classInfo.code
    : ''

  const classId = currentClassId

  const statItems = [
    { label: '未读通知', value: stats.unreadNotices, icon: 'bell', period: STAT_UNITS.bell },
    { label: '待交作业', value: stats.pendingHomework, icon: 'file-text', period: STAT_UNITS['file-text'] },
    { label: '签到记录', value: stats.recentAttendance, icon: 'check-circle', period: STAT_UNITS['check-circle'] },
    { label: '班级活动', value: stats.upcomingActivity, icon: 'flag', period: STAT_UNITS.flag }
  ]

  const menuItems = [
    { title: '班级成员', subtitle: `${members.length} 人已加入`, icon: 'users' as IconName, path: '/pages-sub/settings/member-list/index' },
    { title: '导入学生名单', subtitle: 'Excel / 教务系统 / 群导入', icon: 'upload' as IconName, path: '/pages-sub/settings/import-students/index' },
    { title: '班级资料库', subtitle: `${classInfo?.materialCount ?? 0} 个文件`, icon: 'folder' as IconName, path: '/pages-sub/material/library/index' },
    { title: '班级档案', subtitle: `${classInfo?.archiveCount ?? 0} 个档案`, icon: 'file-check' as IconName, path: '/pages-sub/archive/class-archive/index' }
  ]

  function handleStatClick(icon: string) {
    if (icon === 'bell') {
      Taro.switchTab({ url: '/pages/notice/index' })
      return
    }
    Taro.showToast({ title: '功能开发中', icon: 'none' })
  }

  return (
    <View className='class-home'>
      <NavBar title='班级' showBack={false} />

      {!classId ? (
        <View className='class-home__no-class'>
          <View className='class-home__no-class-icon'>
            <Icon name='users' size={80} color='#0062FF' strokeWidth={1.5} />
          </View>
          <Text className='class-home__no-class-text'>暂无加入班级</Text>
          <View
            className='class-home__join-btn press-opacity'
            onClick={() => Taro.showToast({ title: '加入班级功能开发中', icon: 'none' })}
          >
            <Text className='class-home__join-btn-text'>去加入/创建班级</Text>
          </View>
        </View>
      ) : (
        <View className='class-home__content'>
          {/* 班级卡片 */}
          {loading ? (
            <ListLoading rows={3} />
          ) : classInfo ? (
            <View className='class-home__card'>
              <View className='class-home__card-top'>
                <Text className='class-home__card-name'>{classInfo.name}</Text>
                <View
                  className='class-home__card-qr press-scale'
                  onClick={() => Taro.showToast({ title: '二维码功能开发中', icon: 'none' })}
                >
                  <Icon name='qrcode' size={36} color='#FFFFFF' />
                </View>
              </View>

              <View className='class-home__card-meta'>
                <Text className='class-home__card-meta-text'>{members.length} 人</Text>
                <View className='class-home__card-dot' />
                <Text className='class-home__card-meta-text'>班级码 {formattedCode}</Text>
              </View>

              {classInfo.announcement && classInfo.announcement.trim() ? (
                <View className='class-home__card-announce'>
                  <Icon name='bell' size={28} color='#FFFFFFCC' />
                  <Text className='class-home__card-announce-text'>{classInfo.announcement}</Text>
                </View>
              ) : null}

              {(owner || admins.length > 0) ? (
                <View className='class-home__card-admins'>
                  {owner ? (
                    <View className='class-home__card-owner'>
                      <View className='class-home__card-owner-avatar'>
                        <Text className='class-home__card-owner-char'>{owner.name.charAt(0)}</Text>
                      </View>
                      <View className='class-home__card-owner-info'>
                        <Text className='class-home__card-owner-name'>{owner.name}</Text>
                        <View className='class-home__card-owner-tag'>
                          <Text className='class-home__card-owner-tag-text'>群主</Text>
                        </View>
                      </View>
                    </View>
                  ) : null}
                  {displayAdmins.length > 0 ? (
                    <Text className='class-home__card-admin-line'>
                      管理员：{displayAdmins.map((a) => a.name).join('、')}
                      {adminOverflow > 0 ? <Text className='class-home__card-admin-more'> +{adminOverflow}</Text> : null}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* 数据概览 */}
          <View className='class-home__stats'>
            {statItems.map((stat) => (
              <View
                key={stat.label}
                className='class-home__stat press-scale'
                onClick={() => handleStatClick(stat.icon)}
              >
                <View
                  className='class-home__stat-icon'
                  style={{ backgroundColor: STAT_BG[stat.icon] }}
                >
                  <View className='class-home__stat-icon-shine' />
                  <Icon name={stat.icon as IconName} size={40} color={STAT_COLORS[stat.icon]} />
                </View>
                <Text className='class-home__stat-value'>{stat.value}</Text>
                <Text className='class-home__stat-label'>
                  {stat.label}
                  {stat.value > 0 ? stat.period : ''}
                </Text>
              </View>
            ))}
          </View>

          {/* 菜单列表 */}
          <View className='class-home__menu'>
            {menuItems.map((item, index) => (
              <View
                key={item.title}
                className={`class-home__menu-item press-bg ${index < menuItems.length - 1 ? 'class-home__menu-item--border' : ''}`}
                onClick={() => Taro.navigateTo({ url: item.path })}
              >
                <View className='class-home__menu-item-left'>
                  <View className='class-home__menu-item-icon'>
                    <Icon name={item.icon} size={36} color='#0062FF' />
                  </View>
                  <View className='class-home__menu-item-text'>
                    <Text className='class-home__menu-item-title'>{item.title}</Text>
                    <Text className='class-home__menu-item-subtitle'>{item.subtitle}</Text>
                  </View>
                </View>
                <Icon name='chevron-right' size={32} color='#9CA3AF' />
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}