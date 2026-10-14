const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const appFile = path.join(__dirname, 'src', 'App.tsx');

// 读取路由列表
const appContent = fs.readFileSync(appFile, 'utf-8');
const routeMatches = [...appContent.matchAll(/path="([^"]+)"/g)];
const routes = routeMatches.map(m => m[1]);

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx')).sort();

const findings = [];
const pageJumpStats = [];

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const pageName = file.replace('.tsx', '');

  const hasUseNavigate = /useNavigate\s*\(/.test(content);
  const routeCalls = [...content.matchAll(/navigate\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g)].map(m => m[1]);
  const backCalls = [...content.matchAll(/navigate\s*\(\s*-1\s*\)/g)].length;

  const onClickMatches = [...content.matchAll(/onClick\s*=\s*\{([^}]+)\}/g)];
  const onClickCount = onClickMatches.length;

  pageJumpStats.push({
    page: pageName,
    hasUseNavigate,
    routeJumps: routeCalls,
    backJumps: backCalls,
    onClickCount
  });

  // 检查目标路由有效性
  const invalidTargets = routeCalls.filter(t => !routes.includes(t));
  if (invalidTargets.length > 0) {
    findings.push({
      page: pageName,
      type: 'error-jump',
      detail: '存在指向未注册路由的跳转: ' + invalidTargets.join(', ')
    });
  }
});

// 输出完整统计
console.log('=== 页面跳转统计 ===');
pageJumpStats.forEach(s => {
  const jumpStr = s.routeJumps.length > 0 ? s.routeJumps.join(', ') : (s.backJumps > 0 ? 'navigate(-1)' : '无');
  console.log(`${s.page}: useNavigate=${s.hasUseNavigate}, onClick=${s.onClickCount}, 跳转=[${jumpStr}]`);
});

console.log('\n=== 跳转目标汇总 ===');
const targetMap = {};
pageJumpStats.forEach(s => {
  s.routeJumps.forEach(t => {
    targetMap[t] = (targetMap[t] || 0) + 1;
  });
});
Object.entries(targetMap).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => {
  console.log(`${t}: ${c} 次`);
});

console.log('\n=== 问题发现 ===');
findings.forEach(f => {
  console.log(`[${f.type}] ${f.page}: ${f.detail}`);
});

console.log('\n=== 没有 useNavigate 的文件 ===');
pageJumpStats.filter(s => !s.hasUseNavigate).forEach(s => console.log(s.page));
