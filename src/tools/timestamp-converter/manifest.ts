import { Clock3 } from 'lucide-react'
import type { ToolMeta } from '@/types/tool'

export const manifest: ToolMeta = {
  id: 'timestamp-converter',
  name: '时间戳转换',
  description: 'Unix 秒 / 毫秒与日期时间互转，明确标注时区',
  category: 'convert',
  icon: Clock3,
  accent: '#0ea5b7',
  keywords: ['timestamp', 'unix', 'time', '时间戳', '时间', '日期', '时区', 'utc', 'date'],
  order: 11,
}
