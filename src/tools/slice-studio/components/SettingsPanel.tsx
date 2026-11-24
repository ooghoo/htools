import { memo, type ReactNode } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Segmented } from '@/components/ui/Segmented'
import { Select } from '@/components/ui/Select'
import { Slider } from '@/components/ui/Slider'
import { Toggle } from '@/components/ui/Toggle'
import { GRID_PRESETS, MAX_AXIS } from '../lib/constants.ts'
import { addCut, moveCut, normalizeCuts } from '../lib/grid.ts'
import type {
  CustomConfig,
  CutMode,
  ExportSettings,
  GridConfig,
  PaddingMode,
  SliceOrder,
} from '../types.ts'
import s from '../styles.module.css'

interface SettingsPanelProps {
  mode: CutMode
  onModeChange: (mode: CutMode) => void
  grid: GridConfig
  onGridChange: (grid: GridConfig) => void
  custom: CustomConfig
  onCustomChange: (custom: CustomConfig) => void
  settings: ExportSettings
  onSettingsChange: (patch: Partial<ExportSettings>) => void
  showLines: boolean
  onToggleLines: (value: boolean) => void
  showNumbers: boolean
  onToggleNumbers: (value: boolean) => void
  width: number
  height: number
  count: number
  columnSizes: number[]
  rowSizes: number[]
  firstFilename: string
  sourcePlaceholder: string
}

function Section({ title, extra, children }: { title: string; extra?: string; children: ReactNode }) {
  return (
    <section className={s['panel-section']}>
      <div className={s['section-head']}>
        <h3>{title}</h3>
        {extra && <span>{extra}</span>}
      </div>
      {children}
    </section>
  )
}

function NumberStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  return (
    <div className={s.stepper}>
      <span className={s['stepper-label']}>{label}</span>
      <div className={s['stepper-control']}>
        <button type="button" aria-label={`减少${label}`} disabled={value <= min} onClick={() => onChange(clamp(value - 1))}>
          <Minus aria-hidden="true" />
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          aria-label={label}
          onChange={(event) => {
            const parsed = Number(event.target.value)
            if (event.target.value !== '' && Number.isFinite(parsed)) onChange(clamp(parsed))
          }}
        />
        <button type="button" aria-label={`增加${label}`} disabled={value >= max} onClick={() => onChange(clamp(value + 1))}>
          <Plus aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export const SettingsPanel = memo(function SettingsPanel(props: SettingsPanelProps) {
  const {
    mode,
    onModeChange,
    grid,
    onGridChange,
    custom,
    onCustomChange,
    settings,
    onSettingsChange,
    showLines,
    onToggleLines,
    showNumbers,
    onToggleNumbers,
    width,
    height,
    count,
    columnSizes,
    rowSizes,
    firstFilename,
    sourcePlaceholder,
  } = props

  const activePreset = GRID_PRESETS.find((p) => p.rows === grid.rows && p.cols === grid.cols)?.label ?? null
  const uneven =
    new Set(columnSizes).size > 1 || new Set(rowSizes).size > 1

  const renderCutList = (axis: 'xs' | 'ys') => {
    const length = axis === 'xs' ? width : height
    const positions = custom[axis]
    const label = axis === 'xs' ? '竖向切割线 (X)' : '横向切割线 (Y)'
    return (
      <div className={s['cut-group']}>
        <div className={s['cut-group-head']}>
          <span>{label}</span>
          <Button
            size="sm"
            variant="ghost"
            icon={Plus}
            onClick={() => onCustomChange({ ...custom, [axis]: addCut(positions, length) })}
            disabled={positions.length >= 19}
          >
            添加
          </Button>
        </div>
        {positions.length === 0 ? (
          <p className={s['cut-empty']}>暂无切割线，整张图为 1 块</p>
        ) : (
          <div className={s['cut-list']}>
            {positions.map((value, index) => (
              <div className={s['cut-row']} key={`${axis}-${index}`}>
                <span className={s['cut-index']}>{String(index + 1).padStart(2, '0')}</span>
                <input
                  type="number"
                  min={1}
                  max={length - 1}
                  value={value}
                  aria-label={`${label} 第 ${index + 1} 条像素坐标`}
                  onChange={(event) => {
                    const parsed = Number(event.target.value)
                    if (event.target.value === '' || !Number.isFinite(parsed)) return
                    onCustomChange({ ...custom, [axis]: moveCut(positions, index, parsed, length) })
                  }}
                />
                <span className={s['cut-unit']}>px</span>
                <button
                  type="button"
                  className={s['cut-remove']}
                  aria-label={`删除第 ${index + 1} 条切割线`}
                  onClick={() =>
                    onCustomChange({
                      ...custom,
                      [axis]: normalizeCuts(positions.filter((_, i) => i !== index), length),
                    })
                  }
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className={s['cut-hint']}>也可直接在画布上拖动蓝色切割线 · 原图像素坐标</p>
      </div>
    )
  }

  return (
    <aside className={s.panel}>
      <div className={s['panel-scroll'] + ' scroll-thin'}>
        <Section title="切割方式" extra={`${width} × ${height} px`}>
          <Segmented
            ariaLabel="切割方式"
            value={mode}
            options={[
              { value: 'grid', label: '网格等分' },
              { value: 'custom', label: '自定义切割' },
            ]}
            onChange={onModeChange}
          />

          {mode === 'grid' ? (
            <div className={s['stack-12']}>
              <div className={s['preset-grid']} role="group" aria-label="快捷预设">
                {GRID_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className={s.preset}
                    data-active={activePreset === preset.label}
                    aria-pressed={activePreset === preset.label}
                    onClick={() => onGridChange({ rows: preset.rows, cols: preset.cols })}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className={s['stepper-pair']}>
                <NumberStepper
                  label="行数"
                  value={grid.rows}
                  min={1}
                  max={MAX_AXIS}
                  onChange={(rows) => onGridChange({ ...grid, rows })}
                />
                <NumberStepper
                  label="列数"
                  value={grid.cols}
                  min={1}
                  max={MAX_AXIS}
                  onChange={(cols) => onGridChange({ ...grid, cols })}
                />
              </div>

              <div className={s['count-box']}>
                <div>
                  <span className={s['count-label']}>切片总数</span>
                  <strong className={s['count-value']}>{count}</strong>
                </div>
                <span className={s['count-grid']}>
                  {grid.rows} × {grid.cols}
                </span>
              </div>

              {uneven && (
                <p className={s['segment-note']}>
                  尺寸无法整除，已按原图像素分配：列宽 {columnSizes.join(' / ')} px
                  {new Set(rowSizes).size > 1 && `，行高 ${rowSizes.join(' / ')} px`}
                </p>
              )}
            </div>
          ) : (
            <div className={s['stack-12']}>
              <div className={s['count-box']}>
                <div>
                  <span className={s['count-label']}>切片总数</span>
                  <strong className={s['count-value']}>{count}</strong>
                </div>
                <span className={s['count-grid']}>
                  {custom.ys.length + 1} × {custom.xs.length + 1}
                </span>
              </div>
              {renderCutList('xs')}
              {renderCutList('ys')}
            </div>
          )}
        </Section>

        <Section title="画布显示">
          <div className={s['toggle-stack']}>
            <Toggle label="显示切割线" checked={showLines} onChange={onToggleLines} />
            <Toggle label="显示切片编号" checked={showNumbers} onChange={onToggleNumbers} />
          </div>
        </Section>

        <Section title="导出设置" extra="原始像素">
          <div className={s['stack-12']}>
            <Field label="输出格式">
              <Segmented
                ariaLabel="输出格式"
                value={settings.format}
                options={[
                  { value: 'png', label: 'PNG' },
                  { value: 'jpeg', label: 'JPG' },
                  { value: 'webp', label: 'WebP' },
                ]}
                onChange={(format) => onSettingsChange({ format })}
              />
            </Field>

            {settings.format === 'png' ? (
              <p className={s['field-note']}>PNG 保留透明通道，导出时不缩放、不重新采样。</p>
            ) : (
              <Slider
                label="质量"
                value={Math.round(settings.quality * 100)}
                min={50}
                max={100}
                step={1}
                suffix="%"
                editable
                onChange={(value) => onSettingsChange({ quality: value / 100 })}
              />
            )}

            {settings.format === 'jpeg' && (
              <div className={s['color-row']}>
                <span>透明区域底色</span>
                <label className={s['color-control']}>
                  <input
                    type="color"
                    value={settings.background}
                    aria-label="JPG 背景颜色"
                    onChange={(event) => onSettingsChange({ background: event.target.value })}
                  />
                  <code>{settings.background.toUpperCase()}</code>
                </label>
              </div>
            )}

            <Field label="文件名前缀" hint={`留空则使用原图名，例如 ${sourcePlaceholder}`}>
              <Input
                value={settings.prefix}
                placeholder={sourcePlaceholder}
                mono
                onChange={(event) => onSettingsChange({ prefix: event.target.value })}
              />
            </Field>

            <div className={s['two-col']}>
              <Field label="编号补零">
                <Select<PaddingMode>
                  value={settings.padding}
                  options={[
                    { value: 'auto', label: '自动' },
                    { value: 'none', label: '不补零' },
                    { value: '2', label: '2 位' },
                    { value: '3', label: '3 位' },
                  ]}
                  onChange={(padding) => onSettingsChange({ padding })}
                />
              </Field>
              <Field label="编号顺序" hint="逆序从右下角开始编号">
                <Segmented<SliceOrder>
                  ariaLabel="编号顺序"
                  value={settings.order}
                  options={[
                    { value: 'asc', label: '正序' },
                    { value: 'desc', label: '逆序' },
                  ]}
                  onChange={(order) => onSettingsChange({ order })}
                />
              </Field>
            </div>

            <div className={s['filename-preview']}>
              <span>示例文件名</span>
              <code>{firstFilename}</code>
            </div>
            <p className={s['field-note']}>ZIP 内条目按编号 1 → {count} 顺序写入。</p>
          </div>
        </Section>
      </div>
    </aside>
  )
})
