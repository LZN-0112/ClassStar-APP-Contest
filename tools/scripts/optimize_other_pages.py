#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""优化 Pencil 设计稿中的 3 个独立页面（签到方式选择、班级设置、帮助与反馈）。"""

import json
import os
import re
import shutil
import subprocess

PEN_FILE = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
EXPORT_DIR = r"D:\校园班级事务智能管理助手\exports\home_redesign_v3"
PENCIL_CMD = r"C:\Users\13929\.trae-cn\binaries\node\versions\24.16.0\pencil.cmd"
TMP_PEN = r"D:\校园班级事务智能管理助手\optimize_other_pages_tmp.pen"
EXPORT_CMDS_FILE = r"D:\校园班级事务智能管理助手\optimize_other_pages_export_cmds.txt"

# Iconify Tabler 图标 SVG body（通过 mcp_iconify 获取）
ICON_BODIES = {
    "chevron-left": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m15 6l-6 6l6 6"/>',
    "chevron-right": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 18l6-6-6-6"/>',
    # 签到方式选择页
    "radar": r'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M21 12h-8a1 1 0 1 0-1 1v8a9 9 0 0 0 9-9"/><path d="M16 9a5 5 0 1 0-7 7"/><path d="M20.486 9A9 9 0 1 0 9.004 20.495"/></g>',
    "map-pin-filled": r'<path fill="currentColor" d="M18.364 4.636a9 9 0 0 1 .203 12.519l-.203.21l-4.243 4.242a3 3 0 0 1-4.097.135l-.144-.135l-4.244-4.243A9 9 0 0 1 18.364 4.636M12 8a3 3 0 1 0 0 6a3 3 0 0 0 0-6"/>',
    "qrcode": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zm3 12v.01M14 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zM7 7v.01M4 15a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zm13-8v.01M14 14h3m3 0v.01M14 14v3m0 3h3m0-3h3m0 0v3"/>',
    "camera-filled": r'<path fill="currentColor" d="M15 3a2 2 0 0 1 1.995 1.85L17 5a1 1 0 0 0 .883.993L18 6h1a3 3 0 0 1 2.995 2.824L22 9v9a3 3 0 0 1-2.824 2.995L19 21H5a3 3 0 0 1-2.995-2.824L2 18V9a3 3 0 0 1 2.824-2.995L5 6h1a1 1 0 0 0 1-1a2 2 0 0 1 1.85-1.995L9 3zm-3 7a3 3 0 0 0-2.985 2.698l-.011.152L9 13l.004.15A3 3 0 1 0 12 10"/>',
    "key-filled": r'<path fill="currentColor" d="M14.52 2c1.029 0 2.015.409 2.742 1.136l3.602 3.602a3.877 3.877 0 0 1 0 5.483l-2.643 2.643a3.88 3.88 0 0 1-4.941.452l-.105-.078l-5.882 5.883a3 3 0 0 1-1.68.843l-.22.027l-.221.009H4c-1.014 0-1.867-.759-1.991-1.823L2 20v-1.172c0-.704.248-1.386.73-1.96l.149-.161l.414-.414A1 1 0 0 1 4 16h1v-1a1 1 0 0 1 .883-.993L6 14h1v-1a1 1 0 0 1 .206-.608l.087-.1l1.468-1.469l-.076-.103a3.9 3.9 0 0 1-.678-1.963L8 8.521c0-1.029.409-2.015 1.136-2.742l2.643-2.643A3.88 3.88 0 0 1 14.52 2m.495 5h-.02a2 2 0 1 0 0 4h.02a2 2 0 1 0 0-4"/>',
    # 班级设置页
    "school": r'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M22 9L12 5L2 9l10 4zv6"/><path d="M6 10.6V16a6 3 0 0 0 12 0v-5.4"/></g>',
    "users-group": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 13a2 2 0 1 0 4 0a2 2 0 0 0-4 0m-2 8v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1M15 5a2 2 0 1 0 4 0a2 2 0 0 0-4 0m2 5h2a2 2 0 0 1 2 2v1M5 5a2 2 0 1 0 4 0a2 2 0 0 0-4 0m-2 8v-1a2 2 0 0 1 2-2h2"/>',
    # tabler:bullhorn 在当前 Iconify 版本中不存在，使用语义相近的 speakerphone 替代
    "speakerphone": r'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M18 8a3 3 0 0 1 0 6m-8-6v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-5"/><path d="m12 8l4.524-3.77A.9.9 0 0 1 18 4.922v12.156a.9.9 0 0 1-1.476.692L12 14H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/></g>',
    "shield-check": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.46 20.846A12 12 0 0 1 3.5 6A12 12 0 0 0 12 3a12 12 0 0 0 8.5 3a12 12 0 0 1-.09 7.06M15 19l2 2l4-4"/>',
    "trash-filled": r'<path fill="currentColor" d="M20 6a1 1 0 0 1 .117 1.993L20 8h-.081L19 19a3 3 0 0 1-2.824 2.995L16 22H8c-1.598 0-2.904-1.249-2.992-2.75l-.005-.167L4.08 8H4a1 1 0 0 1-.117-1.993L4 6zm-10 4a1 1 0 0 0-1 1v6a1 1 0 0 0 2 0v-6a1 1 0 0 0-1-1m4 0a1 1 0 0 0-1 1v6a1 1 0 0 0 2 0v-6a1 1 0 0 0-1-1m0-8a2 2 0 0 1 2 2a1 1 0 0 1-1.993.117L14 4h-4l-.007.117A1 1 0 0 1 8 4a2 2 0 0 1 1.85-1.995L10 2z"/>',
    # 帮助与反馈页
    "message-circle-question": r'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M15.02 19.52c-2.341.736-5 .606-7.32-.52L3 20l1.3-3.9C1.976 12.663 2.874 8.228 6.4 5.726c3.526-2.501 8.59-2.296 11.845.48c1.649 1.407 2.575 3.253 2.742 5.152M19 22v.01"/><path d="M19 19a2.003 2.003 0 0 0 .914-3.782a1.98 1.98 0 0 0-2.414.483"/></g>',
    "help-circle-filled": r'<path fill="currentColor" d="M12 2c5.523 0 10 4.477 10 10a10 10 0 0 1-19.995.324L2 12l.004-.28C2.152 6.327 6.57 2 12 2m0 13a1 1 0 0 0-.993.883L11 16l.007.127a1 1 0 0 0 1.986 0L13 16.01l-.007-.127A1 1 0 0 0 12 15m1.368-6.673a2.98 2.98 0 0 0-3.631.728a1 1 0 0 0 1.44 1.383l.171-.18a.98.98 0 0 1 1.11-.15a1 1 0 0 1-.34 1.886l-.232.012A1 1 0 0 0 11.997 14a3 3 0 0 0 1.371-5.673"/>',
    "book-2": r'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M19 4v16H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M19 16H7a2 2 0 0 0-2 2M9 8h6"/></g>',
    "headset-filled": r'<path fill="currentColor" d="M12 2a9 9 0 0 1 9 9v6a3 3 0 0 1-2.152 2.879C18.17 21.78 15.31 23 12 23a1 1 0 0 1 0-2c1.889 0 3.482-.482 4.334-1.075A3 3 0 0 1 14 17l.001-3.051l.004-.051A2.995 2.995 0 0 1 17 11h1c.351 0 .688.06 1 .171V11a7 7 0 0 0-13.996-.24L5 11.17c.313-.11.65-.17 1-.17h1a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-6a9 9 0 0 1 9-9"/>',
}


