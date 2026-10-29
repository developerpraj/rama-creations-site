// Color themes for the "Pick your color" nav control (js/theme-picker.js).
//
// Each theme is one palette from the supplied Colors screenshots, applied with
// the 60-30-10 rule: a dominant color (60%, the page background), a secondary
// color (30%, cards / header / footer) and an accent (10%, buttons and key
// details). Only those few roles are written down per theme -- the rest of
// the colors the stylesheet needs (muted text, borders, link colors, text on
// buttons, ...) are derived below and nudged until text stays readable, so
// adding another palette is just one more entry in THEMES.
//
// This file is loaded in <head> so a saved theme is applied before the first
// paint (no flash of the default colors). Everything lands on <html> as CSS
// variables; css/styles.css already reads all of them.
(function () {
  "use strict";

  const STORAGE_KEY = "rama-page-theme";
  const OVERRIDE_KEY = "rama-page-color-override"; // plain background swatches (theme-picker.js)
  const root = document.documentElement;

  // ---- color math -------------------------------------------------------------

  function parse(hex) {
    const value = String(hex).replace("#", "");
    return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  }

  function toHex(rgb) {
    return `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  }

  // share = how much of `b` ends up in the result (0 = a, 1 = b)
  function mix(a, b, share) {
    const x = parse(a);
    const y = parse(b);
    return toHex(x.map((v, i) => v + (y[i] - v) * share));
  }

  function luminance(hex) {
    const [r, g, b] = parse(hex).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrast(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p);
    return (hi + 0.05) / (lo + 0.05);
  }

  // Moves `color` toward `toward` in small steps until it reads on every surface.
  function ensureContrast(color, surfaces, min, toward) {
    let current = color;
    for (let i = 0; i < 28; i += 1) {
      if (surfaces.every((surface) => contrast(current, surface) >= min)) return current;
      current = mix(current, toward, 0.08);
    }
    return toward;
  }

  // The first candidate that reads (>= min) on every background, so a theme's
  // own inks are preferred; otherwise whichever reads best.
  function bestInk(backgrounds, candidates, min = 4.5) {
    const worst = (candidate) => Math.min(...backgrounds.map((bg) => contrast(candidate, bg)));
    const passing = candidates.find((candidate) => worst(candidate) >= min);
    if (passing) return passing;
    return candidates.reduce((best, candidate) => (worst(candidate) > worst(best) ? candidate : best));
  }

  function rgba(hex, alpha) {
    return `rgba(${parse(hex).join(", ")}, ${alpha})`;
  }

  // ---- the themes -----------------------------------------------------------------
  // palette = the colors as named in the screenshots; bg / panel / accent are the
  // 60 / 30 / 10 roles, ink is the body text, accent2 colors links and badges.
  // `muted` is optional (otherwise derived).
  const THEMES = [
    {
      id: "midnight-amethyst",
      name: "Midnight Amethyst",
      mode: "dark",
      palette: [["Jet Black", "#050505"], ["Royal Amethyst", "#3B0A6B"], ["Electric Cyan", "#00E5FF"]],
      bg: "#050505", panel: "#3B0A6B", ink: "#F4F0FF", accent: "#00E5FF", accent2: "#B58CFF",
    },
    {
      id: "crimson-forest",
      name: "Crimson Forest",
      mode: "dark",
      palette: [["Charcoal Black", "#171717"], ["Forest Green", "#06110C"], ["Crimson Red", "#A31C1B"]],
      bg: "#171717", panel: "#0F2A1C", ink: "#F3F5F2", accent: "#A31C1B", accent2: "#7BD8A3",
    },
    {
      id: "lemon-lavender",
      name: "Lemon Lavender",
      mode: "dark",
      palette: [["Lemon", "#FFF21A"], ["Charcoal Black", "#171717"], ["Electric Lavender", "#A66BFF"]],
      bg: "#171717", panel: "#25212F", ink: "#F7F5FF", accent: "#FFF21A", accent2: "#A66BFF",
    },
    {
      id: "mocha-gold",
      name: "Mocha & Gold",
      mode: "dark",
      palette: [["Mocha Brown", "#5B4632"], ["Champagne Gold", "#F4D9A0"], ["Burnt Amber", "#C8792C"]],
      bg: "#5B4632", panel: "#4A3828", ink: "#F8E7C2", accent: "#C8792C", accent2: "#F4D9A0",
    },
    {
      id: "modern-minimalist",
      name: "Modern Minimalist",
      mode: "light",
      palette: [["Deep Charcoal", "#2D3436"], ["Soft Grey", "#DFE6E9"], ["Pure White", "#FFFFFF"], ["Accent Gold", "#CDB14E"]],
      bg: "#DFE6E9", panel: "#FFFFFF", ink: "#2D3436", accent: "#CDB14E", accent2: "#2D3436",
    },
    {
      id: "high-contrast-tech",
      name: "High-Contrast Tech",
      mode: "dark",
      palette: [["Electric Blue", "#0984E3"], ["Night Black", "#1E272E"], ["Cyan Neon", "#00CEC9"], ["Cloud White", "#F5F6FA"]],
      bg: "#1E272E", panel: "#2A353D", ink: "#F5F6FA", accent: "#00CEC9", accent2: "#0984E3",
    },
    {
      id: "earthy-organic",
      name: "Earthy & Organic",
      mode: "light",
      palette: [["Forest Green", "#2D4F1E"], ["Warm Beige", "#F5E6CC"], ["Terracotta", "#E27D60"], ["Slate Grey", "#4A4A4A"]],
      bg: "#F5E6CC", panel: "#FBF4E4", ink: "#2D4F1E", muted: "#4A4A4A", accent: "#E27D60", accent2: "#2D4F1E",
    },
    {
      id: "bold-energetic",
      name: "Bold & Energetic",
      mode: "dark",
      palette: [["Vivid Orange", "#FF7675"], ["Deep Purple", "#6C5CE7"], ["Soft Mint", "#55E6C1"], ["Dark Slate", "#2F3640"]],
      bg: "#2F3640", panel: "#6C5CE7", ink: "#FFFFFF", accent: "#FF7675", accent2: "#55E6C1",
    },
    {
      id: "luxury-elegant",
      name: "Luxury & Elegant",
      mode: "dark",
      palette: [["Midnight Navy", "#192A56"], ["Champagne", "#F7D794"], ["Dusty Rose", "#EDA6A3"], ["Pearl White", "#FCFBFB"]],
      bg: "#192A56", panel: "#223669", ink: "#FCFBFB", accent: "#EDA6A3", accent2: "#F7D794",
    },
  ];

  // Every CSS variable a theme sets, derived from its handful of base colors.
  function derive(theme) {
    const dark = theme.mode === "dark";
    const { bg, panel, ink, accent, accent2 } = theme;
    const surfaces = [bg, panel];
    const readsToward = dark ? "#FFFFFF" : "#000000";
    const darkInk = dark ? bg : ink;
    const lightInk = dark ? ink : "#FFFFFF";
    const inks = [darkInk, lightInk, "#111111", "#FFFFFF"];

    const muted = ensureContrast(theme.muted || mix(ink, bg, 0.3), surfaces, 4.6, ink);
    const lilac = dark
      ? mix(mix(panel, "#000000", 0.28), accent2, 0.16)
      : mix(mix(panel, "#FFFFFF", 0.3), accent2, 0.14);
    const violet = ensureContrast(accent2, [bg, panel, lilac], 4.5, readsToward);
    const violetSoft = ensureContrast(mix(violet, bg, 0.25), [bg, panel, lilac], 4.5, readsToward);
    const amber = ensureContrast(accent, surfaces, 4.5, readsToward);
    const sunSoft = mix(accent, "#FFFFFF", 0.3);
    const onSun = bestInk([accent], inks);

    return {
      "--theme-bg": bg,
      "--paper": dark ? mix(panel, "#000000", 0.35) : mix(panel, bg, 0.55),
      "--paper-panel": panel,
      "--ink": ink,
      "--ink-muted": muted,
      "--border": mix(ink, panel, 0.22),
      "--sun": accent,
      "--sun-soft": sunSoft,
      "--amber": amber,
      "--sun-text": amber,
      "--on-sun": onSun,
      "--violet": violet,
      "--violet-soft": violetSoft,
      "--on-violet": bestInk([violet, violetSoft], inks),
      "--theme-lilac": lilac,
      "--berry": ensureContrast(dark ? "#FF7AA8" : "#C2185B", surfaces, 4.5, readsToward),
      "--mint": ensureContrast(dark ? "#5EEAD4" : "#0F766E", surfaces, 4.5, readsToward),
      "--sky": ensureContrast(dark ? "#7DD3FC" : "#0369A1", surfaces, 4.5, readsToward),
      "--header-bg": rgba(panel, 0.92),
      "--buy-bg": accent,
      "--buy-hover-bg": sunSoft,
      "--buy-ink": onSun,
    };
  }

  // ---- applying / clearing -----------------------------------------------------

  let appliedNames = [];
  let originalThemeColor = null;

  function themeColorMeta() {
    return document.querySelector('meta[name="theme-color"]');
  }

  function clear({ persist = true } = {}) {
    appliedNames.forEach((name) => root.style.removeProperty(name));
    appliedNames = [];
    root.style.removeProperty("color-scheme");
    delete root.dataset.palette;
    const meta = themeColorMeta();
    if (meta && originalThemeColor !== null) meta.setAttribute("content", originalThemeColor);
    if (persist) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        // storage blocked (private mode) -- the theme just won't persist
      }
    }
    window.dispatchEvent(new CustomEvent("rama-themechange", { detail: { id: null } }));
  }

  function apply(id, { persist = true } = {}) {
    const theme = THEMES.find((candidate) => candidate.id === id);
    if (!theme) return false;
    clear({ persist: false });
    const vars = derive(theme);
    Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));
    appliedNames = Object.keys(vars);
    root.style.setProperty("color-scheme", theme.mode);
    root.dataset.palette = theme.id;

    const meta = themeColorMeta();
    if (meta) {
      if (originalThemeColor === null) originalThemeColor = meta.getAttribute("content");
      meta.setAttribute("content", theme.bg);
    }
    if (document.body) document.body.style.removeProperty("--page-bg"); // a plain page color no longer applies
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, theme.id);
        localStorage.removeItem(OVERRIDE_KEY);
      } catch (error) {
        // storage blocked -- applies for this page only
      }
    }
    window.dispatchEvent(new CustomEvent("rama-themechange", { detail: { id: theme.id } }));
    return true;
  }

  function current() {
    return root.dataset.palette || null;
  }

  window.RamaThemes = { THEMES, derive, apply, clear, current, contrast };

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) apply(saved, { persist: false });
  } catch (error) {
    // storage blocked -- start with the default colors
  }
})();
