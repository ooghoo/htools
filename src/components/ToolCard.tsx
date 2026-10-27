import { Link } from 'react-router-dom'
import { ArrowUpRight, Heart } from 'lucide-react'
import { useFavorites } from '@/app/contexts'
import { categoryLabel } from '@/registry/categories'
import type { ToolDefinition } from '@/types/tool'
import { cx } from '@/utils/cx'
import { ToolIcon } from './ToolIcon'
import s from './ToolCard.module.css'

export interface ToolCardProps {
  tool: ToolDefinition
  variant?: 'card' | 'row'
  /** 列表序号，用于入场动画的轻微错峰 */
  index?: number
}

export function ToolCard({ tool, variant = 'card', index = 0 }: ToolCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const favorite = isFavorite(tool.id)
  const href = `/tools/${tool.id}`
  const label = `打开 ${tool.name}`

  const favButton = (
    <button
      type="button"
      className={cx(s.fav, variant === 'row' && s['row-fav'])}
      data-on={favorite}
      aria-pressed={favorite}
      aria-label={favorite ? `取消收藏 ${tool.name}` : `收藏 ${tool.name}`}
      title={favorite ? '取消收藏' : '收藏'}
      onClick={() => toggleFavorite(tool.id)}
    >
      <Heart aria-hidden="true" />
    </button>
  )

  if (variant === 'row') {
    return (
      <div className={s.row}>
        <Link to={href} className={s.hit} aria-label={label} />
        <div className={s.head}>
          <ToolIcon icon={tool.icon} accent={tool.accent} size="sm" />
          <span className={s['row-text']}>
            <span className={s['row-title']}>{tool.name}</span>
            <span className={s['row-desc']}>{tool.description}</span>
          </span>
        </div>
        <div className={s['row-meta']}>
          <span className={s.tag}>{categoryLabel(tool.category)}</span>
        </div>
        {favButton}
      </div>
    )
  }

  return (
    <article className={s.card} style={{ animationDelay: `${Math.min(index, 8) * 24}ms` }}>
      <Link to={href} className={s.hit} aria-label={label} />
      <div className={s.head}>
        <ToolIcon icon={tool.icon} accent={tool.accent} />
        <h3 className={s.title}>{tool.name}</h3>
      </div>
      <p className={s.desc}>{tool.description}</p>
      <div className={s.foot}>
        <span className={s.tag}>{categoryLabel(tool.category)}</span>
        <span className={s.open}>
          打开
          <ArrowUpRight aria-hidden="true" />
        </span>
      </div>
      {favButton}
    </article>
  )
}
