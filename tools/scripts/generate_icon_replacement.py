import json
import os

PEN_FILE = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
PLAN_FILE = r"D:\校园班级事务智能管理助手\icon_replacement_plan.json"
OUT_DIR = r"D:\校园班级事务智能管理助手"

# Icon name mapping: from standard Lucide / sub-agent suggestion -> Pencil-supported Lucide name
NAME_MAP = {
    "home": "house",
    "bar-chart": "trending-up",
    "bar-chart-3": "trending-up",
    "pie-chart": "trending-up",
    "check-circle": "circle-check",
    "check-circle-2": "circle-check",
    "check-square": "square-check",
    "more-horizontal": "more-horizontal",  # not available, will handle
    "more-vertical": "more-vertical",      # not available, will handle
    "more": "more-horizontal",
    "clock": "calendar-clock",             # fallback
    "filter": "sliders-horizontal",
    "sliders": "sliders-horizontal",
    "announcement": "megaphone",
    "unlock": "lock",                      # fallback, no unlock in Pencil set
    "cart": "shopping-cart",
    "circle-dot": "circle-dot",            # available
    "file-spreadsheet": "file-spreadsheet", # available
    "school": "school",                    # available
    "building-2": "building-2",            # available
    "graduation-cap": "graduation-cap",    # available
    "clipboard-list": "clipboard-list",    # available
    "calendar-days": "calendar-days",      # available
    "calendar-clock": "calendar-clock",    # available
    "megaphone": "megaphone",              # available
    "folder-open": "folder-open",          # available
    "credit-card": "credit-card",          # available
    "wallet": "wallet",                    # available
}

# Fallbacks for names known to fail
FAIL_FALLBACK = {
    "more-horizontal": "menu",
    "more-vertical": "menu",
    "unlock": "lock",
    "clock": "calendar-clock",
    "bar-chart": "trending-up",
    "pie-chart": "trending-up",
    "filter": "sliders-horizontal",
    "sliders": "sliders-horizontal",
    "announcement": "megaphone",
}

# Semantic overrides for specific contexts
SEMANTIC_OVERRIDES = {
    # Tab bar items
    ("JWxau", "Icon"): "house",
    ("xkHfH", "Icon"): "users",
    ("eqBCj", "Icon"): "message-circle",
    ("weN33", "Icon"): "trending-up",
    ("nfv2a", "Icon"): "user",
    # Identity selection cards
    ("Student Card", "Icon"): "user",
    ("Committee Card", "Icon"): "users",
    # Committee role cards (keep abstract user/group icon)
    ("班长 Card", "Icon"): "user",
    ("团支书 Card", "Icon"): "users",
    ("学习委员 Card", "Icon"): "book-open",
    ("副班长 Card", "Icon"): "user-check",
    ("生活委员 Card", "Icon"): "bed-double",
    ("体育委员 Card", "Icon"): "trophy",
}

# Known Pencil-supported icon names (from testing)
VALID_NAMES = {
    "users", "message-circle", "user", "chevron-right", "plus", "search", "bell",
    "calendar", "map-pin", "check", "x", "settings", "menu", "trash", "pencil",
    "file-text", "download", "upload", "folder", "house", "trash-2", "circle",
    "disc", "trending-up", "activity", "circle-check", "square-check", "circle-dot",
    "dot", "menu", "chevron-left", "chevron-down", "chevron-up", "arrow-right",
    "arrow-left", "arrow-up", "arrow-down", "file-spreadsheet", "school", "building",
    "building-2", "graduation-cap", "clipboard-list", "clipboard-check", "calendar-days",
    "calendar-clock", "bookmark", "heart", "star", "sliders-horizontal", "log-out",
    "log-in", "user-plus", "user-minus", "user-cog", "cog", "wallet", "credit-card",
    "banknote", "receipt", "megaphone", "mail", "inbox", "send", "paperclip", "image",
    "image-plus", "file-plus", "folder-open", "folder-plus", "lock", "eye", "eye-off",
    "refresh-cw", "rotate-cw", "repeat", "reply", "share-2", "link", "external-link",
    "copy", "check-check", "printer", "smartphone", "tablet", "monitor", "globe", "map",
    "navigation", "compass", "flag", "tag", "tags", "shopping-cart",
    # additional likely names
    "book-open", "book", "user-check", "bed-double", "trophy", "clock", "alarm-clock",
    "watch", "calendar-x", "file-minus", "file-plus-2", "folder-minus", "folder-x",
    "bell-ring", "bell-dot", "message-square", "megaphone", "volume-2", "volume-x",
}

def resolve_icon_name(raw, parent_name, node_name):
    key = (parent_name, node_name)
    if key in SEMANTIC_OVERRIDES:
        name = SEMANTIC_OVERRIDES[key]
    else:
        name = NAME_MAP.get(raw, raw)
    if name not in VALID_NAMES:
        name = FAIL_FALLBACK.get(name, name)
    if name not in VALID_NAMES:
        # Last resort fallbacks by semantic category
        if raw in ("bar-chart", "bar-chart-3", "pie-chart", "chart", "activity"):
            name = "trending-up"
        elif raw in ("check-circle", "check-circle-2", "check-square"):
            name = "check"
        elif raw in ("more-horizontal", "more-vertical", "more"):
            name = "menu"
        elif raw in ("clock", "time"):
            name = "calendar"
        elif raw in ("filter", "sliders"):
            name = "sliders-horizontal"
        elif raw in ("announcement"):
            name = "megaphone"
        elif raw in ("unlock"):
            name = "lock"
        elif raw in ("cart"):
            name = "shopping-cart"
        elif raw in ("circle-dot"):
            name = "circle-dot"
        elif raw in ("home", "house"):
            name = "house"
        else:
            name = "circle"  # absolute fallback
    return name


