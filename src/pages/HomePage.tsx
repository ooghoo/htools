import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { LayoutGrid, Rows3, SearchX, X } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { ToolCard } from '@/components/ToolCard'
import { ToolSearch } from '@/components/ToolSearch'
import { Button } from '@/components/ui/Button'
import { CATEGORIES, getCategory } from '@/registry/categories'
import { countByCategory, getEnabledTools, groupToolsByCategory, searchTools } from '@/registry/tools'
import { STORAGE_KEYS, readRaw, writeRaw } from '@/services/storage'
import type { ToolCategoryId } from '@/types/tool'
import { cx } from '@/utils/cx'
import s from './HomePage.module.css'

type ViewMode = 'card' | 'list'

function readViewMode(): ViewMode {
  return readRaw(STORAGE_KEYS.viewMode) === 'list' ? 'list' : 'card'
}

export function HomePage() {
  const allTools = useMemo(() => getEnabledTools(), [])
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [view, setView] = useState<ViewMode>(readViewMode)
  const [headSlot, setHeadSlot] = useState<HTMLElement | null>(null)

  // 插槽由 AppLayout 常驻渲染，挂载后把标题栏 portal 上去（layout 阶段，避免先闪一下）
  useLayoutEffect(() => {
    setHeadSlot(document.getElementById('tool-head-slot'))
  }, [])

  const rawCategory = searchParams.get('cat')
  const activeCategory = CATEGORIES.some((c) => c.id === rawCategory)
    ? (rawCategory as ToolCategoryId)
    : null
  const category = activeCategory ? getCategory(activeCategory) : undefined

  // 搜索时忽略分类，直接在全部工具里找 —— 否则「已选转换」会搜不到 JSON
  const searching = query.trim().length > 0
  const scoped = searching
    ? searchTools(allTools, query)
    : activeCategory
      ? allTools.filter((tool) => tool.category === activeCategory)
      : allTools

  const groups = useMemo(() => groupToolsByCategory(scoped), [scoped])
  const counts = useMemo(() => countByCategory(allTools), [allTools])
  const changeView = useCallback((next: ViewMode) => {
    setView(next)
    writeRaw(STORAGE_KEYS.viewMode, next)
  }, [])

  const selectCategory = useCallback(
    (id: ToolCategoryId | null) => {
      const next = new URLSearchParams(searchParams)
      if (id) next.set('cat', id)
      else next.delete('cat')
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const title = searching ? '搜索结果' : (category?.label ?? '全部工具')
  const countLabel = searching || activeCategory ? `${scoped.length} / ${allTools.length}` : String(allTools.length)

  const head = (
    <header className={s.head}>
      <div className={s['title-row']}>
        <h1 className={s.title}>{title}</h1>
        <span className={s.count} aria-live="polite">
          {countLabel}
        </span>
      </div>

      <div className={s['head-tools']}>
        <ToolSearch
          value={query}
          onChange={setQuery}
          resultLabel={searching ? `${scoped.length} 个结果` : undefined}
        />
        <div className={s['view-switch']} role="group" aria-label="切换视图">
          <button
            type="button"
            className={s['view-btn']}
            aria-pressed={view === 'card'}
            aria-label="卡片视图"
            title="卡片视图"
            onClick={() => changeView('card')}
          >
            <LayoutGrid aria-hidden="true" />
          </button>
          <button
            type="button"
            className={s['view-btn']}
            aria-pressed={view === 'list'}
            aria-label="列表视图"
            title="列表视图"
            onClick={() => changeView('list')}
          >
            <Rows3 aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  )

  return (
    <>
      {/* 标题栏挂到滚动区上方的插槽里：它不在滚动层内，任何滚动 / 到边反馈都碰不到它 */}
      {headSlot ? createPortal(head, headSlot) : head}

      {/* 分类筛选：侧栏在窄屏是抽屉，这里保留一条横向筛选条 */}
      {!searching && (
        <div className={cx(s['filter-bar'], 'scroll-thin')} role="group" aria-label="按分类筛选">
          <button
            type="button"
            className={s.filter}
            data-active={activeCategory === null}
            aria-pressed={activeCategory === null}
            onClick={() => selectCategory(null)}
          >
            全部
            <span className={s['filter-count']}>{allTools.length}</span>
          </button>
          {CATEGORIES.map((item) => {
            const total = counts[item.id] ?? 0
            if (total === 0) return null
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className={s.filter}
                data-active={activeCategory === item.id}
                aria-pressed={activeCategory === item.id}
                onClick={() => selectCategory(item.id)}
              >
                <Icon aria-hidden="true" />
                {item.label}
                <span className={s['filter-count']}>{total}</span>
              </button>
            )
          })}
        </div>
      )}

      {scoped.length === 0 ? (
        searching ? (
          <EmptyState
            icon={SearchX}
            title="没有找到匹配的工具"
            description={`没有包含「${query.trim()}」的工具。试试工具名、英文别名或分类，比如「颜色」「json」「时间」。`}
            action={
              <Button variant="secondary" icon={X} onClick={() => setQuery('')}>
                清除搜索
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={SearchX}
            title="还没有工具"
            description="在 src/registry/tools.ts 里注册一个工具，它就会出现在这里。"
          />
        )
      ) : searching ? (
        <section className={s.section} aria-label="搜索结果">
          <p className={s['result-note']}>
            {scoped.length} 个工具包含「{query.trim()}」
          </p>
          {view === 'card' ? (
            <div className={s.grid}>
              {scoped.map((tool, index) => (
                <ToolCard key={tool.id} tool={tool} index={index} />
              ))}
            </div>
          ) : (
            <div className={s.list}>
              {scoped.map((tool) => (
                <ToolCard key={tool.id} tool={tool} variant="row" />
              ))}
            </div>
          )}
        </section>
      ) : (
        groups.map((group) => (
          <section key={group.category.id} className={s.section} aria-label={group.category.label}>
            <div className={s['section-head']}>
              <h2 className={s['section-title']}>
                <group.category.icon aria-hidden="true" />
                {group.category.label}
              </h2>
              <span className={s['section-desc']}>{group.category.description}</span>
            </div>
            {view === 'card' ? (
              <div className={s.grid}>
                {group.tools.map((tool, index) => (
                  <ToolCard key={tool.id} tool={tool} index={index} />
                ))}
              </div>
            ) : (
              <div className={cx(s.list)}>
                {group.tools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} variant="row" />
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </>
  )
}
