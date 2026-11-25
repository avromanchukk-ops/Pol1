// ================= v1.2: центральна кнопка «+», 3D-полиця, власні ігри =================

// ---------- таббар: Головна · Полиця · [+] · Матч · Партії ----------
function init() {
  loadState();
  const tabs = [['home', 'home', 'Головна'], ['library', 'shelf', 'Полиця'], ['+add', 'plus', 'Додати'], ['match', 'cards', 'Матч'], ['stats', 'chart', 'Партії']];
  $('#tabbar').innerHTML = tabs.map(([k, i, l]) => k === '+add'
    ? `<button class="tab-add" id="tabadd" aria-label="Додати">${ic(i)}<span>${l}</span></button>`
    : `<button data-tab="${k}">${ic(i)}<span>${l}</span></button>`).join('');
  $$('#tabbar button[data-tab]').forEach(b => b.onclick = () => { if (Nav.tab === b.dataset.tab && !Nav.stack.length) { const sc = Nav.base?.el; sc && sc.scrollTo({ top: 0, behavior: 'smooth' }); return; } goTab(b.dataset.tab); });
  $('#tabadd').onclick = () => addHub();
  goTab('home');
  setTimeout(() => $('#splash').classList.add('out'), 1700);
  setTimeout(() => $('#splash')?.remove(), 2500);
  if (HAS_NATIVE && Date.now() - (S.news.at || 0) > 6 * 36e5 && allIds().some(id => S.games[id]?.follow)) setTimeout(() => refreshNews().catch(() => {}), 4000);
}
Object.assign(App, {
  openMore() { push(SCREENS.more); }, add: () => addHub(), addGames: m => addGamesSheet(m), newGame: m => customGameSheet(null, m),
  toggleView() { LF.view = { shelf: 'grid', grid: 'list', list: 'shelf' }[LF.view] || 'shelf'; haptic(6); refreshTop(); },
});
LF.view = 'shelf';

// ---------- меню «+» ----------
function addHub() {
  const tb = $('#tabadd'); tb && tb.classList.add('open'); haptic(12);
  const ownedN = ownedIds().length;
  const sh = openSheet({ title: 'Що додаємо?', onClose: () => tb && tb.classList.remove('open'), body: `
   <div class="add-main">
    <button class="add-big hot" data-a="play"><span class="ab-i">${ic('dice')}</span><b>Партію</b><span>${ownedN ? 'Хто грав і хто переміг' : 'Будь-яка гра з каталогу'}</span></button>
    <button class="add-big" data-a="game"><span class="ab-i">${ic('shelf')}</span><b>Гру на полицю</b><span>Каталог, BGG або вручну</span></button>
   </div>
   <div class="add-list">
    <button data-a="wish"><span class="al-i" style="--c:#FFB84D">${ic('bookmark')}</span><div><b>У список «Хочу»</b><span>Ігри, які плануєте купити</span></div>${ic('back', 'ico')}</button>
    <button data-a="custom"><span class="al-i" style="--c:#B08CFF">${ic('edit')}</span><div><b>Своя гра вручну</b><span>Якої немає в каталозі чи на BGG</span></div>${ic('back', 'ico')}</button>
    <button data-a="player"><span class="al-i" style="--c:#5CC8F0">${ic('users')}</span><div><b>Гравця</b><span>${S.players.length ? plural(S.players.length, 'гравець', 'гравці', 'гравців') + ' уже є' : 'Себе й друзів'}</span></div>${ic('back', 'ico')}</button>
    <button data-a="label"><span class="al-i" style="--c:#3DDC97">${ic('tag')}</span><div><b>Мітку</b><span>«На двох», «Для гостей»…</span></div>${ic('back', 'ico')}</button>
   </div>
   <div class="add-quick"><button data-a="timer">${ic('timer')} Таймер</button><button data-a="mini">${ic('dice')} Міні-ігри</button><button data-a="more">${ic('more')} Ще</button></div>` });
  const go = fn => { sh.close(); setTimeout(fn, 260); };
  $$('[data-a]', sh.el).forEach(b => b.onclick = () => {
    haptic(8);
    ({ play: () => go(() => logPlay()), game: () => go(() => addGamesSheet('owned')), wish: () => go(() => addGamesSheet('wish')), custom: () => go(() => customGameSheet(null, 'owned')),
      player: () => go(quickPlayer), label: () => go(() => App.openLabels()), timer: () => go(App.openTimer), mini: () => go(App.openMiniGames), more: () => go(App.openMore) })[b.dataset.a]();
  });
}
function quickPlayer() {
  const sh = openSheet({ title: 'Новий гравець', body: `<input class="inp" id="qp" placeholder="Ім’я">${S.players.length ? `<p class="muted" style="font-size:12.5px;margin-top:10px">Уже є: ${S.players.map(p => esc(p.n)).join(', ')}</p>` : ''}`, foot: `<button class="btn ghost" id="qpall">Усі гравці</button><button class="btn accent block" id="qpok">Додати</button>`, onMount: s => setTimeout(() => $('#qp', s).focus(), 300) });
  const ok = () => { const n = $('#qp', sh.el).value.trim(); if (!n) return; if (S.players.some(p => p.n === n)) return toast('Такий гравець уже є'); S.players.push({ n, col: SWATCHES[S.players.length % SWATCHES.length] }); save(); sh.close(); toast(`${n} — додано`); refreshTop(); };
  $('#qpok', sh.el).onclick = ok; $('#qp', sh.el).onkeydown = e => { if (e.key === 'Enter') ok(); };
  $('#qpall', sh.el).onclick = () => { sh.close(); setTimeout(App.openPlayers, 260); };
}