def icon_geometry(name: str) -> str:
    """从 Iconify SVG body 中提取 path 的 d 属性并合并。"""
    body = ICON_BODIES[name]
    paths = re.findall(r'd="([^"]+)"', body)
    return " ".join(paths)


def uid(page_id: str, name: str) -> str:
    return f"{page_id}_{name}"


def is_filled(icon_name: str) -> bool:
    return icon_name.endswith("-filled")


def make_path(name: str, color: str, node_id: str, icon_name: str = None) -> dict:
    filled = is_filled(name)
    return {
        "type": "path",
        "id": node_id,
        "name": icon_name or name,
        "geometry": icon_geometry(name),
        "viewBox": [0, 0, 24, 24],
        "fill": color if filled else "#00000000",
        "width": 24,
        "height": 24,
        "stroke": "#00000000" if filled else color,
        "strokeWidth": 0 if filled else 2,
        "strokeLinejoin": "round",
        "strokeLinecap": "round",
    }


def make_icon_container(icon_name: str, fill: str, color: str, node_id: str) -> dict:
    return {
        "type": "frame",
        "id": node_id,
        "name": "Icon Container",
        "width": 40,
        "height": 40,
        "fill": fill,
        "cornerRadius": "$rounded-lg",
        "justifyContent": "center",
        "alignItems": "center",
        "children": [
            make_path(icon_name, color, f"{node_id}_path", icon_name)
        ],
    }


