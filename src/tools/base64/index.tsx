import { useMemo, useRef, useState } from 'react'
import { Download, Eraser, FlaskConical, HelpCircle, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CopyButton } from '@/components/ui/CopyButton'
import { Segmented } from '@/components/ui/Segmented'
import { TextArea } from '@/components/ui/TextArea'
import { Toggle } from '@/components/ui/Toggle'
import { downloadText } from '@/utils/download'
import { formatBytes } from '@/utils/format'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { manifest } from './manifest'
import {
  SAMPLE_BASE64,
  SAMPLE_TEXT,
  decodeBase64,
  encodeBase64,
  fileToBase64,
  utf8ByteLength,
  type Base64Mode,
} from './logic'
import s from './styles.module.css'

interface Uploaded {
  base64: string
  name: string
}

export default function Base64Tool() {
  const [mode, setMode] = useState<Base64Mode>('encode')
  const [input, setInput] = useState('')
  const [urlSafe, setUrlSafe] = useState(false)
  const [wrap, setWrap] = useState(false)
  const [uploaded, setUploaded] = useState<Uploaded | null>(null)

  const isEncode = mode === 'encode'
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isWide = useMediaQuery('(min-width: 861px)')

  // 输入即转换 / 校验，无需点按钮；编码必然成功，解码可能报错
  const result = useMemo(() => {
    if (!input) return { ok: true, output: '', error: undefined }
    return isEncode ? encodeBase64(input, { urlSafe, wrap }) : decodeBase64(input)
  }, [input, isEncode, urlSafe, wrap])

  // 上传图片时，输出取图片字节的 Base64；否则走实时转换结果
  const output = uploaded ? uploaded.base64 : result.ok ? result.output : ''

  const inputBytes = utf8ByteLength(input)
  const inputBadge = input.length === 0 ? '空' : `${input.length} 字符 · ${formatBytes(inputBytes)}`
  const outputBadge =
    output.length === 0 ? '空' : `${output.length} 字符 · ${formatBytes(utf8ByteLength(output))}`

  function handleSample() {
    setUploaded(null)
    setInput(isEncode ? SAMPLE_TEXT : SAMPLE_BASE64)
  }

  function handleClear() {
    setInput('')
    setUploaded(null)
  }

  function handleInputChange(value: string) {
    // 一旦手动输入就丢弃已上传的图片，避免两种来源混淆
    if (uploaded) setUploaded(null)
    setInput(value)
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const base64 = await fileToBase64(file)
      setInput('')
      setUploaded({ base64, name: file.name || '未命名文件' })
    } catch {
      setUploaded(null)
    }
  }

  return (
    <div className={s.app} data-fill={isWide ? 'true' : undefined}>
      {/* 自定义标题栏：标题 + 「?」说明，示例按钮置于标题栏右侧 */}
      <header className={s.titleRow}>
        <div className={s.titleGroup}>
          <h1 className={s.title}>{manifest.name}</h1>
          <span className={s.help}>
            <button
              type="button"
              className={s.helpBtn}
              aria-label="使用说明"
              aria-describedby="base64-help-tip"
            >
              <HelpCircle aria-hidden="true" />
            </button>
            <span className={s.helpTip} role="tooltip" id="base64-help-tip">
              {manifest.pageDescription}
            </span>
          </span>
        </div>
        <div className={s.titleActions}>
          <Button variant="ghost" icon={FlaskConical} onClick={handleSample}>
            示例
          </Button>
        </div>
      </header>

      <div className={s.toolbar}>
        <Segmented
          value={mode}
          options={[
            { value: 'encode', label: '编码' },
            { value: 'decode', label: '解码' },
          ]}
          onChange={(next) => setMode(next)}
          ariaLabel="转换方向"
        />

        <div className={s.options}>
          <div className={s.opt}>
            <Toggle
              label="URL 安全"
              checked={urlSafe}
              onChange={setUrlSafe}
              description={isEncode ? '输出 - _ 并去 =' : '接受 - _ 输入'}
            />
          </div>
          {isEncode && (
            <div className={s.opt}>
              <Toggle label="自动换行" checked={wrap} onChange={setWrap} description="每 76 字符换行" />
            </div>
          )}
        </div>

        <div className={s['toolbar-spacer']} />

        <Button variant="ghost" icon={Eraser} onClick={handleClear} disabled={!input && !uploaded}>
          清空
        </Button>
      </div>

      <div className={s.panes}>
        {/* 左：输入 */}
        <section className={s.pane}>
          <header className={s['pane-head']}>
            <span className={s['pane-title']}>{isEncode ? '原始文本' : 'Base64 输入'}</span>
            <span className={s.badge}>{inputBadge}</span>
          </header>
          <div className={s['pane-body']}>
            <TextArea
              className={s.textarea}
              value={input}
              onChange={(event) => handleInputChange(event.target.value)}
              placeholder={
                isEncode ? '输入要编码的文本，支持中文与表情符号…' : '粘贴 Base64 字符串…'
              }
              aria-label={isEncode ? '待编码文本' : 'Base64 输入'}
              spellCheck={false}
            />
            {isEncode && (
              <div className={s.uploadBar}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ImagePlus}
                  onClick={() => fileInputRef.current?.click()}
                >
                  上传图片
                </Button>
                {uploaded && <span className={s.uploadName}>{uploaded.name}</span>}
              </div>
            )}
          </div>
          <div className={s.status}>
            <span className={s['status-text']}>
              {uploaded
                ? '已读取图片原始字节并转为 Base64，可在右侧复制或下载。'
                : input
                  ? isEncode
                    ? '实时编码为 Base64，输入即转换。'
                    : '实时解码，自动忽略空白与换行，标准 +/ 与 URL 安全 -_ 均可。'
                  : isEncode
                    ? '在输入框粘贴文本，或点「上传图片」转文件。'
                    : '在上方粘贴 Base64，或点「示例」试试。'}
            </span>
          </div>
        </section>

        {/* 右：输出 */}
        <section className={s.pane}>
          <header className={s['pane-head']}>
            <span className={s['pane-title']}>{isEncode ? 'Base64 输出' : '解码文本'}</span>
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
                aria-label={`下载 .${isEncode ? 'b64' : 'txt'}`}
                title={`下载 .${isEncode ? 'b64' : 'txt'}`}
                disabled={!output}
                onClick={() =>
                  downloadText(
                    isEncode ? 'base64.b64' : 'decoded.txt',
                    output,
                    'text/plain;charset=utf-8',
                  )
                }
              />
            </div>
          </header>
          <div className={s['pane-body']}>
            <TextArea
              className={s.textarea}
              value={output}
              readOnly
              placeholder={isEncode ? 'Base64 结果会显示在这里' : '解码后的文本会显示在这里'}
              aria-label={isEncode ? 'Base64 输出' : '解码文本'}
              spellCheck={false}
            />
          </div>
          {uploaded ? (
            <div className={s.status}>
              <span className={s['status-text']}>图片已转 Base64，可直接复制或下载。</span>
            </div>
          ) : result.ok ? (
            <div className={s.status}>
              <span className={s['status-text']}>
                {output
                  ? isEncode
                    ? `已生成 Base64${urlSafe ? '（URL 安全）' : ''}${wrap ? '，已按 76 字符换行' : ''}。`
                    : '解码成功。'
                  : '结果只读，可复制或下载；输入不会被保存。'}
              </span>
            </div>
          ) : (
            <div className={s.status} data-tone="danger">
              <span className={s['status-text']}>{result.error}</span>
            </div>
          )}
        </section>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFile}
      />
    </div>
  )
}
