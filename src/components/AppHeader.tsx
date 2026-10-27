import { Link } from 'react-router-dom'
import { Github, Moon, PanelLeft, Sun, Terminal } from 'lucide-react'
import { useTheme } from '@/app/contexts'
import s from './AppHeader.module.css'

const GITHUB_URL = 'https://github.com/ooghoo/htools'

interface AppHeaderProps {
  onToggleSidebar: () => void
  sidebarOpen: boolean
}

/** 全站统一顶栏：侧栏开关 / 品牌 / 标签 ｜ GitHub / 深浅色 */
export function AppHeader({ onToggleSidebar, sidebarOpen }: AppHeaderProps) {
  const { toggleTheme } = useTheme()

  return (
    <header className={s.topbar}>
      <div className={s.left}>
        <button
          type="button"
          className={s['icon-btn']}
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? '收起导航' : '展开导航'}
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
        >
          <PanelLeft aria-hidden="true" />
        </button>

        <Link to="/" className={s.brand} aria-label="返回工具首页">
          <span className={s.mark} aria-hidden="true">
            <Terminal />
          </span>
          <span className={s.name}>htools</span>
        </Link>

        <span className={s.sep} aria-hidden="true" />
        <span className={s.tagline}>个人 Web 工具集</span>
      </div>

      <div className={s.right}>
        <a
          className={s['icon-btn']}
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub 仓库"
        >
          <Github aria-hidden="true" />
        </a>
        <button
          type="button"
          className={`${s['icon-btn']} ${s.theme}`}
          onClick={toggleTheme}
          aria-label="切换深浅色模式"
        >
          <span>
            <Moon className={s.moon} aria-hidden="true" />
            <Sun className={s.sun} aria-hidden="true" />
          </span>
        </button>
      </div>
    </header>
  )
}