// ---------- пошук і додавання ігор ----------
function addGamesSheet(mode = 'owned') {
  let q = '', tgt = mode, added = 0;
  const draw = sh => {
    const ql = q.toLowerCase();
    const list = allIds().map(G).filter(g => !ql || g.n.toLowerCase().includes(ql) || (g.c || []).some(c => c.toLowerCase().includes(ql)))
      .sort((a, b) => (+!!a[tgt] - +!!b[tgt]) || (b.r || 0) - (a.r || 0)).slice(0, 40);
    $('#agl', sh).innerHTML = list.map(g => { const on = !!g[tgt];
      return `<div class="ag-row ${on ? 'on' : ''}" data-id="${g.id}">${poster(g)}<div class="li-main"><b>${esc(g.n)}</b><div class="m"><span>${g.y || ''}</span>${g.r ? `<span style="color:var(--accent2)">★ ${g.r.toFixed(1)}</span>` : ''}<span>${g.p[0]}–${g.p[1]} гр.</span>${g.custom ? '<span>своя</span>' : ''}</div></div><button class="ag-tog">${ic(on ? 'check' : 'plus')}</button></div>`; }).join('')
      + `<div class="ag-more">${q ? `<b>Немає «${esc(q)}»?</b>` : '<b>Шукаєте іншу гру?</b>'}<div class="fld-row" style="margin-top:10px"><button class="btn ghost" id="agbgg">${ic('search')} BGG</button><button class="btn ghost" id="agman">${ic('edit')} Вручну</button></div></div>`;
    $$('.ag-row', sh).forEach(r => r.onclick = e => {
      const id = +r.dataset.id, on = !!G(id)[tgt];
      if (on && !e.target.closest('.ag-tog')) { api.close(); setTimeout(() => App.openGame(id), 260); return; }
      const patch = { [tgt]: !on }; if (tgt === 'owned' && !on) { patch.wish = false; patch.added = Date.now(); }
      upd(id, patch); haptic(on ? 6 : 16); if (!on) added++;
      r.classList.toggle('on', !on); $('.ag-tog', r).innerHTML = ic(!on ? 'check' : 'plus');
      if (!on) { r.classList.add('pop'); setTimeout(() => r.classList.remove('pop'), 450); }
      $('#agcnt', sh).textContent = added ? `+${added}` : '';
    });
    $('#agbgg', sh).onclick = () => { api.close(); setTimeout(() => bggSearch(q), 260); };
    $('#agman', sh).onclick = () => { api.close(); setTimeout(() => customGameSheet(null, tgt, q), 260); };
  };
  let api;
  api = openSheet({ title: `${tgt === 'wish' ? 'У список «Хочу»' : 'Додати на полицю'} <span id="agcnt" class="agcnt"></span>`, body: `
    <div class="search" style="margin:0 0 10px">${ic('search')}<input id="agq" placeholder="Назва або жанр…" autocomplete="off"></div>
    ${segmented('agseg', [['owned', 'На полицю'], ['wish', 'Хочу купити']], tgt, v => { tgt = v; draw(api.el); })}
    <div id="agl" style="margin-top:12px"></div>`,
    foot: `<button class="btn accent block" id="agdone">Готово</button>`, onClose: () => refreshTop(),
    onMount: (sh, a) => { api = a; $('.seg', sh).style.margin = '0'; draw(sh); const i = $('#agq', sh); i.oninput = () => { q = i.value.trim(); draw(sh); }; $('#agdone', sh).onclick = a.close; } });
}

