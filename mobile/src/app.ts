import { PropsWithChildren, useEffect } from 'react'
import Taro, { useLaunch } from '@tarojs/taro'

import { useAppStore } from '@/stores'
import './app.scss'
import './styles/global.scss'

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    Taro.setStorageSync('app_launch_time', Date.now())
  })

  // 监听网络状态变化，同步到 app store
  useEffect(() => {
    const callback: Taro.onNetworkStatusChange.Callback = (res) => {
      useAppStore.getState().setNetworkType(res.networkType)
    }
    Taro.onNetworkStatusChange(callback)

    // 获取初始网络状态
    Taro.getNetworkType({
      success: (res) => {
        useAppStore.getState().setNetworkType(res.networkType)
      }
    })

    return () => {
      Taro.offNetworkStatusChange(callback)
    }
  }, [])

  // children 是将要会渲染的页面
  return children
}

export default App
