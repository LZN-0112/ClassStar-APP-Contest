// ============================================================
// 班费/团费账本相关 API
// 路由对应 back/src/modules/fee/fee.controller.ts
// 基路径：/fee（注意：不在 classes/:classId 下）
// ============================================================
import { request } from './request'

export const feeApi = {
  /**
   * 上传票据图片（multipart，file 字段；classId 走 query）
   * POST /fee/upload-bill?classId=xxx
   */
  uploadBill: (classId: string, file: File | Blob | string) => {
    const formData = new FormData()
    formData.append('file', file as Blob)
    return request.post(`/fee/upload-bill`, formData, {
      params: { classId },
      header: { 'Content-Type': 'multipart/form-data' }
    })
  },

  /**
   * 新增收支记录
   * POST /fee/add
   */
  createPayment: (data: {
    classId: string
    feeType: 'class' | 'group'
    type: 'income' | 'expense'
    amount: number
    remark?: string
    billUrl?: string
  }) => request.post('/fee/add', data),

  /**
   * 分页查询收支列表（台账）
   * GET /fee/list
   */
  getLedger: (data: {
    classId: string
    feeType: 'class' | 'group'
    pageNum?: number
    pageSize?: number
    startTime?: string
    endTime?: string
  }) => request.get('/fee/list', data),

  /**
   * 修改收支记录（feeType 走 query）
   * PUT /fee/update/:recordId?feeType=class|group
   */
  update: (recordId: string, feeType: 'class' | 'group', data: {
    type: 'income' | 'expense'
    amount: number
    remark?: string
    billUrl?: string
  }) => request.put(`/fee/update/${recordId}`, data, { params: { feeType } }),

  /**
   * 删除收支记录（feeType 走 query）
   * DELETE /fee/delete/:recordId?feeType=class|group
   */
  remove: (recordId: string, feeType: 'class' | 'group') =>
    request.del(`/fee/delete/${recordId}`, { feeType }),

  /**
   * 月度收支统计（报表）
   * GET /fee/month-stat
   */
  getReport: (data: {
    classId: string
    feeType: 'class' | 'group'
    year: number
    month: number
  }) => request.get('/fee/month-stat', data),

  /**
   * 导出 Excel 收支报表
   * GET /fee/export
   */
  export: (data: {
    classId: string
    feeType: 'class' | 'group'
    startTime?: string
    endTime?: string
  }) => request.get('/fee/export', data),

  /**
   * 设置学期预算（班委）
   * POST /fee/budget/set
   */
  setBudget: (data: {
    classId: string
    feeType: 'class' | 'group'
    academicYear: string
    semester: string
    amount: number
    remark?: string
  }) => request.post('/fee/budget/set', data),

  /**
   * 查询学期预算
   * GET /fee/budget
   */
  getBudget: (data: {
    classId: string
    feeType: 'class' | 'group'
    academicYear?: string
    semester?: string
  }) => request.get('/fee/budget', data),

  /**
   * 删除学期预算（班委）
   * DELETE /fee/budget/:budgetId
   */
  deleteBudget: (budgetId: string) => request.del(`/fee/budget/${budgetId}`)
}