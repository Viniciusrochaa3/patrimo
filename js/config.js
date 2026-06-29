/* ============================================================
   Config — Supabase (backend na nuvem)
   A URL e a chave "publishable" são públicas e podem ficar no
   front-end; a segurança real vem das políticas RLS no banco.
   ============================================================ */
const SUPA = {
  url: 'https://driwkuijchngjpspelou.supabase.co',
  key: 'sb_publishable_F0BwnfcnKP_W0smNAliWxw_CC9tL1qs',
};

// cliente único usado por Auth e Sync
const SB = (window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(SUPA.url, SUPA.key, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'patrimo.sb' },
    })
  : null;
