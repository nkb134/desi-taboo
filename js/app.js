/* Desi Taboo — game engine. Depends on: words.js, audio.js, GSAP, canvas-confetti. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const TEAM_PRESETS = [
  { name: 'Team Masala', color: '#ff9933', emoji: '🌶️' },
  { name: 'Team Mirchi', color: '#ff2e88', emoji: '🔥' },
  { name: 'Team Chutney', color: '#14b8a6', emoji: '🍃' },
  { name: 'Team Jalebi', color: '#ffd60a', emoji: '🍥' },
];
const EMOJIS = ['🌶️', '🔥', '🍃', '🍥', '🐘', '🦚', '🏏', '🪔', '🥭', '🍛', '🛺', '🎬', '🐯', '🥥', '🎉', '🧿'];
const DIFF = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
const STORE = 'desi-taboo-v1';
const SEEN_STORE = 'desi-taboo-seen-v1';
const CIRC = 276.46;
const SWIPE_X = 95, SWIPE_Y = 110;

const state = {
  teams: [], settings: { time: 60, passes: 3, diff: 0, rounds: 3 }, sound: true,
  deck: [], pos: 0, turn: 0, round: null, card: null, timerId: null, wakeLock: null, seen: new Set(),
};

/* ---------- persistence ---------- */
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) || '{}');
    if (s.settings) Object.assign(state.settings, s.settings);
    if (typeof s.sound === 'boolean') state.sound = s.sound;
    state.teams = (s.teams && s.teams.length >= 2 ? s.teams : TEAM_PRESETS.slice(0, 2)).map((t, i) => ({ ...TEAM_PRESETS[i], ...t, score: 0 }));
  } catch (e) { state.teams = TEAM_PRESETS.slice(0, 2).map(t => ({ ...t, score: 0 })); }
}
function loadSeen() { try { state.seen = new Set(JSON.parse(localStorage.getItem(SEEN_STORE) || '[]')); } catch (e) { state.seen = new Set(); } }
function saveSeen() { try { localStorage.setItem(SEEN_STORE, JSON.stringify([...state.seen])); } catch (e) {} }
function save() {
  try { localStorage.setItem(STORE, JSON.stringify({ settings: state.settings, sound: state.sound, teams: state.teams.map(t => ({ name: t.name, emoji: t.emoji })) })); } catch (e) {}
}

/* ---------- helpers ---------- */
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const teamGrad = t => `linear-gradient(135deg, ${t.color}, #fff 140%)`;
const teamTitle = t => `<span class="emo">${t.emoji}</span> ${esc(t.name)}`;
const totalTurns = () => state.teams.length * state.settings.rounds;
const curTeam = () => state.teams[state.turn % state.teams.length];
const unlimited = () => state.settings.passes >= 99;

function show(id) {
  const next = $('#' + id), cur = $('.screen.active');
  if (cur === next) return;
  if (cur) { cur.classList.remove('active'); }
  next.classList.add('active');
}
const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const wait = ms => new Promise(r => setTimeout(r, ms));
function scoreboard(el, { mini = false, animate = false, bonus = null } = {}) {
  const val = t => t.score + (bonus && bonus.team === t ? bonus.delta : 0);
  const max = Math.max(1, ...state.teams.map(val));
  const lead = Math.max(...state.teams.map(val));
  const sorted = [...state.teams].sort((a, b) => val(b) - val(a));
  el.innerHTML = sorted.map(t => `
    <div class="score-row ${val(t) === lead && lead > 0 && !mini ? 'lead' : ''}" style="--c:${t.color}">
      <span class="bar" style="width:${animate ? 0 : Math.max(0, val(t)) / max * 100}%"></span>
      <span class="dot"></span><span class="nm">${t.emoji} ${esc(t.name)}</span>
      <span class="sc">${val(t)}${bonus && bonus.team === t ? `<small class="delta">${bonus.delta >= 0 ? '+' : ''}${bonus.delta}</small>` : ''}</span>
    </div>`).join('');
  if (animate) requestAnimationFrame(() => $$('.bar', el).forEach((b, i) => b.style.width = Math.max(0, val(sorted[i])) / max * 100 + '%'));
}

