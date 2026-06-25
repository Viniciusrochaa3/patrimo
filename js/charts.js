/* ============================================================
   Charts — fábricas reutilizáveis sobre Chart.js
   Tema escuro, gradiente laranja, animações suaves.
   ============================================================ */
const Charts = (() => {
  const registry = new Map();

  function ready() { return typeof Chart !== 'undefined'; }

  if (ready()) {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#9a9aa3';
    Chart.defaults.font.size = 11;
  }

  function destroy(id) {
    if (registry.has(id)) { registry.get(id).destroy(); registry.delete(id); }
  }

  function mount(canvasId, config) {
    if (!ready()) return null;
    const el = document.getElementById(canvasId);
    if (!el) return null;
    destroy(canvasId);
    const c = new Chart(el.getContext('2d'), config);
    registry.set(canvasId, c);
    return c;
  }

  const tooltip = (fmt) => ({
    backgroundColor: '#1b1b20', borderColor: 'rgba(255,255,255,.12)', borderWidth: 1,
    titleColor: '#fff', bodyColor: '#fff', padding: 10, cornerRadius: 12, displayColors: false,
    callbacks: fmt ? { label: (ctx) => fmt(ctx.parsed.y != null ? ctx.parsed.y : ctx.parsed) } : {},
  });

  function gradient(ctx, area, from, to) {
    const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, from); g.addColorStop(1, to);
    return g;
  }

  // ---------- Linha / Área (evolução) ----------
  function area(canvasId, labels, data, opts = {}) {
    return mount(canvasId, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data, borderColor: '#ff6a00', borderWidth: 2.5, tension: 0.4,
          fill: true, pointRadius: 0, pointHoverRadius: 5, pointBackgroundColor: '#ff6a00',
          pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2,
          backgroundColor: (ctx) => {
            const { ctx: c, chartArea } = ctx.chart; if (!chartArea) return 'transparent';
            return gradient(c, chartArea, 'rgba(255,106,0,.34)', 'rgba(255,106,0,0)');
          },
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: { legend: { display: false }, tooltip: tooltip(opts.fmt) },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12 } },
          y: { grid: { color: 'rgba(255,255,255,.05)' }, border: { display: false }, ticks: { callback: opts.yfmt || ((v) => v), maxTicksLimit: 4 } },
        },
      },
    });
  }

  // ---------- Barras ----------
  function bars(canvasId, labels, datasets, opts = {}) {
    const ds = datasets.map((d) => ({
      label: d.label, data: d.data,
      backgroundColor: d.color, borderRadius: 7, borderSkipped: false,
      barPercentage: 0.62, categoryPercentage: 0.7,
    }));
    return mount(canvasId, {
      type: 'bar',
      data: { labels, datasets: ds },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: { legend: { display: datasets.length > 1, position: 'top', labels: { usePointStyle: true, boxWidth: 7, padding: 14 } }, tooltip: tooltip(opts.fmt) },
        scales: {
          x: { grid: { display: false }, border: { display: false }, stacked: !!opts.stacked },
          y: { grid: { color: 'rgba(255,255,255,.05)' }, border: { display: false }, stacked: !!opts.stacked, ticks: { callback: opts.yfmt || ((v) => v), maxTicksLimit: 4 } },
        },
      },
    });
  }

  // ---------- Rosca / Pizza ----------
  function doughnut(canvasId, labels, data, colors, opts = {}) {
    return mount(canvasId, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data, backgroundColor: colors, borderColor: '#0c0c0e', borderWidth: 3,
          hoverOffset: 6, cutout: opts.pie ? '0%' : '68%',
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { animateRotate: true, duration: 900 },
        plugins: { legend: { display: false }, tooltip: tooltip(opts.fmt) },
      },
    });
  }

  return { area, bars, doughnut, destroy, ready };
})();
