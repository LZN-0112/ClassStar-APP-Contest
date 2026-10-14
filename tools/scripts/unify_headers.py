#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""将 9 个页面的状态栏与 Header 合并为同一个父节点，消除两者之间的缝隙。"""

import json
import copy
import uuid

PEN = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"

PAGES = {
    "a33CF4": {"title": "班级设置", "gradient": ["#1E3A8A", "#3B82F6"]},
    "eGEci": {"title": "文件列表", "gradient": ["#0284C7", "#38BDF8"]},
    "r2oVI": {"title": "下载统计", "gradient": ["#6B8CB0", "#AFCBE6"]},
    "N2AT3U": {"title": "导出档案", "gradient": ["#003D82", "#0062FF"]},
    "UO7T4": {"title": "账号与安全", "gradient": ["#0891B2", "#67E8F9"]},
    "R0OZPD": {"title": "消息通知设置", "gradient": ["#8CB9FF", "#F0E6FF"]},
    "YoFn3": {"title": "隐私设置", "gradient": ["#5A7D9A", "#B9C9D9"]},
    "I8Dld": {"title": "通用设置", "gradient": ["#8A9BAE", "#D6DDE2"]},
    "TfDPf": {"title": "帮助与反馈", "gradient": ["#3B82F6", "#93C5FD"]},
}

STATUS_BAR_H = 62
HEADER_H = 220
TOTAL_H = STATUS_BAR_H + HEADER_H


def gradient_fill(color_from, color_to):
    return {
        "type": "gradient",
        "gradientType": "linear",
        "enabled": True,
        "rotation": 180,
        "size": {"height": 1},
        "colors": [
            {"color": color_from, "position": 0},
            {"color": color_to, "position": 1},
        ],
    }


def new_id():
    return uuid.uuid4().hex[:12]


def find_node(root, predicate):
    """DFS 查找第一个符合条件的节点。"""
    if isinstance(root, dict):
        if predicate(root):
            return root
        for value in root.values():
            found = find_node(value, predicate)
            if found is not None:
                return found
    elif isinstance(root, list):
        for item in root:
            found = find_node(item, predicate)
            if found is not None:
                return found
    return None


def find_page(doc, page_id):
    for child in doc["children"]:
        if child.get("id") == page_id:
            return child
    return None


def find_phone_ref(page):
    for child in page.get("children", []):
        if child.get("type") == "ref" and child.get("ref") == "lPWz4":
            return child
    return None


def build_status_row():
    """构建透明背景的状态栏行（时间 + 信号/电量），文字强制白色。"""
    return {
        "type": "frame",
        "id": new_id(),
        "name": "Status Bar",
        "width": "fill_container",
        "height": STATUS_BAR_H,
        "fill": "#00000000",
        "padding": [12, 24, 0, 24],
        "justifyContent": "space_between",
        "alignItems": "center",
        "layout": "horizontal",
        "children": [
            {
                "type": "text",
                "id": new_id(),
                "name": "Time",
                "fill": "#FFFFFF",
                "content": "9:41",
                "fontFamily": "$font-data",
                "fontSize": "$text-size-body",
                "fontWeight": "600",
            },
            {
                "type": "frame",
                "id": new_id(),
                "name": "Status Icons",
                "gap": 6,
                "alignItems": "center",
                "layout": "horizontal",
                "children": [
                    {
                        "type": "text",
                        "id": new_id(),
                        "name": "Signal",
                        "fill": "#FFFFFF",
                        "content": "◉◉◉◉",
                        "fontFamily": "$font-caption",
                        "fontSize": "$text-size-body",
                        "fontWeight": "normal",
                    },
                    {
                        "type": "text",
                        "id": new_id(),
                        "name": "Battery",
                        "fill": "#FFFFFF",
                        "content": "100%",
                        "fontFamily": "$font-data",
                        "fontSize": "$text-size-body",
                        "fontWeight": "normal",
                    },
                ],
            },
        ],
    }


