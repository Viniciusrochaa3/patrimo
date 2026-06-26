/* ============================================================
   App — roteador, FAB, formulários, toggle de valores
   ============================================================ */
const Forms = (() => {
  const { esc, brl, brlShort } = UI;
  const todayISO = () => new Date().toISOString().slice(0, 10);

  const EXPENSE_CATS = ['Aluguel', 'Internet', 'Energia', 'Água', 'Telefone', 'Mercado', 'Combustível', 'Lazer', 'Saúde', 'Impostos', 'Outros'];
  const INCOME_CATS = ['Salário', 'Extra', 'Investimentos', 'Vendas', 'Outros'];
  const FIXED_CATS = ['Moradia', 'Internet', 'Saúde', 'Lazer', 'Assinaturas', 'Outros'];
  const INV_TYPES = ['CDB', 'Tesouro', 'FII', 'Ações', 'Fundo', 'Cripto', 'Poupança', 'Outros'];

  const moneyField = (id, label, ph = '0,00') => `
    <div class="field"><label>${label}</label><input id="${id}" type="text" inputmode="decimal" placeholder="${ph}"></div>`;

  const parseMoney = (v) => {
    if (!v) return 0;
    return parseFloat(String(v).replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
  };

  function chips(name, options, selected) {
    return `<div class="chips" data-chips="${name}">${options.map((o) => `<div class="chip ${o === selected ? 'active' : ''}" data-v="${esc(o)}">${esc(o)}</div>`).join('')}</div>`;
  }
  function bindChips(sheet) {
    sheet.querySelectorAll('[data-chips]').forEach((group) => {
      group.addEventListener('click', (e) => {
        const c = e.target.closest('[data-v]'); if (!c) return;
        group.querySelectorAll('.chip').forEach((x) => x.classList.toggle('active', x === c));
        group.dataset.value = c.dataset.v;
      });
      const active = group.querySelector('.chip.active');
      if (active) group.dataset.value = active.dataset.v;
    });
  }
  const chipVal = (sheet, name) => { const g = sheet.querySelector(`[data-chips="${name}"]`); return g ? g.dataset.value : ''; };

  /* ---------- abrir formulário por tipo (existing = modo edição) ---------- */
  function open(type, existing) {
    if (type === 'invest') return investForm(existing);
    if (type === 'income') return incomeForm(existing);
    if (type === 'expense') return expenseForm(existing);
    if (type === 'fixed') return fixedForm(existing);
  }

  function investForm(ex) {
    const edit = !!ex;
    const periodLabel = ex && ex.period === 'ano' ? 'ao ano' : 'ao mês';
    const sheet = UI.openSheet(`
      <h2>${edit ? 'Editar investimento' : 'Novo investimento'}</h2>
      <p class="sheet-sub">Cadastre e simule o rendimento automaticamente</p>
      <div class="field"><label>Nome</label><input id="i_name" placeholder="Ex: CDB Banco X" value="${edit ? esc(ex.name) : ''}"></div>
      <div class="field"><label>Banco / corretora</label><input id="i_bank" placeholder="Ex: Banco A" value="${edit ? esc(ex.bank) : ''}"></div>
      <div class="field-row">
        ${moneyField('i_amount', 'Valor investido')}
        <div class="field"><label>Data</label><input id="i_date" type="date" value="${edit ? ex.date : todayISO()}"></div>
      </div>
      <div class="field"><label>Tipo</label>${chips('itype', INV_TYPES, edit ? ex.type : 'CDB')}</div>
      <div class="field-row">
        <div class="field"><label>Taxa (%)</label><input id="i_rate" type="text" inputmode="decimal" placeholder="1,0" value="${edit ? String(ex.rate).replace('.', ',') : ''}"></div>
        <div class="field"><label>Periodicidade</label>${chips('iperiod', ['ao mês', 'ao ano'], periodLabel)}</div>
      </div>
      <div class="field"><label>Observações</label><textarea id="i_notes" placeholder="Opcional">${edit ? esc(ex.notes) : ''}</textarea></div>
      <div id="i_preview"></div>
      <button class="btn btn-primary" id="i_save">${edit ? 'Salvar alterações' : 'Salvar investimento'}</button>`);
    if (edit) sheet.querySelector('#i_amount').value = ex.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    bindChips(sheet);
    const upd = () => {
      const amount = parseMoney(sheet.querySelector('#i_amount').value);
      const rate = parseMoney(sheet.querySelector('#i_rate').value);
      const period = chipVal(sheet, 'iperiod') === 'ao ano' ? 'ano' : 'mes';
      const box = sheet.querySelector('#i_preview');
      if (amount > 0 && rate > 0) {
        const sim = Store.simulate(amount, rate, period, true);
        box.innerHTML = `<div class="card" style="margin-bottom:16px"><div class="section-head" style="margin:0 0 8px"><h3>Simulação (juros compostos)</h3></div>
          <table class="sim-table"><tr><th>Período</th><th>Juros</th><th>Total</th></tr>
          ${sim.slice(0, 5).map((r) => `<tr><td>${r.label}</td><td class="g">+${brlShort(r.interest)}</td><td>${brlShort(r.final)}</td></tr>`).join('')}</table></div>`;
      } else box.innerHTML = '';
    };
    ['#i_amount', '#i_rate'].forEach((s) => sheet.querySelector(s).addEventListener('input', upd));
    sheet.querySelectorAll('[data-chips="iperiod"] .chip').forEach((c) => c.addEventListener('click', upd));
    sheet.querySelector('#i_save').onclick = () => {
      const name = sheet.querySelector('#i_name').value.trim();
      const amount = parseMoney(sheet.querySelector('#i_amount').value);
      if (!name || amount <= 0) return UI.toast('Informe nome e valor');
      const data = {
        name, bank: sheet.querySelector('#i_bank').value.trim() || '—',
        amount, date: sheet.querySelector('#i_date').value || todayISO(),
        type: chipVal(sheet, 'itype'), rate: parseMoney(sheet.querySelector('#i_rate').value),
        period: chipVal(sheet, 'iperiod') === 'ao ano' ? 'ano' : 'mes',
        notes: sheet.querySelector('#i_notes').value.trim(),
      };
      if (edit) { Store.update('investments', ex.id, data); UI.toast('Investimento atualizado'); }
      else { Store.addInvestment(data); UI.toast('Investimento adicionado'); }
      UI.closeSheet(); App.render();
    };
  }

  function txForm({ title, sub, cats, ex, onAdd, onEdit }) {
    const edit = !!ex;
    const sheet = UI.openSheet(`
      <h2>${edit ? 'Editar' : title}</h2><p class="sheet-sub">${sub}</p>
      <div class="field"><label>Descrição</label><input id="t_desc" placeholder="Ex: ${cats[0]}" value="${edit ? esc(ex.desc) : ''}"></div>
      <div class="field-row">
        ${moneyField('t_amount', 'Valor')}
        <div class="field"><label>Data</label><input id="t_date" type="date" value="${edit ? ex.date : todayISO()}"></div>
      </div>
      <div class="field"><label>Categoria</label>${chips('tcat', cats, edit ? ex.category : cats[0])}</div>
      <button class="btn btn-primary" id="t_save">${edit ? 'Salvar alterações' : 'Salvar'}</button>`);
    bindChips(sheet);
    if (edit) sheet.querySelector('#t_amount').value = ex.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    sheet.querySelector('#t_save').onclick = () => {
      const desc = sheet.querySelector('#t_desc').value.trim();
      const amount = parseMoney(sheet.querySelector('#t_amount').value);
      if (!desc || amount <= 0) return UI.toast('Informe descrição e valor');
      const data = { desc, amount, date: sheet.querySelector('#t_date').value || todayISO(), category: chipVal(sheet, 'tcat') };
      if (edit) onEdit(data); else onAdd(data);
      UI.closeSheet(); App.render();
    };
  }

  const incomeForm = (ex) => txForm({ title: 'Nova receita', sub: 'Toda entrada conta positivo', cats: INCOME_CATS, ex,
    onAdd: (o) => { Store.addIncome(o); UI.toast('Receita adicionada'); },
    onEdit: (o) => { Store.update('incomes', ex.id, o); UI.toast('Receita atualizada'); } });
  const expenseForm = (ex) => txForm({ title: 'Nova despesa', sub: 'Saídas são somadas automaticamente', cats: EXPENSE_CATS, ex,
    onAdd: (o) => { Store.addExpense(o); UI.toast('Despesa adicionada'); },
    onEdit: (o) => { Store.update('expenses', ex.id, o); UI.toast('Despesa atualizada'); } });

  function fixedForm(ex) {
    const edit = !!ex;
    const sheet = UI.openSheet(`
      <h2>${edit ? 'Editar despesa fixa' : 'Nova despesa fixa'}</h2><p class="sheet-sub">Repete automaticamente todo mês</p>
      <div class="field"><label>Descrição</label><input id="f_desc" placeholder="Ex: Aluguel" value="${edit ? esc(ex.desc) : ''}"></div>
      <div class="field-row">
        ${moneyField('f_amount', 'Valor')}
        <div class="field"><label>Dia de vencimento</label><input id="f_day" type="number" min="1" max="31" value="${edit ? ex.day : 5}"></div>
      </div>
      <div class="field"><label>Categoria</label>${chips('fcat', FIXED_CATS, edit ? ex.category : FIXED_CATS[0])}</div>
      <button class="btn btn-primary" id="f_save">${edit ? 'Salvar alterações' : 'Salvar'}</button>`);
    bindChips(sheet);
    if (edit) sheet.querySelector('#f_amount').value = ex.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    sheet.querySelector('#f_save').onclick = () => {
      const desc = sheet.querySelector('#f_desc').value.trim();
      const amount = parseMoney(sheet.querySelector('#f_amount').value);
      if (!desc || amount <= 0) return UI.toast('Informe descrição e valor');
      const data = { desc, amount, day: +sheet.querySelector('#f_day').value || 1, category: chipVal(sheet, 'fcat') };
      if (edit) { Store.update('fixed', ex.id, data); UI.toast('Despesa fixa atualizada'); }
      else { Store.addFixed(data); UI.toast('Despesa fixa adicionada'); }
      UI.closeSheet(); App.render();
    };
  }

  function goal() {
    const g = Store.get().goal;
    const sheet = UI.openSheet(`
      <h2>Editar meta</h2><p class="sheet-sub">Defina seu objetivo de patrimônio</p>
      <div class="field"><label>Nome da meta</label><input id="g_label" value="${esc(g.label)}"></div>
      ${moneyField('g_target', 'Valor objetivo', '200.000,00')}
      <button class="btn btn-primary" id="g_save">Salvar meta</button>`);
    sheet.querySelector('#g_target').value = g.target.toLocaleString('pt-BR');
    sheet.querySelector('#g_save').onclick = () => {
      const target = parseMoney(sheet.querySelector('#g_target').value);
      if (target <= 0) return UI.toast('Informe um valor válido');
      Store.setGoal(target, sheet.querySelector('#g_label').value.trim());
      UI.closeSheet(); UI.toast('Meta atualizada'); App.render();
    };
  }

  function simulator() {
    const sheet = UI.openSheet(`
      <h2>Simulador de rendimento</h2><p class="sheet-sub">Juros compostos · projeção de crescimento</p>
      <div class="field-row">
        ${moneyField('s_amount', 'Valor inicial', '90.000,00')}
        <div class="field"><label>Taxa (%)</label><input id="s_rate" type="text" inputmode="decimal" value="1"></div>
      </div>
      <div class="field"><label>Periodicidade</label>${chips('speriod', ['ao mês', 'ao ano'], 'ao mês')}</div>
      <div class="card" style="margin:6px 0 16px"><div class="chart-wrap h-160"><canvas id="simChart"></canvas></div></div>
      <div id="s_table"></div>`);
    bindChips(sheet);
    sheet.querySelector('#s_amount').value = '90.000,00';
    const run = () => {
      const amount = parseMoney(sheet.querySelector('#s_amount').value) || 0;
      const rate = parseMoney(sheet.querySelector('#s_rate').value) || 0;
      const period = chipVal(sheet, 'speriod') === 'ao ano' ? 'ano' : 'mes';
      if (amount <= 0) return;
      const curve = Store.simCurve(amount, rate, period, true);
      Charts.area('simChart', curve.map((p) => p.label), curve.map((p) => p.value), { fmt: (v) => brl(v), yfmt: (v) => brlShort(v) });
      const sim = Store.simulate(amount, rate, period, true);
      sheet.querySelector('#s_table').innerHTML = `<table class="sim-table">
        <tr><th>Período</th><th>Juros</th><th>Valor final</th></tr>
        ${sim.map((r) => `<tr><td>${r.label}</td><td class="g">+${brlShort(r.interest)}</td><td>${brlShort(r.final)}</td></tr>`).join('')}</table>`;
    };
    ['#s_amount', '#s_rate'].forEach((s) => sheet.querySelector(s).addEventListener('input', run));
    sheet.querySelectorAll('[data-chips="speriod"] .chip').forEach((c) => c.addEventListener('click', run));
    setTimeout(run, 60);
  }

  return { open, goal, simulator };
})();

/* ============================ App / Router ============================ */
const App = (() => {
  let route = 'dashboard';

  /* ------------------------- Capa / Auth gate ------------------------ */
  function showIntro() {
    document.getElementById('app').style.display = 'none';
    Intro.show({
      onStart: () => showGate('register'),
      onSignIn: () => showGate('login'),
    });
  }
  function showGate(mode) {
    document.getElementById('app').style.display = 'none';
    renderGate(mode || 'login');
  }
  function hideGate() {
    document.getElementById('auth-root').innerHTML = '';
    document.getElementById('app').style.display = '';
  }

  function renderGate(mode) {
    const root = document.getElementById('auth-root');
    const isLogin = mode !== 'register';
    root.innerHTML = `
      <div class="auth-screen">
        <button class="auth-back" id="au_back" aria-label="Voltar">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="auth-card">
          <div class="auth-brand"><span class="logo-mark"></span><span class="logo-text">Patrimo</span></div>
          <h1 class="auth-title">${isLogin ? 'Entrar na sua conta' : 'Criar sua conta'}</h1>
          <p class="auth-sub">${isLogin ? 'Acesse com seu e-mail e senha.' : 'Preencha os dados para começar.'}</p>

          <div class="field"><label>E-mail</label><input id="au_email" type="email" autocomplete="email" placeholder="voce@email.com"></div>
          <div class="field"><label>Senha</label><input id="au_pass" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" placeholder="Sua senha"></div>
          ${isLogin ? '' : `
          <div class="field"><label>Confirmar senha</label><input id="au_pass2" type="password" autocomplete="new-password" placeholder="Repita a senha"></div>
          <div class="field"><label>Data de nascimento</label><input id="au_birth" type="date"></div>`}

          <p class="auth-error" id="au_err"></p>
          <button class="btn btn-primary" id="au_submit">${isLogin ? 'Entrar' : 'Cadastrar'}</button>
          <p class="auth-switch">${isLogin
            ? 'Ainda não tem conta? <a id="au_toReg">Cadastre-se</a>'
            : 'Já tem conta? <a id="au_toLogin">Entrar</a>'}</p>
        </div>
      </div>`;

    const err = (m) => { const el = document.getElementById('au_err'); el.textContent = m || ''; el.style.display = m ? 'block' : 'none'; };
    document.getElementById('au_back').onclick = () => { root.innerHTML = ''; showIntro(); };
    const toReg = document.getElementById('au_toReg');
    const toLogin = document.getElementById('au_toLogin');
    if (toReg) toReg.onclick = () => renderGate('register');
    if (toLogin) toLogin.onclick = () => renderGate('login');

    const submit = document.getElementById('au_submit');
    submit.onclick = async () => {
      err('');
      submit.disabled = true; submit.textContent = isLogin ? 'Entrando...' : 'Cadastrando...';
      const email = document.getElementById('au_email').value;
      const password = document.getElementById('au_pass').value;
      let res;
      if (isLogin) {
        res = await Auth.login({ email, password });
      } else {
        res = await Auth.register({
          email, password,
          confirm: document.getElementById('au_pass2').value,
          birthdate: document.getElementById('au_birth').value,
        });
      }
      submit.disabled = false; submit.textContent = isLogin ? 'Entrar' : 'Cadastrar';
      if (!res.ok) return err(res.error);
      hideGate();
      await boot(true);
      UI.toast(isLogin ? 'Bem-vindo de volta' : 'Conta criada com sucesso');
    };

    root.querySelectorAll('input').forEach((inp) => inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit.click(); }));
  }

  // carrega o app após autenticar (ou na inicialização, se já logado)
  async function boot(justLoggedIn) {
    render();
    if (Sync.enabled()) {
      const r = await Sync.pull();
      if (r && r.changed) render();
      // conta nova/aparelho novo: garante que a nuvem tenha o estado local
      if (justLoggedIn && r && !r.changed) Sync.push();
    }
  }

  function navigate(r) {
    route = r;
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.route === r));
    render();
    document.getElementById('view').scrollTop = 0;
  }

  function render() {
    const screen = Screens[route];
    if (!screen) return;
    const view = document.getElementById('view');
    view.innerHTML = screen.html();
    screen.mount();
  }

  function fabSheet() {
    UI.openSheet(`
      <h2>O que deseja adicionar?</h2>
      <p class="sheet-sub">Registre uma movimentação</p>
      <div class="quick-grid" style="margin-bottom:8px">
        <div class="quick" data-f="invest"><div class="qi o"><svg viewBox="0 0 24 24"><path d="M4 19h16M6 14l4-4 3 3 5-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="ql">Investir</div></div>
        <div class="quick" data-f="income"><div class="qi g"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="ql">Receita</div></div>
        <div class="quick" data-f="expense"><div class="qi r"><svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7 7 7-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="ql">Despesa</div></div>
        <div class="quick" data-f="fixed"><div class="qi b"><svg viewBox="0 0 24 24"><path d="M4 4h16v12H4zM2 20h20" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></div><div class="ql">Fixa</div></div>
      </div>`);
    document.querySelectorAll('[data-f]').forEach((el) => {
      el.onclick = () => { UI.closeSheet(); Forms.open(el.dataset.f); };
    });
  }

  function exportBackup() {
    const json = Store.exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patrimo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    UI.toast('Backup exportado');
  }

  function importBackup() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const res = Store.importData(reader.result);
        if (res.ok) { UI.closeSheet(); UI.toast('Dados restaurados'); navigate('dashboard'); }
        else UI.toast(res.error || 'Falha ao importar');
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function settingsSheet() {
    const remOn = Reminders.enabled();
    const acc = Auth.email() || '';
    UI.openSheet(`
      <h2>Ajustes</h2>
      <p class="sheet-sub">Sua conta e seus dados ficam salvos neste aparelho.</p>

      <div class="section-head" style="margin:6px 2px 10px"><h3>Conta</h3>
        <span class="pill up">Conectado</span></div>
      <div class="account-row">
        <div class="account-avatar">${UI.esc((acc[0] || '?').toUpperCase())}</div>
        <div class="account-meta"><div class="account-email">${UI.esc(acc || 'Não autenticado')}</div>
          <div class="account-hint">Login salvo neste aparelho</div></div>
      </div>
      <div class="btn-row" style="margin:4px 0 6px">
        <button class="btn btn-ghost" id="set_logout">Sair</button>
      </div>

      <div class="section-head" style="margin:20px 2px 10px"><h3>Backup</h3></div>
      <button class="btn btn-primary" id="set_export" style="margin-bottom:10px">⬇ Exportar backup (.json)</button>
      <button class="btn btn-ghost" id="set_import" style="margin-bottom:6px">⬆ Importar backup</button>

      <div class="section-head" style="margin:20px 2px 10px"><h3>Lembretes</h3>
        <span class="pill ${remOn ? 'up' : 'flat'}">${remOn ? 'Ativos' : 'Inativos'}</span></div>
      <button class="btn btn-ghost" id="set_remind" style="margin-bottom:16px">${remOn ? 'Desativar' : 'Ativar'} lembretes de vencimento</button>

      <div class="section-head" style="margin:8px 2px 10px"><h3>Zona de risco</h3></div>
      <button class="btn btn-danger" id="set_reset">Restaurar dados de exemplo</button>`);

    document.getElementById('set_export').onclick = exportBackup;
    document.getElementById('set_import').onclick = importBackup;
    document.getElementById('set_reset').onclick = () => UI.confirmDelete('todos os seus dados atuais', () => { Store.reset(); UI.toast('Dados redefinidos'); navigate('dashboard'); });

    document.getElementById('set_remind').onclick = () => { if (Reminders.enabled()) { Reminders.disable(); } else { Reminders.enable(); } settingsSheet(); };

    document.getElementById('set_logout').onclick = () => UI.confirmDelete('sua sessão (você precisará entrar novamente)', () => {
      Auth.logout(); UI.closeSheet(); showGate();
    });
  }

  function init() {
    document.querySelectorAll('.nav-item').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.route)));
    document.getElementById('navFab').addEventListener('click', fabSheet);
    document.getElementById('btnSettings').addEventListener('click', settingsSheet);

    const hideBtn = document.getElementById('btnHideValues');
    hideBtn.addEventListener('click', () => {
      const app = document.getElementById('app');
      const on = app.classList.toggle('values-hidden');
      hideBtn.classList.toggle('on', on);
    });

    // auto-push de alterações para a nuvem (debounced) quando a sincronização está ativa
    Store.subscribe(() => Sync.schedulePush());
    if (!Charts.ready()) console.warn('Chart.js não carregou — verifique a conexão (CDN).');

    // gate de autenticação: logado vai direto ao app; senão, capa animada
    if (Auth.isAuthed()) boot(false);
    else showIntro();
  }

  return { navigate, render, init };
})();

document.addEventListener('DOMContentLoaded', App.init);
