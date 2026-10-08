'use strict';

/* /kit/kindlemere.html: the whole park, the page every office door opens (owner 2026-10-08: "allow for any of the 3
   doors open up Kindlemere"; his pick: one park, three doors). Any room serves it. Clicking a keeper or anyone with
   them, in the realm or in a place's view, steps into that keeper's room; so does each place's button.
   The rooms' addresses come from /api/park: on this computer their 127.0.0.1 address, from the phone their tailnet
   one. */
(function () {
  const here = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  const rooms = {};
  const addressOf = (room) => (room ? (here ? room.local : room.phone) : null) || null;
  // A character's key names its place: nutrition-summer is in the Orchard; the dog lives in Lakeside Field.
  const roomOf = (key) => {
    if (key === 'dog') return rooms['dog-training'];
    const k = Object.keys(rooms).filter((r) => key === r || key.startsWith(`${r}-`)).sort((a, b) => b.length - a.length)[0];
    return k ? rooms[k] : null;
  };

  window.addEventListener('kindlemere:character', (e) => {
    const to = addressOf(roomOf(String((e.detail && e.detail.key) || '')));
    if (!to) return;
    e.preventDefault();
    location.href = to;
  });

  window.kit.api('/api/park').then((park) => {
    for (const r of park.rooms || []) rooms[r.key] = r;
    let shut = 0;
    document.querySelectorAll('[data-room]').forEach((card) => {
      const way = card.querySelector('[data-way]');
      const to = addressOf(rooms[card.getAttribute('data-room')]);
      if (to) { way.href = to; way.removeAttribute('aria-disabled'); } else shut += 1;
    });
    if (shut) document.getElementById('shut').textContent = here
      ? 'A room has no address on this computer yet. Its agent.config.json needs a port.'
      : "A room isn't open to your phone yet. It opens on the computer Kindlemere runs on.";
  }).catch(() => {
    document.getElementById('shut').textContent = "The ways in didn't load. Reload the page to try again.";
  });
}());
