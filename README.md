# The Rama Creations -- Marketing Website

Plain static HTML/CSS/JS marketing site (no build step, no framework). Lives
in this folder so it can sit alongside the rest of The Rama Creations'
production tooling in the same repo, without affecting anything else here.

```text
rama-creations-site/
  index.html            Home
  books.html            Book catalog -- data-driven, see below
  about.html            Studio story / values
  reviews.html          Every reader review (the full "Review Sky") -- see "Adding review screenshots"
  contact.html          Contact form -- client-side verified, submits to a Google Sheet
  content/books/<id>/   Drop a new book here (book.json + images/) -- see below
  content/reviews/      Drop reader-review screenshots here -- see "Adding review screenshots"
  tools/generate_catalog.py   Turns content/books/ into data/books.json + assets/covers/ (and runs generate_reviews.py)
  tools/generate_reviews.py   Turns content/reviews/ into data/reviews.json + assets/reviews/
  tools/serve.py        Local preview server that never lets the browser cache (use instead of http.server)
  data/books.json       Generated -- regenerate locally after changing book sources
  data/reviews.json     Generated -- the "Review Sky" (homepage preview + reviews.html) reads this
  css/styles.css        Shared styles (brand colors match the main repo's palette)
  css/reviews.css       Styles for the "Review Sky" (homepage section + reviews.html)
  js/main.js            Mobile nav toggle + reveals the "Reviews" links once reviews exist -- no framework, no build tooling
  js/books.js           Fetches data/books.json and renders the whole catalog
  js/reviews.js         Builds the "Review Sky" (constellations + viewer) from data/reviews.json
  js/themes.js          The color themes (9 palettes) + how each is applied; loaded in <head>
  js/theme-picker.js    The nav "Pick your color" button: plain page colors + the themes
  js/contact.js         Field verification + Google Apps Script submission (see below)
  assets/               Brand logos, supplied PNG home-screen/share icons, and book covers
  site.webmanifest      Home-screen app name and installable icon sizes
```

## Preview locally

