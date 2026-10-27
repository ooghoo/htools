import type { SelectHTMLAttributes } from 'react'
import { cx } from '@/utils/cx'
import type { ControlSize } from './Input'
import s from './Field.module.css'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
}

export interface SelectProps<T extends string = string>
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value' | 'size'> {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  size?: ControlSize
}

/** 原生 select：移动端自带系统选择器，键盘可达，不需要自己写弹层 */
export function Select<T extends string = string>({
  value,
  options,
  onChange,
  size = 'md',
  className,
  ...rest
}: SelectProps<T>) {
  return (
    <select
      {...rest}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      data-size={size}
      className={cx(s.select, className)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
