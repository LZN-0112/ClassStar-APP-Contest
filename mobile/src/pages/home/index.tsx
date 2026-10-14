import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { classesApi } from '@/services'
import { useUserStore } from '@/stores'
import { Icon } from '@/components/ui'
import { StatusBar } from '@/components/business'
import type { IconName } from '@/constants/icons'
import type { MessageItem } from '@/types/classes'
import { formatRelativeTime, getTodayDateStr, getGreeting } from '@/utils'
import './index.scss'

// ---------- 通知类型映射图标和颜色 ----------
interface TypeConfig {
  icon: IconName
  color: string
}

const TYPE_ICON_MAP: Record<string, TypeConfig> = {
  notice: { icon: 'bell', color: '#EF4444' },
  attendance: { icon: 'check-circle', color: '#22C55E' },
  homework: { icon: 'file-text', color: '#F97316' },
  activity: { icon: 'flag', color: '#3B82F6' },
  default: { icon: 'bell', color: '#6B7280' }
}

// ---------- 快捷入口（9 项，颜色/标签/顺序与 front 一致） ----------
const quickItems: { label: string; icon: IconName; color: string; path: string }[] = [
  { label: '通知', icon: 'bell', color: '#2563EB', path: '/messages' },
  { label: '签到', icon: 'check-circle', color: '#22C55E', path: '/attendance-list' },
  { label: '作业', icon: 'file-text', color: '#F97316', path: '/homework-list' },
  { label: '活动', icon: 'flag', color: '#EF4444', path: '/activity-list' },
  { label: '资料', icon: 'folder', color: '#A855F7', path: '/material-library' },
  { label: '班费记账', icon: 'wallet', color: '#10B981', path: '/fee-ledger' },
  { label: '抽签', icon: 'dices', color: '#8B5CF6', path: '/random-draw' },
  { label: '投票', icon: 'vote', color: '#3B82F6', path: '/vote-list' }
]

const moreItem = { label: '番茄钟', icon: 'clock' as IconName, color: '#F59E0B', path: '/pomodoro' }

// ---------- 快捷入口 → 真实分包路由映射（按首页实际 label 匹配，目标页均已注册于 app.config.ts） ----------
const QUICK_ROUTE_MAP: Record<string, string> = {
  通知: '/pages-sub/message/list/index',
  签到: '/pages-sub/attendance/list/index',
  作业: '/pages-sub/homework/list/index',
  活动: '/pages-sub/activity/list/index',
  资料: '/pages-sub/material/library/index',
  班费记账: '/pages-sub/fee/ledger/index',
  抽签: '/pages-sub/vote/random-draw/index',
  投票: '/pages-sub/vote/list/index',
  番茄钟: '/pages-sub/material/pomodoro/index'
}

