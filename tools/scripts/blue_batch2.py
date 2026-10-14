#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Batch redesign 3 Pencil pages with brand-blue system:
- r2oVI  下载统计页
- N2AT3U 导出档案页
- UO7T4  账号与安全页
"""

import json
import os
import random
import string
from pathlib import Path

PEN_FILE = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
EXPORT_DIR = r"D:\校园班级事务智能管理助手\exports\home_redesign_v3"
BATCH_OPS_FILE = r"D:\校园班级事务智能管理助手\blue_batch2_ops.txt"

TARGET_PAGES = {
    "r2oVI": "下载统计页",
    "N2AT3U": "导出档案页",
    "UO7T4": "账号与安全页",
}

# In-memory IDs in the active Pencil editor. r2oVI was accidentally replaced
# during earlier exploration; use the current in-memory id for batch updates.
IN_MEMORY_IDS = {
    "r2oVI": "z85QC",
    "N2AT3U": "N2AT3U",
    "UO7T4": "UO7T4",
}


def nid(prefix=""):
    """Generate a Pencil-style random node id."""
    return prefix + "".join(random.choices(string.ascii_letters + string.digits, k=6))


def linear_gradient(c1, c2, rotation=180):
    return {
        "type": "gradient",
        "gradientType": "linear",
        "enabled": True,
        "rotation": rotation,
        "size": {"height": 1},
        "colors": [
            {"color": c1, "position": 0},
            {"color": c2, "position": 1},
        ],
    }


def shadow(color="#0000000D", y=4, blur=16):
    return {
        "type": "shadow",
        "shadowType": "outer",
        "color": color,
        "offset": {"x": 0, "y": y},
        "blur": blur,
    }


def text(content, fill, font_size, font_weight="500", font_family="$font-body", name="Text"):
    return {
        "type": "text",
        "id": nid(),
        "name": name,
        "fill": fill,
        "content": content,
        "fontFamily": font_family,
        "fontSize": font_size,
        "fontWeight": font_weight,
    }


def path(name, geometry, stroke, width=24, height=24, stroke_width=2, fill="transparent"):
    return {
        "type": "path",
        "id": nid(),
        "name": name,
        "geometry": geometry,
        "viewBox": [0, 0, 24, 24],
        "fill": "#00000000" if fill == "transparent" else fill,
        "width": width,
        "height": height,
        "stroke": stroke,
        "strokeWidth": stroke_width,
        "strokeLinejoin": "round",
        "strokeLinecap": "round",
    }


def frame(children=None, **kwargs):
    node = {"type": "frame", "id": nid()}
    node.update(kwargs)
    if children is not None:
        node["children"] = children
    return node


# ---------------------------------------------------------------------------
# Icon geometries (Tabler)
# ---------------------------------------------------------------------------
ICONS = {
    "chevron-left": "M15 18l-6-6 6-6",
    "chevron-right": "M9 18l6-6-6-6",
    "trending-up": "m3 17l6-6l4 4l8-8 M14 7h7v7",
    "chart-bar": "M3 13a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zm12-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zM9 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zM4 20h14",
    "archive": "M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2m2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8m-9 4h4",
    "shield": "M12 3a12 12 0 0 0 8.5 3A12 12 0 0 1 12 21A12 12 0 0 1 3.5 6A12 12 0 0 0 12 3",
    "check": "m5 12l5 5L20 7",
    "file-type-pdf": "M14 3v4a1 1 0 0 0 1 1h4 M5 12V5a2 2 0 0 1 2-2h7l5 5v4M5 18h1.5a1.5 1.5 0 0 0 0-3H5v6m12-3h2m1-3h-3v6m-6-6v6h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2z",
    "file-type-xls": "M14 3v4a1 1 0 0 0 1 1h4 M5 12V5a2 2 0 0 1 2-2h7l5 5v4M4 15l4 6m-4 0l4-6m9 5.25c0 .414.336.75.75.75H19a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1h-1a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1h1.25a.75.75 0 0 1 .75.75M11 15v6h3",
    "file-type-doc": "M14 3v4a1 1 0 0 0 1 1h4 M5 12V5a2 2 0 0 1 2-2h7l5 5v4M5 15v6h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2zm15 1.5a1.5 1.5 0 0 0-3 0v3a1.5 1.5 0 0 0 3 0M12.5 15a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-3 0v-3a1.5 1.5 0 0 1 1.5-1.5",
    "file-type-ppt": "M14 3v4a1 1 0 0 0 1 1h4 M5 18h1.5a1.5 1.5 0 0 0 0-3H5v6m6-3h1.5a1.5 1.5 0 0 0 0-3H11v6m5.5-6h3M18 15v6 M5 12V5a2 2 0 0 1 2-2h7l5 5v4",
    "file-zip": "M6 20.735A2 2 0 0 1 5 19V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2h-1 M11 17a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2a2 2 0 0 1 2-2m0-12h-1m3 2h-1m-1 2h-1m3 2h-1m-1 2h-1m3 2h-1",
    "lock": "M5 13a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z M11 16a1 1 0 1 0 2 0a1 1 0 0 0-2 0m-3-5V7a4 4 0 1 1 8 0v4",
    "device-mobile": "M6 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2zm5-1h2m-1 13v.01",
    "mail": "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M3 7l9 6l9-6",
    "logout": "M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2 M9 12h12l-3-3m0 6l3-3",
}


# ---------------------------------------------------------------------------
# Shared components
# ---------------------------------------------------------------------------
def brand_button(label):
    """Full-width primary gradient button."""
    return frame(
        name="Primary Button",
        width="fill_container",
        height=52,
        fill=linear_gradient("#0062FF", "#3B82F6", rotation=180),
        cornerRadius="$rounded-lg",
        effect=shadow("#0062FF33", y=6, blur=20),
        layout="vertical",
        justifyContent="center",
        alignItems="center",
        children=[
            text(label, "$text-inverse", "$text-size-subhead", font_weight="600", name="Label")
        ],
    )


def back_arrow(stroke="$text-inverse"):
    return path("Icon-chevron-left", ICONS["chevron-left"], stroke)


def header(title, gradient_colors, decor_icon_name, decor_stroke="#FFFFFF55", show_sort=False):
    """Blue gradient header with back arrow, title and decorative line-art icon."""
    top_row_children = [back_arrow()]
    if show_sort:
        top_row_children.append(
            frame(
                name="Sort Buttons",
                gap=8,
                alignItems="center",
                children=[
                    frame(
                        name="Sort Active",
                        height=28,
                        padding=[0, 10],
                        fill="#FFFFFF22",
                        cornerRadius=9999,
                        justifyContent="center",
                        alignItems="center",
                        children=[text("按下载量", "$text-inverse", "$text-size-caption", font_weight="600")],
                    ),
                    frame(
                        name="Sort Normal",
                        height=28,
                        padding=[0, 10],
                        children=[text("按时间", "#FFFFFFAA", "$text-size-caption")],
                    ),
                ],
            )
        )
    else:
        top_row_children.append(frame(width=24, height=24))  # spacer for alignment

    return frame(
        name="Header",
        width="fill_container",
        height=150,
        fill=linear_gradient(*gradient_colors),
        layout="vertical",
        padding=[20, 20],
        gap=12,
        justifyContent="space_between",
        alignItems="start",
        children=[
            frame(
                name="Top Row",
                width="fill_container",
                justifyContent="space_between",
                alignItems="center",
                children=top_row_children,
            ),
            text(title, "$text-inverse", "$text-size-hero", font_weight="700", font_family="$font-heading", name="Title"),
            frame(
                name="Decor Icon",
                layoutPosition="absolute",
                x=285,
                y=80,
                width=64,
                height=64,
                justifyContent="center",
                alignItems="center",
                opacity=0.35,
                children=[path(f"Icon-{decor_icon_name}", ICONS[decor_icon_name], decor_stroke, width=56, height=56, stroke_width=1.5)],
            ),
        ],
    )


def icon_container(size, icon_name, icon_color, bg_color, radius="$rounded-md"):
    return frame(
        name="Icon Container",
        width=size,
        height=size,
        fill=bg_color,
        cornerRadius=radius,
        justifyContent="center",
        alignItems="center",
        children=[path(f"Icon-{icon_name}", ICONS[icon_name], icon_color)],
    )


# ---------------------------------------------------------------------------
# Page 1: 下载统计
# ---------------------------------------------------------------------------
def download_stat_item(file_name, fmt, size_text, count, max_count):
    ratio = count / max_count if max_count else 0
    bar_width = max(24, int(120 * ratio))

    icon_map = {
        "pdf": ("file-type-pdf", "$accent"),
        "pptx": ("file-type-ppt", "#F59E0B"),
        "zip": ("file-zip", "#8B5CF6"),
        "docx": ("file-type-doc", "#10B981"),
    }
    icon_name, icon_color = icon_map.get(fmt, ("file-type-doc", "$accent"))

    return frame(
        name=f"File Item {file_name}",
        width="fill_container",
        height=88,
        fill="$surface",
        cornerRadius="$rounded-lg",
        effect=shadow(),
        padding=[0, 14],
        gap=12,
        alignItems="center",
        children=[
            icon_container(46, icon_name, "$accent", "$accent-50", "$rounded-md"),
            frame(
                name="Info",
                width="fill_container",
                height="fill_container",
                layout="vertical",
                gap=4,
                justifyContent="center",
                children=[
                    text(file_name, "$text-primary", "$text-size-subhead", font_weight="600", name="File Name"),
                    text(f"{fmt.upper()} · {size_text}", "$text-secondary", "$text-size-caption", name="Meta"),
                ],
            ),
            frame(
                name="Stats",
                width=140,
                layout="vertical",
                gap=6,
                alignItems="end",
                children=[
                    frame(
                        name="Progress Track",
                        width="fill_container",
                        height=8,
                        fill="$accent-50",
                        cornerRadius=9999,
                        children=[
                            frame(
                                name="Progress Fill",
                                width=bar_width,
                                height=8,
                                fill=linear_gradient("#0062FF", "#3B82F6"),
                                cornerRadius=9999,
                            )
                        ],
                    ),
                    frame(
                        name="Count Row",
                        gap=4,
                        alignItems="center",
                        children=[
                            text(f"{count}", "$accent", "$text-size-body", font_weight="700", name="Count"),
                            path("Icon-trending-up", ICONS["trending-up"], "$accent", width=16, height=16),
                        ],
                    ),
                ],
            ),
        ],
    )


def build_download_page():
    files = [
        ("高数资料.pdf", "pdf", "2.3 MB", 128),
        ("班会PPT.pptx", "pptx", "5.1 MB", 96),
        ("活动照片.zip", "zip", "12 MB", 64),
        ("团课学习.docx", "docx", "1.8 MB", 52),
    ]
    max_count = max(f[3] for f in files)

    return frame(
        name="Content",
        id=nid(),
        width="fill_container",
        height="fill_container",
        fill="$bg",
        layout="vertical",
        gap=0,
        children=[
            header("下载统计", ("#6B8CB0", "#AFCBE6"), "chart-bar", show_sort=True),
            frame(
                name="Body",
                width="fill_container",
                height="fill_container",
                layout="vertical",
                gap=12,
                padding=[16, 20, 20, 20],
                children=[
                    frame(
                        name="Stats Card",
                        width="fill_container",
                        fill="$surface",
                        cornerRadius="$rounded-lg",
                        effect=shadow(),
                        layout="vertical",
                        gap=10,
                        padding=14,
                        children=[download_stat_item(*f, max_count) for f in files],
                    ),
                    brand_button("导出统计"),
                ],
            ),
        ],
    )


# ---------------------------------------------------------------------------
# Page 2: 导出档案
# ---------------------------------------------------------------------------
def format_card(icon_name, icon_gradient, title, desc, selected=False):
    children = [
        frame(
            name="Icon Box",
            width=64,
            height=64,
            fill=linear_gradient(*icon_gradient),
            cornerRadius=20,
            effect=shadow("#0000000D", y=4, blur=12),
            justifyContent="center",
            alignItems="center",
            children=[path(f"Icon-{icon_name}", ICONS[icon_name], "$text-inverse", width=32, height=32)],
        ),
        text(title, "$text-primary", "$text-size-subhead", font_weight="700", name="Title"),
        text(desc, "$text-secondary", "$text-size-caption", name="Desc"),
    ]

    if selected:
        children.append(
            frame(
                name="Check",
                layoutPosition="absolute",
                x=122,
                y=108,
                width=24,
                height=24,
                fill="$accent",
                cornerRadius=9999,
                justifyContent="center",
                alignItems="center",
                children=[path("Icon-check", ICONS["check"], "$text-inverse", width=14, height=14, stroke_width=3)],
            )
        )

    return frame(
        name=f"Format Card {title}",
        width="fill_container",
        height=150,
        fill="$surface",
        cornerRadius="$rounded-xl",
        stroke="$accent" if selected else "$border",
        strokeWidth=2 if selected else 1,
        effect=shadow(),
        layout="vertical",
        gap=10,
        padding=[16, 16],
        justifyContent="center",
        alignItems="center",
        children=children,
    )


def build_export_page():
    return frame(
        name="Content",
        id=nid(),
        width="fill_container",
        height="fill_container",
        fill="$bg",
        layout="vertical",
        gap=0,
        children=[
            header("导出档案", ("#003D82", "#0062FF"), "archive"),
            frame(
                name="Body",
                width="fill_container",
                height="fill_container",
                layout="vertical",
                gap=16,
                padding=[16, 20, 20, 20],
                children=[
                    {
                        "id": nid(),
                        "type": "ref",
                        "ref": "p1Ykr",
                        "name": "Archive Name Input",
                        "height": 56,
                        "width": "fill_container",
                        "descendants": {
                            "uwUcZ": {
                                "content": "2024-2025学年班级档案"
                            }
                        },
                    },
                    text("导出格式", "$text-secondary", "$text-size-body", font_weight="500"),
                    frame(
                        name="Format Cards",
                        width="fill_container",
                        layout="vertical",
                        gap=12,
                        children=[
                            format_card("file-type-pdf", ("#0062FF", "#3B82F6"), "PDF文档", "适合打印与汇报", selected=True),
                            format_card("file-type-xls", ("#38BDF8", "#60A5FA"), "Excel表格", "含详细数据"),
                            format_card("file-type-doc", ("#64748B", "#94A3B8"), "Word总结", "一键生成工作总结"),
                        ],
                    ),
                    brand_button("确认导出"),
                ],
            ),
        ],
    )


# ---------------------------------------------------------------------------
# Page 3: 账号与安全
# ---------------------------------------------------------------------------
def status_tag(label, style="bound"):
    if style == "bound":
        bg, fg = "#0062FF", "$text-inverse"
    else:
        bg, fg = "#E0F2FE", "$accent"
    return frame(
        name=f"Tag {label}",
        height=24,
        padding=[0, 10],
        fill=bg,
        cornerRadius=9999,
        justifyContent="center",
        alignItems="center",
        children=[text(label, fg, "$text-size-caption", font_weight="600")],
    )


def settings_row(icon_name, label, tag=None, danger=False):
    icon_color = "#DC2626" if danger else "$accent"
    bg_color = "#FEE2E2" if danger else "$accent-50"
    text_color = "#991B1B" if danger else "$text-primary"

    right_children = []
    if tag:
        right_children.append(tag)
    else:
        right_children.append(frame(width=8, height=8))  # tiny spacer
    if not danger:
        right_children.append(path("Icon-chevron-right", ICONS["chevron-right"], "$text-muted"))

    return frame(
        name=f"Row {label}",
        width="fill_container",
        height=56,
        gap=12,
        padding=[0, 12],
        alignItems="center",
        children=[
            icon_container(36, icon_name, icon_color, bg_color, "$rounded-md"),
            text(label, text_color, "$text-size-body", font_weight="500", name="Label"),
            frame(width="fill_container"),
            frame(
                name="Right",
                gap=8,
                alignItems="center",
                children=right_children,
            ),
        ],
    )


def settings_group(title, rows, danger=False):
    card_kwargs = dict(
        name="Card",
        width="fill_container",
        fill="#FEF2F2" if danger else "$surface",
        cornerRadius="$rounded-lg",
        stroke="#FECACA" if danger else "$border",
        strokeWidth=1,
        layout="vertical",
        gap=0,
        padding=4,
        children=rows,
    )
    if not danger:
        card_kwargs["effect"] = shadow()
    return frame(
        name=f"Group {title}",
        width="fill_container",
        layout="vertical",
        gap=8,
        children=[
            text(title, "$text-secondary", "$text-size-caption", font_weight="600", name="Group Title"),
            frame(**card_kwargs),
        ],
    )


def build_security_page():
    return frame(
        name="Content",
        id=nid(),
        width="fill_container",
        height="fill_container",
        fill="$bg",
        layout="vertical",
        gap=0,
        children=[
            header("账号与安全", ("#0891B2", "#67E8F9"), "shield"),
            frame(
                name="Body",
                width="fill_container",
                height="fill_container",
                layout="vertical",
                gap=20,
                padding=[16, 20, 20, 20],
                children=[
                    settings_group(
                        "账号绑定",
                        [
                            settings_row("lock", "修改密码"),
                            settings_row("device-mobile", "绑定手机", status_tag("已绑定", "bound")),
                            settings_row("mail", "绑定邮箱", status_tag("未绑定", "unbound")),
                        ],
                    ),
                    settings_group(
                        "账号操作",
                        [settings_row("logout", "退出登录", danger=True)],
                        danger=True,
                    ),
                ],
            ),
        ],
    )


# ---------------------------------------------------------------------------
# Main logic
# ---------------------------------------------------------------------------
PAGE_BUILDERS = {
    "r2oVI": build_download_page,
    "N2AT3U": build_export_page,
    "UO7T4": build_security_page,
}


def load_pen(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_pen(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def patch_page(page_node, new_content):
    """Replace the screen-area descendant inside the Phone Frame ref."""
    phone_ref = page_node.get("children", [{}])[0]
    if phone_ref.get("type") != "ref" or phone_ref.get("ref") != "lPWz4":
        raise ValueError(f"Page {page_node.get('id')} does not reference Phone Frame lPWz4")
    phone_ref["descendants"] = {"n9xLw": new_content}


def main():
    print(f"Loading {PEN_FILE}")
    data = load_pen(PEN_FILE)

    # Locate pages by id
    pages_by_id = {c.get("id"): c for c in data.get("children", []) if c.get("type") == "frame"}
    for pid, name in TARGET_PAGES.items():
        page = pages_by_id.get(pid)
        if page is None:
            raise ValueError(f"Page not found: {pid} ({name})")
        if page.get("name") != name:
            print(f"Warning: page {pid} name mismatch: {page.get('name')} vs {name}")

    # Patch each target page
    for pid in TARGET_PAGES:
        builder = PAGE_BUILDERS[pid]
        patch_page(pages_by_id[pid], builder())
        print(f"Patched page {pid} ({TARGET_PAGES[pid]})")

    # Backup and save
    backup_path = PEN_FILE + ".backup"
    if not os.path.exists(backup_path):
        os.replace(PEN_FILE, backup_path)
        save_pen(PEN_FILE, data)
        print(f"Backup saved to {backup_path}")
    else:
        save_pen(PEN_FILE, data)
        print("Backup already exists, overwritten .pen file")

    # Ensure export directory exists
    Path(EXPORT_DIR).mkdir(parents=True, exist_ok=True)
    print(f"Export directory ready: {EXPORT_DIR}")

    # Generate batch_design Update operations to sync in-memory Pencil state
    ops = []
    for pid in TARGET_PAGES:
        page = pages_by_id[pid]
        mem_id = IN_MEMORY_IDS.get(pid, pid)
        children_json = json.dumps(page.get("children", []), ensure_ascii=False, separators=(",", ":"))
        ops.append(f"Update('{mem_id}', {{children:{children_json}}});")
    with open(BATCH_OPS_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(ops))
    print(f"Batch design ops written to {BATCH_OPS_FILE}")
    print("Run export_nodes MCP to export pages:", list(TARGET_PAGES.keys()))


if __name__ == "__main__":
    main()
