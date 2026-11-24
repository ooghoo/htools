import { FileArchive, X } from 'lucide-react'
import type { ExportProgress } from '../types.ts'
import s from '../styles.module.css'

interface ExportOverlayProps {
  progress: ExportProgress | null
  onCancel: () => void
}

export function ExportOverlay({ progress, onCancel }: ExportOverlayProps) {
  const percent = Math.round((progress?.percent ?? 0) * 100)
  const packing = progress?.phase === 'packing'

  return (
    <div className={s['export-overlay']} role="status" aria-live="polite">
      <div className={s['export-card']}>
        <span className={s['export-icon']} aria-hidden="true">
          <FileArchive />
        </span>
        <div className={s['export-copy']}>
          <strong>{packing ? '正在生成 ZIP…' : '正在编码切片…'}</strong>
          <span>
            {packing
              ? '在浏览器本地打包，图片不会上传'
              : `${progress?.current ?? 0} / ${progress?.total ?? 0} 张 · 后台线程处理，界面保持可用`}
          </span>
        </div>
        <div className={s['export-progress']}>
          <div className={s['export-track']}>
            <span style={{ width: `${percent}%` }} />
          </div>
          <span className={s['export-percent']}>{percent}%</span>
        </div>
        <button type="button" className={s['export-cancel']} onClick={onCancel}>
          <X aria-hidden="true" />
          取消导出
        </button>
      </div>
    </div>
  )
}
