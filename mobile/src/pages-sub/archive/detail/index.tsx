import { useState } from 'react'
import { View, Text, RichText } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import { archiveApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth, downloadFile, cleanHtml } from '@/utils'
import './index.scss'

interface ArchiveFile {
  id: string
  fileName?: string
  fileSize?: number
  fileUrl?: string
  folderName?: string | null
  downloadCount?: number
  uploaderName?: string | null
  createdAt?: string
  downloadable?: boolean
}

interface ArchiveDetail {
  id: string
  title?: string
  summary?: string
  content?: string
  archiveYear?: string
  creatorName?: string | null
  createdAt?: string
  files?: ArchiveFile[]
}

function formatDate(iso?: string) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '-'
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch {
    return '-'
  }
}

function formatSize(bytes?: number) {
  const b = Number(bytes) || 0
  if (b <= 0) return '-'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export default function ArchiveDetail() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin, isCommittee } = useAuth()

  const [archiveId, setArchiveId] = useState('')
  const [detail, setDetail] = useState<ArchiveDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const fetchDetail = async (id: string) => {
    if (!currentClassId || !id) {
      setFailed(true)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await archiveApi.getDetail(currentClassId, id)
      setDetail((res && (res.files || res.title || res.id)) ? res : null)
      setFailed(false)
    } catch {
      setDetail(null)
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useLoad((o) => {
    if (!requireLogin()) return
    const id = (o?.archiveId as string) || ''
    setArchiveId(id)
    fetchDetail(id)
  })

  const resolveFileUrl = async (file: ArchiveFile): Promise<string> => {
    if (file.fileUrl) return file.fileUrl
    try {
      const res: any = await archiveApi.downloadArchiveFile(currentClassId, archiveId, file.id)
      if (typeof res === 'string') return res
      return res?.url || res?.downloadUrl || res?.fileUrl || ''
    } catch {
      return ''
    }
  }

  const handleDownload = async (file: ArchiveFile) => {
    if (downloading) return
    setDownloading(true)
    try {
      const url = await resolveFileUrl(file)
      if (!url) {
        Taro.showToast({ title: '附件暂无下载地址', icon: 'none' })
        return
      }
      await downloadFile(url)
      Taro.showToast({ title: '已开始下载', icon: 'success' })
    } catch {
      Taro.showToast({ title: '下载失败，请重试', icon: 'none' })
    } finally {
      setDownloading(false)
    }
  }

  const goExport = () => {
    Taro.navigateTo({ url: `/pages-sub/archive/export/index?archiveId=${archiveId}` })
  }

  const summary = cleanHtml(detail?.summary || detail?.content || '')
  const files = detail?.files || []

  return (
    <View className='adet'>
      <NavBar title='档案详情' />

      <View className='adet__body'>
        {loading ? (
          <ListLoading rows={5} />
        ) : failed || !detail ? (
          <ListEmpty icon='alert-circle' text='档案不存在' />
        ) : (
          <>
            {/* 元信息卡 */}
            <View className='adet__info'>
              <Text className='adet__info-title'>{detail.title || '未命名档案'}</Text>
              <Text className='adet__info-text'>生成时间：{formatDate(detail.createdAt)}</Text>
              <Text className='adet__info-text'>
                生成人：{detail.creatorName || '-'}（附件 {files.length} 个）
              </Text>
            </View>

            {/* 富文本摘要正文 */}
            <View className='adet__preview'>
              <Text className='adet__preview-title'>档案内容预览</Text>
              {summary ? (
                <RichText className='adet__rich' nodes={summary} />
              ) : (
                <Text className='adet__preview-text'>
                  包含班级成员名单、活动记录、考勤统计、班费收支等完整数据。
                </Text>
              )}
            </View>

            {/* 附件列表 */}
            <View className='adet__files'>
              <Text className='adet__files-title'>附件列表（{files.length}）</Text>
              {files.length === 0 ? (
                <Text className='adet__files-empty'>该档案暂无附件</Text>
              ) : (
                files.map((file) => {
                  const active = activeFileId === file.id
                  return (
                    <View className='adet__file' key={file.id}>
                      <View
                        className='adet__file-row'
                        onClick={() => setActiveFileId(active ? null : file.id)}
                      >
                        <View className='adet__file-icon'>
                          <Icon name='file-text' size={48} color='#004ECC' strokeWidth={2} />
                        </View>
                        <View className='adet__file-info'>
                          <Text className='adet__file-name'>{file.fileName || '未命名文件'}</Text>
                          <Text className='adet__file-sub'>
                            {formatSize(file.fileSize)} · 下载 {file.downloadCount || 0} 次
                          </Text>
                        </View>
                        <Icon name='chevron-right' size={36} color='#9CA3AF' strokeWidth={2} />
                      </View>
                      {active && (
                        <View className='adet__file-detail'>
                          <Text className='adet__file-detail-name'>{file.fileName || '未命名文件'}</Text>
                          <Text className='adet__file-detail-text'>
                            大小：{formatSize(file.fileSize)} 分类：{file.folderName || '-'}
                          </Text>
                          <Text className='adet__file-detail-text'>上传时间：{formatDate(file.createdAt)}</Text>
                          <View
                            className='adet__file-download'
                            onClick={() => handleDownload(file)}
                          >
                            <Text className='adet__file-download-text'>下载附件</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )
                })
              )}
            </View>

            {/* 导出入口（仅班委） */}
            {isCommittee && (
              <View className='adet__export' onClick={goExport}>
                <Text className='adet__export-text'>导出档案</Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  )
}