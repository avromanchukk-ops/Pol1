// ================= SCREENS: home, library, detail, plays, stats, more, news, settings =================

// ---------- recommendations ----------
function recommend() {
  const owned = ownedIds().map(G);
  return owned.map(g => {
    const lp = lastPlay(g.id), d = lp ? daysSince(lp) : null, n = playsOf(g.id).length;
    let score = (d == null ? 140 : Math.min(d, 400)) + (g.fav ? 60 : 0) + (g.r || 7) * 4 - n * 1.5;
    let kick = d == null ? 'Ще жодної партії' : d > 60 ? `Не грали ${plural(d, 'день', 'дні', 'днів')}` : g.fav ? 'Улюблена · час повторити' : 'Рекомендуємо на сьогодні';
    return { g, score, kick, d };
  }).sort((a, b) => b.score - a.score);
}

// ---------- HOME ----------
SCREENS.home = el => {
  const rec = recommend().slice(0, 5);
  const owned = ownedIds().map(G);
  const longAgo = owned.map(g => ({ g, lp: lastPlay(g.id) })).sort((a, b) => (a.lp || '0').localeCompare(b.lp || '0')).slice(0, 10);
  const favs = owned.filter(g => g.fav);
  const quick = owned.filter(g => g.t[0] <= 30).sort((a, b) => (b.r || 0) - (a.r || 0));
  const wish = allIds().map(G).filter(g => g.wish);
  const discover = CATALOG.filter(c => !S.games[c.id]?.owned).map(c => G(c.id)).sort((a, b) => b.r - a.r).slice(0, 10);
  const recent = S.plays.slice(0, 3);
  const h = new Date().getHours(), greet = h < 6 ? 'Доброї ночі' : h < 12 ? 'Доброго ранку' : h < 18 ? 'Доброго дня' : 'Доброго вечора';
  const unread = (S.news.items || []).filter(n => !S.seen[n.id]).length;
  el.innerHTML = `
  <div class="topbar"><div style="flex:1"><div class="sub">${greet} 👋</div><h1>Полиця</h1></div>
    <button class="iconbtn" onclick="App.openNews()">${ic('bell')}${unread ? '<span class="dot"></span>' : ''}</button>
    <button class="iconbtn" onclick="App.tab('library');setTimeout(()=>document.querySelector('.search input')?.focus(),400)">${ic('search')}</button></div>
  ${rec.length ? `<div class="hero" id="hero">
    <div class="hero-top">Для вас · ${rec.length}</div>
    <div class="hero-dots">${rec.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>
    <div class="hero-track">${rec.map(x => `<div class="hero-slide">${poster(x.g)}<div class="hero-shade"></div>
      <div class="hero-body"><span class="hero-kicker"><span class="pulse"></span>${x.kick}</span>
      <div class="hero-title">${esc(x.g.n)}</div>
      <div class="hero-meta"><span style="color:var(--accent2)">${ic('star')} ${x.g.r?.toFixed(1) || '—'}</span><span>${ic('users')} ${x.g.p[0]}–${x.g.p[1]}</span><span>${ic('clock')} ${x.g.t[0]}${x.g.t[1] > x.g.t[0] ? '–' + x.g.t[1] : ''} хв</span>${cxChip(x.g.cx7)}</div>
      <div class="hero-actions"><button class="btn primary" onclick="App.logPlay(${x.g.id})">${ic('play')} Зіграти</button><button class="btn glass" onclick="App.openGame(${x.g.id})">${ic('info')} Детальніше</button></div>
      </div></div>`).join('')}</div></div>` : `<div class="empty"><div class="big">📦</div><b>Полиця порожня</b>Додайте ігри з бібліотеки, і тут з’являться рекомендації.<br><br><button class="btn accent" onclick="App.tab('library')">Відкрити бібліотеку</button></div>`}

  ${streakCard()}
  <div class="sec"><div class="quick stagger">
    ${[['cards', 'Матч', '#FF4A1C', "App.tab('match')"], ['timer', 'Таймер', '#4CC9F0', 'App.openTimer()'], ['dice', 'Міні-ігри', '#FFC24B', 'App.openMiniGames()'], ['news', 'Новини', '#8B7CFF', 'App.openNews()']]
      .map(([i, l, c, f]) => `<button class="qa" onclick="${f}"><span class="qi" style="background:color-mix(in srgb,${c} 18%,transparent);color:${c}">${ic(i)}</span>${l}</button>`).join('')}
  </div></div>

  ${row('Давно не грали', longAgo.map(x => tile(x.g, { meta: `<span>${x.lp ? agoText(daysSince(x.lp)) : 'ще не грали'}</span>` })), "App.openLibrary({sort:'last'})")}
  ${row('Улюблені', favs.map(g => tile(g, { plays: true })), "App.openLibrary({tab:'fav'})")}
  ${recent.length ? `<div class="sec"><div class="sec-h"><h2>Останні партії</h2><button class="more" onclick="App.openStats('log')">Журнал →</button></div><div class="wrap">${recent.map(playCard).join('')}</div></div>` : ''}
  ${row('На швидку руку · до 30 хв', quick.map(g => tile(g, { cls: 'wide' })))}
  ${wish.length ? row('Хочу купити', wish.map(g => tile(g)), "App.openLibrary({tab:'wish'})") : ''}
  ${row('Топ BGG, яких у вас немає', discover.map(g => tile(g)), "App.openLibrary({tab:'all',sort:'rating'})")}
  <div style="height:20px"></div>`;
  // hero carousel
  const track = $('.hero-track', el);
  if (track) {
    const dots = $$('.hero-dots i', el); let idx = 0, timer;
    const setDot = () => { idx = Math.round(track.scrollLeft / track.clientWidth); dots.forEach((d, i) => d.classList.toggle('on', i === idx)); };
    track.addEventListener('scroll', () => { clearTimeout(track._t); track._t = setTimeout(setDot, 60); }, { passive: true });
    const auto = () => { timer = setInterval(() => { if (!document.body.contains(track)) return clearInterval(timer); idx = (idx + 1) % dots.length; track.scrollTo({ left: idx * track.clientWidth, behavior: 'smooth' }); }, 6000); };
    track.addEventListener('touchstart', () => { clearInterval(timer); }, { passive: true });
    track.addEventListener('touchend', () => { clearInterval(timer); auto(); });
    auto(); el._cleanup = () => clearInterval(timer);
  }
};
function streakCard() {
  const { n, thisWeek } = weekStreak();
  const now = new Date(), mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const set = new Set(S.plays.map(p => p.date)), days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
  const cells = days.map((l, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); const today = k === todayStr(), on = set.has(k);
    return `<div class="wd ${on ? 'on' : ''} ${today ? 'today' + (on ? '' : ' off') : ''}">${l}<i>${on ? ic('check') : d.getDate()}</i></div>`; }).join('');
  return `<div class="streak fade-in" onclick="App.openStats()"><div class="streak-top"><div class="flame">${FLAME}</div><div style="flex:1"><div class="num">${n}<small>${plural(n, 'тиждень', 'тижні', 'тижнів').replace(/^\d+ /, '')} поспіль</small></div>
  <div class="lbl">${n === 0 ? 'Зіграйте цього тижня — і почнеться нова серія' : thisWeek ? 'Цього тижня вже грали — серія горить 🔥' : 'Зіграйте до неділі, щоб не згасла!'}</div></div></div><div class="week">${cells}</div></div>`;
}
function row(title, items, moreFn) {
  if (!items.length) return '';
  return `<div class="sec"><div class="sec-h"><h2>${title}</h2>${moreFn ? `<button class="more" onclick="${moreFn}">Усі →</button>` : ''}</div><div class="row">${items.join('')}</div></div>`;
}
function playCard(p) {
  const g = G(p.g), d = parseD(p.date), win = p.players.filter(x => x.w);
  const coop = p.players.length && p.players.every(x => x.s == null);
  return `<div class="play" onclick="App.logPlay(${p.g},'${p.id}')">${poster(g)}<div class="pm"><b>${esc(g.n)}</b>
  <div class="m">${p.players.map(x => esc(x.n)).join(', ') || 'Без гравців'} · ${fmtDur(p.dur || 0)}</div>
  ${win.length ? `<div class="win">${ic('crown')} ${coop ? (win.length ? 'Перемога команди' : '') : win.map(w => esc(w.n)).join(', ')}${!coop && win[0].s != null ? ' · ' + win[0].s : ''}</div>` : coop ? `<div class="win" style="color:var(--no)">Поразка команди</div>` : ''}
  </div><div class="date"><b>${d.getDate()}</b>${MONTHS_S[d.getMonth()]}</div></div>`;
}

