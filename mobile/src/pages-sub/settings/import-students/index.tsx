import { useEffect, useRef, useState } from 'react'
import { View, Text, Switch } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { Button, Icon } from '@/components/ui'
import { classSettingsApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import { chooseFile } from '@/utils/native'
import './index.scss'

type Step = 'select' | 'uploading' | 'importing' | 'result'

interface ReportError {
  row: number
  studentNo: string
  reason: string
}

interface ImportResult {
  successCount: number
  removedCount: number
  updatedCount: number
  duplicateStudentNos: string[]
  errors: ReportError[]
}

export default function ImportStudents() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireAuth } = useAuth()

  const classIdRef = useRef(currentClassId || '')

  const [step, setStep] = useState<Step>('select')
  const [filePath, setFilePath] = useState('')
  const [fileName, setFileName] = useState('')
  const [syncMode, setSyncMode] = useState(true)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)

  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useLoad(() => {
    if (!requireAuth('committee')) return
    classIdRef.current = currentClassId || ''
  })

  useEffect(() => {
    return () => {
      if (progressTimer.current) {
        clearInterval(progressTimer.current)
        progressTimer.current = null
      }
    }
  }, [])

  const stopProgress = () => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current)
      progressTimer.current = null
    }
  }

  const startProgress = () => {
    setProgress(0)
    stopProgress()
    progressTimer.current = setInterval(() => {
      setProgress((p) => (p < 90 ? p + 5 : p))
    }, 160)
  }

  const selectFile = async () => {
    try {
      const paths = await chooseFile(1)
      if (!paths || paths.length === 0) return
      const p = paths[0]
      const name = p.split(/[/\\]/).pop() || '名单文件'
      const ext = name.split('.').pop()?.toLowerCase()
      if (!['xlsx', 'xls'].includes(ext || '')) {
        Taro.showToast({ title: '仅支持 .xlsx、.xls 格式', icon: 'none' })
        return
      }
      setFilePath(p)
      setFileName(name)
    } catch {
      Taro.showToast({ title: '选择文件失败', icon: 'none' })
    }
  }

  const reset = () => {
    setFilePath('')
    setFileName('')
    setResult(null)
    setProgress(0)
    setStep('select')
  }

  const handleUpload = async () => {
    if (!filePath) {
      Taro.showToast({ title: '请先选择文件', icon: 'none' })
      return
    }
    if (!classIdRef.current) {
      Taro.showToast({ title: '未找到班级信息', icon: 'none' })
      return
    }
    setStep('uploading')
    startProgress()

    try {
      const { fileUrl } = await classSettingsApi.uploadStudentExcel(filePath)
      stopProgress()
      setProgress(100)

      setStep('importing')
      setProgress(0)
      const res = await classSettingsApi.importStudentExcel(classIdRef.current, fileUrl, syncMode)
      const data = (res || {}) as ImportResult
      setResult(data)
      setStep('result')

      if ((data.successCount || 0) > 0) {
        Taro.showToast({
          title: syncMode ? `同步完成：新增 ${data.successCount} 人` : `导入成功：新增 ${data.successCount} 人`,
          icon: 'success'
        })
      }
    } catch (err: any) {
      const msg = err?.message || '导入失败'
      Taro.showToast({ title: msg, icon: 'none' })
      setStep('select')
      setProgress(0)
    } finally {
      stopProgress()
    }
  }

  const finish = () => {
    Taro.navigateBack()
  }

  // ---------------- Step: 选择文件 ----------------
  if (step === 'select') {
    return (
      <View className='impt'>
        <NavBar title='导入学生' />
        <View className='impt__body'>
          <Text className='impt__hint'>选择一份 Excel 文件快速导入班级成员名单</Text>

          {/* 文件选择 */}
          {!filePath ? (
            <View className='impt__drop' onClick={selectFile}>
              <Icon name='file-text' size={64} color='#0062FF' strokeWidth={2} />
              <Text className='impt__drop-title'>点击选择 Excel 文件</Text>
              <Text className='impt__drop-sub'>支持 .xlsx、.xls，文件不超过 10MB</Text>
            </View>
          ) : (
            <View className='impt__file'>
              <View className='impt__file-icon'>
                <Icon name='file-text' size={44} color='#60A5FA' strokeWidth={2} />
              </View>
              <View className='impt__file-info'>
                <Text className='impt__file-name'>{fileName}</Text>
                <Text className='impt__file-sub'>.xlsx / .xls</Text>
              </View>
              <Text className='impt__file-reset' onClick={reset}>
                重新选择
              </Text>
            </View>
          )}

          {/* 同步模式开关 */}
          <View className='impt__sync'>
            <View className='impt__sync-info'>
              <Text className='impt__sync-title'>同步模式</Text>
              <Text className='impt__sync-sub'>开启后以名单为准，移除不在名单中的成员</Text>
            </View>
            <Switch
              className='impt__sync-switch'
              checked={syncMode}
              color='#0062FF'
              onChange={(e) => setSyncMode(e.detail.value)}
            />
          </View>

          {/* 格式说明 */}
          <View className='impt__tip'>
            <View className='impt__tip-head'>
              <Icon name='alert-circle' size={32} color='#1E40AF' strokeWidth={2} />
              <Text className='impt__tip-title'>Excel 表头要求</Text>
            </View>
            <Text className='impt__tip-text'>
              文件必须包含三列表头：学号 | 姓名 | 手机号
            </Text>
          </View>

          <Button
            type='primary'
            size='lg'
            block
            disabled={!filePath}
            onClick={handleUpload}
            className='impt__submit'
          >
            {syncMode ? '开始同步名单' : '开始导入名单'}
          </Button>
        </View>
      </View>
    )
  }

  // ---------------- Step: 上传中 ----------------
  if (step === 'uploading') {
    return (
      <View className='impt'>
        <NavBar title='导入学生' />
        <View className='impt__loading'>
          <View className='impt__loading-icon'>
            <Icon name='upload' size={72} color='#0062FF' strokeWidth={2} />
          </View>
          <Text className='impt__loading-title'>正在上传文件...</Text>
          <View className='impt__bar'>
            <View className='impt__bar-fill' style={{ width: `${progress}%` }} />
          </View>
          <Text className='impt__loading-pct'>{progress}%</Text>
          <Text className='impt__loading-sub'>{fileName}</Text>
        </View>
      </View>
    )
  }

  // ---------------- Step: 导入中 ----------------
  if (step === 'importing') {
    return (
      <View className='impt'>
        <NavBar title='导入学生' />
        <View className='impt__loading'>
          <View className='impt__spinner' />
          <Text className='impt__loading-title'>正在解析名单...</Text>
          <Text className='impt__loading-sub'>请稍候，正在处理 {fileName}</Text>
        </View>
      </View>
    )
  }

  // ---------------- Step: 结果 ----------------
  if (step === 'result' && result) {
    const errors = result.errors || []
    const duplicates = result.duplicateStudentNos || []
    const hasIssues = errors.length > 0 || duplicates.length > 0
    const success = result.successCount || 0
    const updated = result.updatedCount || 0
    const removed = result.removedCount || 0

    return (
      <View className='impt'>
        <NavBar title='导入结果' onBack={finish} />
        <View className='impt__body'>
          {/* 成功卡片 */}
          <View className='impt__success-card'>
            <View className='impt__success-badge'>
              <Icon name='check' size={48} color='#fff' strokeWidth={3} />
            </View>
            <View className='impt__success-info'>
              <Text className='impt__success-title'>{syncMode ? '同步完成' : '导入完成'}</Text>
              <Text className='impt__success-sub'>文件：{fileName}</Text>
            </View>
          </View>

          {/* 统计 */}
          <View className='impt__stats'>
            <View className='impt__stat'>
              <Text className='impt__stat-value impt__stat-value--primary'>{success}</Text>
              <Text className='impt__stat-label'>新增成员</Text>
            </View>
            <View className='impt__stat'>
              <Text className='impt__stat-value impt__stat-value--success'>{updated}</Text>
              <Text className='impt__stat-label'>补全学号</Text>
            </View>
            <View className='impt__stat'>
              <Text className='impt__stat-value impt__stat-value--warning'>{duplicates.length}</Text>
              <Text className='impt__stat-label'>已存在</Text>
            </View>
            <View className='impt__stat'>
              <Text className='impt__stat-value impt__stat-value--danger'>{removed}</Text>
              <Text className='impt__stat-label'>{syncMode ? '已移除' : '异常'}</Text>
            </View>
          </View>

          {/* 异常明细 */}
          {hasIssues && (
            <View className='impt__issues'>
              <Text className='impt__issues-title'>异常明细</Text>
              {duplicates.map((sn, idx) => (
                <View key={`dup-${idx}`} className='impt__issue impt__issue--warning'>
                  <Icon name='alert-circle' size={32} color='#B45309' strokeWidth={2} />
                  <Text className='impt__issue-text'>学号 {sn}：已在班级中存在</Text>
                </View>
              ))}
              {errors.map((err, idx) => (
                <View key={`err-${idx}`} className='impt__issue impt__issue--danger'>
                  <Icon name='x' size={32} color='#B91C1C' strokeWidth={2} />
                  <Text className='impt__issue-text'>
                    第{err.row}行（{err.studentNo || '空学号'}）：{err.reason}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View className='impt__actions'>
            <Button type='primary' size='lg' block onClick={finish} className='impt__submit'>
              完成
            </Button>
            <Button type='ghost' size='lg' block onClick={reset} className='impt__submit'>
              继续导入
            </Button>
          </View>
        </View>
      </View>
    )
  }

  return <View className='impt' />
}