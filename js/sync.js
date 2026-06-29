/* ============================================================
   Sync — sincronização do estado com a nuvem (Supabase).
   Cada usuário tem uma linha na tabela `app_state` (user_id, data,
   updated_at). Resolução de conflito: "quem salvou por último vence"
   comparando updated_at (ms). localStorage continua sendo o cache
   offline; a nuvem é a fonte entre dispositivos.
   ============================================================ */
const Sync = (() => {
  const TABLE = 'app_state';
  const listeners = [];
  let pushTimer = null;
  let pushing = false;

  const enabled = () => !!(SB && Auth.isAuthed());
  const notify = (s) => listeners.forEach((fn) => { try { fn(s); } catch (e) {} });

  async function pull() {
    if (!enabled()) return { ok: false, changed: false };
    const uid = Auth.userId();
    const { data, error } = await SB.from(TABLE)
      .select('data, updated_at').eq('user_id', uid).maybeSingle();
    if (error) { notify('error'); return { ok: false, changed: false }; }
    if (!data) return { ok: true, changed: false }; // sem dados na nuvem ainda
    const remoteAt = Number(data.updated_at) || 0;
    if (remoteAt > Store.getUpdatedAt() && data.data) {
      Store.replaceState(data.data, { keepUpdatedAt: true });
      notify('synced');
      return { ok: true, changed: true };
    }
    return { ok: true, changed: false };
  }

  async function push() {
    if (!enabled() || pushing) return { ok: false };
    pushing = true;
    notify('saving');
    const uid = Auth.userId();
    const state = Store.get();
    const updated_at = Store.getUpdatedAt() || Date.now();
    const { error } = await SB.from(TABLE)
      .upsert({ user_id: uid, data: state, updated_at }, { onConflict: 'user_id' });
    pushing = false;
    if (error) { notify('error'); return { ok: false }; }
    notify('synced');
    return { ok: true };
  }

  function schedulePush() {
    if (!enabled()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, 1200);
  }

  return {
    cfg: () => ({ url: SUPA && SUPA.url }),
    enabled, pull, push, schedulePush,
    onStatus: (fn) => listeners.push(fn),
  };
})();
