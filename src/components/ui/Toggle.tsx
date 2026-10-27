import s from './Field.module.css'

export interface ToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/** 开关：一行内左侧文案 + 右侧 switch */
export function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div className={s['toggle-row']}>
      <span className={s['toggle-text']}>
        <span className={s['toggle-label']}>{label}</span>
        {description && <span className={s['toggle-desc']}>{description}</span>}
      </span>
      <label className={s.switch}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-label={label}
        />
        <span className={s['switch-track']} aria-hidden="true" />
        <span className={s['switch-thumb']} aria-hidden="true" />
      </label>
    </div>
  )
}
