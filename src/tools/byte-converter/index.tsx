import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { useToast } from '@/app/contexts'
import { Button } from '@/components/ui/Button'
import { CopyButton } from '@/components/ui/CopyButton'
import { Segmented } from '@/components/ui/Segmented'
import { copyText } from '@/utils/clipboard'
import { formatNumber } from '@/utils/format'
import { manifest } from './manifest'
import {
  BYTE_UNITS,
  DECIMAL_OPTIONS,
  DECIMAL_RATIO,
  DEFAULT_HISTORY,
  DEFAULT_VISIBLE,
  QUICK_REFERENCE,
  convertAll,
  formatByteValue,
  parseAmount,
  pushHistory,
  type Decimals,
  type HistoryEntry,
} from './logic'
import s from './styles.module.css'

const DECIMAL_VALUE_OPTIONS = DECIMAL_OPTIONS.map((option) => ({
  value: String(option.value) as `${Decimals}`,
  label: option.label,
}))

export default function ByteConverter() {
  const { notify } = useToast()

  const [amount, setAmount] = useState('1')
  const [unitKey, setUnitKey] = useState('B')
  const [decimals, setDecimals] = useState<Decimals>(2)
  const [expanded, setExpanded] = useState(false)
  const [noteOpen, setNoteOpen] = useState(true)
  const [history, setHistory] = useState<HistoryEntry[]>(DEFAULT_HISTORY)

  const fromUnit = BYTE_UNITS.find((unit) => unit.key === unitKey) ?? BYTE_UNITS[1]
  const value = parseAmount(amount)
  const invalid = amount.trim().length > 0 && value === null

  const results = useMemo(
    () => (value === null ? null : convertAll(value, fromUnit)),
    [value, fromUnit],
  )

  const visibleUnits = expanded ? BYTE_UNITS : BYTE_UNITS.slice(0, DEFAULT_VISIBLE)

  /** 输入被确认（失焦 / 回车）后写进历史，仅当前会话 */
  function commitHistory() {
    const trimmed = amount.trim()
    if (!trimmed || parseAmount(trimmed) === null) return
    setHistory((list) =>
      pushHistory(list, {
        key: `${trimmed}|${fromUnit.key}`,
        value: trimmed,
        unitKey: fromUnit.key,
        label: `${trimmed} ${fromUnit.sym}`,
      }),
    )
  }

  function applyHistory(entry: HistoryEntry) {
    setAmount(entry.value)
    setUnitKey(entry.unitKey)
  }

  async function copy(text: string, label: string) {
    const ok = await copyText(text)
    notify(ok ? `${label} 已复制` : '复制失败，请手动选中后复制', ok ? 'success' : 'error')
  }

  return (
    <div className={s.root}>
      {/* ---------- 标题区：标题 + 进制说明 + 小数位 ---------- */}
      <header className={s.titleRow}>
        <div className={s.titleGroup}>
          <h1 className={s.title}>{manifest.name}</h1>
          <p className={s.subtitle}>Windows 二进制 1024 · macOS 十进制 1000</p>
        </div>

        <div className={s.decimals}>
          <span className={s.decimalsLabel}>小数位</span>
          <Segmented
            size="compact"
            value={String(decimals) as `${Decimals}`}
            options={DECIMAL_VALUE_OPTIONS}
            onChange={(next) => setDecimals(Number(next) as Decimals)}
            ariaLabel="小数位"
          />
        </div>
      </header>

      {/* ---------- 输入区 ---------- */}
      <section className={s.inputCard} aria-label="输入">
        <div className={s.inputMain}>
          <label className={s.eyebrow} htmlFor="amount-input">
            输入数值 / VALUE
          </label>

          <div className={s.field} data-invalid={invalid}>
            <input
              id="amount-input"
              className={s.amountInput}
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              value={amount}
              placeholder="1"
              aria-invalid={invalid || undefined}
              onChange={(event) => setAmount(event.target.value)}
              onBlur={commitHistory}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitHistory()
              }}
            />

            <span className={s.fieldDivider} aria-hidden="true" />

            <div className={s.unit}>
              <select
                className={s.unitSelect}
                value={unitKey}
                aria-label="输入单位"
                onChange={(event) => setUnitKey(event.target.value)}
              >
                {BYTE_UNITS.map((unit) => (
                  <option key={unit.key} value={unit.key}>
                    {unit.name} ({unit.sym})
                  </option>
                ))}
              </select>
              <ChevronDown className={s.unitChevron} aria-hidden="true" />
            </div>
          </div>

          {/* 校验失败时占用历史那一行，卡片高度不跳 */}
          {invalid ? (
            <p className={s.error} role="alert">
              请输入数字，支持小数与科学计数法（如 1.5e3）
            </p>
          ) : (
            history.length > 0 && (
              <div className={s.history}>
                <span className={s.historyLabel}>历史</span>
                {history.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    className={s.historyChip}
                    onClick={() => applyHistory(entry)}
                  >
                    {entry.label}
                  </button>
                ))}
                <button
                  type="button"
                  className={s.historyClear}
                  onClick={() => setHistory([])}
                >
                  清除
                </button>
              </div>
            )
          )}
        </div>

        <Button
          className={s.reset}
          variant="primary"
          icon={RotateCcw}
          onClick={() => {
            setAmount('1')
            setUnitKey('B')
          }}
        >
          重置
        </Button>
      </section>

      {/* ---------- 结果 + 右栏说明 ---------- */}
      <div className={s.resultsRow}>
        <section className={s.table} aria-label="换算结果">
          <header className={s.tableHead}>
            <h2 className={s.eyebrow}>换算结果</h2>
            <span className={s.countBadge}>{BYTE_UNITS.length} 单位</span>
            <button
              type="button"
              className={s.expand}
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded ? '收起' : '展开全部'}
              {expanded ? (
                <ChevronUp aria-hidden="true" />
              ) : (
                <ChevronDown aria-hidden="true" />
              )}
            </button>
          </header>

          <div className={`${s.gridRow} ${s.colHead}`} aria-hidden="true">
            <span>单位 / UNIT</span>
            <span>二进制 · 1024</span>
            <span>十进制 · 1000</span>
            <span />
          </div>

          <div className={s.rows}>
            {visibleUnits.map((unit) => {
              const values = results?.[unit.key]
              const binary = values ? formatByteValue(values[0], decimals) : '—'
              const decimal = values ? formatByteValue(values[1], decimals) : '—'
              const isSource = unit.key === fromUnit.key
              const combined =
                values === undefined
                  ? ''
                  : `${binary} ${unit.sym}（1024）／ ${decimal} ${unit.sym}（1000）`

              return (
                <div key={unit.key} className={`${s.gridRow} ${s.row}`} data-active={isSource}>
                  {isSource && <span className={s.activeBar} aria-hidden="true" />}

                  <div className={s.unitCell}>
                    <span className={s.sym}>{unit.sym}</span>
                    <span className={s.unitName}>{unit.name}</span>
                    {isSource && <span className={s.badge}>输入单位</span>}
                  </div>

                  <button
                    type="button"
                    className={s.val}
                    title={`点击复制 ${binary} ${unit.sym}（1024）`}
                    onClick={() => copy(`${binary} ${unit.sym}`, `${unit.sym} 二进制值`)}
                  >
                    <span className={s.colHint}>1024</span>
                    <span className={s.valNum}>{binary}</span>
                  </button>

                  <button
                    type="button"
                    className={`${s.val} ${s.valDim}`}
                    title={`点击复制 ${decimal} ${unit.sym}（1000）`}
                    onClick={() => copy(`${decimal} ${unit.sym}`, `${unit.sym} 十进制值`)}
                  >
                    <span className={s.colHint}>1000</span>
                    <span className={s.valNum}>{decimal}</span>
                  </button>

                  <CopyButton
                    className={s.rowCopy}
                    value={combined}
                    iconOnly
                    size="sm"
                    variant="ghost"
                    label={`复制 ${unit.name} 结果`}
                    successMessage={`${unit.name} 结果已复制`}
                  />
                </div>
              )
            })}
          </div>
        </section>

        <aside className={s.rail}>
          <section className={`${s.card} ${s.noteCard}`}>
            <header className={s.cardHead}>
              <h2 className={s.eyebrow}>换算说明</h2>
              <button
                type="button"
                className={s.collapse}
                aria-expanded={noteOpen}
                aria-label={noteOpen ? '收起说明' : '展开说明'}
                onClick={() => setNoteOpen((current) => !current)}
              >
                {noteOpen ? (
                  <ChevronUp aria-hidden="true" />
                ) : (
                  <ChevronDown aria-hidden="true" />
                )}
              </button>
            </header>

            {noteOpen && (
              <div className={s.noteBody}>
                <h3 className={s.noteTitle}>1024 与 1000 差在哪？</h3>
                <p className={s.noteText}>
                  存储介质按 <b>1000</b> 进位，操作系统按 <b>1024</b> 进位。标称 1 TB 的硬盘，Windows
                  里只有 <b>931 GB</b>。
                </p>

                <div className={s.bars}>
                  <div className={s.barItem}>
                    <div className={s.barTrack}>
                      <span className={s.barFill} style={{ width: '100%' }} />
                    </div>
                    <div className={s.barMeta}>
                      <span>BINARY</span>
                      <span>1024</span>
                    </div>
                  </div>
                  <div className={s.barItem}>
                    <div className={s.barTrack}>
                      <span
                        className={s.barGhost}
                        style={{ width: `${(DECIMAL_RATIO * 100).toFixed(2)}%` }}
                      />
                    </div>
                    <div className={s.barMeta}>
                      <span>DECIMAL</span>
                      <span>1000</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className={s.card}>
            <header className={s.cardHead}>
              <h2 className={s.eyebrow}>常用对照</h2>
              <span className={s.iec}>IEC</span>
            </header>
            <div className={s.refRows}>
              {QUICK_REFERENCE.map((item) => (
                <div key={item.from} className={s.refRow}>
                  <span>{item.from}</span>
                  <span className={s.refValue}>{formatNumber(item.bytes)} B</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
