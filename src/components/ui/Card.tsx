import type { ReactNode } from 'react'
import { cx } from '@/utils/cx'
import s from './Card.module.css'

export interface CardProps {
  title?: ReactNode
  subtitle?: ReactNode
  /** 标题右侧的操作区 */
  action?: ReactNode
  /** 居中窄卡，适合单列表单式工具 */
  narrow?: boolean
  /** 内容自带内边距时使用（例如铺满的列表） */
  flush?: boolean
  className?: string
  bodyClassName?: string
  children?: ReactNode
}

export function Card({
  title,
  subtitle,
  action,
  narrow = false,
  flush = false,
  className,
  bodyClassName,
  children,
}: CardProps) {
  return (
    <section className={cx(s.card, narrow && s.narrow, className)}>
      {(title || action) && (
        <header className={s.head}>
          <div className={s['head-text']}>
            {title && <h2 className={s.title}>{title}</h2>}
            {subtitle && <p className={s.subtitle}>{subtitle}</p>}
          </div>
          {action && <div className={s['head-action']}>{action}</div>}
        </header>
      )}
      <div className={cx(s.body, flush && s['body-flush'], bodyClassName)}>{children}</div>
    </section>
  )
}
