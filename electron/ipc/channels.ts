import type { ProgressInfo } from "electron-updater"

// ===== 通道名常量 =====
// 所有 IPC 通道名集中定义，消除散落各处的魔法字符串
// 主进程 handler 注册和 preload 暴露 API 都引用这些常量

/** invoke 通道：渲染进程请求 → 主进程响应 */
export const Invoke = {
  WINDOW_MINIMIZE: "window:minimize",
  WINDOW_MAXIMIZE: "window:maximize",
  WINDOW_CLOSE: "window:close",
  WINDOW_IS_MAXIMIZED: "window:is-maximized",
  CHECK_UPDATE: "check-update",
  START_DOWNLOAD: "start-download",
  QUIT_AND_INSTALL: "quit-and-install",
  OPEN_WIN: "open-win",
} as const

/** send 通道：渲染进程 → 主进程（单向，无返回值） */
export const Send = {
  LOG: "log",
} as const

/** event 通道：主进程 → 渲染进程（推送） */
export const Event = {
  WINDOW_MAXIMIZED_CHANGED: "window:maximized-changed",
  DEEP_LINK: "deep-link",
  MAIN_PROCESS_MESSAGE: "main-process-message",
  UPDATE_CAN_AVAILABLE: "update-can-available",
  UPDATE_ERROR: "update-error",
  DOWNLOAD_PROGRESS: "download-progress",
  UPDATE_DOWNLOADED: "update-downloaded",
} as const

// ===== 类型映射 =====
// 约束每个通道的参数和返回值类型
// 修改通道类型时，handler 和 preload 编译时同步报错

/** 更新检查结果 */
export interface UpdateCheckResult {
  message?: string
  error?: Error
  update?: boolean
  version?: string
  newVersion?: string
}

/** invoke 类型映射：通道 → { args, return } */
export interface IpcInvokeMap {
  [Invoke.WINDOW_MINIMIZE]: { args: []; return: void }
  [Invoke.WINDOW_MAXIMIZE]: { args: []; return: void }
  [Invoke.WINDOW_CLOSE]: { args: []; return: void }
  [Invoke.WINDOW_IS_MAXIMIZED]: { args: []; return: boolean }
  [Invoke.CHECK_UPDATE]: { args: []; return: UpdateCheckResult | null }
  [Invoke.START_DOWNLOAD]: { args: []; return: void }
  [Invoke.QUIT_AND_INSTALL]: { args: []; return: void }
  [Invoke.OPEN_WIN]: { args: [path: string]; return: void }
}

/** send 类型映射：通道 → 参数元组 */
export interface IpcSendMap {
  [Send.LOG]: [level: string, ...args: unknown[]]
}

/** event 类型映射：通道 → 数据类型 */
export interface IpcEventMap {
  [Event.WINDOW_MAXIMIZED_CHANGED]: boolean
  [Event.DEEP_LINK]: { path: string; query: Record<string, string> }
  [Event.MAIN_PROCESS_MESSAGE]: string
  [Event.UPDATE_CAN_AVAILABLE]: { update: boolean; version: string; newVersion: string }
  [Event.UPDATE_ERROR]: { message: string; error: Error }
  [Event.DOWNLOAD_PROGRESS]: ProgressInfo
  [Event.UPDATE_DOWNLOADED]: void
}

// ===== 辅助类型 =====

/** 获取 invoke 通道的返回类型 */
export type InvokeReturn<C extends keyof IpcInvokeMap> = IpcInvokeMap[C]["return"]

/** 获取 event 通道的数据类型 */
export type EventData<C extends keyof IpcEventMap> = IpcEventMap[C]
