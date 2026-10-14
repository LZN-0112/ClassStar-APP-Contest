#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""优化 Pencil 设计稿中的文件列表、下载统计、导出档案三个页面。"""

import json
import os
import re
import shutil
import subprocess

PEN_FILE = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
EXPORT_DIR = r"D:\校园班级事务智能管理助手\exports\home_redesign_v3"
PENCIL_CMD = r"C:\Users\13929\.trae-cn\binaries\node\versions\24.16.0\pencil.cmd"
TMP_PEN = r"D:\校园班级事务智能管理助手\optimize_file_pages_tmp.pen"
EXPORT_CMDS_FILE = r"D:\校园班级事务智能管理助手\optimize_file_pages_export_cmds.txt"

# Iconify Tabler 图标 SVG body（通过 mcp_iconify 获取）
ICON_BODIES = {
    "chevron-left": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m15 6l-6 6l6 6"/>',
    "chevron-right": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 18l6-6-6-6"/>',
    "adjustments": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 10a2 2 0 1 0 4 0a2 2 0 0 0-4 0m2-6v4m0 4v8m4-4a2 2 0 1 0 4 0a2 2 0 0 0-4 0m2-12v10m0 4v2m4-13a2 2 0 1 0 4 0a2 2 0 0 0-4 0m2-3v1m0 4v11"/>',
    "folder": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2"/>',
    "search": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0-14 0m18 11l-6-6"/>',
    "file-type-pdf": r'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M5 12V5a2 2 0 0 1 2-2h7l5 5v4M5 18h1.5a1.5 1.5 0 0 0 0-3H5v6m12-3h2m1-3h-3v6m-6-6v6h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2z"/></g>',
    "presentation": r'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 4h18M4 4v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4m-8 12v4m-3 0h6"/><path d="m8 12l3-3l2 2l3-3"/></g>',
    "file-zip": r'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M6 20.735A2 2 0 0 1 5 19V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2h-1"/><path d="M11 17a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2a2 2 0 0 1 2-2m0-12h-1m3 2h-1m-1 2h-1m3 2h-1m-1 2h-1m3 2h-1"/></g>',
    "file-type-doc": r'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M5 12V5a2 2 0 0 1 2-2h7l5 5v4M5 15v6h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2zm15 1.5a1.5 1.5 0 0 0-3 0v3a1.5 1.5 0 0 0 3 0M12.5 15a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-3 0v-3a1.5 1.5 0 0 1 1.5-1.5z"/></g>',
    "sort-descending": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h9m-9 6h7m-7 6h7m4-3l3 3l3-3m-3-9v12"/>',
    "chart-bar": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 13a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zm12-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zM9 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zM4 20h14"/>',
    "trending-up": r'<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m3 17l6-6l4 4l8-8"/><path d="M14 7h7v7"/></g>',
    "archive": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2m2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8m-9 4h4"/>',
    "table": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm0 5h18M10 3v18"/>',
    "check": r'<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m5 12l5 5L20 7"/>',
}


def icon_geometry(name: str) -> str:
    """从 Iconify SVG body 中提取 path 的 d 属性并合并。"""
    body = ICON_BODIES[name]
    paths = re.findall(r'd="([^"]+)"', body)
    return " ".join(paths)


def uid(page_id: str, name: str) -> str:
    return f"{page_id}_{name}"


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


def make_path(name: str, stroke: str, node_id: str, icon_name: str = None, size: int = 24) -> dict:
    return {
        "type": "path",
        "id": node_id,
        "name": icon_name or name,
        "geometry": icon_geometry(name),
        "viewBox": [0, 0, 24, 24],
        "fill": "#00000000",
        "width": size,
        "height": size,
        "stroke": stroke,
        "strokeWidth": 2,
        "strokeLinejoin": "round",
        "strokeLinecap": "round",
    }


