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
import argparse, os, sys, time
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from corrupted_gen import enqueue, wait_for_item, output_images, download  # reuse proven engine

RAW_DIR = os.path.join(os.path.dirname(__file__), "art-gen", "raw", "covers")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "covers")

# Shared premium splash style — adapted from swingwreck coverx_neon2/coverx_smash2 to CORRUPTED.EXE:
# sleek cyan-visor robot hero, deep-black glitching simulation, electric cyan + warning red neon.
# Hero LARGE & centered with safe margins so the same master also crops cleanly to square/portrait.
STYLE = (
    ", premium high-quality video-game cover key-art of a sleek angular robot hero with a single bright "
    "glowing electric-cyan visor eye-slit and dark gunmetal plating with glowing cyan circuit-seam edge "
    "lines, polished cinematic rendering with real depth strong rim-light and volumetric neon glow NOT "
    "flat, the hero LARGE and dominant in the dead center, extreme high contrast making the hero pop, "
    "vivid highly saturated electric-cyan and warning-red neon over a deep near-black glitching digital "
    "void, holographic scanlines chromatic-aberration RGB-split glitch artifacts and floating data "
    "fragments, dramatic god-ray glow behind the hero, dynamic powerful and ominous, the action clustered "
    "tightly around the central hero with generous safe margins on all sides so nothing critical touches "
    "the frame edges and it still reads when cropped to a square or vertical, no text, no letters, no "
    "numbers, no logo, no UI, no border, no frame, no watermark"
)

# sid -> (subject_moment, render_w, render_h)
COVERS = {
    # 1) THE CHASE — sprinting out of a collapsing corridor, a wall of red corruption surging behind.
    "cover_escape": (
        "the sleek cyan-visor robot hero sprinting and leaping straight toward the viewer out of a "
        "collapsing neon-grid corridor, a towering churning wall of glitching blood-red datamosh "
        "corruption surging up close behind it, fracturing cyan platforms and shattering data-blocks "
        "flying past, sweeping cyan speed-streaks and motion energy, eyes wide and urgent, intense escape",
        1920, 1088),
    # 2) THE REALITY TEAR — diving into a blazing cyan-magenta rift ripped open in the void.
    "cover_tear": (
        "the sleek cyan-visor robot hero caught mid-leap diving into a blazing jagged reality-tear rift "
        "ripped open in a black glitch void, brilliant cyan and magenta energy pouring out of the crack, "
        "shards of broken simulation and shattered grid-glass floating around it, electric arcs, a bright "
        "white-hot core at the rift, heroic dynamic leap",
        1920, 1088),
    # 3) THE GLITCH — hero's own body fracturing into RGB-split fragments amid deceptive traps.
    "cover_glitch": (
        "the sleek cyan-visor robot hero standing defiant and large, its own angular body breaking apart "
        "into glitching pixels and chromatic-aberration RGB-split fragments, surrounded by deceptive "
        "floating neon platforms and glowing warning-red hazard spikes, radial bursts of electric cyan and "
        "magenta neon light rays exploding outward behind it, a glowing wireframe grid floor, datamosh "
        "corruption, fierce glowing visor",
        1920, 1088),
    # 4) THE HERO SHOT — clean iconic centered poster, red corruption creeping in at the edges.
    "cover_hero": (
        "the sleek cyan-visor robot hero in a confident iconic centered hero pose, a strong glowing cyan "
        "rim-light and a bright focal glow outlining it, faint ominous blood-red corruption and glitch "
        "static creeping inward only from the far screen edges, a deep dark digital-void grid receding "
        "into fog behind, calm powerful and cool, premium poster composition",
        1920, 1088),
}

GROUPS = {"all": list(COVERS)}


def make_final(sid, raw_path):
    os.makedirs(OUT_DIR, exist_ok=True)
    im = Image.open(raw_path).convert("RGB")
    w, h = im.size
    if (w, h) != (1920, 1080):
        if h >= 1080:                                   # center-crop 1088 -> 1080
            top = (h - 1080) // 2
            im = im.crop((0, top, 1920, top + 1080))
        else:
            im = im.resize((1920, 1080), Image.LANCZOS)
    out = os.path.join(OUT_DIR, f"{sid}_1920x1080.png")
    im.save(out)
    print(f"  -> {out}  ({os.path.getsize(out)//1024}KB)", flush=True)


def generate_one(sid):
    subject, rw, rh = COVERS[sid]
    os.makedirs(RAW_DIR, exist_ok=True)
    full = subject + STYLE
    print(f"[cover] {sid:14} {rw}x{rh}", flush=True)
    t0 = time.time()
    item_id = enqueue(full, rw, rh)
    res = wait_for_item(item_id, timeout=900.0)
    if res.get("status") != "completed":
        print(f"  ! {sid}: {res.get('status')} {res.get('error','')}", flush=True); return False
    names = output_images(res.get("session") or {})
    if not names:
        print(f"  ! {sid}: no image", flush=True); return False
    raw = os.path.join(RAW_DIR, f"{sid}.png")
    download(names[0], raw)
    print(f"  OK {sid} {time.time()-t0:.0f}s -> {raw}", flush=True)
    make_final(sid, raw)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("group", nargs="?", default="all")
    args = ap.parse_args()
    ids = GROUPS.get(args.group, [args.group])
    ok = 0
    for sid in ids:
        if sid not in COVERS:
            print(f"unknown: {sid}"); continue
        try:
            if generate_one(sid): ok += 1
        except Exception as e:
            print(f"  ! {sid} EXC: {e}", flush=True)
    print(f"\nDone: {ok}/{len(ids)} -> {os.path.abspath(OUT_DIR)}", flush=True)


if __name__ == "__main__":
    main()
