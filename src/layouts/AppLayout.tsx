import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { Sidebar } from '@/components/Sidebar'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useSmoothScroll } from '@/hooks/useSmoothScroll'
import { getEnabledTools } from '@/registry/tools'
import { cx } from '@/utils/cx'
import s from './AppLayout.module.css'

/**
 * 全站外壳：整页不滚，滚动只发生在内容面板内部。
 * 侧栏：≥1440px 默认展开；1024–1439 默认收起、内联展开；<1024 变成抽屉。
 */
export function AppLayout() {
  const tools = useMemo(() => getEnabledTools(), [])
  const wide = useMediaQuery('(min-width: 1440px)')
  const isDrawer = useMediaQuery('(max-width: 1023px)')

  // 初始值直接取屏宽，避免首帧先展开再收起
  const [open, setOpen] = useState(() => window.innerWidth >= 1440)
  const [userTookOver, setUserTookOver] = useState(false)
  const location = useLocation()
  const { scrollRef, barRef, thumbRef, edgeTopRef, edgeBottomRef, resetScroll } = useSmoothScroll()

  useEffect(() => {
    if (!userTookOver) setOpen(wide)
  }, [wide, userTookOver])

  // 抽屉模式下切换路由要收起，否则会挡住新页面
  useEffect(() => {
    if (isDrawer) setOpen(false)
  }, [location.pathname, location.search, isDrawer])

  // 换页后回到顶部
  useEffect(() => {
    resetScroll()
  }, [location.pathname, resetScroll])

  // Esc 关闭抽屉
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserTookOver(true)
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const toggleSidebar = () => {
    setUserTookOver(true)
    setOpen((current) => !current)
  }

  return (
    <div className={s.shell} data-sidebar={open ? 'open' : 'closed'}>
      <AppHeader onToggleSidebar={toggleSidebar} sidebarOpen={open} />

      <div className={s['main-row']}>
        <div className={s['sidebar-slot']}>
          <Sidebar tools={tools} />
        </div>

        {open && isDrawer && (
          <button
            type="button"
            className={s.backdrop}
            aria-label="关闭导航"
            onClick={() => {
              setUserTookOver(true)
              setOpen(false)
            }}
          />
        )}

        <main className={s.content} id="main-content">
          <div id="tool-head-slot" className={s['tool-head-slot']} />
          <div className={s['scroll-wrap']}>
            <div ref={scrollRef} className={s.scroll}>
              <div className={s.page}>
                <Outlet />
              </div>
            </div>
            {/* 到边压力带：只叠一层渐变，不移动任何内容 */}
            <div ref={edgeTopRef} className={cx(s.edge, s['edge-top'])} aria-hidden="true" />
            <div ref={edgeBottomRef} className={cx(s.edge, s['edge-bottom'])} aria-hidden="true" />
            {/* 自绘滚动条：只属于内容区，永远不会跑到顶部栏上 */}
            <div ref={barRef} className={s.scrollbar} data-visible="false" aria-hidden="true">
              <div ref={thumbRef} className={s.thumb} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