def make_icon_container(icon_name: str, fill: str, stroke: str, node_id: str, size: int = 40, icon_size: int = 24) -> dict:
    return {
        "type": "frame",
        "id": node_id,
        "name": "Icon Container",
        "width": size,
        "height": size,
        "fill": fill,
        "cornerRadius": "$rounded-lg",
        "justifyContent": "center",
        "alignItems": "center",
        "children": [
            make_path(icon_name, stroke, f"{node_id}_path", icon_name, icon_size)
        ],
    }


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


def make_header(page_id: str, title: str, theme: str, light: str,
                header_icon: str, top_right_icon: str = None) -> dict:
    header = {
        "type": "frame",
        "id": uid(page_id, "header"),
        "name": "Header",
        "width": "fill_container",
        "height": 150,
        "fill": make_gradient(theme, light),
        "layout": "vertical",
        "padding": [24, 20, 20, 20],
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

    if top_right_icon:
        header["children"].append(
            make_path(
                top_right_icon,
                "#FFFFFF",
                uid(page_id, "top_right_icon"),
                top_right_icon,
                size=24,
            )
        )
        header["children"][-1]["layoutPosition"] = "absolute"
        header["children"][-1]["x"] = 349
        header["children"][-1]["y"] = 28

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


def make_search_box(page_id: str) -> dict:
    return {
        "type": "frame",
        "id": uid(page_id, "search_box"),
        "name": "SearchBox",
        "width": "fill_container",
        "height": 44,
        "fill": "#F1F3F5",
        "cornerRadius": "$rounded-lg",
        "layout": "horizontal",
        "gap": 8,
        "padding": [0, 12],
        "alignItems": "center",
        "children": [
            make_path("search", "#ADB5BD", uid(page_id, "search_icon"), "Search"),
            {
                "type": "text",
                "id": uid(page_id, "search_text"),
                "name": "Placeholder",
                "content": "搜索文件",
                "fill": "#ADB5BD",
                "fontFamily": "$font-body",
                "fontSize": "$text-size-body",
                "fontWeight": "normal",
            },
        ],
    }


def make_filter_tag(page_id: str, text: str, selected: bool, theme: str, suffix: str) -> dict:
    bg = theme if selected else "#F1F3F5"
    color = "#FFFFFF" if selected else "#495057"
    return {
        "type": "frame",
        "id": uid(page_id, f"filter_{suffix}"),
        "name": text,
        "padding": [6, 14],
        "fill": bg,
        "cornerRadius": "$rounded-full",
        "justifyContent": "center",
        "alignItems": "center",
        "children": [
            {
                "type": "text",
                "id": uid(page_id, f"filter_text_{suffix}"),
                "name": "TagText",
                "content": text,
                "fill": color,
                "fontFamily": "$font-body",
                "fontSize": "$text-size-body",
                "fontWeight": "600",
            }
        ],
    }


def make_filter_row(page_id: str, theme: str) -> dict:
    return {
        "type": "frame",
        "id": uid(page_id, "filter_row"),
        "name": "FilterRow",
        "width": "fill_container",
        "height": 32,
        "layout": "horizontal",
        "gap": 10,
        "alignItems": "center",
        "children": [
            make_filter_tag(page_id, "全部", True, theme, "all"),
            make_filter_tag(page_id, "文档", False, theme, "doc"),
            make_filter_tag(page_id, "压缩包", False, theme, "zip"),
        ],
    }


def make_file_item(page_id: str, suffix: str, title: str, subtitle: str,
                   icon: str, icon_color: str, icon_tint: str) -> dict:
    return {
        "type": "frame",
        "id": uid(page_id, f"file_item_{suffix}"),
        "name": title,
        "width": "fill_container",
        "height": 64,
        "layout": "horizontal",
        "gap": 12,
        "padding": [0, 4],
        "alignItems": "center",
        "justifyContent": "space_between",
        "children": [
            make_icon_container(icon, icon_tint, icon_color, uid(page_id, f"icon_{suffix}")),
            {
                "type": "frame",
                "id": uid(page_id, f"text_{suffix}"),
                "name": "Text",
                "width": "fill_container",
                "height": "fill_container",
                "layout": "vertical",
                "gap": 4,
                "justifyContent": "center",
                "children": [
                    {
                        "type": "text",
                        "id": uid(page_id, f"title_{suffix}"),
                        "name": "Title",
                        "content": title,
                        "fill": "$text-primary",
                        "fontFamily": "$font-heading",
                        "fontSize": "$text-size-subhead",
                        "fontWeight": "600",
                    },
                    {
                        "type": "text",
                        "id": uid(page_id, f"subtitle_{suffix}"),
                        "name": "Subtitle",
                        "content": subtitle,
                        "fill": "$text-secondary",
                        "fontFamily": "$font-body",
                        "fontSize": "$text-size-caption",
                        "fontWeight": "normal",
                    },
                ],
            },
            make_path("chevron-right", "$text-muted", uid(page_id, f"arrow_{suffix}"), "Arrow"),
        ],
    }


def make_download_item(page_id: str, suffix: str, title: str, subtitle: str,
                       icon: str, icon_color: str, icon_tint: str,
                       count: int, theme: str) -> dict:
    return {
        "type": "frame",
        "id": uid(page_id, f"dl_item_{suffix}"),
        "name": title,
        "width": "fill_container",
        "height": 64,
        "layout": "horizontal",
        "gap": 12,
        "padding": [0, 4],
        "alignItems": "center",
        "justifyContent": "space_between",
        "children": [
            make_icon_container(icon, icon_tint, icon_color, uid(page_id, f"icon_{suffix}")),
            {
                "type": "frame",
                "id": uid(page_id, f"text_{suffix}"),
                "name": "Text",
                "width": "fill_container",
                "height": "fill_container",
                "layout": "vertical",
                "gap": 4,
                "justifyContent": "center",
                "children": [
                    {
                        "type": "text",
                        "id": uid(page_id, f"title_{suffix}"),
                        "name": "Title",
                        "content": title,
                        "fill": "$text-primary",
                        "fontFamily": "$font-heading",
                        "fontSize": "$text-size-subhead",
                        "fontWeight": "600",
                    },
                    {
                        "type": "text",
                        "id": uid(page_id, f"subtitle_{suffix}"),
                        "name": "Subtitle",
                        "content": subtitle,
                        "fill": "$text-secondary",
                        "fontFamily": "$font-body",
                        "fontSize": "$text-size-caption",
                        "fontWeight": "normal",
                    },
                ],
            },
            {
                "type": "frame",
                "id": uid(page_id, f"right_{suffix}"),
                "name": "Right",
                "gap": 4,
                "alignItems": "center",
                "children": [
                    {
                        "type": "text",
                        "id": uid(page_id, f"count_{suffix}"),
                        "name": "Count",
                        "content": str(count),
                        "fill": theme,
                        "fontFamily": "$font-heading",
                        "fontSize": "$text-size-title",
                        "fontWeight": "700",
                    },
                    make_path("trending-up", theme, uid(page_id, f"trend_{suffix}"), "TrendingUp", size=14),
                    make_path("chevron-right", "$text-muted", uid(page_id, f"arrow_{suffix}"), "Arrow"),
                ],
            },
        ],
    }


def make_list_card(page_id: str, children: list) -> dict:
    return {
        "type": "frame",
        "id": uid(page_id, "list_card"),
        "name": "Card",
        "width": "fill_container",
        "fill": "$surface",
        "cornerRadius": "$rounded-xl",
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
        "padding": 12,
        "children": children,
    }


def make_export_input(page_id: str, value: str) -> dict:
    return {
        "type": "frame",
        "id": uid(page_id, "archive_name_input"),
        "name": "ArchiveNameInput",
        "width": "fill_container",
        "height": 52,
        "fill": "#F1F3F5",
        "cornerRadius": "$rounded-lg",
        "layout": "vertical",
        "justifyContent": "center",
        "padding": [0, 16],
        "children": [
            {
                "type": "text",
                "id": uid(page_id, "archive_name_text"),
                "name": "Value",
                "content": value,
                "fill": "$text-primary",
                "fontFamily": "$font-body",
                "fontSize": "$text-size-body",
                "fontWeight": "500",
            }
        ],
    }


def make_export_card(page_id: str, suffix: str, title: str, subtitle: str,
                     icon: str, icon_color: str, selected: bool, theme: str) -> dict:
    children = [
        make_icon_container(icon, icon_color, "#FFFFFF", uid(page_id, f"export_icon_{suffix}"), size=48, icon_size=28),
        {
            "type": "frame",
            "id": uid(page_id, f"export_text_{suffix}"),
            "name": "Text",
            "width": "fill_container",
            "height": "fill_container",
            "layout": "vertical",
            "gap": 4,
            "justifyContent": "center",
            "children": [
                {
                    "type": "text",
                    "id": uid(page_id, f"export_title_{suffix}"),
                    "name": "Title",
                    "content": title,
                    "fill": "$text-primary",
                    "fontFamily": "$font-heading",
                    "fontSize": "$text-size-subhead",
                    "fontWeight": "600",
                },
                {
                    "type": "text",
                    "id": uid(page_id, f"export_subtitle_{suffix}"),
                    "name": "Subtitle",
                    "content": subtitle,
                    "fill": "$text-secondary",
                    "fontFamily": "$font-body",
                    "fontSize": "$text-size-caption",
                    "fontWeight": "normal",
                },
            ],
        },
    ]
    if selected:
        children.append(
            {
                "type": "frame",
                "id": uid(page_id, f"check_wrapper_{suffix}"),
                "name": "CheckWrapper",
                "layoutPosition": "absolute",
                "x": 309,
                "y": 44,
                "width": 24,
                "height": 24,
                "justifyContent": "center",
                "alignItems": "center",
                "children": [
                    make_path("check", theme, uid(page_id, f"check_{suffix}"), "Check")
                ],
            }
        )

    return {
        "type": "frame",
        "id": uid(page_id, f"export_card_{suffix}"),
        "name": title,
        "width": "fill_container",
        "height": 84,
        "fill": "$surface",
        "cornerRadius": "$rounded-xl",
        "stroke": theme if selected else "#00000000",
        "strokeWidth": 2 if selected else 1,
        "effect": {
            "type": "shadow",
            "shadowType": "outer",
            "color": "$shadow-soft",
            "offset": {"x": 0, "y": 2},
            "blur": 8,
        },
        "layout": "horizontal",
        "gap": 16,
        "padding": [0, 16],
        "alignItems": "center",
        "justifyContent": "flex_start",
        "children": children,
    }


# 三个目标页面的配置
PAGES = {
    "eGEci": {
        "title": "文件列表",
        "theme": "#20C997",
        "light": "#38D9A9",
        "header_icon": "folder",
        "top_right_icon": "adjustments",
        "button": "上传文件",
        "build_content": lambda pid, cfg: {
            "type": "frame",
            "id": uid(pid, "content"),
            "name": "Content",
            "width": "fill_container",
            "height": "fill_container",
            "fill": "$bg",
            "layout": "vertical",
            "gap": 16,
            "padding": [0, 20, 80, 20],
            "children": [
                make_header(pid, cfg["title"], cfg["theme"], cfg["light"], cfg["header_icon"], cfg["top_right_icon"]),
                make_search_box(pid),
                make_filter_row(pid, cfg["theme"]),
                make_list_card(pid, [
                    make_file_item(pid, "pdf", "高数资料.pdf", "2.3 MB · 上周上传", "file-type-pdf", "#FA5252", "#FFF0F0"),
                    make_file_item(pid, "ppt", "班会PPT.pptx", "5.1 MB · 昨天", "presentation", "#FF922B", "#FFF4E6"),
                    make_file_item(pid, "zip", "活动照片.zip", "18 MB · 本月", "file-zip", "#FAB005", "#FFFBE6"),
                    make_file_item(pid, "doc", "团课学习.docx", "1.2 MB · 本月", "file-type-doc", "#339AF0", "#E8F4FD"),
                ]),
                make_bottom_button(pid, cfg["button"], cfg["theme"], cfg["light"]),
            ],
        },
    },
    "r2oVI": {
        "title": "下载统计",
        "theme": "#9775FA",
        "light": "#B197FC",
        "header_icon": "chart-bar",
        "top_right_icon": "sort-descending",
        "button": "导出统计",
        "build_content": lambda pid, cfg: {
            "type": "frame",
            "id": uid(pid, "content"),
            "name": "Content",
            "width": "fill_container",
            "height": "fill_container",
            "fill": "$bg",
            "layout": "vertical",
            "gap": 16,
            "padding": [0, 20, 80, 20],
            "children": [
                make_header(pid, cfg["title"], cfg["theme"], cfg["light"], cfg["header_icon"], cfg["top_right_icon"]),
                make_list_card(pid, [
                    make_download_item(pid, "pdf", "高数资料.pdf", "PDF 文档", "file-type-pdf", "#FA5252", "#FFF0F0", 128, cfg["theme"]),
                    make_download_item(pid, "ppt", "班会PPT.pptx", "PPT 演示文稿", "presentation", "#FF922B", "#FFF4E6", 96, cfg["theme"]),
                    make_download_item(pid, "zip", "活动照片.zip", "ZIP 压缩包", "file-zip", "#FAB005", "#FFFBE6", 64, cfg["theme"]),
                    make_download_item(pid, "doc", "团课学习.docx", "Word 文档", "file-type-doc", "#339AF0", "#E8F4FD", 52, cfg["theme"]),
                ]),
                make_bottom_button(pid, cfg["button"], cfg["theme"], cfg["light"]),
            ],
        },
    },
    "N2AT3U": {
        "title": "导出档案",
        "theme": "#FA8C16",
        "light": "#FFC078",
        "header_icon": "archive",
        "top_right_icon": None,
        "button": "确认导出",
        "build_content": lambda pid, cfg: {
            "type": "frame",
            "id": uid(pid, "content"),
            "name": "Content",
            "width": "fill_container",
            "height": "fill_container",
            "fill": "$bg",
            "layout": "vertical",
            "gap": 16,
            "padding": [0, 20, 80, 20],
            "children": [
                make_header(pid, cfg["title"], cfg["theme"], cfg["light"], cfg["header_icon"], cfg["top_right_icon"]),
                make_export_input(pid, "2024-2025学年班级档案"),
                {
                    "type": "text",
                    "id": uid(pid, "section_title"),
                    "name": "SectionTitle",
                    "fill": "$text-secondary",
                    "content": "导出格式",
                    "fontFamily": "$font-body",
                    "fontSize": "$text-size-body",
                    "fontWeight": "500",
                },
                make_export_card(pid, "pdf", "PDF 文档", "适合打印与汇报", "file-type-pdf", "#FA5252", True, cfg["theme"]),
                make_export_card(pid, "excel", "Excel 表格", "含详细数据", "table", "#51CF66", False, cfg["theme"]),
                make_export_card(pid, "word", "Word 总结", "一键生成工作总结", "file-type-doc", "#339AF0", False, cfg["theme"]),
                make_bottom_button(pid, cfg["button"], cfg["theme"], cfg["light"]),
            ],
        },
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
        if page_id not in PAGES:
            continue

        cfg = PAGES[page_id]
        ref_node = None
        for child in node.get("children", []):
            if child.get("type") == "ref" and child.get("ref") == "lPWz4":
                ref_node = child
                break

        if ref_node is None:
            print(f"未找到 {page_id} 的 Phone Frame 引用，跳过")
            continue

        ref_node["descendants"] = {
            "JIHZi": make_status_bar(page_id, cfg["theme"]),
            "n9xLw": cfg["build_content"](page_id, cfg),
        }
        modified.append(page_id)
        print(f"已更新页面: {page_id} - {cfg['title']}")

    with open(PEN_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"已保存: {PEN_FILE}")

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
