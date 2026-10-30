import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileDown, ImagePlus, Plus } from 'lucide-react'
import { useToast } from '@/app/contexts'
import { Button } from '@/components/ui/Button'
import { Chips } from '@/components/ui/Chips'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Segmented } from '@/components/ui/Segmented'
import { Select } from '@/components/ui/Select'
import { Slider } from '@/components/ui/Slider'
import { TextArea } from '@/components/ui/TextArea'
import { Toggle } from '@/components/ui/Toggle'
import {
  ANGLE_PRESETS,
  DEFAULT_OUTPUT,
  DEFAULT_WATERMARK,
  FONT_OPTIONS,
  PRESETS,
  SWATCHES,
  WEIGHT_OPTIONS,
  averageLuma,
  downscale,
  downloadBlob,
  drawWatermark,
  exportBlob,
  loadImageFile,
  makeZip,
  outputName,
  stamp,
  targetSize,
  type OutputFormat,
  type OutputSize,
  type WatermarkItem,
  type WatermarkLayout,
  type WatermarkPos,
  type WatermarkSettings,
  type ZipEntry,
} from './render'
import s from './styles.module.css'

type TabKey = 'content' | 'style' | 'export'

const TABS: { value: TabKey; label: string }[] = [
  { value: 'content', label: '内容' },
  { value: 'style', label: '样式' },
  { value: 'export', label: '导出' },
]

const LAYOUTS: { value: WatermarkLayout; label: string }[] = [
  { value: 'tile', label: '平铺铺满' },
  { value: 'single', label: '单个水印' },
]

const OUTPUT_SIZES: { value: OutputSize; label: string }[] = [
  { value: 'original', label: '原图' },
  { value: 'half', label: '0.5×' },
  { value: 'long', label: '长边 1080' },
  { value: 'custom', label: '自定义缩放' },
]

