import type { ComponentType, LazyExoticComponent } from 'react'
import type { LucideIcon } from 'lucide-react'

/**
 * 工具分类。
 * 新增分类要同时更新 CATEGORIES（src/registry/categories.ts），
 * 否则该分类的工具不会出现在分类导航里（首页仍会兜底展示）。
 */
export type ToolCategoryId = 'convert' | 'text' | 'image'

export interface ToolCategory {
  id: ToolCategoryId
  /** 分类导航上的名称，2 个字最佳 */
  label: string
  /** 分类说明，用于首页分组标题右侧 */
  description: string
  /** 分类图标，与工具图标同源，保证视觉一致 */
  icon: LucideIcon
  /** 分组的展示顺序，小的在前 */
  order: number
}

/**
 * 工具元数据：每个工具的 manifest.ts 导出这样一个对象。
 * 首页的展示、搜索、分类和路由查找全部基于它，与工具实现解耦。
 */
export interface ToolMeta {
  /** 唯一 ID，同时作为路由参数：/tools/:id —— 发布后不要再改 */
  id: string
  name: string
  /** 一句话描述，建议 24 字以内，用于首页卡片 */
  description: string
  /** 工具页标题下方的说明；不填则复用 description */
  pageDescription?: string
  category: ToolCategoryId
  /** 图标组件，统一来自 lucide-react */
  icon: LucideIcon
  /** 图标底色（HEX），用于区分不同工具 */
  accent: string
  /** 搜索关键词：别名、英文名、常见拼写错误都可以放进来 */
  keywords: string[]
  /** 排序权重，小的在前；不填则按名称排 */
  order?: number
  /** 是否启用，false 时不展示、路由直接 404；默认 true */
  enabled?: boolean
  /**
   * 工具自己渲染页面标题区（H1 + 副标题）。
   * 面包屑始终由平台渲染；置为 true 时平台不再渲染默认的名称/描述块，
   * 适合标题旁边还要放页面级控件的工具。
   */
  customHeader?: boolean
}

/** 注册表里的完整条目：元数据 + 懒加载的组件 */
export interface ToolDefinition extends ToolMeta {
  component: LazyExoticComponent<ComponentType>
}

/** 工具组件不接收任何 props，一切状态由工具自己管理 */
export type ToolComponent = ComponentType
