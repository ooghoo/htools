import { Database } from 'lucide-react'
import type { ToolMeta } from '@/types/tool'

export const manifest: ToolMeta = {
  id: 'byte-converter',
  name: '字节换算',
  description: 'Windows：二进制 1024 · macOS：十进制 1000',
  category: 'convert',
  icon: Database,
  accent: '#0071e3',
  keywords: ['byte', 'kb', 'mb', 'gb', '字节', '流量', '存储', '容量', '换算', '单位'],
  order: 12,
  // 标题行右侧要放「小数位」控件，标题区由工具自己渲染
  customHeader: true,
}
