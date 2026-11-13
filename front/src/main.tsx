import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App as CapacitorApp } from '@capacitor/app'
import App from './App'
import AppToaster from './components/ui/AppToaster'
import './index.css'
import { isNative } from './lib/capacitor'
import { handleOverlayBack } from './lib/overlayBack'

// 系统返回键 / 边缘返回手势：优先退回上一级路由，根页面时才退到后台
const ROOT_ROUTES = ['/', '/login', '/register', '/reset-password', '/join-class', '/home']

if (isNative) {
  CapacitorApp.addListener('backButton', () => {
    // 优先关闭已打开的弹层，避免直接退出当前页面
    if (handleOverlayBack()) return
    const path = window.location.hash.replace(/^#/, '').split('?')[0] || '/'
    // react-router 在 history.state 里维护 idx，0 表示当前已是首个历史记录
    const depth = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (depth > 0 && !ROOT_ROUTES.includes(path)) {
      window.history.back()
    } else {
      CapacitorApp.minimizeApp()
    }
  })

  // 外部扫码唤起：class-assistant://class/join?code=XXXX → 加入班级页并预填班级码
  CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    const match = url.match(/^class-assistant:\/\/class\/join\?code=([A-Za-z0-9]+)/i)
    if (match) {
      window.location.hash = `#/join-class?code=${encodeURIComponent(match[1])}`
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <AppToaster />
  </StrictMode>,
)
