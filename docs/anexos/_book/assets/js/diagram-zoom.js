// Cursor zoom-in handled by CSS (.zoomable-diagram).
// Click interaction is managed by diagram-modal.js.
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".zoomable-diagram").forEach(function (el) {
    el.style.cursor = "zoom-in";
  });
});
