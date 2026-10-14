import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, ListLoading } from '@/components/business'
import { Button, Icon } from '@/components/ui'
import { materialApi } from '@/services'
import { useAuth } from '@/utils'
import { downloadFile } from '@/utils/native'
import './index.scss'

interface MaterialDetailData {
  id: string
  fileName: string
  fileUrl?: string
  fileSize: number
  folderName?: string | null
  uploaderName?: string | null
  downloadCount?: number
  fileType?: string
  createdAt?: string
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function MaterialDetail() {
  const { requireLogin } = useAuth()

  const [detail, setDetail] = useState<MaterialDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  const fileIdRef = { id: '' }

  useLoad((o) => {
    if (!requireLogin()) return
    const fid = (o?.fileId as string) || ''
    if (!fid) {
      setLoading(false)
      return
    }
    fileIdRef.id = fid
    fetchDetail(fid)
  })

  const fetchDetail = async (fid: string) => {
    setLoading(true)
    try {
      const res: any = await materialApi.getDetail(fid)
      setDetail(res?.data ? res.data : res)
    } catch {
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!detail?.fileUrl || downloading) return
    setDownloading(true)
    try {
      await downloadFile(detail.fileUrl)
      fetchDetail(fileIdRef.id)
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '下载失败', icon: 'none' })
    } finally {
      setDownloading(false)
    }
  }

  const Row = ({ label, value }: { label: string; value: string }) => (
    <View className='matdetail__row'>
      <Text className='matdetail__row-label'>{label}</Text>
      <Text className='matdetail__row-value'>{value}</Text>
    </View>
  )

  return (
    <View className='matdetail'>
      <NavBar title='文件详情' />

      <View className='matdetail__body'>
        {loading ? (
          <ListLoading rows={6} />
        ) : !detail ? (
          <View className='matdetail__empty'>
            <Icon name='file-text' size={72} color='#9CA3AF' strokeWidth={2} />
            <Text className='matdetail__empty-text'>文件不存在</Text>
          </View>
        ) : (
          <View className='matdetail__content'>
            <View className='matdetail__head'>
              <View className='matdetail__file-icon'>
                <Icon name='file-text' size={64} color='#0062FF' strokeWidth={2} />
              </View>
              <Text className='matdetail__title'>{detail.fileName}</Text>
              <Text className='matdetail__meta'>
                {formatFileSize(detail.fileSize || 0)} · {formatDate(detail.createdAt)} 上传
              </Text>
            </View>

            <View className='matdetail__rows'>
              <Row label='上传者' value={detail.uploaderName || '未知'} />
              <Row label='下载次数' value={String(detail.downloadCount ?? 0)} />
              {detail.fileType ? <Row label='文件类型' value={detail.fileType} /> : null}
              {detail.folderName ? <Row label='所属分类' value={detail.folderName} /> : null}
            </View>

            <Button type='primary' size='lg' block loading={downloading} onClick={handleDownload}>
              {downloading ? '下载中...' : '下载文件'}
            </Button>
          </View>
        )}
      </View>
    </View>
  )
}