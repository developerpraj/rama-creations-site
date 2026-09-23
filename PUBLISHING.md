# Publishing the Website -- Command Reference

Run every command from the repository root unless a step says otherwise.
This is a runbook: each phase lists the exact command(s), what they do, and
when to run them.

```text
Phase 0  One-time setup on a new machine
Phase 1  Add or update a book
Phase 2  Regenerate the catalog (data/books.json + assets/covers/)
Phase 3  Preview locally
Phase 4  Commit and push
Phase 5  GitHub Pages auto-deploy (no command needed -- it's automatic)
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

Run this any time after Phase 1, and again any time you want to confirm
what the live site will look like before pushing.

## Phase 3: Preview locally

```bash
cd rama-creations-site
python -m http.server 8000
```

Then open `http://localhost:8000/books.html` (or `/index.html`) in a
browser. What it does: serves the folder over `http://` so
`fetch("data/books.json")` works -- opening `books.html` directly via
`file://` will NOT load the catalog, since browsers block `fetch()` of
local files under `file://`. Stop the server with `Ctrl+C` when done.

## Phase 4: Commit and push

```bash
git add rama-creations-site
git commit -m "Update book catalog"
git push
```

What it does: pushes your `content/books/` changes (and, optionally, the
regenerated `data/books.json`/`assets/covers/` -- see Phase 5, which
regenerates them again automatically anyway) to the repo's default branch.

## Phase 5: GitHub Pages auto-deploy

No command to run -- `.github/workflows/deploy-site.yml` does this
automatically on every push to `main`:
1. Checks out the repo.
2. Installs `Pillow`.
3. Runs `python rama-creations-site/tools/generate_catalog.py` (same as
   Phase 2) so the deployed site always has a freshly regenerated catalog,
   even if you forgot to run Phase 2 locally.
4. Uploads `rama-creations-site/` as-is (no build step) and publishes it
   via GitHub Pages.

One-time repo setting required before this works: **Settings -> Pages ->
Source -> GitHub Actions**.

**Custom domain (theramacreations.com):** the repo already contains a
`rama-creations-site/CNAME` file with `theramacreations.com` in it, which
GitHub Pages reads automatically on deploy. Two things still need doing
once, outside this repo:
1. At your domain registrar/DNS provider, point the domain at GitHub Pages:
   an `A` record for the apex domain (`theramacreations.com`) to GitHub
   Pages' IPs (`185.199.108.153`, `.109.153`, `.110.153`, `.111.153`), plus
   a `CNAME` record for `www` pointing to `<username>.github.io` if you
   want `www.theramacreations.com` to work too.
2. In **Settings -> Pages**, confirm the custom domain shows
   `theramacreations.com` (GitHub picks this up from the `CNAME` file after
   the first deploy) and enable **Enforce HTTPS** once the certificate is
   issued (can take a few minutes to a few hours after DNS propagates).

If you want to trigger a deploy without pushing new commits (e.g. to
re-run after a Pages settings change), use the GitHub CLI:

```bash
gh workflow run deploy-site.yml
```

What it does: manually re-runs the same workflow from Phase 5 on demand.

## Phase 6: Verify the live site

```bash
gh run watch
```

What it does: streams the status of the most recent workflow run so you
can see the deploy finish (or catch an error) without refreshing the
Actions tab. Once it succeeds, your site is live at
`https://theramacreations.com/`.
