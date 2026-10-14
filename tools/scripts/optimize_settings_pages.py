#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""优化 Pencil 设计稿中的 4 个设置类页面。"""

import json
import os
import re
import shutil
import subprocess

PEN_FILE = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
EXPORT_DIR = r"D:\校园班级事务智能管理助手\exports\home_redesign_v3"
PENCIL_CMD = r"C:\Users\13929\.trae-cn\binaries\node\versions\24.16.0\pencil.cmd"
TMP_PEN = r"D:\校园班级事务智能管理助手\optimize_settings_tmp.pen"
EXPORT_CMDS_FILE = r"D:\校园班级事务智能管理助手\optimize_settings_export_cmds.txt"

# Iconify Tabler 图标 SVG body（通过 mcp_iconify 获取）
ICON_BODIES = {
    "chevron-left": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m15 6l-6 6l6 6"/>',
    "chevron-right": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 18l6-6-6-6"/>',
    "shield-lock": r'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M12 3a12 12 0 0 0 8.5 3A12 12 0 0 1 12 21A12 12 0 0 1 3.5 6A12 12 0 0 0 12 3"/><path d="M11 11a1 1 0 1 0 2 0a1 1 0 1 0-2 0m1 1v2.5"/></g>',
    "bell": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H4a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6M9 17v1a3 3 0 0 0 6 0v-1"/>',
    "lock": r'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M5 13a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0-2 0m-3-5V7a4 4 0 1 1 8 0v4"/></g>',
    "settings-cog": r'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M12.003 21c-.732.001-1.465-.438-1.678-1.317a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c.886.215 1.325.957 1.318 1.694"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0m8.001 7a2 2 0 1 0 4 0a2 2 0 1 0-4 0m2-3.5V17m0 4v1.5m3.031-5.25l-1.299.75m-3.463 2l-1.3.75m0-3.5l1.3.75m3.463 2l1.3.75"/></g>',
    "speakerphone": r'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M18 8a3 3 0 0 1 0 6m-8-6v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-5"/><path d="m12 8l4.524-3.77A.9.9 0 0 1 18 4.922v12.156a.9.9 0 0 1-1.476.692L12 14H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/></g>',
    "book": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6v13m9-13v13m9-13v13"/>',
    "clock-check": r'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M20.942 13.021a9 9 0 1 0-9.407 7.967"/><path d="M12 7v5l3 3m0 4l2 2l4-4"/></g>',
    "flag": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a5 5 0 0 1 7 0a5 5 0 0 0 7 0v9a5 5 0 0 1-7 0a5 5 0 0 0-7 0zm0 16v-7"/>',
    "settings": r'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0"/></g>',
    "user": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0-8 0M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>',
    "phone": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    "calendar-check": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.5 21H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6M16 3v4M8 3v4m-4 4h16m-5 8l2 2l4-4"/>',
    "language": r'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M9 6.371C9 10.789 6.761 13 4 13m0-6.629h7"/><path d="M5 9c0 2.144 2.252 3.908 6 4m1 7l4-9l4 9m-.9-2h-6.2M6.694 3l.793.582"/></g>',
    "moon": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3h.393a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 12 2.992z"/>',
    "trash": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7h16m-10 4v6m4-6v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>',
    "info-circle": r'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0m9-3h.01"/><path d="M11 12h1v4h1"/></g>',
    "key": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m16.555 3.843l3.602 3.602a2.877 2.877 0 0 1 0 4.069l-2.643 2.643a2.877 2.877 0 0 1-4.069 0l-.301-.301l-6.558 6.558a2 2 0 0 1-1.239.578L5.172 21H4a1 1 0 0 1-.993-.883L3 20v-1.172a2 2 0 0 1 .467-1.284l.119-.13L4 17h2v-2h2v-2l2.144-2.144l-.301-.301a2.877 2.877 0 0 1 0-4.069l2.643-2.643a2.877 2.877 0 0 1 4.069 0M15 9h.01"/>',
    "mail": r'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m3 7l9 6l9-6"/></g>',
    "device-mobile": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2zm5-1h2m-1 13v.01"/>',
    "logout": r'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2"/><path d="M9 12h12l-3-3m0 6l3-3"/></g>',
}


