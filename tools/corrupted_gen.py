#!/usr/bin/env python3
"""CORRUPTED.EXE — InvokeAI FLUX.2 Klein asset generator.

Dark glitchy neon-geometric "corrupted simulation" art. Adapted from swingwreck_gen.py.
Outputs go to the "Corrupted Exe" board + tools/art-gen/raw/<cat>/<sid>.png.
Process afterwards with corrupted_process.py (rembg cut + resize to EXACT in-game size).

Usage:
    python tools/corrupted_gen.py test       # small style-test batch
    python tools/corrupted_gen.py all
    python tools/corrupted_gen.py <group|sid>
"""
from __future__ import annotations
import argparse, json, os, random, sys, time, urllib.request

API = "http://localhost:9090"
BOARD_ID = "b12f90c9-5009-47a6-8832-52c1e8a5d93f"  # Corrupted Exe
OUT_DIR = os.path.join(os.path.dirname(__file__), "art-gen")

# Model refs (verified against installed API, 2026-06)
FLUX2_MODEL = {"key": "831dabb0-34ad-4b19-9026-27de057783d5", "hash": "blake3:7e144432a5cec1240741505e42f327c7c1cfc181f49d94e50f473c599713d801", "name": "flux-2-klein-4b-fp8", "base": "flux2", "type": "main"}
FLUX2_VAE = {"key": "845a79c7-5aae-455c-91ec-f9161c2b1dad", "hash": "blake3:e9ce10212e48ff5cf6c9f23811fbcb75243c89ffe665f5c1e5e60f6f917b3f28", "name": "diffusion_pytorch_model", "base": "flux2", "type": "vae"}
QWEN3_ENCODER = {"key": "1224737a-3ced-4214-8b62-cddb59485dec", "hash": "blake3:88c0dd9c5328b0dab205fd92c8532c0a0781598080910262447d85f01d30e30f", "name": "Z-Image Qwen3 Text Encoder (quantized)", "base": "any", "type": "qwen3_encoder"}

# ── Shared visual language: dark, glitchy, neon-lit, GEOMETRIC (no rounded organic forms),
#    deep black + electric cyan + warning red, holographic/simulation aesthetic. ──
# Sprites: isolated on white for clean rembg cut.
SPRITE_STYLE = (
    ", a sleek geometric neon game sprite, dark angular body built from sharp hard-edged shapes "
    "with glowing electric-cyan edge lines and fine circuit-trace details, flat 2D front-facing "
    "orthographic view, crisp clean vector-like rendering, high contrast, holographic digital "
    "corrupted-simulation aesthetic, NOT rounded NOT organic NOT cute, single centered object "
    "isolated on a plain solid pure white background, no text, no letters, no extra objects, no cast shadow"
)
# Hazards lean red/danger.
HAZARD_STYLE = (
    ", a sharp angular neon hazard game sprite glowing warning-red, hard geometric edges, dark base "
    "with bright glowing red rim light, dangerous digital corrupted look, flat 2D front-facing view, "
    "single centered object isolated on a plain solid pure white background, no text, no cast shadow"
)
# Platforms / bars: opaque horizontal strip that tiles/stretches cleanly.
PLATFORM_STYLE = (
    ", a horizontal sci-fi tech platform bar seen flat straight-on in 2D, a dark angular metal-and-glass "
    "panel with a thin bright glowing neon strip running along the TOP edge and faint circuit lines, "
    "hard geometric edges, the bar fills the frame from left to right as one long horizontal strip with "
    "uniform repeating structure, digital corrupted-simulation aesthetic, no text, no characters"
)
# Full-screen / tiling backgrounds: a scene, fills the whole frame.
BG_STYLE = (
    ", a dark atmospheric digital-void game background, deep near-black depth with a faint glowing "
    "wireframe perspective grid, subtle horizontal scanlines and pixel-corruption glitch artifacts, "
    "distant floating neon geometric shapes and data streams, moody minimal cyberpunk simulation, "
    "lots of calm open space, painted edge to edge as one continuous scene, no characters, no text, no UI, no border"
)

