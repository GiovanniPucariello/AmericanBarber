# Normalizes img_utils/HairStyles/* into public/hairstyles/*: cuts off the
# title baked into each image (the app renders names itself), trims flat white
# borders, converts to grayscale (kills the yellow backgrounds), crops to 4:5.
# Re-run after adding images: python3 scripts/process-hairstyles.py
from pathlib import Path
from PIL import Image, ImageOps

SRC = Path("img_utils/HairStyles")
OUT = Path("public/hairstyles")

# Fraction of the height where each baked-in title starts (measured by eye);
# everything below is dropped. New images default to 0.75.
LABEL_TOP = {
    "AmericanFade-1": 0.86, "AmericanFade-2": 0.80, "AmericanFade-3": 0.86, "AmericanFade-4": 0.70, "AmericanFade-5": 0.77,
    "BuzzCut-1": 0.88, "BuzzCut-2": 0.87, "BuzzCut-3": 0.80, "BuzzCut-4": 0.67,
    "Mullet-1": 0.83, "Mullet-2": 0.81, "Mullet-3": 0.88, "Mullet-4": 0.89, "Mullet-5": 0.88, "Mullet-6": 0.89, "Mullet-7": 0.88,
    "OldSchool-1": 0.81, "OldSchool-2": 0.79, "OldSchool-3": 0.79, "OldSchool-4": 0.79,
    "RazorFade-1": 0.90, "RazorFade-2": 0.90, "RazorFade-3": 0.87, "RazorFade-4": 0.71, "RazorFade-5": 0.77, "RazorFade-6": 0.73,
}

# Dark gradient band along the top edge of a few images.
TOP_CUT = {"AmericanFade-4": 0.09}


def trim_white_borders(im):
    # Only trims a side whose content edge is colored/gray (a pasted border);
    # on white-background images the content edge is itself white, kept as-is.
    g = im.convert("L")
    box = g.point(lambda p: 255 if p < 248 else 0).getbbox()
    if not box:
        return im
    l, t, r, b = box
    w, h = im.size
    mean = lambda region: sum(g.crop(region).getdata()) / max(1, (region[2] - region[0]) * (region[3] - region[1]))
    keep = [
        l if mean((l, t, l + 3, b)) < 235 else 0,
        t if mean((l, t, r, t + 3)) < 235 else 0,
        r if mean((r - 3, t, r, b)) < 235 else w,
        b if mean((l, b - 3, r, b)) < 235 else h,
    ]
    return im.crop(keep)


for src in sorted(SRC.glob("*/*.jpeg")):
    im = Image.open(src).convert("RGB")
    im = im.crop((0, int(im.height * TOP_CUT.get(src.stem, 0)), im.width, int(im.height * LABEL_TOP.get(src.stem, 0.75))))
    im = trim_white_borders(im)
    im = ImageOps.autocontrast(ImageOps.grayscale(im), cutoff=1)
    # 4:5, anchored to the top so the haircut stays in frame.
    im = ImageOps.fit(im, (800, 1000), centering=(0.5, 0.0))
    dest = OUT / src.parent.name / f"{src.stem.split('-')[-1]}.webp"
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "WEBP", quality=78)
    print(dest, dest.stat().st_size // 1024, "KB")
