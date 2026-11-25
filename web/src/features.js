// ================= FEATURES v1.1: порожній старт, редагування гравців, історія змін =================

// ---------- порожній старт (демо лише за бажанням) ----------
function loadState() {
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  if (!S || !S.v) { S = blankState(); S.history = []; persist(); }
  S.history = S.history || [];
  S.players = S.players || [];
  H.snap = takeSnap();
}

// ---------- історія змін: кожне збереження порівнюється зі знімком ----------
const H = { snap: null, quiet: false };
const H_MAX = 400;
function persist() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }, 120); }
function takeSnap() {
  const plays = {}; (S.plays || []).forEach(p => plays[p.id] = JSON.stringify(p));
  const players = {}; (S.players || []).forEach(p => players[p.n] = p.col);
  const games = {}; Object.entries(S.games || {}).forEach(([id, g]) => games[id] = { owned: !!g.owned, fav: !!g.fav, wish: !!g.wish });
  return { plays, players, games };
}
function hAdd(e) { S.history.unshift(Object.assign({ id: uid(), at: Date.now() }, e)); if (S.history.length > H_MAX) S.history.length = H_MAX; }
function save() {
  if (H.snap && !H.quiet) {
    const now = takeSnap(), old = H.snap;
    // партії
    Object.keys(now.plays).forEach(id => {
      if (!old.plays[id]) { const p = JSON.parse(now.plays[id]); hAdd({ type: 'play.add', ref: id, after: p, text: `Нова партія: ${G(p.g).n}` }); }
      else if (old.plays[id] !== now.plays[id]) { const a = JSON.parse(old.plays[id]), b = JSON.parse(now.plays[id]); const lines = playDiff(a, b); if (lines.length) hAdd({ type: 'play.edit', ref: id, before: a, after: b, text: `Змінено партію: ${G(b.g).n}`, lines }); }
    });
    Object.keys(old.plays).forEach(id => { if (!now.plays[id]) { const p = JSON.parse(old.plays[id]); hAdd({ type: 'play.del', ref: id, before: p, text: `Видалено партію: ${G(p.g).n}` }); } });
    // гравці
    Object.keys(now.players).forEach(n => {
      if (!(n in old.players)) hAdd({ type: 'player.add', after: { n, col: now.players[n] }, text: `Додано гравця: ${n}` });
      else if (old.players[n] !== now.players[n]) hAdd({ type: 'player.color', before: { n, col: old.players[n] }, after: { n, col: now.players[n] }, text: `Змінено колір гравця: ${n}` });
    });
    Object.keys(old.players).forEach(n => { if (!(n in now.players)) hAdd({ type: 'player.del', before: { n, col: old.players[n] }, text: `Видалено гравця: ${n}` }); });
    // статус ігор
    const lbl = { owned: ['додано на полицю', 'прибрано з полиці'], fav: ['в улюблених', 'прибрано з улюблених'], wish: ['додано в «Хочу»', 'прибрано з «Хочу»'] };
    Object.keys(now.games).forEach(id => {
      const a = old.games[id] || { owned: false, fav: false, wish: false }, b = now.games[id];
      ['owned', 'fav', 'wish'].forEach(k => { if (a[k] !== b[k]) hAdd({ type: 'game.' + k, ref: +id, before: { [k]: a[k] }, after: { [k]: b[k] }, text: `${G(id).n}: ${lbl[k][b[k] ? 0 : 1]}` }); });
    });
  }
  H.snap = takeSnap();
  persist();
}
function quietly(fn, entry) { H.quiet = true; try { fn(); } finally { H.quiet = false; } if (entry) hAdd(entry); H.snap = takeSnap(); persist(); }

