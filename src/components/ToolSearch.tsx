import { useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import s from './ToolSearch.module.css'

export interface ToolSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** 结果数量，用于读屏播报，例如「3 个结果」 */
  resultLabel?: string
}

/** 首页搜索框：支持「/」聚焦、Esc 清空，输入即过滤 */
export function ToolSearch({ value, onChange, placeholder = '搜索工具、关键词…', resultLabel }: ToolSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const active = document.activeElement
      const tag = active?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      event.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const filled = value.length > 0

  return (
    <>
      <div className={s.wrap} data-filled={filled} role="search">
        <Search className={s.icon} aria-hidden="true" />
        <input
          ref={inputRef}
          className={s.input}
          type="search"
          value={value}
          placeholder={placeholder}
          aria-label="搜索工具"
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && value) {
              event.preventDefault()
              onChange('')
            }
          }}
        />
        <kbd className={s.kbd} aria-hidden="true">
          /
        </kbd>
        <button
          type="button"
          className={s.clear}
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
          aria-label="清空搜索"
        >
          <X aria-hidden="true" />
        </button>
      </div>
      {resultLabel && (
        <span className="live-region" aria-live="polite">
          {resultLabel}
        </span>
      )}
    </>
  )
}
