#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Redesign the Pomodoro focus page (S9Uq99) in the .pen file.

Icons are sourced from Tabler Icons via the Iconify API (tabler:*).
Design tokens follow shadcn/ui + impeccable / taste-skill conventions.
"""

import json
import os
import re
import shutil
from uuid import uuid4

PEN_PATH = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
BACKUP_PATH = PEN_PATH + ".bak"

# ---------------------------------------------------------------------------
# Colors & tokens (blue accent for focus page)
# ---------------------------------------------------------------------------
BLUE_500 = "#3B82F6"
BLUE_400 = "#60A5FA"
BLUE_100 = "#DBEAFE"
SURFACE = "$surface"
TEXT_PRIMARY = "$text-primary"
TEXT_SECONDARY = "$text-secondary"
TEXT_MUTED = "$text-muted"
TEXT_INVERSE = "$text-inverse"

# Icon SVG paths from Iconify / Tabler
ICONS = {
    "chevron-left": "m15 6l-6 6l6 6",
    "settings": (
        "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066"
        "c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35"
        "a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065"
        "c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37"
        "a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573"
        "c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065 M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0"
    ),
    "book": "M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6v13m9-13v13m9-13v13",
    "refresh": "M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4m-4 4a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4",
    "player-play": "M7 4v16l13-8z",
    "square": "M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
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


def icon_path(node_id, name, icon_name, size, color, stroke_width=2, filled=False):
    """Return a Pencil path node for a Tabler icon."""
    return {
        "type": "path",
        "id": node_id,
        "name": name,
        "geometry": ICONS[icon_name],
        "viewBox": [0, 0, 24, 24],
        "fill": color if filled else "#00000000",
        "width": size,
        "height": size,
        "stroke": "#00000000" if filled else color,
        "strokeWidth": 0 if filled else stroke_width,
        "strokeLinejoin": "round",
        "strokeLinecap": "round",
    }


def shadow(color, offset_y, blur):
    return {
        "type": "shadow",
        "shadowType": "outer",
        "color": color,
        "offset": {"x": 0, "y": offset_y},
        "blur": blur,
    }


def linear_gradient(color_from, color_to, rotation=180):
    return {
        "type": "gradient",
        "gradientType": "linear",
        "enabled": True,
        "rotation": rotation,
        "size": {"height": 1},
        "colors": [
            {"color": color_from, "position": 0},
            {"color": color_to, "position": 1},
        ],
    }


PAGE_BG_GRADIENT = linear_gradient("#85C5F4", "#F1F8FE", rotation=135)


def text_node(node_id, name, content, font_family, font_size, color, weight="normal"):
    return {
        "type": "text",
        "id": node_id,
        "name": name,
        "fill": color,
        "content": content,
        "fontFamily": font_family,
        "fontSize": font_size,
        "fontWeight": weight,
    }


# ---------------------------------------------------------------------------
# Page builder
# ---------------------------------------------------------------------------
def build_pomodoro_page(existing_ids):
    # Header ----------------------------------------------------------------
    header_id = generate_id(existing_ids)
    back_id = generate_id(existing_ids)
    title_id = generate_id(existing_ids)
    settings_id = generate_id(existing_ids)

    header = {
        "type": "frame",
        "id": header_id,
        "name": "Header",
        "width": "fill_container",
        "height": 56,
        "fill": SURFACE,
        "layout": "horizontal",
        "padding": [0, 16],
        "justifyContent": "space_between",
        "alignItems": "center",
        "children": [
            icon_path(back_id, "Icon-back", "chevron-left", 24, TEXT_PRIMARY),
            text_node(title_id, "Title", "专注", "$font-heading", "$text-size-subhead", TEXT_PRIMARY, "600"),
            icon_path(settings_id, "Icon-settings", "settings", 24, TEXT_PRIMARY),
        ],
    }

    # Task card -------------------------------------------------------------
    card_id = generate_id(existing_ids)
    card_icon_container_id = generate_id(existing_ids)
    card_icon_id = generate_id(existing_ids)
    card_text_stack_id = generate_id(existing_ids)
    card_task_id = generate_id(existing_ids)
    card_duration_id = generate_id(existing_ids)
    card_meta_stack_id = generate_id(existing_ids)
    card_session_id = generate_id(existing_ids)
    card_round_id = generate_id(existing_ids)

    task_card = {
        "type": "frame",
        "id": card_id,
        "name": "Task Card",
        "width": 345,
        "height": 80,
        "fill": SURFACE,
        "cornerRadius": "$rounded-xl",
        "stroke": "#00000000",
        "strokeWidth": 1,
        "effect": shadow("#0000000D", 2, 8),
        "layout": "horizontal",
        "padding": [16, 20],
        "justifyContent": "space_between",
        "alignItems": "center",
        "children": [
            {
                "type": "frame",
                "id": generate_id(existing_ids),
                "name": "Left Row",
                "layout": "horizontal",
                "gap": 14,
                "alignItems": "center",
                "children": [
                    {
                        "type": "frame",
                        "id": card_icon_container_id,
                        "name": "Icon Container",
                        "width": 48,
                        "height": 48,
                        "fill": BLUE_100,
                        "cornerRadius": 9999,
                        "justifyContent": "center",
                        "alignItems": "center",
                        "children": [icon_path(card_icon_id, "Icon-book", "book", 24, BLUE_500)],
                    },
                    {
                        "type": "frame",
                        "id": card_text_stack_id,
                        "name": "Task Text",
                        "layout": "vertical",
                        "gap": 4,
                        "justifyContent": "center",
                        "children": [
                            text_node(card_task_id, "Task Name", "复习高数·第三章习题", "$font-heading", "$text-size-body", TEXT_PRIMARY, "500"),
                            text_node(card_duration_id, "Duration", "总预计 120 分钟", "$font-caption", "$text-size-caption", TEXT_SECONDARY),
                        ],
                    },
                ],
            },
            {
                "type": "frame",
                "id": card_meta_stack_id,
                "name": "Meta Text",
                "layout": "vertical",
                "gap": 4,
                "justifyContent": "center",
                "alignItems": "end",
                "children": [
                    text_node(card_session_id, "Session", "1/4", "$font-heading", "$text-size-body", TEXT_PRIMARY, "500"),
                    text_node(card_round_id, "Round", "25分钟", "$font-caption", "$text-size-caption", TEXT_SECONDARY),
                ],
            },
        ],
    }

    # Timer ring ------------------------------------------------------------
    timer_container_id = generate_id(existing_ids)
    ring_bg_id = generate_id(existing_ids)
    ring_progress_id = generate_id(existing_ids)
    timer_info_id = generate_id(existing_ids)
    timer_digits_id = generate_id(existing_ids)
    timer_round_id = generate_id(existing_ids)
    timer_tip_id = generate_id(existing_ids)

    R = 110
    CX, CY = 130, 130
    # Full background ring
    ring_bg_path = (
        f"M{CX},{CY - R} "
        f"A{R},{R} 0 1,1 {CX},{CY + R} "
        f"A{R},{R} 0 1,1 {CX},{CY - R}"
    )
    # 75% progress arc from top -> left, clockwise
    ring_progress_path = f"M{CX},{CY - R} A{R},{R} 0 1,1 {CX - R},{CY}"

    timer_ring = {
        "type": "frame",
        "id": timer_container_id,
        "name": "Timer Ring",
        "width": 284,
        "height": 284,
        "fill": "#00000000",
        "layout": "none",
        "children": [
            {
                "type": "path",
                "id": ring_bg_id,
                "name": "Ring Background",
                "x": 12,
                "y": 12,
                "geometry": ring_bg_path,
                "width": 260,
                "height": 260,
                "fill": "#00000000",
                "stroke": BLUE_100,
                "strokeWidth": 18,
                "strokeLinecap": "round",
            },
            {
                "type": "path",
                "id": ring_progress_id,
                "name": "Ring Progress",
                "x": 12,
                "y": 12,
                "geometry": ring_progress_path,
                "width": 260,
                "height": 260,
                "fill": "#00000000",
                "stroke": BLUE_500,
                "strokeWidth": 18,
                "strokeLinecap": "round",
            },
            {
                "type": "frame",
                "id": timer_info_id,
                "name": "Timer Info",
                "x": 12,
                "y": 12,
                "width": 260,
                "height": 260,
                "fill": "#00000000",
                "layout": "vertical",
                "gap": 6,
                "justifyContent": "center",
                "alignItems": "center",
                "children": [
                    {
                        "type": "text",
                        "id": timer_digits_id,
                        "name": "Timer",
                        "fill": TEXT_PRIMARY,
                        "content": "25:00",
                        "fontFamily": "$font-data",
                        "fontSize": 56,
                        "fontWeight": "700",
                        "width": 200,
                        "height": 64,
                        "textGrowth": "fixed-width-height",
                        "textAlign": "center",
                        "textAlignVertical": "middle",
                    },
                    {
                        "type": "text",
                        "id": timer_round_id,
                        "name": "Round Info",
                        "fill": TEXT_SECONDARY,
                        "content": "第1轮 / 共4轮",
                        "fontFamily": "$font-caption",
                        "fontSize": "$text-size-caption",
                        "width": 200,
                        "height": 20,
                        "textGrowth": "fixed-width-height",
                        "textAlign": "center",
                        "textAlignVertical": "middle",
                    },
                    {
                        "type": "text",
                        "id": timer_tip_id,
                        "name": "Tip",
                        "fill": TEXT_MUTED,
                        "content": "保持专注 25 分钟",
                        "fontFamily": "$font-caption",
                        "fontSize": "$text-size-caption",
                        "width": 200,
                        "height": 20,
                        "textGrowth": "fixed-width-height",
                        "textAlign": "center",
                        "textAlignVertical": "middle",
                    },
                    {
                        "type": "frame",
                        "id": generate_id(existing_ids),
                        "name": "Set Time Button",
                        "width": 112,
                        "height": 32,
                        "fill": "#DBEAFE",
                        "cornerRadius": 16,
                        "layout": "horizontal",
                        "gap": 4,
                        "justifyContent": "center",
                        "alignItems": "center",
                        "children": [
                            {
                                "type": "path",
                                "id": generate_id(existing_ids),
                                "name": "Clock Icon",
                                "geometry": "M21 12a9 9 0 1 0-9.972 8.948q.48.051.972.052",
                                "viewBox": [0, 0, 24, 24],
                                "fill": "#00000000",
                                "stroke": BLUE_500,
                                "strokeWidth": 2,
                                "strokeLinecap": "round",
                                "strokeLinejoin": "round",
                                "width": 14,
                                "height": 14,
                            },
                            {
                                "type": "path",
                                "id": generate_id(existing_ids),
                                "name": "Edit Icon",
                                "geometry": "M12 7v5l2 2m4.42 1.61a2.1 2.1 0 0 1 2.97 2.97L18 22h-3v-3z",
                                "viewBox": [0, 0, 24, 24],
                                "fill": "#00000000",
                                "stroke": BLUE_500,
                                "strokeWidth": 2,
                                "strokeLinecap": "round",
                                "strokeLinejoin": "round",
                                "width": 14,
                                "height": 14,
                            },
                            {
                                "type": "text",
                                "id": generate_id(existing_ids),
                                "name": "Set Time Label",
                                "fill": BLUE_500,
                                "content": "设置时间",
                                "fontFamily": "$font-caption",
                                "fontSize": 12,
                                "fontWeight": "600",
                                "width": 52,
                                "height": 18,
                                "textGrowth": "fixed-width-height",
                                "textAlign": "left",
                                "textAlignVertical": "middle",
                            },
                        ],
                    },
                ],
            },
        ],
    }

    # Bottom buttons --------------------------------------------------------
    button_row_id = generate_id(existing_ids)
    reset_btn_id = generate_id(existing_ids)
    reset_icon_id = generate_id(existing_ids)
    play_btn_id = generate_id(existing_ids)
    play_icon_id = generate_id(existing_ids)
    stop_btn_id = generate_id(existing_ids)
    stop_icon_id = generate_id(existing_ids)

    def circle_button(bid, iid, name, size, icon_name, icon_size, fill, icon_color, shadow_effect, filled=False):
        return {
            "type": "frame",
            "id": bid,
            "name": name,
            "width": size,
            "height": size,
            "fill": fill,
            "cornerRadius": 9999,
            "effect": shadow_effect,
            "justifyContent": "center",
            "alignItems": "center",
            "children": [icon_path(iid, f"Icon-{icon_name}", icon_name, icon_size, icon_color, filled=filled)],
        }

    button_row = {
        "type": "frame",
        "id": button_row_id,
        "name": "Button Row",
        "width": "fill_container",
        "layout": "horizontal",
        "gap": 32,
        "justifyContent": "center",
        "alignItems": "center",
        "children": [
            circle_button(reset_btn_id, reset_icon_id, "Reset Button", 56, "refresh", 24, SURFACE, TEXT_SECONDARY, shadow("#0000000D", 2, 8)),
            circle_button(play_btn_id, play_icon_id, "Play Button", 72, "player-play", 28, linear_gradient(BLUE_500, BLUE_400), TEXT_INVERSE, shadow("#3B82F666", 6, 20), filled=True),
            circle_button(stop_btn_id, stop_icon_id, "Stop Button", 56, "square", 24, SURFACE, TEXT_SECONDARY, shadow("#0000000D", 2, 8)),
        ],
    }

    # Body ------------------------------------------------------------------
    body_id = generate_id(existing_ids)
    body = {
        "type": "frame",
        "id": body_id,
        "name": "Body",
        "width": "fill_container",
        "height": "fill_container",
        "fill": PAGE_BG_GRADIENT,
        "layout": "vertical",
        "gap": 40,
        "padding": [44, 24, 0, 24],
        "alignItems": "center",
        "children": [task_card, timer_ring, button_row],
    }

    # Phone-frame descendant overrides --------------------------------------
    content_override = {
        "type": "frame",
        "id": "oterL",
        "name": "Content",
        "width": "fill_container",
        "height": "fill_container",
        "fill": PAGE_BG_GRADIENT,
        "layout": "vertical",
        "children": [header, body],
    }

    status_bar_override = {
        "fill": SURFACE,
    }

    return content_override, status_bar_override


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def find_page(doc, page_id):
    for child in doc.get("children", []):
        if child.get("id") == page_id:
            return child
    raise RuntimeError(f"Page {page_id} not found")


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

    page = find_page(doc, "S9Uq99")
    page["fill"] = PAGE_BG_GRADIENT

    content_override, status_bar_override = build_pomodoro_page(existing_ids)

    phone_ref = None
    for child in page.get("children", []):
        if child.get("type") == "ref" and child.get("ref") == "lPWz4":
            phone_ref = child
            break

    if phone_ref is None:
        raise RuntimeError("Phone Frame ref (lPWz4) not found in S9Uq99")

    descendants = phone_ref.setdefault("descendants", {})
    descendants["n9xLw"] = content_override
    descendants["JIHZi"] = status_bar_override

    with open(PEN_PATH, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)

    print(f"Updated {PEN_PATH}")

    # Also generate a batch_design input file so the open Pencil editor can be
    # synced with the same changes (the editor works on in-memory state).
    generate_batch_design_input(doc, content_override, status_bar_override)


def generate_batch_design_input(doc, content_override, status_bar_override):
    """Write a batch_design JS snippet that applies the same changes to the open editor."""
    page = find_page(doc, "S9Uq99")
    phone_ref = next(
        (c for c in page.get("children", []) if c.get("type") == "ref" and c.get("ref") == "lPWz4"),
        None,
    )
    if phone_ref is None:
        return

    # Build JS snippet using the resolved instance IDs currently present in the
    # open Pencil editor (queried via batch_get). The Phone Frame instance root
    # is "gRvub", its Content frame is "r0Gc5", and the status bar is
    # "gRvub/JIHZi".
    content_id = "r0Gc5"
    content_override["id"] = content_id
    js_lines = [
        f'Replace("gRvub/{content_id}", {json.dumps(content_override, ensure_ascii=False)});',
        f'Update("gRvub/JIHZi", {json.dumps(status_bar_override, ensure_ascii=False)});',
        f'Update("S9Uq99", {{fill: "{PAGE_BG_GRADIENT}"}});',
    ]
    snippet = "\n".join(js_lines)

    batch_path = os.path.join(os.path.dirname(PEN_PATH), "batch_design_pomodoro.txt")
    with open(batch_path, "w", encoding="utf-8") as f:
        f.write(snippet)
    print(f"Batch design input written to: {batch_path}")


if __name__ == "__main__":
    main()