function playDiff(a, b) {
  const L = [];
  if (a.g !== b.g) L.push(`Гра: ${G(a.g).n} → ${G(b.g).n}`);
  if (a.date !== b.date) L.push(`Дата: ${fmtDate(a.date)} → ${fmtDate(b.date)}`);
  if ((a.dur || 0) !== (b.dur || 0)) L.push(`Тривалість: ${a.dur || 0} → ${b.dur || 0} хв`);
  const an = a.players.map(p => p.n), bn = b.players.map(p => p.n);
  bn.filter(n => !an.includes(n)).forEach(n => L.push(`+ гравець ${n}`));
  an.filter(n => !bn.includes(n)).forEach(n => L.push(`− гравець ${n}`));
  b.players.forEach(p => { const o = a.players.find(x => x.n === p.n); if (!o) return; if ((o.s ?? null) !== (p.s ?? null)) L.push(`${p.n}: ${o.s ?? '—'} → ${p.s ?? '—'} очок`); });
  const wa = a.players.filter(p => p.w).map(p => p.n).join(', ') || '—', wb = b.players.filter(p => p.w).map(p => p.n).join(', ') || '—';
  if (wa !== wb) L.push(`Переможець: ${wa} → ${wb}`);
  if ((a.note || '') !== (b.note || '')) L.push('Змінено нотатку');
  return L;
}

