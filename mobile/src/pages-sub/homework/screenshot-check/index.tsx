import { useState } from 'react'
import { View, Text, Input, Image } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { Icon } from '@/components/ui'
import { homeworkApi } from '@/services'
import { useAuth } from '@/utils'
import { chooseImage, vibrate } from '@/utils/native'
import { uploadImage } from '@/utils/upload'
import './index.scss'

interface RecognizedStudent {
  studentId: string
  selected: boolean
}

export default function ScreenshotCheck() {
  const { requireAuth, requireLogin } = useAuth()

  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [preview, setPreview] = useState('')
  const [results, setResults] = useState<RecognizedStudent[]>([])
  const [unmatchedIds, setUnmatchedIds] = useState<string[]>([])
  const [manualInput, setManualInput] = useState('')
  const [confirming, setConfirming] = useState(false)

  const paramsRef = { classId: '', homeworkId: '', homeworkTitle: '' }

  useLoad((o) => {
    if (!requireLogin()) return
    if (!requireAuth('committee')) return
    paramsRef.classId = (o?.classId as string) || ''
    paramsRef.homeworkId = (o?.homeworkId as string) || ''
    paramsRef.homeworkTitle = (o?.homeworkTitle as string) || ''
  })

  const handleUpload = async () => {
    if (uploading) return
    if (!paramsRef.classId) {
      Taro.showToast({ title: '班级信息缺失', icon: 'none' })
      return
    }
    let files: string[]
    try {
      files = await chooseImage(1)
    } catch {
      return
    }
    const filePath = files[0]
    if (!filePath) return

    setUploading(true)
    try {
      // 上传截图到材料库，用于展示预览
      const up = await uploadImage(filePath)
      if (up?.url) setPreview(up.url)

      // 调 OCR 识别学号
      const res: any = await homeworkApi.recognizeScreenshot(paramsRef.classId, filePath as never)
      const data = res?.data ?? res
      const studentIds: string[] = data?.studentIds || []
      const unmatched: string[] = data?.unmatched || []
      setResults(studentIds.map((id) => ({ studentId: id, selected: true })))
      setUnmatchedIds(unmatched)
      setUploaded(true)
      vibrate()
      Taro.showToast({ title: `识别完成，共找到 ${studentIds.length} 个学号`, icon: 'none' })
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : 'OCR 识别失败，请重试', icon: 'none' })
    } finally {
      setUploading(false)
    }
  }

  const resetUpload = () => {
    setUploaded(false)
    setResults([])
    setUnmatchedIds([])
    setPreview('')
  }

  const toggleSelected = (studentId: string) => {
    setResults((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, selected: !r.selected } : r)))
  }

  const removeStudent = (studentId: string) => {
    setResults((prev) => prev.filter((r) => r.studentId !== studentId))
  }

  const addManualStudent = () => {
    const id = manualInput.trim()
    if (!id) return
    if (results.some((r) => r.studentId === id)) {
      Taro.showToast({ title: '该学号已存在', icon: 'none' })
      return
    }
    setResults((prev) => [...prev, { studentId: id, selected: true }])
    setManualInput('')
  }

  const handleConfirm = async () => {
    if (confirming) return
    if (!paramsRef.classId || !paramsRef.homeworkId) {
      Taro.showToast({ title: '请先选择作业', icon: 'none' })
      return
    }
    const selectedIds = results.filter((r) => r.selected).map((r) => r.studentId)
    if (selectedIds.length === 0) {
      Taro.showToast({ title: '请至少选择一个学号', icon: 'none' })
      return
    }
    setConfirming(true)
    try {
      const res: any = await homeworkApi.offlineCheck(paramsRef.classId, {
        homeworkId: paramsRef.homeworkId,
        checkType: 'screenshot',
        studentIds: selectedIds
      })
      const result = res?.data ?? res
      vibrate()
      Taro.navigateTo({
        url: `/pages-sub/homework/check-result/index?classId=${paramsRef.classId}&homeworkId=${paramsRef.homeworkId}&homeworkTitle=${encodeURIComponent(
          paramsRef.homeworkTitle || '作业核对'
        )}&result=${encodeURIComponent(JSON.stringify(result || {}))}`
      })
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '核对失败，请重试', icon: 'none' })
    } finally {
      setConfirming(false)
    }
  }

  return (
    <View className='hwsc'>
      <NavBar title='截图识别核对' />

      <View className='hwsc__body'>
        <View className='hwsc__section'>
          <Text className='hwsc__label'>核对作业</Text>
          <Text className='hwsc__hw-title'>{paramsRef.homeworkTitle || '未选择作业'}</Text>
        </View>

        {!uploaded ? (
          <View className='hwsc__upload' onClick={handleUpload}>
            {uploading ? (
              <>
                <View className='hwsc__spinner' />
                <Text className='hwsc__upload-title'>识别中...</Text>
              </>
            ) : (
              <>
                <View className='hwsc__upload-icon'>
                  <Icon name='upload' size={56} color='#0062FF' strokeWidth={2} />
                </View>
                <Text className='hwsc__upload-title'>点击上传截图</Text>
                <Text className='hwsc__upload-desc'>支持作业文件夹 / 压缩包截图，最多 9 张</Text>
              </>
            )}
          </View>
        ) : (
          <>
            <View className='hwsc__uploaded'>
              {preview ? <Image className='hwsc__uploaded-img' src={preview} mode='aspectFill' /> : null}
              <Text className='hwsc__uploaded-title'>已上传截图</Text>
              <Text className='hwsc__uploaded-desc'>系统已识别 {results.length} 个学号</Text>
              <Text className='hwsc__uploaded-re' onClick={resetUpload}>重新上传</Text>
            </View>

            {/* 手动添加学号 */}
            <View className='hwsc__section'>
              <Text className='hwsc__label'>手动添加学号</Text>
              <View className='hwsc__manual'>
                <Input
                  className='hwsc__manual-input'
                  value={manualInput}
                  placeholder='输入学号'
                  placeholderClass='hwsc__placeholder'
                  onInput={(e) => setManualInput(e.detail.value)}
                />
                <View className='hwsc__manual-add' onClick={addManualStudent}>
                  <Icon name='plus' size={40} color='#ffffff' strokeWidth={2} />
                </View>
              </View>
            </View>

            {/* 未匹配学号 */}
            {unmatchedIds.length > 0 ? (
              <View className='hwsc__section'>
                <Text className='hwsc__label hwsc__label--warn'>未匹配学号（{unmatchedIds.length} 个）</Text>
                <View className='hwsc__unmatched'>
                  {unmatchedIds.map((id) => (
                    <Text key={id} className='hwsc__unmatched-chip'>{id}</Text>
                  ))}
                </View>
              </View>
            ) : null}

            {/* 识别结果列表 */}
            <View className='hwsc__section'>
              <Text className='hwsc__label'>识别结果（点击可修正）</Text>
              <View className='hwsc__list'>
                {results.map((student) => (
                  <View
                    key={student.studentId}
                    className={`hwsc__item ${student.selected ? 'hwsc__item--active' : ''}`}
                  >
                    <View className='hwsc__item-main' onClick={() => toggleSelected(student.studentId)}>
                      <View className='hwsc__item-avatar'>
                        <Text className='hwsc__item-avatar-text'>{student.studentId.charAt(0)}</Text>
                      </View>
                      <Text className='hwsc__item-id'>{student.studentId}</Text>
                      <Text className={`hwsc__item-status ${student.selected ? 'hwsc__item-status--on' : ''}`}>
                        {student.selected ? '已选中' : '未选中'}
                      </Text>
                    </View>
                    <View className='hwsc__item-del' onClick={() => removeStudent(student.studentId)}>
                      <Icon name='x' size={32} color='#EF4444' strokeWidth={2} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        <View className='hwsc__spacer' />

        <View
          className={`hwsc__submit ${!uploaded || results.filter((r) => r.selected).length === 0 ? 'hwsc__submit--disabled' : ''}`}
          onClick={handleConfirm}
        >
          <Text className='hwsc__submit-text'>{confirming ? '核对中...' : '确认标记已交'}</Text>
        </View>
      </View>
    </View>
  )
}