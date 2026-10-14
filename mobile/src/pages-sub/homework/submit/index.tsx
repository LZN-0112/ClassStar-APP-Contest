import { useState } from 'react'
import { View, Textarea } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, FormField, Uploader, type UploadItem } from '@/components/business'
import { Button } from '@/components/ui'
import { homeworkApi } from '@/services'
import { useAuth } from '@/utils'
import { uploadImage, uploadFile } from '@/utils/upload'
import './index.scss'

export default function SubmitHomework() {
  const { requireLogin } = useAuth()

  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState('')
  const [note, setNote] = useState('')
  const [images, setImages] = useState<UploadItem[]>([])
  const [files, setFiles] = useState<UploadItem[]>([])

  const paramsRef = { classId: '', homeworkId: '' }

  useLoad((o) => {
    if (!requireLogin()) return
    paramsRef.classId = (o?.classId as string) || ''
    paramsRef.homeworkId = (o?.homeworkId as string) || ''
  })

  const handleSubmit = async () => {
    if (loading) return
    if (!content.trim() && images.length === 0 && files.length === 0) {
      Taro.showToast({ title: '请输入内容或添加附件', icon: 'none' })
      return
    }
    if (!paramsRef.classId || !paramsRef.homeworkId) {
      Taro.showToast({ title: '参数缺失', icon: 'none' })
      return
    }
    setLoading(true)
    Taro.showLoading({ title: '提交中...' })
    try {
      const imageUrls = await Promise.all(images.map((img) => uploadImage(img.url).then((r) => r.url)))
      const fileUrls = await Promise.all(
        files.map((f) => uploadFile(f.url, f.name || 'file').then((r) => r.url))
      )
      const submitContent = [content.trim() || '', note.trim() ? `备注：${note.trim()}` : '']
        .filter(Boolean)
        .join('\n')
      await homeworkApi.submit(paramsRef.classId, paramsRef.homeworkId, {
        content: submitContent,
        fileUrls: [...imageUrls, ...fileUrls]
      })
      Taro.hideLoading()
      Taro.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 600)
    } catch (err) {
      Taro.hideLoading()
      Taro.showToast({ title: err instanceof Error ? err.message : '提交失败，请稍后重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='hwsub'>
      <NavBar title='提交作业' />

      <View className='hwsub__body'>
        <FormField label='作业内容' required>
          <View className='hwsub__textarea-wrap'>
            <Textarea
              className='hwsub__textarea'
              value={content}
              placeholder='请输入提交内容...'
              placeholderClass='hwsub__placeholder'
              maxlength={2000}
              onInput={(e) => setContent(e.detail.value)}
            />
          </View>
        </FormField>

        <FormField label='图片附件'>
          <Uploader accept='image' maxCount={9} value={images} onChange={setImages} />
        </FormField>

        <FormField label='文件附件'>
          <Uploader accept='file' maxCount={5} value={files} onChange={setFiles} />
        </FormField>

        <FormField label='补充说明'>
          <View className='hwsub__textarea-wrap hwsub__textarea-wrap--note'>
            <Textarea
              className='hwsub__textarea'
              value={note}
              placeholder='请输入补充说明（选填）'
              placeholderClass='hwsub__placeholder'
              maxlength={500}
              onInput={(e) => setNote(e.detail.value)}
            />
          </View>
        </FormField>

        <View className='hwsub__spacer' />

        <Button type='primary' size='lg' block loading={loading} onClick={handleSubmit}>
          {loading ? '提交中...' : '提交作业'}
        </Button>
      </View>
    </View>
  )
}