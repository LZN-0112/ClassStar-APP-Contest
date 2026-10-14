import { useState } from 'react'
import { View, Text, Textarea, Input } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, Uploader } from '@/components/business'
import type { UploadItem } from '@/components/business'
import { Button } from '@/components/ui'
import { feedbackApi } from '@/services'
import { useAuth, uploadImage } from '@/utils'
import './index.scss'

const MAX_IMAGES = 3

export default function HelpFeedback() {
  const { requireLogin } = useAuth()

  const [content, setContent] = useState('')
  const [contact, setContact] = useState('')
  const [images, setImages] = useState<UploadItem[]>([])
  const [submitting, setSubmitting] = useState(false)

  useLoad(() => {
    requireLogin()
  })

  const handleSubmit = async () => {
    if (!content.trim()) {
      Taro.showToast({ title: '请输入反馈内容', icon: 'none' })
      return
    }
    if (submitting) return
    setSubmitting(true)
    Taro.showLoading({ title: '提交中...' })
    try {
      const urls: string[] = []
      for (const img of images) {
        const res = await uploadImage(img.url)
        if (res.url) urls.push(res.url)
      }
      await feedbackApi.submitFeedback({
        content: content.trim(),
        contact: contact.trim() || undefined,
        images: urls
      })
      Taro.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 600)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '提交失败，请重试',
        icon: 'none'
      })
    } finally {
      Taro.hideLoading()
      setSubmitting(false)
    }
  }

  return (
    <View className='hfeed'>
      <NavBar title='帮助与反馈' />

      <View className='hfeed__body'>
        <View className='hfeed__card'>
          <Text className='hfeed__card-title'>意见反馈</Text>

          <View className='hfeed__field'>
            <Text className='hfeed__label'>反馈内容</Text>
            <Textarea
              className='hfeed__textarea'
              value={content}
              maxlength={500}
              placeholder='请描述您遇到的问题或建议...'
              placeholderClass='hfeed__placeholder'
              onInput={(e) => setContent(e.detail.value)}
            />
          </View>

          <View className='hfeed__field'>
            <Text className='hfeed__label'>联系方式（选填）</Text>
            <Input
              className='hfeed__input'
              value={contact}
              type='text'
              maxlength={50}
              placeholder='手机号 / 邮箱，便于我们与您联系'
              placeholderClass='hfeed__placeholder'
              onInput={(e) => setContact(e.detail.value)}
            />
          </View>

          <View className='hfeed__field'>
            <Text className='hfeed__label'>上传截图（最多 3 张）</Text>
            <Uploader accept='image' maxCount={MAX_IMAGES} value={images} onChange={setImages} />
          </View>
        </View>

        <Button type='primary' size='lg' block loading={submitting} onClick={handleSubmit}>
          {submitting ? '提交中...' : '提交反馈'}
        </Button>
      </View>
    </View>
  )
}