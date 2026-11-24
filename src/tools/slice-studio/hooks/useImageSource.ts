/** 图片源状态机：空 / 读取中 / 就绪 / 错误，并在换图与卸载时释放资源 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { readImageFile, releaseImageSource } from '../lib/image.ts'
import type { ImageSource } from '../types.ts'

export function useImageSource() {
  const [source, setSource] = useState<ImageSource | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sourceRef = useRef<ImageSource | null>(null)
  const requestId = useRef(0)
  sourceRef.current = source

  const load = useCallback(async (file: File) => {
    const id = requestId.current + 1
    requestId.current = id
    setLoading(true)
    setError(null)
    try {
      const next = await readImageFile(file)
      // 用户在解码期间又换了图：丢弃这次结果
      if (id !== requestId.current) {
        releaseImageSource(next)
        return
      }
      const previous = sourceRef.current
      setSource(next)
      releaseImageSource(previous)
    } catch (cause) {
      if (id === requestId.current) {
        setError(cause instanceof Error ? cause.message : '图片读取失败，请重试。')
      }
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    requestId.current += 1
    releaseImageSource(sourceRef.current)
    setSource(null)
    setError(null)
    setLoading(false)
  }, [])

  const dismissError = useCallback(() => setError(null), [])

  useEffect(() => {
    return () => {
      releaseImageSource(sourceRef.current)
    }
  }, [])

  return { source, loading, error, load, clear, dismissError }
}
