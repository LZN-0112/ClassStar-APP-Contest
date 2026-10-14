/**
 * 全局配置
 * 生产环境下必须通过环境变量注入，禁止在源码中硬编码敏感信息
 */

/// <reference types="vite/client" />

const isDev = import.meta.env.DEV

const API_HOST = import.meta.env.VITE_API_HOST || (isDev ? 'localhost:3000' : '')

// 开发环境允许 HTTP，生产环境强制 HTTPS
const API_PROTOCOL = isDev
  ? 'http'
  : (import.meta.env.VITE_API_PROTOCOL || 'https')

// H5 开发环境通过 Vite 代理转发到后端，避免跨域导致 CSRF Cookie 无法携带
let apiBase: string
apiBase = API_HOST ? `${API_PROTOCOL}://${API_HOST}/api/v1` : ''

export const API_BASE = apiBase

export const APP_NAME = '校园班级事务智能管理助手'

export const STORAGE_KEY_PREFIX = 'class_assistant:'

export const REQUEST_TIMEOUT = 15000

export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,20}$/

export const PHONE_REGEX = /^1[3-9]\d{9}$/

export const CLASS_CODE_REGEX = /^\d{6}$/
