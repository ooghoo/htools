import { ArrowLeftRight, Image, Type } from 'lucide-react'
import type { ToolCategory, ToolCategoryId } from '@/types/tool'

/**
 * 分类清单：分类导航的顺序与文案都在这里改，工具只需在 manifest 里标注 category。
 */
export const CATEGORIES: ToolCategory[] = [
  {
    id: 'convert',
    label: '转换',
    description: '单位、编码与时间表示之间的互转',
    icon: ArrowLeftRight,
    order: 1,
  },
  {
    id: 'text',
    label: '文本',
    description: '格式化、校验与整理文本内容',
    icon: Type,
    order: 2,
  },
  {
    id: 'image',
    label: '图片',
    description: '在浏览器本地处理图片，不上传服务器',
    icon: Image,
    order: 3,
  },
]

const CATEGORY_MAP = new Map<ToolCategoryId, ToolCategory>(CATEGORIES.map((c) => [c.id, c]))

export function getCategory(id: ToolCategoryId): ToolCategory | undefined {
  return CATEGORY_MAP.get(id)
}

export function categoryLabel(id: ToolCategoryId): string {
  return CATEGORY_MAP.get(id)?.label ?? '其他'
}
