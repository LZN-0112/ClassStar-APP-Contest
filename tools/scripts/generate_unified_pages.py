import json
import uuid
import copy
import os

PEN_PATH = r"d:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
OUTPUT_PATH = r"d:\校园班级事务智能管理助手\校园班级事务智能管理助手_unified.pen"

# Color gradients
GRADIENT_A = {  # Deep formal
    "type": "gradient",
    "gradientType": "linear",
    "enabled": True,
    "rotation": 180,
    "size": {"height": 1},
    "colors": [
        {"color": "#076CAB", "position": 0},
        {"color": "#32C9FD", "position": 0.55},
        {"color": "#DEFCFF", "position": 1}
    ]
}

GRADIENT_B = {  # Light fresh
    "type": "gradient",
    "gradientType": "linear",
    "enabled": True,
    "rotation": 180,
    "size": {"height": 1},
    "colors": [
        {"color": "#1986E6", "position": 0},
        {"color": "#8ACAE5", "position": 0.55},
        {"color": "#DEFCFF", "position": 1}
    ]
}

# Icon path library (24x24 viewBox, 2px stroke)
ICONS = {
    "chevron-left": "M15 18l-6-6 6-6",
    "chevron-right": "M9 18l6-6-6-6",
    "shield": "M12 3a12 12 0 0 0 8.5 3 12 12 0 0 1-8.5 15 12 12 0 0 1-8.5-15 12 12 0 0 0 8.5-3",
    "user": "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
    "bell": "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
    "clock": "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10M12 6v6l4 2",
    "settings": "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
    "lock": "M19 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2M7 11V7a5 5 0 1 1 10 0v4M12 16a1 1 0 1 0 0 2 1 1 0 0 0 0-2",
    "eye": "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
    "file-text": "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M14 2v6h6M16 13H8M16 17H8M10 9H8",
    "file-check": "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2M14 2v6h6m-9 10l-2 2-2-2",
    "calendar": "M8 2v4M16 2v4M3 10h18M7 14h.01M11 14h.01M15 14h.01M7 18h.01M11 18h.01M15 18h.01M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2",
    "map-pin": "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
    "check-circle": "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3",
    "x-circle": "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10M15 9l-6 6M9 9l6 6",
    "clock-alert": "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10M12 6v6l4 2M4.93 4.93l14.14 14.14",
    "trophy": "M8 21h8m-4-4v4M7 4h10m0 0v8a5 5 0 0 1-10 0V4M3 9a2 2 0 1 0 4 0 2 2 0 1 0-4 0m14 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0",
    "trending-up": "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
    "bar-chart": "M18 20V10M12 20V4M6 20v-6",
    "pie-chart": "M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z",
    "users": "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M23 11h-6",
    "clipboard-list": "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M12 2v6M8 14h8M8 18h8M8 10h2",
    "inbox": "M22 12h-6l-2 3h-4l-2-3H2M7 12V7a5 5 0 0 1 10 0v5",
    "upload": "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
    "send": "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7",
    "message-circle": "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5",
    "help-circle": "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01",
    "star": "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2",
    "mail": "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2m0 2l8 5 8-5",
    "phone": "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.56 12.56 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.56 12.56 0 0 0 2.81.7A2 2 0 0 1 22 16.92",
    "bookmark": "m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16",
    "credit-card": "M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2M1 10h22",
    "wallet": "M21 12V7H5a2 2 0 0 1-2-2 2 2 0 0 1 2-2h14v-2M17 12v5M17 17h2",
    "receipt": "M4 4v16l4-2 4 2 4-2 4 2V4M2 8h20",
    "filter": "M22 3H2l8 9.46V19l4 2v-8.54L22 3",
    "search": "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16m10 2-4.35-4.35",
    "plus": "M12 5v14M5 12h14",
    "more-horizontal": "M5 12h.01M12 12h.01M19 12h.01",
    "trash": "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6",
    "edit": "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5",
    "home": "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9M9 22V12h6v10",
    "book-open": "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
    "activity": "M22 12h-4l-3 9L9 3l-3 9H2",
    "alert-circle": "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10M12 8v4M12 16h.01",
    "check": "M20 6L9 17l-5-5",
    "x": "M18 6L6 18M6 6l12 12",
    "menu": "M3 12h18M3 6h18M3 18h18",
    "clock-history": "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10M12 6v6l4 2M4 4l16 16",
    "log-out": "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
    "refresh": "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
    "download": "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
    "archive": "M21 8v13H3V8M1 3h22v5H1zM10 12h4",
    "flag": "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1M4 22V4",
    "target": "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
    "clipboard": "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M12 2v6",
    "percent": "M19 5L5 19M9 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4M15 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
    "dollar-sign": "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    "calendar-clock": "M16 14v6M16 20l2-2M16 20l-2-2M16 2v4M8 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2",
    "layers": "M12 2L2 7l10 5 10-5-10-5M2 17l10 5 10-5M2 12l10 5 10-5",
    "briefcase": "M6 22a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M12 13v5",
    "building": "M6 22V10a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12M2 22h20M9 6h6M9 10h6M9 14h6M9 18h6",
    "graduation-cap": "M22 10l-10-6-10 6 10 6 10-6M6 12v5a6 6 0 0 0 12 0v-5",
    "hash": "M4 9h16M4 15h16M10 3L8 21M16 3l-2 18",
    "info": "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10M12 16v-4M12 8h.01",
    "list": "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    "award": "M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12M8.56 13.31L7 22l5-3 5 3-1.56-8.69",
    "sparkles": "M16 18a2 2 0 0 1 2 2 2 2 0 0 1 2-2 2 2 0 0 1-2-2 2 2 0 0 1-2 2m0-12a2 2 0 0 1 2 2 2 2 0 0 1 2-2 2 2 0 0 1-2-2 2 2 0 0 1-2 2M9 18a6 6 0 0 1 6-6 6 6 0 0 1-6-6 6 6 0 0 1-6 6 6 6 0 0 1 6 6",
    "hourglass": "M6.5 7h11m-11 10h11M6 20v-2a6 6 0 1 1 12 0v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1M6 4v2a6 6 0 1 0 12 0V4a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1",
    "clipboard-check": "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M12 2v6M9 14l2 2 4-4",
    "user-check": "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M16 11l2 2 4-4",
    "camera": "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
    "image": "M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M21 15l-5-5L5 21",
    "paperclip": "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48",
    "circle": "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10",
}


def new_id(prefix="n"):
    return prefix + uuid.uuid4().hex[:8]


def text_node(content, fill="$text-primary", font_family="$font-body", font_size="$text-size-body", font_weight="500", **kwargs):
    node = {
        "type": "text",
        "id": new_id("t"),
        "name": kwargs.get("name", "Text"),
        "content": content,
        "fill": fill,
        "fontFamily": font_family,
        "fontSize": font_size,
        "fontWeight": font_weight,
    }
    if "width" in kwargs:
        node["width"] = kwargs["width"]
    if "height" in kwargs:
        node["height"] = kwargs["height"]
    if "textGrowth" in kwargs:
        node["textGrowth"] = kwargs["textGrowth"]
    if "textAlign" in kwargs:
        node["textAlign"] = kwargs["textAlign"]
    if "textAlignVertical" in kwargs:
        node["textAlignVertical"] = kwargs["textAlignVertical"]
    return node


