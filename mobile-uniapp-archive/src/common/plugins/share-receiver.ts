/**
 * 文件分享接收器
 * 处理从其他应用（如微信）分享文件到本应用
 */

interface PendingShareFile {
  name: string
  path: string
  size: number
  type?: string
}

const PENDING_FILES_KEY = 'pendingShareFiles'

/**
 * 检查并处理启动时的文件分享
 */
export async function checkAndHandleShareFiles(): Promise<boolean> {
  // #ifdef APP-PLUS
  try {
    const runtime = plus.runtime
    const args = runtime.arguments

    if (!args) {
      return false
    }

    // Android: 检查是否是 SEND intent
    if (plus.os.name === 'Android') {
      const argsAny = args as any
      const intent = argsAny?.intent
      if (!intent) {
        return false
      }

      const action = intent.getAction()
      if (
        action !== 'android.intent.action.SEND' &&
        action !== 'android.intent.action.SEND_MULTIPLE'
      ) {
        return false
      }

      const files: PendingShareFile[] = []

      // 处理单文件分享
      if (action === 'android.intent.action.SEND') {
        const uri = intent.getParcelableExtra('android.intent.extra.STREAM')
        if (uri) {
          const file = await copyUriToLocal(uri)
          if (file) {
            files.push(file)
          }
        }
      }

      // 处理多文件分享
      if (action === 'android.intent.action.SEND_MULTIPLE') {
        const uris = intent.getParcelableExtra('android.intent.extra.STREAM')
        if (uris && uris.size) {
          for (let i = 0; i < uris.size; i++) {
            const uri = uris.get(i)
            const file = await copyUriToLocal(uri)
            if (file) {
              files.push(file)
            }
          }
        }
      }

      if (files.length > 0) {
        savePendingFiles(files)
        return true
      }
    }

    // iOS: 检查是否是文件打开
    if (plus.os.name === 'iOS') {
      const argsAny = args as any
      const url = argsAny?.url
      if (url && url.startsWith('file://')) {
        const file = await copyUrlToLocal(url)
        if (file) {
          savePendingFiles([file])
          return true
        }
      }
    }

    return false
  } catch (error) {
    console.error('处理分享文件失败:', error)
    return false
  }
  // #endif

  // #ifndef APP-PLUS
  return false
  // #endif
}

/**
 * 保存待处理文件到本地存储
 */
function savePendingFiles(files: PendingShareFile[]) {
  uni.setStorageSync(PENDING_FILES_KEY, JSON.stringify(files))
}

/**
 * 读取待处理文件
 */
export function getPendingShareFiles(): PendingShareFile[] {
  const data = uni.getStorageSync(PENDING_FILES_KEY)
  if (!data) {
    return []
  }
  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

/**
 * 清除待处理文件
 */
export function clearPendingShareFiles() {
  uni.removeStorageSync(PENDING_FILES_KEY)
}

// #ifdef APP-PLUS
/**
 * Android: 将 content:// URI 复制到本地临时目录
 */
async function copyUriToLocal(uri: any): Promise<PendingShareFile | null> {
  try {
    const context = plus.android.importClass('android.content.Context')
    const activity = plus.android.runtimeMainActivity() as any
    const contentResolver = activity.getContentResolver()

    // 获取文件名
    let fileName = 'unknown_file'
    const cursor = contentResolver.query(
      uri,
      ['_display_name'],
      null,
      null,
      null
    )
    if (cursor && cursor.moveToFirst()) {
      const nameIndex = cursor.getColumnIndex('_display_name')
      if (nameIndex >= 0) {
        fileName = cursor.getString(nameIndex)
      }
      cursor.close()
    }

    // 获取文件大小
    let fileSize = 0
    const sizeCursor = contentResolver.query(
      uri,
      ['_size'],
      null,
      null,
      null
    )
    if (sizeCursor && sizeCursor.moveToFirst()) {
      const sizeIndex = sizeCursor.getColumnIndex('_size')
      if (sizeIndex >= 0) {
        fileSize = sizeCursor.getLong(sizeIndex)
      }
      sizeCursor.close()
    }

    // 获取 MIME 类型
    const mimeType = contentResolver.getType(uri)

    // 复制到本地临时目录
    const tempDir = `${plus.io.convertLocalFileSystemURL('_doc/temp')}`
    const tempPath = `${tempDir}/${Date.now()}_${fileName}`

    const inputStream = contentResolver.openInputStream(uri)
    const FileOutputStream = plus.android.importClass(
      'java.io.FileOutputStream'
    ) as any
    const fos = new FileOutputStream(tempPath)

    const buffer = plus.android.importClass('java.io.ByteArrayOutputStream') as any
    const bos = new buffer()
    const data = plus.android.importClass('byte[]') as any
    const buf = data.newInstance(1024)
    let len = inputStream.read(buf)
    while (len !== -1) {
      bos.write(buf, 0, len)
      len = inputStream.read(buf)
    }

    fos.write(bos.toByteArray())
    fos.close()
    inputStream.close()

    return {
      name: fileName,
      path: tempPath,
      size: fileSize,
      type: mimeType,
    }
  } catch (error) {
    console.error('复制 URI 失败:', error)
    return null
  }
}

/**
 * iOS: 将 file:// URL 复制到本地临时目录
 */
async function copyUrlToLocal(url: string): Promise<PendingShareFile | null> {
  try {
    const fileName = url.split('/').pop() || 'unknown_file'
    const tempDir = plus.io.convertLocalFileSystemURL('_doc/temp')
    const tempPath = `${tempDir}/${Date.now()}_${fileName}`

    // 复制文件
    plus.io.resolveLocalFileSystemURL(
      url,
      (entry: any) => {
        entry.copyTo(
          tempDir as any,
          tempPath.split('/').pop(),
          () => {},
          (e: any) => {
            console.error('复制文件失败:', e.message)
          }
        )
      },
      (e: any) => {
        console.error('解析文件路径失败:', e.message)
      }
    )

    // 获取文件大小
    const fileStats = await new Promise<{ size: number }>((resolve) => {
      plus.io.resolveLocalFileSystemURL(
        tempPath,
        (entry: any) => {
          entry.file(
            (file: any) => {
              resolve({ size: file.size })
            },
            () => resolve({ size: 0 })
          )
        },
        () => resolve({ size: 0 })
      )
    })

    return {
      name: fileName,
      path: tempPath,
      size: fileStats.size,
    }
  } catch (error) {
    console.error('复制 URL 失败:', error)
    return null
  }
}
// #endif
