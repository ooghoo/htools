import { Link, useLocation } from 'react-router-dom'
import { Clock, Heart, LayoutGrid, X } from 'lucide-react'
import { useFavorites, useRecentTools } from '@/app/contexts'
import { resolveToolsByIds } from '@/registry/tools'
import type { ToolDefinition } from '@/types/tool'
import { cx } from '@/utils/cx'
import { ToolIcon } from './ToolIcon'
import s from './Sidebar.module.css'

interface SidebarProps {
  tools: ToolDefinition[]
}

/**
 * 侧栏：全站共用同一份，首页 / 工具页 / 关于页的左侧区域完全一致。
 * 结构固定为三组：导航（全部工具）→ 最近使用 → 收藏 → 工具列表，图标统一走 ToolIcon。
 */
export function Sidebar({ tools }: SidebarProps) {
  const { favorites, toggleFavorite } = useFavorites()
  const { recent } = useRecentTools()
  const location = useLocation()

  const isHome = location.pathname === '/'
  const activeToolId = location.pathname.startsWith('/tools/')
    ? location.pathname.slice('/tools/'.length)
    : null
  const favoriteTools = resolveToolsByIds(favorites)
  // 侧栏只留最近两条，多了会挤占收藏与工具列表
  const recentTools = resolveToolsByIds(recent.map((entry) => entry.id)).slice(0, 2)

  return (
    <aside className={s.sidebar} id="app-sidebar" aria-label="主导航">
      <nav className={cx(s.nav, 'scroll-thin')}>
        <div className={s.group}>
          <Link to="/" className={s.item} aria-current={isHome ? 'page' : undefined}>
            <LayoutGrid aria-hidden="true" />
            <span className={s['item-name']}>全部工具</span>
          </Link>
        </div>

        {recentTools.length > 0 && (
          <div className={s.group}>
            <p className={s['group-label']}>
              <Clock aria-hidden="true" />
              最近使用
            </p>
            {recentTools.map((tool) => (
              <Link
                key={tool.id}
                to={`/tools/${tool.id}`}
                className={s.item}
                aria-current={activeToolId === tool.id ? 'page' : undefined}
              >
                <ToolIcon icon={tool.icon} accent={tool.accent} size="sm" />
                <span className={s['item-name']}>{tool.name}</span>
              </Link>
            ))}
          </div>
        )}

        <div className={s.group}>
          <p className={s['group-label']}>
            <Heart aria-hidden="true" />
            收藏
          </p>
          {favoriteTools.length === 0 ? (
            <p className={s.hint}>还没有收藏 —— 点卡片右上角的心形，就能固定到这里。</p>
          ) : (
            favoriteTools.map((tool) => (
              <div
                key={tool.id}
                className={s['fav-row']}
                data-active={activeToolId === tool.id ? 'true' : undefined}
              >
                <Link
                  to={`/tools/${tool.id}`}
                  className={s['fav-link']}
                  aria-current={activeToolId === tool.id ? 'page' : undefined}
                >
                  <ToolIcon icon={tool.icon} accent={tool.accent} size="sm" />
                  <span>{tool.name}</span>
                </Link>
                <button
                  type="button"
                  className={s.remove}
                  onClick={() => toggleFavorite(tool.id)}
                  aria-label={`取消收藏 ${tool.name}`}
                  title="取消收藏"
                >
                  <X aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className={s.group}>
          <p className={s['group-label']}>工具</p>
          {tools.map((tool) => (
            <Link
              key={tool.id}
              to={`/tools/${tool.id}`}
              className={s.item}
              aria-current={activeToolId === tool.id ? 'page' : undefined}
            >
              <ToolIcon icon={tool.icon} accent={tool.accent} size="sm" />
              <span className={s['item-name']}>{tool.name}</span>
            </Link>
          ))}
        </div>
      </nav>

      <p className={s.foot}>
        <Link to="/about" className={s['foot-link']}>
          关于
        </Link>
        <br />
        © 2026 ooghoo
        <br />
        Hosted on GitHub Pages
      </p>
    </aside>
  )
}
