import { CopyButton } from './CopyButton'
import { cx } from '@/utils/cx'
import s from './ValueList.module.css'

export interface ValueItem {
  label: string
  /** 无值时传空串，行内显示占位符 */
  value: string
  /** 行尾的次要标记，例如「主要」 */
  flag?: string
  /** 强调这一行（例如用户最关心的那个结果） */
  emphasize?: boolean
}

export interface ValueListProps {
  items: ValueItem[]
  /** 值为空时的占位文案 */
  placeholder?: string
  className?: string
}

/** 结果列表：标签 + 等宽值 + 复制按钮，颜色 / 时间戳 / 字节换算共用 */
export function ValueList({ items, placeholder = '—', className }: ValueListProps) {
  return (
    <div className={cx(s.list, className)}>
      {items.map((item) => (
        <div key={item.label} className={cx(s.row, item.emphasize && s.emphasize)}>
          <span className={s.label}>{item.label}</span>
          <code className={s.value} data-empty={!item.value}>
            {item.value || placeholder}
          </code>
          {item.flag && <span className={s['emphasis-flag']}>{item.flag}</span>}
          <CopyButton
            value={item.value}
            iconOnly
            size="sm"
            variant="ghost"
            label={`复制 ${item.label}`}
            successMessage={`${item.label} 已复制`}
          />
        </div>
      ))}
    </div>
  )
}