def frame_node(name, width="fit_content", height="fit_content", fill="$surface", layout="vertical", children=None, **kwargs):
    node = {
        "type": "frame",
        "id": new_id("f"),
        "name": name,
        "width": width,
        "height": height,
        "fill": fill,
    }
    if layout:
        node["layout"] = layout
    for key in ["gap", "padding", "justifyContent", "alignItems", "cornerRadius", "effect", "stroke", "strokeWidth", "layoutPosition", "x", "y", "opacity", "clip"]:
        if key in kwargs:
            node[key] = kwargs[key]
    if children is not None:
        node["children"] = children
    return node


def icon_path(name, size=24, stroke="#FFFFFF", stroke_width=2, fill="none"):
    geom = ICONS.get(name, ICONS["circle"])
    # Pencil expects fill to be a valid color string or color object, not "none"
    pencil_fill = "#00000000" if fill == "none" else fill
    return {
        "type": "path",
        "id": new_id("i"),
        "name": f"Icon-{name}",
        "geometry": geom,
        "viewBox": [0, 0, 24, 24],
        "fill": pencil_fill,
        "width": size,
        "height": size,
        "stroke": stroke,
        "strokeWidth": stroke_width,
        "strokeLinecap": "round",
        "strokeLinejoin": "round",
    }


def icon_box(icon_name, bg, color, size=40, icon_size=24):
    return frame_node(
        "Icon Box",
        width=size,
        height=size,
        fill=bg,
        cornerRadius=8,
        justifyContent="center",
        alignItems="center",
        children=[icon_path(icon_name, size=icon_size, stroke=color, fill="none")],
    )


def spacer(width="fill_container", height=1, fill="#00000000"):
    return frame_node("Spacer", width=width, height=height, fill=fill, layout=None)


def arrow_right():
    return icon_path("chevron-right", size=20, stroke="#9CA3AF", stroke_width=2)


def status_bar():
    return frame_node(
        "Status Bar",
        width="fill_container",
        height=62,
        fill="#00000000",
        layout="horizontal",
        padding=[12, 24, 0, 24],
        justifyContent="space_between",
        alignItems="center",
        children=[
            text_node("9:41", fill="#FFFFFF", font_family="$font-data", font_size="$text-size-body", font_weight="600"),
            frame_node(
                "Status Icons",
                layout="horizontal",
                gap=6,
                alignItems="center",
                fill="#00000000",
                children=[
                    text_node("OOOO", fill="#FFFFFF", font_family="$font-caption", font_size="$text-size-body"),
                    text_node("100%", fill="#FFFFFF", font_family="$font-data", font_size="$text-size-body"),
                ],
            ),
        ],
    )


def unified_header(title, decor_icon, gradient, header_height=220):
    return frame_node(
        "Unified Header",
        width="fill_container",
        height=header_height + 62,
        fill=gradient,
        cornerRadius=[0, 0, 24, 24],
        layout="vertical",
        children=[
            status_bar(),
            frame_node(
                "Header",
                width="fill_container",
                height=header_height,
                fill="#00000000",
                layout="vertical",
                gap=12,
                padding=20,
                children=[
                    frame_node(
                        "Top Row",
                        width="fill_container",
                        height=40,
                        fill="#00000000",
                        layout="horizontal",
                        justifyContent="space_between",
                        alignItems="center",
                        children=[
                            frame_node(
                                "Back Button",
                                width=40,
                                height=40,
                                fill="#00000000",
                                layout="vertical",
                                justifyContent="center",
                                alignItems="center",
                                children=[
                                    text_node(
                                        "←",
                                        fill="#FFFFFF",
                                        font_family="$font-body",
                                        font_size=42,
                                        font_weight="300",
                                        textAlign="center",
                                        textAlignVertical="middle",
                                    )
                                ],
                            ),
                            frame_node("Right Spacer", width=40, height=40, fill="#00000000", layout=None),
                        ],
                    ),
                    text_node(title, fill="#FFFFFF", font_family="$font-heading", font_size="$text-size-display", font_weight="700"),
                    frame_node(
                        "Decor Icon",
                        width=120,
                        height=120,
                        fill="#00000000",
                        layoutPosition="absolute",
                        x=265,
                        y=80,
                        opacity=0.12,
                        justifyContent="center",
                        alignItems="center",
                        children=[icon_path(decor_icon, size=112, stroke="#FFFFFF", stroke_width=1.5)],
                    ),
                ],
            ),
        ],
    )


def content_frame(children):
    return frame_node(
        "Content",
        width="fill_container",
        height="fill_container",
        fill="$bg",
        layout="vertical",
        children=[
            frame_node(
                "Body",
                width="fill_container",
                height="fill_container",
                layout="vertical",
                gap=20,
                padding=[16, 20, 20, 20],
                children=children,
            ),
        ],
    )


def list_item(icon_name, label, value=None, show_arrow=True, icon_bg="#EBF4FF", icon_color="#1986E6"):
    right_children = []
    if value:
        right_children.append(text_node(value, fill="#6B7280", font_size="$text-size-body"))
    if show_arrow:
        right_children.append(arrow_right())
    if not right_children:
        right_children.append(arrow_right())

    return frame_node(
        "List Item",
        width="fill_container",
        height=64,
        fill="$surface",
        cornerRadius=12,
        effect={"type": "shadow", "shadowType": "outer", "color": "$shadow-soft", "offset": {"x": 0, "y": 2}, "blur": 8},
        layout="horizontal",
        padding=[0, 16],
        gap=12,
        alignItems="center",
        children=[
            icon_box(icon_name, icon_bg, icon_color, size=40, icon_size=24),
            text_node(label, fill="$text-primary", font_weight="600", width="fill_container"),
            frame_node(
                "Right",
                layout="horizontal",
                gap=8,
                alignItems="center",
                fill="#00000000",
                children=right_children,
            ),
        ],
    )


def group_card(title, items):
    return frame_node(
        f"Group {title}",
        width="fill_container",
        height="fit_content",
        fill="#00000000",
        layout="vertical",
        gap=10,
        children=[
            text_node(title, fill="#6B7280", font_size="$text-size-caption", font_weight="600"),
            frame_node(
                "Group Content",
                width="fill_container",
                height="fit_content",
                fill="#00000000",
                layout="vertical",
                gap=8,
                children=items,
            ),
        ],
    )


def filter_tabs(labels, active_index=0):
    tabs = []
    for i, label in enumerate(labels):
        active = i == active_index
        tabs.append(
            frame_node(
                f"Tab {label}",
                width="fit_content",
                height=32,
                fill="#1986E6" if active else "#F1F5F9",
                cornerRadius=9999,
                padding=[8, 16],
                justifyContent="center",
                alignItems="center",
                children=[text_node(label, fill="#FFFFFF" if active else "#64748B", font_size="$text-size-caption", font_weight="600")],
            )
        )
    return frame_node(
        "Filter Tabs",
        width="fill_container",
        height="fit_content",
        layout="horizontal",
        gap=8,
        fill="#00000000",
        children=tabs,
    )


def horizontal_card(left_content, right_content, status_tag=None, tag_color=None, height=88):
    right_children = right_content[:]
    if status_tag and tag_color:
        right_children.append(
            frame_node(
                "Tag",
                width="fit_content",
                height=22,
                fill=tag_color + "1A",
                cornerRadius=9999,
                padding=[4, 8],
                justifyContent="center",
                alignItems="center",
                children=[text_node(status_tag, fill=tag_color, font_size="$text-size-caption", font_weight="600")],
            )
        )
    return frame_node(
        "Card",
        width="fill_container",
        height=height,
        fill="$surface",
        cornerRadius=16,
        effect={"type": "shadow", "shadowType": "outer", "color": "$shadow-soft", "offset": {"x": 0, "y": 2}, "blur": 8},
        layout="horizontal",
        padding=[16, 16],
        gap=12,
        alignItems="center",
        children=[
            left_content,
            frame_node(
                "Info",
                width="fill_container",
                height="fill_container",
                layout="vertical",
                gap=6,
                justifyContent="center",
                fill="#00000000",
                children=right_children,
            ),
        ],
    )


