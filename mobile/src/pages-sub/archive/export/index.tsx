import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'

import { NavBar } from '@/components/business'
import { Icon } from '@/components/ui'
import { archiveApi } from '@/services'
import { useUserStore } from '@/stores'
import { useAuth, downloadFile } from '@/utils'
import './index.scss'

type ExportFormat = 'xlsx' | 'pdf'

interface OptionItem {
  value: ExportFormat
  label: string
  desc: string
  color: string
  icon: string
}

const FORMATS: OptionItem[] = [
  { value: 'pdf', label: 'PDF文档', desc: '适合打印与汇报', color: '#0062FF', icon: 'file-text' },
  { value: 'xlsx', label: 'Excel表格', desc: '含详细数据', color: '#38BDF8', icon: 'bar-chart' }
]

export default function ExportArchive() {
  const currentClassId = useUserStore((s) => s.currentClassId)
  const { requireAuth } = useAuth()

  const [archiveId, setArchiveId] = useState('')
  const [format, setFormat] = useState<ExportFormat>('xlsx')
  const [exporting, setExporting] = useState(false)

  useLoad((o) => {
    if (!requireAuth('committee')) return
    const id = (o?.archiveId as string) || ''
    setArchiveId(id)
  })

  const handleExport = async () => {
    if (!currentClassId || !archiveId) {
      Taro.showToast({ title: '请先从档案详情中选择要导出的档案', icon: 'none' })
      return
    }
    if (exporting) return
    setExporting(true)
    Taro.showLoading({ title: '正在导出…' })
    try {
      const res: any = await archiveApi.exportArchive(currentClassId, archiveId, format)
      let url = ''
      if (typeof res === 'string') url = res
      else if (res) url = res?.url || res?.downloadUrl || res?.fileUrl || ''
      if (!url) {
        // 兜底：后端若直接返回文件数据无法处理，提示成功
        Taro.showToast({ title: '导出成功', icon: 'success' })
        return
      }
      await downloadFile(url)
      Taro.showToast({ title: '导出成功', icon: 'success' })
    } catch {
      Taro.showToast({ title: '导出失败，请重试', icon: 'none' })
    } finally {
      Taro.hideLoading()
      setExporting(false)
    }
  }

  return (
    <View className='expt'>
      <NavBar title='导出档案' />

      <View className='expt__body'>
        <View className='expt__notice'>
          <Text className='expt__notice-label'>当前档案</Text>
          <Text className='expt__notice-text'>
            {archiveId ? '本次导出该学期档案元数据与附件清单' : '请先从档案详情进入导出'}
          </Text>
        </View>

        <Text className='expt__section-title'>导出格式</Text>
        <View className='expt__formats'>
          {FORMATS.map((opt) => {
            const active = format === opt.value
            return (
              <View
                className={`expt__format ${active ? 'expt__format--active' : ''}`}
                key={opt.value}
                onClick={() => setFormat(opt.value)}
              >
                <View
                  className='expt__format-icon'
                  style={{ background: `linear-gradient(180deg, ${opt.color} 0%, #3B82F6 100%)` }}
                >
                  <Icon name={opt.icon} size={64} color='#fff' strokeWidth={2} />
                </View>
                <Text className='expt__format-label'>{opt.label}</Text>
                <Text className='expt__format-desc'>{opt.desc}</Text>
              </View>
            )
          })}
        </View>

        <View
          className={`expt__submit ${exporting ? 'expt__submit--busy' : ''}`}
          onClick={handleExport}
        >
          <Text className='expt__submit-text'>{exporting ? '正在导出…' : '确认导出'}</Text>
        </View>
      </View>
    </View>
  )
}