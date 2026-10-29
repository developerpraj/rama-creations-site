document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => links.classList.remove("open"));
  });
});

// Logo "rolls" on click and rolls back on the next click. When already on
// the home page, the click doesn't navigate (nowhere to go) -- it just spins.
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".brand").forEach((brand) => {
    brand.addEventListener("click", (event) => {
      brand.classList.toggle("brand--spun");
      if (brand.href === window.location.href) {
        event.preventDefault();
      }
    });
  });

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (isStandalone && !prefersReducedMotion) {
    document.querySelectorAll(".brand").forEach((brand) => {
      const logo = brand.querySelector("img");
      if (!logo) return;
      logo.addEventListener(
        "animationend",
        () => brand.classList.remove("brand--launch-spin"),
        { once: true },
      );
      requestAnimationFrame(() => brand.classList.add("brand--launch-spin"));
    });
  }

});

// The "Reviews" links (nav + footer) stay hidden until data/reviews.json has at
// least one review, so the live site never links to an empty page. They always
// show while previewing locally, where the page explains how to add reviews.
document.addEventListener("DOMContentLoaded", async () => {
  const links = document.querySelectorAll("[data-reviews-link]");
  if (!links.length) return;

  let show = window.location.protocol === "file:" || ["localhost", "127.0.0.1", "[::1]", "::1"].includes(window.location.hostname);
  if (!show) {
    try {
      const response = await fetch("data/reviews.json");
      const data = response.ok ? await response.json() : [];
      show = Array.isArray(data) && data.length > 0;
    } catch (error) {
      show = false;
    }
  }
  links.forEach((link) => {
    link.hidden = !show;
  });
});
