import type { LucideIcon } from 'lucide-react'
import { cx } from '@/utils/cx'
import s from './ToolIcon.module.css'

export type ToolIconSize = 'sm' | 'md' | 'lg'

export interface ToolIconProps {
  icon: LucideIcon
  /** 图标底色，来自工具 manifest 的 accent */
  accent?: string
  size?: ToolIconSize
  className?: string
}

/** 工具图标底色块：首页卡片、侧栏、工具页头共用，保证同一个工具在各处长得一样 */
export function ToolIcon({ icon: Icon, accent, size = 'md', className }: ToolIconProps) {
  return (
    <span
      className={cx(s.tile, s[size], className)}
      style={accent ? { backgroundColor: accent } : undefined}
      aria-hidden="true"
    >
      <Icon />
    </span>
  )
}
