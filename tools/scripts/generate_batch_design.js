const fs = require('fs');

const PATH = 'D:\\校园班级事务智能管理助手\\校园班级事务智能管理助手.pen';
const OUT = 'D:\\校园班级事务智能管理助手\\shadcn_standardize_batch.txt';
const data = JSON.parse(fs.readFileSync(PATH, 'utf-8'));

const vars = data.variables || {};
const resolveVar = (v) => {
  if (typeof v === 'string' && v.startsWith('$')) {
    const key = v.slice(1);
    if (vars[key]) return vars[key].value;
  }
  return v;
};

const to8 = (n) => {
  if (typeof n !== 'number') return n;
  const r = Math.round(n / 8) * 8;
  return r === 0 && n > 0 ? 8 : r;
};

const nodesById = new Map();
const allFrames = [];
const allTexts = [];
const allPaths = [];
const allIcons = [];
const allRefs = [];

function walk(node, parent = null, depth = 0, page = null, inDescendants = false) {
  if (!node || typeof node !== 'object') return;
  node._parent = parent;
  node._depth = depth;
  node._page = page;
  node._inDescendants = inDescendants;
  nodesById.set(node.id, node);
  if (node.type === 'frame') allFrames.push(node);
  if (node.type === 'text') allTexts.push(node);
  if (node.type === 'path') allPaths.push(node);
  if (node.type === 'icon') allIcons.push(node);
  if (node.type === 'ref') allRefs.push(node);

  const childList = node.children || [];
  for (const child of childList) {
    walk(child, node, depth + 1, page || (node.type === 'frame' && !node.reusable && node.width === 393 && node.height === 844 ? node : page), inDescendants);
  }

  // Walk into ref descendants (overrides / instantiated content)
  if (node.type === 'ref' && node.descendants && typeof node.descendants === 'object') {
    for (const [refChildId, overrideNode] of Object.entries(node.descendants)) {
      if (overrideNode && typeof overrideNode === 'object') {
        overrideNode._refChildId = refChildId;
        walk(overrideNode, node, depth + 1, page, true);
      }
    }
  }
}
for (const child of data.children || []) walk(child);

function childrenTexts(node) {
  return (node.children || []).filter(c => c && c.type === 'text');
}
function childrenFrames(node) {
  return (node.children || []).filter(c => c && c.type === 'frame');
}
function childrenPaths(node) {
  return (node.children || []).filter(c => c && c.type === 'path');
}
function firstTextChild(node) {
  return (node.children || []).find(c => c && c.type === 'text');
}
function descendantIds(node) {
  const ids = [];
  function collect(n) {
    if (!n) return;
    ids.push(n.id);
    for (const c of (n.children || [])) collect(c);
  }
  collect(node);
  return ids;
}

const REUSABLE = new Set(['eV6B7', 'Df9ur', 'p1Ykr', 'O5oXCN', 'kDswP', 'lPWz4']);

