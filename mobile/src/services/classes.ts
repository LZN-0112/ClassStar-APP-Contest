// ============================================================
// 班级相关 API
// 路由对应 back/src/modules/classes/classes.controller.ts
// ============================================================
import type { TasksResult, MessageListResult } from '@/types/classes'
import { request } from './request'

/**
 * 获取班级任务统计与列表
 * GET /classes/:classId/tasks
 */
export function getClassTasks(classId: string): Promise<TasksResult> {
  return request.get<TasksResult>(`/classes/${classId}/tasks`)
}

/**
 * 获取班级消息列表（首页取前 3 条）
 * GET /classes/:classId/messages
 */
export function getClassMessages(
  classId: string,
  pageSize = 10
): Promise<MessageListResult> {
  return request.get<MessageListResult>(`/classes/${classId}/messages`, { pageSize })
}

// ============================================================
// 班级基础信息 / 成员 API（追加，对应 classes.controller.ts）
// GET /classes/my、/classes/:id、/classes/:id/members
// ============================================================

/** 班级信息 */
export interface ClassDetail {
  id: string
  name: string
  code?: string
  grade?: string
  major?: string
  announcement?: string
  qrCodeUrl?: string
  materialCount?: number
  archiveCount?: number
  createdAt?: string
  ownerId?: string
  memberCount?: number
}

/** 班级成员 */
export interface ClassMember {
  id: string
  userId?: string
  name: string
  role?: string
  roleLevel?: 'owner' | 'admin' | 'member'
  isCommittee?: boolean
  avatar?: string
}

/** 成员列表结果 */
export interface MembersResult {
  list: ClassMember[]
  total?: number
}

/**
 * 获取班级详情
 * GET /classes/:id
 */
export function getClassDetail(classId: string): Promise<ClassDetail> {
  return request.get<ClassDetail>(`/classes/${classId}`)
}

/**
 * 获取班级成员列表
 * GET /classes/:id/members
 */
export function getMembers(
  classId: string,
  params?: { keyword?: string; role?: string; page?: number; pageSize?: number }
): Promise<MembersResult> {
  return request.get<MembersResult>(`/classes/${classId}/members`, params)
}

// ============================================================
// 班级成员/加入/创建相关
// ============================================================

/** 班级信息 */
export interface ClassInfo {
  id: string
  name: string
  code?: string
  qrCodeUrl?: string
  orgType?: string
  roleLevel?: string
  role?: string
}

/**
 * 获取当前用户加入的班级列表
 * GET /classes/my
 */
export function getMyClasses(): Promise<ClassInfo[]> {
  return request.get<ClassInfo[]>(`/classes/my`)
}

/** 组织待办项 */
export interface OrgTodo {
  orgId: string
  orgName: string
  orgType: string
  totalCount: number
}

/**
 * 获取各组织待办数
 * GET /classes/orgs/todos
 */
export function getOrgsTodos(): Promise<OrgTodo[]> {
  return request.get<OrgTodo[]>(`/classes/orgs/todos`)
}

/**
 * 获取班级信息详情
 * GET /classes/:id
 */
export function getClassesById(id: string): Promise<ClassInfo> {
  return request.get<ClassInfo>(`/classes/${id}`)
}

/**
 * 加入班级
 * POST /classes/join
 * body: JoinClassDto { code: 6位数字; studentId?: string }
 */
export function joinClass(payload: { code: string; studentId?: string }): Promise<ClassInfo> {
  return request.post<ClassInfo>(`/classes/join`, payload)
}

/**
 * 创建组织（班级/社团/部门/兴趣小组）
 * POST /classes
 * body: CreateClassDto { name; orgType?; grade?; major? }
 */
export function createClass(payload: {
  name: string
  orgType?: string
  grade?: string
  major?: string
}): Promise<ClassInfo> {
  return request.post<ClassInfo>(`/classes`, payload)
}