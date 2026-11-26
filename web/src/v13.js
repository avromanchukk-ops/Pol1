// ================= v1.3: нова навігація, фото, оцінка 1–10, жести полиці, нові таймери =================
Object.assign(ICONS, {
  camera: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H7l1.6-2.2A1.8 1.8 0 0 1 10 3h4a1.8 1.8 0 0 1 1.4.8L17 6h1.5A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><circle cx="12" cy="12.5" r="3.8"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="9.5" r="1.8"/><path d="m4 18 5.5-5.5 4 4 2.5-2.5L21 19"/>',
  sort: '<path d="M7 4v16M3.5 16.5 7 20l3.5-3.5M13 6h8M13 11h6M13 16h4"/>',
  chess: '<path d="M8 21h8M7 18h10M9 18l1-6h4l1 6M10 12 8.5 8.5 10 6h4l1.5 2.5L14 12M12 3v3"/>',
  hourglass: '<path d="M6 3h12M6 21h12M7.5 3v3.2L12 11l4.5-4.8V3M7.5 21v-3.2L12 13l4.5 4.8V21"/>',
  minus: '<path d="M5 12h14"/>',
  flag: '<path d="M5 21V4M5 4h12l-2.5 4L17 12H5"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2.5"/>',
  next: '<path d="M5 12h12M12 6l6 6-6 6"/>',
});

// ---------- фото: стискання + сховище IndexedDB ----------
const PH = { db: null, t: {}, c: {}, n: 0, bytes: 0 };
PH.open = () => new Promise((res, rej) => {
  if (PH.db) return res(PH.db);
  if (!window.indexedDB) return rej(new Error('IndexedDB недоступна'));
  const r = indexedDB.open('polytsia-photos', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('p', { keyPath: 'id' });
  r.onsuccess = () => res(PH.db = r.result); r.onerror = () => rej(r.error);
});
PH.tx = (mode, fn) => PH.open().then(db => new Promise((res, rej) => {
  const t = db.transaction('p', mode), req = fn(t.objectStore('p'));
  t.oncomplete = () => res(req && 'result' in req ? req.result : undefined); t.onerror = () => rej(t.error);
}));
const d2u = d => { try { const [h, b] = d.split(','); const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return URL.createObjectURL(new Blob([u], { type: h.slice(5, h.indexOf(';')) })); } catch (e) { return d; } };
PH.cache = r => { PH.t[r.id] = d2u(r.t); if (r.k === 'cover') PH.c[r.id] = d2u(r.f); };
PH.load = async () => {
  const all = await PH.tx('readonly', s => s.getAll());
  all.forEach(PH.cache); PH.n = all.length; PH.bytes = all.reduce((a, r) => a + (r.f.length + r.t.length) * .75, 0);
};
PH.put = async r => { await PH.tx('readwrite', s => s.put(r)); PH.cache(r); PH.n++; PH.bytes += (r.f.length + r.t.length) * .75; };
PH.get = id => PH.tx('readonly', s => s.get(id));
PH.stat = async () => { const all = await PH.tx('readonly', s => s.getAll()); PH.n = all.length; PH.bytes = all.reduce((a, r) => a + (r.f.length + r.t.length) * .75, 0); };
PH.del = ids => { ids = [].concat(ids).filter(Boolean); if (!ids.length) return; ids.forEach(id => { delete PH.t[id]; delete PH.c[id]; }); PH.tx('readwrite', s => { ids.forEach(id => s.delete(id)); }).then(PH.stat).catch(() => {}); };
PH.clear = () => { PH.t = {}; PH.c = {}; PH.n = 0; PH.bytes = 0; return PH.tx('readwrite', s => s.clear()).catch(() => {}); };
const fmtBytes = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' МБ' : Math.max(1, Math.round(b / 1024)) + ' КБ';

function shrinkImg(img, max, q) {
  const k = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const cv = document.createElement('canvas'); cv.width = Math.round((img.naturalWidth || img.width) * k); cv.height = Math.round((img.naturalHeight || img.height) * k);
  const cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(img, 0, 0, cv.width, cv.height);
  let d = cv.toDataURL('image/webp', q); if (!d.startsWith('data:image/webp')) d = cv.toDataURL('image/jpeg', q);
  return d;
}
function loadImg(file) {
  return new Promise((res, rej) => { const u = URL.createObjectURL(file), i = new Image(); i.onload = () => { res(i); setTimeout(() => URL.revokeObjectURL(u), 1000); }; i.onerror = () => rej(new Error('Не вдалося відкрити фото')); i.src = u; });
}
// Обкладинка: 640 px, кадр партії: 1080 px. Мініатюри: 240 px. Формат WebP.
async function savePhoto(file, kind) {
  const img = await loadImg(file);
  const big = kind === 'cover' ? [640, .72] : [1080, .62];
  const r = { id: 'ph' + uid(), k: kind, f: shrinkImg(img, ...big), t: shrinkImg(img, 240, .6), at: Date.now() };
  await PH.put(r);
  return r;
}
function pickFile(capture) {
  return new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; if (capture) i.setAttribute('capture', 'environment');
    i.style.display = 'none'; document.body.appendChild(i);
    i.onchange = () => { res(i.files[0] || null); i.remove(); }; i.click();
  });
}
// Аркуш «Камера / Галерея» → повертає збережений запис фото
function photoFlow(kind, title, extra = '') {
  return new Promise(res => {
    const sh = openSheet({ title, body: `<div class="ph-src"><button data-src="cam"><span>${ic('camera')}</span><b>Камера</b><i>Сфотографувати зараз</i></button><button data-src="gal"><span>${ic('image')}</span><b>Галерея</b><i>Обрати готове фото</i></button></div>
      <p class="muted" style="font-size:12px;margin-top:12px;text-align:center">Фото стискається до ${kind === 'cover' ? '~40' : '~90'} КБ і зберігається лише в додатку.</p>${extra}` });
    $$('[data-src]', sh.el).forEach(b => b.onclick = async () => {
      const f = await pickFile(b.dataset.src === 'cam'); sh.close(); if (!f) return res(null);
      try { toast('Стискаємо фото…'); const r = await savePhoto(f, kind); toast(`Фото збережено · ${fmtBytes((r.f.length + r.t.length) * .75)}`); haptic(15); res(r); }
      catch (e) { toast(e.message || 'Помилка фото'); res(null); }
    });
    const rm = $('[data-rm]', sh.el); if (rm) rm.onclick = () => { sh.close(); res('remove'); };
  });
}
async function setCover(id) {
  const g = G(id);
  const r = await photoFlow('cover', 'Фото коробки', g.ph ? `<button class="btn danger block" data-rm style="margin-top:14px">${ic('trash')} Прибрати фото</button>` : '');
  if (!r) return;
  const old = G(id).ph;
  if (r === 'remove') { upd(id, { ph: null }); PH.del(old); toast('Фото прибрано'); }
  else { upd(id, { ph: r.id }); if (old) PH.del(old); }
  Object.keys(posterCache).forEach(k => { if (k.startsWith(String(id))) delete posterCache[k]; });
  refreshTop();
}
// Переглядач фото
const PVW = { close: null };
async function viewPhotos(ids, idx = 0) {
  if (!ids.length) return;
  const ov = document.createElement('div'); ov.className = 'pv'; ov.innerHTML = `<div class="pv-img"></div><button class="pv-x">${ic('close')}</button><div class="pv-n"></div>${ids.length > 1 ? `<button class="pv-a l">${ic('back')}</button><button class="pv-a r">${ic('back')}</button>` : ''}`;
  $('#app').appendChild(ov); requestAnimationFrame(() => ov.classList.add('on'));
  const show = async i => { idx = (i + ids.length) % ids.length; $('.pv-n', ov).textContent = ids.length > 1 ? `${idx + 1} / ${ids.length}` : ''; const box = $('.pv-img', ov); box.style.backgroundImage = `url(${PH.t[ids[idx]] || ''})`; try { const r = await PH.get(ids[idx]); if (r) box.style.backgroundImage = `url(${r.f})`; } catch (e) {} };
  PVW.close = () => { ov.classList.remove('on'); setTimeout(() => ov.remove(), 250); PVW.close = null; };
  $('.pv-x', ov).onclick = PVW.close;
  $('.pv-img', ov).onclick = PVW.close;
  const l = $('.pv-a.l', ov); if (l) { l.onclick = () => show(idx - 1); $('.pv-a.r', ov).onclick = () => show(idx + 1); }
  let sx = 0; ov.addEventListener('pointerdown', e => sx = e.clientX); ov.addEventListener('pointerup', e => { const dx = e.clientX - sx; if (Math.abs(dx) > 60 && ids.length > 1) { e.stopPropagation(); show(idx + (dx < 0 ? 1 : -1)); } });
  show(idx);
}
const _backV12 = back;
back = function () { if (PVW.close) { PVW.close(); return true; } return _backV12(); };
App.back = back;

