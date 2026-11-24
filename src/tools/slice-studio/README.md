# Slice Studio · 纯本地图片切割工作台

htools 里的一个工具，路由：`/#/tools/slice-studio`。

所有图片读取、切割预览、编码、ZIP 打包都在浏览器本地完成：没有后端、没有数据库、
没有账号、没有上传接口、没有远程图片处理 API。源码里没有 `fetch` / `XMLHttpRequest` /
`axios` / 任何 `http(s)` 地址，图片只通过 `File` → `blob:` object URL → `Canvas` 流转。

---

## 一、快速开始

```bash
cd htools
npm install          # 依赖：React 18 / TypeScript / Vite / lucide-react / JSZip
npm run dev          # 本地开发，http://localhost:5173
npm test             # 切割 / 命名 / 编码 / ZIP 纯逻辑单元测试（19 项）
npm run typecheck    # TypeScript 类型检查
npm run lint         # ESLint
npm run build        # 生产构建 = tsc --noEmit && vite build
npm run preview      # 预览 dist 产物，http://localhost:4173
```

浏览器打开 `http://localhost:5173/#/tools/slice-studio`，或从首页「图片」分类进入。

### 生产构建

`npm run build` 输出到 `dist/`。`vite.config.ts` 用 `base: './'` + HashRouter，
产物可以放在任意子路径，也可以直接双击 `dist/index.html` 用 `file://` 打开
（Worker 在 `file://` 下若被浏览器阻止，会自动降级到主线程分批导出，功能不受影响）。

### GitHub Pages 部署

仓库已有 `.github/workflows/deploy.yml`：推送 `main` 自动 `npm ci` → `npm run build` →
部署 `dist`。只需在仓库 Settings → Pages 里把 Source 设为 **GitHub Actions**。

发布后访问：`https://<用户名>.github.io/<仓库名>/#/tools/slice-studio`

无需配置 SPA 回退规则：hash 路由不参与服务端请求，深链刷新不会 404；
`base: './'` 让所有资源相对引用，项目站点子路径也能正常加载 Worker 与 JS 分块。

---

## 二、使用方法

1. **导入**：点击「选择图片」、把图片拖到页面任意位置、或 `⌘V` / `Ctrl+V` 粘贴剪贴板图片。
   支持 JPG / JPEG / PNG / WebP，单文件上限 80 MB，标题栏显示文件名、尺寸、格式与大小。
2. **设置切割**：左侧选「网格等分」或「自定义切割」。
   - 网格：点 2×2 / 3×3 / 3×4 / 4×4 / 横向 3 段 / 纵向 3 段预设，或用行数、列数步进器（1–20）。
   - 自定义：在画布上直接拖动蓝色切割线，或在左侧输入原图像素坐标、增删切割线。
     首次切到自定义会沿用当前网格的切割线。
3. **查看画布**：滚轮以光标为中心缩放、拖拽平移、点击「重置视图」或双击画布回到适应窗口。
   悬停高亮切片，点击切片会淡化其他区域并在右下角显示该区域的放大预览、编号、文件名、
   原图像素坐标，可「下载此切片」或「聚焦」。
4. **导出**：左侧设置 PNG / JPG / WebP、质量、JPG 背景色、文件名前缀、编号补零与正/逆序。
   下方切片结果可单张下载；标题栏「导出 ZIP」在后台 Worker 中逐张编码并打包，
   显示进度、可取消，完成后自动下载，结果条可「重新下载」。

> 预览缩放只影响显示，导出始终按原图像素 1:1 裁切，不缩放、不重采样。

---

## 三、目录结构

```
src/tools/slice-studio/
├── README.md                 本文档
├── manifest.ts               工具元数据（注册到平台）
├── index.tsx                 组合根：状态机 + 导入/拖放/粘贴 + 派生数据
├── styles.module.css         全部局部样式（浅色优先，颜色取自 tokens.css）
├── types.ts                  公共类型 + Worker 消息协议
├── lib/
│   ├── constants.ts          上限、MIME、默认设置、预设
│   ├── grid.ts               ★ 纯切割算法（网格 / 自定义 / 命中测试 / 铺满自检）
│   ├── naming.ts             ★ 文件名、编号补零、正逆序、ZIP 名
│   ├── encode.ts             ★ Canvas 编码（透明通道 / JPG 底色 / 质量 / 上限校验）
│   ├── export.ts             ★ 导出编排（Worker 优先 + 主线程降级 + 取消）
│   ├── download.ts           本地 Blob 下载与 object URL 释放
│   ├── image.ts              File 校验、解码、格式识别、资源释放
│   ├── grid.test.ts          切割算法测试
│   ├── naming.test.ts        命名规则测试
│   ├── encode.test.ts        编码参数与不缩放测试
│   └── zip.test.ts           ZIP 条目顺序测试（真实 JSZip 往返）
├── workers/
│   └── export.worker.ts      后台解码 → OffscreenCanvas 编码 → JSZip 打包 → 进度
├── hooks/
│   ├── useImageSource.ts     空 / 读取中 / 就绪 / 错误状态机
│   ├── useCanvasView.ts      适应窗口、缩放、平移、聚焦、坐标换算
│   └── useZipExport.ts       空闲 / 处理中 / 完成 / 失败 + 取消
└── components/
    ├── ToolHeader.tsx        标题栏、源图信息、更换/清空/导出 ZIP
    ├── EmptyImport.tsx      初始空状态与导入错误
    ├── SettingsPanel.tsx    左侧切割参数与导出设置
    ├── CanvasStage.tsx      画布渲染、切割线、编号、悬停/选中、详情卡
    ├── ResultsPanel.tsx     下方切片缩略图列表与单张下载
    └── ExportOverlay.tsx    导出进度与取消
```

