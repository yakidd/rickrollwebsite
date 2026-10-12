/*
 * Shared payload. Any bait page includes this and arms its triggers:
 *
 *   <script src="rickroll.js"></script>
 *   <script>Rickroll.arm('.trap')</script>
 *
 * To leave no escape, also call Rickroll.ambush(): any tap anywhere fires it,
 * and if nobody taps it fires anyway, muted, with a TAP FOR SOUND prompt.
 *
 * Video sources are tried in order: a copy in the repo, archive.org, then a
 * YouTube embed if every file fails or stalls.
 */
(function () {
  const root = document.currentScript.src.replace(/[^/]*$/, '');
  const SOURCES = [
    root + 'rickroll.mp4',
    'https://archive.org/download/rick-roll/Rick%20Roll.mp4',
    'https://dn720407.ca.archive.org/0/items/rick-roll/Rick%20Roll.mp4',
  ];
  const YOUTUBE = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&controls=0&loop=1&playlist=dQw4w9WgXcQ&playsinline=1&rel=0&modestbranding=1';
  const COLOURS = ['#f2994a', '#eb5757', '#56ccf2', '#6fcf97', '#bb6bd9', '#f2c94c', '#2f80ed'];

  const css = `
    #rr { position: fixed; inset: 0; background: #000; display: none; z-index: 2147483000; }
    #rr.on { display: block; }
    #rr video, #rr iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; object-fit: contain; background: #000; }
    #rr iframe { display: none; }
    #rr canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
    #rr .gotcha { position: absolute; left: 50%; bottom: max(24px, env(safe-area-inset-bottom)); transform: translateX(-50%);
      text-align: center; color: #fff; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      opacity: 0; transition: opacity .6s; pointer-events: none; width: max-content; max-width: 90vw; }
    #rr .gotcha.on { opacity: 1; pointer-events: auto; }
    #rr .gotcha p { margin: 0 0 10px; font-size: clamp(20px, 5vw, 36px); font-weight: 800; text-shadow: 0 2px 12px #000; }
    #rr .unmute { position: absolute; inset: 0; z-index: 2; display: none; place-items: center; border: 0; padding: 0;
      background: transparent; cursor: pointer; }
    #rr.muted .unmute { display: grid; }
    #rr .unmute span { padding: 18px 26px; border-radius: 16px; background: rgba(0,0,0,.75); color: #fff;
      font: 800 clamp(22px, 6vw, 40px)/1.2 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 0 0 4px #fff; animation: rrpulse 1s ease-in-out infinite; }
    @keyframes rrpulse { 50% { transform: scale(1.08); } }
    #rr .gotcha button { padding: 12px 20px; border: 0; border-radius: 999px; cursor: pointer; background: #fff; color: #000;
      font-family: inherit; font-size: 15px; font-weight: 600; }
  `;

  let el, video, frame, sprung = false;

  function build() {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    el = document.createElement('section');
    el.id = 'rr';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <video playsinline webkit-playsinline loop preload="none">
        ${SOURCES.map(s => `<source src="${s}" type="video/mp4">`).join('')}
      </video>
      <iframe title="video" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>
      <canvas></canvas>
      <button class="unmute" type="button"><span>🔇 TAP FOR SOUND</span></button>
      <div class="gotcha"><p>You just got rickrolled 🕺</p><button type="button">Pass it on</button></div>`;
    document.body.appendChild(el);

    video = el.querySelector('video');
    frame = el.querySelector('iframe');

    // with <source> children, failure fires on the last source, not the video
    video.querySelector('source:last-of-type').addEventListener('error', youtube, { once: true });
    // no "pause to escape"
    video.addEventListener('pause', () => {
      if (!frame.src) video.play().catch(() => {});
    });

    el.querySelector('.unmute').addEventListener('click', unmute);

    el.querySelector('.gotcha button').addEventListener('click', async () => {
      const url = location.href;
      try {
        if (navigator.share) await navigator.share({ title: document.querySelector('meta[property="og:title"]')?.content || document.title, url });
        else { await navigator.clipboard.writeText(url); alert('Link copied. Go get someone.'); }
      } catch (_) {}
    });
  }

  function youtube() {
    if (frame.src) return;
    frame.src = YOUTUBE + (el.classList.contains('muted') ? '&mute=1' : '');
    video.pause();
    video.style.display = 'none';
    frame.style.display = 'block';
  }

  function fullscreen() {
    const fs = el.requestFullscreen || el.webkitRequestFullscreen;
    if (fs) { try { const r = fs.call(el); if (r && r.catch) r.catch(() => {}); } catch (_) {} }
  }

  // muted: no tap yet, so browsers only allow silent playback and no fullscreen
  function spring(e, { muted = false } = {}) {
    if (e) e.preventDefault();
    if (sprung) return;
    sprung = true;

    el.classList.add('on');
    el.classList.toggle('muted', muted);
    el.removeAttribute('aria-hidden');
    document.title = 'Never gonna give you up';

    // play() must run synchronously inside the tap so browsers allow sound
    video.muted = muted;
    video.volume = 1;
    const p = video.play();
    if (p && p.catch) p.catch(youtube);
    // a stalled load never rejects, so give it a deadline
    setTimeout(() => { if (video.currentTime === 0) youtube(); }, 5000);

    if (!muted) fullscreen();
    if (navigator.vibrate) navigator.vibrate([120, 60, 120]);

    confetti(el.querySelector('canvas'));
    setTimeout(() => el.querySelector('.gotcha').classList.add('on'), muted ? 9000 : 4000);
  }

  // the reflex tap on a muted ambush: sound on, fullscreen
  function unmute(e) {
    if (e) e.preventDefault();
    el.classList.remove('muted');
    if (frame.src) {
      // a cross-origin player can't be unmuted from here; reload it inside this tap
      frame.src = YOUTUBE;
    } else {
      video.muted = false;
      video.play().catch(() => {});
    }
    fullscreen();
  }

  function confetti(c) {
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size();
    addEventListener('resize', size);

    const parts = Array.from({ length: 220 }, () => ({
      x: innerWidth / 2, y: innerHeight / 2,
      vx: (Math.random() - .5) * 18, vy: Math.random() * -18 - 4,
      w: 6 + Math.random() * 6, h: 4 + Math.random() * 4,
      r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3,
      color: COLOURS[Math.floor(Math.random() * COLOURS.length)],
    }));
    const end = performance.now() + 5000;

    (function frame(t) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of parts) {
        p.vy += .45; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (t < end) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    })(performance.now());
  }

  window.Rickroll = {
    arm(selector) {
      if (!el) build();
      document.addEventListener('click', e => {
        if (e.target.closest(selector)) spring(e);
      });
    },
    // any tap anywhere fires it; untouched, it fires muted after `after` ms
    // or once the reader is `scroll` of the way down the page
    ambush({ after = 8000, scroll = 0.4 } = {}) {
      if (!el) build();
      document.addEventListener('click', e => { if (!el.contains(e.target)) spring(e); });
      const silent = () => spring(null, { muted: true });
      setTimeout(silent, after);
      addEventListener('scroll', () => {
        const depth = (scrollY + innerHeight) / document.documentElement.scrollHeight;
        if (depth >= scroll) silent();
      }, { passive: true });
    },
    spring,
  };
})();
