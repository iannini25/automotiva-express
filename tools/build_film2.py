#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Stitch do filme-herói v2 (plano-sequência costurado):
  T1' (push-in, A1 com emblema) -> T2 (capô/cofre) -> PLANO-SEQUÊNCIA (motor sobe
  do cofre e explode) -> T4' (assentar/freeze).

  - T2->plano-sequência e plano-sequência->T4' já são CONTÍNUOS (encadeados por
    último-frame), então a costura ali é curtíssima (0.2s). T1'->T2 leva 0.3s.
  - ffmpeg embutido do imageio_ffmpeg (sem ffmpeg de sistema). PyAV só mede durações.

Saída: film2/film_hd.mp4 (1280x720, ~25s). O grade + upscale 4K + extração de
frames acontecem depois (grade_extract.py), sobre o filme já upscaled.
"""
import os, sys, subprocess
import imageio_ffmpeg
import av

SRC = os.environ.get("FILM2_DIR",
    r"C:\Users\berna\AppData\Local\Temp\claude\d--LandingPages-automotiva-express-site-automotiva-express-site\0ad89fd4-6ca3-4356-99f6-83e6c1762871\scratchpad\film2")
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
OUT = os.path.join(SRC, "film_hd.mp4")

# (arquivo, xfade-de-entrada-em-segundos a partir do clipe anterior)
CLIPS = [
    ("t1c.mp4", None),   # T1'' — push-in com emblema, FIXADO no end_image = start2 (1º frame da t2)
    ("t2.mp4", 0.12),    # T2  — capô abre / mergulho no cofre (xfade curto: os frames já casam)
    ("seam.mp4", 0.20),  # plano-sequência — motor sobe e explode (contínuo a partir do cofre)
    ("t4b.mp4", 0.20),   # T4' — assenta (contínuo a partir do exploded)
]
W, H, FPS = 1280, 720, 24


def dur(path):
    with av.open(path) as c:
        s = c.streams.video[0]
        if s.duration and s.time_base:
            return float(s.duration * s.time_base)
        return float(c.duration) / 1_000_000.0


def main():
    paths = [os.path.join(SRC, c[0]) for c in CLIPS]
    for p in paths:
        if not os.path.exists(p):
            sys.exit("FALTA: " + p)
    ds = [dur(p) for p in paths]
    print("durações:", [round(d, 2) for d in ds])

    norm = (f"settb=AVTB,fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase,"
            f"crop={W}:{H},setsar=1")
    parts = [f"[{i}:v]{norm}[v{i}]" for i in range(len(paths))]

    cur = "[v0]"
    acc = ds[0]
    total_xf = 0.0
    for i in range(1, len(paths)):
        xf = CLIPS[i][1]
        off = acc - xf
        out = f"[x{i}]" if i < len(paths) - 1 else "[vout]"
        parts.append(f"{cur}[v{i}]xfade=transition=fade:duration={xf}:offset={off:.3f}{out}")
        cur = out
        acc = acc + ds[i] - xf
        total_xf += xf

    fc = ";".join(parts)
    cmd = [FFMPEG, "-y"]
    for p in paths:
        cmd += ["-i", p]
    cmd += ["-filter_complex", fc, "-map", "[vout]", "-r", str(FPS),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16",
            "-movflags", "+faststart", OUT]
    print("montando film_hd.mp4 ...")
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("  ->", OUT, f"({os.path.getsize(OUT)//1024} KB), dur ~ {round(sum(ds)-total_xf,2)}s")


if __name__ == "__main__":
    main()
