---
paths:
  - "electron/**/*.ts"
---

# IPC 设计模板

## 文件结构

每个 feature 在 `electron/features/<name>/` 下固定 5-6 个文件：

```
features/<name>/
├── index.ts        # barrel 导出
├── channels.ts     # IPC channel 常量（as const）
├── types.ts        # 类型定义（包括 Bridge 接口）
├── service.ts      # 业务逻辑，可选，复杂 feature 才拆
├── ipc.ts          # ipcMain.handle 注册，薄转发层
└── bridge.ts       # preload 暴露给 renderer 的 API
```

## 文件职责铁律

- `service.ts` 不 import `ipcMain`、不 import `BrowserWindow`（通过 `core/window` 的 `getMainWindow()` 获取）
- `ipc.ts` 不写业务逻辑，只做参数转发和 service 调用
- `bridge.ts` 不 import `service.ts`（会导致 main 代码污染 preload bundle）
- `channels.ts` 只放常量，`types.ts` 只放类型
- feature 之间禁止互相 import

## 模板代码

### channels.ts

```ts
export const windowChannels = {
  minimize: "window:minimize",
  maximize: "window:maximize",
  close: "window:close",
  isMaximized: "window:is-maximized",
  maximizedChanged: "window:maximized-changed",  // main → renderer
} as const
```

### types.ts

```ts
export interface WindowBridge {
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>
  /** 订阅最大化状态变化，返回取消订阅函数 */
  onMaximizedChange: (listener: (v: boolean) => void) => () => void
}
```

### ipc.ts

```ts
import { ipcMain } from "electron"
import { windowChannels } from "./channels"
import { getMainWindow } from "../../core/window"

export function registerWindowIpc(): void {
  ipcMain.handle(windowChannels.minimize, () => {
    getMainWindow()?.minimize()
  })
  // ...
}
```

### bridge.ts

```ts
import { ipcRenderer } from "electron"
import { windowChannels } from "./channels"
import type { WindowBridge } from "./types"

export const windowBridge: WindowBridge = {
  minimize: () => ipcRenderer.invoke(windowChannels.minimize),
  // ...
  onMaximizedChange(listener) {
    const handler = (_: unknown, v: boolean) => listener(v)
    ipcRenderer.on(windowChannels.maximizedChanged, handler)
    return () => ipcRenderer.off(windowChannels.maximizedChanged, handler)
  },
}
```

### index.ts（barrel）

```ts
export { windowBridge } from "./bridge"
export { registerWindowIpc } from "./ipc"
export type { WindowBridge } from "./types"
```

## 事件订阅模式

所有事件订阅 API **必须返回取消订阅函数**，由调用方在组件卸载时调用。**禁止**提供 `removeXxx` / `removeAllListeners` 这类暴力清理 API。

```ts
// ✅ 好：返回取消函数
onMaximizedChange(listener: (v: boolean) => void): () => void

// ❌ 坏：成对 API，清理粒度粗
onMaximizedChange(listener)
removeMaximizedChange()
```

## 添加新 feature 的步骤

1. `mkdir electron/features/<name>` 并创建上述 5-6 个文件
2. 在 `electron/main.ts` 加一行 `import { register<Name>Ipc } from "./features/<name>"` 并在 `whenReady` 中调用
3. 在 `electron/preload.ts` 的 `api` 对象中加一个键
4. renderer 端立即可用 `window.api.<name>.<method>`，类型自动出现

## 删除 feature 的步骤

1. `rm -rf electron/features/<name>`
2. 删 `main.ts` 和 `preload.ts` 中各一行 import + 一个键
3. 全局搜 `window.api.<name>` 清理 renderer 调用点
