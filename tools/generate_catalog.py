#!/usr/bin/env python3
"""
Regenerates rama-creations-site/data/books.json from
rama-creations-site/content/books/<slug>/ folders. This IS the "drop a
folder, get a book" pipeline -- run it locally before previewing, and it
also runs automatically in .github/workflows/deploy-site.yml before every
GitHub Pages deploy, so dropping a new book folder and pushing is the only
step a developer needs to take.

Expected folder layout per book (one folder per book, folder name = its id):

    rama-creations-site/content/books/<slug>/
        book.json
        images/                 (optional)
            01-front.jpg
            02-back.jpg
            03-instagram.jpg
            04-pinterest.jpg

book.json fields:
    title              required
    ageLabel            required, e.g. "Ages 6-10" -- shown on the badge
    shortDescription    required -- the card's default teaser text
    fullDescription     optional -- shown by "Show more"; defaults to
                        shortDescription (which hides the "Show more" link)
    ageFilter           optional -- auto-derived (slugified) from ageLabel
                        if omitted; only set this if you want two different
                        ageLabels to share one filter bucket
    themeColor          optional -- hex solid-color card background used
                        ONLY when there's no images/ folder; a color is
                        auto-assigned from the standard pastel palette if
                        omitted
    buyLink             optional -- omit or set to null for a disabled
                        "Coming soon" button; set to a real (or Amazon
                        search) URL for a live "Buy on Amazon" button

images/ (optional): any number of images, in any common format (jpg/png/
webp). They're resized to a consistent ~700px width and copied into
assets/covers/<slug>/ as JPEGs. Sort order matters -- name files with a
numeric prefix (01-, 02-, ...) to control it. The FIRST image becomes the
card's thumbnail; ALL of them become quick-view carousel slides. Skip this
folder entirely for a solid-color placeholder card instead (uses
themeColor).

Usage:
    python rama-creations-site/tools/generate_catalog.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from PIL import Image

SITE_ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = SITE_ROOT / "content" / "books"
COVERS_DIR = SITE_ROOT / "assets" / "covers"
OUTPUT_PATH = SITE_ROOT / "data" / "books.json"
TARGET_WIDTH = 700
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# Same pastel palette cover_projects/cover_builder_universal.py randomly
# assigns cover themes from -- reused here as the fallback for books that
# don't have real cover images yet.
FALLBACK_PALETTE = ["#FEE2E2", "#DBEAFE", "#DCFCE7", "#FEF3C7", "#EDE9FE", "#FFE4E6", "#E0F2FE", "#FCE7F3"]


def slugify(text: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", text.strip().lower()).strip("-")
    return cleaned or "book"


def process_images(slug: str, images_dir: Path) -> list:
    if not images_dir.is_dir():
        return []
    out_dir = COVERS_DIR / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    entries = []
    for src in sorted(images_dir.iterdir()):
        if src.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        with Image.open(src) as img:
            img = img.convert("RGB")
            if img.width > TARGET_WIDTH:
                target_h = int(img.height * TARGET_WIDTH / img.width)
                img = img.resize((TARGET_WIDTH, target_h), Image.Resampling.LANCZOS)
            dest_name = f"{src.stem}.jpg"
            dest_path = out_dir / dest_name
            img.save(dest_path, quality=85, optimize=True)
        # "01-front" -> "Front", "instagram" -> "Instagram"
        label_source = src.stem.split("-", 1)[-1] if "-" in src.stem else src.stem
        alt_label = label_source.replace("_", " ").replace("-", " ").strip().title()
        entries.append({"src": f"assets/covers/{slug}/{dest_name}", "alt": alt_label})
    return entries


def build_entry(folder: Path, index: int) -> dict:
    slug = folder.name
    meta_path = folder / "book.json"
    if not meta_path.is_file():
        raise ValueError(f"{folder} has no book.json")
    meta = json.loads(meta_path.read_text(encoding="utf-8"))

    for required in ("title", "ageLabel", "shortDescription"):
        if not meta.get(required):
            raise ValueError(f"book.json is missing required field '{required}'")

    images = process_images(slug, folder / "images")
    theme_color = meta.get("themeColor") or FALLBACK_PALETTE[index % len(FALLBACK_PALETTE)]

    return {
        "id": slug,
        "title": meta["title"],
        "ageLabel": meta["ageLabel"],
        "ageFilter": meta.get("ageFilter") or slugify(meta["ageLabel"]),
        "shortDescription": meta["shortDescription"],
        "fullDescription": meta.get("fullDescription") or meta["shortDescription"],
        "themeColor": None if images else theme_color,
        "buyLink": meta.get("buyLink") or None,
        "images": images,
    }


def main() -> int:
    if not CONTENT_DIR.is_dir():
        print(f"ERROR: {CONTENT_DIR} does not exist -- nothing to generate.")
        return 1

    folders = sorted(p for p in CONTENT_DIR.iterdir() if p.is_dir())
    if not folders:
        print(f"WARNING: no book folders found in {CONTENT_DIR}; writing an empty catalog.")

    entries = []
    had_error = False
    for i, folder in enumerate(folders):
        try:
            entry = build_entry(folder, i)
            entries.append(entry)
            print(f"OK: {folder.name} -> {len(entry['images'])} image(s)")
        except Exception as e:
            had_error = True
            print(f"ERROR: skipping '{folder.name}': {e}")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nWrote {len(entries)} book(s) to {OUTPUT_PATH}")
    return 1 if had_error else 0


if __name__ == "__main__":
    sys.exit(main())
