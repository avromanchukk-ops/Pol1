// ================= v1.4: переклад описів BGG українською (вибір УКР / EN) =================
const TR = { cache: {}, busy: {} };
try { TR.cache = JSON.parse(localStorage.getItem('polytsia.tr') || '{}'); } catch (e) {}
const trKey = t => 'k' + hashStr(t) + '_' + t.length;
const trSave = () => { try { localStorage.setItem('polytsia.tr', JSON.stringify(TR.cache)); } catch (e) {} };
const isLatin = t => { const l = (t.match(/[A-Za-z]/g) || []).length, c = (t.match(/[А-Яа-яЇїІіЄєҐґ]/g) || []).length; return l > 20 && l > c * 2; };
const descLang = () => (S.settings.descLang || 'uk');

// Ділимо текст на шматки ≤1500 символів по реченнях
function trChunks(t) {
  const parts = t.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) || [t], out = []; let cur = '';
  parts.forEach(p => { if ((cur + p).length > 1500 && cur) { out.push(cur); cur = ''; } cur += p; });
  if (cur) out.push(cur);
  return out;
}
async function trGoogle(chunk) {
  const raw = await netGet('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=uk&dt=t&q=' + encodeURIComponent(chunk));
  const j = JSON.parse(raw); const s = (j[0] || []).map(x => x[0]).join('');
  if (!s) throw new Error('empty'); return s;
}
async function trMyMemory(chunk) {
  const raw = await netGet('https://api.mymemory.translated.net/get?langpair=en|uk&q=' + encodeURIComponent(chunk.slice(0, 480)));
  const s = JSON.parse(raw)?.responseData?.translatedText; if (!s) throw new Error('empty'); return s;
}
async function translateUk(text) {
  const k = trKey(text); if (TR.cache[k]) return TR.cache[k];
  if (TR.busy[k]) return TR.busy[k];
  TR.busy[k] = (async () => {
    const out = [];
    for (const ch of trChunks(text)) { try { out.push(await trGoogle(ch)); } catch (e) { out.push(await trMyMemory(ch)); } }
    const r = out.join(' ').replace(/\s+/g, ' ').trim();
    TR.cache[k] = r; trSave(); return r;
  })();
  try { return await TR.busy[k]; } finally { delete TR.busy[k]; }
}
App.setDescLang = (v, id) => {
  S.settings.descLang = v; save();
  haptic(8); if (id) fillDesc($('#ddesc'), id); else refreshTop();
};
function fillDesc(box, id) {
  if (!box) return;
  const g = G(id), d = (g.d || '').trim(); if (!d || !isLatin(d)) return;
  const lang = descLang(), p = $('p', box);
  $$('.dl-seg button', box).forEach(b => b.classList.toggle('on', b.dataset.l === lang));
  if (lang === 'en') { p.textContent = d; box.classList.remove('tr-wait'); return; }
  const k = trKey(d);
  if (TR.cache[k]) { p.textContent = TR.cache[k]; box.classList.remove('tr-wait'); return; }
  box.classList.add('tr-wait'); p.textContent = d;
  translateUk(d).then(t => { if (box.isConnected && descLang() === 'uk') { p.textContent = t; box.classList.remove('tr-wait'); } })
    .catch(() => { box.classList.remove('tr-wait'); if (box.isConnected) toast('Не вдалося перекласти — показуємо оригінал'); });
}
const _detV13 = SCREENS.detail;
SCREENS.detail = (el, id) => {
  _detV13(el, id);
  const box = $('#ddesc', el), g = G(id), d = (g.d || '').trim();
  if (!box || !d || !isLatin(d)) return;
  $('.dd-act', box).insertAdjacentHTML('beforeend', `<div class="dl-seg"><button data-l="uk" onclick="App.setDescLang('uk',${id})">УКР</button><button data-l="en" onclick="App.setDescLang('en',${id})">EN</button></div>`);
  box.insertAdjacentHTML('afterbegin', `<div class="tr-note">${ic('sync')} Перекладаємо…</div>`);
  fillDesc(box, id);
};
const _setV13 = SCREENS.settings;
SCREENS.settings = el => {
  _setV13(el);
  const first = $('.wrap .card', el);
  first && first.insertAdjacentHTML('afterend', `<div class="card" style="margin-top:12px"><h3>Мова описів ігор</h3>
   <p class="muted" style="font-size:13px;margin-bottom:12px">Описи з BGG — англійською. Можна автоматично перекладати їх українською; переклад зберігається на телефоні.</p>
   <div class="dl-big">${[['uk', 'Українська', 'автопереклад'], ['en', 'English', 'оригінал BGG']].map(([v, t, s]) => `<button class="${descLang() === v ? 'on' : ''}" onclick="App.setDescLang('${v}')"><b>${t}</b><span>${s}</span></button>`).join('')}</div></div>`);
};
const _moreV13 = SCREENS.more;
SCREENS.more = el => { _moreV13(el); const f = $$('.empty', el).pop(); if (f) f.textContent = f.textContent.replace('Полиця 1.3', 'Полиця 1.4'); };
