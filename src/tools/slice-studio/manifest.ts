import { Scissors } from 'lucide-react'
import type { ToolMeta } from '@/types/tool'

export const manifest: ToolMeta = {
  id: 'slice-studio',
  name: '图片切割',
  description: '网格 / 自定义切割，实时预览并打包导出切片',
  pageDescription: '纯本地图片切割工作台 · 图片不会上传到任何服务器',
  category: 'image',
  icon: Scissors,
  accent: '#0a84ff',
  keywords: [
    'slice',
    'split',
    'crop',
    'grid',
    'image',
    '切图',
    '切割',
    '切片',
    '九宫格',
    '网格',
    'zip',
    'Slice Studio',
  ],
  order: 11,
  // 工具自己画标题栏：右侧要放源图信息与更换 / 清空 / 导出操作
  customHeader: true,
}
