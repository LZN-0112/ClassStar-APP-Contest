// ============================================================
// 资料文件详情
// 1:1 对齐 front/src/pages/tools/MaterialDetail.tsx
// 含：文件名片、图片/视频/音频/文本预览、文件信息、下载
// ============================================================
import { useEffect, useState } from 'react'
import { Audio, Image, Text, Video, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { materialApi } from '@/services'
import { resolveFileUrl } from '@/services/request'
import { useUserStore } from '@/stores'
import {
  formatFileSize,
  formatFullDate,
  formatRelativeTime,
  getMaterialType,
  isNewMaterial
} from '@/utils/material'
import type { MaterialFileItem } from '@/utils/material'
import './index.scss'

interface MaterialDetailData extends MaterialFileItem {
  fileType?: string
}

export default function MaterialDetail() {
  const [fileId, setFileId] = useState('')
  const [detail, setDetail] = useState<MaterialDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [previewText, setPreviewText] = useState<string | null>(null)

  useLoad((query) => {
    setFileId(query?.fileId || '')
  })

  const type = detail ? getMaterialType(detail.fileName) : null
  const fileUrl = detail ? resolveFileUrl(detail.fileUrl) : ''

  const fetchDetail = async (id = fileId) => {
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(false)
    try {
      const res = (await materialApi.getDetail(id)) as unknown as MaterialDetailData
      setDetail(res || null)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (fileId) void fetchDetail(fileId)
    else setLoading(false)
  }, [fileId])

  // 文本类文件读取前 3000 字做预览
  useEffect(() => {
    setPreviewText(null)
    if (!detail || !type || type.preview !== 'text') return
    let cancelled = false
    Taro.request<string>({
      url: resolveFileUrl(detail.fileUrl),
      responseType: 'text'
    })
      .then((res) => {
        const text = typeof res.data === 'string' ? res.data : ''
        if (!cancelled) setPreviewText(text ? text.slice(0, 3000) : null)
      })
      .catch(() => {
        if (!cancelled) setPreviewText(null)
      })
    return () => {
      cancelled = true
    }
  }, [detail?.id, detail?.fileUrl, type?.preview])

  const handleDownload = async () => {
    if (!detail || downloading) return
    setDownloading(true)
    try {
      const token = useUserStore.getState().accessToken
      const res = await Taro.downloadFile({
        url: resolveFileUrl(`/material/${detail.id}/download`),
        header: token ? { Authorization: `Bearer ${token}` } : undefined
      })
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw new Error('下载失败，请稍后重试')
      }
      try {
        await Taro.openDocument({ filePath: res.tempFilePath, showMenu: true })
      } catch {
        Taro.showToast({ title: '下载成功', icon: 'success' })
      }
      setDetail((prev) =>
        prev ? { ...prev, downloadCount: (prev.downloadCount || 0) + 1 } : prev
      )
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '下载失败',
        icon: 'none'
      })
    } finally {
      setDownloading(false)
    }
  }

  const head = (
    <PageHeader
      title='文件详情'
      variant='b'
      decor='file-text'
      coverHeight={180}
    />
  )

  if (loading) {
    return (
      <View className='matdetail'>
        {head}
        <View className='matdetail__body'>
          <View className='matdetail__skeleton matdetail__skeleton--lg' />
          <View className='matdetail__skeleton matdetail__skeleton--md' />
        </View>
      </View>
    )
  }

  if (loadError || !detail || !type) {
    return (
      <View className='matdetail'>
        {head}
        <View className='matdetail__body'>
          <View className='matdetail__state'>
            <View className='matdetail__state-icon'>
              <Icon name='refresh-cw' size={56} color='#DC2626' strokeWidth={2} />
            </View>
            <Text className='matdetail__state-title'>
              {loadError ? '文件信息加载失败' : '文件不存在'}
            </Text>
            {loadError ? (
              <View
                className='matdetail__state-btn'
                hoverClass='matdetail__state-btn--hover'
                onClick={() => fetchDetail()}
              >
                <Text>重新加载</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='matdetail'>
      {head}

      <View className='matdetail__body'>
        {/* 文件名片 */}
        <View className='matdetail__card'>
          <View className='matdetail__file-icon' style={{ backgroundColor: type.bg }}>
            <Icon name={type.icon} size={64} color={type.color} strokeWidth={2} />
          </View>
          <Text className='matdetail__file-name'>{detail.fileName}</Text>
          <View className='matdetail__file-chips'>
            <Text
              className='matdetail__type-pill'
              style={{ backgroundColor: type.bg, color: type.color }}
            >
              {type.label}
            </Text>
            <Text className='matdetail__meta'>{formatFileSize(detail.fileSize)}</Text>
            <Text className='matdetail__meta-dot'>·</Text>
            <Text className='matdetail__meta'>{formatRelativeTime(detail.createdAt)}上传</Text>
            {isNewMaterial(detail.createdAt) ? (
              <Text className='matdetail__new-pill'>新资料</Text>
            ) : null}
          </View>
        </View>

        {/* 预览 */}
        {type.preview !== 'none' ? (
          <View className='matdetail__preview'>
            <View className='matdetail__preview-head'>
              <Text className='matdetail__preview-title'>预览</Text>
              {type.preview === 'image' ? (
                <Text className='matdetail__preview-hint'>点击图片放大</Text>
              ) : null}
            </View>

            {type.preview === 'image' ? (
              <View
                className='matdetail__image-wrap'
                onClick={() =>
                  Taro.previewImage({ current: fileUrl, urls: [fileUrl] })
                }
              >
                <Image className='matdetail__image' src={fileUrl} mode='aspectFit' />
              </View>
            ) : null}

            {type.preview === 'video' ? (
              <Video
                className='matdetail__video'
                src={fileUrl}
                controls
                showCenterPlayBtn
                objectFit='contain'
              />
            ) : null}

            {type.preview === 'audio' ? (
              <View className='matdetail__audio'>
                <View className='matdetail__audio-icon'>
                  <Icon name='music' size={44} color='#DB2777' strokeWidth={2} />
                </View>
                <Audio className='matdetail__audio-player' src={fileUrl} controls />
              </View>
            ) : null}

            {type.preview === 'text' ? (
              <View className='matdetail__text'>
                {previewText ? (
                  <>
                    <Text className='matdetail__text-content'>{previewText}</Text>
                    {previewText.length >= 3000 ? (
                      <Text className='matdetail__text-tip'>
                        内容较长，仅展示前 3000 字，完整内容请下载查看
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <View className='matdetail__text-empty'>预览加载失败，请下载后查看</View>
                )}
              </View>
            ) : null}
          </View>
        ) : (
          <View className='matdetail__tip'>
            <Icon name='info' size={32} color='#0062FF' strokeWidth={2} />
            <Text className='matdetail__tip-text'>
              该类型文件暂不支持小程序内预览，下载后可用手机自带应用打开。
            </Text>
          </View>
        )}

        {/* 文件信息 */}
        <View className='matdetail__info'>
          {[
            { label: '上传者', value: detail.uploaderName || '未知' },
            { label: '所属分类', value: detail.folderName || '未分类' },
            { label: '下载次数', value: `${detail.downloadCount || 0} 次` },
            { label: '上传时间', value: formatFullDate(detail.createdAt) }
          ].map((item, index, arr) => (
            <View
              key={item.label}
              className={`matdetail__info-row ${
                index === arr.length - 1 ? '' : 'matdetail__info-row--border'
              }`}
            >
              <Text className='matdetail__info-label'>{item.label}</Text>
              <Text className='matdetail__info-value'>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 吸底下载 */}
      <View className='matdetail__footer'>
        <View
          className={`matdetail__download ${downloading ? 'matdetail__download--disabled' : ''}`}
          hoverClass='matdetail__download--hover'
          onClick={handleDownload}
        >
          <Icon name='download' size={36} color='#FFFFFF' strokeWidth={2} />
          <Text>{downloading ? '下载中...' : '下载文件'}</Text>
        </View>
        <Text className='matdetail__footer-tip'>下载后可在手机「文件管理」中查看</Text>
      </View>
    </View>
  )
}