// "Made for every point of view" donut chart on the About page -- an SVG
// donut split into 6 equal audience segments (plus a matching legend list,
// since thin chart wedges are a small click target on their own). Clicking
// a segment or legend item shows a popup with that audience's message;
// clicking it again, clicking outside, or scrolling the chart out of view
// all close it.

// Hex values mirror the --sun/--violet/--sky/--mint/--berry/--amber custom
// properties in css/styles.css, kept as plain strings here since they're
// used as SVG stroke colors, not CSS.
const AUDIENCES = [
  {
    label: "Children",
    color: "#F8B84E",
    message: "Children turn a lesson into something they made themselves -- coloring while a story or fact sinks in, one page at a time.",
  },
  {
    label: "Teens",
    color: "#6D5EF6",
    message: "Teens get calm, screen-free focus time with real content behind it -- not just filler pages to fill a study break.",
  },
  {
    label: "Adults",
    color: "#0284C7",
    message: "Adults use it as a mindful reset -- a few quiet minutes with an actual topic instead of another scroll.",
  },
  {
    label: "Parents",
    color: "#10B981",
    message: "Parents get a shared activity that actually teaches something, with zero screen-time guilt attached.",
  },
  {
    label: "Seniors",
    color: "#EC4899",
    message: "Seniors get a gentle way to stay mentally engaged and unwind -- no timers, scores, or pressure.",
  },
  {
    label: "Educators",
    color: "#D97706",
    message: "Educators use the stories and facts as an easy, ready-made supplement to lessons on any of our topics.",
  },
];

const SVG_NS = "http://www.w3.org/2000/svg";
const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 78;
const STROKE_WIDTH = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP_RATIO = 0.06; // small visual gap between segments

// A tiny synthesized two-note "tweet" (Web Audio API) played on each click --
// no external audio file needed. Fails silently if Web Audio is unavailable.
let audioCtx = null;
function playBirdChirp() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === "suspended") audioCtx.resume();

    const now = audioCtx.currentTime;
    [0, 0.11].forEach((startOffset) => {
      const start = now + startOffset;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(2400, start);
      osc.frequency.exponentialRampToValueAtTime(3600, start + 0.06);
      osc.frequency.exponentialRampToValueAtTime(2200, start + 0.1);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.14);
    });
  } catch (err) {
    // Web Audio blocked/unsupported -- the chart still works without sound.
  }
}

function buildChart(container) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${SIZE} ${SIZE}`);
  svg.setAttribute("width", SIZE);
  svg.setAttribute("height", SIZE);

  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("transform", `rotate(-90 ${CENTER} ${CENTER})`);

  const share = CIRCUMFERENCE / AUDIENCES.length;
  const drawnLength = share * (1 - GAP_RATIO);

  AUDIENCES.forEach((audience, index) => {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", CENTER);
    circle.setAttribute("cy", CENTER);
    circle.setAttribute("r", RADIUS);
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", audience.color);
    circle.setAttribute("stroke-dasharray", `${drawnLength} ${CIRCUMFERENCE - drawnLength}`);
    circle.setAttribute("stroke-dashoffset", String(-(index * share)));
    circle.classList.add("donut-segment");
    circle.dataset.index = String(index);
    circle.setAttribute("tabindex", "0");
    circle.setAttribute("role", "button");
    circle.setAttribute("aria-label", audience.label);
    group.appendChild(circle);
  });

  svg.appendChild(group);
  container.appendChild(svg);
  return Array.from(group.querySelectorAll(".donut-segment"));
}

function buildLegend(listEl) {
  return AUDIENCES.map((audience, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "legend-item";
    button.dataset.index = String(index);
    button.style.setProperty("--legend-color", audience.color);
    button.innerHTML = `<span class="legend-swatch"></span>${audience.label}`;
    item.appendChild(button);
    listEl.appendChild(item);
    return button;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const chartContainer = document.getElementById("audience-donut");
  const legendList = document.getElementById("audience-legend");
  const popup = document.getElementById("donut-popup");
  const popupClose = document.getElementById("donut-popup-close");
  const popupTitle = document.getElementById("donut-popup-title");
  const popupMessage = document.getElementById("donut-popup-message");
  const wrap = document.querySelector(".audience-donut-wrap");
  if (!chartContainer || !legendList || !popup || !wrap) return;

  const segments = buildChart(chartContainer);
  const legendButtons = buildLegend(legendList);
  let activeIndex = null;

  function setActive(index) {
    segments.forEach((seg) => seg.classList.toggle("is-active", Number(seg.dataset.index) === index));
    legendButtons.forEach((btn) => btn.classList.toggle("is-active", Number(btn.dataset.index) === index));
  }

  function closePopup() {
    popup.hidden = true;
    activeIndex = null;
    setActive(null);
  }

  function openPopup(index) {
    const audience = AUDIENCES[index];
    popupTitle.textContent = audience.label;
    popupMessage.textContent = audience.message;
    popup.hidden = false;
    activeIndex = index;
    setActive(index);
  }

  function selectAudience(index) {
    playBirdChirp();
    if (activeIndex === index) {
      closePopup();
    } else {
      openPopup(index);
    }
  }

  [...segments, ...legendButtons].forEach((el) => {
    el.addEventListener("click", () => selectAudience(Number(el.dataset.index)));
    el.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectAudience(Number(el.dataset.index));
      }
    });
  });

  popupClose.addEventListener("click", closePopup);

  document.addEventListener("click", (event) => {
    if (popup.hidden) return;
    if (wrap.contains(event.target)) return; // click on the chart, legend, or popup itself
    closePopup();
  });

  // Auto-close if the chart scrolls out of the viewport while the popup is
  // open. Checked directly on scroll/resize (rather than relying only on
  // IntersectionObserver) so it reacts immediately regardless of how the
  // scroll happened.
  function checkStillInView() {
    if (popup.hidden) return;
    const rect = wrap.getBoundingClientRect();
    const outOfView = rect.bottom < 0 || rect.top > (window.innerHeight || document.documentElement.clientHeight);
    if (outOfView) closePopup();
  }

  window.addEventListener("scroll", checkStillInView, { passive: true });
  window.addEventListener("resize", checkStillInView);
});
