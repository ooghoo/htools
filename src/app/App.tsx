import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { HomePage } from '@/pages/HomePage'
import { AboutPage } from '@/pages/AboutPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ToolPage } from '@/pages/ToolPage'

/**
 * 路由用 HashRouter：
 * - GitHub Pages 之类的静态托管不支持 SPA 回退，深层路径刷新会 404；
 *   hash 部分不参与服务端请求，因此 /#/tools/color-converter 刷新永远能打开。
 * - 同一个 dist 目录可以放在任意子路径（甚至 file:// 直接打开），不用改 base。
 * 路由更新依然走 History API 的 hash 模式，浏览器前进 / 后退正常工作。
 */
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/tools/:toolId" element={<ToolPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
