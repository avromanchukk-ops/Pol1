// ================= MINI-GAMES v1.1: єдиний стиль + «Агенти» (у дусі Codenames) =================
Object.assign(App, { openHistory() { push(SCREENS.history); } });

MINI.splice(1, 0, ['agents', '🕵️', 'Агенти', 'Шифри й асоціації командами', '#FF7A2F']);
const MINI_INFO = {
  chess: 'Класичні шахи з рокіровкою, взяттям на проході й перетворенням пішака. Бот грає чорними.',
  checkers: 'Російські шашки: бити обов’язково, дамка ходить на будь-яку відстань.',
  giveaway: 'Шашки навпаки: перемагає той, хто першим віддасть усі свої шашки.',
  battle: 'Флот 10×10: один чотирипалубний, два трипалубні, три двопалубні й чотири однопалубні.',
};
// екран вибору режиму — у стилі застосунку
function modePick(el, title, onPick, opts = [['bot', '🤖 Проти бота'], ['2p', '👥 Удвох на одному']]) {
  const m = MINI.find(x => x[2] === title) || ['', '🎲', title, ''];
  const info = MINI_INFO[m[0]] || m[3];
  el.innerHTML = `${gameHeader(title)}<div class="wrap fade-in">
   <div class="g-hero"><div class="g-emo">${m[1]}</div><div class="h-display" style="font-size:26px;font-weight:800">${esc(title)}</div><p class="muted">${esc(info)}</p></div>
   <div class="g-modes">${opts.map(([v, l], i) => { const [e, ...t] = l.split(' '); return `<button class="g-mode ${i === 0 ? 'pri' : ''}" data-m="${v}"><span class="gm-e">${e}</span><b>${esc(t.join(' '))}</b>${ic('back', 'ico')}</button>`; }).join('')}</div></div>`;
  $$('[data-m]', el).forEach(b => b.onclick = () => { haptic(10); onPick(b.dataset.m); });
}