export default function Home() {
  const userInfo = useUserStore((s) => s.userInfo)
  const currentClassId = useUserStore((s) => s.currentClassId)

  const [pendingCount, setPendingCount] = useState(0)
  const [avgProgress, setAvgProgress] = useState(0)
  const [feedItems, setFeedItems] = useState<MessageItem[]>([])
  const [loadingFeed, setLoadingFeed] = useState(true)
  const [greeting, setGreeting] = useState(getGreeting())
  const [isTransitioning, setIsTransitioning] = useState(false)
  const greetingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 问候语：每分钟检查一次，时间边界时平滑过渡
  useEffect(() => {
    const updateGreeting = () => {
      const next = getGreeting()
      if (next !== greeting) {
        setIsTransitioning(true)
        setTimeout(() => {
          setGreeting(next)
          setTimeout(() => setIsTransitioning(false), 300)
        }, 300)
      }
    }
    // 注意：小程序 appservice 环境无 window 全局，需使用全局 setInterval/clearInterval
    greetingTimerRef.current = setInterval(updateGreeting, 60000)
    return () => {
      if (greetingTimerRef.current) clearInterval(greetingTimerRef.current)
    }
  }, [greeting])

  // 获取任务统计
  const loadTasks = useCallback(() => {
    if (!currentClassId) return
    classesApi
      .getClassTasks(currentClassId)
      .then((res) => {
        const { stats, list } = res
        const pending = stats.todo + stats.inProgress
        setPendingCount(pending)
        if (list.length > 0) {
          const totalProgress = list.reduce((sum, t) => sum + (t.progress || 0), 0)
          setAvgProgress(Math.round(totalProgress / list.length))
        } else {
          setAvgProgress(0)
        }
      })
      .catch(() => {
        // 静默失败，保持默认值
      })
  }, [currentClassId])

  // 获取班级动态
  const loadFeed = useCallback(() => {
    if (!currentClassId) return
    setLoadingFeed(true)
    classesApi
      .getClassMessages(currentClassId, 3)
      .then((res) => {
        setFeedItems(res?.list ?? [])
      })
      .catch(() => {
        setFeedItems([])
      })
      .finally(() => {
        setLoadingFeed(false)
      })
  }, [currentClassId])

  useEffect(() => {
    loadTasks()
    loadFeed()
  }, [loadTasks, loadFeed])

  const userName = userInfo?.name || '同学'
  const hasClass = !!currentClassId

  // 快捷入口 → 真实分包路由跳转
  const handleQuickNav = (label: string) => {
    const url = QUICK_ROUTE_MAP[label]
    if (url) {
      Taro.navigateTo({ url })
    } else {
      Taro.showToast({ title: '功能开发中', icon: 'none' })
    }
  }

  return (
    <View className='home'>
      {/* Status Bar（动态高度） */}
      <StatusBar />

      {/* Header */}
      <View className='home__header'>
        <View className='home__header-content'>
          <View className='home__header-text'>
            <Text className={`home__greeting ${isTransitioning ? 'home__greeting--hidden' : ''}`}>
              {greeting}，{userName}
            </Text>
            {hasClass ? (
              <Text className='home__org-name'>{userInfo?.className || '我的班级'}</Text>
            ) : (
              <Text className='home__no-class'>未加入班级</Text>
            )}
          </View>
          <View className='home__header-actions'>
            <View
              className='home__scan-btn press-scale'
              onClick={() => Taro.showToast({ title: '扫码功能开发中', icon: 'none' })}
            >
              <Icon name='scan-line' size={40} color='#0062FF' />
            </View>
            <View
              className='home__avatar press-scale'
              onClick={() => Taro.switchTab({ url: '/pages/profile/index' })}
            >
              {userInfo?.avatar ? (
                <Image className='home__avatar-img' src={userInfo.avatar} mode='aspectFill' />
              ) : (
                <Icon name='user' size={48} color='#0062FF' />
              )}
            </View>
          </View>
        </View>
      </View>

      {/* 内容卡片区 */}
      <View className='home__content'>
        {!hasClass ? (
          <View className='home__no-class-wrap'>
            <View className='home__no-class-icon'>
              <Icon name='school' size={80} color='#0062FF' strokeWidth={1.5} />
            </View>
            <Text className='home__no-class-text'>暂无加入班级</Text>
            <View
              className='home__join-btn press-opacity'
              onClick={() => Taro.navigateTo({ url: '/pages/auth/join-class/index' })}
            >
              <Text className='home__join-btn-text'>去加入/创建班级</Text>
            </View>
          </View>
        ) : (
          <>
            {/* 今日待办卡片 */}
            <View className='home__todo-card'>
              <View className='home__todo-top'>
                <View className='home__todo-left'>
                  <View className='home__todo-title-row'>
                    <Text className='home__todo-title'>今日待办</Text>
                    <Icon name='sparkles' size={32} color='#FFFFFFCC' />
                  </View>
                  <Text className='home__todo-date'>
                    {getTodayDateStr()} · {pendingCount} 个待办事项
                  </Text>
                </View>
                <View className='home__todo-right'>
                  <Text className='home__todo-progress-label'>完成进度 {avgProgress}%</Text>
                  <View className='home__todo-progress-track'>
                    <View
                      className='home__todo-progress-fill'
                      style={{ width: `${Math.min(avgProgress, 100) * 2.4}rpx` }}
                    />
                  </View>
                </View>
              </View>
              <View className='home__todo-btn'>
                <Text
                  className='home__todo-btn-text press-opacity'
                  onClick={() => Taro.showToast({ title: '待办看板开发中', icon: 'none' })}
                >
                  查看待办
                </Text>
                <Icon name='chevron-right' size={32} color='#0062FF' />
              </View>
            </View>

            {/* 快捷入口网格 */}
            <View className='home__quick-grid'>
              <View className='home__quick-row'>
                {quickItems.map((item) => (
                  <View
                    key={item.label}
                    className='home__quick-item press-scale'
                    onClick={() => handleQuickNav(item.label)}
                  >
                    <View className='home__quick-icon' style={{ backgroundColor: item.color }}>
                      <View className='home__quick-icon-shine' />
                      <Icon name={item.icon} size={44} color='#FFFFFF' />
                    </View>
                    <Text className='home__quick-label'>{item.label}</Text>
                  </View>
                ))}
              </View>
              <View className='home__quick-divider' />
              <View className='home__quick-row'>
                <View
                  className='home__quick-item press-scale'
                  onClick={() => handleQuickNav(moreItem.label)}
                >
                  <View className='home__quick-icon' style={{ backgroundColor: moreItem.color }}>
                    <View className='home__quick-icon-shine' />
                    <Icon name={moreItem.icon} size={44} color='#FFFFFF' />
                  </View>
                  <Text className='home__quick-label'>{moreItem.label}</Text>
                </View>
              </View>
            </View>

            {/* 班级动态卡片 */}
            <View className='home__feed-card'>
              <View className='home__feed-header'>
                <Text className='home__feed-title'>班级动态</Text>
                <Text
                  className='home__feed-more press-opacity'
                  onClick={() => Taro.switchTab({ url: '/pages/class-home/index' })}
                >
                  查看全部
                </Text>
              </View>
              <View className='home__feed-list'>
                {loadingFeed ? (
                  <View className='home__feed-empty'>
                    <View className='home__feed-empty-icon'>
                      <Icon name='school' size={40} color='#9CA3AF' />
                    </View>
                    <Text className='home__feed-empty-text'>加载中...</Text>
                  </View>
                ) : feedItems.length === 0 ? (
                  <View className='home__feed-empty'>
                    <View className='home__feed-empty-icon home__feed-empty-icon--blue'>
                      <Icon name='bell' size={48} color='#0062FF80' strokeWidth={1.5} />
                    </View>
                    <Text className='home__feed-empty-text'>暂无班级动态</Text>
                  </View>
                ) : (
                  feedItems.map((item) => {
                    const typeConfig = TYPE_ICON_MAP[item.type] || TYPE_ICON_MAP.default
                    const relativeTime = formatRelativeTime(item.createdAt)
                    const meta = `${relativeTime} · ${item.publisher?.name || '未知'}`
                    return (
                      <View key={item.id} className='home__feed-item'>
                        <View
                          className='home__feed-item-icon'
                          style={{ backgroundColor: typeConfig.color }}
                        >
                          <View className='home__feed-item-shine' />
                          <Icon name={typeConfig.icon} size={40} color='#FFFFFF' />
                        </View>
                        <View className='home__feed-item-text'>
                          <Text className='home__feed-item-title'>{item.title}</Text>
                          <Text className='home__feed-item-meta'>{meta}</Text>
                        </View>
                      </View>
                    )
                  })
                )}
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  )
}