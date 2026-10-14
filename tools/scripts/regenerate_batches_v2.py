import json
import re
import xml.etree.ElementTree as ET
import os

LUCIDE_JSON_STR = r'''{"prefix":"lucide","lastModified":1782727192,"aliases":{"check-circle":{"parent":"circle-check-big"}},"width":24,"height":24,"icons":{"house":{"body":"<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\"/><path d=\"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/></g>"},"users":{"body":"<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.128a4 4 0 0 1 0 7.744M22 21v-2a4 4 0 0 0-3-3.87\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/></g>"},"message-square":{"body":"<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z\"/>"},"bar-chart-3":{"body":"<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M3 3v18h18m-3-4V9m-5 8V5M8 17v-3\"/>","hidden":true},"user":{"body":"<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\"/></g>"},"graduation-cap":{"body":"<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0zM22 10v6\"/><path d=\"M6 12.5V16a6 3 0 0 0 12 0v-3.5\"/></g>"},"crown":{"body":"<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294zM5 21h14\"/>"},"flag":{"body":"<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528\"/>"},"book-open":{"body":"<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 7v14m-9-3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4a4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3a3 3 0 0 0-3-3z\"/>"},"building":{"body":"<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M12 10h.01M12 14h.01M12 6h.01M16 10h.01M16 14h.01M16 6h.01M8 10h.01M8 14h.01M8 6h.01M9 22v-3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3\"/><rect width=\"16\" height=\"20\" x=\"4\" y=\"2\" rx=\"2\"/></g>"},"trophy":{"body":"<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978m7-7.318v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978M18 9h1.5a1 1 0 0 0 0-5H18M4 22h16\"/><path d=\"M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm0 0H4.5a1 1 0 0 1 0-5H6\"/></g>"},"table":{"body":"<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M12 3v18\"/><rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><path d=\"M3 9h18M3 15h18\"/></g>"},"database":{"body":"<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\"/><path d=\"M3 5v14a9 3 0 0 0 18 0V5\"/><path d=\"M3 12a9 3 0 0 0 18 0\"/></g>"},"message-circle":{"body":"<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092a10 10 0 1 0-4.777-4.719\"/>"},"hourglass":{"body":"<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 22h14M5 2h14m-2 20v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2\"/>"},"clipboard-list":{"body":"<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\"/><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2m4 7h4m-4 5h4m-8-5h.01M8 16h.01\"/></g>"},"handshake":{"body":"<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"m11 17l2 2a1 1 0 1 0 3-3\"/><path d=\"m14 14l2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4\"/><path d=\"m21 3l1 11h-2M3 3L2 14l6.5 6.5a1 1 0 1 0 3-3M3 4h8\"/></g>"},"upload":{"body":"<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 3v12m5-7l-5-5l-5 5m14 7v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/>"},"file-text":{"body":"<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z\"/><path d=\"M14 2v5a1 1 0 0 0 1 1h5M10 9H8m8 4H8m8 4H8\"/></g>"},"archive":{"body":"<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><rect width=\"20\" height=\"5\" x=\"2\" y=\"3\" rx=\"1\"/><path d=\"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8m-10 4h4\"/></g>"},"chevron-right":{"body":"<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m9 18l6-6l-6-6\"/>"},"chevron-left":{"body":"<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m15 18l-6-6l6-6\"/>"},"chevron-down":{"body":"<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m6 9l6 6l6-6\"/>"},"circle-check-big":{"body":"<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M21.801 10A10 10 0 1 1 17 3.335\"/><path d=\"m9 11l3 3L22 4\"/></g>"},"bell":{"body":"<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M10.268 21a2 2 0 0 0 3.464 0m-10.47-5.674A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326\"/>"},"calendar":{"body":"<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M8 2v4m8-4v4\"/><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"/><path d=\"M3 10h18\"/></g>"},"folder":{"body":"<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z\"/>"},"image":{"body":"<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" ry=\"2\"/><circle cx=\"9\" cy=\"9\" r=\"2\"/><path d=\"m21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21\"/></g>"},"award":{"body":"<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"m15.477 12.89l1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526\"/><circle cx=\"12\" cy=\"8\" r=\"6\"/></g>"},"megaphone":{"body":"<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z\"/><path d=\"M6 14a12 12 0 0 0 2.4 7.2a2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14M8 6v8\"/></g>"},"wallet":{"body":"<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1\"/><path d=\"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4\"/></g>"}}}'''

