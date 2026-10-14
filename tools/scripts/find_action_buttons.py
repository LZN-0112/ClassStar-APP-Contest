import json

pen_path = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
with open(pen_path, "r", encoding="utf-8") as f:
    doc = json.load(f)

pages = {n["id"]: n.get("name", "") for n in doc["children"] if n.get("type") == "frame"}

keywords = {
    "loading": ["加载", "请稍候", "处理中"],
    "submit": ["提交", "发送", "保存", "确认", "发布", "上传", "完成", "确定", "下一步", "继续"],
    "refresh": ["刷新", "同步", "更新", "重新加载"],
    "login": ["登录", "注册"]
}

def categorize(text):
    for cat, kws in keywords.items():
        if any(k in text for k in kws):
            return cat
    return None

results = []

def walk(node, parent_stack, page_id=None):
    if node.get("type") == "frame" and node.get("id") in pages:
        page_id = node["id"]

    node_type = node.get("type")
    name = node.get("name", "")
    node_id = node.get("id")

    label_text = ""
    icon_id = None
    is_button = False

    if node_type == "ref" and node.get("ref") in ("eV6B7", "Df9ur"):
        is_button = True
        desc = node.get("descendants", {})
        # Primary button label child id is OrH2l, secondary is V9zs5Q
        for key in ("OrH2l", "V9zs5Q"):
            if key in desc and isinstance(desc[key], dict):
                label_text = desc[key].get("content", "")
                break
    elif node_type == "frame":
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
        # Consider it a button if name suggests or has icon + text and dimensions like button
        if texts and ("Button" in name or "按钮" in name or node.get("height") in (44, 48, 52, 56)):
            is_button = True

    cat = categorize(label_text)
    if is_button and cat:
        results.append({
            "page_id": page_id,
            "page_name": pages.get(page_id, ""),
            "button_id": node_id,
            "button_name": name,
            "label": label_text,
            "icon_id": icon_id,
            "category": cat,
            "ref": node.get("ref") if node_type == "ref" else None,
            "path": "/".join([p.get("name","") for p in parent_stack] + [name])
        })

    for child in node.get("children", []):
        walk(child, parent_stack + [node], page_id)

walk({"children": doc["children"]}, [])

# Sort by category
results.sort(key=lambda x: (x["category"], x["page_name"]))

out_path = r"D:\校园班级事务智能管理助手\action_buttons.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"Found {len(results)} action buttons")
for r in results:
    print(f"  [{r['category']}] {r['page_name']}: {r['label']} (button {r['button_id']}, icon {r['icon_id']})")