const classifications = [];
for (const f of allFrames) {
  const h = typeof f.height === 'number' ? f.height : null;
  const w = typeof f.width === 'number' ? f.width : null;
  const fill = f.fill;
  const fillStr = typeof fill === 'string' ? fill : '';
  const cr = f.cornerRadius;
  const name = (f.name || '').toLowerCase();
  const textKids = childrenTexts(f);
  const frameKids = childrenFrames(f);
  const pathKids = childrenPaths(f);
  const hasText = textKids.length > 0;
  const hasFrame = frameKids.length > 0;

  let type = 'other';

  if (f.id === 'kDswP') type = 'tabbar';
  else if (f.id === 'eV6B7' || f.id === 'Df9ur') type = 'button';
  else if (f.id === 'p1Ykr') type = 'input';
  else if (f.id === 'O5oXCN') type = 'card';
  else if (name.includes('tab bar') || name.includes('tabbar') || name.includes('底部导航')) type = 'tabbar';
  else if (name.includes('dialog') || name.includes('modal') || name.includes('popup') || name.includes('弹窗') || name.includes('alert')) type = 'dialog';
  else if (name.includes('header') || name.includes('nav') || name.includes('top bar') || name.includes('title bar') || name.includes('顶部导航')) type = 'header';
  // Badge / Tag: small frame named badge/tag/label, with text
  else if ((name.includes('badge') || name.includes('tag') || name.includes('标签')) && hasText && !hasFrame) {
    type = 'badge';
  }
  // Button: must look like an action control (explicit name OR accent/brand fill)
  else if (h && h >= 44 && h <= 56 && hasText && !hasFrame && (
    name.includes('button') || name.includes('btn') ||
    /登录|注册|提交|保存|确认|取消|下一步|完成|发布|发送|添加|新建|删除|编辑|搜索|查询|确定|同意/.test(f.name || '') ||
    fillStr === '$accent' || fillStr === '$accent-secondary' || fillStr === '$accent-tertiary' || fillStr === '#D4916E' || fillStr === '#C4CFDE'
  )) {
    type = 'button';
  }
  // Input: height 48-64, has text placeholder/value, no nested frames
  else if (h && h >= 48 && h <= 64 && hasText && !hasFrame && (name.includes('input') || name.includes('field') || name.includes('search') || name.includes('placeholder') || name.includes('code') || name.includes('phone'))) {
    type = 'input';
  }
  // Header heuristics
  else if (h && h <= 80 && (f.width === 'fill_container' || w === 393 || w === 361) && (name.includes('header') || name.includes('nav') || name.includes('top') || name.includes('title'))) {
    type = 'header';
  }
  // Card / List item / info row: white/light fill, with border or shadow or rounded, contains title/desc or frames, height 40-300
  else if ((fillStr === '$surface' || fillStr === '#FFFFFF' || fillStr === '$bg' || fillStr === '$surface-elevated' || fillStr === 'image' || fillStr === '') && (f.stroke || f.effect || resolveVar(cr) >= 8) && (hasText || hasFrame) && h && h > 40 && h < 300) {
    type = 'card';
  }

  classifications.push({ node: f, type });
}

const byType = {};
for (const c of classifications) {
  byType[c.type] = byType[c.type] || [];
  byType[c.type].push(c.node);
}

console.log('Classifications:');
for (const [t, arr] of Object.entries(byType).sort((a,b)=>b[1].length-a[1].length)) {
  console.log(`  ${t}: ${arr.length}`);
  for (const n of arr.slice(0, 10)) {
    console.log(`    ${n.id}:${n.name} h=${n.height} fill=${typeof n.fill==='string'?n.fill:''} parent=${n._parent?.name}`);
  }
  if (arr.length > 10) console.log(`    ... and ${arr.length-10} more`);
}

const updates = new Map();
function cmd(nodeId, props) {
  if (!updates.has(nodeId)) updates.set(nodeId, {});
  const acc = updates.get(nodeId);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined) continue;
    acc[k] = v;
  }
}
function buildCommands() {
  const out = [];
  for (const [nodeId, props] of updates) {
    const keys = Object.keys(props);
    if (keys.length === 0) continue;
    const pairs = keys.map(k => `${k}:${JSON.stringify(props[k])}`).join(', ');
    out.push(`Update("${nodeId}", {${pairs}})`);
  }
  return out;
}

function normalizeText(node, role) {
  if (!node || node.type !== 'text') return;
  const name = (node.name || '').toLowerCase();
  if (role === 'button') {
    cmd(node.id, { fill: '$text-inverse', fontFamily: '$font-body', fontSize: '$text-size-subhead', fontWeight: '600' });
  } else if (role === 'button-secondary') {
    cmd(node.id, { fill: '$text-primary', fontFamily: '$font-body', fontSize: '$text-size-subhead', fontWeight: '600' });
  } else if (role === 'input-placeholder') {
    cmd(node.id, { fill: '$text-muted', fontFamily: '$font-body', fontSize: '$text-size-body', fontWeight: 'normal' });
  } else if (role === 'card-title') {
    cmd(node.id, { fill: '$text-primary', fontFamily: '$font-heading', fontSize: '$text-size-subhead', fontWeight: '600' });
  } else if (role === 'card-subtitle') {
    cmd(node.id, { fill: '$text-secondary', fontFamily: '$font-body', fontSize: '$text-size-caption', fontWeight: 'normal' });
  } else if (role === 'header-title') {
    cmd(node.id, { fill: '$text-primary', fontFamily: '$font-heading', fontSize: '$text-size-title', fontWeight: '600' });
  } else if (role === 'caption') {
    cmd(node.id, { fill: '$text-muted', fontFamily: '$font-caption', fontSize: '$text-size-caption', fontWeight: 'normal' });
  } else {
    cmd(node.id, { fill: '$text-primary', fontFamily: '$font-body', fontSize: '$text-size-body', fontWeight: 'normal' });
  }
}

