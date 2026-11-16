// ============================================================
// 番茄钟
// 1:1 对齐 front/src/pages/tools/Pomodoro.tsx
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { Input, Text, View } from '@tarojs/components'

import { BottomSheet, StatusBar } from '@/components/business'
import { Icon } from '@/components/ui'
import {
  BREAK_OPTIONS,
  FOCUS_OPTIONS,
  LONG_BREAK_MINUTES,
  POMODORO_THEME as THEME,
  ROUNDS,
  getPhaseTotal,
  usePomodoroStore
} from '@/stores'
import './index.scss'

const SHEET_MAX_HEIGHT = Math.round((Taro.getSystemInfoSync().windowHeight || 667) * 0.8)

export default function Pomodoro() {
  const focusMinutes = usePomodoroStore((s) => s.focusMinutes)
  const breakMinutes = usePomodoroStore((s) => s.breakMinutes)
  const phase = usePomodoroStore((s) => s.phase)
  const round = usePomodoroStore((s) => s.round)
  const runState = usePomodoroStore((s) => s.runState)
  const remaining = usePomodoroStore((s) => s.remaining)
  const taskName = usePomodoroStore((s) => s.taskName)
  const stats = usePomodoroStore((s) => s.stats)
  const celebrateKey = usePomodoroStore((s) => s.celebrateKey)
  const handleStart = usePomodoroStore((s) => s.start)
  const handlePause = usePomodoroStore((s) => s.pause)
  const handleResume = usePomodoroStore((s) => s.resume)
  const handleReset = usePomodoroStore((s) => s.reset)
  const toNextRound = usePomodoroStore((s) => s.endBreak)
  const applyStoreSettings = usePomodoroStore((s) => s.applySettings)
  const setTaskName = usePomodoroStore((s) => s.setTaskName)
  const clearCelebrate = usePomodoroStore((s) => s.clearCelebrate)
  const tick = usePomodoroStore((s) => s.tick)

  const [draftTask, setDraftTask] = useState('')
  const [showTaskEdit, setShowTaskEdit] = useState(false)

  const [showSettings, setShowSettings] = useState(false)
  const [draftFocus, setDraftFocus] = useState(25)
  const [draftBreak, setDraftBreak] = useState(5)

  const theme = THEME[phase]

  const phaseTotal = useMemo(
    () => getPhaseTotal({ phase, focusMinutes, breakMinutes }),
    [phase, focusMinutes, breakMinutes]
  )

  // 进入页面时清掉历史完成标记，避免重新进入时重播完成动效
  useEffect(() => {
    clearCelebrate()
  }, [clearCelebrate])

  useEffect(() => {
    const timer = setInterval(() => tick(), 500)
    return () => clearInterval(timer)
  }, [tick])

  useDidShow(() => {
    tick()
  })

  const openSettings = () => {
    if (runState !== 'idle') {
      Taro.showToast({ title: '计时进行中，本轮结束后即可修改时长', icon: 'none' })
      return
    }
    setDraftFocus(focusMinutes)
    setDraftBreak(breakMinutes)
    setShowSettings(true)
  }

  const applySettings = () => {
    applyStoreSettings(draftFocus, draftBreak)
    setShowSettings(false)
    Taro.showToast({
      title: `已设置：专注 ${draftFocus} 分钟 / 休息 ${draftBreak} 分钟`,
      icon: 'none'
    })
  }

  const openTaskEdit = () => {
    setDraftTask(taskName)
    setShowTaskEdit(true)
  }

  const applyTask = () => {
    const name = draftTask.trim()
    if (!name) {
      Taro.showToast({ title: '请输入本次专注目标', icon: 'none' })
      return
    }
    setTaskName(name)
    setShowTaskEdit(false)
  }

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const progress = phaseTotal > 0 ? Math.min(Math.max(1 - remaining / phaseTotal, 0), 1) : 0
  const completedRounds = phase === 'focus' ? round - 1 : round
  const isRunning = runState === 'running'

  const phaseLabel =
    phase === 'focus'
      ? isRunning
        ? '专注中'
        : runState === 'paused'
          ? '已暂停'
          : '准备开始'
      : isRunning
        ? phase === 'longBreak'
          ? '长休息中'
          : '短休息中'
        : '休息已暂停'

  const helperText =
    phase === 'focus'
      ? isRunning
        ? '保持节奏，计时结束后自动进入休息'
        : '开始后自动计时，每完成 4 轮进入 15 分钟长休息'
      : '放松一下，休息结束后点击开始进入下一轮'

  // 进度环（CSS conic-gradient 复刻 App 的 SVG 圆环，角度按时长比例）
  const progressDeg = Math.round(progress * 3600) / 10
  const ringBg = `conic-gradient(from -90deg, ${theme.accent} 0deg, ${theme.accentLight} ${progressDeg}deg, ${theme.track} ${progressDeg}deg, ${theme.track} 360deg)`

  return (
    <View className='pomodoro'>
      <StatusBar />
      <View className='pomodoro__page'>
        {/* 状态色氛围光，随专注/短休息/长休息切换 */}
        <View
          className='pomodoro__glow'
          style={{
            background: `radial-gradient(110% 72% at 50% 0%, ${theme.soft} 0%, rgba(255,255,255,0) 72%)`
          }}
        />

        <View className='pomodoro__content'>
          {/* Header */}
          <View className='pomodoro__head'>
            <View className='pomodoro__back' onClick={() => Taro.navigateBack()}>
              <Icon name='chevron-left' size={40} color='#1A1A1A' strokeWidth={2} />
            </View>
            <Text className='pomodoro__title'>番茄钟</Text>
            <View className='pomodoro__gear' onClick={openSettings}>
              <Icon name='settings' size={40} color='#4B5563' strokeWidth={2} />
            </View>
          </View>

          <View className='pomodoro__stack'>
            {/* 计时主卡片 */}
            <View className='pomodoro__card'>
              <View className='pomodoro__card-head'>
                <View
                  className='pomodoro__phase'
                  style={{ color: theme.accent, backgroundColor: theme.soft }}
                >
                  <View
                    className='pomodoro__phase-dot'
                    style={{ backgroundColor: theme.accent }}
                  />
                  <Text className='pomodoro__phase-text'>{phaseLabel}</Text>
                </View>
                <Text className='pomodoro__round-text'>
                  第 {round} / {ROUNDS} 轮
                </Text>
              </View>

              {/* 倒计时环 */}
              <View className='pomodoro__ring-wrap'>
                <View
                  className={`pomodoro__ring-glow ${isRunning ? 'is-running' : ''}`}
                  style={{
                    background: `radial-gradient(circle, ${theme.soft} 0%, rgba(255,255,255,0) 68%)`
                  }}
                />
                <View className='pomodoro__ring' style={{ background: ringBg }}>
                  <View
                    className='pomodoro__ring-inner'
                    style={{
                      background: `radial-gradient(circle, ${theme.soft} 0%, rgba(255,255,255,0) 68%), #FFFFFF`
                    }}
                  />
                </View>

                <View className='pomodoro__ring-body'>
                  <Text
                    className='pomodoro__timer'
                    style={{ opacity: runState === 'paused' ? 0.75 : 1 }}
                  >
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </Text>
                  <View
                    className='pomodoro__task-pill'
                    style={{
                      color: taskName ? theme.accent : '#94A3B8',
                      backgroundColor: theme.soft
                    }}
                    onClick={openTaskEdit}
                  >
                    <Icon
                      name={taskName ? 'book-open' : 'edit'}
                      size={24}
                      color={taskName ? theme.accent : '#94A3B8'}
                      strokeWidth={2}
                    />
                    <Text className='pomodoro__task-pill-text'>
                      {taskName || '添加专注目标'}
                    </Text>
                  </View>
                </View>

                {/* 完成一轮时的扩散光效 */}
                {celebrateKey > 0 ? (
                  <View key={celebrateKey} className='pomodoro__celebrate'>
                    <View
                      className='pomodoro__ripple'
                      style={{ borderColor: theme.accent }}
                    />
                    <View
                      className='pomodoro__ripple pomodoro__ripple--2'
                      style={{ borderColor: theme.accent }}
                    />
                    <View
                      className='pomodoro__ripple pomodoro__ripple--3'
                      style={{ borderColor: theme.accent }}
                    />
                  </View>
                ) : null}
              </View>

              {/* 轮次进度 */}
              <View className='pomodoro__rounds'>
                {Array.from({ length: ROUNDS }, (_, index) => {
                  const done = index < completedRounds
                  const current = phase === 'focus' && runState !== 'idle' && index === round - 1
                  return (
                    <View
                      key={index}
                      className='pomodoro__round-dot'
                      style={{
                        backgroundColor: done ? theme.accent : theme.track,
                        boxShadow: current ? `0 0 0 6rpx ${theme.soft}` : 'none'
                      }}
                    />
                  )
                })}
                <Text className='pomodoro__rounds-hint'>4 轮后长休息</Text>
              </View>
            </View>

            {/* 操作区 */}
            <View className='pomodoro__actions'>
              {runState === 'idle' ? (
                <View
                  className='pomodoro__btn-main'
                  style={{
                    backgroundColor: theme.accent,
                    boxShadow: `0 20rpx 48rpx -20rpx ${theme.accent}AA`
                  }}
                  onClick={handleStart}
                >
                  <Icon name='play' size={40} color='#FFFFFF' strokeWidth={2} />
                  <Text className='pomodoro__btn-main-text'>开始专注 · {focusMinutes} 分钟</Text>
                </View>
              ) : (
                <View className='pomodoro__btn-row'>
                  <View
                    className='pomodoro__btn-ghost'
                    onClick={phase === 'focus' ? handleReset : toNextRound}
                  >
                    <Icon name='rotate-ccw' size={32} color='#4B5563' strokeWidth={2} />
                    <Text className='pomodoro__btn-ghost-text'>
                      {phase === 'focus' ? '重置' : '结束休息'}
                    </Text>
                  </View>
                  <View
                    className='pomodoro__btn-main pomodoro__btn-main--flex'
                    style={{
                      backgroundColor: theme.accent,
                      boxShadow: '0 20rpx 48rpx -24rpx rgba(0,0,0,0.3)'
                    }}
                    onClick={isRunning ? handlePause : handleResume}
                  >
                    <Icon
                      name={isRunning ? 'pause' : 'play'}
                      size={40}
                      color='#FFFFFF'
                      strokeWidth={2}
                    />
                    <Text className='pomodoro__btn-main-text'>{isRunning ? '暂停' : '继续'}</Text>
                  </View>
                </View>
              )}
              <Text className='pomodoro__helper'>{helperText}</Text>
            </View>

            {/* 今日统计 */}
            <View className='pomodoro__stats'>
              <View className='pomodoro__stat'>
                <Text className='pomodoro__stat-value' style={{ color: theme.accent }}>
                  {stats.completed}
                </Text>
                <Text className='pomodoro__stat-label'>今日番茄</Text>
              </View>
              <View className='pomodoro__divider' />
              <View className='pomodoro__stat'>
                <Text className='pomodoro__stat-value' style={{ color: theme.accent }}>
                  {stats.minutes}
                </Text>
                <Text className='pomodoro__stat-label'>专注分钟</Text>
              </View>
              <View className='pomodoro__divider' />
              <View className='pomodoro__stat'>
                <Icon name='sparkles' size={40} color='#C4A66B' strokeWidth={2} />
                <Text className='pomodoro__stat-label'>
                  {stats.completed > 0 ? '继续保持' : '今天还没开始'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* 专注设置 */}
      <BottomSheet
        open={showSettings}
        onClose={() => setShowSettings(false)}
        title='专注设置'
        maxHeight={SHEET_MAX_HEIGHT}
        footer={
          <View
            className='pomodoro__sheet-btn'
            style={{ backgroundColor: THEME.focus.accent }}
            onClick={applySettings}
          >
            保存设置
          </View>
        }
      >
        <View className='pomodoro__sheet-body'>
          <Text className='pomodoro__sheet-label'>专注时长</Text>
          <View className='pomodoro__opts'>
            {FOCUS_OPTIONS.map((option) => (
              <View
                key={option}
                className='pomodoro__opt'
                style={
                  draftFocus === option
                    ? { backgroundColor: THEME.focus.accent, color: '#FFFFFF' }
                    : { backgroundColor: '#F3F6FA', color: '#1A1A1A' }
                }
                onClick={() => setDraftFocus(option)}
              >
                {option} 分
              </View>
            ))}
          </View>

          <Text className='pomodoro__sheet-label pomodoro__sheet-label--gap'>休息时长</Text>
          <View className='pomodoro__opts pomodoro__opts--3'>
            {BREAK_OPTIONS.map((option) => (
              <View
                key={option}
                className='pomodoro__opt'
                style={
                  draftBreak === option
                    ? { backgroundColor: THEME.break.accent, color: '#FFFFFF' }
                    : { backgroundColor: '#F3F6FA', color: '#1A1A1A' }
                }
                onClick={() => setDraftBreak(option)}
              >
                {option} 分
              </View>
            ))}
          </View>

          <Text className='pomodoro__sheet-note'>
            每完成 {ROUNDS} 轮专注，会自动进入 {LONG_BREAK_MINUTES} 分钟长休息。
          </Text>
        </View>
      </BottomSheet>

      {/* 编辑专注目标 */}
      <BottomSheet
        open={showTaskEdit}
        onClose={() => setShowTaskEdit(false)}
        title='本次专注目标'
        maxHeight={Math.round(SHEET_MAX_HEIGHT * 0.7)}
        footer={
          <View
            className='pomodoro__sheet-btn'
            style={{ backgroundColor: THEME.focus.accent }}
            onClick={applyTask}
          >
            保存目标
          </View>
        }
      >
        <View className='pomodoro__sheet-body'>
          <Input
            className='pomodoro__input'
            value={draftTask}
            placeholder='例如：复习高数第三章习题'
            placeholderClass='pomodoro__input-ph'
            onInput={(event) => setDraftTask(event.detail.value)}
          />
        </View>
      </BottomSheet>
    </View>
  )
}