`★` 是不依赖 React / DOM 的纯逻辑模块，可以直接用 `node --test` 跑测试。
UI 与算法之间只通过 `types.ts` 的 `SliceRegion` / `SliceFile` 传数据。

---

## 四、关键实现约束

| 约束 | 做法 |
| --- | --- |
| 原始像素不丢失 | 每张切片的画布宽高 = 切片像素宽高；`drawImage` 的源矩形与目标矩形一致，`imageSmoothingEnabled = false` |
| 不重不漏 | 边界用 `Math.round(length * i / count)` 生成，相邻分段首尾相接；单轴 ≤ 20、总数 ≤ 400；`verifyTiling` 可自检面积与重叠 |
| 无法整除 | 余数分散到前面的分段（1000 / 3 → 333 / 334 / 333），面板会显示实际列宽 / 行高 |
| 坐标一致 | 所有切割坐标都是原图像素整数；预览用 `transform.scale` 做屏幕换算，仅用于绘制与命中测试 |
| 大图不卡死 | 编码与 ZIP 打包放进 Web Worker（`OffscreenCanvas` + `createImageBitmap`）；缩略图用 CSS 背景裁切，不做额外编码；降级路径每 3 张让出一次事件循环 |
| 资源释放 | 换图 / 清空 / 卸载时 `revokeObjectURL` 并清空 `img.src`；编码画布用完立即置 0；Worker 完成或取消即 `terminate()`；`ImageBitmap.close()` |
| 错误可读 | 格式不支持、文件超限、解码失败、像素超限、切片超画布上限、浏览器不支持 WebP 编码都有明确中文提示 |
| 不上传 | 无任何网络调用；Worker 只接收本地 `Blob` 结构化克隆 |

默认导出设置：PNG、质量 92%（JPG/WebP）、JPG 底色 `#FFFFFF`、前缀取原图名、
编号自动补零（至少 2 位）、正序。ZIP 条目始终按编号 `1 → N` 写入；「逆序」改变的是
编号方向（右下角变 01），每张图仍对应唯一编号。

---

## 五、已实现 / 未实现

### 已实现

- 导入：点击 / 拖拽 / 粘贴；JPG、JPEG、PNG、WebP；名称 / 尺寸 / 格式 / 大小；更换、清空
- 切割：网格等分（自定义行列、6 个预设、横向 / 纵向切割）、实时切割线与切片总数
- 自定义切割：可拖动切割线、像素坐标输入、增删切割线、不同宽高的切片
- 画布：自适应、滚轮缩放（以光标为中心）、拖拽平移、重置 / 双击重置、切割线、
  切片编号、悬停高亮、点击选中并显示对应区域、聚焦切片
- 结果：缩略图（CSS 背景裁切，零编码开销）、编号、像素宽高、文件名、单张下载、收起 / 展开
- 导出：PNG / JPG / WebP；PNG 与 WebP 保留透明通道、JPG 背景色与质量、WebP/JPG 质量滑杆；
  ZIP 本地生成、按编号顺序、正序 / 逆序、自定义前缀、编号补零、进度显示、取消、重新下载
- 状态：空、加载、编辑、结果、导出中、导出完成、错误；全部按钮有真实功能
- 工程：算法 / UI / Worker 分离、13 类文件分层、19 项自动化测试、错误边界由平台兜底

### 未实现（有意留到后续版本）

- 任意形状 / 手绘矩形切片（Photopea 式自由框选）；当前只做「整图被切割线完整划分」
- 切片级单独设置格式 / 质量 / 文件名
- EXIF / ICC 元数据复制（浏览器 Canvas 编码本身不保留，需要手动写入）
- 动图（GIF / APNG / 动 WebP）逐帧切割，首版只取静态帧
- 导出后重新排序、批量重命名、切片间距 / 出血（trim / add 像素）
- 多图队列、历史记录、撤销重做、键盘快捷键
- 移动端手势（双指缩放）；桌面端优先，窄屏只做了可用布局

---

