// ============================================================
// 设置与个人中心相关 API
// 路由对应 back/src/modules/settings/settings.controller.ts
// 基路径：/settings
// ============================================================
import { request } from './request'

export const settingsApi = {
  /**
   * 获取当前用户设置
   * GET /settings
   */
  getSettings: () => request.get('/settings'),

  /**
   * 更新当前用户设置
   * PUT /settings
   */
  updateSettings: (data: {
    notificationSettings?: Record<string, unknown>
    privacySettings?: Record<string, unknown>
    generalSettings?: Record<string, unknown>
  }) => request.put('/settings', data),

  /**
   * 获取当前用户资料
   * GET /settings/profile
   */
  getProfile: () => request.get('/settings/profile'),

  /**
   * 更新当前用户资料
   * PUT /settings/profile
   */
  updateProfile: (data: { name?: string; avatar?: string; backgroundImage?: string; bio?: string }) =>
    request.put('/settings/profile', data),

  /**
   * 获取当前用户最近动态
   * GET /settings/recent-activities
   */
  getRecentActivities: () => request.get('/settings/recent-activities')
}