// Sound effects (Howler.js) + haptics. Files live in assets/sfx (generated, CC0).
const Sfx = (() => {
  const NAMES = ['tap', 'tick', 'correct', 'taboo', 'skip', 'whoosh', 'countdown', 'go', 'timesup', 'dhol', 'win'];
  const sounds = {};
  let enabled = true;
  // iOS silences WebAudio when the ring/silent switch is on; HTML5 audio keeps playing. Use it there.
  const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  for (const n of NAMES) sounds[n] = new Howl({ src: [`assets/sfx/${n}.wav`], preload: true, html5: IOS, pool: 3 });

  function play(name, { rate = 1, volume = 1 } = {}) {
    if (!enabled) return;
    const h = sounds[name]; if (!h) return;
    const id = h.play();
    if (rate !== 1) h.rate(rate, id);
    if (volume !== 1) h.volume(volume, id);
  }
  function unlock() { try { if (Howler.ctx && Howler.ctx.state !== 'running') Howler.ctx.resume(); } catch (e) {} }
  function setEnabled(v) { enabled = v; Howler.mute(!v); }
  function buzz(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {} }
  return { play, unlock, setEnabled, buzz, get enabled() { return enabled; } };
})();
