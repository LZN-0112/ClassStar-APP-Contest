// ============================================================
// 上传资料
// 1:1 对齐 front/src/pages/tools/UploadMaterial.tsx
// 含：多文件选择、200MB 校验、分类选择、真实上传进度、上传后跳转
// ============================================================
import { useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { StatusBar } from '@/components/business'
import { Icon } from '@/components/ui'
import { useUserStore } from '@/stores'
import { MATERIAL_FOLDERS, formatFileSize, getMaterialType } from '@/utils/material'
import type { MaterialFolderMeta } from '@/utils/material'
import { chooseFiles } from '@/utils/native'
import type { LocalFileMeta } from '@/utils/native'
import { uploadMaterialFile } from '@/utils/upload'
import './index.scss'

const MAX_FILES = 20
const MAX_SIZE = 200 * 1024 * 1024
const FILE_LIST_URL = '/pages-sub/archive/file-list/index'

interface UploadFile extends LocalFileMeta {
  id: string
}

export default function UploadMaterial() {
  const classId = useUserStore((s) => s.currentClassId)

  const [files, setFiles] = useState<UploadFile[]>([])
  const [folder, setFolder] = useState<MaterialFolderMeta>(MATERIAL_FOLDERS[0])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentName, setCurrentName] = useState('')

  useLoad((query) => {
    const name = decodeURIComponent(query?.folder || '')
    const matched = MATERIAL_FOLDERS.find((item) => item.name === name)
    if (matched) setFolder(matched)
  })

  const handlePick = async () => {
    if (uploading) return
    const remain = MAX_FILES - files.length
    if (remain <= 0) {
      Taro.showToast({ title: `一次最多上传 ${MAX_FILES} 个文件`, icon: 'none' })
      return
    }
    try {
      const picked = await chooseFiles(remain)
      if (!picked.length) return
      const accepted: UploadFile[] = []
      let tooLarge = 0
      let empty = 0
      picked.forEach((item) => {
        if (item.size <= 0) {
          empty += 1
          return
        }
        if (item.size > MAX_SIZE) {
          tooLarge += 1
          return
        }
        accepted.push({
          ...item,
          id: `${Date.now()}-${item.name}-${Math.random().toString(36).slice(2, 7)}`
        })
      })
      if (tooLarge > 0) {
        Taro.showToast({ title: `${tooLarge} 个文件超过 200MB，已跳过`, icon: 'none' })
      } else if (empty > 0 && accepted.length === 0) {
        Taro.showToast({ title: '文件为空，已跳过', icon: 'none' })
      }
      if (accepted.length) setFiles((prev) => [...prev, ...accepted].slice(0, MAX_FILES))
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '选择文件失败',
        icon: 'none'
      })
    }
  }

  const removeFile = (id: string) => {
    if (uploading) return
    setFiles((prev) => prev.filter((item) => item.id !== id))
  }

  const handleBack = () => {
    if (uploading) {
      Taro.showToast({ title: '正在上传，请稍候', icon: 'none' })
      return
    }
    if (Taro.getCurrentPages().length > 1) Taro.navigateBack()
    else Taro.redirectTo({ url: FILE_LIST_URL })
  }

  const handleUpload = async () => {
    if (!classId) {
      Taro.showToast({ title: '请先加入班级', icon: 'none' })
      return
    }
    if (!files.length || uploading) return
    setUploading(true)
    setProgress(0)
    let uploaded = 0
    try {
      for (const file of files) {
        setCurrentName(file.name)
        await uploadMaterialFile(file.path, {
          classId,
          fileName: file.name,
          folderName: folder.name,
          onProgress: (percent) => {
            setProgress(Math.round(((uploaded + percent / 100) / files.length) * 100))
          }
        })
        uploaded += 1
        setProgress(Math.round((uploaded / files.length) * 100))
      }
      Taro.showToast({
        title: `已上传 ${files.length} 个文件`,
        icon: 'success',
        duration: 600
      })
      setFiles([])
      setTimeout(() => {
        Taro.redirectTo({
          url: `${FILE_LIST_URL}?folder=${encodeURIComponent(folder.name)}`
        })
      }, 600)
    } catch (err) {
      const message = err instanceof Error ? err.message : '上传失败'
      Taro.showToast({
        title: uploaded > 0 ? `已上传 ${uploaded} 个，其余失败` : message,
        icon: 'none'
      })
      if (uploaded > 0) {
        setFiles((prev) => prev.slice(uploaded))
      }
    } finally {
      setUploading(false)
      setCurrentName('')
    }
  }

  const totalSize = files.reduce((sum, item) => sum + item.size, 0)

  return (
    <View className='matupload'>
      <View className='matupload__header'>
        <StatusBar />
        <View className='matupload__head-row'>
          <View className='matupload__head-left'>
            <View className='matupload__back' onClick={handleBack}>
              <Icon name='chevron-left' size={44} color='#1A1A1A' strokeWidth={2} />
            </View>
            <Text className='matupload__head-title'>上传资料</Text>
          </View>
          <Text className='matupload__head-hint'>最多 {MAX_FILES} 个 · 单个 200MB</Text>
        </View>
      </View>

      <View className='matupload__body'>
        {/* 选择文件 */}
        <View
          className={`matupload__dropzone ${files.length ? 'matupload__dropzone--picked' : ''}`}
          onClick={files.length ? undefined : handlePick}
        >
          {files.length === 0 ? (
            <View className='matupload__drop-empty'>
              <View className='matupload__drop-icon'>
                <Icon name='upload-cloud' size={56} color='#0062FF' strokeWidth={2} />
              </View>
              <Text className='matupload__drop-title'>点击选择文件</Text>
              <Text className='matupload__drop-desc'>
                从微信聊天记录选择，支持 Word / PDF / 图片等
              </Text>
            </View>
          ) : (
            <View className='matupload__picked'>
              <View className='matupload__picked-head'>
                <Text className='matupload__picked-title'>已选 {files.length} 个文件</Text>
                <Text className='matupload__picked-size'>{formatFileSize(totalSize)}</Text>
              </View>
              <View className='matupload__picked-list'>
                {files.map((file) => {
                  const type = getMaterialType(file.name)
                  return (
                    <View className='matupload__picked-item' key={file.id}>
                      <View
                        className='matupload__picked-icon'
                        style={{ backgroundColor: type.bg }}
                      >
                        <Icon name={type.icon} size={36} color={type.color} strokeWidth={2} />
                      </View>
                      <View className='matupload__picked-main'>
                        <Text className='matupload__picked-name'>{file.name}</Text>
                        <Text className='matupload__picked-meta'>{formatFileSize(file.size)}</Text>
                      </View>
                      <View
                        className='matupload__picked-remove'
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(file.id)
                        }}
                      >
                        <Icon name='x' size={28} color='#64748B' strokeWidth={2.5} />
                      </View>
                    </View>
                  )
                })}
              </View>
              <View
                className='matupload__add-more'
                onClick={(e) => {
                  e.stopPropagation()
                  void handlePick()
                }}
              >
                <Icon name='plus' size={28} color='#0062FF' strokeWidth={2.5} />
                <Text>继续添加文件</Text>
              </View>
            </View>
          )}
        </View>

        {/* 分类 */}
        <View className='matupload__folder-section'>
          <View className='matupload__folder-head'>
            <Text className='matupload__folder-title'>选择分类</Text>
            <Text className='matupload__folder-required'>必选</Text>
          </View>
          <View className='matupload__folder-grid'>
            {MATERIAL_FOLDERS.map((item) => {
              const active = folder.name === item.name
              return (
                <View
                  key={item.name}
                  className={`matupload__folder ${active ? 'matupload__folder--active' : ''}`}
                  onClick={() => !uploading && setFolder(item)}
                >
                  <View className='matupload__folder-icon' style={{ backgroundColor: item.bg }}>
                    <Icon name={item.icon} size={36} color={item.color} strokeWidth={2} />
                  </View>
                  <Text className='matupload__folder-name'>{item.name}</Text>
                  <Text className='matupload__folder-hint'>{item.hint}</Text>
                  {active ? (
                    <View className='matupload__folder-check'>
                      <Icon name='check' size={24} color='#FFFFFF' strokeWidth={3} />
                    </View>
                  ) : null}
                </View>
              )
            })}
          </View>
        </View>

        {/* 上传进度 */}
        {uploading ? (
          <View className='matupload__progress'>
            <View className='matupload__progress-head'>
              <Text className='matupload__progress-label'>
                正在上传 {currentName ? currentName.slice(0, 12) : ''}
              </Text>
              <Text className='matupload__progress-value'>{progress}%</Text>
            </View>
            <View className='matupload__progress-track'>
              <View className='matupload__progress-bar' style={{ width: `${progress}%` }} />
            </View>
            <Text className='matupload__progress-tip'>请勿关闭页面，大文件需要一点时间</Text>
          </View>
        ) : null}

        {/* 操作 */}
        <View className='matupload__actions'>
          <View
            className={`matupload__submit ${
              files.length === 0 || uploading ? 'matupload__submit--disabled' : ''
            }`}
            hoverClass='matupload__submit--hover'
            onClick={handleUpload}
          >
            <Icon name='upload-cloud' size={36} color='#FFFFFF' strokeWidth={2} />
            <Text>{uploading ? '上传中...' : `上传到「${folder.name}」`}</Text>
          </View>
          <View
            className='matupload__repost'
            onClick={() => {
              if (uploading) return
              Taro.navigateTo({ url: '/pages-sub/material/repost-message/index' })
            }}
          >
            <Icon name='share-2' size={32} color='#0062FF' strokeWidth={2} />
            <View className='matupload__repost-text'>
              <Text className='matupload__repost-title'>上传并发送通知</Text>
              <Text className='matupload__repost-desc'>需要全班知晓的资料，可一键转载到通知</Text>
            </View>
            <Icon name='chevron-right' size={28} color='#94A3B8' strokeWidth={2} />
          </View>
          <Text className='matupload__tips'>
            同一分类下重复上传会保留两份；超过 200MB 的文件请先压缩
          </Text>
        </View>
      </View>
    </View>
  )
}