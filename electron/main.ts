// logger 必须最先导入，确保在任何代码之前初始化异常捕获
import "./core/logger"
import "./core/paths"
import { app } from "electron"
import { setupCSP } from "./core/security"
import { registerLogIpc } from "./features/log"
import { createMainWindow } from "./core/window"
import { registerWindowIpc } from "./features/window"
import { registerUpdaterIpc } from "./features/updater"
import { prepareApp, registerAppLifecycle, requestSingleInstance } from "./core/app"
import { flushPendingDeepLink, registerDeeplinkListeners, registerProtocol } from "./features/deeplink"

// ===== 启动前同步准备 =====

prepareApp()

// 自定义协议注册必须在 requestSingleInstanceLock 之前
// 因为 Windows 下第二个实例会携带协议 URL 作为命令行参数
registerProtocol()

// deeplink 监听必须在 whenReady 之前注册
// macOS 冷启动的 open-url 可能在 ready 之前触发
registerDeeplinkListeners()

if (!requestSingleInstance()) {
  app.quit()
  process.exit(0)
}

// ===== 应用级 IPC 注册（与窗口无关的 handler 可以更早注册，但集中在此） =====

registerAppLifecycle()

// ===== 应用就绪后创建窗口 =====

app.whenReady().then(() => {
  // CSP 必须在创建窗口前设置，否则首次加载不会应用策略
  setupCSP()

  // 先创建主窗口，因为 registerWindowIpc 需要绑定窗口的 maximize 事件
  createMainWindow()

  // IPC handler 一次性注册，避免每次创建窗口都重复注册
  // 全部在 loadURL 完成前同步执行，渲染进程首次调用时 handler 一定已就绪
  registerWindowIpc()
  registerUpdaterIpc()
  registerLogIpc()

  // 处理 macOS 冷启动时暂存的深度链接
  flushPendingDeepLink()
})