def stat_card(label, value, width="fill_container"):
    return frame_node(
        "Stat Card",
        width=width,
        height="fit_content",
        fill="#FFFFFF",
        cornerRadius=16,
        effect={"type": "shadow", "shadowType": "outer", "color": "$shadow-soft", "offset": {"x": 0, "y": 2}, "blur": 8},
        layout="vertical",
        gap=6,
        padding=16,
        alignItems="center",
        children=[
            text_node(value, fill="#076CAB", font_family="$font-heading", font_size="$text-size-display", font_weight="700"),
            text_node(label, fill="#6B7280", font_size="$text-size-caption", font_weight="600"),
        ],
    )


def input_field(label, placeholder=""):
    return frame_node(
        "Input Field",
        width="fill_container",
        height=56,
        fill="$surface",
        cornerRadius=12,
        stroke="#E2E8F0",
        strokeWidth=1,
        layout="vertical",
        padding=[0, 16],
        justifyContent="center",
        children=[text_node(placeholder or label, fill="#94A3B8", font_size="$text-size-body")],
    )


def textarea_field(label, placeholder="", height=120):
    return frame_node(
        "Textarea",
        width="fill_container",
        height=height,
        fill="$surface",
        cornerRadius=12,
        stroke="#E2E8F0",
        strokeWidth=1,
        layout="vertical",
        padding=16,
        justifyContent="start",
        alignItems="start",
        children=[text_node(placeholder or label, fill="#94A3B8", font_size="$text-size-body", width="fill_container", textGrowth="fixed-width", textAlign="left", textAlignVertical="top")],
    )


def primary_button(label):
    return frame_node(
        "Button Primary",
        width="fill_container",
        height=52,
        fill="#1986E6",
        cornerRadius=12,
        effect={"type": "shadow", "shadowType": "outer", "color": "#0000001A", "offset": {"x": 0, "y": 4}, "blur": 16},
        layout="vertical",
        justifyContent="center",
        alignItems="center",
        children=[text_node(label, fill="#FFFFFF", font_size="$text-size-subhead", font_weight="600")],
    )


def page_ref(page_id, header_node, content_node):
    """Create a Phone Frame ref with unified header + content."""
    return {
        "type": "ref",
        "id": new_id("r"),
        "ref": "lPWz4",
        "width": 393,
        "height": 844,
        "descendants": {
            "JIHZi": header_node,
            "n9xLw": content_node,
        },
    }


def build_page(page_name, title, decor_icon, gradient, body_children, page_id=None, page_height=844):
    """Build a complete top-level page frame with direct children."""
    header = unified_header(title, decor_icon, gradient)
    content = content_frame(body_children)
    return {
        "type": "frame",
        "id": page_id or new_id("p"),
        "name": page_name,
        "clip": True,
        "width": 393,
        "height": page_height,
        "fill": "$bg",
        "cornerRadius": "$rounded-device",
        "layout": "vertical",
        "children": [header, content],
    }


# ============================================================
# Page builders
# ============================================================

def page_settings():
    groups = [
        group_card("账号与安全", [
            list_item("shield", "账号与安全", icon_bg="#E0F2FE", icon_color="#076CAB"),
            list_item("lock", "隐私设置", icon_bg="#E0F2FE", icon_color="#076CAB"),
        ]),
        group_card("通知设置", [
            list_item("bell", "消息通知设置", icon_bg="#E0F2FE", icon_color="#1986E6"),
            list_item("clock", "再次提醒设置", icon_bg="#E0F2FE", icon_color="#1986E6"),
        ]),
        group_card("通用设置", [
            list_item("settings", "通用设置", icon_bg="#F1F5F9", icon_color="#64748B"),
            list_item("info", "关于", icon_bg="#F1F5F9", icon_color="#64748B"),
        ]),
        group_card("帮助反馈", [
            list_item("help-circle", "帮助与反馈", icon_bg="#FEF3C7", icon_color="#D97706"),
        ]),
    ]
    return build_page("设置", "设置", "settings", GRADIENT_A, groups)


def page_profile():
    profile_card = frame_node(
        "Profile Card",
        width="fill_container",
        height="fit_content",
        fill="#EBF4FF",
        cornerRadius=20,
        layout="vertical",
        gap=12,
        padding=20,
        alignItems="center",
        children=[
            frame_node(
                "Avatar",
                width=80,
                height=80,
                fill="#1986E6",
                cornerRadius=9999,
                justifyContent="center",
                alignItems="center",
                children=[text_node("张", fill="#FFFFFF", font_family="$font-heading", font_size="$text-size-title", font_weight="700")],
            ),
            text_node("张梓涵", fill="#1E293B", font_family="$font-heading", font_size="$text-size-title", font_weight="700"),
            text_node("计算机2301班 · 班长", fill="#64748B", font_size="$text-size-body"),
        ],
    )
    groups = [
        profile_card,
        group_card("基础信息", [
            list_item("hash", "学号", value="2023010001", show_arrow=True, icon_bg="#E0F2FE", icon_color="#1986E6"),
            list_item("book-open", "专业", value="计算机科学", show_arrow=True, icon_bg="#E0F2FE", icon_color="#1986E6"),
            list_item("users", "班级", value="计算机2301", show_arrow=True, icon_bg="#E0F2FE", icon_color="#1986E6"),
            list_item("phone", "联系方式", value="138****1234", show_arrow=True, icon_bg="#E0F2FE", icon_color="#1986E6"),
        ]),
        group_card("身份信息", [
            list_item("award", "班委职务", value="班长", show_arrow=True, icon_bg="#FEF3C7", icon_color="#D97706"),
            list_item("calendar", "入学时间", value="2023年9月", show_arrow=True, icon_bg="#E0F2FE", icon_color="#1986E6"),
        ]),
    ]
    return build_page("个人信息页", "个人信息", "user", GRADIENT_B, groups)


def page_reminder_settings():
    scenarios = [
        ("file-text", "作业截止提醒", "1小时前"),
        ("clock", "考勤开始提醒", "15分钟前"),
        ("calendar", "活动报名提醒", "1天前"),
        ("bar-chart", "投票截止提醒", "30分钟前"),
    ]
    items = []
    for icon, name, time in scenarios:
        items.append(
            frame_node(
                "Reminder Item",
                width="fill_container",
                height=64,
                fill="$surface",
                cornerRadius=12,
                effect={"type": "shadow", "shadowType": "outer", "color": "$shadow-soft", "offset": {"x": 0, "y": 2}, "blur": 8},
                layout="horizontal",
                padding=[0, 16],
                gap=12,
                alignItems="center",
                children=[
                    icon_box(icon, "#E0F2FE", "#1986E6", size=40, icon_size=24),
                    frame_node(
                        "Label",
                        width="fill_container",
                        layout="vertical",
                        gap=2,
                        fill="#00000000",
                        children=[
                            text_node(name, fill="#1E293B", font_weight="600"),
                            text_node(time, fill="#94A3B8", font_size="$text-size-caption"),
                        ],
                    ),
                    frame_node(
                        "Switch",
                        width=48,
                        height=28,
                        fill="#1986E6",
                        cornerRadius=9999,
                        children=[frame_node("Knob", width=22, height=22, fill="#FFFFFF", cornerRadius=9999, layoutPosition="absolute", x=23, y=3)],
                    ),
                ],
            )
        )
    return build_page("再次提醒设置页", "提醒设置", "bell", GRADIENT_B, [group_card("场景提醒", items)])


