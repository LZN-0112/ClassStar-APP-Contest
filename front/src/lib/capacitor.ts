import { Capacitor } from '@capacitor/core';
import { StatusBar as CapStatusBar, Style } from '@capacitor/status-bar';

/** 是否运行在原生 App（真机/模拟器）中；浏览器/微信小程序里为 false */
export const isNative = Capacitor.isNativePlatform();

/**
 * 读取原生安全区并写入 CSS 变量。
 * 需要重复调用：应用启动瞬间 WindowInsets 可能尚未就绪（返回 0），
 * 折叠/旋转/切换导航方式后也会变化，否则底部固定栏会被系统手势条或三键导航遮挡。
 */
function applySafeArea(): void {
  const bridge = (window as unknown as {
    AndroidBridge?: { getStatusBarHeight?: () => number; getNavigationBarHeight?: () => number };
  }).AndroidBridge;
  if (!bridge) return;
  const dpr = window.devicePixelRatio || 1;
  const top = typeof bridge.getStatusBarHeight === 'function' ? bridge.getStatusBarHeight() : 0;
  if (top > 0) {
    // 桥返回物理像素，需除以 devicePixelRatio 换算成 CSS 像素
    document.documentElement.style.setProperty('--safe-top', `${top / dpr}px`);
  }
  const bottom = typeof bridge.getNavigationBarHeight === 'function' ? bridge.getNavigationBarHeight() : 0;
  if (bottom > 0) {
    document.documentElement.style.setProperty('--safe-bottom', `${bottom / dpr}px`);
  }
}

/**
 * App 启动时初始化沉浸式状态栏（仅真机/模拟器生效，H5 预览不受影响）。
 * - setOverlaysWebView({ overlay: true })：WebView 铺满到系统状态栏后面（内容从屏幕最顶开始）
 * - 默认深色图标（多数页面为浅色头部）；页面可按背景用 useStatusBarStyle 覆盖
 * - 顶部安全区通过 CSS env(safe-area-inset-top) 提供（见 index.html 的 viewport-fit=cover）
 */
export async function initStatusBar(): Promise<void> {
  if (!isNative) return;
  try {
    // 标记原生环境：用于 CSS 隐藏各页面内联的模拟状态栏(9:41/100%)
    document.documentElement.classList.add('is-native');
    applySafeArea();
    // 启动瞬间 insets 可能为 0，布局完成后再补测一次
    window.setTimeout(applySafeArea, 300);
    window.addEventListener('resize', applySafeArea);
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
    // 注意 Capacitor 的 Style 语义：Style.Dark = 深色背景用浅色(白)图标，
    // Style.Light = 浅色背景用深色(黑)图标，与参数 light(浅色图标) 需要反向映射
    await CapStatusBar.setStyle({ style: light ? Style.Dark : Style.Light });
  } catch (e) {
    console.warn('[statusbar] setStyle failed', e);
  }
}
