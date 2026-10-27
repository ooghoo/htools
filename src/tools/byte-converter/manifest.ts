import { Database } from 'lucide-react'
import type { ToolMeta } from '@/types/tool'

export const manifest: ToolMeta = {
  id: 'byte-converter',
  name: '字节换算',
  description:
    '二进制（1024）：Windows 内存与文件系统的算法 · 十进制（1000）：macOS 与硬盘厂商的算法 · 1 Byte = 8 bit',
  category: 'convert',
  icon: Database,
  accent: '#0071e3',
  keywords: ['byte', 'kb', 'mb', 'gb', '字节', '流量', '存储', '容量', '换算', '单位'],
  order: 12,
}
