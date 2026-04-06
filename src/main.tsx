import React from "react"
import ReactDOM from "react-dom/client"
import { HashRouter } from "react-router"
import { ThemeProvider } from "@/components/theme-provider"
import App from "./App"

import "./i18n"
import "./styles/globals.css"

import "./demos/ipc"
// 如需使用 Node.js，需要在主进程中启用 nodeIntegration
// import './demos/node'

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system">
      <HashRouter>
        <App />
      </HashRouter>
    </ThemeProvider>
  </React.StrictMode>,
)

postMessage({ payload: "removeLoading" }, "*")
