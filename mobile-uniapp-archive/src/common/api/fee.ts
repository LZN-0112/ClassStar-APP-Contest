import { request } from './request'

export type FeeType = 'class' | 'group'
export type FeeRecordType = 'income' | 'expense'

export interface AddFeeRecordData {
  classId: string
  feeType: FeeType
  type: FeeRecordType
  amount: number
  remark?: string
  billUrl?: string
}

export interface UpdateFeeRecordData {
  type: FeeRecordType
  amount: number
  remark?: string
  billUrl?: string
}

export interface FeeRecord {
  id: string
  classId: string
  userId: string
  type: FeeRecordType
  amount: number
  remark?: string
  billUrl?: string
  createTime: string
  updateTime: string
}

export interface Pagination {
  pageNum: number
  pageSize: number
  total: number
  totalPages: number
}

export interface FeeSummary {
  income: number
  expense: number
  balance: number
}

export interface FeeListResult {
  list: FeeRecord[]
  pagination: Pagination
  summary: FeeSummary
}

export interface DailyStat {
  date: string
  income: number
  expense: number
  balance: number
}

export interface MonthStatResult {
  year: number
  month: number
  dailyStats: DailyStat[]
  income: number
  expense: number
  balance: number
}

export interface ExportFeeResult {
  downloadUrl: string
  total: number
}

export function uploadBill(classId: string, file: { file?: File; path?: string }) {
  return request.uploadFile(`/fee/upload-bill?classId=${classId}`, file)
}

export function addFeeRecord(data: AddFeeRecordData) {
  return request.post<FeeRecord>('/fee/add', data)
}

export function getFeeList(params: {
  classId: string
  feeType: FeeType
  pageNum?: number
  pageSize?: number
  startTime?: string
  endTime?: string
}) {
  return request.get<FeeListResult>('/fee/list', params)
}

export function updateFeeRecord(recordId: string, feeType: FeeType, data: UpdateFeeRecordData) {
  return request.put<FeeRecord>(`/fee/update/${recordId}?feeType=${feeType}`, data)
}

export function deleteFeeRecord(recordId: string, feeType: FeeType) {
  return request.delete<{ deletedId: string }>(`/fee/delete/${recordId}?feeType=${feeType}`)
}

export function getFeeMonthStat(params: { classId: string; feeType: FeeType; year: number; month: number }) {
  return request.get<MonthStatResult>('/fee/month-stat', params)
}

export function exportFee(params: { classId: string; feeType: FeeType; startTime?: string; endTime?: string }) {
  return request.get<ExportFeeResult>('/fee/export', params)
}
