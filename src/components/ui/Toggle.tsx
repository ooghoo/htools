import { InfoTip } from './InfoTip'
import s from './Field.module.css'

export interface ToggleProps {
  label: string
  description?: string
  /** 标签后面的问号说明，悬浮时展开 */
  labelTip?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/** 开关：一行内左侧文案 + 右侧 switch */
export function Toggle({ label, description, labelTip, checked, onChange }: ToggleProps) {
  return (
    <div className={s['toggle-row']}>
      <span className={s['toggle-text']}>
        <span className={s['toggle-label']}>
          {label}
          {labelTip && <InfoTip text={labelTip} label={`${label} 说明`} />}
        </span>
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
