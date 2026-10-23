# HTML 小工具 · Web Tools

一个纯前端、零依赖的 HTML 小工具合集。

每个工具都是 `tools/` 下的**一个独立单文件 HTML** —— 不需要起服务、不需要联网、没有任何第三方依赖，把 `.html` 拖进浏览器就能跑。

## 🔗 在线使用

https://ooghoo.github.io/htools/

首页是工具站风格的导航页：顶栏常驻搜索、紧凑工具卡片网格、深浅色（默认跟随系统，可手动切换并记住），桌面 / 平板 / 手机自适应。

## 🧰 工具清单

| 工具 | 说明 | 入口 |
| --- | --- | --- |
| 字节换算 · Byte Converter | `bit` / `B` / `KB` … `YB` 实时互转，支持 1024 与 1000 两种进制 | [`tools/byte-converter.html`](tools/byte-converter.html) |
| 图片水印 · Watermark | 批量加水印，平铺 / 角度 / 字体 / 排版可调，导出按像素缩放 | [`tools/watermark.html`](tools/watermark.html) |

> 合集还在生长，新工具会持续往里补。

## 🖥 本地使用

```bash
git clone https://github.com/ooghoo/htools.git
```

- 打开全部工具：双击根目录 `index.html`
- 只用一个工具：直接双击 `tools/` 里对应的 `.html`（每个工具页左上角有返回首页入口）

## ➕ 新增一个工具

三步，不需要改首页：

1. 把写好的单文件工具放进 `tools/`，例如 `tools/json-format.html`
2. 在根目录 **`tools.js`** 的 `TOOLS` 数组里追加一条：

   ```js
   {
     id: 'json-format',
     name: 'JSON 格式化',
     desc: '美化 / 压缩 JSON，支持语法高亮与错误定位',
     file: 'tools/json-format.html',
     accent: '#34c759',   // 图标底色，留空则用默认蓝
     icon: 'code'         // 图标名，见 index.html 里的 ICONS
   }
   ```

3. 工具页左上角加一个返回首页的链接，保持来回导航一致：

   ```html
   <a class="back" href="../index.html">← 全部工具</a>
   ```

约定：**一个工具 = 一个自包含的 `.html`**，样式和脚本内联，不引外部 CDN，保证离线可用。

## 📦 自行部署

本项目通过 GitHub Pages 托管（`main` 分支根目录，保留 `.nojekyll`）。push 到 `main` 后会自动更新。

```bash
git add .
git commit -m "add xxx tool"
git push
```

## 🛠 技术说明

- 纯 HTML + CSS + 原生 JavaScript，无任何构建步骤、无框架、无依赖
- 首页的工具列表由 `tools.js` 注册表驱动，用普通 `<script src>` 加载，因此在 `file://` 下也能正常工作
- 所有交互均为实时计算，不发任何网络请求

## 📄 各工具说明

### 字节换算 · Byte Converter

从百度搜索结果页的换算器单独抽出，去掉了所有无关的搜索列表与热搜，只保留纯粹的换算功能。

- **实时换算**：输入数值即出结果，无需点击按钮
- **完整单位**：`bit` / `B` / `KB` / `MB` / `GB` / `TB` / `PB` / `EB` / `ZB` / `YB`
- **双规则切换**：Windows 二进制 `1 KB = 1024 B`；Mac 十进制 SI `1 KB = 1000 B`（`1 Byte = 8 bit`，bit 始终不受进制影响）
- **默认展开到 TB**，更大的单位（PB / EB / ZB / YB）折叠在「展开更多单位」下
- **结果保留 2 位小数**（极小值自动切换科学计数法，避免被吞成 `0.00`）
- **一键复制**：每行结果悬停即出现复制按钮

### 图片水印 · Watermark

给照片批量加水印，全程在浏览器本地用 Canvas 处理，图片不会离开设备。

- **批量处理**：点选 / 拖入 / 粘贴，缩略图条切换预览，单张删除
- **样式全局统一**：一套样式应用到所有图片，改一处即全部生效
- **平铺与单个**：平铺铺满或单个水印，角度 −90°～90°，九宫格定位，横纵间距可调
- **自动对比**：按每张图的平均亮度自动切白字 / 深色字，浅色照片上不再「看不见」
- **文字水印**：8 种字体、6 档字重、字号按图宽百分比、字间距、透明度、描边、投影；也支持上传 PNG Logo 作为图片水印
- **导出**：原图 / 0.5× / 长边 1080 / 自定义长边像素，JPG（自动铺白底）或 PNG，多张自动打包成 zip
- **离线可用**：ZIP 打包为手写实现，不依赖任何 CDN
