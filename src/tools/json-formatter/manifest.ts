import { Braces } from 'lucide-react'
import type { ToolMeta } from '@/types/tool'

export const manifest: ToolMeta = {
  id: 'json-formatter',
  name: 'JSON 格式化',
  description: '格式化、压缩与合法性校验，报错精确定位到行列',
  category: 'text',
  icon: Braces,
  accent: '#8b5cf6',
  keywords: ['json', 'format', '格式化', '美化', '压缩', '校验', 'beautify', 'minify', 'validate'],
  order: 10,
  // 标题栏右侧要放「示例」按钮，标题区由工具自己渲染
  customHeader: true,
}
