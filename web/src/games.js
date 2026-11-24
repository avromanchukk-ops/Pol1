// ================= MINI-GAMES =================
const MINI = [
  ['chess', '♟️', 'Шахи', 'Удвох або з ботом', '#FFB84D'],
  ['checkers', '⚪', 'Шашки', 'Російські правила', '#FF7A2F'],
  ['giveaway', '🔄', 'Піддавки', 'Хто перший віддасть усе', '#E0603A'],
  ['domino', '🁫', 'Доміно', 'Проти бота', '#C9A27A'],
  ['alias', '💬', 'Аліас', 'Поясни слово команді', '#B08CFF'],
  ['croc', '🐊', 'Крокодил', 'Покажи без слів', '#3DDC97'],
  ['battle', '🚢', 'Морський бій', 'Бот або 2 гравці', '#5CC8F0'],
];
SCREENS.minigames = el => {
  el.innerHTML = `${topbar('Міні-ігри', { back: true, sub: 'Коли нудно — на 5 хвилин' })}<div class="hub stagger">
  ${MINI.map(([k, e, t, s, c], i) => `<button class="hubc ${i === 0 ? 'wide' : ''}" onclick="App.openMini('${k}')"><div class="bgc" style="background:${c}"></div><div class="em">${e}</div><div><b>${t}</b><span>${s}</span></div></button>`).join('')}</div>`;
};
const gameHeader = (title, sub, right = '') => topbar(title, { back: true, sub, right });
function modePick(el, title, onPick, opts = [['bot', '🤖 Проти бота'], ['2p', '👥 Удвох на одному']]) {
  el.innerHTML = `${gameHeader(title)}<div class="wrap fade-in" style="display:grid;gap:12px;margin-top:20px">${opts.map(([v, l]) => `<button class="btn ${v === opts[0][0] ? 'accent' : 'ghost'} block" data-m="${v}" style="height:60px;font-size:16px">${l}</button>`).join('')}</div>`;
  $$('[data-m]', el).forEach(b => b.onclick = () => onPick(b.dataset.m));
}

