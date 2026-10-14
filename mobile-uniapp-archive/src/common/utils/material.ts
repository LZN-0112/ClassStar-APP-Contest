import { STORAGE_KEY_PREFIX } from '../config'

export interface LocalMaterial {
  id: string
  classId: string
  title: string
  content?: string
  fileName: string
  fileSize: number
  fileUrl: string
  createdAt: string
}

function buildKey(classId: string): string {
  return `${STORAGE_KEY_PREFIX}materials:${classId}`
}

export function getLocalMaterials(classId: string): LocalMaterial[] {
  try {
    const list = uni.getStorageSync(buildKey(classId)) as LocalMaterial[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveLocalMaterials(classId: string, list: LocalMaterial[]): void {
  uni.setStorageSync(buildKey(classId), list)
}

export function addLocalMaterial(classId: string, item: LocalMaterial): void {
  const list = getLocalMaterials(classId)
  list.unshift(item)
  saveLocalMaterials(classId, list)
}

export function removeLocalMaterial(classId: string, id: string): void {
  const list = getLocalMaterials(classId).filter((item) => item.id !== id)
  saveLocalMaterials(classId, list)
}
