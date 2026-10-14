import { Capacitor } from '@capacitor/core';
import { StatusBar as CapStatusBar, Style } from '@capacitor/status-bar';

/** 是否运行在原生 App（真机/模拟器）中；浏览器/微信小程序里为 false */
export const isNative = Capacitor.isNativePlatform();

/**
 * App 启动时初始化沉浸式状态栏（仅真机/模拟器生效，H5 预览不受影响）。
 * - setOverlaysWebView({ overlay: true })：WebView 铺满到系统状态栏后面（内容从屏幕最顶开始）
 * - 默认按深色头部设为浅色(白)时间/电量图标；页面可按背景用 useStatusBarStyle 覆盖
 * - 顶部安全区通过 CSS env(safe-area-inset-top) 提供（见 index.html 的 viewport-fit=cover）
 */
export async function initStatusBar(): Promise<void> {
  if (!isNative) return;
  try {
    // 标记原生环境：用于 CSS 隐藏各页面内联的模拟状态栏(9:41/100%)
    document.documentElement.classList.add('is-native');
    // 用原生注入的真实状态栏高度设置 --safe-top（env(safe-area-inset-top) 在 Capacitor WebView 常为 0）
    const bridge = (window as unknown as { AndroidBridge?: { getStatusBarHeight?: () => number } }).AndroidBridge;
    const top = typeof bridge?.getStatusBarHeight === 'function' ? bridge.getStatusBarHeight() : 0;
    if (top > 0) {
      // getStatusBarHeight() 返回的是物理像素，需除以 devicePixelRatio 换算成 CSS 像素
      // （否则会被屏幕密度放大如 3.25 倍，导致顶部避让过度、整体下移）
      const cssTop = top / (window.devicePixelRatio || 1);
      document.documentElement.style.setProperty('--safe-top', `${cssTop}px`);
    }
    await CapStatusBar.setOverlaysWebView({ overlay: true });
    // 状态栏背景透明，露出 App 头部/首页背景（避免顶部出现不透明白条）
    await CapStatusBar.setBackgroundColor({ color: '#00000000' });
    await CapStatusBar.setStyle({ style: Style.Light });
  } catch (e) {
    console.warn('[statusbar] init failed', e);
  }
}

/**
 * 根据页面顶部背景切换系统状态栏图标颜色：
 * - light = true  ：深色/渐变头部 → 浅色(白)时间电量图标
 * - light = false ：浅色/白色头部 → 深色(黑)时间电量图标
 */
export async function setStatusBarStyle(light: boolean): Promise<void> {
  if (!isNative) return;
  try {
    await CapStatusBar.setStyle({ style: light ? Style.Light : Style.Dark });
  } catch (e) {
    console.warn('[statusbar] setStyle failed', e);
  }
}
