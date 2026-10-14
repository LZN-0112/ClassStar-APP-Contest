#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""给导入学生名单页的 4 个导入选项卡片添加阴影效果。"""

import json
import shutil

PEN = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
BAK = PEN + ".import_shadow_bak"

PAGE_ID = "jnG0v"
CARD_IDS = ["h8JRl", "Tk921", "XquXK", "kMzkG"]

SHADOW = {
    "type": "shadow",
    "shadowType": "outer",
    "color": "$shadow-soft",
    "offset": {"x": 0, "y": 2},
    "blur": 8,
}


def find_page(root, page_id):
    for child in root.get("children", []):
        if child.get("id") == page_id:
            return child
    return None


def find_node(root, node_id):
    if isinstance(root, dict):
        if root.get("id") == node_id:
            return root
        for v in root.values():
            found = find_node(v, node_id)
            if found is not None:
                return found
    elif isinstance(root, list):
        for item in root:
            found = find_node(item, node_id)
            if found is not None:
                return found
    return None


def main():
    shutil.copy2(PEN, BAK)
    with open(PEN, "r", encoding="utf-8") as f:
        doc = json.load(f)

    page = find_page(doc, PAGE_ID)
    if page is None:
        raise RuntimeError(f"未找到页面 {PAGE_ID}")

    for card_id in CARD_IDS:
        card = find_node(page, card_id)
        if card is None:
            raise RuntimeError(f"未找到卡片 {card_id}")
        card["effect"] = SHADOW
        print(f"已为卡片 {card_id} 添加阴影")

    with open(PEN, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)

    print(f"原文件已备份至: {BAK}")


if __name__ == "__main__":
    main()
