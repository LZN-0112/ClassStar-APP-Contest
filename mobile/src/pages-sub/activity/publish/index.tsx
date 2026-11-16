import { useState } from 'react'
import { Image, Input, Picker, Text, Textarea, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { activityApi, resolveFileUrl } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import { uploadImage } from '@/utils/upload'
import { chooseImage } from '@/utils/native'
import './index.scss'

const ACTIVITY_CATEGORIES = ['文体活动', '学习交流', '志愿服务', '班级事务', '其他']
const MAX_PHOTOS = 6

interface ActivityPhoto {
  key: string
  url: string
}

/** 日期时间行：一个外壳内可选日期与时间 */
function DateTimeField({
  value,
  onChange
}: {
  value: string
  onChange: (value: string) => void
}) {
  const date = value ? value.slice(0, 10) : ''
  const time = value && value.length > 10 ? value.slice(11, 16) : ''
  const today = new Date().toISOString().slice(0, 10)

  return (
    <View className='actpub__picker'>
      <Picker
        mode='date'
        value={date}
        onChange={(e) => onChange(`${e.detail.value} ${time || '00:00'}`)}
      >
        <Text
          className={`actpub__picker-text ${
            date ? '' : 'actpub__picker-text--placeholder'
          }`}
        >
          {date || '选择日期'}
        </Text>
      </Picker>
      <Picker
        mode='time'
        value={time}
        onChange={(e) => onChange(`${date || today} ${e.detail.value}`)}
      >
        <Text
          className={`actpub__picker-text ${
            time ? '' : 'actpub__picker-text--placeholder'
          }`}
        >
          {time || '选择时间'}
        </Text>
      </Picker>
      <View className='actpub__picker-icon'>
        <Icon name='calendar' size={32} color='#94A3B8' strokeWidth={2} />
      </View>
    </View>
  )
}

export default function PublishActivity() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { user, requireLogin } = useAuth()

  const [classId, setClassId] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    category: '',
    date: '',
    location: '',
    description: '',
    deadline: '',
    quota: ''
  })
  const [photos, setPhotos] = useState<ActivityPhoto[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  useLoad((options) => {
    if (!requireLogin()) return
    const cid = (options?.classId as string) || currentClassId || ''
    setClassId(cid)
  })

  const canPublish = user?.roleLevel === 'owner' || user?.roleLevel === 'admin'

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const validate = () => {
    if (!form.title.trim()) {
      Taro.showToast({ title: '请输入活动名称', icon: 'none' })
      return false
    }
    if (!form.date) {
      Taro.showToast({ title: '请选择活动时间', icon: 'none' })
      return false
    }
    const eventStart = new Date(form.date.replace(' ', 'T')).getTime()
    if (Number.isNaN(eventStart) || eventStart < Date.now()) {
      Taro.showToast({ title: '活动时间不能早于当前时间', icon: 'none' })
      return false
    }
    if (!form.location.trim()) {
      Taro.showToast({ title: '请输入活动地点', icon: 'none' })
      return false
    }
    if (form.description.trim().length > 2000) {
      Taro.showToast({ title: '活动详情不能超过 2000 字', icon: 'none' })
      return false
    }
    if (form.deadline) {
      const deadline = new Date(form.deadline.replace(' ', 'T')).getTime()
      if (Number.isNaN(deadline) || deadline <= Date.now()) {
        Taro.showToast({ title: '报名截止时间必须晚于当前时间', icon: 'none' })
        return false
      }
      if (deadline > eventStart) {
        Taro.showToast({ title: '报名截止时间不能晚于活动开始时间', icon: 'none' })
        return false
      }
    }
    if (form.quota) {
      const quota = Number(form.quota)
      if (!Number.isInteger(quota) || quota <= 0) {
        Taro.showToast({ title: '人数限制必须为正整数', icon: 'none' })
        return false
      }
    }
    if (uploadingPhoto) {
      Taro.showToast({ title: '图片正在上传，请稍候', icon: 'none' })
      return false
    }
    return true
  }

  const handleSelectPhotos = async () => {
    const remaining = MAX_PHOTOS - photos.length
    if (remaining <= 0) {
      Taro.showToast({ title: `最多上传 ${MAX_PHOTOS} 张图片`, icon: 'none' })
      return
    }
    if (!classId) {
      Taro.showToast({ title: '缺少班级信息，请返回重试', icon: 'none' })
      return
    }
    let paths: string[] = []
    try {
      paths = await chooseImage(remaining)
    } catch {
      return
    }
    if (!paths.length) return
    if (paths.length > remaining) {
      Taro.showToast({
        title: `最多上传 ${MAX_PHOTOS} 张图片，本次仅添加前 ${remaining} 张`,
        icon: 'none'
      })
      paths = paths.slice(0, remaining)
    }

    setUploadingPhoto(true)
    for (const path of paths) {
      try {
        const res = await uploadImage(path)
        if (res.url) {
          setPhotos((prev) => [
            ...prev,
            {
              key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              url: res.url
            }
          ])
        } else {
          Taro.showToast({ title: '图片上传失败，请重试', icon: 'none' })
        }
      } catch (err) {
        Taro.showToast({
          title: err instanceof Error ? err.message : '图片上传失败',
          icon: 'none'
        })
      }
    }
    setUploadingPhoto(false)
  }

  const handleRemovePhoto = (key: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.key !== key))
  }

  const handleSubmit = async () => {
    if (loading || !classId) return
    if (!canPublish) {
      Taro.showToast({ title: '仅班委可发布活动', icon: 'none' })
      return
    }
    if (!validate()) return

    const [eventDate, timeRaw] = form.date.split(' ')
    const eventTime = timeRaw ? `${timeRaw}:00` : undefined

    setLoading(true)
    try {
      await activityApi.publish(classId, {
        title: form.title.trim(),
        category: form.category || undefined,
        eventDate,
        eventTime,
        location: form.location.trim(),
        description: form.description.trim() || undefined,
        capacity: form.quota ? Number(form.quota) : undefined,
        deadline: form.deadline
          ? new Date(form.deadline.replace(' ', 'T')).toISOString()
          : undefined,
        coverUrl: photos[0]?.url || undefined,
        images: photos.length ? photos.map((photo) => photo.url) : undefined
      })
      Taro.showToast({ title: '发布成功', icon: 'success' })
      setTimeout(() => {
        Taro.redirectTo({ url: '/pages-sub/activity/list/index' })
      }, 600)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '发布失败，请稍后重试',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  if (user && !canPublish) {
    return (
      <View className='actpub'>
        <PageHeader title='发布活动' variant='a' decor='calendar' />
        <View className='actpub__gate'>
          <Text className='actpub__gate-text'>仅班委可发布活动</Text>
          <View
            className='actpub__gate-btn'
            onClick={() => Taro.redirectTo({ url: '/pages-sub/activity/list/index' })}
          >
            <Text>返回活动列表</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='actpub'>
      <PageHeader title='发布活动' variant='a' decor='calendar' />

      <View className='actpub__body'>
        <View className='actpub__field'>
          <Text className='actpub__label'>活动名称</Text>
          <Input
            className='actpub__input'
            value={form.title}
            placeholder='请输入活动名称'
            placeholderClass='actpub__placeholder'
            maxlength={50}
            onInput={(e) => handleChange('title', e.detail.value)}
          />
        </View>

        <View className='actpub__card'>
          <Text className='actpub__label'>活动分类（选填）</Text>
          <View className='actpub__chips'>
            {ACTIVITY_CATEGORIES.map((category) => {
              const active = form.category === category
              return (
                <View
                  key={category}
                  className={`actpub__chip ${active ? 'actpub__chip--active' : ''}`}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      category: active ? '' : category
                    }))
                  }
                >
                  <Text>{category}</Text>
                </View>
              )
            })}
          </View>
        </View>

        <View className='actpub__field'>
          <Text className='actpub__label'>活动时间</Text>
          <DateTimeField
            value={form.date}
            onChange={(value) => handleChange('date', value)}
          />
        </View>

        <View className='actpub__field'>
          <Text className='actpub__label'>活动地点</Text>
          <Input
            className='actpub__input'
            value={form.location}
            placeholder='请输入活动地点'
            placeholderClass='actpub__placeholder'
            maxlength={100}
            onInput={(e) => handleChange('location', e.detail.value)}
          />
        </View>

        <View className='actpub__area-field'>
          <Text className='actpub__label'>活动详情（选填）</Text>
          <Textarea
            className='actpub__area'
            value={form.description}
            placeholder='请输入活动详情...'
            placeholderClass='actpub__placeholder'
            maxlength={2000}
            onInput={(e) => handleChange('description', e.detail.value)}
          />
        </View>

        <View className='actpub__card'>
          <View className='actpub__photos-head'>
            <Text className='actpub__photos-title'>活动照片（最多 {MAX_PHOTOS} 张）</Text>
            <Text className='actpub__photos-count'>
              {photos.length}/{MAX_PHOTOS}
            </Text>
          </View>
          <View className='actpub__photos-grid'>
            {photos.map((photo, index) => (
              <View key={photo.key} className='actpub__photo'>
                <Image
                  className='actpub__photo-img'
                  src={resolveFileUrl(photo.url)}
                  mode='aspectFill'
                />
                {index === 0 ? (
                  <View className='actpub__photo-cover'>
                    <Text>封面</Text>
                  </View>
                ) : null}
                <View
                  className='actpub__photo-remove'
                  onClick={() => handleRemovePhoto(photo.key)}
                >
                  <Icon name='x' size={24} color='#FFFFFF' strokeWidth={2} />
                </View>
              </View>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <View className='actpub__photo-add' onClick={handleSelectPhotos}>
                <Icon name='image' size={48} color='#94A3B8' strokeWidth={2} />
                <Text className='actpub__photo-add-text'>
                  {uploadingPhoto ? '上传中...' : '添加图片'}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className='actpub__photos-note'>
            支持 jpg/png，单张不超过 5MB；第一张图片将作为活动封面
          </Text>
        </View>

        <View className='actpub__field'>
          <Text className='actpub__label'>报名截止时间（选填）</Text>
          <DateTimeField
            value={form.deadline}
            onChange={(value) => handleChange('deadline', value)}
          />
        </View>

        <View className='actpub__field'>
          <Text className='actpub__label'>人数限制（选填）</Text>
          <Input
            className='actpub__input'
            type='number'
            value={form.quota}
            placeholder='不填写则表示不限制人数'
            placeholderClass='actpub__placeholder'
            onInput={(e) => handleChange('quota', e.detail.value)}
          />
        </View>

        <View className='actpub__spacer' />

        <View
          className={`actpub__submit ${
            loading || uploadingPhoto ? 'actpub__submit--disabled' : ''
          }`}
          onClick={handleSubmit}
        >
          <Text>
            {loading ? '发布中...' : uploadingPhoto ? '图片上传中...' : '发布活动'}
          </Text>
        </View>
      </View>
    </View>
  )
}