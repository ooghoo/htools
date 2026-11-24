import { CircleX, ClipboardPaste, ImagePlus, MousePointer2, Move, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import s from '../styles.module.css'

interface EmptyImportProps {
  dragOver: boolean
  loading: boolean
  error: string | null
  onPick: () => void
  onDismissError: () => void
}

const METHODS = [
  { icon: ImagePlus, label: '点击选择', hint: '从本地文件选择' },
  { icon: Move, label: '拖拽放入', hint: '拖到页面任意位置' },
  { icon: ClipboardPaste, label: '粘贴图片', hint: '⌘V / Ctrl+V' },
]

export function EmptyImport({ dragOver, loading, error, onPick, onDismissError }: EmptyImportProps) {
  return (
    <div className={s['empty-wrap']} data-drag={dragOver}>
      {error && (
        <div className={s['error-banner']} role="alert">
          <CircleX aria-hidden="true" />
          <span>{error}</span>
          <button type="button" onClick={onDismissError}>
            关闭
          </button>
        </div>
      )}

      <div className={s['empty-card']}>
        <div className={s['empty-grid']} aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className={s['empty-cell']} data-index={i} />
          ))}
        </div>

        <div className={s['empty-copy']}>
          <span className={s['empty-eyebrow']}>SLICE STUDIO</span>
          <h2>{loading ? '正在读取图片…' : dragOver ? '松开即可导入' : '把图片放到这里'}</h2>
          <p>
            {loading
              ? '正在本地解码，不会上传任何数据'
              : '导入后直接进入编辑状态，调整行列即可实时预览切割结果'}
          </p>
        </div>

        {loading ? (
          <span className={s['empty-spinner']} aria-hidden="true" />
        ) : (
          <Button variant="primary" icon={ImagePlus} onClick={onPick}>
            选择图片
          </Button>
        )}

        <div className={s['empty-methods']}>
          {METHODS.map(({ icon: Icon, label, hint }) => (
            <div key={label} className={s['method-item']}>
              <Icon aria-hidden="true" />
              <strong>{label}</strong>
              <span>{hint}</span>
            </div>
          ))}
        </div>

        <div className={s['empty-formats']}>
          <span>支持 JPG / JPEG / PNG / WebP</span>
          <span className={s['dot']} aria-hidden="true" />
          <span>单张上限 80 MB</span>
          <span className={s['dot']} aria-hidden="true" />
          <span className={s['privacy-inline']}>
            <ShieldCheck aria-hidden="true" /> 图片不离本机
          </span>
        </div>
      </div>

      <p className={s['empty-footnote']}>
        <MousePointer2 aria-hidden="true" />
        切割线以原图像素计算 · 支持 PNG 透明通道、JPG 底色与质量、WebP 导出
      </p>
    </div>
  )
}
