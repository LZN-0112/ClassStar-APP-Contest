# -*- coding: utf-8 -*-
"""
校园班级事务智能管理助手 - 新版蓝色系重设计脚本（第 1 批）
直接修改 .pen JSON，仅处理以下 3 个页面：
- 签到方式选择页  (id: oRLQ2)
- 班级设置页      (id: a33CF4)
- 文件列表页      (id: eGEci)
"""
import json
import uuid
from pathlib import Path

PEN_PATH = Path(r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen")


def uid(prefix="n"):
    return f"{prefix}{uuid.uuid4().hex[:8]}"


# ---------------- Iconify Tabler 路径（已合并多 path 为单 geometry） ----------------
ICONS = {
    "chevron-left": "m15 6l-6 6l6 6",
    "search": "M3 10a7 7 0 1 0 14 0a7 7 0 1 0-14 0m18 11l-6-6",
    "map-pin": "M9 11a3 3 0 1 0 6 0a3 3 0 0 0-6 0 M17.657 16.657L13.414 20.9a2 2 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0",
    "qrcode": "M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zm3 12v.01M14 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zM7 7v.01M4 15a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zm13-8v.01M14 14h3m3 0v.01M14 14v3m0 3h3m0-3h3m0 0v3",
    "camera": "M5 7h1a2 2 0 0 0 2-2a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2 M9 13a3 3 0 1 0 6 0a3 3 0 0 0-6 0",
    "key": "m16.555 3.843l3.602 3.602a2.877 2.877 0 0 1 0 4.069l-2.643 2.643a2.877 2.877 0 0 1-4.069 0l-.301-.301l-6.558 6.558a2 2 0 0 1-1.239.578L5.172 21H4a1 1 0 0 1-.993-.883L3 20v-1.172a2 2 0 0 1 .467-1.284l.119-.13L4 17h2v-2h2v-2l2.144-2.144l-.301-.301a2.877 2.877 0 0 1 0-4.069l2.643-2.643a2.877 2.877 0 0 1 4.069 0M15 9h.01",
    "file-type-pdf": "M14 3v4a1 1 0 0 0 1 1h4 M5 12V5a2 2 0 0 1 2-2h7l5 5v4M5 18h1.5a1.5 1.5 0 0 0 0-3H5v6m12-3h2m1-3h-3v6m-6-6v6h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2z",
    "file-type-ppt": "M14 3v4a1 1 0 0 0 1 1h4 M14 3v4a1 1 0 0 0 1 1h4M5 18h1.5a1.5 1.5 0 0 0 0-3H5v6m6-3h1.5a1.5 1.5 0 0 0 0-3H11v6m5.5-6h3M18 15v6 M5 12V5a2 2 0 0 1 2-2h7l5 5v4",
    "file-zip": "M6 20.735A2 2 0 0 1 5 19V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2h-1 M11 17a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2a2 2 0 0 1 2-2m0-12h-1m3 2h-1m-1 2h-1m3 2h-1m-1 2h-1m3 2h-1",
    "file-type-doc": "M14 3v4a1 1 0 0 0 1 1h4 M5 12V5a2 2 0 0 1 2-2h7l5 5v4M5 15v6h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2zm15 1.5a1.5 1.5 0 0 0-3 0v3a1.5 1.5 0 0 0 3 0M12.5 15a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-3 0v-3a1.5 1.5 0 0 1 1.5-1.5",
    "calendar-check": "M11.5 21H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6M16 3v4M8 3v4m-4 4h16m-5 8l2 2l4-4",
    "settings": "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065 M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0",
    "folder": "M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2",
    "users": "M5 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m1-17.87a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85",
    "bell": "M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H4a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6M9 17v1a3 3 0 0 0 6 0v-1",
    "user-check": "M8 7a4 4 0 1 0 8 0a4 4 0 0 0-8 0M6 21v-2a4 4 0 0 1 4-4h4m1 4l2 2l4-4",
    "trash": "M4 7h16m-10 4v6m4-6v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3",
    "chevron-right": "M9 18l6-6-6-6",
}

# ---------------- 基础节点工厂 ----------------
def make_text(content, font_size="$text-size-body", fill="$text-primary", weight="600", name="Text"):
    return {
        "type": "text",
        "id": uid("t"),
        "name": name,
        "content": content,
        "fontFamily": "$font-body",
        "fontSize": font_size,
        "fontWeight": weight,
        "fill": fill,
    }


def make_path(name, icon, size=24, stroke=None, fill="none", opacity=1.0, stroke_width=2, **extra):
    node = {
        "type": "path",
        "id": uid("p"),
        "name": name,
        "geometry": ICONS[icon],
        "viewBox": [0, 0, 24, 24],
        "fill": fill,
        "width": size,
        "height": size,
        "strokeWidth": stroke_width,
        "strokeLinejoin": "round",
        "strokeLinecap": "round",
    }
    if stroke:
        node["stroke"] = stroke
    if opacity != 1.0:
        node["opacity"] = opacity
    node.update(extra)
    return node


def make_gradient(colors, rotation=135):
    return {
        "type": "gradient",
        "gradientType": "linear",
        "enabled": True,
        "rotation": rotation,
        "size": {"height": 1},
        "colors": [{"color": c, "position": i / (len(colors) - 1)} for i, c in enumerate(colors)],
    }


def make_shadow(color="$shadow-soft", y=4, blur=16):
    return {
        "type": "shadow",
        "shadowType": "outer",
        "color": color,
        "offset": {"x": 0, "y": y},
        "blur": blur,
    }


def make_frame(name, **kwargs):
    node = {"type": "frame", "id": uid("f"), "name": name}
    node.update(kwargs)
    return node


# ---------------- 通用组件 ----------------
def primary_button(label):
    return make_frame(
        name=label,
        width="fill_container",
        height=52,
        fill=make_gradient(["#0062FF", "#3B82F6"]),
        cornerRadius="$rounded-lg",
        effect=make_shadow("#0062FF33", y=4, blur=16),
        layout="vertical",
        justifyContent="center",
        alignItems="center",
        children=[make_text(label, font_size="$text-size-subhead", fill="$text-inverse", weight="600", name="Label")],
    )


def header_with_back(title, gradient_colors, deco_icon):
    """蓝色渐变头部：左上角返回箭头 + 左对齐大标题 + 右下角线稿装饰图标"""
    return make_frame(
        name="Header",
        width="fill_container",
        height=180,
        fill=make_gradient(gradient_colors),
        cornerRadius=[0, 0, 24, 24],
        layout="vertical",
        gap=8,
        padding=[20, 20, 24, 20],
        justifyContent="start",
        alignItems="start",
        children=[
            make_frame(
                name="Nav",
                width="fill_container",
                height=24,
                layout="horizontal",
                justifyContent="start",
                alignItems="center",
                children=[make_path("Back", "chevron-left", size=28, stroke="#FFFFFF", stroke_width=2.5)],
            ),
            make_text(title, font_size="$text-size-display", fill="$text-inverse", weight="700", name="Title"),
            make_path(
                "Deco",
                deco_icon,
                size=120,
                stroke="#FFFFFF",
                fill="none",
                opacity=0.15,
                stroke_width=1.5,
                layoutPosition="absolute",
                x=260,
                y=50,
            ),
        ],
    )


# ---------------- 页面 1：签到方式选择页 ----------------
def make_signin_card(title, subtitle, icon, color, selected=False, face=False):
    effect = make_shadow("$shadow-soft", y=2, blur=8)
    stroke = "#00000000"
    stroke_width = 1
    if selected:
        effect = [make_shadow("$shadow-soft", y=2, blur=8), make_shadow("$accent-glow", y=0, blur=12)]
        stroke = "$accent"
        stroke_width = 2

    icon_node = make_path(icon, icon, size=48, stroke=None if face else color, fill=color if face else "none", stroke_width=2)
    return make_frame(
        name=title,
        width=170,
        height=170,
        fill="$surface",
        cornerRadius="$rounded-xl",
        stroke=stroke,
        strokeWidth=stroke_width,
        effect=effect,
        layout="vertical",
        gap=10,
        justifyContent="center",
        alignItems="center",
        padding=12,
        children=[
            icon_node,
            make_text(title, font_size="$text-size-subhead", fill="$text-primary", weight="600", name="Title"),
            make_text(subtitle, font_size="$text-size-caption", fill="$text-secondary", weight="normal", name="Subtitle"),
        ],
    )


def build_signin_page():
    grid = make_frame(
        name="Grid",
        width="fill_container",
        layout="vertical",
        gap=12,
        children=[
            make_frame(
                name="Row1",
                width="fill_container",
                height=170,
                layout="horizontal",
                gap=12,
                justifyContent="space_between",
                alignItems="center",
                children=[
                    make_signin_card("定位签到", "基于GPS定位范围验证", "map-pin", "#3B82F6", selected=True, face=True),
                    make_signin_card("二维码签到", "扫码完成签到", "qrcode", "#1E40AF"),
                ],
            ),
            make_frame(
                name="Row2",
                width="fill_container",
                height=170,
                layout="horizontal",
                gap=12,
                justifyContent="space_between",
                alignItems="center",
                children=[
                    make_signin_card("水印拍照签到", "拍照带时间地点水印", "camera", "#64748B"),
                    make_signin_card("口令签到", "输入4位数字口令", "key", "#1E3A8A"),
                ],
            ),
        ],
    )
    return make_frame(
        name="Content",
        width="fill_container",
        height="fill_container",
        layout="vertical",
        gap=16,
        padding=[0, 20],
        children=[
            header_with_back("选择签到方式", ["#E0F2FE", "#60A5FA"], "calendar-check"),
            grid,
            primary_button("下一步"),
        ],
    )


# ---------------- 页面 2：班级设置页 ----------------
def make_setting_row(title, subtitle, icon, summary=None, danger=False):
    icon_color = "#B91C1C" if danger else "$accent"
    title_color = "#B91C1C" if danger else "$text-primary"
    subtitle_color = "#B91C1C" if danger else "$text-secondary"
    row_children = [
        make_frame(
            name="IconBox",
            width=32,
            height=32,
            fill="$accent-50" if not danger else "#FEF2F2",
            cornerRadius="$rounded-md",
            justifyContent="center",
            alignItems="center",
            children=[make_path(icon, icon, size=20, stroke=icon_color, stroke_width=2)],
        ),
        make_frame(
            name="Text",
            width="fill_container",
            layout="vertical",
            gap=2,
            justifyContent="center",
            children=[
                make_text(title, font_size="$text-size-subhead", fill=title_color, weight="600", name="Title"),
                make_text(subtitle, font_size="$text-size-caption", fill=subtitle_color, weight="normal", name="Subtitle"),
            ],
        ),
    ]
    if summary:
        row_children.append(make_text(summary, font_size="$text-size-caption", fill="$text-secondary", weight="normal", name="Summary"))
    return make_frame(
        name=title,
        width="fill_container",
        height=52,
        layout="horizontal",
        gap=12,
        justifyContent="start",
        alignItems="center",
        children=row_children,
    )


def make_group_card(title, rows):
    return make_frame(
        name=title,
        width="fill_container",
        fill="$surface",
        cornerRadius="$rounded-lg",
        effect=make_shadow("$shadow-soft", y=2, blur=8),
        layout="horizontal",
        alignItems="stretch",
        children=[
            make_frame(name="Bar", width=4, height="fill_container", fill="$accent"),
            make_frame(
                name="Rows",
                width="fill_container",
                layout="vertical",
                gap=4,
                padding=12,
                children=rows,
            ),
        ],
    )


def build_settings_page():
    return make_frame(
        name="Content",
        width="fill_container",
        height="fill_container",
        layout="vertical",
        gap=20,
        padding=[0, 20],
        children=[
            header_with_back("班级设置", ["#1E3A8A", "#3B82F6"], "settings"),
            make_frame(
                name="GroupTitle",
                width="fill_container",
                children=[make_text("基础信息", font_size="$text-size-caption", fill="$text-secondary", weight="600")],
            ),
            make_group_card(
                "BasicInfo",
                [
                    make_setting_row("班级名称", "", "users", summary="计算机科学与技术1班"),
                    make_setting_row("班级公告", "", "bell", summary="本周五班会"),
                ],
            ),
            make_frame(
                name="GroupTitle",
                width="fill_container",
                children=[make_text("权限管理", font_size="$text-size-caption", fill="$text-secondary", weight="600")],
            ),
            make_group_card(
                "Permission",
                [make_setting_row("入班审核", "开启后需班委同意", "user-check")],
            ),
            make_frame(
                name="GroupTitle",
                width="fill_container",
                children=[make_text("危险操作", font_size="$text-size-caption", fill="$text-secondary", weight="600")],
            ),
            make_frame(
                name="DangerCard",
                width="fill_container",
                height=56,
                fill="#FEF2F2",
                cornerRadius="$rounded-lg",
                layout="horizontal",
                gap=12,
                padding=[0, 16],
                justifyContent="start",
                alignItems="center",
                children=[
                    make_frame(
                        name="IconBox",
                        width=32,
                        height=32,
                        fill="#FEE2E2",
                        cornerRadius="$rounded-md",
                        justifyContent="center",
                        alignItems="center",
                        children=[make_path("trash", "trash", size=20, stroke="#B91C1C", stroke_width=2)],
                    ),
                    make_frame(
                        name="Text",
                        width="fill_container",
                        layout="vertical",
                        gap=2,
                        justifyContent="center",
                        children=[
                            make_text("解散班级", font_size="$text-size-subhead", fill="#B91C1C", weight="600", name="Title"),
                            make_text("操作不可恢复", font_size="$text-size-caption", fill="#B91C1C", weight="normal", name="Subtitle"),
                        ],
                    ),
                ],
            ),
            primary_button("保存设置"),
        ],
    )


# ---------------- 页面 3：文件列表页 ----------------
def make_filter_tab(label, active=False):
    return make_frame(
        name=label,
        height=32,
        fill="$accent" if active else "$accent-50",
        cornerRadius=9999,
        padding=[0, 12],
        layout="vertical",
        justifyContent="center",
        alignItems="center",
        children=[make_text(label, font_size="$text-size-caption", fill="$text-inverse" if active else "$accent", weight="600")],
    )


def make_file_card(name, meta, icon, color):
    bg = color + "1A"  # 10% 透明度背景
    return make_frame(
        name=name,
        width="fill_container",
        height=76,
        fill="$surface",
        cornerRadius="$rounded-lg",
        effect=make_shadow("$shadow-soft", y=2, blur=8),
        layout="horizontal",
        gap=12,
        padding=12,
        justifyContent="start",
        alignItems="center",
        children=[
            make_frame(
                name="IconBox",
                width=48,
                height=48,
                fill=bg,
                cornerRadius="$rounded-lg",
                justifyContent="center",
                alignItems="center",
                children=[make_path(icon, icon, size=28, stroke=color, stroke_width=2)],
            ),
            make_frame(
                name="Text",
                width="fill_container",
                layout="vertical",
                gap=2,
                justifyContent="center",
                children=[
                    make_text(name, font_size="$text-size-subhead", fill="$text-primary", weight="600", name="Title"),
                    make_text(meta, font_size="$text-size-caption", fill="$text-secondary", weight="normal", name="Meta"),
                ],
            ),
            make_path("Arrow", "chevron-right", size=24, stroke="$text-muted", stroke_width=2),
        ],
    )


def build_files_page():
    return make_frame(
        name="Content",
        width="fill_container",
        height="fill_container",
        layout="vertical",
        gap=16,
        padding=[0, 20],
        children=[
            header_with_back("文件列表", ["#0284C7", "#38BDF8"], "folder"),
            make_frame(
                name="SearchFilter",
                width="fill_container",
                layout="vertical",
                gap=12,
                children=[
                    make_frame(
                        name="SearchBox",
                        width="fill_container",
                        height=40,
                        fill="$surface",
                        cornerRadius=9999,
                        stroke="$border",
                        strokeWidth=1,
                        layout="horizontal",
                        gap=8,
                        padding=[0, 12],
                        justifyContent="start",
                        alignItems="center",
                        children=[
                            make_path("Search", "search", size=18, stroke="$text-muted", stroke_width=2),
                            make_text("搜索文件", font_size="$text-size-body", fill="$text-muted", weight="normal", name="Placeholder"),
                        ],
                    ),
                    make_frame(
                        name="Tabs",
                        width="fill_container",
                        height=32,
                        layout="horizontal",
                        gap=8,
                        justifyContent="start",
                        alignItems="center",
                        children=[make_filter_tab("全部", active=True), make_filter_tab("文档"), make_filter_tab("压缩包")],
                    ),
                ],
            ),
            make_frame(
                name="FileList",
                width="fill_container",
                layout="vertical",
                gap=10,
                children=[
                    make_file_card("高数资料.pdf", "2.3 MB · 上周上传", "file-type-pdf", "#1E3A8A"),
                    make_file_card("班会PPT.pptx", "5.1 MB · 昨天", "file-type-ppt", "#3B82F6"),
                    make_file_card("活动照片.zip", "18 MB · 本月", "file-zip", "#64748B"),
                    make_file_card("团课学习.docx", "1.2 MB · 本月", "file-type-doc", "#0EA5E9"),
                ],
            ),
            primary_button("上传文件"),
        ],
    )


# ---------------- 主流程 ----------------
PAGE_BUILDERS = {
    "oRLQ2": ("签到方式选择页", build_signin_page),
    "a33CF4": ("班级设置页", build_settings_page),
    "eGEci": ("文件列表页", build_files_page),
}


def main():
    print(f"Loading {PEN_PATH} ...")
    with open(PEN_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 备份原文件
    backup_path = PEN_PATH.with_suffix(".pen.bak")
    with open(backup_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Backup saved: {backup_path}")

    pages_updated = []
    for child in data.get("children", []):
        page_id = child.get("id")
        if page_id not in PAGE_BUILDERS:
            continue
        page_name, builder = PAGE_BUILDERS[page_id]
        # 保留原有 ref 的 id，仅替换 descendants 中的 Screen Area
        old_ref = child["children"][0] if child.get("children") else {"id": uid("ref")}
        new_content = builder()
        child["children"] = [
            {
                "id": old_ref.get("id", uid("ref")),
                "type": "ref",
                "ref": "lPWz4",
                "height": 844,
                "width": 393,
                "name": "Phone Frame",
                "descendants": {"n9xLw": new_content},
            }
        ]
        pages_updated.append((page_id, page_name))
        print(f"Updated page: {page_name} ({page_id})")

    with open(PEN_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"Saved: {PEN_PATH}")
    print("Updated pages:", pages_updated)


if __name__ == "__main__":
    main()
