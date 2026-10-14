import glob
import json
import os
import re
import shutil
import subprocess
import time
import uuid

PEN = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
TMP = r"D:\校园班级事务智能管理助手\design_tmp.pen"
OUT_PEN = r"D:\校园班级事务智能管理助手\lottery_out.pen"
FINAL_PEN = r"D:\校园班级事务智能管理助手\lottery_final.pen"
PENCIL_CMD = r"C:\Users\13929\.trae-cn\binaries\node\versions\24.16.0\pencil.cmd"
EXPORT_DIR = r"D:\校园班级事务智能管理助手\exports\home_redesign_v3"
REF_IMAGE = r"D:\校园班级事务智能管理助手\reference_gashapon.png"


def new_id(prefix=""):
    """Generate a short ASCII id."""
    return (prefix + uuid.uuid4().hex[:6]).lower()


# ---------- Color / style tokens ----------
GRADIENT_BG = {
    "type": "gradient",
    "gradientType": "linear",
    "rotation": 180,
    "colors": [
        {"color": "#E0C3FC", "position": 0},
        {"color": "#FDCBF1", "position": 0.48},
        {"color": "#8EC5FC", "position": 1},
    ],
}

PINK_GOLD_BTN = {
    "type": "gradient",
    "gradientType": "linear",
    "rotation": 180,
    "colors": [
        {"color": "#FBCFE8", "position": 0},
        {"color": "#FCD34D", "position": 1},
    ],
}

PINK_TEXT_GRADIENT = {
    "type": "gradient",
    "gradientType": "linear",
    "rotation": 90,
    "colors": [
        {"color": "#EC4899", "position": 0},
        {"color": "#F472B6", "position": 1},
    ],
}

SOFT_SHADOW = {
    "type": "shadow",
    "shadowType": "outer",
    "color": "#00000014",
    "offset": {"x": 0, "y": 4},
    "blur": 20,
}

# ---------- Helpers ----------
def frame_node(node_id, name, **props):
    base = {"type": "frame", "id": node_id, "name": name}
    base.update(props)
    return base


def text_node(node_id, name, content, **props):
    base = {"type": "text", "id": node_id, "name": name, "content": content}
    base.update(props)
    return base


def path_node(node_id, name, geometry, **props):
    base = {
        "type": "path",
        "id": node_id,
        "name": name,
        "geometry": geometry,
        "viewBox": [0, 0, 24, 24],
        "fill": "#00000000",
        "stroke": "#FFFFFF",
        "strokeWidth": 2,
        "strokeLinecap": "round",
        "strokeLinejoin": "round",
    }
    base.update(props)
    return base


# ---------- Page content ----------
header = frame_node(
    new_id("hdr"),
    "Header",
    width="fill_container",
    height=48,
    justifyContent="space_between",
    alignItems="center",
    padding=[0, 20],
    fill="#00000000",
    children=[
        frame_node(new_id("hsp"), "Spacer", width=40, height=40, fill="#00000000"),
        text_node(
            new_id("htitle"),
            "Title",
            "随机抽签",
            fill="#FFFFFF",
            fontFamily="$font-heading",
            fontSize=24,
            fontWeight="700",
            effect={
                "type": "shadow",
                "shadowType": "outer",
                "color": "#FFFFFF66",
                "offset": {"x": 0, "y": 0},
                "blur": 10,
            },
        ),
        frame_node(
            new_id("hrules"),
            "Rules Button",
            width=40,
            height=40,
            cornerRadius=9999,
            fill="#FFFFFF33",
            stroke="#FFFFFF33",
            strokeWidth=1,
            justifyContent="center",
            alignItems="center",
            children=[
                text_node(
                    new_id("hruleslbl"),
                    "Label",
                    "规则",
                    fill="#FFFFFF",
                    fontFamily="$font-body",
                    fontSize=12,
                    fontWeight="500",
                )
            ],
        ),
    ],
)


def info_item(label, value):
    nid = new_id("info")
    return frame_node(
        nid,
        label,
        width="fill_container",
        layout="vertical",
        gap=4,
        alignItems="center",
        fill="#00000000",
        children=[
            text_node(
                new_id("infolbl"),
                "Label",
                label,
                fill="#FFFFFFCC",
                fontFamily="$font-caption",
                fontSize=11,
                fontWeight="normal",
            ),
            text_node(
                new_id("infoval"),
                "Value",
                value,
                fill="#FFFFFF",
                fontFamily="$font-body",
                fontSize=14,
                fontWeight="600",
            ),
        ],
    )