const FORMATS: { value: OutputFormat; label: string }[] = [
  { value: 'jpeg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
]

const POSITIONS: WatermarkPos[] = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br']

export default function WatermarkTool() {
  const { notify } = useToast()

  const [items, setItems] = useState<WatermarkItem[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [wm, setWm] = useState<WatermarkSettings>(DEFAULT_WATERMARK)
  const [out, setOut] = useState(DEFAULT_OUTPUT)
  const [tab, setTab] = useState<TabKey>('content')
  const [busy, setBusy] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const stageRef = useRef<HTMLDivElement>(null)
  const panelBodyRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const uidRef = useRef(0)

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) ?? items[0] ?? null,
    [items, activeId],
  )

  const patch = useCallback((next: Partial<WatermarkSettings>) => {
    setWm((current) => ({ ...current, ...next }))
  }, [])

  /* ---------------- 添加 / 移除图片 ---------------- */

  const addFiles = useCallback(
    async (input: FileList | File[] | null) => {
      const files = Array.from(input ?? []).filter((file) => file.type.startsWith('image/'))
      if (files.length === 0) return

      const added: WatermarkItem[] = []
      for (const file of files) {
        try {
          const { img, url } = await loadImageFile(file)
          if (!img.naturalWidth || !img.naturalHeight) {
            URL.revokeObjectURL(url)
            continue
          }
          uidRef.current += 1
          added.push({
            id: uidRef.current,
            name: file.name || `图片-${uidRef.current}`,
            url,
            img,
            w: img.naturalWidth,
            h: img.naturalHeight,
            preview: downscale(img, 1800),
            luma: averageLuma(img),
          })
        } catch {
          // 单张解码失败就跳过，不影响其余图片
        }
      }

      if (added.length === 0) {
        notify('这些文件没法解码成图片', 'error')
        return
      }

      setItems((current) => [...current, ...added])
      setActiveId((current) => current ?? added[0].id)
      notify(added.length > 1 ? `已添加 ${added.length} 张图片` : '已添加 1 张图片')
    },
    [notify],
  )

  const removeItem = useCallback((id: number) => {
    setItems((current) => {
      const target = current.find((item) => item.id === id)
      if (target) URL.revokeObjectURL(target.url)
      const next = current.filter((item) => item.id !== id)
      setActiveId((currentActive) => {
        if (currentActive !== id) return currentActive
        return next[0]?.id ?? null
      })
      return next
    })
  }, [])

  /* ---------------- 预览渲染 ---------------- */

  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return

    if (!activeItem) {
      canvas.style.display = 'none'
      return
    }
    canvas.style.display = 'block'

    const rect = stage.getBoundingClientRect()
    const availW = Math.max(80, rect.width - 36)
    const availH = Math.max(80, rect.height - 36)
    const scale = Math.min(availW / activeItem.w, availH / activeItem.h)
    const displayW = Math.max(1, Math.round(activeItem.w * scale))
    const displayH = Math.max(1, Math.round(activeItem.h * scale))

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.style.width = `${displayW}px`
    canvas.style.height = `${displayH}px`

    const pixelW = Math.round(displayW * dpr)
    const pixelH = Math.round(displayH * dpr)
    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW
      canvas.height = pixelH
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, displayW, displayH)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(activeItem.preview, 0, 0, displayW, displayH)
    drawWatermark(ctx, displayW, displayH, wm, activeItem.luma)
  }, [activeItem, wm])

  useEffect(() => {
    renderPreview()
  }, [renderPreview])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => renderPreview())
    observer.observe(stage)
    return () => observer.disconnect()
  }, [renderPreview])

  /* ---------------- 拖入 / 粘贴 ---------------- */

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = event.clipboardData?.files
      if (files && files.length > 0) void addFiles(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addFiles])

  /* ---------------- 导出 ---------------- */

  const handleExport = useCallback(
    async (onlyCurrent: boolean) => {
      const targets = onlyCurrent ? (activeItem ? [activeItem] : []) : items
      if (targets.length === 0) {
        fileInputRef.current?.click()
        return
      }
      if (busy) return

      try {
        if (targets.length === 1) {
          const item = targets[0]
          setBusy('正在生成…')
          const blob = await exportBlob(item, targetSize(item.w, item.h, out), wm, out)
          if (blob) {
            downloadBlob(blob, outputName(item, out))
            notify('已开始下载')
          } else {
            notify('导出失败，请重试', 'error')
          }
          return
        }

        const entries: ZipEntry[] = []
        for (let index = 0; index < targets.length; index += 1) {
          const item = targets[index]
          setBusy(`正在处理 ${index + 1} / ${targets.length}`)
          // 让出一帧，避免大图连续处理时界面卡死
          await new Promise((resolve) => window.setTimeout(resolve, 16))
          const blob = await exportBlob(item, targetSize(item.w, item.h, out), wm, out)
          if (blob) {
            entries.push({
              name: outputName(item, out),
              data: new Uint8Array(await blob.arrayBuffer()),
            })
          }
        }

        setBusy('正在打包…')
        await new Promise((resolve) => window.setTimeout(resolve, 16))
        const zip = makeZip(entries)
        downloadBlob(new Blob([zip], { type: 'application/zip' }), `水印-${stamp()}.zip`)
        notify(`已导出 ${entries.length} 张图片`)
      } catch (error) {
        const message = error instanceof Error ? error.message : '未知错误'
        notify(`导出失败：${message}`, 'error')
      } finally {
        setBusy(null)
      }
    },
    [activeItem, busy, items, notify, out, wm],
  )

  /* ---------------- 渲染 ---------------- */

  const activePreset = useMemo(() => {
    const found = PRESETS.find((preset) => {
      const keys = Object.keys(preset.patch) as (keyof WatermarkSettings)[]
      return keys.every((key) => preset.patch[key] === wm[key])
    })
    return found?.name ?? null
  }, [wm])

  return (
    <>
      <div className={s.app} data-fill="true">
        <section className={s.stage}>
          <div
            ref={stageRef}
            className={s['stage-inner']}
            data-drag={dragOver}
            onDragEnter={(event) => {
              event.preventDefault()
              setDragOver(true)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={(event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node)) return
              setDragOver(false)
            }}
            onDrop={(event) => {
              event.preventDefault()
              setDragOver(false)
              void addFiles(event.dataTransfer.files)
            }}
          >
            <canvas ref={canvasRef} className={s.canvas} style={{ display: 'none' }} />
            {!activeItem && (
              <div className={s.tip}>
                <strong>还没有图片</strong>
                点下方 + 添加，也可以拖入或粘贴
              </div>
            )}
            {activeItem && (
              <span className={s.meta}>
                {activeItem.w}×{activeItem.h}
              </span>
            )}
          </div>

          <div className={s.thumbBar}>
            <div className={s.thumbs}>
              {items.map((item) => (
                <div key={item.id} className={s['thumb-wrap']}>
                  <button
                    type="button"
                    className={s.thumb}
                    data-active={item.id === activeItem?.id}
                    onClick={() => setActiveId(item.id)}
                    title={item.name}
                    aria-label={`预览 ${item.name}`}
                    aria-pressed={item.id === activeItem?.id}
                  >
                    <img src={item.url} alt="" />
                  </button>
                  <button
                    type="button"
                    className={s['thumb-x']}
                    aria-label={`移除 ${item.name}`}
                    title="移除这张"
                    onClick={() => removeItem(item.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* + 固定在右侧，不随缩略图一起滚走 */}
            <button
              type="button"
              className={s['thumb-add']}
              onClick={() => fileInputRef.current?.click()}
              aria-label="添加图片"
              title="添加图片"
            >
              <Plus aria-hidden="true" />
            </button>
          </div>

          <p className={s.note}>
            共 <strong>{items.length}</strong> 张 · 样式对所有图片统一生效，导出时按每张图的实际尺寸重绘
          </p>
        </section>

        <aside className={s.panel}>
          <div className={s['panel-tabs']}>
            <Segmented
              value={tab}
              options={TABS}
              onChange={(next) => {
                setTab(next)
                // 切分组回到顶部，避免沿用上一个分组的滚动位置
                panelBodyRef.current?.scrollTo({ top: 0 })
              }}
              ariaLabel="参数分组"
            />
          </div>

          <div ref={panelBodyRef} className={s['panel-body']}>
            {tab === 'content' && (
              <>
                <Field label="快捷预设">
                  <Chips
                    options={PRESETS.map((preset) => ({ value: preset.name, label: preset.name }))}
                    value={activePreset}
                    ariaLabel="水印预设"
                    onChange={(name) => {
                      const preset = PRESETS.find((item) => item.name === name)
                      if (preset) patch(preset.patch)
                    }}
                  />
                </Field>

                <Field inline label="水印类型">
                  <Segmented
                    value={wm.kind}
                    options={[
                      { value: 'text', label: '文字' },
                      { value: 'image', label: '图片 Logo' },
                    ]}
                    onChange={(kind) => {
                      patch({ kind })
                      if (kind === 'image' && !wm.logo) logoInputRef.current?.click()
                    }}
                    ariaLabel="水印类型"
                  />
                </Field>

                {wm.kind === 'text' ? (
                  <Field label="水印文字" hint="支持换行，角度与间距在下方调整">
                    <TextArea
                      rows={3}
                      value={wm.text}
                      mono={false}
                      placeholder="输入水印文字，回车换行…"
                      onChange={(event) => patch({ text: event.target.value })}
                    />
                  </Field>
                ) : (
                  <>
                    <Field label="Logo 图片" hint="PNG 透明底效果最好；字体相关设置不生效">
                      <Button
                        variant="secondary"
                        block
                        icon={ImagePlus}
                        onClick={() => logoInputRef.current?.click()}
                      >
                        选择 Logo 图片
                      </Button>
                      {wm.logo && (
                        <div className={s['logo-preview']}>
                          <img src={wm.logo.src} alt="" />
                          <span className={s['logo-name']}>{wm.logoName || '自定义 Logo'}</span>
                          <button
                            type="button"
                            className={s['logo-clear']}
                            onClick={() => patch({ logo: null, logoName: '' })}
                          >
                            移除
                          </button>
                        </div>
                      )}
                    </Field>
                    <Slider
                      label="Logo 宽度（按图宽）"
                      value={wm.logoScale}
                      min={2}
                      max={60}
                      step={1}
                      suffix="%"
                      onChange={(logoScale) => patch({ logoScale })}
                    />
                  </>
                )}

                <Field inline label="排列方式">
                  <Segmented
                    value={wm.layout}
                    options={LAYOUTS}
                    onChange={(layout) => patch({ layout })}
                    ariaLabel="排列方式"
                  />
                </Field>

                <Slider
                  label="旋转角度"
                  value={wm.angle}
                  min={-90}
                  max={90}
                  step={1}
                  suffix="°"
                  onChange={(angle) => patch({ angle })}
                />
                <Chips
                  options={ANGLE_PRESETS.map((angle) => ({ value: angle, label: `${angle}°` }))}
                  value={wm.angle}
                  ariaLabel="常用角度"
                  onChange={(angle) => patch({ angle })}
                />

                {wm.layout === 'single' ? (
                  <Field label="位置">
                    <div className={s.grid9}>
                      {POSITIONS.map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          data-on={wm.pos === pos}
                          aria-label={`水印位置 ${pos}`}
                          aria-pressed={wm.pos === pos}
                          onClick={() => patch({ pos })}
                        />
                      ))}
                    </div>
                  </Field>
                ) : (
                  <>
                    <Slider
                      label="横向间距"
                      value={wm.gapX}
                      min={0}
                      max={6}
                      step={0.1}
                      decimals={1}
                      suffix="×"
                      onChange={(gapX) => patch({ gapX })}
                    />
                    <Slider
                      label="纵向间距"
                      value={wm.gapY}
                      min={0}
                      max={6}
                      step={0.1}
                      decimals={1}
                      suffix="×"
                      onChange={(gapY) => patch({ gapY })}
                    />
                  </>
                )}
              </>
            )}

            {tab === 'style' && (
              <>
                <Field label="字体" htmlFor="wm-font">
                  <Select
                    id="wm-font"
                    value={wm.font}
                    options={FONT_OPTIONS}
                    onChange={(font) => patch({ font })}
                    aria-label="字体"
                  />
                </Field>

                <Field label="字重" htmlFor="wm-weight">
                  <Select
                    id="wm-weight"
                    value={wm.weight}
                    options={WEIGHT_OPTIONS}
                    onChange={(weight) => patch({ weight })}
                    aria-label="字重"
                  />
                </Field>

                <Slider
                  label="字号（按图宽比例）"
                  value={wm.size}
                  min={1}
                  max={20}
                  step={0.1}
                  decimals={1}
                  suffix="%"
                  onChange={(size) => patch({ size })}
                />
                <Slider
                  label="字间距"
                  value={wm.tracking}
                  min={0}
                  max={0.4}
                  step={0.01}
                  decimals={2}
                  suffix=" em"
                  onChange={(tracking) => patch({ tracking })}
                />
                <Slider
                  label="不透明度"
                  value={wm.opacity}
                  min={5}
                  max={100}
                  step={1}
                  suffix="%"
                  onChange={(opacity) => patch({ opacity })}
                />

                <Field label="颜色">
                  <div className={s.row}>
                    <input
                      type="color"
                      className={s['color-input']}
                      value={wm.color}
                      aria-label="自定义颜色"
                      onChange={(event) => patch({ color: event.target.value, autoContrast: false })}
                    />
                    <span className={s.mini}>自定义</span>
                    <div className={s.row} style={{ marginLeft: 'auto' }}>
                      {SWATCHES.map((color) => (
                        <button
                          key={color}
                          type="button"
                          aria-label={`使用颜色 ${color}`}
                          title={color}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            border: '1px solid var(--border)',
                            background: color,
                            boxShadow: 'var(--shadow-xs)',
                          }}
                          onClick={() => patch({ color, autoContrast: false })}
                        />
                      ))}
                    </div>
                  </div>
                </Field>

                <Toggle
                  label="自动对比"
                  description="按每张图的明暗自动切白字 / 深色字"
                  checked={wm.autoContrast}
                  onChange={(autoContrast) => patch({ autoContrast })}
                />

                <Slider
                  label="描边粗细"
                  value={wm.stroke}
                  min={0}
                  max={15}
                  step={0.5}
                  decimals={1}
                  suffix="%"
                  onChange={(stroke) => patch({ stroke })}
                />

                <Field label="描边颜色">
                  <div className={s.row}>
                    <input
                      type="color"
                      className={s['color-input']}
                      value={wm.strokeColor}
                      aria-label="描边颜色"
                      onChange={(event) => patch({ strokeColor: event.target.value })}
                    />
                    <span className={s.mini}>{wm.strokeColor}</span>
                  </div>
                </Field>

                <Toggle
                  label="投影"
                  description="提升浅色背景上的可读性"
                  checked={wm.shadow}
                  onChange={(shadow) => patch({ shadow })}
                />
              </>
            )}

            {tab === 'export' && (
              <>
                <Field label="输出尺寸">
                  <Chips
                    options={OUTPUT_SIZES}
                    value={out.size}
                    ariaLabel="输出尺寸"
                    onChange={(size) => setOut((current) => ({ ...current, size }))}
                  />
                </Field>

                {out.size === 'custom' && (
                  <Field label="长边像素" htmlFor="out-custom" hint="范围 64–8000，超出画布上限会自动等比缩小">
                    <Input
                      id="out-custom"
                      mono
                      type="number"
                      min={64}
                      max={8000}
                      step={10}
                      value={out.custom}
                      onChange={(event) => {
                        const value = Number(event.target.value)
                        setOut((current) => ({ ...current, custom: Number.isFinite(value) ? value : current.custom }))
                      }}
                      suffix="px"
                    />
                  </Field>
                )}

                <Field label="格式">
                  <Segmented
                    value={out.format}
                    options={FORMATS}
                    onChange={(format) => setOut((current) => ({ ...current, format }))}
                    ariaLabel="输出格式"
                  />
                </Field>

                {out.format === 'jpeg' && (
                  <Slider
                    label="画质"
                    value={out.quality}
                    min={50}
                    max={100}
                    step={1}
                    suffix="%"
                    onChange={(quality) => setOut((current) => ({ ...current, quality }))}
                  />
                )}
              </>
            )}
          </div>

          <div className={s['panel-foot']}>
            <Button
              variant="primary"
              block
              icon={Download}
              loading={busy !== null}
              onClick={() => void handleExport(false)}
            >
              {items.length > 1 ? `导出全部（${items.length} 张）` : '导出图片'}
            </Button>
            {items.length > 1 && activeItem && (
              <Button variant="ghost" block icon={FileDown} onClick={() => void handleExport(true)}>
                仅导出当前这张
              </Button>
            )}
          </div>
        </aside>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          void addFiles(event.target.files)
          event.target.value = ''
        }}
      />
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          void loadImageFile(file)
            .then(({ img, url }) => {
              patch({ logo: img, logoName: file.name, kind: 'image' })
              // Logo 已经解码进内存，释放 blob URL
              window.setTimeout(() => URL.revokeObjectURL(url), 0)
            })
            .catch(() => notify('Logo 图片无法解码', 'error'))
        }}
      />

      {busy && (
        <div className={s.busy} role="status" aria-live="polite">
          <div className={s['busy-card']}>
            <span className={s.spinner} aria-hidden="true" />
            {busy}
          </div>
        </div>
      )}
    </>
  )
}
