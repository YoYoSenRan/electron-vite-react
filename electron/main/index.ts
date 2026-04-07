// 日志模块必须最先导入，确保在所有代码之前初始化异常捕获
import "./logger"
import { app, BrowserWindow, shell, ipcMain, session } from "electron"
import { fileURLToPath } from "node:url"
import path from "node:path"
import os from "node:os"
import store from "./store"
import { update } from "./update"
import { registerProtocol, handleDeepLink, extractDeepLinkFromArgv } from "./deeplink"

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

// 注册自定义协议，必须在 requestSingleInstanceLock 之前
// 因为 Windows 下第二个实例会携带协议 URL 作为命令行参数
registerProtocol()

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, "../preload/index.mjs")
const indexHtml = path.join(RENDERER_DIST, "index.html")

async function createWindow() {
  const { x, y, width, height } = store.get("windowBounds")

  // macOS: 隐藏标题栏但保留系统红绿灯按钮（最小化/全屏/关闭）
  //   titleBarStyle: "hiddenInset" 让红绿灯嵌入窗口内容区
  //   trafficLightPosition 控制红绿灯按钮的偏移位置
  // Windows/Linux: 完全移除原生窗口边框，由渲染进程绘制自定义按钮
  const platformWindowConfig = process.platform === "darwin" ? { titleBarStyle: "hiddenInset" as const, trafficLightPosition: { x: 12, y: 12 } } : { frame: false }

  win = new BrowserWindow({
    title: "Main window",
    icon: path.join(process.env.VITE_PUBLIC, "favicon.ico"),
    x,
    y,
    width,
    height,
    // 设置最小窗口尺寸，防止标题栏按钮被挤压
    minWidth: 400,
    minHeight: 300,
    ...platformWindowConfig,
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

  // 主动推送最大化状态变化给渲染进程
  // 用于 Win/Linux 标题栏按钮图标切换（最大化 ↔ 还原）
  win.on("maximize", () => {
    win?.webContents.send("window:maximized-changed", true)
  })
  win.on("unmaximize", () => {
    win?.webContents.send("window:maximized-changed", false)
  })
}

// ----- 窗口控制 IPC -----
// 放在 createWindow 外部，避免 activate 重建窗口时重复注册导致异常
// （ipcMain.handle 对同一通道只能注册一次，重复注册会抛 Error）

ipcMain.handle("window:minimize", () => {
  win?.minimize()
})

ipcMain.handle("window:maximize", () => {
  // 切换最大化/还原状态
  if (win?.isMaximized()) {
    win.unmaximize()
  } else {
    win?.maximize()
  }
})

ipcMain.handle("window:close", () => {
  win?.close()
})

ipcMain.handle("window:is-maximized", () => {
  return win?.isMaximized() ?? false
})

// ----- macOS 深度链接（冷启动） -----
// open-url 必须在 app.whenReady() 之前注册
// 因为 macOS 通过协议冷启动应用时，open-url 可能在 ready 之前触发
// 此时窗口尚不存在，先暂存 URL，等窗口创建后再处理
let pendingDeepLinkUrl: string | null = null

app.on("open-url", (event, url) => {
  event.preventDefault()
  if (win) {
    handleDeepLink(win, url)
  } else {
    // 窗口尚未创建，暂存 URL
    pendingDeepLinkUrl = url
  }
})

app.whenReady().then(() => {
  // CSP 安全策略：限制可执行脚本和可加载资源的来源
  // 通过 HTTP 响应头注入，比 <meta> 标签更安全（无法被页面脚本篡改）
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = VITE_DEV_SERVER_URL
      ? // 开发环境：允许 Vite HMR 所需的 WebSocket 和 eval
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws://127.0.0.1:* http://127.0.0.1:*; media-src 'self'; object-src 'none'"
      : // 生产环境：严格限制，仅允许必要的外部资源
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    })
  })

  createWindow()

  // 处理冷启动时暂存的深度链接 URL
  if (pendingDeepLinkUrl) {
    handleDeepLink(win, pendingDeepLinkUrl)
    pendingDeepLinkUrl = null
  }
})

app.on("window-all-closed", () => {
  win = null
  // 所有平台统一行为：关闭窗口即退出应用
  app.quit()
})

app.on("second-instance", (_event, argv) => {
  if (win) {
    // Windows/Linux: 协议 URL 作为命令行参数传入第二个实例
    const url = extractDeepLinkFromArgv(argv)
    if (url) {
      handleDeepLink(win, url)
    } else {
      // 非深度链接触发的第二实例，仅聚焦窗口
      if (win.isMinimized()) win.restore()
      win.focus()
    }
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
