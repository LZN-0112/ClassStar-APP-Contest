import { api } from '@/lib/api';
import { hasPrivacyConsent } from '@/lib/privacy-consent';

/**
 * 极光推送 App 侧接入：
 * - 只有在用户同意隐私政策后才初始化原生 SDK（合规要求）；
 * - 登录后把极光 Registration ID 上报给后端，退出登录时注销；
 * - 通知点击由原生层回调 window.__banwuxingPushOpen，这里统一跳转到消息详情。
 */
interface NativePushBridge {
  initJPush?: () => void;
  getRegistrationId?: () => string;
  setPushReady?: () => void;
  consumePushOpen?: () => string;
}

interface PushOpenPayload {
  route?: unknown;
  messageId?: unknown;
  classId?: unknown;
}

const CLASS_ID_PATTERN = /^[\w-]{1,64}$/;
const MESSAGE_DETAIL_ROUTE = /^\/message-detail\/[\w-]{1,64}(\?classId=[\w-]{1,64})?$/;
const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 8000;
const MAX_SYNC_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

let bootstrapped = false;
let syncing: Promise<void> | null = null;
let syncRetries = 0;
let retryTimer: number | null = null;

/** SDK 首次初始化时注册标识可能尚未就绪，做有限次重试 */
function scheduleRetry(): void {
  if (retryTimer !== null || syncRetries >= MAX_SYNC_RETRIES) return;
  syncRetries += 1;
  retryTimer = window.setTimeout(() => {
    retryTimer = null;
    void syncPushRegistration();
  }, RETRY_DELAY_MS);
}

function getBridge(): NativePushBridge | null {
  const bridge = (window as unknown as { AndroidBridge?: NativePushBridge }).AndroidBridge;
  return bridge && typeof bridge.initJPush === 'function' ? bridge : null;
}

function navigateFromPush(payload: PushOpenPayload): void {
  const route = typeof payload.route === 'string' ? payload.route : '';
  const fallback =
    typeof payload.messageId === 'string' ? `/message-detail/${payload.messageId}` : '';
  let target = MESSAGE_DETAIL_ROUTE.test(route)
    ? route
    : MESSAGE_DETAIL_ROUTE.test(fallback)
      ? fallback
      : '';
  // 消息可能属于用户当前未选中的组织，带上 classId 才能正确拉取详情
  const classId =
    typeof payload.classId === 'string' && CLASS_ID_PATTERN.test(payload.classId)
      ? payload.classId
      : '';
  if (target && classId && !target.includes('classId=')) {
    target += `${target.includes('?') ? '&' : '?'}classId=${classId}`;
  }
  if (!target || window.location.hash === `#${target}`) return;
  window.location.hash = `#${target}`;
}

// 原生层点击通知后会调用该全局函数；模块加载即注册，避免冷启动时错过回调
(window as unknown as { __banwuxingPushOpen?: (payload: PushOpenPayload) => void })
  .__banwuxingPushOpen = (payload) => {
  if (!payload || typeof payload !== 'object') return;
  navigateFromPush(payload);
};

function consumePendingPush(bridge: NativePushBridge): void {
  try {
    const raw = bridge.consumePushOpen?.() ?? '';
    if (!raw) return;
    navigateFromPush(JSON.parse(raw) as PushOpenPayload);
  } catch {
    // extras 不是合法 JSON 时忽略，避免影响页面启动
  }
}

/** 同意隐私政策后调用：初始化原生推送并处理启动前点击的通知 */
export function initPushAfterConsent(): void {
  const bridge = getBridge();
  if (!bridge || !hasPrivacyConsent()) return;
  try {
    bridge.initJPush?.();
    // 告知原生 Web 层已就绪，之后的点击可直接注入 JS
    bridge.setPushReady?.();
  } catch {
    return;
  }
  consumePendingPush(bridge);
}

function waitForRegistrationId(bridge: NativePushBridge): Promise<string> {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const poll = () => {
      let registrationId = '';
      try {
        registrationId = bridge.getRegistrationId?.() ?? '';
      } catch {
        registrationId = '';
      }
      if (registrationId) {
        resolve(registrationId);
        return;
      }
      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        resolve('');
        return;
      }
      window.setTimeout(poll, POLL_INTERVAL_MS);
    };
    poll();
  });
}

/** 登录后/回到前台时调用：把当前设备标识上报给后端（同一 token + RID 只报一次） */
export function syncPushRegistration(): Promise<void> {
  if (syncing) return syncing;
  syncing = (async () => {
    const bridge = getBridge();
    const accessToken = localStorage.getItem('accessToken');
    if (!bridge || !accessToken || !hasPrivacyConsent()) return;

    bridge.initJPush?.();
    const registrationId = await waitForRegistrationId(bridge);
    if (!registrationId) {
      scheduleRetry();
      return;
    }

    const marker = `${registrationId}:${accessToken.slice(-12)}`;
    if (localStorage.getItem('jpush_reported_marker') === marker) {
      syncRetries = 0;
      return;
    }

    await api.post('/push/devices', {
      registrationId,
      platform: 'android',
    });
    localStorage.setItem('jpush_reported_marker', marker);
    syncRetries = 0;
  })()
    .catch(() => {
      // 推送注册属于增强能力：失败不提示用户，稍后自动重试
      scheduleRetry();
    })
    .finally(() => {
      syncing = null;
    });
  return syncing;
}

/** 退出登录时调用（需在清理 accessToken 之前）：解绑当前设备的推送标识 */
export async function unregisterPushToken(): Promise<void> {
  localStorage.removeItem('jpush_reported_marker');
  const bridge = getBridge();
  let registrationId = '';
  try {
    registrationId = bridge?.getRegistrationId?.() ?? '';
  } catch {
    registrationId = '';
  }
  if (!registrationId) return;
  try {
    await api.delete(`/push/devices/${encodeURIComponent(registrationId)}`);
  } catch {
    // 解绑失败不影响退出登录
  }
}

/** App 启动时调用一次：初始化 + 上报 + 监听回前台补报 */
export function bootstrapPush(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  initPushAfterConsent();
  void syncPushRegistration();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    // App 从后台回前台：设备可能重装/重注册，补一次初始化与上报
    initPushAfterConsent();
    void syncPushRegistration();
  });
}