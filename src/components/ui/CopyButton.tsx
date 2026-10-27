import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button, type ButtonProps } from './Button'
import { useToast } from '@/app/contexts'
import { copyText } from '@/utils/clipboard'

export interface CopyButtonProps
  extends Omit<ButtonProps, 'icon' | 'onClick' | 'children' | 'loading'> {
  /** 要复制的内容；为空串时按钮自动禁用 */
  value: string
  /** 按钮文案，图标模式下可不填 */
  label?: string
  /** 复制成功后提示的文案 */
  successMessage?: string
}

/** 复制按钮：统一处理成功 / 失败反馈，避免每个工具各写一套 */
export function CopyButton({
  value,
  label = '复制',
  successMessage = '已复制到剪贴板',
  iconOnly = false,
  variant = 'secondary',
  size = 'md',
  disabled,
  ...rest
}: CopyButtonProps) {
  const { notify } = useToast()
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  async function handleClick() {
    const ok = await copyText(value)
    if (!ok) {
      notify('复制失败，请手动选中后复制', 'error')
      return
    }
    setCopied(true)
    notify(successMessage)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <Button
      {...rest}
      variant={variant}
      size={size}
      iconOnly={iconOnly}
      disabled={disabled || !value}
      onClick={handleClick}
      icon={copied ? Check : Copy}
      aria-label={iconOnly ? (copied ? '已复制' : label) : undefined}
      title={iconOnly ? label : undefined}
    >
      {iconOnly ? null : copied ? '已复制' : label}
    </Button>
  )
}