# sid: (prompt_subject, render_w, render_h, target_w, target_h, kind)
# kind: 'sprite' (rembg+fit), 'platform'/'bg'/'tile' (no cut, just resize)
SUBJECTS = {
    # ── Player robot + skins (28×34 in-game) ──
    "robot":        ("a small sleek robot character, a compact angular mechanical body of sharp geometric blocks, a single glowing electric-cyan visor eye slit, dark gunmetal plating with glowing cyan edge lines and circuit seams, standing front-facing, alert and determined", 512, 640, 28, 34, "sprite"),
    "robot_gold":   ("a small sleek robot character, compact angular geometric mechanical body, a single glowing visor eye, polished GOLD plating with bright golden edge lines and circuit seams, front-facing", 512, 640, 28, 34, "sprite"),
    "robot_red":    ("a small sleek robot character, compact angular geometric mechanical body, a single glowing visor eye, dark CRIMSON-RED plating with glowing red edge lines and circuit seams, front-facing, corrupted", 512, 640, 28, 34, "sprite"),
    "robot_glitch": ("a small sleek robot character, compact angular geometric mechanical body breaking apart into glitching pixels and chromatic-aberration RGB split fragments, glowing cyan and magenta edges, datamosh corruption, front-facing", 512, 640, 28, 34, "sprite"),
    "robot_ghost":  ("a small sleek robot character, compact angular geometric mechanical body rendered as a translucent pale cyan hologram with a faint glowing wireframe and scanlines showing through, semi-transparent ghostly, front-facing", 512, 640, 28, 34, "sprite"),
    "robot_void":   ("a small sleek robot character, compact angular geometric mechanical body of pure matte BLACK with only thin razor-sharp dark-grey edge highlights and a single dim white visor eye, minimal void silhouette, front-facing", 512, 640, 28, 34, "sprite"),

    # ── Platforms (96×12 in-game, stretched) ──
    "platform_solid": ("a solid stable tech platform bar, dark slate-blue panel with a bright glowing CYAN top strip", 768, 96, 256, 32, "platform"),
    "platform_fall":  ("an unstable warning tech platform bar, dark panel with a glowing AMBER-ORANGE top strip and tiny hazard chevrons", 768, 96, 256, 32, "platform"),

    # ── Hazards (16×16 in-game) ──
    "spike_real":   ("a single sharp triangular hazard spike pointing straight up, an angular geometric crystalline spike, dark base, glowing warning-red edges and tip", 384, 384, 16, 16, "sprite_h"),

    # ── Exit (32×48 in-game) ──
    "exit_door":    ("a glowing exit portal gateway, a tall vertical rectangular digital doorway frame with bright glowing GREEN neon edges and a dark calm energy center, clean geometric sci-fi, safe and inviting, front-facing", 384, 576, 32, 48, "sprite"),

    # ── Backgrounds ──
    "bg_tile":      ("a seamless tileable dark tech grid texture, near-black with thin faint glowing cyan grid lines and tiny circuit nodes, even and repeating, flat", 768, 768, 256, 256, "tile"),
    "bg_alpha":     ("SIM_ALPHA: a VERY DARK, calm, minimal digital void, deep near-black filling most of the frame with lots of empty black negative space, only a faint subtle low-contrast dark-cyan wireframe grid resting along the very bottom and fading out, no floating objects, no bright glow, quiet unobtrusive atmospheric backdrop that stays out of the way", 1280, 720, 720, 405, "bg"),
    "bg_beta":      ("SIM_BETA: a VERY DARK, calm, minimal corrupted void, deep near-black filling most of the frame with lots of empty black negative space, only a faint subtle low-contrast dark-red wireframe grid resting along the very bottom and fading out, a touch of faint static, no bright objects, quiet ominous unobtrusive backdrop that stays out of the way", 1280, 720, 720, 405, "bg"),
    "bg_menu":      ("a dramatic main-menu digital void, deep black with a glowing cyan wireframe grid floor receding into fog, a faint corrupted glitching neon glow in the upper center, drifting embers of data, cinematic and ominous but inviting, the center kept open for a logo", 1280, 720, 720, 405, "bg"),

    # ── UI icons (small, glowing, geometric) ──
    "icon_shard":      ("a glowing cyan crystalline data-shard gem icon, a sharp faceted angular crystal sliver with bright electric-cyan neon glow and crisp edge light, geometric digital, front view", 320, 320, 32, 32, "sprite"),
    "icon_star":       ("a glowing five-point star icon, a sharp angular geometric star, bright golden-yellow neon fill with a crisp cyan rim glow, clean and bright", 320, 320, 32, 32, "sprite"),
    "icon_star_empty": ("a hollow empty five-point star outline icon, only a thin dim dark steel-grey angular star outline with a faint cold blue edge, unlit empty slot", 320, 320, 32, 32, "sprite"),
}