def icon_geometry(name: str) -> str:
    """从 Iconify SVG body 中提取 path 的 d 属性并合并。"""
    body = ICON_BODIES[name]
    paths = re.findall(r'd="([^"]+)"', body)
    return " ".join(paths)


def uid(page_id: str, name: str) -> str:
    return f"{page_id}_{name}"


def make_path(name: str, stroke: str, node_id: str, icon_name: str = None) -> dict:
    return {
        "type": "path",
        "id": node_id,
        "name": icon_name or name,
        "geometry": icon_geometry(name),
        "viewBox": [0, 0, 24, 24],
        "fill": "#00000000",
        "width": 24,
        "height": 24,
        "stroke": stroke,
        "strokeWidth": 2,
        "strokeLinejoin": "round",
        "strokeLinecap": "round",
    }


def make_icon_container(icon_name: str, fill: str, stroke: str, node_id: str) -> dict:
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
            make_path(icon_name, stroke, f"{node_id}_path", icon_name)
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


def make_tag(text: str, bg: str, color: str, page_id: str, suffix: str) -> dict:
    return {
        "type": "frame",
        "id": uid(page_id, f"tag_{suffix}"),
        "name": "Tag",
        "padding": [4, 10],
        "fill": bg,
        "cornerRadius": "$rounded-full",
        "justifyContent": "center",
        "alignItems": "center",
        "children": [
            {
                "type": "text",
                "id": uid(page_id, f"tag_text_{suffix}"),
                "name": "TagText",
                "content": text,
                "fill": color,
                "fontFamily": "$font-caption",
                "fontSize": "$text-size-caption",
                "fontWeight": "600",
            }
        ],
    }


def make_item(page_id: str, item: dict, theme: str, tint: str) -> dict:
    destructive = item.get("destructive", False)
    icon_color = "#C92A2A" if destructive else item.get("icon_color", theme)
    icon_tint = "#FFE3E3" if destructive else item.get("icon_tint", tint)
    title_color = "#C92A2A" if destructive else "$text-primary"
    subtitle_color = "#C92A2A" if destructive else "$text-secondary"
    arrow_color = "#C92A2A" if destructive else "$text-muted"

    text_children = [
        {
            "type": "text",
            "id": uid(page_id, f"title_{item['title']}"),
            "name": "Title",
            "content": item["title"],
            "fill": title_color,
            "fontFamily": "$font-heading",
            "fontSize": "$text-size-subhead",
            "fontWeight": "600",
        }
    ]
    if item.get("subtitle"):
        text_children.append(
            {
                "type": "text",
                "id": uid(page_id, f"subtitle_{item['title']}"),
                "name": "Subtitle",
                "content": item["subtitle"],
                "fill": subtitle_color,
                "fontFamily": "$font-body",
                "fontSize": "$text-size-caption",
                "fontWeight": "normal",
            }
        )

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
    if item.get("tag"):
        right_children.append(make_tag(item["tag"]["text"], item["tag"]["bg"], item["tag"]["color"], page_id, item["title"]))
    elif "switch" in item:
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
    right_children.append(make_path("chevron-right", arrow_color, uid(page_id, f"arrow_{item['title']}"), "Arrow"))

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
            make_icon_container(item["icon"], icon_tint, icon_color, uid(page_id, f"icon_{item['title']}")),
            text_frame,
            right_frame,
        ],
    }


def make_group_card(page_id: str, group: dict, theme: str, tint: str) -> dict:
    card = {
        "type": "frame",
        "id": uid(page_id, f"card_{group['name']}"),
        "name": group["name"],
        "width": "fill_container",
        "fill": "#FFF5F5" if group.get("destructive") else "$surface",
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
        "children": [make_item(page_id, item, theme, tint) for item in group["items"]],
    }
    return card


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
    for group in page["groups"]:
        children.append(make_group_card(page_id, group, page["theme"], page["tint"]))
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


