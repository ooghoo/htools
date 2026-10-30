import { lazy } from 'react'
import type { ToolCategory, ToolDefinition } from '@/types/tool'
import { CATEGORIES } from './categories'

import { manifest as colorConverter } from '@/tools/color-converter/manifest'
import { manifest as jsonFormatter } from '@/tools/json-formatter/manifest'
import { manifest as timestampConverter } from '@/tools/timestamp-converter/manifest'
import { manifest as byteConverter } from '@/tools/byte-converter/manifest'
import { manifest as base64 } from '@/tools/base64/manifest'
import { manifest as watermark } from '@/tools/watermark/manifest'

/**
 * ============================================================
 * 工具注册表 —— 新增工具只改这里，首页 / 搜索 / 分类 / 路由自动生效
 * ============================================================
 * 步骤：
 *   1. 建目录 src/tools/<你的工具>/
 *   2. 写 manifest.ts（元数据）和 index.tsx（default 导出组件）
 *   3. 在下面加一行 { ...manifest, component: lazy(...) }
 *
 * component 用 React.lazy 动态 import：每个工具单独打成一个 chunk，
 * 首页只加载注册表本身，进入工具时才下载对应代码。
 */
export const TOOL_REGISTRY: ToolDefinition[] = [
  { ...colorConverter, component: lazy(() => import('@/tools/color-converter')) },
  { ...jsonFormatter, component: lazy(() => import('@/tools/json-formatter')) },
  { ...timestampConverter, component: lazy(() => import('@/tools/timestamp-converter')) },
  { ...byteConverter, component: lazy(() => import('@/tools/byte-converter')) },
  { ...base64, component: lazy(() => import('@/tools/base64')) },
  { ...watermark, component: lazy(() => import('@/tools/watermark')) },
]

const CATEGORY_ORDER = new Map(CATEGORIES.map((category) => [category.id, category.order]))

function compareTools(a: ToolDefinition, b: ToolDefinition): number {
  const orderA = a.order ?? 999
  const orderB = b.order ?? 999
  if (orderA !== orderB) return orderA - orderB
  return a.name.localeCompare(b.name, 'zh-Hans-CN')
}

/** 已启用的工具，按分类顺序 → 工具权重排序 */
export function getEnabledTools(): ToolDefinition[] {
  return TOOL_REGISTRY.filter((tool) => tool.enabled !== false).sort((a, b) => {
    const catA = CATEGORY_ORDER.get(a.category) ?? 999
    const catB = CATEGORY_ORDER.get(b.category) ?? 999
    if (catA !== catB) return catA - catB
    return compareTools(a, b)
  })
}

/** 按 ID 取工具；已停用或不存在都返回 undefined，由调用方渲染 404 */
export function getToolById(id: string | undefined): ToolDefinition | undefined {
  if (!id) return undefined
  const tool = TOOL_REGISTRY.find((item) => item.id === id)
  if (!tool || tool.enabled === false) return undefined
  return tool
}

/** 按收藏顺序取工具，忽略已下线 / 已停用的 ID（存储里的脏数据不会渲染出空卡片） */
export function resolveToolsByIds(ids: string[]): ToolDefinition[] {
  return ids
    .map((id) => getToolById(id))
    .filter((tool): tool is ToolDefinition => tool !== undefined)
}

function scoreTool(tool: ToolDefinition, query: string): number {
  const name = tool.name.toLowerCase()
  const description = tool.description.toLowerCase()
  const id = tool.id.toLowerCase()

  if (name === query) return 100
  if (name.startsWith(query)) return 80
  if (name.includes(query)) return 60
  if (id.includes(query)) return 45
  if (tool.keywords.some((keyword) => keyword.toLowerCase().includes(query))) return 40
  if (tool.category.toLowerCase().includes(query)) return 30
  if (description.includes(query)) return 20
  return 0
}

/**
 * 关键词搜索：名称 > ID > 关键词 > 分类 > 描述。
 * 多个词用空格分隔时按「全部命中」处理，例如「颜色 hex」。
 */
export function searchTools(tools: ToolDefinition[], rawQuery: string): ToolDefinition[] {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return tools

  const terms = query.split(/\s+/).filter(Boolean)

  return tools
    .map((tool) => {
      const scores = terms.map((term) => scoreTool(tool, term))
      const total = scores.reduce((sum, score) => sum + score, 0)
      return { tool, matched: scores.every((score) => score > 0), total }
    })
    .filter((entry) => entry.matched)
    .sort((a, b) => b.total - a.total || compareTools(a.tool, b.tool))
    .map((entry) => entry.tool)
}

export interface ToolGroup {
  category: ToolCategory
  tools: ToolDefinition[]
}

/** 按分类分组，自动跳过空分类（停用某个分类下所有工具时不会留下空标题） */
export function groupToolsByCategory(tools: ToolDefinition[]): ToolGroup[] {
  return CATEGORIES.slice()
    .sort((a, b) => a.order - b.order)
    .map((category) => ({
      category,
      tools: tools.filter((tool) => tool.category === category.id),
    }))
    .filter((group) => group.tools.length > 0)
}

/** 统计每个分类下的工具数量，用于分类导航上的计数 */
export function countByCategory(tools: ToolDefinition[]): Record<string, number> {
  return tools.reduce<Record<string, number>>((acc, tool) => {
    acc[tool.category] = (acc[tool.category] ?? 0) + 1
    return acc
  }, {})
}
