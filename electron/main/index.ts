import { app, BrowserWindow, shell, ipcMain } from "electron"
import { fileURLToPath } from "node:url"
import path from "node:path"
import os from "node:os"
import log from "electron-log/main"
import store from "./store"
import { update } from "./update"

// 初始化 electron-log
log.initialize()
// 生产环境只记录 info 及以上级别
if (app.isPackaged) {
  log.transports.file.level = "info"
  log.transports.console.level = false
} else {
  log.transports.file.level = false
  log.transports.console.level = "debug"
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, "../..")

export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron")
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist")
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST

// 禁用 Windows 7 的 GPU 加速
if (os.release().startsWith("6.1")) app.disableHardwareAcceleration()

// 设置 Windows 10+ 通知的应用名称
if (process.platform === "win32") app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, "../preload/index.mjs")
const indexHtml = path.join(RENDERER_DIST, "index.html")

async function createWindow() {
  const { x, y, width, height } = store.get("windowBounds")

  win = new BrowserWindow({
    title: "Main window",
    icon: path.join(process.env.VITE_PUBLIC, "favicon.ico"),
    x,
    y,
    width,
    height,
    webPreferences: {
      preload,
      // 警告：在生产环境中启用 nodeIntegration 和禁用 contextIsolation 是不安全的
      // nodeIntegration: true,

      // 建议使用 contextBridge.exposeInMainWorld
      // 参考 https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

  // 窗口移动或调整大小时保存位置和尺寸
  const saveBounds = () => {
    if (win && !win.isMinimized() && !win.isMaximized()) {
      store.set("windowBounds", win.getBounds())
    }
  }
  win.on("resized", saveBounds)
  win.on("moved", saveBounds)

  if (VITE_DEV_SERVER_URL) {
    // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // 非打包环境下打开开发者工具
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // 主动向渲染进程推送消息
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString())
  })

  // 所有链接使用浏览器打开，而非应用内打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url)
    return { action: "deny" }
  })

  // 自动更新
  update(win)
}

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
  win = null
  if (process.platform !== "darwin") app.quit()
})

app.on("second-instance", () => {
  if (win) {
    // 用户尝试打开第二个实例时，聚焦到主窗口
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// 新窗口示例，参数为新窗口的 URL
ipcMain.handle("open-win", (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})