def make_switch(state: bool, theme: str, page_id: str, suffix: str) -> dict:
    return {
        "type": "frame",
        "id": uid(page_id, f"switch_track_{suffix}"),
        "name": "Switch",
        "width": 44,
        "height": 24,
        "cornerRadius": 12,
        "fill": theme if state else "#E5E7EB",
        "children": [
            {
                "type": "frame",
                "id": uid(page_id, f"switch_thumb_{suffix}"),
                "name": "SwitchThumb",
                "layoutPosition": "absolute",
                "x": 22 if state else 2,
                "y": 2,
                "width": 20,
                "height": 20,
                "cornerRadius": 10,
                "fill": "#FFFFFF",
                "effect": {
                    "type": "shadow",
                    "shadowType": "outer",
                    "color": "#0000001A",
                    "offset": {"x": 0, "y": 2},
                    "blur": 4,
                },
            }
        ],
    }


def make_arrow(theme_or_muted: str, page_id: str, suffix: str) -> dict:
    return make_path("chevron-right", theme_or_muted, uid(page_id, f"arrow_{suffix}"), "Arrow")


def make_title_text(page_id: str, title: str, color: str = "$text-primary", suffix: str = None) -> dict:
    return {
        "type": "text",
        "id": uid(page_id, f"title_{suffix or title}"),
        "name": "Title",
        "content": title,
        "fill": color,
        "fontFamily": "$font-heading",
        "fontSize": "$text-size-subhead",
        "fontWeight": "600",
    }


def make_subtitle_text(page_id: str, subtitle: str, color: str = "$text-secondary", suffix: str = None) -> dict:
    return {
        "type": "text",
        "id": uid(page_id, f"subtitle_{suffix or subtitle}"),
        "name": "Subtitle",
        "content": subtitle,
        "fill": color,
        "fontFamily": "$font-body",
        "fontSize": "$text-size-caption",
        "fontWeight": "normal",
    }


def make_item(page_id: str, item: dict, theme: str, default_tint: str) -> dict:
    destructive = item.get("destructive", False)
    icon_name = item["icon"]
    icon_color = item.get("icon_color", "#C92A2A" if destructive else theme)
    icon_tint = item.get("icon_tint", "#FFE3E3" if destructive else default_tint)
    title_color = "#C92A2A" if destructive else "$text-primary"
    subtitle_color = "#C92A2A" if destructive else "$text-secondary"
    arrow_color = "#C92A2A" if destructive else "$text-muted"

    text_children = [make_title_text(page_id, item["title"], title_color, item["title"])]
    if item.get("subtitle"):
        text_children.append(make_subtitle_text(page_id, item["subtitle"], subtitle_color, item["title"]))

    text_frame = {
        "type": "frame",
        "id": uid(page_id, f"text_{item['title']}"),
        "name": "Text",
        "width": "fill_container",
        "height": "fill_container",
        "layout": "vertical",
        "gap": 4,
        "justifyContent": "center",
        "children": text_children,
    }

    right_children = []
    if "switch" in item:
        right_children.append(make_switch(item["switch"], theme, page_id, item["title"]))
    elif item.get("status"):
        right_children.append(
            {
                "type": "text",
                "id": uid(page_id, f"status_{item['title']}"),
                "name": "Status",
                "content": item["status"],
                "fill": item.get("status_color", "$text-secondary"),
                "fontFamily": "$font-body",
                "fontSize": "$text-size-body",
                "fontWeight": "600" if item.get("status_bold") else "normal",
            }
        )
    if item.get("arrow", True):
        right_children.append(make_arrow(arrow_color, page_id, item["title"]))

    right_frame = {
        "type": "frame",
        "id": uid(page_id, f"right_{item['title']}"),
        "name": "Right",
        "gap": 8,
        "alignItems": "center",
        "children": right_children,
    }

    return {
        "type": "frame",
        "id": uid(page_id, f"item_{item['title']}"),
        "name": item["title"],
        "width": "fill_container",
        "height": 64,
        "layout": "horizontal",
        "gap": 12,
        "alignItems": "center",
        "justifyContent": "space_between",
        "children": [
            make_icon_container(icon_name, icon_tint, icon_color, uid(page_id, f"icon_{item['title']}")),
            text_frame,
            right_frame,
        ],
    }