GROUPS = {
    "robots": ["robot", "robot_gold", "robot_red", "robot_glitch", "robot_ghost", "robot_void"],
    "platforms": ["platform_solid", "platform_fall"],
    "hazards": ["spike_real"],
    "exit": ["exit_door"],
    "bgs": ["bg_tile", "bg_alpha", "bg_beta", "bg_menu"],
    "test": ["robot", "platform_solid", "spike_real", "exit_door", "bg_tile", "bg_menu"],
    # everything NOT in the validated test batch (avoids regenerating the good test set)
    "rest": ["robot_gold", "robot_red", "robot_glitch", "robot_ghost", "robot_void", "platform_fall", "bg_alpha", "bg_beta"],
    "icons": ["icon_shard", "icon_star", "icon_star_empty"],
}

def _post(path, body):
    req = urllib.request.Request(f"{API}{path}", data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r: return json.loads(r.read().decode())

def _get(path):
    with urllib.request.urlopen(urllib.request.Request(f"{API}{path}", method="GET"), timeout=30) as r: return json.loads(r.read().decode())

def _edge(s, sf, d, df): return {"source": {"node_id": s, "field": sf}, "destination": {"node_id": d, "field": df}}

def build_graph(prompt, seed, steps=8, width=1024, height=1024):
    ml, te, dn, vd, md, pn, sn = "flux2_loader:n0", "flux2_text:n1", "flux2_denoise:n2", "canvas_output:n3", "core_metadata:n4", "prompt:n5", "seed:n6"
    return {"id": f"cx:{seed}", "nodes": {
        pn: {"id": pn, "is_intermediate": True, "use_cache": True, "value": prompt, "type": "string"},
        sn: {"id": sn, "is_intermediate": True, "use_cache": True, "value": seed, "type": "integer"},
        ml: {"id": ml, "is_intermediate": True, "use_cache": True, "model": FLUX2_MODEL, "vae_model": FLUX2_VAE, "qwen3_encoder_model": QWEN3_ENCODER, "max_seq_len": 512, "type": "flux2_klein_model_loader"},
        te: {"id": te, "is_intermediate": True, "use_cache": True, "max_seq_len": 512, "type": "flux2_klein_text_encoder"},
        dn: {"id": dn, "is_intermediate": True, "use_cache": True, "denoising_start": 0.0, "denoising_end": 1.0, "add_noise": True, "cfg_scale": 1.0, "width": width, "height": height, "num_steps": steps, "scheduler": "euler", "seed": 0, "type": "flux2_denoise"},
        md: {"id": md, "is_intermediate": True, "use_cache": True, "generation_mode": "flux2_txt2img", "width": width, "height": height, "steps": steps, "model": FLUX2_MODEL, "vae": FLUX2_VAE, "qwen3_encoder": QWEN3_ENCODER, "type": "core_metadata", "canvas_v2_metadata": {"controlLayers": [], "inpaintMasks": [], "rasterLayers": [], "regionalGuidance": []}},
        vd: {"id": vd, "is_intermediate": False, "use_cache": False, "type": "flux2_vae_decode", "board": {"board_id": BOARD_ID}},
    }, "edges": [
        _edge(ml, "qwen3_encoder", te, "qwen3_encoder"), _edge(ml, "max_seq_len", te, "max_seq_len"),
        _edge(ml, "transformer", dn, "transformer"), _edge(ml, "vae", dn, "vae"), _edge(ml, "vae", vd, "vae"),
        _edge(pn, "value", te, "prompt"), _edge(te, "conditioning", dn, "positive_text_conditioning"),
        _edge(sn, "value", dn, "seed"), _edge(dn, "latents", vd, "latents"),
        _edge(sn, "value", md, "seed"), _edge(pn, "value", md, "positive_prompt"), _edge(md, "metadata", vd, "metadata"),
    ]}

def enqueue(prompt, width, height, seed=None):
    if seed is None: seed = random.randint(1, 2_000_000_000)
    graph = build_graph(prompt, seed, width=width, height=height)
    body = {"prepend": False, "batch": {"origin": "corrupted_gen", "destination": f"board:{BOARD_ID}", "graph": graph, "runs": 1}}
    resp = _post("/api/v1/queue/default/enqueue_batch", body)
    return (resp.get("item_ids") or [-1])[0]

def wait_for_item(item_id, timeout=600.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        item = _get(f"/api/v1/queue/default/i/{item_id}")
        if item.get("status") in ("completed", "failed", "canceled"): return item
        time.sleep(1.0)
    raise TimeoutError(f"{item_id} timeout")

def output_images(session):
    names = []
    for v in (session.get("results", {}) or {}).values():
        if isinstance(v, dict) and isinstance(v.get("image"), dict) and v["image"].get("image_name"):
            names.append(v["image"]["image_name"])
    return names

def download(image_name, dest):
    with urllib.request.urlopen(urllib.request.Request(f"{API}/api/v1/images/i/{image_name}/full", method="GET"), timeout=60) as r:
        data = r.read()
    with open(dest, "wb") as f: f.write(data)

STYLE_FOR = {"sprite": SPRITE_STYLE, "sprite_h": HAZARD_STYLE, "platform": PLATFORM_STYLE, "bg": BG_STYLE, "tile": BG_STYLE}

def generate_one(sid):
    prompt_subject, rw, rh, tw, th, kind = SUBJECTS[sid]
    raw_dir = os.path.join(OUT_DIR, "raw")
    os.makedirs(raw_dir, exist_ok=True)
    full = "A " + prompt_subject + STYLE_FOR[kind]
    print(f"[gen] {sid:16} {rw}x{rh} -> target {tw}x{th} ({kind})", flush=True)
    t0 = time.time()
    item_id = enqueue(full, rw, rh)
    res = wait_for_item(item_id)
    if res.get("status") != "completed":
        print(f"  ! {sid}: {res.get('status')} {res.get('error','')}", flush=True); return False
    names = output_images(res.get("session") or {})
    for i, n in enumerate(names):
        dest = os.path.join(raw_dir, f"{sid}.png" if i == 0 else f"{sid}_{i}.png")
        download(n, dest)
        print(f"  OK {sid} {time.time()-t0:.0f}s -> {dest}", flush=True)
    return True

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("group")
    args = ap.parse_args()
    if args.group == "all":
        ids = list(SUBJECTS)
    elif args.group in GROUPS:
        ids = GROUPS[args.group]
    else:
        ids = [args.group]
    ok = 0
    for sid in ids:
        if sid not in SUBJECTS: print(f"unknown: {sid}"); continue
        try:
            if generate_one(sid): ok += 1
        except Exception as e:
            print(f"  ! {sid} EXC: {e}", flush=True)
    print(f"\nDone: {ok}/{len(ids)}", flush=True)

if __name__ == "__main__":
    main()
