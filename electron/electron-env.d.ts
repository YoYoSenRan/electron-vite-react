/// <reference types="vite-electron-plugin/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    VSCODE_DEBUG?: "true"
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Preload 暴露给渲染进程的全局 API 类型
// 由 electron/preload.ts 的 Api 类型推导，所有 feature bridge 统一挂在 window.api 下
import type { Api } from "./preload"

declare global {
  interface Window {
    api: Api
  }
}
