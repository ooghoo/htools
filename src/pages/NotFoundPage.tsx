import { Compass } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { LinkButton } from '@/components/ui/LinkButton'

/** 404：路由不存在，或访问了未注册 / 已停用的工具 */
export function NotFoundPage() {
  return (
    <EmptyState
      icon={Compass}
      title="这里什么也没有"
      description="链接可能已经失效，或者这个工具还没上线。回到首页看看现有的工具吧。"
      action={
        <LinkButton to="/" variant="primary">
          返回工具首页
        </LinkButton>
      }
    />
  )
}
