/* ============================================================
   Sync — desativado no modo local (sem servidor).
   O app guarda tudo no aparelho (localStorage) via Store; não há
   sincronização entre dispositivos. Este módulo mantém a mesma API
   pública apenas para o restante do app continuar funcionando.
   ============================================================ */
const Sync = (() => {
  const listeners = [];
  return {
    cfg: () => ({}),
    enabled: () => false,
    pull: async () => ({ ok: true, changed: false }),
    push: async () => ({ ok: true }),
    schedulePush: () => {},
    onStatus: (fn) => listeners.push(fn),
  };
})();