def page_about():
    brand = frame_node(
        "Brand",
        width="fill_container",
        height="fit_content",
        fill="#00000000",
        layout="vertical",
        gap=16,
        padding=[40, 0, 40, 0],
        alignItems="center",
        children=[
            frame_node(
                "Logo",
                width=96,
                height=96,
                fill="#EBF4FF",
                cornerRadius=24,
                justifyContent="center",
                alignItems="center",
                children=[icon_path("users", size=56, stroke="#076CAB", stroke_width=2)],
            ),
            text_node("班级助手", fill="#1E293B", font_family="$font-heading", font_size="$text-size-hero", font_weight="700"),
            text_node("智能管理班级事务", fill="#64748B", font_size="$text-size-body"),
            text_node("v1.0.0", fill="#94A3B8", font_size="$text-size-caption"),
        ],
    )
    items = [
        list_item("file-text", "用户协议", icon_bg="#F1F5F9", icon_color="#64748B"),
        list_item("lock", "隐私政策", icon_bg="#F1F5F9", icon_color="#64748B"),
        list_item("refresh", "版本更新", value="已是最新", icon_bg="#F1F5F9", icon_color="#64748B"),
        list_item("star", "给我们评分", icon_bg="#FEF3C7", icon_color="#D97706"),
    ]
    return build_page("关于页", "关于", "info", GRADIENT_A, [brand, group_card("", items)])


def page_my_attendance():
    records = [
        ("03月24日", "周一", "正常", "#22C55E", "08:30 · 教学楼A301"),
        ("03月23日", "周日", "请假", "#F59E0B", "—"),
        ("03月22日", "周六", "缺勤", "#EF4444", "—"),
        ("03月21日", "周五", "迟到", "#F59E0B", "08:45 · 教学楼A301"),
        ("03月20日", "周四", "正常", "#22C55E", "08:30 · 教学楼A301"),
    ]
    cards = []
    for date, weekday, status, color, detail in records:
        cards.append(
            horizontal_card(
                frame_node(
                    "Date",
                    width=56,
                    height="fill_container",
                    fill="#00000000",
                    layout="vertical",
                    gap=2,
                    justifyContent="center",
                    alignItems="center",
                    children=[
                        text_node(date.split("月")[1].replace("日", ""), fill="#1E293B", font_family="$font-heading", font_size="$text-size-title", font_weight="700"),
                        text_node(weekday, fill="#94A3B8", font_size="$text-size-caption"),
                    ],
                ),
                [
                    text_node(status, fill=color, font_weight="700", font_size="$text-size-subhead"),
                    text_node(detail, fill="#64748B", font_size="$text-size-caption"),
                ],
                status_tag=status,
                tag_color=color,
                height=80,
            )
        )
    return build_page("我的考勤", "我的考勤", "clock", GRADIENT_B, [filter_tabs(["全部", "正常", "缺勤", "请假"]), group_card("考勤记录", cards)])


def page_my_homework():
    assignments = [
        ("数据结构作业3", "03-20发布", "03-25截止", "待提交", "#EF4444"),
        ("英语听力练习", "03-18发布", "03-22截止", "已提交", "#22C55E"),
        ("线性代数测验", "03-15发布", "03-20截止", "已批改", "#1986E6"),
        ("Python实验报告", "03-12发布", "03-18截止", "已批改", "#1986E6"),
    ]
    cards = []
    for name, pub, due, status, color in assignments:
        cards.append(
            horizontal_card(
                icon_box("file-text", "#DBEAFE", "#1986E6", size=48, icon_size=28),
                [
                    text_node(name, fill="#1E293B", font_weight="600"),
                    text_node(f"{pub}  ·  {due}", fill="#64748B", font_size="$text-size-caption"),
                ],
                status_tag=status,
                tag_color=color,
                height=88,
            )
        )
    return build_page("我的作业", "我的作业", "file-text", GRADIENT_B, [filter_tabs(["全部", "待提交", "已提交", "已批改"]), group_card("作业列表", cards)])


def page_my_activities():
    activities = [
        ("春季运动会", "04月12日", "体育馆", "报名中", "#22C55E"),
        ("班级团建", "03月28日", "食堂三楼", "进行中", "#1986E6"),
        ("元旦晚会", "01月01日", "大礼堂", "已结束", "#94A3B8"),
    ]
    cards = []
    for name, date, loc, status, color in activities:
        cards.append(
            horizontal_card(
                frame_node(
                    "Thumb",
                    width=64,
                    height=64,
                    fill="#DBEAFE",
                    cornerRadius=12,
                    justifyContent="center",
                    alignItems="center",
                    children=[icon_path("calendar", size=32, stroke="#1986E6")],
                ),
                [
                    text_node(name, fill="#1E293B", font_weight="600"),
                    text_node(f"{date}  ·  {loc}", fill="#64748B", font_size="$text-size-caption"),
                ],
                status_tag=status,
                tag_color=color,
                height=96,
            )
        )
    return build_page("我的活动", "我的活动", "calendar", GRADIENT_B, [filter_tabs(["全部", "进行中", "已结束"]), group_card("活动记录", cards)])


def page_my_registration(page_name="我的报名页", page_id=None):
    records = [
        ("春季运动会志愿者", "03-20 14:30", "已通过", "#22C55E"),
        ("计算机学院讲座", "03-18 10:15", "待审核", "#F59E0B"),
        ("校园歌手大赛", "03-10 09:00", "未通过", "#EF4444"),
    ]
    cards = []
    for rec_name, time, status, color in records:
        cards.append(
            horizontal_card(
                icon_box("clipboard-list", "#E0F2FE", "#1986E6", size=48, icon_size=24),
                [
                    text_node(rec_name, fill="#1E293B", font_weight="600"),
                    text_node(time, fill="#64748B", font_size="$text-size-caption"),
                ],
                status_tag=status,
                tag_color=color,
                height=80,
            )
        )
    return build_page(page_name, "我的报名", "clipboard-list", GRADIENT_B, [group_card("报名记录", cards)], page_id=page_id)


def page_my_registration_records():
    return page_my_registration("我的报名记录", "srrFB")


def page_homework_list():
    assignments = [
        ("数据结构作业3", "计算机2301", "12/35"),
        ("英语听力练习", "计算机2301", "28/35"),
        ("线性代数测验", "计算机2302", "35/35"),
        ("Python实验报告", "计算机2301", "30/35"),
    ]
    cards = []
    for name, cls, progress in assignments:
        cards.append(
            horizontal_card(
                icon_box("file-text", "#DBEAFE", "#076CAB", size=48, icon_size=24),
                [
                    text_node(name, fill="#1E293B", font_weight="600"),
                    text_node(f"{cls}  ·  提交 {progress}", fill="#64748B", font_size="$text-size-caption"),
                ],
                status_tag="查看详情",
                tag_color="#076CAB",
                height=88,
            )
        )
    return build_page("作业列表页", "作业列表", "file-text", GRADIENT_A, [filter_tabs(["全部", "未发布", "进行中", "已截止"]), group_card("作业管理", cards)])


