import json

PEN = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"

with open(PEN, "r", encoding="utf-8") as f:
    doc = json.load(f)

def find_node(root, node_id, parent=None):
    if isinstance(root, dict):
        if root.get("id") == node_id:
            return root, parent
        for child in root.get("children", []):
            res, p = find_node(child, node_id, root)
            if res:
                return res, p
        for desc in root.get("descendants", {}).values():
            res, p = find_node(desc, node_id, root)
            if res:
                return res, p
    return None, None

def collect_tab_bars(root, path=""):
    results = []
    if isinstance(root, dict):
        if root.get("type") == "ref" and root.get("ref") == "kDswP":
            results.append((path, root.get("id"), root.get("name")))
        for i, child in enumerate(root.get("children", [])):
            results.extend(collect_tab_bars(child, f"{path}/children[{i}]"))
        for k, desc in root.get("descendants", {}).items():
            results.extend(collect_tab_bars(desc, f"{path}/descendants[{k}]"))
    return results

# List top-level pages
pages = []
for i, node in enumerate(doc.get("nodes", [])):
    if isinstance(node, dict):
        pages.append((i, node.get("id"), node.get("name"), node.get("type")))

print("Top-level nodes:")
for idx, nid, name, ntype in pages:
    print(f"  [{idx}] {ntype} {nid} {name}")

print("\nTab Bar refs:")
for path, tid, name in collect_tab_bars(doc):
    print(f"  {tid} at {path}")

# For each tab bar, find its page root
def find_page_root(root, node_id):
    if isinstance(root, dict):
        if root.get("id") == node_id:
            return root
        for child in root.get("children", []):
            res = find_page_root(child, node_id)
            if res:
                return None  # not top-level
        for child in root.get("children", []):
            if find_node(child, node_id)[0]:
                return root
    return None

print("\nTab Bar parents:")
for path, tid, name in collect_tab_bars(doc):
    node, parent = find_node(doc, tid)
    page = None
    if parent:
        # find top-level ancestor
        for p in doc.get("nodes", []):
            if find_node(p, tid)[0]:
                page = p
                break
    print(f"  {tid}: parent={parent.get('id') if parent else None}, page={page.get('name') if page else None} ({page.get('id') if page else None})")
