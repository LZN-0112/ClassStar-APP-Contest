import json, re, os

src = r"C:\Users\13929\AppData\Local\Temp\trae\toolcall-output\646c0b0d-abf6-4b20-92fb-59480f5c5b14.txt"
if not os.path.exists(src):
    print("File not found", src)
    exit(1)
with open(src, "r", encoding="utf-8") as f:
    text = f.read()

m = re.search(r'"text":"(\[.*?\])"}\]', text, re.DOTALL)
if not m:
    print("Inner text not found")
    exit(1)
inner = m.group(1).encode('utf-8').decode('unicode_escape')
nodes = json.loads(inner)

out = r"D:\校园班级事务智能管理助手\pages_list.txt"
with open(out, "w", encoding="utf-8") as f:
    f.write("Top-level nodes:\n")
    for node in nodes:
        if node.get("type") == "frame":
            f.write(f"  {node['id']}: {node.get('name','')}\n")
print("Wrote", out)
