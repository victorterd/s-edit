// Preloader: the logo draws itself while the page and background video load,
// then slides into the hero logo's exact spot as the curtain lifts.
(function () {
  var root = document.documentElement;
  var pre = document.querySelector(".preloader");
  // Pages without a preloader (e.g. the legal pages) are ready straight away.
  if (!pre) return root.classList.add("is-loaded");

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

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
  if (!video) return;
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
  var footer = document.querySelector(".footer");
  var track = reels && reels.querySelector(".reels__track");
  var desktop = window.matchMedia("(min-width: 768px)");
  var ticking = false;

  function update() {
    var vh = window.innerHeight;
    if (hero) {
      var p = Math.min(Math.max(window.scrollY / vh, 0), 1);
      hero.style.setProperty("--p", p.toFixed(4));
      // The pinned hero sits behind everything; hide it once it's covered so
      // it doesn't show through the transparent footer.
      hero.style.visibility = p >= 1 ? "hidden" : "";
    }

    // Header turns ink while a light section sits under its text.
    var line = header.firstElementChild.getBoundingClientRect();
    var mid = line.top + line.height / 2;
    var ink = false;
    inkSections.forEach(function (sec) {
      var r = sec.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) ink = true;
    });
    header.classList.toggle("is-dark", ink);

    if (footer) {
      var fr = footer.getBoundingClientRect();
      var f = Math.min(Math.max((vh - fr.top) / fr.height, 0), 1);
      footer.style.setProperty("--f", f.toFixed(4));
      header.classList.toggle("is-away", fr.top < line.bottom + 24);
    }

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

// Testimonials: the section pins and the scroll drives it. In each
// testimonial's stretch the words light up first, like a subtitle being
// read, then the track slides sideways to the next one.
(function () {
  var root = document.querySelector(".tst");
  if (!root) return;

  var track = root.querySelector(".tst__track");
  var items = [].slice.call(root.querySelectorAll(".tst__item"));
  var tabs = [].slice.call(root.querySelectorAll(".tst__tab"));
  var n = items.length;
  var READ = 0.6; // share of each stretch spent lighting words; the rest slides

  var words = items.map(function (item) {
    var q = item.querySelector(".tst__quote");
    q.innerHTML = q.textContent.trim().split(/\s+/).map(function (w) {
      return '<span class="w">' + w + "</span>";
    }).join(" ");
    return [].slice.call(q.querySelectorAll(".w"));
  });
  var lit = items.map(function () { return -1; });
  var active = -1;

  function stretch() { return window.innerHeight * 0.9; }

  function size() {
    root.style.setProperty("--tst-h", (window.innerHeight + n * stretch()) + "px");
    update();
  }

  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function update() {
    var top = root.getBoundingClientRect().top;
    var P = Math.min(Math.max(-top / stretch(), 0), n); // 0..n through the section

    // Slide position: move from i to i+1 during the last part of stretch i.
    var i = Math.min(Math.floor(P), n - 1);
    var local = P - i;
    var slide = i < n - 1 ? ease(Math.min(Math.max((local - READ) / (1 - READ), 0), 1)) : 0;
    track.style.setProperty("--tx", (i + slide).toFixed(4));

    items.forEach(function (item, k) {
      var l = Math.min(Math.max(P - k, 0), 1);
      var count = Math.round(Math.min(l / READ, 1) * words[k].length);
      if (count !== lit[k]) {
        words[k].forEach(function (w, j) { w.classList.toggle("is-lit", j < count); });
        lit[k] = count;
      }
      tabs[k].style.setProperty("--progress", l.toFixed(4));
    });

    var now = Math.min(Math.round(i + slide), n - 1);
    if (now !== active) {
      tabs.forEach(function (t, k) {
        t.classList.toggle("is-active", k === now);
        t.setAttribute("aria-selected", String(k === now));
      });
      active = now;
    }
  }

  // Clicking a client scrolls to where their quote is fully lit.
  tabs.forEach(function (tab, k) {
    tab.addEventListener("click", function () {
      var y = root.getBoundingClientRect().top + window.scrollY + (k + READ) * stretch();
      window.scrollTo({ top: y, behavior: reducedMotion ? "auto" : "smooth" });
    });
  });

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(function () { update(); ticking = false; });
    }
  }, { passive: true });
  window.addEventListener("resize", size);
  size();
})();

// Contact form: no backend yet, so it validates and then opens the visitor's
// email app with the message filled in.
(function () {
  var form = document.querySelector(".form");
  if (!form) return;
  var status = form.querySelector(".form__status");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = true;
    form.querySelectorAll(".field").forEach(function (field) {
      var input = field.querySelector("input, textarea");
      var valid = input.checkValidity() && input.value.trim() !== "";
      field.classList.toggle("is-invalid", !valid);
      if (!valid && ok) { input.focus(); ok = false; }
    });
    if (!ok) {
      status.textContent = "Completează numele, un email valid și mesajul.";
      return;
    }

    var data = new FormData(form);
    var types = data.getAll("type").join(", ") || "Nespecificat";
    var body = "Nume: " + data.get("name") + "\nEmail: " + data.get("email") +
      "\nProiect: " + types + "\n\n" + data.get("message");
    window.location.href = "mailto:hello@s-edit.ro?subject=" +
      encodeURIComponent("Proiect nou: " + types) + "&body=" + encodeURIComponent(body);
    status.textContent = "Se deschide aplicația de email cu mesajul completat.";
  });

  form.addEventListener("input", function (e) {
    var field = e.target.closest(".field");
    if (field) field.classList.remove("is-invalid");
  });
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