// ---------- гравці ----------
function renamePlayer(oldN, newN, col) {
  quietly(() => {
    const p = S.players.find(x => x.n === oldN); if (!p) return;
    p.n = newN; if (col) p.col = col;
    S.plays.forEach(pl => pl.players.forEach(x => { if (x.n === oldN) x.n = newN; }));
    if (T.sel) T.sel = T.sel.map(n => n === oldN ? newN : n);
    T.ps.forEach(x => { if (x.n === oldN) x.n = newN; });
    M.names = M.names.map(n => n === oldN ? newN : n);
  }, { type: 'player.rename', before: { n: oldN }, after: { n: newN }, text: `Перейменовано гравця: ${oldN} → ${newN}` });
}
const SWATCHES = ['#FF7A2F', '#FFB84D', '#FF4D5E', '#E07A9E', '#B08CFF', '#5CC8F0', '#3DDC97', '#9AD14B', '#F7F1EA', '#C9A27A'];
function editPlayer(name) {
  const p = S.players.find(x => x.n === name); if (!p) return;
  let col = p.col;
  const draw = sh => {
    $('.sh-body', sh).innerHTML = `<div class="fld"><label>Ім’я</label><input class="inp" id="pn" value="${esc(p.n)}"></div>
     <div class="fld"><label>Колір</label><div class="swatches">${SWATCHES.map(c => `<button data-c="${c}" class="${c === col ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div></div>
     <p class="muted" style="font-size:12.5px">Ім’я зміниться в усіх партіях журналу. Зміну буде записано в історію.</p>`;
    $$('[data-c]', sh).forEach(b => b.onclick = () => { col = b.dataset.c; const v = $('#pn', sh).value; draw(sh); $('#pn', sh).value = v; haptic(6); });
  };
  openSheet({ title: 'Редагувати гравця', body: '', foot: `<button class="btn danger" id="pdel">${ic('trash')}</button><button class="btn accent block" id="psv">Зберегти</button>`, onMount: (sh, api) => {
    draw(sh);
    $('#psv', sh).onclick = () => {
      const n = $('#pn', sh).value.trim(); if (!n) return toast('Вкажіть ім’я');
      if (n !== p.n && S.players.some(x => x.n === n)) return toast('Такий гравець уже є');
      if (n !== p.n) renamePlayer(p.n, n, col); else if (col !== p.col) { p.col = col; save(); }
      api.close(); toast('Збережено'); refreshTop();
    };
    $('#pdel', sh).onclick = () => { api.close(); deletePlayer(p.n); };
  } });
}
function deletePlayer(name) {
  const n = S.plays.filter(x => x.players.some(y => y.n === name)).length;
  confirmSheet(`Видалити гравця «${esc(name)}»?${n ? ` Він є у ${plural(n, 'партії', 'партіях', 'партіях')} — там ім’я залишиться.` : ''} Скасувати можна в «Історії змін».`, 'Видалити', () => { S.players = S.players.filter(p => p.n !== name); save(); toast('Гравця видалено'); refreshTop(); });
}
SCREENS.players = el => {
  el.innerHTML = `${topbar('Гравці', { back: true, sub: S.players.length ? plural(S.players.length, 'гравець', 'гравці', 'гравців') : 'Ще нікого немає' })}
  <div class="wrap">
   ${S.players.length ? S.players.map(p => { const n = S.plays.filter(x => x.players.some(y => y.n === p.n)).length, w = S.plays.filter(x => x.players.some(y => y.n === p.n && y.w)).length;
     return `<div class="prow"><span class="av" style="background:${p.col}">${esc(p.n[0] || '?')}</span><div class="pi"><b>${esc(p.n)}</b><span>${n} парт. · ${w} перемог${n ? ` · ${Math.round(w / n * 100)}%` : ''}</span></div>
     <button class="iconbtn" data-ed="${esc(p.n)}">${ic('edit')}</button><button class="iconbtn" data-del="${esc(p.n)}" style="color:var(--no)">${ic('trash')}</button></div>`; }).join('')
     : `<div class="empty" style="padding:24px"><div class="big">👥</div><b>Додайте тих, з ким граєте</b>Гравці знадобляться для партій, таймера й матчу.</div>`}
   <div class="fld" style="margin-top:16px"><label>Новий гравець</label><div class="fld-row"><input class="inp" id="np" placeholder="Ім’я"><button class="btn accent" id="addp" style="flex:none">${ic('plus')}</button></div></div>
  </div>`;
  const add = () => { const n = $('#np', el).value.trim(); if (!n) return; if (S.players.some(p => p.n === n)) return toast('Такий гравець уже є'); S.players.push({ n, col: SWATCHES[S.players.length % SWATCHES.length] }); save(); haptic(); refreshTop(); };
  $('#addp', el).onclick = add; $('#np', el).onkeydown = e => { if (e.key === 'Enter') add(); };
  $$('[data-ed]', el).forEach(b => b.onclick = () => editPlayer(b.dataset.ed));
  $$('[data-del]', el).forEach(b => b.onclick = () => deletePlayer(b.dataset.del));
};

// картка партії з явною кнопкою редагування
function playCard(p) {
  const g = G(p.g), d = parseD(p.date), win = p.players.filter(x => x.w);
  const coop = p.players.length && p.players.every(x => x.s == null);
  return `<div class="play" onclick="App.logPlay(${p.g},'${p.id}')">${poster(g)}<div class="pm"><b>${esc(g.n)}</b>
  <div class="m">${p.players.map(x => esc(x.n) + (x.s != null && !coop ? ' ' + x.s : '')).join(' · ') || 'Без гравців'} · ${fmtDur(p.dur || 0)}</div>
  ${win.length ? `<div class="win">${ic('crown')} ${coop ? 'Перемога команди' : win.map(w => esc(w.n)).join(', ')}</div>` : coop ? `<div class="win" style="color:var(--no)">Поразка команди</div>` : ''}
  </div><div class="date"><b>${d.getDate()}</b>${MONTHS_S[d.getMonth()]}</div><span class="pedit">${ic('edit')}</span></div>`;
}

// ---------- екран історії ----------
const HF = { f: 'all' };
const H_ICON = { play: ['dice', '#FF7A2F'], player: ['users', '#5CC8F0'], game: ['shelf', '#FFB84D'], data: ['sync', '#B08CFF'] };
function hCanRestore(e) {
  if (e.type === 'play.edit') return S.plays.some(p => p.id === e.ref) ? 'Повернути як було' : 'Відновити попередню версію';
  if (e.type === 'play.del') return S.plays.some(p => p.id === e.ref) ? null : 'Відновити партію';
  if (e.type === 'play.add') return S.plays.some(p => p.id === e.ref) ? 'Скасувати (видалити партію)' : null;
  if (e.type === 'player.del') return S.players.some(p => p.n === e.before.n) ? null : 'Повернути гравця';
  if (e.type === 'player.rename') return S.players.some(p => p.n === e.after.n) && !S.players.some(p => p.n === e.before.n) ? `Повернути ім’я «${e.before.n}»` : null;
  if (e.type === 'player.color') return S.players.some(p => p.n === e.before.n) ? 'Повернути колір' : null;
  if (e.type.startsWith('game.')) return 'Скасувати';
  return null;
}
function hRestore(e) {
  if (e.type === 'play.edit' || e.type === 'play.del') { const i = S.plays.findIndex(p => p.id === e.ref); i >= 0 ? S.plays[i] = JSON.parse(JSON.stringify(e.before)) : S.plays.push(JSON.parse(JSON.stringify(e.before))); S.plays.sort((a, b) => b.date.localeCompare(a.date)); }
  else if (e.type === 'play.add') S.plays = S.plays.filter(p => p.id !== e.ref);
  else if (e.type === 'player.del') S.players.push({ n: e.before.n, col: e.before.col });
  else if (e.type === 'player.rename') { renamePlayer(e.after.n, e.before.n); return; }
  else if (e.type === 'player.color') { const p = S.players.find(x => x.n === e.before.n); if (p) p.col = e.before.col; }
  else if (e.type.startsWith('game.')) upd(e.ref, e.before);
  save();
}
function hTime(t) { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function hDay(t) { const d = new Date(t), k = todayStr(); const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); const n = daysSince(ds); return n === 0 ? 'Сьогодні' : n === 1 ? 'Вчора' : fmtDate(ds); }
SCREENS.history = el => {
  const list = (S.history || []).filter(e => HF.f === 'all' || e.type.startsWith(HF.f));
  let html = '', cur = '';
  list.forEach(e => { const day = hDay(e.at); if (day !== cur) { html += `<div class="month-h">${day}</div>`; cur = day; }
    const [icn, col] = H_ICON[e.type.split('.')[0]] || H_ICON.data;
    html += `<div class="hrow" data-h="${e.id}"><span class="hi" style="--hc:${col}">${ic(icn)}</span><div class="hm"><b>${esc(e.text)}</b>${(e.lines || []).slice(0, 3).map(l => `<span>${esc(l)}</span>`).join('')}${(e.lines || []).length > 3 ? `<span>… ще ${e.lines.length - 3}</span>` : ''}</div><time>${hTime(e.at)}</time></div>`; });
  el.innerHTML = `${topbar('Історія змін', { back: true, sub: plural((S.history || []).length, 'запис', 'записи', 'записів'), right: (S.history || []).length ? `<button class="iconbtn" id="hclr" style="color:var(--no)">${ic('trash')}</button>` : '' })}
  <div class="chips">${[['all', 'Усе'], ['play', 'Партії'], ['player', 'Гравці'], ['game', 'Колекція'], ['data', 'Дані']].map(([v, l]) => `<button class="chip ${HF.f === v ? 'on' : ''}" data-f="${v}">${l}</button>`).join('')}</div>
  <div class="wrap">${html || `<div class="empty"><div class="big">🕓</div><b>Історія порожня</b>Тут з’являтимуться всі зміни: нові й відредаговані партії, гравці, колекція — з датою й часом.</div>`}</div>`;
  $$('[data-f]', el).forEach(b => b.onclick = () => { HF.f = b.dataset.f; refreshTop(); });
  const c = $('#hclr', el); if (c) c.onclick = () => confirmSheet('Очистити всю історію змін? Самі дані (партії, гравці, ігри) не зміняться.', 'Очистити', () => { S.history = []; persist(); toast('Історію очищено'); refreshTop(); });
  $$('[data-h]', el).forEach(r => r.onclick = () => {
    const e = S.history.find(x => x.id === r.dataset.h); if (!e) return;
    const can = hCanRestore(e), openable = e.type.startsWith('play') && S.plays.some(p => p.id === e.ref);
    const d = new Date(e.at);
    const sh = openSheet({ title: 'Зміна', body: `<p style="font-weight:700;font-size:16px;margin-bottom:6px">${esc(e.text)}</p><p class="muted" style="font-size:13px;margin-bottom:14px">${hDay(e.at)} о ${hTime(e.at)}${d.getFullYear() !== new Date().getFullYear() ? ' · ' + d.getFullYear() : ''}</p>
      ${(e.lines || []).length ? `<div class="card" style="padding:14px">${e.lines.map(l => `<div class="kv"><span>${esc(l)}</span></div>`).join('')}</div>` : ''}`,
      foot: `${openable ? `<button class="btn ghost block" id="hop">Відкрити</button>` : ''}${can ? `<button class="btn accent block" id="hrs">${esc(can)}</button>` : ''}${!openable && !can ? `<button class="btn ghost block" data-close2>Закрити</button>` : ''}` });
    const op = $('#hop', sh.el); if (op) op.onclick = () => { const p = S.plays.find(x => x.id === e.ref); sh.close(); setTimeout(() => logPlay(p.g, p.id), 250); };
    const rs = $('#hrs', sh.el); if (rs) rs.onclick = () => { hRestore(e); sh.close(); toast('Готово — зміну також записано в історію'); refreshTop(); };
    const cl = $('[data-close2]', sh.el); if (cl) cl.onclick = sh.close;
  });
};

// ---------- очищення / демо ----------
function clearAllData() {
  const set = S.settings;
  quietly(() => { S = Object.assign(blankState(), { settings: set, history: S.history || [] }); }, { type: 'data.wipe', text: 'Усі дані очищено — чистий аркуш' });
}
function loadDemo() {
  const set = S.settings, hist = S.history || [];
  quietly(() => { S = blankState(); seedDemo(); S.settings = set; S.history = hist; }, { type: 'data.demo', text: 'Завантажено демо-дані' });
}
const _home = SCREENS.home;
SCREENS.home = el => {
  _home(el);
  const tb = $('.topbar', el);
  if (S.demo) tb.insertAdjacentHTML('afterend', `<div class="banner demo-b">${ic('info')}<div style="flex:1"><b>Це демо-дані</b> — щоб роздивитися додаток. Почніть зі своєї полиці, коли будете готові.</div><button class="btn sm accent" id="dclr">Очистити</button></div>`);
  if (!ownedIds().length) {
    $('.empty', el)?.remove();
    tb.insertAdjacentHTML('afterend', `<div class="onb fade-in"><div class="onb-glow"></div><div class="h-display" style="font-size:24px;font-weight:800;line-height:1.1">Ваша полиця<br>поки порожня</div><p class="muted" style="margin:8px 0 16px">Три кроки — і додаток почне радити, що зіграти.</p>
     <button class="onb-step" onclick="App.openLibrary({tab:'all'})"><i>1</i><div><b>Додайте свої ігри</b><span>З каталогу або пошуком на BGG</span></div>${ic('back', 'ico')}</button>
     <button class="onb-step" onclick="App.openPlayers()"><i>2</i><div><b>Додайте гравців</b><span>${S.players.length ? plural(S.players.length, 'гравець', 'гравці', 'гравців') + ' вже є' : 'Себе й тих, з ким граєте'}</span></div>${ic('back', 'ico')}</button>
     <button class="onb-step" onclick="App.logPlay()"><i>3</i><div><b>Запишіть першу партію</b><span>Почнеться ваша серія 🔥</span></div>${ic('back', 'ico')}</button></div>`);
  }
  const b = $('#dclr', el); if (b) b.onclick = () => confirmSheet('Видалити демо-ігри, партії, гравців і мітки та почати з нуля?', 'Очистити', () => { clearAllData(); toast('Чистий аркуш ✨'); goTab('home'); });
};
const _settings = SCREENS.settings;
SCREENS.settings = el => {
  _settings(el);
  const w = $('#wipe', el);
  w.onclick = () => confirmSheet('Видалити всі ігри, партії, мітки та гравців? Історія змін залишиться.', 'Стерти все', () => { clearAllData(); toast('Чистий аркуш ✨'); goTab('home'); });
  w.insertAdjacentHTML('beforebegin', `<button class="btn ghost block" id="demo" style="margin-bottom:10px">${ic('dice')} Завантажити демо-дані</button>`);
  $('#demo', el).onclick = () => confirmSheet('Замінити поточні дані демо-колекцією? Свої дані краще спершу експортувати.', 'Завантажити', () => { loadDemo(); toast('Демо завантажено'); goTab('home'); }, false);
};
const _more = SCREENS.more;
SCREENS.more = el => {
  _more(el);
  const rows = $$('.setrow', el); const first = rows[0];
  first && first.insertAdjacentHTML('beforebegin', `<div class="setrow" onclick="App.openHistory()"><span class="si">${ic('clock')}</span><div class="st-m"><b>Історія змін</b><span>${(S.history || []).length ? plural(S.history.length, 'запис', 'записи', 'записів') : 'Поки порожньо'}</span></div>${ic('back', 'ico')}</div>`.replace('class="ico"', 'class="ico" style="transform:rotate(180deg);color:var(--dim)"'));
};
