# Publishing the Website -- Command Reference

Run every command from the repository root unless a step says otherwise.
This is a runbook: each phase lists the exact command(s), what they do, and
when to run them.

```text
Phase 0  One-time setup on a new machine
Phase 1  Add or update a book
Phase 2  Regenerate the catalog (data/books.json + assets/covers/)
Phase 3  Preview locally
Phase 4  Commit and push to the pipeline repository
Phase 5  Copy the site to the website repository
Phase 6  Verify the live site
```

## Phase 0: One-time setup

Only needed once per machine, or after `requirements.txt` changes.

```bash
python -m pip install -r requirements.txt
```

What it does: installs `Pillow`, the only dependency
`tools/generate_catalog.py` needs (to resize cover images to JPEGs).

## Phase 1: Add or update a book

No command here -- this is a file-editing step. Create or edit
`rama-creations-site/content/books/<book-id>/book.json` (and an optional
`images/` subfolder). See the "Adding a book" section in
[README.md](README.md) for the exact `book.json` fields and image naming
convention. This step must happen *before* Phase 2, since the generator
only reads from `content/books/`.

## Phase 2: Regenerate the catalog

```bash
python rama-creations-site/tools/generate_catalog.py
```

What it does:
- Scans every folder in `rama-creations-site/content/books/`.
- Reads each folder's `book.json`, validates the required fields
  (`title`, `ageLabel`, `shortDescription`), and resizes any images in its
  `images/` subfolder to ~700px-wide JPEGs in `rama-creations-site/assets/covers/<book-id>/`.
- Writes the fully assembled `rama-creations-site/data/books.json` --
  this file is **generated**, never hand-edited.
- Prints one `OK: <book-id> -> N image(s)` line per folder, or an `ERROR:`
  line (and a non-zero exit code) if a folder's `book.json` is missing a
  required field.

**Known gap:** the script does not check for duplicate/near-duplicate
books (e.g. two folders with the same `title`) -- every folder in
`content/books/` becomes its own catalog entry, verbatim. If you're
testing with copied folders, delete them from `content/books/` before
Phase 4 and re-run this command to regenerate a clean `data/books.json`.

The deployment workflow does not run this generator. Run it locally after
changing book source data or images, then include its updated catalog and
cover assets in the site folder before publishing.

The same command also rebuilds the homepage "Review Sky": it turns the
screenshots in `content/reviews/` into `data/reviews.json` and
`assets/reviews/` (see README.md, "Adding review screenshots"). Commit those
generated files too.

## Phase 3: Preview locally

```bash
python rama-creations-site/tools/serve.py
```

Then open `http://localhost:8000/books.html` (or `/index.html`) in a
browser. What it does: serves the folder over `http://` so
`fetch("data/books.json")` works -- opening `books.html` directly via
`file://` will NOT load the catalog, since browsers block `fetch()` of
local files under `file://`. It is `python -m http.server` with caching
turned off, so a normal refresh shows your latest changes. Stop the server
with `Ctrl+C` when done.

## Phase 4: Commit and push to the pipeline repository

```bash
git add rama-creations-site
git commit -m "Update website"
git push
```

Push to the `main` branch. Include all intended website changes, and for
book updates include the generated `data/books.json` and
`assets/covers/` changes. Pushing does not regenerate these files for you.

## Phase 5: Copy the site to the website repository

No command is needed. The workflow at
`../.github/workflows/deploy-site.yml` runs automatically when a commit
affecting `rama-creations-site/**` is pushed to this repository's `main`
branch. It copies the entire `rama-creations-site/` folder as-is to the
`main` branch of `developerpraj/rama-creations-site`. It does not install
dependencies, regenerate the book catalog, or build the site.

The destination repository's GitHub Pages configuration serves its `main`
branch root, and the custom domain is `theramacreations.com`. There is no
manual-dispatch option for the copy workflow; a new push affecting the site
folder is required to run it.

## Phase 6: Verify the live site

```bash
gh run list --workflow deploy-site.yml --limit 5
gh run watch <run-id>
```

Run these commands from the pipeline repository. They confirm the site-copy
workflow succeeded; GitHub Pages then publishes the destination repository's
updated branch. Check <https://theramacreations.com/> after that Pages build
completes.
