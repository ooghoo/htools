import s from './Field.module.css'

export interface ChipOption<T extends string | number> {
  value: T
  label: string
}

export interface ChipsProps<T extends string | number> {
  options: ChipOption<T>[]
  value: T | null
  onChange: (value: T) => void
  ariaLabel: string
}

/** 一组可单选的快捷标签（预设、角度、导出尺寸等） */
export function Chips<T extends string | number>({ options, value, onChange, ariaLabel }: ChipsProps<T>) {
  return (
    <div className={s.chips} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          className={s.chip}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
