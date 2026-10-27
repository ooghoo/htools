import { Image } from 'lucide-react'
import type { ToolMeta } from '@/types/tool'

export const manifest: ToolMeta = {
  id: 'watermark',
  name: '图片水印',
  description: '批量加水印，本地 Canvas 处理，导出按像素缩放',
  category: 'image',
  icon: Image,
  accent: '#5e5ce6',
  keywords: ['watermark', 'image', 'photo', '水印', '图片', '照片', '批量', '加水印', '版权'],
  order: 10,
}