/* ---------- home ---------- */
function renderTeams() {
  const list = $('#team-list');
  list.innerHTML = state.teams.map((t, i) => `
    <div class="team-row" style="--c:${t.color}">
      <button class="avatar" data-i="${i}" aria-label="Change team emoji">${t.emoji}</button>
      <input maxlength="18" value="${esc(t.name)}" data-i="${i}" placeholder="${TEAM_PRESETS[i].name}" aria-label="Team ${i + 1} name">
      <button class="rm" data-i="${i}" aria-label="Remove team" ${state.teams.length <= 2 ? 'disabled' : ''}>✕</button>
    </div>`).join('');
  $('#btn-add-team').hidden = state.teams.length >= 4;
  $$('input', list).forEach(inp => inp.addEventListener('input', e => { state.teams[+e.target.dataset.i].name = e.target.value; save(); }));
  $$('.avatar', list).forEach(b => b.addEventListener('click', e => {
    const t = state.teams[+e.currentTarget.dataset.i], used = state.teams.map(x => x.emoji);
    let i = EMOJIS.indexOf(t.emoji);
    do { i = (i + 1) % EMOJIS.length; } while (used.includes(EMOJIS[i]));
    t.emoji = EMOJIS[i]; e.currentTarget.textContent = t.emoji; save(); Sfx.play('tap');
    gsap.fromTo(e.currentTarget, { scale: .6, rotation: -20 }, { scale: 1, rotation: 0, duration: .4, ease: 'back.out(3)' });
  }));
  $$('.rm', list).forEach(b => b.addEventListener('click', e => {
    Sfx.play('tap'); state.teams.splice(+e.currentTarget.dataset.i, 1);
    state.teams.forEach((t, i) => Object.assign(t, { color: TEAM_PRESETS[i].color }));
    save(); renderTeams();
  }));
}
function renderChips() {
  $$('.chips').forEach(g => {
    const key = g.dataset.setting;
    $$('button', g).forEach(b => b.classList.toggle('on', +b.dataset.v === state.settings[key]));
  });
  $('#btn-sound').textContent = state.sound ? '🔊' : '🔇';
}
function bindHome() {
  $$('.chips').forEach(g => g.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    state.settings[g.dataset.setting] = +b.dataset.v; save(); renderChips(); Sfx.play('tap');
    gsap.fromTo(b, { scale: .85 }, { scale: 1, duration: .35, ease: 'back.out(3)' });
  }));
  $('#btn-add-team').addEventListener('click', () => {
    if (state.teams.length >= 4) return;
    Sfx.play('tap'); state.teams.push({ ...TEAM_PRESETS[state.teams.length], score: 0 }); save(); renderTeams();
  });
  $('#btn-sound').addEventListener('click', () => { state.sound = !state.sound; Sfx.setEnabled(state.sound); save(); renderChips(); Sfx.play('tap'); });
  $('#btn-help').addEventListener('click', () => { Sfx.play('tap'); $('#modal-help').hidden = false; });
  $('#btn-help-close').addEventListener('click', () => { Sfx.play('tap'); $('#modal-help').hidden = true; });
  $('#modal-help').addEventListener('click', e => { if (e.target.id === 'modal-help') $('#modal-help').hidden = true; });
  $('#btn-start').addEventListener('click', startGame);
  $('#word-count').textContent = WORDS.length;
  $('#btn-reset-history').addEventListener('click', () => { Sfx.play('tap'); state.seen.clear(); saveSeen(); renderHistory(); toast('Word history cleared ✨'); });
  renderHistory();
}
function renderHistory() {
  const n = state.seen.size;
  $('#played-count').textContent = n;
  $('#btn-reset-history').hidden = n === 0;
}

/* ---------- game flow ---------- */
/* Deck excludes every word already played in this session (persisted), so nothing repeats
   until the whole pool for the chosen difficulty is exhausted — then that pool resets. */
