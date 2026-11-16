import { useState } from 'react'
import { Input, Text, Textarea, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { activityApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

export default function RegistrationForm() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const user = useUserStore((s) => s.userInfo)
  const { requireLogin } = useAuth()

  const [classId, setClassId] = useState('')
  const [activityId, setActivityId] = useState('')
  const [activityTitle, setActivityTitle] = useState('')
  const [activityMeta, setActivityMeta] = useState('')
  const [name, setName] = useState(user?.name || '')
  const [studentId, setStudentId] = useState(user?.studentId || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [remark, setRemark] = useState('')
  const [loading, setLoading] = useState(false)

  useLoad((options) => {
    if (!requireLogin()) return
    const cid = (options?.classId as string) || currentClassId || ''
    const aid = (options?.activityId as string) || ''
    if (!cid || !aid) {
      Taro.showToast({ title: '缺少必要信息', icon: 'none' })
      Taro.navigateBack()
      return
    }
    setClassId(cid)
    setActivityId(aid)
    void fetchActivity(cid, aid)
  })

  const fetchActivity = async (cid: string, aid: string) => {
    try {
      const data: any = await activityApi.getDetail(cid, aid)
      if (data) {
        setActivityTitle(data.title || '')
        setActivityMeta(`${data.eventDate || ''} ${data.location || ''}`.trim())
      }
    } catch {
      // 标题加载失败不阻塞表单
    }
  }

  const handleSubmit = async () => {
    if (loading) return
    if (!classId || !activityId) {
      Taro.showToast({ title: '缺少必要信息', icon: 'none' })
      return
    }
    if (!name.trim()) {
      Taro.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    if (!phone.trim()) {
      Taro.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      await activityApi.register(classId, activityId, {
        name: name.trim(),
        studentId: studentId.trim(),
        phone: phone.trim(),
        remark: remark.trim()
      })
      Taro.showToast({ title: '报名成功', icon: 'success' })
      setTimeout(() => {
        Taro.redirectTo({ url: '/pages-sub/activity/my-registration/index' })
      }, 600)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '报名失败，请重试',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='actreg'>
      <PageHeader title='报名表单' variant='b' />

      <View className='actreg__body'>
        {activityTitle ? (
          <View className='actreg__info'>
            <Text className='actreg__info-title'>{activityTitle}</Text>
            <Text className='actreg__info-meta'>{activityMeta}</Text>
          </View>
        ) : (
          <View className='actreg__loading'>
            <Text>加载活动信息中...</Text>
          </View>
        )}

        <View className='actreg__field'>
          <Input
            className='actreg__input'
            value={name}
            placeholder='请输入姓名'
            placeholderClass='actreg__placeholder'
            onInput={(e) => setName(e.detail.value)}
          />
        </View>
        <View className='actreg__field'>
          <Input
            className='actreg__input'
            value={studentId}
            placeholder='请输入学号'
            placeholderClass='actreg__placeholder'
            onInput={(e) => setStudentId(e.detail.value)}
          />
        </View>
        <View className='actreg__field'>
          <Input
            className='actreg__input'
            type='number'
            value={phone}
            placeholder='请输入手机号'
            placeholderClass='actreg__placeholder'
            onInput={(e) => setPhone(e.detail.value)}
          />
        </View>
        <View className='actreg__field actreg__field--area'>
          <Textarea
            className='actreg__area'
            value={remark}
            placeholder='请输入补充信息...'
            placeholderClass='actreg__placeholder'
            maxlength={500}
            onInput={(e) => setRemark(e.detail.value)}
          />
        </View>

        <View className='actreg__spacer' />

        <View
          className={`actreg__submit ${loading ? 'actreg__submit--disabled' : ''}`}
          onClick={handleSubmit}
        >
          <Text>{loading ? '提交中...' : '提交报名'}</Text>
        </View>
      </View>
    </View>
  )
}