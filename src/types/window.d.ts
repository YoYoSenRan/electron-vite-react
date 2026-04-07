// 渲染进程的全局 window 类型扩展
// preload.ts 通过 contextBridge 把 api 挂在 window.api 上，
// 类型从 preload 的 Api 类型推导，保证桥接两端类型一致
import type { Api } from "../../electron/preload"

declare global {
  interface Window {
    api: Api
  }
}

export {}
