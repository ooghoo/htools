/** 轻量 className 拼接，避免为此引入 classnames 依赖 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
