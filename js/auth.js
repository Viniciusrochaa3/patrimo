/* ============================================================
   Auth — login e cadastro por e-mail/senha contra o backend.
   Guarda { token, email } em localStorage. A API fica no mesmo
   endereço de onde o app foi servido (mesma origem).
   Limitações honestas: o token mora no aparelho; sem verificação
   de e-mail nem recuperação de senha; HTTP simples (use HTTPS/rede
   confiável para tráfego real).
   ============================================================ */
const Auth = (() => {
  const STORE = 'patrimo.auth';

  const session = () => {
    try { return JSON.parse(localStorage.getItem(STORE)) || null; } catch (e) { return null; }
  };
  const setSession = (s) => { if (s) localStorage.setItem(STORE, JSON.stringify(s)); else localStorage.removeItem(STORE); };

  const base = () => (location.origin && location.origin !== 'null') ? location.origin : '';
  const token = () => { const s = session(); return s && s.token; };
  const email = () => { const s = session(); return s && s.email; };
  const isAuthed = () => !!token();
  const authHeaders = () => { const t = token(); return t ? { Authorization: 'Bearer ' + t } : {}; };

  async function post(path, body) {
    const res = await fetch(base() + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    let json = {};
    try { json = await res.json(); } catch (e) { /* ignore */ }
    return { ok: res.ok, status: res.status, json };
  }

  async function register({ email: em, password, confirm, birthdate }) {
    em = (em || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return { ok: false, error: 'E-mail inválido' };
    if ((password || '').length < 6) return { ok: false, error: 'A senha deve ter ao menos 6 caracteres' };
    if (password !== confirm) return { ok: false, error: 'As senhas não conferem' };
    if (!birthdate) return { ok: false, error: 'Informe a data de nascimento' };
    try {
      const r = await post('/api/register', { email: em, password, birthdate });
      if (!r.ok) return { ok: false, error: (r.json && r.json.error) || 'Falha no cadastro' };
      setSession({ token: r.json.token, email: r.json.email });
      return { ok: true };
    } catch (e) { return { ok: false, error: 'Servidor indisponível. Verifique se o backend está rodando.' }; }
  }

  async function login({ email: em, password }) {
    em = (em || '').trim().toLowerCase();
    if (!em || !password) return { ok: false, error: 'Preencha e-mail e senha' };
    try {
      const r = await post('/api/login', { email: em, password });
      if (!r.ok) return { ok: false, error: (r.json && r.json.error) || 'Falha no login' };
      setSession({ token: r.json.token, email: r.json.email });
      return { ok: true };
    } catch (e) { return { ok: false, error: 'Servidor indisponível. Verifique se o backend está rodando.' }; }
  }

  function logout() { setSession(null); }

  return { register, login, logout, token, email, isAuthed, authHeaders, base };
})();
