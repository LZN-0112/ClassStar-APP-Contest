import { useState } from 'react'
import { View, Text, Input, Textarea } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { Button } from '@/components/ui'
import { activityApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

export default function RegistrationForm() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const user = useUserStore((s) => s.userInfo)
  const { requireLogin } = useAuth()

  const classIdRef = { id: currentClassId || '' }
  const activityIdRef = { id: '' }

  const [activityTitle, setActivityTitle] = useState('')
  const [activityMeta, setActivityMeta] = useState('')
  const [name, setName] = useState(user?.name || '')
  const [studentId, setStudentId] = useState(user?.studentId || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [remark, setRemark] = useState('')
  const [loading, setLoading] = useState(false)

  useLoad((o) => {
    if (!requireLogin()) return
    const classId = (o?.classId as string) || currentClassId
    const activityId = o?.activityId as string
    if (!classId || !activityId) {
      Taro.showToast({ title: '参数缺失', icon: 'none' })
      Taro.navigateBack()
      return
    }
    classIdRef.id = classId
    activityIdRef.id = activityId
    fetchActivity()
  })

  const fetchActivity = async () => {
    if (!classIdRef.id || !activityIdRef.id) return
    try {
      const res: any = await activityApi.getDetail(classIdRef.id, activityIdRef.id)
      const data = res?.data || res
      if (data) {
        setActivityTitle(data.title || '')
        setActivityMeta(`${data.eventDate || ''} ${data.location || ''}`.trim())
      }
    } catch {
      // 标题加载失败不阻塞表单
    }
  }

  const validate = () => {
    if (!name.trim()) {
      Taro.showToast({ title: '请输入姓名', icon: 'none' })
      return false
    }
    if (!phone.trim()) {
      Taro.showToast({ title: '请输入手机号', icon: 'none' })
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validate() || loading) return
    if (!classIdRef.id || !activityIdRef.id) return
    setLoading(true)
    try {
      await activityApi.register(classIdRef.id, activityIdRef.id)
      Taro.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(() => {
        Taro.redirectTo({ url: '/pages-sub/activity/my-registration/index' })
      }, 600)
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '提交失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='actreg'>
      <NavBar title='报名表单' />

      <View className='actreg__body'>
        <View className='actreg__info'>
          <Text className='actreg__info-title'>{activityTitle || '活动报名'}</Text>
          <Text className='actreg__info-meta'>{activityMeta || '请填写报名信息'}</Text>
        </View>

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

        <Button type='primary' size='lg' block loading={loading} onClick={handleSubmit}>
          {loading ? '提交中...' : '提交报名'}
        </Button>
      </View>
    </View>
  )
}