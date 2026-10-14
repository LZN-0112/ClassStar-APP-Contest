import json

PEN = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"

with open(PEN, "r", encoding="utf-8") as f:
    doc = json.load(f)

HOME_PAGE_ID = "RfR8C"
STUDENT_HOME_NAME = "学生首页"

# Identify "学生首页" by id or name
skip_ids = {HOME_PAGE_ID}

# Border style to apply: transparent stroke + subtle shadow
BORDER_STROKE = "#00000000"
STROKE_WIDTH = 1
SHADOW_EFFECT = {
    "type": "shadow",
    "shadowType": "outer",
    "color": "$shadow-soft",
    "offset": {"x": 0, "y": 2},
    "blur": 8
}

AVATAR_SHADOW = {
    "type": "shadow",
    "shadowType": "outer",
    "color": "$shadow-soft",
    "offset": {"x": 0, "y": 2},
    "blur": 6
}

def has_border(node):
    """Returns True if the node already has a non-transparent stroke."""
    stroke = node.get("stroke")
    if not stroke:
        return False
    if isinstance(stroke, str):
        return stroke.lower() not in ("#00000000", "transparent", "none")
    return False

def already_transparent_border(node):
    stroke = node.get("stroke")
    return isinstance(stroke, str) and stroke.lower() == "#00000000"

def apply_border(node, is_icon_container=False):
    """Apply transparent stroke + soft shadow to a card-like frame."""
    if node.get("type") not in ("frame", "rectangle"):
        return False
    # Don't re-apply if already has transparent border style
    if already_transparent_border(node) and node.get("effect"):
        return False
    # Don't override colored/accent borders
    if has_border(node):
        return False
    node["stroke"] = BORDER_STROKE
    node["strokeWidth"] = STROKE_WIDTH
    if is_icon_container:
        node["effect"] = AVATAR_SHADOW
    else:
        node["effect"] = SHADOW_EFFECT
    return True

def is_card_container(node):
    """Heuristics: a card-like frame has fill ($surface or #FFFFFF) and cornerRadius."""
    if node.get("type") != "frame":
        return False
    fill = node.get("fill")
    if fill not in ("$surface", "#FFFFFF"):
        return False
    if not node.get("cornerRadius"):
        return False
    # Skip buttons that use solid colors (non-white/surface fill is already filtered)
    # Exclude tiny icons without corner radius
    width = node.get("width")
    height = node.get("height")
    if isinstance(width, (int, float)) and width < 32:
        return False
    if isinstance(height, (int, float)) and height < 32:
        return False
    return True

def is_icon_container(node):
    """Small colored rounded square inside function buttons."""
    if node.get("type") != "frame":
        return False
    fill = node.get("fill")
    if not fill or fill in ("$surface", "#FFFFFF", "#00000000", "transparent"):
        return False
    w = node.get("width")
    h = node.get("height")
    if not (isinstance(w, (int, float)) and isinstance(h, (int, float))):
        return False
    if 32 <= w <= 56 and 32 <= h <= 56:
        return True
    return False

def process_page(page):
    if page.get("id") in skip_ids or page.get("name") == STUDENT_HOME_NAME:
        return 0

    count = 0
    def walk(node, depth=0):
        nonlocal count
        if not isinstance(node, dict):
            return
        if is_card_container(node):
            if apply_border(node):
                count += 1
        # Also add shadow to colored icon containers inside function areas
        if is_icon_container(node):
            if apply_border(node, is_icon_container=True):
                count += 1
        for child in node.get("children", []):
            walk(child, depth + 1)
        for desc in node.get("descendants", {}).values():
            walk(desc, depth + 1)

    walk(page)
    return count

results = []
for child in doc.get("children", []):
    if isinstance(child, dict) and not child.get("reusable"):
        c = process_page(child)
        if c:
            results.append((child.get("name"), child.get("id"), c))

with open(PEN, "w", encoding="utf-8") as f:
    json.dump(doc, f, ensure_ascii=False, indent=2)

print("Applied transparent borders + soft shadows:")
for name, pid, c in results:
    print(f"  - {name} ({pid}): {c} nodes")
print(f"\nTotal pages affected: {len(results)}")
