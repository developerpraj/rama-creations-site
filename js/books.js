// Books catalog -- fully data-driven from data/books.json (see the comment
// in books.html for the developer workflow: add images + one JSON entry,
// push, done -- no HTML/CSS/JS editing needed to add a book). This file
// fetches that JSON, renders every card, and wires up search, filter by age
// group (options built dynamically from whatever age groups appear in the
// data), sort, "show more", and the quick-view carousel dialog.
const CART_ICON_SVG = `<svg class="btn-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function buildBookCard(book) {
  const article = document.createElement("article");
  article.className = "book-card";

  const cover = document.createElement("div");
  cover.setAttribute("role", "button");
  cover.setAttribute("tabindex", "0");
  cover.setAttribute("aria-label", `Quick view: ${book.title}`);

  if (book.images && book.images.length > 0) {
    cover.className = "book-cover book-cover--photo";
    const img = document.createElement("img");
    img.src = book.images[0].src;
    img.alt = book.images[0].alt || `${book.title} front cover`;
    img.loading = "lazy";
    cover.appendChild(img);
  } else {
    cover.className = "book-cover";
    cover.style.background = book.themeColor || "#EDE9FE";
    cover.textContent = book.title;
  }

  const body = document.createElement("div");
  body.className = "book-body";

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = book.ageLabel || "";

  const h3 = document.createElement("h3");
  h3.textContent = book.title;

  const p = document.createElement("p");
  p.textContent = book.shortDescription || "";

  body.appendChild(badge);
  body.appendChild(h3);
  body.appendChild(p);

  // "Show more" sits above the buy/coming-soon action, which is centered in
  // its own row -- both wrapped so the CSS can lay them out top-to-bottom.
  const actions = document.createElement("div");
  actions.className = "book-card-actions";

  if (
    book.fullDescription &&
    book.fullDescription.trim() !== (book.shortDescription || "").trim()
  ) {
    const showMoreBtn = document.createElement("button");
    showMoreBtn.type = "button";
    showMoreBtn.className = "show-more-btn";
    showMoreBtn.textContent = "Show more";
    let expanded = false;
    showMoreBtn.addEventListener("click", () => {
      expanded = !expanded;
      p.textContent = expanded ? book.fullDescription : book.shortDescription;
      showMoreBtn.textContent = expanded ? "Show less" : "Show more";
    });
    actions.appendChild(showMoreBtn);
  }

  const buyRow = document.createElement("div");
  buyRow.className = "book-card-buy-row";
  if (book.buyLink) {
    const buyLink = document.createElement("a");
    buyLink.className = "btn btn-buy";
    buyLink.href = book.buyLink;
    buyLink.target = "_blank";
    buyLink.rel = "noopener noreferrer";
    buyLink.innerHTML = `${CART_ICON_SVG}Buy on Amazon`;
    buyRow.appendChild(buyLink);
  } else {
    const comingSoon = document.createElement("button");
    comingSoon.className = "btn btn-secondary";
    comingSoon.type = "button";
    comingSoon.disabled = true;
    comingSoon.title = "Coming soon on Amazon KDP";
    comingSoon.textContent = "Coming soon";
    buyRow.appendChild(comingSoon);
  }
  actions.appendChild(buyRow);
  body.appendChild(actions);

  article.appendChild(cover);
  article.appendChild(body);
  return { book, article, cover };
}

document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("book-grid");
  if (!grid) return;

  const searchInput = document.getElementById("book-search");
  const filterSelect = document.getElementById("book-filter");
  const sortSelect = document.getElementById("book-sort");
  const noResults = document.getElementById("no-results");
  const loadError = document.getElementById("load-error");

  let books;
  try {
    const response = await fetch("data/books.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    books = await response.json();
  } catch (err) {
    console.error("Failed to load data/books.json:", err);
    loadError.hidden = false;
    return;
  }

  // SEO: an ItemList of Book schema, built from the real catalog data so it
  // can never go stale like a hand-written one could. Image URLs are
  // resolved against the current page so this works under any deploy path
  // (e.g. a GitHub Pages project subpath) without hardcoding a domain.
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": books.map((book, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Book",
        "name": book.title,
        "description": book.shortDescription,
        ...(book.images && book.images[0]
          ? { "image": new URL(book.images[0].src, document.baseURI).href }
          : {}),
      },
    })),
  };
  const schemaScript = document.createElement("script");
  schemaScript.type = "application/ld+json";
  schemaScript.textContent = JSON.stringify(itemListSchema);
  document.head.appendChild(schemaScript);

  // Age filter options are built from whatever ageFilter/ageLabel pairs show
  // up in the data -- add a new age group in books.json and it just appears
  // here too, no HTML edit required.
  const seenAgeFilters = new Set();
  books.forEach((book) => {
    if (book.ageFilter && !seenAgeFilters.has(book.ageFilter)) {
      seenAgeFilters.add(book.ageFilter);
      const option = document.createElement("option");
      option.value = book.ageFilter;
      option.textContent = book.ageLabel || book.ageFilter;
      filterSelect.appendChild(option);
    }
  });

  const entries = books.map((book) => buildBookCard(book));
  entries.forEach(({ article }) => grid.appendChild(article));

  function applySearchAndFilter() {
    const query = (searchInput.value || "").trim().toLowerCase();
    const ageFilter = filterSelect.value;
    let visibleCount = 0;

    entries.forEach(({ book, article }) => {
      const title = (book.title || "").toLowerCase();
      const description = (book.fullDescription || book.shortDescription || "").toLowerCase();
      const matchesQuery = !query || title.includes(query) || description.includes(query);
      const matchesAge = ageFilter === "all" || book.ageFilter === ageFilter;
      const visible = matchesQuery && matchesAge;
      article.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    noResults.hidden = visibleCount > 0;
  }

  function applySort() {
    const mode = sortSelect.value;
    const ordered = mode === "default"
      ? entries
      : [...entries].sort((a, b) => {
          const cmp = a.book.title.localeCompare(b.book.title, undefined, { sensitivity: "base" });
          return mode === "title-desc" ? -cmp : cmp;
        });
    ordered.forEach(({ article }) => grid.appendChild(article));
  }

  searchInput.addEventListener("input", applySearchAndFilter);
  filterSelect.addEventListener("change", applySearchAndFilter);
  sortSelect.addEventListener("change", applySort);

  // ---- Quick view dialog ----
  const modal = document.getElementById("book-modal");
  const modalContent = document.getElementById("book-modal-content");
  const modalClose = document.getElementById("book-modal-close");

  const lightbox = document.getElementById("image-lightbox");
  const lightboxContent = document.getElementById("lightbox-content");
  const lightboxClose = document.getElementById("lightbox-close");
  const lightboxFullscreen = document.getElementById("lightbox-fullscreen");

  // Opens the SAME set of images in a bigger, uncropped, still-navigable
  // carousel -- so zooming in on one photo doesn't lose the ability to
  // flip to the next one without closing and reopening.
  function openLightbox(images, startIndex) {
    lightboxContent.innerHTML = "";
    lightboxContent.appendChild(buildCarousel(images, { startIndex }));
    lightbox.showModal();
  }

  lightboxClose.addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close(); // click on the backdrop
  });
  lightbox.addEventListener("close", () => {
    lightboxContent.innerHTML = ""; // stop holding the full-size images in memory once closed
    if (document.fullscreenElement === lightbox) document.exitFullscreen();
  });

  lightboxFullscreen.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement === lightbox) {
        await document.exitFullscreen();
      } else {
        await lightbox.requestFullscreen();
      }
    } catch (err) {
      // Fullscreen isn't available/allowed in this browser/context -- the
      // lightbox is already near-fullscreen via CSS, so just no-op.
    }
  });

  function buildCarousel(images, { startIndex = 0, onOpenLightbox, expandable = false } = {}) {
    const wrapper = document.createElement("div");
    wrapper.className = "book-carousel";

    const track = document.createElement("div");
    track.className = "book-carousel-track";

    images.forEach((entry, i) => {
      const slide = document.createElement("div");
      slide.className = "book-carousel-slide";
      const slideImg = document.createElement("img");
      slideImg.src = entry.src;
      slideImg.alt = entry.alt || "";
      if (onOpenLightbox) {
        slideImg.addEventListener("click", () => onOpenLightbox(images, i));
      }
      slide.appendChild(slideImg);
      track.appendChild(slide);
    });

    wrapper.appendChild(track);

    let index = startIndex;
    const dots = [];
    const goTo = (i) => {
      index = (i + images.length) % images.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((dot, di) => dot.classList.toggle("active", di === index));
    };

    if (images.length > 1) {
      const prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.className = "book-carousel-btn book-carousel-btn--prev";
      prevBtn.setAttribute("aria-label", "Previous image");
      prevBtn.textContent = "\u2039";
      prevBtn.addEventListener("click", () => goTo(index - 1));

      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "book-carousel-btn book-carousel-btn--next";
      nextBtn.setAttribute("aria-label", "Next image");
      nextBtn.textContent = "\u203A";
      nextBtn.addEventListener("click", () => goTo(index + 1));

      const dotsWrap = document.createElement("div");
      dotsWrap.className = "book-carousel-dots";
      images.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "book-carousel-dot";
        dot.setAttribute("aria-label", `Go to image ${i + 1}`);
        dot.addEventListener("click", () => goTo(i));
        dotsWrap.appendChild(dot);
        dots.push(dot);
      });

      wrapper.appendChild(prevBtn);
      wrapper.appendChild(nextBtn);
      wrapper.appendChild(dotsWrap);
    }

    if (expandable) {
      const expandBtn = document.createElement("button");
      expandBtn.type = "button";
      expandBtn.className = "book-carousel-expand";
      expandBtn.setAttribute("aria-label", "View full-size");
      expandBtn.title = "View full-size";
      expandBtn.textContent = "\u26F6";
      expandBtn.addEventListener("click", () => openLightbox(images, index));
      wrapper.appendChild(expandBtn);
    }

    goTo(startIndex);
    return wrapper;
  }

  function openQuickView(book) {
    modalContent.innerHTML = "";

    if (book.images && book.images.length > 0) {
      modalContent.appendChild(buildCarousel(book.images, { onOpenLightbox: openLightbox, expandable: true }));
    } else {
      const mediaEl = document.createElement("div");
      mediaEl.className = "book-modal-media";
      mediaEl.style.background = book.themeColor || "#EDE9FE";
      modalContent.appendChild(mediaEl);
    }

    const actionHtml = book.buyLink
      ? `<a class="btn btn-buy" href="${book.buyLink}" target="_blank" rel="noopener noreferrer">${CART_ICON_SVG}Buy on Amazon</a>`
      : `<button class="btn btn-secondary" type="button" disabled title="Coming soon on Amazon KDP">Coming soon</button>`;

    const bodyEl = document.createElement("div");
    bodyEl.className = "book-modal-body";
    bodyEl.innerHTML = `
      <span class="badge">${escapeHtml(book.ageLabel)}</span>
      <h3>${escapeHtml(book.title)}</h3>
      <p>${escapeHtml(book.fullDescription || book.shortDescription)}</p>
      <div class="book-modal-actions">
        ${actionHtml}
        <button class="btn btn-secondary" type="button" data-close-modal>Close</button>
      </div>
    `;
    modalContent.appendChild(bodyEl);
    bodyEl.querySelector("[data-close-modal]").addEventListener("click", () => modal.close());

    modal.showModal();
  }

  entries.forEach(({ book, cover }) => {
    cover.addEventListener("click", () => openQuickView(book));
    cover.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openQuickView(book);
      }
    });
  });

  modalClose.addEventListener("click", () => modal.close());
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.close(); // click on the backdrop
  });
});
