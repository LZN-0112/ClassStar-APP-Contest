import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useDidShow } from '@tarojs/taro'

import { NavBar, ListEmpty, ListLoading } from '@/components/business'
import { Icon } from '@/components/ui'
import { materialApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth } from '@/utils'
import './index.scss'

const FOLDERS = [
  { name: '班会资料', icon: 'folder' },
  { name: '课程作业', icon: 'file-text' },
  { name: '活动照片', icon: 'image' },
  { name: '评优材料', icon: 'award' }
]

interface FileItem {
  id: string
  fileName: string
  fileUrl?: string
  fileSize: number
  folderName?: string | null
  createdAt?: string
  create_time?: string
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatTime(dateStr?: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60 * 60) return '刚刚'
  if (diff < 24 * 60 * 60) return `${Math.floor(diff / 3600)}小时前`
  const days = Math.floor(diff / (24 * 60 * 60))
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return `${Math.floor(days / 7)}周前`
}

export default function MaterialLibrary() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { isCommittee, requireLogin } = useAuth()

  const [files, setFiles] = useState<FileItem[]>([])
  const [activeFolder, setActiveFolder] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    if (!currentClassId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res: any = await materialApi.getLibrary({ classId: currentClassId })
      setFiles(Array.isArray(res) ? res : res?.list || [])
    } catch {
      setFiles([])
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

  const folderCounts = (name: string) => files.filter((f) => f.folderName === name).length

  const recentFiles = activeFolder
    ? files.filter((f) => f.folderName === activeFolder)
    : files.slice(0, 5)

  const goUpload = () => {
    Taro.navigateTo({ url: '/pages-sub/material/upload/index' })
  }

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages-sub/material/detail/index?fileId=${id}` })
  }

  return (
    <View className='materials'>
      <NavBar
        title='班级资料库'
        right={
          isCommittee ? (
            <Text className='materials__nav-act' onClick={goUpload}>
              上传
            </Text>
          ) : (
            <Text />
          )
        }
      />

      <View className='materials__body'>
        {/* 分类 */}
        <View className='materials__folders'>
          {FOLDERS.map((folder) => {
            const active = activeFolder === folder.name
            return (
              <View
                key={folder.name}
                className={`materials__folder ${active ? 'materials__folder--active' : ''}`}
                onClick={() => setActiveFolder(active ? '' : folder.name)}
              >
                <View className='materials__folder-icon'>
                  <Icon name={folder.icon} size={48} color='#0062FF' strokeWidth={2} />
                </View>
                <Text className={`materials__folder-label ${active ? 'materials__folder-label--active' : ''}`}>
                  {folder.name}
                </Text>
                <Text className='materials__folder-count'>{folderCounts(folder.name)} 个文件</Text>
              </View>
            )
          })}
        </View>

        {/* 最近上传 / 分类文件 */}
        <View className='materials__section'>
          <Text className='materials__section-title'>{activeFolder ? `${activeFolder}文件` : '最近上传'}</Text>
          {loading ? (
            <ListLoading rows={5} />
          ) : recentFiles.length === 0 ? (
            <ListEmpty icon='file-text' text='暂无文件' />
          ) : (
            recentFiles.map((file) => (
              <View key={file.id} className='materials__item' onClick={() => goDetail(file.id)}>
                <View className='materials__file-icon'>
                  <Icon name='file-text' size={44} color='#60A5FA' strokeWidth={2} />
                  <View className='materials__file-glow' />
                </View>
                <View className='materials__item-info'>
                  <Text className='materials__item-title'>{file.fileName}</Text>
                  <Text className='materials__item-sub'>
                    {formatTime(file.createdAt || file.create_time)} · {formatFileSize(file.fileSize || 0)}
                  </Text>
                </View>
                <Icon name='chevron-right' size={36} color='#4B5563' strokeWidth={2} />
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  )
}