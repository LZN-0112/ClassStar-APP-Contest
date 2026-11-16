// ============================================================
// 班级资料库
// 1:1 对齐 front/src/pages/tools/MaterialLibrary.tsx
// 含：渐变头部概览、搜索防抖、快捷入口、分类卡片、最近更新
// ============================================================
import { useMemo, useRef, useState } from 'react'
import { Input, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { StatusBar } from '@/components/business'
import { Icon } from '@/components/ui'
import type { IconName } from '@/constants/icons'
import { materialApi } from '@/services'
import { useUserStore } from '@/stores'
import {
  MATERIAL_FOLDERS,
  formatFileSize,
  formatRelativeTime,
  getFolderMeta,
  getMaterialType,
  isNewMaterial
} from '@/utils/material'
import type { MaterialFileItem, MaterialSummary } from '@/utils/material'
import './index.scss'

const DETAIL_URL = '/pages-sub/material/detail/index'
const UPLOAD_URL = '/pages-sub/material/upload/index'
const FILE_LIST_URL = '/pages-sub/archive/file-list/index'

interface QuickEntry {
  label: string
  value: string
  icon: IconName
  color: string
  bg: string
  url: string
}

function FileRow({ file }: { file: MaterialFileItem }) {
  const type = getMaterialType(file.fileName)
  return (
    <View
      className='matlib__file'
      hoverClass='matlib__file--hover'
      onClick={() => Taro.navigateTo({ url: `${DETAIL_URL}?fileId=${file.id}` })}
    >
      <View
        className='matlib__file-icon'
        style={{ backgroundColor: type.bg }}
      >
        <Icon name={type.icon} size={40} color={type.color} strokeWidth={2} />
      </View>
      <View className='matlib__file-main'>
        <View className='matlib__file-title-row'>
          <Text className='matlib__file-name'>{file.fileName}</Text>
          {isNewMaterial(file.createdAt) ? (
            <Text className='matlib__file-new'>新</Text>
          ) : null}
        </View>
        <Text className='matlib__file-meta'>
          {formatFileSize(file.fileSize)} · {file.uploaderName || '未知'} ·{' '}
          {formatRelativeTime(file.createdAt)}
        </Text>
      </View>
      <Icon name='chevron-right' size={32} color='#CBD5E1' strokeWidth={2} />
    </View>
  )
}

export default function MaterialLibrary() {
  const classId = useUserStore((s) => s.currentClassId)

  const [summary, setSummary] = useState<MaterialSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [keyword, setKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<MaterialFileItem[] | null>(null)
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchSeq = useRef(0)

  const fetchSummary = async () => {
    if (!classId) {
      setSummary(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(false)
    try {
      const res = (await materialApi.getSummary({ classId })) as unknown as MaterialSummary
      setSummary(res || null)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    fetchSummary()
  })

  const handleKeyword = (value: string) => {
    setKeyword(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    const query = value.trim()
    if (!query) {
      setSearchResults(null)
      setSearching(false)
      return
    }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      const seq = ++searchSeq.current
      try {
        const res = (await materialApi.getLibrary({
          classId,
          keyword: query
        })) as unknown as MaterialFileItem[]
        if (seq !== searchSeq.current) return
        setSearchResults(Array.isArray(res) ? res : [])
      } catch {
        if (seq === searchSeq.current) setSearchResults([])
      } finally {
        if (seq === searchSeq.current) setSearching(false)
      }
    }, 400)
  }

  const handleBack = () => {
    if (Taro.getCurrentPages().length > 1) Taro.navigateBack()
    else Taro.reLaunch({ url: '/pages/home/index' })
  }

  const folderStats = summary?.folders || []
  const folderCards = useMemo(() => {
    const knownNames = MATERIAL_FOLDERS.map((item) => item.name)
    return [
      ...MATERIAL_FOLDERS.map((meta) => {
        const stat = folderStats.find((item) => item.name === meta.name)
        return { ...meta, count: stat?.count || 0, latestAt: stat?.latestAt || null }
      }),
      ...folderStats
        .filter((item) => !knownNames.includes(item.name))
        .map((stat) => ({
          ...getFolderMeta(stat.name),
          count: stat.count,
          latestAt: stat.latestAt
        }))
    ]
  }, [summary])

  const quickEntries: QuickEntry[] = [
    {
      label: '全部资料',
      value: `${summary?.totalCount || 0} 份`,
      icon: 'folder-open',
      color: '#2563EB',
      bg: '#EFF6FF',
      url: FILE_LIST_URL
    },
    {
      label: '我上传的',
      value: `${summary?.myUploadCount || 0} 份`,
      icon: 'upload-cloud',
      color: '#0891B2',
      bg: '#ECFEFF',
      url: `${FILE_LIST_URL}?view=mine`
    },
    {
      label: '热门下载',
      value: summary?.hotFiles?.[0] ? `${summary.hotFiles[0].downloadCount} 次` : '暂无',
      icon: 'flame',
      color: '#EA580C',
      bg: '#FFF7ED',
      url: `${FILE_LIST_URL}?view=hot`
    },
    {
      label: '上传资料',
      value: '支持批量',
      icon: 'plus',
      color: '#7C3AED',
      bg: '#F5F3FF',
      url: UPLOAD_URL
    }
  ]

  const recentFiles = summary?.recentFiles || []

  return (
    <View className='matlib'>
      {/* 头部：资料概览 + 搜索 */}
      <View className='matlib__header'>
        <StatusBar light />

        <View className='matlib__head-row'>
          <View className='matlib__head-left'>
            <View className='matlib__back' onClick={handleBack}>
              <Icon name='chevron-left' size={44} color='#FFFFFF' strokeWidth={2} />
            </View>
            <Text className='matlib__head-title'>班级资料库</Text>
          </View>
          <View
            className='matlib__upload'
            hoverClass='matlib__upload--hover'
            onClick={() => Taro.navigateTo({ url: UPLOAD_URL })}
          >
            <Icon name='plus' size={32} color='#FFFFFF' strokeWidth={2.5} />
            <Text className='matlib__upload-text'>上传</Text>
          </View>
        </View>

        <Text className='matlib__head-sub'>课件、班会记录、班级照片统一归档，随用随取</Text>

        <View className='matlib__stats'>
          {[
            { label: '全部资料', value: `${summary?.totalCount || 0} 份`, icon: 'folder-open' as IconName },
            { label: '近7天新增', value: `${summary?.newIn7Days || 0} 份`, icon: 'flame' as IconName },
            { label: '存储占用', value: formatFileSize(summary?.totalSize), icon: 'hard-drive' as IconName }
          ].map((item) => (
            <View className='matlib__stat' key={item.label}>
              <View className='matlib__stat-label'>
                <Icon name={item.icon} size={24} color='rgba(255,255,255,.7)' strokeWidth={2} />
                <Text className='matlib__stat-label-text'>{item.label}</Text>
              </View>
              <Text className='matlib__stat-value'>{item.value}</Text>
            </View>
          ))}
        </View>

        <View className='matlib__search'>
          <Icon name='search' size={36} color='#64748B' strokeWidth={2} />
          <Input
            className='matlib__search-input'
            value={keyword}
            placeholder='搜索文件名，如 期末复习'
            placeholderClass='matlib__search-placeholder'
            onInput={(e) => handleKeyword(e.detail.value)}
          />
          {keyword ? (
            <View className='matlib__search-clear' onClick={() => handleKeyword('')}>
              <Icon name='x' size={28} color='#64748B' strokeWidth={2.5} />
            </View>
          ) : null}
        </View>
      </View>

      <View className='matlib__body'>
        {keyword.trim() ? (
          <View className='matlib__section'>
            <View className='matlib__sec-head'>
              <Text className='matlib__sec-title'>搜索结果</Text>
              <Text className='matlib__sec-sub'>
                {searching ? '搜索中...' : `${searchResults?.length || 0} 个文件`}
              </Text>
            </View>
            <View className='matlib__card'>
              {searching ? (
                <View className='matlib__hint-block'>正在搜索...</View>
              ) : searchResults && searchResults.length > 0 ? (
                searchResults.map((file, index) => (
                  <View
                    key={file.id}
                    className={`matlib__row ${
                      index === searchResults.length - 1 ? '' : 'matlib__row--border'
                    }`}
                  >
                    <FileRow file={file} />
                  </View>
                ))
              ) : (
                <View className='matlib__empty-search'>
                  <View className='matlib__empty-search-icon'>
                    <Icon name='search' size={40} color='#94A3B8' strokeWidth={2} />
                  </View>
                  <Text className='matlib__empty-search-text'>
                    没有找到「{keyword.trim()}」相关的文件
                  </Text>
                  <View className='matlib__empty-search-btn' onClick={() => handleKeyword('')}>
                    <Text>返回分类查找</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        ) : loading ? (
          <View className='matlib__skeleton'>
            <View className='matlib__skeleton-item matlib__skeleton-item--sm' />
            <View className='matlib__skeleton-grid'>
              {[0, 1, 2, 3].map((item) => (
                <View key={item} className='matlib__skeleton-item matlib__skeleton-item--md' />
              ))}
            </View>
            <View className='matlib__skeleton-item matlib__skeleton-item--lg' />
          </View>
        ) : loadError ? (
          <View className='matlib__error'>
            <View className='matlib__error-icon'>
              <Icon name='refresh-cw' size={48} color='#DC2626' strokeWidth={2} />
            </View>
            <Text className='matlib__error-title'>资料加载失败</Text>
            <View className='matlib__error-btn' onClick={fetchSummary}>
              <Text>重新加载</Text>
            </View>
          </View>
        ) : (summary?.totalCount || 0) === 0 ? (
          <View className='matlib__empty'>
            <View className='matlib__empty-icon'>
              <Icon name='folder-open' size={80} color='#0062FF' strokeWidth={1.5} />
            </View>
            <View className='matlib__empty-text'>
              <Text className='matlib__empty-title'>资料库还是空的</Text>
              <Text className='matlib__empty-desc'>
                上传班会记录、课件、照片等资料{'\n'}全班同学都能在这里查看和下载
              </Text>
            </View>
            <View
              className='matlib__empty-btn'
              hoverClass='matlib__empty-btn--hover'
              onClick={() => Taro.navigateTo({ url: UPLOAD_URL })}
            >
              <Icon name='upload-cloud' size={32} color='#FFFFFF' strokeWidth={2} />
              <Text>上传第一份资料</Text>
            </View>
          </View>
        ) : (
          <>
            {/* 快捷入口 */}
            <View className='matlib__quick'>
              {quickEntries.map((item) => (
                <View
                  key={item.label}
                  className='matlib__quick-item'
                  hoverClass='matlib__quick-item--hover'
                  onClick={() => Taro.navigateTo({ url: item.url })}
                >
                  <View className='matlib__quick-icon' style={{ backgroundColor: item.bg }}>
                    <Icon name={item.icon} size={44} color={item.color} strokeWidth={2} />
                  </View>
                  <Text className='matlib__quick-label'>{item.label}</Text>
                  <Text className='matlib__quick-value'>{item.value}</Text>
                </View>
              ))}
            </View>

            {/* 使用提示 */}
            <View className='matlib__tip'>
              <Icon name='info' size={32} color='#0062FF' strokeWidth={2} />
              <Text className='matlib__tip-text'>
                找不到文件？先在上方搜索文件名；也可以按下面分类逐个查看，点击文件即可预览或下载。
              </Text>
            </View>

            {/* 分类 */}
            <View className='matlib__section'>
              <View className='matlib__sec-head'>
                <Text className='matlib__sec-title'>按分类查找</Text>
                <Text className='matlib__sec-sub'>
                  共 {summary?.totalCount || 0} 份 · {formatFileSize(summary?.totalSize)}
                </Text>
              </View>
              <Text className='matlib__sec-desc'>资料按用途归档，点开分类查看全部文件</Text>
              <View className='matlib__folder-grid'>
                {folderCards.map((folder) => (
                  <View
                    key={folder.name}
                    className='matlib__folder'
                    hoverClass='matlib__folder--hover'
                    onClick={() =>
                      Taro.navigateTo({
                        url: `${FILE_LIST_URL}?folder=${encodeURIComponent(folder.name)}`
                      })
                    }
                  >
                    <View className='matlib__folder-top'>
                      <View className='matlib__folder-icon' style={{ backgroundColor: folder.bg }}>
                        <Icon name={folder.icon} size={44} color={folder.color} strokeWidth={2} />
                      </View>
                      <Text className='matlib__folder-count'>
                        {folder.count > 0 ? `${folder.count} 份` : '待补充'}
                      </Text>
                    </View>
                    <View className='matlib__folder-info'>
                      <Text className='matlib__folder-name'>{folder.name}</Text>
                      <Text className='matlib__folder-desc'>{folder.desc}</Text>
                    </View>
                    <Text className='matlib__folder-latest'>
                      {folder.latestAt
                        ? `最近更新 ${formatRelativeTime(folder.latestAt)}`
                        : '暂无文件 · 点击上传'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 最近更新 */}
            <View className='matlib__section'>
              <View className='matlib__sec-head'>
                <Text className='matlib__sec-title'>最近更新</Text>
                <View
                  className='matlib__sec-link'
                  onClick={() => Taro.navigateTo({ url: FILE_LIST_URL })}
                >
                  <Text>查看全部</Text>
                  <Icon name='chevron-right' size={28} color='#0062FF' strokeWidth={2} />
                </View>
              </View>
              <Text className='matlib__sec-desc'>按上传时间倒序，最新的资料排在最前</Text>
              <View className='matlib__card'>
                {recentFiles.map((file, index) => (
                  <View
                    key={file.id}
                    className={`matlib__row ${
                      index === recentFiles.length - 1 ? '' : 'matlib__row--border'
                    }`}
                  >
                    <FileRow file={file} />
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  )
}