function buildDeck() {
  const d = state.settings.diff;
  const pool = WORDS.filter(w => d === 0 || w[1] === d);
  let fresh = pool.filter(w => !state.seen.has(w[0]));
  if (!fresh.length) { pool.forEach(w => state.seen.delete(w[0])); saveSeen(); fresh = pool; toast('All words played — reshuffling the full deck 🔁'); }
  state.deck = shuffle(fresh.slice());
  state.pos = 0;
}
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.hidden = false; restart(el, 'show');
  clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 2600);
}
function startGame() {
  Sfx.unlock(); Sfx.play('dhol'); Sfx.buzz(30);
  state.teams.forEach((t, i) => { t.name = t.name.trim() || TEAM_PRESETS[i].name; t.score = 0; });
  save(); renderTeams(); buildDeck(); state.turn = 0;
  handoff();
}
function handoff() {
  const t = curTeam(), round = Math.floor(state.turn / state.teams.length) + 1;
  $('#handoff-round').textContent = `Round ${round} of ${state.settings.rounds} · Turn ${state.turn + 1} of ${totalTurns()}`;
  $('#handoff-avatar').textContent = t.emoji;
  $('#handoff-team').textContent = t.name;
  const others = state.teams.filter(x => x !== t);
  $('#handoff-buzzer').innerHTML = `<b>${others.map(x => x.emoji + ' ' + esc(x.name)).join(' & ')}</b> watch the screen and hit <b>Taboo!</b> if a banned word slips out.`;
  $('#handoff-team').style.setProperty('--team-grad', teamGrad(t));
  $('#handoff-progress').innerHTML = Array.from({ length: totalTurns() }, (_, i) => `<i class="${i < state.turn ? 'done' : i === state.turn ? 'now' : ''}" style="--c:${state.teams[i % state.teams.length].color}"></i>`).join('');
  scoreboard($('#handoff-scores'), { mini: true });
  show('screen-handoff');
}
async function countdown() {
  Sfx.unlock(); Sfx.play('tap');
  show('screen-countdown');
  const el = $('#countdown-num');
  for (const n of ['3', '2', '1', 'GO!']) {
    el.textContent = n;
    if (n === 'GO!') { Sfx.play('go'); Sfx.buzz([40, 40, 80]); } else { Sfx.play('countdown'); Sfx.buzz(20); }
    restart(el, 'go');
    await wait(n === 'GO!' ? 700 : 850);
  }
  startRound();
}
async function keepAwake(on) {
  try {
    if (on && navigator.wakeLock) state.wakeLock = await navigator.wakeLock.request('screen');
    else if (!on && state.wakeLock) { await state.wakeLock.release(); state.wakeLock = null; }
  } catch (e) {}
}
function startRound() {
  const t = curTeam();
  state.round = { team: t, cards: [], score: 0, passes: state.settings.passes, endsAt: Date.now() + state.settings.time * 1000, lastSec: state.settings.time };
  $('#round-team').textContent = `${t.emoji} ${t.name}`;
  $('#round-num').textContent = `R${Math.floor(state.turn / state.teams.length) + 1}`;
  $('#round-dot').style.setProperty('--c', t.color);
  $('#timer').classList.remove('urgent');
  updateHud(); show('screen-round'); keepAwake(true);
  nextCard();
  clearInterval(state.timerId);
  state.timerId = setInterval(tick, 100);
}
function updateHud() {
  const r = state.round;
  $('#round-score').textContent = (r.score >= 0 ? '+' : '') + r.score;
  $('#round-skips').textContent = unlimited() ? '↷ ∞' : `↷ ${r.passes}`;
  $('#btn-skip').disabled = !unlimited() && r.passes <= 0;
}
function tick() {
  const r = state.round; if (!r) return;
  const left = Math.max(0, r.endsAt - Date.now()), sec = Math.ceil(left / 1000);
  $('#timer-bar').style.strokeDashoffset = CIRC * (1 - left / (state.settings.time * 1000));
  $('#timer-num').textContent = sec;
  if (sec <= 10) $('#timer').classList.add('urgent');
  if (sec !== r.lastSec) { r.lastSec = sec; if (sec <= 5 && sec > 0) { Sfx.play('tick', { rate: 1 + (5 - sec) * .08 }); Sfx.buzz(15); } }
  if (left <= 0) endRound();
}
function nextCard() {
  if (state.pos >= state.deck.length) buildDeck();
  const w = state.deck[state.pos++];
  state.card = w; state.seen.add(w[0]); saveSeen(); renderHistory();
  const card = $('#card');
  $('#card-word').textContent = w[0];
  $('#card-diff').textContent = DIFF[w[1]]; $('#card-diff').className = 'badge d' + w[1];
  $('#card-cat').textContent = w[2];
  $('#card-taboo').innerHTML = w[3].map(x => `<li>${esc(x)}</li>`).join('');
  gsap.killTweensOf(card);
  gsap.set(card, { x: 0, y: 0, rotation: 0, opacity: 1, scale: 1 });
  gsap.set('.stamp', { opacity: 0 });
  restart(card, 'in');
  fitWord();
}
function fitWord() {
  const el = $('#card-word'); el.style.fontSize = '';
  let size = parseFloat(getComputedStyle(el).fontSize);
  while (el.scrollWidth > el.clientWidth && size > 22) { size -= 2; el.style.fontSize = size + 'px'; }
}
function resolve(kind) {
  const r = state.round; if (!r || !state.card) return;
  if (kind === 'skip' && !unlimited()) { if (r.passes <= 0) { shake($('#btn-skip')); return; } r.passes--; }
  r.cards.push({ w: state.card, r: kind });
  r.score += kind === 'got' ? 1 : kind === 'taboo' ? -1 : 0;
  const fx = { got: () => { Sfx.play('correct'); Sfx.buzz(40); flash('flash-got'); }, taboo: () => { Sfx.play('taboo'); Sfx.buzz([60, 40, 60]); flash('flash-taboo'); }, skip: () => { Sfx.play('skip'); Sfx.buzz(20); } };
  fx[kind]();
  pulse($('#round-score'));
  updateHud();
  const card = $('#card'), dir = kind === 'got' ? 1 : kind === 'taboo' ? -1 : 0;
  state.card = null;
  gsap.to(card, { x: dir * 420, y: dir === 0 ? -520 : 40, rotation: dir * 25, opacity: 0, duration: .32, ease: 'power2.in', onComplete: () => { if (state.round) nextCard(); } });
}
function flash(cls) { document.body.classList.remove('flash-got', 'flash-taboo'); void document.body.offsetWidth; document.body.classList.add(cls); }
function pulse(el) { gsap.fromTo(el, { scale: 1.35 }, { scale: 1, duration: .4, ease: 'back.out(3)' }); }
function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); Sfx.buzz([30, 30, 30]); }

