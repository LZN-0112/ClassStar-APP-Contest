// ============================================================
// OrgSwitcher 班级切换器组件（对应 front components/org/OrgSwitcher）
// 首页最显眼的交互：点击当前班级名弹出组织列表，可切换班级
// ============================================================
import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { Icon } from '@/components/ui'
import { classesApi } from '@/services'
import { useUserStore } from '@/stores'
import { getOrgTypeMeta } from '@/constants/org'
import './index.scss'

/** 组织项（对应 front MyOrgItem） */
interface MyOrgItem {
  id: string
  name: string
  orgType?: string
  role?: string
  roleLevel?: string
  memberCount?: number
}

interface OrgTodoItem {
  orgId: string
  orgName: string
  orgType: string
  totalCount: number
}

export default function OrgSwitcher() {
  const userInfo = useUserStore((s) => s.userInfo)
  const currentClassId = useUserStore((s) => s.currentClassId)
  const setCurrentClass = useUserStore((s) => s.setCurrentClass)

  const [open, setOpen] = useState(false)
  const [orgs, setOrgs] = useState<MyOrgItem[]>([])
  const [todoMap, setTodoMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)

  const currentOrgId = currentClassId || userInfo?.classId || ''

  const loadOrgs = async () => {
    setLoading(true)
    try {
      const [list, todos] = await Promise.all([
        classesApi.getMyClasses(),
        classesApi.getOrgsTodos().catch(() => [] as OrgTodoItem[])
      ])
      const orgList: MyOrgItem[] = (list || []) as MyOrgItem[]
      setOrgs(orgList)

      const map: Record<string, number> = {}
      ;(todos || []).forEach((t) => {
        if (t && t.orgId) map[t.orgId] = t.totalCount || 0
      })
      setTodoMap(map)
    } catch {
      setOrgs([])
    } finally {
      setLoading(false)
    }
  }

  const toggle = () => {
    if (!open) {
      loadOrgs()
    }
    setOpen(!open)
  }

  const handleSwitch = (org: MyOrgItem) => {
    if (org.id === currentOrgId) {
      setOpen(false)
      return
    }
    setCurrentClass(org.id)
    setOpen(false)
    Taro.showToast({ title: `已切换到 ${org.name}`, icon: 'none' })
    // 强制整页刷新，确保首页按新班级重新加载
    setTimeout(() => {
      Taro.reLaunch({ url: '/pages/home/index' })
    }, 300)
  }

  const goJoinClass = () => {
    setOpen(false)
    Taro.navigateTo({ url: '/pages/auth/join-class/index' })
  }

  if (!userInfo?.classId && !currentClassId) {
    return null
  }

  const meta = getOrgTypeMeta(userInfo?.orgType || 'class')

  return (
    <>
      {/* 触发栏 */}
      <View className='cx-org-switcher__trigger' onClick={toggle}>
        <View
          className='cx-org-switcher__badge'
          style={{ backgroundColor: meta.color }}
        >
          <Icon name={meta.icon} size={24} color='#ffffff' strokeWidth={2.5} />
        </View>
        <Text className='cx-org-switcher__name'>{userInfo?.className || '班级'}</Text>
        <View
          className='cx-org-switcher__tag'
          style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
        >
          {meta.label}
        </View>
        <Icon name='chevron-down' size={28} color='#6b7280' strokeWidth={2.5} />
      </View>

      {/* 下拉面板 */}
      {open && (
        <View className='cx-org-switcher__mask' onClick={() => setOpen(false)}>
          <View className='cx-org-switcher__panel' onClick={(e) => e.stopPropagation()}>
            {/* 面板头 */}
            <View className='cx-org-switcher__head'>
              <Text className='cx-org-switcher__head-title'>切换组织</Text>
              <View className='cx-org-switcher__close' onClick={() => setOpen(false)}>
                <Icon name='x' size={32} color='#6b7280' strokeWidth={2} />
              </View>
            </View>

            {/* 组织列表 */}
            <View className='cx-org-switcher__list'>
              {loading ? (
                <View className='cx-org-switcher__empty'>加载中...</View>
              ) : orgs.length === 0 ? (
                <View className='cx-org-switcher__empty'>暂无组织</View>
              ) : (
                orgs.map((org) => {
                  const oMeta = getOrgTypeMeta(org.orgType)
                  const isActive = org.id === currentOrgId
                  const todoCount = todoMap[org.id] || 0
                  return (
                    <View
                      key={org.id}
                      className={`cx-org-switcher__item ${isActive ? 'cx-org-switcher__item--active' : ''}`}
                      onClick={() => handleSwitch(org)}
                    >
                      <View
                        className='cx-org-switcher__item-icon'
                        style={{ backgroundColor: oMeta.color }}
                      >
                        <Icon name={oMeta.icon} size={40} color='#ffffff' strokeWidth={2} />
                      </View>

                      <View className='cx-org-switcher__item-body'>
                        <View className='cx-org-switcher__item-title-row'>
                          <Text className='cx-org-switcher__item-name'>{org.name}</Text>
                          {todoCount > 0 && (
                            <View className='cx-org-switcher__todo'>
                              {todoCount > 99 ? '99+' : todoCount}
                            </View>
                          )}
                        </View>
                        <View className='cx-org-switcher__item-meta'>
                          <Text style={{ color: oMeta.color }}>{oMeta.label}</Text>
                          <Text className='cx-org-switcher__item-sep'>·</Text>
                          <Text>{org.role || org.roleLevel || '成员'}</Text>
                          {org.memberCount != null && (
                            <>
                              <Text className='cx-org-switcher__item-sep'>·</Text>
                              <Text>{org.memberCount} 人</Text>
                            </>
                          )}
                        </View>
                      </View>

                      {isActive && (
                        <View className='cx-org-switcher__check'>
                          <Icon name='check' size={40} color='#2563eb' strokeWidth={2.5} />
                        </View>
                      )}
                    </View>
                  )
                })
              )}
            </View>

            {/* 底部操作 */}
            <View className='cx-org-switcher__footer'>
              <View className='cx-org-switcher__create' onClick={goJoinClass}>
                <Icon name='plus' size={32} color='#0062ff' strokeWidth={2.5} />
                <Text className='cx-org-switcher__create-text'>创建 / 加入组织</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </>
  )
}