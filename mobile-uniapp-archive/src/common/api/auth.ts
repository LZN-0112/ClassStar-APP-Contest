import { request } from './request'

export interface LoginParams {
  phone: string
  password: string
  loginType?: 'password' | 'wechat'
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    phone: string
    name: string
    role?: string
    identity?: string
  }
}

export interface RegisterParams {
  phone: string
  name: string
  password: string
  confirmPassword: string
  studentId?: string
}

export interface ResetPasswordParams {
  phone: string
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

export interface SelectIdentityParams {
  role: string
}

export interface ClassInfo {
  id: string
  name: string
  code: string
  qrCodeUrl: string
  createdBy: string
  orgType?: string
  category?: string | null
  description?: string | null
}

export function login(data: LoginParams) {
  return request.post<LoginResult>('/auth/login', {
    ...data,
    loginType: data.loginType || 'password',
  }, { needAuth: false, needCsrf: false })
}

export function register(data: RegisterParams) {
  return request.post<LoginResult>('/auth/register', data, { needAuth: false, needCsrf: false })
}

export function resetPassword(data: ResetPasswordParams) {
  return request.post<void>('/auth/reset-password', data, { needAuth: false, needCsrf: false })
}

export function selectIdentity(data: SelectIdentityParams) {
  return request.post<void>('/auth/select-identity', data)
}

export function createClass(data: { name: string; orgType?: 'class' | 'association' | 'committee' | 'club'; category?: string; description?: string }) {
  return request.post<ClassInfo>('/classes', data)
}

export function joinClass(data: { code: string }) {
  return request.post<ClassInfo>('/classes/join', data)
}

export function getClassInfo(id: string) {
  return request.get<ClassInfo>(`/classes/${id}`)
}

export interface MyOrgItem {
  id: string
  name: string
  code: string
  grade: string | null
  major: string | null
  qrCodeUrl: string | null
  orgType: string
  category: string | null
  logoUrl: string | null
  description: string | null
  maxMembers: number | null
  role: string
  roleLevel: 'owner' | 'admin' | 'member'
  isCommittee: boolean
  memberCount: number
  joinedAt: string
}

export function getMyClasses() {
  return request.get<MyOrgItem[]>('/classes/my')
}

export interface OrgTodoItem {
  type: 'message_ack' | 'attendance' | 'homework' | 'activity'
  id: string
  title: string
  extra: Record<string, any>
}

export interface OrgTodosResult {
  orgId: string
  orgName: string
  orgType: string
  todos: OrgTodoItem[]
  totalCount: number
}

export function getOrgTodos() {
  return request.get<OrgTodosResult[]>('/classes/orgs/todos')
}

export function updateStudentId(data: { studentId: string }) {
  return request.post<{ success: boolean }>('/auth/update-student-id', data)
}

export function leaveClass(classId: string) {
  return request.post<{ success: boolean }>(`/classes/${classId}/leave`)
}
