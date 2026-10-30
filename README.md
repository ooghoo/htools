# htools · 个人 Web 工具集

一个自用的轻量工具集合平台：统一的工具首页、统一的页面框架、统一的视觉规范，每个工具都是独立模块，加一个工具不用碰核心代码。

纯前端、零后端、零追踪 —— 所有计算都在浏览器里完成，输入不会离开设备。

- 在线地址：https://ooghoo.github.io/htools/
- 技术栈：React 18 + TypeScript + Vite 6 + React Router 6 + CSS Modules

---

## 快速开始

```bash
npm install

npm run dev        # 本地开发，http://localhost:5173
npm run typecheck  # 只跑类型检查
npm run build      # 类型检查 + 生产构建，产物在 dist/
npm run preview    # 预览生产产物，http://localhost:4173
npm run lint       # ESLint
```

要求 Node 18+（CI 用 Node 20）。

---

## 目录结构

```
htools/
├── .github/workflows/deploy.yml   # 构建 + 部署到 GitHub Pages
├── public/.nojekyll
├── legacy/                        # v1 零构建静态站原样保留，仅作参考，不参与构建
├── src/
│   ├── app/
│   │   ├── App.tsx                # 路由表
│   │   ├── providers.tsx          # 主题 / 收藏 / 最近使用 / 轻提示
│   │   └── contexts.ts            # context 定义与 useTheme / useFavorites 等访问器
│   ├── components/
│   │   ├── AppHeader.tsx          # 顶栏
│   │   ├── Sidebar.tsx            # 侧栏：全部工具 / 最近使用 / 收藏 / 工具（全站同一份）
│   │   ├── ToolCard.tsx           # 工具卡片与列表行
│   │   ├── ToolSearch.tsx         # 搜索框（「/」聚焦、Esc 清空）
│   │   ├── ToolIcon.tsx           # 工具图标底色块
│   │   ├── EmptyState.tsx
│   │   ├── ErrorBoundary.tsx      # 单个工具崩溃不影响整站
│   │   ├── Toast.tsx
│   │   └── ui/                    # 基础组件：Button / Input / Select / Slider ...
│   ├── hooks/useMediaQuery.ts
│   ├── layouts/
│   │   ├── AppLayout.tsx          # 外壳：顶栏 + 侧栏 + 内容面板
│   │   └── ToolLayout.tsx         # 工具页框架：面包屑 / 标题 / 收藏
│   ├── pages/
│   │   ├── HomePage.tsx           # 首页：分类分组 + 搜索 + 收藏
│   │   ├── ToolPage.tsx           # /tools/:toolId
│   │   ├── AboutPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── registry/
│   │   ├── categories.ts          # 分类定义
│   │   └── tools.ts               # ★ 工具注册表
│   ├── services/storage.ts        # LocalStorage 封装（全异常兜底）
│   ├── styles/
│   │   ├── tokens.css             # ★ 设计令牌
│   │   └── global.css             # reset + 文档级排版 + 小工具类
│   ├── tools/
│   │   ├── color-converter/
│   │   │   ├── index.tsx          # 组件（default export）
│   │   │   ├── logic.ts           # 纯函数：解析与换算
│   │   │   ├── manifest.ts        # 元数据
│   │   │   └── styles.module.css
│   │   ├── json-formatter/
│   │   ├── timestamp-converter/
│   │   ├── byte-converter/
│   │   └── watermark/
│   ├── types/tool.ts
│   ├── utils/
│   └── main.tsx
├── index.html
├── vite.config.ts
├── tsconfig.json
└── eslint.config.js
```

---

## 架构要点

### 路由

| 路径 | 页面 |
| --- | --- |
| `/#/` | 工具首页（`?cat=convert` 可直达某个分类） |
| `/#/tools/:toolId` | 工具页，`toolId` 来自注册表 |
| `/#/about` | 平台说明 |
| `/#/*` | 404（也包括访问未注册 / 已停用的工具） |

用 **HashRouter**，不是 BrowserRouter。原因是 GitHub Pages 不支持 SPA 回退，`/tools/xxx` 这种深层路径刷新会 404；hash 部分不参与服务端请求，所以：

- 深层链接刷新、直接粘贴打开都能用；
- 浏览器前进 / 后退正常；
- `base: './'` 让同一个 `dist` 可以放在任意子路径（项目站点 `/htools/`、自定义域名根目录都可以），不用改配置。