// ---------- LIBRARY ----------
const LF = { tab: 'owned', q: '', cx: [], pl: 0, time: 0, labels: [], plays: 'any', sort: 'name', view: 'grid' };
function filterGames() {
  let ids = allIds();
  let list = ids.map(G).filter(g => LF.tab === 'owned' ? g.owned : LF.tab === 'wish' ? g.wish : LF.tab === 'fav' ? g.fav : true);
  if (LF.q) { const q = LF.q.toLowerCase(); list = list.filter(g => g.n.toLowerCase().includes(q) || (g.c || []).some(c => c.toLowerCase().includes(q))); }
  if (LF.cx.length) list = list.filter(g => LF.cx.includes(g.cx7));
  if (LF.pl) list = list.filter(g => g.p[0] <= LF.pl && g.p[1] >= LF.pl);
  if (LF.time) list = list.filter(g => g.t[0] <= LF.time);
  if (LF.labels.length) list = list.filter(g => LF.labels.every(l => (g.labels || []).includes(l)));
  if (LF.plays !== 'any') list = list.filter(g => { const n = playsOf(g.id).length; return LF.plays === '0' ? n === 0 : LF.plays === '1-5' ? n >= 1 && n <= 5 : n > 5; });
  const sorts = {
    name: (a, b) => a.n.localeCompare(b.n), rating: (a, b) => (b.r || 0) - (a.r || 0), plays: (a, b) => playsOf(b.id).length - playsOf(a.id).length,
    last: (a, b) => (lastPlay(a.id) || '0').localeCompare(lastPlay(b.id) || '0'), cx: (a, b) => a.cx7 - b.cx7, added: (a, b) => (b.added || 0) - (a.added || 0)
  };
  return list.sort(sorts[LF.sort] || sorts.name);
}
const activeFilters = () => LF.cx.length + (LF.pl ? 1 : 0) + (LF.time ? 1 : 0) + LF.labels.length + (LF.plays !== 'any' ? 1 : 0);
SCREENS.library = el => {
  const counts = { owned: ownedIds().length, wish: allIds().filter(id => S.games[id]?.wish).length, fav: allIds().filter(id => S.games[id]?.fav).length, all: allIds().length };
  el.innerHTML = `${topbar('Бібліотека', { sub: plural(counts.owned, 'гра', 'гри', 'ігор') + ' на полиці', right: `<button class="iconbtn" onclick="App.toggleView()">${ic(LF.view === 'grid' ? 'list' : 'grid')}</button><button class="iconbtn" onclick="App.filters()">${ic('filter')}${activeFilters() ? '<span class="dot"></span>' : ''}</button>` })}
  <div class="search">${ic('search')}<input placeholder="Назва або жанр…" value="${esc(LF.q)}" id="libq"><button id="bggbtn" class="btn sm ghost" style="height:32px">BGG</button></div>
  <div class="chips">${[['owned', 'Колекція'], ['fav', 'Улюблені'], ['wish', 'Хочу'], ['all', 'Уся база']].map(([v, l]) => `<button class="chip ${LF.tab === v ? 'on' : ''}" onclick="App.libTab('${v}')">${l} <span class="n">${counts[v]}</span></button>`).join('')}</div>
  <div class="chips" style="margin-top:4px">${[['name', 'А–Я'], ['rating', '★ BGG'], ['plays', 'Партії'], ['last', 'Давно не грали'], ['cx', 'Складність'], ['added', 'Нові']].map(([v, l]) => `<button class="chip ${LF.sort === v ? 'on' : ''}" style="height:30px;font-size:12px" onclick="App.libSort('${v}')">${l}</button>`).join('')}</div>
  <div id="libres" style="margin-top:10px"></div>`;
  const q = $('#libq', el);
  q.oninput = () => { LF.q = q.value; renderLibResults(el); };
  $('#bggbtn', el).onclick = () => bggSearch(q.value);
  renderLibResults(el);
};
function renderLibResults(el) {
  const list = filterGames(), box = $('#libres', el);
  if (!list.length) { box.innerHTML = `<div class="empty"><div class="big">🔍</div><b>Нічого не знайшли</b>${LF.q ? `Спробуйте пошук на BoardGameGeek<br><br><button class="btn accent" onclick="App.bggSearch()">Шукати «${esc(LF.q)}» на BGG</button>` : 'Змініть фільтри або вкладку.'}</div>`; return; }
  box.innerHTML = LF.view === 'grid'
    ? `<div class="grid stagger">${list.map(g => tile(g, { plays: true })).join('')}</div>`
    : `<div class="list">${list.map(g => { const n = playsOf(g.id).length, lp = lastPlay(g.id); return `<div class="li" onclick="App.openGame(${g.id})">${poster(g)}<div class="li-main"><b>${esc(g.n)}</b><div class="m"><span style="color:var(--accent2)">★ ${g.r?.toFixed(1) || '—'}</span>${cxBar(g.cx7)}<span>${n} парт.</span><span>${lp ? agoText(daysSince(lp)) : ''}</span></div><div class="m">${(g.labels || []).map(id => { const l = S.labels.find(x => x.id === id); return l ? `<span class="tag" style="--tc:${l.col};height:20px;font-size:10.5px">${esc(l.n)}</span>` : ''; }).join('')}</div></div>${g.fav ? `<span style="color:var(--no)">${ic('heart')}</span>` : ''}</div>`; }).join('')}</div>`;
}
async function bggSearch(qv) {
  const q = (qv ?? LF.q).trim();
  if (!q) return toast('Введіть назву гри');
  if (!HAS_NATIVE && !S.settings.bggToken) {
    return openSheet({ title: 'Пошук на BGG', body: `<div class="banner">${ic('info')}<div>BoardGameGeek вимагає токен застосунку (з осені 2025). Отримайте його на <b>boardgamegeek.com/applications</b> і вставте в Налаштуваннях. В Android-версії запити йдуть напряму, у браузерному прототипі їх може блокувати CORS.</div></div>`, foot: `<button class="btn accent block" onclick="App.closeSheets();App.openSettings()">До налаштувань</button>` });
  }
  const sh = openSheet({ title: `BGG: «${esc(q)}»`, body: `<div class="spinner"></div>` });
  try {
    const ids = await BGG.search(q);
    if (!ids.length) { $('.sh-body', sh.el).innerHTML = `<div class="empty">Нічого не знайдено</div>`; return; }
    const items = await BGG.things(ids.slice(0, 10));
    $('.sh-body', sh.el).innerHTML = `<div class="list" style="margin:0 -20px">${items.map(t => `<div class="li" data-id="${t.id}">${poster(Object.assign({}, t, { img: t.thumb || t.img }))}<div class="li-main"><b>${esc(t.n)}</b><div class="m"><span>${t.y || ''}</span><span style="color:var(--accent2)">★ ${t.r || '—'}</span><span>${t.p[0]}–${t.p[1]} гр.</span></div></div><button class="btn sm accent">${S.games[t.id]?.owned ? '✓' : '+'}</button></div>`).join('')}</div>`;
    $$('.li', sh.el).forEach(li => li.onclick = () => { const t = items.find(x => x.id === +li.dataset.id); const keep = S.games[t.id] || { labels: [] }; S.games[t.id] = Object.assign({}, keep, t, { owned: true, added: Date.now() }); save(); toast(`«${t.n}» додано на полицю`); haptic(); sh.close(); App.openGame(t.id); });
  } catch (e) { $('.sh-body', sh.el).innerHTML = `<div class="empty"><div class="big">⚠️</div><b>BGG не відповів</b>${esc(e.message)}<br>Перевірте токен у Налаштуваннях.</div>`; }
}
function filtersSheet() {
  const draw = sh => {
    $('.sh-body', sh).innerHTML = `
    <div class="fld"><label>Складність (1–7)</label><div class="chips wrapc">${[1, 2, 3, 4, 5, 6, 7].map(n => `<button class="chip ${LF.cx.includes(n) ? 'on' : ''}" data-cx="${n}" style="${LF.cx.includes(n) ? `background:${COMPLEXITY[n].c};border-color:${COMPLEXITY[n].c}` : ''}">${n} · ${COMPLEXITY[n].n}</button>`).join('')}</div></div>
    <div class="fld"><label>Кількість гравців</label><div class="chips wrapc">${[0, 1, 2, 3, 4, 5, 6].map(n => `<button class="chip ${LF.pl === n ? 'on' : ''}" data-pl="${n}">${n ? n + (n === 6 ? '+' : '') : 'Будь-яка'}</button>`).join('')}</div></div>
    <div class="fld"><label>Час партії</label><div class="chips wrapc">${[[0, 'Будь-який'], [20, '≤ 20 хв'], [45, '≤ 45 хв'], [90, '≤ 1,5 год'], [180, '≤ 3 год']].map(([v, l]) => `<button class="chip ${LF.time === v ? 'on' : ''}" data-tm="${v}">${l}</button>`).join('')}</div></div>
    <div class="fld"><label>Зіграно партій</label><div class="chips wrapc">${[['any', 'Будь-скільки'], ['0', 'Жодної'], ['1-5', '1–5'], ['5+', 'Понад 5']].map(([v, l]) => `<button class="chip ${LF.plays === v ? 'on' : ''}" data-pp="${v}">${l}</button>`).join('')}</div></div>
    <div class="fld"><label>Мітки</label><div class="chips wrapc">${S.labels.map(l => `<button class="chip ${LF.labels.includes(l.id) ? 'on' : ''}" data-lb="${l.id}"><i style="width:8px;height:8px;border-radius:50%;background:${l.col}"></i>${esc(l.n)}</button>`).join('') || '<span class="muted">Міток ще немає</span>'}</div></div>`;
    $$('[data-cx]', sh).forEach(b => b.onclick = () => { const n = +b.dataset.cx; LF.cx = LF.cx.includes(n) ? LF.cx.filter(x => x !== n) : [...LF.cx, n]; draw(sh); });
    $$('[data-pl]', sh).forEach(b => b.onclick = () => { LF.pl = +b.dataset.pl; draw(sh); });
    $$('[data-tm]', sh).forEach(b => b.onclick = () => { LF.time = +b.dataset.tm; draw(sh); });
    $$('[data-pp]', sh).forEach(b => b.onclick = () => { LF.plays = b.dataset.pp; draw(sh); });
    $$('[data-lb]', sh).forEach(b => b.onclick = () => { const id = b.dataset.lb; LF.labels = LF.labels.includes(id) ? LF.labels.filter(x => x !== id) : [...LF.labels, id]; draw(sh); });
    const n = filterGames().length; $('[data-apply]', sh).textContent = `Показати ${plural(n, 'гру', 'гри', 'ігор')}`;
  };
  openSheet({ title: 'Фільтри', body: '', foot: `<button class="btn ghost" data-reset>Скинути</button><button class="btn accent block" data-apply>Показати</button>`, onMount: (sh, api) => {
    draw(sh); $('[data-reset]', sh).onclick = () => { Object.assign(LF, { cx: [], pl: 0, time: 0, labels: [], plays: 'any' }); draw(sh); };
    $('[data-apply]', sh).onclick = () => { api.close(); refreshTop(); };
  } });
}

