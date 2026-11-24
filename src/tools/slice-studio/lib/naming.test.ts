import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildSliceFiles,
  effectivePrefix,
  padNumber,
  sanitizePrefix,
  sortBySequence,
  sourceBaseName,
  zipFilename,
} from './naming.ts'
import { computeGridRegions } from './grid.ts'
import { DEFAULT_EXPORT } from './constants.ts'
import type { ExportSettings } from '../types.ts'

const settings = (patch: Partial<ExportSettings> = {}): ExportSettings => ({ ...DEFAULT_EXPORT, ...patch })

test('前缀清洗：剔除非法字符，保留用户自定义内容', () => {
  assert.equal(sanitizePrefix('  my/photo:*?  '), 'myphoto')
  assert.equal(sanitizePrefix(''), '')
  assert.equal(sanitizePrefix('...'), '')
  assert.equal(sourceBaseName('旅行 照片.PNG'), '旅行 照片')
  assert.equal(effectivePrefix(settings(), '风景.png'), '风景-')
  assert.equal(effectivePrefix(settings({ prefix: 'IG_' }), '风景.png'), 'IG_')
})

test('编号补零：关闭 / 2 位 / 3 位 / 自动', () => {
  assert.equal(padNumber(7, 'none', 12), '7')
  assert.equal(padNumber(7, '2', 12), '07')
  assert.equal(padNumber(7, '3', 999), '007')
  assert.equal(padNumber(7, 'auto', 9), '07')
  assert.equal(padNumber(7, 'auto', 12), '07')
  assert.equal(padNumber(7, 'auto', 999), '007')
})

test('正序 / 逆序：编号方向变化，但每张图始终对应同一个编号', () => {
  const regions = computeGridRegions(900, 900, 3, 3)
  const asc = buildSliceFiles(regions, settings({ prefix: 'tile-' }), 'photo.png')
  assert.equal(asc[0].filename, 'tile-01.png')
  assert.equal(asc[8].filename, 'tile-09.png')
  assert.deepEqual(
    asc.map((f) => f.sequence),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  )

  const desc = buildSliceFiles(regions, settings({ prefix: 'tile-', order: 'desc' }), 'photo.png')
  assert.equal(desc[0].filename, 'tile-09.png')
  assert.equal(desc[8].filename, 'tile-01.png')
  assert.deepEqual(
    sortBySequence(desc).map((f) => f.filename),
    ['tile-01.png', 'tile-02.png', 'tile-03.png', 'tile-04.png', 'tile-05.png',
      'tile-06.png', 'tile-07.png', 'tile-08.png', 'tile-09.png'],
  )
  // 文件名不重复
  assert.equal(new Set(desc.map((f) => f.filename)).size, 9)
})

test('导出格式映射与 ZIP 名称', () => {
  const regions = computeGridRegions(600, 400, 2, 2)
  assert.equal(buildSliceFiles(regions, settings({ format: 'jpeg' }), 'a.jpg')[0].filename, 'a-01.jpg')
  assert.equal(buildSliceFiles(regions, settings({ format: 'webp', prefix: 'p' }), 'a.jpg')[0].filename, 'p01.webp')
  assert.equal(zipFilename(settings({ format: 'png' }), 'a.jpg', 4), 'a-4-png.zip')
  assert.equal(zipFilename(settings({ prefix: 'IG_' }), 'a.jpg', 9), 'IG-9-png.zip')
})