// ---------- CHESS ----------
const GL = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }, PV = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const isW = p => p && p === p.toUpperCase();
function chessInit(mode) {
  const b = Array(64).fill(null), back = 'rnbqkbnr';
  for (let c = 0; c < 8; c++) { b[c] = back[c]; b[8 + c] = 'p'; b[48 + c] = 'P'; b[56 + c] = back[c].toUpperCase(); }
  return { b, turn: 'w', cs: { K: 1, Q: 1, k: 1, q: 1 }, ep: -1, sel: -1, last: null, mode, over: null, cap: { w: [], b: [] } };
}
function chAttacked(b, sq, by) {
  const r = sq >> 3, c = sq & 7, own = p => p && (by === 'w' ? isW(p) : !isW(p));
  const at = (rr, cc) => rr >= 0 && rr < 8 && cc >= 0 && cc < 8 ? b[rr * 8 + cc] : undefined;
  const pd = by === 'w' ? 1 : -1;
  for (const dc of [-1, 1]) { const p = at(r + pd, c + dc); if (own(p) && p.toLowerCase() === 'p') return true; }
  for (const [dr, dc] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) { const p = at(r + dr, c + dc); if (own(p) && p.toLowerCase() === 'n') return true; }
  for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let k = 1; k < 8; k++) { const p = at(r + dr * k, c + dc * k); if (p === undefined) break; if (!p) continue;
      if (own(p)) { const t = p.toLowerCase(), diag = dr && dc; if (t === 'q' || (diag && t === 'b') || (!diag && t === 'r') || (k === 1 && t === 'k')) return true; } break; }
  }
  return false;
}
function chPseudo(st, col) {
  const { b } = st, mv = [], mine = p => p && (col === 'w' ? isW(p) : !isW(p)), foe = p => p && !mine(p);
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq]; if (!mine(p)) continue; const t = p.toLowerCase(), r = sq >> 3, c = sq & 7;
    const add = (rr, cc, extra = {}) => { if (rr < 0 || rr > 7 || cc < 0 || cc > 7) return false; const to = rr * 8 + cc; if (mine(b[to])) return false; mv.push(Object.assign({ f: sq, t: to }, extra)); return !b[to]; };
    if (t === 'p') {
      const d = col === 'w' ? -1 : 1, start = col === 'w' ? 6 : 1, pr = col === 'w' ? 0 : 7;
      if (!b[(r + d) * 8 + c]) { mv.push({ f: sq, t: (r + d) * 8 + c, promo: r + d === pr }); if (r === start && !b[(r + 2 * d) * 8 + c]) mv.push({ f: sq, t: (r + 2 * d) * 8 + c, dbl: 1 }); }
      for (const dc of [-1, 1]) { const cc = c + dc; if (cc < 0 || cc > 7) continue; const to = (r + d) * 8 + cc; if (foe(b[to])) mv.push({ f: sq, t: to, promo: r + d === pr }); else if (to === st.ep) mv.push({ f: sq, t: to, epc: r * 8 + cc }); }
    } else if (t === 'n') { for (const [dr, dc] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) add(r + dr, c + dc); }
    else if (t === 'k') {
      for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]) add(r + dr, c + dc);
      const row = col === 'w' ? 7 : 0, en = col === 'w' ? 'b' : 'w';
      if (sq === row * 8 + 4 && !chAttacked(b, sq, en)) {
        if (st.cs[col === 'w' ? 'K' : 'k'] && !b[row * 8 + 5] && !b[row * 8 + 6] && !chAttacked(b, row * 8 + 5, en)) mv.push({ f: sq, t: row * 8 + 6, castle: 'k' });
        if (st.cs[col === 'w' ? 'Q' : 'q'] && !b[row * 8 + 3] && !b[row * 8 + 2] && !b[row * 8 + 1] && !chAttacked(b, row * 8 + 3, en)) mv.push({ f: sq, t: row * 8 + 2, castle: 'q' });
      }
    } else {
      const dirs = t === 'b' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : t === 'r' ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dr, dc] of dirs) for (let k = 1; k < 8; k++) if (!add(r + dr * k, c + dc * k)) break;
    }
  }
  return mv;
}
function chApply(st, m) {
  const n = { b: st.b.slice(), turn: st.turn === 'w' ? 'b' : 'w', cs: Object.assign({}, st.cs), ep: -1, mode: st.mode, sel: -1, last: { f: m.f, t: m.t }, over: null, cap: { w: st.cap.w.slice(), b: st.cap.b.slice() } };
  const p = n.b[m.f], capd = m.epc != null ? n.b[m.epc] : n.b[m.t];
  if (capd) n.cap[st.turn].push(capd);
  if (m.epc != null) n.b[m.epc] = null;
  n.b[m.t] = m.promo ? (isW(p) ? 'Q' : 'q') : p; n.b[m.f] = null;
  if (m.dbl) n.ep = (m.f + m.t) / 2;
  if (m.castle) { const row = m.t >> 3; if (m.castle === 'k') { n.b[row * 8 + 5] = n.b[row * 8 + 7]; n.b[row * 8 + 7] = null; } else { n.b[row * 8 + 3] = n.b[row * 8]; n.b[row * 8] = null; } }
  if (p === 'K') n.cs.K = n.cs.Q = 0; if (p === 'k') n.cs.k = n.cs.q = 0;
  [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']].forEach(([s, k]) => { if (m.f === s || m.t === s) n.cs[k] = 0; });
  return n;
}
function chLegal(st, col = st.turn) { return chPseudo(st, col).filter(m => { const n = chApply(st, m); const k = n.b.indexOf(col === 'w' ? 'K' : 'k'); return !chAttacked(n.b, k, col === 'w' ? 'b' : 'w'); }); }
function chessBot(st) {
  const ms = chLegal(st); let best = null, bs = -1e9;
  for (const m of ms) {
    const n = chApply(st, m); let s = Math.random() * .6;
    const cap = st.b[m.t] || (m.epc != null ? 'p' : null); if (cap) s += PV[cap.toLowerCase()] * 10;
    if (m.promo) s += 80;
    const mover = n.b[m.t]; if (chAttacked(n.b, m.t, 'w')) s -= PV[mover.toLowerCase()] * 9;
    const wk = n.b.indexOf('K'); if (chAttacked(n.b, wk, 'b')) s += 3;
    if (!chLegal(n, 'w').length) s += chAttacked(n.b, wk, 'b') ? 1e5 : -50;
    const r = m.t >> 3, c = m.t & 7; s += (3.5 - Math.abs(3.5 - c)) * .3 + (3.5 - Math.abs(3.5 - r)) * .2;
    if (s > bs) { bs = s; best = m; }
  }
  return best;
}
let CH = null;
SCREENS.chess = el => {
  if (!CH) return modePick(el, 'Шахи', m => { CH = chessInit(m); refreshTop(); });
  const st = CH, legal = chLegal(st), kSq = st.b.indexOf(st.turn === 'w' ? 'K' : 'k'), inChk = chAttacked(st.b, kSq, st.turn === 'w' ? 'b' : 'w');
  if (!legal.length && !st.over) st.over = inChk ? (st.turn === 'w' ? 'Мат! Перемогли чорні' : 'Мат! Перемогли білі') : 'Пат — нічия';
  const targets = st.sel >= 0 ? legal.filter(m => m.f === st.sel) : [];
  const capRow = c => st.cap[c].map(p => GL[p.toLowerCase()]).join('');
  el.innerHTML = `${gameHeader('Шахи', st.mode === 'bot' ? 'Ви — білі, бот — чорні' : 'Удвох', `<button class="iconbtn" id="cnew">${ic('sync')}</button>`)}
  <div class="gstatus"><span class="turn" style="background:${st.turn === 'w' ? '#fff' : '#222'};border:2px solid #888"></span>${st.over || (inChk ? 'Шах! ' : '') + 'Хід ' + (st.turn === 'w' ? 'білих' : 'чорних')}<span style="margin-left:auto;font-size:18px;opacity:.8">${capRow('w')}</span></div>
  <div class="gboard">${st.b.map((p, i) => { const r = i >> 3, c = i & 7, t = targets.find(m => m.t === i);
    return `<div class="gsq ${(r + c) % 2 ? 'd' : 'l'} ${i === st.sel ? 'sel' : ''} ${t ? (st.b[i] || t.epc != null ? 'cap' : 'mv') : ''} ${st.last && (st.last.f === i || st.last.t === i) ? 'last' : ''} ${inChk && i === kSq ? 'chk' : ''}" data-i="${i}">${p ? `<span class="${isW(p) ? 'pc-w' : 'pc-b'}">${GL[p.toLowerCase()]}&#xFE0E;</span>` : ''}</div>`; }).join('')}</div>
  <div class="gstatus" style="font-size:18px;opacity:.8">${capRow('b') || '<span class="muted" style="font-size:13px">Взяті фігури з’являться тут</span>'}</div>`;
  $('#cnew', el).onclick = () => { CH = null; refreshTop(); };
  $$('.gsq', el).forEach(sq => sq.onclick = () => {
    if (st.over || (st.mode === 'bot' && st.turn === 'b')) return;
    const i = +sq.dataset.i, m = targets.find(x => x.t === i);
    if (m) { CH = chApply(st, m); haptic(12); refreshTop(); if (CH.mode === 'bot' && !CH.over) setTimeout(() => { if (!CH || CH.turn !== 'b') return; const bm = chessBot(CH); if (bm) { CH = chApply(CH, bm); haptic(8); } refreshTop(); }, 450); return; }
    const p = st.b[i]; st.sel = p && (st.turn === 'w' ? isW(p) : !isW(p)) && i !== st.sel ? i : -1; refreshTop();
  });
};

// ---------- CHECKERS / GIVEAWAY ----------
let CK = null;
function ckInit(mode, give) {
  const b = Array(64).fill(null);
  for (let i = 0; i < 64; i++) { const r = i >> 3, c = i & 7; if ((r + c) % 2) { if (r < 3) b[i] = { c: 'b', k: 0 }; if (r > 4) b[i] = { c: 'w', k: 0 }; } }
  return { b, turn: 'w', sel: -1, chain: null, mode, give, over: null };
}
const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
function ckCaps(st, sq, taken = new Set()) {
  const p = st.b[sq], r = sq >> 3, c = sq & 7, out = [];
  for (const [dr, dc] of DIRS) {
    if (!p.k) { const mr = r + dr, mc = c + dc, tr = r + 2 * dr, tc = c + 2 * dc; if (tr < 0 || tr > 7 || tc < 0 || tc > 7) continue; const mid = st.b[mr * 8 + mc];
      if (mid && mid.c !== p.c && !taken.has(mr * 8 + mc) && !st.b[tr * 8 + tc]) out.push({ f: sq, t: tr * 8 + tc, x: mr * 8 + mc }); }
    else { let k = 1, foe = -1; while (true) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) break; const q = st.b[rr * 8 + cc];
        if (foe < 0) { if (q) { if (q.c === p.c || taken.has(rr * 8 + cc)) break; foe = rr * 8 + cc; } }
        else { if (q) break; out.push({ f: sq, t: rr * 8 + cc, x: foe }); } k++; } }
  }
  return out;
}
function ckMoves(st) {
  if (st.chain) return ckCaps(st, st.chain.at, st.chain.taken);
  let caps = [], quiet = [];
  st.b.forEach((p, sq) => { if (!p || p.c !== st.turn) return; caps.push(...ckCaps(st, sq));
    const r = sq >> 3, c = sq & 7;
    for (const [dr, dc] of DIRS) { if (!p.k && dr !== (p.c === 'w' ? -1 : 1)) continue;
      for (let k = 1; k < (p.k ? 8 : 2); k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr > 7 || cc < 0 || cc > 7 || st.b[rr * 8 + cc]) break; quiet.push({ f: sq, t: rr * 8 + cc }); } } });
  return caps.length ? caps : quiet;
}
function ckApply(st, m) {
  const n = { ...st, b: st.b.map(x => x && { ...x }), sel: -1 };
  const p = n.b[m.f]; n.b[m.t] = p; n.b[m.f] = null;
  if ((p.c === 'w' && m.t >> 3 === 0) || (p.c === 'b' && m.t >> 3 === 7)) p.k = 1;
  if (m.x != null) { const taken = new Set(st.chain ? st.chain.taken : []); taken.add(m.x); n.chain = { at: m.t, taken };
    if (ckCaps(n, m.t, taken).length) return n; taken.forEach(x => n.b[x] = null); }
  n.chain = null; n.turn = st.turn === 'w' ? 'b' : 'w';
  if (!ckMoves(n).length) { const loser = n.turn; n.over = st.give ? (loser === 'w' ? 'Білі віддали все — перемога білих!' : 'Чорні віддали все — перемога чорних!') : (loser === 'w' ? 'Перемогли чорні' : 'Перемогли білі'); }
  return n;
}
function ckBot(st) {
  const ms = ckMoves(st); let best = null, bs = -1e9;
  for (const m of ms) { let n = ckApply(st, m); let s = Math.random();
    if (n.turn === st.turn) s += st.give ? -2 : 3;
    else { const opp = ckMoves(n).filter(x => x.x != null).length; s += st.give ? opp * 4 : -opp * 4; const r = m.t >> 3; if (!st.give && st.b[m.f].c === 'b') s += r * .2; }
    if (s > bs) { bs = s; best = m; } }
  return best;
}
function checkersScreen(el, give) {
  const title = give ? 'Піддавки' : 'Шашки';
  if (!CK || CK.give !== give) { CK = null; return modePick(el, title, m => { CK = ckInit(m, give); refreshTop(); }); }
  const st = CK, ms = ckMoves(st), from = st.chain ? st.chain.at : st.sel, targets = ms.filter(m => m.f === from), mustCap = ms.some(m => m.x != null);
  const cnt = c => st.b.filter(p => p && p.c === c).length;
  el.innerHTML = `${gameHeader(title, give ? 'Мета — позбутися всіх шашок. Бити обов’язково' : 'Бити обов’язково, дамка ходить далеко', `<button class="iconbtn" id="knew">${ic('sync')}</button>`)}
  <div class="gstatus"><span class="turn" style="background:${st.turn === 'w' ? '#f3ebdd' : '#2a211c'};border:2px solid #888"></span>${st.over || `Хід ${st.turn === 'w' ? 'білих' : 'чорних'}${mustCap ? ' · треба бити!' : ''}`}<span style="margin-left:auto" class="muted">⚪ ${cnt('w')} · ⚫ ${cnt('b')}</span></div>
  <div class="gboard">${st.b.map((p, i) => { const r = i >> 3, c = i & 7, t = targets.find(m => m.t === i), gone = st.chain && st.chain.taken.has(i);
    return `<div class="gsq ${(r + c) % 2 ? 'd' : 'l'} ${i === from ? 'sel' : ''} ${t ? 'mv' : ''}" data-i="${i}">${p ? `<div class="ck ${p.c} ${p.k ? 'k' : ''}" style="${gone ? 'opacity:.35' : ''}"></div>` : ''}</div>`; }).join('')}</div>`;
  $('#knew', el).onclick = () => { CK = null; refreshTop(); };
  const botGo = () => { if (!CK || CK.over || CK.mode !== 'bot' || CK.turn !== 'b') return; const m = ckBot(CK); if (!m) return; CK = ckApply(CK, m); haptic(8); refreshTop(); setTimeout(botGo, 500); };
  $$('.gsq', el).forEach(sq => sq.onclick = () => {
    if (st.over || (st.mode === 'bot' && st.turn === 'b')) return;
    const i = +sq.dataset.i, m = targets.find(x => x.t === i);
    if (m) { CK = ckApply(st, m); haptic(12); refreshTop(); setTimeout(botGo, 550); return; }
    if (st.chain) return;
    st.sel = st.b[i] && st.b[i].c === st.turn && ms.some(x => x.f === i) ? i : -1; refreshTop();
  });
}
SCREENS.checkers = el => checkersScreen(el, false);
SCREENS.giveaway = el => checkersScreen(el, true);

