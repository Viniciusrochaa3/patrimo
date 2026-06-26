/* ============================================================
   Store — camada de dados (localStorage)
   Arquitetura simples e escalável: um único estado serializado,
   com seletores/derivações puras para alimentar a UI.
   ============================================================ */
const Store = (() => {
  const KEY = 'patrimo.v1';
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
  const uid = () => Math.random().toString(36).slice(2, 10);

  // ---------- Dados de exemplo (espelham o briefing) ----------
  function seed() {
    const investments = [
      { id: uid(), name: 'CDB Banco X', bank: 'Banco A', amount: 50000, date: daysAgo(220), type: 'CDB', rate: 1, period: 'mes', notes: 'Liquidez diária' },
      { id: uid(), name: 'Tesouro Selic', bank: 'Banco B', amount: 25000, date: daysAgo(150), type: 'Tesouro', rate: 11.5, period: 'ano', notes: '' },
      { id: uid(), name: 'Fundo Imobiliário', bank: 'Banco C', amount: 45000, date: daysAgo(90), type: 'FII', rate: 0.85, period: 'mes', notes: 'Dividendos mensais' },
      { id: uid(), name: 'Ações Carteira', bank: 'Banco C', amount: 30000, date: daysAgo(60), type: 'Ações', rate: 14, period: 'ano', notes: 'Blue chips' },
    ];
    const incomes = [
      { id: uid(), desc: 'Salário', category: 'Salário', date: daysAgo(20), amount: 12000 },
      { id: uid(), desc: 'Freelance', category: 'Extra', date: daysAgo(12), amount: 3500 },
      { id: uid(), desc: 'Dividendos', category: 'Investimentos', date: daysAgo(5), amount: 850 },
    ];
    const expenses = [
      { id: uid(), desc: 'Mercado', category: 'Mercado', date: daysAgo(18), amount: 1450 },
      { id: uid(), desc: 'Combustível', category: 'Combustível', date: daysAgo(14), amount: 480 },
      { id: uid(), desc: 'Restaurante', category: 'Lazer', date: daysAgo(9), amount: 320 },
      { id: uid(), desc: 'Farmácia', category: 'Saúde', date: daysAgo(4), amount: 210 },
    ];
    const fixed = [
      { id: uid(), desc: 'Aluguel', category: 'Moradia', amount: 2800, day: 5 },
      { id: uid(), desc: 'Internet', category: 'Internet', amount: 120, day: 10 },
      { id: uid(), desc: 'Plano de Saúde', category: 'Saúde', amount: 650, day: 8 },
      { id: uid(), desc: 'Academia', category: 'Lazer', amount: 130, day: 12 },
      { id: uid(), desc: 'Streaming', category: 'Assinaturas', amount: 95, day: 15 },
    ];
    return {
      goal: { target: 200000, label: 'Independência Financeira' },
      investments, incomes, expenses, fixed,
      // histórico patrimonial mensal (12 meses) para o gráfico de evolução
      history: buildHistory(150000),
      demo: true, // marca os dados de exemplo; some quando o usuário limpa
    };
  }

  function buildHistory(current) {
    // gera uma curva ascendente realista terminando em `current`
    const months = 12; const arr = []; let v = current * 0.62;
    for (let i = 0; i < months; i++) {
      const growth = 1 + (0.012 + Math.random() * 0.018);
      v = i === months - 1 ? current : v * growth;
      const d = new Date(); d.setMonth(d.getMonth() - (months - 1 - i)); d.setDate(1);
      arr.push({ date: iso(d), value: Math.round(v) });
    }
    return arr;
  }

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    const s = seed();
    localStorage.setItem(KEY, JSON.stringify(s));
    return s;
  }
  function _save() { localStorage.setItem(KEY, JSON.stringify(state)); emit(); }
  function persist() { state.updatedAt = Date.now(); _save(); }

  // ---------- pub/sub ----------
  const subs = [];
  const subscribe = (fn) => subs.push(fn);
  const emit = () => subs.forEach((fn) => fn());

  // ---------- mutations ----------
  const addInvestment = (o) => { state.investments.unshift({ id: uid(), ...o }); recalcHistory(); persist(); };
  const addIncome = (o) => { state.incomes.unshift({ id: uid(), ...o }); persist(); };
  const addExpense = (o) => { state.expenses.unshift({ id: uid(), ...o }); persist(); };
  const addFixed = (o) => { state.fixed.unshift({ id: uid(), ...o }); persist(); };
  const remove = (coll, id) => { state[coll] = state[coll].filter((x) => x.id !== id); if (coll === 'investments') recalcHistory(); persist(); };
  const update = (coll, id, patch) => {
    state[coll] = state[coll].map((x) => (x.id === id ? { ...x, ...patch } : x));
    if (coll === 'investments') recalcHistory();
    persist();
  };
  const setGoal = (target, label) => { state.goal = { target: +target, label: label || state.goal.label }; persist(); };

  function recalcHistory() {
    // mantém a curva mas ancora o último ponto ao patrimônio investido atual
    const total = totals().invested;
    if (!state.history || !state.history.length) state.history = buildHistory(total);
    else state.history[state.history.length - 1].value = total;
  }

  // ---------- selectors / derivações ----------
  const sum = (arr, k) => arr.reduce((a, b) => a + (+b[k] || 0), 0);

  // rendimento estimado de um investimento até hoje
  function investEarnings(inv) {
    const start = new Date(inv.date); const now = new Date();
    const days = Math.max(0, (now - start) / 86400000);
    const monthly = inv.period === 'ano' ? Math.pow(1 + inv.rate / 100, 1 / 12) - 1 : inv.rate / 100;
    const months = days / 30.4375;
    const final = inv.amount * Math.pow(1 + monthly, months);
    return Math.max(0, final - inv.amount);
  }

  function totals() {
    const invested = sum(state.investments, 'amount');
    const earnings = state.investments.reduce((a, i) => a + investEarnings(i), 0);
    const patrimony = invested + earnings;
    const profitPct = invested ? (earnings / invested) * 100 : 0;
    const incomeTotal = sum(state.incomes, 'amount');
    const expenseTotal = sum(state.expenses, 'amount');
    const fixedTotal = sum(state.fixed, 'amount');
    return { invested, earnings, patrimony, profitPct, incomeTotal, expenseTotal, fixedTotal, balance: incomeTotal - expenseTotal - fixedTotal };
  }

  // distribuição por banco
  function byBank() {
    const m = {};
    state.investments.forEach((i) => { m[i.bank] = (m[i.bank] || 0) + i.amount; });
    const total = Object.values(m).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(m).map(([name, value]) => ({ name, value, pct: (value / total) * 100 }))
      .sort((a, b) => b.value - a.value);
  }
  function byType() {
    const m = {};
    state.investments.forEach((i) => { m[i.type] = (m[i.type] || 0) + i.amount; });
    const total = Object.values(m).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(m).map(([name, value]) => ({ name, value, pct: (value / total) * 100 }))
      .sort((a, b) => b.value - a.value);
  }
  function expenseByCategory() {
    const m = {};
    state.expenses.forEach((e) => { m[e.category] = (m[e.category] || 0) + e.amount; });
    state.fixed.forEach((e) => { m[e.category] = (m[e.category] || 0) + e.amount; });
    const total = Object.values(m).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(m).map(([name, value]) => ({ name, value, pct: (value / total) * 100 }))
      .sort((a, b) => b.value - a.value);
  }

  // dias com investimento no mês de referência (para o calendário)
  function investDaysOfMonth(year, month) {
    const map = {};
    state.investments.forEach((i) => {
      const d = new Date(i.date + 'T00:00');
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        map[day] = (map[day] || 0) + i.amount;
      }
    });
    return map;
  }

  // total de aportes por mês (últimos N meses) para o gráfico de tendência
  function aporteTrend(n = 6) {
    const out = [];
    const base = new Date(); base.setDate(1);
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(base); d.setMonth(base.getMonth() - i);
      const y = d.getFullYear(), m = d.getMonth();
      const total = state.investments.reduce((a, inv) => {
        const dt = new Date(inv.date + 'T00:00');
        return dt.getFullYear() === y && dt.getMonth() === m ? a + inv.amount : a;
      }, 0);
      out.push({ label: d.toLocaleDateString('pt-BR', { month: 'short' }), value: total });
    }
    return out;
  }

  // despesas fixas com vencimento próximo/atrasado em relação a hoje
  function dueFixed(windowDays = 5) {
    const now = new Date();
    const todayDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return state.fixed.map((f) => {
      const day = Math.min(f.day, daysInMonth);
      const diff = day - todayDay; // negativo = já passou neste mês
      return { ...f, dueDay: day, diff };
    }).filter((f) => f.diff < 0 || f.diff <= windowDays)
      .sort((a, b) => a.diff - b.diff);
  }

  // série de evolução conforme range (D/S/M/A) — deriva do history mensal
  function evolutionSeries(range) {
    const h = state.history;
    if (!h || !h.length) return [];
    if (range === 'A') return h.map((p) => ({ label: new Date(p.date).toLocaleDateString('pt-BR', { month: 'short' }), value: p.value }));
    if (range === 'M') return h.slice(-6).map((p) => ({ label: new Date(p.date).toLocaleDateString('pt-BR', { month: 'short' }), value: p.value }));
    // D e S: interpola os últimos pontos para granularidade fina
    const last = h[h.length - 1].value, prev = h[h.length - 2] ? h[h.length - 2].value : last * 0.97;
    const n = range === 'D' ? 7 : 8;
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const noise = 1 + (Math.sin(i * 1.7) * 0.004);
      out.push({ label: range === 'D' ? `D${i + 1}` : `S${i + 1}`, value: Math.round((prev + (last - prev) * t) * noise) });
    }
    return out;
  }

  // simulador de juros compostos
  function simulate(amount, ratePct, period, compound = true) {
    const monthly = period === 'ano' ? (compound ? Math.pow(1 + ratePct / 100, 1 / 12) - 1 : ratePct / 100 / 12) : ratePct / 100;
    const points = [
      { label: '30 dias', months: 1 }, { label: '60 dias', months: 2 }, { label: '90 dias', months: 3 },
      { label: '180 dias', months: 6 }, { label: '1 ano', months: 12 }, { label: '2 anos', months: 24 }, { label: '3 anos', months: 36 },
    ];
    return points.map((p) => {
      const final = compound ? amount * Math.pow(1 + monthly, p.months) : amount * (1 + monthly * p.months);
      return { ...p, initial: amount, final, interest: final - amount };
    });
  }

  // curva contínua para gráfico do simulador (36 meses)
  function simCurve(amount, ratePct, period, compound = true) {
    const monthly = period === 'ano' ? (compound ? Math.pow(1 + ratePct / 100, 1 / 12) - 1 : ratePct / 100 / 12) : ratePct / 100;
    const out = [];
    for (let m = 0; m <= 36; m += 3) {
      const final = compound ? amount * Math.pow(1 + monthly, m) : amount * (1 + monthly * m);
      out.push({ label: m + 'm', value: final });
    }
    return out;
  }

  function reset() { localStorage.removeItem(KEY); state = load(); emit(); }

  // ---------- dados de exemplo ----------
  function isDemo() {
    if (state.demo === true) return true;
    // compatibilidade: dados antigos semeados antes da flag existir
    if (state.demo === undefined && Array.isArray(state.investments)) {
      const names = state.investments.map((i) => i.name);
      return names.includes('CDB Banco X') && names.includes('Tesouro Selic');
    }
    return false;
  }
  function clearSample() {
    state = {
      goal: { target: 200000, label: 'Minha meta' },
      investments: [], incomes: [], expenses: [], fixed: [],
      history: [],
      demo: false,
    };
    persist();
  }

  // ---------- backup / restauração ----------
  function exportData() {
    return JSON.stringify({ app: 'patrimo', version: 1, exportedAt: new Date().toISOString(), data: state }, null, 2);
  }
  function importData(json, opts = {}) {
    let parsed;
    try { parsed = typeof json === 'string' ? JSON.parse(json) : json; }
    catch (e) { return { ok: false, error: 'Arquivo inválido (não é JSON).' }; }
    const d = parsed && parsed.data ? parsed.data : parsed; // aceita formato com ou sem wrapper
    const arrays = ['investments', 'incomes', 'expenses', 'fixed', 'history'];
    if (!d || !arrays.every((k) => Array.isArray(d[k]))) {
      return { ok: false, error: 'Backup não reconhecido.' };
    }
    state = {
      goal: d.goal && typeof d.goal.target === 'number' ? d.goal : { target: 200000, label: 'Meta' },
      investments: d.investments, incomes: d.incomes, expenses: d.expenses, fixed: d.fixed,
      history: d.history.length ? d.history : buildHistory(sum(d.investments, 'amount') || 1),
      updatedAt: (parsed && parsed.updatedAt) || d.updatedAt || Date.now(),
    };
    // ao restaurar de backup local, conta como alteração nova; ao sincronizar, preserva o updatedAt remoto
    if (opts.keepUpdatedAt) _save(); else persist();
    return { ok: true };
  }

  const getUpdatedAt = () => state.updatedAt || 0;

  return {
    get: () => state, subscribe,
    addInvestment, addIncome, addExpense, addFixed, remove, update, setGoal,
    totals, byBank, byType, expenseByCategory, investDaysOfMonth, aporteTrend, dueFixed,
    evolutionSeries, simulate, simCurve, investEarnings, reset, exportData, importData, getUpdatedAt,
    isDemo, clearSample,
  };
})();
