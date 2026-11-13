import { Capacitor, registerPlugin } from '@capacitor/core';

interface WechatPlugin {
  login(): Promise<{ code: string }>;
}

const Wechat = registerPlugin<WechatPlugin>('Wechat');

/**
 * 唤起微信授权并返回一次性 code
 * 仅 Android App 内可用，浏览器/H5 环境直接给出可读提示
 */
export async function requestWechatAuthCode(): Promise<string> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('请在班务星 App 内使用微信登录');
  }

  try {
    const { code } = await Wechat.login();
    if (!code) {
      throw new Error('未获取到微信授权码，请重试');
    }
    return code;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not implemented')) {
      throw new Error('当前安装包未集成微信登录，请升级到最新版本');
    }
    throw error instanceof Error ? error : new Error(message);
  }
}