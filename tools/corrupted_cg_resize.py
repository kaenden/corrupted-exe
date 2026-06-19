#!/usr/bin/env python3
"""Resize the 3 chosen cover masters in covers/ to the EXACT CrazyGames sizes + CG names.

Input  : any 3 images in covers/ (classified by aspect ratio, not filename):
           ~1:1  -> square, wider-than-tall -> landscape, taller-than-wide -> portrait.
Output : covers/cover_square_800x800.png, cover_landscape_1920x1080.png, cover_portrait_800x1200.png
Sources are moved to covers/src/ (non-destructive). Landscape is scaled-to-width then CENTER-cropped
(hero is centered). Square/portrait keep their exact 1:1 / 2:3 ratio (clean Lanczos resample).
"""
import os, shutil
from PIL import Image

COV = os.path.join(os.path.dirname(__file__), "..", "covers")
SRC = os.path.join(COV, "src")
TARGET = {"square": (800, 800), "landscape": (1920, 1080), "portrait": (800, 1200)}


def classify(w, h):
    r = w / h
    if abs(r - 1.0) < 0.06:
        return "square"
    return "landscape" if w > h else "portrait"


def fit(im, role):
    tw, th = TARGET[role]
    w, h = im.size
    if role == "landscape":                       # scale to width, center-crop height
        sh = round(h * tw / w)
        im = im.resize((tw, sh), Image.LANCZOS)
        top = max(0, (sh - th) // 2)
        return im.crop((0, top, tw, top + th)) if sh >= th else im.resize((tw, th), Image.LANCZOS)
    return im.resize((tw, th), Image.LANCZOS)     # square / portrait share exact ratio


def main():
    imgs = [f for f in sorted(os.listdir(COV))
            if os.path.isfile(os.path.join(COV, f)) and f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))]
    by_role = {}
    for f in imgs:
        p = os.path.join(COV, f)
        im = Image.open(p).convert("RGB")
        role = classify(*im.size)
        if role in by_role:
            print(f"! two {role} images ({by_role[role][0]} and {f}) — keeping first"); continue
        by_role[role] = (f, im)

    os.makedirs(SRC, exist_ok=True)
    for role in ("square", "landscape", "portrait"):
        if role not in by_role:
            print(f"! missing {role} image"); continue
        f, im = by_role[role]
        out = fit(im, role)
        tw, th = TARGET[role]
        name = f"cover_{role}_{tw}x{th}.png"
        out.save(os.path.join(COV, name))
        print(f"{f:10} {im.size[0]}x{im.size[1]} -> {name}  {out.size[0]}x{out.size[1]}")
        shutil.move(os.path.join(COV, f), os.path.join(SRC, f))   # preserve source

    print("\nFinal CG covers in:", os.path.abspath(COV))


if __name__ == "__main__":
    main()
