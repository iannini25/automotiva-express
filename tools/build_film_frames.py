#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Monta o filme do herói (4 tomadas kling3_0) e extrai a sequência de frames
para o canvas scroll-film (assets/frames/f_%03d.jpg).

- Encadeamento HÍBRIDO: t1->t2 e t3->t4 vêm encadeados por último-frame; t2->t3
  é troca de cena (engine bay -> exploded). Um crossfade curto em TODAS as
  junções suaviza tudo e esconde a troca de cena de t2->t3.
- Usa o ffmpeg embutido do imageio_ffmpeg (não exige ffmpeg no sistema).
- PyAV apenas para medir a duração exata de cada clipe (offsets do xfade).

Uso:
    python tools/build_film_frames.py [--apply]

Sem --apply: gera só o scratchpad (film.mp4, out/, contact sheet) p/ revisão.
Com --apply: também limpa assets/frames/ e copia a nova sequência, imprimindo
o FRAME_COUNT a colocar em js/main.js.
"""
import os, sys, glob, shutil, subprocess
import imageio_ffmpeg
import av

# --- caminhos ---
PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.environ.get(
    "FILM2_DIR",
    r"C:\Users\berna\AppData\Local\Temp\claude\d--LandingPages-automotiva-express-site-automotiva-express-site\0ad89fd4-6ca3-4356-99f6-83e6c1762871\scratchpad\film2",
)
OUT_DIR    = os.path.join(SRC, "out")
FILM_MP4   = os.path.join(SRC, "film.mp4")
SHEET      = os.path.join(SRC, "contact_sheet.jpg")
FRAMES_DST = os.path.join(PROJ, "assets", "frames")

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
TAKES  = [os.path.join(SRC, f"t{i}.mp4") for i in (1, 2, 3, 4)]

W, H   = 1440, 810      # 16:9, igual aos frames reais anteriores
FPS    = 8              # ~150 frames sobre ~19s -> scrub suave, payload enxuto
XFADE  = 0.3            # s, crossfade em cada junção
OUTFPS = 24            # fps interno do film.mp4 montado


def dur(path):
    with av.open(path) as c:
        s = c.streams.video[0]
        if s.duration and s.time_base:
            return float(s.duration * s.time_base)
        return float(c.duration) / 1_000_000.0  # AV_TIME_BASE


def run(cmd):
    print("  $", " ".join(f'"{c}"' if " " in c else c for c in cmd[:2]), "...")
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def build_film():
    ds = [dur(t) for t in TAKES]
    print("durações:", [round(d, 2) for d in ds], "soma", round(sum(ds), 2))

    norm = (f"settb=AVTB,fps={OUTFPS},"
            f"scale={W}:{H}:force_original_aspect_ratio=increase,"
            f"crop={W}:{H},setsar=1")
    parts = [f"[{i}:v]{norm}[v{i}]" for i in range(4)]

    # offsets acumulados do xfade
    off1 = ds[0] - XFADE
    off2 = ds[0] + ds[1] - 2 * XFADE
    off3 = ds[0] + ds[1] + ds[2] - 3 * XFADE
    parts += [
        f"[v0][v1]xfade=transition=fade:duration={XFADE}:offset={off1:.3f}[x1]",
        f"[x1][v2]xfade=transition=fade:duration={XFADE}:offset={off2:.3f}[x2]",
        f"[x2][v3]xfade=transition=fade:duration={XFADE}:offset={off3:.3f}[vout]",
    ]
    fc = ";".join(parts)

    cmd = [FFMPEG, "-y"]
    for t in TAKES:
        cmd += ["-i", t]
    cmd += ["-filter_complex", fc, "-map", "[vout]",
            "-r", str(OUTFPS), "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-crf", "18", "-movflags", "+faststart", FILM_MP4]
    print("montando film.mp4 (xfade)...")
    run(cmd)
    print("  ->", FILM_MP4, f"({os.path.getsize(FILM_MP4)//1024} KB), dur ~",
          round(sum(ds) - 3 * XFADE, 2), "s")


def extract_frames():
    if os.path.isdir(OUT_DIR):
        shutil.rmtree(OUT_DIR)
    os.makedirs(OUT_DIR, exist_ok=True)
    run([FFMPEG, "-y", "-i", FILM_MP4, "-vf", f"fps={FPS}",
         "-q:v", "4", os.path.join(OUT_DIR, "f_%03d.jpg")])
    files = sorted(glob.glob(os.path.join(OUT_DIR, "f_*.jpg")))
    total = sum(os.path.getsize(f) for f in files)
    print(f"extraídos {len(files)} frames, total {total/1_048_576:.1f} MB,"
          f" média {total//max(1,len(files))//1024} KB/frame")
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
        im = Image.open(p).resize((tw, th))
        sheet.paste(im, ((k % cols) * tw, (k // cols) * th))
    sheet.save(SHEET, quality=88)
    print("  contact sheet ->", SHEET)


def apply(files):
    old = glob.glob(os.path.join(FRAMES_DST, "f_*.jpg"))
    for f in old:
        os.remove(f)
    for i, f in enumerate(files, 1):
        shutil.copyfile(f, os.path.join(FRAMES_DST, f"f_{i:03d}.jpg"))
    print(f"APLICADO: {len(files)} frames -> assets/frames/ (removidos {len(old)} antigos)")
    print(f">>> ATUALIZAR js/main.js: FRAME_COUNT: {len(files)}")


if __name__ == "__main__":
    for t in TAKES:
        if not os.path.exists(t):
            sys.exit(f"FALTA: {t}")
    build_film()
    files = extract_frames()
    contact_sheet(files)
    if "--apply" in sys.argv:
        apply(files)
    else:
        print("\n(dry-run) revise film.mp4 / contact_sheet.jpg. Rode com --apply para publicar.")
