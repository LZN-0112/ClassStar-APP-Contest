import { STORAGE_KEY_PREFIX } from '../config'

const ALGORITHM = 'simple-xor-v1'

function getDeviceSeed(): string {
  try {
    // #ifdef APP-PLUS || APP
    const info = uni.getDeviceInfo?.()
    if (info?.deviceId) return info.deviceId
    // #endif
    const sys = uni.getSystemInfoSync()
    return `${sys.model || ''}${sys.platform || ''}${sys.system || ''}${sys.deviceId || ''}`
  } catch {
    return '__UNI__CLASSASSISTANT'
  }
}

function deriveKey(seed: string): number[] {
  const key: number[] = []
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const base = Math.abs(hash).toString(16).padStart(8, '0')
  for (let i = 0; i < base.length; i += 2) {
    key.push(parseInt(base.substring(i, i + 2), 16))
  }
  return key
}

function xorCipher(text: string, key: number[]): string {
  const bytes: number[] = []
  for (let i = 0; i < text.length; i++) {
    bytes.push(text.charCodeAt(i) ^ key[i % key.length])
  }
  return String.fromCharCode(...bytes)
}

function utf8ToBase64(text: string): string {
  try {
    return typeof window !== 'undefined' && window.btoa
      ? window.btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(Number('0x' + p1))))
      : uni.arrayBufferToBase64(new TextEncoder().encode(text).buffer as ArrayBuffer)
  } catch {
    return text
  }
}

function base64ToUtf8(text: string): string {
  try {
    if (typeof window !== 'undefined' && window.atob) {
      const raw = window.atob(text)
      return decodeURIComponent(raw.split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''))
    }
    const buffer = uni.base64ToArrayBuffer(text)
    return new TextDecoder().decode(buffer)
  } catch {
    return text
  }
}

function buildKey(rawKey: string): string {
  return `${STORAGE_KEY_PREFIX}${rawKey}`
}

export const secureStorage = {
  set(key: string, value: unknown): void {
    const plain = JSON.stringify({ __v: value, __a: ALGORITHM })
    const seed = getDeviceSeed()
    const keyBytes = deriveKey(seed)
    const cipher = xorCipher(plain, keyBytes)
    const encoded = utf8ToBase64(cipher)
    uni.setStorageSync(buildKey(key), encoded)
  },

  get<T = unknown>(key: string): T | null {
    try {
      const encoded = uni.getStorageSync(buildKey(key)) as string
      if (!encoded) return null
      const cipher = base64ToUtf8(encoded)
      const seed = getDeviceSeed()
      const keyBytes = deriveKey(seed)
      const plain = xorCipher(cipher, keyBytes)
      const parsed = JSON.parse(plain)
      return parsed?.__v as T
    } catch {
      return null
    }
  },

  remove(key: string): void {
    uni.removeStorageSync(buildKey(key))
  },

  clear(): void {
    const keys = uni.getStorageInfoSync().keys.filter((k) => k.startsWith(STORAGE_KEY_PREFIX))
    keys.forEach((k) => uni.removeStorageSync(k))
  },
}
