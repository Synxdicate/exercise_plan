#!/usr/bin/env python3
"""App icon/splash/favicon from assets/logo.svg (white glyph, viewBox -512..512).
Renders the glyph with headless Chrome, then composes the PNGs with PIL.
Usage: python3 scripts/make-icons.py"""
import os, subprocess, tempfile
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RED, LIGHT, DARK = (225, 29, 72), (243, 244, 246), (10, 12, 15)
RES = os.path.join(ROOT, 'android/app/src/main/res')

def render_glyph(px=2048):
    tmp = tempfile.mkdtemp()
    html = os.path.join(tmp, 'g.html')
    with open(html, 'w') as f:
        f.write(f'<html><body style="margin:0;background:transparent"><img src="file://{ROOT}/assets/logo.svg" width="{px}" height="{px}" style="display:block"></body></html>')
    out = os.path.join(tmp, 'g.png')
    subprocess.run(['google-chrome-stable', '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
                    '--default-background-color=00000000', f'--window-size={px},{px}', f'--screenshot={out}', f'file://{html}'],
                   check=True, capture_output=True)
    im = Image.open(out).convert('RGBA')
    return im.crop(im.getbbox())

GLYPH = render_glyph()

def glyph(height, color=(255, 255, 255)):
    w = round(GLYPH.width * height / GLYPH.height)
    g = GLYPH.resize((w, height), Image.LANCZOS)
    solid = Image.new('RGBA', g.size, color + (255,))
    solid.putalpha(g.split()[3])
    return solid

def paste_center(base, g):
    base.alpha_composite(g, ((base.width - g.width) // 2, (base.height - g.height) // 2))
    return base

def icon(size, shape, ratio):
    big = size * 4
    im = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    mask = Image.new('L', (big, big), 0)
    d = ImageDraw.Draw(mask)
    if shape == 'circle': d.ellipse((0, 0, big - 1, big - 1), fill=255)
    elif shape == 'round': d.rounded_rectangle((0, 0, big - 1, big - 1), radius=round(big * 0.22), fill=255)
    else: d.rectangle((0, 0, big, big), fill=255)
    im.paste(Image.new('RGBA', (big, big), RED + (255,)), (0, 0), mask)
    paste_center(im, glyph(round(big * ratio)))
    return im.resize((size, size), Image.LANCZOS)

def foreground(size):
    im = Image.new('RGBA', (size * 4, size * 4), (0, 0, 0, 0))
    return paste_center(im, glyph(round(size * 4 * 0.42))).resize((size, size), Image.LANCZOS)

def splash(w, h, bg):
    im = Image.new('RGBA', (w, h), bg + (255,))
    return paste_center(im, glyph(round(min(w, h) * 0.2), RED)).convert('RGB')

# sources in assets/
icon(1024, 'square', 0.6).convert('RGB').save(os.path.join(ROOT, 'assets/icon-only.png'))
foreground(1024).save(os.path.join(ROOT, 'assets/icon-foreground.png'))
Image.new('RGB', (1024, 1024), RED).save(os.path.join(ROOT, 'assets/icon-background.png'))
splash(2732, 2732, LIGHT).save(os.path.join(ROOT, 'assets/splash.png'))
splash(2732, 2732, DARK).save(os.path.join(ROOT, 'assets/splash-dark.png'))

# android launcher icons (sizes from the existing files)
for dpi, s in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    d = os.path.join(RES, f'mipmap-{dpi}')
    icon(s, 'round', 0.6).save(os.path.join(d, 'ic_launcher.png'))
    icon(s, 'circle', 0.55).save(os.path.join(d, 'ic_launcher_round.png'))
    foreground(round(s * 2.25)).save(os.path.join(d, 'ic_launcher_foreground.png'))

# android splash: keep each existing file's size
for folder in sorted(os.listdir(RES)):
    f = os.path.join(RES, folder, 'splash.png')
    if folder.startswith('drawable') and os.path.exists(f):
        w, h = Image.open(f).size
        splash(w, h, DARK if 'night' in folder else LIGHT).save(f)
print('icons done')
