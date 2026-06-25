/* ============================================================
   Sync — sincronização com o backend (last-write-wins por timestamp).
   Autenticação por login: usa o token do módulo Auth e a mesma origem
   de onde o app foi servido (sem configurar URL/chave manualmente).
   - pull(): baixa do servidor; adota se o remoto for mais novo.
   - push(): envia o estado atual (debounced após cada alteração).
   ============================================================ */
const Sync = (() => {
  const CFG = 'patrimo.sync';
  let pushTimer = null;
  const listeners = [];

  const cfg = () => {
    try { return JSON.parse(localStorage.getItem(CFG)) || {}; } catch (e) { return {}; }
  };
  const setCfg = (c) => localStorage.setItem(CFG, JSON.stringify(c));
  const enabled = () => typeof Auth !== 'undefined' && Auth.isAuthed();
  const onStatus = (fn) => listeners.push(fn);
  const emit = (s) => listeners.forEach((fn) => fn(s));

  const endpoint = () => `${Auth.base()}/api/data`;

  async function pull() {
    if (!enabled()) return { ok: false, error: 'Faça login para sincronizar' };
    emit('syncing');
    try {
      const res = await fetch(endpoint(), { method: 'GET', headers: Auth.authHeaders() });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const rec = await res.json();
      if (rec && rec.data && rec.updatedAt > Store.getUpdatedAt()) {
        Store.importData({ data: rec.data, updatedAt: rec.updatedAt }, { keepUpdatedAt: true });
        emit('pulled');
        return { ok: true, changed: true };
      }
      emit('idle');
      return { ok: true, changed: false };
    } catch (e) {
      emit('error');
      return { ok: false, error: 'Falha ao baixar: ' + e.message };
    }
  }

  async function push() {
    if (!enabled()) return { ok: false, error: 'Faça login para sincronizar' };
    emit('syncing');
    try {
      const body = JSON.stringify({ updatedAt: Store.getUpdatedAt(), data: JSON.parse(Store.exportData()).data });
      const res = await fetch(endpoint(), {
        method: 'PUT',
        headers: Object.assign({ 'Content-Type': 'application/json' }, Auth.authHeaders()),
        body,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      emit('synced');
      const c = cfg(); c.lastSync = Date.now(); setCfg(c);
      return { ok: true };
    } catch (e) {
      emit('error');
      return { ok: false, error: 'Falha ao enviar: ' + e.message };
    }
  }

  // chamado pelo Store.subscribe — envia alterações com debounce
  function schedulePush() {
    if (!enabled()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => push(), 1500);
  }

  return { cfg, enabled, pull, push, schedulePush, onStatus };
})();
