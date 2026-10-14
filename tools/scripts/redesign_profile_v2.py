#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Redesign the personal center page (a3uMZY) with stacked header + card layout.

The settings gear icon path was fetched via the iconify MCP (tabler:settings).
"""

import json
import os
import re
import shutil
from uuid import uuid4

PEN_PATH = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
BACKUP_PATH = PEN_PATH + ".bak"

# Screen metrics from the Phone Frame component inside the page.
SCREEN_W = 393
STATUS_H = 62
SCREEN_H = 844 - STATUS_H  # 782
HEADER_H = 216
CARD_OVERLAP = 32
CARD_Y = HEADER_H - CARD_OVERLAP  # 184
TAB_BAR_H = 56
TAB_BAR_Y = SCREEN_H - TAB_BAR_H  # 726
CARD_H = TAB_BAR_Y - CARD_Y  # 542

# tabler:settings icon geometry (retrieved via iconify MCP).
SETTINGS_GEOMETRY = (
    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066"
    "c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35"
    "a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065"
    "c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37"
    "a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573"
    "c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065 M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0"
)

QUICK_ACTIONS = [
    {
        "name": "我的考勤",
        "color": "#3B82F6",
        "geometry": "M20.942 13.021a9 9 0 1 0-9.407 7.967 M12 7v5l3 3m0 4l2 2l4-4",
    },
    {
        "name": "我的作业",
        "color": "#F97316",
        "geometry": "M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1m3 0v18m4-14h2m-2 4h2",
    },
    {
        "name": "我的活动",
        "color": "#EF4444",
        "geometry": "M5 5a5 5 0 0 1 7 0a5 5 0 0 0 7 0v9a5 5 0 0 1-7 0a5 5 0 0 0-7 0zm0 16v-7",
    },
    {
        "name": "我的报名",
        "color": "#22C55E",
        "geometry": "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2m0 9l2 2l4-4",
    },
]

SERVICE_FEATURES = [
    {
        "name": "任务看板",
        "color": "#A855F7",
        "geometry": "M4 4h6m4 0h6M4 10a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm10 0a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z",
    },
    {
        "name": "班委权限",
        "color": "#EAB308",
        "geometry": "M10 13a2 2 0 1 0 4 0a2 2 0 0 0-4 0m-2 8v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1M15 5a2 2 0 1 0 4 0a2 2 0 0 0-4 0m2 5h2a2 2 0 0 1 2 2v1M5 5a2 2 0 1 0 4 0a2 2 0 0 0-4 0m-2 8v-1a2 2 0 0 1 2-2h2",
    },
    {
        "name": "设置",
        "color": "#A855F7",
        "geometry": SETTINGS_GEOMETRY,
    },
]


def collect_ids(node, ids):
    if isinstance(node, dict):
        if "id" in node:
            ids.add(node["id"])
        for v in node.values():
            collect_ids(v, ids)
    elif isinstance(node, list):
        for item in node:
            collect_ids(item, ids)


def generate_id(existing_ids):
    while True:
        new_id = re.sub(r"[^A-Za-z0-9]", "", uuid4().hex)[:6]
        if new_id and new_id not in existing_ids:
            existing_ids.add(new_id)
            return new_id


def icon_path(path_id, geometry, color, width=24, height=24):
    return {
        "type": "path",
        "id": path_id,
        "name": "Icon",
        "width": width,
        "height": height,
        "viewBox": [0, 0, 24, 24],
        "geometry": geometry,
        "fill": "#00000000",
        "stroke": color,
        "strokeWidth": 2,
        "strokeLinecap": "round",
        "strokeLinejoin": "round",
    }


def icon_container(container_id, highlight_id, children, width, height, fill, corner_radius, shadow_color="$shadow-soft"):
    highlight_w = max(width - 8, 28)
    highlight_h = max(height // 3, 14)
    return {
        "type": "frame",
        "id": container_id,
        "name": "Icon Container",
        "width": width,
        "height": height,
        "fill": fill,
        "cornerRadius": corner_radius,
        "stroke": "#00000000",
        "strokeWidth": 1,
        "effect": {
            "type": "shadow",
            "shadowType": "outer",
            "color": shadow_color,
            "offset": {"x": 0, "y": 2},
            "blur": 6,
        },
        "justifyContent": "center",
        "alignItems": "center",
        "children": children + [
            {
                "type": "frame",
                "id": highlight_id,
                "name": "Highlight",
                "layoutPosition": "absolute",
                "x": 0,
                "y": 0,
                "width": highlight_w,
                "height": highlight_h,
                "fill": "#FFFFFF",
                "cornerRadius": "$rounded-full",
                "opacity": 0.22,
            },
        ],
    }


def quick_action_item(fid, feature, existing_ids):
    icon_id = generate_id(existing_ids)
    highlight_id = generate_id(existing_ids)
    container_id = generate_id(existing_ids)
    label_id = generate_id(existing_ids)
    container = icon_container(
        container_id=container_id,
        highlight_id=highlight_id,
        children=[icon_path(icon_id, feature["geometry"], "$text-inverse")],
        width=48,
        height=48,
        fill=feature["color"],
        corner_radius="$rounded-xl",
    )
    return {
        "type": "frame",
        "id": fid,
        "name": feature["name"],
        "width": "fit_content",
        "height": "fit_content",
        "fill": "#00000000",
        "layout": "vertical",
        "gap": 8,
        "alignItems": "center",
        "children": [
            container,
            {
                "type": "text",
                "id": label_id,
                "name": "Label",
                "fill": "$text-primary",
                "content": feature["name"],
                "fontFamily": "$font-body",
                "fontSize": "$text-size-body",
                "fontWeight": "500",
            },
        ],
    }


def service_feature_item(fid, feature, existing_ids):
    icon_id = generate_id(existing_ids)
    highlight_id = generate_id(existing_ids)
    container_id = generate_id(existing_ids)
    label_id = generate_id(existing_ids)
    container = icon_container(
        container_id=container_id,
        highlight_id=highlight_id,
        children=[icon_path(icon_id, feature["geometry"], "$text-inverse")],
        width=40,
        height=40,
        fill=feature["color"],
        corner_radius="$rounded-md",
    )
    return {
        "type": "frame",
        "id": fid,
        "name": feature["name"],
        "width": 76.25,
        "height": 90,
        "fill": "#00000000",
        "cornerRadius": "$rounded-lg",
        "stroke": "#00000000",
        "strokeWidth": 1,
        "effect": {
            "type": "shadow",
            "shadowType": "outer",
            "color": "$shadow-soft",
            "offset": {"x": 0, "y": 2},
            "blur": 8,
        },
        "layout": "vertical",
        "gap": 8,
        "padding": [8, 0],
        "justifyContent": "center",
        "alignItems": "center",
        "children": [
            container,
            {
                "type": "text",
                "id": label_id,
                "name": "Label",
                "fill": "$text-primary",
                "content": feature["name"],
                "fontFamily": "$font-body",
                "fontSize": "$text-size-caption",
                "fontWeight": "500",
            },
        ],
    }


def build_profile_page(existing_ids):
    screen_id = generate_id(existing_ids)

    # Header IDs
    header_id = generate_id(existing_ids)
    settings_row_id = generate_id(existing_ids)
    settings_icon_id = generate_id(existing_ids)
    profile_row_id = generate_id(existing_ids)
    avatar_id = generate_id(existing_ids)
    info_id = generate_id(existing_ids)
    name_row_id = generate_id(existing_ids)
    name_text_id = generate_id(existing_ids)
    tag_id = generate_id(existing_ids)
    tag_text_id = generate_id(existing_ids)
    class_text_id = generate_id(existing_ids)

    # Card IDs
    card_id = generate_id(existing_ids)
    quick_row_id = generate_id(existing_ids)
    service_section_id = generate_id(existing_ids)
    service_title_id = generate_id(existing_ids)
    grid_id = generate_id(existing_ids)
    row1_id = generate_id(existing_ids)
    row2_id = generate_id(existing_ids)

    # Tab bar ID
    tab_bar_id = generate_id(existing_ids)

    header = {
        "type": "frame",
        "id": header_id,
        "name": "Header",
        "layoutPosition": "absolute",
        "x": 0,
        "y": 0,
        "width": SCREEN_W,
        "height": HEADER_H,
        "fill": "$accent",
        "layout": "vertical",
        "gap": 16,
        "padding": [24, 24, 24, 24],
        "children": [
            {
                "type": "frame",
                "id": settings_row_id,
                "name": "Settings Row",
                "width": "fill_container",
                "height": 24,
                "layout": "horizontal",
                "justifyContent": "end",
                "alignItems": "center",
                "fill": "#00000000",
                "children": [
                    {
                        "type": "path",
                        "id": settings_icon_id,
                        "name": "Icon-settings",
                        "width": 24,
                        "height": 24,
                        "viewBox": [0, 0, 24, 24],
                        "geometry": SETTINGS_GEOMETRY,
                        "fill": "#00000000",
                        "stroke": "$text-inverse",
                        "strokeWidth": 2,
                        "strokeLinecap": "round",
                        "strokeLinejoin": "round",
                    }
                ],
            },
            {
                "type": "frame",
                "id": profile_row_id,
                "name": "Profile Row",
                "width": "fill_container",
                "height": "fit_content",
                "layout": "horizontal",
                "gap": 16,
                "alignItems": "center",
                "fill": "#00000000",
                "children": [
                    {
                        "type": "ellipse",
                        "id": avatar_id,
                        "name": "Avatar",
                        "width": 64,
                        "height": 64,
                        "fill": "$surface-elevated",
                    },
                    {
                        "type": "frame",
                        "id": info_id,
                        "name": "Profile Info",
                        "width": "fill_container",
                        "height": "fit_content",
                        "layout": "vertical",
                        "gap": 4,
                        "justifyContent": "center",
                        "fill": "#00000000",
                        "children": [
                            {
                                "type": "frame",
                                "id": name_row_id,
                                "name": "Name Row",
                                "width": "fill_container",
                                "height": "fit_content",
                                "layout": "horizontal",
                                "gap": 8,
                                "alignItems": "center",
                                "fill": "#00000000",
                                "children": [
                                    {
                                        "type": "text",
                                        "id": name_text_id,
                                        "name": "Name",
                                        "fill": "$text-inverse",
                                        "content": "张三",
                                        "fontFamily": "$font-heading",
                                        "fontSize": "$text-size-title",
                                        "fontWeight": "700",
                                    },
                                    {
                                        "type": "frame",
                                        "id": tag_id,
                                        "name": "Role Tag",
                                        "height": 24,
                                        "fill": "$accent-100",
                                        "cornerRadius": "$rounded-full",
                                        "layout": "vertical",
                                        "padding": [0, 8],
                                        "justifyContent": "center",
                                        "alignItems": "center",
                                        "children": [
                                            {
                                                "type": "text",
                                                "id": tag_text_id,
                                                "name": "Role Text",
                                                "fill": "$text-inverse",
                                                "content": "学习委员",
                                                "fontFamily": "$font-caption",
                                                "fontSize": "$text-size-caption",
                                                "fontWeight": "600",
                                            }
                                        ],
                                    },
                                ],
                            },
                            {
                                "type": "text",
                                "id": class_text_id,
                                "name": "Class",
                                "opacity": 0.8,
                                "fill": "$text-inverse",
                                "content": "计算机学院 · 计算机科学与技术 · 2021级1班",
                                "fontFamily": "$font-body",
                                "fontSize": "$text-size-body",
                                "fontWeight": "normal",
                            },
                        ],
                    },
                ],
            },
        ],
    }

    quick_row = {
        "type": "frame",
        "id": quick_row_id,
        "name": "Quick Actions",
        "width": "fill_container",
        "height": "fit_content",
        "layout": "horizontal",
        "justifyContent": "space_between",
        "alignItems": "start",
        "fill": "#00000000",
        "children": [
            quick_action_item(generate_id(existing_ids), f, existing_ids)
            for f in QUICK_ACTIONS
        ],
    }

    service_row_items = [generate_id(existing_ids) for _ in range(len(SERVICE_FEATURES))]

    service_row = {
        "type": "frame",
        "id": row1_id,
        "name": "Grid Row",
        "width": "fill_container",
        "height": 90,
        "layout": "horizontal",
        "gap": 8,
        "justifyContent": "start",
        "alignItems": "center",
        "fill": "#00000000",
        "children": [service_feature_item(fid, f, existing_ids) for fid, f in zip(service_row_items, SERVICE_FEATURES)],
    }

    service_section = {
        "type": "frame",
        "id": service_section_id,
        "name": "Service Section",
        "width": "fill_container",
        "height": "fit_content",
        "layout": "vertical",
        "gap": 16,
        "fill": "#00000000",
        "children": [
            {
                "type": "text",
                "id": service_title_id,
                "name": "Section Title",
                "fill": "$text-primary",
                "content": "服务与功能",
                "fontFamily": "$font-heading",
                "fontSize": "$text-size-subhead",
                "fontWeight": "600",
            },
            {
                "type": "frame",
                "id": grid_id,
                "name": "Feature Grid",
                "width": "fill_container",
                "height": "fit_content",
                "layout": "vertical",
                "gap": 8,
                "fill": "#00000000",
                "children": [service_row],
            },
        ],
    }

    card = {
        "type": "frame",
        "id": card_id,
        "name": "Content Card",
        "layoutPosition": "absolute",
        "x": 0,
        "y": CARD_Y,
        "width": SCREEN_W,
        "height": CARD_H,
        "fill": "$surface",
        "cornerRadius": [24, 24, 0, 0],
        "layout": "vertical",
        "gap": 32,
        "padding": [24, 24, 24, 24],
        "children": [quick_row, service_section],
    }

    tab_bar_ref = {
        "type": "ref",
        "id": tab_bar_id,
        "ref": "kDswP",
        "name": "Tab Bar",
        "layoutPosition": "absolute",
        "x": 0,
        "y": TAB_BAR_Y,
        "width": SCREEN_W,
        "height": TAB_BAR_H,
        "descendants": {
            # Highlight "我的"
            "wBQpb": {"fill": "$accent"},
            "zLIl4": {"fill": "$accent"},
            # Explicitly mute the others
            "ZfjjQ": {"fill": "$text-muted"},
            "XK489": {"fill": "$text-muted"},
            "Y9kyYt": {"fill": "$text-muted"},
            "ODyg3": {"fill": "$text-muted"},
            "imrpu": {"fill": "$text-muted"},
            "CEMHS": {"fill": "$text-muted"},
            "noez7": {"fill": "$text-muted"},
            "J9nrM": {"fill": "$text-muted"},
        },
    }

    screen = {
        "type": "frame",
        "id": screen_id,
        "name": "Screen Area",
        "width": "fill_container",
        "height": "fill_container",
        "fill": "$accent",
        "layout": "none",
        "children": [header, card, tab_bar_ref],
    }

    return screen


def find_personal_center_page(doc):
    for child in doc.get("children", []):
        if child.get("id") == "a3uMZY":
            return child
    raise RuntimeError("Personal center page (a3uMZY) not found")


def main():
    if not os.path.exists(BACKUP_PATH):
        shutil.copy2(PEN_PATH, BACKUP_PATH)
        print(f"Backup created: {BACKUP_PATH}")
    else:
        print(f"Backup already exists: {BACKUP_PATH}")

    with open(PEN_PATH, "r", encoding="utf-8") as f:
        doc = json.load(f)

    existing_ids = set()
    collect_ids(doc, existing_ids)

    page = find_personal_center_page(doc)
    new_screen = build_profile_page(existing_ids)

    # Find the Phone Frame ref inside the personal center page and replace its
    # Screen Area descendant (id "n9xLw") entirely.
    for child in page.get("children", []):
        if child.get("type") == "ref" and child.get("ref") == "lPWz4":
            descendants = child.setdefault("descendants", {})
            descendants["n9xLw"] = new_screen
            break
    else:
        raise RuntimeError("Phone Frame ref (lPWz4) not found in personal center page")

    with open(PEN_PATH, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
    print(f"Updated personal center page in {PEN_PATH}")


if __name__ == "__main__":
    main()
