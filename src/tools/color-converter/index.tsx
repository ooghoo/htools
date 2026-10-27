import { useMemo, useState } from 'react'
import { Shuffle, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { ValueList } from '@/components/ui/ValueList'
import { COLOR_EXAMPLE, formatHsl, formatRgb, parseColor, randomHex, readableTextColor, rgbToHex, rgbToHsl } from './logic'
import s from './styles.module.css'

interface ResultRow {
  label: string
  value: string
}

export default function ColorConverter() {
  const [value, setValue] = useState(COLOR_EXAMPLE)

  const parsed = useMemo(() => parseColor(value), [value])
  const touched = value.trim().length > 0
  const invalid = touched && !parsed

  const rgb = parsed?.rgb
  const hsl = rgb ? rgbToHsl(rgb) : null
  const hex = rgb ? rgbToHex(rgb) : null

  const rows: ResultRow[] = [
    { label: 'HEX', value: hex ?? '—' },
    { label: 'RGB', value: rgb ? formatRgb(rgb) : '—' },
    { label: 'HSL', value: hsl ? formatHsl(hsl) : '—' },
  ]

  return (
    <div className={s.wrap}>
      <div className={s.preview}>
        <Card
          title="输入"
          subtitle="HEX、rgb() 或 hsl() 都认：#3B82F6 / 3b82f6 / rgb(59,130,246)"
        >
          <Field
            label="颜色值"
            htmlFor="color-input"
            error={invalid ? '无法识别的颜色格式。HEX 支持 3 位或 6 位，rgb 与 hsl 请写完整括号。' : undefined}
            hint={!invalid && parsed ? `已按 ${parsed.format.toUpperCase()} 解析` : undefined}
          >
            <div className={s['input-row']}>
              <Input
                id="color-input"
                mono
                value={value}
                invalid={invalid}
                placeholder="#3B82F6"
                autoComplete="off"
                spellCheck={false}
                aria-describedby="color-input-help"
                onChange={(event) => setValue(event.target.value)}
              />
              <Button icon={Shuffle} variant="secondary" onClick={() => setValue(randomHex())}>
                随机
              </Button>
            </div>
          </Field>
        </Card>

        <div
          className={s.swatch}
          data-empty={!rgb}
          style={rgb ? { backgroundColor: hex ?? undefined } : undefined}
        >
          {rgb && hex ? (
            <>
              <span className={s['swatch-hex']} style={{ color: readableTextColor(rgb) }}>
                {hex}
              </span>
              <span
                className={s['swatch-meta']}
                style={{ color: readableTextColor(rgb) }}
              >
                r {rgb.r} · g {rgb.g} · b {rgb.b}
              </span>
            </>
          ) : (
            <span className={s['swatch-meta']} style={{ color: 'var(--muted-foreground)' }}>
              {invalid ? (
                <span className={s.error}>
                  <TriangleAlert aria-hidden="true" />
                  格式有误
                </span>
              ) : (
                '输入颜色后预览'
              )}
            </span>
          )}
        </div>
      </div>

      <Card title="转换结果" subtitle="点右侧图标复制，三种写法都带完整单位">
        <ValueList
          items={rows.map((row) => ({
            label: row.label,
            value: row.value === '—' ? '' : row.value,
          }))}
        />
        <p className={s.hint} id="color-input-help">
          计算结果全部在本地完成，输入不会离开浏览器。
        </p>
      </Card>
    </div>
  )
}
