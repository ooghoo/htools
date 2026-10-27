import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { Button } from './ui/Button'
import s from './ErrorBoundary.module.css'

interface ErrorBoundaryProps {
  children: ReactNode
  /** 变化时自动重置错误状态（例如切换工具） */
  resetKey?: string
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * 单个工具出错时只影响自己，不把整个应用带崩。
 * 工具是懒加载的独立 chunk，渲染期异常由这里兜住。
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 纯前端应用没有上报服务，保留在控制台方便排查
    console.error('[htools] 工具渲染失败：', error, info.componentStack)
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  private handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className={s.wrap}>
        <span className={s.icon} aria-hidden="true">
          <TriangleAlert />
        </span>
        <p className={s.title}>这个工具出了点问题</p>
        <p className={s.desc}>
          页面其余部分仍然可用。可以先重试，或返回首页换个工具。
          <code className={s.code}>{this.state.error.message}</code>
        </p>
        <Button variant="secondary" icon={RotateCcw} onClick={this.handleReset}>
          重试
        </Button>
      </div>
    )
  }
}
