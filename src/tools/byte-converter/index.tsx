import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { CopyButton } from '@/components/ui/CopyButton'
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
      {/* 输入区：单一干净的面板，作为整页视觉重心 */}
      <section className={s.panel} aria-label="输入">
        <div className={s['input-row']}>
          <div className={s.amount}>
            <Field
              className={s['field-amount']}
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
            <Field className={s['field-unit']} label="单位" htmlFor="unit-select">
              <Select
                id="unit-select"
                size="lg"
                value={unitKey}
                options={UNIT_OPTIONS}
                onChange={setUnitKey}
                aria-label="输入单位"
              />
            </Field>
          </div>
          <Button
            className={s['reset-btn']}
            variant="primary"
            icon={RotateCcw}
            onClick={() => {
              setAmount('1')
              setUnitKey('B')
            }}
          >
            重置
          </Button>
        </div>
      </section>

      {/* 结果区：对齐的列表，列头说明进制，每行一种单位 */}
      <section className={s.results} aria-label="换算结果">
        <header className={s['results-head']}>
          <h2 className={s['results-title']}>换算结果</h2>
          <span className={s['results-count']}>{BYTE_UNITS.length} 种单位</span>
          <Button
            className={s['expand-btn']}
            variant="ghost"
            size="sm"
            icon={expanded ? ChevronUp : ChevronDown}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? '收起大单位' : '展开全部单位'}
          </Button>
        </header>

        <div className={s.list}>
          <div className={s['list-head']} aria-hidden="true">
            <span className={s['head-cell']}>单位</span>
            <span className={`${s['head-cell']} ${s['head-val']}`}>二进制 · 1024</span>
            <span className={`${s['head-cell']} ${s['head-val']}`}>十进制 · 1000</span>
            <span className={s['head-cell']} />
          </div>

          {visibleUnits.map((unit) => {
            const values = results?.[unit.key]
            const isSource = unit.key === fromUnit.key
            const copyText =
              values && !invalid
                ? `${formatByteValue(values[0])} ${unit.sym}（二进制 ${BASES[0].base}）／ ${formatByteValue(values[1])} ${unit.sym}（十进制 ${BASES[1].base}）`
                : ''
            return (
              <article key={unit.key} className={s.row} data-source={isSource}>
                <div className={s['row-id']}>
                  <span className={s.sym}>{unit.sym}</span>
                  <span className={s.name}>{unit.name}</span>
                  {isSource && <span className={s.tag}>输入单位</span>}
                </div>
                <code className={s['val-num']}>{values ? formatByteValue(values[0]) : '—'}</code>
                <code className={s['val-num']}>{values ? formatByteValue(values[1]) : '—'}</code>
                <CopyButton
                  className={s['row-copy']}
                  value={copyText}
                  iconOnly
                  size="sm"
                  variant="ghost"
                  label={`复制 ${unit.name} 换算结果`}
                  successMessage={`${unit.name} 结果已复制`}
                />
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
