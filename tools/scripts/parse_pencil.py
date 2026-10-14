import json
import re

with open(r'C:\Users\13929\AppData\Local\Temp\trae\toolcall-output\708394b0-9597-462d-865c-66940d1b1f39.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Extract the JSON array after the MCP response prefix
match = re.search(r'\[\{.*\}\]', text, re.DOTALL)
if not match:
    print("No JSON found")
    exit(1)

data = json.loads(match.group(0))

def find_node(node, name=None, node_id=None):
    """Recursively find node by name or id."""
    if isinstance(node, dict):
        if name and node.get('name') == name:
            return node
        if node_id and node.get('id') == node_id:
            return node
        for key in ['children', 'descendants']:
            val = node.get(key)
            if val:
                if isinstance(val, dict):
                    for k, v in val.items():
                        result = find_node(v, name, node_id)
                        if result:
                            return result
                elif isinstance(val, list):
                    for child in val:
                        result = find_node(child, name, node_id)
                        if result:
                            return result
    elif isinstance(node, list):
        for item in node:
            result = find_node(item, name, node_id)
            if result:
                return result
    return None

def print_node(node, indent=0, max_depth=3):
    if not node or not isinstance(node, dict):
        return
    prefix = "  " * indent
    name = node.get('name', 'Unnamed')
    ntype = node.get('type', '')
    fill = node.get('fill')
    content = node.get('content', '')
    font = {k: node.get(k) for k in ['fontFamily', 'fontSize', 'fontWeight', 'fill'] if node.get(k)}
    size = {k: node.get(k) for k in ['width', 'height', 'padding', 'gap', 'cornerRadius'] if node.get(k)}
    
    info = f"{prefix}{name} ({ntype})"
    if font:
        info += f" font={font}"
    if size:
        info += f" size={size}"
    if content:
        info += f" text='{content}'"
    if fill and isinstance(fill, str):
        info += f" fill={fill}"
    print(info)
    
    if indent < max_depth:
        for key in ['children', 'descendants']:
            val = node.get(key)
            if val:
                if isinstance(val, dict):
                    for k, v in val.items():
                        print_node(v, indent + 1, max_depth)
                elif isinstance(val, list):
                    for child in val:
                        print_node(child, indent + 1, max_depth)

# Find each page and print key info
pages = ['个人中心', '任务看板', '作业列表页', '发布作业页', '活动列表页', '发布活动页', '班费账本页', '缴费登记页', '班费记账页', '投票列表页', '随机抽签页']

for page in pages:
    p = find_node(data, name=page)
    if p:
        print(f"\n=== {page} ===")
        print_node(p, max_depth=3)
    else:
        print(f"\n=== {page} NOT FOUND ===")
