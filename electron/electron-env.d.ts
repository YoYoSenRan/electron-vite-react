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
interface Window {
  ipcRenderer: {
    on(channel: string, listener: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void): Electron.IpcRenderer
    off(channel: string, listener: (...args: unknown[]) => void): Electron.IpcRenderer
    send(channel: string, ...args: unknown[]): void
    invoke(channel: string, ...args: unknown[]): Promise<unknown>
  }
  windowControl: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
    isMaximized: () => Promise<boolean>
    onMaximizedChange: (callback: (isMaximized: boolean) => void) => void
    removeMaximizedChange: () => void
  }
  logger: {
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
    error: (...args: unknown[]) => void
    debug: (...args: unknown[]) => void
  }
  deepLink: {
    onDeepLink: (callback: (data: { path: string; query: Record<string, string> }) => void) => void
    removeDeepLink: () => void
  }
}
