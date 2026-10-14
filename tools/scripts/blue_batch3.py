#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
按新版规范批量重绘 4 个设置类页面：
- R0OZPD 消息通知设置页
- YoFn3  隐私设置页
- I8Dld  通用设置页
- TfDPf  帮助与反馈页

统一品牌蓝色系，通过布局结构差异化形成记忆点。
"""

import json
import os
import random
import string
from pathlib import Path

PEN_FILE = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
EXPORT_DIR = r"D:\校园班级事务智能管理助手\exports\home_redesign_v3"

TARGET_PAGES = {
    "R0OZPD": "消息通知设置页",
    "YoFn3": "隐私设置页",
    "I8Dld": "通用设置页",
    "TfDPf": "帮助与反馈页",
}


def nid(prefix=""):
    """生成 Pencil 风格的随机节点 id。"""
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


# -----------------------------------------------------------------------------
# Tabler 图标路径（从 Iconify 抓取，已内嵌避免运行时依赖网络）
# -----------------------------------------------------------------------------
ICONS = {
    "chevron-left": "M15 18l-6-6 6-6",
    "chevron-right": "M9 18l6-6-6-6",
    "bell": "M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H4a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6M9 17v1a3 3 0 0 0 6 0v-1",
    "book": "M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6v13m9-13v13m9-13v13",
    "clock-check": "M20.942 13.021a9 9 0 1 0-9.407 7.967 M12 7v5l3 3m0 4l2 2l4-4",
    "flag": "M5 5a5 5 0 0 1 7 0a5 5 0 0 0 7 0v9a5 5 0 0 1-7 0a5 5 0 0 0-7 0zm0 16v-7",
    "settings": "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065 M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0",
    "eye": "M10 12a2 2 0 1 0 4 0a2 2 0 0 0-4 0 M21 12q-3.6 6-9 6t-9-6q3.6-6 9-6t9 6",
    "phone": "M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
    "calendar-check": "M11.5 21H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6M16 3v4M8 3v4m-4 4h16m-5 8l2 2l4-4",
    "help-circle": "M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0m9 4v.01 M12 13a2 2 0 0 0 .914-3.782a1.98 1.98 0 0 0-2.414.483",
    "message-circle": "m3 20l1.3-3.9C1.976 12.663 2.874 8.228 6.4 5.726c3.526-2.501 8.59-2.296 11.845.48c3.255 2.777 3.695 7.266 1.029 10.501S11.659 20.922 7.7 19z",
    "language": "M9 6.371C9 10.789 6.761 13 4 13m0-6.629h7 M5 9c0 2.144 2.252 3.908 6 4m1 7l4-9l4 9m-.9-2h-6.2M6.694 3l.793.582",
    "moon": "M12 3h.393a7.5 7.5 0 0 0 7.92 12.446A9 9 0 1 1 12 2.992z",
    "trash": "M4 7h16m-10 4v6m4-6v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3",
    "info-circle": "M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0m9-3h.01 M11 12h1v4h1",
    "shield": "M12 3a12 12 0 0 0 8.5 3A12 12 0 0 1 12 21A12 12 0 0 1 3.5 6A12 12 0 0 0 12 3",
}


# -----------------------------------------------------------------------------
# 通用组件
# -----------------------------------------------------------------------------
def brand_button(label):
    """品牌主蓝色渐变通栏按钮，带柔和投影。"""
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
        children=[text(label, "$text-inverse", "$text-size-subhead", font_weight="600", name="Label")],
    )


def back_arrow(stroke="#FFFFFF"):
    return path("Icon-chevron-left", ICONS["chevron-left"], stroke)


def header(title, gradient_colors, decor_icon_name):
    """
    蓝色系渐变头部：左上角返回箭头、左对齐大标题、
    右下角极简功能线稿装饰图标。
    """
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
                children=[back_arrow(), frame(width=24, height=24)],
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
                children=[path(f"Icon-{decor_icon_name}", ICONS[decor_icon_name], "#FFFFFF55", width=56, height=56, stroke_width=1.5)],
            ),
        ],
    )


def icon_container(size, icon_name, icon_color, bg_color="$accent-50", radius="$rounded-md"):
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


def toggle_switch(on=True):
    """简约开关：开启主蓝色，关闭灰色，带白色圆钮。"""
    track_fill = "$accent" if on else "#D1D5DB"
    knob_x = 26 if on else 2
    return frame(
        name=f"Switch {'On' if on else 'Off'}",
        width=48,
        height=28,
        fill=track_fill,
        cornerRadius=9999,
        children=[
            frame(
                name="Knob",
                layoutPosition="absolute",
                x=knob_x,
                y=4,
                width=20,
                height=20,
                fill="#FFFFFF",
                cornerRadius=9999,
                effect=shadow("#0000001A", y=1, blur=3),
            )
        ],
    )


def row_with_icon_subtitle(icon_name, title, subtitle, right_widgets=None, height=72):
    """左图标 + 标题/副标题 + 右侧控件的列表行。"""
    right_widgets = right_widgets or []
    return frame(
        name=f"Row {title}",
        width="fill_container",
        height=height,
        gap=12,
        padding=[0, 12],
        alignItems="center",
        children=[
            icon_container(40, icon_name, "$accent"),
            frame(
                name="Text",
                width="fill_container",
                height="fill_container",
                layout="vertical",
                gap=4,
                justifyContent="center",
                children=[
                    text(title, "$text-primary", "$text-size-body", font_weight="600", name="Title"),
                    text(subtitle, "$text-secondary", "$text-size-caption", name="Subtitle"),
                ],
            ),
            frame(name="Right", gap=8, alignItems="center", children=right_widgets),
        ],
    )


def permission_tag(label, level=0):
    """权限范围标签，用不同深浅蓝色区分等级。"""
    palettes = [
        ("#DBEAFE", "#1E3A8A"),  # 同班可见：浅蓝底 + 深蓝字
        ("#93C5FD", "#1E40AF"),  # 仅班委可见：中蓝底 + 深蓝字
        ("#60A5FA", "#FFFFFF"),  # 仅自己可见：主蓝底 + 白字
    ]
    bg, fg = palettes[level % len(palettes)]
    return frame(
        name=f"Tag {label}",
        height=26,
        padding=[0, 10],
        fill=bg,
        cornerRadius=9999,
        justifyContent="center",
        alignItems="center",
        children=[text(label, fg, "$text-size-caption", font_weight="600")],
    )


def simple_value_row(label, value, value_color="$text-secondary", value_weight="500", show_arrow=True, height=56):
    """轻量化无图标行：左侧标题 + 右侧值（可带箭头）。"""
    right = [text(value, value_color, "$text-size-body", font_weight=value_weight, name="Value")]
    if show_arrow:
        right.append(path("Icon-chevron-right", ICONS["chevron-right"], "$text-muted"))
    return frame(
        name=f"Row {label}",
        width="fill_container",
        height=height,
        gap=12,
        padding=[0, 12],
        alignItems="center",
        children=[
            text(label, "$text-primary", "$text-size-body", font_weight="500", name="Label"),
            frame(width="fill_container"),
            frame(name="Right", gap=8, alignItems="center", children=right),
        ],
    )


def surface_card(children, name="Card", gap=8, padding=12):
    """带投影的圆角卡片容器。"""
    return frame(
        name=name,
        width="fill_container",
        fill="$surface",
        cornerRadius="$rounded-lg",
        effect=shadow("$shadow-soft", y=2, blur=8),
        layout="vertical",
        gap=gap,
        padding=padding,
        children=children,
    )


# -----------------------------------------------------------------------------
# 页面 1：消息通知设置页
# -----------------------------------------------------------------------------
def build_notification_page():
    items = [
        ("bell", "班级通知", "接收班级通知", True),
        ("book", "作业提醒", "截止前提醒", True),
        ("clock-check", "考勤提醒", "签到开始前提醒", True),
        ("flag", "活动提醒", "报名截止提醒", False),
        ("settings", "系统消息", "版本更新与公告", True),
    ]
    rows = []
    for icon, title, sub, on in items:
        rows.append(
            row_with_icon_subtitle(
                icon,
                title,
                sub,
                right_widgets=[
                    toggle_switch(on),
                    path("Icon-chevron-right", ICONS["chevron-right"], "$text-muted"),
                ],
            )
        )

    return frame(
        name="Content",
        id=nid(),
        width="fill_container",
        height="fill_container",
        fill="$bg",
        layout="vertical",
        gap=0,
        children=[
            header("消息通知设置", ("#8CB9FF", "#F0E6FF"), "bell"),
            frame(
                name="Body",
                width="fill_container",
                height="fill_container",
                layout="vertical",
                gap=16,
                padding=[16, 20, 20, 20],
                children=[surface_card(rows, gap=4)],
            ),
        ],
    )


# -----------------------------------------------------------------------------
# 页面 2：隐私设置页
# -----------------------------------------------------------------------------
def build_privacy_page():
    rows = [
        row_with_icon_subtitle(
            "eye",
            "班级信息可见",
            "控制个人资料展示范围",
            right_widgets=[permission_tag("同班可见", 0)],
        ),
        row_with_icon_subtitle(
            "phone",
            "联系方式可见",
            "控制手机号展示范围",
            right_widgets=[permission_tag("仅班委可见", 1)],
        ),
        row_with_icon_subtitle(
            "calendar-check",
            "考勤记录可见",
            "控制考勤数据展示范围",
            right_widgets=[permission_tag("仅自己可见", 2)],
        ),
    ]
    return frame(
        name="Content",
        id=nid(),
        width="fill_container",
        height="fill_container",
        fill="$bg",
        layout="vertical",
        gap=0,
        children=[
            header("隐私设置", ("#5A7D9A", "#B9C9D9"), "shield"),
            frame(
                name="Body",
                width="fill_container",
                height="fill_container",
                layout="vertical",
                gap=16,
                padding=[16, 20, 20, 20],
                children=[
                    surface_card(rows, gap=4),
                    brand_button("保存"),
                ],
            ),
        ],
    )


# -----------------------------------------------------------------------------
# 页面 3：通用设置页
# -----------------------------------------------------------------------------
def build_general_page():
    def group(title, rows):
        return frame(
            name=f"Group {title}",
            width="fill_container",
            layout="vertical",
            gap=8,
            children=[
                text(title, "$text-secondary", "$text-size-caption", font_weight="600", name="Group Title"),
                frame(
                    name="Rows",
                    width="fill_container",
                    layout="vertical",
                    gap=4,
                    children=rows,
                ),
            ],
        )

    return frame(
        name="Content",
        id=nid(),
        width="fill_container",
        height="fill_container",
        fill="$bg",
        layout="vertical",
        gap=0,
        children=[
            header("通用设置", ("#8A9BAE", "#D6DDE2"), "settings"),
            frame(
                name="Body",
                width="fill_container",
                height="fill_container",
                layout="vertical",
                gap=24,
                padding=[16, 20, 20, 20],
                children=[
                    group(
                        "基础偏好",
                        [
                            simple_value_row("语言", "简体中文"),
                            simple_value_row("深色模式", "跟随系统"),
                        ],
                    ),
                    group(
                        "存储管理",
                        [
                            simple_value_row("清除缓存", "12.5 MB", value_color="$accent", value_weight="700"),
                        ],
                    ),
                    group(
                        "关于",
                        [
                            simple_value_row("关于", "v1.0.0"),
                        ],
                    ),
                ],
            ),
        ],
    )


# -----------------------------------------------------------------------------
# 页面 4：帮助与反馈页
# -----------------------------------------------------------------------------
def help_entry_row(icon_name, title):
    return frame(
        name=f"Row {title}",
        width="fill_container",
        height=56,
        gap=12,
        padding=[0, 12],
        alignItems="center",
        children=[
            icon_container(40, icon_name, "$accent"),
            text(title, "$text-primary", "$text-size-body", font_weight="500", name="Label"),
            frame(width="fill_container"),
            path("Icon-chevron-right", ICONS["chevron-right"], "$text-muted"),
        ],
    )


def build_help_page():
    return frame(
        name="Content",
        id=nid(),
        width="fill_container",
        height="fill_container",
        fill="$bg",
        layout="vertical",
        gap=0,
        children=[
            header("帮助与反馈", ("#3B82F6", "#93C5FD"), "help-circle"),
            frame(
                name="Body",
                width="fill_container",
                height="fill_container",
                layout="vertical",
                gap=16,
                padding=[16, 20, 20, 20],
                children=[
                    surface_card(
                        [
                            help_entry_row("help-circle", "常见问题"),
                            help_entry_row("book", "使用教程"),
                            help_entry_row("message-circle", "在线客服"),
                        ],
                        name="Help Entries",
                        gap=4,
                    ),
                    frame(
                        name="Feedback Card",
                        width="fill_container",
                        height=220,
                        fill="$surface",
                        cornerRadius="$rounded-lg",
                        effect=shadow("$shadow-soft", y=2, blur=8),
                        layout="vertical",
                        gap=10,
                        padding=16,
                        children=[
                            text("意见反馈", "$text-primary", "$text-size-subhead", font_weight="600", name="Card Title"),
                            frame(
                                name="Input Box",
                                width="fill_container",
                                height="fill_container",
                                fill="#FFFFFF",
                                cornerRadius="$rounded-md",
                                stroke="#E5E7EB",
                                strokeWidth=1,
                                padding=12,
                                justifyContent="start",
                                alignItems="start",
                                children=[
                                    text(
                                        "请输入您的意见或建议",
                                        "$text-muted",
                                        "$text-size-body",
                                        name="Placeholder",
                                    )
                                ],
                            ),
                        ],
                    ),
                    brand_button("提交反馈"),
                ],
            ),
        ],
    )


# -----------------------------------------------------------------------------
# 主流程
# -----------------------------------------------------------------------------
PAGE_BUILDERS = {
    "R0OZPD": build_notification_page,
    "YoFn3": build_privacy_page,
    "I8Dld": build_general_page,
    "TfDPf": build_help_page,
}


def load_pen(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_pen(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def patch_page(page_node, new_content):
    """替换 Phone Frame 的 Screen Area，并设置状态栏为白色。"""
    phone_ref = page_node.get("children", [{}])[0]
    if phone_ref.get("type") != "ref" or phone_ref.get("ref") != "lPWz4":
        raise ValueError(f"Page {page_node.get('id')} does not reference Phone Frame lPWz4")
    descendants = phone_ref.setdefault("descendants", {})
    descendants["n9xLw"] = new_content
    descendants["JIHZi"] = {"fill": "#FFFFFF"}


def main():
    print(f"Loading {PEN_FILE}")
    data = load_pen(PEN_FILE)

    pages_by_id = {c.get("id"): c for c in data.get("children", []) if c.get("type") == "frame"}
    for pid, name in TARGET_PAGES.items():
        page = pages_by_id.get(pid)
        if page is None:
            raise ValueError(f"Page not found: {pid} ({name})")
        if page.get("name") != name:
            print(f"Warning: page {pid} name mismatch: {page.get('name')} vs {name}")

    for pid in TARGET_PAGES:
        patch_page(pages_by_id[pid], PAGE_BUILDERS[pid]())
        print(f"Patched page {pid} ({TARGET_PAGES[pid]})")

    backup_path = PEN_FILE + ".backup"
    if not os.path.exists(backup_path):
        os.replace(PEN_FILE, backup_path)
        save_pen(PEN_FILE, data)
        print(f"Backup saved to {backup_path}")
    else:
        save_pen(PEN_FILE, data)
        print("Backup already exists, overwritten .pen file")

    Path(EXPORT_DIR).mkdir(parents=True, exist_ok=True)
    print(f"Export directory ready: {EXPORT_DIR}")
    print("Next step: run `python export_pages.py R0OZPD YoFn3 I8Dld TfDPf` to export PNGs.")


if __name__ == "__main__":
    main()
