import type { ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cx } from '@/utils/cx'
import s from './Button.module.css'

export interface LinkButtonProps extends Omit<LinkProps, 'to'> {
  to: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  icon?: LucideIcon
  iconRight?: LucideIcon
  children?: ReactNode
}

const EXTERNAL = /^https?:\/\//i

/** 外观与 Button 一致的路由链接；传外部 URL 时自动降级为普通 <a> */
export function LinkButton({
  to,
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  const classes = cx(s.base, s[variant], size === 'sm' && s.sm, className)

  if (EXTERNAL.test(to)) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        style={{ textDecoration: 'none' }}
      >
        {Icon && <Icon aria-hidden="true" />}
        {children}
        {IconRight && <IconRight aria-hidden="true" />}
      </a>
    )
  }

  return (
    <Link {...rest} to={to} className={classes} style={{ textDecoration: 'none' }}>
      {Icon && <Icon aria-hidden="true" />}
      {children}
      {IconRight && <IconRight aria-hidden="true" />}
    </Link>
  )
}
