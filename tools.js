/* ---------------------------------------------------------------
 * 工具注册表
 * 新增一个小工具时：把 .html 放进 tools/ 目录，然后在这里追加一条。
 * 字段说明：
 *   id     —— 唯一标识，不显示
 *   name   —— 卡片标题
 *   desc   —— 一句话描述（建议 24 字以内）
 *   file   —— 相对于仓库根目录的路径
 *   accent —— 图标底色，用于生成渐变；留空则用默认蓝
 *   icon   —— 图标名，对应 index.html 中的 ICONS；留空则用默认方块图标
 * --------------------------------------------------------------- */
var TOOLS = [
  {
    id: 'byte-converter',
    name: '字节换算',
    desc: 'bit / B / KB … YB 实时互转，1024 与 1000 两种进制',
    file: 'tools/byte-converter.html',
    accent: '#0071e3',
    icon: 'byte'
  },
  {
    id: 'watermark',
    name: '图片水印',
    desc: '批量加水印，样式统一，导出按像素缩放',
    file: 'tools/watermark.html',
    accent: '#5e5ce6',
    icon: 'image'
  }
];
