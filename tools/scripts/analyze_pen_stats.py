import json, os
from collections import Counter, defaultdict

p = 'D:/校园班级事务智能管理助手/校园班级事务智能管理助手.pen'
with open(p, 'r', encoding='utf-8') as f:
    doc = json.load(f)

roots = doc.get('children', [])

def walk(node, parents=()):
    yield node, parents
    for child in node.get('children', []) or []:
        yield from walk(child, parents+(node,))

pages = []
components = []
icon_nodes = []
icon_text_nodes = []
arrow_text_nodes = []
icon_frame_nodes = []
var_styles = []
hardcoded_styles = []

for root in roots:
    if root.get('reusable'):
        components.append(root)
    elif root.get('type')=='frame':
        pages.append(root)
    for node, parents in walk(root):
        name = node.get('name','')
        nt = node.get('type','')
        if nt == 'icon_font' or nt == 'icon' or node.get('library')=='lucide':
            icon_nodes.append(node)
        if nt=='text' and name=='Icon':
            icon_text_nodes.append(node)
        if nt=='text' and name=='Arrow':
            arrow_text_nodes.append(node)
        if nt=='frame' and name=='Icon':
            icon_frame_nodes.append(node)
        for k in ['fill','stroke','fontFamily','cornerRadius']:
            v = node.get(k)
            if v is None or v == '':
                continue
            if isinstance(v,str) and v.startswith('$'):
                var_styles.append((node.get('id'), k, v))
            else:
                # consider transparent/empty/object image fills as hardcoded for reporting
                hardcoded_styles.append((node.get('id'), k, v))

print('Top-level pages:', len(pages))
print('Top-level components:', len(components))
print('Icon nodes total:', len(icon_nodes))
print('Icon text placeholders remaining:', len(icon_text_nodes))
print('Arrow text placeholders remaining:', len(arrow_text_nodes))
print('Icon frame placeholders remaining:', len(icon_frame_nodes))
print('Style properties using variables:', len(var_styles))
print('Style properties hardcoded:', len(hardcoded_styles))
print('Hardcoded by prop:', Counter(x[1] for x in hardcoded_styles))
print('Variable by prop:', Counter(x[1] for x in var_styles))
print('Icon samples:', [(n.get('id'), n.get('name'), n.get('type'), n.get('library'), n.get('icon')) for n in icon_nodes[:15]])
print('Remaining Icon texts:', [(n.get('id'), [p.get('name') for p in parents]) for n in icon_text_nodes])
print('Remaining Arrow texts:', [(n.get('id'), [p.get('name') for p in parents]) for n in arrow_text_nodes])
print('Hardcoded sample:', hardcoded_styles[:20])
