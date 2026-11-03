import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Eraser, FileUp, FlaskConical } from 'lucide-react'
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
  size: number
}

/** 超过这个体积就不再转：Base64 会膨胀 33%，再大 textarea 也放不下 */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/** 从剪贴板 / 拖拽的数据里取文件：files 拿不到时退回 items（Safari、Firefox 的差异） */
function pickFile(data: DataTransfer | null): File | null {
  if (!data) return null
  if (data.files.length > 0) return data.files[0]
  for (const item of Array.from(data.items)) {
    if (item.kind === 'file') {
      const file = item.getAsFile()
      if (file) return file
    }
  }
  return null
}

/** 只认真正的文件拖拽，别在拖选文字时弹提示 */
function draggingFiles(event: React.DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes('Files')
}

export default function Base64Tool() {
  const [mode, setMode] = useState<Base64Mode>('encode')
  const [input, setInput] = useState('')
  const [urlSafe, setUrlSafe] = useState(false)
  const [wrap, setWrap] = useState(false)
  const [uploaded, setUploaded] = useState<Uploaded | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

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
  const inputBadge = uploaded
    ? `文件 · ${formatBytes(uploaded.size)}`
    : input.length === 0
      ? '空'
      : `${input.length} 字符 · ${formatBytes(inputBytes)}`
  const outputBadge =
    output.length === 0 ? '空' : `${output.length} 字符 · ${formatBytes(utf8ByteLength(output))}`

  function handleSample() {
    setUploaded(null)
    setUploadError(null)
    setInput(isEncode ? SAMPLE_TEXT : SAMPLE_BASE64)
  }

  function handleClear() {
    setInput('')
    setUploaded(null)
    setUploadError(null)
  }

  function handleInputChange(value: string) {
    // 一旦手动输入就丢弃已上传的文件，避免两种来源混淆
    if (uploaded) setUploaded(null)
    if (uploadError) setUploadError(null)
    setInput(value)
  }

  /** 任意文件 → Base64；体积 / 空文件 / 读失败都给明确提示，不静默 */
  const processFile = useCallback(async (file: File) => {
    if (file.size === 0) {
      setUploadError('这个文件是空的。拖进来的如果是文件夹，先把里面的文件拖出来。')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(
        `文件 ${formatBytes(file.size)}，超过 ${formatBytes(MAX_UPLOAD_BYTES)} 不支持：Base64 会再胖三分之一。`,
      )
      return
    }
    try {
      const base64 = await fileToBase64(file)
      setUploadError(null)
      setInput('')
      setUploaded({ base64, name: file.name || '未命名文件', size: file.size })
    } catch {
      setUploadError('读取文件失败：文件可能已被移动，或没有读取权限。')
    }
  }, [])

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void processFile(file)
  }

  // 剪贴板里有文件（截图、复制的文件、复制的图片）时，粘贴即上传
  useEffect(() => {
    if (!isEncode) return
    const onPaste = (event: ClipboardEvent) => {
      const file = pickFile(event.clipboardData)
      if (!file) return
      event.preventDefault()
      void processFile(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [isEncode, processFile])

  return (
    <div
      className={s.app}
      data-fill={isWide ? 'true' : undefined}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => event.preventDefault()}
    >
      {/* 自定义标题栏：示例按钮置于标题栏右侧 */}
      <header className={s.titleRow}>
        <div className={s.titleGroup}>
          <h1 className={s.title}>{manifest.name}</h1>
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
              labelTip={isEncode ? '输出 - _ 并去 =' : '接受 - _ 输入'}
            />
          </div>
          {isEncode && (
            <div className={s.opt}>
              <Toggle label="自动换行" checked={wrap} onChange={setWrap} labelTip="每 76 字符换行" />
            </div>
          )}
        </div>

        <div className={s['toolbar-spacer']} />

        <Button variant="ghost" icon={Eraser} onClick={handleClear} disabled={!input && !uploaded}>
          清空
        </Button>
      </div>

      <div className={s.panes}>
        {/* 左：输入（编码态支持拖入 / 粘贴图片上传） */}
        <section
          className={s.pane}
          data-drag={isEncode && dragOver ? 'true' : undefined}
          onDragEnter={(event) => {
            if (!isEncode || !draggingFiles(event)) return
            event.preventDefault()
            setDragOver(true)
          }}
          onDragOver={(event) => {
            if (!isEncode || !draggingFiles(event)) return
            event.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={(event) => {
            if (!isEncode) return
            // 在子元素之间移动不算离开
            if (event.currentTarget.contains(event.relatedTarget as Node)) return
            setDragOver(false)
          }}
          onDrop={(event) => {
            if (!isEncode) return
            event.preventDefault()
            setDragOver(false)
            const file = pickFile(event.dataTransfer)
            if (file) void processFile(file)
          }}
        >
          {isEncode && dragOver && (
            <div className={s.dropOverlay} aria-hidden="true">
              松开鼠标即可上传，文件会转成 Base64
            </div>
          )}
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
                uploaded
                  ? '已上传文件；在这里输入文本会替换掉它'
                  : isEncode
                    ? '输入要编码的文本，支持中文与表情符号…'
                    : '粘贴 Base64 字符串…'
              }
              aria-label={isEncode ? '待编码文本' : 'Base64 输入'}
              spellCheck={false}
            />
            {isEncode && (
              <div className={s.uploadBar}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={FileUp}
                  onClick={() => fileInputRef.current?.click()}
                >
                  上传文件
                </Button>
                {uploaded ? (
                  <span className={s.uploadName} title={uploaded.name}>
                    {uploaded.name}
                    <span className={s.uploadSize}> · {formatBytes(uploaded.size)}</span>
                  </span>
                ) : (
                  <span className={s.uploadHint}>拖进来或直接粘贴文件也行</span>
                )}
              </div>
            )}
          </div>
          <div className={s.status} data-tone={uploadError ? 'danger' : undefined}>
            <span className={s['status-text']}>
              {uploadError
                ? uploadError
                : uploaded
                  ? `已读取「${uploaded.name}」的原始字节并转为 Base64，可在右侧复制或下载。`
                  : input
                    ? isEncode
                      ? '实时编码为 Base64，输入即转换。'
                      : '实时解码，自动忽略空白与换行，标准 +/ 与 URL 安全 -_ 均可。'
                    : isEncode
                      ? '拖入或粘贴任意文件，也可以点「上传文件」。'
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
              <span className={s['status-text']}>文件已转 Base64，可直接复制或下载。</span>
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

      <input ref={fileInputRef} type="file" hidden onChange={handleFile} />
    </div>
  )
}