info_bar = frame_node(
    new_id("infobar"),
    "Info Bar",
    width="fill_container",
    height=64,
    fill="#FFFFFF30",
    cornerRadius=20,
    stroke="#FFFFFF30",
    strokeWidth=1,
    padding=12,
    layout="horizontal",
    justifyContent="space_around",
    alignItems="center",
    effect={
        "type": "shadow",
        "shadowType": "inner",
        "color": "#FFFFFF20",
        "offset": {"x": 0, "y": 1},
        "blur": 4,
    },
    children=[
        info_item("活动名称", "学院运动会"),
        info_item("活动地点", "体育馆"),
        info_item("活动时间", "本周五 14:00"),
    ],
)

announcement = frame_node(
    new_id("announce"),
    "Announcement",
    width="fit_content",
    height=28,
    fill="#00000050",
    cornerRadius=9999,
    padding=[0, 14],
    layout="horizontal",
    gap=8,
    alignItems="center",
    children=[
        path_node(
            new_id("annicon"),
            "Speaker",
            "M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z M6 14a12 12 0 0 0 2.4 7.2a2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14M8 6v8",
            width=16,
            height=16,
            strokeWidth=2,
        ),
        text_node(
            new_id("anntxt"),
            "Text",
            "恭喜XX同学被抽中为参赛代表",
            fill="#FFFFFFDD",
            fontFamily="$font-body",
            fontSize=12,
            fontWeight="normal",
        ),
    ],
)

MACHINE_ID = new_id("machine")
machine_image = frame_node(
    MACHINE_ID,
    "Lottery Machine",
    width=361,
    height=260,
    x=16,
    y=0,
    cornerRadius=24,
    fill="#F3E8FF",
    layout="vertical",
    justifyContent="center",
    alignItems="center",
    effect={
        "type": "shadow",
        "shadowType": "outer",
        "color": "#0000001A",
        "offset": {"x": 0, "y": 8},
        "blur": 24,
    },
    children=[
        text_node(
            new_id("machph"),
            "Placeholder",
            "3D 抽签机生成中...",
            fill="#A855F7",
            fontFamily="$font-body",
            fontSize=14,
        )
    ],
)

controls = frame_node(
    new_id("controls"),
    "Controls",
    width=393,
    height=56,
    x=0,
    y=210,
    padding=[0, 20],
    layout="horizontal",
    gap=12,
    justifyContent="space_between",
    alignItems="center",
    fill="#00000000",
    children=[
        frame_node(
            new_id("inputbox"),
            "Input Box",
            width=110,
            height=44,
            fill="#FFFFFF40",
            cornerRadius=12,
            stroke="#FFFFFF50",
            strokeWidth=1,
            layout="horizontal",
            justifyContent="center",
            alignItems="center",
            gap=8,
            children=[
                path_node(
                    new_id("inminus"),
                    "Minus",
                    "M5 12h14",
                    width=16,
                    height=16,
                    stroke="#FFFFFFCC",
                ),
                text_node(
                    new_id("inval"),
                    "Value",
                    "8",
                    fill="#FFFFFF",
                    fontFamily="$font-data",
                    fontSize=18,
                    fontWeight="700",
                ),
                path_node(
                    new_id("inplus"),
                    "Plus",
                    "M12 5v14M5 12h14",
                    width=16,
                    height=16,
                    stroke="#FFFFFFCC",
                ),
            ],
        ),
        frame_node(
            new_id("inputhint"),
            "Hint",
            width="fit_content",
            height=44,
            layout="vertical",
            justifyContent="center",
            fill="#00000000",
            children=[
                text_node(
                    new_id("inhinttxt"),
                    "Text",
                    "5名正选 + 3名候补",
                    fill="#FFFFFFAA",
                    fontFamily="$font-caption",
                    fontSize=11,
                )
            ],
        ),
        frame_node(
            new_id("startbtn"),
            "Start Button",
            width=150,
            height=52,
            fill=PINK_GOLD_BTN,
            cornerRadius=16,
            stroke="#FDE68A",
            strokeWidth=2,
            layout="vertical",
            gap=2,
            justifyContent="center",
            alignItems="center",
            effect={
                "type": "shadow",
                "shadowType": "outer",
                "color": "#00000026",
                "offset": {"x": 0, "y": 6},
                "blur": 16,
            },
            children=[
                text_node(
                    new_id("startmain"),
                    "Main",
                    "开始抽签",
                    fill="#FFFFFF",
                    fontFamily="$font-heading",
                    fontSize=16,
                    fontWeight="700",
                ),
                text_node(
                    new_id("startsub"),
                    "Sub",
                    "从全班35人中抽取",
                    fill="#FFFFFFCC",
                    fontFamily="$font-caption",
                    fontSize=10,
                ),
            ],
        ),
    ],
)

