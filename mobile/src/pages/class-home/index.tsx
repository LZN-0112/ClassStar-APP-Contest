import { useCallback, useMemo, useRef, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useLoad, useDidShow, usePullDownRefresh } from '@tarojs/taro'

import { BottomNav, StatusBar } from '@/components/business'
import { Icon } from '@/components/ui'
import type { IconName } from '@/constants/icons'
import { classesApi, request } from '@/services'
import type { ClassDetail, ClassMember } from '@/services/classes'
import { useUserStore } from '@/stores'
import './index.scss'

// App 端班级详情额外返回组织类型与 Logo
interface ClassInfo extends ClassDetail {
  orgType?: string
  logoUrl?: string | null
}

type OrgType = 'class' | 'association' | 'committee' | 'club'

const ORG_TYPE_LABEL: Record<OrgType, string> = {
  class: '班级',
  association: '社团',
  committee: '部门',
  club: '兴趣小组'
}

const AVATAR_COLORS = ['#0062FF', '#10B981', '#F97316', '#8B5CF6', '#EF4444', '#0EA5E9']

const ROLE_RANK: Record<string, number> = { owner: 0, admin: 1, member: 2 }

function avatarColor(name: string) {
  let sum = 0
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

interface MenuItem {
  title: string
  subtitle: string
  icon: IconName
  path: string
}

export default function ClassHome() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const userInfo = useUserStore((s) => s.userInfo)
  const isManager = userInfo?.roleLevel === 'owner' || userInfo?.roleLevel === 'admin'

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [members, setMembers] = useState<ClassMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showQr, setShowQr] = useState(false)
  const [generatingQr, setGeneratingQr] = useState(false)
  const [announcementExpanded, setAnnouncementExpanded] = useState(false)
  const firstShowRef = useRef(true)

  const classId = currentClassId

  const fetchData = useCallback(async () => {
    if (!classId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [info, memberRes] = await Promise.all([
        classesApi.getClassDetail(classId),
        classesApi.getMembers(classId, { pageSize: 200 })
      ])
      setClassInfo(info as ClassInfo)
      setMembers(memberRes?.list || [])
    } catch {
      // 请求层已统一提示
    } finally {
      setLoading(false)
    }
  }, [classId])

  useLoad(() => {
    fetchData()
  })

  useDidShow(() => {
    // 返回本页时重新拉取（首帧由 useLoad 触发，避免重复）
    if (firstShowRef.current) {
      firstShowRef.current = false
      return
    }
    fetchData()
  })

  usePullDownRefresh(() => {
    fetchData().finally(() => Taro.stopPullDownRefresh())
  })

  const copyText = (text: string, tip: string) => {
    if (!text) return
    Taro.setClipboardData({
      data: text,
      success: () => Taro.showToast({ title: tip, icon: 'success' })
    })
  }

  const handleGenerateQr = async () => {
    if (!classId || generatingQr) return
    setGeneratingQr(true)
    try {
      const res = await request.post<{ qrCodeUrl?: string }>(`/classes/${classId}/qrcode`)
      const url = res?.qrCodeUrl
      if (url) {
        setClassInfo((prev) => (prev ? { ...prev, qrCodeUrl: url } : prev))
      }
      Taro.showToast({ title: '二维码已生成', icon: 'success' })
    } catch {
      // 请求层已统一提示
    } finally {
      setGeneratingQr(false)
    }
  }

  const owner = members.find((m) => m.roleLevel === 'owner')
  const admins = members.filter((m) => m.roleLevel === 'admin')

  const rankedMembers = useMemo(
    () => [...members].sort((a, b) => (ROLE_RANK[a.roleLevel ?? 'member'] ?? 2) - (ROLE_RANK[b.roleLevel ?? 'member'] ?? 2)),
    [members]
  )

  const formattedCode = classInfo?.code
    ? classInfo.code.length > 4
      ? `${classInfo.code.slice(0, 4)} ${classInfo.code.slice(4)}`
      : classInfo.code
    : ''

  const orgLabel = ORG_TYPE_LABEL[(classInfo?.orgType || 'class') as OrgType] || ORG_TYPE_LABEL.class

  const archiveItems: MenuItem[] = [
    {
      title: '班级成员',
      subtitle: `${classInfo?.memberCount ?? members.length} 人已加入`,
      icon: 'users',
      path: '/pages-sub/settings/member-list/index'
    },
    {
      title: '班级档案',
      subtitle: classInfo?.archiveCount ? `已归档 ${classInfo.archiveCount} 份` : '查看学生与班级档案',
      icon: 'archive',
      path: '/pages-sub/archive/class-archive/index'
    }
  ]

  const manageItems: MenuItem[] = [
    {
      title: '导入学生名单',
      subtitle: 'Excel / 教务系统 / 群导入',
      icon: 'upload',
      path: '/pages-sub/settings/import-students/index'
    },
    {
      title: '班级设置',
      subtitle: '班级信息、公告与退出班级',
      icon: 'settings',
      path: '/pages-sub/settings/class-settings/index'
    }
  ]

  const goPage = (path: string) => {
    Taro.navigateTo({ url: path })
  }

  // ---------- 空态：未加入任何班级 ----------
  if (!classId) {
    return (
      <View className='class-home'>
        <StatusBar />
        <View className='class-home__header class-home__header--empty'>
          <Text className='class-home__title'>班级</Text>
        </View>
        <View className='class-home__empty'>
          <View className='class-home__empty-inner'>
            <View className='class-home__empty-icon'>
              <Icon name='users' size={80} color='#0062FF' strokeWidth={1.5} />
            </View>
            <View className='class-home__empty-text'>
              <Text className='class-home__empty-title'>还没有加入班级</Text>
              <View className='class-home__empty-desc'>
                <Text className='class-home__empty-desc-line'>加入后，通知、作业、考勤和班费都会</Text>
                <Text className='class-home__empty-desc-line'>汇总在这里</Text>
              </View>
            </View>
            <View className='class-home__empty-actions'>
              <View
                className='class-home__empty-primary'
                hoverClass='class-home__hover-scale'
                hoverStayTime={80}
                onClick={() => goPage('/pages/auth/join-class/index')}
              >
                <Text className='class-home__empty-primary-text'>加入或创建班级</Text>
              </View>
              <View
                className='class-home__empty-secondary'
                hoverClass='class-home__hover-scale'
                hoverStayTime={80}
                onClick={() => goPage('/pages-sub/material/scan/index')}
              >
                <Text className='class-home__empty-secondary-text'>扫码加入</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='class-home'>
      <StatusBar />

      {/* Header */}
      <View className='class-home__header'>
        <Text className='class-home__title'>班级</Text>
        <View
          className='class-home__settings'
          hoverClass='class-home__hover-scale'
          hoverStayTime={80}
          onClick={() => goPage('/pages-sub/settings/class-settings/index')}
        >
          <Icon name='settings' size={38} color='#4B5563' strokeWidth={2} />
        </View>
      </View>

      <View className='class-home__content'>
        {/* 班级身份卡 */}
        {loading ? (
          <View className='class-home__skeleton'>
            <View className='class-home__skeleton-line class-home__skeleton-line--lg' />
            <View className='class-home__skeleton-line class-home__skeleton-line--md' />
            <View className='class-home__skeleton-line class-home__skeleton-line--sm' />
          </View>
        ) : classInfo ? (
          <View className='class-home__card'>
            <View className='class-home__card-circle class-home__card-circle--top' />
            <View className='class-home__card-circle class-home__card-circle--bottom' />

            <View className='class-home__card-head'>
              <View className='class-home__logo'>
                {classInfo.logoUrl ? (
                  <Image className='class-home__logo-img' src={classInfo.logoUrl} mode='aspectFill' />
                ) : (
                  <Text className='class-home__logo-char'>{classInfo.name.charAt(0)}</Text>
                )}
              </View>
              <View className='class-home__card-info'>
                <View className='class-home__name-row'>
                  <Text className='class-home__name'>{classInfo.name}</Text>
                  <Text className='class-home__org-badge'>{orgLabel}</Text>
                </View>
                <Text className='class-home__card-sub'>
                  {[classInfo.grade, classInfo.major].filter(Boolean).join(' · ') ||
                    '欢迎回来，一起把班级事务管清楚'}
                </Text>
              </View>
              <View
                className='class-home__card-qr'
                hoverClass='class-home__hover-qr'
                hoverStayTime={80}
                onClick={() => setShowQr(true)}
              >
                <Icon name='qrcode' size={42} color='#FFFFFF' strokeWidth={2} />
              </View>
            </View>

            <View className='class-home__card-meta'>
              <View className='class-home__pill'>
                <Text className='class-home__pill-text'>{classInfo.memberCount ?? members.length} 人</Text>
              </View>
              <View
                className='class-home__pill'
                hoverClass='class-home__hover-pill'
                hoverStayTime={80}
                onClick={() => copyText(classInfo.code || '', '班级码已复制')}
              >
                <Text className='class-home__pill-text'>班级码 {formattedCode}</Text>
                <Icon name='copy' size={28} color='rgba(255,255,255,0.8)' strokeWidth={2} />
              </View>
            </View>

            <View className='class-home__card-members'>
              <View className='class-home__avatars'>
                {rankedMembers.slice(0, 5).map((m, idx) => (
                  <View
                    key={m.id}
                    className={`class-home__avatar ${idx === 0 ? '' : 'class-home__avatar--overlap'}`}
                    style={{ backgroundColor: m.avatar ? '#fff' : avatarColor(m.name) }}
                  >
                    {m.avatar ? (
                      <Image className='class-home__avatar-img' src={m.avatar} mode='aspectFill' />
                    ) : (
                      <Text className='class-home__avatar-char'>{m.name.charAt(0)}</Text>
                    )}
                  </View>
                ))}
                {members.length > 5 && (
                  <View className='class-home__avatar-more'>
                    <Text className='class-home__avatar-more-text'>+{members.length - 5}</Text>
                  </View>
                )}
              </View>
              <View
                className='class-home__members-link'
                hoverClass='class-home__hover-opacity'
                hoverStayTime={80}
                onClick={() => goPage('/pages-sub/settings/member-list/index')}
              >
                <Text className='class-home__members-link-text'>成员</Text>
                <Icon name='chevron-right' size={28} color='rgba(255,255,255,0.85)' strokeWidth={2} />
              </View>
            </View>

            <Text className='class-home__owner'>
              {owner ? `群主 ${owner.name}` : '班级成员'}
              {admins.length > 0 ? ` · ${admins.length} 位管理员` : ''}
            </Text>
          </View>
        ) : null}

        {/* 班级公告 */}
        {classInfo && classInfo.announcement && classInfo.announcement.trim() ? (
          <View
            className='class-home__announce'
            hoverClass='class-home__hover-press'
            hoverStayTime={80}
            onClick={() => setAnnouncementExpanded((v) => !v)}
          >
            <View className='class-home__announce-icon'>
              <Icon name='bell' size={36} color='#F97316' strokeWidth={2} />
            </View>
            <View className='class-home__announce-body'>
              <View className='class-home__announce-label-row'>
                <Text className='class-home__announce-label'>班级公告</Text>
                <Text className='class-home__announce-hint'>
                  点击{announcementExpanded ? '收起' : '展开'}
                </Text>
              </View>
              <Text
                className={`class-home__announce-text ${
                  announcementExpanded ? 'class-home__announce-text--expanded' : ''
                }`}
              >
                {classInfo.announcement}
              </Text>
            </View>
          </View>
        ) : null}

        {/* 班级资料 */}
        <View className='class-home__section'>
          <Text className='class-home__section-title'>班级资料</Text>
          {archiveItems.map((item, idx) => (
            <View
              key={item.title}
              className={`class-home__row ${idx < archiveItems.length - 1 ? 'class-home__row--border' : ''}`}
              hoverClass='class-home__hover-opacity'
              hoverStayTime={80}
              onClick={() => goPage(item.path)}
            >
              <View className='class-home__row-icon class-home__row-icon--blue'>
                <Icon name={item.icon} size={36} color='#0062FF' strokeWidth={2} />
              </View>
              <View className='class-home__row-text'>
                <Text className='class-home__row-title'>{item.title}</Text>
                <Text className='class-home__row-subtitle'>{item.subtitle}</Text>
              </View>
              <Icon name='chevron-right' size={32} color='#C0C4CC' strokeWidth={2} />
            </View>
          ))}
        </View>

        {/* 班级管理（仅班委可见） */}
        {isManager && (
          <View className='class-home__section'>
            <View className='class-home__section-head'>
              <Text className='class-home__section-title class-home__section-title--flush'>班级管理</Text>
              <View className='class-home__section-badge'>
                <Text className='class-home__section-badge-text'>仅班委可见</Text>
              </View>
            </View>
            {manageItems.map((item, idx) => (
              <View
                key={item.title}
                className={`class-home__row ${idx < manageItems.length - 1 ? 'class-home__row--border' : ''}`}
                hoverClass='class-home__hover-opacity'
                hoverStayTime={80}
                onClick={() => goPage(item.path)}
              >
                <View className='class-home__row-icon class-home__row-icon--gray'>
                  <Icon name={item.icon} size={36} color='#4B5563' strokeWidth={2} />
                </View>
                <View className='class-home__row-text'>
                  <Text className='class-home__row-title'>{item.title}</Text>
                  <Text className='class-home__row-subtitle'>{item.subtitle}</Text>
                </View>
                <Icon name='chevron-right' size={32} color='#C0C4CC' strokeWidth={2} />
              </View>
            ))}
          </View>
        )}

        {/* 邀请卡片 */}
        <View className='class-home__invite'>
          <View className='class-home__invite-info'>
            <Text className='class-home__invite-title'>邀请同学加入</Text>
            <Text className='class-home__invite-sub'>
              班级码 <Text className='class-home__invite-code'>{formattedCode}</Text>
            </Text>
          </View>
          <View className='class-home__invite-actions'>
            <View
              className='class-home__invite-btn class-home__invite-btn--copy'
              hoverClass='class-home__hover-scale'
              hoverStayTime={80}
              onClick={() => copyText(classInfo?.code || '', '班级码已复制')}
            >
              <Icon name='copy' size={28} color='#0062FF' strokeWidth={2} />
              <Text className='class-home__invite-btn-text class-home__invite-btn-text--copy'>复制</Text>
            </View>
            <View
              className='class-home__invite-btn class-home__invite-btn--qr'
              hoverClass='class-home__hover-scale'
              hoverStayTime={80}
              onClick={() => setShowQr(true)}
            >
              <Icon name='share-2' size={28} color='#FFFFFF' strokeWidth={2} />
              <Text className='class-home__invite-btn-text'>二维码</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 二维码抽屉 */}
      {showQr && (
        <View className='class-home__sheet'>
          <View className='class-home__sheet-mask' onClick={() => setShowQr(false)} />
          <View className='class-home__sheet-panel'>
            <View className='class-home__sheet-handle'>
              <View className='class-home__sheet-handle-bar' />
            </View>
            <View className='class-home__sheet-head'>
              <Text className='class-home__sheet-title'>邀请同学加入</Text>
              <Text className='class-home__sheet-subtitle'>{classInfo?.name || ''}</Text>
            </View>
            <View className='class-home__sheet-body'>
              {classInfo?.qrCodeUrl ? (
                <Image className='class-home__qr-img' src={classInfo.qrCodeUrl} mode='aspectFit' />
              ) : (
                <View className='class-home__qr-empty'>
                  <Icon name='qrcode' size={64} color='#9CA3AF' strokeWidth={1.5} />
                  <Text className='class-home__qr-empty-text'>二维码未生成</Text>
                  {isManager && (
                    <View
                      className={`class-home__qr-generate ${
                        generatingQr ? 'class-home__qr-generate--disabled' : ''
                      }`}
                      hoverClass='class-home__hover-opacity'
                      hoverStayTime={80}
                      onClick={handleGenerateQr}
                    >
                      <Text className='class-home__qr-generate-text'>
                        {generatingQr ? '生成中...' : '生成二维码'}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              <View className='class-home__qr-info'>
                <Text className='class-home__qr-code'>班级码：{formattedCode}</Text>
                <Text className='class-home__qr-hint'>
                  {classInfo?.qrCodeUrl ? '同学扫描此二维码即可加入班级' : '生成二维码后可分享给同学扫码加入'}
                </Text>
              </View>
            </View>
            <View className='class-home__sheet-footer'>
              <View
                className='class-home__sheet-btn class-home__sheet-btn--copy'
                hoverClass='class-home__hover-opacity'
                hoverStayTime={80}
                onClick={() => copyText(classInfo?.code || '', '班级码已复制')}
              >
                <Text className='class-home__sheet-btn-text class-home__sheet-btn-text--copy'>复制班级码</Text>
              </View>
              <View
                className='class-home__sheet-btn class-home__sheet-btn--done'
                hoverClass='class-home__hover-opacity'
                hoverStayTime={80}
                onClick={() => setShowQr(false)}
              >
                <Text className='class-home__sheet-btn-text'>完成</Text>
              </View>
            </View>
          </View>
        </View>
      )}
      <BottomNav active='class' />
    </View>
  )
}