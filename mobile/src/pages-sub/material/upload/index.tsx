import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { Button, Icon } from '@/components/ui'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import { chooseFile } from '@/utils/native'
import { uploadFile } from '@/utils/upload'
import './index.scss'

const FOLDERS = ['班会资料', '课程作业', '活动照片', '评优材料']
const MAX_FILES = 20

interface SelFile {
  path: string
  name: string
  size?: number
  done?: boolean
}

export default function UploadMaterial() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireAuth } = useAuth()

  const [files, setFiles] = useState<SelFile[]>([])
  const [folder, setFolder] = useState('')
  const [uploading, setUploading] = useState(false)

  const classIdRef = { id: currentClassId || '' }

  useLoad((o) => {
    if (!requireAuth('committee')) return
    const cid = (o?.classId as string) || currentClassId
    classIdRef.id = cid || ''
  })

  const addFiles = async () => {
    const total = files.length + 1
    if (total > MAX_FILES) {
      Taro.showToast({ title: `单次最多 ${MAX_FILES} 个文件`, icon: 'none' })
      return
    }
    try {
      const paths = await chooseFile(1)
      if (!paths || paths.length === 0) return
      const name = paths[0].split(/[/\\]/).pop() || '文件'
      setFiles((prev) => [...prev, { path: paths[0], name }])
    } catch {
      Taro.showToast({ title: '选择文件失败', icon: 'none' })
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      Taro.showToast({ title: '请先选择文件', icon: 'none' })
      return
    }
    if (!folder) {
      Taro.showToast({ title: '请选择文件分类', icon: 'none' })
      return
    }
    if (!classIdRef.id) {
      Taro.showToast({ title: '未找到班级信息', icon: 'none' })
      return
    }
    setUploading(true)
    let ok = 0
    try {
      for (const f of files) {
        await uploadFile(f.path, f.name)
        ok++
      }
      if (ok === files.length) {
        Taro.showToast({ title: `成功上传 ${ok} 个文件`, icon: 'success' })
        setTimeout(() => Taro.navigateBack(), 600)
      } else {
        Taro.showToast({ title: `成功上传 ${ok}/${files.length} 个`, icon: 'none' })
      }
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '上传失败', icon: 'none' })
    } finally {
      setUploading(false)
    }
  }

  const goRepost = () => {
    Taro.navigateTo({ url: '/pages-sub/material/repost-message/index' })
  }

  return (
    <View className='matup'>
      <NavBar title='上传资料' />

      <View className='matup__body'>
        {/* 文件选择区 */}
        <View className='matup__drop' onClick={addFiles}>
          {files.length === 0 ? (
            <View className='matup__drop-empty'>
              <Icon name='upload' size={56} color='#0062FF' strokeWidth={2} />
              <Text className='matup__drop-tip'>点击选择多个文件上传</Text>
            </View>
          ) : (
            <View className='matup__file-list' onClick={(e) => e.stopPropagation()}>
              {files.map((f, index) => (
                <View key={`${f.name}-${index}`} className='matup__file-item'>
                  <View className='matup__file-info'>
                    <Text className='matup__file-name'>{f.name}</Text>
                    {f.size ? (
                      <Text className='matup__file-size'>{(f.size / 1024 / 1024).toFixed(2)} MB</Text>
                    ) : null}
                  </View>
                  <View className='matup__file-remove' onClick={() => removeFile(index)}>
                    <Icon name='x' size={28} color='#9CA3AF' strokeWidth={2} />
                  </View>
                </View>
              ))}
              <Text className='matup__file-more' onClick={addFiles}>
                + 继续添加文件
              </Text>
            </View>
          )}
        </View>

        {/* 分类选择 */}
        <View className='matup__cat'>
          <Text className='matup__cat-title'>选择分类</Text>
          <View className='matup__cat-list'>
            {FOLDERS.map((f) => {
              const active = folder === f
              return (
                <View
                  key={f}
                  className={`matup__cat-chip ${active ? 'matup__cat-chip--active' : ''}`}
                  onClick={() => setFolder(active ? '' : f)}
                >
                  <Text className={`matup__cat-chip-text ${active ? 'matup__cat-chip-text--active' : ''}`}>{f}</Text>
                </View>
              )
            })}
          </View>
        </View>

        <Button type='primary' size='lg' block loading={uploading} onClick={handleUpload}>
          {uploading ? '上传中...' : '批量上传'}
        </Button>

        {/* 转载入口 */}
        <View className='matup__repost' onClick={goRepost}>
          <Text className='matup__repost-text'>一键转载（文字+文件）</Text>
        </View>
      </View>
    </View>
  )
}