import { useCallback, useEffect, useRef } from 'react'
import type { RefObject } from 'react'

/** 滚轮停止后滚动条继续显示的时长 */
const IDLE_HIDE_MS = 5000
/** 滑块最小高度，太短不好看也不好拖 */
const MIN_THUMB_H = 32
/** 边缘回弹的最大位移 */
const MAX_BOUNCE = 64
/** 每帧（16.7ms）向目标靠近的比例，越大越快 */
const FRICTION = 0.22

export interface SmoothScrollRefs {
  scrollRef: RefObject<HTMLDivElement>
  barRef: RefObject<HTMLDivElement>
  thumbRef: RefObject<HTMLDivElement>
  /** 换页时用：滚回顶部，同时不要因为这次归零把滚动条闪出来 */
  resetScroll: () => void
}

/**
 * 内容区滚动增强：滚轮缓动 + 自绘滚动条 + 到边回弹。
 *
 * 只接管滚轮（wheel）；键盘、触控板惯性滚动、拖拽滚动条仍走原生行为，
 * 所以不会和系统的惯性滚动打架。滚动条完全属于滚动容器自己，
 * 不会跑到顶部栏上去；静止 5 秒自动淡出。
 */
export function useSmoothScroll(): SmoothScrollRefs {
  const scrollRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
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
    if (!el || !bar || !thumb) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let target = el.scrollTop
    let rafId = 0
    let lastTime = 0
    let animating = false
    let bounce = 0
    let bounceTimer = 0
    let idleTimer = 0
    let dragging = false
    let thumbTop = 0
    let dragStartY = 0
    let dragStartTop = 0
    let lastWritten = -1

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
      const next = (Math.max(0, Math.min(maxTop, thumbTop)) / maxTop) * maxScroll
      el.scrollTop = next
    }

    /* ---------------- 边缘回弹 ---------------- */

    const applyBounce = (value: number) => {
      bounce = value
      el.style.transform = value ? `translate3d(0, ${value}px, 0)` : ''
    }

    const releaseBounce = () => {
      window.clearTimeout(bounceTimer)
      if (!bounce) return
      bounce = 0
      el.style.transition = 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)'
      el.style.transform = ''
      window.setTimeout(() => {
        el.style.transition = ''
      }, 460)
    }

    const pull = (dy: number) => {
      el.style.transition = 'none'
      // 方向与系统一致：到顶继续上滚，内容跟着往下走；到底继续下滚，内容往上走。
      // tanh 阻尼：越往边缘拉越硬，永远不会超过 MAX_BOUNCE。
      applyBounce(MAX_BOUNCE * Math.tanh((bounce - dy * 0.45) / MAX_BOUNCE))
      showBar()
      window.clearTimeout(bounceTimer)
      bounceTimer = window.setTimeout(releaseBounce, 130)
    }

    /* ---------------- 滚轮缓动 ---------------- */

    const step = (now: number) => {
      const dt = Math.min(64, Math.max(1, now - lastTime))
      lastTime = now
      const diff = target - el.scrollTop
      // 浏览器会把 scrollTop 取整到像素，容差必须 ≥1，否则循环永远收敛不了
      if (Math.abs(diff) <= 1) {
        el.scrollTop = target
        lastWritten = target
        animating = false
        rafId = 0
        return
      }
      animating = true
      const delta = diff * (1 - Math.pow(1 - FRICTION, dt / 16.667))
      // 每帧至少走 1px，避免取整后原地踏步
      const next = el.scrollTop + (Math.abs(delta) < 1 ? Math.sign(diff) : delta)
      lastWritten = next
      el.scrollTop = next
      rafId = requestAnimationFrame(step)
    }

    /** 事件目标在可滚动的子元素里（textarea、代码块…）时交还给原生滚动 */
    const nestedCanScroll = (node: EventTarget | null, dy: number) => {
      let current = node as HTMLElement | null
      while (current && current !== el) {
        const style = getComputedStyle(current)
        const overflowY = style.overflowY
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

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.defaultPrevented) return
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientHeight : 1
      const dy = event.deltaY * unit
      if (!dy) return
      if (nestedCanScroll(event.target, dy)) return

      const max = el.scrollHeight - el.clientHeight
      if (max <= 0) {
        event.preventDefault()
        pull(dy)
        return
      }

      const atTop = el.scrollTop <= 0.5
      const atBottom = el.scrollTop >= max - 0.5
      if ((atTop && dy < 0) || (atBottom && dy > 0)) {
        event.preventDefault()
        pull(dy)
        return
      }

      event.preventDefault()
      // 从回弹状态回到正常滚动：先把位移收回去
      if (bounce) releaseBounce()
      if (reduced) {
        target = Math.round(Math.max(0, Math.min(max, el.scrollTop + dy)))
        el.scrollTop = target
        return
      }
      target = Math.round(Math.max(0, Math.min(max, target + dy)))
      if (!rafId) {
        lastTime = performance.now()
        rafId = requestAnimationFrame(step)
      }
    }

    /* ---------------- 事件绑定 ---------------- */

    const onScroll = () => {
      // 缓动过程中被别的力量改动了滚动位置（键盘、触控板、脚本），立刻收手
      if (animating && Math.abs(el.scrollTop - lastWritten) > 2) {
        cancelAnimationFrame(rafId)
        rafId = 0
        animating = false
      }
      if (!animating) target = el.scrollTop
      paint()
      if (performance.now() < suppressUntil.current) return
      showBar()
    }

    const onBarDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      event.preventDefault()
      cancelAnimationFrame(rafId)
      rafId = 0
      animating = false
      target = el.scrollTop
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

    el.addEventListener('wheel', onWheel, { passive: false })
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
      cancelAnimationFrame(rafId)
      window.clearTimeout(bounceTimer)
      window.clearTimeout(idleTimer)
      el.style.transform = ''
      el.style.transition = ''
    }
  }, [])

  return { scrollRef, barRef, thumbRef, resetScroll }
}
