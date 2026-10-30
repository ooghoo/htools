import { useState } from 'react'
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
  /** 数值可直接输入（默认允许范围同 min/max） */
  editable?: boolean
  /** 手输允许的最小值，默认等于 min */
  inputMin?: number
  /** 手输允许的最大值，默认等于 max */
  inputMax?: number
  onChange: (value: number) => void
  className?: string
}

/** 滑杆 + 实时数值；editable 时数值可手输，滑杆仍负责快速微调 */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  decimals = 0,
  editable = false,
  inputMin,
  inputMax,
  onChange,
  className,
}: SliderProps) {
  // 输入过程中保留用户敲的原文，避免被格式化回写打断
  const [draft, setDraft] = useState<string | null>(null)

  const lower = inputMin ?? min
  const upper = inputMax ?? max

  const clamp = (n: number) => Math.min(upper, Math.max(lower, n))

  const handleInput = (raw: string) => {
    setDraft(raw)
    const parsed = Number(raw)
    if (raw.trim() !== '' && Number.isFinite(parsed)) onChange(clamp(parsed))
  }

  return (
    <div className={cx(s.slider, className)}>
      <div className={s['slider-head']}>
        <span className={s.label}>{label}</span>

        {editable ? (
          <span className={s['slider-field']}>
            <input
              type="text"
              inputMode="numeric"
              className={s['slider-input']}
              value={draft ?? value.toFixed(decimals)}
              aria-label={label}
              onChange={(event) => handleInput(event.target.value)}
              onBlur={() => setDraft(null)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  setDraft(null)
                  event.currentTarget.blur()
                }
              }}
            />
            {suffix && <span className={s['slider-suffix']}>{suffix}</span>}
          </span>
        ) : (
          <span className={s['slider-value']}>
            {value.toFixed(decimals)}
            {suffix}
          </span>
        )}
      </div>

      <input
        type="range"
        className={s.range}
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}
