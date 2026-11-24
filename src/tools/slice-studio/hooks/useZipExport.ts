/** 批量导出状态机：空闲 → 处理中（进度）→ 完成（可重复下载）/ 失败，可取消 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { exportZip, isExportCancelled } from '../lib/export.ts'
import { triggerDownload } from '../lib/download.ts'
import type {
  ExportProgress,
  ExportResult,
  ExportSettings,
  ImageSource,
  SliceFile,
} from '../types.ts'

export type ExportPhase = 'idle' | 'working' | 'done' | 'error'

export function useZipExport(notify: (message: string, tone?: 'success' | 'error' | 'info') => void) {
  const [phase, setPhase] = useState<ExportPhase>('idle')
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [result, setResult] = useState<ExportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setPhase('idle')
    setProgress(null)
  }, [])

  const reset = useCallback(() => {
    cancel()
    setResult(null)
    setError(null)
  }, [cancel])

  const start = useCallback(
    async (source: ImageSource, files: SliceFile[], settings: ExportSettings) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      setPhase('working')
      setError(null)
      setResult(null)
      setProgress({ phase: 'encoding', current: 0, total: files.length, percent: 0 })

      try {
        const output = await exportZip(
          source,
          files,
          settings,
          (next) => {
            if (!controller.signal.aborted) setProgress(next)
          },
          controller.signal,
        )
        if (controller.signal.aborted) return
        setResult(output)
        setPhase('done')
        setProgress({ phase: 'packing', current: output.count, total: output.count, percent: 1 })
        triggerDownload(output.blob, output.filename)
        notify(`已打包 ${output.count} 张切片，开始下载`, 'success')
      } catch (cause) {
        if (isExportCancelled(cause) || controller.signal.aborted) {
          setPhase('idle')
          setProgress(null)
          return
        }
        const message = cause instanceof Error ? cause.message : '导出失败，请重试。'
        setError(message)
        setPhase('error')
        setProgress(null)
        notify(message, 'error')
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null
      }
    },
    [notify],
  )

  const downloadAgain = useCallback(() => {
    if (result) triggerDownload(result.blob, result.filename)
  }, [result])

  useEffect(() => () => controllerRef.current?.abort(), [])

  return { phase, progress, result, error, start, cancel, reset, downloadAgain }
}
