import { useCallback, useEffect, useRef } from 'react'
import type { RefObject } from 'react'

/** 滚轮停止后滚动条继续显示的时长 */
const IDLE_HIDE_MS = 5000
/** 滑块最小高度，太短不好看也不好拖 */
const MIN_THUMB_H = 32
/** 到边后继续滚动，压力累到这个值算「拉满」 */
const MAX_PULL = 44

export interface ScrollEnhanceRefs {
  scrollRef: RefObject<HTMLDivElement>
  barRef: RefObject<HTMLDivElement>
  thumbRef: RefObject<HTMLDivElement>
  edgeTopRef: RefObject<HTMLDivElement>
  edgeBottomRef: RefObject<HTMLDivElement>
  /** 换页时用：滚回顶部，同时不要因为这次归零把滚动条闪出来 */
  resetScroll: () => void
}

/**
 * 内容区滚动增强：自绘滚动条 + 到边压力提示。
 *
 * 滚动本身完全交给浏览器 —— 不拦 wheel、不做缓动，滚多少是多少，
 * 鼠标滚轮和触控板惯性都是系统原生手感。这里只做两件附加的事：
 * 画一根会淡出的滚动条；到顶/到底后继续滚时，在边缘叠一层压力带。
 *
 * 压力带**只改透明度和自身缩放，不做任何位移**。早先试过橡皮筋：
 * 滚动容器一平移，页面顶部那条吸顶栏就被带起来，内容不足一屏时每滚一格还会抖。
 * 现在一个像素都不移动，顶部栏不可能被影响。
 */
