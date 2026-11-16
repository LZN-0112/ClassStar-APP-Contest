// ============================================================
// 资料文件列表
// 1:1 对齐 front/src/pages/archive/FileList.tsx
// 含：搜索防抖、类型筛选、排序、下载、删除、吸底上传
// ============================================================
import { useMemo, useRef, useState } from 'react'
import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad } from '@tarojs/taro'

import { ConfirmDialog, PageHeader } from '@/components/business'
import { Icon } from '@/components/ui'
import { materialApi } from '@/services'
import { resolveFileUrl } from '@/services/request'
import { useUserStore } from '@/stores'
import {
  formatFileSize,
  formatRelativeTime,
  getMaterialType,
  isNewMaterial
} from '@/utils/material'
import type { MaterialFileItem } from '@/utils/material'
import './index.scss'

type TypeFilter = '全部' | '文档' | '图片' | '音视频' | '压缩包' | '其他'
type SortKey = '最新' | '名称' | '下载最多'

const TYPE_GROUPS: Record<TypeFilter, string[]> = {
  全部: [],
  文档: ['pdf', 'word', 'excel', 'ppt', 'text'],
  图片: ['image'],
  音视频: ['video', 'audio'],
  压缩包: ['archive'],
  其他: ['other']
}

const TYPE_FILTERS: TypeFilter[] = ['全部', '文档', '图片', '音视频', '压缩包', '其他']
const SORT_KEYS: SortKey[] = ['最新', '名称', '下载最多']

const DETAIL_URL = '/pages-sub/material/detail/index'
const UPLOAD_URL = '/pages-sub/material/upload/index'

