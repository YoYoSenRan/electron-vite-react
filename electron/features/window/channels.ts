/** window feature 的 IPC 通道常量 */
export const windowChannels = {
  minimize: "window:minimize",
  maximize: "window:maximize",
  close: "window:close",
  isMaximized: "window:is-maximized",
  /** 主进程 → 渲染进程推送：最大化状态变化 */
  maximizedChanged: "window:maximized-changed",
  /** 打开新窗口（示例 API） */
  openWin: "window:open",
} as const
