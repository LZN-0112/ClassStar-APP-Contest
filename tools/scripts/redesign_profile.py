#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Redesign the personal center page (a3uMZY) in the .pen file."""

import json
import os
import re
import shutil
from uuid import uuid4

PEN_PATH = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
BACKUP_PATH = PEN_PATH + ".bak"

SETTINGS_GEOMETRY = (
    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066"
    "c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35"
    "a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065"
    "c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37"
    "a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573"
    "c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065 M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0"
)

FEATURES = [
    {
        "name": "我的考勤",
        "color": "#60A5FA",
        "geometry": "M20.942 13.021a9 9 0 1 0-9.407 7.967 M12 7v5l3 3m0 4l2 2l4-4",
    },
    {
        "name": "我的作业",
        "color": "#FDBA74",
        "geometry": "M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1m3 0v18m4-14h2m-2 4h2",
    },
    {
        "name": "我的活动",
        "color": "#FCA5A5",
        "geometry": "M5 5a5 5 0 0 1 7 0a5 5 0 0 0 7 0v9a5 5 0 0 1-7 0a5 5 0 0 0-7 0zm0 16v-7",
    },
    {
        "name": "我的报名",
        "color": "#86EFAC",
        "geometry": "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2m0 9l2 2l4-4",
    },
    {
        "name": "任务看板",
        "color": "#C084FC",
        "geometry": "M4 4h6m4 0h6M4 10a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm10 0a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z",
    },
    {
        "name": "班委权限",
        "color": "#FDE047",
        "geometry": "M10 13a2 2 0 1 0 4 0a2 2 0 0 0-4 0m-2 8v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1M15 5a2 2 0 1 0 4 0a2 2 0 0 0-4 0m2 5h2a2 2 0 0 1 2 2v1M5 5a2 2 0 1 0 4 0a2 2 0 0 0-4 0m-2 8v-1a2 2 0 0 1 2-2h2",
    },
    {
        "name": "设置",
        "color": "#C084FC",
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


def feature_item(fid, feature, existing_ids):
    icon_id = generate_id(existing_ids)
    highlight_id = generate_id(existing_ids)
    label_id = generate_id(existing_ids)
    container_id = generate_id(existing_ids)
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
            {
                "type": "frame",
                "id": container_id,
                "name": "Icon Container",
                "width": 40,
                "height": 40,
                "fill": feature["color"],
                "cornerRadius": "$rounded-md",
                "stroke": "#00000000",
                "strokeWidth": 1,
                "effect": {
                    "type": "shadow",
                    "shadowType": "outer",
                    "color": "$shadow-soft",
                    "offset": {"x": 0, "y": 2},
                    "blur": 6,
                },
                "justifyContent": "center",
                "alignItems": "center",
                "children": [
                    {
                        "type": "path",
                        "id": icon_id,
                        "name": "Icon",
                        "geometry": feature["geometry"],
                        "viewBox": [0, 0, 24, 24],
                        "fill": "#00000000",
                        "width": 24,
                        "height": 24,
                        "stroke": "$text-inverse",
                        "strokeWidth": 2,
                        "strokeLinejoin": "round",
                        "strokeLinecap": "round",
                    },
                    {
                        "type": "frame",
                        "id": highlight_id,
                        "layoutPosition": "absolute",
                        "x": 0,
                        "y": 0,
                        "name": "Highlight",
                        "opacity": 0.28,
                        "width": 36,
                        "height": 16,
                        "fill": "#FFFFFF",
                        "cornerRadius": 12,
                    },
                ],
            },
            {
                "type": "text",
                "id": label_id,
                "name": "Label",
                "fill": "$text-primary",
                "content": feature["name"],
                "fontFamily": "$font-body",
                "fontSize": 13,
                "fontWeight": "500",
            },
        ],
    }


