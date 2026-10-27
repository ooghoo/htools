import { Suspense, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useRecentTools } from '@/app/contexts'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToolLayout, ToolLoading } from '@/layouts/ToolLayout'
import { getToolById } from '@/registry/tools'
import { NotFoundPage } from './NotFoundPage'

const SITE_TITLE = 'htools · 个人 Web 工具集'

/**
 * 工具页：/tools/:toolId
 * 从注册表取组件（React.lazy），未注册或已停用的 ID 直接渲染 404。
 */
export function ToolPage() {
  const { toolId } = useParams()
  const tool = getToolById(toolId)
  const { recordVisit } = useRecentTools()

  // 最近使用：只记工具 ID 与时间，不记任何输入内容
  useEffect(() => {
    if (tool) recordVisit(tool.id)
  }, [tool, recordVisit])

  useEffect(() => {
    document.title = tool ? `${tool.name} · htools` : `未找到 · htools`
    return () => {
      document.title = SITE_TITLE
    }
  }, [tool])

  if (!tool) return <NotFoundPage />

  const Tool = tool.component

  return (
    <ToolLayout tool={tool}>
      <ErrorBoundary resetKey={tool.id}>
        <Suspense fallback={<ToolLoading />}>
          <Tool />
        </Suspense>
      </ErrorBoundary>
    </ToolLayout>
  )
}
