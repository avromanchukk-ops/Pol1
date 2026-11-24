// ================= MATCH (Tinder-style) + TIMER =================
const M = { phase: 'setup', mode: 'pass', src: 'owned', np: 2, time: 0, size: 12, deck: [], idx: 0, cur: 0, votes: [], names: [], hist: [], remote: null, reply: null };
const b64e = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
function encodeVotes(v) { return M.deck.map(id => v[id] === 2 ? 's' : v[id] === 1 ? 'l' : 'n').join(''); }
function makeCode(kind) {
  const x = {}; M.deck.forEach(id => { if (!CATALOG.some(c => c.id === id)) { const g = G(id); x[id] = [g.n, g.r, g.p[0], g.p[1], g.t[0], g.t[1], g.w, g.y]; } });
  return 'PLC1.' + b64e(JSON.stringify({ k: kind, d: M.deck, v: encodeVotes(M.votes[0]), n: M.names[0], x }));
}
function parseCode(code) {
  const raw = code.trim().replace(/^.*?(PLC1\.)/s, '$1').split(/\s/)[0];
  if (!raw.startsWith('PLC1.')) throw new Error('bad');
  const o = JSON.parse(b64d(raw.slice(5)));
  Object.entries(o.x || {}).forEach(([id, a]) => { if (!CAT[id]) { const h = hashStr(a[0]); CAT[id] = { id: +id, n: a[0], r: a[1], p: [a[2], a[3]], t: [a[4], a[5]], w: a[6], y: a[7], c: ['BGG'], d: '', m: ['hex', 'dots', 'waves', 'tri', 'stars'][h % 5], pal: [['#E9772E', '#7A2E12'], ['#2A8FBD', '#0D2338'], ['#7A3FB8', '#1E0E33']][h % 3] }; } });
  const votes = {}; o.d.forEach((id, i) => votes[id] = o.v[i] === 's' ? 2 : o.v[i] === 'l' ? 1 : 0);
  return { kind: o.k, deck: o.d, votes, name: o.n || 'Партнер' };
}
function buildDeck() {
  let ids = M.src === 'owned' ? ownedIds() : allIds();
  let list = ids.map(G).filter(g => g.p[0] <= M.np && g.p[1] >= M.np && (!M.time || g.t[0] <= M.time));
  // зважена випадковість: давно не грані та улюблені частіше
  list = list.map(g => { const lp = lastPlay(g.id); const d = lp ? daysSince(lp) : 200; return { g, k: Math.random() * (1 + Math.min(d, 300) / 100 + (g.fav ? .8 : 0)) }; }).sort((a, b) => b.k - a.k).map(x => x.g.id);
  return list.slice(0, M.size);
}
SCREENS.match = el => {
  el._cleanup = () => {};
  if (M.phase === 'setup') return matchSetup(el);
  if (M.phase === 'swipe') return matchSwipe(el);
  if (M.phase === 'handover') return matchHandover(el);
  if (M.phase === 'code') return matchCodeWait(el);
  if (M.phase === 'result') return matchResult(el);
};
function matchSetup(el) {
  const names = S.players.map(p => p.n);
  const cnt = (M.src === 'owned' ? ownedIds() : allIds()).map(G).filter(g => g.p[0] <= M.np && g.p[1] >= M.np && (!M.time || g.t[0] <= M.time)).length;
  el.innerHTML = `${topbar('Матч', { sub: 'Свайпайте разом — грайте в збіги' })}
  <div class="wrap fade-in">
   <div class="card" style="background:linear-gradient(135deg,rgba(255,61,127,.18),rgba(255,107,61,.08));border-color:rgba(255,61,127,.3);margin-bottom:14px">
    <div style="display:flex;gap:14px;align-items:center"><div style="font-size:44px">💘</div><div><b class="h-display" style="font-size:16px">Не знаєте, у що зіграти?</b><div class="muted" style="font-size:13px;margin-top:4px">Кожен свайпає ту саму колоду: ← ні, → так, ↑ дуже хочу. Ігри, які сподобались усім, — ваш вечір.</div></div></div></div>
   <div class="fld"><label>Як граємо</label>${segmented('mmode', [['pass', '📱 Один телефон'], ['code', '📲 Два телефони']], M.mode, v => { M.mode = v; if (v === 'code') M.np = Math.max(2, M.np); refreshTop(); })}</div>
   <div class="fld"><label>Звідки ігри</label><div class="chips wrapc">${[['owned', 'Моя полиця'], ['all', 'Уся база']].map(([v, l]) => `<button class="chip ${M.src === v ? 'on' : ''}" data-src="${v}">${l}</button>`).join('')}</div></div>
   <div class="fld"><label>Скільки вас</label><div class="chips wrapc">${[2, 3, 4, 5, 6].map(n => `<button class="chip ${M.np === n ? 'on' : ''}" data-np="${n}" ${M.mode === 'code' && n > 2 ? 'disabled style="opacity:.35"' : ''}>${n}</button>`).join('')}</div></div>
   <div class="fld"><label>Скільки маємо часу</label><div class="chips wrapc">${[[0, 'Скільки завгодно'], [30, '≤ 30 хв'], [60, '≤ 1 год'], [120, '≤ 2 год']].map(([v, l]) => `<button class="chip ${M.time === v ? 'on' : ''}" data-tm="${v}">${l}</button>`).join('')}</div></div>
   <div class="fld"><label>Карт у колоді</label><div class="chips wrapc">${[8, 12, 20].map(n => `<button class="chip ${M.size === n ? 'on' : ''}" data-sz="${n}">${n}</button>`).join('')}</div></div>
   ${M.mode === 'pass' ? `<div class="fld"><label>Гравці</label>${Array.from({ length: M.np }, (_, i) => `<input class="inp" style="margin-bottom:8px" data-nm="${i}" value="${esc(M.names[i] || names[i] || 'Гравець ' + (i + 1))}">`).join('')}</div>` : `<div class="fld"><label>Ваше ім’я</label><input class="inp" data-nm="0" value="${esc(M.names[0] || names[0] || 'Я')}"></div>`}
   <div class="muted" style="font-size:12.5px;margin:-4px 0 14px">Підходить ігор: <b style="color:var(--text)">${cnt}</b>${cnt < 3 ? ' — розширте фільтри або оберіть «Уся база»' : ''}</div>
   <button class="btn accent block" id="mgo" ${cnt < 2 ? 'disabled' : ''}>${ic('cards')} Почати свайпати</button>
   ${M.mode === 'code' ? `<button class="btn ghost block" style="margin-top:10px" id="mcode">У мене є код від партнера</button>` : ''}
  </div>`;
  $$('[data-src]', el).forEach(b => b.onclick = () => { M.src = b.dataset.src; refreshTop(); });
  $$('[data-np]', el).forEach(b => b.onclick = () => { M.np = +b.dataset.np; refreshTop(); });
  $$('[data-tm]', el).forEach(b => b.onclick = () => { M.time = +b.dataset.tm; refreshTop(); });
  $$('[data-sz]', el).forEach(b => b.onclick = () => { M.size = +b.dataset.sz; refreshTop(); });
  $$('[data-nm]', el).forEach(i => i.oninput = () => M.names[+i.dataset.nm] = i.value.trim());
  $('#mgo', el).onclick = () => {
    $$('[data-nm]', el).forEach(i => M.names[+i.dataset.nm] = i.value.trim() || 'Гравець ' + (+i.dataset.nm + 1));
    M.deck = buildDeck(); M.idx = 0; M.cur = 0; M.votes = Array.from({ length: M.mode === 'code' ? 1 : M.np }, () => ({})); M.hist = []; M.remote = null; M.reply = null;
    M.phase = 'swipe'; haptic(); refreshTop();
  };
  const mc = $('#mcode', el); if (mc) mc.onclick = () => {
    const sh = openSheet({ title: 'Код партнера', body: `<p class="muted" style="font-size:13px;margin-bottom:12px">Вставте код, який надіслав партнер. Ви свайпнете ту саму колоду і одразу побачите збіги.</p><textarea class="inp" id="cin" style="height:120px" placeholder="PLC1.…"></textarea>`, foot: `<button class="btn accent block" id="cok">Продовжити</button>` });
    $('#cok', sh.el).onclick = () => {
      try {
        const r = parseCode($('#cin', sh.el).value);
        if (r.kind === 'a') { M.names[0] = M.names[0] || S.players[0]?.n || 'Я'; M.deck = r.deck; M.remote = r; M.votes = [{}]; M.idx = 0; M.cur = 0; M.hist = []; M.phase = 'swipe'; sh.close(); refreshTop(); }
        else toast('Це код-відповідь — його вводять на екрані очікування');
      } catch (e) { toast('Код не розпізнано'); }
    };
  };
}
function matchSwipe(el) {
  const total = M.deck.length, name = M.names[M.cur] || 'Гравець';
  const col = S.players.find(p => p.n === name)?.col || PLAYER_COLORS[M.cur];
  el.innerHTML = `${topbar('Матч', { right: `<button class="iconbtn" id="mx">${ic('close')}</button>` })}
  <div class="who"><span class="av" style="background:${col}">${esc(name[0])}</span>Свайпає ${esc(name)} <span class="muted" style="margin-left:auto;font-size:13px">${Math.min(M.idx + 1, total)} / ${total}</span></div>
  <div class="mprog">${M.deck.map((_, i) => `<i class="${i < M.idx ? 'd' : ''}"></i>`).join('')}</div>
  <div class="match-stage" id="stage"></div>
  <div class="swipe-btns"><button class="sbtn s undo" id="bu">${ic('undo')}</button><button class="sbtn no" id="bn">${ic('close')}</button><button class="sbtn s sup" id="bs">${ic('star')}</button><button class="sbtn yes" id="by">${ic('heart')}</button></div>`;
  $('#mx', el).onclick = () => confirmSheet('Перервати матч? Свайпи буде втрачено.', 'Перервати', () => { M.phase = 'setup'; refreshTop(); });
  const stage = $('#stage', el);
  const renderCards = () => {
    stage.innerHTML = M.deck.slice(M.idx, M.idx + 3).map((id, i) => { const g = G(id); const lp = lastPlay(id);
      return `<div class="scard" data-i="${i}" style="z-index:${10 - i};transform:translateY(${i * 12}px) scale(${1 - i * .05});${i ? 'filter:brightness(.7)' : ''}">${poster(g)}<div class="shade"></div>
      ${g.r ? `<div class="bggbig" style="--p:${g.r * 10}"><span>${g.r.toFixed(1)}</span><small>BGG</small></div>` : ''}
      <div class="stamp like">ТАК</div><div class="stamp nope">НІ</div><div class="stamp sup">ДУЖЕ!</div>
      <div class="sbody"><div class="sname">${esc(g.n)}</div><div class="srow"><span class="spill">${ic('users')} ${g.p[0]}–${g.p[1]}</span><span class="spill">${ic('clock')} ${g.t[0]}${g.t[1] > g.t[0] ? '–' + g.t[1] : ''} хв</span><span class="spill" style="color:${COMPLEXITY[g.cx7].c}">${ic('weight')} ${g.cx7}/7 ${COMPLEXITY[g.cx7].n}</span>${lp ? `<span class="spill">${ic('calendar')} ${agoText(daysSince(lp))}</span>` : ''}</div><div class="sdesc">${esc(g.d || '')}</div></div></div>`; }).reverse().join('');
    const top = $('.scard[data-i="0"]', stage); if (top) bindDrag(top);
  };
  const decide = (v, dir) => {
    const top = $('.scard[data-i="0"]', stage); if (!top) return;
    const id = M.deck[M.idx]; M.votes[M.cur][id] = v; M.hist.push(id); haptic(v ? 18 : 8);
    const dx = dir === 'up' ? 0 : dir === 'left' ? -1 : 1;
    top.style.transition = 'transform .45s cubic-bezier(.2,.8,.2,1), opacity .45s'; top.style.transform = dir === 'up' ? 'translateY(-140%) rotate(0)' : `translateX(${dx * 150}%) rotate(${dx * 28}deg)`; top.style.opacity = '0';
    M.idx++;
    setTimeout(() => { if (M.idx >= M.deck.length) return finishPlayer(); $$('.mprog i', el).forEach((x, i) => x.classList.toggle('d', i < M.idx)); $('.who .muted', el).textContent = `${M.idx + 1} / ${total}`; renderCards(); }, 280);
  };
  function bindDrag(card) {
    let x0, y0, dx = 0, dy = 0, drag = false;
    const like = $('.stamp.like', card), nope = $('.stamp.nope', card), sup = $('.stamp.sup', card);
    card.addEventListener('pointerdown', e => { drag = true; x0 = e.clientX; y0 = e.clientY; card.classList.add('dragging'); card.setPointerCapture(e.pointerId); });
    card.addEventListener('pointermove', e => { if (!drag) return; dx = e.clientX - x0; dy = e.clientY - y0; card.style.transform = `translate(${dx}px,${dy}px) rotate(${dx / 14}deg)`; like.style.opacity = clamp(dx / 100, 0, 1); nope.style.opacity = clamp(-dx / 100, 0, 1); sup.style.opacity = clamp(-dy / 120 - Math.abs(dx) / 200, 0, 1); });
    const end = () => { if (!drag) return; drag = false; card.classList.remove('dragging');
      if (dx > 100) decide(1, 'right'); else if (dx < -100) decide(0, 'left'); else if (dy < -120) decide(2, 'up');
      else { card.style.transform = ''; [like, nope, sup].forEach(s => s.style.opacity = 0); } dx = dy = 0; };
    card.addEventListener('pointerup', end); card.addEventListener('pointercancel', end);
  }
  $('#bn', el).onclick = () => decide(0, 'left'); $('#by', el).onclick = () => decide(1, 'right'); $('#bs', el).onclick = () => decide(2, 'up');
  $('#bu', el).onclick = () => { if (!M.hist.length) return; const id = M.hist.pop(); delete M.votes[M.cur][id]; M.idx--; haptic(); refreshTop(); };
  renderCards();
}
function finishPlayer() {
  if (M.mode === 'pass' && M.cur < M.np - 1) { M.cur++; M.idx = 0; M.hist = []; M.phase = 'handover'; }
  else if (M.mode === 'code') {
    if (M.remote) { M.votes = [M.votes[0], M.remote.votes]; M.names = [M.names[0] || 'Я', M.remote.name]; M.reply = makeCode('b'); M.phase = 'result'; }
    else { M.phase = 'code'; }
  } else M.phase = 'result';
  refreshTop();
}
function matchHandover(el) {
  const name = M.names[M.cur];
  el.innerHTML = `<div class="handover"><div class="big">📱</div><div class="h-display" style="font-size:26px;font-weight:800">Передайте телефон</div><div class="muted">Тепер свайпає <b style="color:var(--text)">${esc(name)}</b>.<br>Не підглядайте — збіги покажемо в кінці 😉</div><button class="btn accent" id="hgo" style="margin-top:10px">Я — ${esc(name)}, поїхали</button></div>`;
  $('#hgo', el).onclick = () => { M.phase = 'swipe'; refreshTop(); };
}
function matchCodeWait(el) {
  const code = makeCode('a');
  el.innerHTML = `${topbar('Майже готово', { sub: 'Надішліть код партнеру' })}<div class="wrap fade-in">
   <div class="card"><h3>1. Ваш код</h3><div class="code-box">${code}</div>
   <button class="btn accent block" style="margin-top:12px" id="csh">${ic('share')} Надіслати партнеру</button></div>
   <div class="card" style="margin-top:12px"><h3>2. Код-відповідь партнера</h3><p class="muted" style="font-size:13px;margin-bottom:10px">Партнер вставить ваш код у «Матч → Два телефони → У мене є код», посвайпає і надішле відповідь.</p>
   <textarea class="inp" id="rin" style="height:96px" placeholder="PLC1.…"></textarea><button class="btn primary block" style="margin-top:10px" id="rok">Показати збіги</button></div>
   <button class="btn ghost block" style="margin-top:12px" id="cx">Скасувати</button></div>`;
  $('#csh', el).onclick = () => shareText(`💘 Полиця · Матч настолок від ${M.names[0]}. Встав цей код у додатку (Матч → Два телефони → У мене є код):\n${code}`);
  $('#rok', el).onclick = () => { try { const r = parseCode($('#rin', el).value); if (r.kind !== 'b') return toast('Це не код-відповідь'); M.votes = [M.votes[0], r.votes]; M.names[1] = r.name; M.phase = 'result'; refreshTop(); } catch (e) { toast('Код не розпізнано'); } };
  $('#cx', el).onclick = () => { M.phase = 'setup'; refreshTop(); };
}
function matchResult(el) {
  const scored = M.deck.map(id => { const vs = M.votes.map(v => v[id] || 0); return { id, vs, all: vs.every(x => x > 0), likes: vs.filter(x => x > 0).length, score: vs.reduce((a, b) => a + b, 0) + (G(id).r || 0) / 10 }; });
  const matches = scored.filter(x => x.all).sort((a, b) => b.score - a.score);
  const almost = scored.filter(x => !x.all && x.likes >= Math.max(1, M.votes.length - 1)).sort((a, b) => b.score - a.score).slice(0, 5);
  const best = matches[0] ? G(matches[0].id) : null;
  el.innerHTML = `${topbar('Результат', { right: `<button class="iconbtn" id="mre">${ic('sync')}</button>` })}
  <div class="matchres">${best ? `<h2>Це збіг!</h2><div class="muted">${M.names.map(esc).join(' + ')} хочуть зіграти</div>
   <div class="mcards">${poster(best)}${matches[1] ? poster(G(matches[1].id)) : poster(best)}</div>
   <div class="h-display" style="font-size:24px;font-weight:800;margin-top:6px">${esc(best.n)}</div>
   <div class="muted" style="font-size:13px">${matches[0].vs.includes(2) ? '⭐ хтось дуже хоче саме цю' : ''}</div>
   <div style="display:flex;gap:10px;margin-top:16px"><button class="btn accent block" onclick="App.logPlay(${best.id})">${ic('play')} Граємо!</button><button class="btn ghost" onclick="App.openTimer()">${ic('timer')}</button><button class="btn ghost" onclick="App.openGame(${best.id})">${ic('info')}</button></div>`
    : `<div style="font-size:60px;margin:20px 0 6px">🤷</div><h2 style="font-size:26px">Повних збігів немає</h2><div class="muted">Але є близькі варіанти — або спробуйте ще раз з іншою колодою.</div>`}
  </div>
  ${M.reply ? `<div class="wrap" style="margin-top:16px"><div class="card"><h3>Надішліть відповідь партнеру</h3><div class="code-box" style="max-height:80px;overflow:auto">${M.reply}</div><button class="btn primary block" style="margin-top:10px" id="rsh">${ic('share')} Надіслати код-відповідь</button></div></div>` : ''}
  ${matches.length > 1 ? `<div class="sec"><div class="sec-h"><h2>Усі збіги · ${matches.length}</h2></div><div class="row">${matches.map(m => tile(G(m.id), { meta: `<span>${m.vs.map(v => v === 2 ? '⭐' : '❤️').join('')}</span>` })).join('')}</div></div>` : ''}
  ${almost.length ? `<div class="sec"><div class="sec-h"><h2>Майже збіг</h2></div><div class="row">${almost.map(m => tile(G(m.id), { meta: `<span>${m.vs.map(v => v === 2 ? '⭐' : v ? '❤️' : '✕').join(' ')}</span>` })).join('')}</div></div>` : ''}`;
  if (best) setTimeout(confetti, 300);
  $('#mre', el).onclick = () => { M.phase = 'setup'; refreshTop(); };
  const r = $('#rsh', el); if (r) r.onclick = () => shareText(`💘 Полиця · відповідь на матч від ${M.names[0]}:\n${M.reply}`);
}