每个工具用 `React.lazy` 单独打包，首页只加载注册表，进工具时才下载对应 chunk。

### 工具注册机制

首页展示、搜索、分类、路由查找**全部**基于 `src/registry/tools.ts`，没有一处 `if (toolId === 'xxx')` 的硬编码。

新增工具的完整流程：

**1. 建目录**

```
src/tools/my-tool/
├── index.tsx
├── manifest.ts
└── styles.module.css
```

**2. 写元数据 `manifest.ts`**

```ts
import { Wand } from 'lucide-react'
import type { ToolMeta } from '@/types/tool'

export const manifest: ToolMeta = {
  id: 'my-tool',                 // 唯一 ID，同时是路由参数，发布后别再改
  name: '我的工具',
  description: '一句话说明，24 字以内，用于首页卡片',
  pageDescription: '工具页副标题，不填则复用 description',
  category: 'text',              // convert | text | image
  icon: Wand,                    // 统一用 lucide-react
  accent: '#10b981',             // 图标底色
  keywords: ['my', 'tool', '别名', '关键词'],  // 参与搜索
  order: 20,                     // 同分类内的排序，小的在前；不填按名称排
  enabled: true,                 // 设 false 即下线：首页不显示，路由直接 404
  customHeader: false,           // true = 标题区由工具自己画（标题旁要放页面级控件时用）
}
```

> **页面顶部结构**：面包屑条（首页 / 工具名 + 收藏）由 `ToolLayout` 统一渲染，固定不滚动；
> 下面的标题区默认也由平台渲染（名称 + `pageDescription ?? description`）。如果工具需要在标题
> 右边放自己的控件（例如字节换算页的「小数位」），把 `customHeader` 设为 `true`，然后在工具里
> 自己写 `<h1>` + 说明文字，参考 `src/tools/byte-converter/index.tsx`。

**3. 写组件 `index.tsx`（default export，不接收 props）**

```tsx
import { Card } from '@/components/ui/Card'

export default function MyTool() {
  return <Card title="标题">工具内容</Card>
}
```

**4. 注册**

```ts
// src/registry/tools.ts
import { manifest as myTool } from '@/tools/my-tool/manifest'

export const TOOL_REGISTRY: ToolDefinition[] = [
  // ...
  { ...myTool, component: lazy(() => import('@/tools/my-tool')) },
]
```

保存后：首页自动出现（按分类归组、参与搜索）、`/#/tools/my-tool` 自动可用、侧栏计数自动更新。不需要改路由、不需要改首页。

### 满高工具（画布类）

默认页面随内容长高、由外层容器滚动。像水印这种「画布 + 参数面板」的工具需要固定占满可视区，
在工具的根元素上加 `data-fill="true"` 即可：

```tsx
<div className={s.app} data-fill="true">…</div>
```

`AppLayout` 会用 `.page:has([data-fill='true'])` 把页面高度锁到 100%，工具内部再用
`flex: 1; min-height: 0` 分配剩余空间。**内部滚动区必须加 `overscroll-behavior: contain`**，
否则滚到底后滚动会链式传给外层容器（scroll chaining，就是「滑到底页面跟着动」的那个问题）。
窄屏下建议关掉满高，回到自然文档流。

### 模块隔离

- 每个工具自己管业务状态与局部样式，不读别的工具的文件；
- 与平台交互只通过 `@/components/ui/*`、`@/app/contexts` 和 `@/types/tool`；
- 工具渲染异常会被 `ErrorBoundary` 拦住，只坏自己那一块；
- 删掉一个工具 = 删目录 + 删注册表里那一行，其余不受影响。

---

## 设计系统

所有颜色、字号、间距、圆角、阴影都在 `src/styles/tokens.css`，按语义命名（`--background` / `--card` / `--border` / `--muted-foreground` / `--brand` / `--danger` …），一套 token 同时喂 Light 和 Dark。

**规矩**：工具里不写死颜色值，只用 `var(--*)`；需要页面私有变量时用 `--t-` 前缀，避免和全局 token 撞名。

可复用组件（`src/components/ui/`）：

