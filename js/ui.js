/* ============================================================
   UI helpers — formatação, ícones, toast, bottom-sheets
   ============================================================ */
const UI = (() => {
  const brl = (n) => (n < 0 ? '-' : '') + 'R$ ' + Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const brlShort = (n) => {
    const a = Math.abs(n);
    if (a >= 1e6) return 'R$ ' + (n / 1e6).toFixed(1).replace('.', ',') + 'M';
    if (a >= 1e3) return 'R$ ' + (n / 1e3).toFixed(1).replace('.', ',') + 'k';
    return 'R$ ' + n.toFixed(0);
  };
  const pct = (n) => (n >= 0 ? '+' : '') + n.toFixed(2).replace('.', ',') + '%';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const PALETTE = ['#ff6a00', '#ff8a2b', '#5b9dff', '#34d29a', '#a78bff', '#ffd166', '#ff5a6e', '#2dd4bf'];

  // ícone por categoria (svg paths simples)
  const ICONS = {
    Moradia: 'M3 11l9-8 9 8v9a2 2 0 01-2 2h-4v-6H9v6H5a2 2 0 01-2-2z',
    Internet: 'M12 18a2 2 0 110 4 2 2 0 010-4zM5 13a10 10 0 0114 0l-2 2a7 7 0 00-10 0zM1.5 9.5a15 15 0 0121 0l-2 2a12 12 0 00-17 0z',
    Energia: 'M13 2L4 14h6l-1 8 9-12h-6z',
    'Água': 'M12 2s7 8 7 13a7 7 0 11-14 0c0-5 7-13 7-13z',
    Mercado: 'M7 4h-2l-1 2H2v2h2l3 9h11l3-7H8',
    'Combustível': 'M5 3h8v18H5zM15 7l3 3v8a2 2 0 11-4 0M13 9h3',
    Lazer: 'M12 2a10 10 0 100 20 10 10 0 000-20zm-3 7a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm6 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM8 14h8a4 4 0 01-8 0z',
    'Saúde': 'M12 21s-7-4.35-9.5-8.5C.5 9 2.5 5 6 5c2 0 3 1 4 2 1-1 2-2 4-2 3.5 0 5.5 4 3.5 7.5C19 16.65 12 21 12 21z',
    Impostos: 'M4 3h16v4H4zM6 9h12v12H6zm3 3v6m6-6v6',
    Assinaturas: 'M4 4h16v12H4zM2 20h20',
    'Salário': 'M12 1v22M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6',
    Extra: 'M12 2l3 7h7l-5.5 4 2 7L12 17l-6.5 4 2-7L2 9h7z',
    Investimentos: 'M4 19h16M6 14l4-4 3 3 5-6',
    Outros: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 5v6m0 4h.01',
  };
  const iconPath = (cat) => ICONS[cat] || ICONS.Outros;

  const toast = (msg) => {
    const root = document.getElementById('toast-root');
    root.innerHTML = `<div class="toast">${esc(msg)}</div>`;
    setTimeout(() => { root.innerHTML = ''; }, 2600);
  };

  // bottom sheet genérico
  function openSheet(html) {
    const root = document.getElementById('sheet-root');
    root.innerHTML = `<div class="sheet-overlay"><div class="sheet"><div class="sheet-grab"></div>${html}</div></div>`;
    const ov = root.querySelector('.sheet-overlay');
    ov.addEventListener('click', (e) => { if (e.target === ov) closeSheet(); });
    return root.querySelector('.sheet');
  }
  function closeSheet() { document.getElementById('sheet-root').innerHTML = ''; }

  function confirmDelete(label, onYes) {
    openSheet(`
      <h2>Remover?</h2>
      <p class="sheet-sub">Tem certeza que deseja remover "${esc(label)}"? Esta ação não pode ser desfeita.</p>
      <div class="btn-row">
        <button class="btn btn-ghost" data-x>Cancelar</button>
        <button class="btn btn-danger" data-y>Remover</button>
      </div>`);
    const s = document.querySelector('.sheet');
    s.querySelector('[data-x]').onclick = closeSheet;
    s.querySelector('[data-y]').onclick = () => { onYes(); closeSheet(); };
  }

  return { brl, brlShort, pct, esc, PALETTE, iconPath, toast, openSheet, closeSheet, confirmDelete };
})();