// постер: фото власної коробки має пріоритет над картинкою BGG
function poster(g, cls = '', extra = '') {
  const [c1, c2] = g.pal || ['#555', '#222'];
  const key = g.id + (g.m || '');
  const svg = posterCache[key] || (posterCache[key] = motifSVG(g.m, g.id, c1));
  const len = (g.n || '').length, k = len > 22 ? .62 : len > 15 ? .76 : len > 10 ? .9 : 1;
  const src = (g.ph && PH.c[g.ph]) || g.img;
  const img = src ? `<img src="${esc(src)}" loading="lazy" alt="" onerror="this.remove()">` : '';
  return `<div class="poster ${cls}" style="--c1:${c1};--c2:${c2}">${svg}<div class="vign"></div><div class="py">${g.y || ''}</div><div class="pt"><span style="font-size:${k}em">${esc(g.n)}</span></div>${img}${extra}</div>`;
}

// ---------- таббар: Головна · Полиця · [+] · ♥ Матч · Ще ----------
function init() {
  loadState();
  const tabs = [['home', 'home', 'Головна'], ['library', 'shelf', 'Полиця'], ['+add', 'plus', 'Додати'], ['match', 'heart', 'Матч'], ['more', 'more', 'Ще']];
  $('#tabbar').innerHTML = tabs.map(([k, i, l]) => k === '+add'
    ? `<button class="tab-add" id="tabadd" aria-label="Додати">${ic(i)}<span>${l}</span></button>`
    : `<button data-tab="${k}">${ic(i)}<span>${l}</span></button>`).join('');
  $$('#tabbar button[data-tab]').forEach(b => b.onclick = () => { if (Nav.tab === b.dataset.tab && !Nav.stack.length) { const sc = Nav.base?.el; sc && sc.scrollTo({ top: 0, behavior: 'smooth' }); return; } goTab(b.dataset.tab); });
  $('#tabadd').onclick = () => addHub();
  const start = () => { goTab('home'); };
  Promise.race([PH.load(), new Promise(r => setTimeout(r, 1500))]).catch(() => {}).finally(start);
  setTimeout(() => $('#splash').classList.add('out'), 1700);
  setTimeout(() => $('#splash')?.remove(), 2500);
  if (HAS_NATIVE && Date.now() - (S.news.at || 0) > 6 * 36e5 && allIds().some(id => S.games[id]?.follow)) setTimeout(() => refreshNews().catch(() => {}), 4000);
}
Object.assign(App, {
  openMore() { goTab('more'); },
  openStats(v) { if (v) SF.view = v; push(SCREENS.stats); },
  openTimer(m) { if (m) TM.mode = m; push(SCREENS.timer); },
  setCover: id => setCover(id), exportData, importData,
  viewPlayPhotos(pid, i) { const p = S.plays.find(x => x.id === pid); if (p) viewPhotos(p.photos || [], i); },
  viewGamePhotos(gid, i) { viewPhotos(playsOf(gid).flatMap(p => p.photos || []).filter(id => PH.t[id]), i); },
});

// «Партії» тепер відкриваються з «Ще» — додаємо кнопку «назад»
const _statsV12 = SCREENS.stats;
SCREENS.stats = el => {
  _statsV12(el);
  if (Nav.stack.some(s => s.el === el)) $('.topbar', el).insertAdjacentHTML('afterbegin', `<button class="iconbtn" onclick="App.back()">${ic('back')}</button>`);
};

// ---------- «Ще»: усе під рукою ----------
SCREENS.more = el => {
  const n = S.plays.length, last = S.plays[0];
  const wk = S.plays.filter(p => daysSince(p.date) <= 30).length;
  const row = (i, t, s, f, c) => `<div class="setrow" onclick="${f}"><span class="si" ${c ? `style="color:${c};background:color-mix(in srgb,${c} 15%,transparent)"` : ''}>${ic(i)}</span><div class="st-m"><b>${t}</b><span>${esc(s)}</span></div>${ic('back', 'ico')}</div>`;
  el.innerHTML = `${topbar('Ще', { sub: 'Усе під рукою' })}
  <div class="wrap stagger">
   <button class="mh-hero" onclick="App.openStats()"><div class="mh-glow"></div><span class="mh-ic">${ic('chart')}</span>
    <div style="flex:1;min-width:0"><b>Партії і статистика</b><span>${n ? `${plural(n, 'партія', 'партії', 'партій')} · ${wk} за місяць` : 'Журнал, графіки, переможці'}</span>${last ? `<i>Остання: ${esc(G(last.g).n)} · ${agoText(daysSince(last.date))}</i>` : ''}</div>${ic('back', 'ico mh-ar')}</button>
   <div class="mh-grid">
    ${[['dice', 'Міні-ігри', 'Шахи, аліас, агенти…', '#FFB84D', 'App.openMiniGames()'], ['timer', 'Таймер', 'Ліміт ходу, шаховий', '#5CC8F0', 'App.openTimer()'], ['news', 'Новини', 'Анонси й Kickstarter', '#B08CFF', 'App.openNews()'], ['clock', 'Історія змін', (S.history || []).length ? plural(S.history.length, 'запис', 'записи', 'записів') : 'Поки порожньо', '#3DDC97', 'App.openHistory()']]
      .map(([i, t, s, c, f]) => `<button class="mh-t" onclick="${f}" style="--c:${c}"><span>${ic(i)}</span><b>${t}</b><i>${s}</i></button>`).join('')}
   </div>
  </div>
  <div class="mh-sec">Колекція</div>
  ${row('tag', 'Мітки', `${plural(S.labels.length, 'мітка', 'мітки', 'міток')}`, 'App.openLabels()', '#3DDC97')}
  ${row('users', 'Гравці', S.players.map(p => p.n).join(', ') || 'Немає', 'App.openPlayers()', '#5CC8F0')}
  <div class="mh-sec">Дані</div>
  ${row('settings', 'Налаштування та BGG', S.settings.bggToken ? 'Токен BGG підключено ✓' : 'Підключіть BoardGameGeek', 'App.openSettings()')}
  ${row('image', 'Фото', PH.n ? `${plural(PH.n, 'фото', 'фото', 'фото')} · ${fmtBytes(PH.bytes)}` : 'Коробки й партії — поки немає', 'App.photoInfo()')}
  ${row('download', 'Експорт даних', 'Резервна копія разом із фото', 'App.exportData()')}
  ${row('upload', 'Імпорт даних', 'Відновити з файлу', 'App.importData()')}
  <div class="empty" style="padding-top:26px;font-size:12px">Полиця 1.3 · дані зберігаються лише на цьому пристрої</div>`;
};
App.photoInfo = () => {
  const covers = Object.keys(PH.c).length, plays = PH.n - covers;
  openSheet({ title: 'Фото', body: `<div class="kv"><span>Коробки</span><b>${covers}</b></div><div class="kv"><span>Партії</span><b>${Math.max(0, plays)}</b></div><div class="kv"><span>Займають</span><b>${fmtBytes(PH.bytes)}</b></div>
    <p class="muted" style="font-size:13px;margin-top:14px">Кожне фото стискається одразу після зйомки: коробка — до 640 px (~40 КБ), партія — до 1080 px (~90 КБ). Тисяча фото ≈ 80–100 МБ. Фото лежать усередині додатку і потрапляють в експорт. Якщо видалити додаток, вони зникнуть — тому робіть експорт.</p>`, foot: `<button class="btn accent block" onclick="App.closeSheets();App.exportData()">${ic('download')} Зробити резервну копію</button>` });
};

// ---------- головна: без «⋯», швидкі дії ----------
const _homeV12 = SCREENS.home;
SCREENS.home = el => {
  _homeV12(el);
  $('.topbar [aria-label="Ще"]', el)?.remove();
  const q = $('.quick', el);
  if (q) q.innerHTML = [['chart', 'Партії', '#FF7A2F', 'App.openStats()'], ['timer', 'Таймер', '#5CC8F0', 'App.openTimer()'], ['dice', 'Міні-ігри', '#FFB84D', 'App.openMiniGames()'], ['news', 'Новини', '#B08CFF', 'App.openNews()']]
    .map(([i, l, c, f]) => `<button class="qa" onclick="${f}"><span class="qi" style="background:color-mix(in srgb,${c} 18%,transparent);color:${c}">${ic(i)}</span>${l}</button>`).join('');
};

