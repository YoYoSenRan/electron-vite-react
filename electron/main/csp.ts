import { session } from "electron"

/**
 * 设置 Content Security Policy
 * 通过 HTTP 响应头注入，比 <meta> 标签更安全（无法被页面脚本篡改）
 *
 * @param isDev - true 时放宽策略，允许 Vite HMR 所需的 WebSocket 和 eval
 */
export function setupCSP(isDev: boolean): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? // 开发环境：unsafe-eval 供 Vite HMR，ws://127.0.0.1 供 WebSocket 热更新
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws://127.0.0.1:* http://127.0.0.1:*; media-src 'self'; object-src 'none'"
      : // 生产环境：严格限制，仅允许必要的外部 HTTPS 资源
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    })
  })
}
