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
});
