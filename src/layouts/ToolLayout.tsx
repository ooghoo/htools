import { useLayoutEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ArrowLeft, Heart } from 'lucide-react'
import { useFavorites } from '@/app/contexts'
import { categoryLabel } from '@/registry/categories'
import type { ToolDefinition } from '@/types/tool'
import s from './ToolLayout.module.css'

interface ToolLayoutProps {
  tool: ToolDefinition
  children: ReactNode
}

/**
 * 工具页统一框架：返回入口 / 名称 / 说明 / 分类 / 收藏 + 工具自己的内容区。
 * 头部固定渲染在 AppLayout 的 #tool-head-slot 中（始终固定，与下方滚动内容不在同一层）；
 * 工具内部内容区随页面滚动。
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
      <Link to="/" className={s.back} aria-label="返回全部工具">
        <ArrowLeft aria-hidden="true" />
      </Link>

      <div className={s.titles}>
        <div className={s['title-group']}>
          <h1 className={s.title}>{tool.name}</h1>
          <span className={s.tag}>{categoryLabel(tool.category)}</span>
        </div>
        <p className={s.desc}>{tool.description}</p>
      </div>

      <button
        type="button"
        className={s.fav}
        data-on={favorite}
        aria-pressed={favorite}
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
      <div className={s.body}>{children}</div>
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