// ---------- своя гра (створення / редагування) ----------
const CUSTOM_PALS = [['#E9772E', '#7A2E12'], ['#3E8E5A', '#163A26'], ['#2A8FBD', '#0D2338'], ['#7A3FB8', '#1E0E33'], ['#C2393B', '#1D2C59'], ['#C99A3B', '#3C2A10'], ['#3D84A8', '#132836'], ['#B23A4E', '#2A0B14']];
const CUSTOM_MOTIFS = ['hex', 'grid', 'lines', 'dots', 'tri', 'waves', 'tiles', 'circles', 'stars', 'arcs', 'gems', 'leaves'];
function customGameSheet(id, mode = 'owned', name = '') {
  const ex = id ? G(id) : null;
  const st = ex ? { n: ex.n, y: ex.y || '', p0: ex.p[0], p1: ex.p[1], t: ex.t[0], cx: ex.cx7, c: (ex.c || []).join(', '), d: ex.d || '', pal: CUSTOM_PALS.findIndex(p => p[0] === ex.pal[0]), m: ex.m }
    : { n: name, y: '', p0: 2, p1: 4, t: 45, cx: 3, c: '', d: '', pal: Math.floor(Math.random() * CUSTOM_PALS.length), m: CUSTOM_MOTIFS[Math.floor(Math.random() * CUSTOM_MOTIFS.length)] };
  if (st.pal < 0) st.pal = 0;
  const prev = sh => { $('#cgprev', sh).innerHTML = poster({ id: id || 777, n: st.n || 'Назва гри', y: st.y, pal: CUSTOM_PALS[st.pal], m: st.m }); };
  const sh = openSheet({ title: ex ? 'Редагувати гру' : 'Своя гра', body: `
   <div class="cg-top"><div id="cgprev" class="cg-prev"></div><div style="flex:1">
    <div class="fld"><label>Назва</label><input class="inp" id="cgn" value="${esc(st.n)}" placeholder="Напр. «Мафія»"></div>
    <div class="fld" style="margin:0"><label>Обкладинка</label><div class="cg-pals">${CUSTOM_PALS.map((p, i) => `<button data-pal="${i}" class="${i === st.pal ? 'on' : ''}" style="background:linear-gradient(135deg,${p[0]},${p[1]})"></button>`).join('')}</div><button class="btn sm ghost" id="cgm" style="margin-top:8px">${ic('sync')} Інший візерунок</button></div></div></div>
   <div class="fld-row"><div class="fld"><label>Гравців від</label><input class="inp" type="number" id="cgp0" value="${st.p0}" min="1" inputmode="numeric"></div><div class="fld"><label>до</label><input class="inp" type="number" id="cgp1" value="${st.p1}" min="1" inputmode="numeric"></div><div class="fld"><label>Хвилин</label><input class="inp" type="number" id="cgt" value="${st.t}" min="1" inputmode="numeric"></div></div>
   <div class="fld"><label>Складність</label><div class="cxpick">${[1, 2, 3, 4, 5, 6, 7].map(n => `<button data-cx="${n}" class="${st.cx === n ? 'on' : ''}" style="--cc:${COMPLEXITY[n].c}">${n}</button>`).join('')}</div></div>
   <div class="fld-row"><div class="fld"><label>Рік</label><input class="inp" type="number" id="cgy" value="${st.y}" inputmode="numeric" placeholder="—"></div><div class="fld" style="flex:2"><label>Жанри</label><input class="inp" id="cgc" value="${esc(st.c)}" placeholder="Вечірка, Карти"></div></div>
   <div class="fld"><label>Опис</label><textarea class="inp" id="cgd" placeholder="Про що гра, свої правила…">${esc(st.d)}</textarea></div>`,
   foot: `${ex ? `<button class="btn danger" id="cgdel">${ic('trash')}</button>` : ''}<button class="btn accent block" id="cgok">${ex ? 'Зберегти' : mode === 'wish' ? 'Додати в «Хочу»' : 'Поставити на полицю'}</button>` });
  const el = sh.el; prev(el);
  $('#cgn', el).oninput = e => { st.n = e.target.value; prev(el); };
  $('#cgy', el).oninput = e => { st.y = e.target.value; prev(el); };
  $$('[data-pal]', el).forEach(b => b.onclick = () => { st.pal = +b.dataset.pal; $$('[data-pal]', el).forEach(x => x.classList.toggle('on', x === b)); prev(el); });
  $('#cgm', el).onclick = () => { st.m = CUSTOM_MOTIFS[(CUSTOM_MOTIFS.indexOf(st.m) + 1) % CUSTOM_MOTIFS.length]; delete posterCache[(id || 777) + st.m]; prev(el); };
  $$('[data-cx]', el).forEach(b => b.onclick = () => { st.cx = +b.dataset.cx; $$('[data-cx]', el).forEach(x => x.classList.toggle('on', x === b)); haptic(6); });
  $('#cgok', el).onclick = () => {
    const n = $('#cgn', el).value.trim(); if (!n) return toast('Вкажіть назву');
    const p0 = Math.max(1, +$('#cgp0', el).value || 1), p1 = Math.max(p0, +$('#cgp1', el).value || p0), t = Math.max(1, +$('#cgt', el).value || 30);
    const data = { n, y: +$('#cgy', el).value || null, p: [p0, p1], t: [t, t], cx: st.cx, w: null, r: null, c: $('#cgc', el).value.split(',').map(s => s.trim()).filter(Boolean), d: $('#cgd', el).value.trim(), pal: CUSTOM_PALS[st.pal], m: st.m, custom: true };
    if (!data.c.length) data.c = ['Своя гра'];
    const gid = id || (900000000 + Math.floor(Math.random() * 90000000));
    delete posterCache[gid + st.m];
    upd(gid, ex ? data : Object.assign(data, { labels: [], [mode]: true, added: Date.now() }));
    sh.close(); haptic(20); toast(ex ? 'Збережено' : `«${n}» — ${mode === 'wish' ? 'у списку «Хочу»' : 'на полиці'}`);
    if (ex) refreshTop(); else setTimeout(() => App.openGame(gid), 260);
  };
  const d = $('#cgdel', el); if (d) d.onclick = () => confirmSheet(`Видалити «${esc(ex.n)}» з додатку? Партії з цією грою залишаться в журналі.`, 'Видалити', () => { sh.close(); upd(id, { owned: false, wish: false, fav: false }); delete S.games[id]; save(); toast('Гру видалено'); back(); });
}
const _detail = SCREENS.detail;
SCREENS.detail = (el, id) => {
  _detail(el, id);
  if (G(id).custom) { const r = $('.det-top > div', el); r && r.insertAdjacentHTML('afterbegin', `<button class="iconbtn" id="cgedit">${ic('edit')}</button>`); $('#cgedit', el).onclick = () => customGameSheet(id); }
};

