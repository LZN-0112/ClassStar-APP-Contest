import json, os, random, string

PEN = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"

def new_id():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=6))

def find_node(root, node_id):
    """Recursively find node dict by id in root, children, or ref descendants."""
    if isinstance(root, dict):
        if root.get("id") == node_id:
            return root
        for child in root.get("children", []):
            res = find_node(child, node_id)
            if res:
                return res
        for desc in root.get("descendants", {}).values():
            res = find_node(desc, node_id)
            if res:
                return res
    return None

def find_parent(root, node_id):
    """Find parent dict whose children/descendants contains node_id."""
    if isinstance(root, dict):
        for child in root.get("children", []):
            if isinstance(child, dict) and child.get("id") == node_id:
                return root
            res = find_parent(child, node_id)
            if res:
                return res
        for desc in root.get("descendants", {}).values():
            if isinstance(desc, dict) and desc.get("id") == node_id:
                return root
            res = find_parent(desc, node_id)
            if res:
                return res
    return None

with open(PEN, "r", encoding="utf-8") as f:
    doc = json.load(f)

# Remove old test curve arc
page = find_node(doc, "RfR8C")
if page:
    page["children"] = [c for c in page.get("children", []) if not (isinstance(c, dict) and c.get("id") == "CNsCi")]

# Header background straight bottom (no arc)
header_bg = find_node(doc, "Ik1G2")
if header_bg:
    header_bg["geometry"] = "M0 0l393 0 0 220l-393 0z"

# Delete the old top row that contains "首页" inside header content
header_content = find_node(doc, "Vtga1")
if header_content:
    header_content["children"] = [c for c in header_content.get("children", []) if not (isinstance(c, dict) and c.get("id") == "iBkSI")]

# Update greeting and subtitle
name_text = find_node(doc, "S3pwb9")
if name_text:
    name_text["content"] = "早上好，张三"
    name_text["fontSize"] = 24
    name_text["fontWeight"] = "700"
    name_text["fontFamily"] = "$font-heading"

meta_text = find_node(doc, "w8qnMu")
if meta_text:
    meta_text["content"] = "计算机科学与技术 2021级1班 · 学习委员"
    meta_text["fontSize"] = 13
    meta_text["opacity"] = 0.9
    meta_text["fontFamily"] = "$font-body"

# Reorder user row: text on the left, avatar on the right
user_row = find_node(doc, "pw6WS")
if user_row:
    user_row["alignItems"] = "start"
    user_row["justifyContent"] = "space_between"
    user_row["layout"] = "horizontal"
    avatar = find_node(doc, "jNZ2M")
    user_info = find_node(doc, "HcBej")
    new_children = []
    if user_info:
        new_children.append(user_info)
    if avatar:
        new_children.append(avatar)
    user_row["children"] = new_children

# Insert user icon into avatar frame
avatar = find_node(doc, "jNZ2M")
if avatar:
    avatar["children"] = [{
        "type": "path",
        "id": new_id(),
        "name": "User Icon",
        "width": 24,
        "height": 24,
        "x": 12,
        "y": 12,
        "layoutPosition": "absolute",
        "geometry": "M8 7a4 4 0 1 0 8 0a4 4 0 0 0-8 0M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2",
        "viewBox": [0, 0, 24, 24],
        "fill": "#00000000",
        "stroke": "#FFFFFF",
        "strokeWidth": 2,
        "strokeLinecap": "round",
        "strokeLinejoin": "round"
    }]

# Content container
content = find_node(doc, "OvqAk")

