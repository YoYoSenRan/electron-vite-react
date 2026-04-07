import { app, ipcMain } from "electron"
import { createRequire } from "node:module"
import type { ProgressInfo, UpdateDownloadedEvent, UpdateInfo } from "electron-updater"

const { autoUpdater } = createRequire(import.meta.url)("electron-updater")

export function update(win: Electron.BrowserWindow) {
  // 设为 false 时，通过 API 手动触发下载更新
  autoUpdater.autoDownload = false
  autoUpdater.disableWebInstaller = false
  autoUpdater.allowDowngrade = false

  // 开始检查更新
  autoUpdater.on("checking-for-update", function () {})
  // 有可用更新
  autoUpdater.on("update-available", (arg: UpdateInfo) => {
    win.webContents.send("update-can-available", { update: true, version: app.getVersion(), newVersion: arg?.version })
  })
  // 无可用更新
  autoUpdater.on("update-not-available", (arg: UpdateInfo) => {
    win.webContents.send("update-can-available", { update: false, version: app.getVersion(), newVersion: arg?.version })
  })

  // 检查更新
  ipcMain.handle("check-update", async () => {
    if (!app.isPackaged) {
      const error = new Error("The update feature is only available after the package.")
      return { message: error.message, error }
    }

    try {
      return await autoUpdater.checkForUpdatesAndNotify()
    } catch (error) {
      return { message: "Network error", error }
    }
  })

  // 开始下载并反馈进度
  ipcMain.handle("start-download", (event: Electron.IpcMainInvokeEvent) => {
    startDownload(
      (error, progressInfo) => {
        if (error) {
          // 反馈下载错误信息
          event.sender.send("update-error", { message: error.message, error })
        } else {
          // 反馈更新进度
          event.sender.send("download-progress", progressInfo)
        }
      },
      () => {
        // 反馈下载完成
        event.sender.send("update-downloaded")
      },
    )
  })

  // 立即安装
  ipcMain.handle("quit-and-install", () => {
    autoUpdater.quitAndInstall(false, true)
  })
}

function startDownload(callback: (error: Error | null, info: ProgressInfo | null) => void, complete: (event: UpdateDownloadedEvent) => void) {
  autoUpdater.on("download-progress", (info: ProgressInfo) => callback(null, info))
  autoUpdater.on("error", (error: Error) => callback(error, null))
  autoUpdater.on("update-downloaded", complete)
  autoUpdater.downloadUpdate()
}
