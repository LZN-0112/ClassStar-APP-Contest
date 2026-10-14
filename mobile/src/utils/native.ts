// ============================================================
// 原生能力封装（Taro API 统一包装为 Promise）
// ============================================================
import Taro from '@tarojs/taro'

/** 扫码，返回二维码内容 */
export function scanCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    reject(new Error('H5 环境不支持扫码'))
    // #endif
    // #ifndef H5
    Taro.scanCode({
      success: (res) => resolve(res.result),
      fail: (err) => reject(new Error(err.errMsg || '扫码失败'))
    })
    // #endif
  })
}

/** 选择图片，返回本地临时路径数组 */
export function chooseImage(count: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    Taro.chooseImage({
      count,
      sizeType: ['compressed', 'original'],
      sourceType: ['album', 'camera'],
      success: (res) => resolve(res.tempFilePaths),
      fail: (err) => reject(new Error(err.errMsg || '选择图片失败'))
    })
  })
}

/** 选择文件，返回本地临时路径数组 */
export function chooseFile(count: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    Taro.chooseImage({
      count,
      success: (res) => resolve(res.tempFilePaths),
      fail: (err) => reject(new Error(err.errMsg || '选择文件失败'))
    })
    // #endif
    // #ifndef H5
    Taro.chooseMessageFile({
      count,
      type: 'all',
      success: (res) => resolve(res.tempFiles.map((f) => f.path)),
      fail: (err) => reject(new Error(err.errMsg || '选择文件失败'))
    })
    // #endif
  })
}

export interface Coords {
  latitude: number
  longitude: number
}

/** 获取定位坐标 */
export function getLocation(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    reject(new Error('H5 环境不支持定位'))
    // #endif
    // #ifndef H5
    Taro.getLocation({
      type: 'gcj02',
      success: (res) => resolve({ latitude: res.latitude, longitude: res.longitude }),
      fail: (err) => reject(new Error(err.errMsg || '获取定位失败'))
    })
    // #endif
  })
}

/** 震动反馈 */
export function vibrate(): void {
  try {
    Taro.vibrateShort({ type: 'light' })
  } catch {
    // 忽略震动失败
  }
}

/** 复制文本到剪贴板 */
export function copyText(text: string): void {
  Taro.setClipboardData({
    data: text,
    success: () => Taro.showToast({ title: '已复制', icon: 'success' })
  })
}

/** 保存图片到相册（url 为临时路径时调用） */
export function saveImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    Taro.showToast({ title: 'H5 端请长按保存图片', icon: 'none' })
    resolve()
    // #endif
    // #ifndef H5
    Taro.saveImageToPhotosAlbum({
      filePath: url,
      success: () => {
        Taro.showToast({ title: '已保存到相册', icon: 'success' })
        resolve()
      },
      fail: (err) => reject(new Error(err.errMsg || '保存图片失败'))
    })
    // #endif
  })
}

/** 请求支付（接入微信支付时传入参数） */
export function requestPayment(paymentParams: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    reject(new Error('H5 端暂不支持支付'))
    // #endif
    // #ifndef H5
    Taro.requestPayment(
      {
        ...paymentParams,
        success: () => resolve(),
        fail: (err) => reject(new Error(err.errMsg || '支付失败'))
      } as unknown as Parameters<typeof Taro.requestPayment>[0]
    )
    // #endif
  })
}

/** 下载文件并用文档查看器打开，返回本地路径 */
export function downloadFile(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    Taro.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`下载失败 (${res.statusCode})`))
          return
        }
        // #ifdef H5
        resolve(res.tempFilePath)
        // #endif
        // #ifndef H5
        Taro.openDocument({
          filePath: res.tempFilePath,
          showMenu: true,
          success: () => resolve(res.tempFilePath),
          fail: () => resolve(res.tempFilePath)
        })
        // #endif
      },
      fail: (err) => reject(new Error(err.errMsg || '下载失败'))
    })
  })
}