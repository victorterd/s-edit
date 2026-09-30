// Background video. Mobile browsers can block autoplay (iOS Low Power Mode,
// Android Data Saver), so show the first frame as soon as it's decoded and
// retry playback on the first touch or when the tab becomes visible again.
(function () {
  var video = document.querySelector(".bg__video");
  var bg = video.parentElement;

  video.muted = true;
  video.defaultMuted = true;
  video.setAttribute("muted", "");

  function show() {
    bg.classList.add("is-playing");
  }

  function play() {
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  if (video.readyState >= 2) show();
  video.addEventListener("loadeddata", show, { once: true });
  video.addEventListener("playing", show, { once: true });

  play();

  ["touchstart", "pointerdown", "scroll"].forEach(function (type) {
    window.addEventListener(type, function () {
      if (video.paused) play();
    }, { once: true, passive: true });
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && video.paused) play();
  });
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
