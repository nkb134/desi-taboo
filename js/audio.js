// Sound effects (Howler.js) + haptics. Files live in assets/sfx (generated, CC0).
const Sfx = (() => {
  const NAMES = ['tap', 'tick', 'correct', 'taboo', 'skip', 'whoosh', 'countdown', 'go', 'timesup', 'dhol', 'win'];
  const sounds = {};
  let enabled = true;
  for (const n of NAMES) sounds[n] = new Howl({ src: [`assets/sfx/${n}.wav`], preload: true });

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
