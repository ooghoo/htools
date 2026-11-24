import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent as ReactChangeEvent,
  type DragEvent as ReactDragEvent,
} from 'react'
import { CircleX } from 'lucide-react'
import { useToast } from '@/app/contexts'
import { ACCEPT_ATTR, DEFAULT_EXPORT } from './lib/constants.ts'
import { downloadSingleSlice } from './lib/download.ts'
import {
  computeCustomRegions,
  computeGridRegions,
  normalizeCuts,
  normalizeGrid,
  segmentSizes,
  splitBoundaries,
} from './lib/grid.ts'
import { imageFromClipboard } from './lib/image.ts'
import { buildSliceFiles, effectivePrefix } from './lib/naming.ts'
import { useCanvasView } from './hooks/useCanvasView.ts'
import { useImageSource } from './hooks/useImageSource.ts'
import { useZipExport } from './hooks/useZipExport.ts'
import { CanvasStage } from './components/CanvasStage.tsx'
import { EmptyImport } from './components/EmptyImport.tsx'
import { ExportOverlay } from './components/ExportOverlay.tsx'
import { ResultsPanel } from './components/ResultsPanel.tsx'
import { SettingsPanel } from './components/SettingsPanel.tsx'
import { ToolHeader } from './components/ToolHeader.tsx'
import type {
  CustomConfig,
  CutMode,
  ExportSettings,
  GridConfig,
  SliceFile,
} from './types.ts'
import s from './styles.module.css'

function hasFiles(event: ReactDragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}

