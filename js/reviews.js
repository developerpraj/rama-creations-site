// "The Review Sky" -- the reader-review constellations. The homepage shows a
// preview (the first data-reviews-limit reviews, then a "See all" link) and
// reviews.html (data-reviews-mode="page") shows every one of them.
//
// Every screenshot in content/reviews/ (built into data/reviews.json by
// tools/generate_catalog.py) becomes a star. Stars are grouped into real
// constellations -- Cassiopeia, the Big Dipper, the Southern Cross -- and
// the lines between them draw themselves, dot-to-dot style, as the section
// scrolls into view. Hover a star to zoom it, click to read the whole
// screenshot in the "telescope" viewer. Screenshots of any size or shape
// work: stars show a round crop, the viewer shows the full image.
//
// Nothing here needs editing to add a review: drop the image in
// content/reviews/, run the generator, commit. With no reviews the homepage
// section stays hidden on the live site (and shows a how-to note locally);
// the reviews page shows a friendly "first star" note instead.
(() => {
  "use strict";

  const DATA_URL = "data/reviews.json";
  const MAX_STARS = 7;
  // The page's own accent colors, so every theme from the nav picker recolors the stars.
  const GLOWS = ["var(--violet)", "var(--amber)", "var(--berry)", "var(--mint)", "var(--sky)"];
  const SVG_NS = "http://www.w3.org/2000/svg";
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Hand-placed shapes. nodes are [x, y] fractions of the panel (the panel's
  // aspect ratio is `aspect`, width / height); `k` is the star diameter as a
  // fraction of the panel width, chosen so neighbours never touch; edges are
  // the lines drawn between node indexes. Node order is the dot-to-dot order.
  const TEMPLATES = {
    1: [
      { id: "polaris", name: "Polaris", note: "The North Star \u2014 our very first kind word.", aspect: 1.7, k: 0.24, nodes: [[0.5, 0.5]], edges: [] },
    ],
    2: [
      { id: "gemini", name: "Gemini", note: "Twin stars, double the cheer.", aspect: 2.2, k: 0.2, nodes: [[0.28, 0.42], [0.72, 0.58]], edges: [[0, 1]] },
    ],
    3: [
      { id: "summer-triangle", name: "The Summer Triangle", note: "Three cheers from three stars.", aspect: 1.4, k: 0.2, nodes: [[0.5, 0.18], [0.16, 0.8], [0.84, 0.74]], edges: [[0, 1], [1, 2], [2, 0]] },
    ],
    4: [
      { id: "crux", name: "Crux, the Southern Cross", note: "Four bright stars to steer by.", aspect: 1, k: 0.2, nodes: [[0.5, 0.14], [0.84, 0.42], [0.5, 0.86], [0.16, 0.56]], edges: [[0, 2], [3, 1]] },
      { id: "great-square", name: "The Great Square", note: "Four corners of good cheer.", aspect: 1.2, k: 0.2, nodes: [[0.2, 0.2], [0.8, 0.28], [0.74, 0.82], [0.14, 0.74]], edges: [[0, 1], [1, 2], [2, 3], [3, 0]] },
    ],
    5: [
      { id: "cassiopeia", name: "Cassiopeia", note: "W is for wonderful.", aspect: 2, k: 0.17, nodes: [[0.1, 0.3], [0.3, 0.76], [0.5, 0.34], [0.7, 0.78], [0.9, 0.26]], edges: [[0, 1], [1, 2], [2, 3], [3, 4]] },
      { id: "cygnus", name: "Cygnus, the Swan", note: "Wings full of kind words.", aspect: 1.2, k: 0.17, nodes: [[0.5, 0.14], [0.5, 0.5], [0.5, 0.86], [0.16, 0.42], [0.84, 0.58]], edges: [[0, 1], [1, 2], [3, 1], [1, 4]] },
      { id: "cepheus", name: "Cepheus, the King", note: "A house full of happy readers.", aspect: 1.2, k: 0.17, nodes: [[0.5, 0.14], [0.86, 0.4], [0.74, 0.86], [0.26, 0.86], [0.14, 0.4]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]] },
    ],
    6: [
      { id: "leo", name: "Leo\u2019s Sickle", note: "A roar of applause.", aspect: 1.2, k: 0.17, nodes: [[0.22, 0.86], [0.32, 0.62], [0.24, 0.38], [0.38, 0.16], [0.66, 0.14], [0.84, 0.38]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]] },
      { id: "scorpius", name: "Scorpius, the Scorpion", note: "A tail full of cheer.", aspect: 1.4, k: 0.16, nodes: [[0.12, 0.18], [0.22, 0.42], [0.38, 0.62], [0.58, 0.78], [0.8, 0.68], [0.88, 0.4]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]] },
    ],
    7: [
      { id: "big-dipper", name: "The Big Dipper", note: "Scoop up some kind words.", aspect: 1.7, k: 0.135, nodes: [[0.09, 0.2], [0.26, 0.38], [0.43, 0.46], [0.6, 0.5], [0.8, 0.22], [0.9, 0.66], [0.66, 0.8]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
      { id: "corona-borealis", name: "Corona Borealis", note: "A crown of kind words.", aspect: 1.3, k: 0.15, nodes: [[0.1, 0.22], [0.154, 0.495], [0.3, 0.696], [0.5, 0.77], [0.7, 0.696], [0.846, 0.495], [0.9, 0.22]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]] },
    ],
  };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, value));
    return node;
  }

  // n reviews -> constellation sizes, as even as possible, each 1..MAX_STARS
  // (and 4+ once there are 8 or more, so a panel never looks sparse).
  function partition(n) {
    if (n <= 0) return [];
    const groups = Math.ceil(n / MAX_STARS);
    const base = Math.floor(n / groups);
    const extra = n % groups;
    return Array.from({ length: groups }, (_, i) => base + (i < extra ? 1 : 0));
  }

  function roman(n) {
    let out = "";
    [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]].forEach(([value, symbol]) => {
      while (n >= value) {
        out += symbol;
        n -= value;
      }
    });
    return out;
  }

  function buildModel(reviews) {
    const used = {};
    const seenNames = {};
    const constellations = [];
    const flat = [];
    let cursor = 0;
    partition(reviews.length).forEach((size) => {
      const pool = TEMPLATES[size];
      used[size] = (used[size] === undefined ? -1 : used[size]) + 1;
      const base = pool[used[size] % pool.length];
      // A long page reuses shapes: "The Big Dipper", then "The Big Dipper II", ...
      seenNames[base.id] = (seenNames[base.id] || 0) + 1;
      const template = seenNames[base.id] === 1 ? base : { ...base, name: `${base.name} ${roman(seenNames[base.id])}` };
      const items = [];
      for (let local = 0; local < size; local += 1) {
        const item = { review: reviews[cursor], index: cursor, local, constellation: constellations.length, starEl: null };
        items.push(item);
        flat.push(item);
        cursor += 1;
      }
      constellations.push({ template, items });
    });
    return { constellations, flat };
  }

  function isValidReview(review) {
    const size = (part) => part && typeof part.src === "string" && Number(part.w) > 0 && Number(part.h) > 0;
    return Boolean(review) && size(review.full) && size(review.thumb);
  }

  function isLocalPreview() {
    return window.location.protocol === "file:" || ["localhost", "127.0.0.1", "[::1]", "::1"].includes(window.location.hostname);
  }

  function percent(value) {
    return `${(value * 100).toFixed(2)}%`;
  }

  // ---- Constellation panels ---------------------------------------------

  function buildLines(template) {
    const height = 100 / template.aspect;
    // The viewBox has the same ratio as the panel, so nothing is distorted.
    const svg = svgEl("svg", { class: "const-lines", viewBox: `0 0 100 ${height.toFixed(3)}`, preserveAspectRatio: "none", "aria-hidden": "true" });
    template.edges.forEach(([from, to], edge) => {
      const [ax, ay] = template.nodes[from];
      const [bx, by] = template.nodes[to];
      const d = `M${(ax * 100).toFixed(2)} ${(ay * height).toFixed(2)}L${(bx * 100).toFixed(2)} ${(by * height).toFixed(2)}`;
      svg.appendChild(svgEl("path", { class: "edge-dots", d }));
      const glow = svgEl("path", { class: "edge-glow", d, pathLength: "1" });
      glow.style.setProperty("--e", edge);
      svg.appendChild(glow);
    });
    return svg;
  }

  function buildStar(item, template, total, ghost) {
    const [x, y] = template.nodes[item.local];
    const star = el(ghost ? "div" : "button", ghost ? "star star--ghost" : "star");
    star.style.setProperty("--x", percent(x));
    star.style.setProperty("--y", percent(y));
    star.style.setProperty("--i", item.local);
    star.style.setProperty("--glow", GLOWS[item.index % GLOWS.length]);

    const face = el("span", "star-face");
    if (!ghost) {
      star.type = "button";
      star.setAttribute("aria-label", `Read review ${item.index + 1} of ${total}, a star in ${template.name}`);
      const { review } = item;
      const image = new Image();
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      image.src = review.thumb.src;
      const [fx, fy] = Array.isArray(review.focus) ? review.focus : [0, 0];
      image.style.objectPosition = `${Number(fx) * 100}% ${Number(fy) * 100}%`;
      image.addEventListener("error", () => star.classList.add("star--missing"));
      face.appendChild(image);
    }
    star.append(face, el("span", "star-num", String(item.local + 1)));
    star.querySelector(".star-num").setAttribute("aria-hidden", "true");
    return star;
  }

  function buildConstellation(constellation, total, ghost = false) {
    const { template, items } = constellation;
    const panel = el("article", "const");
    const head = el("header", "const-head");
    head.append(el("h3", "const-name", template.name), el("p", "const-note", template.note));

    const stage = el("div", "const-stage");
    stage.style.setProperty("--aspect", template.aspect);
    stage.style.setProperty("--k", template.k);
    stage.appendChild(buildLines(template));
    items.forEach((item) => {
      item.starEl = buildStar(item, template, total, ghost);
      stage.appendChild(item.starEl);
    });

    panel.append(head, stage);
    return panel;
  }

  // Panels "light up" (stars pop in, lines draw) the first time they scroll into view.
  function lightUp(panels) {
    if (!("IntersectionObserver" in window) || motionQuery.matches) {
      panels.forEach((panel) => panel.classList.add("is-lit"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-lit");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.3 },
    );
    panels.forEach((panel) => observer.observe(panel));
  }

  // ---- "Make a wish" shooting star -----------------------------------------

  // Calls `done` once the page has stopped scrolling (or after a short cap).
  function afterScroll(done) {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.removeEventListener("scrollend", finish);
      done();
    };
    window.addEventListener("scrollend", finish, { once: true });
    window.setTimeout(finish, 1100);
  }

  function shootAt(target, done) {
    const rect = target.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = -380;
    const dy = 290;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const meteor = el("div", "wish-meteor");
    meteor.setAttribute("aria-hidden", "true");
    document.body.appendChild(meteor);
    // transform-origin is the bright head, so the head lands on the star.
    const at = (x, y) => `translate(${x - 120}px, ${y - 1}px) rotate(${angle}deg)`;
    const flight = meteor.animate(
      [
        { transform: at(cx - dx, cy - dy), opacity: 0 },
        { transform: at(cx - dx * 0.85, cy - dy * 0.85), opacity: 1, offset: 0.12 },
        { transform: at(cx, cy), opacity: 1, offset: 0.9 },
        { transform: at(cx, cy), opacity: 0 },
      ],
      { duration: 780, easing: "cubic-bezier(.35,.1,.25,1)" },
    );
    flight.addEventListener("finish", () => {
      meteor.remove();
      done();
    });
  }

  // ---- The telescope viewer ------------------------------------------------

  function createScope(model) {
    const { flat, constellations } = model;
    const seen = new Set();
    const maps = new Map();
    let dialog = null;
    let current = 0;
    let shownConstellation = -1;
    let pointerStart = null;
    const refs = {};

    function ensureDialog() {
      if (dialog) return;
      dialog = el("dialog", "scope");
      dialog.setAttribute("aria-label", "Reader review");
      dialog.innerHTML =
        '<header class="scope-top">' +
        '<div class="scope-map" role="group" aria-label="This constellation"></div>' +
        '<div class="scope-title"><p class="scope-kicker"></p><p class="scope-book" hidden></p></div>' +
        '<button type="button" class="scope-close" aria-label="Close the viewer">&times;</button>' +
        "</header>" +
        '<div class="scope-stage">' +
        '<div class="scope-scroll" tabindex="0" autofocus aria-label="Review screenshot"><img class="scope-img" alt="" /></div>' +
        '<p class="scope-error" hidden>This screenshot couldn\u2019t be loaded.</p>' +
        "</div>" +
        '<footer class="scope-foot">' +
        '<button type="button" class="scope-nav scope-prev" aria-label="Previous review">&lsaquo;</button>' +
        '<div class="scope-meta"><p class="scope-count"></p>' +
        '<p class="scope-hint" aria-hidden="true">\u2190 \u2192 travel between stars &middot; Esc to close</p></div>' +
        '<button type="button" class="scope-nav scope-next" aria-label="Next review">&rsaquo;</button>' +
        "</footer>";
      refs.map = dialog.querySelector(".scope-map");
      refs.kicker = dialog.querySelector(".scope-kicker");
      refs.book = dialog.querySelector(".scope-book");
      refs.scroll = dialog.querySelector(".scope-scroll");
      refs.img = dialog.querySelector(".scope-img");
      refs.error = dialog.querySelector(".scope-error");
      refs.count = dialog.querySelector(".scope-count");
      refs.stage = dialog.querySelector(".scope-stage");

      dialog.querySelector(".scope-close").addEventListener("click", () => dialog.close());
      dialog.querySelector(".scope-prev").addEventListener("click", () => show(current - 1));
      dialog.querySelector(".scope-next").addEventListener("click", () => show(current + 1));
      refs.img.addEventListener("error", () => {
        refs.error.hidden = false;
        refs.scroll.hidden = true;
      });
      refs.img.addEventListener("load", () => refs.img.classList.add("is-in"));

      dialog.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          show(current + 1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          show(current - 1);
        } else if (event.key === "Home" && event.target === refs.scroll) {
          event.preventDefault();
          show(0);
        } else if (event.key === "End" && event.target === refs.scroll) {
          event.preventDefault();
          show(flat.length - 1);
        }
      });
      // A click on the empty space around the screenshot closes the viewer.
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog || event.target === refs.stage) dialog.close();
      });
      refs.stage.addEventListener("pointerdown", (event) => {
        pointerStart = event.pointerType === "mouse" ? null : { x: event.clientX, y: event.clientY };
      });
      refs.stage.addEventListener("pointerup", (event) => {
        if (!pointerStart) return;
        const dx = event.clientX - pointerStart.x;
        const dy = event.clientY - pointerStart.y;
        pointerStart = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
      });
      refs.stage.addEventListener("pointercancel", () => {
        pointerStart = null;
      });

      dialog.addEventListener("close", () => {
        document.documentElement.classList.remove("scope-open");
        const star = flat[current] && flat[current].starEl;
        if (star) star.focus();
      });
      window.addEventListener("resize", () => {
        if (dialog.open) sizeImage(flat[current].review);
      });
      document.body.appendChild(dialog);
    }

    // The mini constellation map in the corner: where you are, tap to hop.
    function mapFor(constellationIndex) {
      if (maps.has(constellationIndex)) return maps.get(constellationIndex);
      const { template, items } = constellations[constellationIndex];
      const wrap = el("div", "map");
      wrap.style.setProperty("--aspect", template.aspect);
      const height = 100 / template.aspect;
      const svg = svgEl("svg", { viewBox: `0 0 100 ${height.toFixed(3)}`, preserveAspectRatio: "none", "aria-hidden": "true" });
      template.edges.forEach(([from, to]) => {
        const [ax, ay] = template.nodes[from];
        const [bx, by] = template.nodes[to];
        svg.appendChild(svgEl("path", { d: `M${(ax * 100).toFixed(2)} ${(ay * height).toFixed(2)}L${(bx * 100).toFixed(2)} ${(by * height).toFixed(2)}` }));
      });
      wrap.appendChild(svg);
      items.forEach((item) => {
        const [x, y] = template.nodes[item.local];
        const dot = el("button", "map-dot");
        dot.type = "button";
        dot.style.left = percent(x);
        dot.style.top = percent(y);
        dot.setAttribute("aria-label", `Go to star ${item.local + 1} of ${items.length}`);
        dot.addEventListener("click", () => show(item.index));
        wrap.appendChild(dot);
      });
      maps.set(constellationIndex, wrap);
      return wrap;
    }

    // Wide enough to read, short enough to fit when that stays readable;
    // otherwise readable width + vertical scroll for tall screenshots.
    // Small screenshots are enlarged a little, never past 1.6x.
    function sizeImage(review) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const narrow = vw < 700;
      const maxWidth = Math.max(240, Math.min(960, vw - (narrow ? 24 : 200)));
      const stageHeight = Math.max(200, vh - (narrow ? 200 : 230));
      const minReadable = Math.min(maxWidth, narrow ? 360 : 520);
      const ratio = review.full.h / review.full.w;
      let width = Math.min(maxWidth, Math.max(minReadable, review.full.w / 1.5));
      if (ratio > 1) {
        const fit = stageHeight / ratio;
        width = fit >= minReadable ? Math.min(width, fit) : minReadable;
      }
      width = Math.min(width, Math.max(review.full.w * 1.6, 240));
      refs.img.style.width = `${Math.round(width)}px`;
    }

    function show(index) {
      current = (index + flat.length) % flat.length;
      const item = flat[current];
      const { review } = item;
      const { template, items } = constellations[item.constellation];

      seen.add(current);
      item.starEl.classList.add("is-read");

      refs.error.hidden = true;
      refs.scroll.hidden = false;
      refs.img.classList.remove("is-in");
      sizeImage(review);
      refs.img.alt = review.alt || "Reader review screenshot";
      refs.img.src = review.full.src;
      refs.scroll.scrollTop = 0;

      refs.kicker.textContent = `${template.name} \u00B7 star ${item.local + 1} of ${items.length}`;
      refs.count.textContent = `Review ${current + 1} of ${flat.length}`;
      if (review.bookTitle) {
        refs.book.textContent = `Review of ${review.bookTitle}`;
        refs.book.hidden = false;
      } else {
        refs.book.hidden = true;
      }

      if (shownConstellation !== item.constellation) {
        refs.map.textContent = "";
        refs.map.appendChild(mapFor(item.constellation));
        shownConstellation = item.constellation;
      }
      mapFor(item.constellation).querySelectorAll(".map-dot").forEach((dot, i) => {
        const entry = items[i];
        dot.classList.toggle("is-active", i === item.local);
        dot.classList.toggle("is-read", seen.has(entry.index));
        if (i === item.local) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });

      [current + 1, current - 1].forEach((neighbour) => {
        new Image().src = flat[(neighbour + flat.length) % flat.length].review.full.src;
      });
    }

    function open(index) {
      ensureDialog();
      document.documentElement.classList.add("scope-open");
      dialog.showModal();
      show(index);
      refs.scroll.focus({ preventScroll: true });
    }

    return { open };
  }

  // ---- Assembly ---------------------------------------------------------------

  // `limit` > 0 shows only the first `limit` reviews (the homepage preview).
  function mount(root, all, limit) {
    const reviews = limit > 0 ? all.slice(0, limit) : all;
    const model = buildModel(reviews);
    const scope = createScope(model);
    root.textContent = "";

    const wish = el("button", "sky-wish", "\u2728 Make a wish");
    wish.type = "button";
    wish.setAttribute("aria-label", "Open a random review");
    let lastWish = -1;
    wish.addEventListener("click", () => {
      let pick = Math.floor(Math.random() * model.flat.length);
      if (model.flat.length > 1 && pick === lastWish) pick = (pick + 1) % model.flat.length;
      lastWish = pick;
      const { starEl } = model.flat[pick];
      if (motionQuery.matches) {
        scope.open(pick);
        return;
      }
      const box = starEl.getBoundingClientRect();
      const inView = box.top > 90 && box.bottom < window.innerHeight - 90;
      const launch = () => shootAt(starEl, () => scope.open(pick));
      if (inView) {
        launch();
      } else if (Math.abs(box.top) > window.innerHeight * 2.5) {
        // Far away on a long page: jump there instead of a long smooth scroll.
        starEl.scrollIntoView({ block: "center", behavior: "auto" });
        window.requestAnimationFrame(launch);
      } else {
        starEl.scrollIntoView({ block: "center", behavior: "smooth" });
        afterScroll(launch);
      }
    });

    const bar = el("div", "sky-bar");
    bar.append(el("p", "sky-legend", "Hover a star to zoom \u00B7 tap to read"), wish);

    const grid = el("div", model.constellations.length === 1 ? "sky-grid sky-grid--solo" : "sky-grid");
    const panels = model.constellations.map((constellation) => buildConstellation(constellation, model.flat.length));
    panels.forEach((panel) => grid.appendChild(panel));
    grid.addEventListener("click", (event) => {
      const star = event.target.closest(".star");
      if (!star || star.classList.contains("star--ghost")) return;
      const item = model.flat.find((entry) => entry.starEl === star);
      if (item) scope.open(item.index);
    });

    const foot = el("div", "sky-foot");
    const cta = el("a", "sky-cta", "Find a book to review");
    cta.href = "books.html";
    if (reviews.length < all.length) {
      const more = el("a", "sky-cta sky-cta--primary", `See all ${all.length} reviews`);
      more.href = "reviews.html";
      foot.append(el("p", "sky-foot-text", `Showing ${reviews.length} of ${all.length} reviews.`), more, cta);
    } else {
      foot.append(el("p", "sky-foot-text", "Read one of our books? Your review could be the next star."), cta);
    }

    root.append(bar, grid, foot);
    lightUp(panels);
  }

  // No reviews yet. Locally it explains how to add some; on the live reviews page
  // (the homepage section just stays hidden) it is a friendly "first star" note.
  function showEmpty(section, root, local) {
    section.hidden = false;
    root.textContent = "";
    const ghost = buildModel(Array.from({ length: 5 }, () => null));
    const panel = buildConstellation(ghost.constellations[0], 5, true);
    const note = el("div", "sky-howto");
    const title = el("p", "sky-howto-title", "The sky is waiting for its first star");
    const body = el("p", "");
    if (local) {
      body.append(
        "Drop review screenshots (any size) into ",
        el("code", "", "rama-creations-site/content/reviews/"),
        ", run ",
        el("code", "", "python rama-creations-site/tools/generate_catalog.py"),
        ", then refresh. Each screenshot becomes a star. This note only shows on your own computer \u2014 visitors see nothing on the homepage until there are reviews.",
      );
    } else {
      body.append("Read one of our books? Your review could be the first star in this sky.");
    }
    note.append(title, body);
    if (!local) {
      const cta = el("a", "sky-cta", "Find a book to review");
      cta.href = "books.html";
      note.appendChild(cta);
    }
    const grid = el("div", "sky-grid sky-grid--solo");
    grid.appendChild(panel);
    root.append(grid, note);
    lightUp([panel]);
  }

  // reviews.html: "42 reviews and counting" under the heading.
  function showTally(count) {
    const tally = document.getElementById("reviews-count");
    if (!tally) return;
    tally.textContent = `\u2B50 ${count} ${count === 1 ? "review" : "reviews"} and counting`;
    tally.hidden = false;
  }

  // The section is revealed after load, so the browser can't honor a #reviews link by itself.
  function honorHash(section) {
    if (location.hash === "#reviews") section.scrollIntoView();
  }

  async function init() {
    const section = document.getElementById("reviews");
    const root = document.getElementById("review-sky");
    if (!section || !root) return;
    const isPage = section.dataset.reviewsMode === "page";
    const limit = isPage ? 0 : Number(section.dataset.reviewsLimit) || 0;

    let reviews = [];
    try {
      const response = await fetch(DATA_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      reviews = Array.isArray(data) ? data.filter(isValidReview) : [];
    } catch (error) {
      console.info(`Review Sky: no reviews loaded (${error.message}).`);
    }

    if (reviews.length === 0) {
      if (isPage || isLocalPreview()) {
        showEmpty(section, root, isLocalPreview());
        honorHash(section);
      }
      return;
    }
    section.hidden = false;
    mount(root, reviews, limit);
    showTally(reviews.length);
    honorHash(section);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