// ---------- DETAIL ----------
SCREENS.detail = (el, id) => {
  const g = G(id), plays = playsOf(id), lp = plays[0]?.date;
  const wins = {}; plays.forEach(p => p.players.forEach(x => { wins[x.n] = wins[x.n] || { p: 0, w: 0 }; wins[x.n].p++; if (x.w) wins[x.n].w++; }));
  const avgDur = plays.length ? Math.round(plays.reduce((s, p) => s + (p.dur || 0), 0) / plays.length) : 0;
  const lbls = (g.labels || []).map(i => S.labels.find(l => l.id === i)).filter(Boolean);
  el.innerHTML = `
  <div class="det-hero">${poster(g)}<div class="shade"></div>
   <div class="det-top"><button class="iconbtn" onclick="App.back()">${ic('back')}</button><div style="display:flex;gap:8px"><button class="iconbtn" onclick="App.shareGame(${id})">${ic('share')}</button>${S.settings.bggToken || HAS_NATIVE ? `<button class="iconbtn" id="sync">${ic('sync')}</button>` : ''}</div></div></div>
  <div class="det-head">
   <div class="det-cover">${poster(g)}</div>
   <div class="det-title">${esc(g.n)}</div>
   <div class="det-year">${g.y || ''} · ${(g.c || []).join(' · ')}</div>
   <div class="stats4">
    <div class="st gold"><b>${g.r ? g.r.toFixed(1) : '—'}</b><span>BGG</span></div>
    <div class="st"><b>${g.w ? g.w.toFixed(1) : '—'}</b><span>Вага</span></div>
    <div class="st"><b>${g.p[0] === g.p[1] ? g.p[0] : g.p[0] + '–' + g.p[1]}</b><span>Гравці</span></div>
    <div class="st"><b>${g.t[0]}${g.t[1] > g.t[0] ? '+' : ''}</b><span>Хвилин</span></div>
   </div>
   <div class="actbar">
    <button class="act c-ok ${g.owned ? 'on' : ''}" data-t="owned">${ic(g.owned ? 'check' : 'plus')}${g.owned ? 'На полиці' : 'В колекцію'}</button>
    <button class="act c-no ${g.fav ? 'on' : ''}" data-t="fav">${ic('heart')}Улюблена</button>
    <button class="act c-gold ${g.wish ? 'on' : ''}" data-t="wish">${ic('bookmark')}Хочу</button>
    <button class="act c-sky ${g.follow ? 'on' : ''}" data-t="follow">${ic('bell')}Новини</button>
   </div>
  </div>
  <div class="wrap" style="margin-top:18px;display:grid;gap:12px">
   <div class="card"><h3>Моя складність ${g.cxUser ? '' : '<span class="muted" style="font-size:11px;font-family:var(--body)">з BGG</span>'}</h3>
    <div class="cxpick">${[1, 2, 3, 4, 5, 6, 7].map(n => `<button data-cx="${n}" class="${g.cx7 === n ? 'on' : ''}" style="--cc:${COMPLEXITY[n].c}">${n}</button>`).join('')}</div>
    <div class="cxlabel">${COMPLEXITY[g.cx7].n}</div></div>
   <div class="card"><h3>Мітки <button class="btn sm ghost" onclick="App.pickLabels(${id})">${ic('tag')} Змінити</button></h3>
    <div class="chips wrapc">${lbls.map(l => `<span class="tag" style="--tc:${l.col}">${esc(l.n)}</span>`).join('') || '<span class="muted" style="font-size:13px">Додайте мітки: «На двох», «Для гостей»…</span>'}</div></div>
   ${plays.length ? `<div class="card"><h3>Моя статистика</h3>
    <div class="kv"><span>Партій</span><b>${plays.length}</b></div>
    <div class="kv"><span>Остання</span><b>${fmtDate(lp)} · ${agoText(daysSince(lp))}</b></div>
    <div class="kv"><span>Середня тривалість</span><b>${fmtDur(avgDur)}</b></div>
    <div style="margin-top:14px">${Object.entries(wins).sort((a, b) => b[1].w - a[1].w).map(([n, v]) => { const col = S.players.find(p => p.n === n)?.col || '#888'; return `<div class="hbar"><span class="nm">${esc(n)}</span><div class="tr"><div class="fl" style="width:${v.p ? v.w / v.p * 100 : 0}%;background:${col}"></div></div><span class="v">${v.w}/${v.p}</span></div>`; }).join('')}</div>
   </div>` : ''}
   <div class="card"><h3>Про гру</h3><div class="desc">${esc(g.d || 'Опис з’явиться після синхронізації з BGG.')}</div>
    <button class="btn sm ghost" style="margin-top:14px" onclick="App.url('https://boardgamegeek.com/boardgame/${id}')">${ic('link')} Відкрити на BGG</button></div>
   ${plays.length ? `<div><div class="sec-h" style="padding:0;margin:10px 0 12px"><h2>Історія партій</h2></div>${plays.slice(0, 20).map(playCard).join('')}</div>` : ''}
  </div>
  <div class="sticky-cta"><button class="btn accent block" onclick="App.logPlay(${id})">${ic('plus')} Записати партію</button></div>`;
  // parallax
  const hp = $('.det-hero .poster', el);
  el.addEventListener('scroll', () => { const y = el.scrollTop; if (y < 600) hp.style.transform = `translateY(${y * .4}px) scale(${1 + y * .0004})`; }, { passive: true });
  $$('[data-t]', el).forEach(b => b.onclick = () => {
    const k = b.dataset.t, v = !G(id)[k]; const patch = { [k]: v };
    if (k === 'owned' && v) { patch.wish = false; patch.added = Date.now(); }
    upd(id, patch); haptic(); toast({ owned: v ? 'Додано на полицю' : 'Прибрано з колекції', fav: v ? 'В улюблених ♥' : 'Прибрано з улюблених', wish: v ? 'Додано в «Хочу»' : 'Прибрано з «Хочу»', follow: v ? 'Стежимо за новинами' : 'Не стежимо' }[k]);
    refreshTop(); setTimeout(() => $(`[data-t="${k}"]`, el)?.classList.add('pop'));
  });
  $$('[data-cx]', el).forEach(b => b.onclick = () => { upd(id, { cx: +b.dataset.cx }); haptic(); refreshTop(); });
  const sb = $('#sync', el); if (sb) sb.onclick = async () => { sb.classList.add('skel'); try { await BGG.refresh(id); toast('Оновлено з BGG'); refreshTop(); } catch (e) { toast('BGG: ' + e.message); sb.classList.remove('skel'); } };
};
function pickLabels(id) {
  const draw = (sh) => {
    const g = G(id);
    $('.sh-body', sh).innerHTML = `<div class="chips wrapc" style="margin-bottom:18px">${S.labels.map(l => `<button class="chip ${(g.labels || []).includes(l.id) ? 'on' : ''}" data-l="${l.id}"><i style="width:9px;height:9px;border-radius:50%;background:${l.col}"></i>${esc(l.n)}</button>`).join('')}</div>
    <div class="fld"><label>Нова мітка</label><div class="fld-row"><input class="inp" id="nl" placeholder="Напр. «Кампанія»"><button class="btn accent" id="addl" style="flex:none">${ic('plus')}</button></div></div>`;
    $$('[data-l]', sh).forEach(b => b.onclick = () => { const cur = G(id).labels || []; const l = b.dataset.l; upd(id, { labels: cur.includes(l) ? cur.filter(x => x !== l) : [...cur, l] }); haptic(6); draw(sh); });
    $('#addl', sh).onclick = () => { const n = $('#nl', sh).value.trim(); if (!n) return; const l = { id: uid(), n, col: LABEL_COLORS[S.labels.length % LABEL_COLORS.length] }; S.labels.push(l); upd(id, { labels: [...(G(id).labels || []), l.id] }); draw(sh); };
  };
  openSheet({ title: 'Мітки', body: '', foot: `<button class="btn primary block" data-close2>Готово</button>`, onMount: (sh, api) => { draw(sh); $('[data-close2]', sh).onclick = api.close; }, onClose: () => refreshTop() });
}

