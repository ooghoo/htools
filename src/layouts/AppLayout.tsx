import { useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { Sidebar } from '@/components/Sidebar'
import { useMediaQuery } from '@/hooks/useMediaQuery'
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
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userTookOver) setOpen(wide)
  }, [wide, userTookOver])

  // 抽屉模式下切换路由要收起，否则会挡住新页面
  useEffect(() => {
    if (isDrawer) setOpen(false)
  }, [location.pathname, location.search, isDrawer])

  // 换页后回到顶部
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [location.pathname])

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
          <div ref={scrollRef} className={cx(s.scroll, 'scroll-thin')}>
            <div className={s.page}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
