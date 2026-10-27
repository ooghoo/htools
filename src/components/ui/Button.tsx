import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cx } from '@/utils/cx'
import s from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** 左侧图标 */
  icon?: LucideIcon
  /** 右侧图标 */
  iconRight?: LucideIcon
  /** 撑满父容器宽度 */
  block?: boolean
  /** 只显示图标（自动应用方形尺寸，必须自行提供 aria-label） */
  iconOnly?: boolean
  loading?: boolean
  children?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  block = false,
  iconOnly = false,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      className={cx(
        s.base,
        s[variant],
        size === 'sm' && s.sm,
        block && s.block,
        iconOnly && s.icon,
        className,
      )}
    >
      {loading ? <span className={s.spinner} aria-hidden="true" /> : Icon ? <Icon aria-hidden="true" /> : null}
      {children}
      {IconRight && !loading ? <IconRight aria-hidden="true" /> : null}
    </button>
  )
}
