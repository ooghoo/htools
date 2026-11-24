import { memo, useMemo } from 'react'
import { Check, ChevronDown, CircleX, Download, FileArchive } from 'lucide-react'
import { sortBySequence } from '../lib/naming.ts'
import { formatBytes } from '@/utils/format'
import type { ExportPhase } from '../hooks/useZipExport.ts'
import type { ExportResult, ImageSource, SliceFile, SliceRegion } from '../types.ts'
import s from '../styles.module.css'

interface ResultsPanelProps {
  source: ImageSource
  files: SliceFile[]
  hovered: number | null
  selected: number | null
  onHover: (index: number | null) => void
  onSelect: (index: number | null) => void
  onDownload: (file: SliceFile) => void
  downloadingId: string | null
  collapsed: boolean
  onToggleCollapsed: () => void
  exportPhase: ExportPhase
  exportResult: ExportResult | null
  exportError: string | null
  onDownloadAgain: () => void
  onDismissExport: () => void
}

const THUMB_W = 128
const THUMB_H = 84

function Thumb({ source, region }: { source: ImageSource; region: SliceRegion }) {
  const scale = Math.min(THUMB_W / region.w, THUMB_H / region.h)
  return (
    <div className={s['thumb-wrap']}>
      <div
        className={s.thumb}
        style={{
          width: Math.max(1, region.w * scale),
          height: Math.max(1, region.h * scale),
          backgroundImage: `url("${source.url}")`,
          backgroundSize: `${source.width * scale}px ${source.height * scale}px`,
          backgroundPosition: `-${region.x * scale}px -${region.y * scale}px`,
        }}
      />
    </div>
  )
}

export const ResultsPanel = memo(function ResultsPanel({
  source,
  files,
  hovered,
  selected,
  onHover,
  onSelect,
  onDownload,
  downloadingId,
  collapsed,
  onToggleCollapsed,
  exportPhase,
  exportResult,
  exportError,
  onDownloadAgain,
  onDismissExport,
}: ResultsPanelProps) {
  const ordered = useMemo(() => sortBySequence(files), [files])

  return (
    <section className={s.results} data-collapsed={collapsed}>
      <div className={s['results-head']}>
        <div className={s['results-title']}>
          <FileArchive aria-hidden="true" />
          <h3>切片结果</h3>
          <span className={s['results-count']}>{files.length} 张</span>
        </div>

        {exportPhase === 'done' && exportResult && (
          <div className={s['export-notice']} data-tone="success" role="status">
            <Check aria-hidden="true" />
            <span>
              导出完成 · {exportResult.count} 张 · {formatBytes(exportResult.blob.size)}
            </span>
            <button type="button" onClick={onDownloadAgain}>
              重新下载
            </button>
            <button type="button" aria-label="关闭导出结果" onClick={onDismissExport}>
              <CircleX aria-hidden="true" />
            </button>
          </div>
        )}

        {exportPhase === 'error' && exportError && (
          <div className={s['export-notice']} data-tone="error" role="alert">
            <CircleX aria-hidden="true" />
            <span>{exportError}</span>
            <button type="button" aria-label="关闭错误提示" onClick={onDismissExport}>
              <CircleX aria-hidden="true" />
            </button>
          </div>
        )}

        <button
          type="button"
          className={s['collapse-btn']}
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
        >
          {collapsed ? '展开结果' : '收起结果'}
          <ChevronDown aria-hidden="true" data-up={!collapsed} />
        </button>
      </div>

      {!collapsed && (
        <div className={s['results-scroll'] + ' scroll-thin'}>
          {ordered.map((file) => {
            const busy = downloadingId === file.region.id
            return (
              <div
                key={file.region.id}
                className={s['slice-card']}
                data-selected={selected === file.region.index}
                data-hovered={hovered === file.region.index}
                onMouseEnter={() => onHover(file.region.index)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onSelect(file.region.index)}
              >
                <Thumb source={source} region={file.region} />
                <div className={s['card-body']}>
                  <div className={s['card-top']}>
                    <span className={s['card-index']}>{String(file.sequence).padStart(2, '0')}</span>
                    <button
                      type="button"
                      className={s['card-download']}
                      aria-label={`下载 ${file.filename}`}
                      title="下载此切片"
                      disabled={busy}
                      onClick={(event) => {
                        event.stopPropagation()
                        onDownload(file)
                      }}
                    >
                      <Download aria-hidden="true" />
                    </button>
                  </div>
                  <code title={file.filename}>{file.filename}</code>
                  <span className={s['card-dims']}>
                    {file.region.w} × {file.region.h} px
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
})
