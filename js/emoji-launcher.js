// Gamified "launch emojis" button: fires a curated set of unique emoji one
// at a time from the button's own position to a random spot on screen, at a
// moderate speed (a ~0.9s eased flight -- not instant, not sluggish).
// Injected via JS so every page gets the same button without duplicating
// markup across index.html/books.html/about.html/contact.html.
const LAUNCH_EMOJI_POOL = [
  "\u2728", "\u{1F31F}", "\u{1F308}", "\u{1F98B}", "\u{1F338}", "\u{1F340}",
  "\u{1F33C}", "\u{1F33B}", "\u{1F337}", "\u{1F33A}", "\u{1F341}", "\u{1F386}",
  "\u{1F387}", "\u{1FA84}", "\u{1F984}", "\u{1F41D}", "\u{1F41E}", "\u{1F420}",
  "\u{1F42D}", "\u{1F430}", "\u{1F3A8}", "\u{1F4DA}", "\u{1F4AB}", "\u{1F3B5}",
  "\u{1F3AF}", "\u{1F381}", "\u{1F389}", "\u{1F9E1}", "\u{1F9F8}", "\u{1F309}",
];

function shuffled(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "emoji-launch-btn";
  btn.className = "emoji-launch-btn";
  btn.textContent = "\u{1F3AE} Launch Emojis!";
  document.body.appendChild(btn);

  let launching = false;

  function launchOne(emoji) {
    const rect = btn.getBoundingClientRect();
    const span = document.createElement("span");
    span.className = "flying-emoji";
    span.textContent = emoji;
    span.style.left = `${rect.left + rect.width / 2}px`;
    span.style.top = `${rect.top + rect.height / 2}px`;
    document.body.appendChild(span);

    const targetX = Math.random() * (window.innerWidth - 60);
    const targetY = Math.random() * (window.innerHeight - 60);
    const rotate = Math.random() * 720 - 360;

    requestAnimationFrame(() => {
      span.style.transform = `translate(${targetX - rect.left}px, ${targetY - rect.top}px) rotate(${rotate}deg) scale(1.4)`;
      span.style.opacity = "0";
    });

    setTimeout(() => span.remove(), 950);
  }

  btn.addEventListener("click", () => {
    // Every click also flips every gold accent (buttons, badges, nav
    // underline, etc.) to platinum, alternating back to gold on the next
    // click -- all driven by overriding the --sun/--sun-soft/--amber
    // variables those elements already use, via .platinum-mode on <body>.
    document.body.classList.toggle("platinum-mode");

    if (launching) return;
    launching = true;
    const emojis = shuffled(LAUNCH_EMOJI_POOL);
    emojis.forEach((emoji, i) => {
      setTimeout(() => launchOne(emoji), i * 180); // one at a time, moderate pace
    });
    setTimeout(() => { launching = false; }, emojis.length * 180 + 950);
  });
});
