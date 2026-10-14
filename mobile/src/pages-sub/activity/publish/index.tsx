import { useState } from 'react'
import { View, Text, Input, Textarea, Image } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, DateTimePicker } from '@/components/business'
import { Button, Icon } from '@/components/ui'
import { activityApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import { uploadImage } from '@/utils/upload'
import { chooseImage } from '@/utils/native'
import './index.scss'

export default function PublishActivity() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireAuth } = useAuth()

  useLoad((o) => {
    if (!requireAuth('committee')) return
    const cid = (o?.classId as string) || currentClassId
    classIdRef.id = cid || ''
  })

  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [datetime, setDatetime] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [quota, setQuota] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const classIdRef = { id: currentClassId || '' }

  // 上传封面（复用 uploadImage）
  const selectCover = async () => {
    try {
      const paths = await chooseImage(1)
      if (!paths || paths.length === 0) return
      setCoverPreview(paths[0])
      setUploading(true)
      const res = await uploadImage(paths[0])
      setCoverUrl(res.url)
      Taro.showToast({ title: '封面上传成功', icon: 'success' })
    } catch {
      Taro.showToast({ title: '封面上传失败', icon: 'none' })
      setCoverPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const validate = () => {
    if (!title.trim()) {
      Taro.showToast({ title: '请输入活动名称', icon: 'none' })
      return false
    }
    if (!datetime) {
      Taro.showToast({ title: '请选择活动时间', icon: 'none' })
      return false
    }
    if (!location.trim()) {
      Taro.showToast({ title: '请输入活动地点', icon: 'none' })
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validate() || loading) return
    if (!classIdRef.id) return
    const [eventDate, eventTime] = datetime.split(' ')
    setLoading(true)
    try {
      await activityApi.publish(classIdRef.id, {
        title: title.trim(),
        eventDate,
        eventTime: eventTime || undefined,
        location: location.trim(),
        capacity: quota ? Number(quota) : undefined,
        deadline: deadline || undefined,
        coverUrl: coverUrl || undefined
      })
      Taro.showToast({ title: '发布成功', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 600)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '发布失败，请稍后重试',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='actpub'>
      <NavBar title='发布活动' />

      <View className='actpub__body'>
        <View className='actpub__field'>
          <Input
            className='actpub__input'
            value={title}
            placeholder='请输入活动名称'
            placeholderClass='actpub__placeholder'
            onInput={(e) => setTitle(e.detail.value)}
          />
        </View>

        <View className='actpub__row'>
          <Text className='actpub__label'>活动时间</Text>
          <DateTimePicker mode='datetime' value={datetime} onChange={setDatetime} />
        </View>

        <View className='actpub__field'>
          <Input
            className='actpub__input'
            value={location}
            placeholder='请输入活动地点'
            placeholderClass='actpub__placeholder'
            onInput={(e) => setLocation(e.detail.value)}
          />
        </View>

        <View className='actpub__field actpub__field--area'>
          <Textarea
            className='actpub__area'
            value={description}
            placeholder='请输入活动详情...'
            placeholderClass='actpub__placeholder'
            maxlength={500}
            onInput={(e) => setDescription(e.detail.value)}
          />
        </View>

        {/* 封面 */}
        <View className='actpub__cover-card'>
          <View className='actpub__cover-head'>
            <Text className='actpub__label'>活动封面照片</Text>
            {coverPreview ? (
              <Text className='actpub__cover-remove' onClick={() => { setCoverPreview(null); setCoverUrl(null) }}>
                移除
              </Text>
            ) : null}
          </View>
          {coverPreview ? (
            <View className='actpub__cover-preview'>
              <Image src={coverPreview} className='actpub__cover-img' mode='aspectFill' />
              {uploading ? (
                <View className='actpub__cover-mask'>
                  <Text className='actpub__cover-mask-text'>上传中...</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View className='actpub__cover-trigger' onClick={selectCover}>
              <Icon name='image' size={64} color='#94A3B8' strokeWidth={2} />
              <Text className='actpub__cover-tip'>点击上传活动封面照片</Text>
              <Text className='actpub__cover-sub'>支持 jpg/png，不超过 5MB</Text>
            </View>
          )}
        </View>

        <View className='actpub__row'>
          <Text className='actpub__label'>报名截止时间</Text>
          <DateTimePicker mode='datetime' value={deadline} onChange={setDeadline} />
        </View>

        <View className='actpub__field'>
          <Input
            className='actpub__input'
            type='number'
            value={quota}
            placeholder='请输入人数限制'
            placeholderClass='actpub__placeholder'
            onInput={(e) => setQuota(e.detail.value)}
          />
        </View>

        <View className='actpub__spacer' />

        <Button type='primary' size='lg' block loading={loading} onClick={handleSubmit}>
          {loading ? '发布中...' : '发布活动'}
        </Button>
      </View>
    </View>
  )
}