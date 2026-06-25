/* ============================================================
   Reminders — lembretes locais de vencimento de despesas fixas.
   Usa a Notification API (dispara quando o app é aberto). Sem backend,
   não há push com o app fechado — isso exigiria servidor de push (VAPID).
   ============================================================ */
const Reminders = (() => {
  const FLAG = 'patrimo.reminders';
  const LASTKEY = 'patrimo.reminders.lastDay';

  const supported = () => 'Notification' in window;
  const enabled = () => localStorage.getItem(FLAG) === '1';
  const todayStr = () => new Date().toISOString().slice(0, 10);

  function enable() {
    if (!supported()) return UI.toast('Notificações não suportadas neste navegador');
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') {
        localStorage.setItem(FLAG, '1');
        UI.toast('Lembretes ativados');
        fire(true);
      } else {
        UI.toast('Permissão de notificação negada');
      }
    }).catch(() => UI.toast('Não foi possível ativar lembretes'));
  }

  function disable() { localStorage.removeItem(FLAG); UI.toast('Lembretes desativados'); }

  // mostra uma notificação se houver contas a vencer (no máx. 1x por dia)
  function fire(force) {
    if (!supported() || Notification.permission !== 'granted') return;
    const due = Store.dueFixed();
    if (!due.length) return;
    if (!force && localStorage.getItem(LASTKEY) === todayStr()) return;
    const total = due.reduce((a, f) => a + f.amount, 0);
    const body = due.slice(0, 4).map((f) => `${f.desc} (dia ${f.dueDay}) — ${UI.brl(f.amount)}`).join('\n');
    try {
      new Notification('Patrimo — Contas a vencer', {
        body: `${due.length} conta(s) · ${UI.brl(total)}\n${body}`,
        icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'patrimo-due',
      });
      localStorage.setItem(LASTKEY, todayStr());
    } catch (e) { /* iOS Safari pode bloquear fora de PWA instalada */ }
  }

  // chamado ao abrir o dashboard
  function maybeNotify() { if (enabled()) fire(false); }

  return { enable, disable, enabled, supported, maybeNotify, fire };
})();