export default function SliceStudio() {
  const { notify } = useToast()
  const { source, loading, error, load, clear, dismissError } = useImageSource()

  const [mode, setMode] = useState<CutMode>('grid')
  const [grid, setGrid] = useState<GridConfig>({ rows: 3, cols: 3 })
  const [custom, setCustom] = useState<CustomConfig>({ xs: [], ys: [] })
  const [settings, setSettings] = useState<ExportSettings>(DEFAULT_EXPORT)
  const [showLines, setShowLines] = useState(true)
  const [showNumbers, setShowNumbers] = useState(true)
  const [hovered, setHovered] = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

  const view = useCanvasView(source)
  const exporter = useZipExport(notify)
  const {
    phase: exportPhase,
    progress: exportProgress,
    result: exportResult,
    error: exportError,
    start: startExport,
    cancel: cancelExport,
    reset: resetExport,
    downloadAgain,
  } = exporter

  /* ---------------- 派生数据：算法与 UI 解耦 ---------------- */

  const regions = useMemo(() => {
    if (!source) return []
    return mode === 'grid'
      ? computeGridRegions(source.width, source.height, grid.rows, grid.cols)
      : computeCustomRegions(source.width, source.height, custom)
  }, [source, mode, grid, custom])

  const files = useMemo(
    () => buildSliceFiles(regions, settings, source?.name ?? 'image'),
    [regions, settings, source?.name],
  )

  const fileByIndex = useMemo(
    () => new Map<number, SliceFile>(files.map((file) => [file.region.index, file])),
    [files],
  )

  const columnSizes = useMemo(
    () => (source ? segmentSizes(splitBoundaries(source.width, grid.cols)) : []),
    [source, grid.cols],
  )
  const rowSizes = useMemo(
    () => (source ? segmentSizes(splitBoundaries(source.height, grid.rows)) : []),
    [source, grid.rows],
  )

  const placeholder = source
    ? effectivePrefix({ ...settings, prefix: '' }, source.name)
    : 'image-'

  /* ---------------- 状态同步 ---------------- */

  useEffect(() => {
    if (!source) return
    setGrid((current) => normalizeGrid(source.width, source.height, current.rows, current.cols))
    setCustom((current) => ({
      xs: normalizeCuts(current.xs, source.width),
      ys: normalizeCuts(current.ys, source.height),
    }))
    setSelected(null)
    setHovered(null)
  }, [source])

  // 参数或导出设置一变，上一次的 ZIP 结果就失效，避免展示过时的「导出完成」
  useEffect(() => {
    resetExport()
  }, [regions, settings, resetExport])

  // 全局粘贴：剪贴板图片直接进入编辑状态
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = imageFromClipboard(event)
      if (!file) return
      event.preventDefault()
      void load(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [load])

  /* ---------------- 操作 ---------------- */

  const pickFile = useCallback(() => fileInputRef.current?.click(), [])

  const handleFileInput = useCallback(
    (event: ReactChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (file) void load(file)
    },
    [load],
  )

  const handleClear = useCallback(() => {
    clear()
    resetExport()
    setMode('grid')
    setGrid({ rows: 3, cols: 3 })
    setCustom({ xs: [], ys: [] })
    setSelected(null)
    setHovered(null)
    setCollapsed(false)
  }, [clear, resetExport])

  const handleGridChange = useCallback(
    (next: GridConfig) => {
      if (!source) {
        setGrid(next)
        return
      }
      setGrid(normalizeGrid(source.width, source.height, next.rows, next.cols))
      setSelected(null)
    },
    [source],
  )

  const handleCustomChange = useCallback(
    (next: CustomConfig) => {
      if (!source) {
        setCustom(next)
        return
      }
      setCustom({
        xs: normalizeCuts(next.xs, source.width),
        ys: normalizeCuts(next.ys, source.height),
      })
    },
    [source],
  )

  const handleModeChange = useCallback(
    (next: CutMode) => {
      setMode(next)
      setSelected(null)
      // 首次切到自定义：沿用当前网格的切割线，用户可继续拖动
      if (next === 'custom' && source && custom.xs.length === 0 && custom.ys.length === 0) {
        setCustom({
          xs: splitBoundaries(source.width, grid.cols).slice(1, -1),
          ys: splitBoundaries(source.height, grid.rows).slice(1, -1),
        })
      }
    },
    [source, custom, grid],
  )

  const handleSettingsChange = useCallback((patch: Partial<ExportSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  const handleDownload = useCallback(
    async (file: SliceFile) => {
      if (!source) return
      setDownloadingId(file.region.id)
      try {
        await downloadSingleSlice(source, file, settings)
        notify(`已下载 ${file.filename}`, 'success')
      } catch (cause) {
        notify(cause instanceof Error ? cause.message : '下载失败，请重试。', 'error')
      } finally {
        setDownloadingId(null)
      }
    },
    [source, settings, notify],
  )

  const handleExport = useCallback(() => {
    if (!source || files.length === 0) return
    void startExport(source, files, settings)
  }, [source, files, settings, startExport])

  const toggleCollapsed = useCallback(() => setCollapsed((value) => !value), [])

  /* ---------------- 拖放 ---------------- */

  const onDragEnter = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return
    event.preventDefault()
    dragDepth.current += 1
    setDragOver(true)
  }
  const onDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!hasFiles(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }
  const onDragLeave = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragOver(false)
  }
  const onDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepth.current = 0
    setDragOver(false)
    const file = Array.from(event.dataTransfer.files ?? [])[0]
    if (file) void load(file)
  }

  const exporting = exportPhase === 'working'

  return (
    <div
      className={s.app}
      data-fill="true"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <ToolHeader
        source={source}
        count={files.length}
        exporting={exporting}
        onPick={pickFile}
        onClear={handleClear}
        onExport={handleExport}
      />

      {!source ? (
        <EmptyImport
          dragOver={dragOver}
          loading={loading}
          error={error}
          onPick={pickFile}
          onDismissError={dismissError}
        />
      ) : (
        <>
          {error && (
            <div className={s['error-banner']} role="alert">
              <CircleX aria-hidden="true" />
              <span>{error}（当前图片已保留）</span>
              <button type="button" onClick={dismissError}>
                关闭
              </button>
            </div>
          )}
          {loading && (
            <div className={s['inline-loading']} role="status">
              <span className={s['mini-spinner']} aria-hidden="true" />
              正在读取新图片…
            </div>
          )}

          <div className={s.workbench}>
            <SettingsPanel
              mode={mode}
              onModeChange={handleModeChange}
              grid={grid}
              onGridChange={handleGridChange}
              custom={custom}
              onCustomChange={handleCustomChange}
              settings={settings}
              onSettingsChange={handleSettingsChange}
              showLines={showLines}
              onToggleLines={setShowLines}
              showNumbers={showNumbers}
              onToggleNumbers={setShowNumbers}
              width={source.width}
              height={source.height}
              count={regions.length}
              columnSizes={columnSizes}
              rowSizes={rowSizes}
              firstFilename={files[0]?.filename ?? '—'}
              sourcePlaceholder={placeholder}
            />

            <CanvasStage
              source={source}
              regions={regions}
              fileByIndex={fileByIndex}
              view={view}
              mode={mode}
              custom={custom}
              onCustomChange={handleCustomChange}
              showLines={showLines}
              showNumbers={showNumbers}
              hovered={hovered}
              selected={selected}
              onHover={setHovered}
              onSelect={setSelected}
              onDownload={handleDownload}
              downloadingId={downloadingId}
              dragOver={dragOver}
            />
          </div>

          <ResultsPanel
            source={source}
            files={files}
            hovered={hovered}
            selected={selected}
            onHover={setHovered}
            onSelect={setSelected}
            onDownload={handleDownload}
            downloadingId={downloadingId}
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
            exportPhase={exportPhase}
            exportResult={exportResult}
            exportError={exportError}
            onDownloadAgain={downloadAgain}
            onDismissExport={resetExport}
          />
        </>
      )}

      {exporting && <ExportOverlay progress={exportProgress} onCancel={cancelExport} />}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className={s['hidden-input']}
        onChange={handleFileInput}
        aria-label="选择要切割的图片"
      />
    </div>
  )
}
