// Background video: fade in once it's actually playing.
(function () {
  var video = document.querySelector(".bg__video");
  var bg = video.parentElement;

  function show() {
    bg.classList.add("is-playing");
  }

  if (!video.paused && video.readyState > 2) show();
  video.addEventListener("playing", show, { once: true });

  // Some browsers ignore the autoplay attribute until play() is called.
  var p = video.play();
  if (p && p.catch) p.catch(function () {});
})();

// Mobile menu
(function () {
  var burger = document.querySelector(".burger");
  var menu = document.getElementById("menu");

  function setOpen(open) {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Închide meniul" : "Deschide meniul");
    menu.hidden = !open;
  }

  burger.addEventListener("click", function () {
    setOpen(menu.hidden);
  });

  menu.addEventListener("click", function (e) {
    if (e.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });
})();
