import json

pen_path = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
with open(pen_path, "r", encoding="utf-8") as f:
    doc = json.load(f)

pages = {n["id"]: n.get("name", "") for n in doc["children"] if n.get("type") == "frame"}

results = []

def walk(node, parent_stack, page_id=None):
    if isinstance(node, dict) and node.get("type") == "frame" and node.get("id") in pages:
        page_id = node["id"]

    if not isinstance(node, dict):
        return

    node_type = node.get("type")
    name = node.get("name", "")
    node_id = node.get("id")

    label_text = ""
    icon_id = None
    is_button = False

    if node_type == "ref" and node.get("ref") in ("eV6B7", "Df9ur"):
        is_button = True
        desc = node.get("descendants", {})
        for key in ("OrH2l", "V9zs5Q"):
            if key in desc and isinstance(desc[key], dict):
                label_text = desc[key].get("content", "")
                break
    elif node_type == "frame" and node.get("children"):
        texts = []
        icon_ids = []
        for c in node.get("children", []):
            if c.get("type") == "text":
                texts.append(c.get("content", ""))
            elif c.get("type") in ("path", "icon", "rectangle", "ellipse"):
                icon_ids.append(c.get("id"))
        if texts:
            label_text = "".join(texts)
        if icon_ids:
            icon_id = icon_ids[0]
        h = node.get("height")
        if texts and ("Button" in name or "按钮" in name or (isinstance(h, (int, float)) and 40 <= h <= 64)):
            is_button = True

    if is_button:
        results.append({
            "page_id": page_id,
            "page_name": pages.get(page_id, ""),
            "button_id": node_id,
            "button_name": name,
            "label": label_text,
            "icon_id": icon_id,
            "ref": node.get("ref") if node_type == "ref" else None,
            "path": "/".join([p.get("name","") for p in parent_stack] + [name])
        })

    # Recurse into children and descendants
    for child in node.get("children", []):
        walk(child, parent_stack + [node], page_id)
    for key, desc_node in node.get("descendants", {}).items():
        if isinstance(desc_node, dict):
            walk(desc_node, parent_stack + [node], page_id)

walk({"children": doc["children"]}, [])

out_path = r"D:\校园班级事务智能管理助手\all_buttons.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"Found {len(results)} buttons")
for r in results:
    print(f"  {r['page_name']}: [{r['ref']}] '{r['label']}' (button {r['button_id']}, icon {r['icon_id']})")
