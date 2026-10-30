import { useMemo, useState } from 'react'
import { ArrowRight, Download, FileJson, Minimize2, Trash2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CopyButton } from '@/components/ui/CopyButton'
import { Segmented } from '@/components/ui/Segmented'
import { TextArea } from '@/components/ui/TextArea'
import { downloadText } from '@/utils/download'
import { manifest } from './manifest'
import { formatBytes } from '@/utils/format'
import {
  INDENT_OPTIONS,
  JSON_SAMPLE,
  byteLength,
  inspectJson,
  lineCount,
  transform,
  type IndentOption,
} from './logic'
import { cx } from '@/utils/cx'
import s from './styles.module.css'

type IndentKey = '2' | '4' | 'tab'

export default function JsonFormatter() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [indentKey, setIndentKey] = useState<IndentKey>('2')

  const indent: IndentOption =
    INDENT_OPTIONS.find((option) => option.value === indentKey)?.indent ?? 2

  // 输入一变就校验，用户不用点按钮就能看到结构是否合法
  const status = useMemo(() => inspectJson(input), [input])

  function run(mode: 'pretty' | 'minify') {
    const result = transform(input, mode, indent)
    if (result.ok) setOutput(result.output)
    else setOutput('')
  }

  function handleClear() {
    setInput('')
    setOutput('')
  }

  /** 已经格式化过的话，改缩进立即重排，不用再点一次按钮 */
  function handleIndentChange(next: IndentKey) {
    setIndentKey(next)
    if (!output || !output.includes('\n')) return
    const nextIndent = INDENT_OPTIONS.find((option) => option.value === next)?.indent ?? 2
    const result = transform(input, 'pretty', nextIndent)
    if (result.ok) setOutput(result.output)
  }

  const inputBadge =
    input.length === 0 ? '空' : `${lineCount(input)} 行 · ${formatBytes(byteLength(input))}`
  const outputBadge =
    output.length === 0 ? '空' : `${lineCount(output)} 行 · ${formatBytes(byteLength(output))}`

  return (
    <div className={s.root}>
      {/* 标题栏：标题 + 说明在左，示例按钮在右 */}
      <header className={s['title-row']}>
        <div className={s['title-group']}>
          <h1 className={s.title}>{manifest.name}</h1>
          <p className={s.subtitle}>{manifest.pageDescription ?? manifest.description}</p>
        </div>
        <Button variant="ghost" icon={FileJson} onClick={() => setInput(JSON_SAMPLE)}>
          示例
        </Button>
      </header>

      {/* 工具栏：缩进在左，清空 + 格式化 + 压缩靠右 */}
      <div className={s.toolbar}>
        <Segmented
          value={indentKey}
          options={INDENT_OPTIONS.map((option) => ({ value: option.value as IndentKey, label: option.label }))}
          onChange={handleIndentChange}
          ariaLabel="缩进方式"
        />
        <div className={s.actions}>
          <Button variant="ghost" icon={Trash2} onClick={handleClear} disabled={!input && !output}>
            清空
          </Button>
          <Button variant="primary" icon={Wand2} onClick={() => run('pretty')} disabled={!input.trim()}>
            格式化
          </Button>
          <Button icon={Minimize2} onClick={() => run('minify')} disabled={!input.trim()}>
            压缩
          </Button>
        </div>
      </div>

      <div className={s.panes}>
        <section className={s.pane}>
          <header className={s['pane-head']}>
            <span className={s['pane-title']}>输入</span>
            <span className={s.badge}>{inputBadge}</span>
          </header>
          <div className={s['pane-body']}>
            <TextArea
              className={s.textarea}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={'在这里粘贴 JSON，例如 {"hello":"world"}'}
              aria-label="JSON 输入"
              spellCheck={false}
              invalid={status.kind === 'invalid'}
            />
          </div>

          {status.kind === 'empty' ? (
            <div className={s.status}>
              <ArrowRight aria-hidden="true" />
              <span className={s['status-text']}>粘贴 JSON 后会自动校验，再点「格式化」或「压缩」。</span>
            </div>
          ) : status.kind === 'valid' ? (
            <div className={s.status} data-tone="success">
              <span className={s['status-text']}>
                JSON 合法 · {status.summary} · {status.lines} 行 · {formatBytes(status.bytes)}
              </span>
            </div>
          ) : (
            <div className={s.status} data-tone="danger">
              <span className={s['status-text']}>
                JSON 语法错误
                {status.error.line !== undefined && (
                  <>
                    ，第 <span className={s['status-loc']}>{status.error.line}</span> 行
                    {status.error.column !== undefined && (
                      <>
                        {' '}
                        第 <span className={s['status-loc']}>{status.error.column}</span> 列
                      </>
                    )}
                  </>
                )}
                ：{status.error.message}
                {status.error.excerpt && (
                  <code className={cx(s.excerpt, 'scroll-thin')}>{status.error.excerpt}</code>
                )}
              </span>
            </div>
          )}
        </section>

        <section className={s.pane}>
          <header className={s['pane-head']}>
            <span className={s['pane-title']}>输出</span>
            <span className={s.badge}>{outputBadge}</span>
            <div className={s['pane-actions']}>
              <CopyButton
                value={output}
                iconOnly
                size="sm"
                variant="ghost"
                label="复制结果"
                successMessage="结果已复制"
              />
              <Button
                variant="ghost"
                size="sm"
                icon={Download}
                iconOnly
                aria-label="下载 .json"
                title="下载 .json"
                disabled={!output}
                onClick={() => downloadText('formatted.json', output, 'application/json;charset=utf-8')}
              />
            </div>
          </header>
          <div className={s['pane-body']}>
            <TextArea
              className={s.textarea}
              value={output}
              readOnly
              placeholder="格式化结果会出现在这里"
              aria-label="JSON 输出"
              spellCheck={false}
            />
          </div>
          <div className={s.status}>
            <span className={s['status-text']}>
              {output
                ? `已生成结果 · ${lineCount(output)} 行`
                : '结果只读，可复制或下载；输入内容不会被保存。'}
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}
