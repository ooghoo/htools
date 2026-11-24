import test from 'node:test'
import assert from 'node:assert/strict'

import { assertCanvasSize, encodeOptionsFromSettings, encodeSliceOffscreen, paintSlice } from './encode.ts'
import { DEFAULT_EXPORT } from './constants.ts'
import type { EncodeOptions, ExportSettings } from '../types.ts'

interface RecordedCtx {
  fillStyle: string
  imageSmoothingEnabled: boolean
  cleared: number[] | null
  filled: number[] | null
  drawn: unknown[] | null
}

function makeCanvas(returnedType?: string) {
  const ctx: RecordedCtx = {
    fillStyle: '',
    imageSmoothingEnabled: true,
    cleared: null,
    filled: null,
    drawn: null,
  }
  const canvas = {
    width: 1,
    height: 1,
    getContext: () => ({
      set fillStyle(value: string) {
        ctx.fillStyle = value
      },
      get fillStyle() {
        return ctx.fillStyle
      },
      set imageSmoothingEnabled(value: boolean) {
        ctx.imageSmoothingEnabled = value
      },
      get imageSmoothingEnabled() {
        return ctx.imageSmoothingEnabled
      },
      clearRect: (...args: number[]) => {
        ctx.cleared = args
      },
      fillRect: (...args: number[]) => {
        ctx.filled = args
      },
      drawImage: (...args: unknown[]) => {
        ctx.drawn = args
      },
    }),
    convertToBlob: async ({ type }: { type: string }) =>
      new Blob(['encoded'], { type: returnedType ?? type }),
  }
  return { canvas: canvas as unknown as OffscreenCanvas, ctx }
}

const RECT = { x: 120, y: 80, w: 333, h: 250 }
const source = { tag: 'bitmap' } as unknown as ImageBitmap

test('编码画布尺寸 = 切片尺寸，源矩形与目标矩形 1:1（不缩放）', async () => {
  const { canvas, ctx } = makeCanvas()
  const options: EncodeOptions = { mime: 'image/png', quality: 1, background: null }
  await encodeSliceOffscreen(source, canvas, RECT, options)

  assert.equal(canvas.width, RECT.w)
  assert.equal(canvas.height, RECT.h)
  assert.equal(ctx.imageSmoothingEnabled, false)
  assert.deepEqual(ctx.cleared, [0, 0, RECT.w, RECT.h])
  assert.equal(ctx.filled, null, 'PNG 不应铺背景色')
  assert.deepEqual(ctx.drawn, [
    source,
    RECT.x,
    RECT.y,
    RECT.w,
    RECT.h,
    0,
    0,
    RECT.w,
    RECT.h,
  ])
})

test('JPG 用背景色铺底后再绘制；WebP 保留透明', async () => {
  const jpeg = makeCanvas()
  await encodeSliceOffscreen(source, jpeg.canvas, RECT, {
    mime: 'image/jpeg',
    quality: 0.8,
    background: '#ff0000',
  })
  assert.equal(jpeg.ctx.fillStyle, '#ff0000')
  assert.deepEqual(jpeg.ctx.filled, [0, 0, RECT.w, RECT.h])

  const webp = makeCanvas()
  await encodeSliceOffscreen(source, webp.canvas, RECT, {
    mime: 'image/webp',
    quality: 0.85,
    background: null,
  })
  assert.equal(webp.ctx.filled, null)
})

test('浏览器不支持 WebP 时明确报错，而不是静默导出 PNG', async () => {
  const { canvas } = makeCanvas('image/png')
  await assert.rejects(
    () =>
      encodeSliceOffscreen(source, canvas, RECT, {
        mime: 'image/webp',
        quality: 0.9,
        background: null,
      }),
    /不支持 WebP 编码/,
  )
})

test('导出设置 → 编码参数：仅 JPG 带背景色', () => {
  const settings: ExportSettings = { ...DEFAULT_EXPORT, background: '#123456', quality: 0.7 }
  assert.deepEqual(encodeOptionsFromSettings({ ...settings, format: 'png' }), {
    mime: 'image/png',
    quality: 0.7,
    background: null,
  })
  assert.deepEqual(encodeOptionsFromSettings({ ...settings, format: 'webp' }), {
    mime: 'image/webp',
    quality: 0.7,
    background: null,
  })
  assert.deepEqual(encodeOptionsFromSettings({ ...settings, format: 'jpeg' }), {
    mime: 'image/jpeg',
    quality: 0.7,
    background: '#123456',
  })
})

test('画布上限：超大或 0 尺寸切片会被拒绝', () => {
  assert.throws(() => assertCanvasSize({ x: 0, y: 0, w: 0, h: 10 }), /尺寸无效/)
  assert.throws(() => assertCanvasSize({ x: 0, y: 0, w: 20000, h: 10 }), /边长超过/)
  assert.throws(() => assertCanvasSize({ x: 0, y: 0, w: 6000, h: 6000 }), /像素数超过/)
  assert.doesNotThrow(() => assertCanvasSize(RECT))
})

test('paintSlice 可直接复用上下文，不依赖 DOM', () => {
  const ctx = {
    fillStyle: '',
    imageSmoothingEnabled: true,
    clearRect: () => {},
    fillRect: () => {},
    drawImage: () => {},
  }
  assert.doesNotThrow(() =>
    paintSlice(ctx, source, RECT, { mime: 'image/png', quality: 1, background: null }),
  )
})
