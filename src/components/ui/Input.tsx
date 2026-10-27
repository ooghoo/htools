import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cx } from '@/utils/cx'
import s from './Field.module.css'

/** 控件尺寸：md 是表单默认，lg 用于「主输入」这类需要视觉重心的场景 */
export type ControlSize = 'md' | 'lg'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  invalid?: boolean
  /** 等宽字体，用于代码 / 数值类输入 */
  mono?: boolean
  /** 输入框右侧的固定内容，例如单位 */
  suffix?: ReactNode
  /** 输入框左侧的固定内容，例如 # */
  prefix?: ReactNode
  size?: ControlSize
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid = false, mono = false, suffix, prefix, size = 'md', className, disabled, ...rest },
  ref,
) {
  return (
    <div className={s.control} data-invalid={invalid} data-disabled={disabled} data-size={size}>
      {prefix && <span className={s.suffix}>{prefix}</span>}
      <input
        {...rest}
        ref={ref}
        disabled={disabled}
        className={cx(s.input, mono && s.mono, className)}
        aria-invalid={invalid || undefined}
      />
      {suffix && <span className={s.suffix}>{suffix}</span>}
    </div>
  )
})
