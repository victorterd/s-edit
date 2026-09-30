// Background video: muted, looping YouTube embed with no player UI.
// It fades in only once it's actually playing, so YouTube's loading overlay never shows.
(function () {
  var wrap = document.querySelector(".bg__video");
  var bg = wrap.parentElement;
  var videoId = wrap.dataset.videoId;

  function hideCaptions(player) {
    try {
      player.unloadModule("captions");
      player.unloadModule("cc");
    } catch (err) {}
  }

  window.onYouTubeIframeAPIReady = function () {
    new YT.Player("bg-player", {
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        mute: 1,
        controls: 0,
        loop: 1,
        playlist: videoId,
        playsinline: 1,
        rel: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        cc_load_policy: 0,
      },
      events: {
        onReady: function (e) {
          e.target.mute();
          hideCaptions(e.target);
          e.target.playVideo();
        },
        onStateChange: function (e) {
          if (e.data === YT.PlayerState.PLAYING) {
            hideCaptions(e.target);
            bg.classList.add("is-playing");
          }
          if (e.data === YT.PlayerState.ENDED) e.target.seekTo(0);
        },
      },
    });
  };

  var tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
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
