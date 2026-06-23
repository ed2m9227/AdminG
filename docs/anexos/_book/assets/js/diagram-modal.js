document.addEventListener("DOMContentLoaded", function () {

  // Create modal
  var modal = document.createElement("div");
  modal.className = "diagram-modal";
  modal.innerHTML =
    '<span class="close" aria-label="Cerrar">&times;</span>' +
    '<div class="content"></div>';
  document.body.appendChild(modal);

  var content = modal.querySelector(".content");
  var close   = modal.querySelector(".close");

  function hideModal() {
    modal.classList.remove("show");
    content.innerHTML = "";
  }

  close.addEventListener("click", hideModal);

  modal.addEventListener("click", function (e) {
    if (e.target === modal) hideModal();
  });

  // Open modal on click inside any .zoomable-diagram
  document.addEventListener("click", function (e) {
    var wrapper = e.target.closest(".zoomable-diagram");
    if (!wrapper) return;

    var chart = wrapper.querySelector("svg") || wrapper.querySelector(".mermaid");
    if (!chart) return;

    content.innerHTML =
      '<div style="width:100%;min-width:50vw;min-height:40vh;">' +
      chart.outerHTML +
      "</div>";
    modal.classList.add("show");
  });

});
