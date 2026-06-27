#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Grade cinematográfico + extração de frames do filme-herói.

Aplica (ffmpeg embutido) sobre o filme (idealmente já upscaled 4K):
  - downscale lanczos para a resolução de entrega (nitidez de downsample)
  - unsharp sutil
  - grade leve premium (contraste/saturação/gamma) afinado ao design LIGHT
  - bloom suave (split + gblur + screen) — brilho nos metais, ar cinematográfico
  - vinheta leve + grão fino temporal
Depois amostra a JPG na cadência alvo. Sem créditos (100% local).

Uso:  python tools/grade_extract.py <input.mp4> [--apply]
  sem --apply: gera só scratchpad (out2/, contact_sheet2.jpg) p/ revisão
  com --apply: limpa assets/frames/ e copia a nova sequência; imprime FRAME_COUNT
"""
import os, sys, glob, shutil, subprocess
import imageio_ffmpeg

PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.environ.get("FILM2_DIR",
    r"C:\Users\berna\AppData\Local\Temp\claude\d--LandingPages-automotiva-express-site-automotiva-express-site\0ad89fd4-6ca3-4356-99f6-83e6c1762871\scratchpad\film2")
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
OUT_DIR = os.path.join(SRC, "out2")
SHEET = os.path.join(SRC, "contact_sheet2.jpg")
FRAMES_DST = os.path.join(PROJ, "assets", "frames")

W, H = 1600, 900     # resolução de entrega (16:9; cobre desktop, payload sob controle)
FPS = 11             # cadência; o motor interpola entre frames, então 11 já é bem suave

GRADE = (
    f"fps={FPS},scale={W}:{H}:flags=lanczos,"
    "unsharp=5:5:0.5:5:5:0.0,"
    "eq=contrast=1.055:saturation=1.06:gamma=0.99,"
    "split[base][bl];"
    "[bl]gblur=sigma=16[blb];"
    "[base][blb]blend=all_mode=screen:all_opacity=0.13,"
    "vignette=angle=PI/5.2,"
    "noise=alls=5:allf=t+u"
)


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def extract(src):
    if os.path.isdir(OUT_DIR):
        shutil.rmtree(OUT_DIR)
    os.makedirs(OUT_DIR, exist_ok=True)
    fc = f"[0:v]{GRADE}[out]"
    run([FFMPEG, "-y", "-i", src, "-filter_complex", fc, "-map", "[out]",
         "-q:v", "4", os.path.join(OUT_DIR, "f_%03d.jpg")])
    files = sorted(glob.glob(os.path.join(OUT_DIR, "f_*.jpg")))
    total = sum(os.path.getsize(f) for f in files)
    print(f"extraídos {len(files)} frames @ {W}x{H} {FPS}fps, "
          f"total {total/1_048_576:.1f} MB, média {total//max(1,len(files))//1024} KB/frame")
    return files


def contact_sheet(files):
    from PIL import Image
    n = 12
    pick = [files[round(i * (len(files) - 1) / (n - 1))] for i in range(n)]
    cols, tw = 4, 360
    th = round(tw * H / W)
    rows = (n + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * th), (10, 11, 14))
    for k, p in enumerate(pick):
        sheet.paste(Image.open(p).resize((tw, th)), ((k % cols) * tw, (k // cols) * th))
    sheet.save(SHEET, quality=88)
    print("contact sheet ->", SHEET)


def apply(files):
    old = glob.glob(os.path.join(FRAMES_DST, "f_*.jpg"))
    for f in old:
        os.remove(f)
    for i, f in enumerate(files, 1):
        shutil.copyfile(f, os.path.join(FRAMES_DST, f"f_{i:03d}.jpg"))
    print(f"APLICADO: {len(files)} frames -> assets/frames/ (removidos {len(old)})")
    print(f">>> ATUALIZAR js/main.js: FRAME_COUNT: {len(files)}")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    src = args[0] if args else os.path.join(SRC, "film_4k.mp4")
    if not os.path.exists(src):
        alt = os.path.join(SRC, "film_hd.mp4")
        print(f"(aviso) {src} não existe; usando {alt}")
        src = alt
    files = extract(src)
    contact_sheet(files)
    if "--apply" in sys.argv:
        apply(files)
    else:
        print("\n(dry-run) revise out2/ + contact_sheet2.jpg. Rode com --apply para publicar.")
