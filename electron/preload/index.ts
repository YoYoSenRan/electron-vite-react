import { ipcRenderer, contextBridge } from "electron"

// --------- 向渲染进程暴露 API ---------
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})

// ----- 窗口控制 API -----
// macOS 由系统红绿灯处理，Win/Linux 自定义按钮通过此 API 调用主进程
contextBridge.exposeInMainWorld("windowControl", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  maximize: () => ipcRenderer.invoke("window:maximize"),
  close: () => ipcRenderer.invoke("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:is-maximized"),
  // 监听最大化状态变化（用于切换按钮图标）
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => {
    ipcRenderer.on("window:maximized-changed", (_event, isMaximized) => callback(isMaximized))
  },
  removeMaximizedChange: () => {
    ipcRenderer.removeAllListeners("window:maximized-changed")
  },
})

// ----- 日志 API -----
// 渲染进程无法直接写文件，通过 IPC 桥接到主进程的 electron-log
contextBridge.exposeInMainWorld("logger", {
  info: (...args: unknown[]) => ipcRenderer.send("log", "info", ...args),
  warn: (...args: unknown[]) => ipcRenderer.send("log", "warn", ...args),
  error: (...args: unknown[]) => ipcRenderer.send("log", "error", ...args),
  debug: (...args: unknown[]) => ipcRenderer.send("log", "debug", ...args),
})

// ----- 深度链接 API -----
// 当应用通过 electron-vite-react:// 协议被唤起时，主进程解析 URL 后推送到此
contextBridge.exposeInMainWorld("deepLink", {
  onDeepLink: (callback: (data: { path: string; query: Record<string, string> }) => void) => {
    ipcRenderer.on("deep-link", (_event, data) => callback(data))
  },
  removeDeepLink: () => {
    ipcRenderer.removeAllListeners("deep-link")
  },
})

// --------- 预加载脚本 ---------
function domReady(condition: DocumentReadyState[] = ["complete", "interactive"]) {
  return new Promise((resolve) => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    } else {
      document.addEventListener("readystatechange", () => {
        if (condition.includes(document.readyState)) {
          resolve(true)
        }
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find((e) => e === child)) {
      return parent.appendChild(child)
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find((e) => e === child)) {
      return parent.removeChild(child)
    }
  },
}

/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
function useLoading() {
  const className = `loaders-css__square-spin`
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `
  const oStyle = document.createElement("style")
  const oDiv = document.createElement("div")

  oStyle.id = "app-loading-style"
  oStyle.innerHTML = styleContent
  oDiv.className = "app-loading-wrap"
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    },
  }
}

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = useLoading()
domReady().then(appendLoading)

window.onmessage = (ev) => {
  if (ev.data.channel === "main-process-message") {
    removeLoading()
  }
}

setTimeout(removeLoading, 4999)