function normalizeIcon(node, color = '$text-muted') {
  if (!node || node.type !== 'path') return;
  cmd(node.id, { width: 24, height: 24, strokeWidth: 2, stroke: color, fill: '#00000000' });
}

// 1. Reusable components normalization
const btnPrimary = nodesById.get('eV6B7');
if (btnPrimary) {
  cmd('eV6B7', { height: 52, fill: '$accent', cornerRadius: '$rounded-lg', stroke: undefined, strokeWidth: 0, padding: [0, 16], gap: 8, justifyContent: 'center', alignItems: 'center', effect: { type: 'shadow', shadowType: 'outer', color: '$shadow-accent', offset: { x: 0, y: 4 }, blur: 16 } });
  const label = firstTextChild(btnPrimary);
  if (label) normalizeText(label, 'button');
}

const btnSecondary = nodesById.get('Df9ur');
if (btnSecondary) {
  cmd('Df9ur', { height: 52, fill: '#00000000', cornerRadius: '$rounded-lg', stroke: '$border', strokeWidth: 1, padding: [0, 16], gap: 8, justifyContent: 'center', alignItems: 'center' });
  const label = firstTextChild(btnSecondary);
  if (label) normalizeText(label, 'button-secondary');
}

const inputField = nodesById.get('p1Ykr');
if (inputField) {
  cmd('p1Ykr', { height: 56, fill: '$surface', cornerRadius: '$rounded-lg', stroke: '$border', strokeWidth: 1, padding: [0, 16], gap: 8, justifyContent: 'center', effect: { type: 'shadow', shadowType: 'outer', color: '$shadow-soft', offset: { x: 0, y: 2 }, blur: 8 } });
  const ph = firstTextChild(inputField);
  if (ph) normalizeText(ph, 'input-placeholder');
}

const listItem = nodesById.get('O5oXCN');
if (listItem) {
  cmd('O5oXCN', { height: 64, fill: '$surface', cornerRadius: '$rounded-xl', stroke: '$border', strokeWidth: 1, padding: [0, 16], gap: 8, justifyContent: 'space_between', alignItems: 'center', effect: { type: 'shadow', shadowType: 'outer', color: '$shadow-soft', offset: { x: 0, y: 2 }, blur: 8 } });
  const textFrame = childrenFrames(listItem).find(c => c.name === 'Text');
  if (textFrame) {
    cmd(textFrame.id, { layout: 'vertical', gap: 4, justifyContent: 'center' });
    const title = childrenTexts(textFrame).find(c => (c.name || '').toLowerCase() === 'title');
    const subtitle = childrenTexts(textFrame).find(c => (c.name || '').toLowerCase() === 'subtitle');
    if (title) normalizeText(title, 'card-title');
    if (subtitle) normalizeText(subtitle, 'card-subtitle');
  }
  const arrow = childrenPaths(listItem)[0];
  if (arrow) normalizeIcon(arrow, '$text-muted');
}

const tabBar = nodesById.get('kDswP');
if (tabBar) {
  cmd('kDswP', { width: 'fill_container(0)', height: 56, fill: '$surface-elevated', cornerRadius: '$rounded-xl', padding: [0, 12], justifyContent: 'space_around', alignItems: 'center', effect: { type: 'shadow', shadowType: 'outer', color: '$shadow-soft', offset: { x: 0, y: 2 }, blur: 12 } });
  for (const item of childrenFrames(tabBar)) {
    cmd(item.id, { layout: 'vertical', gap: 6, alignItems: 'center' });
    for (const text of childrenTexts(item)) normalizeText(text, 'caption');
    for (const path of childrenPaths(item)) normalizeIcon(path, '$text-muted');
  }
}

