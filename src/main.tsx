import React from "react"
import ReactDOM from "react-dom/client"
import { HashRouter } from "react-router"
import { ThemeProvider } from "@/components/providers/theme"
import App from "./App"

import "./i18n"
import "./styles/globals.css"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system">
      <HashRouter>
        <App />
      </HashRouter>
    </ThemeProvider>
  </React.StrictMode>,
)
