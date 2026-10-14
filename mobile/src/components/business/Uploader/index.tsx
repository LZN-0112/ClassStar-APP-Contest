// ============================================================
// Uploader 上传组件
// 用途：图片/文件选择与预览
// ============================================================
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'

import Icon from '@/components/ui/Icon'
import './index.scss'

export interface UploadItem {
  /** 本地临时路径或已上传 URL */
  url: string
  name?: string
  size?: number
}

interface UploaderProps {
  /** 接受类型：image 图片 / file 文件 */
  accept: 'image' | 'file'
  /** 最大数量，图片默认 1 */
  maxCount?: number
  /** 当前已选列表 */
  value?: UploadItem[]
  /** 变化回调 */
  onChange: (files: UploadItem[]) => void
}

export default function Uploader({
  accept,
  maxCount = 1,
  value = [],
  onChange
}: UploaderProps) {
  const canAdd = value.length < maxCount

  const handleChoose = () => {
    if (!canAdd) return
    const rest = maxCount - value.length

    if (accept === 'image') {
      // #ifdef H5
      Taro.chooseImage({
        count: rest,
        success: (res) => {
          onChange([...value, ...res.tempFilePaths.map((p) => ({ url: p }))])
        }
      })
      // #endif
      // #ifndef H5
      Taro.chooseImage({
        count: rest,
        sizeType: ['compressed'],
        success: (res) => {
          onChange([...value, ...res.tempFilePaths.map((p) => ({ url: p }))])
        }
      })
      // #endif
    } else {
      // #ifdef H5
      Taro.chooseImage({
        count: rest,
        success: (res) => {
          onChange([...value, ...res.tempFilePaths.map((p) => ({ url: p, name: 'file' }))])
        }
      })
      // #endif
      // #ifndef H5
      Taro.chooseMessageFile({
        count: rest,
        type: 'file',
        success: (res) => {
          onChange([
            ...value,
            ...res.tempFiles.map((f) => ({ url: f.path, name: f.name, size: f.size }))
          ])
        }
      })
      // #endif
    }
  }

  const removeItem = (index: number) => {
    const next = [...value]
    next.splice(index, 1)
    onChange(next)
  }

  return (
    <View className='cx-uploader'>
      <View className='cx-uploader__list'>
        {value.map((item, idx) => (
          <View className='cx-uploader__item' key={idx}>
            {accept === 'image' ? (
              <Image className='cx-uploader__img' src={item.url} mode='aspectFill' />
            ) : (
              <View className='cx-uploader__file'>
                <Icon name='file-text' size={40} color='#9ca3af' strokeWidth={2} />
                <Text className='cx-uploader__file-name'>{item.name || '文件'}</Text>
              </View>
            )}
            <View className='cx-uploader__remove' onClick={() => removeItem(idx)}>
              <Icon name='x' size={24} color='#ffffff' strokeWidth={3} />
            </View>
          </View>
        ))}
        {canAdd ? (
          <View className='cx-uploader__add' onClick={handleChoose}>
            <Icon name='plus' size={48} color='#9ca3af' strokeWidth={2} />
            <Text className='cx-uploader__add-text'>添加</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}