# Replace Todo Card content
todo = find_node(doc, "O5uv4F")
if todo:
    todo["name"] = "Todo Card"
    todo["width"] = "fill_container"
    todo["height"] = 180
    todo["cornerRadius"] = 12
    todo["fill"] = {
        "type": "gradient",
        "gradientType": "linear",
        "rotation": 135,
        "colors": [
            {"color": "#0057E0", "position": 0},
            {"color": "#0062FF", "position": 1}
        ]
    }
    todo["layout"] = "vertical"
    todo["padding"] = [20, 20]
    todo["gap"] = 16
    todo["stroke"] = "#00000000"
    todo["children"] = [
        {
            "type": "frame",
            "id": new_id(),
            "name": "Top Row",
            "width": "fill_container",
            "height": "fit_content",
            "layout": "horizontal",
            "justifyContent": "space_between",
            "alignItems": "center",
            "fill": "#00000000",
            "children": [
                {
                    "type": "frame",
                    "id": new_id(),
                    "name": "Left Text",
                    "width": "fit_content",
                    "height": "fit_content",
                    "layout": "vertical",
                    "gap": 4,
                    "fill": "#00000000",
                    "children": [
                        {"type": "text", "id": new_id(), "name": "Title", "content": "今日待办", "fill": "#FFFFFF", "fontFamily": "$font-heading", "fontSize": 20, "fontWeight": "700"},
                        {"type": "text", "id": new_id(), "name": "Subtitle", "content": "3 个待办事项等待处理", "fill": "#FFFFFF", "fontFamily": "$font-body", "fontSize": 12, "opacity": 0.8}
                    ]
                },
                {
                    "type": "frame",
                    "id": new_id(),
                    "name": "Progress Box",
                    "width": "fit_content",
                    "height": "fit_content",
                    "layout": "vertical",
                    "gap": 6,
                    "fill": "#00000000",
                    "alignItems": "end",
                    "children": [
                        {"type": "text", "id": new_id(), "name": "Progress Label", "content": "完成进度", "fill": "#FFFFFF", "fontFamily": "$font-caption", "fontSize": 11},
                        {
                            "type": "frame",
                            "id": new_id(),
                            "name": "Track",
                            "width": 100,
                            "height": 6,
                            "cornerRadius": 3,
                            "fill": "#FFFFFF33",
                            "layout": "horizontal",
                            "children": [
                                {"type": "frame", "id": new_id(), "name": "Fill", "width": 65, "height": "fill_container", "cornerRadius": 3, "fill": "#FFFFFF"}
                            ]
                        }
                    ]
                }
            ]
        },
        {
            "type": "frame",
            "id": new_id(),
            "name": "Bottom Row",
            "width": "fill_container",
            "height": "fit_content",
            "layout": "horizontal",
            "justifyContent": "space_between",
            "alignItems": "center",
            "fill": "#00000000",
            "children": [
                {
                    "type": "frame",
                    "id": new_id(),
                    "name": "View Button",
                    "width": "fit_content",
                    "height": "fit_content",
                    "layout": "horizontal",
                    "gap": 4,
                    "padding": [8, 12],
                    "cornerRadius": 9999,
                    "fill": "#FFFFFF",
                    "alignItems": "center",
                    "children": [
                        {"type": "text", "id": new_id(), "name": "Button Text", "content": "查看待办事件", "fill": "#0062FF", "fontFamily": "$font-body", "fontSize": 13, "fontWeight": "600"},
                        {"type": "path", "id": new_id(), "name": "Chevron", "width": 16, "height": 16, "geometry": "m9 6l6 6l-6 6", "viewBox": [0, 0, 24, 24], "fill": "#00000000", "stroke": "#0062FF", "strokeWidth": 2, "strokeLinecap": "round", "strokeLinejoin": "round"}
                    ]
                },
                {"type": "frame", "id": new_id(), "name": "Spacer", "width": 1, "height": 1, "fill": "#00000000"}
            ]
        }
    ]

# Function area card
quick_grid = find_node(doc, "jaqmP")
if quick_grid:
    quick_grid["fill"] = "#FFFFFF"
    quick_grid["cornerRadius"] = 12
    quick_grid["padding"] = [16, 16]
    quick_grid["gap"] = 16
    quick_grid["stroke"] = "#00000000"
    quick_grid["effect"] = {"type": "shadow", "shadowType": "outer", "offset": {"x": 0, "y": 2}, "blur": 8, "color": "#0000000D"}

row1 = find_node(doc, "lAVKd")
if row1:
    row1["gap"] = 16
row2 = find_node(doc, "FYJ6d")
if row2:
    row2["gap"] = 16

# Feed wrapper
feed_header = find_node(doc, "TyTvY")
feed_list = find_node(doc, "yf1TN")
if content and feed_header and feed_list:
    feed_wrapper_id = new_id()
    feed_wrapper = {
        "type": "frame",
        "id": feed_wrapper_id,
        "name": "Feed Card",
        "width": "fill_container",
        "height": "fit_content",
        "fill": "#FFFFFF",
        "cornerRadius": 12,
        "padding": [16, 16],
        "gap": 12,
        "layout": "vertical",
        "effect": {"type": "shadow", "shadowType": "outer", "offset": {"x": 0, "y": 2}, "blur": 8, "color": "#0000000D"},
        "children": [feed_header, feed_list]
    }
    # Remove old top-level feed nodes from content and insert wrapper before tab bar
    children = content.get("children", [])
    # Build new list preserving order
    new_children = []
    for child in children:
        cid = child.get("id") if isinstance(child, dict) else None
        if cid in ("TyTvY", "yf1TN"):
            continue
        new_children.append(child)
    # Insert wrapper before Tab Bar (pmhpB) if present
    tab_index = next((i for i, c in enumerate(new_children) if isinstance(c, dict) and c.get("id") == "pmhpB"), len(new_children))
    new_children.insert(tab_index, feed_wrapper)
    content["children"] = new_children

    # Remove feed list own card style
    feed_list["fill"] = "#00000000"
    feed_list["stroke"] = "#00000000"
    feed_list["effect"] = {"type": "shadow", "enabled": False}
    feed_list["padding"] = 0

with open(PEN, "w", encoding="utf-8") as f:
    json.dump(doc, f, ensure_ascii=False, indent=2)

print("redesign saved to", PEN)
