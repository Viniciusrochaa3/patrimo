/* ============================================================
   Screens — render + mount de cada tela
   Cada tela expõe { html(), mount() }.
   ============================================================ */
const Screens = (() => {
  const { brl, brlShort, pct, esc, PALETTE, iconPath } = UI;

  // estados efêmeros de UI
  const ui = {
    evoRange: 'A',
    calRef: new Date(),
    flowTab: 'resumo',
    reportRange: 'mes',
    distMode: 'bank',
  };

  const avatar = (cat, color) => `<div class="av" style="background:${color}1f;color:${color}"><svg viewBox="0 0 24 24"><path d="${iconPath(cat)}" fill="currentColor"/></svg></div>`;

  /* ============================ DASHBOARD ============================ */
  const dashboard = {
    html() {
      const t = Store.totals();
      const g = Store.get().goal;
      const goalPct = Math.min(100, (t.patrimony / g.target) * 100);
      const remaining = Math.max(0, g.target - t.patrimony);
      // previsão: usa crescimento médio mensal do histórico
      const h = Store.get().history;
      const mGrowth = h.length > 1 ? (h[h.length - 1].value / h[0].value) ** (1 / (h.length - 1)) - 1 : 0.02;
      const monthsLeft = remaining > 0 && mGrowth > 0 && t.patrimony > 0 ? Math.ceil(Math.log(g.target / t.patrimony) / Math.log(1 + mGrowth)) : 0;
      const forecast = new Date(); forecast.setMonth(forecast.getMonth() + monthsLeft);

      const due = Store.dueFixed();
      const dueTotal = due.reduce((a, f) => a + f.amount, 0);
      const dueBanner = due.length ? `
        <div class="card" id="dueBanner" style="border-color:rgba(255,138,43,.35);background:linear-gradient(180deg,rgba(255,106,0,.10),var(--card));margin-top:14px">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="av" style="background:var(--orange-soft);color:var(--orange);flex-shrink:0"><svg viewBox="0 0 24 24" width="20"><path d="M12 2a7 7 0 00-7 7v4l-2 3v1h18v-1l-2-3V9a7 7 0 00-7-7zm0 20a3 3 0 003-3H9a3 3 0 003 3z" fill="currentColor"/></svg></div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:14.5px">${due.length} ${due.length > 1 ? 'contas fixas' : 'conta fixa'} a vencer</div>
              <div class="screen-sub" style="margin:2px 0 0">${due.slice(0, 3).map((f) => esc(f.desc) + (f.diff < 0 ? ' (atrasada)' : f.diff === 0 ? ' (hoje)' : ` (dia ${f.dueDay})`)).join(' · ')} · ${brl(dueTotal)}</div>
            </div>
            <button class="icon-btn" id="dueNotify" title="Ativar lembretes"><svg viewBox="0 0 24 24" width="18"><path d="M12 2a7 7 0 00-7 7v4l-2 3v1h18v-1l-2-3V9a7 7 0 00-7-7z" fill="currentColor"/></svg></button>
          </div>
        </div>` : '';
      const sampleBanner = Store.isDemo() ? `
        <div class="card" id="sampleBanner" style="border-color:rgba(255,138,43,.4);background:linear-gradient(180deg,rgba(255,106,0,.14),var(--card));margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="av" style="background:var(--orange-soft);color:var(--orange);flex-shrink:0"><svg viewBox="0 0 24 24" width="20"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 5a1.25 1.25 0 110 2.5A1.25 1.25 0 0112 7zm1.25 10h-2.5v-6h2.5z" fill="currentColor"/></svg></div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:14.5px">Estes são dados de exemplo</div>
              <div class="screen-sub" style="margin:2px 0 0">Explore o app à vontade. Quando quiser começar com os seus números, limpe tudo.</div>
            </div>
          </div>
          <button class="btn btn-primary" id="clearSample" style="margin-top:12px;width:100%">Limpar dados de exemplo</button>
        </div>` : '';
      return `
      <section class="screen">
        ${sampleBanner}
        <div class="hero blurable">
          <div class="hero-label">
            <svg viewBox="0 0 24 24" width="14" height="14"><path d="M3 11l9-8 9 8v9a2 2 0 01-2 2h-4v-6H9v6H5a2 2 0 01-2-2z" fill="currentColor"/></svg>
            Patrimônio Total
          </div>
          <div class="hero-value">${brl(t.patrimony)}</div>
          <span class="pill ${t.profitPct >= 0 ? 'up' : 'down'}">${pct(t.profitPct)} de rentabilidade</span>
          <div class="hero-row">
            <div class="hero-stat"><div class="k">Investido</div><div class="v">${brlShort(t.invested)}</div></div>
            <div class="hero-stat"><div class="k">Lucro acumulado</div><div class="v" style="color:var(--green)">+${brlShort(t.earnings)}</div></div>
          </div>
        </div>

        ${dueBanner}

        <div class="section-head"><h3>Meta financeira</h3><span class="link" id="editGoal">Editar</span></div>
        <div class="card blurable">
          <div class="goal-top">
            <div>
              <div style="font-weight:700;font-size:15px">${esc(g.label)}</div>
              <div class="target">Objetivo <b>${brl(g.target)}</b></div>
            </div>
            <div style="text-align:right">
              <div style="font-size:24px;font-weight:800;color:var(--orange)">${goalPct.toFixed(0)}%</div>
              <div class="target">concluído</div>
            </div>
          </div>
          <div class="progress"><span style="width:0%" data-w="${goalPct}"></span></div>
          <div class="goal-foot">
            <span>Faltam <b>${brl(remaining)}</b></span>
            <span>Previsão: <b>${monthsLeft > 0 ? forecast.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : (t.patrimony > 0 ? 'atingida 🎉' : '—')}</b></span>
          </div>
        </div>

        <div class="section-head"><h3>Evolução patrimonial</h3></div>
        <div class="card">
          <div class="seg" id="evoSeg">
            ${['D', 'S', 'M', 'A'].map((r) => `<button data-r="${r}" class="${ui.evoRange === r ? 'active' : ''}">${({ D: 'Diário', S: 'Semanal', M: 'Mensal', A: 'Anual' })[r]}</button>`).join('')}
          </div>
          <div class="chart-wrap h-200" style="margin-top:14px"><canvas id="evoChart"></canvas></div>
        </div>

        <div class="section-head"><h3>Ações rápidas</h3></div>
        <div class="quick-grid">
          <div class="quick" data-add="invest"><div class="qi o"><svg viewBox="0 0 24 24"><path d="M4 19h16M6 14l4-4 3 3 5-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="ql">Investir</div></div>
          <div class="quick" data-add="income"><div class="qi g"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="ql">Receita</div></div>
          <div class="quick" data-add="expense"><div class="qi r"><svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7 7 7-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="ql">Despesa</div></div>
          <div class="quick" data-go="reports"><div class="qi b"><svg viewBox="0 0 24 24"><path d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm3 12h2v3H8zm4-6h2v9h-2z" fill="currentColor"/></svg></div><div class="ql">Relatório</div></div>
        </div>

        <div class="section-head"><h3>Calendário de aportes</h3></div>
        <div class="card" id="calCard">${calendarHTML()}</div>

        <div class="section-head"><h3>Tendência de aportes</h3></div>
        <div class="card">
          <div class="chart-wrap h-160"><canvas id="aporteTrend"></canvas></div>
        </div>
      </section>`;
    },
    mount() {
      // anima a barra de meta
      requestAnimationFrame(() => {
        const bar = document.querySelector('.progress > span');
        if (bar) setTimeout(() => { bar.style.width = bar.dataset.w + '%'; }, 60);
      });
      renderEvo();
      document.getElementById('evoSeg').addEventListener('click', (e) => {
        const b = e.target.closest('[data-r]'); if (!b) return;
        ui.evoRange = b.dataset.r;
        document.querySelectorAll('#evoSeg button').forEach((x) => x.classList.toggle('active', x === b));
        renderEvo();
      });
      document.getElementById('editGoal').onclick = Forms.goal;
      bindQuick();
      bindCalendar();
      // gráfico de tendência de aportes (barras)
      const trend = Store.aporteTrend(6);
      Charts.bars('aporteTrend', trend.map((p) => p.label), [{ label: '', data: trend.map((p) => p.value), color: '#ff6a00' }], { fmt: (v) => brl(v), yfmt: (v) => UI.brlShort(v) });
      // lembretes de vencimento
      const notifyBtn = document.getElementById('dueNotify');
      if (notifyBtn) notifyBtn.onclick = () => Reminders.enable();
      Reminders.maybeNotify();
      // limpar dados de exemplo
      const clearBtn = document.getElementById('clearSample');
      if (clearBtn) clearBtn.onclick = () => {
        UI.openSheet(`
          <h2>Limpar dados de exemplo?</h2>
          <p class="sheet-sub">Vamos apagar todos os investimentos, receitas, despesas e contas de exemplo para você começar do zero com os seus próprios números. Esta ação não pode ser desfeita.</p>
          <div class="btn-row">
            <button class="btn btn-ghost" data-x>Cancelar</button>
            <button class="btn btn-primary" data-y>Limpar tudo</button>
          </div>`);
        const s = document.querySelector('.sheet');
        s.querySelector('[data-x]').onclick = UI.closeSheet;
        s.querySelector('[data-y]').onclick = () => { Store.clearSample(); UI.closeSheet(); App.render(); UI.toast('Tudo limpo! Comece adicionando seus dados.'); };
      };
    },
  };

  function renderEvo() {
    const s = Store.evolutionSeries(ui.evoRange);
    Charts.area('evoChart', s.map((p) => p.label), s.map((p) => p.value), {
      fmt: (v) => brl(v), yfmt: (v) => brlShort(v),
    });
  }

  function calendarHTML() {
    const ref = ui.calRef;
    const y = ref.getFullYear(), m = ref.getMonth();
    const map = Store.investDaysOfMonth(y, m);
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const now = new Date();
    const dow = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    let cells = dow.map((d) => `<div class="cal-dow">${d}</div>`).join('');
    for (let i = 0; i < first; i++) cells += '<div class="cal-cell empty"></div>';
    for (let d = 1; d <= days; d++) {
      const has = map[d];
      const isToday = d === now.getDate() && m === now.getMonth() && y === now.getFullYear();
      cells += `<div class="cal-cell ${has ? 'has' : ''} ${isToday ? 'today' : ''}" ${has ? `data-day="${d}"` : ''}>${d}${has ? '<span class="dot"></span>' : ''}</div>`;
    }
    return `
      <div class="cal-head">
        <span class="m">${ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
        <div class="cal-nav"><button data-mv="-1">‹</button><button data-mv="1">›</button></div>
      </div>
      <div class="cal-grid">${cells}</div>
      <div class="cal-legend">
        <span><i style="background:var(--orange)"></i>Dia com aporte</span>
        <span><i style="background:var(--bg-elev-1);border:1px solid var(--stroke)"></i>Sem aporte</span>
      </div>`;
  }

  function bindCalendar() {
    const card = document.getElementById('calCard');
    if (!card) return;
    card.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-mv]');
      if (nav) { ui.calRef.setMonth(ui.calRef.getMonth() + (+nav.dataset.mv)); card.innerHTML = calendarHTML(); return; }
      const day = e.target.closest('[data-day]');
      if (day) {
        const d = +day.dataset.day; const y = ui.calRef.getFullYear(), m = ui.calRef.getMonth();
        const map = Store.investDaysOfMonth(y, m);
        const list = Store.get().investments.filter((i) => { const dt = new Date(i.date + 'T00:00'); return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d; });
        UI.openSheet(`
          <h2>Aportes do dia ${d}</h2>
          <p class="sheet-sub">Total investido: <b style="color:var(--orange)">${brl(map[d])}</b></p>
          <div class="list">${list.map((i) => `
            <div class="row">${avatar(i.type, '#ff6a00')}<div class="mid"><div class="t">${esc(i.name)}</div><div class="s">${esc(i.bank)} · ${esc(i.type)}</div></div><div class="end"><div class="amt">${brl(i.amount)}</div></div></div>`).join('')}</div>
          <button class="btn btn-ghost" style="margin-top:16px" onclick="UI.closeSheet()">Fechar</button>`);
      }
    });
  }

  /* ============================ INVESTIMENTOS ============================ */
  const invest = {
    html() {
      const t = Store.totals();
      const invs = Store.get().investments;
      const dist = ui.distMode === 'bank' ? Store.byBank() : Store.byType();
      return `
      <section class="screen">
        <h1 class="screen-title">Investimentos</h1>
        <p class="screen-sub">${invs.length} ativos · rendimento estimado em tempo real</p>

        <div class="stat-grid">
          <div class="stat blurable"><div class="label">Total investido</div><div class="num">${brlShort(t.invested)}</div></div>
          <div class="stat blurable"><div class="label">Rendimento</div><div class="num pos">+${brlShort(t.earnings)}</div></div>
        </div>

        <div class="section-head"><h3>Distribuição</h3>
          <span class="link" id="distToggle">${ui.distMode === 'bank' ? 'Por tipo' : 'Por banco'}</span>
        </div>
        <div class="card">
          <div class="chart-wrap h-180"><canvas id="distChart"></canvas></div>
          <div class="legend" style="margin-top:16px">
            ${dist.map((d, i) => `<div class="li"><i style="background:${PALETTE[i % PALETTE.length]}"></i><span class="nm">${esc(d.name)}</span><span class="vl">${brlShort(d.value)}</span><span class="pc">${d.pct.toFixed(0)}%</span></div>`).join('')}
          </div>
        </div>

        <div class="section-head"><h3>Meus ativos</h3><span class="link" id="openSim">Simulador</span></div>
        <div class="list">
          ${invs.length ? invs.map((i) => {
        const earn = Store.investEarnings(i);
        return `<div class="row" data-inv="${i.id}">
              ${avatar(i.type, '#ff6a00')}
              <div class="mid"><div class="t">${esc(i.name)}</div><div class="s">${esc(i.bank)} · ${i.rate}% ${i.period === 'mes' ? 'a.m.' : 'a.a.'}</div></div>
              <div class="end"><div class="amt">${brlShort(i.amount)}</div><div class="sub" style="color:var(--green)">+${brlShort(earn)}</div></div>
            </div>`;
      }).join('') : emptyState('Nenhum investimento', 'Toque no + para cadastrar')}
        </div>
        <button class="btn btn-primary" style="margin-top:18px" data-add="invest">+ Novo investimento</button>
      </section>`;
    },
    mount() {
      const dist = ui.distMode === 'bank' ? Store.byBank() : Store.byType();
      Charts.doughnut('distChart', dist.map((d) => d.name), dist.map((d) => d.value), PALETTE, { fmt: (v) => brl(v) });
      document.getElementById('distToggle').onclick = () => { ui.distMode = ui.distMode === 'bank' ? 'type' : 'bank'; App.render(); };
      document.getElementById('openSim').onclick = () => Forms.simulator();
      bindQuick();
      document.querySelectorAll('[data-inv]').forEach((el) => {
        el.onclick = () => {
          const inv = Store.get().investments.find((x) => x.id === el.dataset.inv);
          investDetail(inv);
        };
      });
    },
  };

  function investDetail(inv) {
    const earn = Store.investEarnings(inv);
    const sim = Store.simulate(inv.amount, inv.rate, inv.period, true);
    UI.openSheet(`
      <h2>${esc(inv.name)}</h2>
      <p class="sheet-sub">${esc(inv.bank)} · ${esc(inv.type)} · ${inv.rate}% ${inv.period === 'mes' ? 'ao mês' : 'ao ano'}</p>
      <div class="stat-grid" style="margin-bottom:16px">
        <div class="stat"><div class="label">Investido</div><div class="num">${brlShort(inv.amount)}</div></div>
        <div class="stat"><div class="label">Rendimento atual</div><div class="num pos">+${brlShort(earn)}</div></div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <div class="section-head" style="margin:0 0 10px"><h3>Projeção (juros compostos)</h3></div>
        <table class="sim-table">
          <tr><th>Período</th><th>Juros</th><th>Total</th></tr>
          ${sim.map((r) => `<tr><td>${r.label}</td><td class="g">+${brlShort(r.interest)}</td><td>${brlShort(r.final)}</td></tr>`).join('')}
        </table>
      </div>
      ${inv.notes ? `<p class="sheet-sub">📝 ${esc(inv.notes)}</p>` : ''}
      <div class="btn-row">
        <button class="btn btn-ghost" data-edit>Editar</button>
        <button class="btn btn-danger" data-del>Remover</button>
      </div>`);
    document.querySelector('[data-edit]').onclick = () => { UI.closeSheet(); Forms.open('invest', inv); };
    document.querySelector('[data-del]').onclick = () => UI.confirmDelete(inv.name, () => { Store.remove('investments', inv.id); UI.toast('Investimento removido'); App.render(); });
  }

  // menu de ações para um lançamento (Editar / Remover)
  function itemActions(coll, item, formType) {
    UI.openSheet(`
      <h2>${esc(item.desc)}</h2>
      <p class="sheet-sub">${esc(item.category)}${item.date ? ' · ' + new Date(item.date + 'T00:00').toLocaleDateString('pt-BR') : ''} · ${brl(item.amount)}</p>
      <div class="btn-row">
        <button class="btn btn-ghost" data-edit>Editar</button>
        <button class="btn btn-danger" data-del>Remover</button>
      </div>`);
    document.querySelector('[data-edit]').onclick = () => { UI.closeSheet(); Forms.open(formType, item); };
    document.querySelector('[data-del]').onclick = () => UI.confirmDelete(item.desc, () => { Store.remove(coll, item.id); UI.toast('Removido'); App.render(); });
  }

  /* ============================ FLUXO DE CAIXA ============================ */
  const cashflow = {
    html() {
      const t = Store.totals();
      const tabs = [['resumo', 'Resumo'], ['income', 'Receitas'], ['expense', 'Despesas'], ['fixed', 'Fixas']];
      return `
      <section class="screen">
        <h1 class="screen-title">Fluxo de caixa</h1>
        <p class="screen-sub">Entradas e saídas em tempo real</p>
        <div class="tabs" id="flowTabs">${tabs.map(([k, l]) => `<div class="tab ${ui.flowTab === k ? 'active' : ''}" data-t="${k}">${l}</div>`).join('')}</div>
        <div id="flowBody">${flowBody()}</div>
      </section>`;
    },
    mount() {
      document.getElementById('flowTabs').addEventListener('click', (e) => {
        const t = e.target.closest('[data-t]'); if (!t) return;
        ui.flowTab = t.dataset.t;
        document.querySelectorAll('#flowTabs .tab').forEach((x) => x.classList.toggle('active', x === t));
        document.getElementById('flowBody').innerHTML = flowBody();
        flowMount();
      });
      flowMount();
    },
  };

  function flowBody() {
    const t = Store.totals();
    if (ui.flowTab === 'resumo') {
      return `
        <div class="card blurable" style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span class="screen-sub" style="margin:0">Saldo do mês</span>
            <span class="pill ${t.balance >= 0 ? 'up' : 'down'}">${t.balance >= 0 ? 'Positivo' : 'Negativo'}</span>
          </div>
          <div style="font-size:30px;font-weight:800;letter-spacing:-.03em;color:${t.balance >= 0 ? 'var(--green)' : 'var(--red)'}">${brl(t.balance)}</div>
        </div>
        <div class="stat-grid" style="margin-bottom:14px">
          <div class="stat blurable"><div class="label"><span style="color:var(--green)">↑</span> Entrou</div><div class="num pos">${brlShort(t.incomeTotal)}</div></div>
          <div class="stat blurable"><div class="label"><span style="color:var(--red)">↓</span> Saiu</div><div class="num neg">${brlShort(t.expenseTotal + t.fixedTotal)}</div></div>
        </div>
        <div class="card">
          <div class="section-head" style="margin:0 0 12px"><h3>Receitas × Despesas</h3></div>
          <div class="chart-wrap h-200"><canvas id="rxdChart"></canvas></div>
        </div>`;
    }
    if (ui.flowTab === 'income') {
      const list = Store.get().incomes;
      const total = list.reduce((a, b) => a + b.amount, 0);
      return `
        <div class="stat-grid" style="margin-bottom:14px">
          <div class="stat blurable"><div class="label">Total</div><div class="num pos">${brlShort(total)}</div></div>
          <div class="stat blurable"><div class="label">Média</div><div class="num">${brlShort(total / Math.max(1, list.length))}</div></div>
        </div>
        <div class="list">${list.length ? list.map((i) => txRow(i, 'pos', 'incomes')).join('') : emptyState('Sem receitas', 'Adicione sua primeira entrada')}</div>
        <button class="btn btn-primary" style="margin-top:16px" data-add="income">+ Nova receita</button>`;
    }
    if (ui.flowTab === 'expense') {
      const list = Store.get().expenses;
      const total = list.reduce((a, b) => a + b.amount, 0);
      return `
        <div class="stat-grid" style="margin-bottom:14px">
          <div class="stat blurable"><div class="label">Total</div><div class="num neg">${brlShort(total)}</div></div>
          <div class="stat blurable"><div class="label">Lançamentos</div><div class="num">${list.length}</div></div>
        </div>
        <div class="list">${list.length ? list.map((i) => txRow(i, 'neg', 'expenses')).join('') : emptyState('Sem despesas', 'Adicione sua primeira saída')}</div>
        <button class="btn btn-primary" style="margin-top:16px" data-add="expense">+ Nova despesa</button>`;
    }
    // fixed
    const list = Store.get().fixed;
    const total = list.reduce((a, b) => a + b.amount, 0);
    return `
      <div class="card blurable" style="margin-bottom:14px">
        <span class="screen-sub" style="margin:0">Total fixo mensal</span>
        <div style="font-size:26px;font-weight:800;color:var(--red)">${brl(total)}</div>
        <p class="screen-sub" style="margin:6px 0 0">Repetem automaticamente todo mês</p>
      </div>
      <div class="list">${list.length ? list.map((f) => `
        <div class="row" data-fixed="${f.id}">${avatar(f.category, '#ff5a6e')}
          <div class="mid"><div class="t">${esc(f.desc)}</div><div class="s">Vence dia ${f.day} · ${esc(f.category)}</div></div>
          <div class="end"><div class="amt neg">${brl(f.amount)}</div></div></div>`).join('') : emptyState('Sem despesas fixas', 'Cadastre aluguel, internet...')}</div>
      <button class="btn btn-primary" style="margin-top:16px" data-add="fixed">+ Nova despesa fixa</button>`;
  }

  function txRow(i, cls, coll) {
    const color = cls === 'pos' ? '#34d29a' : '#ff5a6e';
    return `<div class="row" data-tx="${i.id}" data-coll="${coll}">${avatar(i.category, color)}
      <div class="mid"><div class="t">${esc(i.desc)}</div><div class="s">${esc(i.category)} · ${new Date(i.date + 'T00:00').toLocaleDateString('pt-BR')}</div></div>
      <div class="end"><div class="amt ${cls}">${cls === 'pos' ? '+' : '-'}${brlShort(i.amount)}</div></div></div>`;
  }

  function flowMount() {
    bindQuick();
    if (ui.flowTab === 'resumo') {
      const t = Store.totals();
      Charts.bars('rxdChart', ['Receitas', 'Despesas', 'Fixas'], [{
        label: '', data: [t.incomeTotal, t.expenseTotal, t.fixedTotal],
        color: ['#34d29a', '#ff5a6e', '#ff8a2b'],
      }], { fmt: (v) => brl(v), yfmt: (v) => brlShort(v) });
    }
    document.querySelectorAll('[data-tx]').forEach((el) => {
      el.onclick = () => {
        const coll = el.dataset.coll;
        const item = Store.get()[coll].find((x) => x.id === el.dataset.tx);
        itemActions(coll, item, coll === 'incomes' ? 'income' : 'expense');
      };
    });
    document.querySelectorAll('[data-fixed]').forEach((el) => {
      el.onclick = () => {
        const item = Store.get().fixed.find((x) => x.id === el.dataset.fixed);
        itemActions('fixed', item, 'fixed');
      };
    });
  }

  /* ============================ RELATÓRIOS ============================ */
  const reports = {
    html() {
      const t = Store.totals();
      const ranges = [['mes', 'Mensal'], ['tri', 'Trimestral'], ['sem', 'Semestral'], ['ano', 'Anual']];
      const mult = { mes: 1, tri: 3, sem: 6, ano: 12 }[ui.reportRange];
      return `
      <section class="screen">
        <h1 class="screen-title">Relatórios</h1>
        <p class="screen-sub">Visão consolidada do período</p>
        <div class="seg" id="repSeg">${ranges.map(([k, l]) => `<button data-r="${k}" class="${ui.reportRange === k ? 'active' : ''}">${l}</button>`).join('')}</div>

        <div class="stat-grid" style="margin-top:16px">
          <div class="stat blurable"><div class="label">Receitas</div><div class="num pos">${brlShort(t.incomeTotal * mult)}</div></div>
          <div class="stat blurable"><div class="label">Despesas</div><div class="num neg">${brlShort((t.expenseTotal + t.fixedTotal) * mult)}</div></div>
          <div class="stat blurable"><div class="label">Investimentos</div><div class="num o">${brlShort(t.invested)}</div></div>
          <div class="stat blurable"><div class="label">Lucro invest.</div><div class="num pos">+${brlShort(t.earnings)}</div></div>
        </div>

        <div class="section-head"><h3>Patrimônio acumulado</h3></div>
        <div class="card"><div class="chart-wrap h-200"><canvas id="repPatr"></canvas></div></div>

        <div class="section-head"><h3>Receitas × Despesas (mensal)</h3></div>
        <div class="card"><div class="chart-wrap h-200"><canvas id="repBars"></canvas></div></div>

        <div class="section-head"><h3>Onde vai seu dinheiro</h3></div>
        <div class="card">
          <div class="chart-wrap h-180"><canvas id="repExp"></canvas></div>
          <div class="legend" style="margin-top:16px">
            ${Store.expenseByCategory().map((d, i) => `<div class="li"><i style="background:${PALETTE[i % PALETTE.length]}"></i><span class="nm">${esc(d.name)}</span><span class="vl">${brlShort(d.value)}</span><span class="pc">${d.pct.toFixed(0)}%</span></div>`).join('')}
          </div>
        </div>

        <div class="section-head"><h3>Rentabilidade</h3></div>
        <div class="card blurable">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div><div class="screen-sub" style="margin:0">Retorno sobre o investido</div>
            <div style="font-size:28px;font-weight:800;color:var(--orange)">${pct(t.profitPct)}</div></div>
            <div style="text-align:right"><div class="screen-sub" style="margin:0">Patrimônio</div><div style="font-size:18px;font-weight:700">${brlShort(t.patrimony)}</div></div>
          </div>
        </div>
      </section>`;
    },
    mount() {
      document.getElementById('repSeg').addEventListener('click', (e) => {
        const b = e.target.closest('[data-r]'); if (!b) return;
        ui.reportRange = b.dataset.r; App.render();
      });
      const h = Store.get().history;
      Charts.area('repPatr', h.map((p) => new Date(p.date).toLocaleDateString('pt-BR', { month: 'short' })), h.map((p) => p.value), { fmt: (v) => brl(v), yfmt: (v) => brlShort(v) });
      // série mensal sintética receitas x despesas
      const t = Store.totals();
      const labels = h.slice(-6).map((p) => new Date(p.date).toLocaleDateString('pt-BR', { month: 'short' }));
      const inc = labels.map(() => Math.round(t.incomeTotal * (0.8 + Math.random() * 0.4)));
      const exp = labels.map(() => Math.round((t.expenseTotal + t.fixedTotal) * (0.8 + Math.random() * 0.4)));
      Charts.bars('repBars', labels, [
        { label: 'Receitas', data: inc, color: '#34d29a' },
        { label: 'Despesas', data: exp, color: '#ff5a6e' },
      ], { fmt: (v) => brl(v), yfmt: (v) => brlShort(v) });
      const ec = Store.expenseByCategory();
      Charts.doughnut('repExp', ec.map((d) => d.name), ec.map((d) => d.value), PALETTE, { fmt: (v) => brl(v) });
    },
  };

  /* ============================ helpers compartilhados ============================ */
  function emptyState(title, sub) {
    return `<div class="empty"><div class="ei"><svg viewBox="0 0 24 24"><path d="M4 7h16v13H4zM4 7l2-3h12l2 3M9 12h6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></div><p>${title}</p><p class="small">${sub}</p></div>`;
  }

  function bindQuick() {
    document.querySelectorAll('[data-add]').forEach((el) => {
      el.onclick = () => Forms.open(el.dataset.add);
    });
    document.querySelectorAll('[data-go]').forEach((el) => {
      el.onclick = () => App.navigate(el.dataset.go);
    });
  }

  return { dashboard, invest, cashflow, reports };
})();
