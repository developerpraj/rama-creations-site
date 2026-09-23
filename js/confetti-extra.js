// Scatters a lot of unique decorative emoji down the page margins (outside
// the centered content column, so they never sit on top of text) -- on top
// of whatever confetti a page's own hero already has in its markup.
// Injected via JS so it works identically on every page without hand-placed
// spans in each HTML file.
const MARGIN_EMOJI_POOL = [
  "\u{1F31F}", "\u2728", "\u{1F308}", "\u{1F98B}", "\u{1F338}", "\u{1F340}",
  "\u{1F33C}", "\u{1F33B}", "\u{1F337}", "\u{1F33A}", "\u{1F341}", "\u{1F386}",
  "\u{1F387}", "\u{1FA84}", "\u{1F9E1}", "\u{1F9F8}", "\u{1F984}", "\u{1F41D}",
  "\u{1F41E}", "\u{1F420}", "\u{1F42D}", "\u{1F430}", "\u{1F3A8}", "\u{1F4DA}",
  "\u{1F4AB}", "\u{1F3B5}", "\u{1F3AF}", "\u{1F381}", "\u{1F389}", "\u{1F309}",
];

document.addEventListener("DOMContentLoaded", () => {
  const pool = [...MARGIN_EMOJI_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const count = Math.min(14, pool.length);
  const docHeight = Math.max(document.body.scrollHeight, window.innerHeight);

  for (let i = 0; i < count; i++) {
    const span = document.createElement("span");
    span.className = "confetti-margin";
    span.textContent = pool[i];
    span.setAttribute("aria-hidden", "true");
    const side = i % 2 === 0 ? "left" : "right";
    span.style[side] = `${Math.random() * 22 + 6}px`;
    span.style.top = `${Math.random() * (docHeight - 140) + 70}px`;
    span.style.fontSize = `${(Math.random() * 0.8 + 1.2).toFixed(2)}rem`;
    span.style.opacity = (Math.random() * 0.3 + 0.55).toFixed(2);
    document.body.appendChild(span);
  }
});