/* ---------- swipe gestures ---------- */
function bindSwipe() {
  const card = $('#card'); let sx = 0, sy = 0, dx = 0, dy = 0, drag = false;
  card.addEventListener('pointerdown', e => { if (!state.card) return; drag = true; sx = e.clientX; sy = e.clientY; dx = dy = 0; card.setPointerCapture(e.pointerId); gsap.killTweensOf(card); });
  card.addEventListener('pointermove', e => {
    if (!drag) return; dx = e.clientX - sx; dy = e.clientY - sy;
    gsap.set(card, { x: dx, y: dy * .6, rotation: dx / 14 });
    const skipOk = unlimited() || state.round.passes > 0;
    gsap.set('.stamp.got', { opacity: Math.min(1, Math.max(0, dx) / SWIPE_X) });
    gsap.set('.stamp.taboo', { opacity: Math.min(1, Math.max(0, -dx) / SWIPE_X) });
    gsap.set('.stamp.skip', { opacity: skipOk ? Math.min(1, Math.max(0, -dy) / SWIPE_Y) * (Math.abs(dx) < 60 ? 1 : 0) : 0 });
  });
  const end = () => {
    if (!drag) return; drag = false;
    if (dx > SWIPE_X) return resolve('got');
    if (dx < -SWIPE_X) return resolve('taboo');
    if (dy < -SWIPE_Y && Math.abs(dx) < 60) { if (unlimited() || state.round.passes > 0) return resolve('skip'); }
    gsap.to(card, { x: 0, y: 0, rotation: 0, duration: .5, ease: 'elastic.out(1, .5)' });
    gsap.to('.stamp', { opacity: 0, duration: .2 });
  };
  card.addEventListener('pointerup', end); card.addEventListener('pointercancel', end);
  card.addEventListener('contextmenu', e => e.preventDefault());
}

