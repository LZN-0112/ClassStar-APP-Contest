import { request } from './request'

export interface UserSettings {
  id: string
  userId: string
  notificationSettings: Record<string, any>
  privacySettings: Record<string, any>
  generalSettings: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface UpdateSettingsParams {
  notificationSettings?: Record<string, any>
  privacySettings?: Record<string, any>
  generalSettings?: Record<string, any>
}

export interface UserProfile {
  id: string
  name: string
  phone: string
  avatar: string | null
  studentId: string | null
  createdAt: string
}

export interface UpdateProfileParams {
  name?: string
  avatar?: string
}

export function getSettings() {
  return request.get<UserSettings>('/settings')
}

export function updateSettings(data: UpdateSettingsParams) {
  return request.put<UserSettings>('/settings', data)
}

export function getProfile() {
  return request.get<UserProfile>('/settings/profile')
}

export function updateProfile(data: UpdateProfileParams) {
  return request.put<UserProfile>('/settings/profile', data)
}