// 2. Process page-level instantiated components and other frames
for (const { node: f, type } of classifications) {
  if (REUSABLE.has(f.id)) continue;
  const h = typeof f.height === 'number' ? f.height : null;
  const textKids = childrenTexts(f);
  const frameKids = childrenFrames(f);
  const pathKids = childrenPaths(f);

  if (type === 'button') {
    const isSolid = f.fill && f.fill !== '#00000000' && f.fill !== 'transparent' && f.fill !== '$surface' && f.fill !== '#FFFFFF';
    cmd(f.id, {
      height: 52,
      cornerRadius: '$rounded-lg',
      padding: [0, 16],
      gap: 8,
      justifyContent: 'center',
      alignItems: 'center',
      fill: isSolid ? '$accent' : '#00000000',
      stroke: isSolid ? undefined : '$border',
      strokeWidth: isSolid ? 0 : 1
    });
    if (isSolid) cmd(f.id, { effect: { type: 'shadow', shadowType: 'outer', color: '$shadow-accent', offset: { x: 0, y: 4 }, blur: 16 } });
    for (const t of textKids) normalizeText(t, isSolid ? 'button' : 'button-secondary');
    for (const p of pathKids) normalizeIcon(p, isSolid ? '$text-inverse' : '$text-primary');
  }
  else if (type === 'input') {
    cmd(f.id, {
      height: 56,
      fill: '$surface',
      cornerRadius: '$rounded-lg',
      stroke: '$border',
      strokeWidth: 1,
      padding: [0, 16],
      gap: 8,
      justifyContent: 'center',
      effect: { type: 'shadow', shadowType: 'outer', color: '$shadow-soft', offset: { x: 0, y: 2 }, blur: 8 }
    });
    for (const t of textKids) {
      const n = (t.name || '').toLowerCase();
      const isPlaceholder = n === 'placeholder' || n.startsWith('placeholder');
      normalizeText(t, isPlaceholder ? 'input-placeholder' : 'body');
    }
    for (const p of pathKids) normalizeIcon(p, '$text-muted');
  }
  else if (type === 'card') {
    const newH = h ? to8(h) : f.height;
    cmd(f.id, {
      height: newH,
      fill: '$surface',
      cornerRadius: '$rounded-xl',
      stroke: '$border',
      strokeWidth: 1,
      padding: Array.isArray(f.padding) ? f.padding.map(v => to8(v)) : [16, 16],
      gap: f.gap ? to8(f.gap) : 8,
      effect: { type: 'shadow', shadowType: 'outer', color: '$shadow-soft', offset: { x: 0, y: 2 }, blur: 8 }
    });
    for (const t of textKids) {
      const n = (t.name || '').toLowerCase();
      if (n === 'title' || n.startsWith('title') || n === 'head' || n.startsWith('head')) normalizeText(t, 'card-title');
      else if (n === 'subtitle' || n.startsWith('sub') || n === 'desc' || n.startsWith('desc') || n === 'body' || n.startsWith('body')) normalizeText(t, 'card-subtitle');
      else normalizeText(t, 'body');
    }
    for (const childFrame of frameKids) {
      cmd(childFrame.id, { gap: childFrame.gap ? to8(childFrame.gap) : 4 });
    }
    for (const p of pathKids) normalizeIcon(p, '$text-muted');
  }
  else if (type === 'badge') {
    cmd(f.id, { height: 24, fill: '$accent', cornerRadius: '$rounded-full', padding: [0, 8], gap: 4, justifyContent: 'center', alignItems: 'center' });
    for (const t of textKids) {
      cmd(t.id, { fill: '$text-inverse', fontFamily: '$font-caption', fontSize: '$text-size-caption', fontWeight: '600' });
    }
  }
  else if (type === 'header') {
    cmd(f.id, { height: 56, fill: '$bg', padding: [0, 16], gap: 8, justifyContent: 'space_between', alignItems: 'center' });
    for (const t of textKids) {
      const n = (t.name || '').toLowerCase();
      if (n === 'title' || n.startsWith('title') || n === 'page' || n.startsWith('page')) normalizeText(t, 'header-title');
      else normalizeText(t, 'body');
    }
    for (const p of pathKids) normalizeIcon(p, '$text-primary');
  }
  else if (type === 'dialog') {
    cmd(f.id, { fill: '$surface', cornerRadius: '$rounded-xl', stroke: '$border', strokeWidth: 1, padding: [24, 24], gap: 16, effect: { type: 'shadow', shadowType: 'outer', color: '$shadow-card', offset: { x: 0, y: 8 }, blur: 24 } });
    for (const t of textKids) normalizeText(t, 'body');
    for (const child of frameKids) cmd(child.id, { gap: child.gap ? to8(child.gap) : 8 });
  }
  else if (type === 'tabbar') {
    cmd(f.id, { height: 56, fill: '$surface-elevated', cornerRadius: '$rounded-xl', padding: [0, 12], justifyContent: 'space_around', alignItems: 'center', effect: { type: 'shadow', shadowType: 'outer', color: '$shadow-soft', offset: { x: 0, y: 2 }, blur: 12 } });
    for (const item of childrenFrames(f)) {
      cmd(item.id, { layout: 'vertical', gap: 6, alignItems: 'center' });
      for (const t of childrenTexts(item)) normalizeText(t, 'caption');
      for (const p of childrenPaths(item)) normalizeIcon(p, '$text-muted');
    }
  }
}

