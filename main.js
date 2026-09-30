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

// Scroll-linked effects: the hero recedes, the header switches ink/white,
// and the short-form rail drifts sideways.
(function () {
  var hero = document.querySelector(".hero");
  var header = document.querySelector(".site-header");
  var inkSections = document.querySelectorAll('[data-header="ink"]');
  var reels = document.querySelector(".reels");
  var track = reels && reels.querySelector(".reels__track");
  var desktop = window.matchMedia("(min-width: 768px)");
  var ticking = false;

  function update() {
    var vh = window.innerHeight;
    var p = Math.min(Math.max(window.scrollY / vh, 0), 1);
    hero.style.setProperty("--p", p.toFixed(4));

    // Header turns ink while a light section sits under its text.
    var line = header.firstElementChild.getBoundingClientRect();
    var mid = line.top + line.height / 2;
    var ink = false;
    inkSections.forEach(function (sec) {
      var r = sec.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) ink = true;
    });
    header.classList.toggle("is-dark", ink);

    if (track) {
      var r = reels.getBoundingClientRect();
      var max = Math.max(track.scrollWidth - reels.clientWidth, 0);
      var t;
      if (desktop.matches) {
        // Gentle drift while the rail passes through the viewport.
        t = (vh - r.top) / (vh + r.height);
      } else {
        // Pinned: the rail travels its full width while the section is held.
        t = -r.top / Math.max(r.height - vh, 1);
      }
      t = Math.min(Math.max(t, 0), 1);
      track.style.setProperty("--drift", (t * max).toFixed(1));
    }
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  // On phones the section is as tall as the sideways distance plus one screen.
  function sizePin() {
    if (!track) return;
    if (desktop.matches) {
      reels.style.removeProperty("--pin-h");
    } else {
      var travel = Math.max(track.scrollWidth - reels.clientWidth, 0);
      reels.style.setProperty("--pin-h", travel + window.innerHeight + "px");
    }
    update();
  }

  window.addEventListener("resize", sizePin);
  window.addEventListener("load", sizePin);
  sizePin();
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
      if (entry.isIntersecting) reveal(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px" });

  function reveal(el) {
    el.classList.add("is-in");
    io.unobserve(el);
  }

  items.forEach(function (el) { io.observe(el); });

  // Elements at the very end of the page may never clear the margin above,
  // because the page can't scroll any further: reveal them at the bottom.
  window.addEventListener("scroll", function () {
    var doc = document.documentElement;
    if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) {
      items.forEach(function (el) {
        if (!el.classList.contains("is-in") && el.getBoundingClientRect().top < window.innerHeight) reveal(el);
      });
    }
  }, { passive: true });
})();

var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Run a callback while an element is on screen, and another when it leaves.
function whileVisible(el, onEnter, onLeave) {
  if (!("IntersectionObserver" in window)) return onEnter();
  new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { (e.isIntersecting ? onEnter : onLeave)(); });
  }, { threshold: 0.25 }).observe(el);
}

// Medium-form timeline: the playhead runs through each clip and cuts to the
// next one; clicking a clip jumps there, at the point you clicked.
(function () {
  var root = document.querySelector(".timeline");
  if (!root) return;

  var clips = [].slice.call(root.querySelectorAll(".clip"));
  var frames = [].slice.call(root.querySelectorAll(".timeline__viewer img"));
  var head = root.querySelector(".timeline__head");
  var name = root.querySelector(".timeline__name");
  var tc = root.querySelector(".timeline__tc");

  var FPS = 24;
  var weights = clips.map(function (c) { return parseFloat(c.style.getPropertyValue("--w")) || 1; });
  var starts = weights.map(function (_, i) {
    return weights.slice(0, i).reduce(function (a, b) { return a + b; }, 0);
  });

  var current = 0;
  var progress = 0;
  var visible = false;
  var hovering = false;
  var last = 0;

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function timecode(seconds) {
    var f = Math.floor((seconds % 1) * FPS);
    var s = Math.floor(seconds);
    return pad(Math.floor(s / 3600)) + ":" + pad(Math.floor(s / 60) % 60) + ":" + pad(s % 60) + ":" + pad(f);
  }

  function render() {
    var c = clips[current];
    head.style.setProperty("--ph", (c.offsetLeft + progress * c.offsetWidth).toFixed(1) + "px");
    // Each unit of clip width stands for 18 seconds of footage.
    tc.textContent = timecode((starts[current] + progress * weights[current]) * 18);
  }

  function select(i, at) {
    if (i !== current) {
      frames.forEach(function (f) { f.classList.remove("is-prev"); });
      frames[current].classList.remove("is-active");
      frames[current].classList.add("is-prev");
      frames[i].classList.remove("is-active");
      void frames[i].offsetWidth; // restart the wipe
      frames[i].classList.add("is-active");

      clips[current].classList.remove("is-active");
      clips[current].setAttribute("aria-pressed", "false");
      clips[i].classList.add("is-active");
      clips[i].setAttribute("aria-pressed", "true");
      name.textContent = clips[i].getAttribute("aria-label");
      current = i;
    }
    progress = at || 0;
    render();
  }

  function tick(now) {
    if (!visible) return;
    var dt = last ? now - last : 0;
    last = now;
    if (!hovering && !reducedMotion) {
      progress += dt / (weights[current] * 3200);
      if (progress >= 1) select((current + 1) % clips.length);
      else render();
    }
    requestAnimationFrame(tick);
  }

  clips.forEach(function (clip, i) {
    clip.addEventListener("click", function (e) {
      var r = clip.getBoundingClientRect();
      var at = e.clientX ? Math.min(Math.max((e.clientX - r.left) / r.width, 0), 0.98) : 0;
      select(i, at);
    });
  });

  root.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") hovering = true; });
  root.addEventListener("pointerleave", function () { hovering = false; });
  window.addEventListener("resize", render);

  whileVisible(root, function () {
    if (visible) return;
    visible = true;
    last = 0;
    requestAnimationFrame(tick);
  }, function () { visible = false; });

  render();
})();

