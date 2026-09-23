// "Pick your color" nav control -- lets a visitor override the current
// page's flat background with any light pastel swatch, regardless of that
// page's own default theme (--page-bg). Injected into the middle of
// .nav-links via JS so every page gets it without duplicating markup.
// Persisted in localStorage so the choice survives navigating between pages.
const COLOR_SWATCHES = [
  { name: "White", value: "#FFFFFF" },
  { name: "Blush Pink", value: "#FDE7EC" },
  { name: "Sky Blue", value: "#E3F0FC" },
  { name: "Seafoam", value: "#E1EEEC" },
  { name: "Butter", value: "#FEF9E7" },
  { name: "Lilac", value: "#F1EAFB" },
  { name: "Peach", value: "#FDEEE3" },
  { name: "Mint", value: "#E6F6F1" },
  { name: "Lavender", value: "#EDEBFA" },
  { name: "Rose", value: "#FCEAF0" },
  { name: "Cloud Grey", value: "#F1F3F5" },
  { name: "Vanilla", value: "#FBF3E7" },
];

const STORAGE_KEY = "rama-page-color-override";

function applyColorOverride(hex) {
  if (hex) {
    document.body.style.setProperty("--page-bg", hex);
    localStorage.setItem(STORAGE_KEY, hex);
  } else {
    document.body.style.removeProperty("--page-bg");
    localStorage.removeItem(STORAGE_KEY);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelector(".nav-links");
  if (!navLinks) return;

  const wrapper = document.createElement("div");
  wrapper.className = "color-picker";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "color-picker-trigger";
  trigger.setAttribute("aria-label", "Pick a page color");
  trigger.title = "Pick a page color";
  trigger.textContent = "\u{1F3A8}";

  const panel = document.createElement("div");
  panel.className = "color-picker-panel";
  panel.setAttribute("role", "menu");

  COLOR_SWATCHES.forEach((swatch) => {
    const swatchBtn = document.createElement("button");
    swatchBtn.type = "button";
    swatchBtn.className = "color-swatch";
    swatchBtn.style.background = swatch.value;
    swatchBtn.title = swatch.name;
    swatchBtn.setAttribute("aria-label", `Use ${swatch.name} background`);
    swatchBtn.addEventListener("click", () => {
      applyColorOverride(swatch.value);
      panel.classList.remove("open");
    });
    panel.appendChild(swatchBtn);
  });

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "color-swatch color-swatch--reset";
  resetBtn.textContent = "\u21BA";
  resetBtn.title = "Reset to this page's default color";
  resetBtn.setAttribute("aria-label", "Reset to this page's default color");
  resetBtn.addEventListener("click", () => {
    applyColorOverride(null);
    panel.classList.remove("open");
  });
  panel.appendChild(resetBtn);

  wrapper.appendChild(trigger);
  wrapper.appendChild(panel);

  // Insert in the middle of the nav links (e.g. between Books and About).
  const middleIndex = Math.floor(navLinks.children.length / 2);
  navLinks.insertBefore(wrapper, navLinks.children[middleIndex] || null);

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    panel.classList.toggle("open");
  });
  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) panel.classList.remove("open");
  });

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) document.body.style.setProperty("--page-bg", saved);
});