def page_vote_list():
    votes = [
        ("班服款式投票", "剩余2天", "28人参与", 0.7),
        ("春游地点投票", "剩余5小时", "35人参与", 0.95),
        ("自习时间投票", "已结束", "30人参与", 0.82),
    ]
    cards = []
    for title, time, people, progress in votes:
        progress_color = "#1986E6" if "已结束" not in time else "#94A3B8"
        cards.append(
            frame_node(
                "Vote Card",
                width="fill_container",
                height="fit_content",
                fill="$surface",
                cornerRadius=16,
                effect={"type": "shadow", "shadowType": "outer", "color": "$shadow-soft", "offset": {"x": 0, "y": 2}, "blur": 8},
                layout="vertical",
                gap=10,
                padding=16,
                children=[
                    frame_node(
                        "Row",
                        width="fill_container",
                        layout="horizontal",
                        justifyContent="space_between",
                        alignItems="center",
                        fill="#00000000",
                        children=[
                            text_node(title, fill="#1E293B", font_weight="600"),
                            text_node(time, fill="#94A3B8", font_size="$text-size-caption"),
                        ],
                    ),
                    text_node(people, fill="#64748B", font_size="$text-size-caption"),
                    frame_node(
                        "Progress Track",
                        width="fill_container",
                        height=6,
                        fill="#E2E8F0",
                        cornerRadius=9999,
                        children=[
                            frame_node("Progress Fill", width=f"fill_container({progress})", height=6, fill=progress_color, cornerRadius=9999),
                        ],
                    ),
                    frame_node(
                        "Action",
                        width="fit_content",
                        height=28,
                        fill="#EBF4FF",
                        cornerRadius=8,
                        padding=[4, 12],
                        justifyContent="center",
                        alignItems="center",
                        children=[text_node("去投票" if "已结束" not in time else "查看结果", fill="#1986E6", font_size="$text-size-caption", font_weight="600")],
                    ),
                ],
            )
        )
    return build_page("投票列表页", "投票列表", "bar-chart", GRADIENT_B, [group_card("投票列表", cards)])


def page_activity_list():
    activities = [
        ("春季运动会", "04月12日 08:00", "体育馆", "32/50", "报名中"),
        ("班级团建", "03月28日 18:00", "食堂三楼", "28/30", "进行中"),
        ("元旦晚会", "01月01日 19:00", "大礼堂", "已满", "已结束"),
    ]
    cards = []
    for name, time, loc, count, status in activities:
        status_color = {"报名中": "#22C55E", "进行中": "#1986E6", "已结束": "#94A3B8"}[status]
        cards.append(
            frame_node(
                "Activity Card",
                width="fill_container",
                height="fit_content",
                fill="$surface",
                cornerRadius=20,
                effect={"type": "shadow", "shadowType": "outer", "color": "$shadow-soft", "offset": {"x": 0, "y": 2}, "blur": 8},
                layout="vertical",
                gap=12,
                children=[
                    frame_node(
                        "Cover",
                        width="fill_container",
                        height=140,
                        fill="#DBEAFE",
                        cornerRadius=[20, 20, 0, 0],
                        justifyContent="center",
                        alignItems="center",
                        children=[icon_path("image", size=48, stroke="#8ACAE5")],
                    ),
                    frame_node(
                        "Info",
                        width="fill_container",
                        layout="vertical",
                        gap=6,
                        padding=[0, 16, 16, 16],
                        fill="#00000000",
                        children=[
                            text_node(name, fill="#1E293B", font_weight="700", font_size="$text-size-subhead"),
                            text_node(f"{time}  ·  {loc}", fill="#64748B", font_size="$text-size-caption"),
                            frame_node(
                                "Footer",
                                width="fill_container",
                                layout="horizontal",
                                justifyContent="space_between",
                                alignItems="center",
                                fill="#00000000",
                                children=[
                                    text_node(f"报名 {count}", fill="#64748B", font_size="$text-size-caption"),
                                    frame_node(
                                        "Button",
                                        width="fit_content",
                                        height=28,
                                        fill="#1986E6" if status != "已结束" else "#E2E8F0",
                                        cornerRadius=8,
                                        padding=[4, 12],
                                        justifyContent="center",
                                        alignItems="center",
                                        children=[text_node("报名" if status == "报名中" else status, fill="#FFFFFF" if status != "已结束" else "#64748B", font_size="$text-size-caption", font_weight="600")],
                                    ),
                                ],
                            ),
                        ],
                    ),
                ],
            )
        )
    return build_page("活动列表页", "活动列表", "calendar", GRADIENT_B, [filter_tabs(["全部", "报名中", "进行中", "已结束"]), group_card("活动列表", cards)])


def page_class_archive():
    archives = [
        ("2024-2025学年第一学期档案", "2025-01-15", "学期档案"),
        ("2023-2024学年第二学期档案", "2024-07-10", "学期档案"),
        ("2023-2024学年第一学期档案", "2024-01-12", "学期档案"),
    ]
    cards = []
    for name, date, typ in archives:
        cards.append(
            horizontal_card(
                icon_box("archive", "#DBEAFE", "#076CAB", size=48, icon_size=24),
                [
                    text_node(name, fill="#1E293B", font_weight="600"),
                    text_node(f"{date}  ·  {typ}", fill="#64748B", font_size="$text-size-caption"),
                ],
                status_tag="查看详情",
                tag_color="#076CAB",
                height=88,
            )
        )
    return build_page("班级电子档案页", "班级电子档案", "archive", GRADIENT_A, [group_card("2024-2025学年", cards[:1]), group_card("2023-2024学年", cards[1:])])


def page_publish_homework():
    body = [
        input_field("作业名称", "请输入作业名称"),
        input_field("所属班级", "请选择班级"),
        input_field("截止时间", "请选择截止时间"),
        textarea_field("作业要求", "请输入作业要求...", height=140),
        frame_node(
            "Upload Area",
            width="fill_container",
            height=120,
            fill="#F8FAFC",
            cornerRadius=12,
            stroke="#E2E8F0",
            strokeWidth=1,
            layout="vertical",
            gap=8,
            justifyContent="center",
            alignItems="center",
            children=[
                icon_path("upload", size=32, stroke="#94A3B8"),
                text_node("点击上传附件", fill="#94A3B8", font_size="$text-size-body"),
            ],
        ),
        spacer(height=20),
        primary_button("发布作业"),
    ]
    return build_page("发布作业页", "发布作业", "file-text", GRADIENT_A, body, page_height=980)


def page_publish_activity():
    body = [
        input_field("活动名称", "请输入活动名称"),
        input_field("活动时间", "请选择活动时间"),
        input_field("活动地点", "请输入活动地点"),
        textarea_field("活动详情", "请输入活动详情...", height=120),
        input_field("报名截止时间", "请选择报名截止时间"),
        input_field("人数限制", "请输入人数限制"),
        spacer(height=20),
        primary_button("发布活动"),
    ]
    return build_page("发布活动页", "发布活动", "calendar", GRADIENT_A, body, page_height=980)


def page_registration_form():
    body = [
        input_field("姓名", "请输入姓名"),
        input_field("学号", "请输入学号"),
        input_field("联系方式", "请输入手机号"),
        textarea_field("补充信息", "请输入补充信息...", height=120),
        spacer(height=20),
        primary_button("提交报名"),
    ]
    return build_page("报名表单页", "提交报名", "clipboard-list", GRADIENT_B, body)


def page_homework_submit():
    body = [
        frame_node(
            "Requirement Card",
            width="fill_container",
            height="fit_content",
            fill="#EBF4FF",
            cornerRadius=16,
            layout="vertical",
            gap=8,
            padding=16,
            children=[
                text_node("作业要求", fill="#1E293B", font_weight="700"),
                text_node("完成教材第三章习题 1-10，并提交电子版实验报告。", fill="#64748B", font_size="$text-size-body"),
                text_node("截止时间：03月25日 23:59", fill="#1986E6", font_size="$text-size-caption", font_weight="600"),
            ],
        ),
        frame_node(
            "Upload Area",
            width="fill_container",
            height=140,
            fill="#F8FAFC",
            cornerRadius=12,
            stroke="#E2E8F0",
            strokeWidth=1,
            layout="vertical",
            gap=8,
            justifyContent="center",
            alignItems="center",
            children=[
                icon_path("upload", size=40, stroke="#94A3B8"),
                text_node("点击上传作业文件", fill="#94A3B8", font_size="$text-size-body"),
            ],
        ),
        textarea_field("补充说明", "请输入补充说明...", height=100),
        spacer(height=20),
        primary_button("提交作业"),
    ]
    return build_page("作业提交页", "提交作业", "upload", GRADIENT_B, body)


