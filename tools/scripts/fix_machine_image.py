import json
import os
import shutil
import subprocess

PEN = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
PENCIL_CMD = r"C:\Users\13929\.trae-cn\binaries\node\versions\24.16.0\pencil.cmd"
EXPORT_DIR = r"D:\校园班级事务智能管理助手\exports\home_redesign_v3"

def walk(node):
    if node.get("type") == "frame" and "machine" in node.get("id", ""):
        node["fill"] = {
            "type": "image",
            "enabled": True,
            "url": "images/machine_fixed.png",
            "mode": "fill",
        }
    for c in node.get("children", []) or []:
        walk(c)
    if node.get("type") == "ref" and node.get("descendants"):
        for v in node["descendants"].values():
            walk(v)

with open(PEN, "r", encoding="utf-8") as f:
    doc = json.load(f)

for top in doc.get("children", []):
    walk(top)

with open(PEN, "w", encoding="utf-8") as f:
    json.dump(doc, f, ensure_ascii=False, indent=2)

# Re-export CJA3J
commands = [
    f"export_nodes({{ nodeIds: ['CJA3J'], outputDir: '{EXPORT_DIR.replace(chr(92), '/')}', scale: 2, format: 'png' }})",
    "save()",
]

proc = subprocess.Popen(
    [PENCIL_CMD, "interactive", "-i", PEN, "-o", PEN + ".tmp"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    encoding="utf-8",
    cwd=r"D:\校园班级事务智能管理助手",
)
for cmd in commands:
    proc.stdin.write(cmd + "\n")
proc.stdin.flush()
proc.stdin.close()
out, _ = proc.communicate(timeout=60)
print(out[-3000:])
print("rc:", proc.returncode)

if os.path.exists(PEN + ".tmp"):
    shutil.move(PEN + ".tmp", PEN)