def load_pen():
    with open(PEN_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def build_parent_map(doc):
    """Map node id -> {parent_id, node, ancestors, is_inside_component, root_id}"""
    parent_map = {}

    def walk(node, parent_id, ancestors, root_id):
        nid = node.get("id")
        if nid:
            parent_map[nid] = {
                "parent_id": parent_id,
                "node": node,
                "ancestors": list(ancestors),
                "root_id": root_id,
            }
        new_ancestors = ancestors + [node]
        for child in node.get("children", []):
            if isinstance(child, dict):
                walk(child, nid, new_ancestors, root_id)
        # Also handle ref descendants? In raw JSON, refs have descendants map, not children list
        for did, dnode in node.get("descendants", {}).items():
            if isinstance(dnode, dict):
                # descendants keys may be id paths; store with parent being the ref node
                parent_map[did] = {
                    "parent_id": nid,
                    "node": dnode,
                    "ancestors": new_ancestors,
                    "root_id": root_id,
                    "is_descendant": True,
                }

    for child in doc.get("children", []):
        walk(child, None, [], child.get("id"))
    return parent_map


def is_inside_reusable_component(parent_map, nid):
    info = parent_map.get(nid)
    if not info:
        return False
    for anc in info["ancestors"]:
        if anc.get("reusable"):
            return True
    return False


def get_parent_layout(parent_map, nid):
    info = parent_map.get(nid)
    if not info:
        return None, None
    parent = info["parent_id"] and parent_map.get(info["parent_id"])
    if not parent:
        return None, None
    pnode = parent["node"]
    return pnode.get("layout"), pnode.get("alignItems"), pnode.get("justifyContent")


def generate_batch_code(plan, parent_map):
    """Generate batch_design JS snippets grouped into chunks."""
    lines = []
    component_icons = []  # inside reusable components -> Delete + Insert + Move
    screen_icons = []     # not in components -> Replace

    for item in plan:
        nid = item["id"]
        raw_icon = item.get("lucideIcon") or "circle"
        parent_name = item.get("parentName", "")
        node_name = item.get("name", "")
        icon_name = resolve_icon_name(raw_icon, parent_name, node_name)
        fill = item.get("fill") or "$text-muted"
        if not fill.startswith("$"):
            fill = "$text-muted"
        width = item.get("width") or 24
        height = item.get("height") or 24
        try:
            width = int(width) if width else 24
        except:
            width = 24
        try:
            height = int(height) if height else 24
        except:
            height = 24
        # Normalize icon size to Lucide 24 grid but preserve bounding box for large placeholders
        # For empty frame placeholders, keep original size; for text bullets use 24
        if item.get("type") == "text":
            width = 24
            height = 24

        in_component = is_inside_reusable_component(parent_map, nid)
        if in_component:
            component_icons.append({
                "id": nid,
                "parent_id": parent_map[nid]["parent_id"],
                "icon_name": icon_name,
                "fill": fill,
                "width": width,
                "height": height,
                "item": item,
            })
        else:
            screen_icons.append({
                "id": nid,
                "icon_name": icon_name,
                "fill": fill,
                "width": width,
                "height": height,
            })

    # Build Replace calls for screen icons
    for icon in screen_icons:
        lines.append(
            f'Replace("{icon["id"]}", {{type:"icon", name:"Icon", library:"lucide", icon:"{icon["icon_name"]}", width:{icon["width"]}, height:{icon["height"]}, fill:"{icon["fill"]}"}})'
        )

    # Build Delete + Insert + Move for component icons
    # We need to group by parent to move inserted icons to index 0 when order matters
    for icon in component_icons:
        parent_id = icon["parent_id"]
        lines.append(f'Delete("{icon["id"]}")')
        var_name = f'icon_{icon["id"].replace("-", "_").replace("/", "_")}'
        lines.append(
            f'{var_name} = Insert("{parent_id}", {{type:"icon", name:"Icon", library:"lucide", icon:"{icon["icon_name"]}", width:{icon["width"]}, height:{icon["height"]}, fill:"{icon["fill"]}"}})'
        )
        # Move to index 0 to keep icon above label in tab bar etc.
        lines.append(f'Move({var_name}, "{parent_id}", 0)')

    # Split into chunks to keep each batch_design call reasonable
    chunk_size = 30
    chunks = []
    for i in range(0, len(lines), chunk_size):
        chunks.append("\n".join(lines[i:i+chunk_size]))

    return chunks, len(screen_icons), len(component_icons)


def main():
    with open(PLAN_FILE, "r", encoding="utf-8") as f:
        plan = json.load(f)
    doc = load_pen()
    parent_map = build_parent_map(doc)
    chunks, screen_count, comp_count = generate_batch_code(plan, parent_map)

    print(f"Total icons: {len(plan)}")
    print(f"Screen icons (Replace): {screen_count}")
    print(f"Component icons (Delete+Insert+Move): {comp_count}")
    print(f"Chunks: {len(chunks)}")

    for i, chunk in enumerate(chunks):
        out_path = os.path.join(OUT_DIR, f"icon_batch_{i+1}.txt")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(chunk)
        print(f"Wrote {out_path}")

    # Also write a summary
    summary = {
        "total": len(plan),
        "screen_icons": screen_count,
        "component_icons": comp_count,
        "chunks": len(chunks),
    }
    with open(os.path.join(OUT_DIR, "icon_replacement_summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
