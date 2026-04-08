import { Route, Routes } from "react-router"
import Demo from "@/pages/demo"
import { TitleBar } from "@/components/layout/titlebar"
import { useThemeEffect } from "@/hooks/use-theme-effect"
import "./App.css"

function App() {
  useThemeEffect()

  return (
    <>
      <TitleBar />
      <Routes>
        <Route path="/" element={<Demo />} />
      </Routes>
    </>
  )
}

export default App
