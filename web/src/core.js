// ================= CORE: store, utils, native bridge, posters, router, sheets =================
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const daysSince = s => Math.floor((Date.now() - parseD(s).getTime()) / 864e5);
const MONTHS = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'];
const MONTHS_N = ['січень','лютий','березень','квітень','травень','червень','липень','серпень','вересень','жовтень','листопад','грудень'];
const MONTHS_S = ['січ','лют','бер','кві','тра','чер','лип','сер','вер','жов','лис','гру'];
const fmtDate = s => { const d = parseD(s); return d.getDate() + ' ' + MONTHS[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''); };
const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return n + ' ' + (m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c); };
const agoText = d => d === 0 ? 'сьогодні' : d === 1 ? 'вчора' : d < 7 ? plural(d, 'день', 'дні', 'днів') + ' тому' : d < 60 ? plural(Math.round(d / 7), 'тиждень', 'тижні', 'тижнів') + ' тому' : plural(Math.round(d / 30), 'місяць', 'місяці', 'місяців') + ' тому';
const fmtDur = m => m >= 60 ? Math.floor(m / 60) + ' год' + (m % 60 ? ' ' + m % 60 + ' хв' : '') : m + ' хв';
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hashStr = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

// ---------- store ----------
const KEY = 'polytsia.v1';
let S;
function blankState() { return { v: 1, games: {}, plays: [], labels: [], players: [], settings: { bggToken: '', bggUser: '' }, news: { items: [], at: 0 }, seen: {} }; }
function loadState() {
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  if (!S || !S.v) { S = blankState(); seedDemo(); save(); }
}
let saveT;
function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }, 120); }

function seedDemo() {
  const owned = [266192, 230802, 178900, 13, 822, 9209, 163412, 54043, 199792, 314040, 224517, 316554, 148228, 373106, 284083, 237182, 39856, 70323];
  const wish = [342942, 162886, 366013, 174430];
  const fav = [266192, 224517, 373106, 314040, 316554];
  S.labels = [
    { id: 'l1', n: 'На двох', col: '#4CC9F0' }, { id: 'l2', n: 'Для гостей', col: '#FFC24B' },
    { id: 'l3', n: 'Вечір п’ятниці', col: '#FF6B3D' }, { id: 'l4', n: 'Подарунок', col: '#E07A9E' }];
  const lab = { 163412: ['l1'], 54043: ['l1'], 373106: ['l1'], 178900: ['l2'], 39856: ['l2'], 70323: ['l2', 'l3'], 224517: ['l3'], 316554: ['l3'], 199792: ['l4'] };
  const now = Date.now();
  owned.forEach((id, i) => S.games[id] = { owned: true, fav: fav.includes(id), follow: fav.includes(id), labels: lab[id] || [], added: now - (400 - i * 15) * 864e5 });
  wish.forEach(id => S.games[id] = { wish: true, follow: true, labels: [], added: now - 20 * 864e5 });
  S.games[224517].cx = 6; S.games[373106].cx = 3; S.games[266192].cx = 4;
  S.players = [{ n: 'Артем', col: PLAYER_COLORS[0] }, { n: 'Марія', col: PLAYER_COLORS[1] }, { n: 'Олег', col: PLAYER_COLORS[2] }, { n: 'Ліна', col: PLAYER_COLORS[3] }];
  const r = rng(42);
  const weights = { 266192: 9, 230802: 6, 373106: 8, 314040: 7, 316554: 6, 224517: 5, 163412: 5, 54043: 4, 178900: 4, 148228: 3, 284083: 4, 199792: 3, 70323: 2, 9209: 2, 39856: 2 };
  const pool = []; Object.entries(weights).forEach(([id, w]) => { for (let i = 0; i < w; i++) pool.push(+id); });
  for (let i = 0; i < 64; i++) {
    const g = pool[Math.floor(r() * pool.length)], cat = CATALOG.find(x => x.id === g);
    const ago = Math.floor(Math.pow(r(), 1.4) * 300) + 2;
    const d = new Date(now - ago * 864e5);
    const maxP = Math.min(cat.p[1], 4), minP = cat.p[0];
    const np = clamp(Math.round(minP + r() * (maxP - minP)), minP, maxP);
    const ps = S.players.slice(0, np).map(p => ({ n: p.n, s: Math.round(40 + r() * 80), w: false }));
    const coop = cat.c.includes('Кооператив');
    if (coop) { const won = r() > .4; ps.forEach(p => { p.s = null; p.w = won; }); }
    else { let best = ps[0]; ps.forEach(p => { if (p.s > best.s) best = p; }); best.w = true; }
    S.plays.push({ id: uid() + i, g, date: d.toISOString().slice(0, 10), dur: Math.round((cat.t[0] + r() * (cat.t[1] - cat.t[0])) / 5) * 5 || cat.t[0], players: ps, note: '' });
  }
  // гарантовано "давно не грали"
  S.plays.push({ id: uid() + 'c', g: 13, date: new Date(now - 131 * 864e5).toISOString().slice(0, 10), dur: 90, players: S.players.slice(0, 4).map((p, i) => ({ n: p.n, s: [10, 8, 7, 6][i], w: i === 0 })), note: 'Довга партія, Олег зібрав найдовшу дорогу' });
  S.plays.push({ id: uid() + 'r', g: 237182, date: new Date(now - 84 * 864e5).toISOString().slice(0, 10), dur: 110, players: S.players.slice(0, 3).map((p, i) => ({ n: p.n, s: [30, 24, 27][i], w: i === 0 })), note: '' });
  S.plays.sort((a, b) => b.date.localeCompare(a.date));
  S.demo = true;
}

