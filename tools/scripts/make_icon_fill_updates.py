import json, re

src = r"C:\Users\13929\AppData\Local\Temp\trae\toolcall-output\89e5ae81-d9e0-428b-b9f2-dbb3df65941c.txt"
with open(src, "r", encoding="utf-8") as f:
    text = f.read()

# The file format: The MCP server responded with: [{"type":"text","text":"[...icons...]"}]
# Extract the inner string and unescape it
m = re.search(r'"text":"(\[.*?\])"}\]', text, re.DOTALL)
if not m:
    print("Inner text not found")
    exit(1)
inner = m.group(1)
# Unescape JSON string escapes
inner = inner.encode('utf-8').decode('unicode_escape')
icons = json.loads(inner)

var_map = {
    "#5A5A5A": "$text-muted",
    "#6B6B6B": "$text-muted",
    "#D4916E": "$accent",
    "#1A1A1A": "$text-primary",
    "#3D3D3D": "$text-secondary",
    "#FFFFFF": "$text-inverse",
}

updates = []
for icon in icons:
    fill = icon.get("fill")
    if fill in var_map:
        updates.append(f'Update("{icon["id"]}", {{fill:"{var_map[fill]}"}})')

js = ";\n".join(updates)
out = r"D:\校园班级事务智能管理助手\icon_fill_updates.js"
with open(out, "w", encoding="utf-8") as f:
    f.write(js)
print(f"Wrote {len(updates)} updates to {out}")