def make_group_card(page_id: str, group: dict, theme: str, default_tint: str) -> dict:
    destructive = group.get("destructive", False)
    return {
        "type": "frame",
        "id": uid(page_id, f"card_{group['name']}"),
        "name": group["name"],
        "width": "fill_container",
        "fill": "#FFF5F5" if destructive else "$surface",
        "cornerRadius": "$rounded-xl",
        "stroke": "$border",
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
        "padding": 12,
        "children": [make_item(page_id, item, theme, default_tint) for item in group["items"]],
    }


def make_checkin_card(page_id: str, option: dict, theme: str) -> dict:
    selected = option.get("selected", False)
    icon_name = option["icon"]
    icon_color = option["color"]
    icon_tint = option["tint"]
    title = option["title"]
    subtitle = option["subtitle"]

    text_frame = {
        "type": "frame",
        "id": uid(page_id, f"text_{title}"),
        "name": "Text",
        "width": "fill_container",
        "height": "fill_container",
        "layout": "vertical",
        "gap": 4,
        "justifyContent": "center",
        "children": [
            make_title_text(page_id, title, theme if selected else "$text-primary", title),
            make_subtitle_text(page_id, subtitle, "$text-secondary", title),
        ],
    }

    content = {
        "type": "frame",
        "id": uid(page_id, f"content_{title}"),
        "name": "Content",
        "width": "fill_container",
        "height": "fill_container",
        "layout": "horizontal",
        "gap": 12,
        "alignItems": "center",
        "justifyContent": "space_between",
        "children": [
            make_icon_container(icon_name, icon_tint, icon_color, uid(page_id, f"icon_{title}")),
            text_frame,
            make_arrow(theme if selected else "$text-muted", page_id, title),
        ],
    }

    children = [content]
    if selected:
        children.insert(
            0,
            {
                "type": "frame",
                "id": uid(page_id, f"indicator_{title}"),
                "name": "SelectedIndicator",
                "width": 4,
                "height": 24,
                "cornerRadius": 2,
                "fill": theme,
            },
        )

    return {
        "type": "frame",
        "id": uid(page_id, f"card_{title}"),
        "name": title,
        "width": "fill_container",
        "height": 64,
        "layout": "horizontal",
        "gap": 8 if selected else 0,
        "padding": 12,
        "alignItems": "center",
        "fill": "#F0F7FF" if selected else "$surface",
        "cornerRadius": "$rounded-xl",
        "stroke": theme if selected else "$border",
        "strokeWidth": 2 if selected else 1,
        "effect": {
            "type": "shadow",
            "shadowType": "outer",
            "color": "$shadow-soft",
            "offset": {"x": 0, "y": 2},
            "blur": 8,
        },
        "children": children,
    }


