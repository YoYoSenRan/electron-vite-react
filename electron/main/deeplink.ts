import { app, BrowserWindow } from "electron"
import path from "node:path"
import log from "./logger"

// 自定义协议名，用于深度链接唤起应用
// 例如：electron-vite-react://some/path?key=value
const PROTOCOL = "electron-vite-react"

/**
 * 注册自定义协议为默认处理程序
 * 必须在 app.whenReady() 之前调用
 */
export function registerProtocol() {
  if (!app.isPackaged) {
    // 开发环境：需要指定可执行文件路径和启动参数
    // 否则协议会指向打包后的路径（不存在），导致注册无效
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])])
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL)
  }
}

/**
 * 解析深度链接 URL 并发送到渲染进程
 * URL 格式：electron-vite-react://path?key=value
 */
export function handleDeepLink(win: BrowserWindow | null, url: string) {
  log.info("Deep link received:", url)

  if (!win) {
    log.warn("Deep link received but no window available")
    return
  }

  try {
    const parsed = new URL(url)
    const data = {
      // host 是协议后的第一段路径（electron-vite-react://host/pathname）
      path: parsed.host + parsed.pathname,
      query: Object.fromEntries(parsed.searchParams),
    }
    win.webContents.send("deep-link", data)
  } catch (err) {
    log.error("Failed to parse deep link URL:", err)
  }

  // 无论解析是否成功，都聚焦窗口
  if (win.isMinimized()) win.restore()
  win.focus()
}

/**
 * 从 second-instance 事件的 argv 中提取深度链接 URL
 * Windows/Linux 下，协议 URL 作为命令行参数传入
 */
export function extractDeepLinkFromArgv(argv: string[]): string | undefined {
  return argv.find((arg) => arg.startsWith(`${PROTOCOL}://`))
}