// ---------- games ----------
const CAT = Object.fromEntries(CATALOG.map(g => [g.id, g]));
function G(id) {
  id = +id; const base = CAT[id] || {}; const u = S.games[id] || {};
  const g = Object.assign({ labels: [] }, base, u, { id });
  g.cx7 = u.cx || (g.w ? weightTo7(g.w) : 4);
  g.cxUser = !!u.cx;
  return g;
}
function allIds() { return [...new Set([...CATALOG.map(g => g.id), ...Object.keys(S.games).map(Number)])].filter(id => CAT[id] || (S.games[id] && S.games[id].n)); }
function upd(id, patch) { S.games[id] = Object.assign(S.games[id] || { labels: [] }, patch); save(); }
function playsOf(id) { return S.plays.filter(p => p.g === +id); }
function lastPlay(id) { const p = S.plays.find(p => p.g === +id); return p ? p.date : null; }
function ownedIds() { return allIds().filter(id => S.games[id]?.owned); }

// ---------- native bridge (Android WebView) ----------
const HAS_NATIVE = typeof window.Native !== 'undefined';
const pending = {};
window.__nativeCb = (id, status, body) => { const p = pending[id]; if (!p) return; delete pending[id]; status >= 200 && status < 300 ? p.res(body) : p.rej(new Error('HTTP ' + status + (status === 401 ? ' (токен BGG)' : ''))); };
function netGet(url, headers = {}) {
  if (HAS_NATIVE) return new Promise((res, rej) => { const id = uid(); pending[id] = { res, rej }; window.Native.fetch(id, url, JSON.stringify(headers)); setTimeout(() => { if (pending[id]) { delete pending[id]; rej(new Error('timeout')); } }, 25000); });
  return fetch(url, { headers }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); });
}
function haptic(ms = 12) { try { HAS_NATIVE && window.Native.vibrate ? window.Native.vibrate(ms) : navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
function openUrl(u) { HAS_NATIVE && window.Native.open ? window.Native.open(u) : window.open(u, '_blank'); }
function shareText(t) {
  if (HAS_NATIVE && window.Native.share) return window.Native.share(t);
  if (navigator.share) return navigator.share({ text: t }).catch(() => {});
  navigator.clipboard?.writeText(t).then(() => toast('Скопійовано'));
}

// ---------- BGG ----------
const BGG = {
  headers() { return S.settings.bggToken ? { Authorization: 'Bearer ' + S.settings.bggToken.trim() } : {}; },
  async search(q) {
    const xml = await netGet('https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=' + encodeURIComponent(q), this.headers());
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    return $$('item', doc).slice(0, 12).map(it => +it.getAttribute('id'));
  },
  async things(ids) {
    if (!ids.length) return [];
    const xml = await netGet('https://boardgamegeek.com/xmlapi2/thing?stats=1&id=' + ids.join(','), this.headers());
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    return $$('item', doc).map(it => {
      const v = (sel, a = 'value') => it.querySelector(sel)?.getAttribute(a);
      const id = +it.getAttribute('id');
      const name = it.querySelector('name[type="primary"]')?.getAttribute('value') || v('name');
      const desc = (it.querySelector('description')?.textContent || '').replace(/&#10;/g, '\n').replace(/\s+/g, ' ').trim();
      const cats = $$('link[type="boardgamecategory"]', it).slice(0, 3).map(l => l.getAttribute('value'));
      const h = hashStr(name);
      const pals = [['#E9772E', '#7A2E12'], ['#3E8E5A', '#163A26'], ['#2A8FBD', '#0D2338'], ['#7A3FB8', '#1E0E33'], ['#C2393B', '#1D2C59'], ['#C99A3B', '#3C2A10'], ['#3D84A8', '#132836']];
      const motifs = ['hex', 'grid', 'lines', 'dots', 'tri', 'waves', 'tiles', 'circles', 'stars', 'arcs'];
      return {
        id, n: name, y: +v('yearpublished') || null, img: it.querySelector('image')?.textContent?.trim() || '', thumb: it.querySelector('thumbnail')?.textContent?.trim() || '',
        r: Math.round(parseFloat(v('statistics ratings average')) * 10) / 10 || null, w: Math.round(parseFloat(v('statistics ratings averageweight')) * 10) / 10 || null,
        p: [+v('minplayers') || 1, +v('maxplayers') || 4], t: [+v('minplaytime') || 30, +v('maxplaytime') || +v('playingtime') || 60],
        c: cats.length ? cats : ['Настільна гра'], d: desc.slice(0, 600), m: motifs[h % motifs.length], pal: pals[h % pals.length], bgg: true
      };
    });
  },
  async refresh(id) { const [t] = await this.things([id]); if (t) { const keep = S.games[id] || { labels: [] }; S.games[id] = Object.assign({}, keep, t, { pal: CAT[id]?.pal || t.pal, m: CAT[id]?.m || t.m }); save(); } return t; }
};

// ---------- posters ----------
function motifSVG(m, id, c) {
  const r = rng(id * 7 + 3); let s = '';
  const W = 300, H = 400, op = a => `fill-opacity="${a}"`, st = (a, w = 2) => `stroke="#fff" stroke-opacity="${a}" stroke-width="${w}" fill="none"`;
  switch (m) {
    case 'hex': for (let y = 0; y < 9; y++) for (let x = 0; x < 6; x++) { const cx = x * 60 + (y % 2) * 30, cy = y * 52, k = 28; const pts = [0, 1, 2, 3, 4, 5].map(i => { const a = Math.PI / 3 * i + Math.PI / 6; return (cx + k * Math.cos(a)).toFixed(1) + ',' + (cy + k * Math.sin(a)).toFixed(1); }).join(' '); s += `<polygon points="${pts}" ${r() > .75 ? `fill="#fff" ${op(.12 + r() * .2)}` : st(.25)}/>`; } break;
    case 'grid': for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) { if (r() > .55) s += `<rect x="${x * 50 + 4}" y="${y * 50 + 4}" width="42" height="42" rx="6" fill="#fff" ${op(r() * .28)}/>`; } break;
    case 'lines': for (let i = 0; i < 7; i++) { const y1 = r() * H, y2 = r() * H; s += `<path d="M-10 ${y1} C 100 ${y1 + 80}, 200 ${y2 - 80}, 310 ${y2}" ${st(.35, 3 + r() * 4)} stroke-dasharray="${r() > .5 ? '18 10' : '0'}"/><circle cx="${r() * W}" cy="${r() * H}" r="${6 + r() * 8}" fill="#fff" ${op(.5)}/>`; } break;
    case 'dots': for (let i = 0; i < 40; i++) s += `<circle cx="${r() * W}" cy="${r() * H}" r="${3 + r() * 28}" fill="#fff" ${op(.06 + r() * .2)}/>`; break;
    case 'tri': for (let i = 0; i < 16; i++) { const x = r() * W, y = r() * H, k = 20 + r() * 70; s += `<polygon points="${x},${y - k} ${x + k},${y + k * .7} ${x - k},${y + k * .7}" ${r() > .5 ? `fill="#fff" ${op(.08 + r() * .15)}` : st(.3)}/>`; } break;
    case 'waves': for (let i = 0; i < 12; i++) { const y = i * 36 + 10, a = 10 + r() * 20; s += `<path d="M-20 ${y} q 40 ${-a} 80 0 t 80 0 t 80 0 t 80 0" ${st(.12 + r() * .3, 3)}/>`; } break;
    case 'tiles': for (let y = 0; y < 9; y++) for (let x = 0; x < 7; x++) { const cx = x * 48, cy = y * 48; s += `<rect x="${cx}" y="${cy}" width="30" height="30" transform="rotate(45 ${cx + 15} ${cy + 15})" ${r() > .6 ? `fill="#fff" ${op(.1 + r() * .2)}` : st(.2)}/>`; } break;
    case 'stripes': for (let i = -8; i < 16; i++) s += `<rect x="${i * 34}" y="-100" width="${10 + r() * 14}" height="700" transform="rotate(25 150 200)" fill="#fff" ${op(.05 + r() * .14)}/>`; break;
    case 'circles': { const cx = 60 + r() * 180, cy = 80 + r() * 160; for (let i = 1; i < 14; i++) s += `<circle cx="${cx}" cy="${cy}" r="${i * 26}" ${st(.08 + (i % 3 === 0 ? .25 : .06), i % 3 === 0 ? 5 : 2)}/>`; s += `<circle cx="${cx}" cy="${cy}" r="40" fill="#fff" ${op(.3)}/>`; break; }
    case 'diamond': for (let i = 0; i < 9; i++) { const k = 30 + i * 28; s += `<polygon points="150,${200 - k} ${150 + k * .75},200 150,${200 + k} ${150 - k * .75},200" ${st(.08 + (i % 2) * .18, 3)}/>`; } break;
    case 'arcs': for (let i = 1; i < 12; i++) s += `<path d="M 0 ${H} A ${i * 36} ${i * 36} 0 0 1 ${i * 36} ${H - i * 36} " ${st(.1 + (i % 2) * .2, 6)}/><circle cx="${W}" cy="0" r="${i * 22}" ${st(.07, 2)}/>`; break;
    case 'dunes': for (let i = 0; i < 7; i++) { const y = 120 + i * 45; s += `<path d="M0 ${y} C 80 ${y - 50 - r() * 30}, 180 ${y + 40}, 300 ${y - 30} V 400 H 0 Z" fill="#fff" ${op(.05 + i * .02)}/>`; } s += `<circle cx="210" cy="80" r="34" fill="#fff" ${op(.35)}/>`; break;
    case 'gears': for (let i = 0; i < 6; i++) { const cx = r() * W, cy = r() * H, k = 25 + r() * 60; s += `<circle cx="${cx}" cy="${cy}" r="${k}" ${st(.3, 10)} stroke-dasharray="8 7"/><circle cx="${cx}" cy="${cy}" r="${k * .45}" ${st(.25, 3)}/>`; } break;
    case 'gems': for (let i = 0; i < 12; i++) { const x = r() * W, y = r() * H, k = 15 + r() * 35; s += `<polygon points="${x},${y - k} ${x + k * .8},${y - k * .3} ${x + k * .5},${y + k} ${x - k * .5},${y + k} ${x - k * .8},${y - k * .3}" fill="#fff" ${op(.08 + r() * .22)}/>`; } break;
    case 'burst': for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; s += `<line x1="150" y1="170" x2="${150 + Math.cos(a) * 400}" y2="${170 + Math.sin(a) * 400}" ${st(i % 2 ? .12 : .25, i % 3 ? 3 : 9)}/>`; } break;
    case 'leaves': for (let i = 0; i < 22; i++) { const x = r() * W, y = r() * H; s += `<ellipse cx="${x}" cy="${y}" rx="${8 + r() * 12}" ry="${22 + r() * 26}" transform="rotate(${r() * 180} ${x} ${y})" fill="#fff" ${op(.06 + r() * .2)}/>`; } break;
    case 'stars': for (let i = 0; i < 70; i++) s += `<circle cx="${r() * W}" cy="${r() * H}" r="${r() * 2.2}" fill="#fff" ${op(.3 + r() * .7)}/>`; s += `<circle cx="${200 + r() * 60}" cy="${60 + r() * 60}" r="${50 + r() * 30}" fill="#fff" ${op(.18)}/><ellipse cx="230" cy="100" rx="110" ry="20" transform="rotate(-20 230 100)" ${st(.3, 3)}/>`; break;
    case 'speed': for (let i = 0; i < 26; i++) { const y = r() * H, x = r() * 200 - 60; s += `<rect x="${x}" y="${y}" width="${80 + r() * 220}" height="${2 + r() * 8}" rx="4" fill="#fff" ${op(.08 + r() * .3)}/>`; } break;
    case 'hearts': for (let i = 0; i < 14; i++) { const x = r() * W, y = r() * H, k = .6 + r() * 1.6; s += `<path transform="translate(${x} ${y}) scale(${k})" d="M0 6 C-12 -6 -24 6 0 22 C24 6 12 -6 0 6Z" fill="#fff" ${op(.08 + r() * .2)}/>`; } break;
    default: for (let i = 0; i < 20; i++) s += `<circle cx="${r() * W}" cy="${r() * H}" r="${r() * 30}" fill="#fff" ${op(.1)}/>`;
  }
  return `<svg class="motif" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice">${s}</svg>`;
}
const posterCache = {};
function poster(g, cls = '', extra = '') {
  const [c1, c2] = g.pal || ['#555', '#222'];
  const key = g.id + (g.m || '');
  const svg = posterCache[key] || (posterCache[key] = motifSVG(g.m, g.id, c1));
  const len = (g.n || '').length, k = len > 22 ? .62 : len > 15 ? .76 : len > 10 ? .9 : 1;
  const img = g.img ? `<img src="${esc(g.img)}" loading="lazy" alt="" onerror="this.remove()">` : '';
  return `<div class="poster ${cls}" style="--c1:${c1};--c2:${c2}">${svg}<div class="vign"></div><div class="py">${g.y || ''}</div><div class="pt"><span style="font-size:${k}em">${esc(g.n)}</span></div>${img}${extra}</div>`;
}
function cxChip(n) { const c = COMPLEXITY[n]; return `<span class="cx" style="--cc:${c.c}">${n}/7</span>`; }
function cxBar(n) { const c = COMPLEXITY[n]; return `<span class="cx-bar" style="--cc:${c.c}">${[1, 2, 3, 4, 5, 6, 7].map(i => `<i class="${i <= n ? 'f' : ''}"></i>`).join('')}</span>`; }
function tile(g, opts = {}) {
  const plays = playsOf(g.id).length;
  const badges = `<div class="badge-tl">${g.r ? `<span class="badge gold">★ ${g.r.toFixed(1)}</span>` : ''}${opts.plays && plays ? `<span class="badge">${plays}×</span>` : ''}</div>${g.fav ? `<div class="badge-tr"><span class="heart">${ic('heart')}</span></div>` : ''}`;
  const meta = opts.meta || `${cxChip(g.cx7)}<span>${g.p[0] === g.p[1] ? g.p[0] : g.p[0] + '–' + g.p[1]} гр.</span>`;
  return `<div class="tile ${opts.cls || ''}" onclick="App.openGame(${g.id})">${poster(g, '', badges)}<div class="tname">${esc(g.n)}</div><div class="tmeta">${meta}</div></div>`;
}

// ---------- toast / sheet / confirm ----------
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200); }
const sheets = [];
function openSheet({ title, body, foot = '', onMount, onClose }) {
  const root = $('#sheet-root');
  const bd = document.createElement('div'); bd.className = 'backdrop';
  const sh = document.createElement('div'); sh.className = 'sheet';
  sh.innerHTML = `<div class="grab"></div><div class="sh-head"><h3>${title}</h3><button class="iconbtn" data-close>${ic('close')}</button></div><div class="sh-body">${body}</div>${foot ? `<div class="sh-foot">${foot}</div>` : ''}`;
  root.append(bd, sh);
  const api = {
    el: sh, close() {
      sh.classList.remove('open'); bd.classList.remove('open'); const i = sheets.indexOf(api); if (i >= 0) sheets.splice(i, 1);
      setTimeout(() => { bd.remove(); sh.remove(); }, 450); onClose && onClose();
    }
  };
  bd.onclick = api.close; $('[data-close]', sh).onclick = api.close;
  // swipe down to close
  let y0 = null, dy = 0; const grab = $('.grab', sh), head = $('.sh-head', sh);
  [grab, head].forEach(h => {
    h.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; sh.style.transition = 'none'; }, { passive: true });
    h.addEventListener('touchmove', e => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); sh.style.transform = `translateY(${dy}px)`; }, { passive: true });
    h.addEventListener('touchend', () => { sh.style.transition = ''; sh.style.transform = ''; if (dy > 110) api.close(); y0 = null; dy = 0; });
  });
  sheets.push(api);
  requestAnimationFrame(() => requestAnimationFrame(() => { sh.classList.add('open'); bd.classList.add('open'); }));
  onMount && onMount(sh, api);
  return api;
}
function confirmSheet(text, okText, onOk, danger = true) {
  const s = openSheet({ title: 'Підтвердіть', body: `<p class="muted" style="margin-bottom:8px">${text}</p>`, foot: `<button class="btn ghost block" data-n>Скасувати</button><button class="btn ${danger ? 'danger' : 'accent'} block" data-y>${okText}</button>` });
  $('[data-n]', s.el).onclick = s.close; $('[data-y]', s.el).onclick = () => { s.close(); onOk(); };
}
function confetti() {
  const c = document.createElement('div'); c.className = 'confetti';
  const cols = ['#FF6B3D', '#FFC24B', '#3DDC97', '#4CC9F0', '#8B7CFF', '#FF4D6D'];
  for (let i = 0; i < 90; i++) { const p = document.createElement('i'); p.style.left = Math.random() * 100 + '%'; p.style.background = cols[i % cols.length]; p.style.animationDuration = 1.6 + Math.random() * 1.8 + 's'; p.style.animationDelay = Math.random() * .5 + 's'; p.style.transform = `rotate(${Math.random() * 360}deg)`; c.append(p); }
  $('#app').append(c); setTimeout(() => c.remove(), 4200);
}

