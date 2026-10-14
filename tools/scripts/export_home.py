import json, os, subprocess

PEN = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
TMP = r"D:\校园班级事务智能管理助手\export_tmp.pen"
OUT_DIR = r"D:\校园班级事务智能管理助手\exports\home_redesign_v3"

with open(PEN, "r", encoding="utf-8") as f:
    doc = json.load(f)

doc["version"] = "2.13"
doc.pop("fileToken", None)

os.makedirs(OUT_DIR, exist_ok=True)
with open(TMP, "w", encoding="utf-8") as f:
    json.dump(doc, f, ensure_ascii=False, indent=2)

cmds = [
    f'export_nodes({{ nodeIds: ["RfR8C"], outputDir: "{OUT_DIR.replace(chr(92),"/")}", scale: 2, format: "png" }})',
    'save()',
    'exit()',
]
with open(r"D:\校园班级事务智能管理助手\export_cmds.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(cmds) + "\n")

PENCIL_CMD = r"C:\Users\13929\.trae-cn\binaries\node\versions\24.16.0\pencil.cmd"
subprocess.run(
    [PENCIL_CMD, 'interactive', '-i', TMP, '-o', r"D:\校园班级事务智能管理助手\export_out.pen"],
    stdin=open(r"D:\校园班级事务智能管理助手\export_cmds.txt", "r", encoding="utf-8"),
    cwd=r"D:\校园班级事务智能管理助手",
    check=False,
)

png_path = os.path.join(OUT_DIR, "RfR8C.png")
print("exported file exists:", os.path.exists(png_path), png_path)
