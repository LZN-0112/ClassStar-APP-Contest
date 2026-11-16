import { isNative } from '@/lib/capacitor';

type AndroidBridge = {
  saveBase64File?: (name: string, base64: string, mime: string) => string | null;
  saveImageToGallery?: (name: string, base64: string, mime: string) => string | null;
  beginBase64File?: (name: string, mime: string) => boolean;
  appendBase64Chunk?: (base64Chunk: string) => boolean;
  endBase64File?: () => string | null;
  abortBase64File?: () => void;
};

export interface SaveFileResult {
  /** 是否保存成功 */
  ok: boolean;
  /** 原生环境下的保存位置（浏览器下载为 null） */
  path: string | null;
}

export interface SaveImageResult extends SaveFileResult {
  /** 是否真正写入系统相册（false 表示回退到下载目录） */
  gallery: boolean;
}

/** 分片大小：4MB，兼顾写入效率与 WebView 内存占用 */
const CHUNK_SIZE = 4 * 1024 * 1024;
/** 旧安装包只有单次过桥接口，超过该大小直接放弃，避免整包 Base64 撑爆内存 */
const LEGACY_MAX_SIZE = 20 * 1024 * 1024;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** 分片流式写入：逐片读取并追加，任何时刻内存中只有一块 Base64 */
async function saveByChunks(
  bridge: AndroidBridge,
  safeName: string,
  blob: Blob,
  mimeType: string,
): Promise<SaveFileResult> {
  if (!bridge.beginBase64File?.(safeName, mimeType)) {
    return { ok: false, path: null };
  }
  try {
    for (let offset = 0; offset < blob.size; offset += CHUNK_SIZE) {
      const base64 = await blobToBase64(blob.slice(offset, offset + CHUNK_SIZE));
      if (!bridge.appendBase64Chunk?.(base64)) {
        bridge.abortBase64File?.();
        return { ok: false, path: null };
      }
    }
    const path = bridge.endBase64File?.() ?? null;
    return path ? { ok: true, path } : { ok: false, path: null };
  } catch {
    bridge.abortBase64File?.();
    return { ok: false, path: null };
  }
}

/**
 * 保存文件到本地。
 * - 原生 App：WebView 不支持 blob: 链接下载，改走 AndroidBridge 写入手机本地；
 *   优先分片流式写入，旧安装包回退单次过桥并限制大小
 * - 浏览器：用临时 blob 链接触发下载
 */
export async function saveBlobFile(
  fileName: string,
  blob: Blob,
  mimeType: string,
): Promise<SaveFileResult> {
  // 安卓文件系统不接受路径分隔符等字符，统一替换为下划线
  const safeName = fileName.replace(/[\\/:*?"<>|]/g, '_');
  if (isNative) {
    const bridge = (window as unknown as { AndroidBridge?: AndroidBridge }).AndroidBridge;
    if (bridge?.beginBase64File && bridge.appendBase64Chunk && bridge.endBase64File) {
      return saveByChunks(bridge, safeName, blob, mimeType);
    }
    // 旧版本安装包没有分片接口，回退单次过桥，超大文件直接提示失败
    if (!bridge?.saveBase64File || blob.size > LEGACY_MAX_SIZE) {
      return { ok: false, path: null };
    }
    try {
      const base64 = await blobToBase64(blob);
      const path = bridge.saveBase64File(safeName, base64, mimeType);
      return path ? { ok: true, path } : { ok: false, path: null };
    } catch {
      return { ok: false, path: null };
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return { ok: true, path: null };
}

/**
 * 保存图片到系统相册。
 * - 原生 App：Android 10+ 通过原生桥写入 Pictures/班务星；
 *   旧系统或旧安装包没有该桥方法时，回退为普通文件保存（下载目录）
 * - 浏览器：走普通下载
 */
export async function saveImageToGallery(
  fileName: string,
  blob: Blob,
  mimeType = 'image/png',
): Promise<SaveImageResult> {
  const safeName = fileName.replace(/[\\/:*?"<>|]/g, '_');
  if (isNative) {
    const bridge = (window as unknown as { AndroidBridge?: AndroidBridge }).AndroidBridge;
    if (bridge?.saveImageToGallery) {
      try {
        const base64 = await blobToBase64(blob);
        const path = bridge.saveImageToGallery(safeName, base64, mimeType);
        if (path) return { ok: true, path, gallery: true };
      } catch {
        // 相册写入异常时退回通用保存
      }
    }
  }
  const fallback = await saveBlobFile(safeName, blob, mimeType);
  return { ...fallback, gallery: false };
}