def page_delay_apply():
    body = [
        input_field("申请延时的作业", "请选择作业"),
        input_field("申请延长时间", "请选择延长时间"),
        textarea_field("申请理由", "请输入申请理由...", height=140),
        spacer(height=20),
        primary_button("提交申请"),
    ]
    return build_page("延时申请页", "延时申请", "clock", GRADIENT_B, body)


def page_fee_record():
    body = [
        frame_node(
            "Type Switch",
            width="fill_container",
            height=44,
            fill="#F1F5F9",
            cornerRadius=12,
            layout="horizontal",
            padding=4,
            children=[
                frame_node("Income", width="fill_container", height=36, fill="#FFFFFF", cornerRadius=10, justifyContent="center", alignItems="center", children=[text_node("收入", fill="#22C55E", font_weight="600")]),
                frame_node("Expense", width="fill_container", height=36, fill="#00000000", justifyContent="center", alignItems="center", children=[text_node("支出", fill="#64748B", font_weight="600")]),
            ],
        ),
        input_field("金额", "请输入金额"),
        input_field("分类", "请选择分类"),
        textarea_field("备注", "请输入备注...", height=100),
        frame_node(
            "Upload Area",
            width="fill_container",
            height=100,
            fill="#F8FAFC",
            cornerRadius=12,
            stroke="#E2E8F0",
            strokeWidth=1,
            layout="vertical",
            gap=8,
            justifyContent="center",
            alignItems="center",
            children=[
                icon_path("camera", size=28, stroke="#94A3B8"),
                text_node("上传凭证", fill="#94A3B8", font_size="$text-size-caption"),
            ],
        ),
        spacer(height=20),
        primary_button("保存记录"),
    ]
    return build_page("班费记账页", "班费记账", "wallet", GRADIENT_A, body)


def page_payment_register():
    body = [
        frame_node(
            "Info Card",
            width="fill_container",
            height="fit_content",
            fill="#EBF4FF",
            cornerRadius=16,
            layout="vertical",
            gap=8,
            padding=16,
            children=[
                text_node("班费缴纳", fill="#1E293B", font_weight="700"),
                text_node("金额：¥50.00/人", fill="#64748B", font_size="$text-size-body"),
                text_node("截止时间：03月30日", fill="#1986E6", font_size="$text-size-caption", font_weight="600"),
            ],
        ),
        group_card("已缴费人员", [
            frame_node(
                "Member",
                width="fill_container",
                height=48,
                fill="$surface",
                cornerRadius=12,
                layout="horizontal",
                padding=[0, 12],
                gap=12,
                alignItems="center",
                children=[
                    frame_node("Avatar", width=28, height=28, fill="#076CAB", cornerRadius=9999, justifyContent="center", alignItems="center", children=[text_node("张", fill="#FFFFFF", font_size=12, font_weight="600")]),
                    text_node("张梓涵", fill="#1E293B", width="fill_container", font_weight="500"),
                    frame_node("Check", width=20, height=20, fill="#22C55E", cornerRadius=6, justifyContent="center", alignItems="center", children=[icon_path("check", size=14, stroke="#FFFFFF", stroke_width=3)]),
                ],
            ),
            frame_node(
                "Member",
                width="fill_container",
                height=48,
                fill="$surface",
                cornerRadius=12,
                layout="horizontal",
                padding=[0, 12],
                gap=12,
                alignItems="center",
                children=[
                    frame_node("Avatar", width=28, height=28, fill="#076CAB", cornerRadius=9999, justifyContent="center", alignItems="center", children=[text_node("李", fill="#FFFFFF", font_size=12, font_weight="600")]),
                    text_node("李雨桐", fill="#1E293B", width="fill_container", font_weight="500"),
                    frame_node("Check", width=20, height=20, fill="#22C55E", cornerRadius=6, justifyContent="center", alignItems="center", children=[icon_path("check", size=14, stroke="#FFFFFF", stroke_width=3)]),
                ],
            ),
        ]),
        spacer(height=20),
        primary_button("确认登记"),
    ]
    return build_page("缴费登记页", "缴费登记", "credit-card", GRADIENT_A, body)


def page_task_board():
    stats = frame_node(
        "Stats Row",
        width="fill_container",
        height="fit_content",
        layout="horizontal",
        gap=12,
        fill="#00000000",
        children=[
            stat_card("待完成", "12", width="fill_container(0)"),
            stat_card("进行中", "5", width="fill_container(0)"),
            stat_card("已完成", "28", width="fill_container(0)"),
        ],
    )
    tasks = [
        ("收集团日活动照片", "张梓涵", "03-25", 0.6),
        ("统计作业提交情况", "李雨桐", "03-24", 0.3),
        ("发布运动会通知", "赵宇航", "03-23", 0.9),
    ]
    cards = []
    for title, owner, due, prog in tasks:
        cards.append(
            frame_node(
                "Task Card",
                width="fill_container",
                height="fit_content",
                fill="$surface",
                cornerRadius=16,
                effect={"type": "shadow", "shadowType": "outer", "color": "$shadow-soft", "offset": {"x": 0, "y": 2}, "blur": 8},
                layout="vertical",
                gap=10,
                padding=16,
                children=[
                    frame_node(
                        "Row",
                        width="fill_container",
                        layout="horizontal",
                        justifyContent="space_between",
                        fill="#00000000",
                        children=[
                            text_node(title, fill="#1E293B", font_weight="600"),
                            text_node(f"{int(prog*100)}%", fill="#076CAB", font_weight="700"),
                        ],
                    ),
                    text_node(f"负责人：{owner}  ·  截止：{due}", fill="#64748B", font_size="$text-size-caption"),
                    frame_node(
                        "Progress Track",
                        width="fill_container",
                        height=6,
                        fill="#E2E8F0",
                        cornerRadius=9999,
                        children=[frame_node("Progress Fill", width=f"fill_container({prog})", height=6, fill="#076CAB", cornerRadius=9999)],
                    ),
                ],
            )
        )
    return build_page("任务看板", "任务看板", "target", GRADIENT_A, [stats, group_card("任务列表", cards)])