| 组件 | 用途 |
| --- | --- |
| `Button` / `LinkButton` | 主 / 次 / 幽灵 / 危险 四种变体，`loading`、`iconOnly` |
| `Input` / `TextArea` / `Select` | 表单控件，统一高度、焦点环、错误态；`Input` / `Select` 另有 `size="lg"`（46px 主输入） |
| `Field` | 标签 + 控件 + 说明 / 错误的一体外壳 |
| `Slider` / `Toggle` / `Segmented` / `Chips` | 连续调节、开关、互斥切换、快捷标签 |
| `Card` | 内容卡片（`narrow` 窄卡、`flush` 去内边距）；无阴影，只用描边分层 |
| `ValueList` | 结果列表：标签 + 等宽值 + 复制按钮 |
| `CopyButton` | 复制 + 成功提示，内部处理降级 |
| `InfoTip` | 标签后的小问号，悬浮 / 聚焦显示说明 |
| `EmptyState` | 空状态 |
| `Toast` | 全局轻提示 |

响应式：`≥1440px` 侧栏默认展开；`1024–1439px` 内联收起；`<1024px` 侧栏变抽屉并加遮罩；`<640px` 内容面板铺满、卡片单列。

---

## 数据与隐私

- 不请求任何后端，不加载外部字体 / 统计脚本，不发任何网络请求（除页面自身静态资源）。
- 工具输入只存在内存里，刷新即清空。
- 只在 LocalStorage 记三类偏好，且全部读写在 `src/services/storage.ts` 里做了 try/catch（Safari 无痕、配额写满、被策略禁用都不会白屏）：

| 键 | 内容 |
| --- | --- |
| `htools:favs` | 收藏的工具 ID 数组（沿用 v1 的键，老收藏能继承） |
| `htools:recent` | 最近使用：`{ id, at }[]`，最多 6 条、侧栏只展示 2 条，**不含任何输入内容** |
| `htools:theme` | `light` / `dark`，不设则跟随系统 |
| `htools:view` | 首页卡片 / 列表视图 |

- 用户输入只作为文本节点渲染，没有 `dangerouslySetInnerHTML`。
- 浏览器不支持 Clipboard API（http 内网、非安全上下文）时自动降级为 `execCommand('copy')`。

---

## 部署到 GitHub Pages

工作流在 `.github/workflows/deploy.yml`：推 `main` → 装依赖 → 类型检查 + 构建 → 上传 `dist` → 发布到 Pages。

### 首次配置（只需做一次）

1. 确认代码已推到 GitHub 仓库的 `main` 分支。
2. 打开仓库 **Settings → Pages**，把 **Source** 从「Deploy from a branch」改成 **「GitHub Actions」**。
   > 这一步必须做。原来的分支部署（根目录）会和 Actions 部署冲突，且根目录已经不再是站点源码。
3. 打开 **Settings → Actions → General → Workflow permissions**，确认允许 GitHub Actions 读写（默认即可，工作流已声明所需权限）。
4. 推一次代码或在 **Actions** 页手动 **Run workflow**，等 `Build` + `Deploy` 两个 job 变绿。

站点地址：`https://<用户名>.github.io/<仓库名>/`

### 关于 base 路径

`vite.config.ts` 里 `base: './'`。产物里的资源引用是相对路径，配合 HashRouter 后：

- 放在 `/<仓库名>/` 子路径 ✅
- 放在自定义域名根目录 ✅
- 换仓库名不用改配置 ✅

如果以后改成 BrowserRouter，就必须把 `base` 显式设成 `/仓库名/`，并且额外处理 404 回退（例如 `404.html` 复制 `index.html`）—— 这也是本项目继续用 HashRouter 的原因。

### 本地验证部署产物

```bash
npm run build
npm run preview     # 打开 http://localhost:4173
```

`dist/` 是纯静态文件，扔到任何静态服务器（Nginx、Vercel、Netlify、对象存储）都能跑。

---

## 已有工具

| 工具 | 能力 | 本地逻辑文件 |
| --- | --- | --- |
| 颜色转换 | HEX / `rgb()` / `hsl()` 输入互转，输入与结果合并在一张卡、右侧独立色卡，逐项复制，非法输入即时提示 | `tools/color-converter/logic.ts` |
| JSON 格式化 | 2 / 4 空格 / Tab 缩进，格式化、压缩、合法性校验、错误定位到行列、复制、下载 `.json`；标题栏放示例，双栏编辑器撑满高度 | `tools/json-formatter/logic.ts` |
| 时间戳转换 | 秒 / 毫秒双向解释，本地时间 / UTC / ISO 8601，明确标注时区与偏移，非法输入校验；两张卡片等高，时区说明贴底 | `tools/timestamp-converter/logic.ts` |
| 字节换算 | `bit` ~ `YB` 全单位表格式排列（默认 7 行到 `PB`，其余折叠），1024 / 1000 双列对照，小数位 2/4/6 可切，数值右侧悬停复制，本次会话历史（真实计算后才出现），常用对照说明 | `tools/byte-converter/logic.ts` |
| Base64 编解码 | 文本与 Base64 双向转换，URL 安全变体、按 76 字符换行、UTF-8 自动识别，支持上传图片转 Base64 | `tools/base64/logic.ts` |
| 图片水印 | 批量加水印，平铺 / 单个、角度、九宫格、字体字重字距、自动对比、描边投影、Logo 水印、按像素导出、多张打包 zip；导出默认原图 / JPG / 100% | `tools/watermark/render.ts` |

