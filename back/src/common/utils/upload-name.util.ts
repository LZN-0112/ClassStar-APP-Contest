/**
 * 修复 multipart 上传文件名编码。
 * busboy 默认按 latin1 解析 filename 参数，Android WebView / 浏览器上传中文文件名后
 * 会变成「çæº...」这类乱码；这里在落库前统一转回 UTF-8。
 */
export function normalizeUploadFileName(name?: string): string {
  if (!name) return name || '';
  // 已是合法中文名，直接返回，避免二次转换破坏
  if (/[\u3400-\u9fff]/.test(name)) return name;
  try {
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    if (decoded.includes('\uFFFD')) return name;
    return decoded;
  } catch {
    return name;
  }
}
