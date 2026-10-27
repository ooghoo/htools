import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/**
 * 部署说明
 * - base 用相对路径 './'：产物可以放在任意子路径（GitHub Pages 项目站点 /<repo>/、自定义域名根目录、
 *   甚至本地 file:// 直接打开 dist/index.html）都不用改配置，也不会把开发机的绝对路径写进产物。
 * - 路由用 HashRouter（见 src/app/App.tsx）：URL 形如 /#/tools/color-converter，
 *   hash 部分不参与服务端请求，因此静态托管不需要任何 SPA 回退规则，刷深链也不会 404。
 */
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 5173,
  },
})