/* ---------- round end / summary ---------- */
function endRound() {
  clearInterval(state.timerId); state.timerId = null; keepAwake(false);
  Sfx.play('timesup'); Sfx.buzz([100, 60, 100, 60, 200]);
  state.card = null;
  const r = state.round;
  $('#summary-team').innerHTML = teamTitle(r.team);
  $('#summary-team').style.setProperty('--team-grad', teamGrad(r.team));
  renderSummary();
  show('screen-summary');
  const el = $('#summary-score'), obj = { v: 0 };
  gsap.to(obj, { v: r.score, duration: .9, ease: 'power2.out', onUpdate: () => { const v = Math.round(obj.v); el.textContent = (v >= 0 ? '+' : '') + v; } });
  $$('#summary-list li').forEach((li, i) => li.style.animationDelay = (0.2 + i * 0.04) + 's');
}
function renderSummary() {
  const r = state.round;
  r.score = r.cards.reduce((s, c) => s + (c.r === 'got' ? 1 : c.r === 'taboo' ? -1 : 0), 0);
  const ICON = { got: '✓', taboo: '✕', skip: '↷' };
  $('#summary-list').innerHTML = r.cards.length ? r.cards.map((c, i) => `<li class="${c.r}" data-i="${i}"><span class="r">${ICON[c.r]}</span><span class="w">${esc(c.w[0])}</span><small>${DIFF[c.w[1]]}</small></li>`).join('')
    : '<li class="skip"><span class="r">…</span><span class="w">No words played this round</span></li>';
  $('#summary-score').textContent = (r.score >= 0 ? '+' : '') + r.score;
  scoreboard($('#summary-scores'), { mini: true, bonus: { team: r.team, delta: r.score } });
}
function bindSummary() {
  $('#summary-list').addEventListener('click', e => {
    const li = e.target.closest('li[data-i]'); if (!li) return;
    const c = state.round.cards[+li.dataset.i], order = ['got', 'skip', 'taboo'];
    c.r = order[(order.indexOf(c.r) + 1) % 3]; Sfx.play('tap'); renderSummary(); pulse($('#summary-score'));
  });
  $('#btn-next').addEventListener('click', () => {
    Sfx.play('tap'); const r = state.round; r.team.score += r.score; state.round = null; state.turn++;
    if (state.turn >= totalTurns()) gameOver(); else handoff();
  });
}

/* ---------- game over ---------- */
function gameOver() {
  const sorted = [...state.teams].sort((a, b) => b.score - a.score);
  const tie = sorted.length > 1 && sorted[0].score === sorted[1].score;
  const w = sorted[0];
  $('#winner-name').innerHTML = tie ? "It's a tie!" : teamTitle(w);
  $('#winner-name').style.setProperty('--team-grad', tie ? '' : teamGrad(w));
  $('#winner-msg').textContent = tie ? 'Dono teams ekdum barabar. Rematch?' : ['wins the game! Ekdum mast! 🎉', 'takes the crown! Paisa vasool! 👑', 'is the Taboo champion! 🥇'][Math.random() * 3 | 0];
  scoreboard($('#final-scores'), { animate: true });
  show('screen-over');
  Sfx.play('win'); Sfx.buzz([80, 50, 80, 50, 200]);
  celebrate(tie ? state.teams.map(t => t.color) : [w.color, '#ffffff', '#ffd60a']);
}
function celebrate(colors) {
  const end = Date.now() + 2800;
  confetti({ particleCount: 140, spread: 100, origin: { y: .6 }, colors });
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: .7 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: .7 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
function bindOver() {
  $('#btn-again').addEventListener('click', () => { Sfx.play('tap'); state.teams.forEach(t => t.score = 0); buildDeck(); state.turn = 0; handoff(); });
  $('#btn-home').addEventListener('click', () => { Sfx.play('tap'); renderTeams(); show('screen-home'); });
  $('#btn-quit').addEventListener('click', () => { Sfx.play('tap'); state.round = null; renderTeams(); show('screen-home'); });
  $('#btn-ready').addEventListener('click', countdown);
  $('#btn-got').addEventListener('click', () => resolve('got'));
  $('#btn-taboo').addEventListener('click', () => resolve('taboo'));
  $('#btn-skip').addEventListener('click', () => resolve('skip'));
}

/* ---------- init ---------- */
load(); loadSeen(); Sfx.setEnabled(state.sound);
renderTeams(); renderChips(); bindHome(); bindSwipe(); bindSummary(); bindOver();
document.addEventListener('pointerdown', Sfx.unlock, { once: true });
window.addEventListener('resize', () => { if (state.card) fitWord(); });
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
