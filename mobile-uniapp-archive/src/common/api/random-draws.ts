import { request } from './request'

export interface CreateRandomDrawData {
  title: string
  mainCount?: number
  backupCount?: number
}

export interface DrawMember {
  userId: string
  studentId: string
  name: string
}

export interface RandomDrawItem {
  id: string
  classId: string
  title: string
  mainCount: number
  backupCount: number
  memberCount: number
  createdAt: string
}

export interface RandomDrawListResult {
  list: RandomDrawItem[]
  total: number
  page: number
  pageSize: number
}

export interface RandomDrawDetail {
  id: string
  classId: string
  title: string
  mainCount: number
  backupCount: number
  main: DrawMember[]
  backup: DrawMember[]
  createdAt: string
}

export function createRandomDraw(classId: string, data: CreateRandomDrawData) {
  return request.post<RandomDrawDetail>(`/classes/${classId}/random-draws`, data)
}

export function getRandomDrawList(
  classId: string,
  params?: { page?: number; pageSize?: number },
) {
  return request.get<RandomDrawListResult>(`/classes/${classId}/random-draws`, params)
}

export function getRandomDrawDetail(classId: string, drawId: string) {
  return request.get<RandomDrawDetail>(`/classes/${classId}/random-draws/${drawId}`)
}
