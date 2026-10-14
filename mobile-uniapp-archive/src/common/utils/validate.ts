import { PHONE_REGEX, PASSWORD_REGEX, CLASS_CODE_REGEX } from '../config'

export interface ValidateResult {
  valid: boolean
  message?: string
}

export function validatePhone(phone: string): ValidateResult {
  if (!phone) return { valid: false, message: '请输入手机号' }
  if (!PHONE_REGEX.test(phone)) return { valid: false, message: '请输入正确的 11 位手机号' }
  return { valid: true }
}

export function validatePassword(password: string): ValidateResult {
  if (!password) return { valid: false, message: '请输入密码' }
  if (!PASSWORD_REGEX.test(password)) {
    return { valid: false, message: '密码需 8-20 位且同时包含字母和数字' }
  }
  return { valid: true }
}

export function validateConfirmPassword(password: string, confirm: string): ValidateResult {
  if (!confirm) return { valid: false, message: '请再次输入密码' }
  if (password !== confirm) return { valid: false, message: '两次输入的密码不一致' }
  return { valid: true }
}

export function validateName(name: string): ValidateResult {
  if (!name) return { valid: false, message: '请输入姓名' }
  if (name.length < 2 || name.length > 50) return { valid: false, message: '姓名长度需在 2-50 位之间' }
  return { valid: true }
}

export function validateClassCode(code: string): ValidateResult {
  if (!code) return { valid: false, message: '请输入班级码' }
  if (!CLASS_CODE_REGEX.test(code)) return { valid: false, message: '班级码为 6 位数字' }
  return { valid: true }
}

export function validateClassName(name: string): ValidateResult {
  if (!name) return { valid: false, message: '请输入班级名称' }
  if (name.length < 2 || name.length > 50) return { valid: false, message: '班级名称长度需在 2-50 位之间' }
  return { valid: true }
}
