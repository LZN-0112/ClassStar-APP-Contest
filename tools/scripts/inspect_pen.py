import json, sys
path = sys.argv[1]
doc = json.load(open(path, "r", encoding="utf-8"))
page = next((c for c in doc.get("children", []) if c.get("id") == "CJA3J"), None)
if not page:
    print("no CJA3J")
    sys.exit()
print("file:", path)
print("direct children ids:", [c.get("id") for c in page.get("children", [])])
print("refs:", [(x.get("ref"), list(x.get("descendants", {}).keys())) for x in page.get("children", []) if x.get("type") == "ref"])

def walk(node, depth=0):
    indent = "  " * depth
    print(indent, node.get("type"), node.get("id"), node.get("name"), "fill" in node and "image" in str(node.get("fill")))
    for c in node.get("children", []) or []:
        walk(c, depth+1)
    if node.get("type") == "ref" and node.get("descendants"):
        for d in node["descendants"].values():
            walk(d, depth+1)
walk(page)
