import { useState, useEffect, useRef } from 'react'
import { View, Text, Input } from '@tarojs/components'

import { NavBar, Modal } from '@/components/business'
import { Button, Icon } from '@/components/ui'
import { vibrate } from '@/utils/native'
import './index.scss'

export default function Pomodoro() {
  const [focusDuration, setFocusDuration] = useState(25 * 60)
  const [breakDuration] = useState(5 * 60)
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [currentRound, setCurrentRound] = useState(1)
  const [totalRounds] = useState(4)
  const [isBreak, setIsBreak] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showTaskEdit, setShowTaskEdit] = useState(false)
  const [taskName, setTaskName] = useState('复习高数·第三章习题')
  const [taskTotalMinutes, setTaskTotalMinutes] = useState(120)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            vibrate()
            if (!isBreak) {
              setIsBreak(true)
              setTimeLeft(breakDuration)
            } else {
              setIsBreak(false)
              if (currentRound < totalRounds) {
                setCurrentRound((r) => r + 1)
              }
              setTimeLeft(focusDuration)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, timeLeft, isBreak, breakDuration, currentRound, totalRounds, focusDuration])

  const handlePlay = () => {
    if (timeLeft === 0) {
      setTimeLeft(isBreak ? breakDuration : focusDuration)
    }
    setHasStarted(true)
    setIsRunning(true)
  }

  const handleStop = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setHasStarted(false)
    setIsBreak(false)
    setCurrentRound(1)
    setTimeLeft(focusDuration)
  }

  const handleSetTime = (mins: number) => {
    setFocusDuration(mins * 60)
    if (!isRunning) {
      setTimeLeft(mins * 60)
    }
    setIsBreak(false)
    setCurrentRound(1)
    setHasStarted(false)
    setShowSettings(false)
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <View className='pomodoro'>
      <NavBar
        title='专注'
        transparent
        right={
          <View className='pomodoro__nav-set' onClick={() => setShowSettings(true)}>
            <Icon name='settings' size={48} color='#1A1A1A' strokeWidth={2} />
          </View>
        }
      />

      <View className='pomodoro__body'>
        {/* 任务卡 */}
        <View className='pomodoro__task' onClick={() => !isRunning && setShowTaskEdit(true)}>
          <View className='pomodoro__task-icon'>
            <Icon name='file-text' size={48} color='#3B82F6' strokeWidth={2} />
          </View>
          <View className='pomodoro__task-info'>
            <Text className='pomodoro__task-name'>{taskName}</Text>
            <Text className='pomodoro__task-duration'>总预计 {taskTotalMinutes} 分钟</Text>
          </View>
          <View className='pomodoro__task-meta'>
            <Text className='pomodoro__task-round'>{currentRound}/{totalRounds}</Text>
            <Text className='pomodoro__task-min'>{Math.floor(focusDuration / 60)}分钟</Text>
          </View>
        </View>

        {/* 计时环 */}
        <View className='pomodoro__ring'>
          <View className='pomodoro__ring-track' />
          <View className='pomodoro__ring-info'>
            <Text className='pomodoro__timer'>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </Text>
            <Text className='pomodoro__round-info'>
              {isBreak ? '休息时间' : `第${currentRound}轮 / 共${totalRounds}轮`}
            </Text>
            <Text className='pomodoro__tip'>
              {isBreak ? '放松一下吧' : `保持专注 ${Math.floor(focusDuration / 60)} 分钟`}
            </Text>
            <View className='pomodoro__set-time' onClick={() => setShowSettings(!showSettings)}>
              <Text className='pomodoro__set-time-label'>设置时间</Text>
            </View>
          </View>
        </View>

        {/* 控制按钮 */}
        <View className='pomodoro__controls'>
          {hasStarted && (
            <View className='pomodoro__ctrl' onClick={handleReset}>
              <Text className='pomodoro__ctrl-text pomodoro__ctrl-text--reset'>↻</Text>
            </View>
          )}
          <View className='pomodoro__ctrl' onClick={isRunning ? handleStop : handlePlay}>
            <Text className='pomodoro__ctrl-text'>{isRunning ? '⏸' : '▶'}</Text>
          </View>
        </View>
      </View>

      {/* 设置专注时间 */}
      <Modal visible={showSettings} title='设置专注时间' onClose={() => setShowSettings(false)}>
        <View className='pomodoro__opts'>
          {[15, 20, 25, 30, 45, 60].map((mins) => {
            const active = Math.floor(focusDuration / 60) === mins
            return (
              <View
                key={mins}
                className={`pomodoro__opt ${active ? 'pomodoro__opt--active' : ''}`}
                onClick={() => handleSetTime(mins)}
              >
                <Text className={`pomodoro__opt-text ${active ? 'pomodoro__opt-text--active' : ''}`}>{mins} 分钟</Text>
              </View>
            )
          })}
        </View>
      </Modal>

      {/* 编辑任务 */}
      <Modal visible={showTaskEdit} title='编辑任务' onClose={() => setShowTaskEdit(false)}>
        <View className='pomodoro__task-form'>
          <View className='pomodoro__task-field'>
            <Text className='pomodoro__task-label'>任务名称</Text>
            <Input
              className='pomodoro__task-input'
              value={taskName}
              placeholder='请输入任务名称'
              placeholderClass='pomodoro__ph'
              onInput={(e) => setTaskName(e.detail.value)}
            />
          </View>
          <View className='pomodoro__task-field'>
            <Text className='pomodoro__task-label'>总预计时间（分钟）</Text>
            <Input
              className='pomodoro__task-input'
              type='digit'
              value={String(taskTotalMinutes)}
              placeholder='请输入预计时间'
              placeholderClass='pomodoro__ph'
              onInput={(e) => setTaskTotalMinutes(Number(e.detail.value))}
            />
          </View>
          <Button type='primary' size='md' block onClick={() => setShowTaskEdit(false)}>
            保存
          </Button>
        </View>
      </Modal>
    </View>
  )
}