record_link = frame_node(
    new_id("record"),
    "Record Link",
    width=80,
    height=20,
    x=297,
    y=228,
    layout="horizontal",
    justifyContent="flex_end",
    fill="#00000000",
    children=[
        text_node(
            new_id("recordtxt"),
            "Text",
            "中签记录 >",
            fill="#374151",
            fontFamily="$font-body",
            fontSize=12,
            fontWeight="500",
        )
    ],
)

# Result list
result_names = ["张梓涵", "李雨桐", "王诗琪", "陈佳怡", "刘思涵"]
backup_names = ["赵宇航", "周子轩", "吴俊熙"]


def result_row(rank, name, tag, tag_color):
    base = new_id("row")
    return frame_node(
        base,
        f"Row {rank}",
        width="fill_container",
        height=26,
        fill="#F3F4F6",
        cornerRadius=8,
        padding=[0, 10],
        layout="horizontal",
        gap=8,
        alignItems="center",
        children=[
            frame_node(
                new_id("rank"),
                "Rank",
                width=18,
                height=18,
                cornerRadius=5,
                fill=tag_color,
                justifyContent="center",
                alignItems="center",
                children=[
                    text_node(
                        new_id("ranktxt"),
                        "Text",
                        str(rank),
                        fill="#FFFFFF",
                        fontFamily="$font-data",
                        fontSize=10,
                        fontWeight="700",
                    )
                ],
            ),
            frame_node(
                new_id("avatar"),
                "Avatar",
                width=20,
                height=20,
                cornerRadius=9999,
                fill=tag_color,
                justifyContent="center",
                alignItems="center",
                children=[
                    text_node(
                        new_id("avatartxt"),
                        "Text",
                        name[0],
                        fill="#FFFFFF",
                        fontFamily="$font-body",
                        fontSize=10,
                        fontWeight="600",
                    )
                ],
            ),
            text_node(
                new_id("nametxt"),
                "Name",
                name,
                width="fill_container",
                fill="#1F2937",
                fontFamily="$font-body",
                fontSize=13,
                fontWeight="500",
            ),
            frame_node(
                new_id("tag"),
                "Tag",
                width="fit_content",
                height=20,
                fill="#00000000",
                children=[
                    text_node(
                        new_id("tagtxt"),
                        "Text",
                        tag,
                        fill=tag_color,
                        fontFamily="$font-caption",
                        fontSize=11,
                        fontWeight="600",
                    )
                ],
            ),
        ],
    )


def group_section(title, color, names, tag):
    return frame_node(
        new_id("grp"),
        "Group",
        width="fill_container",
        layout="vertical",
        gap=4,
        fill="#00000000",
        children=[
            frame_node(
                new_id("grphead"),
                "Header",
                width="fill_container",
                height=18,
                layout="horizontal",
                gap=8,
                alignItems="center",
                fill="#00000000",
                children=[
                    frame_node(
                        new_id("indicator"),
                        "Indicator",
                        width=4,
                        height=12,
                        cornerRadius=2,
                        fill=color,
                    ),
                    text_node(
                        new_id("grptitle"),
                        "Title",
                        title,
                        fill="#1F2937",
                        fontFamily="$font-body",
                        fontSize=12,
                        fontWeight="600",
                    ),
                ],
            ),
        ]
        + [result_row(i + 1, names[i], tag, color) for i in range(len(names))],
    )