// Marquee: two rows drift in opposite directions. Scrolling speeds them up
// and flips them to follow the scroll direction; hovering slows them down.
(function () {
  var section = document.querySelector(".mq");
  if (!section) return;

  var rows = [].slice.call(section.querySelectorAll(".mq__row")).map(function (row) {
    return {
      inner: row.querySelector(".mq__inner"),
      group: row.querySelector(".mq__group"),
      speed: parseFloat(row.dataset.speed),
      dir: parseFloat(row.dataset.dir),
      x: 0,
    };
  });

  if (reducedMotion) return;

  var running = false;
  var last = 0;
  var lastY = window.scrollY;
  var boost = 0;       // extra speed from scrolling, decays over time
  var flip = 1;        // 1 = scrolling down, -1 = scrolling up
  var slow = 1;        // eases toward 0.25 on hover
  var hovering = false;

  window.addEventListener("scroll", function () {
    var dy = window.scrollY - lastY;
    lastY = window.scrollY;
    if (dy) flip = dy > 0 ? 1 : -1;
    boost = Math.min(boost + Math.abs(dy) * 0.6, 900);
  }, { passive: true });

  section.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") hovering = true; });
  section.addEventListener("pointerleave", function () { hovering = false; });

  function frame(now) {
    if (!running) return;
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    boost *= Math.pow(0.04, dt); // fades out within about a second
    slow += ((hovering ? 0.25 : 1) - slow) * Math.min(dt * 5, 1);

    rows.forEach(function (r) {
      var w = r.group.offsetWidth;
      if (!w) return;
      r.x += (r.speed + boost) * slow * r.dir * flip * dt;
      // keep x within one group width so the loop is seamless
      if (r.x <= -w) r.x += w;
      if (r.x > 0) r.x -= w;
      var skew = Math.max(Math.min(boost * 0.01, 6), 0) * -r.dir * flip;
      r.inner.style.transform = "translate3d(" + r.x.toFixed(2) + "px,0,0) skewX(" + skew.toFixed(2) + "deg)";
    });
    requestAnimationFrame(frame);
  }

  // Row b starts offset so the two rows don't line up.
  rows[1] && (rows[1].x = -rows[1].group.offsetWidth / 2);

  whileVisible(section, function () {
    if (running) return;
    running = true;
    last = 0;
    requestAnimationFrame(frame);
  }, function () { running = false; });
})();

// Testimonials: each quote lights up word by word, holds, then hands over
// to the next; the tab bars show how long is left. Tabs switch directly.
(function () {
  var root = document.querySelector(".tst");
  if (!root) return;

  var items = [].slice.call(root.querySelectorAll(".tst__item"));
  var tabs = [].slice.call(root.querySelectorAll(".tst__tab"));
  var durations = [];

  items.forEach(function (item, i) {
    var q = item.querySelector(".tst__quote");
    var words = q.textContent.trim().split(/\s+/);
    q.innerHTML = words.map(function (w, n) {
      return '<span class="w" style="--i: ' + n + '">' + w + "</span>";
    }).join(" ");
    item.style.setProperty("--n", words.length);
    // time to "read" the words, then a pause to take it in
    durations[i] = words.length * 70 + 5200;
  });

  var current = 0;
  var elapsed = 0;
  var visible = false;
  var last = 0;

  function show(i) {
    items[current].classList.remove("is-active");
    items[current].hidden = true;
    tabs[current].classList.remove("is-active");
    tabs[current].setAttribute("aria-selected", "false");
    tabs[current].style.setProperty("--progress", 0);

    current = i;
    elapsed = 0;
    items[i].hidden = false;
    void items[i].offsetWidth; // restart the word sequence
    items[i].classList.add("is-active");
    tabs[i].classList.add("is-active");
    tabs[i].setAttribute("aria-selected", "true");
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { if (i !== current) show(i); });
  });

  function tick(now) {
    if (!visible) return;
    var dt = last ? now - last : 0;
    last = now;
    elapsed += dt;
    var p = Math.min(elapsed / durations[current], 1);
    tabs[current].style.setProperty("--progress", p.toFixed(4));
    if (p >= 1) show((current + 1) % items.length);
    requestAnimationFrame(tick);
  }

  if (reducedMotion) return;

  var started = false;

  whileVisible(root, function () {
    if (visible) return;
    visible = true;
    last = 0;
    // Play the first quote's word sequence when it's actually seen.
    if (!started) {
      started = true;
      items[0].classList.remove("is-active");
      void items[0].offsetWidth;
      items[0].classList.add("is-active");
    }
    requestAnimationFrame(tick);
  }, function () { visible = false; });
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
