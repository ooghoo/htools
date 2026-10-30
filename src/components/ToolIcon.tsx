import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cx } from '@/utils/cx'
import s from './ToolIcon.module.css'

export type ToolIconSize = 'sm' | 'md' | 'lg'

export interface ToolIconProps {
  icon: LucideIcon
  /** 图标主色，来自工具 manifest 的 accent */
  accent?: string
  size?: ToolIconSize
  className?: string
}

/**
 * 工具图标：浅色底 + 同色系线条。
 *
 * 底色与线条都由 accent 派生（color-mix），不写死任何色值，
 * 因此浅色 / 深色两套主题下都是同一个形状、同一种气质。
 * 首页卡片、列表行、侧栏、工具页头全部用这一个组件，保证同一工具处处一致。
 */
export function ToolIcon({ icon: Icon, accent, size = 'md', className }: ToolIconProps) {
  return (
    <span
      className={cx(s.tile, s[size], className)}
      style={accent ? ({ '--tile-accent': accent } as CSSProperties) : undefined}
      aria-hidden="true"
    >
      <Icon />
    </span>
  )
}