// ---------- АГЕНТИ ----------
const AG_WORDS = ['яблуко','банк','ключ','лист','міст','кран','коса','замок','лук','мишка','ручка','ніс','поле','рись','серце','стіл','танк','труба','хвіст','шайба','шуба','якір','пояс','орел','олень','пілот','зірка','корона','кіно','голка','гриб','дракон','дельфін','вовк','вогонь','вікно','біржа','бочка','блок','барабан','акула','алмаз','арка','бал','бар','берег','борт','брама','будинок','вежа','вино','вірус','вода','газета','гора','граф','гребінь','диск','діамант','дошка','дух','екран','жаба','жук','завод','зебра','зошит','кабан','камінь','карта','каса','квадрат','кит','клуб','кліщ','кобра','колесо','кольцо','комета','кораль','космос','кріт','кулак','лазер','лампа','лев','лід','лікар','лимон','лінія','літак','магнат','мавпа','маска','матч','мед','метро','мітла','молот','море','мотор','музей','мураха','нитка','ніж','номер','ніч','оркестр','павук','палац','парк','перо','пила','піца','план','пляж','пошта','принц','пульт','пустеля','рак','ракета','рекорд','робот','рожа','сад','сатурн','свиня','сир','скеля','скрипка','слон','сніг','сова','сокира','спорт','стріла','суд','сфінкс','театр','телескоп','тінь','тюльпан','фара','фокус','фронт','хмара','цирк','чарівник','шахта','шифр','шоколад','штора','шпигун','щит','юла','ягода','ярмарок','агент','бомба','вулкан','геній','джин','єдиноріг','жезл','заєць','іграшка','йога','лабіринт','маяк','ніндзя','опера','пірат','радіо','скарб','тигр','уран','фенікс','хокей','чайник','шерлок'];
const AG_ABC = 'АБВГДЕЖЗИКЛМНОПРСТУФХЧШ';
const AG = { phase: 'setup', teams: ['Помаранчеві', 'Блакитні'], code: '', words: [], key: [], rev: [], turn: 'a', clue: null, left: 0, winner: null, mark: [] };
function agDeal(code) {
  const r = rng(hashStr('agents:' + code));
  const pool = AG_WORDS.slice(); for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const start = r() < .5 ? 'a' : 'b', other = start === 'a' ? 'b' : 'a';
  const key = [...Array(9).fill(start), ...Array(8).fill(other), ...Array(7).fill('n'), 'x'];
  for (let i = key.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [key[i], key[j]] = [key[j], key[i]]; }
  return { words: pool.slice(0, 25), key, start };
}
function agNew(code) {
  const d = agDeal(code); Object.assign(AG, { code, words: d.words, key: d.key, rev: Array(25).fill(false), mark: Array(25).fill(false), turn: d.start, clue: null, left: 0, winner: null });
}
const agLeft = t => AG.key.filter((k, i) => k === t && !AG.rev[i]).length;
const agName = t => AG.teams[t === 'a' ? 0 : 1];
function agKeyGrid(cls = '') { return `<div class="ag-key ${cls}">${AG.words.map((w, i) => `<div class="k-${AG.key[i]} ${AG.rev[i] || AG.mark[i] ? 'done' : ''}" data-i="${i}"><span>${esc(w)}</span></div>`).join('')}</div>`; }
SCREENS.agents = el => {
  if (AG.phase === 'setup') {
    el.innerHTML = `${gameHeader('Агенти')}<div class="wrap fade-in">
     <div class="g-hero"><div class="g-emo">🕵️</div><div class="h-display" style="font-size:26px;font-weight:800">Агенти</div><p class="muted">Дві команди, 25 слів. Капітан бачить, які слова належать його агентам, і дає підказку одним словом і числом. Команда відгадує — головне не натрапити на вбивцю 💀</p></div>
     <div class="fld"><label>Команди</label><div class="fld-row"><input class="inp ag-a" id="ta" value="${esc(AG.teams[0])}"><input class="inp ag-b" id="tb" value="${esc(AG.teams[1])}"></div></div>
     <div class="g-modes">
      <button class="g-mode pri" id="agnew"><span class="gm-e">🎲</span><b>Нова гра</b>${ic('back', 'ico')}</button>
      <button class="g-mode" id="agcap"><span class="gm-e">👁</span><b>Я капітан — ввести код гри</b>${ic('back', 'ico')}</button>
     </div>
     <p class="muted" style="font-size:12.5px;margin-top:14px">Капітани можуть дивитися карту на своєму телефоні: введіть там код, який показано вгорі гри.</p></div>`;
    const sv = () => { AG.teams = [$('#ta', el).value.trim() || 'Помаранчеві', $('#tb', el).value.trim() || 'Блакитні']; };
    $('#agnew', el).onclick = () => { sv(); agNew(Array.from({ length: 4 }, () => AG_ABC[Math.floor(Math.random() * AG_ABC.length)]).join('')); AG.phase = 'play'; haptic(); refreshTop(); };
    $('#agcap', el).onclick = () => {
      const sh = openSheet({ title: 'Код гри', body: `<input class="inp" id="agc" maxlength="4" placeholder="Напр. КЛМН" style="text-transform:uppercase;font-size:22px;letter-spacing:.3em;text-align:center;height:58px">`, foot: `<button class="btn accent block" id="agok">Відкрити карту капітана</button>`, onMount: s => setTimeout(() => $('#agc', s).focus(), 300) });
      $('#agok', sh.el).onclick = () => { const c = $('#agc', sh.el).value.trim().toUpperCase(); if (c.length !== 4) return toast('Код має 4 літери'); sv(); agNew(c); AG.phase = 'captain'; sh.close(); refreshTop(); };
    };
    return;
  }
  if (AG.phase === 'captain') {
    el.innerHTML = `${gameHeader('Карта капітана', 'Код ' + AG.code + ' · не показуйте команді')}
     <div class="ag-first">Першими ходять: <b class="t-${agDealStart()}">${esc(agName(agDealStart()))}</b></div>
     ${agKeyGrid('big')}
     <p class="muted" style="text-align:center;font-size:12.5px;margin:10px 18px">Торкніться слова, яке вже відгадали, — воно потьмяніє.</p>
     <div class="tm-ctrl"><button class="btn ghost block" id="agx">Вийти</button></div>`;
    $$('.ag-key [data-i]', el).forEach(c => c.onclick = () => { const i = +c.dataset.i; AG.mark[i] = !AG.mark[i]; haptic(6); c.classList.toggle('done', AG.mark[i]); });
    $('#agx', el).onclick = () => { AG.phase = 'setup'; refreshTop(); };
    return;
  }
  const la = agLeft('a'), lb = agLeft('b');
  el.innerHTML = `${gameHeader('Агенти', '', `<button class="iconbtn" id="agre">${ic('sync')}</button>`)}
   <div class="ag-top"><div class="ag-sc t-a ${AG.turn === 'a' ? 'on' : ''}"><b>${la}</b><span>${esc(AG.teams[0])}</span></div><div class="ag-code">код<b>${AG.code}</b></div><div class="ag-sc t-b ${AG.turn === 'b' ? 'on' : ''}"><b>${lb}</b><span>${esc(AG.teams[1])}</span></div></div>
   <div class="gstatus ag-st t-${AG.turn}">${AG.winner ? `🏆 Перемогли «${esc(agName(AG.winner))}»` : `<span class="turn"></span>Хід: ${esc(agName(AG.turn))}${AG.clue ? ` · <b>«${esc(AG.clue.w)}» ${AG.clue.n}</b> · ще ${AG.left}` : ' · чекаємо підказку'}`}</div>
   <div class="ag-grid">${AG.words.map((w, i) => `<button class="ag-c ${AG.rev[i] || AG.winner ? 'r k-' + AG.key[i] : ''} ${AG.winner && !AG.rev[i] ? 'ghost' : ''}" data-i="${i}"><span>${esc(w)}</span></button>`).join('')}</div>
   <div class="tm-ctrl">${AG.winner ? `<button class="btn accent block" id="agagain">Ще раз</button>` : `<button class="btn ghost" id="agkey">👁</button><button class="btn ghost block" id="agclue">${AG.clue ? 'Інша підказка' : 'Підказка'}</button><button class="btn accent block" id="agend">Завершити хід</button>`}</div>`;
  const swap = () => { AG.turn = AG.turn === 'a' ? 'b' : 'a'; AG.clue = null; AG.left = 0; };
  $$('.ag-c', el).forEach(c => c.onclick = () => {
    const i = +c.dataset.i; if (AG.rev[i] || AG.winner) return;
    const k = AG.key[i]; AG.rev[i] = true;
    if (k === 'x') { AG.winner = AG.turn === 'a' ? 'b' : 'a'; haptic(400); toast('💀 Вбивця! Гру закінчено'); }
    else if (k === AG.turn) { haptic(20); if (AG.clue) { AG.left--; if (AG.left <= 0) { toast('Спроби скінчились — хід переходить'); swap(); } } }
    else { haptic(60); toast(k === 'n' ? 'Мирний житель — хід переходить' : 'Це агент суперника!'); swap(); }
    if (!AG.winner) { if (!agLeft('a')) AG.winner = 'a'; else if (!agLeft('b')) AG.winner = 'b'; }
    if (AG.winner) setTimeout(confetti, 300);
    refreshTop();
  });
  $('#agre', el).onclick = () => confirmSheet('Почати нову гру?', 'Нова гра', () => { AG.phase = 'setup'; refreshTop(); }, false);
  const again = $('#agagain', el); if (again) again.onclick = () => { agNew(Array.from({ length: 4 }, () => AG_ABC[Math.floor(Math.random() * AG_ABC.length)]).join('')); refreshTop(); };
  const end = $('#agend', el); if (end) end.onclick = () => { swap(); haptic(); refreshTop(); };
  const key = $('#agkey', el); if (key) key.onclick = () => confirmSheet('Карту бачать лише капітани. Команда — відверніться!', 'Показати карту', () => {
    const sh = openSheet({ title: 'Карта капітана', body: `<div class="ag-first" style="margin:0 0 12px">Код для телефону капітана: <b>${AG.code}</b></div>${agKeyGrid()}` });
  }, false);
  const clue = $('#agclue', el); if (clue) clue.onclick = () => {
    const sh = openSheet({ title: 'Підказка капітана', body: `<div class="fld"><label>Слово</label><input class="inp" id="cw" placeholder="Одне слово"></div><div class="fld"><label>Скільки слів</label><div class="chips wrapc">${[1, 2, 3, 4, 5].map(n => `<button class="chip ${n === 2 ? 'on' : ''}" data-n="${n}">${n}</button>`).join('')}</div></div>`, foot: `<button class="btn accent block" id="cok">Дати підказку</button>`, onMount: s => setTimeout(() => $('#cw', s).focus(), 300) });
    let n = 2; $$('[data-n]', sh.el).forEach(b => b.onclick = () => { n = +b.dataset.n; $$('[data-n]', sh.el).forEach(x => x.classList.toggle('on', x === b)); });
    $('#cok', sh.el).onclick = () => { const w = $('#cw', sh.el).value.trim(); if (!w) return toast('Введіть слово'); if (/\s/.test(w)) return toast('Лише одне слово'); AG.clue = { w, n }; AG.left = n + 1; sh.close(); refreshTop(); };
  };
};
function agDealStart() { return agDeal(AG.code).start; }