def make_feedback_card(page_id: str, theme: str) -> dict:
    return {
        "type": "frame",
        "id": uid(page_id, "card_feedback"),
        "name": "反馈提交",
        "width": "fill_container",
        "fill": "$surface",
        "cornerRadius": "$rounded-xl",
        "stroke": "$border",
        "strokeWidth": 1,
        "effect": {
            "type": "shadow",
            "shadowType": "outer",
            "color": "$shadow-soft",
            "offset": {"x": 0, "y": 2},
            "blur": 8,
        },
        "layout": "vertical",
        "gap": 12,
        "padding": 16,
        "children": [
            {
                "type": "text",
                "id": uid(page_id, "feedback_title"),
                "name": "Title",
                "content": "意见反馈",
                "fill": "$text-primary",
                "fontFamily": "$font-heading",
                "fontSize": "$text-size-subhead",
                "fontWeight": "600",
            },
            {
                "type": "frame",
                "id": uid(page_id, "feedback_input"),
                "name": "TextArea",
                "width": "fill_container",
                "height": 120,
                "fill": "$bg",
                "cornerRadius": "$rounded-lg",
                "stroke": "$border",
                "strokeWidth": 1,
                "padding": 12,
                "children": [
                    {
                        "type": "text",
                        "id": uid(page_id, "feedback_placeholder"),
                        "name": "Placeholder",
                        "content": "请输入您的意见或建议",
                        "fill": "$text-muted",
                        "fontFamily": "$font-body",
                        "fontSize": "$text-size-body",
                        "fontWeight": "normal",
                    }
                ],
            },
        ],
    }


def make_gradient(theme: str, light: str, rotation: int = 135):
    return {
        "type": "gradient",
        "gradientType": "linear",
        "enabled": True,
        "rotation": rotation,
        "size": {"height": 1},
        "colors": [
            {"color": light, "position": 0},
            {"color": theme, "position": 1},
        ],
    }


def make_header(page_id: str, title: str, theme: str, light: str, header_icon: str) -> dict:
    header = {
        "type": "frame",
        "id": uid(page_id, "header"),
        "name": "Header",
        "width": "fill_container",
        "height": 150,
        "fill": make_gradient(theme, light),
        "layout": "vertical",
        "padding": [24, 20],
        "gap": 12,
        "justifyContent": "flex_end",
        "alignItems": "flex_start",
        "children": [
            make_path("chevron-left", "#FFFFFF", uid(page_id, "back_arrow"), "BackArrow"),
            {
                "type": "text",
                "id": uid(page_id, "header_title"),
                "name": "Title",
                "content": title,
                "fill": "$text-inverse",
                "fontFamily": "$font-heading",
                "fontSize": "$text-size-title",
                "fontWeight": "600",
            },
        ],
    }
    header["children"].append(
        {
            "type": "frame",
            "id": uid(page_id, "deco_icon"),
            "name": "DecorationIcon",
            "layoutPosition": "absolute",
            "x": 249,
            "y": 70,
            "width": 64,
            "height": 64,
            "opacity": 0.25,
            "justifyContent": "center",
            "alignItems": "center",
            "children": [
                {
                    "type": "path",
                    "id": uid(page_id, "deco_path"),
                    "name": header_icon,
                    "geometry": icon_geometry(header_icon),
                    "viewBox": [0, 0, 24, 24],
                    "fill": "#00000000",
                    "width": 64,
                    "height": 64,
                    "stroke": "#FFFFFF",
                    "strokeWidth": 1.5,
                    "strokeLinejoin": "round",
                    "strokeLinecap": "round",
                }
            ],
        }
    )
    return header


def make_status_bar(page_id: str, theme: str) -> dict:
    return {
        "type": "frame",
        "id": uid(page_id, "status_bar"),
        "name": "Status Bar",
        "width": "fill_container",
        "height": 62,
        "fill": theme,
        "padding": [12, 24, 0, 24],
        "justifyContent": "space_between",
        "alignItems": "center",
        "children": [
            {
                "type": "text",
                "id": uid(page_id, "time"),
                "name": "Time",
                "fill": "$text-inverse",
                "content": "9:41",
                "fontFamily": "$font-data",
                "fontSize": "$text-size-body",
                "fontWeight": "600",
            },
            {
                "type": "frame",
                "id": uid(page_id, "status_icons"),
                "name": "Status Icons",
                "gap": 6,
                "alignItems": "center",
                "children": [
                    {
                        "type": "text",
                        "id": uid(page_id, "signal"),
                        "name": "Signal",
                        "fill": "$text-inverse",
                        "content": "◉◉◉◉",
                        "fontFamily": "$font-caption",
                        "fontSize": "$text-size-body",
                        "fontWeight": "normal",
                    },
                    {
                        "type": "text",
                        "id": uid(page_id, "battery"),
                        "name": "Battery",
                        "fill": "$text-inverse",
                        "content": "100%",
                        "fontFamily": "$font-data",
                        "fontSize": "$text-size-body",
                        "fontWeight": "normal",
                    },
                ],
            },
        ],
    }


