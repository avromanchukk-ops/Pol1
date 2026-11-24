// ================= APP =================
const App = {
  tab: goTab, back, refresh: refreshTop, closeSheets() { while (sheets.length) sheets[0].close(); },
  openGame(id) { haptic(8); push(SCREENS.detail, +id); },
  openLibrary(opts = {}) { Object.assign(LF, { tab: 'owned' }, opts); goTab('library'); },
  libTab(v) { LF.tab = v; haptic(6); refreshTop(); }, libSort(v) { LF.sort = v; haptic(6); refreshTop(); },
  toggleView() { LF.view = LF.view === 'grid' ? 'list' : 'grid'; refreshTop(); },
  filters: filtersSheet, bggSearch: () => bggSearch(), pickLabels, logPlay,
  openStats(v) { if (v) SF.view = v; goTab('stats'); },
  openNews() { push(SCREENS.news); }, openTimer() { push(SCREENS.timer); },
  openMiniGames() { push(SCREENS.minigames); }, openMini(k) { push(SCREENS[k]); },
  openLabels() { push(SCREENS.labels); }, openPlayers() { push(SCREENS.players); }, openSettings() { push(SCREENS.settings); },
  exportData, importData, url: openUrl,
  shareGame(id) { const g = G(id); shareText(`🎲 ${g.n} (${g.y || ''}) — ★${g.r || '—'} на BGG, ${g.p[0]}–${g.p[1]} гравців, ${g.t[0]} хв.\nhttps://boardgamegeek.com/boardgame/${id}`); },
};
window.App = App;

function init() {
  loadState();
  const tabs = [['home', 'home', 'Головна'], ['library', 'shelf', 'Полиця'], ['match', 'cards', 'Матч'], ['stats', 'chart', 'Партії'], ['more', 'more', 'Ще']];
  $('#tabbar').innerHTML = tabs.map(([k, i, l]) => `<button data-tab="${k}" class="${k === 'match' ? 'tab-match' : ''}">${ic(i)}<span>${l}</span></button>`).join('');
  $$('#tabbar button').forEach(b => b.onclick = () => { if (Nav.tab === b.dataset.tab && !Nav.stack.length) { const sc = Nav.base?.el; sc && sc.scrollTo({ top: 0, behavior: 'smooth' }); return; } goTab(b.dataset.tab); });
  goTab('home');
  setTimeout(() => $('#splash').classList.add('out'), 1700);
  setTimeout(() => $('#splash')?.remove(), 2500);
  if (HAS_NATIVE && Date.now() - (S.news.at || 0) > 6 * 36e5 && allIds().some(id => S.games[id]?.follow)) setTimeout(() => refreshNews().catch(() => {}), 4000);
}
document.addEventListener('DOMContentLoaded', init);
