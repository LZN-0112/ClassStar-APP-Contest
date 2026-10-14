import json, os, sys

PEN = r"d:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"

def load_pen():
    with open(PEN, "r", encoding="utf-8") as f:
        return json.load(f)

def find_pages(doc):
    pages = {}
    for child in doc.get("children", []):
        if child.get("type") == "frame":
            pages[child.get("name", "")] = child
    return pages

def simplify_node(node, depth=0):
    """Return a compact representation of a node tree."""
    if not isinstance(node, dict):
        return node
    result = {"type": node.get("type"), "name": node.get("name"), "id": node.get("id")}
    if "width" in node:
        result["width"] = node["width"]
    if "height" in node:
        result["height"] = node["height"]
    if "layout" in node:
        result["layout"] = node["layout"]
    if "fill" in node:
        result["fill"] = node["fill"]
    if "children" in node:
        result["children"] = [simplify_node(c, depth+1) for c in node["children"]]
    if "ref" in node:
        result["ref"] = node["ref"]
        result["descendants_keys"] = list(node.get("descendants", {}).keys())
    return result

def print_page_summary(page_name, pages):
    page = pages.get(page_name)
    if not page:
        print(f"Page '{page_name}' not found")
        return
    print(f"\n=== {page_name} ===")
    print(json.dumps(simplify_node(page), ensure_ascii=False, indent=2))

if __name__ == "__main__":
    doc = load_pen()
    pages = find_pages(doc)
    print(f"Total top-level frames: {len(pages)}")
    print("Existing pages:")
    for name in sorted(pages.keys()):
        print(f"  - {name}")
    
    target_pages = [
        "设置", "个人信息页", "再次提醒设置页", "关于页",
        "我的考勤", "我的作业", "我的活动", "我的报名页", "我的报名记录",
        "作业列表页", "投票列表页", "活动列表页", "班级电子档案页",
        "发布作业页", "发布活动页", "报名表单页", "作业提交页", "延时申请页", "班费记账页", "缴费登记页",
        "任务看板", "报名统计页", "收支报表页",
        "作业详情页", "档案详情页", "活动详情页", "班费账本页", "互动消息页"
    ]
    print("\nTarget pages existence:")
    for name in target_pages:
        print(f"  {'[OK]' if name in pages else '[MISSING]'} {name}")
    
    # Save full structure of a few key pages for inspection
    os.makedirs("page_inspect", exist_ok=True)
    for name in ["设置", "班级设置页", "文件列表页", "下载统计页"]:
        page = pages.get(name)
        if page:
            with open(f"page_inspect/{name}.json", "w", encoding="utf-8") as f:
                json.dump(page, f, ensure_ascii=False, indent=2)
