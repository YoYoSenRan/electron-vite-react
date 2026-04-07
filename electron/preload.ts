import { contextBridge } from "electron"
import { logBridge } from "./features/log"
import { windowBridge } from "./features/window"
import { updaterBridge } from "./features/updater"
import { deeplinkBridge } from "./features/deeplink"

/** API 类型，供 renderer 端通过 global.d.ts 引用 */
export type Api = typeof api

/**
 * 渲染进程可访问的全部 API。
 * 按 feature 分域，渲染进程通过 window.api.xxx 调用。
 */
const api = {
  log: logBridge,
  window: windowBridge,
  updater: updaterBridge,
  deeplink: deeplinkBridge,
} as const

contextBridge.exposeInMainWorld("api", api)