// ---------- TIMER ----------
const T = { mode: 'clock', base: 10, turn: 60, sel: null, ps: [], active: -1, running: false, startAt: 0, total: 0, round: 1, setup: true };
SCREENS.timer = el => {
  if (!T.sel) T.sel = S.players.slice(0, 2).map(p => p.n);
  if (T.setup) return timerSetup(el);
  const fmt = ms => { const neg = ms < 0; ms = Math.abs(ms); const s = Math.floor(ms / 1000); return (neg ? '−' : '') + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  el.innerHTML = `${topbar('Таймер', { back: true, sub: `${T.mode === 'clock' ? 'Шаховий годинник' : 'Ліміт на хід'} · раунд <span id="tr">${T.round}</span>`, right: `<button class="iconbtn" id="tset">${ic('settings')}</button>` })}
  <div class="tm-grid" id="tg" style="grid-template-columns:${T.ps.length > 3 ? '1fr 1fr' : '1fr'}">${T.ps.map((p, i) => `<div class="tm-p" data-i="${i}" style="--pc:${p.col}"><div class="tn"><span>${esc(p.n)}</span><span class="muted" style="font-size:12px" data-turns>${p.turns} ходів</span></div><div class="tt" data-t>0:00</div><div class="tbar" data-b></div></div>`).join('')}</div>
  <div class="tm-ctrl"><button class="btn ghost" id="tres">${ic('undo')}</button><button class="btn accent block" id="tplay">${ic(T.running ? 'pause' : 'play')} ${T.running ? 'Пауза' : T.active < 0 ? 'Старт' : 'Продовжити'}</button><button class="btn ghost" id="tnext">Далі →</button></div>
  <div class="wrap"><div class="card" style="display:flex;justify-content:space-between;align-items:center"><div><div class="muted" style="font-size:12px;font-weight:800">ЗАГАЛОМ ЗА ГРОЮ</div><div class="h-display" style="font-size:26px;font-weight:700" id="ttot">0:00</div></div><button class="btn sm ghost" id="tlog">${ic('plus')} В журнал</button></div>
  <p class="muted" style="font-size:12.5px;margin-top:12px;text-align:center">Торкніться картки активного гравця, щоб передати хід.</p></div>`;
  const cards = $$('.tm-p', el);
  const tick = () => {
    const now = Date.now();
    if (T.running && T.active >= 0) { const dt = now - T.startAt; T.startAt = now; T.total += dt; const p = T.ps[T.active]; p.used += dt; p.turnUsed += dt;
      if (T.mode === 'clock' && p.used >= T.base * 60000 && !p.flag) { p.flag = true; haptic(400); toast(`⏰ У ${p.n} скінчився час`); }
      if (T.mode === 'turn' && p.turnUsed >= T.turn * 1000 && !p.tflag) { p.tflag = true; haptic(300); toast(`⏰ ${p.n}, час ходу вийшов!`); } }
    T.ps.forEach((p, i) => { const c = cards[i]; if (!c) return; const left = T.mode === 'clock' ? T.base * 60000 - p.used : T.turn * 1000 - (i === T.active ? p.turnUsed : 0);
      $('[data-t]', c).textContent = fmt(left); $('[data-b]', c).style.width = clamp(left / (T.mode === 'clock' ? T.base * 60000 : T.turn * 1000) * 100, 0, 100) + '%';
      c.classList.toggle('on', i === T.active); c.classList.toggle('low', i === T.active && T.running && left < 10000); });
    $('#ttot', el).textContent = fmt(T.total);
  };
  const next = () => { if (T.active >= 0) T.ps[T.active].turns++; const cur = T.active; T.active = (T.active + 1) % T.ps.length; if (cur >= 0 && T.active === 0) T.round++; T.ps[T.active].turnUsed = 0; T.ps[T.active].tflag = false; T.startAt = Date.now(); if (!T.running) T.running = true; haptic(15);
    $('#tr', el) && ($('#tr', el).textContent = T.round); cards.forEach((c, i) => $('[data-turns]', c).textContent = T.ps[i].turns + ' ходів'); updBtn(); tick(); };
  const updBtn = () => { $('#tplay', el).innerHTML = `${ic(T.running ? 'pause' : 'play')} ${T.running ? 'Пауза' : 'Продовжити'}`; };
  cards.forEach((c, i) => c.onclick = () => {
    if (T.active < 0) { T.active = i; T.ps[i].turnUsed = 0; T.running = true; T.startAt = Date.now(); haptic(15); updBtn(); tick(); return; }
    if (i === T.active) next();
  });
  $('#tnext', el).onclick = next;
  $('#tplay', el).onclick = () => { if (T.active < 0) return next(); T.running = !T.running; T.startAt = Date.now(); haptic(); updBtn(); };
  $('#tres', el).onclick = () => confirmSheet('Скинути таймер?', 'Скинути', () => { timerReset(); refreshTop(); }, false);
  $('#tset', el).onclick = () => { T.running = false; T.setup = true; refreshTop(); };
  $('#tlog', el).onclick = () => { T.running = false; App.logPlay(null, null, { dur: Math.max(1, Math.round(T.total / 60000)), players: T.ps.map(p => ({ n: p.n, s: null, w: false })) }); };
  const iv = setInterval(tick, 200); tick();
  el._cleanup = () => clearInterval(iv);
};
function timerReset() { T.ps = T.sel.map((n, i) => ({ n, col: S.players.find(p => p.n === n)?.col || PLAYER_COLORS[i], used: 0, turnUsed: 0, turns: 0 })); T.active = -1; T.running = false; T.total = 0; T.round = 1; }
function timerSetup(el) {
  el.innerHTML = `${topbar('Таймер', { back: true, sub: 'Налаштування' })}<div class="wrap fade-in">
  <div class="fld"><label>Режим</label>${segmented('tmode', [['clock', '♟️ Шаховий годинник'], ['turn', '⏳ Ліміт на хід']], T.mode, v => { T.mode = v; refreshTop(); })}</div>
  ${T.mode === 'clock' ? `<div class="fld"><label>Час на гравця</label><div class="chips wrapc">${[3, 5, 10, 15, 30, 60].map(n => `<button class="chip ${T.base === n ? 'on' : ''}" data-b="${n}">${n} хв</button>`).join('')}</div></div>`
    : `<div class="fld"><label>Час на хід</label><div class="chips wrapc">${[15, 30, 45, 60, 90, 120].map(n => `<button class="chip ${T.turn === n ? 'on' : ''}" data-tn="${n}">${n} с</button>`).join('')}</div></div>`}
  <div class="fld"><label>Гравці (порядок ходу)</label><div class="chips wrapc">${S.players.map(p => { const i = T.sel.indexOf(p.n); return `<button class="chip ${i >= 0 ? 'on' : ''}" data-p="${esc(p.n)}">${i >= 0 ? `<b>${i + 1}</b>` : ''} ${esc(p.n)}</button>`; }).join('')}</div></div>
  <button class="btn accent block" id="tgo" ${T.sel.length < 1 ? 'disabled' : ''}>${ic('timer')} До таймера</button></div>`;
  $$('[data-b]', el).forEach(b => b.onclick = () => { T.base = +b.dataset.b; refreshTop(); });
  $$('[data-tn]', el).forEach(b => b.onclick = () => { T.turn = +b.dataset.tn; refreshTop(); });
  $$('[data-p]', el).forEach(b => b.onclick = () => { const n = b.dataset.p; T.sel = T.sel.includes(n) ? T.sel.filter(x => x !== n) : [...T.sel, n]; refreshTop(); });
  $('#tgo', el).onclick = () => { T.setup = false; timerReset(); refreshTop(); };
}
