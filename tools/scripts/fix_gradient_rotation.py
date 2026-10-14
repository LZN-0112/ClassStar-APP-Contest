import json

PEN = r"d:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
PAGE_ID = "uGeqj"

with open(PEN, "r", encoding="utf-8") as f:
    doc = json.load(f)

# Find the page
for child in doc.get("children", []):
    if child.get("id") == PAGE_ID:
        page = child
        break

# Find the Unified Header in descendants
ref = page["children"][0]
print("Ref:", json.dumps(ref, ensure_ascii=False, indent=2)[:500])

header = ref["descendants"]["JIHZi"]

print("Old gradient:", json.dumps(header["fill"], ensure_ascii=False, indent=2))

# Test changing content layout to none and solid red fill
content = ref["descendants"]["n9xLw"]
content["layout"] = "none"
content["children"][0]["layout"] = "none"
header["fill"] = "#FF0000"

print("New gradient:", json.dumps(header["fill"], ensure_ascii=False, indent=2))

with open(PEN, "w", encoding="utf-8") as f:
    json.dump(doc, f, ensure_ascii=False, indent=2)

print("Updated.")
