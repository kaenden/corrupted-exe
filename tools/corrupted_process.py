#!/usr/bin/env python3
"""Process raw FLUX output → exact in-game textures (ZERO size/position shift).

For each tools/art-gen/raw/<sid>.png:
  - sprite/sprite_h: rembg cut → autocrop → fit into the EXACT target box → save RGBA
  - platform/tile/bg: resize to the EXACT target size (opaque)
Output: public/assets/images/<sid>.png  (BootScene loads these by key).

Usage: python tools/corrupted_process.py [sid ...]   (no args = all raw files)
"""
import os, sys, glob
from PIL import Image
from corrupted_gen import SUBJECTS

RAW = os.path.join(os.path.dirname(__file__), "art-gen", "raw")
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "images")

# Sprites that should sit on the GROUND (bottom-anchored in their texture box).
BOTTOM_ANCHOR = {"exit_door"}

def fit_into(content, tw, th, bottom=False):
    """Scale `content` (RGBA, cropped) to fit inside tw×th (contain) and paste onto a
    transparent tw×th canvas. Centered, or bottom-centered when `bottom`."""
    cw, ch = content.size
    scale = min(tw / cw, th / ch)
    nw, nh = max(1, round(cw * scale)), max(1, round(ch * scale))
    content = content.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    x = (tw - nw) // 2
    y = (th - nh) if bottom else (th - nh) // 2
    canvas.paste(content, (x, y), content)
    return canvas

def process(sid):
    src = os.path.join(RAW, f"{sid}.png")
    if not os.path.exists(src):
        print(f"  skip {sid} (no raw)"); return False
    if sid not in SUBJECTS:
        print(f"  skip {sid} (not in manifest)"); return False
    _, _, _, tw, th, kind = SUBJECTS[sid]
    os.makedirs(OUT, exist_ok=True)
    img = Image.open(src).convert("RGBA")

    if kind in ("sprite", "sprite_h"):
        from rembg import remove
        cut = remove(img)
        bbox = cut.getbbox()
        if bbox:
            cut = cut.crop(bbox)
        out = fit_into(cut, tw, th, bottom=(sid in BOTTOM_ANCHOR))
    else:
        out = img.convert("RGB").resize((tw, th), Image.LANCZOS).convert("RGBA")

    dest = os.path.join(OUT, f"{sid}.png")
    out.save(dest)
    print(f"  OK {sid:16} -> {tw}x{th}  {dest}")
    return True

def main():
    ids = sys.argv[1:]
    if not ids:
        ids = [os.path.splitext(os.path.basename(f))[0] for f in sorted(glob.glob(os.path.join(RAW, "*.png")))]
    n = sum(process(s) for s in ids)
    print(f"\nProcessed: {n}/{len(ids)} -> {OUT}")

if __name__ == "__main__":
    main()
