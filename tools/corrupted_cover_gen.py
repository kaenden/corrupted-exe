#!/usr/bin/env python3
"""CORRUPTED.EXE — CrazyGames store COVER key-art generator (1920x1080 landscape).

Same engine + model as corrupted_gen.py (FLUX.2 Klein via local InvokeAI), same approach as
swingwreck_gen.py's `coverx_/coversplash` covers: render NATIVE 1920x1088 (FLUX-friendly, /16),
style embedded in the prompt (premium splash key-art), then PIL center-crop 1088 -> 1080.

FLUX renders NO usable text — covers are produced WITHOUT the title (CrazyGames requires the game
title ON the cover, so composite the CORRUPTED.EXE logo/title on top of the chosen variant after).

Usage:
    python tools/corrupted_cover_gen.py all          # all variants
    python tools/corrupted_cover_gen.py cover_escape # one variant
Output:
    tools/art-gen/raw/covers/<sid>.png    (raw 1920x1088)
    covers/<sid>_1920x1080.png            (final, center-cropped)
"""
from __future__ import annotations
import argparse, os, random, sys, time
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from corrupted_gen import enqueue, wait_for_item, output_images, download  # reuse proven engine

RAW_DIR = os.path.join(os.path.dirname(__file__), "art-gen", "raw", "covers")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "covers")

# The actual in-game hero (procedural): a MINIMAL FLAT big-headed neon robot — not a 3D mech.
HERO = (
    "a minimal cute big-headed robot mascot built from clean flat geometric shapes: a large rounded-square "
    "dark head with a bright crisp glowing electric-cyan outline, two big bright glowing expressive cyan "
    "eyes (the soul of the character), a thin straight antenna with a small glowing tip, and a small simple "
    "rounded body with little stubby legs — flat solid shapes with bright glowing cyan neon outlines, no "
    "metal no rivets no detail; a charismatic appealing mascot with a strong clean instantly-readable "
    "silhouette, NOT sad"
)

# Shared style — matches the GAME's real look (see shot-game): FLAT 2D neon vector line-art, deep pure
# black, faint cyan wireframe grid, lots of negative space, high contrast. Adapted from the swingwreck
# coverx_ prompt TECHNIQUE (embedded style + palette + composition + hard negative list) — NOT its 3D look.
STYLE = (
    ", flat 2D neon-vector video-game cover key-art — clean glowing neon line-art, flat dark shapes with "
    "bright crisp glowing neon outlines and a lush soft neon bloom, like a premium minimalist SYNTHWAVE "
    "neon poster. STRICTLY NOT 3D, not realistic, not metallic, not painterly, no photographic detail. "
    "Rich atmospheric sense of place INSIDE a corrupted digital simulation: a deep near-black world with a "
    "glowing cyan wireframe grid floor receding into the distance, faint distant floating neon platforms "
    "and data structures, soft layered neon haze and drifting glowing data-motes for depth, subtle "
    "scanlines and small RGB-split glitch fragments. Cool vivid MULTI-neon palette — electric cyan and "
    "teal with magenta and violet glow plus a touch of warning-red corruption — saturated gradient glow, "
    "very high contrast, cinematic and moody yet still flat and clean. The hero is LARGE and dominant, "
    "centered with safe margins so it still reads as a small thumbnail and crops to square or vertical. "
    "no text, no letters, no numbers, no logo, no UI, no border, no frame, no watermark"
)

