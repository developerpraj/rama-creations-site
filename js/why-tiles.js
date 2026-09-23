// "What makes our books different" tiles on the homepage -- each one flips
// in place to reveal its message on click, and flips back on the next click.
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".why-tiles .tile").forEach((tile) => {
    tile.addEventListener("click", () => {
      tile.classList.toggle("is-flipped");
    });
  });
});
