/**
 * 班务星 · 图标资源生成（入口脚本）
 * ================================
 *
 * 历史说明：本文件早期用 sharp 生成图标（源图 icon-source.png，旧版“霓虹星星”图标）。
 * 现在图标源为 front/icon-new-source.png（蓝色学士帽 + 黄色星星 + 蓝色星环），
 * 处理流程（高清修复 → 去白边 → 圆角透明 → 各密度资源）已迁移到：
 *
 *     front/tools/gen-icon-assets.py
 *
 * 之所以换成 Python：去白边前的卡片边界、圆角半径需要用像素统计精确测量，
 * 用 numpy/Pillow 做二倍 Lanczos 重建 + LAB 亮度通道 USM 锐化 + 4 倍超采样圆角遮罩，
 * 比 sharp 的启发式白边检测更可靠。实测参数：
 *     卡片内部边界 x=105..1146, y=110..1151（1254 尺度）
 *     圆角半径 / 卡片边长 ≈ 0.2333
 *
 * 用法：
 *     python front/tools/gen-icon-assets.py
 * 或（本脚本）：
 *     node front/process-icons.cjs
 *
 * 生成物：
 *     front/icon-master-2048.png            主图（2048，圆角外透明）
 *     front/icon-512.png                    512 主图
 *     front/public/images/app-icon.png      App 启动页图标（Launch.tsx 使用）
 *     front/public/favicon.png              网页图标
 *     android/.../res/mipmap-xxhdpi/…     ic_launcher / ic_launcher_round / ic_launcher_foreground
 *     android/.../res/drawable-xxxhdpi/splash.png   启动背景（各密度）
 */
const { spawnSync } = require('child_process');
const path = require('path');

const script = path.resolve(__dirname, 'tools', 'gen-icon-assets.py');
const candidates = ['python', 'python3', 'py'];

let result = null;
for (const exe of candidates) {
  const r = spawnSync(exe, [script], { stdio: 'inherit', cwd: __dirname });
  if (!r.error) {
    result = r;
    break;
  }
}

if (!result) {
  console.error('[process-icons] 找不到 python，可手动执行: python front/tools/gen-icon-assets.py');
  process.exit(1);
}
process.exit(result.status === null ? 1 : result.status);
