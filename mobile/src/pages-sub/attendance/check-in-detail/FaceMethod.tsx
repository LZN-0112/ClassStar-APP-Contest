import { useState } from 'react'
import { View, Text, Image, Camera } from '@tarojs/components'
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
      success: (res) => resolve(res.data as string),
      fail: () => reject(new Error('读取照片失败'))
    })
  })
}

export default function FaceMethod({ classId, attendanceId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)

  const toast = (title: string) => Taro.showToast({ title, icon: 'none' })

  const onCameraCapture = () => {
    try {
      const ctx = createCameraContext()
      ctx.takePhoto({
        quality: 'high',
        success: async (res) => {
          try {
            const b64 = await fileToBase64(res.tempImagePath)
            setPhotoBase64(`data:image/jpeg;base64,${b64}`)
            setCameraActive(false)
          } catch {
            toast('读取照片失败')
          }
        },
        fail: () => toast('拍照失败，请重试')
      })
    } catch {
      toast('无法访问摄像头')
    }
  }

  const handleChoose = async () => {
    try {
      const paths = await chooseImage(1)
      if (!paths || paths.length === 0) return
      const b64 = await fileToBase64(paths[0])
      setPhotoBase64(`data:image/jpeg;base64,${b64}`)
    } catch {
      toast('选择图片失败')
    }
  }

  const handleCheckIn = async () => {
    if (!photoBase64) {
      toast('请先拍照或选择图片')
      return
    }
    setLoading(true)
    try {
      await attendanceApi.checkIn(classId, attendanceId, { method: 'face', selfieUrl: photoBase64 })
      Taro.showToast({ title: '签到成功', icon: 'success' })
      onSuccess()
    } catch (err) {
      toast(err instanceof Error ? err.message : '签到失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='attdmethod'>
      <View className='attdmethod__banner attdmethod__banner--orange'>
        <View className='attdmethod__banner-head'>
          <Icon name='camera' size={32} color='#C2410C' strokeWidth={2} />
          <Text className='attdmethod__banner-title'>水印拍照签到</Text>
        </View>
        <Text className='attdmethod__banner-sub'>拍照或选择图片时自动添加时间水印</Text>
      </View>

      <View className='attdmethod__panel attdmethod__panel--camera'>
        {cameraActive ? (
          <View className='attdmethod__camera'>
            <Camera
              className='attdmethod__camera-view'
              devicePosition='front'
              flash='off'
              style={{ transform: 'scaleX(-1)' }}
            />
            <View className='attdmethod__shutter' onClick={onCameraCapture}>
              <View className='attdmethod__shutter-inner' />
            </View>
          </View>
        ) : photoBase64 ? (
          <View className='attdmethod__camera'>
            <Image src={photoBase64} className='attdmethod__camera-view' mode='aspectFill' />
            <View className='attdmethod__retake' onClick={() => setPhotoBase64(null)}>
              <Text className='attdmethod__retake-text'>重拍</Text>
            </View>
          </View>
        ) : (
          <View className='attdmethod__camera-empty'>
            <Icon name='camera' size={96} color='#9CA3AF' strokeWidth={2} />
            <Text className='attdmethod__camera-hint'>点击下方按钮开始拍照</Text>
          </View>
        )}
      </View>

      {!cameraActive && !photoBase64 ? (
        <View className='attdmethod__btnrow'>
          <View className='attdmethod__btn attdmethod__btn--half' onClick={() => setCameraActive(true)}>
            <Icon name='camera' size={32} color='#FFFFFF' strokeWidth={2} />
            <Text className='attdmethod__btn-text'>打开相机</Text>
          </View>
          <View className='attdmethod__btn attdmethod__btn--half attdmethod__btn--ghost' onClick={handleChoose}>
            <Text className='attdmethod__btn-text--dark'>从相册选择</Text>
          </View>
        </View>
      ) : null}

      {photoBase64 ? (
        <View className='attdmethod__btn' onClick={handleCheckIn}>
          <Text className='attdmethod__btn-text'>{loading ? '签到中...' : '确认签到'}</Text>
        </View>
      ) : null}
    </View>
  )
}