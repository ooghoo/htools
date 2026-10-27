import { cx } from '@/utils/cx'
import s from './Field.module.css'

export interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  /** 显示在数值后面的单位，例如 % / ° / em */
  suffix?: string
  decimals?: number
  onChange: (value: number) => void
  className?: string
}

/** 滑杆 + 实时数值，水印这类连续调节的调参必备 */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  decimals = 0,
  onChange,
  className,
}: SliderProps) {
  return (
    <div className={cx(s.slider, className)}>
      <div className={s['slider-head']}>
        <span className={s.label}>{label}</span>
        <span className={s['slider-value']}>
          {value.toFixed(decimals)}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        className={s.range}
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}