SIMPLE_ICONS_JSON_STR = r'''{"prefix":"simple-icons","lastModified":1782727372,"aliases":{},"width":24,"height":24,"icons":{"wechat":{"body":"<path fill=\"currentColor\" d=\"M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213c0 .163.13.295.29.295a.33.33 0 0 0 .167-.054l1.903-1.114a.86.86 0 0 1 .717-.098a10.2 10.2 0 0 0 2.837.403c.276 0 .543-.027.811-.05c-.857-2.578.157-4.972 1.932-6.446c1.703-1.415 3.882-1.98 5.853-1.838c-.576-3.583-4.196-6.348-8.596-6.348M5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178a1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18m5.34 2.867c-1.797-.052-3.746.512-5.28 1.786c-1.72 1.428-2.687 3.72-1.78 6.22c.942 2.453 3.666 4.229 6.884 4.229c.826 0 1.622-.12 2.361-.336a.72.72 0 0 1 .598.082l1.584.926a.3.3 0 0 0 .14.047c.134 0 .24-.111.24-.247c0-.06-.023-.12-.038-.177l-.327-1.233a.6.6 0 0 1-.023-.156a.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983a.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983a.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982\"/>"},"qq":{"body":"<path fill=\"currentColor\" d=\"M21.395 15.035a40 40 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.526 4.632 17.351 0 12 0S4.474 4.632 4.474 9.241c0 .274.013.804.014.836l-1.08 2.695a39 39 0 0 0-.802 2.264c-1.021 3.283-.69 4.643-.438 4.673c.54.065 2.103-2.472 2.103-2.472c0 1.469.756 3.387 2.394 4.771c-.612.188-1.363.479-1.845.835c-.434.32-.379.646-.301.778c.343.578 5.883.369 7.482.189c1.6.18 7.14.389 7.483-.189c.078-.132.132-.458-.301-.778c-.483-.356-1.233-.646-1.846-.836c1.637-1.384 2.393-3.302 2.393-4.771c0 0 1.563 2.537 2.103 2.472c.251-.03.581-1.39-.438-4.673\"/>"}}}'''

PHOSPHOR_TO_LUCIDE = {
    "caret-right": "chevron-right",
    "student": "graduation-cap",
    "users": "users",
    "crown": "crown",
    "flag": "flag",
    "book-open": "book-open",
    "buildings": "building",
    "trophy": "trophy",
    "table": "table",
    "database": "database",
    "chat-circle": "message-circle",
    "hourglass": "hourglass",
    "clipboard-text": "clipboard-list",
    "handshake": "handshake",
    "upload": "upload",
    "upload-simple": "upload",
    "file-text": "file-text",
    "archive-box": "archive",
    "arrow-left": "chevron-left",
    "bell": "bell",
    "check-circle": "check-circle",
    "calendar": "calendar",
    "folder": "folder",
    "image": "image",
    "medal": "award",
    "megaphone": "megaphone",
    "wallet": "wallet",
    "caret-down": "chevron-down",
    "chart-line": "bar-chart-3",
    "house": "house",
    "user": "user",
}

BOTTOM_NAV_LABELS = {
    "PSDRK": "Icon-Home",
    "WdTFw": "Icon-Class",
    "B2GpF": "Icon-Message",
    "I7QX52": "Icon-Data",
    "cnYTi": "Icon-Profile",
}

TAB_BAR_COMPONENT_ID = "kDswP"

def circle_to_path(cx, cy, r):
    return f"M{cx+r} {cy}A{r} {r} 0 1 0 {cx-r} {cy}A{r} {r} 0 1 0 {cx+r} {cy}"

def ellipse_to_path(cx, cy, rx, ry):
    return f"M{cx+rx} {cy}A{rx} {ry} 0 1 0 {cx-rx} {cy}A{rx} {ry} 0 1 0 {cx+rx} {cy}"

