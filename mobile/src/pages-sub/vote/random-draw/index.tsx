// ============================================================
// 随机抽签
// 1:1 对齐 front/src/pages/tools/RandomDraw.tsx
// 差异：彩球公转用 CSS 动画实现（禁止内联 SVG / 无 rAF）
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import Taro from '@tarojs/taro'
import { ScrollView, Text, View } from '@tarojs/components'

import { BottomSheet, StatusBar } from '@/components/business'
import { Icon } from '@/components/ui'
import { classesApi } from '@/services'
import { drawApi } from '@/services/task'
import { useUserStore } from '@/stores'
import './index.scss'

interface Member {
  id: string
  studentId: string
  name: string
  isSystemAccount?: boolean
}

// 后端返回字段为 userId/student_id，统一映射为前端 Member 结构
const mapMember = (m: any): Member => ({
  id: m.userId || m.id || '',
  studentId: m.studentId || m.student_id || '',
  name: m.name || m.userName || '',
  isSystemAccount: m.isSystemAccount === true
})

type Phase = 'idle' | 'drawing' | 'result'

/** 揭晓后 5 颗球停靠的角度（球体上方弧线，避开底部结果抽屉） */
const SLOT_ANGLES = [-170, -130, -90, -50, -10]
/** 5 颗球的初始角度，彼此错开避免重叠 */
const START_ANGLES = [200, 300, 340, 148, 52]
/** 常态公转速度（度/秒），正负号决定转动方向 */
const BASE_SPEEDS = [92, -84, 98, -90, 86]
/** 抽取时公转加速倍数 */
const DRAW_BOOST = 6

const ORB_SKINS = [
  {
    body: 'radial-gradient(circle at 32% 26%, #FFFFFF 0%, #FFC2D3 20%, #FF7FA6 62%, #E24E7C 100%)',
    glow: 'rgba(226,78,124,0.32)'
  },
  {
    body: 'radial-gradient(circle at 32% 26%, #FFFFFF 0%, #FFE1B0 20%, #FFB347 62%, #E2841C 100%)',
    glow: 'rgba(226,132,28,0.32)'
  },
  {
    body: 'radial-gradient(circle at 32% 26%, #FFFFFF 0%, #CDEEFF 20%, #6FC8FA 62%, #2A8FD0 100%)',
    glow: 'rgba(42,143,208,0.32)'
  },
  {
    body: 'radial-gradient(circle at 32% 26%, #FFFFFF 0%, #D6F5DC 20%, #93DC9F 62%, #48B264 100%)',
    glow: 'rgba(72,178,100,0.32)'
  },
  {
    body: 'radial-gradient(circle at 32% 26%, #FFFFFF 0%, #E4DCFF 20%, #B4A2FF 62%, #7C5FE0 100%)',
    glow: 'rgba(124,95,224,0.32)'
  }
]

const WINDOW_HEIGHT = Taro.getSystemInfoSync().windowHeight || 667
const RESULT_SHEET_H = Math.round(WINDOW_HEIGHT * 0.76)
const EXCLUDE_SHEET_H = Math.round(WINDOW_HEIGHT * 0.78)

interface CountCardProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (next: number) => void
}

function CountCard({ label, value, min, max, onChange }: CountCardProps) {
  return (
    <View className='draw__count-card'>
      <Text className='draw__count-label'>{label}</Text>
      <View className='draw__stepper'>
        <View className='draw__step-btn' onClick={() => onChange(Math.max(min, value - 1))}>
          <Icon name='minus' size={24} color='#2B628F' strokeWidth={2.5} />
        </View>
        <Text className='draw__step-value'>{value}</Text>
        <View className='draw__step-btn' onClick={() => onChange(Math.min(max, value + 1))}>
          <Icon name='plus' size={24} color='#2B628F' strokeWidth={2.5} />
        </View>
      </View>
    </View>
  )
}

