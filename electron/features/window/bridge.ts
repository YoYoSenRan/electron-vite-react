import { ipcRenderer } from "electron"
import { windowChannels } from "./channels"
import type { WindowBridge } from "./types"

export const windowBridge: WindowBridge = {
  minimize: () => ipcRenderer.invoke(windowChannels.minimize),
  maximize: () => ipcRenderer.invoke(windowChannels.maximize),
  close: () => ipcRenderer.invoke(windowChannels.close),
  isMaximized: () => ipcRenderer.invoke(windowChannels.isMaximized),
  openWin: (targetPath) => ipcRenderer.invoke(windowChannels.openWin, targetPath),

  onMaximizedChange(listener) {
    const handler = (_event: unknown, isMaximized: boolean) => listener(isMaximized)
    ipcRenderer.on(windowChannels.maximizedChanged, handler)
    return () => ipcRenderer.off(windowChannels.maximizedChanged, handler)
  },
}
