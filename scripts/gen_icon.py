#!/usr/bin/env python3
"""Gera um ícone PNG provisório (fundo vermelho da marca + 'TH' em branco),
sem depender de bibliotecas externas (apenas zlib/struct da stdlib)."""
import struct
import sys
import zlib

RED = (0xE5, 0x25, 0x21)
WHITE = (0xFF, 0xFF, 0xFF)

# Fonte bitmap 5x7 simples
T = [
    "11111",
    "00100",
    "00100",
    "00100",
    "00100",
    "00100",
    "00100",
]
H = [
    "10001",
    "10001",
    "10001",
    "11111",
    "10001",
    "10001",
    "10001",
]

GAP = 2
COLS = 5 + GAP + 5
ROWS = 7


def build_grid():
    grid = [[0] * COLS for _ in range(ROWS)]
    for r in range(ROWS):
        for c in range(5):
            if T[r][c] == "1":
                grid[r][c] = 1
        for c in range(5):
            if H[r][c] == "1":
                grid[r][5 + GAP + c] = 1
    return grid


def write_png(path, size):
    grid = build_grid()
    margin_ratio = 0.22
    usable = size * (1 - 2 * margin_ratio)
    scale = usable / COLS
    offset_x = (size - COLS * scale) / 2
    offset_y = (size - ROWS * scale) / 2

    corner_r = size * 0.18

    def in_rounded_square(x, y):
        if corner_r <= 0:
            return True
        cx = min(max(x, corner_r), size - corner_r)
        cy = min(max(y, corner_r), size - corner_r)
        dx, dy = x - cx, y - cy
        return (dx * dx + dy * dy) <= (corner_r * corner_r + 1)

    rows = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            if not in_rounded_square(x + 0.5, y + 0.5):
                # fora do cartão -> transparente seria ideal, mas manifest icons
                # usam PNG RGB simples; usamos branco de fundo da página.
                r, g, b = (255, 255, 255)
            else:
                gx = (x - offset_x) / scale
                gy = (y - offset_y) / scale
                col = int(gx)
                rowi = int(gy)
                on = 0 <= rowi < ROWS and 0 <= col < COLS and grid[rowi][col]
                r, g, b = WHITE if on else RED
            row += bytes([r, g, b])
        rows.append(bytes([0]) + bytes(row))  # filter type 0 por linha

    raw = b"".join(rows)
    compressed = zlib.compress(raw, 9)

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", compressed) + chunk(b"IEND", b"")

    with open(path, "wb") as f:
        f.write(png)
    print(f"Gerado: {path} ({size}x{size})")


if __name__ == "__main__":
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    for s in (192, 512):
        write_png(f"{out_dir}/icon-{s}.png", s)
