"""Gera ícones PNG da PWA (sem dependências externas).
Marca: fundo preto, quadrado laranja arredondado com recorte central (logo Patrimo)."""
import zlib, struct, math, os

OUT = os.path.dirname(os.path.abspath(__file__))
ORANGE = (255, 106, 0)
ORANGE2 = (255, 138, 43)
BLACK = (0, 0, 0)

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def rounded_alpha(x, y, x0, y0, x1, y1, r):
    # retorna 1.0 dentro do retângulo arredondado, com leve antialias nas bordas
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    if x0 <= x <= x1 and y0 <= y <= y1:
        dx = x - cx; dy = y - cy
        if (x < x0 + r or x > x1 - r) and (y < y0 + r or y > y1 - r):
            d = math.hypot(dx, dy)
            return max(0.0, min(1.0, (r - d) + 0.5))
        return 1.0
    return 0.0

def make(size, maskable=False):
    pad = int(size * (0.18 if maskable else 0.0))  # área segura p/ maskable
    s0 = pad
    s1 = size - pad
    inner = s1 - s0
    # quadrado da marca (centralizado)
    msize = int(inner * 0.62)
    mx0 = (size - msize) / 2
    my0 = (size - msize) / 2
    mx1 = mx0 + msize
    my1 = my0 + msize
    mr = msize * 0.30
    # recorte interno (forma de anel/quadrado)
    isize = int(msize * 0.46)
    ix0 = (size - isize) / 2
    iy0 = (size - isize) / 2
    ix1 = ix0 + isize
    iy1 = iy0 + isize
    ir = isize * 0.28

    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filtro none por linha
        for x in range(size):
            # fundo preto
            r, g, b = BLACK
            # marca laranja com gradiente diagonal
            a_mark = rounded_alpha(x + 0.5, y + 0.5, mx0, my0, mx1, my1, mr)
            if a_mark > 0:
                t = ((x - mx0) + (y - my0)) / (2 * msize)
                t = max(0.0, min(1.0, t))
                col = lerp(ORANGE2, ORANGE, t)
                r = int(r * (1 - a_mark) + col[0] * a_mark)
                g = int(g * (1 - a_mark) + col[1] * a_mark)
                b = int(b * (1 - a_mark) + col[2] * a_mark)
            # recorte central preto
            a_in = rounded_alpha(x + 0.5, y + 0.5, ix0, iy0, ix1, iy1, ir)
            if a_in > 0:
                r = int(r * (1 - a_in))
                g = int(g * (1 - a_in))
                b = int(b * (1 - a_in))
            raw.extend((r, g, b))
    return png_bytes(size, size, bytes(raw))

def png_bytes(w, h, raw_rgb):
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)  # 8bit, color type 2 (RGB)
    idat = zlib.compress(raw_rgb, 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")

targets = [
    ("icons/icon-192.png", 192, False),
    ("icons/icon-512.png", 512, False),
    ("icons/maskable-512.png", 512, True),
    ("icons/apple-touch-icon.png", 180, False),
]
os.makedirs(os.path.join(OUT, "icons"), exist_ok=True)
for path, size, mask in targets:
    data = make(size, mask)
    with open(os.path.join(OUT, path), "wb") as f:
        f.write(data)
    print(path, size, len(data), "bytes")
print("OK")