// 3. Global icon normalization for paths that are not brand/social icons
for (const p of allPaths) {
  if (p._parent?.id === 'lPWz4') continue;
  const name = (p.name || '').toLowerCase();
  const isBrandIcon = name.includes('wechat') || name.includes('qq') || name.includes('weibo') || name.includes('alipay');
  if (isBrandIcon) continue;
  cmd(p.id, { width: 24, height: 24, strokeWidth: 2, fill: '#00000000' });
}

// 3b. Lucide icon nodes normalization
for (const ic of allIcons) {
  cmd(ic.id, { width: 24, height: 24, fill: ic.fill || '$text-muted' });
}

// 4. Ref descendants text/icon overrides (refs to reusable components in pages)
for (const r of allRefs) {
  if (!r.descendants) continue;
  const refId = r.ref;
  if (refId === 'eV6B7' || refId === 'Df9ur') {
    for (const [origId, override] of Object.entries(r.descendants)) {
      const node = nodesById.get(override.id || origId);
      if (node && node.type === 'text') normalizeText(node, refId === 'eV6B7' ? 'button' : 'button-secondary');
    }
  } else if (refId === 'p1Ykr') {
    for (const [origId, override] of Object.entries(r.descendants)) {
      const node = nodesById.get(override.id || origId);
      if (node && node.type === 'text') normalizeText(node, 'input-placeholder');
    }
  } else if (refId === 'O5oXCN') {
    for (const [origId, override] of Object.entries(r.descendants)) {
      const node = nodesById.get(override.id || origId);
      if (node && node.type === 'text') {
        const n = (node.name || '').toLowerCase();
        normalizeText(node, (n === 'title' || n.startsWith('title')) ? 'card-title' : 'card-subtitle');
      }
      if (node && node.type === 'path') normalizeIcon(node, '$text-muted');
    }
  }
}

let commands = buildCommands();
const processedNodes = [...new Set(commands.map(c => c.match(/Update\("([^"]+)"/)?.[1]).filter(Boolean))];
const lines = [
  '# Pencil batch_design commands for shadcn/ui standardization',
  '# Warm Linen theme: accent #D4916E, bg #F3EBE2, surface #FFFFFF, text-primary #1A1A1A, text-secondary #3D3D3D, text-muted #5A5A5A, border #E0D5CA',
  '# Fonts: heading Inter ($font-heading), body/caption Geist ($font-body, $font-caption)',
  '# Icons: Lucide linear, 24x24, 2px stroke (brand/social icons excluded)',
  '#',
  `# Processed node types: button(${byType.button?.length || 0}), input(${byType.input?.length || 0}), card(${byType.card?.length || 0}), badge(${byType.badge?.length || 0}), header(${byType.header?.length || 0}), tabbar(${byType.tabbar?.length || 0}), dialog(${byType.dialog?.length || 0})`,
  `# Total commands: ${commands.length}`,
  `# Total unique nodes touched: ${processedNodes.length}`,
  ''
];

let finalCommands = commands;
if (commands.length > 100) {
  const priorityIds = new Set(['eV6B7', 'Df9ur', 'p1Ykr', 'O5oXCN', 'kDswP']);
  // Also prioritize badges and their text children
  for (const f of (byType.badge || [])) {
    priorityIds.add(f.id);
    for (const t of childrenTexts(f)) priorityIds.add(t.id);
  }
  // Prioritize icons / paths that are inside cards / lists / headers
  const pathInsideComponent = allPaths.filter(p => {
    const pname = (p._parent?.name || '').toLowerCase();
    return pname.includes('card') || pname.includes('item') || pname.includes('header') || pname.includes('badge') || pname.includes('tag');
  });
  for (const p of pathInsideComponent) priorityIds.add(p.id);
  const prioritized = commands.filter(c => priorityIds.has(c.match(/Update\("([^"]+)"/)?.[1]));
  const others = commands.filter(c => !priorityIds.has(c.match(/Update\("([^"]+)"/)?.[1]));
  finalCommands = [...prioritized, ...others].slice(0, 100);
  lines.push('# NOTE: Output truncated to 100 commands. Prioritized reusable components, badges, and key elements.');
  lines.push('');
}

fs.writeFileSync(OUT, lines.join('\n') + finalCommands.join('\n') + '\n', 'utf-8');
console.log(`\nWrote ${finalCommands.length} commands to ${OUT}`);