result_card = frame_node(
    new_id("resultcard"),
    "Result Card",
    width=361,
    height=260,
    x=16,
    y=240,
    fill="#FFFFFF",
    cornerRadius=24,
    padding=12,
    layout="vertical",
    gap=8,
    effect={
        "type": "shadow",
        "shadowType": "outer",
        "color": "#00000014",
        "offset": {"x": 0, "y": -4},
        "blur": 20,
    },
    children=[
        frame_node(
            new_id("titlewrap"),
            "Title Row",
            width="fill_container",
            height="fit_content",
            layout="horizontal",
            justifyContent="center",
            alignItems="center",
            gap=8,
            fill="#00000000",
            children=[
                path_node(
                    new_id("starl"),
                    "Star",
                    "M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z",
                    width=14,
                    height=14,
                    fill="#FCD34D",
                    stroke="#FCD34D",
                ),
                text_node(
                    new_id("resulttitle"),
                    "Title",
                    "中签结果榜单",
                    fill=PINK_TEXT_GRADIENT,
                    fontFamily="$font-heading",
                    fontSize=18,
                    fontWeight="700",
                ),
                path_node(
                    new_id("starr"),
                    "Star",
                    "M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z",
                    width=14,
                    height=14,
                    fill="#FCD34D",
                    stroke="#FCD34D",
                ),
            ],
        ),
        group_section("正选代表 · 共5人", "#EC4899", result_names, "正选"),
        group_section("候补代表 · 共3人", "#8B5CF6", backup_names, "候补"),
    ],
)

visual_stack = frame_node(
    new_id("vstack"),
    "Visual Stack",
    width="fill_container",
    height=562,
    fill="#00000000",
    layout="none",
    children=[machine_image, result_card, controls, record_link],
)

tab_bar_ref = {
    "id": new_id("tabbar"),
    "type": "ref",
    "ref": "kDswP",
    "name": "Tab Bar",
    "width": 393,
    "height": 56,
    "layoutPosition": "absolute",
    "x": 0,
    "y": 726,
    "descendants": {
        "xkHfH": {
            "type": "frame",
            "id": "xkHfH",
            "name": "班级",
            "layout": "vertical",
            "gap": 8,
            "alignItems": "center",
            "children": [
                {
                    "type": "path",
                    "id": "Y9kyYt",
                    "name": "Icon-Class-Filled",
                    "fill": "$accent",
                    "stroke": "$accent",
                    "width": 24,
                    "height": 24,
                },
                {
                    "type": "text",
                    "id": "ODyg3",
                    "name": "Label",
                    "fill": "$accent",
                    "content": "班级",
                    "fontFamily": "$font-caption",
                    "fontSize": "$text-size-caption",
                    "fontWeight": "normal",
                },
            ],
        }
    },
}

new_content = frame_node(
    "tQloH",
    "Content",
    width="fill_container",
    height="fill_container",
    layout="vertical",
    gap=8,
    padding=[0, 0, 56, 0],
    fill=GRADIENT_BG,
    children=[header, info_bar, announcement, visual_stack, tab_bar_ref],
)

new_descendants = {
    "JIHZi": {"fill": GRADIENT_BG},
    "n9xLw": new_content,
}

# ---------- Load and modify original .pen ----------
print("Loading original .pen...")
with open(PEN, "r", encoding="utf-8") as f:
    doc = json.load(f)

# Force version expected by CLI
original_version = doc.get("version")
doc["version"] = "2.13"
doc.pop("fileToken", None)

# Find CJA3J page and replace its Phone Frame descendants
page_found = False
for child in doc.get("children", []):
    if child.get("id") == "CJA3J":
        page_found = True
        for page_child in child.get("children", []):
            if page_child.get("type") == "ref" and page_child.get("ref") == "lPWz4":
                page_child["descendants"] = new_descendants
                break
        break

if not page_found:
    raise RuntimeError("CJA3J page not found")

print("Saving temporary layout file...")
os.makedirs(os.path.dirname(TMP), exist_ok=True)
with open(TMP, "w", encoding="utf-8") as f:
    json.dump(doc, f, ensure_ascii=False, indent=2)

