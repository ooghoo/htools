import { cx } from '@/utils/cx'
import s from './Field.module.css'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedProps<T extends string> {
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  /** 组的可访问名称，例如「时间单位」 */
  ariaLabel: string
  className?: string
}

/** 2~4 项的互斥切换：比 select 少一次点击，比 radio 更紧凑 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: SegmentedProps<T>) {
  return (
    <div className={cx(s.seg, className)} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={s['seg-btn']}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