---

## 验收记录

构建与检查（本地实测）：

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| TypeScript 类型检查 | `npm run typecheck` | ✅ 0 error |
| ESLint | `npm run lint` | ✅ 0 problem |
| 生产构建 | `npm run build` | ✅ 成功，首页 JS gzip ≈ 68 KB，工具按需分块 |
| 预览产物 | `npm run preview` | ✅ 可访问 |

浏览器交互验证（headless Chromium，1440×900，`dist` 产物）：**28 / 28 通过**

| 分组 | 验证项 |
| --- | --- |
| 首页 | 5 个工具入口按分类渲染；搜索「json」只剩 1 个结果；无结果时出现空状态并可清除 |
| 分类 | `?cat=text` 只显示文本分类工具 |
| 收藏 | 点击收藏写入 LocalStorage，刷新后侧栏仍保留 |
| 最近使用 | 访问工具后左侧栏「最近使用」出现在收藏上方，最多 2 条 |
| 颜色 | 非法输入报错；`#00ff00` → `rgb(0, 255, 0)` / `hsl(120, 100%, 50%)`；3 位简写 `f00` → `#FF0000` |
| JSON | 示例可格式化（多行）；可压缩为单行；`{"a": 1,}` 报错并定位到行 / 列 |
| 时间戳 | `1793085342` 秒 → 本地 `2026-10-27 15:15:42`、ISO `2026-10-27T07:15:42.000Z`；显示 `Asia/Shanghai`；切毫秒后重新解释 |
| 字节 | `1 B` → `8.00 bit`；极小值改用科学计数法（`9.77e-4`），不再显示成 `0.00` |
| 404 | 未注册工具 ID 与未知路由都进入 404 页 |
| 水印 | 拖入 320×200 图片后画布绘制成功、中心像素非空、显示尺寸信息、可切到导出面板 |
| 主题 | 切换深色后 `data-theme` 与 LocalStorage 同步 |
| 运行时 | 全流程无 console error / page error |

---

## 已知限制

1. **只做纯静态**：没有后端、没有数据库、没有登录。需要服务端的工具（调用 API、存数据、OCR 之类）不适合放进这个仓库，要单独评估。
2. **偏好不同步**：收藏与最近使用存在当前浏览器，换设备 / 换浏览器不共享。
3. **图片水印的内存边界**：单张导出受 Canvas 上限约束（约 1677 万像素，超出会等比缩小）；一次导出很多张大会话内存占用高、速度变慢，这是浏览器本地处理的固有限制。
4. **JSON 大数字精度**：走 `JSON.parse`，超过 `2^53` 的整数会丢精度（与浏览器原生行为一致）。
5. **时间戳用本机时区**：只有本地时间、UTC、ISO 三种视图，不做任意时区换算。
6. **HashRouter 的 URL 带 `#`**：换来的是静态托管零配置，见上文取舍说明。
7. **v1 旧链接失效**：`legacy/` 里的原静态站不再部署，`tools/xxx.html` 旧地址会 404，功能已迁移到新工具页。

---

## 后续可扩展方向

- 按需再接 IndexedDB（例如图片处理草稿、大文本历史），现在 LocalStorage 足够。
- 给工具加 `tags` 之外的「使用次数」统计，用本地计数驱动首页推荐位。
- 工具目录再长下去，可以给 `/tools/:toolId` 加子路由做多面板工具。
- 想要任意时区、正则测试、Diff 之类的新工具，按上面的注册流程加即可，不需要动核心。

---

## 关于 `legacy/`

`legacy/` 是重写前的零构建版本（首页 + `tools.js` 注册表 + 单文件工具页），完整保留在仓库里方便对照旧实现细节（尤其是水印的绘制算法与 zip 打包）。它不在 Vite 的构建范围内，也不会被部署。
