import { useState, useRef } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, Modal, ListLoading } from '@/components/business'
import { classesApi, drawApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth, vibrate } from '@/utils'
import './index.scss'

interface Member {
  id: string
  studentId: string
  name: string
}

const mapMember = (m: any): Member => ({
  id: m.userId || m.id || '',
  studentId: m.studentId || m.student_id || '',
  name: m.name || m.userName || ''
})

export default function RandomDraw() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const className = useUserStore((s) => s.userInfo?.className)
  const { requireLogin } = useAuth()

  const classIdRef = { id: currentClassId || '' }

  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  const [mainCount, setMainCount] = useState(5)
  const [backupCount, setBackupCount] = useState(3)
  const [mainSelected, setMainSelected] = useState<Member[]>([])
  const [backupSelected, setBackupSelected] = useState<Member[]>([])

  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())
  const [showExcludeModal, setShowExcludeModal] = useState(false)

  const [previewResult, setPreviewResult] = useState<{ main: Member[]; backup: Member[] } | null>(null)
  const [confirming, setConfirming] = useState(false)

  // 滚动动画相关
  const [rolling, setRolling] = useState(false)
  const [rollingName, setRollingName] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useLoad((o) => {
    if (!requireLogin()) return
    const cid = (o?.classId as string) || currentClassId
    classIdRef.id = cid || ''
    fetchMembers()
  })

  const fetchMembers = async () => {
    if (!classIdRef.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await classesApi.getMembers(classIdRef.id, { page: 1, pageSize: 200 })
      const list = res?.list || []
      setMembers(list.map((m: any) => ({
        id: m.userId || m.id || '',
        studentId: m.studentId || m.student_id || '',
        name: m.userName || m.name || ''
      })))
    } catch {
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  const candidates = members.filter((m) => !excludedIds.has(m.id))

  const toggleExclude = (id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // 滚动动画：在候选名单中轮流显示名字，结束后振动并弹出结果
  const runRolling = (result: { main: Member[]; backup: Member[] }) => {
    setRolling(true)
    clearTimer()
    let ticks = 0
    const maxTicks = 30 // ~2.4 秒
    const names = candidates.length
      ? candidates.map((m) => m.name)
      : result.main.map((m) => m.name)
    timerRef.current = setInterval(() => {
      ticks += 1
      if (names.length > 0) {
        setRollingName(names[Math.floor(Math.random() * names.length)])
      }
      if (ticks >= maxTicks) {
        clearTimer()
        setRolling(false)
        vibrate() // 抽中结果振动反馈
        setPreviewResult(result)
      }
    }, 80)
  }

  const handleDraw = async () => {
    if (!classIdRef.id) {
      Taro.showToast({ title: '请先加入班级', icon: 'none' })
      return
    }
    if (candidates.length < mainCount + backupCount) {
      Taro.showToast({ title: `候选人不足，至少需要 ${mainCount + backupCount} 人`, icon: 'none' })
      return
    }
    try {
      const res: any = await drawApi.preview(classIdRef.id, {
        title: '随机抽签',
        mainCount,
        backupCount,
        excludedUserIds: Array.from(excludedIds)
      })
      const data = res?.data || res
      runRolling({
        main: (data.main || []).map(mapMember),
        backup: (data.backup || []).map(mapMember)
      })
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '预览抽签失败', icon: 'none' })
    }
  }

  const handleRedraw = async () => {
    if (!classIdRef.id) return
    try {
      const res: any = await drawApi.preview(classIdRef.id, {
        title: '随机抽签',
        mainCount,
        backupCount,
        excludedUserIds: Array.from(excludedIds)
      })
      const data = res?.data || res
      setPreviewResult({
        main: (data.main || []).map(mapMember),
        backup: (data.backup || []).map(mapMember)
      })
      vibrate()
      Taro.showToast({ title: '已重新抽签', icon: 'success' })
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '重新抽签失败', icon: 'none' })
    }
  }

  const handleConfirmSave = async () => {
    if (!classIdRef.id || !previewResult) return
    setConfirming(true)
    try {
      const res: any = await drawApi.randomDraw(classIdRef.id, {
        title: '随机抽签',
        mainCount,
        backupCount,
        excludedUserIds: Array.from(excludedIds)
      })
      const data = res?.data || res
      setMainSelected((data.main || []).map(mapMember))
      setBackupSelected((data.backup || []).map(mapMember))
      setPreviewResult(null)
      Taro.showToast({ title: '抽签已保存', icon: 'success' })
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '保存抽签失败', icon: 'none' })
    } finally {
      setConfirming(false)
    }
  }

  const goRecords = () => {
    Taro.navigateTo({ url: '/pages-sub/vote/draw-records/index' })
  }

  const goRules = () => {
    Taro.navigateTo({ url: '/pages-sub/vote/draw-rules/index' })
  }

  const goNotify = () => {
    Taro.showToast({ title: '请到抽签记录同步通知', icon: 'none' })
  }

  const renderRow = (item: Member, index: number) => (
    <View className='draw__row' key={item.id || index}>
      <View className='draw__row-rank'>
        <Text className='draw__row-rank-text'>{index + 1}</Text>
      </View>
      <View className='draw__row-avatar'>
        <Text className='draw__row-avatar-text'>{(item.name || '?')[0]}</Text>
      </View>
      <Text className='draw__row-name'>{item.name || '未知'}</Text>
    </View>
  )

  if (loading) {
    return (
      <View className='draw'>
        <NavBar title='随机抽签' />
        <ListLoading rows={5} />
      </View>
    )
  }

  return (
    <View className='draw'>
      <NavBar
        title='随机抽签'
        right={
          <View className='draw__rules' onClick={goRules}>
            <Text className='draw__rules-text'>规则</Text>
          </View>
        }
      />

      <View className='draw__bg'>
        {/* 信息栏 */}
        <View className='draw__info-bar'>
          <View className='draw__info-item'>
            <Text className='draw__info-label'>活动名称</Text>
            <Text className='draw__info-value'>随机抽签</Text>
          </View>
          <View className='draw__info-item'>
            <Text className='draw__info-label'>班级</Text>
            <Text className='draw__info-value'>{className || '未加入班级'}</Text>
          </View>
          <View className='draw__info-item'>
            <Text className='draw__info-label'>候选人数</Text>
            <Text className='draw__info-value'>候选 {candidates.length} 人（排除 {excludedIds.size} 人）</Text>
          </View>
        </View>

        {/* 中签公告 */}
        {mainSelected.length > 0 ? (
          <View className='draw__announce'>
            <Text className='draw__announce-text'>恭喜 {mainSelected[0]?.name} 同学被抽中</Text>
          </View>
        ) : null}

        {/* 设置区 */}
        <View className='draw__settings'>
          <View className='draw__setting'>
            <Text className='draw__setting-label'>正选人数</Text>
            <View className='draw__stepper'>
              <Text className='draw__step-btn' onClick={() => setMainCount((v) => Math.max(1, v - 1))}>−</Text>
              <Text className='draw__step-num'>{mainCount}</Text>
              <Text className='draw__step-btn' onClick={() => setMainCount((v) => Math.min(10, v + 1))}>+</Text>
            </View>
          </View>
          <View className='draw__setting'>
            <Text className='draw__setting-label'>候补人数</Text>
            <View className='draw__stepper'>
              <Text className='draw__step-btn' onClick={() => setBackupCount((v) => Math.max(0, v - 1))}>−</Text>
              <Text className='draw__step-num'>{backupCount}</Text>
              <Text className='draw__step-btn' onClick={() => setBackupCount((v) => Math.min(10, v + 1))}>+</Text>
            </View>
          </View>
          <View className='draw__setting' onClick={() => setShowExcludeModal(true)}>
            <Text className='draw__setting-label'>排除人员</Text>
            <Text className='draw__setting-value'>{excludedIds.size} 人</Text>
          </View>
        </View>

        {/* 抽签按钮 / 滚动动画 */}
        <View className='draw__center'>
          <View className={`draw__start ${rolling ? 'draw__start--rolling' : ''}`} onClick={handleDraw}>
            <Text className='draw__start-title'>{rolling ? '抽取中...' : '开始抽签'}</Text>
            <Text className='draw__start-sub'>从全班{members.length}人中抽取</Text>
          </View>
        </View>

        <View className='draw__record-link' onClick={goRecords}>
          <Text className='draw__record-link-text'>中签记录 &gt;</Text>
        </View>

        {/* 结果卡片 */}
        <View className='draw__result'>
          <View className='draw__result-head'>
            <Text className='draw__result-title'>中签结果榜单</Text>
          </View>

          {rolling ? (
            <View className='draw__rolling'>
              <Text className='draw__rolling-name'>{rollingName || '…'}</Text>
              <Text className='draw__rolling-tip'>正在抽取中...</Text>
            </View>
          ) : (
            <>
              <View className='draw__result-group'>
                <Text className='draw__result-group-title'>正选代表 · 共{mainSelected.length}人</Text>
                {mainSelected.length > 0 ? (
                  mainSelected.map((item, index) => renderRow(item, index))
                ) : (
                  <Text className='draw__result-empty'>点击“开始抽签”抽取</Text>
                )}
              </View>
              <View className='draw__result-group'>
                <Text className='draw__result-group-title'>候补代表 · 共{backupSelected.length}人</Text>
                {backupSelected.length > 0 ? (
                  backupSelected.map((item, index) => renderRow(item, index))
                ) : (
                  <Text className='draw__result-empty'>候补名单将在抽签后显示</Text>
                )}
              </View>
            </>
          )}
        </View>

        {/* 底部操作 */}
        <View className='draw__actions'>
          <View className='draw__action draw__action--primary' onClick={goRecords}>
            <Text className='draw__action-text--primary'>查看抽签记录</Text>
          </View>
          <View className='draw__action draw__action--ghost' onClick={goNotify}>
            <Text className='draw__action-text--ghost'>结果同步至班级通知</Text>
          </View>
        </View>
      </View>

      {/* 排除人员弹层 */}
      <Modal visible={showExcludeModal} title='选择排除人员' position='bottom' onClose={() => setShowExcludeModal(false)}>
        <Text className='draw__modal-sub'>已选择 {excludedIds.size} 人排除</Text>
        <ScrollView scrollY className='draw__modal-list'>
          {members.length === 0 ? (
            <Text className='draw__modal-empty'>暂无班级成员</Text>
          ) : (
            members.map((m) => {
              const isExcluded = excludedIds.has(m.id)
              return (
                <View
                  key={m.id}
                  className={`draw__modal-item ${isExcluded ? 'draw__modal-item--on' : ''}`}
                  onClick={() => toggleExclude(m.id)}
                >
                  <View className='draw__modal-item-avatar'>
                    <Text className='draw__modal-item-avatar-text'>{(m.name || '?')[0]}</Text>
                  </View>
                  <View className='draw__modal-item-info'>
                    <Text className='draw__modal-item-name'>{m.name || '未知'}</Text>
                    {m.studentId ? <Text className='draw__modal-item-id'>{m.studentId}</Text> : null}
                  </View>
                  {isExcluded ? <Text className='draw__modal-item-check'>✓</Text> : null}
                </View>
              )
            })
          )}
        </ScrollView>
        <View className='draw__modal-confirm' onClick={() => setShowExcludeModal(false)}>
          <Text className='draw__modal-confirm-text'>确定</Text>
        </View>
      </Modal>

      {/* 预览确认弹层 */}
      <Modal visible={!!previewResult} title='抽签结果预览' position='bottom' closable={false} onClose={() => setPreviewResult(null)}>
        <ScrollView scrollY className='draw__preview-list'>
          <View className='draw__preview-group'>
            <Text className='draw__preview-title'>正选代表 · 共{previewResult?.main.length || 0}人</Text>
            {(previewResult?.main || []).map((item, index) => renderRow(item, index))}
          </View>
          {(previewResult?.backup.length || 0) > 0 ? (
            <View className='draw__preview-group'>
              <Text className='draw__preview-title'>候补代表 · 共{previewResult?.backup.length || 0}人</Text>
              {(previewResult?.backup || []).map((item, index) => renderRow(item, index))}
            </View>
          ) : null}
        </ScrollView>
        <View className='draw__preview-actions'>
          <View className='draw__preview-btn draw__preview-btn--ghost' onClick={handleRedraw}>
            <Text className='draw__preview-text--ghost'>重新抽签</Text>
          </View>
          <View className='draw__preview-btn draw__preview-btn--primary' onClick={handleConfirmSave}>
            <Text className='draw__preview-text--primary'>{confirming ? '保存中...' : '确认保存'}</Text>
          </View>
        </View>
        <View className='draw__preview-cancel' onClick={() => setPreviewResult(null)}>
          <Text className='draw__preview-cancel-text'>取消</Text>
        </View>
      </Modal>
    </View>
  )
}