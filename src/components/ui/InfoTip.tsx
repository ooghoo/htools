import { useId } from 'react'
import { HelpCircle } from 'lucide-react'
import { cx } from '@/utils/cx'
import s from './InfoTip.module.css'

export interface InfoTipProps {
  /** 悬浮时显示的说明文字 */
  text: string
  /** 图标的可访问名称 */
  label?: string
  className?: string
}

/** 标签后面的小问号：鼠标移入或键盘聚焦时显示说明 */
export function InfoTip({ text, label = '查看说明', className }: InfoTipProps) {
  const id = useId()

  return (
    <span className={cx(s.wrap, className)}>
      <button type="button" className={s.btn} aria-label={label} aria-describedby={id}>
        <HelpCircle aria-hidden="true" />
      </button>
      <span className={s.tip} role="tooltip" id={id}>
        {text}
      </span>
    </span>
  )
}