def page_registration_stats():
    stats = frame_node(
        "Stats Row",
        width="fill_container",
        height="fit_content",
        layout="horizontal",
        gap=12,
        fill="#00000000",
        children=[
            stat_card("已报名", "32", width="fill_container(0)"),
            stat_card("待审核", "8", width="fill_container(0)"),
            stat_card("报名率", "91%", width="fill_container(0)"),
        ],
    )
    people = [
        ("张梓涵", "03-20 10:23", "待审核"),
        ("李雨桐", "03-20 09:45", "已通过"),
        ("赵宇航", "03-19 18:20", "待审核"),
    ]
    rows = []
    for name, time, status in people:
        status_color = "#F59E0B" if status == "待审核" else "#22C55E"
        rows.append(
            frame_node(
                "Person Row",
                width="fill_container",
                height=64,
                fill="$surface",
                cornerRadius=12,
                layout="horizontal",
                padding=[0, 12],
                gap=12,
                alignItems="center",
                children=[
                    frame_node("Avatar", width=36, height=36, fill="#076CAB", cornerRadius=9999, justifyContent="center", alignItems="center", children=[text_node(name[0], fill="#FFFFFF", font_size=14, font_weight="600")]),
                    frame_node(
                        "Info",
                        width="fill_container",
                        layout="vertical",
                        gap=2,
                        fill="#00000000",
                        children=[
                            text_node(name, fill="#1E293B", font_weight="600"),
                            text_node(time, fill="#94A3B8", font_size="$text-size-caption"),
                        ],
                    ),
                    frame_node(
                        "Actions",
                        layout="horizontal",
                        gap=8,
                        fill="#00000000",
                        children=[
                            frame_node("Pass", width="fit_content", height=28, fill="#22C55E", cornerRadius=8, padding=[4, 10], justifyContent="center", alignItems="center", children=[text_node("通过", fill="#FFFFFF", font_size="$text-size-caption", font_weight="600")]),
                            frame_node("Reject", width="fit_content", height=28, fill="#EF4444", cornerRadius=8, padding=[4, 10], justifyContent="center", alignItems="center", children=[text_node("驳回", fill="#FFFFFF", font_size="$text-size-caption", font_weight="600")]),
                        ],
                    ),
                ],
            )
        )
    return build_page("报名统计页", "报名统计", "users", GRADIENT_A, [stats, group_card("报名人员", rows)])


def page_finance_report():
    stats = frame_node(
        "Stats Row",
        width="fill_container",
        height="fit_content",
        layout="horizontal",
        gap=12,
        fill="#00000000",
        children=[
            stat_card("总收入", "¥3,500", width="fill_container(0)"),
            stat_card("总支出", "¥1,280", width="fill_container(0)"),
            stat_card("结余", "¥2,220", width="fill_container(0)"),
        ],
    )
    chart = frame_node(
        "Chart",
        width="fill_container",
        height=180,
        fill="#FFFFFF",
        cornerRadius=16,
        effect={"type": "shadow", "shadowType": "outer", "color": "$shadow-soft", "offset": {"x": 0, "y": 2}, "blur": 8},
        layout="vertical",
        padding=16,
        children=[
            text_node("月度收支", fill="#1E293B", font_weight="700"),
            frame_node(
                "Bars",
                width="fill_container",
                height="fill_container",
                fill="#00000000",
                layout="horizontal",
                gap=8,
                alignItems="end",
                justifyContent="center",
                children=[
                    frame_node("Bar", width=24, height="fill_container(0.6)", fill="#076CAB", cornerRadius=[4, 4, 0, 0]),
                    frame_node("Bar", width=24, height="fill_container(0.4)", fill="#32C9FD", cornerRadius=[4, 4, 0, 0]),
                    frame_node("Bar", width=24, height="fill_container(0.75)", fill="#076CAB", cornerRadius=[4, 4, 0, 0]),
                    frame_node("Bar", width=24, height="fill_container(0.5)", fill="#32C9FD", cornerRadius=[4, 4, 0, 0]),
                    frame_node("Bar", width=24, height="fill_container(0.55)", fill="#076CAB", cornerRadius=[4, 4, 0, 0]),
                    frame_node("Bar", width=24, height="fill_container(0.35)", fill="#32C9FD", cornerRadius=[4, 4, 0, 0]),
                ],
            ),
        ],
    )
    items = [
        list_item("wallet", "收取班费", value="+¥50 x 35", icon_bg="#DCFCE7", icon_color="#22C55E"),
        list_item("receipt", "购买活动物资", value="-¥320", icon_bg="#FEE2E2", icon_color="#EF4444"),
        list_item("credit-card", "打印资料", value="-¥80", icon_bg="#FEE2E2", icon_color="#EF4444"),
    ]
    return build_page("收支报表页", "收支报表", "bar-chart", GRADIENT_A, [stats, chart, group_card("收支明细", items)])


def page_homework_detail():
    info = frame_node(
        "Info Card",
        width="fill_container",
        height="fit_content",
        fill="#EBF4FF",
        cornerRadius=16,
        layout="vertical",
        gap=8,
        padding=16,
        children=[
            text_node("数据结构作业3", fill="#1E293B", font_weight="700", font_size="$text-size-subhead"),
            text_node("发布时间：03-20 10:00", fill="#64748B", font_size="$text-size-caption"),
            text_node("截止时间：03-25 23:59", fill="#64748B", font_size="$text-size-caption"),
            text_node("提交状态：待提交", fill="#1986E6", font_size="$text-size-caption", font_weight="600"),
        ],
    )
    detail = frame_node(
        "Detail",
        width="fill_container",
        height="fit_content",
        fill="$surface",
        cornerRadius=16,
        effect={"type": "shadow", "shadowType": "outer", "color": "$shadow-soft", "offset": {"x": 0, "y": 2}, "blur": 8},
        layout="vertical",
        gap=10,
        padding=16,
        children=[
            text_node("作业要求", fill="#1E293B", font_weight="700"),
            text_node("完成教材第三章课后习题 1-10，并将实验报告以 PDF 格式提交。要求代码注释清晰，运行结果截图完整。", fill="#64748B", font_size="$text-size-body", width="fill_container", textGrowth="fixed-width", textAlign="left"),
            frame_node(
                "Attachment",
                width="fill_container",
                height=48,
                fill="#F8FAFC",
                cornerRadius=8,
                layout="horizontal",
                padding=[0, 12],
                gap=8,
                alignItems="center",
                children=[
                    icon_path("paperclip", size=20, stroke="#64748B"),
                    text_node("第三章习题.pdf", fill="#64748B", font_size="$text-size-caption"),
                ],
            ),
        ],
    )
    return build_page("作业详情页", "作业详情", "file-text", GRADIENT_B, [info, detail, spacer(height=12), primary_button("提交作业")])


def page_archive_detail():
    info = frame_node(
        "Info Card",
        width="fill_container",
        height="fit_content",
        fill="#EBF4FF",
        cornerRadius=16,
        layout="vertical",
        gap=8,
        padding=16,
        children=[
            text_node("2024-2025学年第一学期档案", fill="#1E293B", font_weight="700", font_size="$text-size-subhead"),
            text_node("生成时间：2025-01-15", fill="#64748B", font_size="$text-size-caption"),
            text_node("生成人：张梓涵", fill="#64748B", font_size="$text-size-caption"),
        ],
    )
    preview = frame_node(
        "Preview",
        width="fill_container",
        height="fit_content",
        fill="$surface",
        cornerRadius=16,
        effect={"type": "shadow", "shadowType": "outer", "color": "$shadow-soft", "offset": {"x": 0, "y": 2}, "blur": 8},
        layout="vertical",
        gap=10,
        padding=16,
        children=[
            text_node("档案内容预览", fill="#1E293B", font_weight="700"),
            text_node("包含班级成员名单、活动记录、考勤统计、班费收支等完整数据。", fill="#64748B", font_size="$text-size-body", width="fill_container", textGrowth="fixed-width", textAlign="left"),
        ],
    )
    attachments = group_card("附件列表", [
        list_item("file-text", "成员名单.xlsx", icon_bg="#DBEAFE", icon_color="#076CAB"),
        list_item("file-text", "活动照片.zip", icon_bg="#DBEAFE", icon_color="#076CAB"),
    ])
    return build_page("档案详情页", "档案详情", "archive", GRADIENT_A, [info, preview, attachments, spacer(height=12), primary_button("导出档案")])


