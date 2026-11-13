import { useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { isNative } from '@/lib/capacitor';

/**
 * 应用版本号：真机读取原生 versionName，H5 预览读取构建时注入的 package.json 版本。
 * 返回不带前缀的版本号，展示时自行拼接 "v"。
 */
export function useAppVersion(): string {
  const [version, setVersion] = useState(__APP_VERSION__);

  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;
    void CapacitorApp.getInfo()
      .then((info) => {
        if (!cancelled && info.version) {
          setVersion(info.version);
        }
      })
      .catch(() => {
        // 取不到原生版本时沿用构建注入的版本
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return version;
}