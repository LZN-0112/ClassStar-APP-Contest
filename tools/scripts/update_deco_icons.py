#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""替换班级设置页和隐私设置页的装饰图标为规范要求的 Iconify 图标。"""

import json
import shutil

PEN = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
BAK = PEN + ".deco_bak"

# Iconify Tabler 图标 path 数据
ICONS = {
    "certificate": (
        "M12 15a3 3 0 1 0 6 0a3 3 0 1 0-6 0 "
        "M13 17.5V22l2-1.5l2 1.5v-4.5 "
        "M10 19H5a2 2 0 0 1-2-2V7c0-1.1.9-2 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-1 1.73 "
        "M6 9h12M6 12h3m-3 3h2"
    ),
    "lock": (
        "M5 13a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z "
        "M11 16a1 1 0 1 0 2 0a1 1 0 0 0-2 0m-3-5V7a4 4 0 1 1 8 0v4"
    ),
}


def find_node(root, predicate):
    if isinstance(root, dict):
        if predicate(root):
            return root
        for v in root.values():
            found = find_node(v, predicate)
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


def update_icon_by_id(doc, page_id, icon_id, new_icon_name):
    page = find_page(doc, page_id)
    if page is None:
        raise RuntimeError(f"未找到页面 {page_id}")

    icon = find_node(page, lambda n: isinstance(n, dict) and n.get("id") == icon_id)
    if icon is None:
        raise RuntimeError(f"页面 {page_id} 未找到装饰图标 {icon_id}")

    icon["geometry"] = ICONS[new_icon_name]
    icon["name"] = f"Icon-{new_icon_name}"
    print(f"已更新 {page_id} 装饰图标为 {new_icon_name}")


def main():
    shutil.copy2(PEN, BAK)
    with open(PEN, "r", encoding="utf-8") as f:
        doc = json.load(f)

    # 班级设置页：齿轮/award -> 班级徽章/证书（certificate）
    update_icon_by_id(doc, "a33CF4", "p9ccd4fa3", "certificate")

    # 隐私设置页：盾牌 -> 锁形（lock）
    update_icon_by_id(doc, "YoFn3", "3B2yAd", "lock")

    with open(PEN, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)

    print(f"原文件已备份至: {BAK}")


if __name__ == "__main__":
    main()
