import json

PEN = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"

with open(PEN, "r", encoding="utf-8") as f:
    doc = json.load(f)

def find_tab_bar_ref(root, parent=None):
    if isinstance(root, dict):
        if root.get("type") == "ref" and root.get("ref") == "kDswP":
            return root, parent
        for child in root.get("children", []):
            res, p = find_tab_bar_ref(child, root)
            if res:
                return res, p
        for desc in root.get("descendants", {}).values():
            res, p = find_tab_bar_ref(desc, root)
            if res:
                return res, p
    return None, None

TAB_BAR_REF = "kDswP"
TAB_BAR_HEIGHT = 56
TAB_BAR_WIDTH = 393
PHONE_FRAME_ID = "lPWz4"
SCREEN_AREA_ID = "n9xLw"
STATUS_BAR_HEIGHT = 62
PAGE_HEIGHT = 844
CONTENT_HEIGHT = PAGE_HEIGHT - STATUS_BAR_HEIGHT  # 782
TAB_BAR_Y_IN_SCREEN = CONTENT_HEIGHT - TAB_BAR_HEIGHT  # 726

processed = []
for page in list(doc.get("children", [])):
    if not isinstance(page, dict) or page.get("reusable"):
        continue

    # Remove any leftover test curve arc on the page
    page["children"] = [c for c in page.get("children", []) if not (isinstance(c, dict) and c.get("id") == "CNsCi")]

    # Remove accidental bottom padding that may have been added previously
    padding = page.get("padding")
    if isinstance(padding, list) and len(padding) == 4 and padding[2] == TAB_BAR_HEIGHT:
        padding[2] = 0
        if all(v == 0 for v in padding):
            page.pop("padding", None)
        else:
            page["padding"] = padding

    # Find the Phone Frame ref inside the page
    phone_ref = None
    for c in page.get("children", []):
        if isinstance(c, dict) and c.get("type") == "ref" and c.get("ref") == PHONE_FRAME_ID:
            phone_ref = c
            break
    if phone_ref is None:
        continue

    # Find the tab bar ref (currently inside Content)
    tab, content = find_tab_bar_ref(page)
    if tab is None or content is None:
        continue

    # Remove tab bar from Content's children
    content["children"] = [c for c in content.get("children", []) if not (isinstance(c, dict) and c.get("id") == tab.get("id"))]

    # Ensure Content has bottom padding so content isn't hidden by the fixed tab bar
    c_padding = content.get("padding")
    if c_padding is None:
        c_padding = [0, 0, 0, 0]
    elif isinstance(c_padding, (int, float)):
        c_padding = [c_padding, c_padding, c_padding, c_padding]
    elif len(c_padding) == 2:
        c_padding = [c_padding[0], c_padding[1], c_padding[0], c_padding[1]]
    elif len(c_padding) != 4:
        c_padding = [0, 0, 0, 0]
    c_padding[2] = max(c_padding[2], TAB_BAR_HEIGHT)
    content["padding"] = c_padding

    # Move tab bar into the Phone Frame's Screen Area (n9xLw) so it renders above the Phone Frame background
    screen_area = phone_ref.get("descendants", {}).get(SCREEN_AREA_ID)
    if screen_area is None:
        screen_area = {
            "type": "frame",
            "id": "OvqAk",
            "name": "Content",
            "width": "fill_container",
            "layout": "vertical"
        }
        phone_ref.setdefault("descendants", {})[SCREEN_AREA_ID] = screen_area

    # Ensure the tab bar is configured for absolute bottom positioning inside the screen area
    tab["width"] = TAB_BAR_WIDTH
    tab["height"] = TAB_BAR_HEIGHT
    tab["layoutPosition"] = "absolute"
    tab["x"] = 0
    tab["y"] = TAB_BAR_Y_IN_SCREEN

    # Add tab bar to screen area children if not already there
    screen_children = screen_area.setdefault("children", [])
    if tab.get("id") not in [c.get("id") for c in screen_children if isinstance(c, dict)]:
        screen_children.append(tab)

    processed.append((page.get("name"), page.get("id"), tab.get("id")))

with open(PEN, "w", encoding="utf-8") as f:
    json.dump(doc, f, ensure_ascii=False, indent=2)

print("Fixed tab bars for pages:")
for name, pid, tid in processed:
    print(f"  - {name} ({pid}): tab {tid}")
print(f"\nTotal: {len(processed)} pages")