// ---------- LOG / EDIT PLAY ----------
function logPlay(gameId, playId, preset) {
  const ex = playId ? S.plays.find(p => p.id === playId) : null;
  const lastG = S.plays[0]?.g;
  const st = ex ? JSON.parse(JSON.stringify(ex)) : Object.assign({ id: uid(), g: gameId ? +gameId : (lastG || ownedIds()[0] || CATALOG[0].id), date: todayStr(), dur: 0, players: S.players.slice(0, 2).map(p => ({ n: p.n, s: null, w: false })), note: '' }, preset || {});
  if (!ex && !st.dur) { const g = G(st.g); st.dur = g.t ? g.t[0] : 30; }
  let gq = '';
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
     <div class="fld"><label>Нотатка</label><textarea class="inp" id="pn" placeholder="Що запам’яталось?">${esc(st.note)}</textarea></div>`;
    const gqi = $('#gq', sh); gqi.oninput = () => { gq = gqi.value; const pos = gqi.selectionStart; draw(sh); const n = $('#gq', sh); n.focus(); n.setSelectionRange(pos, pos); };
    $$('[data-g]', sh).forEach(t => t.onclick = () => { st.g = +t.dataset.g; const ng = G(st.g); if (!ex) st.dur = ng.t[0]; if ((ng.c || []).includes('Кооператив')) st.players.forEach(p => p.s = null); haptic(6); draw(sh); });
    $('#pd', sh).onchange = e => st.date = e.target.value || todayStr();
    $('#pdur', sh).oninput = e => st.dur = +e.target.value || 0;
    $('#pn', sh).oninput = e => st.note = e.target.value;
    $$('[data-p]', sh).forEach(b => b.onclick = () => { const n = b.dataset.p; const i = st.players.findIndex(x => x.n === n); i >= 0 ? st.players.splice(i, 1) : st.players.push({ n, s: null, w: false }); draw(sh); });
    $$('[data-s]', sh).forEach(inp => inp.oninput = () => { const v = inp.value === '' ? null : +inp.value; st.players[+inp.dataset.s].s = v; });
    $$('[data-w]', sh).forEach(b => b.onclick = () => { const p = st.players[+b.dataset.w]; p.w = !p.w; p._manual = true; haptic(6); b.classList.toggle('on', p.w); });
    $('#addp', sh).onclick = () => {
      const s2 = openSheet({ title: 'Новий гравець', body: `<input class="inp" id="np" placeholder="Ім’я">`, foot: `<button class="btn accent block" id="npok">Додати</button>`, onMount: (s) => setTimeout(() => $('#np', s).focus(), 300) });
      $('#npok', s2.el).onclick = () => { const n = $('#np', s2.el).value.trim(); if (!n) return; if (!S.players.some(p => p.n === n)) S.players.push({ n, col: PLAYER_COLORS[S.players.length % PLAYER_COLORS.length] }); st.players.push({ n, s: null, w: false }); save(); s2.close(); draw(sh); };
    };
  };
  const foot = `${ex ? `<button class="btn danger" id="pdel">${ic('trash')}</button>` : ''}<button class="btn accent block" id="psave">${ex ? 'Зберегти зміни' : 'Записати партію'}</button>`;
  openSheet({ title: ex ? 'Редагувати партію' : 'Нова партія', body: '', foot, onMount: (sh, api) => {
    draw(sh);
    $('#psave', sh).onclick = () => {
      const coop = (G(st.g).c || []).includes('Кооператив');
      if (!coop && !st.players.some(p => p.w) && st.players.some(p => p.s != null)) { const best = Math.max(...st.players.map(p => p.s ?? -Infinity)); st.players.forEach(p => p.w = p.s === best); }
      st.players.forEach(p => delete p._manual);
      const before = weekStreak().n;
      const i = S.plays.findIndex(p => p.id === st.id);
      i >= 0 ? S.plays[i] = st : S.plays.push(st);
      S.plays.sort((a, b) => b.date.localeCompare(a.date) || 0);
      if (!S.games[st.g]) upd(st.g, { labels: [] });
      save(); api.close(); haptic(20); toast(ex ? 'Партію оновлено' : 'Партію записано 🎲'); refreshTop();
      const after = weekStreak().n; if (!ex) { if (after > before) setTimeout(() => celebrateStreak(after), 350); else confetti(); }
    };
    const d = $('#pdel', sh); if (d) d.onclick = () => confirmSheet('Видалити цю партію?', 'Видалити', () => { S.plays = S.plays.filter(p => p.id !== st.id); save(); api.close(); toast('Партію видалено'); refreshTop(); });
  } });
}

// ---------- STATS ----------
const SF = { view: 'overview', period: 365, game: 0 };
SCREENS.stats = el => {
  el.innerHTML = `${topbar('Партії', { sub: plural(S.plays.length, 'партія', 'партії', 'партій') + ' у журналі', right: `<button class="iconbtn" onclick="App.logPlay()">${ic('plus')}</button>` })}
  ${segmented('statseg', [['overview', 'Огляд'], ['log', 'Журнал']], SF.view, v => { SF.view = v; drawStats(el); })}
  <div class="chips" style="margin-top:12px">${[[30, '30 днів'], [90, '3 міс'], [365, 'Рік'], [0, 'Весь час']].map(([v, l]) => `<button class="chip ${SF.period === v ? 'on' : ''}" data-per="${v}">${l}</button>`).join('')}
   <button class="chip ${SF.game ? 'on' : ''}" id="sgame">${ic('dice')} ${SF.game ? esc(G(SF.game).n) : 'Усі ігри'}</button></div>
  <div id="statbody"></div>`;
  $$('[data-per]', el).forEach(b => b.onclick = () => { SF.period = +b.dataset.per; refreshTop(); });
  $('#sgame', el).onclick = () => {
    const ids = [...new Set(S.plays.map(p => p.g))].map(G).sort((a, b) => a.n.localeCompare(b.n));
    const sh = openSheet({ title: 'Фільтр за грою', body: `<div class="list" style="margin:0 -20px"><div class="li" data-g="0"><div class="li-main"><b>Усі ігри</b></div></div>${ids.map(g => `<div class="li" data-g="${g.id}">${poster(g)}<div class="li-main"><b>${esc(g.n)}</b><div class="m">${playsOf(g.id).length} партій</div></div></div>`).join('')}</div>` });
    $$('[data-g]', sh.el).forEach(li => li.onclick = () => { SF.game = +li.dataset.g; sh.close(); refreshTop(); });
  };
  drawStats(el);
};
function periodPlays() { return S.plays.filter(p => (!SF.period || daysSince(p.date) <= SF.period) && (!SF.game || p.g === SF.game)); }
function drawStats(el) {
  const box = $('#statbody', el), plays = periodPlays();
  if (!plays.length) { box.innerHTML = `<div class="empty"><div class="big">📊</div><b>Немає партій за цей період</b>Запишіть першу — і тут з’являться графіки.<br><br><button class="btn accent" onclick="App.logPlay()">Записати партію</button></div>`; return; }
  if (SF.view === 'log') {
    let html = '', cur = '';
    plays.forEach(p => { const d = parseD(p.date), m = MONTHS_N[d.getMonth()] + ' ' + d.getFullYear(); if (m !== cur) { html += `<div class="month-h">${m}</div>`; cur = m; } html += playCard(p); });
    box.innerHTML = `<div class="wrap fade-in">${html}</div>`; return;
  }
  const hours = Math.round(plays.reduce((s, p) => s + (p.dur || 0), 0) / 60);
  const uniq = new Set(plays.map(p => p.g)).size;
  // months
  const now = new Date(), months = [];
  for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ k: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), l: MONTHS_S[d.getMonth()], n: 0 }); }
  S.plays.filter(p => !SF.game || p.g === SF.game).forEach(p => { const m = months.find(x => x.k === p.date.slice(0, 7)); if (m) m.n++; });
  const mmax = Math.max(1, ...months.map(m => m.n));
  // top games
  const byGame = {}; plays.forEach(p => byGame[p.g] = (byGame[p.g] || 0) + 1);
  const top = Object.entries(byGame).sort((a, b) => b[1] - a[1]).slice(0, 6); const tmax = top[0]?.[1] || 1;
  // players
  const pl = {}; plays.forEach(p => p.players.forEach(x => { pl[x.n] = pl[x.n] || { p: 0, w: 0 }; pl[x.n].p++; if (x.w) pl[x.n].w++; }));
  const plist = Object.entries(pl).sort((a, b) => b[1].w / b[1].p - a[1].w / a[1].p);
  // heatmap 18 weeks
  const days = 18 * 7, counts = {}; S.plays.forEach(p => counts[p.date] = (counts[p.date] || 0) + 1);
  const start = new Date(now); start.setDate(start.getDate() - days + 1 - ((start.getDay() + 6) % 7 === 6 ? 0 : 0));
  let heat = ''; for (let i = 0; i < days; i++) { const d = new Date(start); d.setDate(start.getDate() + i); const k = d.toISOString().slice(0, 10); const c = counts[k] || 0; heat += `<i class="${c >= 3 ? 'l3' : c === 2 ? 'l2' : c ? 'l1' : ''}" title="${k}: ${c}"></i>`; }
  // streak
  let streak = 0; { const set = new Set(S.plays.map(p => p.date.slice(0, 7))); const d = new Date(now.getFullYear(), now.getMonth(), 1); while (set.has(d.toISOString().slice(0, 7)) || set.has(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'))) { streak++; d.setMonth(d.getMonth() - 1); } }
  // complexity of collection
  const cxc = [0, 0, 0, 0, 0, 0, 0, 0]; ownedIds().forEach(id => cxc[G(id).cx7]++); const ctot = cxc.reduce((a, b) => a + b, 0) || 1;
  let acc = 0; const R = 42, C = 2 * Math.PI * R;
  const donut = `<svg width="120" height="120" viewBox="0 0 120 120" style="transform:rotate(-90deg);flex:none">${cxc.map((n, i) => { if (!i || !n) return ''; const len = n / ctot * C; const s = `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${COMPLEXITY[i].c}" stroke-width="16" stroke-dasharray="${len - 2} ${C - len + 2}" stroke-dashoffset="${-acc}"/>`; acc += len; return s; }).join('')}</svg>`;
  const shelfDust = ownedIds().filter(id => !S.plays.some(p => p.g === id && daysSince(p.date) <= 180)).length;
  box.innerHTML = `
  <div class="kpis stagger" style="margin-top:6px">
   <div class="kpi"><div class="glow" style="background:var(--accent)"></div><b>${plays.length}</b><span>партій</span></div>
   <div class="kpi"><div class="glow" style="background:var(--sky)"></div><b>${hours}<small style="font-size:16px"> год</small></b><span>за столом</span></div>
   <div class="kpi"><div class="glow" style="background:var(--ok)"></div><b>${uniq}</b><span>різних ігор</span></div>
   <div class="kpi"><div class="glow" style="background:var(--violet)"></div><b>${streak}<small style="font-size:16px"> міс</small></b><span>серія без пропусків</span></div>
  </div>
  ${gaugeCard()}
  <div class="sec chart"><div class="card"><h3>Партії по місяцях</h3><div class="bars">${months.map((m, i) => `<div class="bc"><div class="b ${m.n ? '' : 'z'}" style="height:${m.n / mmax * 100}%;animation-delay:${i * .04}s">${m.n ? `<em>${m.n}</em>` : ''}</div><span class="bl">${m.l}</span></div>`).join('')}</div></div></div>
  <div class="sec chart"><div class="card"><h3>Активність · 18 тижнів</h3><div class="heat">${heat}</div></div></div>
  ${!SF.game ? `<div class="sec chart"><div class="card"><h3>Найчастіше грали</h3>${top.map(([id, n], i) => { const g = G(id); return `<div class="hbar" onclick="App.openGame(${id})"><span class="nm">${esc(g.n)}</span><div class="tr"><div class="fl" style="width:${n / tmax * 100}%;background:${g.pal[0]};animation-delay:${i * .08}s"></div></div><span class="v">${n}</span></div>`; }).join('')}</div></div>` : ''}
  <div class="sec chart"><div class="card"><h3>Хто перемагає ${ic('trophy')}</h3>${plist.map(([n, v], i) => { const col = S.players.find(p => p.n === n)?.col || '#888'; return `<div class="hbar"><span class="nm">${i === 0 ? '👑 ' : ''}${esc(n)}</span><div class="tr"><div class="fl" style="width:${v.w / v.p * 100}%;background:${col};animation-delay:${i * .08}s"></div></div><span class="v">${Math.round(v.w / v.p * 100)}%</span></div>`; }).join('')}</div></div>
  <div class="sec chart"><div class="card"><h3>Складність колекції</h3><div class="donut-wrap">${donut}<div class="legend">${cxc.map((n, i) => i && n ? `<div><i style="background:${COMPLEXITY[i].c}"></i>${i} · ${COMPLEXITY[i].n}<b>${n}</b></div>` : '').join('')}</div></div></div></div>
  ${shelfDust ? `<div class="sec"><div class="banner" onclick="App.openLibrary({sort:'last'})">${ic('fire')}<div><b>${plural(shelfDust, 'гра', 'гри', 'ігор')}</b> не діставали понад пів року. Час влаштувати вечір «пилових коробок»?</div></div></div>` : ''}`;
}

function gaugeCard() {
  const own = ownedIds(); if (!own.length) return '';
  const used = own.filter(id => S.plays.some(p => p.g === id && daysSince(p.date) <= 180)).length;
  const pct = Math.round(used / own.length * 100);
  const prev = own.filter(id => S.plays.some(p => p.g === id && daysSince(p.date) > 30 && daysSince(p.date) <= 210)).length;
  const delta = pct - Math.round(prev / own.length * 100);
  const R = 120, cx = 150, cy = 150, a = Math.PI * (1 - pct / 100), kx = cx + R * Math.cos(a), ky = cy - R * Math.sin(a);
  return `<div class="sec chart"><div class="card" style="background:radial-gradient(70% 80% at 50% 100%,rgba(255,110,40,.18),transparent 70%),var(--card)"><h3>Жива полиця</h3>
  <div class="gauge"><svg viewBox="0 0 300 170"><defs><linearGradient id="gg" x1="0" x2="1"><stop offset="0" stop-color="#7a2a0c"/><stop offset=".6" stop-color="#FF7A2F"/><stop offset="1" stop-color="#FFC08A"/></linearGradient></defs>
  <path d="M30 150 A120 120 0 0 1 270 150" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="26" stroke-linecap="round"/>
  <path d="M30 150 A120 120 0 0 1 270 150" fill="none" stroke="url(#gg)" stroke-width="26" stroke-linecap="round" pathLength="100" stroke-dasharray="${pct} 100" style="filter:drop-shadow(0 0 10px rgba(255,110,40,.5))"/>
  <circle cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" r="15" fill="#fff" style="filter:drop-shadow(0 0 8px rgba(255,255,255,.7))"/></svg>
  <div class="gv"><b>${pct}<small>/100</small></b><span>${delta >= 0 ? '↗' : '↘'} ${Math.abs(delta)}% за місяць</span></div></div>
  <p class="muted" style="text-align:center;font-size:12.5px;margin-top:10px">${used} з ${own.length} ігор колекції були на столі за останні пів року</p></div></div>`;
}

// ---------- MORE ----------
SCREENS.more = el => {
  el.innerHTML = `${topbar('Ще')}
  <div class="hub stagger">
   ${[['🗞️', 'Новини', 'Анонси, Kickstarter, ваші ігри', '#8B7CFF', 'App.openNews()'], ['⏱️', 'Таймер', 'Шаховий годинник для всіх', '#4CC9F0', 'App.openTimer()'], ['♟️', 'Міні-ігри', 'Шахи, шашки, доміно, аліас…', '#FFC24B', 'App.openMiniGames()'], ['💘', 'Матч', 'Свайпайте й знайдіть гру', '#FF4A1C', "App.tab('match')"]]
    .map(([e, t, s, c, f]) => `<button class="hubc" onclick="${f}"><div class="bgc" style="background:${c}"></div><div class="em">${e}</div><div><b>${t}</b><span>${s}</span></div></button>`).join('')}
  </div>
  <div class="sec" style="border-top:1px solid var(--line)">
   ${[['tag', 'Мітки', `${S.labels.length} міток`, 'App.openLabels()'], ['users', 'Гравці', S.players.map(p => p.n).join(', ') || 'Немає', 'App.openPlayers()'], ['settings', 'Налаштування та BGG', S.settings.bggToken ? 'Токен BGG підключено ✓' : 'Підключіть BoardGameGeek', 'App.openSettings()'], ['download', 'Експорт даних', 'Резервна копія у JSON', 'App.exportData()'], ['upload', 'Імпорт даних', 'Відновити з JSON', 'App.importData()']]
    .map(([i, t, s, f]) => `<div class="setrow" onclick="${f}"><span class="si">${ic(i)}</span><div class="st-m"><b>${t}</b><span>${esc(s)}</span></div>${ic('back', 'ico')}</div>`.replace('class="ico"', 'class="ico" style="transform:rotate(180deg);color:var(--dim)"')).join('')}
  </div>
  <div class="empty" style="padding-top:28px;font-size:12px">Полиця 1.0 · дані зберігаються лише на цьому пристрої<br>Рейтинги офлайн-каталогу приблизні; актуальні — після синхронізації з BGG.</div>`;
};
SCREENS.labels = el => {
  el.innerHTML = `${topbar('Мітки', { back: true })}<div class="wrap">${S.labels.map(l => `<div class="pl-row"><span class="nm"><span class="av" style="background:${l.col}"></span>${esc(l.n)} <span class="muted" style="font-weight:600;font-size:12px">${allIds().filter(id => (S.games[id]?.labels || []).includes(l.id)).length} ігор</span></span><button class="crown" data-del="${l.id}">${ic('trash')}</button></div>`).join('')}
  <div class="fld" style="margin-top:16px"><div class="fld-row"><input class="inp" id="nl" placeholder="Нова мітка"><button class="btn accent" id="addl" style="flex:none">${ic('plus')}</button></div></div></div>`;
  $('#addl', el).onclick = () => { const n = $('#nl', el).value.trim(); if (!n) return; S.labels.push({ id: uid(), n, col: LABEL_COLORS[S.labels.length % LABEL_COLORS.length] }); save(); refreshTop(); };
  $$('[data-del]', el).forEach(b => b.onclick = () => confirmSheet('Видалити мітку з усіх ігор?', 'Видалити', () => { const id = b.dataset.del; S.labels = S.labels.filter(l => l.id !== id); Object.values(S.games).forEach(g => g.labels = (g.labels || []).filter(x => x !== id)); save(); refreshTop(); }));
};
SCREENS.players = el => {
  el.innerHTML = `${topbar('Гравці', { back: true })}<div class="wrap">${S.players.map((p, i) => { const n = S.plays.filter(x => x.players.some(y => y.n === p.n)).length, w = S.plays.filter(x => x.players.some(y => y.n === p.n && y.w)).length; return `<div class="pl-row"><span class="nm"><span class="av" style="background:${p.col}">${esc(p.n[0])}</span>${esc(p.n)} <span class="muted" style="font-weight:600;font-size:12px">${n} парт. · ${w} перемог</span></span><button class="crown" data-del="${i}">${ic('trash')}</button></div>`; }).join('')}
  <div class="fld" style="margin-top:16px"><div class="fld-row"><input class="inp" id="np" placeholder="Ім’я гравця"><button class="btn accent" id="addp" style="flex:none">${ic('plus')}</button></div></div></div>`;
  $('#addp', el).onclick = () => { const n = $('#np', el).value.trim(); if (!n || S.players.some(p => p.n === n)) return; S.players.push({ n, col: PLAYER_COLORS[S.players.length % PLAYER_COLORS.length] }); save(); refreshTop(); };
  $$('[data-del]', el).forEach(b => b.onclick = () => confirmSheet('Видалити гравця? Його партії залишаться в журналі.', 'Видалити', () => { S.players.splice(+b.dataset.del, 1); save(); refreshTop(); }));
};
SCREENS.settings = el => {
  el.innerHTML = `${topbar('Налаштування', { back: true })}<div class="wrap">
  <div class="card"><h3>BoardGameGeek</h3>
   <p class="muted" style="font-size:13px;margin-bottom:14px">З осені 2025 BGG видає доступ до XML API лише зареєстрованим застосункам. Зареєструйте свій на <b>boardgamegeek.com/applications</b> (некомерційне використання) та вставте токен сюди.</p>
   <div class="fld"><label>Токен застосунку</label><input class="inp" id="tok" value="${esc(S.settings.bggToken)}" placeholder="xxxxxxxx-xxxx-…" autocomplete="off"></div>
   <div class="fld"><label>Ваш нік на BGG (для імпорту колекції)</label><input class="inp" id="bu" value="${esc(S.settings.bggUser)}" placeholder="username"></div>
   <div class="fld-row"><button class="btn ghost" onclick="App.url('https://boardgamegeek.com/applications')">${ic('link')} Отримати</button><button class="btn accent" id="tsave">Зберегти</button></div>
   <button class="btn ghost block" style="margin-top:10px" id="imp">${ic('download')} Імпортувати колекцію з BGG</button></div>
  <div class="card" style="margin-top:12px"><h3>Дані</h3>
   <p class="muted" style="font-size:13px;margin-bottom:14px">${S.demo ? 'Зараз завантажено демо-колекцію, щоб показати можливості.' : 'Ваша власна колекція.'}</p>
   <button class="btn danger block" id="wipe">${ic('trash')} Почати з чистого аркуша</button></div></div>`;
  $('#tsave', el).onclick = () => { S.settings.bggToken = $('#tok', el).value.trim(); S.settings.bggUser = $('#bu', el).value.trim(); save(); toast('Збережено'); };
  $('#imp', el).onclick = async () => {
    S.settings.bggToken = $('#tok', el).value.trim(); S.settings.bggUser = $('#bu', el).value.trim(); save();
    if (!S.settings.bggUser) return toast('Вкажіть нік на BGG');
    toast('Завантажуємо колекцію…');
    try {
      const xml = await netGet(`https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(S.settings.bggUser)}&own=1&excludesubtype=boardgameexpansion`, BGG.headers());
      const doc = new DOMParser().parseFromString(xml, 'text/xml'); const ids = $$('item', doc).map(i => +i.getAttribute('objectid'));
      if (!ids.length) return toast('BGG готує колекцію — спробуйте за хвилину');
      for (let i = 0; i < ids.length; i += 20) { const things = await BGG.things(ids.slice(i, i + 20)); things.forEach(t => { const keep = S.games[t.id] || { labels: [] }; S.games[t.id] = Object.assign({}, keep, t, { owned: true, added: keep.added || Date.now() }); }); }
      save(); toast(`Імпортовано ${ids.length} ігор`);
    } catch (e) { toast('BGG: ' + e.message); }
  };
  $('#wipe', el).onclick = () => confirmSheet('Видалити всі ігри, партії, мітки та гравців?', 'Стерти все', () => { const set = S.settings; S = blankState(); S.settings = set; S.players = [{ n: 'Я', col: PLAYER_COLORS[0] }]; save(); toast('Чистий аркуш ✨'); goTab('home'); });
};
function exportData() {
  const t = JSON.stringify(S);
  if (HAS_NATIVE && window.Native.saveFile) { window.Native.saveFile('polytsia-backup-' + todayStr() + '.json', t); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'application/json' })); a.download = 'polytsia-backup-' + todayStr() + '.json'; a.click(); toast('Файл збережено');
}
function importData() {
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/json,.json';
  i.onchange = () => { const f = i.files[0]; if (!f) return; f.text().then(t => { try { const d = JSON.parse(t); if (!d.v || !d.games) throw 0; S = Object.assign(blankState(), d); save(); toast('Дані відновлено'); goTab('home'); } catch (e) { toast('Невірний файл'); } }); };
  i.click();
}

// ---------- NEWS ----------
const DEMO_NEWS = () => {
  const favs = allIds().map(G).filter(g => g.follow).slice(0, 4);
  const mk = (g, t, src, d, ks) => ({ id: 'demo' + hashStr(t), t, src, g: g?.id, date: new Date(Date.now() - d * 36e5).toISOString(), url: 'https://boardgamegeek.com/boardgame/' + (g?.id || ''), ks, demo: true });
  const a = [];
  favs.forEach((g, i) => a.push(mk(g, `${g.n}: оголошено нове доповнення`, 'BGG News', 5 + i * 20)));
  a.push(mk(G(342942), 'Ark Nova — збір на Kickstarter перевищив мету за 3 години', 'Kickstarter', 30, true));
  a.push(mk(G(366013), 'Heat: нове доповнення з трасами Азії відкрило передзамовлення', 'Gamefound', 52, true));
  a.push(mk(G(162886), 'Spirit Island: вийшов оновлений реліз правил', 'Board Game Wire', 80));
  return a;
};
const NF = { tab: 'all', loading: false };
SCREENS.news = el => {
  const items = (S.news.items?.length ? S.news.items : DEMO_NEWS()).filter(n => NF.tab === 'all' || (NF.tab === 'mine' ? n.g && G(n.g).follow : n.ks));
  const isDemo = !S.news.items?.length;
  const followed = allIds().map(G).filter(g => g.follow);
  const card = (n, feat) => { const g = n.g ? G(n.g) : { id: hashStr(n.t) % 9999, n: n.src, pal: ['#3B3F9E', '#0A0B2A'], m: 'stars' }; const d = new Date(n.date); const ago = Math.round((Date.now() - d) / 36e5); const when = ago < 24 ? ago + ' год тому' : agoText(Math.floor(ago / 24));
    return feat ? `<div class="news-feat" data-n="${esc(n.id)}">${poster(g)}<div class="nf-b"><span class="nsrc ${n.ks ? 'ks' : ''}" style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:${n.ks ? 'var(--ok)' : 'var(--accent)'}">${esc(n.src)} · ${when}</span><b>${esc(n.t)}</b></div></div>`
      : `<div class="news" data-n="${esc(n.id)}"><div class="nthumb">${poster(g)}</div><div><span class="nsrc ${n.ks ? 'ks' : ''}">${esc(n.src)}</span><b>${esc(n.t)}</b><span class="nd">${when}${!S.seen[n.id] ? ' · <span style="color:var(--accent)">нове</span>' : ''}</span></div></div>`; };
  el.innerHTML = `${topbar('Новини', { back: Nav.stack.length > 0, sub: `Стежимо за ${plural(followed.length, 'грою', 'іграми', 'іграми')}`, right: `<button class="iconbtn" id="nref">${ic('sync')}</button>` })}
  <div class="chips">${[['all', 'Усе'], ['mine', 'Мої ігри'], ['ks', 'Kickstarter']].map(([v, l]) => `<button class="chip ${NF.tab === v ? 'on' : ''}" data-nt="${v}">${l}</button>`).join('')}</div>
  ${isDemo ? `<div class="banner" style="margin:10px 18px 14px">${ic('info')}<div>Це приклади. Натисніть ⟳ — в Android-версії стрічка підтягнеться з новинних RSS за вашими іграми та Kickstarter.</div></div>` : '<div style="height:10px"></div>'}
  ${NF.loading ? '<div class="spinner"></div>' : items.length ? card(items[0], true) + `<div class="wrap stagger">${items.slice(1).map(n => card(n)).join('')}</div>` : '<div class="empty">Поки порожньо</div>'}`;
  $$('[data-nt]', el).forEach(b => b.onclick = () => { NF.tab = b.dataset.nt; refreshTop(); });
  $$('[data-n]', el).forEach(c => c.onclick = () => { const n = [...(S.news.items || []), ...DEMO_NEWS()].find(x => x.id === c.dataset.n); if (!n) return; S.seen[n.id] = 1; save(); openUrl(n.url); });
  $('#nref', el).onclick = refreshNews;
  if (!isDemo) { S.news.items.forEach(n => S.seen[n.id] = S.seen[n.id] || 0); }
};
async function refreshNews() {
  const followed = allIds().map(G).filter(g => g.follow).slice(0, 6);
  const qs = [...followed.map(g => ({ q: `"${g.n}" board game`, g: g.id })), { q: 'board game kickstarter', ks: true }, { q: 'board game announced', g: null }];
  NF.loading = true; refreshTop();
  const out = [];
  await Promise.all(qs.map(async q => {
    try {
      const xml = await netGet('https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q=' + encodeURIComponent(q.q + ' when:30d'));
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      $$('item', doc).slice(0, q.g ? 4 : 6).forEach(it => { const t = it.querySelector('title')?.textContent || ''; const src = it.querySelector('source')?.textContent || 'News'; out.push({ id: 'n' + hashStr(t), t: t.replace(/ - [^-]+$/, ''), src, g: q.g, ks: !!q.ks || /kickstarter|gamefound/i.test(t), date: new Date(it.querySelector('pubDate')?.textContent || Date.now()).toISOString(), url: it.querySelector('link')?.textContent || '' }); });
    } catch (e) {}
  }));
  NF.loading = false;
  if (out.length) { const seen = new Set(); S.news.items = out.filter(n => !seen.has(n.id) && seen.add(n.id)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60); S.news.at = Date.now(); save(); toast('Стрічку оновлено'); }
  else toast(HAS_NATIVE ? 'Немає з’єднання' : 'У браузері новини блокує CORS — працює в Android');
  refreshTop();
}
