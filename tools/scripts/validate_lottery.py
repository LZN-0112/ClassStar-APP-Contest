import json
import os

PEN = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
PNG = r"D:\校园班级事务智能管理助手\exports\home_redesign_v3\CJA3J.png"

doc = json.load(open(PEN, "r", encoding="utf-8"))
pages = [(c.get("id"), c.get("name"), len(c.get("children", []))) for c in doc.get("children", [])]
print("pages:", pages)

found = [c for c in doc.get("children", []) if c.get("id") == "CJA3J"]
print("CJA3J found:", bool(found))

if found:
    page = found[0]
    print("CJA3J direct children ids:", [c.get("id") for c in page.get("children", [])])
    refs = [(x.get("ref"), list(x.get("descendants", {}).keys())) for x in page.get("children", []) if x.get("type") == "ref"]
    print("refs:", refs)

    machine_fills = []
    def walk(node, depth=0):
        node_id = node.get("id", "")
        node_name = node.get("name", "")
        if node_id and ("machine" in node_id or node_name == "Lottery Machine" or node_name == "Lottery Machine Overlay"):
            machine_fills.append((node_id, node_name, node.get("fill"), node.get("x"), node.get("y"), node.get("width"), node.get("height")))
        for c in node.get("children", []) or []:
            walk(c, depth + 1)
        if node.get("type") == "ref" and node.get("descendants"):
            for d in node["descendants"].values():
                walk(d, depth + 1)
    walk(page)
    print("machine nodes:", machine_fills)

print("PNG exists:", os.path.exists(PNG), "size bytes:", os.path.getsize(PNG) if os.path.exists(PNG) else None)