## 六、功能测试结果（本地实测，2026-11-12）

### 自动化

| 检查 | 命令 / 方式 | 结果 |
| --- | --- | --- |
| 单元测试 | `npm test` | ✅ 19 / 19 通过 |
| 类型检查 | `npm run typecheck` | ✅ 0 error |
| ESLint | `npm run lint` | ✅ 0 problem |
| 生产构建 | `npm run build` | ✅ 成功，Worker 单独产出 `export.worker-*.js` |
| 组件渲染冒烟 | Vite SSR 渲染全部 6 个组件 | ✅ 6 / 6 无异常；9 个编号、9 张结果卡片、详情卡、完成提示均存在 |
| Worker 端到端 | 注入 mock 画布，跑完 6 张切片的编码 → ZIP → 解包 | ✅ 26 条进度消息、条目顺序 01→06、内容可读 |
| 降级导出端到端 | 隐藏 Worker 能力，跑主线程分批导出 1001×997 切 3×4 | ✅ 12 张、条目按编号有序、进度到 100%、铺满自检 `ok` |
| 样式类名覆盖 | 静态比对 109 个 `s.*` 引用与 CSS 定义 | ✅ 无缺失、无冗余 |
| 网络请求检查 | 全目录 grep `fetch` / `XMLHttpRequest` / `axios` / `http(s)://` | ✅ 0 处；dev 与 dist 产物均无图片上传路径 |
| 开发服务器模块转换 | `curl` 逐个请求工具 / 组件 / lib / worker / CSS | ✅ 全部 200，无转换错误 |

单元测试覆盖的具体场景：

| 分组 | 场景 |
| --- | --- |
| 网格 | 1000×900 切 3×3 的边界；1001×997 切 3×4 无法整除不重不漏；5×3 图片请求 10×10 自动收敛；20×20 总数上限；1×1 等价原图 |
| 自定义 | 乱序 / 重复 / 越界坐标规范化；不同宽高切片；增 / 拖 / 删切割线不交叉不贴边；命中测试 |
| 命名 | 非法字符清洗、补零 4 种模式、正序 / 逆序编号、文件名唯一、3 种格式扩展名、ZIP 名 |
| ZIP | 真实 JSZip 往返，逆序编号下条目仍按 01→N 写入 |
| 编码 | 画布尺寸 = 切片尺寸、源/目标矩形 1:1 不缩放；JPG 铺底色；WebP 不铺底色；不支持 WebP 明确报错；画布上限拒绝；设置 → 编码参数映射 |

### 需要真实浏览器复核的项目

以下项目依赖浏览器原生 Canvas 编码，本环境按既有约定不启动前台浏览器做自动化验证，
因此以**人工验收清单**交付（逻辑路径已用 mock 覆盖，真实像素编码需在浏览器里点一次确认）：

1. 透明 PNG 导出 PNG / WebP 后，透明区域在看图工具里仍为透明。
2. 同一张透明 PNG 导出 JPG 后，透明区域变成设定的背景色。
3. JPG / WebP 质量滑杆在高低两端的文件体积差异。
4. 一张宽高无法被 3 整除的图，导出后用看图工具核对各切片宽高之和 = 原图宽 / 高，
   且拼接后无缝隙。
5. 拖入超大图（例如 6000×4000）时 Worker 导出期间界面仍可操作、内存无明显泄漏。
6. 分别用 Chrome / Safari 打开，确认 Worker 路径与（必要时）主线程降级路径都能下载 ZIP。
7. 浏览器 DevTools → Network 面板确认导入与导出全过程 0 个网络请求。

---

## 七、参考站点的分析结论（只取思路，不复制页面）

| 站点 | 提取的设计思路 | 本工具的落地 |
| --- | --- | --- |
| 素材集市 九宫格切图 | 上传后实时画辅助线、滚轮缩放 / 拖拽平移、纯前端本地处理、ZIP 打包、横 / 纵向等分与网格两种模式 | 上传即进编辑态、画布交互、Worker 本地 ZIP、横向 3 段 / 纵向 3 段预设 |
| Postcron ImageSplitter | Instagram 网格场景、行列数快速设定、按发布顺序编号、ZIP 内顺序正确、四步式极短流程 | 6 个网格预设、切片编号与「按编号顺序导出」、编号正 / 逆序、去掉上传后的确认步骤 |
| IMG online 切图 | 1–30 行列、正方形切片与对齐、输出格式可选、JPEG 质量、PNG 透明支持、逐像素微调 | 行列 1–20（总数 ≤ 400）、PNG/JPG/WebP、质量滑杆、透明通道、自定义切割线以原图像素为单位 |

未被采用的部分：Postcron 的自动发布到社交平台、IMG online 的服务端处理与 EXIF 复制、
以及三站共有的「表单 → 提交 → 等待结果」流程。Slice Studio 用工作台布局 + 参数实时生效替代。
