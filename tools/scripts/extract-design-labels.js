const fs = require('fs')
const path = require('path')

const penPath = process.argv[2] || path.join(__dirname, '..', '校园班级事务智能管理助手.pen')
const outPath = process.argv[3] || path.join(__dirname, 'design-labels.json')

const d = JSON.parse(fs.readFileSync(penPath, 'utf8'))

const comps = new Map()

function walk(nodes, cb) {
  for (const n of nodes || []) {
    cb(n)
    walk(n.children, cb)
  }
}

// collect reusable components at top level
walk(d.children, (n) => {
  if (n.type === 'frame' && n.reusable) {
    comps.set(n.id, n)
  }
})

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function replaceNodeById(tree, id, replacement) {
  if (!tree) return false
  if (tree.id === id) {
    // cannot replace root directly in place with this function
    return false
  }
  const children = tree.children
  if (!children) return false
  for (let i = 0; i < children.length; i++) {
    if (children[i].id === id) {
      children[i] = replacement
      return true
    }
    if (replaceNodeById(children[i], id, replacement)) return true
  }
  return false
}

function resolveNode(node) {
  if (!node) return node
  if (node.type === 'ref') {
    const comp = comps.get(node.ref)
    if (!comp) {
      // unknown ref, keep as is but resolve children if any
      const clone = deepClone(node)
      clone.children = (clone.children || []).map(resolveNode)
      return clone
    }
    const clone = deepClone(comp)
    // apply override properties
    const overrideProps = deepClone(node)
    delete overrideProps.type
    delete overrideProps.id
    delete overrideProps.ref
    delete overrideProps.descendants
    Object.assign(clone, overrideProps)
    // apply descendants overrides
    const descendants = node.descendants || {}
    for (const targetId of Object.keys(descendants)) {
      const replacement = resolveNode(descendants[targetId])
      replaceNodeById(clone, targetId, replacement)
    }
    // resolve any remaining refs/children recursively
    clone.children = (clone.children || []).map(resolveNode)
    return clone
  }
  const clone = deepClone(node)
  clone.children = (clone.children || []).map(resolveNode)
  return clone
}

function collectTexts(node) {
  const texts = []
  walk([node], (n) => {
    if (n.type === 'text' && typeof n.content === 'string' && n.content.trim()) {
      texts.push(n.content.trim())
    }
  })
  return texts
}

function collectIcons(node) {
  const icons = []
  walk([node], (n) => {
    if (n.type === 'icon' && n.icon) icons.push(n.icon)
  })
  return icons
}

const screens = []

for (const n of d.children || []) {
  if (n.type === 'frame' && typeof n.width === 'number' && n.width >= 300 && typeof n.height === 'number' && n.height >= 700 && !n.reusable) {
    const resolved = resolveNode(n)
    screens.push({
      id: n.id,
      name: n.name,
      width: n.width,
      height: n.height,
      texts: collectTexts(resolved).slice(0, 120),
      icons: collectIcons(resolved).slice(0, 40),
    })
  }
}

screens.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
fs.writeFileSync(outPath, JSON.stringify(screens, null, 2), 'utf8')
console.log('extracted', screens.length, 'screens to', outPath)
