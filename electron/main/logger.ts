import log from "electron-log/main"
import { app, ipcMain } from "electron"

// 初始化 electron-log，必须在 app.whenReady() 之前调用
log.initialize()

// 文件轮转：单文件最大 5MB
log.transports.file.maxSize = 5 * 1024 * 1024

// 日志格式：时间 + 级别 + 内容
log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}"

// 环境策略：生产写文件，开发写控制台
if (app.isPackaged) {
  log.transports.file.level = "info"
  log.transports.console.level = false
} else {
  log.transports.file.level = false
  log.transports.console.level = "debug"
}

// 捕获未处理的异常和 Promise rejection，写入日志文件
log.errorHandler.startCatching()

// 接收渲染进程的日志请求
// 渲染进程无法直接写文件，通过 IPC 桥接到主进程的 electron-log
ipcMain.on("log", (_event, level: string, ...args: unknown[]) => {
  const logFn = log[level as keyof typeof log]
  if (typeof logFn === "function") {
    ;(logFn as (...args: unknown[]) => void)(...args)
  }
})

export default log