def rect_to_path(x, y, w, h, rx=0, ry=0):
    x = float(x); y = float(y); w = float(w); h = float(h)
    rx = float(rx) if rx else 0
    ry = float(ry) if ry else rx
    if rx == 0:
        return f"M{x} {y}h{w}v{h}h{-w}z"
    r = min(rx, ry)
    return (f"M{x+r} {y}h{w-2*r}a{r} {r} 0 0 1 {r} {r}v{h-2*r}a{r} {r} 0 0 1 {-r} {r}h{-(w-2*r)}"
            f"a{r} {r} 0 0 1 {-r} {-r}v{-(h-2*r)}a{r} {r} 0 0 1 {r} {-r}z")

def element_to_paths(elem):
    tag = elem.tag.split('}')[-1]
    if tag == 'path':
        d = elem.get('d')
        return [d] if d else []
    if tag == 'circle':
        return [circle_to_path(float(elem.get('cx', 0)), float(elem.get('cy', 0)), float(elem.get('r', 0)))]
    if tag == 'ellipse':
        return [ellipse_to_path(float(elem.get('cx', 0)), float(elem.get('cy', 0)), float(elem.get('rx', 0)), float(elem.get('ry', 0)))]
    if tag == 'rect':
        return [rect_to_path(elem.get('x', 0), elem.get('y', 0), elem.get('width', 0), elem.get('height', 0), elem.get('rx'), elem.get('ry'))]
    if tag in ('g', 'svg'):
        out = []
        for child in elem:
            out.extend(element_to_paths(child))
        return out
    return []

def body_to_geometry(body):
    root = ET.fromstring(f"<root>{body}</root>")
    ds = []
    for child in root:
        ds.extend(element_to_paths(child))
    return " ".join(ds)

def build_icon_geometry_map():
    lucide = json.loads(LUCIDE_JSON_STR)
    simple = json.loads(SIMPLE_ICONS_JSON_STR)
    geom = {}
    aliases = lucide.get('aliases', {})
    for name, data in lucide['icons'].items():
        geom[name] = body_to_geometry(data['body'])
    for alias, info in aliases.items():
        parent = info['parent']
        if parent in geom:
            geom[alias] = geom[parent]
    for name, data in simple['icons'].items():
        geom[f"simple-icons:{name}"] = body_to_geometry(data['body'])
    return geom

def extract_json_array(text):
    m = re.search(r'"text":"(\[.*\])"', text, re.DOTALL)
    if not m:
        m = re.search(r'(\[.*\])', text, re.DOTALL)
    s = m.group(1)
    s = s.replace('\\"', '"')
    return json.loads(s)

def path_node(name, geometry, stroke, fill, strokeWidth=2):
    return {
        "type": "path",
        "name": name,
        "width": 24,
        "height": 24,
        "viewBox": [0, 0, 24, 24],
        "geometry": geometry,
        "stroke": stroke,
        "strokeWidth": strokeWidth,
        "strokeLinecap": "round",
        "strokeLinejoin": "round",
        "fill": fill,
    }

def brand_path_node(name, geometry):
    return {
        "type": "path",
        "name": name,
        "width": 24,
        "height": 24,
        "viewBox": [0, 0, 24, 24],
        "geometry": geometry,
        "fill": "$text-secondary",
    }

def replace_cmd(node_id, node):
    return f'Replace("{node_id}", {json.dumps(node, ensure_ascii=False, separators=(",", ":"))})'

def insert_cmd(parent_id, node):
    return f'Insert("{parent_id}", {json.dumps(node, ensure_ascii=False, separators=(",", ":"))})'

def find_node(nodes, node_id):
    for n in nodes:
        if n.get("id") == node_id:
            return n
    return None

