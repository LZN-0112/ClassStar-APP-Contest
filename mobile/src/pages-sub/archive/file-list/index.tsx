import { useState } from 'react'
import { View, Text, Input as TaroInput } from '@tarojs/components'
import Taro, { useLoad, useDidShow, usePullDownRefresh } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import { archiveApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth, downloadFile } from '@/utils'
import './index.scss'

interface FileItem {
  id: string
  fileName?: string
  fileUrl?: string
  fileSize?: number
  folderName?: string | null
  uploaderName?: string | null
  downloadCount?: number
  createdAt?: string
}

function formatSize(bytes?: number) {
  const b = Number(bytes) || 0
  if (b <= 0) return '-'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
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

function getFileType(fileName?: string) {
  const ext = (fileName || '').split('.').pop()?.toLowerCase()
  if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'md'].includes(ext || '')) return 'doc'
  if (['zip', 'rar', '7z'].includes(ext || '')) return 'zip'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return 'img'
  return 'file'
}

export default function ArchiveFileList() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireLogin } = useAuth()

  const [archiveId, setArchiveId] = useState('')
  const [files, setFiles] = useState<FileItem[]>([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState('')

  const fetchFiles = async (id: string) => {
    if (!currentClassId || !id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await archiveApi.getDetail(currentClassId, id)
      setFiles(Array.isArray(res?.files) ? res.files : [])
    } catch {
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  useLoad((o) => {
    if (!requireLogin()) return
    const id = (o?.archiveId as string) || ''
    setArchiveId(id)
    fetchFiles(id)
  })

  useDidShow(() => {
    if (archiveId) fetchFiles(archiveId)
  })

  usePullDownRefresh(() => {
    fetchFiles(archiveId).finally(() => Taro.stopPullDownRefresh())
  })

  const resolveFileUrl = async (file: FileItem): Promise<string> => {
    if (file.fileUrl) return file.fileUrl
    if (!archiveId) return ''
    try {
      const res: any = await archiveApi.downloadArchiveFile(currentClassId, archiveId, file.id)
      if (typeof res === 'string') return res
      return res?.url || res?.downloadUrl || res?.fileUrl || ''
    } catch {
      return ''
    }
  }

  const handleDownload = async (file: FileItem) => {
    if (downloadingId) return
    setDownloadingId(file.id)
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
      setDownloadingId('')
    }
  }

  const filtered = keyword.trim()
    ? files.filter(
        (f) =>
          (f.fileName || '').toLowerCase().includes(keyword.trim().toLowerCase()) ||
          (f.uploaderName || '').toLowerCase().includes(keyword.trim().toLowerCase())
      )
    : files

  return (
    <View className='fls'>
      <NavBar title='档案文件列表' />

      <View className='fls__body'>
        {/* 搜索 */}
        <View className='fls__search'>
          <Icon name='search' size={36} color='#4B5563' strokeWidth={2} />
          <TaroInput
            className='fls__search-input'
            value={keyword}
            placeholder='搜索文件名或上传者'
            placeholderClass='fls__search-ph'
            onInput={(e) => setKeyword(e.detail.value)}
          />
          {keyword ? (
            <View className='fls__search-clear' onClick={() => setKeyword('')}>
              <Icon name='x' size={32} color='#9CA3AF' strokeWidth={2} />
            </View>
          ) : null}
        </View>

        {loading ? (
          <ListLoading rows={5} />
        ) : filtered.length === 0 ? (
          <ListEmpty icon='file-text' text={keyword ? '未找到相关文件' : '该档案暂无附件'} />
        ) : (
          <View className='fls__list'>
            <Text className='fls__list-title'>附件列表（{filtered.length}）</Text>
            {filtered.map((file) => {
              const type = getFileType(file.fileName)
              const busy = downloadingId === file.id
              return (
                <View className='fls__item' key={file.id}>
                  <View className='fls__item-icon'>
                    <Icon
                      name={type === 'img' ? 'image' : type === 'zip' ? 'folder' : 'file-text'}
                      size={44}
                      color='#60A5FA'
                      strokeWidth={2}
                    />
                    <View className='fls__item-glow' />
                  </View>
                  <View className='fls__item-info'>
                    <Text className='fls__item-title'>{file.fileName || '未命名文件'}</Text>
                    <Text className='fls__item-sub'>
                      {formatSize(file.fileSize)} · {formatDate(file.createdAt)}
                      {file.uploaderName ? ` · ${file.uploaderName}` : ''}
                    </Text>
                    <Text className='fls__item-meta'>
                      {file.folderName ? `${file.folderName} · ` : ''}下载 {file.downloadCount || 0} 次
                    </Text>
                  </View>
                  <View className='fls__item-download' onClick={() => handleDownload(file)}>
                    <Icon name='download' size={40} color={busy ? '#9CA3AF' : '#0062FF'} strokeWidth={2} />
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </View>
    </View>
  )
}