// ---------- router ----------
const Nav = { tab: 'home', base: null, stack: [] };
const SCREENS = {};
function mkScreen(cls) { const el = document.createElement('div'); el.className = 'screen ' + cls; $('#view').append(el); return el; }
function cleanup(el) { try { el._cleanup && el._cleanup(); } catch (e) {} }
function goTab(name) {
  haptic(8);
  [...Nav.stack.map(s => s.el), Nav.base?.el].forEach(el => { if (el) { cleanup(el); el.remove(); } });
  Nav.stack = []; Nav.tab = name;
  const el = mkScreen('enter'); Nav.base = { el, fn: SCREENS[name], args: [] };
  SCREENS[name](el);
  $$('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
}
function push(fn, ...args) {
  const el = mkScreen('push'); el.style.zIndex = 2 + Nav.stack.length; Nav.stack.push({ el, fn, args }); fn(el, ...args);
}
function back() {
  if (sheets.length) { sheets[sheets.length - 1].close(); return true; }
  if (Nav.stack.length) {
    const top = Nav.stack.pop(); cleanup(top.el); top.el.classList.remove('push'); top.el.classList.add('pop');
    setTimeout(() => top.el.remove(), 300); refreshTop(); return true;
  }
  if (Nav.tab !== 'home') { goTab('home'); return true; }
  return false;
}
function refreshTop() {
  const top = Nav.stack.length ? Nav.stack[Nav.stack.length - 1] : Nav.base;
  if (!top) return; const sc = top.el.scrollTop; cleanup(top.el);
  top.el.classList.remove('enter', 'push');
  top.fn(top.el, ...top.args); top.el.scrollTop = sc;
}
window.onBackPressed = () => back() ? 'handled' : 'exit';
window.addEventListener('keydown', e => { if (e.key === 'Escape') back(); });

function topbar(title, opts = {}) {
  return `<div class="topbar">${opts.back ? `<button class="iconbtn" onclick="App.back()">${ic('back')}</button>` : ''}<div style="flex:1;min-width:0"><h1>${title}</h1>${opts.sub ? `<div class="sub">${opts.sub}</div>` : ''}</div>${opts.right || ''}</div>`;
}
function segmented(id, items, cur, onPick) {
  setTimeout(() => {
    const seg = document.getElementById(id); if (!seg) return;
    const ind = $('.seg-ind', seg), btns = $$('button', seg);
    const place = b => { ind.style.left = b.offsetLeft + 'px'; ind.style.width = b.offsetWidth + 'px'; };
    const on = btns.find(b => b.classList.contains('on')); on && place(on);
    btns.forEach(b => b.onclick = () => { btns.forEach(x => x.classList.toggle('on', x === b)); place(b); haptic(6); onPick(b.dataset.v); });
  });
  return `<div class="seg" id="${id}"><div class="seg-ind"></div>${items.map(([v, l]) => `<button data-v="${v}" class="${v === cur ? 'on' : ''}">${l}</button>`).join('')}</div>`;
}

// ---------- streak (тижні поспіль з хоча б однією партією) ----------
function weekKey(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate(); }
function weekStreak() {
  const weeks = new Set(S.plays.map(p => weekKey(parseD(p.date))));
  const d = new Date(); let n = 0; const thisWeek = weeks.has(weekKey(d));
  if (!thisWeek) d.setDate(d.getDate() - 7);
  while (weeks.has(weekKey(d))) { n++; d.setDate(d.getDate() - 7); }
  return { n, thisWeek };
}
const FLAME = `<svg viewBox="0 0 48 48"><defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB15C"/><stop offset=".55" stop-color="#FF5A1F"/><stop offset="1" stop-color="#E0300C"/></linearGradient><linearGradient id="fg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4E0"/><stop offset="1" stop-color="#FFC27A"/></linearGradient></defs><path fill="url(#fg)" d="M24 3c2 7 10 11 12 20 2 9-4 20-12 20S10 37 11 28c1-6 5-8 6-13 4 3 4 7 4 9 3-3 4-12 3-21z"/><path fill="url(#fg2)" d="M24 26c3 3 6 6 5 10-1 3-3 5-5 5s-5-2-5-5c0-3 3-5 5-10z"/></svg>`;
function celebrateStreak(n) {
  const c = document.createElement('div'); c.className = 'celebrate';
  let emb = ''; for (let i = 0; i < 26; i++) emb += `<i class="ember" style="left:${Math.random() * 100}%;bottom:${-Math.random() * 20}%;animation-duration:${4 + Math.random() * 5}s;animation-delay:${-Math.random() * 5}s"></i>`;
  c.innerHTML = `${emb}<div class="cf">${FLAME}</div><div class="cn">${n}</div><div class="ct">${n === 1 ? 'Нова серія!' : plural(n, 'тиждень', 'тижні', 'тижнів') + ' поспіль'}</div><div class="cs">Ви граєте щотижня — полиця не вкривається пилом. Так тримати!</div><button class="btn">Далі ›</button>`;
  $('#app').append(c); haptic(60);
  $('button', c).onclick = () => { c.style.transition = 'opacity .4s'; c.style.opacity = 0; setTimeout(() => c.remove(), 400); };
}
