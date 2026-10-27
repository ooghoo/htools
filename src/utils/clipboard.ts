/**
 * 复制到剪贴板。
 *
 * 优先用异步 Clipboard API；它只在安全上下文（https / localhost）可用，
 * 所以 http 内网访问、或用 file:// 直接打开构建产物时会抛错，
 * 这时退回到隐藏 textarea + execCommand('copy') 的老办法。
 */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // 权限被拒或浏览器不支持，走降级
    }
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '-1000px'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}
