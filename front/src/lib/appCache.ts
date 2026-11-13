type AndroidCacheBridge = {
  getCacheSizeBytes?: () => number;
  clearCache?: () => boolean;
};

function getAndroidBridge(): AndroidCacheBridge | null {
  const bridge = (window as unknown as { AndroidBridge?: AndroidCacheBridge }).AndroidBridge;
  return bridge ?? null;
}

/** 统计 Cache Storage 中所有响应的体积（字节） */
async function getCacheStorageBytes(): Promise<number> {
  if (typeof caches === 'undefined') return 0;
  try {
    const names = await caches.keys();
    let total = 0;
    for (const name of names) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      for (const request of requests) {
        const response = await cache.match(request);
        if (!response) continue;
        const blob = await response.clone().blob();
        total += blob.size;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

/** 当前可清理的应用缓存体积（字节）：WebView 临时缓存 + Cache Storage */
export async function getAppCacheSize(): Promise<number> {
  const nativeBytes = getAndroidBridge()?.getCacheSizeBytes?.() ?? 0;
  const webBytes = await getCacheStorageBytes();
  return nativeBytes + webBytes;
}

/** 清理应用缓存：只清临时缓存，不影响登录态与本地业务数据 */
export async function clearAppCache(): Promise<void> {
  getAndroidBridge()?.clearCache?.();
  if (typeof caches !== 'undefined') {
    try {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    } catch {
      // 浏览器不支持或清理失败时忽略，由页面提示兜底
    }
  }
}

export function formatCacheSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
}