// ---------- бібліотека з 3D-полицею ----------
SCREENS.library = el => {
  const counts = { owned: ownedIds().length, wish: allIds().filter(id => S.games[id]?.wish).length, fav: allIds().filter(id => S.games[id]?.fav).length, all: allIds().length };
  const nextIc = { shelf: 'grid', grid: 'list', list: 'shelf' }[LF.view];
  el.innerHTML = `${topbar('Полиця', { sub: plural(counts.owned, 'гра', 'гри', 'ігор') + ' у колекції', right: `<button class="iconbtn" onclick="App.toggleView()" title="Вигляд">${ic(nextIc)}</button><button class="iconbtn" onclick="App.filters()">${ic('filter')}${activeFilters() ? '<span class="dot"></span>' : ''}</button>` })}
  <div class="search">${ic('search')}<input placeholder="Назва або жанр…" value="${esc(LF.q)}" id="libq"><button id="libadd" class="btn sm accent" style="height:34px;padding:0 12px">${ic('plus')}</button></div>
  <div class="chips">${[['owned', 'Колекція'], ['fav', 'Улюблені'], ['wish', 'Хочу'], ['all', 'Уся база']].map(([v, l]) => `<button class="chip ${LF.tab === v ? 'on' : ''}" onclick="App.libTab('${v}')">${l} <span class="n">${counts[v]}</span></button>`).join('')}</div>
  <div class="chips" style="margin-top:4px">${[['name', 'А–Я'], ['rating', '★ BGG'], ['plays', 'Партії'], ['last', 'Давно не грали'], ['cx', 'Складність'], ['added', 'Нові']].map(([v, l]) => `<button class="chip ${LF.sort === v ? 'on' : ''}" style="height:30px;font-size:12px" onclick="App.libSort('${v}')">${l}</button>`).join('')}</div>
  <div id="libres" style="margin-top:10px"></div>`;
  const q = $('#libq', el);
  q.oninput = () => { LF.q = q.value; renderShelf(el); };
  $('#libadd', el).onclick = () => addGamesSheet(LF.tab === 'wish' ? 'wish' : 'owned');
  renderShelf(el);
};
function shelfBox(g) {
  const h = 0.86 + Math.min(g.cx7, 7) * 0.025;
  const plays = playsOf(g.id).length;
  return `<div class="bx" onclick="App.openGame(${g.id})" style="--h:${h};--c1:${g.pal[0]};--c2:${g.pal[1]}">
    <div class="bx-c"><div class="bx-f">${poster(g)}</div><div class="bx-s"><span>${esc(g.n)}</span></div><div class="bx-t"></div></div>
    <div class="bx-tag">${g.fav ? `<i class="hf">${ic('heart')}</i>` : ''}${plays ? `<i>${plays}×</i>` : ''}</div><div class="bx-sh"></div></div>`;
}
function renderShelf(el) {
  if (LF.view !== 'shelf') return renderLibResults(el);
  const list = filterGames(), box = $('#libres', el);
  const per = 3, rows = [];
  for (let i = 0; i < list.length; i += per) rows.push(list.slice(i, i + per));
  const addTile = `<button class="bx bx-add" onclick="App.addGames('${LF.tab === 'wish' ? 'wish' : 'owned'}')"><div class="bx-ghost">${ic('plus')}<span>Додати</span></div><div class="bx-sh"></div></button>`;
  if (rows.length && rows[rows.length - 1].length < per) rows[rows.length - 1].push(null); else rows.push([null]);
  box.innerHTML = `<div class="bookcase ${list.length ? '' : 'empty-case'}">
    ${!list.length && !LF.q ? `<div class="case-empty"><div class="h-display" style="font-size:20px;font-weight:800">${LF.tab === 'owned' ? 'Полиця чекає на перші ігри' : 'Тут поки порожньо'}</div><p class="muted">Додайте з каталогу, з BGG або вручну — коробки з’являться тут.</p></div>` : ''}
    ${list.length || !LF.q ? rows.map((r, ri) => `<div class="shelf-row" style="animation-delay:${ri * .07}s"><div class="shelf-boxes">${r.map(g => g ? shelfBox(g) : addTile).join('')}</div><div class="plank"><i></i></div></div>`).join('') : `<div class="empty"><div class="big">🔍</div><b>Нічого не знайшли</b><button class="btn accent" onclick="App.bggSearch()">Шукати «${esc(LF.q)}» на BGG</button></div>`}
  </div>`;
}

