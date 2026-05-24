import urllib.request
import os

dir_path = r'd:\odoo19\odoo-modules-19\lusso_website_snippets\static\src\img'
os.makedirs(dir_path, exist_ok=True)

imgs = [
    'hero-chair.png', 'hero-dark.png', 'hero-warm.png', 'hero-forest.png',
    'col-living.jpg', 'col-dining.jpg', 'col-workspace.jpg', 'col-bedroom.jpg',
    'craft-wood.jpg', 'craft-hands.jpg', 'newsletter-bg.jpg',
    'prod-1.jpg', 'prod-2.jpg', 'prod-3.jpg', 'prod-4.jpg', 'prod-5.jpg'
]

# Delete old images first
for name in imgs:
    out = os.path.join(dir_path, name)
    if os.path.exists(out):
        os.remove(out)
        print(f"Deleted {name}")

# Different keywords to make sure they're relevant
keywords = [
    'furniture,chair', 'furniture,sofa,dark', 'furniture,wood,warm', 'furniture,forest,green',
    'livingroom', 'diningroom', 'workspace,desk', 'bedroom',
    'woodcraft', 'craftsman,hands', 'newsletter,background,furniture',
    'armchair', 'sofa', 'diningtable', 'bookshelf', 'loungechair'
]

for i, (name, keyword) in enumerate(zip(imgs, keywords)):
    url = f'https://loremflickr.com/800/600/{keyword}?lock={i}'
    out = os.path.join(dir_path, name)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response, open(out, 'wb') as f:
            f.write(response.read())
        print(f"Downloaded {name}")
    except Exception as e:
        print(f"Error {name}: {e}")