// ---------- полиця: свайп між полицями, сортування списком, довге натискання ----------
const LIB_TABS = [['owned', 'Колекція'], ['fav', 'Улюблені'], ['wish', 'Хочу'], ['all', 'Уся база']];
const LIB_SORTS = [['name', 'За назвою', 'А–Я'], ['added', 'Нещодавно додані', 'Нові'], ['my', 'Моя оцінка', 'Моя оцінка'], ['rating', 'Рейтинг BGG', '★ BGG'], ['plays', 'Найбільше партій', 'Партії'], ['last', 'Давно не грали', 'Давно не грали'], ['cx', 'Складність', 'Складність']];
function filterGames() {
  let list = allIds().map(G).filter(g => LF.tab === 'owned' ? g.owned : LF.tab === 'wish' ? g.wish : LF.tab === 'fav' ? g.fav : true);
  if (LF.q) { const q = LF.q.toLowerCase(); list = list.filter(g => g.n.toLowerCase().includes(q) || (g.c || []).some(c => c.toLowerCase().includes(q))); }
  if (LF.cx.length) list = list.filter(g => LF.cx.includes(g.cx7));
  if (LF.pl) list = list.filter(g => g.p[0] <= LF.pl && g.p[1] >= LF.pl);
  if (LF.time) list = list.filter(g => g.t[0] <= LF.time);
  if (LF.labels.length) list = list.filter(g => LF.labels.every(l => (g.labels || []).includes(l)));
  if (LF.plays !== 'any') list = list.filter(g => { const n = playsOf(g.id).length; return LF.plays === '0' ? n === 0 : LF.plays === '1-5' ? n >= 1 && n <= 5 : n > 5; });
  const sorts = {
    name: (a, b) => a.n.localeCompare(b.n), rating: (a, b) => (b.r || 0) - (a.r || 0), plays: (a, b) => playsOf(b.id).length - playsOf(a.id).length,
    last: (a, b) => (lastPlay(a.id) || '0').localeCompare(lastPlay(b.id) || '0'), cx: (a, b) => a.cx7 - b.cx7, added: (a, b) => (b.added || 0) - (a.added || 0),
    my: (a, b) => (b.my || 0) - (a.my || 0) || (b.r || 0) - (a.r || 0),
  };
  return list.sort(sorts[LF.sort] || sorts.name);
}
SCREENS.library = el => {
  const counts = { owned: ownedIds().length, wish: allIds().filter(id => S.games[id]?.wish).length, fav: allIds().filter(id => S.games[id]?.fav).length, all: allIds().length };
  const sl = (LIB_SORTS.find(s => s[0] === LF.sort) || LIB_SORTS[0])[2];
  el.innerHTML = `${topbar('Полиця', { sub: plural(counts.owned, 'гра', 'гри', 'ігор') + ' у колекції', right: `<button class="iconbtn" onclick="App.filters()">${ic('filter')}${activeFilters() ? '<span class="dot"></span>' : ''}</button>` })}
  <div class="search">${ic('search')}<input placeholder="Назва або жанр…" value="${esc(LF.q)}" id="libq"><button id="libadd" class="btn sm accent" style="height:34px;padding:0 12px" aria-label="Додати гру">${ic('plus')}</button></div>
  <div class="chips lib-tabs" id="libtabs">${LIB_TABS.map(([v, l]) => `<button class="chip ${LF.tab === v ? 'on' : ''}" data-lt="${v}">${l} <span class="n">${counts[v]}</span></button>`).join('')}</div>
  <div class="lib-tools"><button class="sortbtn" id="libsort">${ic('sort')}<span>${sl}</span></button>
   <div class="viewseg">${[['shelf', 'shelf', 'Полиця'], ['grid', 'grid', 'Плитки'], ['list', 'list', 'Список']].map(([v, i, l]) => `<button class="${LF.view === v ? 'on' : ''}" data-v="${v}" aria-label="${l}">${ic(i)}</button>`).join('')}</div></div>
  <div id="libres" class="libres ${LF._dir ? 'in-' + LF._dir : ''}"></div>
  <p class="lib-hint">Свайпніть убік — інша полиця · затисніть гру — швидкі дії</p>`;
  LF._dir = '';
  const q = $('#libq', el);
  q.oninput = () => { LF.q = q.value; renderShelf(el); };
  $('#libadd', el).onclick = () => addGamesSheet(LF.tab === 'wish' ? 'wish' : 'owned');
  $$('[data-lt]', el).forEach(b => b.onclick = () => switchLib(b.dataset.lt));
  $$('[data-v]', el).forEach(b => b.onclick = () => { LF.view = b.dataset.v; haptic(6); refreshTop(); });
  $('#libsort', el).onclick = sortSheet;
  setTimeout(() => $('#libtabs .chip.on', el)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }), 30);
  renderShelf(el);
  const box = $('#libres', el);
  bindSwipe(box, dir => { const i = LIB_TABS.findIndex(t => t[0] === LF.tab), j = i + dir; if (j < 0 || j >= LIB_TABS.length) { box.classList.add(dir > 0 ? 'bump-l' : 'bump-r'); setTimeout(() => box.classList.remove('bump-l', 'bump-r'), 300); return; } switchLib(LIB_TABS[j][0]); });
  bindLongPress(box, '[onclick*="openGame("]', t => +t.getAttribute('onclick').match(/openGame\((\d+)/)[1], gameActions);
};
function switchLib(v) {
  if (v === LF.tab) return;
  const i = LIB_TABS.findIndex(t => t[0] === LF.tab), j = LIB_TABS.findIndex(t => t[0] === v);
  const box = $('#libres'); LF._dir = j > i ? 'r' : 'l';
  if (box) { box.classList.add('out-' + (j > i ? 'l' : 'r')); }
  haptic(8);
  setTimeout(() => { LF.tab = v; refreshTop(); }, box ? 140 : 0);
}
function sortSheet() {
  const sh = openSheet({ title: 'Сортування', body: `<div class="opt-list">${LIB_SORTS.map(([v, l]) => `<button class="${LF.sort === v ? 'on' : ''}" data-s="${v}"><span>${l}</span>${LF.sort === v ? ic('check') : ''}</button>`).join('')}</div>` });
  $$('[data-s]', sh.el).forEach(b => b.onclick = () => { LF.sort = b.dataset.s; haptic(6); sh.close(); refreshTop(); });
}
function bindSwipe(el, cb) {
  let sx = 0, sy = 0, t0 = 0, on = false;
  el.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button) return; sx = e.clientX; sy = e.clientY; t0 = Date.now(); on = true; });
  el.addEventListener('pointercancel', () => on = false);
  el.addEventListener('pointerup', e => {
    if (!on) return; on = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8 && Date.now() - t0 < 700) { el._swiped = true; setTimeout(() => el._swiped = false, 60); cb(dx < 0 ? 1 : -1); }
  });
  el.addEventListener('click', e => { if (el._swiped) { e.stopPropagation(); e.preventDefault(); } }, true);
}
function bindLongPress(root, sel, getId, onLong) {
  let tm = 0, sx = 0, sy = 0, fired = false, tgt = null;
  const cancel = () => { clearTimeout(tm); tgt && tgt.classList.remove('lp-arm'); tgt = null; };
  root.addEventListener('pointerdown', e => {
    const t = e.target.closest(sel); if (!t || !root.contains(t)) return;
    fired = false; tgt = t; sx = e.clientX; sy = e.clientY; t.classList.add('lp-arm');
    tm = setTimeout(() => { fired = true; t.classList.remove('lp-arm'); haptic(35); onLong(getId(t), t); }, 480);
  });
  root.addEventListener('pointermove', e => { if (tgt && (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10)) cancel(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => root.addEventListener(ev, cancel));
  root.addEventListener('click', e => { if (fired) { e.stopPropagation(); e.preventDefault(); fired = false; } }, true);
  root.addEventListener('contextmenu', e => { if (e.target.closest(sel)) e.preventDefault(); });
}
function gameActions(id) {
  const g = G(id), n = playsOf(id).length;
  const where = LF.tab;
  const rm = where === 'wish' ? ['unwish', 'Прибрати з «Хочу»'] : where === 'fav' ? ['unfav', 'Прибрати з улюблених'] : g.owned ? ['unown', 'Прибрати з полиці'] : g.wish ? ['unwish', 'Прибрати з «Хочу»'] : null;
  const sh = openSheet({ title: '', body: `<div class="ga-head">${poster(g)}<div><b>${esc(g.n)}</b><span>${g.y || ''}${n ? ' · ' + plural(n, 'партія', 'партії', 'партій') : ''}${g.my ? ' · моя оцінка ' + g.my : ''}</span></div></div>
   <div class="opt-list">
    <button data-a="open">${ic('info')}<span>Відкрити</span></button>
    <button data-a="play">${ic('dice')}<span>Записати партію</span></button>
    <button data-a="fav">${ic('heart')}<span>${g.fav ? 'Прибрати з улюблених' : 'В улюблені'}</span></button>
    <button data-a="photo">${ic('camera')}<span>${g.ph ? 'Змінити фото коробки' : 'Сфотографувати коробку'}</span></button>
    ${g.wish && !g.owned ? `<button data-a="buy">${ic('check')}<span>Купили — на полицю</span></button>` : ''}
    ${g.owned ? `<button data-a="towish">${ic('bookmark')}<span>Перенести в «Хочу»</span></button>` : ''}
    ${rm ? `<button data-a="${rm[0]}" class="danger">${ic('trash')}<span>${rm[1]}</span></button>` : ''}
   </div>` });
  const go = fn => { sh.close(); setTimeout(fn, 230); };
  $$('[data-a]', sh.el).forEach(b => b.onclick = () => {
    const a = b.dataset.a; haptic(8);
    if (a === 'open') return go(() => App.openGame(id));
    if (a === 'play') return go(() => logPlay(id));
    if (a === 'photo') return go(() => setCover(id));
    const patch = { fav: { fav: !g.fav }, buy: { owned: true, wish: false, added: Date.now() }, towish: { owned: false, wish: true }, unown: { owned: false }, unwish: { wish: false }, unfav: { fav: false } }[a];
    upd(id, patch); sh.close();
    toast({ fav: g.fav ? 'Прибрано з улюблених' : 'В улюблених ♥', buy: 'На полиці 🎉', towish: 'Перенесено в «Хочу»', unown: `«${g.n}» прибрано з полиці`, unwish: 'Прибрано з «Хочу»', unfav: 'Прибрано з улюблених' }[a]);
    refreshTop();
  });
}

// ---------- сторінка гри: кнопка в потоці, опис, оцінка 1–10, фото ----------
const RATE_WORDS = ['', 'Жахливо', 'Дуже погано', 'Погано', 'Так собі', 'Посередньо', 'Нормально', 'Добре', 'Дуже добре', 'Чудово', 'Шедевр'];
const rateCol = v => `hsl(${Math.round((v - 1) / 9 * 125)} 75% 55%)`;
const _detV12 = SCREENS.detail;
SCREENS.detail = (el, id) => {
  _detV12(el, id);
  const g = G(id);
  $('.sticky-cta', el)?.remove();
  const sts = $$('.stats4 .st', el);
  if (sts[1]) sts[1].outerHTML = `<div class="st my" ${g.my ? `style="--rc:${rateCol(g.my)}"` : ''}><b>${g.my || '—'}</b><span>Моя</span></div>`;
  // короткий опис одразу під назвою
  const about = $$('.wrap .card', el).find(c => $('h3', c)?.textContent.trim().startsWith('Про гру'));
  about && about.remove();
  const d = (g.d || '').trim();
  $('.det-year', el).insertAdjacentHTML('afterend', `<div class="det-desc ${d.length > 150 ? 'long' : ''}" id="ddesc"><p>${d ? esc(d) : '<span class="muted">Опис з’явиться після синхронізації з BGG.</span>'}</p>
    <div class="dd-act">${d.length > 150 ? `<button id="ddmore">Детальніше</button>` : ''}${g.custom ? '' : `<button onclick="App.url('https://boardgamegeek.com/boardgame/${id}')">BGG ${ic('link')}</button>`}</div></div>`);
  const mb = $('#ddmore', el); if (mb) mb.onclick = () => { const x = $('#ddesc', el); x.classList.toggle('open'); mb.textContent = x.classList.contains('open') ? 'Згорнути' : 'Детальніше'; };
  // кнопка «Записати партію» — у потоці, під діями
  $('.actbar', el).insertAdjacentHTML('afterend', `<div class="det-cta"><button class="btn accent block" onclick="App.logPlay(${id})">${ic('plus')} Записати партію</button><button class="btn ghost" onclick="App.setCover(${id})" aria-label="Фото коробки">${ic('camera')}</button></div>`);
  // моя оцінка 1–10
  const wrap = $('.wrap', el);
  wrap.insertAdjacentHTML('afterbegin', `<div class="card rate-card"><h3>Моя оцінка <span class="rv" ${g.my ? `style="color:${rateCol(g.my)}"` : ''}>${g.my ? g.my + '<small>/10</small>' : ''}</span></h3>
   <div class="rate10">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button data-my="${n}" class="${g.my && n <= g.my ? 'f' : ''} ${g.my === n ? 'cur' : ''}" style="--rc:${rateCol(n)}">${n}</button>`).join('')}</div>
   <div class="cxlabel">${g.my ? RATE_WORDS[g.my] : 'Як на BGG: 1 — жахливо, 10 — шедевр'}</div></div>`);
  $$('[data-my]', el).forEach(b => b.onclick = () => { const v = +b.dataset.my; upd(id, { my: G(id).my === v ? null : v }); haptic(v * 2); refreshTop(); });
  // фото партій цієї гри
  const phs = playsOf(id).flatMap(p => p.photos || []).filter(x => PH.t[x]);
  if (phs.length) {
    const hist = $$('.wrap > div', el).find(x => $('.sec-h h2', x)?.textContent.includes('Історія партій'));
    const html = `<div class="card"><h3>Фото партій <span class="muted" style="font-size:12px;font-family:var(--body)">${phs.length}</span></h3><div class="ph-strip">${phs.slice(0, 30).map((p, i) => `<button class="ph-th" style="background-image:url(${PH.t[p]})" onclick="App.viewGamePhotos(${id},${i})"></button>`).join('')}</div></div>`;
    hist ? hist.insertAdjacentHTML('beforebegin', html) : wrap.insertAdjacentHTML('beforeend', html);
  }
};

// ---------- картка партії з мініатюрами фото ----------
function playCard(p) {
  const g = G(p.g), d = parseD(p.date), win = p.players.filter(x => x.w);
  const coop = p.players.length && p.players.every(x => x.s == null);
  const ph = (p.photos || []).filter(x => PH.t[x]);
  return `<div class="play" onclick="App.logPlay(${p.g},'${p.id}')">${poster(g)}<div class="pm"><b>${esc(g.n)}</b>
  <div class="m">${p.players.map(x => esc(x.n) + (x.s != null && !coop ? ' ' + x.s : '')).join(' · ') || 'Без гравців'} · ${fmtDur(p.dur || 0)}</div>
  ${win.length ? `<div class="win">${ic('crown')} ${coop ? 'Перемога команди' : win.map(w => esc(w.n)).join(', ')}</div>` : coop ? `<div class="win" style="color:var(--no)">Поразка команди</div>` : ''}
  ${ph.length ? `<div class="pc-ph">${ph.slice(0, 4).map((x, i) => `<span style="background-image:url(${PH.t[x]})" onclick="event.stopPropagation();App.viewPlayPhotos('${p.id}',${i})"></span>`).join('')}${ph.length > 4 ? `<em>+${ph.length - 4}</em>` : ''}</div>` : ''}
  </div><div class="date"><b>${d.getDate()}</b>${MONTHS_S[d.getMonth()]}</div><span class="pedit">${ic('edit')}</span></div>`;
}

// ---------- запис партії з фото ----------
function logPlay(gameId, playId, preset) {
  const ex = playId ? S.plays.find(p => p.id === playId) : null;
  const lastG = S.plays[0]?.g;
  const st = ex ? JSON.parse(JSON.stringify(ex)) : Object.assign({ id: uid(), g: gameId ? +gameId : (lastG || ownedIds()[0] || CATALOG[0].id), date: todayStr(), dur: 0, players: S.players.slice(0, 2).map(p => ({ n: p.n, s: null, w: false })), note: '', photos: [] }, preset || {});
  st.photos = st.photos || [];
  if (!ex && !st.dur) { const g = G(st.g); st.dur = g.t ? g.t[0] : 30; }
  const fresh = [], removed = []; let saved = false, gq = '';
  const draw = sh => {
    const g = G(st.g);
    const pool = (gq ? allIds() : [...new Set([st.g, ...S.plays.map(p => p.g), ...ownedIds()])]).map(G).filter(x => !gq || x.n.toLowerCase().includes(gq.toLowerCase())).slice(0, 30);
    const coop = (g.c || []).includes('Кооператив');
    $('.sh-body', sh).innerHTML = `
     <div class="fld"><label>Гра</label><input class="inp" id="gq" placeholder="Пошук гри…" value="${esc(gq)}" style="height:40px;margin-bottom:10px"><div class="gpick">${pool.map(x => `<div class="tile ${x.id === st.g ? 'on' : ''}" data-g="${x.id}">${poster(x)}<div class="tname">${esc(x.n)}</div></div>`).join('')}</div></div>
     <div class="fld-row"><div class="fld"><label>Дата</label><input class="inp" type="date" id="pd" value="${st.date}" max="${todayStr()}"></div><div class="fld"><label>Хвилин</label><input class="inp" type="number" id="pdur" value="${st.dur || ''}" min="1" inputmode="numeric"></div></div>
     <div class="fld"><label>Гравці ${coop ? '· кооператив' : ''}</label>
      <div class="chips wrapc" style="margin-bottom:10px">${S.players.map(p => `<button class="chip ${st.players.some(x => x.n === p.n) ? 'on' : ''}" data-p="${esc(p.n)}">${esc(p.n)}</button>`).join('')}<button class="chip" id="addp">${ic('plus')} Новий</button></div>
      ${st.players.map((x, i) => { const col = S.players.find(p => p.n === x.n)?.col || '#999'; return `<div class="pl-row"><span class="nm"><span class="av" style="background:${col}">${esc(x.n[0] || '?')}</span>${esc(x.n)}</span>${coop ? '' : `<input type="number" inputmode="numeric" placeholder="очки" data-s="${i}" value="${x.s ?? ''}">`}<button class="crown ${x.w ? 'on' : ''}" data-w="${i}">${ic('crown')}</button></div>`; }).join('')}
      ${coop ? `<div class="muted" style="font-size:12px">У кооперативі позначте корону всім, якщо команда перемогла.</div>` : ''}
     </div>
     <div class="fld"><label>Фото партії ${st.photos.length ? `· ${st.photos.length}` : ''}</label><div class="ph-row">
      ${st.photos.map((pid, i) => `<div class="ph-th" data-ph="${i}" style="background-image:url(${PH.t[pid] || ''})"><button data-phdel="${i}" aria-label="Прибрати">${ic('close')}</button></div>`).join('')}
      <button class="ph-add" id="phadd">${ic('camera')}<span>Додати фото</span></button></div></div>
     <div class="fld"><label>Нотатка</label><textarea class="inp" id="pn" placeholder="Що запам’яталось?">${esc(st.note)}</textarea></div>`;
    const gqi = $('#gq', sh); gqi.oninput = () => { gq = gqi.value; const pos = gqi.selectionStart; draw(sh); const n = $('#gq', sh); n.focus(); n.setSelectionRange(pos, pos); };
    $$('[data-g]', sh).forEach(t => t.onclick = () => { st.g = +t.dataset.g; const ng = G(st.g); if (!ex) st.dur = ng.t[0]; if ((ng.c || []).includes('Кооператив')) st.players.forEach(p => p.s = null); haptic(6); draw(sh); });
    $('#pd', sh).onchange = e => st.date = e.target.value || todayStr();
    $('#pdur', sh).oninput = e => st.dur = +e.target.value || 0;
    $('#pn', sh).oninput = e => st.note = e.target.value;
    $$('[data-p]', sh).forEach(b => b.onclick = () => { const n = b.dataset.p; const i = st.players.findIndex(x => x.n === n); i >= 0 ? st.players.splice(i, 1) : st.players.push({ n, s: null, w: false }); draw(sh); });
    $$('[data-s]', sh).forEach(inp => inp.oninput = () => { const v = inp.value === '' ? null : +inp.value; st.players[+inp.dataset.s].s = v; });
    $$('[data-w]', sh).forEach(b => b.onclick = () => { const p = st.players[+b.dataset.w]; p.w = !p.w; haptic(6); b.classList.toggle('on', p.w); });
    $$('[data-ph]', sh).forEach(t => t.onclick = e => { if (e.target.closest('[data-phdel]')) return; viewPhotos(st.photos, +t.dataset.ph); });
    $$('[data-phdel]', sh).forEach(b => b.onclick = () => { const [pid] = st.photos.splice(+b.dataset.phdel, 1); fresh.includes(pid) ? PH.del(pid) : removed.push(pid); haptic(6); draw(sh); });
    $('#phadd', sh).onclick = async () => { const r = await photoFlow('play', 'Фото партії'); if (r && r !== 'remove') { st.photos.push(r.id); fresh.push(r.id); draw(sh); } };
    $('#addp', sh).onclick = () => {
      const s2 = openSheet({ title: 'Новий гравець', body: `<input class="inp" id="np" placeholder="Ім’я">`, foot: `<button class="btn accent block" id="npok">Додати</button>`, onMount: (s) => setTimeout(() => $('#np', s).focus(), 300) });
      $('#npok', s2.el).onclick = () => { const n = $('#np', s2.el).value.trim(); if (!n) return; if (!S.players.some(p => p.n === n)) S.players.push({ n, col: PLAYER_COLORS[S.players.length % PLAYER_COLORS.length] }); st.players.push({ n, s: null, w: false }); save(); s2.close(); draw(sh); };
    };
  };
  const foot = `${ex ? `<button class="btn danger" id="pdel">${ic('trash')}</button>` : ''}<button class="btn accent block" id="psave">${ex ? 'Зберегти зміни' : 'Записати партію'}</button>`;
  openSheet({ title: ex ? 'Редагувати партію' : 'Нова партія', body: '', foot, onClose: () => { if (!saved && fresh.length) PH.del(fresh); }, onMount: (sh, api) => {
    draw(sh);
    $('#psave', sh).onclick = () => {
      const coop = (G(st.g).c || []).includes('Кооператив');
      if (!coop && !st.players.some(p => p.w) && st.players.some(p => p.s != null)) { const best = Math.max(...st.players.map(p => p.s ?? -Infinity)); st.players.forEach(p => p.w = p.s === best); }
      if (!st.photos.length) delete st.photos;
      const before = weekStreak().n;
      const i = S.plays.findIndex(p => p.id === st.id);
      i >= 0 ? S.plays[i] = st : S.plays.push(st);
      S.plays.sort((a, b) => b.date.localeCompare(a.date) || 0);
      if (!S.games[st.g]) upd(st.g, { labels: [] });
      saved = true; if (removed.length) PH.del(removed);
      save(); api.close(); haptic(20); toast(ex ? 'Партію оновлено' : 'Партію записано 🎲'); refreshTop();
      const after = weekStreak().n; if (!ex) { if (after > before) setTimeout(() => celebrateStreak(after), 350); else confetti(); }
    };
    const d = $('#pdel', sh); if (d) d.onclick = () => confirmSheet('Видалити цю партію разом із її фото?', 'Видалити', () => { const p = S.plays.find(x => x.id === st.id); S.plays = S.plays.filter(p => p.id !== st.id); saved = true; PH.del([...(p?.photos || []), ...fresh]); save(); api.close(); toast('Партію видалено'); refreshTop(); });
  } });
}

// ---------- дані: експорт/імпорт із фото, очищення ----------
async function exportData() {
  let photos = [];
  try { photos = await PH.tx('readonly', s => s.getAll()); } catch (e) {}
  const t = JSON.stringify(Object.assign({}, S, { photos }));
  const name = 'polytsia-backup-' + todayStr() + '.json';
  if (HAS_NATIVE && window.Native.saveFile) { window.Native.saveFile(name, t); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'application/json' })); a.download = name; a.click(); toast('Файл збережено');
}
function importData() {
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/json,.json';
  i.onchange = () => { const f = i.files[0]; if (!f) return; f.text().then(async t => {
    try {
      const d = JSON.parse(t); if (!d.v || !d.games) throw 0;
      const photos = d.photos || []; delete d.photos;
      S = Object.assign(blankState(), d); save();
      if (photos.length) { await PH.clear(); await PH.tx('readwrite', s => { photos.forEach(r => s.put(r)); }); await PH.load(); }
      toast(`Дані відновлено${photos.length ? ` · ${plural(photos.length, 'фото', 'фото', 'фото')}` : ''}`); goTab('home');
    } catch (e) { toast('Невірний файл'); }
  }); };
  i.click();
}
function clearAllData() {
  const set = S.settings;
  quietly(() => { S = Object.assign(blankState(), { settings: set, history: S.history || [] }); }, { type: 'data.wipe', text: 'Усі дані очищено — чистий аркуш' });
  PH.clear();
}

// ================= ТАЙМЕРИ =================
const TM = { mode: 'party', sel: null, guests: 0, bank: 15, inc: 0, cap: 0, each: false, banks: {}, turn: 60, auto: true, chess: [5, 3], names: ['', ''], run: null };
let AC = null;
function beep(f = 880, d = .09, v = .18) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(v, AC.currentTime); g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + d); o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + d); } catch (e) {} }
const keepAwake = on => { try { HAS_NATIVE && window.Native.keepAwake && window.Native.keepAwake(!!on); } catch (e) {} };
const tfmt = ms => { const neg = ms < 0; ms = Math.abs(ms); const s = neg ? Math.floor(ms / 1000) : Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return (neg ? '−' : '') + (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0'); };
const tfmtMs = ms => ms > 0 && ms < 10000 ? (ms / 1000).toFixed(1) : tfmt(ms);
const CHESS_PRESETS = [[1, 0, 'Bullet'], [3, 0, 'Blitz'], [3, 2, 'Blitz'], [5, 0, 'Blitz'], [5, 3, 'Blitz'], [10, 0, 'Rapid'], [10, 5, 'Rapid'], [15, 10, 'Rapid'], [30, 0, 'Classic'], [60, 30, 'Classic']];
const tmPlayers = () => {
  if (!TM.sel) TM.sel = S.players.slice(0, Math.min(4, Math.max(2, S.players.length))).map(p => p.n);
  const g = Array.from({ length: TM.guests }, (_, i) => 'Гість ' + (i + 1));
  return [...TM.sel, ...g];
};
const pcol = (n, i) => S.players.find(p => p.n === n)?.col || PLAYER_COLORS[i % PLAYER_COLORS.length];

SCREENS.timer = el => {
  if (TM.run) return TM.run.mode === 'chess' ? chessRun(el) : partyRun(el);
  const ps = tmPlayers();
  const stepper = (id, v, unit) => `<div class="stp" data-stp="${id}"><button data-d="-1">${ic('minus')}</button><b>${v}<small>${unit}</small></b><button data-d="1">${ic('plus')}</button></div>`;
  const chips = (key, vals, cur, fmtv) => `<div class="chips wrapc">${vals.map(v => `<button class="chip sm ${cur === v ? 'on' : ''}" data-k="${key}" data-val="${v}">${fmtv(v)}</button>`).join('')}</div>`;
  const secF = v => v ? (v < 60 ? v + ' с' : v % 60 ? (v / 60).toFixed(1) + ' хв' : v / 60 + ' хв') : 'Без ліміту';
  const modes = [['party', 'users', 'Час на гравця', 'Кожен має свій запас часу · 2–8 гравців'], ['turn', 'hourglass', 'Ліміт ходу', 'Однаковий відлік на кожен хід'], ['chess', 'chess', 'Шаховий годинник', 'Двоє гравців, екран навпіл']];
  let body = '';
  if (TM.mode === 'party') body = `
    <div class="fld"><label>Запас часу на гравця</label>${stepper('bank', TM.bank, ' хв')}${chips('bank', [5, 10, 15, 20, 30, 45, 60], TM.bank, v => v + ' хв')}</div>
    <div class="fld"><label>Бонус за кожен хід</label>${chips('inc', [0, 5, 10, 15, 30], TM.inc, v => v ? '+' + v + ' с' : 'Без бонусу')}</div>
    <div class="fld"><label>Ліміт одного ходу</label>${chips('cap', [0, 30, 60, 90, 120, 180, 300], TM.cap, secF)}</div>
    <button class="tg-row ${TM.each ? 'on' : ''}" data-tg="each"><div><b>Різний запас кожному</b><span>Фора новачкам або досвідченим</span></div><i></i></button>
    ${TM.each ? `<div class="each-list">${ps.map((n, i) => `<div class="each-row"><span class="av" style="background:${pcol(n, i)}">${esc(n[0])}</span><b>${esc(n)}</b>${stepper('b:' + n, TM.banks[n] ?? TM.bank, ' хв')}</div>`).join('')}</div>` : ''}`;
  else if (TM.mode === 'turn') body = `
    <div class="fld"><label>Час на хід</label>${stepper('turn', TM.turn, ' с')}${chips('turn', [15, 30, 45, 60, 90, 120, 180], TM.turn, v => v < 60 ? v + ' с' : v / 60 + ' хв')}</div>`;
  else body = `
    <div class="fld"><label>Контроль часу · хвилини + бонус за хід</label><div class="ch-pre">${CHESS_PRESETS.map(([m, i, k]) => `<button class="${TM.chess[0] === m && TM.chess[1] === i ? 'on' : ''}" data-ch="${m},${i}"><b>${m} | ${i}</b><span>${k}</span></button>`).join('')}</div></div>
    <div class="fld-row"><div class="fld"><label>Хвилин</label>${stepper('cm', TM.chess[0], '')}</div><div class="fld"><label>Бонус, с</label>${stepper('ci', TM.chess[1], '')}</div></div>
    <div class="fld-row"><div class="fld"><label>Внизу (білі)</label><input class="inp" id="cn0" value="${esc(TM.names[0])}" placeholder="Білі"></div><div class="fld"><label>Угорі (чорні)</label><input class="inp" id="cn1" value="${esc(TM.names[1])}" placeholder="Чорні"></div></div>`;
  const pl = TM.mode !== 'chess' ? `<div class="fld"><label>Гравці · порядок ходу · ${ps.length}</label><div class="chips wrapc">${S.players.map(p => { const i = TM.sel.indexOf(p.n); return `<button class="chip ${i >= 0 ? 'on' : ''}" data-p="${esc(p.n)}">${i >= 0 ? `<b class="ord">${i + 1}</b>` : ''}${esc(p.n)}</button>`; }).join('')}
    <button class="chip" data-guest="1">${ic('plus')} Гість</button>${TM.guests ? `<button class="chip" data-guest="-1">${ic('minus')} Гість (${TM.guests})</button>` : ''}</div></div>` : '';
  const can = TM.mode === 'chess' || ps.length >= 2;
  const summary = TM.mode === 'party' ? `${ps.length} гравц${ps.length > 4 ? 'ів' : 'і'} · ${TM.each ? 'різний запас' : TM.bank + ' хв кожному'}${TM.inc ? ` · +${TM.inc} с` : ''}${TM.cap ? ` · хід ≤ ${secF(TM.cap)}` : ''}`
    : TM.mode === 'turn' ? `${ps.length} гравц${ps.length > 4 ? 'ів' : 'і'} · ${TM.turn < 60 ? TM.turn + ' с' : (TM.turn / 60) + ' хв'} на хід` : `${TM.chess[0]} хв + ${TM.chess[1]} с за хід`;
  el.innerHTML = `${topbar('Таймер', { back: true, sub: 'Оберіть режим і налаштуйте' })}<div class="wrap tm-setup">
   <div class="tm-modes">${modes.map(([k, i, t, s]) => `<button class="${TM.mode === k ? 'on' : ''}" data-mode="${k}"><span>${ic(i)}</span><div><b>${t}</b><i>${s}</i></div></button>`).join('')}</div>
   ${pl}${body}
   ${TM.mode !== 'chess' ? `<button class="tg-row ${TM.auto ? 'on' : ''}" data-tg="auto"><div><b>Передавати хід автоматично</b><span>Коли час ходу вийшов — звук і наступний гравець</span></div><i></i></button>` : ''}
   <div class="tm-go"><div class="muted">${summary}</div><button class="btn accent block" id="tgo" ${can ? '' : 'disabled'}>${ic('play')} Почати</button>${can ? '' : '<div class="muted" style="font-size:12px;margin-top:8px;text-align:center">Оберіть щонайменше двох гравців</div>'}</div>
  </div>`;
  $$('[data-mode]', el).forEach(b => b.onclick = () => { TM.mode = b.dataset.mode; haptic(8); refreshTop(); });
  $$('[data-k]', el).forEach(b => b.onclick = () => { TM[b.dataset.k] = +b.dataset.val; haptic(6); refreshTop(); });
  $$('[data-ch]', el).forEach(b => b.onclick = () => { TM.chess = b.dataset.ch.split(',').map(Number); haptic(6); refreshTop(); });
  $$('[data-tg]', el).forEach(b => b.onclick = () => { TM[b.dataset.tg] = !TM[b.dataset.tg]; haptic(6); refreshTop(); });
  $$('[data-p]', el).forEach(b => b.onclick = () => { const n = b.dataset.p; TM.sel = TM.sel.includes(n) ? TM.sel.filter(x => x !== n) : [...TM.sel, n]; haptic(6); refreshTop(); });
  $$('[data-guest]', el).forEach(b => b.onclick = () => { TM.guests = clamp(TM.guests + +b.dataset.guest, 0, 8); refreshTop(); });
  $$('[data-stp]', el).forEach(w => $$('[data-d]', w).forEach(b => b.onclick = () => {
    const k = w.dataset.stp, d = +b.dataset.d;
    if (k === 'bank') TM.bank = clamp(TM.bank + d * (TM.bank >= 20 ? 5 : 1), 1, 180);
    else if (k === 'turn') TM.turn = clamp(TM.turn + d * (TM.turn >= 60 ? 15 : 5), 5, 600);
    else if (k === 'cm') TM.chess = [clamp(TM.chess[0] + d * (TM.chess[0] >= 10 ? 5 : 1), 1, 180), TM.chess[1]];
    else if (k === 'ci') TM.chess = [TM.chess[0], clamp(TM.chess[1] + d, 0, 60)];
    else if (k.startsWith('b:')) { const n = k.slice(2); TM.banks[n] = clamp((TM.banks[n] ?? TM.bank) + d * ((TM.banks[n] ?? TM.bank) >= 20 ? 5 : 1), 1, 180); }
    haptic(5); refreshTop();
  }));
  ['cn0', 'cn1'].forEach((id, i) => { const x = $('#' + id, el); if (x) x.oninput = () => TM.names[i] = x.value; });
  $('#tgo', el).onclick = () => { beep(660, .05, .01); startTimer(); refreshTop(); };
};
function startTimer() {
  if (TM.mode === 'chess') {
    const ms = TM.chess[0] * 60000;
    TM.run = { mode: 'chess', inc: TM.chess[1] * 1000, base: ms, ps: [{ n: TM.names[0] || 'Білі', left: ms, moves: 0 }, { n: TM.names[1] || 'Чорні', left: ms, moves: 0 }], active: -1, running: false, at: 0, flag: -1 };
    return;
  }
  const ps = tmPlayers();
  TM.run = { mode: TM.mode, inc: TM.inc * 1000, cap: TM.mode === 'turn' ? TM.turn * 1000 : TM.cap * 1000, auto: TM.auto,
    ps: ps.map((n, i) => { const b = (TM.each ? (TM.banks[n] ?? TM.bank) : TM.bank) * 60000; return { n, col: pcol(n, i), base: b, left: b, used: 0, turns: 0, over: false }; }),
    active: -1, running: false, at: 0, turnUsed: 0, round: 1, total: 0, hist: [], lastBeep: -1 };
}
function tmTick(R) { const now = Date.now(); if (R.running) { const dt = now - R.at; R.at = now; return dt; } R.at = now; return 0; }

// ---------- запуск: час на гравця / ліміт ходу ----------
function partyRun(el) {
  const R = TM.run; document.body.classList.add('tm-immersive'); keepAwake(true);
  el.innerHTML = `<div class="tr-wrap">
   <div class="tr-top"><button class="iconbtn" id="tx">${ic('close')}</button><div class="tr-ttl"><b id="tround">Раунд ${R.round}</b><span id="ttotal">0:00</span></div><button class="iconbtn" id="tset">${ic('settings')}</button></div>
   <button class="tr-main" id="tmain"><div class="tr-glow"></div><div class="tr-ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" class="bg"/><circle cx="50" cy="50" r="45" class="fg" id="tfg" pathLength="100"/></svg></div>
    <div class="tr-c"><span class="tr-n" id="tname"></span><b class="tr-t" id="ttime">0:00</b><span class="tr-s" id="tsub"></span></div><div class="tr-hint" id="thint"></div></button>
   <div class="tr-q" id="tq"></div>
   <div class="tr-ctrl"><button class="btn ghost" id="tundo" aria-label="Попередній хід">${ic('undo')}</button><button class="btn accent block" id="tplay"></button><button class="btn ghost" id="tend" aria-label="Завершити">${ic('flag')}</button></div>
  </div>`;
  const cur = () => R.ps[R.active];
  const nextIdx = () => (R.active + 1) % R.ps.length;
  const draw = () => {
    const p = R.active >= 0 ? cur() : R.ps[0];
    el.style.setProperty('--pc', p.col);
    $('#tname', el).textContent = p.n;
    let main, frac, sub = '';
    if (R.mode === 'turn') { const left = R.cap - (R.active >= 0 ? R.turnUsed : 0); main = tfmtMs(left); frac = left / R.cap; sub = `хід ${p.turns + 1} · загалом ${tfmt(p.used)}`; }
    else { main = tfmt(p.left); frac = p.left / p.base; sub = R.cap ? `цей хід: ${tfmt(R.cap - (R.active >= 0 ? R.turnUsed : 0))}` : `ходів: ${p.turns}`; if (p.left < 0) sub = 'Час вийшов · перевищення'; }
    $('#ttime', el).textContent = main;
    $('#tsub', el).textContent = sub;
    $('#tfg', el).style.strokeDasharray = `${clamp(frac, 0, 1) * 100} 100`;
    const lowLeft = R.mode === 'turn' ? R.cap - R.turnUsed : Math.min(p.left, R.cap ? R.cap - R.turnUsed : Infinity);
    $('#tmain', el).classList.toggle('low', R.running && lowLeft < 10000 && lowLeft > 0);
    $('#tmain', el).classList.toggle('over', R.mode !== 'turn' && p.left < 0 || R.mode === 'turn' && R.turnUsed > R.cap);
    $('#tmain', el).classList.toggle('idle', R.active < 0 || !R.running);
    $('#thint', el).innerHTML = R.active < 0 ? `Торкніться, щоб почати · першим ходить <b>${esc(R.ps[0].n)}</b>` : !R.running ? 'Пауза · торкніться «Продовжити»' : `Торкніться — хід переходить до <b>${esc(R.ps[nextIdx()].n)}</b>`;
    $('#ttotal', el).textContent = 'загалом ' + tfmt(R.total);
    $('#tround', el).textContent = 'Раунд ' + R.round;
    const order = R.active < 0 ? R.ps.map((_, i) => i) : R.ps.map((_, i) => (R.active + i) % R.ps.length);
    $('#tq', el).innerHTML = order.slice(R.active < 0 ? 1 : 1).map((i, k) => { const q = R.ps[i]; return `<div class="tq ${q.left < 0 ? 'over' : ''}" style="--pc:${q.col}"><span class="av" style="background:${q.col}">${esc(q.n[0])}</span><b>${esc(q.n)}</b><em>${k === 0 ? 'наступний' : ''}</em><span class="tv">${R.mode === 'turn' ? (q.turns ? plural(q.turns, 'хід', 'ходи', 'ходів') : '—') : tfmt(q.left)}</span></div>`; }).join('');
    $('#tplay', el).innerHTML = R.active < 0 ? `${ic('play')} Старт` : R.running ? `${ic('pause')} Пауза` : `${ic('play')} Продовжити`;
    $('#tundo', el).disabled = !R.hist.length;
  };
  const apply = () => {
    const dt = tmTick(R);
    if (dt && R.active >= 0) {
      const p = cur(); R.total += dt; p.used += dt; R.turnUsed += dt;
      if (R.mode === 'party') { const was = p.left; p.left -= dt; if (was > 0 && p.left <= 0) { haptic(400); beep(330, .5, .3); toast(`⏰ У ${p.n} скінчився запас часу`); } }
    }
    return dt;
  };
  const pass = auto => {
    if (R.active < 0) { R.active = 0; R.running = true; R.at = Date.now(); R.turnUsed = 0; haptic(20); beep(740, .06); draw(); return; }
    apply();
    const p = cur();
    R.hist.push({ a: R.active, left: p.left, used: p.used, turnUsed: R.turnUsed, round: R.round, turns: p.turns });
    if (R.hist.length > 60) R.hist.shift();
    p.turns++; if (R.mode === 'party') p.left += R.inc;
    R.active = nextIdx(); if (R.active === 0) R.round++;
    R.turnUsed = 0; R.lastBeep = -1; R.running = true; R.at = Date.now();
    haptic(auto ? 120 : 22); beep(auto ? 440 : 880, auto ? .25 : .05, auto ? .25 : .12);
    draw();
  };
  const tick = () => {
    const dt = apply();
    if (dt && R.active >= 0) {
      const p = cur();
      const lim = R.mode === 'turn' ? R.cap - R.turnUsed : R.cap ? R.cap - R.turnUsed : (R.mode === 'party' ? p.left : Infinity);
      const sec = Math.ceil(lim / 1000);
      if (lim > 0 && sec <= 5 && sec !== R.lastBeep) { R.lastBeep = sec; beep(1000, .06, .14); haptic(25); }
      if (R.cap && R.turnUsed >= R.cap) { if (R.auto) { toast(`⏰ ${p.n}: час ходу вийшов`); return pass(true); } else if (R.lastBeep !== 0) { R.lastBeep = 0; beep(330, .4, .3); haptic(300); } }
    }
    draw();
  };
  $('#tmain', el).onclick = () => { if (R.active >= 0 && !R.running) { R.running = true; R.at = Date.now(); draw(); return; } pass(false); };
  $('#tplay', el).onclick = () => { if (R.active < 0) return pass(false); apply(); R.running = !R.running; R.at = Date.now(); haptic(10); draw(); };
  $('#tundo', el).onclick = () => { const h = R.hist.pop(); if (!h) return; apply(); const p = R.ps[h.a]; Object.assign(p, { left: h.left, used: h.used, turns: h.turns }); R.active = h.a; R.turnUsed = h.turnUsed; R.round = h.round; R.at = Date.now(); haptic(10); toast(`Хід повернуто: ${p.n}`); draw(); };
  $('#tend', el).onclick = () => { apply(); R.running = false; draw(); timerSummary(); };
  $('#tset', el).onclick = () => confirmSheet('Перейти до налаштувань? Поточний відлік буде скинуто.', 'Скинути', () => { TM.run = null; refreshTop(); }, false);
  $('#tx', el).onclick = () => { if (R.active < 0) { TM.run = null; return back(); } apply(); R.running = false; draw(); confirmSheet('Вийти з таймера? Відлік буде скинуто.', 'Вийти', () => { TM.run = null; back(); }); };
  const iv = setInterval(tick, 100); draw();
  el._cleanup = () => { clearInterval(iv); document.body.classList.remove('tm-immersive'); keepAwake(false); };
}
function timerSummary() {
  const R = TM.run; const tot = R.ps.reduce((a, p) => a + p.used, 0) || 1;
  const sh = openSheet({ title: 'Підсумок', body: `<div class="kv"><span>Загальний час</span><b>${tfmt(R.total)}</b></div><div class="kv"><span>Раундів</span><b>${R.round}</b></div>
    <div style="margin-top:14px">${[...R.ps].sort((a, b) => b.used - a.used).map(p => `<div class="hbar"><span class="nm">${esc(p.n)}</span><div class="tr"><div class="fl" style="width:${p.used / tot * 100}%;background:${p.col}"></div></div><span class="v">${tfmt(p.used)}</span></div><div class="muted" style="font-size:11.5px;margin:-4px 0 8px 2px">${plural(p.turns, 'хід', 'ходи', 'ходів')}${p.turns ? ' · у середньому ' + tfmt(p.used / p.turns) : ''}${p.left < 0 ? ' · перевищив запас' : ''}</div>`).join('')}</div>`,
    foot: `<button class="btn ghost" id="tsagain">${ic('undo')}</button><button class="btn accent block" id="tslog">${ic('plus')} Записати партію</button>` });
  $('#tsagain', sh.el).onclick = () => { sh.close(); startTimer(); refreshTop(); };
  $('#tslog', sh.el).onclick = () => { const players = R.ps.filter(p => S.players.some(x => x.n === p.n)).map(p => ({ n: p.n, s: null, w: false })); const dur = Math.max(1, Math.round(R.total / 60000)); sh.close(); TM.run = null; back(); setTimeout(() => logPlay(null, null, { dur, players }), 320); };
}

// ---------- шаховий годинник ----------
function chessRun(el) {
  const R = TM.run; document.body.classList.add('tm-immersive'); keepAwake(true);
  const half = i => `<button class="ch-h" data-h="${i}"><div class="ch-in"><span class="ch-n">${esc(R.ps[i].n)}</span><b class="ch-t" data-t></b><span class="ch-m" data-m></span><span class="ch-tip" data-tip></span></div></button>`;
  el.innerHTML = `<div class="ch-wrap">${half(1)}<div class="ch-mid"><button class="iconbtn" id="cx">${ic('close')}</button><button class="iconbtn" id="cres">${ic('undo')}</button><button class="ch-pp" id="cpp"></button><button class="iconbtn" id="cset">${ic('settings')}</button><span class="ch-ctl">${TM.chess[0]} | ${TM.chess[1]}</span></div>${half(0)}</div>`;
  const halves = $$('.ch-h', el).sort((a, b) => a.dataset.h - b.dataset.h);
  const draw = () => {
    halves.forEach((h, i) => {
      const p = R.ps[i];
      $('[data-t]', h).textContent = tfmtMs(p.left);
      $('[data-m]', h).textContent = p.moves ? plural(p.moves, 'хід', 'ходи', 'ходів') : '';
      $('[data-tip]', h).textContent = R.flag === i ? 'Час вийшов' : R.active < 0 ? (i === 0 ? 'Білі ходять першими' : 'Торкніться — і піде годинник білих') : R.active === i && !R.running ? 'Пауза' : R.active === i ? 'Ваш хід · торкніться після ходу' : '';
      h.classList.toggle('on', R.active === i && R.flag < 0);
      h.classList.toggle('flag', R.flag === i);
      h.classList.toggle('low', R.active === i && R.running && p.left < 10000);
    });
    $('#cpp', el).innerHTML = ic(R.running ? 'pause' : 'play');
    $('#cpp', el).classList.toggle('dis', R.active < 0 || R.flag >= 0);
  };
  const apply = () => {
    const dt = tmTick(R);
    if (dt && R.active >= 0 && R.flag < 0) {
      const p = R.ps[R.active], was = p.left; p.left -= dt;
      const sec = Math.ceil(p.left / 1000); if (p.left > 0 && sec <= 5 && Math.ceil(was / 1000) !== sec) { beep(1000, .05, .12); }
      if (p.left <= 0) { p.left = 0; R.flag = R.active; R.running = false; haptic(600); beep(300, .7, .3); }
    }
  };
  const tick = () => { apply(); draw(); };
  halves.forEach((h, i) => h.onclick = () => {
    if (R.flag >= 0) return;
    if (R.active < 0) { R.active = 1 - i; R.running = true; R.at = Date.now(); haptic(25); beep(800, .04, .1); draw(); return; }
    if (R.active !== i) return;
    if (!R.running) { R.running = true; R.at = Date.now(); draw(); return; }
    apply(); if (R.flag >= 0) return draw(); const p = R.ps[i]; p.moves++; p.left += R.inc; R.active = 1 - i; R.at = Date.now(); haptic(25); beep(800, .04, .1); draw();
  });
  $('#cpp', el).onclick = () => { if (R.active < 0 || R.flag >= 0) return; apply(); R.running = !R.running; R.at = Date.now(); haptic(10); draw(); };
  $('#cres', el).onclick = () => { apply(); R.running = false; draw(); confirmSheet('Почати партію заново?', 'Скинути', () => { startTimer(); refreshTop(); }, false); };
  $('#cset', el).onclick = () => { apply(); R.running = false; draw(); confirmSheet('Змінити контроль часу? Поточна партія скинеться.', 'Налаштування', () => { TM.run = null; refreshTop(); }, false); };
  $('#cx', el).onclick = () => { if (R.active < 0 || R.flag >= 0) { TM.run = null; return back(); } apply(); R.running = false; draw(); confirmSheet('Вийти з годинника?', 'Вийти', () => { TM.run = null; back(); }); };
  const iv = setInterval(tick, 50); draw();
  el._cleanup = () => { clearInterval(iv); document.body.classList.remove('tm-immersive'); keepAwake(false); };
}
