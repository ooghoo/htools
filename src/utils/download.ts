/** 触发浏览器下载一段文本，全程本地，不经过网络 */
export function downloadText(filename: string, text: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // 交给浏览器读完再释放
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
