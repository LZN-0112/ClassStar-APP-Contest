import { useState } from 'react'
import { View, Text, Switch } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { Icon } from '@/components/ui'
import type { ClassDetail } from '@/services/classes'
import { classesApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

export default function ClassSettingsPage() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireAuth } = useAuth()

  const [detail, setDetail] = useState<ClassDetail | null>(null)
  const [accessReview, setAccessReview] = useState(false)

  useLoad(() => {
    if (!requireAuth('committee')) return
    fetchDetail()
  })

  const fetchDetail = async () => {
    if (!currentClassId) {
      setDetail(null)
      return
    }
    try {
      const res: any = await classesApi.getClassDetail(currentClassId)
      setDetail(res?.data ? res.data : res || null)
    } catch {
      setDetail(null)
    }
  }

  const handleDanger = async () => {
    const conf = await Taro.showModal({
      title: '解散班级',
      content: '解散后所有成员和数据将无法恢复，确定继续吗？',
      confirmColor: '#EF4444'
    })
    if (!conf.confirm) return
    Taro.showToast({ title: '功能暂未开放', icon: 'none' })
  }

  const handleSave = () => {
    Taro.showToast({ title: '设置已保存', icon: 'success' })
  }

  const BasicRow = ({ icon, title, value }: { icon: string; title: string; value: string }) => (
    <View className='cset__row'>
      <View className='cset__row-icon'>
        <Icon name={icon} size={44} color='#0062FF' strokeWidth={2} />
      </View>
      <View className='cset__row-info'>
        <Text className='cset__row-title'>{title}</Text>
        <Text className='cset__row-subtitle'>{value}</Text>
      </View>
    </View>
  )

  return (
    <View className='cset'>
      <NavBar title='班级设置' />

      <View className='cset__body'>
        {/* 基础信息 */}
        <View className='cset__group'>
          <Text className='cset__group-title'>基础信息</Text>
          <View className='cset__card'>
            <BasicRow icon='users' title='班级名称' value={detail?.name || '-'} />
            <BasicRow icon='bell' title='班级公告' value={detail?.announcement || '暂无公告'} />
            {detail?.code ? <BasicRow icon='qrcode' title='班级代码' value={detail.code} /> : null}
          </View>
        </View>

        {/* 权限管理 */}
        <View className='cset__group'>
          <Text className='cset__group-title'>权限管理</Text>
          <View className='cset__card'>
            <View className='cset__row'>
              <View className='cset__row-icon'>
                <Icon name='shield' size={44} color='#0062FF' strokeWidth={2} />
              </View>
              <View className='cset__row-info'>
                <Text className='cset__row-title'>入班审核</Text>
                <Text className='cset__row-subtitle'>开启后需班委同意</Text>
              </View>
              <Switch
                className='cset__switch'
                checked={accessReview}
                color='#0062FF'
                onChange={(e) => setAccessReview(e.detail.value)}
              />
            </View>
          </View>
        </View>

        {/* 危险操作 */}
        <View className='cset__group'>
          <Text className='cset__group-title'>危险操作</Text>
          <View className='cset__card cset__card--danger'>
            <View className='cset__row' onClick={handleDanger}>
              <View className='cset__row-icon cset__row-icon--danger'>
                <Icon name='trash-2' size={44} color='#B91C1C' strokeWidth={2} />
              </View>
              <View className='cset__row-info'>
                <Text className='cset__row-title cset__row-title--danger'>解散班级</Text>
                <Text className='cset__row-subtitle cset__row-subtitle--danger'>操作不可恢复</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 保存按钮 */}
        <View className='cset__save' onClick={handleSave}>
          <Text className='cset__save-text'>保存设置</Text>
        </View>
      </View>
    </View>
  )
}