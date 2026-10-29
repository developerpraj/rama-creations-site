#!/usr/bin/env python3
"""
Turns the review screenshots dropped into rama-creations-site/content/reviews/
into the web-ready files the homepage's "Review Sky" section reads.

    content/reviews/*.png|jpg|jpeg|webp     your screenshots, any size or shape
    content/reviews/captions.json           optional: alt text, book tag, crop focus
              |
              v
    assets/reviews/<name>-<hash>.webp       full copy (max 1400px wide, metadata stripped)
    assets/reviews/<name>-<hash>-t.webp     small crop used for the star thumbnails
    data/reviews.json                       the list js/reviews.js fetches

Everything in assets/reviews/ is generated -- stale files are removed on every
run, so deleting a screenshot from content/reviews/ really removes it from the
site once you regenerate and commit.

Screenshots are shown in natural filename order (name them 01-..., 02-... to
control it). A name starting with "_" or "." is skipped, which is a quick way
to hide a screenshot without deleting it.

captions.json (optional) maps a file name to any of:

    {
      "01-amazon-habits.png": {
        "alt": "Five-star review: 'My son asks for this book every night.'",
        "book": "habits",
        "focus": "top"
      }
    }

    alt     text read aloud by screen readers (the screenshot's own words)
    book    a folder name under content/books/ -- shows "Review of <title>"
    focus   which part of the screenshot the round star thumbnail shows:
            "top" (default is the top-left corner), "bottom", "left",
            "right", "center", or [x, y] with each between 0 and 1

Usage (also runs as the last step of generate_catalog.py):
    python rama-creations-site/tools/generate_reviews.py
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps, features

SITE_ROOT = Path(__file__).resolve().parent.parent

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
FULL_MAX_WIDTH = 1400
FULL_MAX_HEIGHT = 12000
THUMB_SHORT_SIDE = 384
THUMB_MAX_ASPECT = 1.25
QUALITY = 86
DEFAULT_ALT = "Reader review screenshot"
DEFAULT_FOCUS = (0.0, 0.0)
# Bump when the processing above changes so existing outputs are rebuilt.
PIPELINE_VERSION = "1"

OUTPUT_EXT = ".webp" if features.check("webp") else ".jpg"

_FOCUS_WORDS = {
    "top": (0.5, 0.0),
    "bottom": (0.5, 1.0),
    "left": (0.0, 0.5),
    "right": (1.0, 0.5),
    "center": (0.5, 0.5),
    "centre": (0.5, 0.5),
    "top-left": (0.0, 0.0),
}


def natural_key(name: str) -> list:
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", name)]


def slugify(stem: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", stem.lower()).strip("-")
    return cleaned[:48].strip("-") or "review"


def parse_focus(value) -> tuple[float, float]:
    if isinstance(value, str) and value.strip().lower() in _FOCUS_WORDS:
        return _FOCUS_WORDS[value.strip().lower()]
    if (
        isinstance(value, (list, tuple))
        and len(value) == 2
        and all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in value)
    ):
        return (min(1.0, max(0.0, float(value[0]))), min(1.0, max(0.0, float(value[1]))))
    return DEFAULT_FOCUS


def load_captions(source_dir: Path) -> dict:
    path = source_dir / "captions.json"
    if not path.is_file():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError) as exc:
        print(f"WARNING: ignoring {path.name}: {exc}")
        return {}
    if not isinstance(raw, dict):
        print(f"WARNING: ignoring {path.name}: expected a JSON object keyed by file name")
        return {}
    return {str(name).lower(): meta for name, meta in raw.items() if isinstance(meta, dict)}


def book_title(site_root: Path, book_id: str) -> str | None:
    meta_path = site_root / "content" / "books" / book_id / "book.json"
    try:
        title = json.loads(meta_path.read_text(encoding="utf-8-sig")).get("title")
    except (OSError, ValueError, AttributeError):
        return None
    return str(title) if title else None


def flatten(img: Image.Image) -> Image.Image:
    """RGB copy; transparent areas become white, like a screenshot on a page."""
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        rgba = img.convert("RGBA")
        backdrop = Image.new("RGB", rgba.size, (255, 255, 255))
        backdrop.paste(rgba, mask=rgba.getchannel("A"))
        return backdrop
    return img.convert("RGB")


def make_full(img: Image.Image) -> Image.Image:
    width, height = img.size
    scale = min(1.0, FULL_MAX_WIDTH / width, FULL_MAX_HEIGHT / height)
    if scale < 1.0:
        img = img.resize((max(1, round(width * scale)), max(1, round(height * scale))), Image.Resampling.LANCZOS)
    return img


def make_thumb(img: Image.Image, focus: tuple[float, float]) -> Image.Image:
    """A near-square crop: short side ~384px, long side trimmed around `focus`."""
    width, height = img.size
    scale = min(1.0, THUMB_SHORT_SIDE / min(width, height))
    if scale < 1.0:
        width, height = max(1, round(width * scale)), max(1, round(height * scale))
        img = img.resize((width, height), Image.Resampling.LANCZOS)
    limit = max(1, round(min(width, height) * THUMB_MAX_ASPECT))
    if height > limit:
        top = round(focus[1] * (height - limit))
        img = img.crop((0, top, width, top + limit))
    elif width > limit:
        left = round(focus[0] * (width - limit))
        img = img.crop((left, 0, left + limit, height))
    return img


def save_image(img: Image.Image, path: Path) -> None:
    if OUTPUT_EXT == ".webp":
        img.save(path, "WEBP", quality=QUALITY, method=6)
    else:
        img.save(path, "JPEG", quality=QUALITY, optimize=True)


def file_digest(src: Path, focus: tuple[float, float]) -> str:
    sha = hashlib.sha1(PIPELINE_VERSION.encode())
    sha.update(src.read_bytes())
    sha.update(repr(focus).encode())
    return sha.hexdigest()[:8]


def process_review(src: Path, out_dir: Path, slug: str, meta: dict) -> dict:
    focus = parse_focus(meta.get("focus"))
    digest = file_digest(src, focus)
    full_path = out_dir / f"{slug}-{digest}{OUTPUT_EXT}"
    thumb_path = out_dir / f"{slug}-{digest}-t{OUTPUT_EXT}"

    if full_path.is_file() and thumb_path.is_file():
        with Image.open(full_path) as full_img, Image.open(thumb_path) as thumb_img:
            full_size, thumb_size = full_img.size, thumb_img.size
    else:
        with Image.open(src) as opened:
            opened.load()
            img = flatten(ImageOps.exif_transpose(opened))
        out_dir.mkdir(parents=True, exist_ok=True)
        full, thumb = make_full(img), make_thumb(img, focus)
        save_image(full, full_path)
        save_image(thumb, thumb_path)
        full_size, thumb_size = full.size, thumb.size

    return {
        "full": {"src": f"assets/reviews/{full_path.name}", "w": full_size[0], "h": full_size[1]},
        "thumb": {"src": f"assets/reviews/{thumb_path.name}", "w": thumb_size[0], "h": thumb_size[1]},
        "focus": [round(focus[0], 3), round(focus[1], 3)],
    }


def prune_outputs(out_dir: Path, keep: set[str]) -> list[str]:
    removed = []
    if out_dir.is_dir():
        for path in sorted(out_dir.iterdir()):
            if path.is_file() and path.suffix.lower() in {".webp", ".jpg"} and path.name not in keep:
                path.unlink()
                removed.append(path.name)
    return removed


def generate(site_root: Path = SITE_ROOT) -> tuple[list[dict], bool]:
    source_dir = site_root / "content" / "reviews"
    out_dir = site_root / "assets" / "reviews"
    data_path = site_root / "data" / "reviews.json"
    source_dir.mkdir(parents=True, exist_ok=True)

    captions = load_captions(source_dir)
    sources = sorted(
        (
            p
            for p in source_dir.iterdir()
            if p.is_file()
            and p.suffix.lower() in IMAGE_EXTENSIONS
            and not p.name.startswith((".", "_"))
        ),
        key=lambda p: natural_key(p.name),
    )

    known = {p.name.lower() for p in sources}
    for name in captions:
        if name not in known:
            print(f"WARNING: captions.json mentions '{name}' but there is no such screenshot")

    entries: list[dict] = []
    keep: set[str] = set()
    used_ids: set[str] = set()
    had_error = False
    for src in sources:
        meta = captions.get(src.name.lower(), {})
        base = slugify(src.stem)
        slug, n = base, 2
        while slug in used_ids:
            slug, n = f"{base}-{n}", n + 1
        try:
            entry = {"id": slug, "alt": str(meta.get("alt") or DEFAULT_ALT).strip()[:300]}
            entry.update(process_review(src, out_dir, slug, meta))
        except Exception as exc:  # noqa: BLE001 -- one unreadable file must not stop the rest
            had_error = True
            print(f"ERROR: skipping '{src.name}': {exc}")
            continue
        used_ids.add(slug)

        book = str(meta.get("book") or "").strip()
        if book:
            title = book_title(site_root, book)
            if title:
                entry["book"], entry["bookTitle"] = book, title
            else:
                print(f"WARNING: '{src.name}' names book '{book}' but content/books/{book}/book.json has no title")

        keep.update(Path(entry[kind]["src"]).name for kind in ("full", "thumb"))
        entries.append(entry)
        print(f"OK: review '{src.name}' -> {entry['full']['w']}x{entry['full']['h']} px")

    for name in prune_outputs(out_dir, keep):
        print(f"Removed stale generated file: assets/reviews/{name}")

    data_path.parent.mkdir(parents=True, exist_ok=True)
    data_path.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return entries, had_error


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build data/reviews.json from content/reviews/ screenshots.")
    parser.add_argument("--site-root", type=Path, default=SITE_ROOT, help="site folder (default: this script's site)")
    args = parser.parse_args(argv)

    entries, had_error = generate(args.site_root.resolve())
    print(f"Wrote {len(entries)} review(s) to {args.site_root.resolve() / 'data' / 'reviews.json'}")
    return 1 if had_error else 0


if __name__ == "__main__":
    sys.exit(main())
