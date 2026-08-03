from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
PUBLIC_ASSETS = ROOT / 'public' / 'assets'
SCREENSHOTS = ROOT / 'store' / 'screenshots'
ASSETS.mkdir(parents=True, exist_ok=True)
PUBLIC_ASSETS.mkdir(parents=True, exist_ok=True)

FONT_REG = '/usr/share/fonts/opentype/inter/Inter-Regular.otf'
FONT_BOLD = '/usr/share/fonts/opentype/inter/Inter-Bold.otf'


def font(size, bold=False):
    path = FONT_BOLD if bold else FONT_REG
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def fit_text(draw, text, max_width, start_size, bold=True):
    size = start_size
    while size >= 5:
        f = font(size, bold)
        if draw.textbbox((0, 0), text, font=f)[2] <= max_width:
            return f
        size -= 1
    return font(5, bold)


def rounded_mask(size, radius):
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def load_master_logo():
    source = ASSETS / 'logo-source.png'
    if not source.exists():
        raise FileNotFoundError('assets/logo-source.png bulunamadı.')
    return Image.open(source).convert('RGBA')


def make_icon(master, size=1024):
    # Kullanıcının sağladığı logoyu değiştirmeden beyaz bir Windows uygulama kutucuğuna yerleştirir.
    tile = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    white = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    tile.paste(white, (0, 0), rounded_mask(size, int(size * 0.22)))

    content = master.copy()
    max_w = int(size * 0.78)
    max_h = int(size * 0.82)
    content.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
    x = (size - content.width) // 2
    y = (size - content.height) // 2
    tile.alpha_composite(content, (x, y))
    return tile


def save_icon_set(icon):
    icon.save(ASSETS / 'icon.png')
    icon.save(PUBLIC_ASSETS / 'icon.png')
    icon.save(ASSETS / 'icon.ico', sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    for name, size in [('StoreLogo.png', 50), ('Square44x44Logo.png', 44), ('Square150x150Logo.png', 150)]:
        icon.resize((size, size), Image.Resampling.LANCZOS).save(ASSETS / name)


def make_red_glow(width, height):
    glow = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    d.ellipse((width * 0.42, -height * 0.65, width * 1.08, height * 0.90), fill=(255, 66, 54, 62))
    return glow.filter(ImageFilter.GaussianBlur(max(18, int(min(width, height) * 0.16))))


def make_wide(icon):
    im = Image.new('RGBA', (310, 150), (8, 14, 28, 255))
    im = Image.alpha_composite(im, make_red_glow(310, 150))
    d = ImageDraw.Draw(im)
    im.alpha_composite(icon.resize((104, 104), Image.Resampling.LANCZOS), (20, 23))
    d.text((139, 43), 'Everstep', font=fit_text(d, 'Everstep', 155, 28), fill=(247, 250, 255))
    d.text((140, 79), 'Plan. Focus. Move Forward.', font=font(11), fill=(155, 171, 190))
    im.save(ASSETS / 'Wide310x150Logo.png')


def make_square(icon):
    im = Image.new('RGBA', (310, 310), (8, 14, 28, 255))
    im = Image.alpha_composite(im, make_red_glow(310, 310))
    d = ImageDraw.Draw(im)
    im.alpha_composite(icon.resize((188, 188), Image.Resampling.LANCZOS), (61, 30))
    d.text((155, 234), 'Everstep', font=font(28, True), anchor='mm', fill=(247, 250, 255))
    d.text((155, 269), 'Move forward, one focus at a time.', font=font(10), anchor='mm', fill=(155, 171, 190))
    im.save(ASSETS / 'Square310x310Logo.png')


def make_splash(icon):
    im = Image.new('RGBA', (620, 300), (8, 14, 28, 255))
    im = Image.alpha_composite(im, make_red_glow(620, 300))
    d = ImageDraw.Draw(im)
    im.alpha_composite(icon.resize((176, 176), Image.Resampling.LANCZOS), (58, 62))
    d.text((276, 92), 'Everstep', font=font(54, True), fill=(247, 250, 255))
    d.text((279, 158), 'Plan. Focus. Move Forward.', font=font(21), fill=(167, 183, 202))
    im.save(ASSETS / 'SplashScreen.png')


def make_hero(icon):
    width, height = 1920, 1080
    im = Image.new('RGBA', (width, height), (7, 12, 25, 255))
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    d_overlay = ImageDraw.Draw(overlay)
    d_overlay.ellipse((930, -260, 2100, 860), fill=(255, 66, 54, 72))
    d_overlay.ellipse((-320, 540, 760, 1510), fill=(124, 92, 255, 30))
    overlay = overlay.filter(ImageFilter.GaussianBlur(155))
    im = Image.alpha_composite(im, overlay)
    d = ImageDraw.Draw(im)
    im.alpha_composite(icon.resize((360, 360), Image.Resampling.LANCZOS), (230, 310))
    d.text((680, 350), 'Everstep', font=font(118, True), fill=(249, 252, 255))
    d.text((691, 500), 'Plan. Focus. Move Forward.', font=font(42), fill=(190, 208, 217))
    d.text((692, 590), 'A secure, privacy-first Pomodoro timer, task planner,\nand focus companion built for steady progress.', font=font(28), fill=(157, 179, 190), spacing=16)
    im.convert('RGB').save(ASSETS / 'StoreHero_1920x1080.png', quality=95)


def update_screenshots(icon):
    if not SCREENSHOTS.exists():
        return
    for shot in SCREENSHOTS.glob('*.png'):
        im = Image.open(shot).convert('RGBA')
        block = Image.new('RGBA', (260, 109), (6, 10, 20, 255))
        block.alpha_composite(icon.resize((48, 48), Image.Resampling.LANCZOS), (29, 27))
        bd = ImageDraw.Draw(block)
        bd.text((88, 28), 'Everstep', font=fit_text(bd, 'Everstep', 125, 20), fill=(247, 250, 255))
        bd.text((89, 58), 'Plan. Focus. Forward.', font=fit_text(bd, 'Plan. Focus. Forward.', 122, 8, False), fill=(132, 148, 171))
        im.paste(block, (0, 0))
        im.convert('RGB').save(shot, quality=95)


if __name__ == '__main__':
    master = load_master_logo()
    icon = make_icon(master)
    save_icon_set(icon)
    make_wide(icon)
    make_square(icon)
    make_splash(icon)
    make_hero(icon)
    update_screenshots(icon)
    print('Everstep logo assets generated from assets/logo-source.png.')
