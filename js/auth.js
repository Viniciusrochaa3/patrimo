/* ============================================================
   Auth — login e cadastro na nuvem (Supabase Auth).
   A conta é real e funciona em qualquer aparelho. A sessão é
   guardada pelo próprio cliente Supabase (localStorage) e
   restaurada no boot. Mantém a mesma API pública do app.
   ============================================================ */
const Auth = (() => {
  let _session = null;
  let _recovery = SUPA_RECOVERY === true; // chegou pelo link de redefinição?
  let _onRecovery = null;

  // traduz erros comuns do Supabase para PT-BR
  function mapErr(error) {
    const m = (error && error.message || '').toLowerCase();
    if (m.includes('invalid login')) return 'E-mail ou senha incorretos';
    if (m.includes('already registered') || m.includes('already been registered')) return 'E-mail já cadastrado';
    if (m.includes('password')) return 'A senha deve ter ao menos 6 caracteres';
    if (m.includes('email') && m.includes('valid')) return 'E-mail inválido';
    if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde um instante.';
    return (error && error.message) || 'Falha na operação';
  }

  // restaura a sessão salva e escuta mudanças (boot)
  async function restore() {
    if (!SB) return null;
    // registra o listener ANTES de getSession para não perder o evento de recovery
    SB.auth.onAuthStateChange((event, s) => {
      _session = s;
      if (event === 'PASSWORD_RECOVERY') { _recovery = true; if (_onRecovery) _onRecovery(); }
    });
    try {
      const { data } = await SB.auth.getSession();
      _session = data.session || null;
    } catch (e) { _session = null; }
    return _session;
  }

  const isRecovery = () => _recovery;
  const onRecovery = (fn) => { _onRecovery = fn; };

  // envia e-mail com link para redefinir a senha
  async function resetPassword(em) {
    if (!SB) return { ok: false, error: 'Backend indisponível' };
    em = (em || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return { ok: false, error: 'Informe um e-mail válido' };
    const { error } = await SB.auth.resetPasswordForEmail(em, { redirectTo: window.location.origin });
    if (error) return { ok: false, error: mapErr(error) };
    return { ok: true };
  }

  // define a nova senha (usado após chegar pelo link de recovery)
  async function updatePassword(newPass) {
    if (!SB) return { ok: false, error: 'Backend indisponível' };
    if ((newPass || '').length < 6) return { ok: false, error: 'A senha deve ter ao menos 6 caracteres' };
    const { error } = await SB.auth.updateUser({ password: newPass });
    if (error) return { ok: false, error: mapErr(error) };
    _recovery = false;
    return { ok: true };
  }

  const isAuthed = () => !!_session;
  const email = () => (_session && _session.user && _session.user.email) || null;
  const userId = () => (_session && _session.user && _session.user.id) || null;
  const token = () => (_session && _session.access_token) || null;
  // mantidos por compatibilidade com o restante do app
  const authHeaders = () => (token() ? { Authorization: 'Bearer ' + token() } : {});
  const base = () => SUPA.url;

  async function register({ email: em, password, confirm, birthdate }) {
    if (!SB) return { ok: false, error: 'Backend indisponível' };
    em = (em || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return { ok: false, error: 'E-mail inválido' };
    if ((password || '').length < 6) return { ok: false, error: 'A senha deve ter ao menos 6 caracteres' };
    if (password !== confirm) return { ok: false, error: 'As senhas não conferem' };
    if (!birthdate) return { ok: false, error: 'Informe a data de nascimento' };
    const { data, error } = await SB.auth.signUp({ email: em, password, options: { data: { birthdate } } });
    if (error) return { ok: false, error: mapErr(error) };
    _session = data.session || null;
    // se a confirmação de e-mail estiver ligada, não vem sessão ainda
    if (!_session) return { ok: true, needsConfirm: true };
    return { ok: true };
  }

  async function login({ email: em, password }) {
    if (!SB) return { ok: false, error: 'Backend indisponível' };
    em = (em || '').trim().toLowerCase();
    if (!em || !password) return { ok: false, error: 'Preencha e-mail e senha' };
    const { data, error } = await SB.auth.signInWithPassword({ email: em, password });
    if (error) return { ok: false, error: mapErr(error) };
    _session = data.session || null;
    return { ok: true };
  }

  async function logout() {
    if (SB) { try { await SB.auth.signOut(); } catch (e) {} }
    _session = null;
  }

  return { restore, register, login, logout, token, email, userId, isAuthed, authHeaders, base,
    resetPassword, updatePassword, isRecovery, onRecovery };
})();
