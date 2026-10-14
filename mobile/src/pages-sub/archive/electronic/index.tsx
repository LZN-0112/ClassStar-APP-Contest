import { useState } from 'react'
import { View, Text, Image, RichText } from '@tarojs/components'
import { useLoad, useDidShow } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import { archiveApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth, cleanHtml } from '@/utils'
import './index.scss'

export default function ClassElectronicArchive() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<any>(null)

  const norm = (v: any) => {
    if (!v) return ''
    if (typeof v === 'string') return v
    if (Array.isArray(v)) return v.join('')
    try {
      return JSON.stringify(v)
    } catch {
      return ''
    }
  }

  const fetchData = async () => {
    if (!currentClassId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await archiveApi.getSemesterReport(currentClassId)
      setDetail(res || null)
    } catch {
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }

  useLoad(() => {
    if (!requireLogin()) return
    fetchData()
  })

  useDidShow(() => {
    fetchData()
  })

  const title =
    norm(detail?.title) ||
    detail?.semester ||
    detail?.semesterName ||
    '班级电子档案'

  // 富文本正文：优先 content/summary/description，否则由聚合数据拼装
  const rawContent = norm(detail?.content) || norm(detail?.summary) || norm(detail?.description)
  const hasRaw = !!rawContent
  const content = cleanHtml(rawContent)

  // 图片列表
  let images: string[] = []
  const rawImages = detail?.images || detail?.imageUrls || detail?.photos || detail?.photoUrls || []
  if (Array.isArray(rawImages)) {
    images = rawImages
      .map((img: any) => (typeof img === 'string' ? img : img?.url || img?.src || img?.path || ''))
      .filter(Boolean)
  }

  return (
    <View className='elec'>
      <NavBar title='班级电子档案' />

      <View className='elec__body'>
        {loading ? (
          <ListLoading rows={4} />
        ) : !detail ? (
          <ListEmpty icon='bookmark' text='暂无电子档案内容' />
        ) : (
          <>
            <View className='elec__head'>
              <View className='elec__head-icon'>
                <Icon name='bookmark' size={48} color='#004ECC' strokeWidth={2} />
              </View>
              <Text className='elec__head-title'>{title}</Text>
              {detail?.semester ? (
                <Text className='elec__head-sub'>学期：{detail.semester}</Text>
              ) : null}
            </View>

            <View className='elec__content'>
              <Text className='elec__content-title'>电子档案正文</Text>
              {hasRaw && content ? (
                <RichText className='elec__rich' nodes={content} />
              ) : (
                <>
                  <Text className='elec__content-line'>
                    活动次数：{Number(detail?.activityCount ?? detail?.activity ?? 0)}
                  </Text>
                  <Text className='elec__content-line'>
                    归档附件数：{Number(detail?.fileCount ?? detail?.file_num ?? detail?.archiveCount ?? 0)}
                  </Text>
                  <Text className='elec__content-line'>
                    总下载次数：{Number(detail?.downloadCount ?? detail?.totalDownloads ?? 0)}
                  </Text>
                </>
              )}
            </View>

            {images.length > 0 && (
              <View className='elec__images'>
                <Text className='elec__images-title'>档案图片（{images.length}）</Text>
                {images.map((url, index) => (
                  <Image
                    key={`${url}-${index}`}
                    src={url}
                    className='elec__image'
                    mode='widthFix'
                    lazyLoad
                  />
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </View>
  )
}