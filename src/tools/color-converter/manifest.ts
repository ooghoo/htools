import { Palette } from 'lucide-react'
import type { ToolMeta } from '@/types/tool'

export const manifest: ToolMeta = {
  id: 'color-converter',
  name: '颜色转换',
  description: 'HEX / RGB / HSL 互转，带色值预览与一键复制',
  category: 'convert',
  icon: Palette,
  accent: '#ff375f',
  keywords: ['color', 'hex', 'rgb', 'hsl', '颜色', '色值', '取色', '配色', 'convert'],
  order: 10,
}