# ---------- Generate 3D lottery machine image ----------
machine_prompt = (
    "A cute 3D cartoon school lottery machine for a mobile app, rendered as a centered product shot on a soft transparent-friendly background. "
    "Dreamy pink-purple-blue gradient metallic body with glossy finish, golden rounded metal frame around a large glass chamber, "
    "the glass chamber is filled with piles of pastel macaron lottery balls in pink, purple and white with shiny highlights, "
    "some balls show simplified Chinese family names. Top dark rounded bar with three circular metallic badges showing 5, 3, 35. "
    "Pink-blue gradient base with chrome trim, golden rivets and a glowing light strip. "
    "3D cartoon style, soft lighting, glassmorphism, chrome edges, rounded bubbly forms, dreamy atmosphere. "
    "No text other than numbers and tiny surname characters. Vertical orientation, fills the frame."
)

def run_pencil_session(in_file, out_file, commands, wait=30):
    """Run Pencil interactive shell via Popen and reliably save."""
    proc = subprocess.Popen(
        [PENCIL_CMD, "interactive", "-i", in_file, "-o", out_file],
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
    # Wait for async operations (image generation / save) to finish
    time.sleep(wait)
    proc.stdin.close()
    out, _ = proc.communicate(timeout=wait + 30)
    return out, proc.returncode


print("Generating 3D lottery machine image (this may take a while)...")

def js_literal(s):
    return json.dumps(s, ensure_ascii=False)

generate_inner = f"Generate({js_literal(MACHINE_ID)}, {js_literal('ai')}, {js_literal(machine_prompt)})"
generate_cmd = f"batch_design({{ input: {js_literal(generate_inner)} }})"
generate_commands = [
    generate_cmd,
    "save()",
]
out, rc = run_pencil_session(TMP, OUT_PEN, generate_commands, wait=45)
print(out[-4000:] if len(out) > 4000 else out)
print("Generate return code:", rc)

if not os.path.exists(OUT_PEN):
    print("WARNING: Output pen not created after generate step; falling back to layout-only file.")
    shutil.copy2(TMP, OUT_PEN)

# ---------- Resolve pending generated image ----------
print("Resolving generated image reference...")
time.sleep(3)  # give filesystem a moment
generated_images = sorted(
    glob.glob(os.path.join(os.path.dirname(PEN), "images", "generated-*.png")),
    key=os.path.getmtime,
)
if generated_images:
    latest_image = generated_images[-1]
    image_rel = "./images/" + os.path.basename(latest_image)
    print("Latest generated image:", image_rel)

    with open(OUT_PEN, "r", encoding="utf-8") as f:
        out_doc = json.load(f)

    def walk(node, cb):
        cb(node)
        for c in node.get("children", []) or []:
            walk(c, cb)
        if node.get("type") == "ref" and node.get("descendants"):
            for d in node["descendants"].values():
                walk(d, cb)

    def fix_machine(node):
        if node.get("id") == MACHINE_ID and node.get("type") == "frame":
            node["fill"] = {
                "type": "image",
                "enabled": True,
                "url": image_rel,
                "mode": "fill",
            }
            # Remove placeholder text so it doesn't render over the image
            node["children"] = [c for c in (node.get("children") or []) if c.get("name") != "Placeholder"]

    for top in out_doc.get("children", []):
        walk(top, fix_machine)

    with open(OUT_PEN, "w", encoding="utf-8") as f:
        json.dump(out_doc, f, ensure_ascii=False, indent=2)
else:
    print("WARNING: No generated image found; machine will show placeholder.")

# ---------- Export CJA3J page PNG ----------
print("Exporting CJA3J page PNG...")
os.makedirs(EXPORT_DIR, exist_ok=True)
export_commands = [
    f"export_nodes({{ nodeIds: ['CJA3J'], outputDir: '{EXPORT_DIR.replace(chr(92), '/')}', scale: 2, format: 'png' }})",
    "save()",
]
out2, rc2 = run_pencil_session(OUT_PEN, FINAL_PEN, export_commands, wait=20)
print(out2[-4000:] if len(out2) > 4000 else out2)
print("Export return code:", rc2)

if os.path.exists(FINAL_PEN):
    shutil.copy2(FINAL_PEN, PEN)
    print("Saved redesigned page back to:", PEN)
else:
    print("WARNING: Final pen not created; copying intermediate output to original.")
    shutil.copy2(OUT_PEN, PEN)

png_path = os.path.join(EXPORT_DIR, "CJA3J.png")
print("Exported PNG exists:", os.path.exists(png_path), png_path)
