import { FileArchive, ImagePlus, LockKeyhole, Scissors, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatBytes, formatNumber } from '@/utils/format'
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
        <span className={s['brand-mark']} aria-hidden="true">
          <Scissors />
        </span>
        <span className={s['brand-text']}>
          <h1>Slice Studio</h1>
          <p>图片切割工作台 · 纯本地处理</p>
        </span>
      </div>

      <div className={s['header-right']}>
        <span className={s['privacy-pill']} title="所有读取、切割、编码、打包都在浏览器内完成">
          <LockKeyhole aria-hidden="true" />
          仅本地处理
        </span>

        {source && (
          <div className={s['source-meta']}>
            <span className={s['source-name']} title={source.name}>
              {source.name}
            </span>
            <span className={s['meta-sep']} aria-hidden="true" />
            <span className={s['meta-mono']}>
              {formatNumber(source.width)} × {formatNumber(source.height)}
            </span>
            <span className={s['meta-sep']} aria-hidden="true" />
            <span className={s['meta-mono']}>{source.format}</span>
            <span className={s['meta-sep']} aria-hidden="true" />
            <span className={s['meta-mono']}>{formatBytes(source.size)}</span>
          </div>
        )}

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
