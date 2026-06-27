#!/usr/bin/env python3
"""
Gerador de FRAMES PLACEHOLDER para o herói cinematográfico (canvas scroll-video).

Estética: grafite quase-preto + brilho radial que deriva pela cena e pulsa de cor
(vermelho Automotiva <-> azul Bosch), scan line de diagnóstico, vinheta e grain sutil.
Evoca a "tela de diagnóstico" Bosch sem depender de vídeo externo.

>>> Estes frames são TEMPORÁRIOS. Substitua pelos frames reais gerados no Higgsfield
    (engine bay / bancada de peças em dolly lento). Ver CLAUDE_CODE_PROMPT.md, etapa 3.

Uso:
    python3 tools/make_placeholder_frames.py
Saída:
    assets/frames/f_001.jpg ... f_072.jpg   (1280x720, JPG progressivo)
"""
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import math, os, random

W, H = 1280, 720
N = 72                      # mantenha em sincronia com FRAME_COUNT no js/main.js
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "assets", "frames"))
os.makedirs(OUT, exist_ok=True)

random.seed(7)
RED = (225, 27, 44)
ICE = (74, 152, 216)


def lerp(a, b, t):
    return a + (b - a) * t


def blend(c1, c2, t):
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))


def smooth01(x):
    return (math.sin(x) + 1) / 2


# --- base: gradiente vertical (idêntico em todo frame, calculado uma vez) ----------
_base = Image.new("RGB", (W, H))
_bd = ImageDraw.Draw(_base)
_top, _bot = (12, 14, 19), (5, 6, 9)
for y in range(H):
    k = y / H
    _bd.line([(0, y), (W, y)],
             fill=(int(lerp(_top[0], _bot[0], k)),
                   int(lerp(_top[1], _bot[1], k)),
                   int(lerp(_top[2], _bot[2], k))))

# --- vinheta (escurece as bordas) -------------------------------------------------
_vig = Image.new("L", (W, H), 0)
ImageDraw.Draw(_vig).ellipse([int(W * 0.12), int(-H * 0.05),
                              int(W * 0.88), int(H * 1.05)], fill=255)
_vig = _vig.filter(ImageFilter.GaussianBlur(170))
_vig_rgb = Image.merge("RGB", (_vig, _vig, _vig))

# --- grain estático (gerado em baixa resolução e ampliado) ------------------------
_gsmall = Image.new("L", (W // 6, H // 6))
_gpx = _gsmall.load()
for yy in range(_gsmall.height):
    for xx in range(_gsmall.width):
        _gpx[xx, yy] = random.randint(0, 255)
_grain = _gsmall.resize((W, H)).filter(ImageFilter.GaussianBlur(0.9))
_grain = _grain.point(lambda p: int(p * 0.045))         # bem sutil (textura, não ruído)
_grain_rgb = Image.merge("RGB", (_grain, _grain, _grain))

# --- máscara radial reutilizável (disco branco borrado) ---------------------------
def radial(size):
    m = Image.new("L", (size, size), 0)
    pad = size // 6
    ImageDraw.Draw(m).ellipse([pad, pad, size - pad, size - pad], fill=255)
    return m.filter(ImageFilter.GaussianBlur(size // 5))


_GLOW = radial(900)
_BLACK = Image.new("RGB", (W, H), (0, 0, 0))


def colored_glow(cx, cy, size, color, strength):
    """Bloco de cor recortado por uma máscara radial posicionada em (cx,cy)."""
    g = _GLOW.resize((size, size)).point(lambda p: int(p * strength))
    full = Image.new("L", (W, H), 0)
    px, py = cx - size // 2, cy - size // 2
    full.paste(g, (px, py))
    block = Image.new("RGB", (W, H), color)
    return Image.composite(block, _BLACK, full)


for i in range(N):
    t = i / (N - 1)
    f = _base.copy()

    # brilho principal: deriva na horizontal, cor pulsa vermelho<->azul
    cx = int(lerp(0.30, 0.70, smooth01(t * math.tau - math.pi / 2)) * W)
    cy = int(0.46 * H + math.sin(t * math.tau) * 0.05 * H)
    col1 = blend(RED, ICE, smooth01(t * math.pi))
    f = ImageChops.screen(f, colored_glow(cx, cy, int(W * 0.95), col1, 0.55))

    # brilho secundário (profundidade): menor, mais frio, deriva oposta
    cx2 = int(lerp(0.72, 0.34, smooth01(t * math.tau - math.pi / 2)) * W)
    cy2 = int(0.62 * H - math.sin(t * math.tau) * 0.04 * H)
    f = ImageChops.screen(f, colored_glow(cx2, cy2, int(W * 0.55),
                                          blend(ICE, RED, smooth01(t * math.pi + 1)), 0.30))

    # scan line de diagnóstico: desce a tela ao longo da sequência
    scan = Image.new("L", (W, H), 0)
    sy = int(t * H)
    sd = ImageDraw.Draw(scan)
    sd.rectangle([0, sy - 1, W, sy + 1], fill=120)
    scan = scan.filter(ImageFilter.GaussianBlur(2.2))
    scan_rgb = Image.merge("RGB", (scan.point(lambda p: int(p * 0.5)),
                                   scan.point(lambda p: int(p * 0.7)),
                                   scan))
    f = ImageChops.screen(f, scan_rgb)

    # vinheta + grain
    f = ImageChops.multiply(f, _vig_rgb)
    f = ImageChops.screen(f, _grain_rgb)

    path = os.path.join(OUT, f"f_{i + 1:03d}.jpg")
    f.save(path, "JPEG", quality=72, progressive=True, optimize=True)

print(f"OK - {N} frames gerados em {OUT}")
