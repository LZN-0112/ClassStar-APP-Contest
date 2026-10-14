import { useState } from 'react'
import { View, Text, Picker } from '@tarojs/components'
import Taro, { useLoad, useDidShow } from '@tarojs/taro'

import { NavBar, ListEmpty } from '@/components/business'
import { Icon } from '@/components/ui'
import { homeworkApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

interface HomeworkBrief {
  id: string
  title: string
}

export default function OfflineCheckHome() {
  const { requireAuth, requireLogin } = useAuth()
  const currentClassId = useUserStore((s) => s.currentClassId)

  const [loading, setLoading] = useState(true)
  const [list, setList] = useState<HomeworkBrief[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const classIdRef = { id: currentClassId || '' }

  useLoad((o) => {
    if (!requireLogin()) return
    if (!requireAuth('committee')) return
    const cid = (o?.classId as string) || currentClassId
    classIdRef.id = cid || ''
  })

  useDidShow(() => {
    fetchList()
  })

  const fetchList = async () => {
    if (!classIdRef.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await homeworkApi.getList(classIdRef.id, { pageSize: 100 })
      const data = res?.list ?? res?.data?.list ?? []
      setList(data)
      setSelectedIndex(data.length > 0 ? 0 : -1)
    } catch {
      setList([])
      setSelectedIndex(-1)
    } finally {
      setLoading(false)
    }
  }

  const target = list[selectedIndex]

  const goBatch = () => {
    if (!classIdRef.id || !target) {
      Taro.showToast({ title: '请先选择作业', icon: 'none' })
      return
    }
    Taro.navigateTo({
      url: `/pages-sub/homework/batch-check/index?classId=${classIdRef.id}&homeworkId=${target.id}&homeworkTitle=${encodeURIComponent(target.title)}`
    })
  }

  const goScreenshot = () => {
    if (!classIdRef.id || !target) {
      Taro.showToast({ title: '请先选择作业', icon: 'none' })
      return
    }
    Taro.navigateTo({
      url: `/pages-sub/homework/screenshot-check/index?classId=${classIdRef.id}&homeworkId=${target.id}&homeworkTitle=${encodeURIComponent(target.title)}`
    })
  }

  return (
    <View className='hwofc'>
      <NavBar title='作业核对' />

      <View className='hwofc__body'>
        <View className='hwofc__intro'>
          <Text className='hwofc__intro-title'>离线核对</Text>
          <Text className='hwofc__intro-desc'>批量整理已交名单，支持按学号输入或截图识别两种方式。</Text>
        </View>

        <View className='hwofc__section'>
          <Text className='hwofc__section-title'>选择作业</Text>
          {loading ? (
            <View className='hwofc__picker'>
              <Text className='hwofc__picker-text'>加载中...</Text>
            </View>
          ) : list.length === 0 ? (
            <View className='hwofc__empty'>
              <ListEmpty icon='file-text' text='暂无可核对作业' />
            </View>
          ) : (
            <Picker
              mode='selector'
              range={list.map((h) => h.title)}
              value={selectedIndex}
              onChange={(e) => setSelectedIndex(Number(e.detail.value))}
            >
              <View className='hwofc__picker'>
                <Icon name='file-text' size={40} color='#0062FF' strokeWidth={2} />
                <Text className='hwofc__picker-text'>{target?.title || '请选择作业'}</Text>
                <Icon name='chevron-down' size={32} color='#9CA3AF' strokeWidth={2} />
              </View>
            </Picker>
          )}
        </View>

        <View className='hwofc__section'>
          <Text className='hwofc__section-title'>选择核对方式</Text>

          <View className='hwofc__card' onClick={goBatch}>
            <View className='hwofc__card-icon'>
              <Icon name='edit' size={48} color='#076CAB' strokeWidth={2} />
            </View>
            <View className='hwofc__card-info'>
              <Text className='hwofc__card-title'>批量输入学号核对</Text>
              <Text className='hwofc__card-desc'>粘贴或输入已交学生学号，自动匹配姓名</Text>
            </View>
            <Icon name='chevron-right' size={40} color='#9CA3AF' strokeWidth={2} />
          </View>

          <View className='hwofc__card' onClick={goScreenshot}>
            <View className='hwofc__card-icon'>
              <Icon name='scan-line' size={48} color='#076CAB' strokeWidth={2} />
            </View>
            <View className='hwofc__card-info'>
              <Text className='hwofc__card-title'>上传截图识别核对</Text>
              <Text className='hwofc__card-desc'>上传作业截图，OCR 自动识别学号</Text>
            </View>
            <Icon name='chevron-right' size={40} color='#9CA3AF' strokeWidth={2} />
          </View>
        </View>
      </View>
    </View>
  )
}