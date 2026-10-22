"""Optimize source photos into responsive WebP files + a manifest used by build.mjs.
Usage: python3 tools/images.py <source_dir>
"""
import json, sys, os
from PIL import Image, ImageOps
SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'img')
MAP = {
  # real photos of the home & residents
  'residents-celebrating': 'IMG-1809.jpg', 'deck-umbrella': 'IMG-1171.jpg', 'deck-patio': 'IMG-1169.jpg',
  'resident-baking': 'IMG-1590.jpg', 'caregiver-resident-hug': 'IMG-1493.jpg', 'caregiver-crafts': 'IMG-1496.jpg',
  'birthday-cake': 'IMG-1783.jpg', 'birthday-party': 'IMG-1781.jpg', 'crossword-visit': 'IMG-1536.jpg',
  'cooking-together': 'IMG-1688.jpg', 'snack-time': 'IMG-1596.jpg', 'resident-snowman': 'IMG-1872.jpg',
  'resident-craft-bird': 'IMG-1874.jpg', 'caregiver-selfie': 'unnamed.jpg',
  'kitchen-dining': 'DSC_1327.jpg', 'kitchen': 'DSC_1330.jpg', 'kitchen-2': 'DSC_1331.jpg', 'dining-room': 'DSC_1334.jpg',
  'dining-room-2': 'DSC_1336.jpg', 'living-room': 'DSC_1339.jpg', 'living-room-2': 'DSC_1341.jpg', 'photo-wall': 'DSC_1342.jpg',
  'dining-hutch': 'DSC_1343.jpg', 'bedroom-1': 'DSC_1344.jpg', 'bedroom-2': 'DSC_1345.jpg', 'bedroom-3': 'DSC_1347.jpg',
  'bedroom-4': 'DSC_1348.jpg', 'bedroom-5': 'DSC_1351.jpg', 'bedroom-6': 'Beyond.jpg',
  # licensed stock used on the original site
  'svc-personal-support': 'Personal-Support.jpg', 'svc-health-care': 'Health-Care-01.jpg', 'svc-health-care-2': 'Health-Care-3.jpg',
  'svc-homemaker': 'Home-Maker-Companion.jpg', 'svc-homemaker-2': 'Home-Maker-Companion-01.jpg',
  'svc-pca': 'Personal-Care-Assistant-01.jpg', 'svc-pca-2': 'Personal-Care-Assistant-03.jpg', 'svc-rn': 'RN-Services.jpg',
  'svc-rn-2': 'RN-Services-1.jpg', 'senior-couple-laughing': 'senior-couple-laughing.jpg', 'caregiver-resident-laughing': 'caregiver-resident-laughing.jpg', 'caregiver-resident-outdoors': 'caregiver-resident-outdoors.jpg', 'caregiver-resident-shoulder': 'caregiver-resident-shoulder.jpg', 'svc-senior-care': 'Senior-Care.jpg', 'svc-personal-care-2': 'Personal-Care-2.jpg',
}
WIDTHS = [480, 800, 1200, 1600]
os.makedirs(OUT, exist_ok=True)
manifest = {}
for name, f in MAP.items():
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, f))).convert('RGB')
    w, h = im.size
    ws = [x for x in WIDTHS if x < w] + [min(w, WIDTHS[-1])]
    ws = sorted(set(ws))
    for x in ws:
        r = im.resize((x, round(h * x / w)), Image.LANCZOS) if x != w else im
        r.save(os.path.join(OUT, f'{name}-{x}.webp'), 'WEBP', quality=74, method=6)
    manifest[name] = {'w': w, 'h': h, 'widths': ws}
# logo icon + favicons
icon = Image.open(os.path.join(SRC, 'Beyound-Senior-LIving-Icon.png')).convert('RGBA')
bbox = icon.getbbox(); icon = icon.crop(bbox)
side = max(icon.size); sq = Image.new('RGBA', (side, side), (0, 0, 0, 0)); sq.paste(icon, ((side - icon.size[0]) // 2, (side - icon.size[1]) // 2)); 
sq.resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, 'logo-icon.png'), optimize=True)
sq.resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, 'logo-icon.webp'), 'WEBP', quality=90)
static = os.path.join(os.path.dirname(__file__), '..', 'src', 'static')
sq.resize((512, 512), Image.LANCZOS).save(os.path.join(static, 'icon-512.png'), optimize=True)
sq.resize((192, 192), Image.LANCZOS).save(os.path.join(static, 'icon-192.png'), optimize=True)
bg = Image.new('RGBA', (180, 180), (255, 255, 255, 255)); bg.paste(sq.resize((150, 150), Image.LANCZOS), (15, 15), sq.resize((150, 150), Image.LANCZOS))
bg.convert('RGB').save(os.path.join(static, 'apple-touch-icon.png'))
sq.save(os.path.join(static, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
json.dump(manifest, open(os.path.join(os.path.dirname(__file__), '..', 'src', 'images.json'), 'w'), indent=1)
print(len(manifest), 'images')
