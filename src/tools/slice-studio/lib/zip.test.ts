import test from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'

import { DEFAULT_EXPORT } from './constants.ts'
import { computeGridRegions } from './grid.ts'
import { buildSliceFiles, sortBySequence } from './naming.ts'

test('ZIP 条目按编号 1 → N 顺序写入，逆序编号时依然成立', async () => {
  const regions = computeGridRegions(900, 600, 2, 3)
  const files = sortBySequence(
    buildSliceFiles(regions, { ...DEFAULT_EXPORT, prefix: 'tile-', order: 'desc' }, 'photo.png'),
  )

  const zip = new JSZip()
  for (const file of files) {
    zip.file(file.filename, `content-${file.sequence}`, { binary: true })
  }
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' })
  const reopened = await JSZip.loadAsync(buffer)

  const names = Object.keys(reopened.files).filter((name) => !reopened.files[name].dir)
  assert.deepEqual(names, [
    'tile-01.png',
    'tile-02.png',
    'tile-03.png',
    'tile-04.png',
    'tile-05.png',
    'tile-06.png',
  ])
  assert.equal(await reopened.file('tile-01.png')?.async('string'), 'content-1')
  assert.equal(await reopened.file('tile-06.png')?.async('string'), 'content-6')
})