def build_profile_page(existing_ids):
    header_id = generate_id(existing_ids)
    settings_row_id = generate_id(existing_ids)
    settings_icon_id = generate_id(existing_ids)
    profile_row_id = generate_id(existing_ids)
    avatar_id = generate_id(existing_ids)
    info_id = generate_id(existing_ids)
    name_row_id = generate_id(existing_ids)
    name_id = generate_id(existing_ids)
    tag_id = generate_id(existing_ids)
    tag_text_id = generate_id(existing_ids)
    class_id = generate_id(existing_ids)

    service_section_id = generate_id(existing_ids)
    section_title_id = generate_id(existing_ids)
    grid_id = generate_id(existing_ids)
    row1_id = generate_id(existing_ids)
    row2_id = generate_id(existing_ids)
    spacer_id = generate_id(existing_ids)

    # Top colored header
    header = {
        "type": "frame",
        "id": header_id,
        "name": "Header",
        "width": "fill_container",
        "fill": "$accent",
        "cornerRadius": "$rounded-lg",
        "layout": "vertical",
        "gap": 16,
        "padding": 20,
        "children": [
            {
                "type": "frame",
                "id": settings_row_id,
                "name": "Settings Row",
                "width": "fill_container",
                "height": 24,
                "justifyContent": "end",
                "alignItems": "center",
                "children": [
                    {
                        "type": "path",
                        "id": settings_icon_id,
                        "name": "Icon-settings",
                        "geometry": SETTINGS_GEOMETRY,
                        "viewBox": [0, 0, 24, 24],
                        "fill": "#00000000",
                        "width": 24,
                        "height": 24,
                        "stroke": "$text-inverse",
                        "strokeWidth": 2,
                        "strokeLinejoin": "round",
                        "strokeLinecap": "round",
                    }
                ],
            },
            {
                "type": "frame",
                "id": profile_row_id,
                "name": "Profile Row",
                "width": "fill_container",
                "layout": "horizontal",
                "gap": 16,
                "alignItems": "center",
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
                        "layout": "vertical",
                        "gap": 4,
                        "justifyContent": "center",
                        "children": [
                            {
                                "type": "frame",
                                "id": name_row_id,
                                "name": "Name Row",
                                "width": "fill_container",
                                "layout": "horizontal",
                                "gap": 8,
                                "alignItems": "center",
                                "children": [
                                    {
                                        "type": "text",
                                        "id": name_id,
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
                                        "gap": 4,
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
                                "id": class_id,
                                "name": "Class",
                                "opacity": 0.8,
                                "fill": "$text-inverse",
                                "content": "计算机学院 · 计算机科学与技术 · 2021级1班",
                                "fontFamily": "$font-body",
                                "fontSize": "$text-size-caption",
                                "fontWeight": "normal",
                            },
                        ],
                    },
                ],
            },
        ],
    }

    # Service grid
    row1_items = [generate_id(existing_ids) for _ in range(4)]
    row2_items = [generate_id(existing_ids) for _ in range(3)]

    row1 = {
        "type": "frame",
        "id": row1_id,
        "name": "Row 1",
        "width": "fill_container",
        "height": 90,
        "gap": 16,
        "justifyContent": "start",
        "alignItems": "center",
        "children": [feature_item(fid, FEATURES[i], existing_ids) for i, fid in enumerate(row1_items)],
    }
    row2 = {
        "type": "frame",
        "id": row2_id,
        "name": "Row 2",
        "width": "fill_container",
        "height": 90,
        "gap": 16,
        "justifyContent": "start",
        "alignItems": "center",
        "children": [feature_item(fid, FEATURES[i + 4], existing_ids) for i, fid in enumerate(row2_items)],
    }

    service_section = {
        "type": "frame",
        "id": service_section_id,
        "name": "Service Section",
        "width": "fill_container",
        "layout": "vertical",
        "gap": 16,
        "children": [
            {
                "type": "text",
                "id": section_title_id,
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
                "layout": "vertical",
                "gap": 16,
                "children": [row1, row2],
            },
        ],
    }

    spacer = {
        "type": "frame",
        "id": spacer_id,
        "name": "Spacer",
        "width": "fill_container",
        "height": "fill_container",
        "layout": "vertical",
    }

    tab_bar_ref = {
        "id": "aWeRr",
        "type": "ref",
        "ref": "kDswP",
        "name": "Tab Bar",
        "width": 393,
        "height": 56,
        "layoutPosition": "absolute",
        "x": 0,
        "y": 726,
        "descendants": {
            "wBQpb": {
                "fill": "$accent",
                "stroke": "$accent",
            },
            "zLIl4": {
                "fill": "$accent",
            },
        },
    }

    content = {
        "type": "frame",
        "id": "ojQzq",
        "name": "Content",
        "width": "fill_container",
        "height": "fill_container",
        "layout": "vertical",
        "gap": 16,
        "padding": [0, 20, 56, 20],
        "children": [header, service_section, spacer, tab_bar_ref],
    }
    return content


def find_personal_center(doc):
    for child in doc.get("children", []):
        if child.get("id") == "a3uMZY":
            return child
    raise RuntimeError("Personal center page (a3uMZY) not found")


def main():
    # Backup
    if not os.path.exists(BACKUP_PATH):
        shutil.copy2(PEN_PATH, BACKUP_PATH)
        print(f"Backup created: {BACKUP_PATH}")
    else:
        print(f"Backup already exists: {BACKUP_PATH}")

    with open(PEN_PATH, "r", encoding="utf-8") as f:
        doc = json.load(f)

    existing_ids = set()
    collect_ids(doc, existing_ids)

    page = find_personal_center(doc)

    # The page has one child: the Phone Frame ref (lPWz4) with descendants override.
    for child in page.get("children", []):
        if child.get("type") == "ref" and child.get("ref") == "lPWz4":
            descendants = child.setdefault("descendants", {})
            n9xLw = descendants.get("n9xLw")
            if n9xLw is None:
                n9xLw = {
                    "type": "frame",
                    "id": generate_id(existing_ids),
                    "name": "Content",
                    "width": "fill_container",
                    "height": "fill_container",
                    "layout": "vertical",
                }
                descendants["n9xLw"] = n9xLw
            n9xLw.update(build_profile_page(existing_ids))
            break
    else:
        raise RuntimeError("Phone Frame ref not found in personal center page")

    with open(PEN_PATH, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
    print(f"Updated {PEN_PATH}")


if __name__ == "__main__":
    main()
