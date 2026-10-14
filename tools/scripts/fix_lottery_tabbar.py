#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""修复随机抽签页底部导航栏「班级」图标缺失的 geometry，并保持高亮状态。"""

import json
import shutil

PEN = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
BAK = PEN + ".tabbar_bak"

# Tab Bar 组件中「班级」图标的正确 geometry
CLASS_ICON_GEOMETRY = (
    "M19 13.431v2.569c0 2.398-3.205 4-7 4s-7-1.602-7-4v-2.569l5.886 2.354 "
    "a3 3 0 0 0 2.011 0.078l0.217-0.078z m2-2.955l-8.629 3.452a1 1 0 0 1-0.742 0 "
    "l-10-4c-0.839-0.335-0.839-1.521 0-1.856l10-4a1 1 0 0 1 0.245-0.064l0.126-0.008 "
    "0.126 0.008a1 1 0 0 1 0.245 0.064l10.032 4.013 0.108 0.055 0.099 0.068 0.088 0.076 "
    "0.075 0.082 0.035 0.044 0.073 0.115 0.052 0.115 0.034 0.102 0.025 0.135 0.006 0.058 "
    "0.002 6.065a1 1 0 0 1-2 0z"
)


def find_page(root, page_id):
    for child in root.get("children", []):
        if child.get("id") == page_id:
            return child
    return None


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


def main():
    shutil.copy2(PEN, BAK)
    with open(PEN, "r", encoding="utf-8") as f:
        doc = json.load(f)

    page = find_page(doc, "CJA3J")
    if page is None:
        raise RuntimeError("未找到随机抽签页 CJA3J")

    icon = find_node(
        page,
        lambda n: isinstance(n, dict)
        and n.get("type") == "path"
        and n.get("name") == "Icon-Class-Filled"
        and n.get("id") == "a3Xkr",
    )
    if icon is None:
        raise RuntimeError("未找到班级图标 a3Xkr")

    icon["geometry"] = CLASS_ICON_GEOMETRY
    icon["viewBox"] = [0, 0, 24, 24]
    icon["strokeLinecap"] = "round"
    icon["strokeLinejoin"] = "round"
    # 保持高亮状态
    icon["fill"] = "$accent"
    icon["stroke"] = "$accent"

    print("已修复随机抽签页底部导航栏「班级」图标")

    with open(PEN, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)

    print(f"原文件已备份至: {BAK}")


if __name__ == "__main__":
    main()
