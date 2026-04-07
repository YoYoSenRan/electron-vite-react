# 命名规则

| 类型 | 规则 | 例子 |
|---|---|---|
| 文件名 | 小写 + 单个单词 | `service.ts` `bridge.ts` |
| 目录名 | 小写 + 单个单词 | `updater/` `deeplink/` |
| 函数名 | camelCase + 动词开头 | `createWindow` `checkUpdate` |
| 类型/接口 | PascalCase + 名词 | `UpdateInfo` `WindowBridge` |
| 常量 | UPPER_SNAKE_CASE | `CHECK_INTERVAL_MS` |
| Boolean | is/has/can/should 前缀 | `isDev` `hasUpdate` `canQuit` |
| 私有函数 | 不导出即可，无需 `_` 前缀 | — |

## 函数命名约束

- 动词开头（`checkUpdate` / `downloadFile`）
- 禁用万金油动词（`handle` / `process` / `do`）
- 一个函数只做一件事，函数名要能完整描述这件事