export default function RandomDraw() {
  const classId = useUserStore((s) => s.currentClassId)

  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  const [mainCount, setMainCount] = useState(5)
  const [backupCount, setBackupCount] = useState(3)
  const drawTitle = '随机抽签'

  // 排除人员相关状态
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())
  const [showExcludeModal, setShowExcludeModal] = useState(false)

  // 抽签流程状态机：idle（待抽取）/ drawing（抽取中）/ result（已揭晓）
  const [phase, setPhase] = useState<Phase>('idle')
  const [previewResult, setPreviewResult] = useState<{ main: Member[]; backup: Member[] } | null>(
    null
  )
  const [rollingName, setRollingName] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [saved, setSaved] = useState(false)

  const drawingRef = useRef(false)
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  useEffect(() => {
    if (!classId) {
      setLoading(false)
      return
    }
    classesApi
      .getMembers(classId, { page: 1, pageSize: 200 })
      .then((res) => {
        const list = Array.isArray(res?.list) ? res.list : []
        // 平台内置账号（系统管理员）不参与抽签
        setMembers(
          list.map(mapMember).filter((m: Member) => m.id && !m.isSystemAccount)
        )
      })
      .catch(() => {
        Taro.showToast({ title: '加载班级成员失败', icon: 'none' })
      })
      .finally(() => setLoading(false))
  }, [classId])

  // 候选人池
  const candidates = useMemo(
    () => members.filter((m) => !excludedIds.has(m.id)),
    [members, excludedIds]
  )

  // 抽取中：球面文字快速滚动候选人姓名
  useEffect(() => {
    if (phase !== 'drawing' || candidates.length === 0) return
    const timer = setInterval(() => {
      const pick = candidates[Math.floor(Math.random() * candidates.length)]
      setRollingName(pick?.name || '')
    }, 55)
    return () => clearInterval(timer)
  }, [phase, candidates])

  const toggleExclude = (id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // 揭晓：写入结果，稍后拉起结果抽屉
  const finishDraw = (result: { main: Member[]; backup: Member[] }) => {
    setPreviewResult(result)
    setPhase('result')
    timersRef.current.push(setTimeout(() => setSheetOpen(true), 780))
  }

  const runDraw = async () => {
    if (loading || drawingRef.current) return
    if (!classId) {
      Taro.showToast({ title: '请先加入班级', icon: 'none' })
      return
    }
    if (candidates.length < mainCount + backupCount) {
      Taro.showToast({
        title: `候选人不足，至少需要 ${mainCount + backupCount} 人（当前 ${candidates.length} 人）`,
        icon: 'none'
      })
      return
    }
    if (drawingRef.current) return

    drawingRef.current = true
    setSheetOpen(false)
    setSaved(false)
    setPreviewResult(null)
    setPhase('drawing')

    const startedAt = Date.now()
    try {
      const res: any = await drawApi.preview(classId, {
        title: drawTitle,
        mainCount,
        backupCount,
        excludedUserIds: Array.from(excludedIds)
      })
      const data = res?.data || res || {}
      const result = {
        main: (data.main || []).map(mapMember),
        backup: (data.backup || []).map(mapMember)
      }
      // 动效至少跑满 900ms，避免接口太快导致一闪而过
      const wait = Math.max(0, 900 - (Date.now() - startedAt))
      timersRef.current.push(
        setTimeout(() => {
          drawingRef.current = false
          finishDraw(result)
        }, wait)
      )
    } catch {
      drawingRef.current = false
      setPhase('idle')
    }
  }

  // 确认保存抽签结果（保存后保留结果态并标记「已保存」）
  const handleConfirmSave = async () => {
    if (!classId || !previewResult) return
    setConfirming(true)
    try {
      await drawApi.randomDraw(classId, {
        title: drawTitle,
        mainCount,
        backupCount,
        excludedUserIds: Array.from(excludedIds)
      })
      setSaved(true)
      Taro.showToast({ title: '抽签结果已保存', icon: 'success' })
    } finally {
      setConfirming(false)
    }
  }

  // 收起结果抽屉 → 回到待抽取状态，彩球继续公转
  const dismissResult = () => {
    setSheetOpen(false)
    setPhase('idle')
    setSaved(false)
    setPreviewResult(null)
  }

  const isDrawing = phase === 'drawing'
  const ballValue =
    phase === 'result' && previewResult ? previewResult.main.length : candidates.length
  const ballLabel = isDrawing ? '正在抽取…' : phase === 'result' ? '正选代表' : '当前候选'

  const renderResultRow = (item: Member, index: number) => (
    <View key={`${item.id}-${index}`} className='draw__result-row'>
      <View className='draw__result-rank'>{index + 1}</View>
      <View className='draw__result-avatar'>{(item.name || '?').slice(0, 1)}</View>
      <View className='draw__result-info'>
        <Text className='draw__result-name'>{item.name}</Text>
        {item.studentId ? (
          <Text className='draw__result-sid'>{item.studentId}</Text>
        ) : null}
      </View>
      <Text className='draw__result-tag'>正选</Text>
    </View>
  )

  return (
    <View className='draw'>
      <StatusBar />
      <ScrollView scrollY className='draw__scroll'>
        {/* Header */}
        <View className='draw__head'>
          <View className='draw__back' onClick={() => Taro.navigateBack()}>
            <Icon name='chevron-left' size={48} color='#12395C' strokeWidth={2} />
          </View>
          <Text className='draw__title'>随机抽签</Text>
          <View
            className='draw__rules-btn'
            onClick={() => Taro.navigateTo({ url: '/pages-sub/vote/draw-rules/index' })}
          >
            <Text className='draw__rules-btn-text'>规则</Text>
          </View>
        </View>

        {/* 舞台：一颗玻璃球 + 围着它转的彩球 */}
        <View className='draw__stage'>
          <View
            className='draw__stage-inner'
            style={{ transform: `translateY(${sheetOpen ? -172 : 0}rpx)` }}
          >
            <View className='draw__orbit-box'>
              {/* 球体背后的光晕 */}
              <View className='draw__halo' />

              {/* 双虚线轨道，反向旋转 */}
              <View className='draw__rings'>
                <View className='draw__ring draw__ring--outer' />
                <View className='draw__ring draw__ring--inner' />
              </View>

              {/* 中央玻璃球 */}
              <View className='draw__ball'>
                <View className='draw__ball-shine' />
                <View className='draw__ball-body'>
                  {isDrawing ? (
                    <Text className='draw__ball-rolling'>{rollingName || '…'}</Text>
                  ) : (
                    <View className='draw__ball-value-row'>
                      <Text
                        className={`draw__ball-value ${
                          String(ballValue).length > 2 ? 'draw__ball-value--lg' : ''
                        }`}
                      >
                        {ballValue}
                      </Text>
                      <Text className='draw__ball-unit'>人</Text>
                    </View>
                  )}
                  <Text className='draw__ball-label'>{ballLabel}</Text>
                </View>
              </View>

              {/* 5 颗绕球公转的彩球 */}
              {phase !== 'result' ? (
                <View className='draw__orbs'>
                  {ORB_SKINS.map((skin, i) => {
                    const duration = (360 / Math.abs(BASE_SPEEDS[i]) / (isDrawing ? DRAW_BOOST : 1)).toFixed(2)
                    return (
                      <View
                        key={`orb-${i}`}
                        className={`draw__orb ${
                          BASE_SPEEDS[i] < 0 ? 'draw__orb--reverse' : ''
                        }`}
                        style={{ animationDuration: `${duration}s` }}
                      >
                        <View
                          className='draw__orb-arm'
                          style={{ transform: `rotate(${START_ANGLES[i]}deg)` }}
                        >
                          <View
                            className='draw__orb-ball'
                            style={{ background: skin.body, boxShadow: `0 12rpx 28rpx ${skin.glow}, inset 0 -6rpx 12rpx rgba(0,0,0,0.12), inset 0 6rpx 12rpx rgba(255,255,255,0.8)` }}
                          />
                        </View>
                      </View>
                    )
                  })}
                </View>
              ) : (
                <View className='draw__orbs'>
                  {ORB_SKINS.map((skin, i) => (
                    <View
                      key={`slot-${i}`}
                      className='draw__slot'
                      style={{ transform: `rotate(${SLOT_ANGLES[i % SLOT_ANGLES.length]}deg)` }}
                    >
                      <View
                        className='draw__orb-ball'
                        style={{ background: skin.body, boxShadow: `0 12rpx 28rpx ${skin.glow}, inset 0 -6rpx 12rpx rgba(0,0,0,0.12), inset 0 6rpx 12rpx rgba(255,255,255,0.8)` }}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* 规则标签 */}
            <View
              className='draw__tags'
              style={{ opacity: phase === 'idle' ? 1 : 0 }}
            >
              <Text className='draw__tag'>概率均等</Text>
              <Text className='draw__tag'>已排除 {excludedIds.size} 人</Text>
            </View>
          </View>
        </View>

        {/* 底部操作区 */}
        <View className='draw__footer'>
          {/* 统计条 */}
          <View className='draw__summary'>
            {[
              { label: '候选人数', value: `${candidates.length}` },
              { label: '正选人数', value: `${mainCount}` },
              { label: '候补人数', value: `${backupCount}` }
            ].map((item, i) => (
              <View
                key={item.label}
                className={`draw__summary-item ${i > 0 ? 'draw__summary-item--border' : ''}`}
              >
                <Text className='draw__summary-label'>{item.label}</Text>
                <Text className='draw__summary-value'>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* 三格卡片 */}
          <View className='draw__cards'>
            <CountCard
              label='正选人数'
              value={mainCount}
              min={1}
              max={10}
              onChange={setMainCount}
            />
            <CountCard
              label='候补人数'
              value={backupCount}
              min={0}
              max={10}
              onChange={setBackupCount}
            />
            <View className='draw__count-card' onClick={() => setShowExcludeModal(true)}>
              <View className='draw__exclude-label'>
                <Icon name='user-minus' size={24} color='#6B8FAD' strokeWidth={2} />
                <Text className='draw__count-label'>排除人员</Text>
              </View>
              <Text className='draw__exclude-value'>{excludedIds.size} 人</Text>
            </View>
          </View>

          {/* 主按钮 */}
          <View className='draw__actions'>
            <View
              className={`draw__btn ${loading || isDrawing ? 'is-disabled' : ''}`}
              onClick={runDraw}
            >
              <Icon name='shuffle' size={36} color='#FFFFFF' strokeWidth={2.5} />
              <Text className='draw__btn-text'>
                {loading ? '加载中…' : isDrawing ? '抽取中…' : '开始抽签'}
              </Text>
            </View>
            <View
              className='draw__btn-history'
              onClick={() => Taro.navigateTo({ url: '/pages-sub/vote/draw-records/index' })}
            >
              <Icon name='history' size={40} color='#2B628F' strokeWidth={2} />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 结果抽屉 */}
      <BottomSheet
        open={sheetOpen && !!previewResult}
        onClose={dismissResult}
        title='本次抽签结果'
        subtitle={`正选 ${previewResult?.main.length ?? 0} 人 · 候补 ${previewResult?.backup.length ?? 0} 人`}
        maxHeight={RESULT_SHEET_H}
        footer={
          <View className='draw__sheet-actions'>
            <View className='draw__sheet-retry' onClick={runDraw}>
              <Icon name='rotate-ccw' size={32} color='#0B6FE0' strokeWidth={2.2} />
              <Text className='draw__sheet-retry-text'>再抽一次</Text>
            </View>
            <View
              className='draw__sheet-save'
              style={{
                backgroundImage: saved
                  ? 'linear-gradient(135deg, #8FD6A8 0%, #47B36B 100%)'
                  : 'linear-gradient(135deg, #2F9BF0 0%, #0B6FE0 100%)'
              }}
              onClick={handleConfirmSave}
            >
              {saved ? (
                <>
                  <Icon name='check' size={32} color='#FFFFFF' strokeWidth={2.6} />
                  <Text className='draw__sheet-save-text'>已保存</Text>
                </>
              ) : (
                <Text className='draw__sheet-save-text'>
                  {confirming ? '保存中…' : '确认保存'}
                </Text>
              )}
            </View>
          </View>
        }
      >
        <View className='draw__result-list'>
          {previewResult?.main.map((item, index) => renderResultRow(item, index))}
          {previewResult?.backup.length ? (
            <View className='draw__backup'>
              <Text className='draw__backup-label'>候补</Text>
              <Text className='draw__backup-names'>
                {previewResult.backup.map((m) => m.name).join('、')}
              </Text>
            </View>
          ) : null}
        </View>
      </BottomSheet>

      {/* 排除人员弹层 */}
      <BottomSheet
        open={showExcludeModal}
        onClose={() => setShowExcludeModal(false)}
        title='选择排除人员'
        subtitle={`已排除 ${excludedIds.size} 人 · 候选 ${members.length - excludedIds.size} 人`}
        maxHeight={EXCLUDE_SHEET_H}
        extra={
          <Text
            className={`draw__clear ${excludedIds.size === 0 ? 'is-disabled' : ''}`}
            onClick={() => setExcludedIds(new Set())}
          >
            清空
          </Text>
        }
        footer={
          <View className='draw__sheet-done' onClick={() => setShowExcludeModal(false)}>
            <Text className='draw__sheet-done-text'>
              完成 · {members.length - excludedIds.size} 人参与抽签
            </Text>
          </View>
        }
      >
        {members.length === 0 ? (
          <Text className='draw__empty'>暂无班级成员</Text>
        ) : (
          <View className='draw__member-list'>
            {members.map((m) => {
              const isExcluded = excludedIds.has(m.id)
              return (
                <View key={m.id} className='draw__member' onClick={() => toggleExclude(m.id)}>
                  <View className='draw__member-avatar'>{(m.name || '?').slice(0, 1)}</View>
                  <View className='draw__member-info'>
                    <Text className='draw__member-name'>{m.name}</Text>
                    {m.studentId ? (
                      <Text className='draw__member-sid'>{m.studentId}</Text>
                    ) : null}
                  </View>
                  <View
                    className={`draw__check ${isExcluded ? 'draw__check--on' : ''}`}
                  >
                    {isExcluded ? (
                      <Icon name='check' size={24} color='#FFFFFF' strokeWidth={3} />
                    ) : null}
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </BottomSheet>
    </View>
  )
}