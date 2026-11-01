const $ = s => document.querySelector(s);
const CFG = {
  bubbles: { easy: { speed: 45, base: 5, miss: 8, gap: .9 }, medium: { speed: 65, base: 6, miss: 6, gap: .75 }, hard: { speed: 90, base: 7, miss: 4, gap: .6 } },
  magnet: { easy: { time: 60, limit: 0 }, medium: { time: 45, limit: 4000 }, hard: { time: 30, limit: 2500 } }
};
const SETS = { home: 'asdfjkl'.split(''), top: 'qwertyuiop'.split(''), bottom: 'zxcvbnm'.split(''), all: 'abcdefghijklmnopqrstuvwxyz'.split('') };
const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const FING = { q: 1, a: 1, z: 1, p: 1, w: 2, s: 2, x: 2, o: 2, l: 2, e: 3, d: 3, c: 3, i: 3, k: 3 };
const COLORS = ['#FF9AA2', '#FFC27A', '#FFE46B', '#8FE3C8', '#C9A7F5', '#FFB3D1'];
let diff = 'medium', kset = 'home', mode = null, running = false, raf = 0, tick = 0, expire = 0, S = {};

/* decorations */
$('#title').innerHTML = 'Typo Town'.split('').map(c => c === ' ' ? ' ' : `<span style="color:${COLORS[Math.floor(Math.random() * 4) == 0 ? 0 : Math.floor(Math.random() * 5)].replace('#FFE46B', '#F5A300')}">${c}</span>`).join('');
$('#bgl').innerHTML = 'ABCDEFGHJKLMNPRSTW'.split('').map((c, i) => `<span style="left:${(i * 5.7) % 100}%;font-size:${28 + (i * 13) % 40}px;color:${['#FF6B6B', '#FFC93C', '#2EC4A0', '#9B5DE5'][i % 4]};animation-duration:${14 + (i * 3) % 14}s;animation-delay:-${(i * 2) % 14}s">${c}</span>`).join('');
$('#themeBtn').onclick = () => { const d = document.documentElement; const dark = getComputedStyle(d).colorScheme === 'dark'; d.dataset.theme = dark ? 'light' : 'dark' };

/* home selection */
function info() {
  const b = CFG.bubbles[diff], m = CFG.magnet[diff];
  $('#bubInfo').textContent = `${b.base}+ bubbles • ${b.miss} misses allowed`;
  $('#magInfo').textContent = `${m.time}s round • ${m.limit ? m.limit / 1000 + 's per key' : 'no per-key limit'}`;
}
$('#diffChips').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; diff = b.dataset.d; document.querySelectorAll('#diffChips .chip').forEach(x => x.classList.toggle('sel', x === b)); info() };
$('#setChips').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; kset = b.dataset.s; document.querySelectorAll('#setChips .chip').forEach(x => x.classList.toggle('sel', x === b)) };
document.querySelectorAll('[data-start]').forEach(b => b.onclick = () => start(b.dataset.start));
info();

function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id)) }
function say(t, c) { const m = $('#msg'); m.textContent = t; m.className = 'msg ' + (c || '') }
function hud(items) { $('#hud').innerHTML = items.map(([k, l, v]) => `<div class="pill"><small>${l}</small><b id="h_${k}">${v}</b></div>`).join('') }
function setH(k, v) { const e = $('#h_' + k); if (e) e.textContent = v }
const dName = { easy: '🌱 Easy', medium: '🌼 Medium', hard: '🔥 Hard' };

/* central cleanup: only one loop/timer ever lives */
function stopAll() { running = false; cancelAnimationFrame(raf); raf = 0; clearInterval(tick); tick = 0; clearTimeout(expire); expire = 0; $('#arena').innerHTML = '' }

function start(m) {
  stopAll(); mode = m; S = { score: 0, wrong: 0 };
  show('game'); $('#bubView').style.display = m === 'bubbles' ? 'block' : 'none'; $('#magView').style.display = m === 'magnet' ? 'block' : 'none';
  $('#kin').value = ''; focusIn();
  m === 'bubbles' ? startBubbles() : startMagnet();
}
function focusIn() { try { $('#kin').focus({ preventScroll: true }) } catch (e) { } }
$('#kbTap').onclick = e => { e.preventDefault(); focusIn() };
$('#restartBtn').onclick = () => start(mode);
$('#resetBtn').onclick = () => {
  stopAll(); mode = null; diff = 'medium'; kset = 'home'; S = {};
  document.querySelectorAll('#diffChips .chip').forEach(x => x.classList.toggle('sel', x.dataset.d === 'medium'));
  document.querySelectorAll('#setChips .chip').forEach(x => x.classList.toggle('sel', x.dataset.s === 'home'));
  info(); show('home')
};
$('#againBtn').onclick = () => start(mode);
$('#homeBtn').onclick = () => { stopAll(); show('home') };

