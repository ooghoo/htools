import { FileArchive, ImagePlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { ImageSource } from '../types.ts'
import s from '../styles.module.css'

interface ToolHeaderProps {
  source: ImageSource | null
  count: number
  exporting: boolean
  onPick: () => void
  onClear: () => void
  onExport: () => void
}

/** 顶部只保留中文工具名与真实操作；图标、副标题、隐私标签和图片元信息已移除 */
export function ToolHeader({
  source,
  count,
  exporting,
  onPick,
  onClear,
  onExport,
}: ToolHeaderProps) {
  return (
    <header className={s.header}>
      <div className={s['header-brand']}>
        <span className={s['brand-text']}>
          <h1>图片切割</h1>
        </span>
      </div>

      <div className={s['header-right']}>
        {source && (
          <>
            <Button size="sm" icon={ImagePlus} onClick={onPick}>
              更换图片
            </Button>
            <Button size="sm" variant="ghost" icon={Trash2} onClick={onClear} aria-label="清空图片">
              清空
            </Button>
          </>
        )}

        <Button
          variant="primary"
          size="sm"
          icon={FileArchive}
          loading={exporting}
          disabled={!source || count === 0}
          onClick={onExport}
        >
          {exporting ? '正在打包' : '导出 ZIP'}
        </Button>
      </div>
    </header>
  )
}
