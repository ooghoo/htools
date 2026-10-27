import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cx } from '@/utils/cx'
import s from './Field.module.css'

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
  /** 是否使用等宽字体，默认 true（文本类工具基本都是代码） */
  mono?: boolean
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { invalid = false, mono = true, className, style, ...rest },
  ref,
) {
  return (
    <textarea
      {...rest}
      ref={ref}
      aria-invalid={invalid || undefined}
      data-invalid={invalid}
      className={cx(s.textarea, className)}
      style={{ fontFamily: mono ? undefined : 'var(--font-sans)', ...style }}
    />
  )
})
