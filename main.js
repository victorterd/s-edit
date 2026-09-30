// Preloader: the logo draws itself while the page and background video load,
// then slides into the hero logo's exact spot as the curtain lifts.
(function () {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  var root = document.documentElement;
  var pre = document.querySelector(".preloader");
  var logo = pre.querySelector(".preloader__logo");
  var num = pre.querySelector(".preloader__num");
  var target = document.querySelector(".hero__logo img");
  var video = document.querySelector(".bg__video");

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MIN = reduced ? 300 : 2200; // let the draw animation finish
  var MAX = 6000; // never hold the page longer than this
  var start = performance.now();
  var loaded = false;

  var pageLoaded = new Promise(function (resolve) {
    if (document.readyState === "complete") resolve();
    else window.addEventListener("load", resolve, { once: true });
  });
  var videoReady = new Promise(function (resolve) {
    if (video.readyState >= 3) resolve();
    video.addEventListener("canplay", resolve, { once: true });
    video.addEventListener("error", resolve, { once: true });
  });
  Promise.race([
    Promise.all([pageLoaded, videoReady]),
    new Promise(function (resolve) { setTimeout(resolve, MAX); }),
  ]).then(function () { loaded = true; });

  var shown = 0;
  function tick(now) {
    var t = Math.min((now - start) / MIN, 1);
    var goal = t * (loaded ? 100 : 90);
    shown += (goal - shown) * 0.12;
    if (loaded && t === 1 && shown > 99.5) shown = 100;
    num.textContent = Math.floor(shown);
    if (shown < 100) requestAnimationFrame(tick);
    else leave();
  }
  requestAnimationFrame(tick);

  function leave() {
    // FLIP the preloader logo onto the hero logo.
    var from = logo.getBoundingClientRect();
    var to = target.getBoundingClientRect();
    var scale = to.width / from.width;
    logo.style.transition = "transform 1s cubic-bezier(0.76, 0, 0.24, 1)";
    logo.style.transform =
      "translate(" + (to.left - from.left - from.width / 2) + "px, " +
      (to.top - from.top - from.height / 2) + "px) scale(" + scale + ")";

    pre.classList.add("is-leaving");

    setTimeout(function () {
      root.classList.add("is-loaded");
      pre.remove();
    }, reduced ? 50 : 1000);
  }
})();

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

  // Never leave the cover up for long, even if no video event fires.
  setTimeout(show, 2500);

  ["touchstart", "pointerdown", "scroll"].forEach(function (type) {
    window.addEventListener(type, function () {
      if (video.paused) play();
    }, { once: true, passive: true });
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && video.paused) play();
  });
})();

// Hero recedes as the about section slides over it.
(function () {
  var hero = document.querySelector(".hero");
  var ticking = false;

  function update() {
    var p = Math.min(Math.max(window.scrollY / window.innerHeight, 0), 1);
    hero.style.setProperty("--p", p.toFixed(4));
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
})();

// Scroll reveals: add .is-in once an element is well into view.
(function () {
  var items = document.querySelectorAll("[data-reveal]");

  if (!("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("is-in"); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -12% 0px" });

  items.forEach(function (el) { io.observe(el); });
})();

// Mobile menu
(function () {
  var burger = document.querySelector(".burger");
  var menu = document.getElementById("menu");

  function isOpen() {
    return document.body.classList.contains("menu-open");
  }

  function setOpen(open) {
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Închide meniul" : "Deschide meniul");
    menu.setAttribute("aria-hidden", String(!open));
    menu.inert = !open;
  }

  burger.addEventListener("click", function () {
    setOpen(!isOpen());
  });

  menu.addEventListener("click", function (e) {
    if (e.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen()) setOpen(false);
  });
})();
