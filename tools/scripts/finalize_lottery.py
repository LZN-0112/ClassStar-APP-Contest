import json
import os
import shutil
import subprocess
from PIL import Image, ImageDraw

PEN = r"D:\校园班级事务智能管理助手\校园班级事务智能管理助手.pen"
PENCIL_CMD = r"C:\Users\13929\.trae-cn\binaries\node\versions\24.16.0\pencil.cmd"
EXPORT_DIR = r"D:\校园班级事务智能管理助手\exports\home_redesign_v3"
PNG_PATH = os.path.join(EXPORT_DIR, "CJA3J.png")
MACHINE_IMG = r"D:\校园班级事务智能管理助手\images\generated-1783045698538.png"

# Machine frame in design (logical points)
MACHINE_X = 16
MACHINE_Y = 226
MACHINE_W = 361
MACHINE_H = 260
CORNER_RADIUS = 24
SCALE = 2

def export_page():
    """Export CJA3J PNG via Pencil CLI."""
    os.makedirs(EXPORT_DIR, exist_ok=True)
    commands = [
        f"export_nodes({{ nodeIds: ['CJA3J'], outputDir: '{EXPORT_DIR.replace(chr(92), '/')}', scale: {SCALE}, format: 'png' }})",
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
    print(out[-2000:])
    print("export rc:", proc.returncode)
    if os.path.exists(PEN + ".tmp"):
        shutil.move(PEN + ".tmp", PEN)
    return os.path.exists(PNG_PATH)


def composite_machine():
    """Overlay the 3D lottery machine image onto the exported PNG."""
    base = Image.open(PNG_PATH).convert("RGBA")
    machine = Image.open(MACHINE_IMG).convert("RGBA")

    # Target pixel bounds
    tx = MACHINE_X * SCALE
    ty = MACHINE_Y * SCALE
    tw = MACHINE_W * SCALE
    th = MACHINE_H * SCALE
    tr = CORNER_RADIUS * SCALE

    # Resize machine to fill target width, then crop top-centered region to target height.
    # This keeps the top badge bar and glass chamber; the bottom is covered by the result card.
    scale_factor = tw / machine.width
    resized_h = int(machine.height * scale_factor)
    machine_resized = machine.resize((tw, resized_h), Image.Resampling.LANCZOS)

    if resized_h > th:
        # crop from top so the important upper part is visible
        machine_cropped = machine_resized.crop((0, 0, tw, th))
    else:
        # letterbox if too short (unlikely)
        machine_cropped = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
        machine_cropped.paste(machine_resized, (0, (th - resized_h) // 2))

    # Rounded rectangle mask
    mask = Image.new("L", (tw, th), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, tw, th), radius=tr, fill=255)

    base.paste(machine_cropped, (tx, ty), mask)
    base.save(PNG_PATH, "PNG")
    print("Composited machine onto", PNG_PATH, "size", os.path.getsize(PNG_PATH))


def verify_pen():
    doc = json.load(open(PEN, "r", encoding="utf-8"))
    pages = [(c.get("id"), c.get("name")) for c in doc.get("children", [])]
    assert any(pid == "CJA3J" for pid, _ in pages), "CJA3J missing"
    print("Verified .pen contains CJA3J; total pages:", len(pages))


if __name__ == "__main__":
    verify_pen()
    if export_page():
        composite_machine()
    else:
        print("Export failed; PNG not found.")