// ---------- DOMINO ----------
let DM = null;
function dmInit() {
  const all = []; for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) all.push([a, b]);
  all.sort(() => Math.random() - .5);
  const st = { me: all.slice(0, 7), bot: all.slice(7, 14), bone: all.slice(14), chain: [], turn: 'me', over: null, msg: '', score: DM?.score || { me: 0, bot: 0 } };
  const hi = h => Math.max(-1, ...h.filter(t => t[0] === t[1]).map(t => t[0]));
  st.turn = hi(st.bot) > hi(st.me) ? 'bot' : 'me'; st.msg = st.turn === 'me' ? 'Ваш хід — починайте' : 'Бот починає';
  return st;
}
const dmEnds = st => st.chain.length ? [st.chain[0][0], st.chain[st.chain.length - 1][1]] : null;
function dmFits(st, t) { const e = dmEnds(st); if (!e) return ['R']; const s = []; if (t[0] === e[0] || t[1] === e[0]) s.push('L'); if (t[0] === e[1] || t[1] === e[1]) s.push('R'); return s; }
function dmPlace(st, who, idx, side) {
  const hand = st[who], t = hand.splice(idx, 1)[0], e = dmEnds(st);
  if (!e) st.chain.push(t); else if (side === 'L') st.chain.unshift(t[1] === e[0] ? t : [t[1], t[0]]); else st.chain.push(t[0] === e[1] ? t : [t[1], t[0]]);
  if (!hand.length) { dmEnd(st, who); return; }
  st.turn = who === 'me' ? 'bot' : 'me';
}
const pips = h => h.reduce((s, t) => s + t[0] + t[1], 0);
function dmEnd(st, winner) { st.over = winner === 'me' ? 'Ви перемогли! 🎉' : winner === 'bot' ? 'Бот переміг' : 'Риба! Нічия'; if (winner && winner !== 'draw') st.score[winner]++; }
function dmCanMove(st, who) { return st[who].some(t => dmFits(st, t).length); }
function dmBot(st) {
  if (st.over || st.turn !== 'bot') return;
  let i = st.bot.map((t, k) => [k, t]).filter(([, t]) => dmFits(st, t).length).sort((a, b) => (b[1][0] + b[1][1]) - (a[1][0] + a[1][1]))[0];
  while (!i && st.bone.length) { st.bot.push(st.bone.pop()); i = dmFits(st, st.bot[st.bot.length - 1]).length ? [st.bot.length - 1, st.bot[st.bot.length - 1]] : null; }
  if (i) { dmPlace(st, 'bot', i[0], dmFits(st, i[1])[0]); st.msg = 'Бот зробив хід'; }
  else { st.msg = 'Бот пропускає хід'; st.turn = 'me'; if (!dmCanMove(st, 'me') && !st.bone.length) { const a = pips(st.me), b = pips(st.bot); dmEnd(st, a < b ? 'me' : b < a ? 'bot' : 'draw'); } }
}
const pipPos = { 0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const half = n => `<div class="half">${Array.from({ length: 9 }, (_, i) => pipPos[n].includes(i) ? '<i class="pip"></i>' : '<span></span>').join('')}</div>`;
const domTile = (t, cls = '', attrs = '') => `<div class="dom ${cls}" ${attrs}>${half(t[0])}${half(t[1])}</div>`;
SCREENS.domino = el => {
  if (!DM) DM = dmInit();
  const st = DM;
  el.innerHTML = `${gameHeader('Доміно', `Рахунок: ви ${st.score.me} : ${st.score.bot} бот`, `<button class="iconbtn" id="dnew">${ic('sync')}</button>`)}
  <div class="domino-hand" style="opacity:.9">${st.bot.map(() => `<div class="dom back" style="width:22px;height:40px"></div>`).join('')}</div>
  <div class="gstatus">${st.over || st.msg} <span class="muted" style="margin-left:auto;font-size:12px">базар: ${st.bone.length}</span></div>
  <div class="chain" id="chain">${st.chain.map(t => domTile(t, t[0] === t[1] ? '' : 'h')).join('') || '<span class="muted" style="margin:auto">Стіл порожній</span>'}</div>
  <div class="domino-hand">${st.me.map((t, i) => { const f = !st.over && st.turn === 'me' && dmFits(st, t).length; return domTile(t, f ? 'ok' : 'no', `data-i="${i}"`); }).join('')}</div>
  <div class="tm-ctrl">${st.over ? `<button class="btn accent block" id="dagain">Ще партія</button>` : st.turn === 'me' && !dmCanMove(st, 'me') ? (st.bone.length ? `<button class="btn accent block" id="ddraw">Взяти з базару</button>` : `<button class="btn ghost block" id="dpass">Пропустити хід</button>`) : ''}</div>`;
  const ch = $('#chain', el); ch.scrollLeft = ch.scrollWidth;
  const after = () => { refreshTop(); if (DM.turn === 'bot' && !DM.over) setTimeout(() => { dmBot(DM); haptic(8); refreshTop(); }, 700); };
  $('#dnew', el).onclick = () => { DM = dmInit(); after(); };
  const ag = $('#dagain', el); if (ag) ag.onclick = () => { DM = dmInit(); after(); };
  const dr = $('#ddraw', el); if (dr) dr.onclick = () => { st.me.push(st.bone.pop()); st.msg = 'Взяли кістку'; refreshTop(); };
  const dp = $('#dpass', el); if (dp) dp.onclick = () => { st.turn = 'bot'; if (!dmCanMove(st, 'bot')) { const a = pips(st.me), b = pips(st.bot); dmEnd(st, a < b ? 'me' : b < a ? 'bot' : 'draw'); } after(); };
  $$('.domino-hand .dom[data-i]', el).forEach(d => d.onclick = () => {
    if (st.over || st.turn !== 'me') return; const i = +d.dataset.i, sides = dmFits(st, st.me[i]);
    if (!sides.length) return toast('Ця кістка не підходить');
    const go = s => { dmPlace(st, 'me', i, s); st.msg = 'Хід бота…'; haptic(12); after(); };
    const e = dmEnds(st);
    if (sides.length === 2 && e[0] !== e[1]) { const sh = openSheet({ title: 'Куди поставити?', body: '', foot: `<button class="btn ghost block" id="sl">← Ліворуч (${e[0]})</button><button class="btn ghost block" id="sr">Праворуч (${e[1]}) →</button>` }); $('#sl', sh.el).onclick = () => { sh.close(); go('L'); }; $('#sr', sh.el).onclick = () => { sh.close(); go('R'); }; }
    else go(sides[0]);
  });
  if (st.turn === 'bot' && !st.over && !st._q) { st._q = 1; setTimeout(() => { st._q = 0; dmBot(DM); refreshTop(); }, 800); }
};

// ---------- ALIAS ----------
const AL = { teams: ['Котики', 'Їжаки'], score: [0, 0], cur: 0, sec: 60, cat: 'Середні', goal: 30, phase: 'setup', words: [], log: [], left: 0, deck: [] };
const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
function nextWord(cat) { if (!AL.deck.length) AL.deck = shuffle(WORDS[cat] || WORDS['Середні']); return AL.deck.pop(); }
SCREENS.alias = el => {
  el._cleanup = () => clearInterval(AL.iv);
  if (AL.phase === 'setup') {
    el.innerHTML = `${gameHeader('Аліас', 'Пояснюйте слова — не називаючи їх')}<div class="wrap fade-in">
    <div class="fld"><label>Команди</label><div class="fld-row"><input class="inp" id="t1" value="${esc(AL.teams[0])}"><input class="inp" id="t2" value="${esc(AL.teams[1])}"></div></div>
    <div class="fld"><label>Слова</label><div class="chips wrapc">${Object.keys(WORDS).map(k => `<button class="chip ${AL.cat === k ? 'on' : ''}" data-c="${k}">${k}</button>`).join('')}</div></div>
    <div class="fld"><label>Раунд</label><div class="chips wrapc">${[30, 60, 90].map(s => `<button class="chip ${AL.sec === s ? 'on' : ''}" data-s="${s}">${s} с</button>`).join('')}</div></div>
    <div class="fld"><label>Грати до</label><div class="chips wrapc">${[15, 30, 50].map(s => `<button class="chip ${AL.goal === s ? 'on' : ''}" data-g="${s}">${s} балів</button>`).join('')}</div></div>
    <button class="btn accent block" id="ago">Почати</button></div>`;
    const sv = () => { AL.teams = [$('#t1', el).value || 'Команда 1', $('#t2', el).value || 'Команда 2']; };
    $$('[data-c]', el).forEach(b => b.onclick = () => { sv(); AL.cat = b.dataset.c; AL.deck = []; refreshTop(); });
    $$('[data-s]', el).forEach(b => b.onclick = () => { sv(); AL.sec = +b.dataset.s; refreshTop(); });
    $$('[data-g]', el).forEach(b => b.onclick = () => { sv(); AL.goal = +b.dataset.g; refreshTop(); });
    $('#ago', el).onclick = () => { sv(); AL.score = [0, 0]; AL.cur = 0; AL.phase = 'ready'; refreshTop(); };
    return;
  }
  const scores = `<div class="score-row">${AL.teams.map((t, i) => `<div class="sc ${i === AL.cur ? 'on' : ''}"><span class="muted" style="font-size:12px;font-weight:800">${esc(t)}</span><b>${AL.score[i]}</b></div>`).join('')}</div>`;
  if (AL.phase === 'ready') {
    el.innerHTML = `${gameHeader('Аліас', 'до ' + AL.goal + ' балів')}${scores}<div class="handover" style="position:relative;inset:auto;min-height:340px;background:none"><div class="big">🎤</div><div style="font-size:24px;font-weight:800">Пояснює команда «${esc(AL.teams[AL.cur])}»</div><div class="muted">${AL.sec} секунд. Вгадали +1, пропуск −1</div><button class="btn accent" id="ago">Старт</button></div>`;
    $('#ago', el).onclick = () => { AL.phase = 'play'; AL.left = AL.sec; AL.log = []; AL.word = nextWord(AL.cat); refreshTop(); };
    return;
  }
  if (AL.phase === 'play') {
    el.innerHTML = `${gameHeader('Аліас')}${scores}<div style="margin-top:16px"><div class="ring" style="--p:${AL.left / AL.sec * 100}"><span id="al">${AL.left}</span></div></div>
    <div class="word-card"><div class="wc">${esc(AL.cat)}</div><div class="w">${esc(AL.word)}</div></div>
    <div class="tm-ctrl"><button class="btn danger block" id="ano" style="height:60px">✕ Пропуск</button><button class="btn accent block" id="ayes" style="height:60px">✓ Вгадали</button></div>`;
    const step = ok => { AL.log.push({ w: AL.word, ok }); haptic(ok ? 15 : 6); AL.word = nextWord(AL.cat); const w = $('.w', el); w.textContent = AL.word; w.style.animation = 'none'; w.offsetHeight; w.style.animation = ''; };
    $('#ano', el).onclick = () => step(false); $('#ayes', el).onclick = () => step(true);
    clearInterval(AL.iv); AL.iv = setInterval(() => { AL.left--; const r = $('.ring', el); if (r) { r.style.setProperty('--p', AL.left / AL.sec * 100); $('#al', el).textContent = AL.left; }
      if (AL.left <= 5 && AL.left > 0) haptic(30);
      if (AL.left <= 0) { clearInterval(AL.iv); haptic(400); AL.phase = 'review'; refreshTop(); } }, 1000);
    return;
  }
  if (AL.phase === 'review') {
    const pts = AL.log.reduce((s, x) => s + (x.ok ? 1 : -1), 0);
    el.innerHTML = `${gameHeader('Час!', 'Перевірте слова — торкніться, щоб змінити')}<div class="wrap">${AL.log.map((x, i) => `<div class="pl-row" data-i="${i}" style="cursor:pointer"><span class="nm">${esc(x.w)}</span><span style="font-size:20px;padding-right:10px">${x.ok ? '✅' : '❌'}</span></div>`).join('') || '<div class="empty">Жодного слова 🙃</div>'}
    <div class="card" style="margin-top:12px;text-align:center"><span class="muted">Команда «${esc(AL.teams[AL.cur])}» отримує</span><div class="h-display" style="font-size:40px;font-weight:800;color:var(--accent)">${pts > 0 ? '+' : ''}${pts}</div></div>
    <button class="btn accent block" style="margin-top:12px" id="anext">Зарахувати</button></div>`;
    $$('[data-i]', el).forEach(r => r.onclick = () => { const x = AL.log[+r.dataset.i]; x.ok = !x.ok; refreshTop(); });
    $('#anext', el).onclick = () => { AL.score[AL.cur] = Math.max(0, AL.score[AL.cur] + pts); if (AL.score[AL.cur] >= AL.goal) { AL.phase = 'win'; confetti(); } else { AL.cur = 1 - AL.cur; AL.phase = 'ready'; } refreshTop(); };
    return;
  }
  el.innerHTML = `${gameHeader('Аліас')}<div class="handover" style="position:relative;min-height:420px;background:none"><div class="big">🏆</div><div style="font-size:28px;font-weight:800">Перемогла «${esc(AL.teams[AL.cur])}»</div><div class="muted">${AL.score[0]} : ${AL.score[1]}</div><button class="btn accent" id="aag">Нова гра</button></div>`;
  $('#aag', el).onclick = () => { AL.phase = 'setup'; refreshTop(); };
};

// ---------- CROCODILE ----------
const CR = { cat: 'Легкі', word: null, shown: false, left: 60, sec: 60, iv: 0, guessed: 0 };
SCREENS.croc = el => {
  el._cleanup = () => clearInterval(CR.iv);
  el.innerHTML = `${gameHeader('Крокодил', 'Покажіть слово жестами — без звуків!')}
  <div class="chips">${Object.keys(WORDS).map(k => `<button class="chip ${CR.cat === k ? 'on' : ''}" data-c="${k}">${k}</button>`).join('')}</div>
  <div style="margin-top:14px"><div class="ring" style="--p:${CR.left / CR.sec * 100}"><span id="cl">${CR.left}</span></div></div>
  <div class="word-card" id="cw" style="background:linear-gradient(150deg,#1d3a2a,#0d1710)">${CR.word ? (CR.shown ? `<div class="wc">Покажіть</div><div class="w">${esc(CR.word)}</div><div class="muted" style="margin-top:10px;font-size:12px">торкніться, щоб сховати</div>` : `<div style="font-size:54px">🐊</div><div class="muted" style="margin-top:8px">Торкніться, щоб побачити слово<br>(тільки тому, хто показує!)</div>`) : `<div style="font-size:54px">🐊</div><div class="muted" style="margin-top:8px">Натисніть «Нове слово»</div>`}</div>
  <div class="tm-ctrl"><button class="btn ghost block" id="cnext">Нове слово</button><button class="btn accent block" id="cok">✓ Вгадали <span style="opacity:.7">${CR.guessed}</span></button></div>`;
  $$('[data-c]', el).forEach(b => b.onclick = () => { CR.cat = b.dataset.c; refreshTop(); });
  $('#cw', el).onclick = () => { if (CR.word) { CR.shown = !CR.shown; refreshTop(); } };
  const start = () => { CR.word = shuffle(WORDS[CR.cat])[0]; CR.shown = false; CR.left = CR.sec; clearInterval(CR.iv);
    CR.iv = setInterval(() => { CR.left = Math.max(0, CR.left - 1); const r = $('.ring', el); if (r) { r.style.setProperty('--p', CR.left / CR.sec * 100); $('#cl', el).textContent = CR.left; } if (!CR.left) { clearInterval(CR.iv); haptic(400); toast('⏰ Час вийшов!'); } }, 1000); refreshTop(); };
  $('#cnext', el).onclick = start;
  $('#cok', el).onclick = () => { if (!CR.word) return; CR.guessed++; confetti(); haptic(20); start(); };
};

// ---------- BATTLESHIP ----------
const SHIPS = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
function bsPlace() {
  for (let tries = 0; tries < 200; tries++) {
    const g = Array(100).fill(0), ships = []; let ok = true;
    for (const len of SHIPS) {
      let placed = false;
      for (let t = 0; t < 300 && !placed; t++) {
        const h = Math.random() < .5, r = Math.floor(Math.random() * (h ? 10 : 11 - len)), c = Math.floor(Math.random() * (h ? 11 - len : 10));
        const cells = Array.from({ length: len }, (_, i) => (r + (h ? 0 : i)) * 10 + c + (h ? i : 0));
        if (cells.every(x => { const rr = Math.floor(x / 10), cc = x % 10; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const a = rr + dr, b = cc + dc; if (a >= 0 && a < 10 && b >= 0 && b < 10 && g[a * 10 + b]) return false; } return true; })) {
          const id = ships.length + 1; cells.forEach(x => g[x] = id); ships.push({ cells, hits: 0 }); placed = true; }
      }
      if (!placed) { ok = false; break; }
    }
    if (ok) return { g, ships, shots: Array(100).fill(0) }; // shots: 0 none, 1 miss, 2 hit
  }
}
function bsShoot(board, i) {
  if (board.shots[i]) return null;
  const id = board.g[i];
  if (!id) { board.shots[i] = 1; return 'miss'; }
  board.shots[i] = 2; const s = board.ships[id - 1]; s.hits++;
  if (s.hits === s.cells.length) { s.cells.forEach(x => { const r = Math.floor(x / 10), c = x % 10; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const a = r + dr, b = c + dc; if (a >= 0 && a < 10 && b >= 0 && b < 10 && !board.shots[a * 10 + b]) board.shots[a * 10 + b] = 1; } }); return 'sunk'; }
  return 'hit';
}
const bsDead = b => b.ships.every(s => s.hits === s.cells.length);
function bsAI(board) {
  const open = i => !board.shots[i];
  const hits = board.shots.map((s, i) => s === 2 && board.ships[board.g[i] - 1].hits < board.ships[board.g[i] - 1].cells.length ? i : -1).filter(i => i >= 0);
  if (hits.length) {
    let cand = [];
    if (hits.length > 1) { const hor = Math.floor(hits[0] / 10) === Math.floor(hits[1] / 10); const sorted = hits.slice().sort((a, b) => a - b); const step = hor ? 1 : 10;
      const lo = sorted[0] - step, hi = sorted[sorted.length - 1] + step;
      if (lo >= 0 && (!hor || Math.floor(lo / 10) === Math.floor(sorted[0] / 10))) cand.push(lo); if (hi < 100 && (!hor || Math.floor(hi / 10) === Math.floor(sorted[0] / 10))) cand.push(hi); }
    else { const h = hits[0], r = Math.floor(h / 10), c = h % 10; [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([a, b]) => { if (a >= 0 && a < 10 && b >= 0 && b < 10) cand.push(a * 10 + b); }); }
    cand = cand.filter(open); if (cand.length) return cand[Math.floor(Math.random() * cand.length)];
  }
  let pool = []; for (let i = 0; i < 100; i++) if (open(i) && (Math.floor(i / 10) + i % 10) % 2 === 0) pool.push(i);
  if (!pool.length) for (let i = 0; i < 100; i++) if (open(i)) pool.push(i);
  return pool[Math.floor(Math.random() * pool.length)];
}
let BS = null;
function bsGrid(board, { reveal, tap, small } = {}) {
  return `<div class="bs-grid ${small ? 'small' : ''}">${board.g.map((id, i) => { const s = board.shots[i], sunk = id && board.ships[id - 1].hits === board.ships[id - 1].cells.length;
    return `<div class="bs-c ${reveal && id ? 'ship' : ''} ${s === 1 ? 'miss' : ''} ${s === 2 ? (sunk ? 'hit sunk' : 'hit') : ''} ${tap && !s ? 'tap' : ''}" data-i="${i}"></div>`; }).join('')}</div>`;
}
SCREENS.battle = el => {
  if (!BS) return modePick(el, 'Морський бій', m => { BS = { mode: m, phase: 'place', p: 0, b: [bsPlace(), bsPlace()], names: m === 'bot' ? ['Ви', 'Бот'] : [S.players[0]?.n || 'Гравець 1', S.players[1]?.n || 'Гравець 2'], msg: '' }; refreshTop(); },
    [['bot', '🤖 Проти бота'], ['2p', '👥 Удвох на одному телефоні'], ['online', '🌐 Онлайн (скоро)']]);
  if (BS.mode === 'online') { el.innerHTML = `${gameHeader('Морський бій')}<div class="empty"><div class="big">🌐</div><b>Онлайн-режим готуємо</b>Для гри на різних пристроях потрібен сервер. Архітектуру закладено — це наступний крок. Поки грайте з ботом або вдвох.<br><br><button class="btn accent" onclick="BS=null;App.refresh()">Назад</button></div>`; return; }
  const me = BS.p, foe = 1 - me;
  if (BS.phase === 'place') {
    el.innerHTML = `${gameHeader('Розстановка', BS.names[me] + ', розставте флот')}${bsGrid(BS.b[me], { reveal: true })}
    <div class="tm-ctrl"><button class="btn ghost block" id="bshuf">${ic('sync')} Перемішати</button><button class="btn accent block" id="bok">Готово</button></div>`;
    $('#bshuf', el).onclick = () => { BS.b[me] = bsPlace(); haptic(); refreshTop(); };
    $('#bok', el).onclick = () => { BS.b[me].placed = true; if (BS.mode === '2p' && me === 0) { BS.p = 1; BS.phase = 'hand'; } else { BS.p = 0; BS.phase = BS.mode === '2p' ? 'hand' : 'play'; } refreshTop(); };
    return;
  }
  if (BS.phase === 'hand') {
    el.innerHTML = `<div class="handover"><div class="big">🚢</div><div style="font-size:24px;font-weight:800">Передайте телефон</div><div class="muted">Зараз: <b style="color:var(--text)">${esc(BS.names[me])}</b>. Суперник, не дивись!</div><button class="btn accent" id="bgo">Я готовий</button></div>`;
    $('#bgo', el).onclick = () => { BS.phase = BS.b[me].placed ? 'play' : 'place'; refreshTop(); };
    return;
  }
  const left = b => b.ships.filter(s => s.hits < s.cells.length).length;
  el.innerHTML = `${gameHeader('Морський бій', `${BS.names[me]} стріляє`, `<button class="iconbtn" id="bnew">${ic('sync')}</button>`)}
  <div class="gstatus">${BS.over || BS.msg || 'Обирайте клітинку на полі суперника'}<span class="muted" style="margin-left:auto;font-size:12px">кораблів: ${left(BS.b[foe])}</span></div>
  ${bsGrid(BS.b[foe], { tap: !BS.over, reveal: !!BS.over })}
  <div class="muted" style="text-align:center;font-size:12px;margin-top:6px">Ваш флот · ${left(BS.b[me])} кораблів</div>${bsGrid(BS.b[me], { reveal: true, small: true })}`;
  $('#bnew', el).onclick = () => { BS = null; refreshTop(); };
  $$('.bs-grid:not(.small) .bs-c', el).forEach(c => c.onclick = () => {
    if (BS.over || BS.busy) return; const r = bsShoot(BS.b[foe], +c.dataset.i); if (!r) return;
    haptic(r === 'miss' ? 8 : 40); BS.msg = { miss: 'Мимо', hit: 'Влучили! Стріляйте ще', sunk: 'Потопили корабель! 💥' }[r];
    if (bsDead(BS.b[foe])) { BS.over = `${BS.names[me]} переміг! 🏆`; confetti(); return refreshTop(); }
    if (r !== 'miss') return refreshTop();
    if (BS.mode === 'bot') {
      BS.busy = true; refreshTop();
      const botTurn = () => { const i = bsAI(BS.b[0]); const rr = bsShoot(BS.b[0], i); BS.msg = rr === 'miss' ? 'Бот промахнувся. Ваш хід' : rr === 'sunk' ? 'Бот потопив ваш корабель!' : 'Бот влучив…';
        if (bsDead(BS.b[0])) { BS.over = 'Бот переміг 🤖'; BS.busy = false; return refreshTop(); }
        refreshTop(); if (rr !== 'miss') setTimeout(botTurn, 650); else BS.busy = false; };
      setTimeout(botTurn, 700);
    } else { setTimeout(() => { BS.p = foe; BS.phase = 'hand'; BS.msg = ''; refreshTop(); }, 700); refreshTop(); }
  });
};
