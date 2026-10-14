// ============================================================
// HTML 内容清理工具
// 用于 Taro RichText 渲染的富文本，移除不可靠的标签
// ============================================================

const SCRIPT_RE = /<script[\s\S]*?<\/script>/gi
const STYLE_RE = /<style[\s\S]*?<\/style>/gi
const STYLE_ATTR_RE = /\s*style="[^"]*"/gi
const SCRIPT_ATTR_RE = /\s*on\w+="[^"]*"/gi

/**
 * 清理 HTML 字符串，适配 rich-text 渲染：
 * - 移除 script / style 标签
 * - 移除内联 style="..." 与 on* 事件属性
 * @param html 原始 HTML
 * @returns 清理后的 HTML
 */
export function cleanHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(SCRIPT_RE, '')
    .replace(STYLE_RE, '')
    .replace(STYLE_ATTR_RE, '')
    .replace(SCRIPT_ATTR_RE, '')
    .trim()
}