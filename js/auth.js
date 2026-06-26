/* ============================================================
   Auth — login e cadastro 100% locais (sem servidor).
   Os usuários ficam salvos no próprio aparelho (localStorage):
     patrimo.users   -> { email: { salt, hash, birthdate, createdAt } }
     patrimo.auth    -> sessão atual { token, email }
   A senha é guardada como hash SHA-256 com salt (não em texto puro).
   Limitação honesta: é um login local — os dados moram neste
   aparelho/navegador e não sincronizam entre dispositivos.
   ============================================================ */
const Auth = (() => {
  const SESSION = 'patrimo.auth';
  const USERS = 'patrimo.users';

  const readUsers = () => { try { return JSON.parse(localStorage.getItem(USERS)) || {}; } catch (e) { return {}; } };
  const writeUsers = (u) => localStorage.setItem(USERS, JSON.stringify(u));
  const session = () => { try { return JSON.parse(localStorage.getItem(SESSION)) || null; } catch (e) { return null; } };
  const setSession = (s) => { if (s) localStorage.setItem(SESSION, JSON.stringify(s)); else localStorage.removeItem(SESSION); };

  // mantidos por compatibilidade com o restante do app (sem servidor)
  const base = () => '';
  const authHeaders = () => ({});
  const token = () => { const s = session(); return s && s.token; };
  const email = () => { const s = session(); return s && s.email; };
  const isAuthed = () => !!token();

  const randHex = (n) => {
    const a = new Uint8Array(n);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (let i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256);
    return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  async function hash(password, salt) {
    const input = salt + ':' + password;
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    // fallback simples (contextos sem WebCrypto, ex.: file://)
    let h = 5381;
    for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
    return 'f' + (h >>> 0).toString(16);
  }

  async function register({ email: em, password, confirm, birthdate }) {
    em = (em || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return { ok: false, error: 'E-mail inválido' };
    if ((password || '').length < 6) return { ok: false, error: 'A senha deve ter ao menos 6 caracteres' };
    if (password !== confirm) return { ok: false, error: 'As senhas não conferem' };
    if (!birthdate) return { ok: false, error: 'Informe a data de nascimento' };
    const users = readUsers();
    if (users[em]) return { ok: false, error: 'E-mail já cadastrado neste aparelho' };
    const salt = randHex(8);
    users[em] = { salt, hash: await hash(password, salt), birthdate, createdAt: Date.now() };
    writeUsers(users);
    setSession({ token: randHex(16), email: em });
    return { ok: true };
  }

  async function login({ email: em, password }) {
    em = (em || '').trim().toLowerCase();
    if (!em || !password) return { ok: false, error: 'Preencha e-mail e senha' };
    const u = readUsers()[em];
    if (!u || (await hash(password, u.salt)) !== u.hash) return { ok: false, error: 'E-mail ou senha incorretos' };
    setSession({ token: randHex(16), email: em });
    return { ok: true };
  }

  function logout() { setSession(null); }

  return { register, login, logout, token, email, isAuthed, authHeaders, base };
})();