/* ---------- BUBBLES ---------- */
function startBubbles() {
  const c = CFG.bubbles[diff];
  Object.assign(S, { misses: 0, pops: 0, level: 1, bubs: [], last: 0, spawnT: 0, combo: 0, best: 0, limit: c.miss });
  hud([['sc', 'Score', 0], ['lv', 'Level', 1], ['ms', 'Misses', `0/${c.miss}`], ['df', 'Mode', dName[diff]]]);
  say('Pop the letters! Wrong key = −2 points', '');
  running = true; raf = requestAnimationFrame(bubLoop);
}
function targetCount() { return CFG.bubbles[diff].base + Math.min(S.level - 1, 3) }
function spawnBubble() {
  const ar = $('#arena'), W = ar.clientWidth, H = ar.clientHeight;
  const used = S.bubs.map(b => b.ch), pool = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(l => !used.includes(l));
  const ch = pool[Math.floor(Math.random() * pool.length)];
  let x = 0; for (let i = 0; i < 12; i++) { x = 10 + Math.random() * (W - 82); if (!S.bubs.some(b => b.y > H - 110 && Math.abs(b.x - x) < 70)) break }
  const el = document.createElement('div'); el.className = 'bub'; el.textContent = ch.toUpperCase();
  el.style.background = COLORS[Math.floor(Math.random() * COLORS.length)]; el.style.left = '0'; el.style.top = '0';
  ar.appendChild(el); S.bubs.push({ el, ch, x, y: H + 10, sp: 1 + Math.random() * .25 });
}
function bubLoop(t) {
  if (!running) return;
  const dt = S.last ? Math.min((t - S.last) / 1000, .05) : 0; S.last = t;
  const c = CFG.bubbles[diff], speed = c.speed * (1 + .12 * (S.level - 1));
  S.spawnT -= dt;
  if (S.bubs.length < targetCount() && S.spawnT <= 0) { spawnBubble(); S.spawnT = c.gap / (1 + .05 * S.level) }
  for (const b of [...S.bubs]) {
    b.y -= speed * b.sp * dt; b.el.style.transform = `translate(${b.x}px,${b.y}px)`;
    if (b.y <= 14) { // reached top = miss
      S.bubs = S.bubs.filter(q => q !== b); b.el.classList.add('miss'); setTimeout(() => b.el.remove(), 250);
      S.misses++; S.combo = 0; setH('ms', `${S.misses}/${S.limit}`); say('Oops! A bubble escaped 😢', 'no');
      if (S.misses >= S.limit) return endGame('Game over', '😵');
    }
  }
  raf = requestAnimationFrame(bubLoop);
}
function bubKey(k) {
  const b = S.bubs.find(q => q.ch === k);
  if (b) {
    S.bubs = S.bubs.filter(q => q !== b); b.el.classList.add('gone'); b.el.style.transform += ' scale(1.6)'; setTimeout(() => b.el.remove(), 300);
    S.combo++; S.best = Math.max(S.best, S.combo); S.pops++; S.score += 10 + Math.min(S.combo - 1, 5);
    floatTxt('+' + (10 + Math.min(S.combo - 1, 5)), b.x, b.y, '#14917a'); say(S.combo > 2 ? `🔥 ${S.combo} in a row!` : 'Nice pop! 🎉', 'ok');
    if (S.pops % 6 === 0) { S.level++; setH('lv', S.level); say(`⭐ Level ${S.level}! Faster bubbles & more of them`, 'ok') }
  } else {
    S.wrong++; S.combo = 0; S.score = Math.max(0, S.score - 2); floatTxt('−2', $('#arena').clientWidth / 2, $('#arena').clientHeight / 2, '#FF4D6D');
    flash($('#arena')); say(`No bubble with “${k.toUpperCase()}”! −2 points`, 'no');
  }
  setH('sc', S.score);
}
function floatTxt(t, x, y, col) { const e = document.createElement('div'); e.className = 'float'; e.textContent = t; e.style.cssText = `left:${x}px;top:${y}px;color:${col}`; $('#arena').appendChild(e); setTimeout(() => e.remove(), 800) }
function flash(el) { el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad'); setTimeout(() => el.classList.remove('bad'), 300) }

/* ---------- KEYMAGNET ---------- */
function buildKb() {
  const set = SETS[kset];
  $('#kb').innerHTML = ROWS.map((r, i) => `<div class="row" style="margin-left:${i * 14}px">${[...r].map(k => `<div class="key f${FING[k] || 4}${set.includes(k) ? ' act' : ''}" data-k="${k}">${k.toUpperCase()}</div>`).join('')}</div>`).join('');
}
function startMagnet() {
  const c = CFG.magnet[diff];
  Object.assign(S, { ok: 0, times: [], left: c.time, tStart: 0, cur: '', combo: 0, best: 0, expired: 0 });
  buildKb();
  hud([['sc', 'Score', 0], ['tm', 'Time', c.time + 's'], ['ok', 'Correct', 0], ['no', 'Wrong', 0]]);
  $('#tbarWrap').style.display = c.limit ? 'block' : 'none';
  running = true; nextTarget(); say(`Press the glowing key! (${SETS[kset].length} keys in this set)`, '');
  tick = setInterval(() => { // single timer handles countdown + per-key bar
    S.left = Math.max(0, S.left - .1); setH('tm', Math.ceil(S.left) + 's');
    if (c.limit) $('#tbar').style.width = Math.max(0, 100 - (performance.now() - S.tStart) / c.limit * 100) + '%';
    if (S.left <= 0) endGame('Time’s up!', '⏰');
  }, 100);
}
function nextTarget() {
  const set = SETS[kset], c = CFG.magnet[diff]; let k;
  do { k = set[Math.floor(Math.random() * set.length)] } while (k === S.cur && set.length > 1);
  S.cur = k; S.tStart = performance.now();
  document.querySelectorAll('.key.tg').forEach(e => e.classList.remove('tg'));
  const ke = $(`.key[data-k="${k}"]`); if (ke) ke.classList.add('tg');
  const t = $('#tgt'); t.textContent = k.toUpperCase(); t.className = 'target';
  clearTimeout(expire);
  if (c.limit) { $('#tbar').style.width = '100%'; expire = setTimeout(() => { if (!running) return; S.wrong++; S.expired++; S.combo = 0; S.score = Math.max(0, S.score - 2); setH('no', S.wrong); setH('sc', S.score); say('Too slow! Next key ⏳', 'no'); flash2($('#tgt')); nextTarget() }, c.limit) }
}
function flash2(e) { e.classList.add('bad'); setTimeout(() => e.classList.remove('bad'), 300) }
function magKey(k) {
  if (k === S.cur) {
    const rt = performance.now() - S.tStart; S.times.push(rt); S.ok++; S.combo++; S.best = Math.max(S.best, S.combo);
    const bonus = Math.max(0, Math.round((2000 - rt) / 200)); S.score += 10 + bonus;
    setH('ok', S.ok); setH('sc', S.score); say(`Great! ${(rt / 1000).toFixed(2)}s ${bonus > 5 ? '⚡ super fast!' : '👍'}`, 'ok');
    const t = $('#tgt'); t.className = 'target good'; setTimeout(() => { if (running) nextTarget() }, 120); clearTimeout(expire);
  } else {
    S.wrong++; S.combo = 0; S.score = Math.max(0, S.score - 2); setH('no', S.wrong); setH('sc', S.score);
    say(`That was ${k.toUpperCase()}. Look for ${S.cur.toUpperCase()}! −2`, 'no'); flash2($('#tgt'));
    const ke = $(`.key[data-k="${k}"]`); if (ke) { ke.classList.add('fx'); setTimeout(() => ke.classList.remove('fx'), 300) }
  }
}

/* ---------- INPUT ---------- */
function onKey(k) { if (!running || !/^[a-z]$/.test(k)) return; mode === 'bubbles' ? bubKey(k) : magKey(k) }
document.addEventListener('keydown', e => {
  if (e.target.id === 'kin' || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.length === 1) onKey(e.key.toLowerCase());
});
$('#kin').addEventListener('keydown', e => { if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { e.preventDefault(); onKey(e.key.toLowerCase()) } });
$('#kin').addEventListener('input', e => { const v = e.target.value; e.target.value = ''; if (v) onKey(v.slice(-1).toLowerCase()) });

/* ---------- RESULTS ---------- */
function endGame(title, emoji) {
  stopAll();
  const st = (l, v) => `<div class="pill"><small>${l}</small><b>${v}</b></div>`;
  const tot = (S.pops || S.ok || 0) + S.wrong, acc = tot ? Math.round(((S.pops || S.ok || 0) / tot) * 100) : 0;
  let rows;
  if (mode === 'bubbles') {
    rows = [st('Bubbles popped', S.pops), st('Wrong keys', S.wrong), st('Misses', `${S.misses}/${S.limit}`), st('Level reached', S.level), st('Best streak', S.best), st('Accuracy', acc + '%'), st('Difficulty', dName[diff])];
  } else {
    const avg = S.times.length ? (S.times.reduce((a, b) => a + b, 0) / S.times.length / 1000).toFixed(2) + 's' : '–';
    const fast = S.times.length ? (Math.min(...S.times) / 1000).toFixed(2) + 's' : '–';
    rows = [st('Correct', S.ok), st('Incorrect', S.wrong), st('Timed out', S.expired), st('Avg response', avg), st('Fastest', fast), st('Best streak', S.best), st('Accuracy', acc + '%'), st('Key set', kset), st('Difficulty', dName[diff])];
  }
  $('#rEmoji').textContent = emoji; $('#rTitle').textContent = title; $('#rScore').textContent = S.score + ' pts';
  $('#rNote').textContent = S.score >= 150 ? '🌟🌟🌟 Typing superstar!' : S.score >= 60 ? '🌟🌟 Awesome progress!' : '🌟 Keep practising, you’re learning!';
  $('#rStats').innerHTML = rows.join(''); show('results');
}