export default function MaterialFileList() {
  const classId = useUserStore((s) => s.currentClassId)
  const userInfo = useUserStore((s) => s.userInfo)

  const [params, setParams] = useState<{ folder: string; view: string; keyword: string }>({
    folder: '',
    view: 'all',
    keyword: ''
  })

  const [files, setFiles] = useState<MaterialFileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('全部')
  const [sortKey, setSortKey] = useState<SortKey>('最新')

  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MaterialFileItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const keywordRef = useRef('')
  const folderRef = useRef('')

  useLoad((query) => {
    const folder = decodeURIComponent(query?.folder || '')
    const view = query?.view || 'all'
    const initKeyword = decodeURIComponent(query?.keyword || '')
    setParams({ folder, view, keyword: initKeyword })
    folderRef.current = folder
    setSearchInput(initKeyword)
    setKeyword(initKeyword)
    keywordRef.current = initKeyword
    if (view === 'hot') setSortKey('下载最多')
  })

  const fetchFiles = async (nextKeyword = keywordRef.current, folder = folderRef.current) => {
    if (!classId) {
      setFiles([])
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError('')
    try {
      const query: { classId: string; folderName?: string; keyword?: string } = { classId }
      if (folder) query.folderName = folder
      if (nextKeyword) query.keyword = nextKeyword
      const res = (await materialApi.getLibrary(query)) as unknown as MaterialFileItem[]
      setFiles(Array.isArray(res) ? res : [])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '获取文件列表失败')
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    void fetchFiles()
  })

  const handleSearchInput = (value: string) => {
    setSearchInput(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      const next = value.trim()
      setKeyword(next)
      keywordRef.current = next
      void fetchFiles(next)
    }, 300)
  }

  const handleDownload = async (file: MaterialFileItem) => {
    if (downloadingId) return
    setDownloadingId(file.id)
    try {
      const token = useUserStore.getState().accessToken
      const res = await Taro.downloadFile({
        url: resolveFileUrl(`/material/${file.id}/download`),
        header: token ? { Authorization: `Bearer ${token}` } : undefined
      })
      if (res.statusCode < 200 || res.statusCode >= 300) {
        throw new Error(`下载失败 (${res.statusCode})`)
      }
      try {
        await Taro.openDocument({ filePath: res.tempFilePath, showMenu: true })
      } catch {
        Taro.showToast({ title: '下载成功', icon: 'success' })
      }
      setFiles((prev) =>
        prev.map((item) =>
          item.id === file.id
            ? { ...item, downloadCount: (item.downloadCount || 0) + 1 }
            : item
        )
      )
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '下载失败',
        icon: 'none'
      })
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      await materialApi.deleteMaterial(deleteTarget.id)
      Taro.showToast({ title: '已删除', icon: 'success' })
      setFiles((prev) => prev.filter((item) => item.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '删除失败',
        icon: 'none'
      })
    } finally {
      setDeleting(false)
    }
  }

  const canDelete = (file: MaterialFileItem) =>
    Boolean(userInfo?.isCommittee) ||
    userInfo?.roleLevel === 'owner' ||
    userInfo?.roleLevel === 'admin' ||
    file.uploaderId === userInfo?.id

  const visibleFiles = useMemo(() => {
    let list = [...files]
    if (params.view === 'mine') {
      list = list.filter((file) => file.uploaderId === userInfo?.id)
    }
    if (typeFilter !== '全部') {
      const allowed = TYPE_GROUPS[typeFilter]
      list = list.filter((file) => allowed.includes(getMaterialType(file.fileName).key))
    }
    if (sortKey === '下载最多') {
      list.sort((a, b) => b.downloadCount - a.downloadCount)
    } else if (sortKey === '名称') {
      list.sort((a, b) => a.fileName.localeCompare(b.fileName, 'zh-CN'))
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    return list
  }, [files, params.view, typeFilter, sortKey, userInfo?.id])

  const pageTitle =
    params.folder || (params.view === 'mine' ? '我上传的' : params.view === 'hot' ? '热门下载' : '全部资料')

  return (
    <View className='matfiles'>
      <PageHeader
        title={pageTitle}
        variant='b'
        decor='folder-open'
        right={
          classId ? (
            <View
              className='matfiles__head-upload'
              hoverClass='matfiles__head-upload--hover'
              onClick={() => Taro.navigateTo({ url: UPLOAD_URL })}
            >
              <Icon name='plus' size={32} color='#FFFFFF' strokeWidth={2.5} />
              <Text>上传</Text>
            </View>
          ) : undefined
        }
      />

      <View className='matfiles__body'>
        {/* 搜索 */}
        <View className='matfiles__search'>
          <Icon name='search' size={36} color='#64748B' strokeWidth={2} />
          <Input
            className='matfiles__search-input'
            value={searchInput}
            placeholder='搜索当前分类下的文件'
            placeholderClass='matfiles__search-placeholder'
            onInput={(e) => handleSearchInput(e.detail.value)}
          />
          {searchInput ? (
            <View className='matfiles__search-clear' onClick={() => handleSearchInput('')}>
              <Icon name='x' size={28} color='#64748B' strokeWidth={2.5} />
            </View>
          ) : null}
        </View>

        {/* 类型筛选 */}
        <ScrollView className='matfiles__tabs-wrap' scrollX enableFlex>
          <View className='matfiles__tabs'>
            {TYPE_FILTERS.map((tab) => (
              <View
                key={tab}
                className={`matfiles__tab ${typeFilter === tab ? 'matfiles__tab--active' : ''}`}
                onClick={() => setTypeFilter(tab)}
              >
                <Text>{tab}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* 数量与排序 */}
        <View className='matfiles__meta-row'>
          <Text className='matfiles__count'>共 {visibleFiles.length} 个文件</Text>
          <View className='matfiles__sorts'>
            {SORT_KEYS.map((key) => (
              <View
                key={key}
                className={`matfiles__sort ${sortKey === key ? 'matfiles__sort--active' : ''}`}
                onClick={() => setSortKey(key)}
              >
                <Text>{key}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 列表 */}
        {loading ? (
          <View className='matfiles__skeleton'>
            {[0, 1, 2, 3].map((item) => (
              <View key={item} className='matfiles__skeleton-item' />
            ))}
          </View>
        ) : loadError ? (
          <View className='matfiles__state'>
            <View className='matfiles__state-icon matfiles__state-icon--error'>
              <Icon name='refresh-cw' size={48} color='#DC2626' strokeWidth={2} />
            </View>
            <Text className='matfiles__state-title'>文件加载失败</Text>
            <Text className='matfiles__state-desc'>{loadError}</Text>
            <View className='matfiles__state-btn' onClick={() => fetchFiles()}>
              <Text>重新加载</Text>
            </View>
          </View>
        ) : visibleFiles.length === 0 ? (
          <View className='matfiles__state'>
            <View className='matfiles__state-icon'>
              <Icon name='folder-open' size={64} color='#0062FF' strokeWidth={1.5} />
            </View>
            <Text className='matfiles__state-title'>
              {keyword ? '没有找到相关文件' : '这个分类还没有文件'}
            </Text>
            <Text className='matfiles__state-desc'>
              {keyword ? '换个关键词试试，或切换类型筛选' : '上传第一个文件，全班同学都能查看'}
            </Text>
            <View className='matfiles__state-actions'>
              {keyword ? (
                <View
                  className='matfiles__state-btn matfiles__state-btn--ghost'
                  onClick={() => handleSearchInput('')}
                >
                  <Text>清空搜索</Text>
                </View>
              ) : null}
              <View
                className='matfiles__state-btn'
                onClick={() => Taro.navigateTo({ url: UPLOAD_URL })}
              >
                <Icon name='upload-cloud' size={32} color='#FFFFFF' strokeWidth={2} />
                <Text>上传文件</Text>
              </View>
            </View>
          </View>
        ) : (
          <View className='matfiles__list'>
            {visibleFiles.map((file) => {
              const type = getMaterialType(file.fileName)
              const deletable = canDelete(file)
              return (
                <View
                  key={file.id}
                  className='matfiles__item'
                  hoverClass='matfiles__item--hover'
                  onClick={() => Taro.navigateTo({ url: `${DETAIL_URL}?fileId=${file.id}` })}
                >
                  <View className='matfiles__item-icon' style={{ backgroundColor: type.bg }}>
                    <Icon name={type.icon} size={44} color={type.color} strokeWidth={2} />
                  </View>
                  <View className='matfiles__item-main'>
                    <View className='matfiles__item-title'>
                      <Text className='matfiles__item-name'>{file.fileName}</Text>
                      {isNewMaterial(file.createdAt) ? (
                        <Text className='matfiles__item-new'>新</Text>
                      ) : null}
                    </View>
                    <Text className='matfiles__item-meta'>
                      {formatFileSize(file.fileSize)} · {file.uploaderName || '未知'} ·{' '}
                      {formatRelativeTime(file.createdAt)}
                    </Text>
                    <Text className='matfiles__item-extra'>
                      {file.downloadCount || 0} 次下载
                      {file.folderName ? ` · ${file.folderName}` : ''}
                    </Text>
                  </View>
                  <View
                    className='matfiles__item-action matfiles__item-action--download'
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleDownload(file)
                    }}
                  >
                    <Icon
                      name='download'
                      size={36}
                      color='#0062FF'
                      strokeWidth={2}
                    />
                  </View>
                  {deletable ? (
                    <View
                      className='matfiles__item-action matfiles__item-action--delete'
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(file)
                      }}
                    >
                      <Icon name='trash-2' size={36} color='#DC2626' strokeWidth={2} />
                    </View>
                  ) : null}
                </View>
              )
            })}
          </View>
        )}
      </View>

      {/* 吸底上传 */}
      <View className='matfiles__footer'>
        <View
          className='matfiles__upload-btn'
          hoverClass='matfiles__upload-btn--hover'
          onClick={() => Taro.navigateTo({ url: UPLOAD_URL })}
        >
          <Icon name='upload-cloud' size={36} color='#FFFFFF' strokeWidth={2} />
          <Text>上传资料</Text>
        </View>
      </View>

      <ConfirmDialog
        open={!!deleteTarget}
        title='删除这个文件？'
        description={`${deleteTarget?.fileName ?? ''} · 删除后文件和下载记录将无法恢复，请确认后操作。`}
        confirmText='确认删除'
        danger
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </View>
  )
}