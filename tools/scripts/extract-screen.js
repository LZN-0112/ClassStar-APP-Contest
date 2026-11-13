const fs = require('fs')
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const targetIds = process.argv.slice(3)

const nodeMap = new Map()
function indexNodes(nodes) {
  for (const n of nodes || []) {
    nodeMap.set(n.id, n)
    indexNodes(n.children)
  }
}
indexNodes(data.children)

function resolve(n) {
  if (n && n.type === 'ref' && n.ref) {
    const ref = nodeMap.get(n.ref)
    if (ref) {
      return { ...ref, ...n, children: ref.children }
    }
  }
  return n
}

function findNode(nodes, id) {
  for (const n of nodes || []) {
    if (n.id === id) return n
    const c = findNode(n.children, id)
    if (c) return c
  }
  return null
}

function getDescendants(node) {
  if (node.descendants) return node.descendants
  for (const c of node.children || []) {
    const d = getDescendants(c)
    if (d) return d
  }
  return null
}

function printTree(n, depth = 0) {
  n = resolve(n)
  const indent = '  '.repeat(depth)
  let text = ''
  if (n.type === 'text') text = ' = "' + (n.content || '') + '"'
  console.log(indent + (n.name || '(unnamed)') + ' [' + n.type + ']' + text)
  if (n.children) {
    for (const c of n.children) printTree(c, depth + 1)
  }
}

for (const id of targetIds) {
  const node = findNode(data.children, id)
  if (node) {
    console.log('\n========== ' + node.name + ' [' + id + '] ==========')
    const descendants = getDescendants(node) || {}
    const contentId = Object.keys(descendants).find(k => descendants[k].name === 'Content')
    if (contentId) {
      console.log('--- Content ---')
      printTree(descendants[contentId], 0)
    } else {
      printTree(node, 0)
    }
  }
}
