import { Database, Github, Lock, Package, Wrench } from 'lucide-react'
import { LinkButton } from '@/components/ui/LinkButton'
import { CATEGORIES } from '@/registry/categories'
import { getEnabledTools } from '@/registry/tools'
import s from './AboutPage.module.css'

const GITHUB_URL = 'https://github.com/ooghoo/htools'

/** 平台说明页：讲清楚这是什么、数据在哪、怎么加工具 */
export function AboutPage() {
  const tools = getEnabledTools()

  return (
    <>
      <header className={s.head}>
        <h1 className={s.title}>关于 htools</h1>
        <p className={s.lead}>
          一个自用的 Web 工具集合。所有计算都在浏览器里完成，没有账号、没有后端、不收集任何输入内容。
        </p>
      </header>

      <div className={s.sections}>
        <section className={s.section}>
          <h2 className={s.h2}>
            <Package aria-hidden="true" />
            规模
          </h2>
          <div className={s.facts}>
            <div className={s.fact}>
              <span className={s['fact-value']}>{tools.length}</span>
              <span className={s['fact-label']}>个工具</span>
            </div>
            <div className={s.fact}>
              <span className={s['fact-value']}>{CATEGORIES.length}</span>
              <span className={s['fact-label']}>个分类</span>
            </div>
            <div className={s.fact}>
              <span className={s['fact-value']}>0</span>
              <span className={s['fact-label']}>个后端依赖</span>
            </div>
          </div>
        </section>

        <section className={s.section}>
          <h2 className={s.h2}>
            <Lock aria-hidden="true" />
            数据与隐私
          </h2>
          <ul className={s.list}>
            <li>工具输入只存在于当前页面内存中，刷新即清空，不会被保存。</li>
            <li>
              只在浏览器本地记住三类偏好：收藏（<code>htools:favs</code>）、最近使用（
              <code>htools:recent</code>）、深浅色主题（<code>htools:theme</code>）。
            </li>
            <li>最近使用只记录「工具 ID + 时间」，不记录你用这个工具做了什么。</li>
            <li>所有请求为 0：不加载外部字体、不上报埋点、不调用任何 API。</li>
            <li>浏览器禁用 LocalStorage 时，页面照常可用，只是这次不记住偏好。</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2 className={s.h2}>
            <Wrench aria-hidden="true" />
            技术构成
          </h2>
          <ul className={s.list}>
            <li>React 18 + TypeScript + Vite，构建为纯静态资源。</li>
            <li>HashRouter 路由，静态托管不需要 SPA 回退规则，深链刷新也不会 404。</li>
            <li>每个工具单独打包，进入工具时才下载对应代码。</li>
            <li>图标统一来自 lucide-react，设计令牌集中在 <code>src/styles/tokens.css</code>。</li>
          </ul>
        </section>

        <section className={s.section}>
          <h2 className={s.h2}>
            <Database aria-hidden="true" />
            已知限制
          </h2>
          <ul className={s.list}>
            <li>纯静态部署，无法运行 Python / Node.js 后端或数据库；需要服务端的工具不适合放进来。</li>
            <li>图片水印的导出依赖 Canvas 与浏览器内存，超大图或超多张时会变慢。</li>
            <li>收藏与最近使用只存在当前浏览器，换设备不会同步。</li>
          </ul>
        </section>

        <div className={s.actions}>
          <LinkButton to="/" variant="primary">
            去挑一个工具
          </LinkButton>
          <LinkButton to={GITHUB_URL} icon={Github}>
            GitHub 仓库
          </LinkButton>
        </div>
      </div>
    </>
  )
}
