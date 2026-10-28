import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import {
  BASES,
  BYTE_UNITS,
  DEFAULT_VISIBLE,
  convertAll,
  formatByteValue,
  parseAmount,
} from './logic'
import s from './styles.module.css'

const UNIT_OPTIONS = BYTE_UNITS.map((unit) => ({
  value: unit.key,
  label: `${unit.name}（${unit.sym}）`,
}))

export default function ByteConverter() {
  const [amount, setAmount] = useState('1')
  const [unitKey, setUnitKey] = useState('B')
  const [expanded, setExpanded] = useState(false)

  const fromUnit = BYTE_UNITS.find((unit) => unit.key === unitKey) ?? BYTE_UNITS[1]
  const value = parseAmount(amount)
  const invalid = amount.trim().length > 0 && value === null

  const results = useMemo(
    () => (value === null ? null : convertAll(value, fromUnit)),
    [value, fromUnit],
  )

  const visibleUnits = expanded ? BYTE_UNITS : BYTE_UNITS.slice(0, DEFAULT_VISIBLE)

  return (
    <div className={s.tool}>
      <Card className={s.panel}>
        <div className={s['input-row']}>
          <Field
            label="数值"
            htmlFor="amount-input"
            error={invalid ? '请输入数字，支持小数与科学计数法（如 1.5e3）。' : undefined}
          >
            <Input
              id="amount-input"
              size="lg"
              mono
              inputMode="decimal"
              value={amount}
              invalid={invalid}
              placeholder="1"
              autoComplete="off"
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>
          <Field label="单位" htmlFor="unit-select">
            <Select
              id="unit-select"
              size="lg"
              value={unitKey}
              options={UNIT_OPTIONS}
              onChange={setUnitKey}
              aria-label="输入单位"
            />
          </Field>
          <Button
            className={s['reset-btn']}
            variant="ghost"
            icon={RotateCcw}
            onClick={() => {
              setAmount('1')
              setUnitKey('B')
            }}
          >
            重置
          </Button>
        </div>
      </Card>

      <section className={s.results} aria-label="换算结果">
        <div className={s['results-bar']}>
          <p className={s['results-meta']}>
            共 {BYTE_UNITS.length} 种单位 · 上排 <b>1024</b> 进制，下排 <b>1000</b> 进制
          </p>
          <Button
            variant="ghost"
            size="sm"
            icon={expanded ? ChevronUp : ChevronDown}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? '收起大单位' : '展开 ZB 及更大单位'}
          </Button>
        </div>

        <div className={s.grid}>
          {visibleUnits.map((unit) => {
            const values = results?.[unit.key]
            const isSource = unit.key === fromUnit.key
            return (
              <article key={unit.key} className={s.card} data-source={isSource}>
                <header className={s['card-head']}>
                  <span className={s.sym}>{unit.sym}</span>
                  <span className={s.name}>{unit.name}</span>
                  {isSource && <span className={s.badge}>输入单位</span>}
                </header>
                {BASES.map((base, index) => {
                  const text = values ? formatByteValue(values[index]) : '—'
                  return (
                    <div key={base.key} className={s.row}>
                      <span className={s.base}>{base.short}</span>
                      <code className={s.num}>{text}</code>
                      <CopyButton
                        value={text === '—' ? '' : `${text} ${unit.sym}`}
                        iconOnly
                        size="sm"
                        variant="ghost"
                        label={`复制 ${unit.name}（${base.label}）`}
                        successMessage={`${text} ${unit.sym} 已复制`}
                      />
                    </div>
                  )
                })}
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
