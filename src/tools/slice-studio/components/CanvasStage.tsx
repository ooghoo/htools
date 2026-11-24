import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Crosshair, Download, Maximize2, Minus, Plus, RotateCcw, X } from 'lucide-react'
import { moveCut, regionAt } from '../lib/grid.ts'
import type { CanvasView } from '../hooks/useCanvasView.ts'
import type {
  CustomConfig,
  CutMode,
  ImageSource,
  SliceFile,
  SliceRegion,
} from '../types.ts'
import s from '../styles.module.css'

interface DragState {
  kind: 'pan' | 'cut'
  axis?: 'x' | 'y'
  index?: number
  lastX: number
  lastY: number
  moved: boolean
}

interface CanvasStageProps {
  source: ImageSource
  regions: SliceRegion[]
  fileByIndex: Map<number, SliceFile>
  view: CanvasView
  mode: CutMode
  custom: CustomConfig
  onCustomChange: (config: CustomConfig) => void
  showLines: boolean
  showNumbers: boolean
  hovered: number | null
  selected: number | null
  onHover: (index: number | null) => void
  onSelect: (index: number | null) => void
  onDownload: (file: SliceFile) => void
  downloadingId: string | null
  dragOver: boolean
}

export function CanvasStage(props: CanvasStageProps) {
  const {
    source,
    regions,
    fileByIndex,
    view,
    mode,
    custom,
    onCustomChange,
    showLines,
    showNumbers,
    hovered,
    selected,
    onHover,
    onSelect,
    onDownload,
    downloadingId,
    dragOver,
  } = props

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const [panning, setPanning] = useState(false)
  const { transform, stageRef } = view

  const imageRect = useMemo(
    () => ({
      left: transform.ox,
      top: transform.oy,
      width: source.width * transform.scale,
      height: source.height * transform.scale,
    }),
    [transform.ox, transform.oy, transform.scale, source.width, source.height],
  )

  // 只画原图，切割线 / 编号 / 高亮全部由 DOM 叠加层负责，保证线宽与字号不随缩放变形
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !transform.width || !transform.height) return
    const dpr = window.devicePixelRatio || 1
    const pixelW = Math.round(transform.width * dpr)
    const pixelH = Math.round(transform.height * dpr)
    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW
      canvas.height = pixelH
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, transform.width, transform.height)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source.image, imageRect.left, imageRect.top, imageRect.width, imageRect.height)
  }, [source, transform, imageRect])

  const xEdges = useMemo(() => {
    const set = new Set<number>(regions.map((r) => r.x + r.w))
    set.delete(source.width)
    return [...set].sort((a, b) => a - b)
  }, [regions, source.width])

  const yEdges = useMemo(() => {
    const set = new Set<number>(regions.map((r) => r.y + r.h))
    set.delete(source.height)
    return [...set].sort((a, b) => a - b)
  }, [regions, source.height])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    dragRef.current = {
      kind: 'pan',
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const startCutDrag = (
    event: ReactPointerEvent<SVGLineElement>,
    axis: 'x' | 'y',
    index: number,
  ) => {
    event.stopPropagation()
    event.preventDefault()
    dragRef.current = {
      kind: 'cut',
      axis,
      index,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    }
    stageRef.current?.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (drag) {
      const dx = event.clientX - drag.lastX
      const dy = event.clientY - drag.lastY
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) drag.moved = true
      drag.lastX = event.clientX
      drag.lastY = event.clientY

      if (drag.kind === 'pan') {
        if (drag.moved && !panning) setPanning(true)
        view.panBy(dx, dy)
      } else if (drag.kind === 'cut' && drag.axis && drag.index !== undefined) {
        const point = view.toImage(event.clientX, event.clientY)
        const length = drag.axis === 'x' ? source.width : source.height
        const positions = drag.axis === 'x' ? custom.xs : custom.ys
        const value = Math.round(drag.axis === 'x' ? point.x : point.y)
        const next = moveCut(positions, drag.index, value, length)
        onCustomChange({ ...custom, [drag.axis]: next })
      }
      return
    }

    const point = view.toImage(event.clientX, event.clientY)
    const region = point.inside ? regionAt(regions, point.x, point.y) : null
    const next = region?.index ?? null
    if (next !== hovered) onHover(next)
  }

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    setPanning(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (!drag || drag.kind !== 'pan' || drag.moved) return
    const point = view.toImage(event.clientX, event.clientY)
    const region = point.inside ? regionAt(regions, point.x, point.y) : null
    onSelect(region?.index ?? null)
  }

  const activeRegion = selected === null ? null : regions.find((r) => r.index === selected) ?? null
  const activeFile = selected === null ? null : fileByIndex.get(selected) ?? null

  const renderGuides = () => {
    if (!showLines) return null
    const top = imageRect.top
    const bottom = imageRect.top + imageRect.height
    const left = imageRect.left
    const right = imageRect.left + imageRect.width

    const vertical = xEdges.map((value) => ({
      screen: transform.ox + value * transform.scale,
      value,
    }))
    const horizontal = yEdges.map((value) => ({
      screen: transform.oy + value * transform.scale,
      value,
    }))

    return (
      <g>
        {vertical.map(({ screen, value }) => (
          <g key={`vx-${value}`}>
            <line className={s['guide-halo']} x1={screen} y1={top} x2={screen} y2={bottom} />
            <line className={s['guide-line']} x1={screen} y1={top} x2={screen} y2={bottom} />
          </g>
        ))}
        {horizontal.map(({ screen, value }) => (
          <g key={`hy-${value}`}>
            <line className={s['guide-halo']} x1={left} y1={screen} x2={right} y2={screen} />
            <line className={s['guide-line']} x1={left} y1={screen} x2={right} y2={screen} />
          </g>
        ))}

        {mode === 'custom' &&
          vertical.map(({ screen }, index) => (
            <line
              key={`vhandle-${index}`}
              className={s['guide-handle']}
              x1={screen}
              y1={top}
              x2={screen}
              y2={bottom}
              style={{ cursor: 'col-resize', pointerEvents: 'stroke' }}
              onPointerDown={(event) => startCutDrag(event, 'x', index)}
            />
          ))}
        {mode === 'custom' &&
          horizontal.map(({ screen }, index) => (
            <line
              key={`hhandle-${index}`}
              className={s['guide-handle']}
              x1={left}
              y1={screen}
              x2={right}
              y2={screen}
              style={{ cursor: 'row-resize', pointerEvents: 'stroke' }}
              onPointerDown={(event) => startCutDrag(event, 'y', index)}
            />
          ))}
      </g>
    )
  }

  return (
    <div className={s.center}>
      <div className={s['canvas-toolbar']}>
        <div className={s['zoom-group']}>
          <button type="button" aria-label="缩小" onClick={() => view.zoomBy(1 / 1.25)}>
            <Minus aria-hidden="true" />
          </button>
          <button
            type="button"
            className={s['zoom-value']}
            title="点击重置视图"
            onClick={view.reset}
          >
            {view.percent}%
          </button>
          <button type="button" aria-label="放大" onClick={() => view.zoomBy(1.25)}>
            <Plus aria-hidden="true" />
          </button>
          <button type="button" aria-label="重置视图" onClick={view.reset}>
            <RotateCcw aria-hidden="true" />
          </button>
        </div>
        <span className={s['toolbar-hint']}>滚轮缩放 · 拖拽平移 · 点击切片查看 · 双击重置</span>
        <span className={s['toolbar-count']}>
          <Maximize2 aria-hidden="true" />
          {source.width} × {source.height} px
        </span>
      </div>

      <div
        ref={stageRef}
        className={s.stage}
        data-panning={panning}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={() => {
          if (!dragRef.current) onHover(null)
        }}
        onDoubleClick={view.reset}
      >
        <div
          className={s.checker}
          style={{
            left: imageRect.left,
            top: imageRect.top,
            width: imageRect.width,
            height: imageRect.height,
          }}
        />
        <canvas ref={canvasRef} className={s.canvas} />
        <div
          className={s['image-frame']}
          style={{
            left: imageRect.left,
            top: imageRect.top,
            width: imageRect.width,
            height: imageRect.height,
          }}
        />

        <svg className={s.overlay} width={transform.width} height={transform.height}>
          {selected !== null &&
            regions
              .filter((r) => r.index !== selected)
              .map((r) => (
                <rect
                  key={`dim-${r.id}`}
                  className={s['dim-rect']}
                  x={transform.ox + r.x * transform.scale}
                  y={transform.oy + r.y * transform.scale}
                  width={r.w * transform.scale}
                  height={r.h * transform.scale}
                />
              ))}
          {hovered !== null &&
            hovered !== selected &&
            (() => {
              const r = regions.find((item) => item.index === hovered)
              if (!r) return null
              return (
                <rect
                  className={s['hover-rect']}
                  x={transform.ox + r.x * transform.scale}
                  y={transform.oy + r.y * transform.scale}
                  width={r.w * transform.scale}
                  height={r.h * transform.scale}
                />
              )
            })()}
          {activeRegion && (
            <rect
              className={s['active-rect']}
              x={transform.ox + activeRegion.x * transform.scale}
              y={transform.oy + activeRegion.y * transform.scale}
              width={activeRegion.w * transform.scale}
              height={activeRegion.h * transform.scale}
            />
          )}
          {renderGuides()}
        </svg>

        {showNumbers && (
          <div className={s.labels}>
            {regions.map((region) => {
              const w = region.w * transform.scale
              const h = region.h * transform.scale
              if (w < 38 || h < 26) return null
              const file = fileByIndex.get(region.index)
              return (
                <span
                  key={region.id}
                  className={s['slice-label']}
                  data-active={selected === region.index}
                  style={{
                    left: transform.ox + (region.x + region.w / 2) * transform.scale,
                    top: transform.oy + (region.y + region.h / 2) * transform.scale,
                  }}
                >
                  {file?.sequence ?? region.index + 1}
                </span>
              )
            })}
          </div>
        )}

        {activeRegion && activeFile && (
          <div
            className={s.inspector}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerMove={(event) => event.stopPropagation()}
          >
            <div className={s['inspector-head']}>
              <span>切片 {String(activeFile.sequence).padStart(2, '0')}</span>
              <button type="button" aria-label="取消选择" onClick={() => onSelect(null)}>
                <X aria-hidden="true" />
              </button>
            </div>
            <div className={s['inspector-preview']}>
              <CropPreview source={source} region={activeRegion} />
            </div>
            <div className={s['inspector-meta']}>
              <code>{activeFile.filename}</code>
              <span>
                {activeRegion.w} × {activeRegion.h} px · X {activeRegion.x} / Y {activeRegion.y}
              </span>
            </div>
            <div className={s['inspector-actions']}>
              <button
                type="button"
                onClick={() => onDownload(activeFile)}
                disabled={downloadingId === activeRegion.id}
              >
                <Download aria-hidden="true" />
                {downloadingId === activeRegion.id ? '编码中' : '下载此切片'}
              </button>
              <button type="button" onClick={() => view.focusRect(activeRegion)} aria-label="聚焦到该切片">
                <Crosshair aria-hidden="true" />
                聚焦
              </button>
            </div>
          </div>
        )}

        {dragOver && (
          <div className={s['drop-overlay']}>
            <div>
              <Plus aria-hidden="true" />
              <strong>松开以更换图片</strong>
              <span>只在本机处理，不会上传</span>
            </div>
          </div>
        )}
      </div>

      <div className={s['canvas-status']}>
        <span>
          {mode === 'custom'
            ? '拖动蓝色切割线调整像素位置，左侧可精确输入坐标'
            : '切割线以原图像素计算，预览缩放不影响导出尺寸'}
        </span>
        <span>{regions.length} 块切片 · 1:1 原始像素</span>
      </div>
    </div>
  )
}

/** 用 CSS 背景裁切做即时缩略图：不编码、不占内存，参数变化即刻刷新 */
function CropPreview({ source, region }: { source: ImageSource; region: SliceRegion }) {
  const boxW = 188
  const boxH = 104
  const scale = Math.min(boxW / region.w, boxH / region.h)
  const width = Math.max(1, region.w * scale)
  const height = Math.max(1, region.h * scale)
  return (
    <div
      className={s['crop-preview']}
      style={{
        width,
        height,
        backgroundImage: `url("${source.url}")`,
        backgroundSize: `${source.width * scale}px ${source.height * scale}px`,
        backgroundPosition: `-${region.x * scale}px -${region.y * scale}px`,
      }}
    />
  )
}
