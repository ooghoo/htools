import { useMemo, useState } from 'react'
import { CalendarClock, Clock, Globe } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Segmented } from '@/components/ui/Segmented'
import { ValueList } from '@/components/ui/ValueList'
import {
  UNIT_OPTIONS,
  formatIso,
  formatLocal,
  formatUtc,
  nowMs,
  parseLocalDateTime,
  parseTimestamp,
  timezoneInfo,
  toDateTimeLocalValue,
  toSeconds,
  type TimestampUnit,
} from './logic'
import s from './styles.module.css'

export default function TimestampConverter() {
  const initial = nowMs()
  const [unit, setUnit] = useState<TimestampUnit>('s')
  const [timestamp, setTimestamp] = useState(() => String(toSeconds(initial)))
  const [dateTime, setDateTime] = useState(() => toDateTimeLocalValue(initial))

  const tsResult = useMemo(() => parseTimestamp(timestamp, unit), [timestamp, unit])
  const tsMs = tsResult.ok ? tsResult.ms : undefined
  const tsError = timestamp.trim() && !tsResult.ok ? tsResult.error : undefined

  const dateMs = useMemo(() => parseLocalDateTime(dateTime), [dateTime])
  const dateError = dateTime && dateMs === null ? '这个时间不合法，检查一下年月日。' : undefined

  const zone = timezoneInfo(tsMs ?? initial)

  const tsItems = [
    { label: '本地时间', value: tsMs !== undefined ? formatLocal(tsMs) : '', emphasize: true },
    { label: 'UTC', value: tsMs !== undefined ? formatUtc(tsMs) : '' },
    { label: 'ISO 8601', value: tsMs !== undefined ? formatIso(tsMs) : '' },
    { label: '秒', value: tsMs !== undefined ? String(toSeconds(tsMs)) : '' },
    { label: '毫秒', value: tsMs !== undefined ? String(tsMs) : '' },
  ]

  const dateItems = [
    { label: '秒', value: dateMs !== null ? String(toSeconds(dateMs)) : '', emphasize: true },
    { label: '毫秒', value: dateMs !== null ? String(dateMs) : '' },
    { label: 'ISO 8601', value: dateMs !== null ? formatIso(dateMs) : '' },
    { label: 'UTC', value: dateMs !== null ? formatUtc(dateMs) : '' },
  ]

  function fillNow() {
    const current = nowMs()
    setTimestamp(String(unit === 's' ? toSeconds(current) : current))
    setDateTime(toDateTimeLocalValue(current))
  }

  return (
    <div className={s.grid}>
      <Card
        title="时间戳 → 日期时间"
        subtitle="切换单位只会改变「怎么读」这个数字，不会改写它"
      >
        <Field label="时间戳" htmlFor="ts-input" error={tsError}>
          <div className={s['control-row']}>
            <Input
              id="ts-input"
              mono
              inputMode="numeric"
              value={timestamp}
              invalid={Boolean(tsError)}
              placeholder="1750000000"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setTimestamp(event.target.value)}
            />
            <Button icon={Clock} variant="secondary" onClick={fillNow}>
              现在
            </Button>
          </div>
        </Field>

        <div className={s['unit-row']}>
          <Segmented
            value={unit}
            options={UNIT_OPTIONS}
            onChange={setUnit}
            ariaLabel="时间戳单位"
          />
          <span className={s.foot}>按{unit === 's' ? '秒' : '毫秒'}解释</span>
        </div>

        <ValueList items={tsItems} />

        <p className={s.foot}>
          <Globe aria-hidden="true" />
          <span>
            本地时间按 <span className={s.zone}>{zone.zone}</span>（{zone.offset}）显示，
            UTC / ISO 不受本机时区影响。
          </span>
        </p>
      </Card>

      <Card title="日期时间 → 时间戳" subtitle="输入框使用本机时区的年月日与时分秒">
        <Field label="本地时间" htmlFor="dt-input" error={dateError}>
          <div className={s['control-row']}>
            <Input
              id="dt-input"
              type="datetime-local"
              step={1}
              value={dateTime}
              invalid={Boolean(dateError)}
              onChange={(event) => setDateTime(event.target.value)}
            />
            <Button icon={CalendarClock} variant="secondary" onClick={fillNow}>
              现在
            </Button>
          </div>
        </Field>

        <ValueList items={dateItems} />

        <p className={s.foot}>
          <Globe aria-hidden="true" />
          <span>
            同一时刻在不同时区的时间戳相同；这里换算使用的是 <span className={s.zone}>{zone.offset}</span>。
          </span>
        </p>
      </Card>
    </div>
  )
}