export function useScrollEnhance(): ScrollEnhanceRefs {
  const scrollRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const edgeTopRef = useRef<HTMLDivElement>(null)
  const edgeBottomRef = useRef<HTMLDivElement>(null)
  /** 程序性归零后的一小段时间内不弹滚动条 */
  const suppressUntil = useRef(0)

  const resetScroll = useCallback(() => {
    suppressUntil.current = performance.now() + 260
    const el = scrollRef.current
    if (el) el.scrollTop = 0
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    const bar = barRef.current
    const thumb = thumbRef.current
    const edgeTop = edgeTopRef.current
    const edgeBottom = edgeBottomRef.current
    if (!el || !bar || !thumb || !edgeTop || !edgeBottom) return

    let pullAmount = 0
    let pullSide: 'top' | 'bottom' | null = null
    let pullTimer = 0
    let idleTimer = 0
    let dragging = false
    let thumbTop = 0
    let dragStartY = 0
    let dragStartTop = 0

    /* ---------------- 自绘滚动条 ---------------- */

    const paint = () => {
      const track = bar.clientHeight
      const max = el.scrollHeight - el.clientHeight
      if (max <= 1 || track <= 0) {
        bar.dataset.active = 'false'
        return
      }
      bar.dataset.active = 'true'
      const height = Math.max(MIN_THUMB_H, (track * el.clientHeight) / el.scrollHeight)
      thumbTop = ((track - height) * el.scrollTop) / max
      thumb.style.height = `${height}px`
      thumb.style.transform = `translate3d(0, ${thumbTop}px, 0)`
    }

    const showBar = () => {
      bar.dataset.visible = 'true'
      window.clearTimeout(idleTimer)
      if (dragging) return
      idleTimer = window.setTimeout(() => {
        bar.dataset.visible = 'false'
      }, IDLE_HIDE_MS)
    }

    const syncThumb = () => {
      const maxTop = bar.clientHeight - thumb.offsetHeight
      const maxScroll = el.scrollHeight - el.clientHeight
      if (maxTop <= 0 || maxScroll <= 0) return
      el.scrollTop = (Math.max(0, Math.min(maxTop, thumbTop)) / maxTop) * maxScroll
    }

    /* ---------------- 到边压力带（纯透明度 + 自身缩放，不位移） ---------------- */

    const releasePull = () => {
      window.clearTimeout(pullTimer)
      pullAmount = 0
      pullSide = null
      edgeTop.style.setProperty('--pull', '0')
      edgeBottom.style.setProperty('--pull', '0')
    }

    const pullAt = (side: 'top' | 'bottom', dy: number) => {
      if (pullSide !== side) {
        pullAmount = 0
        pullSide = side
      }
      pullAmount = Math.min(MAX_PULL, pullAmount + Math.abs(dy) * 0.6)
      const strength = Math.min(1, pullAmount / MAX_PULL)
      const active = side === 'top' ? edgeTop : edgeBottom
      const other = side === 'top' ? edgeBottom : edgeTop
      other.style.setProperty('--pull', '0')
      active.style.setProperty('--pull', String(strength))
      showBar()
      window.clearTimeout(pullTimer)
      pullTimer = window.setTimeout(releasePull, 160)
    }

    /** 事件目标在可滚动的子元素里（textarea、代码块…）时不算到边 */
    const nestedCanScroll = (node: EventTarget | null, dy: number) => {
      let current = node as HTMLElement | null
      while (current && current !== el) {
        const overflowY = getComputedStyle(current).overflowY
        if (
          (overflowY === 'auto' || overflowY === 'scroll') &&
          current.scrollHeight > current.clientHeight + 1
        ) {
          const canDown = dy > 0 && current.scrollTop + current.clientHeight < current.scrollHeight - 1
          const canUp = dy < 0 && current.scrollTop > 0
          if (canDown || canUp) return true
        }
        current = current.parentElement
      }
      return false
    }

    /**
     * 只做判断，不拦事件：滚轮交给浏览器原生处理，
     * 这里仅在「已经在顶还往上滚 / 已经在底还往下滚」时点亮压力带。
     */
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientHeight : 1
      const dy = event.deltaY * unit
      if (!dy) return

      const max = el.scrollHeight - el.clientHeight
      if (max <= 1) return
      if (nestedCanScroll(event.target, dy)) return

      const atTop = el.scrollTop <= 0.5
      const atBottom = el.scrollTop >= max - 1
      if (atTop && dy < 0) {
        pullAt('top', dy)
        return
      }
      if (atBottom && dy > 0) {
        pullAt('bottom', dy)
        return
      }
      if (pullSide) releasePull()
    }

    /* ---------------- 事件绑定 ---------------- */

    const onScroll = () => {
      paint()
      if (performance.now() < suppressUntil.current) return
      showBar()
    }

    const onBarDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      event.preventDefault()
      dragging = true
      showBar()
      const rect = bar.getBoundingClientRect()
      const onThumb = event.target === thumb
      dragStartY = event.clientY
      dragStartTop = onThumb ? thumbTop : event.clientY - rect.top - thumb.offsetHeight / 2
      // 先挂监听再跳转，pointer capture 万一失败也不影响拖拽
      window.addEventListener('pointermove', onBarMove)
      window.addEventListener('pointerup', onBarUp)
      if (!onThumb) syncThumb()
      try {
        bar.setPointerCapture(event.pointerId)
      } catch {
        /* 某些环境下 capture 不可用，窗口级监听已经够用 */
      }
    }

    const onBarMove = (event: PointerEvent) => {
      thumbTop = dragStartTop + (event.clientY - dragStartY)
      syncThumb()
    }

    const onBarUp = (event: PointerEvent) => {
      dragging = false
      try {
        bar.releasePointerCapture(event.pointerId)
      } catch {
        /* 没 capture 过就忽略 */
      }
      window.removeEventListener('pointermove', onBarMove)
      window.removeEventListener('pointerup', onBarUp)
      showBar()
    }

    // passive：绝不拦滚轮，滚动完全由浏览器负责
    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('scroll', onScroll, { passive: true })
    bar.addEventListener('pointerdown', onBarDown)

    // 内容高度变化（列表增删、图片加载）后重新量一次
    const ro = new ResizeObserver(() => paint())
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)

    paint()

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('scroll', onScroll)
      bar.removeEventListener('pointerdown', onBarDown)
      window.removeEventListener('pointermove', onBarMove)
      window.removeEventListener('pointerup', onBarUp)
      ro.disconnect()
      window.clearTimeout(pullTimer)
      window.clearTimeout(idleTimer)
    }
  }, [])

  return { scrollRef, barRef, thumbRef, edgeTopRef, edgeBottomRef, resetScroll }
}
