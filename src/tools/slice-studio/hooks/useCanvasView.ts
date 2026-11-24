/**
 * 画布视图：适配窗口 / 滚轮缩放 / 拖拽平移 / 聚焦切片 / 坐标换算。
 * 视图状态用「相对适应缩放的倍数 + 居中偏移」表达，窗口 resize 后自动重新居中。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ImageSource, Rect } from '../types.ts'

interface ViewState {
  zoom: number
  panX: number
  panY: number
}

export interface Transform {
  scale: number
  fitScale: number
  ox: number
  oy: number
  width: number
  height: number
}

export interface ImagePoint {
  x: number
  y: number
  inside: boolean
}

const INITIAL: ViewState = { zoom: 1, panX: 0, panY: 0 }
const MIN_ZOOM = 0.1
const MAX_ZOOM = 40
const FIT_PADDING = 48

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function computeTransform(
  view: ViewState,
  size: { w: number; h: number },
  source: ImageSource | null,
): Transform {
  const iw = source?.width ?? 1
  const ih = source?.height ?? 1
  const fitScale = Math.min(
    Math.max(1, size.w - FIT_PADDING * 2) / iw,
    Math.max(1, size.h - FIT_PADDING * 2) / ih,
  )
  const scale = Math.max(0.0001, fitScale * view.zoom)
  return {
    scale,
    fitScale,
    ox: (size.w - iw * scale) / 2 + view.panX,
    oy: (size.h - ih * scale) / 2 + view.panY,
    width: size.w,
    height: size.h,
  }
}

export function useCanvasView(source: ImageSource | null) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState<ViewState>(INITIAL)

  const viewRef = useRef(view)
  const sizeRef = useRef(size)
  const sourceRef = useRef(source)
  viewRef.current = view
  sizeRef.current = size
  sourceRef.current = source

  // 容器尺寸：ResizeObserver 比 window.resize 更可靠（侧栏开合也会触发）。
  // 关键：空状态下画布还没挂载，effect 必须等 source 出现后再绑定，否则尺寸永远是 0，
  // 导入图片后会被画到屏幕外，看起来就是「预览区域空白」。
  useEffect(() => {
    if (!source) return
    const element = stageRef.current
    if (!element) return
    const measure = () => {
      const rect = element.getBoundingClientRect()
      setSize({ w: Math.round(rect.width), h: Math.round(rect.height) })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [source])

  // 换图后回到适应窗口
  useEffect(() => {
    setView(INITIAL)
  }, [source?.url])

  const transform = useMemo(
    () => computeTransform(view, size, source),
    [view, size, source],
  )

  const reset = useCallback(() => setView(INITIAL), [])

  const panBy = useCallback((dx: number, dy: number) => {
    setView((prev) => ({ ...prev, panX: prev.panX + dx, panY: prev.panY + dy }))
  }, [])

  const zoomAtPoint = useCallback((factor: number, cx: number, cy: number) => {
    setView((prev) => {
      const current = computeTransform(prev, sizeRef.current, sourceRef.current)
      const image = sourceRef.current
      if (!image) return prev
      const nextZoom = clamp(prev.zoom * factor, MIN_ZOOM, MAX_ZOOM)
      const ratio = nextZoom / prev.zoom
      const wantedOx = cx - (cx - current.ox) * ratio
      const wantedOy = cy - (cy - current.oy) * ratio
      const nextScale = current.fitScale * nextZoom
      return {
        zoom: nextZoom,
        panX: wantedOx - (sizeRef.current.w - image.width * nextScale) / 2,
        panY: wantedOy - (sizeRef.current.h - image.height * nextScale) / 2,
      }
    })
  }, [])

  const zoomBy = useCallback(
    (factor: number) => {
      zoomAtPoint(factor, sizeRef.current.w / 2, sizeRef.current.h / 2)
    },
    [zoomAtPoint],
  )

  const focusRect = useCallback(
    (rect: Rect) => {
      const current = computeTransform(viewRef.current, sizeRef.current, sourceRef.current)
      const image = sourceRef.current
      if (!image) return
      const target = Math.min(
        Math.max(80, current.width - 120) / rect.w,
        Math.max(80, current.height - 120) / rect.h,
      )
      const zoom = clamp(target / current.fitScale, MIN_ZOOM, MAX_ZOOM)
      const scale = current.fitScale * zoom
      const centerX = rect.x + rect.w / 2
      const centerY = rect.y + rect.h / 2
      setView({
        zoom,
        panX: current.width / 2 - centerX * scale - (current.width - image.width * scale) / 2,
        panY: current.height / 2 - centerY * scale - (current.height - image.height * scale) / 2,
      })
    },
    [],
  )

  const toImage = useCallback(
    (clientX: number, clientY: number): ImagePoint => {
      const element = stageRef.current
      const current = computeTransform(viewRef.current, sizeRef.current, sourceRef.current)
      const box = element?.getBoundingClientRect()
      const x = (clientX - (box?.left ?? 0) - current.ox) / current.scale
      const y = (clientY - (box?.top ?? 0) - current.oy) / current.scale
      const image = sourceRef.current
      return {
        x,
        y,
        inside: !!image && x >= 0 && y >= 0 && x <= image.width && y <= image.height,
      }
    },
    [],
  )

  const toScreen = useCallback(
    (x: number, y: number) => {
      const current = computeTransform(viewRef.current, sizeRef.current, sourceRef.current)
      return { x: current.ox + x * current.scale, y: current.oy + y * current.scale }
    },
    [],
  )

  // 原生监听：React 的 onWheel 是被动监听，无法阻止页面滚动。
  // 同样等画布挂载后再绑定，否则导入图片后滚轮缩放不生效。
  useEffect(() => {
    if (!source) return
    const element = stageRef.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const box = element.getBoundingClientRect()
      const factor = Math.exp(-event.deltaY * 0.0015)
      zoomAtPoint(factor, event.clientX - box.left, event.clientY - box.top)
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [zoomAtPoint, source])

  return {
    stageRef,
    transform,
    zoom: view.zoom,
    // 显示相对原图像素的真实缩放比例，而不是「适应窗口的倍数」
    percent: Math.round(transform.scale * 100),
    reset,
    panBy,
    zoomBy,
    zoomAtPoint,
    focusRect,
    toImage,
    toScreen,
  }
}

export type CanvasView = ReturnType<typeof useCanvasView>
