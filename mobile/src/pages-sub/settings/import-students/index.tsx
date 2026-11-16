// ============================================================
// 导入学生名单
// 1:1 对齐 front/src/pages/class/ImportStudents.tsx
// Excel 选择/模板下载/同步模式/上传进度/导入结果
// ============================================================
import { useState } from 'react'
import { ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { StatusBar } from '@/components/business'
import { Icon } from '@/components/ui'
import type { IconName } from '@/constants/icons'
import { classSettingsApi } from '@/services'
import { useUserStore } from '@/stores'
import './index.scss'

type Step = 'select' | 'uploading' | 'importing' | 'result'

interface SelectedFile {
  path: string
  name: string
  size: number
}

interface ImportResult {
  successCount: number
  pendingCount?: number
  removedCount: number
  updatedCount: number
  sync: boolean
  duplicateStudentNos: string[]
  errors: { row: number; studentNo: string; reason: string }[]
}

export default function ImportStudentsPage() {
  const currentClassId = useUserStore((s) => s.currentClassId)

  const [step, setStep] = useState<Step>('select')
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null)
  const [syncMode, setSyncMode] = useState(true)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)

  const goBack = () => {
    if (Taro.getCurrentPages().length > 1) Taro.navigateBack()
    else Taro.reLaunch({ url: '/pages/home/index' })
  }

  const chooseFile = async () => {
    if (process.env.TARO_ENV === 'h5') {
      Taro.showToast({ title: '请在小程序端选择 Excel 文件', icon: 'none' })
      return
    }
    try {
      const res = await Taro.chooseMessageFile({ count: 1, type: 'file', extension: ['xlsx'] })
      const file = res.tempFiles?.[0]
      if (!file) return

      const ext = (file.name || '').split('.').pop()?.toLowerCase()
      if (ext !== 'xlsx') {
        Taro.showToast({ title: '仅支持 .xlsx 格式，老版 .xls 请先另存为 .xlsx', icon: 'none' })
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        Taro.showToast({ title: '文件不能超过 10MB', icon: 'none' })
        return
      }
      setSelectedFile({ path: file.path, name: file.name, size: file.size })
    } catch (err) {
      const msg = (err as { errMsg?: string })?.errMsg || ''
      if (!/cancel/i.test(msg)) {
        Taro.showToast({ title: '选择文件失败，请重试', icon: 'none' })
      }
    }
  }

  const handleDownloadTemplate = async () => {
    if (downloadingTemplate) return
    setDownloadingTemplate(true)
    try {
      const filePath = await classSettingsApi.downloadStudentExcelTemplate()
      await Taro.openDocument({ filePath, fileType: 'xlsx', showMenu: true })
    } catch {
      Taro.showToast({ title: '模板下载失败，请稍后重试', icon: 'none' })
    } finally {
      setDownloadingTemplate(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !currentClassId) return

    setStep('uploading')
    setUploadProgress(0)
    try {
      const { fileUrl } = await classSettingsApi.uploadStudentExcel(
        selectedFile.path,
        currentClassId,
        (percent) => setUploadProgress(percent)
      )
      if (!fileUrl) throw new Error('上传失败，未获取到文件地址')

      setStep('importing')
      const data = await classSettingsApi.importStudentExcel(
        currentClassId,
        fileUrl,
        syncMode
      )
      const normalized: ImportResult = {
        successCount: data?.successCount || 0,
        pendingCount: data?.pendingCount || 0,
        removedCount: data?.removedCount || 0,
        updatedCount: data?.updatedCount || 0,
        sync: data?.sync ?? syncMode,
        duplicateStudentNos: data?.duplicateStudentNos || [],
        errors: data?.errors || []
      }
      setResult(normalized)
      setStep('result')

      if (normalized.successCount > 0) {
        Taro.showToast({
          title: syncMode
            ? `同步完成：新增 ${normalized.successCount} 人`
            : `导入成功：新增 ${normalized.successCount} 人`,
          icon: 'none'
        })
      }
    } catch {
      setStep('select')
    }
  }

  const reset = () => {
    setSelectedFile(null)
    setResult(null)
    setStep('select')
    setUploadProgress(0)
  }

  const finish = () => {
    Taro.reLaunch({ url: '/pages/home/index' })
  }

  const renderHeader = (title: string, onBack: () => void) => (
    <View className='import__header'>
      <View className='import__back' onClick={onBack}>
        <Icon name='chevron-left' size={44} color='#1A1A1A' strokeWidth={2} />
      </View>
      <Text className='import__header-title'>{title}</Text>
    </View>
  )

  const renderDisabledRow = (icon: IconName, title: string, desc: string) => (
    <View className='import__method import__method--disabled'>
      <View className='import__method-main'>
        <Icon name={icon} size={48} color='#9CA3AF' strokeWidth={2} />
        <View className='import__method-text'>
          <View className='import__method-title-row'>
            <Text className='import__method-title import__method-title--disabled'>{title}</Text>
            <View className='import__soon'>
              <Text className='import__soon-text'>即将上线</Text>
            </View>
          </View>
          <Text className='import__method-desc import__method-desc--disabled'>{desc}</Text>
        </View>
      </View>
      <Icon name='chevron-right' size={40} color='#D1D5DB' strokeWidth={2} />
    </View>
  )

  // ==================== 选择方式 ====================
  if (step === 'select') {
    return (
      <View className='import'>
        <StatusBar />
        <View className='import__body'>
          <View className='import__spacer' />
          {renderHeader('导入学生名单', goBack)}
          <Text className='import__lead'>选择一种方式快速导入班级成员</Text>

          <View className='import__method' onClick={() => void chooseFile()}>
            <View className='import__method-main'>
              <Icon name='file-spreadsheet' size={48} color='#0062FF' strokeWidth={2} />
              <View className='import__method-text'>
                <Text className='import__method-title'>Excel 导入</Text>
                <Text className='import__method-desc'>上传 .xlsx 表格文件</Text>
              </View>
            </View>
            <Icon name='chevron-right' size={40} color='#9CA3AF' strokeWidth={2} />
          </View>

          <View className='import__template-row'>
            <Text className='import__template-tip'>首次导入建议先下载模板填写</Text>
            <View
              className={`import__template-btn ${downloadingTemplate ? 'import__template-btn--loading' : ''}`}
              onClick={() => {
                if (!downloadingTemplate) void handleDownloadTemplate()
              }}
            >
              <Icon name='download' size={28} color='#0062FF' strokeWidth={2} />
              <Text className='import__template-btn-text'>
                {downloadingTemplate ? '下载中...' : '下载模板'}
              </Text>
            </View>
          </View>

          {selectedFile ? (
            <View className='import__selected'>
              <View className='import__file'>
                <View className='import__file-icon'>
                  <Icon name='file-spreadsheet' size={40} color='#FFFFFF' strokeWidth={2} />
                </View>
                <View className='import__file-main'>
                  <Text className='import__file-name'>{selectedFile.name}</Text>
                  <Text className='import__file-size'>
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </Text>
                </View>
                <Text className='import__file-reset' onClick={reset}>
                  重新选择
                </Text>
              </View>

              <View className='import__sync'>
                <View className='import__sync-main'>
                  <Text className='import__sync-title'>同步模式</Text>
                  <Text className='import__sync-desc'>
                    开启后以新名单为准，移除不在名单中的成员（群主除外）
                  </Text>
                </View>
                <View
                  className={`import__switch ${syncMode ? 'import__switch--on' : ''}`}
                  onClick={() => setSyncMode(!syncMode)}
                >
                  <View
                    className={`import__switch-knob ${syncMode ? 'import__switch-knob--on' : ''}`}
                  />
                </View>
              </View>

              <View className='import__format'>
                <Text className='import__format-title'>Excel 表头要求</Text>
                <Text className='import__format-desc'>
                  必须包含三列表头：学号 | 姓名 | 手机号
                </Text>
              </View>
            </View>
          ) : null}

          {renderDisabledRow('database', '教务系统导入', '从学校系统同步')}
          {renderDisabledRow('message-circle', 'QQ 群导入', '从 QQ 群成员导入')}
          {renderDisabledRow('message-square', '微信群导入', '从微信群成员导入')}

          <View className='import__grow' />

          {selectedFile ? (
            <View className='import__submit' onClick={() => void handleUpload()}>
              <Text className='import__submit-text'>
                {syncMode ? '开始同步名单' : '开始导入名单'}
              </Text>
            </View>
          ) : null}
          <View className='import__bottom-gap' />
        </View>
      </View>
    )
  }

  // ==================== 上传中 ====================
  if (step === 'uploading') {
    return (
      <View className='import import--center'>
        <StatusBar />
        <View className='import__center'>
          <Text className='import__center-title'>正在上传文件...</Text>
          <View className='import__progress'>
            <View className='import__progress-bar' style={{ width: `${uploadProgress}%` }} />
          </View>
          <Text className='import__center-desc'>{uploadProgress}%</Text>
        </View>
      </View>
    )
  }

  // ==================== 解析中 ====================
  if (step === 'importing') {
    return (
      <View className='import import--center'>
        <StatusBar />
        <View className='import__center'>
          <View className='import__spinner' />
          <Text className='import__center-title'>正在解析名单...</Text>
          <Text className='import__center-desc'>
            请稍候，正在处理 {selectedFile?.name}
          </Text>
        </View>
      </View>
    )
  }

  // ==================== 导入结果 ====================
  const hasErrors =
    !!result && (result.errors.length > 0 || result.duplicateStudentNos.length > 0)

  return (
    <View className='import'>
      <StatusBar />
      <View className='import__body'>
        <View className='import__spacer' />
        {renderHeader('导入结果', finish)}

        {result ? (
          <View className='import__result'>
            <View className='import__success'>
              <View className='import__success-row'>
                <View className='import__success-icon'>
                  <Icon name='check' size={44} color='#FFFFFF' strokeWidth={3} />
                </View>
                <View className='import__success-text'>
                  <Text className='import__success-title'>
                    {result.sync ? '同步完成' : '导入完成'}
                  </Text>
                  <Text className='import__success-sub'>文件：{selectedFile?.name}</Text>
                </View>
              </View>
            </View>

            <View className='import__stats'>
              <View className='import__stat'>
                <Text className='import__stat-value' style={{ color: '#0062FF' }}>
                  {result.successCount}
                </Text>
                <Text className='import__stat-label'>新增成员</Text>
              </View>
              {result.updatedCount > 0 ? (
                <View className='import__stat'>
                  <Text className='import__stat-value' style={{ color: '#10B981' }}>
                    {result.updatedCount}
                  </Text>
                  <Text className='import__stat-label'>补全学号</Text>
                </View>
              ) : null}
              {result.sync ? (
                <View className='import__stat'>
                  <Text className='import__stat-value' style={{ color: '#EF4444' }}>
                    {result.removedCount}
                  </Text>
                  <Text className='import__stat-label'>已移除</Text>
                </View>
              ) : (
                <View className='import__stat'>
                  <Text className='import__stat-value' style={{ color: '#F59E0B' }}>
                    {result.duplicateStudentNos.length}
                  </Text>
                  <Text className='import__stat-label'>已存在</Text>
                </View>
              )}
              <View className='import__stat'>
                <Text className='import__stat-value' style={{ color: '#4B5563' }}>
                  {result.errors.length}
                </Text>
                <Text className='import__stat-label'>异常</Text>
              </View>
            </View>

            {hasErrors ? (
              <View className='import__errors'>
                <Text className='import__errors-title'>异常明细</Text>
                <ScrollView className='import__errors-scroll' scrollY>
                  {result.duplicateStudentNos.map((sn, idx) => (
                    <View className='import__error import__error--warn' key={`dup-${idx}`}>
                      <Icon name='alert-triangle' size={24} color='#B45309' strokeWidth={2} />
                      <Text className='import__error-text import__error-text--warn'>
                        学号 {sn}：已在班级中存在
                      </Text>
                    </View>
                  ))}
                  {result.errors.map((err, idx) => (
                    <View className='import__error import__error--danger' key={`err-${idx}`}>
                      <Icon name='alert-circle' size={24} color='#B91C1C' strokeWidth={2} />
                      <Text className='import__error-text import__error-text--danger'>
                        第{err.row}行（{err.studentNo || '空学号'}）：{err.reason}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View className='import__grow' />

            <View className='import__actions'>
              <View className='import__submit' onClick={finish}>
                <Text className='import__submit-text'>进入班级查看</Text>
              </View>
              <View className='import__secondary' onClick={reset}>
                <Text className='import__secondary-text'>继续导入</Text>
              </View>
            </View>
            <View className='import__bottom-gap' />
          </View>
        ) : null}
      </View>
    </View>
  )
}