import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cx } from '@/utils/cx'
import s from './EmptyState.module.css'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

/** 空状态：无搜索结果、无收藏、无数据时统一用这个 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cx(s.empty, className)}>
      {Icon && (
        <span className={s.icon} aria-hidden="true">
          <Icon />
        </span>
      )}
      <p className={s.title}>{title}</p>
      {description && <p className={s.description}>{description}</p>}
      {action && <div className={s.action}>{action}</div>}
    </div>
  )
}
