import json, os, subprocess, sys

PEN = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手_unified.pen"
TMP = r"D:\校园班级事务智能管理助手\export_tmp.pen"
OUT_DIR = r"D:\校园班级事务智能管理助手\exports\unified_final"

target_pages = [
    ("uGeqj", "设置"),
    ("PFUHH", "个人信息页"),
    ("tRH6z", "再次提醒设置页"),
    ("oSVqI", "关于页"),
    ("Wprar", "我的考勤"),
    ("bJvwg", "我的作业"),
    ("g1RsrN", "我的活动"),
    ("XrWc3", "我的报名页"),
    ("srrFB", "我的报名记录"),
    ("RUO24", "作业列表页"),
    ("tGx72", "投票列表页"),
    ("QBnMZ", "活动列表页"),
    ("P3r0p", "班级电子档案页"),
    ("rOtjT", "发布作业页"),
    ("OpoDe", "发布活动页"),
    ("vetRH", "报名表单页"),
    ("NY5IT", "作业提交页"),
    ("KrVQh", "延时申请页"),
    ("sfiCu", "班费记账页"),
    ("k9WBV", "缴费登记页"),
    ("THBV3", "任务看板"),
    ("g7nX7", "报名统计页"),
    ("YjAc5", "收支报表页"),
    ("GSXZ3", "作业详情页"),
    ("j61KQc", "档案详情页"),
    ("WzCxq", "活动详情页"),
    ("mjnHJ", "班费账本页"),
    ("i0s70Y", "互动消息页"),
]

node_ids = [nid for nid, _ in target_pages]

with open(PEN, "r", encoding="utf-8") as f:
    doc = json.load(f)

doc["version"] = "2.13"
doc.pop("fileToken", None)

os.makedirs(OUT_DIR, exist_ok=True)
with open(TMP, "w", encoding="utf-8") as f:
    json.dump(doc, f, ensure_ascii=False, indent=2)

cmds = [
    f'export_nodes({{ nodeIds: {json.dumps(node_ids)}, outputDir: "{OUT_DIR.replace(chr(92),"/")}", scale: 2, format: "png" }})',
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

missing = []
for nid, name in target_pages:
    png_path = os.path.join(OUT_DIR, f"{nid}.png")
    exists = os.path.exists(png_path)
    print(f"  {'[OK]' if exists else '[MISSING]'} {name} ({nid})")
    if not exists:
        missing.append((nid, name))

if missing:
    print(f"\nMissing {len(missing)} exports")
else:
    print(f"\nAll {len(target_pages)} pages exported to {OUT_DIR}")
