import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Heart } from 'lucide-react'
import { useFavorites } from '@/app/contexts'
import { ToolIcon } from '@/components/ToolIcon'
import { categoryLabel } from '@/registry/categories'
import type { ToolDefinition } from '@/types/tool'
import s from './ToolLayout.module.css'

interface ToolLayoutProps {
  tool: ToolDefinition
  children: ReactNode
}

/**
 * 工具页统一框架：返回入口 / 名称 / 说明 / 分类 / 收藏 + 工具自己的内容区。
 * 工具内部布局各不相同，但这一层保持一致。
 */
export function ToolLayout({ tool, children }: ToolLayoutProps) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const favorite = isFavorite(tool.id)

  return (
    <>
      <div className={s.head}>
        <Link to="/" className={s.back}>
          <ArrowLeft aria-hidden="true" />
          全部工具
        </Link>

        <div className={s.identity}>
          <ToolIcon icon={tool.icon} accent={tool.accent} size="lg" />
          <div className={s.titles}>
            <div className={s['title-row']}>
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
      </div>

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