# sid -> (subject_moment, render_w, render_h). Each = HERO + a moment, then + STYLE.
COVERS = {
    # 1) THE CHASE — big dynamic hero fleeing a towering corruption wall through the neon world.
    "cover_escape": (
        HERO + ", the hero LARGE in the foreground dynamically running and leaping to the right with big "
        "focused determined glowing eyes and a confident urgent lean, a towering atmospheric wall of glitching warning-red "
        "and magenta corruption with red datamosh static surging close behind through layered neon haze, "
        "sweeping cyan and teal speed-streak lines, glowing neon platform bars and small red triangle "
        "spikes rushing past along a receding grid corridor, drifting glitch motes, intense kinetic escape",
        1920, 1088),
    # 2) THE REALITY TEAR — big hero leaping into a luminous multi-neon rift, atmospheric depth.
    "cover_tear": (
        HERO + ", the hero LARGE and dramatic leaping toward a glowing jagged reality-tear ripped open in "
        "the simulation — a brilliant cyan, magenta and violet vertical rift with luminous energy and light "
        "pouring out and a bright white-hot core, neon shards and glowing data-motes swirling around it "
        "through soft neon haze, a receding cyan grid and faint distant platforms behind, determined eyes",
        1920, 1088),
    # 3) THE GLITCH/DECEPTION — big hero splitting into RGB glitch amid deceptive neon platforms.
    "cover_glitch": (
        HERO + ", the hero LARGE dead-center, its head and body splitting into vivid RGB-split chromatic "
        "glitch slices and scattered flat square pixels, surrounded by deceptive floating neon platform "
        "bars with cyan, magenta and violet outlines and a few small red triangle spikes, radial cyan and "
        "violet neon light rays and drifting glitch pixels through neon haze, a glowing grid floor, "
        "one calm glowing cyan eye and one glitching split eye, an intense eerie expression, atmospheric and ominous",
        1920, 1088),
    # 4) THE HERO SHOT — big iconic confident hero with a rich atmospheric neon backdrop.
    "cover_hero": (
        HERO + ", the hero LARGE and heroic dead-center standing confident on a glowing neon platform, a "
        "bright focal halo of cyan-and-violet glow blooming behind it, big bright confident friendly "
        "glowing eyes looking straight at the viewer with a cool calm-yet-powerful expression, the "
        "corrupted-sim world glowing with atmosphere around it — a receding cyan grid, "
        "faint distant floating platforms, soft neon haze and drifting data-motes, magenta and teal "
        "accents, a faint warning-red glitch only at the far edges",
        1920, 1088),
}

GROUPS = {"all": list(COVERS)}


def make_final(label, raw_path):
    os.makedirs(OUT_DIR, exist_ok=True)
    im = Image.open(raw_path).convert("RGB")
    w, h = im.size
    if (w, h) != (1920, 1080):
        if h >= 1080:                                   # center-crop 1088 -> 1080
            top = (h - 1080) // 2
            im = im.crop((0, top, 1920, top + 1080))
        else:
            im = im.resize((1920, 1080), Image.LANCZOS)
    out = os.path.join(OUT_DIR, f"{label}_1920x1080.png")
    im.save(out)
    print(f"  -> {out}  ({os.path.getsize(out)//1024}KB)", flush=True)


def generate_one(sid, label, seed):
    subject, rw, rh = COVERS[sid]
    os.makedirs(RAW_DIR, exist_ok=True)
    full = subject + STYLE
    print(f"[cover] {label:18} {rw}x{rh} seed={seed}", flush=True)
    t0 = time.time()
    item_id = enqueue(full, rw, rh, seed=seed)
    res = wait_for_item(item_id, timeout=900.0)
    if res.get("status") != "completed":
        print(f"  ! {label}: {res.get('status')} {res.get('error','')}", flush=True); return False
    names = output_images(res.get("session") or {})
    if not names:
        print(f"  ! {label}: no image", flush=True); return False
    raw = os.path.join(RAW_DIR, f"{label}.png")
    download(names[0], raw)
    print(f"  OK {label} {time.time()-t0:.0f}s seed={seed} -> {raw}", flush=True)
    make_final(label, raw)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("group", nargs="?", default="all")
    ap.add_argument("-n", "--variants", type=int, default=1, help="seed variations per concept")
    ap.add_argument("--seed", type=int, default=None, help="fixed seed (single variant; reproduce a winner)")
    args = ap.parse_args()
    ids = GROUPS.get(args.group, [args.group])
    ok = 0
    for sid in ids:
        if sid not in COVERS:
            print(f"unknown: {sid}"); continue
        for i in range(args.variants):
            seed = args.seed if args.seed is not None else random.randint(1, 2_000_000_000)
            label = sid if args.variants == 1 and args.seed is None else f"{sid}_v{i+1}"
            try:
                if generate_one(sid, label, seed): ok += 1
            except Exception as e:
                print(f"  ! {label} EXC: {e}", flush=True)
    print(f"\nDone: {ok} -> {os.path.abspath(OUT_DIR)}", flush=True)


if __name__ == "__main__":
    main()
