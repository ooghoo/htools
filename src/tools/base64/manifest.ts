import { Binary } from 'lucide-react'
import type { ToolMeta } from '@/types/tool'

export const manifest: ToolMeta = {
  id: 'base64',
  name: 'Base64 编解码',
  description: '文本与 Base64 互转，支持 URL 安全与换行',
  pageDescription:
    '文本与 Base64 双向转换，本地完成、自动识别 UTF-8，支持 URL 安全变体与自动换行。',
  category: 'convert',
  icon: Binary,
  accent: '#ff9500',
  keywords: ['base64', '编码', '解码', 'encode', 'decode', '编码转换', '二进制', 'url', 'base 64', '图片'],
  order: 20,
  // 标题栏右侧要放「示例」按钮与「?」说明，标题区由工具自己渲染
  customHeader: true,
}
