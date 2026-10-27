import { createPortal } from 'react-dom'
import { Check, Info, TriangleAlert } from 'lucide-react'
import type { ToastTone } from '@/app/contexts'
import s from './Toast.module.css'

export interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

const TONE_ICON = {
  success: Check,
  error: TriangleAlert,
  info: Info,
} as const

interface ToastViewportProps {
  items: ToastItem[]
  onDismiss: (id: number) => void
}

/** 全局轻提示容器：挂在 body 上，不受页面布局与 overflow 影响 */
export function ToastViewport({ items, onDismiss }: ToastViewportProps) {
  if (typeof document === 'undefined' || items.length === 0) return null

  return createPortal(
    <div className={s.viewport} role="status" aria-live="polite">
      {items.map((item) => {
        const Icon = TONE_ICON[item.tone]
        return (
          <div
            key={item.id}
            className={s.toast}
            data-tone={item.tone}
            onClick={() => onDismiss(item.id)}
          >
            <Icon aria-hidden="true" />
            <span>{item.message}</span>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}