def clean_header(header):
    """将 Header 改为透明背景，适配垂直布局的父节点。"""
    h = copy.deepcopy(header)

    h.update({
        "width": "fill_container",
        "height": HEADER_H,
        "fill": "#00000000",
        "stroke": "#00000000",
        "cornerRadius": [0, 0, 0, 0],
        "layout": "vertical",
        "gap": 12,
        "padding": [20, 20, 20, 20],
        "justifyContent": "start",
    })
    h.pop("layoutPosition", None)
    h.pop("x", None)
    h.pop("y", None)

    # 标题白色大字
    title = find_node(h, lambda n: isinstance(n, dict) and n.get("name") == "Title")
    if title:
        title.update({
            "fill": "#FFFFFF",
            "fontSize": "$text-size-display",
            "fontWeight": "700",
        })
        title.pop("x", None)
        title.pop("y", None)

    # 返回箭头
    top_row = find_node(h, lambda n: isinstance(n, dict) and n.get("name") in ("Top Row", "Nav"))
    if top_row:
        top_row.update({
            "width": "fill_container",
            "height": 24,
            "layout": "horizontal",
        })
        top_row.pop("x", None)
        top_row.pop("y", None)
        back = find_node(top_row, lambda n: isinstance(n, dict) and (n.get("name") == "Back" or "chevron-left" in n.get("name", "")))
        if back:
            back.update({"stroke": "#FFFFFF", "width": 28, "height": 28})

    # 装饰图标统一白色描边
    for node in _all_nodes(h):
        if isinstance(node, dict) and node.get("type") == "path" and node.get("opacity") == 0.15:
            node.update({
                "width": 120,
                "height": 120,
                "stroke": "#FFFFFF",
                "strokeWidth": 1.5,
                "fill": "none",
            })

    return h


def _all_nodes(root):
    """返回所有节点（用于查找装饰图标）。"""
    result = []
    if isinstance(root, dict):
        result.append(root)
        for value in root.values():
            result.extend(_all_nodes(value))
    elif isinstance(root, list):
        for item in root:
            result.extend(_all_nodes(item))
    return result


def process_page(page, spec):
    phone_ref = find_phone_ref(page)
    if phone_ref is None:
        raise RuntimeError(f"页面 {page['id']} 未找到 Phone Frame 引用")

    descendants = phone_ref.setdefault("descendants", {})
    c1, c2 = spec["gradient"]

    # 从 Screen Area 中取出 Header，并移除旧的统一背景占位
    content_ovr = descendants.setdefault("n9xLw", {})
    content_children = content_ovr.setdefault("children", [])

    header = None
    new_content_children = []
    for child in content_children:
        if not isinstance(child, dict):
            new_content_children.append(child)
            continue
        name = child.get("name", "")
        if name == "Header":
            header = child
            continue
        if name == "Unified Header Background":
            continue
        new_content_children.append(child)

    if header is None:
        # 兼容：Header 可能已经被包进 Unified Header 中
        header = find_node(descendants, lambda n: isinstance(n, dict) and n.get("name") == "Header")
        if header is None:
            raise RuntimeError(f"页面 {page['id']} 未找到 Header")

    content_ovr["children"] = new_content_children
    content_ovr.update({
        "type": "frame",
        "width": "fill_container",
        "height": "fill_container",
        "fill": "$bg",
        "layout": "vertical",
    })

    # 构建统一的父节点：包含状态栏行 + Header
    wrapper = {
        "type": "frame",
        "id": "JIHZi",
        "name": "Unified Header",
        "width": "fill_container",
        "height": TOTAL_H,
        "fill": gradient_fill(c1, c2),
        "cornerRadius": [0, 0, 24, 24],
        "layout": "vertical",
        "gap": 0,
        "children": [build_status_row(), clean_header(header)],
    }

    descendants["JIHZi"] = wrapper


def main():
    with open(PEN, "r", encoding="utf-8") as f:
        doc = json.load(f)

    for page_id, spec in PAGES.items():
        page = find_page(doc, page_id)
        if page is None:
            print(f"警告：未找到页面 {page_id}")
            continue
        process_page(page, spec)
        print(f"已处理：{spec['title']} ({page_id})")

    with open(PEN, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)

    print("全部页面顶部已合并为一个父节点")


if __name__ == "__main__":
    main()
