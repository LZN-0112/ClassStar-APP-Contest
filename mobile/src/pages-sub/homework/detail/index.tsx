import { useState } from 'react'
import { View, Text, RichText, ScrollView } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, StatCard } from '@/components/business'
import { Icon } from '@/components/ui'
import { homeworkApi } from '@/services'
import { useAuth } from '@/utils'
import { cleanHtml } from '@/utils/html'
import { downloadFile } from '@/utils/native'
import './index.scss'

interface Attachment {
  url: string
  name?: string
}

interface HomeworkDetailData {
  id: string
  title?: string
  subject?: string
  content?: string
  deadline?: string
  createdByName?: string
  createdAt?: string
  submitCount?: number
  totalCount?: number
  fileUrls?: string[]
  attachments?: Attachment[]
  submitted?: boolean
}

function formatTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${m}-${day} ${hh}:${mm}`
}

export default function HomeworkDetail() {
  const { isCommittee } = useAuth()

  const [hw, setHw] = useState<HomeworkDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])

  const paramsRef = { classId: '', homeworkId: '' }

  useLoad((o) => {
    paramsRef.classId = (o?.classId as string) || ''
    paramsRef.homeworkId = (o?.homeworkId as string) || ''
    fetchDetail()
  })

  const fetchDetail = async () => {
    if (!paramsRef.classId || !paramsRef.homeworkId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await homeworkApi.getDetail(paramsRef.classId, paramsRef.homeworkId)
      const data: any = res?.data ?? res
      setHw(data)
      const urls: string[] = data?.fileUrls || []
      const atts: Attachment[] = data?.attachments || []
      setAttachments(
        [
          ...urls.map((u) => ({ url: u })),
          ...atts.map((a) => ({ url: a.url || '', name: a.name }))
        ].filter((a) => !!a.url)
      )
    } catch {
      setHw(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (att: Attachment) => {
    if (downloading) return
    setDownloading(true)
    try {
      await downloadFile(att.url)
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '下载失败', icon: 'none' })
    } finally {
      setDownloading(false)
    }
  }

  const goSubmit = () => {
    Taro.navigateTo({
      url: `/pages-sub/homework/submit/index?classId=${paramsRef.classId}&homeworkId=${paramsRef.homeworkId}`
    })
  }

  const contentHtml = cleanHtml(hw?.content || '')

  return (
    <View className='hwdtl'>
      <NavBar title='作业详情' />

      {loading ? (
        <View className='hwdtl__loading'><Text className='hwdtl__loading-text'>加载中...</Text></View>
      ) : !hw ? (
        <View className='hwdtl__loading'><Text className='hwdtl__loading-text'>作业不存在或已下架</Text></View>
      ) : (
        <>
          <ScrollView className='hwdtl__scroll' scrollY>
            {/* 作业详情卡片 */}
            <View className='hwdtl__card'>
              <View className='hwdtl__head'>
                <View className='hwdtl__head-badge'>
                  <Text className='hwdtl__head-subject'>{hw.subject || '未分类'}</Text>
                </View>
                <Text className='hwdtl__title'>{hw.title}</Text>
                <View className='hwdtl__head-tags'>
                  <Text className='hwdtl__tag'>{formatTime(hw.deadline)} 截止</Text>
                </View>
              </View>

              <View className='hwdtl__section'>
                <Text className='hwdtl__section-title'>作业要求</Text>
                {hw.content ? (
                  <RichText className='hwdtl__content' nodes={contentHtml} />
                ) : (
                  <Text className='hwdtl__content-text'>暂无要求说明</Text>
                )}
              </View>

              {attachments.length > 0 ? (
                <View className='hwdtl__section'>
                  <Text className='hwdtl__section-title'>附件</Text>
                  {attachments.map((att, idx) => (
                    <View key={idx} className='hwdtl__file' onClick={() => handleDownload(att)}>
                      <View className='hwdtl__file-icon'>
                        <Icon name='file-text' size={40} color='#076CAB' strokeWidth={2} />
                      </View>
                      <Text className='hwdtl__file-name' numberOfLines={1}>{att.name || att.url}</Text>
                      <Icon name='download' size={36} color='#9CA3AF' strokeWidth={2} />
                    </View>
                  ))}
                </View>
              ) : null}

              <Text className='hwdtl__meta'>
                {hw.createdByName || '管理员'} 布置于 {formatTime(hw.createdAt)}
              </Text>
            </View>

            {/* 提交统计 */}
            <View className='hwdtl__stats'>
              <StatCard icon='file-text' value={`${hw.submitCount ?? 0}/${hw.totalCount ?? 0}`} label='已提交人数' color='#0062FF' />
            </View>
            <View style={{ height: '240rpx' }} />
          </ScrollView>

          {/* 底部操作栏 */}
          <View className='hwdtl__footer'>
            {isCommittee ? (
              <>
                <View
                  className='hwdtl__footer-btn hwdtl__footer-btn--ghost'
                  onClick={() =>
                    Taro.navigateTo({
                      url: `/pages-sub/homework/check-result/index?classId=${paramsRef.classId}&homeworkId=${paramsRef.homeworkId}`
                    })
                  }
                >
                  <Text className='hwdtl__footer-btn-text hwdtl__footer-btn-text--ghost'>查看提交</Text>
                </View>
                <View
                  className='hwdtl__footer-btn'
                  onClick={() =>
                    Taro.navigateTo({
                      url: `/pages-sub/homework/batch-check/index?classId=${paramsRef.classId}&homeworkId=${paramsRef.homeworkId}`
                    })
                  }
                >
                  <Text className='hwdtl__footer-btn-text'>批改</Text>
                </View>
              </>
            ) : (
              <View className='hwdtl__footer-btn hwdtl__footer-btn--full' onClick={goSubmit}>
                <Text className='hwdtl__footer-btn-text'>{hw.submitted ? '重新提交' : '提交作业'}</Text>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  )
}