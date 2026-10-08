'use strict';

/* /kit/kindlemere.html: the whole park, the page every office door opens (owner 2026-10-08: "allow for any of the 3
   doors open up Kindlemere"; his pick: one park, three doors). Any room serves it.
   Clicking a keeper (Avo, Steady, Tumble) steps into that keeper's room, by a camera move through the one world
   (window.kindlemere.go); so do the signpost's arms, the bar's ways (/kit/kit.js) and each place's button. The keepers'
   company answer where they stand, and the dog plays fetch anywhere in the park (/kit/kindlemere-dog.js).
   The rooms' addresses come from kit.address: on this computer their 127.0.0.1 address, from the phone their tailnet
   one. */
(function () {
  const KEEPERS = ['nutrition', 'fitness', 'dog-training'];
  const ways = {};   // each keeper's room, once the park has answered
  const go = (to, key) => {
    if (window.kindlemere && typeof window.kindlemere.go === 'function') window.kindlemere.go(to, key);
    else location.href = to;
  };

  window.addEventListener('kindlemere:character', (e) => {
    const key = String((e.detail && e.detail.key) || '');
    if (!ways[key]) return;   // anyone but a keeper answers in the scene's own bubble
    e.preventDefault();
    go(ways[key], key);
  });

  // Each place's still picture, on its card, is a way in too (its button is the keyboard's way).
  document.querySelectorAll('[data-room] img').forEach((img) => {
    const key = img.closest('[data-room]').getAttribute('data-room');
    img.addEventListener('click', () => { if (ways[key]) go(ways[key], key); });
  });

  const shut = document.getElementById('shut');
  window.kit.park().then(async (rooms) => {
    if (!rooms.length) { shut.textContent = "The ways in didn't load. Reload the page to try again."; return; }
    for (const key of KEEPERS) {
      const to = await window.kit.address(key);
      if (to) ways[key] = to;
    }
    let closed = 0;
    document.querySelectorAll('[data-room]').forEach((card) => {
      const key = card.getAttribute('data-room');
      const way = card.querySelector('[data-way]');
      const to = ways[key];
      if (!to) { closed += 1; return; }
      way.href = to;
      way.removeAttribute('aria-disabled');
      way.addEventListener('click', (e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        go(to, key);
      });
    });
    if (closed) {
      shut.textContent = /^(127\.0\.0\.1|localhost)$/.test(location.hostname)
        ? 'A room has no address on this computer yet. Its agent.config.json needs a port.'
        : "A room isn't open to your phone yet. It opens on the computer Kindlemere runs on.";
    }
  });
}());
