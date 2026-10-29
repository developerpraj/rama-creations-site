// "Pick your color" nav control -- lets a visitor override the current
// page's look: either a plain light pastel background (any swatch, regardless
// of that page's own default theme, --page-bg) or one of the full color
// themes from js/themes.js (background + cards + accent, 60-30-10).
// Injected into the middle of .nav-links via JS so every page gets it
// without duplicating markup. Persisted in localStorage so the choice
// survives navigating between pages; a plain color and a theme never apply
// at the same time.
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
    if (window.RamaThemes) window.RamaThemes.clear(); // a plain color replaces any theme
    document.body.style.setProperty("--page-bg", hex);
    localStorage.setItem(STORAGE_KEY, hex);
  } else {
    document.body.style.removeProperty("--page-bg");
    localStorage.removeItem(STORAGE_KEY);
  }
}

function buildThemeButton(theme) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cp-theme";
  button.dataset.theme = theme.id;
  button.setAttribute("aria-pressed", "false");
  button.title = theme.palette.map(([name, hex]) => `${name} ${hex}`).join(" \u00B7 ");

  // The preview is the 60-30-10 rule itself: page, cards, accent.
  const bar = document.createElement("span");
  bar.className = "cp-bar";
  bar.setAttribute("aria-hidden", "true");
  [[theme.bg, 60], [theme.panel, 30], [theme.accent, 10]].forEach(([color, share]) => {
    const segment = document.createElement("i");
    segment.style.background = color;
    segment.style.flex = `${share} 0 0`;
    bar.appendChild(segment);
  });

  const label = document.createElement("span");
  label.className = "cp-label";
  const name = document.createElement("span");
  name.className = "cp-name";
  name.textContent = theme.name;
  const colors = document.createElement("span");
  colors.className = "cp-colors";
  colors.textContent = theme.palette.map(([colorName]) => colorName).join(" \u00B7 ");
  label.append(name, colors);

  button.append(bar, label);
  return button;
}

document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelector(".nav-links");
  if (!navLinks) return;

  const wrapper = document.createElement("div");
  wrapper.className = "color-picker";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "color-picker-trigger";
  trigger.setAttribute("aria-label", "Pick a page color or theme");
  trigger.setAttribute("aria-expanded", "false");
  trigger.title = "Pick a page color or theme";
  trigger.textContent = "\u{1F3A8}";

  const panel = document.createElement("div");
  panel.className = "color-picker-panel";
  panel.setAttribute("role", "menu");

  const swatchTitle = document.createElement("p");
  swatchTitle.className = "cp-title";
  swatchTitle.textContent = "Page color";
  const swatches = document.createElement("div");
  swatches.className = "cp-swatches";

  COLOR_SWATCHES.forEach((swatch) => {
    const swatchBtn = document.createElement("button");
    swatchBtn.type = "button";
    swatchBtn.className = "color-swatch";
    swatchBtn.style.background = swatch.value;
    swatchBtn.title = swatch.name;
    swatchBtn.setAttribute("aria-label", `Use ${swatch.name} background`);
    swatchBtn.addEventListener("click", () => {
      applyColorOverride(swatch.value);
      closePanel();
    });
    swatches.appendChild(swatchBtn);
  });

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "color-swatch color-swatch--reset";
  resetBtn.textContent = "\u21BA";
  resetBtn.title = "Reset to this page's default color";
  resetBtn.setAttribute("aria-label", "Reset to this page's default color");
  resetBtn.addEventListener("click", () => {
    applyColorOverride(null);
    if (window.RamaThemes) window.RamaThemes.clear();
    closePanel();
  });
  swatches.appendChild(resetBtn);

  panel.append(swatchTitle, swatches);

  if (window.RamaThemes) {
    const themeTitle = document.createElement("p");
    themeTitle.className = "cp-title cp-title--themes";
    themeTitle.textContent = "Themes";

    const list = document.createElement("div");
    list.className = "cp-themes";
    window.RamaThemes.THEMES.forEach((theme) => {
      const button = buildThemeButton(theme);
      button.addEventListener("click", () => window.RamaThemes.apply(theme.id));
      list.appendChild(button);
    });
    panel.append(themeTitle, list);

    const syncActive = () => {
      const active = window.RamaThemes.current();
      list.querySelectorAll(".cp-theme").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.theme === active));
      });
    };
    window.addEventListener("rama-themechange", syncActive);
    syncActive();
  }

  wrapper.appendChild(trigger);
  wrapper.appendChild(panel);

  // Insert in the middle of the nav links (e.g. between Books and About).
  const middleIndex = Math.floor(navLinks.children.length / 2);
  navLinks.insertBefore(wrapper, navLinks.children[middleIndex] || null);

  function closePanel() {
    panel.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
  }

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = panel.classList.toggle("open");
    trigger.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (event) => {
    if (!event.composedPath().includes(wrapper)) closePanel();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("open")) {
      closePanel();
      trigger.focus();
    }
  });

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && !(window.RamaThemes && window.RamaThemes.current())) {
    document.body.style.setProperty("--page-bg", saved);
  }
});
