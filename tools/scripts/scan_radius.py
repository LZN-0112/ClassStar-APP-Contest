import json
from collections import deque

with open('D:/校园班级事务智能管理助手/校园班级事务智能管理助手.pen', 'r', encoding='utf-8') as f:
    doc = json.load(f)

results = []
queue = deque([(child, []) for child in doc.get('children', [])])

while queue:
    node, parents = queue.popleft()
    if not isinstance(node, dict):
        continue
    nid = node.get('id')
    name = node.get('name', '')
    ctype = node.get('type', '')
    cr = node.get('cornerRadius')
    fill = node.get('fill')
    stroke = node.get('stroke')
    font_family = node.get('fontFamily')
    
    context = ' / '.join([p.get('name', '') for p in parents if p.get('name')]) or 'root'
    
    if isinstance(cr, (int, float)) and not isinstance(cr, bool):
        results.append({
            'id': nid,
            'name': name,
            'type': ctype,
            'cornerRadius': cr,
            'fill': fill,
            'stroke': stroke,
            'fontFamily': font_family,
            'context': context
        })
    
    for child in node.get('children', []):
        if isinstance(child, dict):
            queue.append((child, parents + [node]))
    
    for did, desc in node.get('descendants', {}).items():
        if isinstance(desc, dict):
            queue.append((desc, parents + [node]))

results.sort(key=lambda x: (x['cornerRadius'], x['context'], x['name']))

with open('D:/校园班级事务智能管理助手/hardcoded_radius.txt', 'w', encoding='utf-8') as out:
    out.write(f"Found {len(results)} nodes with numeric cornerRadius\n")
    for r in results:
        out.write(f"{r['cornerRadius']:>5} | {r['id']:<10} | {r['name']:<28} | {r['type']:<10} | {r['context']}\n")

print(f"Found {len(results)} nodes with numeric cornerRadius")
print("Saved to hardcoded_radius.txt")
