/**
 * 隐私授权状态读写。
 * 版本号变化后要求用户重新确认，供隐私政策实质更新时使用。
 */
const CONSENT_KEY = 'privacy_consent_v1';
export const PRIVACY_CONSENT_VERSION = '2026-11-14.1';

export function hasPrivacyConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === PRIVACY_CONSENT_VERSION;
  } catch {
    return false;
  }
}

export function acceptPrivacyConsent(): void {
  try {
    localStorage.setItem(CONSENT_KEY, PRIVACY_CONSENT_VERSION);
  } catch {
    // 隐私模式等写入失败场景仅在本次会话内放行
  }
}

/** 撤回授权：清除本地标记，调用方负责刷新页面回到授权弹窗 */
export function revokePrivacyConsent(): void {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    // ignore
  }
}