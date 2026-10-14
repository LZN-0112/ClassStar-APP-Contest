import json
from collections import deque

with open('D:/校园班级事务智能管理助手/校园班级事务智能管理助手.pen', 'r', encoding='utf-8') as f:
    doc = json.load(f)

mapping = {4: '$rounded-sm', 12: '$rounded-lg', 16: '$rounded-xl'}
exclude_ids = {'DI0Qb', 'q7i1o6', 'vEtc9'}  # replaced icon placeholders

results = []
queue = deque([(child, []) for child in doc.get('children', [])])

while queue:
    node, parents = queue.popleft()
    if not isinstance(node, dict):
        continue
    nid = node.get('id')
    name = node.get('name', '')
    cr = node.get('cornerRadius')
    
    # Skip Icon placeholders that were replaced with lucide icons
    if name == 'Icon' and nid not in exclude_ids:
        continue
    
    if isinstance(cr, (int, float)) and not isinstance(cr, bool) and cr in mapping and nid not in exclude_ids:
        results.append({
            'id': nid,
            'name': name,
            'radius': cr,
            'context': ' / '.join([p.get('name', '') for p in parents if p.get('name')]) or 'root'
        })
    
    for child in node.get('children', []):
        if isinstance(child, dict):
            queue.append((child, parents + [node]))
    
    for did, desc in node.get('descendants', {}).items():
        if isinstance(desc, dict):
            queue.append((desc, parents + [node]))

by_radius = {4: [], 12: [], 16: []}
for r in results:
    by_radius[r['radius']].append(r)

print(f"Total updates: {len(results)}")
print(f"  radius 4 -> $rounded-sm: {len(by_radius[4])}")
print(f"  radius 12 -> $rounded-lg: {len(by_radius[12])}")
print(f"  radius 16 -> $rounded-xl: {len(by_radius[16])}")

chunk_size = 50
all_updates = []
for radius in [4, 12, 16]:
    var = mapping[radius]
    for r in by_radius[radius]:
        all_updates.append(f'Update("{r["id"]}",{{cornerRadius:"{var}"}});')

for i in range(0, len(all_updates), chunk_size):
    chunk = all_updates[i:i+chunk_size]
    with open(f'D:/校园班级事务智能管理助手/radius_update_chunk_{i//chunk_size}.js', 'w', encoding='utf-8') as f:
        f.write('\n'.join(chunk))

print(f"Generated {len(all_updates)} updates in {(len(all_updates)-1)//chunk_size + 1} chunks")
