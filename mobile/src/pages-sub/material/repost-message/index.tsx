import { useState } from 'react'
import { View, Text, Textarea } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { Button, Icon } from '@/components/ui'
import { API_BASE_URL } from '@/constants/config'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import { chooseFile } from '@/utils/native'
import './index.scss'

const FOLDERS = ['班会资料', '课程作业', '活动照片', '评优材料']
const MAX_FILES = 20

interface SelFile {
  path: string
  name: string
  size?: number
}

export default function RepostMessage() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireAuth } = useAuth()

  const [text, setText] = useState('')
  const [files, setFiles] = useState<SelFile[]>([])
  const [folder, setFolder] = useState(FOLDERS[0])
  const [requireAck, setRequireAck] = useState(true)
  const [uploading, setUploading] = useState(false)

  const classIdRef = { id: currentClassId || '' }

  useLoad((o) => {
    if (!requireAuth('committee')) return
    classIdRef.id = (o?.classId as string) || currentClassId || ''
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

  const handleSubmit = async () => {
    if (!text.trim()) {
      Taro.showToast({ title: '请输入通知内容', icon: 'none' })
      return
    }
    if (files.length === 0) {
      Taro.showToast({ title: '请至少选择一个文件', icon: 'none' })
      return
    }
    if (!classIdRef.id) {
      Taro.showToast({ title: '未找到班级信息，请返回首页重新进入', icon: 'none' })
      return
    }
    setUploading(true)
    try {
      // 选中文件逐一向 /material/repost 提交（multipart files 字段 + 共用的通知参数）
      let done = 0
      for (const f of files) {
        await postRepost(f.path)
        done++
      }
      Taro.showToast({ title: `已转载 ${done} 个文件并发布通知`, icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 800)
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '转载失败', icon: 'none' })
    } finally {
      setUploading(false)
    }
  }

  // 单个文件转载（携带通知内容一起提交）
  const postRepost = (filePath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      Taro.uploadFile({
        url: `${API_BASE_URL}/material/repost`,
        filePath,
        name: 'files',
        formData: {
          classId: classIdRef.id,
          text: text.trim(),
          folderName: folder,
          requireAck: String(requireAck)
        },
        timeout: 30000,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve()
          } else {
            reject(new Error(`转载失败 (${res.statusCode})`))
          }
        },
        fail: (err) => reject(new Error(err.errMsg || '转载失败'))
      })
    })
  }

  return (
    <View className='repost'>
      <NavBar title='一键转载' />

      <View className='repost__body'>
        {/* 通知内容 */}
        <View className='repost__field'>
          <Text className='repost__label'>通知内容</Text>
          <Textarea
            className='repost__textarea'
            value={text}
            maxlength={500}
            placeholder='粘贴辅导员在微信群发的文字通知...'
            placeholderClass='repost__ph'
            onInput={(e) => setText(e.detail.value)}
          />
          <Text className='repost__count'>{text.length}/500</Text>
        </View>

        {/* 附件文件 */}
        <View className='repost__field'>
          <Text className='repost__label'>附件文件</Text>
          <View className='repost__drop' onClick={addFiles}>
            {files.length === 0 ? (
              <View className='repost__drop-empty'>
                <Icon name='upload' size={56} color='#0062FF' strokeWidth={2} />
                <Text className='repost__drop-tip'>点击选择多个文件上传</Text>
              </View>
            ) : (
              <View className='repost__file-list' onClick={(e) => e.stopPropagation()}>
                {files.map((f, index) => (
                  <View key={`${f.name}-${index}`} className='repost__file-item'>
                    <Text className='repost__file-name'>{f.name}</Text>
                    <View className='repost__file-remove' onClick={() => removeFile(index)}>
                      <Icon name='x' size={28} color='#9CA3AF' strokeWidth={2} />
                    </View>
                  </View>
                ))}
                <Text className='repost__file-more' onClick={addFiles}>
                  + 继续添加文件
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 分类选择 */}
        <View className='repost__field'>
          <Text className='repost__label'>选择分类</Text>
          <View className='repost__cat-list'>
            {FOLDERS.map((f) => {
              const active = folder === f
              return (
                <View
                  key={f}
                  className={`repost__cat-chip ${active ? 'repost__cat-chip--active' : ''}`}
                  onClick={() => setFolder(f)}
                >
                  <Text className={`repost__cat-chip-text ${active ? 'repost__cat-chip-text--active' : ''}`}>{f}</Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* 签收通知开关 */}
        <View className='repost__ack'>
          <Text className='repost__ack-text'>同时生成需签收的通知</Text>
          <View
            className={`repost__switch ${requireAck ? 'repost__switch--on' : ''}`}
            onClick={() => setRequireAck(!requireAck)}
          >
            <View className={`repost__switch-dot ${requireAck ? 'repost__switch-dot--on' : ''}`} />
          </View>
        </View>

        <Button type='primary' size='lg' block loading={uploading} onClick={handleSubmit}>
          {uploading ? '转载中...' : '一键转载'}
        </Button>
      </View>
    </View>
  )
}