# 四个页面的配置
PAGES = {
    "UO7T4": {
        "title": "账号与安全",
        "theme": "#12B886",
        "light": "#38D9A9",
        "tint": "#D3F9E8",
        "header_icon": "shield-lock",
        "button": "保存",
        "groups": [
            {
                "name": "账号绑定",
                "items": [
                    {"title": "修改密码", "icon": "key"},
                    {
                        "title": "绑定手机",
                        "icon": "device-mobile",
                        "tag": {"text": "已绑定", "bg": "#D3F9E8", "color": "#099268"},
                    },
                    {
                        "title": "绑定邮箱",
                        "icon": "mail",
                        "tag": {"text": "未绑定", "bg": "#F1F3F5", "color": "#868E96"},
                    },
                ],
            },
            {
                "name": "账号操作",
                "destructive": True,
                "items": [
                    {"title": "退出登录", "icon": "logout", "destructive": True},
                ],
            },
        ],
    },
    "R0OZPD": {
        "title": "消息通知设置",
        "theme": "#F06595",
        "light": "#FAA2C1",
        "tint": "#FCE0EC",
        "header_icon": "bell",
        "button": None,
        "groups": [
            {"name": "班级通知", "items": [{"title": "班级通知", "subtitle": "接收班级通知", "icon": "speakerphone", "icon_color": "#F06595", "icon_tint": "#FCE0EC", "switch": True}]},
            {"name": "作业提醒", "items": [{"title": "作业提醒", "subtitle": "截止前提醒", "icon": "book", "icon_color": "#4DABF7", "icon_tint": "#D6EBFF", "switch": True}]},
            {"name": "考勤提醒", "items": [{"title": "考勤提醒", "subtitle": "签到开始前提醒", "icon": "clock-check", "icon_color": "#51CF66", "icon_tint": "#D3F9D8", "switch": True}]},
            {"name": "活动提醒", "items": [{"title": "活动提醒", "subtitle": "报名截止提醒", "icon": "flag", "icon_color": "#FF922B", "icon_tint": "#FFE8CC", "switch": True}]},
            {"name": "系统消息", "items": [{"title": "系统消息", "subtitle": "版本更新与公告", "icon": "settings", "icon_color": "#ADB5BD", "icon_tint": "#F1F3F5", "switch": False}]},
        ],
    },
    "YoFn3": {
        "title": "隐私设置",
        "theme": "#748FFC",
        "light": "#91A7FF",
        "tint": "#E0E7FF",
        "header_icon": "lock",
        "button": "保存",
        "groups": [
            {
                "name": "隐私权限",
                "items": [
                    {"title": "个人资料可见", "icon": "user", "tag": {"text": "同班可见", "bg": "#E0E7FF", "color": "#5C7CFA"}},
                    {"title": "手机号可见", "icon": "phone", "tag": {"text": "仅班委可见", "bg": "#C7D2FE", "color": "#4C6EF5"}},
                    {"title": "考勤记录可见", "icon": "calendar-check", "tag": {"text": "仅自己可见", "bg": "#A5B4FC", "color": "#364FC7"}},
                ],
            },
        ],
    },
    "I8Dld": {
        "title": "通用设置",
        "theme": "#6C9D8A",
        "light": "#8ABFAF",
        "tint": "#E2F0EC",
        "header_icon": "settings-cog",
        "button": "确定",
        "groups": [
            {
                "name": "基础偏好",
                "items": [
                    {"title": "语言", "icon": "language", "status": "简体中文"},
                    {"title": "深色模式", "icon": "moon", "status": "跟随系统"},
                ],
            },
            {
                "name": "存储管理",
                "items": [
                    {"title": "清除缓存", "icon": "trash", "status": "12.5 MB", "status_color": "#6C9D8A", "status_bold": True},
                ],
            },
            {
                "name": "关于",
                "items": [
                    {"title": "关于", "icon": "info-circle", "status": "v1.0.0"},
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
            # 找到 Phone Frame 引用节点
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
    """通过 Pencil CLI 导出指定页面为 PNG（绕开 MCP 服务端缓存的旧状态）。"""
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