No install needed beyond Pillow (`pip install Pillow`, already in this
repo's `requirements.txt`) -- just regenerate the catalog, then serve the
folder so relative links (and the `fetch("data/books.json")` the catalog
depends on) behave exactly like they will on GitHub Pages. Opening
`books.html` directly via `file://` will NOT work for the catalog, since
browsers block `fetch()` of local files under `file://` -- always use a
local server. `tools/serve.py` is `python -m http.server` plus a
`Cache-Control: no-store` header, so a normal refresh always shows your latest
scripts, styles and generated data (plain `http.server` lets the browser keep
stale copies, e.g. a new nav link that seems to be missing):

```bash
python rama-creations-site/tools/generate_catalog.py
python rama-creations-site/tools/serve.py
# then open http://localhost:8000
```

## Adding a book: drop a folder, push, done

This is the entire workflow -- no HTML/CSS/JS editing, and no manual JSON
editing either. `data/books.json` is **generated**, not hand-written.

1. Create `rama-creations-site/content/books/<your-book-id>/` (the folder
   name becomes the book's id -- use lowercase, hyphens, no spaces).
2. Inside it, add a `book.json`:
   ```json
   {
     "title": "The Book Title",
     "ageLabel": "Ages 6-10",
     "shortDescription": "One-line teaser shown on the card.",
     "fullDescription": "The longer text revealed by 'Show more'.",
     "buyLink": null
   }
   ```
   - `title`, `ageLabel`, `shortDescription` are required. Everything else
     is optional.
   - `fullDescription` -- omit it to make "Show more" not appear at all. The site safely renders paragraphs, bold/italic text, and ordered or unordered lists in this field; descriptions shipped from Studio can be formatted with its rich-text editor.
     (the card just shows `shortDescription` with no expand option).
   - `ageLabel` can be any text ("Ages 6-10", "Teens", "6+") -- the age
     filter dropdown's options are built from whatever values show up
     across all books, so a brand new age group just appears automatically.
     Two books with the exact same `ageLabel` share one filter bucket.
   - `themeColor` (hex) -- only used if there's no `images/` folder (see
     below); a color is auto-picked from the standard pastel palette if you
     leave it out.
   - `buyLink` -- omit or set to `null` for a disabled "Coming soon" button,
     or set it to a real (or Amazon search) URL for a live "Buy on Amazon"
     button.
3. Optionally add an `images/` subfolder next to `book.json` with any number
   of images (jpg/png/webp, any size -- they get auto-resized). Name them
   with a numeric prefix to control order, e.g. `01-front.jpg`,
   `02-back.jpg`, `03-full.jpg`. The first image
   becomes the card's thumbnail; all of them become quick-view carousel
   slides. Skip this folder entirely for a solid-color placeholder card
   instead.
4. Run `python rama-creations-site/tools/generate_catalog.py` to preview
   locally (see above), then commit and push the source folder and generated
   catalog/assets together. The publishing workflow copies
   `rama-creations-site/` to the separate
   `developerpraj/rama-creations-site` repository; it does not regenerate the
   catalog. Drop 6 book folders, regenerate once, and all 6 appear.



## Adding review screenshots: drop images, run, push

The site has a "Review Sky": every screenshot becomes a star,
stars are grouped into constellations, and clicking one opens the whole
screenshot in a full-screen viewer. Screenshots can be any size or shape.

- **`reviews.html`** shows every review, however many there are (a long list
  just becomes more constellations; repeated shapes get a numeral, e.g. "The
  Big Dipper II").
- **The homepage** shows a preview: the first 12 reviews, then a "See all N
  reviews" button. Because order follows the file names, name your best
  screenshots `01-...`, `02-...` to choose what the homepage shows.
- **With no screenshots** the homepage section and the "Reviews" nav/footer
  links are hidden on the live site, so visitors never meet an empty page. On
  your own computer they stay visible with a how-to note.
- **Colors:** the section has none of its own. The cards, text, star rings and
  viewer all use the page's colors, so every theme from the palette button
  recolors it automatically (`tests/test_site_themes.py` checks it stays readable).

1. Put the screenshots (png/jpg/webp) in `rama-creations-site/content/reviews/`.
   They show in filename order, so `01-...`, `02-...` controls the order. A
   name starting with `_` is skipped -- a quick way to hide one.
2. Run `python rama-creations-site/tools/generate_catalog.py` (it also builds
   the reviews). This resizes each screenshot, strips metadata, and writes
   `data/reviews.json` + `assets/reviews/`. Stale files are removed for you.
3. Preview (see above), then commit the generated files together with the
   screenshots and push. As with books, the publishing workflow only copies
   the folder; it does not run the generator.

Optional `content/reviews/captions.json` -- all fields are optional:

```json
{
  "01-amazon-habits.png": {
    "alt": "Five-star review: 'My son asks for this book every night.'",
    "book": "habits",
    "focus": "top"
  }
}
```

- `alt` -- the screenshot's text for screen readers; worth adding.
- `book` -- a folder name under `content/books/`; the viewer then shows
  "Review of <book title>".
- `focus` -- which part of the screenshot the round star shows: `"top"`
  (default is the top-left corner), `"bottom"`, `"left"`, `"right"`,
  `"center"`, or `[x, y]` with each between 0 and 1.

Screenshots show whatever is in them, so crop or blur names and photos you
would rather not publish. The originals in `content/reviews/` are deployed
alongside the generated copies.

## Color themes: the nav palette button

The palette button in the nav offers the plain pastel page colors and nine
full themes (Midnight Amethyst, Crimson Forest, Lemon Lavender, Mocha & Gold,
Modern Minimalist, High-Contrast Tech, Earthy & Organic, Bold & Energetic,
Luxury & Elegant). Each theme applies the 60-30-10 rule: the dominant color is
the page, the secondary color is the cards/header/footer, and the accent is
the buttons and key details -- the little bar in each theme row shows exactly
that split. The choice is remembered across pages; a plain page color and a
theme never apply together, and the reset button clears both.

To add a theme, add one entry to `THEMES` in `js/themes.js`: its `palette`
(color names + hex), the three roles `bg` / `panel` / `accent`, the body text
`ink`, and `accent2` (links and badges), plus `mode: "dark"` or `"light"`.
Everything else (muted text, borders, text on buttons, link colors) is derived
and nudged until it is readable, and
`python -m unittest tests.test_site_themes` checks every theme on every page.

`contact.html` already fully verifies every field in the browser before
sending anything (`js/contact.js`):
- **Name**: required, 2-120 characters.
- **Email**: required, must match a real `name@domain.tld` shape.
- **Message**: required, 10-4000 characters.
- A hidden honeypot field silently drops obvious bot submissions.

It's wired to submit to a **Google Apps Script Web App** bound to a Google
Sheet. The visible notice on the form tells visitors that their name,
email, and message are sent to this service and stored in the Sheet so the
studio can respond. The endpoint is already configured. If you need to set
up or replace the Google Apps Script:

1. Open the Sheet -> **Extensions -> Apps Script**.
2. Replace the default code with:
   ```javascript
   function doPost(e) {
     const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
     sheet.appendRow([
       e.parameter.receivedAt || new Date().toISOString(),
       e.parameter.name || "",
       e.parameter.email || "",
       e.parameter.message || "",
     ]);
     return ContentService.createTextOutput("OK");
   }
   ```
3. **Deploy -> New deployment -> type "Web app"** -> Execute as **Me** ->
   Who has access: **Anyone** -> **Deploy**. Copy the `.../exec` URL it gives you.
4. Paste that URL into `js/contact.js`'s `CONFIG.endpoint`.

Until step 4 is done, the form still validates every field correctly but
shows a clear "not connected yet" message instead of silently failing or
pretending to succeed.

## Publishing to the live website

The website source lives in this folder in the pipeline repository, while
GitHub Pages serves the root of the separate
[`developerpraj/rama-creations-site`](https://github.com/developerpraj/rama-creations-site)
repository from its `main` branch. The workflow at
[`../.github/workflows/deploy-site.yml`](../.github/workflows/deploy-site.yml)
copies this folder to that repository when a commit affecting
`rama-creations-site/**` is pushed to this repository's `main` branch.

Before pushing book-content changes, run
`python rama-creations-site/tools/generate_catalog.py` and include the
updated `data/books.json` and generated cover assets. The copy workflow
does not run the generator or build the site; it transfers the folder as-is.
After the workflow succeeds, GitHub Pages publishes the destination
repository's updated `main` branch at <https://theramacreations.com/>.

This workflow only runs on a push to `main` that changes something under
`rama-creations-site/`; it has no manual-dispatch option. Check its status in
the pipeline repository's Actions tab, then verify the live site after the
destination repository's Pages build completes.

No other file in this repository was changed to add this -- the Python
production tooling (`book_production_tools/`, `universal_kdp/`,
`cover_projects/`, `rama.py`, etc.) is completely unaffected.
