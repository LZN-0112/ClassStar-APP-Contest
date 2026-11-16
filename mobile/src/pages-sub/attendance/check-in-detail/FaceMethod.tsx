import { useState } from 'react'
import { Camera, Canvas, Image, Text, View } from '@tarojs/components'
import Taro, { createCameraContext } from '@tarojs/taro'

import { Icon } from '@/components/ui'
import { attendanceApi } from '@/services'
import { chooseImage } from '@/utils/native'
import './method.scss'

interface Props {
  classId: string
  attendanceId: string
  onSuccess: () => void
}

function fileToBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    Taro.getFileSystemManager().readFile({
      filePath,
      encoding: 'base64',
      success: (res) => resolve(`data:image/jpeg;base64,${res.data}`),
      fail: (err) => reject(new Error(err.errMsg || '读取照片失败'))
    })
  })
}

/** 缩放到 640×480 以内并加底部时间水印，与 App 的 compressAndWatermark 一致 */
function compressAndWatermark(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    Taro.getImageInfo({ src })
      .then((info) => {
        let w = info.width
        let h = info.height
        const maxW = 640
        const maxH = 480
        if (w > maxW) {
          h = Math.round((h * maxW) / w)
          w = maxW
        }
        if (h > maxH) {
          w = Math.round((w * maxH) / h)
          h = maxH
        }
        const ctx = Taro.createCanvasContext('face-watermark')
        ctx.drawImage(src, 0, 0, w, h)
        const now = new Date()
        const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        ctx.setFillStyle('rgba(0,0,0,0.5)')
        ctx.fillRect(0, h - 36, w, 36)
        ctx.setFillStyle('#FFFFFF')
        ctx.setFontSize(14)
        ctx.fillText(`签到时间：${timeStr}`, 8, h - 12)
        ctx.draw(false, () => {
          setTimeout(() => {
            Taro.canvasToTempFilePath({
              canvasId: 'face-watermark',
              x: 0,
              y: 0,
              width: w,
              height: h,
              destWidth: w,
              destHeight: h,
              fileType: 'jpg',
              quality: 0.6,
              success: (res) => resolve(res.tempFilePath),
              fail: (err) => reject(new Error(err.errMsg || '照片处理失败'))
            })
          }, 120)
        })
      })
      .catch(() => reject(new Error('照片处理失败，请重试')))
  })
}

export default function FaceMethod({ classId, attendanceId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ w: 640, h: 480 })

  const handlePicture = async (src: string) => {
    setProcessing(true)
    try {
      const info = await Taro.getImageInfo({ src })
      let w = info.width
      let h = info.height
      if (w > 640) {
        h = Math.round((h * 640) / w)
        w = 640
      }
      if (h > 480) {
        w = Math.round((w * 480) / h)
        h = 480
      }
      setCanvasSize({ w, h })
      // 等隐藏画布按图片尺寸渲染后再绘制水印
      await new Promise((r) => setTimeout(r, 120))
      const processed = await compressAndWatermark(src)
      setPhotoUrl(processed)
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '照片处理失败，请重试',
        icon: 'none'
      })
    } finally {
      setProcessing(false)
    }
  }

  const startCamera = () => {
    setCameraError('')
    setCameraActive(true)
  }

  const takePhoto = () => {
    const ctx = createCameraContext()
    ctx.takePhoto({
      quality: 'normal',
      success: (res) => {
        setCameraActive(false)
        void handlePicture(res.tempImagePath)
      },
      fail: (err) => {
        const msg = err.errMsg || ''
        const text = /auth|deny/i.test(msg)
          ? '摄像头权限被拒绝，请在小程序设置中允许访问'
          : msg
            ? '拍照失败，请重试'
            : '拍照失败，请重试'
        setCameraError(text)
        Taro.showToast({ title: text, icon: 'none' })
      }
    })
  }

  const handleChoose = async () => {
    try {
      const [path] = await chooseImage(1)
      if (path) await handlePicture(path)
    } catch {
      // 用户取消选择时不提示
    }
  }

  const handleCheckIn = async () => {
    if (!photoUrl) {
      Taro.showToast({ title: '请先拍照或选择图片', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      const base64 = await fileToBase64(photoUrl)
      await attendanceApi.checkIn(classId, attendanceId, {
        method: 'face',
        selfieUrl: base64
      })
      Taro.showToast({ title: '签到成功！', icon: 'success' })
      onSuccess()
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : '签到失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='attmethod'>
      <View className='attmethod__banner attmethod__banner--face'>
        <View className='attmethod__banner-title attmethod__banner-title--face'>
          <Icon name='camera' size={32} color='#C2410C' />
          <Text>水印拍照签到</Text>
        </View>
        <Text className='attmethod__banner-desc'>拍照或选择图片时自动添加时间水印</Text>
      </View>

      <View className='attmethod__face-panel'>
        {cameraActive ? (
          <View className='attmethod__face-camera'>
            <Camera className='attmethod__face-camera-view' devicePosition='front' flash='off' />
            <View className='attmethod__shutter' onClick={takePhoto}>
              <View className='attmethod__shutter-inner' />
            </View>
          </View>
        ) : photoUrl ? (
          <View className='attmethod__face-preview'>
            <Image className='attmethod__face-image' src={photoUrl} mode='aspectFill' />
            <View className='attmethod__retake' onClick={() => setPhotoUrl(null)}>
              <Text>重拍</Text>
            </View>
          </View>
        ) : (
          <View className='attmethod__face-empty'>
            <Icon name='camera' size={96} color='#9CA3AF' />
            <Text className='attmethod__face-empty-text'>
              {processing ? '照片处理中...' : '点击下方按钮开始拍照'}
            </Text>
            {cameraError ? (
              <Text className='attmethod__face-error'>{cameraError}</Text>
            ) : null}
          </View>
        )}
      </View>

      {!cameraActive && !photoUrl ? (
        <View className='attmethod__face-actions'>
          <View className='attmethod__face-open' onClick={startCamera}>
            <Icon name='camera' size={32} color='#FFFFFF' />
            <Text>打开相机</Text>
          </View>
          <View className='attmethod__face-album' onClick={() => void handleChoose()}>
            <Icon name='image' size={32} color='#374151' />
            <Text>从相册选择</Text>
          </View>
        </View>
      ) : null}

      {photoUrl ? (
        <View
          className={`attmethod__primary-btn ${
            loading ? 'attmethod__btn--disabled' : ''
          }`}
          onClick={() => {
            if (!loading) void handleCheckIn()
          }}
        >
          <Text>{loading ? '签到中...' : '确认签到'}</Text>
        </View>
      ) : null}

      {/* 离屏画布：压缩 + 时间水印 */}
      <Canvas
        canvasId='face-watermark'
        id='face-watermark'
        className='attmethod__wm-canvas'
        style={{
          width: `${canvasSize.w}px`,
          height: `${canvasSize.h}px`
        }}
      />
    </View>
  )
}