def page_activity_detail():
    cover = frame_node(
        "Cover",
        width="fill_container",
        height=180,
        fill="#DBEAFE",
        cornerRadius=[0, 0, 20, 20],
        justifyContent="center",
        alignItems="center",
        children=[icon_path("image", size=64, stroke="#8ACAE5")],
    )
    info = frame_node(
        "Info",
        width="fill_container",
        height="fit_content",
        fill="$surface",
        cornerRadius=16,
        effect={"type": "shadow", "shadowType": "outer", "color": "$shadow-soft", "offset": {"x": 0, "y": 2}, "blur": 8},
        layout="vertical",
        gap=10,
        padding=16,
        children=[
            text_node("春季运动会", fill="#1E293B", font_weight="700", font_size="$text-size-subhead"),
            text_node("时间：04月12日 08:00", fill="#64748B", font_size="$text-size-body"),
            text_node("地点：体育馆", fill="#64748B", font_size="$text-size-body"),
            text_node("报名人数：32/50", fill="#1986E6", font_size="$text-size-caption", font_weight="600"),
        ],
    )
    detail = frame_node(
        "Detail",
        width="fill_container",
        height="fit_content",
        fill="$surface",
        cornerRadius=16,
        effect={"type": "shadow", "shadowType": "outer", "color": "$shadow-soft", "offset": {"x": 0, "y": 2}, "blur": 8},
        layout="vertical",
        gap=10,
        padding=16,
        children=[
            text_node("活动详情", fill="#1E293B", font_weight="700"),
            text_node("一年一度的春季运动会即将开始，请同学们积极报名参加各项赛事。", fill="#64748B", font_size="$text-size-body", width="fill_container", textGrowth="fixed-width", textAlign="left"),
        ],
    )
    return build_page("活动详情页", "活动详情", "calendar", GRADIENT_B, [cover, info, detail, spacer(height=12), primary_button("立即报名")])


def page_fee_ledger():
    balance = frame_node(
        "Balance Card",
        width="fill_container",
        height="fit_content",
        fill="#076CAB",
        cornerRadius=20,
        effect={"type": "shadow", "shadowType": "outer", "color": "#00000026", "offset": {"x": 0, "y": 6}, "blur": 20},
        layout="vertical",
        gap=8,
        padding=24,
        children=[
            text_node("当前班费余额", fill="#FFFFFFCC", font_size="$text-size-body"),
            text_node("¥2,220.00", fill="#FFFFFF", font_family="$font-heading", font_size="$text-size-hero", font_weight="700"),
            frame_node(
                "Month",
                width="fill_container",
                layout="horizontal",
                gap=16,
                fill="#00000000",
                children=[
                    text_node("本月收入 +¥500", fill="#FFFFFFCC", font_size="$text-size-caption"),
                    text_node("本月支出 -¥120", fill="#FFFFFFCC", font_size="$text-size-caption"),
                ],
            ),
        ],
    )
    items = [
        list_item("wallet", "收取班费", value="+¥50", icon_bg="#DCFCE7", icon_color="#22C55E"),
        list_item("receipt", "购买矿泉水", value="-¥60", icon_bg="#FEE2E2", icon_color="#EF4444"),
        list_item("receipt", "打印资料", value="-¥80", icon_bg="#FEE2E2", icon_color="#EF4444"),
        list_item("wallet", "退还班费", value="+¥30", icon_bg="#DCFCE7", icon_color="#22C55E"),
    ]
    return build_page("班费账本页", "班费账本", "wallet", GRADIENT_A, [balance, filter_tabs(["全部", "本月", "上月"]), group_card("收支明细", items)])


def page_messages():
    tabs = filter_tabs(["通知", "作业", "活动", "互动"])
    msgs = [
        ("bell", "班会通知", "本周五晚7点在教学楼A301召开班会，请准时参加。", "10:30", True),
        ("file-text", "数据结构作业", "作业3已发布，截止时间为3月25日。", "昨天", False),
        ("calendar", "运动会报名", "春季运动会报名即将截止，请及时报名。", "周一", True),
        ("message-circle", "李雨桐", "请问作业需要手写还是电子版？", "周日", False),
    ]
    rows = []
    for icon, title, preview, time, unread in msgs:
        rows.append(
            frame_node(
                "Message Row",
                width="fill_container",
                height=76,
                fill="$surface",
                cornerRadius=16,
                effect={"type": "shadow", "shadowType": "outer", "color": "$shadow-soft", "offset": {"x": 0, "y": 2}, "blur": 8},
                layout="horizontal",
                padding=[12, 12],
                gap=12,
                alignItems="center",
                children=[
                    icon_box(icon, "#DBEAFE" if icon != "message-circle" else "#FEF3C7", "#1986E6" if icon != "message-circle" else "#D97706", size=44, icon_size=24),
                    frame_node(
                        "Text",
                        width="fill_container",
                        layout="vertical",
                        gap=4,
                        fill="#00000000",
                        children=[
                            frame_node(
                                "Title Row",
                                width="fill_container",
                                layout="horizontal",
                                justifyContent="space_between",
                                fill="#00000000",
                                children=[
                                    text_node(title, fill="#1E293B", font_weight="600"),
                                    text_node(time, fill="#94A3B8", font_size="$text-size-caption"),
                                ],
                            ),
                            text_node(preview, fill="#64748B", font_size="$text-size-caption", width="fill_container", textGrowth="fixed-width", textAlign="left"),
                        ],
                    ),
                    frame_node("Dot", width=8, height=8, fill="#EF4444" if unread else "#00000000", cornerRadius=9999, layout=None) if unread else frame_node("Dot", width=8, height=8, fill="#00000000", cornerRadius=9999, layout=None),
                ],
            )
        )
    return build_page("互动消息页", "互动消息", "message-circle", GRADIENT_B, [tabs, group_card("消息列表", rows)])


PAGE_BUILDERS = {
    "设置": page_settings,
    "个人信息页": page_profile,
    "再次提醒设置页": page_reminder_settings,
    "关于页": page_about,
    "我的考勤": page_my_attendance,
    "我的作业": page_my_homework,
    "我的活动": page_my_activities,
    "我的报名页": page_my_registration,
    "我的报名记录": page_my_registration_records,
    "作业列表页": page_homework_list,
    "投票列表页": page_vote_list,
    "活动列表页": page_activity_list,
    "班级电子档案页": page_class_archive,
    "发布作业页": page_publish_homework,
    "发布活动页": page_publish_activity,
    "报名表单页": page_registration_form,
    "作业提交页": page_homework_submit,
    "延时申请页": page_delay_apply,
    "班费记账页": page_fee_record,
    "缴费登记页": page_payment_register,
    "任务看板": page_task_board,
    "报名统计页": page_registration_stats,
    "收支报表页": page_finance_report,
    "作业详情页": page_homework_detail,
    "档案详情页": page_archive_detail,
    "活动详情页": page_activity_detail,
    "班费账本页": page_fee_ledger,
    "互动消息页": page_messages,
}


def main():
    with open(PEN_PATH, "r", encoding="utf-8") as f:
        doc = json.load(f)

    pages_by_name = {}
    for i, child in enumerate(doc["children"]):
        if child.get("type") == "frame":
            pages_by_name[child.get("name", "")] = (i, child)

    for name, builder in PAGE_BUILDERS.items():
        new_page = builder()
        if name in pages_by_name:
            idx, old_page = pages_by_name[name]
            # Preserve position and id
            new_page["id"] = old_page["id"]
            new_page["x"] = old_page.get("x", 0)
            new_page["y"] = old_page.get("y", 0)
            doc["children"][idx] = new_page
            print(f"Updated: {name}")
        else:
            print(f"Created new: {name}")
            doc["children"].append(new_page)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)

    print(f"\nSaved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
