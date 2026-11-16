import { useMemo, useState } from 'react'
import { Image, Input, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { ConfirmDialog, PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { authApi, settingsApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface SettingRowDef {
  key: string
  label: string
  desc?: string
  icon: string
  tile: string
  value?: string
  valueStrong?: boolean
  url: string
}

interface SettingGroup {
  title: string
  rows: SettingRowDef[]
}

function maskPhone(phone?: string) {
  if (!phone) return ''
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}

export default function Settings() {
  const { requireLogin } = useAuth()
  const user = useUserStore((state) => state.userInfo)
  const [query, setQuery] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [notify, setNotify] = useState<{ on: number; total: number } | null>(null)

  useLoad(() => {
    requireLogin()
    settingsApi
      .getSettings()
      .then((data) => {
        const raw = ((data as { notificationSettings?: Record<string, unknown> })
          ?.notificationSettings || {}) as Record<string, unknown>
        const values = Object.values(raw).filter(
          (v) => typeof v === 'boolean' || v === 'true' || v === 'false'
        )
        if (values.length > 0) {
          setNotify({
            on: values.filter((v) => v === true || v === 'true').length,
            total: values.length
          })
        }
      })
      .catch(() => {
        // 摘要属于辅助信息，读取失败时不展示
      })
  })

  const go = (url: string) => {
    Taro.navigateTo({ url })
  }

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await authApi.logout()
      Taro.showToast({ title: '已退出登录', icon: 'success' })
    } catch {
      // 即使接口失败也继续清理本地状态
    } finally {
      useUserStore.getState().logout()
      setIsLoggingOut(false)
      setShowLogoutConfirm(false)
      Taro.reLaunch({ url: '/pages/auth/login/index' })
    }
  }

  const displayName = user?.name || '同学'
  const roleLabel =
    user?.role ||
    (user?.roleLevel === 'owner'
      ? '创建者'
      : user?.roleLevel === 'admin'
        ? '管理员'
        : user?.isCommittee
          ? '班委'
          : '')
  const className = user?.className || ''
  const phone = maskPhone(user?.phone)

  const groups: SettingGroup[] = useMemo(
    () => [
      {
        title: '账号与安全',
        rows: [
          {
            key: 'account-security',
            label: '账号与安全',
            desc: phone ? `手机号 ${phone}` : undefined,
            icon: 'shield',
            tile: 'shield',
            url: '/pages-sub/settings/account-security/index'
          },
          {
            key: 'change-password',
            label: '修改密码',
            desc: '验证原密码后可重设',
            icon: 'key-round',
            tile: 'key',
            url: '/pages-sub/settings/change-password/index'
          }
        ]
      },
      {
        title: '通知与隐私',
        rows: [
          {
            key: 'notification',
            label: '消息通知',
            desc: '班级通知、作业与考勤提醒',
            icon: 'bell',
            tile: 'bell',
            value: notify ? `已开启 ${notify.on}/${notify.total}` : undefined,
            valueStrong: !!notify && notify.total > 0,
            url: '/pages-sub/settings/notification/index'
          },
          {
            key: 'privacy',
            label: '隐私设置',
            desc: '资料与动态的可见范围',
            icon: 'eye',
            tile: 'eye',
            url: '/pages-sub/settings/privacy/index'
          }
        ]
      },
      {
        title: '通用',
        rows: [
          {
            key: 'general',
            label: '通用设置',
            desc: '显示、语言与存储',
            icon: 'settings',
            tile: 'gear',
            url: '/pages-sub/settings/general/index'
          }
        ]
      },
      {
        title: '帮助与关于',
        rows: [
          {
            key: 'help',
            label: '帮助与反馈',
            desc: '常见问题与意见反馈',
            icon: 'help-circle',
            tile: 'help',
            url: '/pages-sub/settings/help-feedback/index'
          },
          {
            key: 'about',
            label: '关于班务星',
            desc: '版本信息与用户协议',
            icon: 'info',
            tile: 'info',
            url: '/pages-sub/settings/about/index'
          }
        ]
      }
    ],
    [phone, notify]
  )

  const keyword = query.trim()
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      rows: group.rows.filter(
        (row) => !keyword || row.label.includes(keyword) || (row.desc || '').includes(keyword)
      )
    }))
    .filter((group) => group.rows.length > 0)

  return (
    <View className='stg'>
      <PageHeader
        title='设置'
        subtitle='账号、通知与隐私偏好'
        coverHeight={220}
        barBg='#F4F6FA'
      />

      <View className='stg__body'>
        {/* 搜索 */}
        <View className='stg__search'>
          <Icon name='search' size={32} color='#9CA3AF' strokeWidth={2.2} />
          <Input
            className='stg__search-input'
            value={query}
            onInput={(e) => setQuery(e.detail.value)}
            placeholder='搜索设置项，如「通知」「密码」'
            placeholderClass='stg__search-placeholder'
            confirmType='search'
          />
          {query ? (
            <View className='stg__search-clear' onClick={() => setQuery('')}>
              <Icon name='x' size={32} color='#C7D0DC' strokeWidth={2.2} />
            </View>
          ) : null}
        </View>

        {/* 账号卡 */}
        <View
          className='stg__account'
          onClick={() => Taro.reLaunch({ url: '/pages/profile/index' })}
        >
          <View className='stg__avatar'>
            {user?.avatar ? (
              <Image className='stg__avatar-img' src={user.avatar} mode='aspectFill' />
            ) : (
              displayName.charAt(0)
            )}
          </View>
          <View className='stg__account-main'>
            <View className='stg__account-name-row'>
              <Text className='stg__account-name'>{displayName}</Text>
              {roleLabel ? <Text className='stg__role'>{roleLabel}</Text> : null}
            </View>
            <Text className='stg__account-sub'>
              {[className, phone].filter(Boolean).join(' · ') || '尚未加入班级'}
            </Text>
          </View>
          <Text className='stg__account-edit'>编辑资料</Text>
          <Icon name='chevron-right' size={36} color='#C7D0DC' strokeWidth={2} />
        </View>

        {/* 设置分组 */}
        {visibleGroups.length === 0 ? (
          <View className='stg__empty'>没有找到相关设置项</View>
        ) : (
          visibleGroups.map((group) => (
            <View key={group.title} className='stg__group'>
              <Text className='stg__group-title'>{group.title}</Text>
              <View className='stg__card'>
                {group.rows.map((row, index) => (
                  <View
                    key={row.key}
                    className='stg__row'
                    onClick={() => go(row.url)}
                  >
                    {index > 0 ? <View className='stg__divider' /> : null}
                    <View className={`stg__tile stg__tile--${row.tile}`}>
                      <View className='stg__tile-gloss' />
                      <Icon name={row.icon} size={42} color='#FFFFFF' strokeWidth={2} />
                    </View>
                    <View className='stg__row-main'>
                      <Text className='stg__row-label'>{row.label}</Text>
                      {row.desc ? <Text className='stg__row-desc'>{row.desc}</Text> : null}
                    </View>
                    {row.value ? (
                      <Text
                        className={`stg__row-value ${
                          row.valueStrong ? 'stg__row-value--strong' : ''
                        }`}
                      >
                        {row.value}
                      </Text>
                    ) : null}
                    <Icon name='chevron-right' size={36} color='#C7D0DC' strokeWidth={2} />
                  </View>
                ))}
              </View>
            </View>
          ))
        )}

        {/* 退出登录 */}
        <View
          className={`stg__logout ${isLoggingOut ? 'stg__logout--disabled' : ''}`}
          onClick={() => {
            if (!isLoggingOut) setShowLogoutConfirm(true)
          }}
        >
          {isLoggingOut ? '退出中...' : '退出登录'}
        </View>

        <View className='stg__version'>班务星 · 已是最新版本</View>
      </View>

      <ConfirmDialog
        open={showLogoutConfirm}
        title='退出登录'
        description='退出后需要重新登录才能查看班级消息、考勤与作业，确定要退出吗？'
        confirmText='确认退出'
        danger
        loading={isLoggingOut}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
      />
    </View>
  )
}