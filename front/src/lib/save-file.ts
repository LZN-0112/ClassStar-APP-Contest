import { isNative } from '@/lib/capacitor';

type AndroidBridge = {
  saveBase64File?: (name: string, base64: string, mime: string) => string | null;
};

export interface SaveFileResult {
  /** 是否保存成功 */
  ok: boolean;
  /** 原生环境下的保存位置（浏览器下载为 null） */
  path: string | null;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * 保存文件到本地。
 * - 原生 App：WebView 不支持 blob: 链接下载，改走 AndroidBridge 写入手机本地
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
    // 旧版本安装包没有该桥方法，返回失败让页面提示，避免点了没反应
    if (!bridge?.saveBase64File) {
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