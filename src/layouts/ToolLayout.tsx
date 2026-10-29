import { useLayoutEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Heart, House } from 'lucide-react'
import { useFavorites } from '@/app/contexts'
import type { ToolDefinition } from '@/types/tool'
import s from './ToolLayout.module.css'

interface ToolLayoutProps {
  tool: ToolDefinition
  children: ReactNode
}

/**
 * 工具页统一框架。
 *
 * 顶部是固定的面包屑条（首页 / 工具名 + 收藏），渲染在 AppLayout 的 #tool-head-slot 里，
 * 与下方滚动内容不在同一层；标题区默认由平台渲染，工具声明 customHeader 时改由工具自己画。
 */
export function ToolLayout({ tool, children }: ToolLayoutProps) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const favorite = isFavorite(tool.id)
  const [headSlot, setHeadSlot] = useState<HTMLElement | null>(null)

  // 插槽由 AppLayout 常驻渲染，挂载后即可把头部 portal 进去
  useLayoutEffect(() => {
    setHeadSlot(document.getElementById('tool-head-slot'))
  }, [])

  const head = (
    <div className={s.head}>
      <nav className={s.crumbs} aria-label="面包屑">
        <Link to="/" className={s['crumb-home']}>
          <House className={s['crumb-icon']} aria-hidden="true" />
          <span className={s['crumb-text']}>首页</span>
        </Link>
        <span className={s['crumb-sep']} aria-hidden="true">
          /
        </span>
        <span className={s['crumb-current']} aria-current="page">
          {tool.name}
        </span>
      </nav>

      <button
        type="button"
        className={s.fav}
        data-on={favorite}
        aria-pressed={favorite}
        aria-label={favorite ? `取消收藏 ${tool.name}` : `收藏 ${tool.name}`}
        onClick={() => toggleFavorite(tool.id)}
      >
        <Heart aria-hidden="true" />
        <span>{favorite ? '已收藏' : '收藏'}</span>
      </button>
    </div>
  )

  return (
    <>
      {headSlot ? createPortal(head, headSlot) : head}
      <div className={s.body}>
        {!tool.customHeader && (
          <header className={s['page-head']}>
            <h1 className={s['page-title']}>{tool.name}</h1>
            <p className={s['page-desc']}>{tool.pageDescription ?? tool.description}</p>
          </header>
        )}
        {children}
      </div>
    </>
  )
}

export function ToolLoading() {
  return (
    <div className={s.loading} role="status">
      <span className={s.spinner} aria-hidden="true" />
      正在加载工具…
    </div>
  )
}