// ---------- «Ще» тепер відкривається окремим екраном ----------
const _more2 = SCREENS.more;
SCREENS.more = el => {
  _more2(el);
  if (Nav.stack.some(s => s.el === el)) { const tb = $('.topbar', el); tb.insertAdjacentHTML('afterbegin', `<button class="iconbtn" onclick="App.back()">${ic('back')}</button>`); }
  $$('.hubc', el).forEach(b => { if ((b.getAttribute('onclick') || '').includes("tab('match')")) b.setAttribute('onclick', "App.tab('match')"); });
};
const _home2 = SCREENS.home;
SCREENS.home = el => {
  _home2(el);
  const tb = $('.topbar', el); tb && tb.insertAdjacentHTML('beforeend', `<button class="iconbtn" onclick="App.openMore()" aria-label="Ще">${ic('more')}</button>`);
  const q = $('.quick', el);
  if (q) q.innerHTML = [['timer', 'Таймер', '#5CC8F0', 'App.openTimer()'], ['dice', 'Міні-ігри', '#FFB84D', 'App.openMiniGames()'], ['news', 'Новини', '#B08CFF', 'App.openNews()'], ['more', 'Ще', '#FF7A2F', 'App.openMore()']]
    .map(([i, l, c, f]) => `<button class="qa" onclick="${f}"><span class="qi" style="background:color-mix(in srgb,${c} 18%,transparent);color:${c}">${ic(i)}</span>${l}</button>`).join('');
};