def make_bottom_button(page_id: str, label: str, theme: str, light: str) -> dict:
    return {
        "type": "frame",
        "id": uid(page_id, "bottom_button"),
        "name": label,
        "width": "fill_container",
        "height": 48,
        "fill": make_gradient(theme, light),
        "cornerRadius": "$rounded-xl",
        "effect": {
            "type": "shadow",
            "shadowType": "outer",
            "color": "$shadow-soft",
            "offset": {"x": 0, "y": 4},
            "blur": 12,
        },
        "justifyContent": "center",
        "alignItems": "center",
        "children": [
            {
                "type": "text",
                "id": uid(page_id, "bottom_button_label"),
                "name": "Label",
                "content": label,
                "fill": "$text-inverse",
                "fontFamily": "$font-heading",
                "fontSize": "$text-size-subhead",
                "fontWeight": "700",
            }
        ],
    }


def build_content(page_id: str, page: dict) -> dict:
    children = [make_header(page_id, page["title"], page["theme"], page["light"], page["header_icon"])]
    for option in page.get("options", []):
        children.append(make_checkin_card(page_id, option, page["theme"]))
    for group in page.get("groups", []):
        children.append(make_group_card(page_id, group, page["theme"], page["tint"]))
    if page.get("feedback"):
        children.append(make_feedback_card(page_id, page["theme"]))
    if page.get("button"):
        children.append(make_bottom_button(page_id, page["button"], page["theme"], page["light"]))
    return {
        "type": "frame",
        "id": uid(page_id, "content"),
        "name": "Content",
        "width": "fill_container",
        "height": "fill_container",
        "fill": "$bg",
        "layout": "vertical",
        "gap": 16,
        "padding": [0, 20, 80, 20],
        "children": children,
    }


# 三个目标页面的配置
PAGES = {
    "oRLQ2": {
        "title": "选择签到方式",
        "theme": "#4A90E2",
        "light": "#7AB8F7",
        "tint": "#E8F1FC",
        "header_icon": "radar",
        "button": "下一步",
        "options": [
            {
                "title": "定位签到",
                "subtitle": "基于GPS定位范围验证",
                "icon": "map-pin-filled",
                "color": "#4A90E2",
                "tint": "#E8F1FC",
                "selected": True,
            },
            {
                "title": "二维码签到",
                "subtitle": "扫码完成签到",
                "icon": "qrcode",
                "color": "#9B59B6",
                "tint": "#F5E6FA",
            },
            {
                "title": "水印拍照签到",
                "subtitle": "拍照带时间地点水印",
                "icon": "camera-filled",
                "color": "#FF922B",
                "tint": "#FFF3E0",
            },
            {
                "title": "口令签到",
                "subtitle": "输入4位数字口令",
                "icon": "key-filled",
                "color": "#40C057",
                "tint": "#E6F9EC",
            },
        ],
    },
    "a33CF4": {
        "title": "班级设置",
        "theme": "#3B5BDB",
        "light": "#5C7CFA",
        "tint": "#E0E7FF",
        "header_icon": "school",
        "button": "保存设置",
        "groups": [
            {
                "name": "基础信息",
                "items": [
                    {
                        "title": "班级名称",
                        "icon": "users-group",
                        "icon_color": "#3B5BDB",
                        "icon_tint": "#E0E7FF",
                        "status": "计算机2301班",
                        "status_color": "$text-secondary",
                        "status_bold": True,
                    },
                    {
                        "title": "班级公告",
                        "icon": "speakerphone",
                        "icon_color": "#3B5BDB",
                        "icon_tint": "#E0E7FF",
                        "status": "期中考试通知",
                        "status_color": "$text-secondary",
                        "status_bold": False,
                    },
                ],
            },
            {
                "name": "权限管理",
                "items": [
                    {
                        "title": "入班审核",
                        "subtitle": "开启后需班委同意",
                        "icon": "shield-check",
                        "icon_color": "#3B5BDB",
                        "icon_tint": "#E0E7FF",
                        "switch": True,
                        "arrow": False,
                    },
                ],
            },
            {
                "name": "风险操作",
                "destructive": True,
                "items": [
                    {
                        "title": "解散班级",
                        "icon": "trash-filled",
                        "destructive": True,
                    },
                ],
            },
        ],
    },
    "TfDPf": {
        "title": "帮助与反馈",
        "theme": "#FCC419",
        "light": "#FFD43B",
        "tint": "#FFF9E0",
        "header_icon": "message-circle-question",
        "button": "提交反馈",
        "feedback": True,
        "groups": [
            {
                "name": "帮助入口",
                "items": [
                    {
                        "title": "常见问题",
                        "icon": "help-circle-filled",
                        "icon_color": "#FCC419",
                        "icon_tint": "#FFF9E0",
                    },
                    {
                        "title": "使用教程",
                        "icon": "book-2",
                        "icon_color": "#FF922B",
                        "icon_tint": "#FFF3E0",
                    },
                    {
                        "title": "在线客服",
                        "icon": "headset-filled",
                        "icon_color": "#FA5252",
                        "icon_tint": "#FFE5E5",
                    },
                ],
            },
        ],
    },
}


