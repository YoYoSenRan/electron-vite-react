# Import 与 Export 规则

## Import

1. **单块不分组** —— 所有 import 合并成一个代码块，**不用空行**区分第三方/本地/类型
2. **按行长度升序排序** —— 短的在上，长的在下
3. **side-effect 导入有严格顺序要求时优先保留在顶部**，不参与长度排序

```ts
// ✅ 正确
import "./core/logger"              // side-effect，必须最先
import "./core/paths"               // side-effect
import { app } from "electron"
import { setupCSP } from "./core/security"
import { registerLogIpc } from "./features/log"
import { createMainWindow } from "./core/window"
import { registerWindowIpc } from "./features/window"
import { registerUpdaterIpc } from "./features/updater"
import { prepareApp, registerAppLifecycle, requestSingleInstance } from "./core/app"

// ❌ 错误：分组 + 字母序
import { app } from "electron"

import { createMainWindow } from "./core/window"
import { setupCSP } from "./core/security"
```

## Export（barrel index.ts）

同样按**行长度升序**排序：

```ts
// ✅ 正确
export { logBridge } from "./bridge"
export { registerLogIpc } from "./ipc"
export type { LogBridge } from "./types"
```

## 类型描述同文件实现时前置

当 `export type X = typeof x` 描述的是**同文件下方的运行时值**时，类型声明写在实现之前（利用 TS 类型提升）：

```ts
// ✅ 正确
export type Api = typeof api

const api = {
  log: logBridge,
  window: windowBridge,
  updater: updaterBridge,
} as const

contextBridge.exposeInMainWorld("api", api)
```

## 对象字面量键顺序

对象字面量的键也按**行长度升序**排列：

```ts
// ✅ 正确
const api = {
  log: logBridge,
  window: windowBridge,
  updater: updaterBridge,
  deeplink: deeplinkBridge,
} as const
```