def main():
    geom = build_icon_geometry_map()
    base_dir = r"D:\校园班级事务智能管理助手"
    tab_bar_src = r"C:\Users\13929\AppData\Local\Temp\trae\toolcall-output\bc39edfd-9ebc-43a3-8713-231af2ac82eb.txt"
    icons_src = r"C:\Users\13929\AppData\Local\Temp\trae\toolcall-output\aa503f84-25a3-4040-a8bd-014cbf0b6518.txt"

    with open(tab_bar_src, "r", encoding="utf-8") as f:
        tab_bar_nodes = extract_json_array(f.read())
    with open(icons_src, "r", encoding="utf-8") as f:
        all_icons_nodes = extract_json_array(f.read())

    tab_component = find_node(tab_bar_nodes, TAB_BAR_COMPONENT_ID)
    tab_icon_ids = []
    if tab_component and "children" in tab_component:
        for child in tab_component["children"]:
            if child.get("type") == "frame":
                for c2 in child.get("children", []):
                    if c2.get("type") == "icon":
                        tab_icon_ids.append(c2["id"])

    commands = []
    replaced_icons = []

    # 1. Replace icons inside the Tab Bar component itself
    for icon_id in tab_icon_ids:
        target = PHOSPHOR_TO_LUCIDE.get(icon_id, icon_id)
        # map icon names for bottom nav
        # icon_id is the phosphor icon name stored? no, it's the node id. need original icon attr.
        original_icon_node = find_node(all_icons_nodes, icon_id)
        if not original_icon_node:
            # fallback from component children
            original_icon_node = None
            for child in tab_component["children"]:
                for c2 in child.get("children", []):
                    if c2.get("id") == icon_id:
                        original_icon_node = c2
                        break
        pname = original_icon_node.get("icon") if original_icon_node else icon_id
        target = PHOSPHOR_TO_LUCIDE.get(pname, pname)
        label = BOTTOM_NAV_LABELS.get(icon_id, f"Icon-{target}")
        commands.append(replace_cmd(f"{TAB_BAR_COMPONENT_ID}/{icon_id}", path_node(label, geom[target], "$text-muted", "none")))
        replaced_icons.append((f"{TAB_BAR_COMPONENT_ID}/{icon_id}", pname, target))

    # 2. Replace icon overrides in each Tab Bar ref instance
    for node in tab_bar_nodes:
        if node.get("type") != "ref" or node.get("ref") != TAB_BAR_COMPONENT_ID:
            continue
        instance_id = node["id"]
        descendants = node.get("descendants", {})
        for child_id, overrides in descendants.items():
            # only if still an icon
            if overrides.get("type") == "icon":
                pname = overrides.get("icon")
                target = PHOSPHOR_TO_LUCIDE.get(pname, pname)
                label = BOTTOM_NAV_LABELS.get(child_id, f"Icon-{target}")
                commands.append(replace_cmd(f"{instance_id}/{child_id}", path_node(label, geom[target], "$text-muted", "none")))
                replaced_icons.append((f"{instance_id}/{child_id}", pname, target))

    # 3. Replace remaining standalone icon nodes (excluding tab bar icons)
    tab_ids_set = set(tab_icon_ids)
    for node in all_icons_nodes:
        if node.get("type") != "icon":
            continue
        iid = node["id"]
        if iid in tab_ids_set:
            continue
        pname = node.get("icon")
        fill = node.get("fill", "$text-muted")
        if pname not in PHOSPHOR_TO_LUCIDE:
            continue
        target = PHOSPHOR_TO_LUCIDE[pname]
        name = f"Icon-{target}" if node.get("name") == "Icon" else node.get("name", f"Icon-{target}")
        commands.append(replace_cmd(iid, path_node(name, geom[target], fill, "none")))
        replaced_icons.append((iid, pname, target))

    # 4. Insert QQ brand icon
    commands.append(insert_cmd("GQz4D", brand_path_node("Icon-QQ", geom["simple-icons:qq"])))

    # split into batches
    batch_size = 35
    out_files = []
    for i in range(0, len(commands), batch_size):
        batch = commands[i:i+batch_size]
        fname = os.path.join(base_dir, f"icon_batch_v3_{i//batch_size}.txt")
        with open(fname, "w", encoding="utf-8") as f:
            f.write("\n".join(batch))
        out_files.append(fname)

    summary = {
        "replaced_icons": len(replaced_icons),
        "brand_inserts": 1,
        "total_commands": len(commands),
        "batches": out_files,
        "mapping_sample": replaced_icons[:10],
    }
    with open(os.path.join(base_dir, "icon_summary_v3.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(json.dumps(summary, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
