import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { cx } from '@/utils/cx'
import s from './Field.module.css'

export interface FieldProps {
  label?: string
  /** 与控件 id 关联，点击 label 时聚焦控件 */
  htmlFor?: string
  hint?: ReactNode
  /** 有值时替代 hint 显示，并进入错误态 */
  error?: string
  optional?: boolean
  /** 标签行右侧的附加操作，例如「随机」「示例」按钮 */
  action?: ReactNode
  className?: string
  children: ReactNode
}

/** 统一的表单字段外壳：标签 + 控件 + 说明/错误 */
export function Field({ label, htmlFor, hint, error, optional, action, className, children }: FieldProps) {
  return (
    <div className={cx(s.field, className)}>
      {(label || action) && (
        <div className={s['label-row']}>
          {label && (
            <label className={s.label} htmlFor={htmlFor}>
              {label}
              {optional && <span className={s.optional}>选填</span>}
            </label>
          )}
          {action}
        </div>
      )}
      {children}
      {error ? (
        <p className={s.error} role="alert">
          <TriangleAlert aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className={s.hint}>{hint}</p>
      ) : null}
    </div>
  )
}