def modify_pen():
    backup_path = PEN_FILE + ".script.bak"
    shutil.copy2(PEN_FILE, backup_path)
    print(f"已备份: {backup_path}")

    with open(PEN_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    os.makedirs(EXPORT_DIR, exist_ok=True)

    modified = []
    for node in data["children"]:
        page_id = node.get("id")
        if page_id in PAGES:
            page_cfg = PAGES[page_id]
            ref_node = None
            for child in node.get("children", []):
                if child.get("type") == "ref" and child.get("ref") == "lPWz4":
                    ref_node = child
                    break
            if ref_node is None:
                print(f"未找到 {page_id} 的 Phone Frame 引用，跳过")
                continue

            ref_node["descendants"] = {
                "JIHZi": make_status_bar(page_id, page_cfg["theme"]),
                "n9xLw": build_content(page_id, page_cfg),
            }
            modified.append(page_id)
            print(f"已更新页面: {page_id} - {page_cfg['title']}")

    with open(PEN_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"已保存: {PEN_FILE}")
    print(f"导出目录: {EXPORT_DIR}")
    return modified, data


def export_pages(data: dict, node_ids: list) -> list:
    """通过 Pencil CLI 导出指定页面为 PNG。"""
    doc = dict(data)
    doc["version"] = "2.13"
    doc.pop("fileToken", None)

    with open(TMP_PEN, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)

    cmds = [
        f'export_nodes({{ nodeIds: {json.dumps(node_ids)}, outputDir: "{EXPORT_DIR.replace(chr(92), "/")}", scale: 2, format: "png" }})',
        "save()",
        "exit()",
    ]
    with open(EXPORT_CMDS_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(cmds) + "\n")

    subprocess.run(
        [PENCIL_CMD, "interactive", "-i", TMP_PEN, "-o", TMP_PEN + ".out.pen"],
        stdin=open(EXPORT_CMDS_FILE, "r", encoding="utf-8"),
        cwd=os.path.dirname(PEN_FILE),
        check=False,
    )

    exported = []
    for nid in node_ids:
        png_path = os.path.join(EXPORT_DIR, f"{nid}.png")
        if os.path.exists(png_path):
            exported.append(png_path)
            print(f"已导出: {png_path}")
        else:
            print(f"导出失败: {png_path}")
    return exported


if __name__ == "__main__":
    modified, data = modify_pen()
    print(f"共修改 {len(modified)} 个页面: {modified}")
    exported = export_pages(data, modified)
    print(f"成功导出 {len(exported)} 张图片")
