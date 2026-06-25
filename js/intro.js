/* ============================================================
   Intro — capa animada (planeta laranja + estrelas em canvas).
   Inspirada em capas 3D modernas, adaptada para finanças.
   Intro.show({ onStart, onSignIn }) -> exibe a capa.
   Intro.destroy() -> encerra animação e remove a capa.
   ============================================================ */
const Intro = (() => {
  let raf = null, onResize = null, slideTimer = null;

  const SLIDES = [
    { tag: 'Análise em tempo real', title: 'Seu patrimônio<br>sob controle total', lead: 'Acompanhe, invista e cresça com dados claros e em tempo real.' },
    { tag: 'Investimentos', title: 'Faça o dinheiro<br>trabalhar por você', lead: 'Simule juros compostos e projete o crescimento dos seus aportes.' },
    { tag: 'Fluxo de caixa', title: 'Cada centavo<br>no lugar certo', lead: 'Receitas, despesas e contas fixas reunidas em um só lugar.' },
    { tag: 'Metas', title: 'Objetivos que<br>você alcança', lead: 'Defina metas de patrimônio e acompanhe o progresso real.' },
  ];

  function html() {
    return `
      <div class="intro" id="introScreen">
        <canvas class="intro-canvas" id="introCanvas"></canvas>
        <div class="intro-planet"></div>
        <div class="intro-shine"></div>
        <div class="intro-vignette"></div>

        <header class="intro-top">
          <div class="logo"><span class="logo-mark"></span><span class="logo-text">Patrimo</span></div>
          <button class="intro-skip" id="introSkip">Pular</button>
        </header>

        <div class="intro-body">
          <span class="intro-badge" id="introTag">${SLIDES[0].tag}</span>
          <h1 class="intro-title" id="introTitle">${SLIDES[0].title}</h1>
          <p class="intro-lead" id="introLead">${SLIDES[0].lead}</p>
          <div class="intro-dots" id="introDots">${SLIDES.map((_, i) => `<i class="${i === 0 ? 'on' : ''}" data-i="${i}"></i>`).join('')}</div>
        </div>

        <div class="intro-cta">
          <button class="btn btn-primary intro-start" id="introStart">Começar agora</button>
          <button class="btn intro-signin" id="introSignin">Entrar</button>
          <p class="intro-foot">Já tem uma conta? <a id="introLogin">Entrar</a></p>
        </div>
      </div>`;
  }

  /* -------- starfield + embers + flechas de investimento + fogos -------- */
  function animate(canvas) {
    const ctx = canvas.getContext('2d');
    const planetEl = canvas.parentElement.querySelector('.intro-planet');
    let w, h, dpr, stars, embers, rockets, sparks, flashes, lastSpawn = 0;
    const SPARK_COLORS = ['#fff1d6', '#ffce8a', '#ff8a2b', '#ff6a00'];

    // centro/raio do planeta em coordenadas do canvas (canvas é fixed inset:0)
    const planet = () => {
      const r = planetEl.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2 };
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((w * h) / 9000);
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.3 + 0.3,
        a: Math.random() * 0.5 + 0.2,
        tw: Math.random() * Math.PI * 2,
        ts: Math.random() * 0.02 + 0.005,
        vx: -(Math.random() * 0.06 + 0.02), vy: -(Math.random() * 0.04 + 0.01),
      }));
      embers = Array.from({ length: 10 }, () => spawnEmber());
    };
    const spawnEmber = () => ({
      x: Math.random() * w, y: h + Math.random() * h * 0.5,
      r: Math.random() * 1.8 + 0.6,
      v: Math.random() * 0.5 + 0.2,
      drift: (Math.random() - 0.5) * 0.3,
      a: Math.random() * 0.4 + 0.25,
    });

    // flecha de investimento: sobe da base com corpo de gráfico (zigue-zague ascendente)
    const spawnRocket = () => {
      const p = planet();
      const ang = Math.PI * 0.5 + (Math.random() - 0.5) * 0.7; // mira no arco inferior
      const tx = p.cx + Math.cos(ang) * p.r * 0.92;
      const ty = p.cy + Math.sin(ang) * p.r * 0.92;
      const sx = w * (0.2 + Math.random() * 0.6);
      const sy = h + 20;
      const segs = 5 + Math.floor(Math.random() * 2);
      const pts = [{ x: sx, y: sy }];
      for (let i = 1; i < segs; i++) {
        const t = i / segs;
        pts.push({
          x: sx + (tx - sx) * t + (Math.random() - 0.5) * w * 0.18,
          y: sy + (ty - sy) * t,
        });
      }
      pts.push({ x: tx, y: ty });
      rockets.push({ pts, seg: 0, t: 0, x: sx, y: sy, px: sx, py: sy, trail: [] });
    };

    const explode = (x, y) => {
      flashes.push({ x, y, r: 4, a: 0.9 });
      const n = 30 + Math.floor(Math.random() * 10);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = Math.random() * 3.4 + 0.8;
        sparks.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 1, dec: Math.random() * 0.012 + 0.01,
          c: SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0],
          r: Math.random() * 1.6 + 1,
        });
      }
    };

    const updateRocket = (rk) => {
      const step = h * 0.013;
      let remain = step;
      while (remain > 0 && rk.seg < rk.pts.length - 1) {
        const a = rk.pts[rk.seg], b = rk.pts[rk.seg + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const adv = remain / len;
        rk.t += adv;
        if (rk.t >= 1) { remain = (rk.t - 1) * len; rk.t = 0; rk.seg++; }
        else { remain = 0; }
        const cur = Math.min(rk.t, 1);
        const s = rk.pts[Math.min(rk.seg, rk.pts.length - 1)];
        const e = rk.pts[Math.min(rk.seg + 1, rk.pts.length - 1)];
        rk.px = rk.x; rk.py = rk.y;
        rk.x = s.x + (e.x - s.x) * cur;
        rk.y = s.y + (e.y - s.y) * cur;
      }
      rk.trail.push({ x: rk.x, y: rk.y });
      if (rk.trail.length > 60) rk.trail.shift();
      return rk.seg >= rk.pts.length - 1;
    };

    const drawRocket = (rk) => {
      const t = rk.trail;
      if (t.length > 1) {
        // brilho largo
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(t[0].x, t[0].y);
        for (let i = 1; i < t.length; i++) ctx.lineTo(t[i].x, t[i].y);
        ctx.strokeStyle = 'rgba(255,138,43,.22)'; ctx.lineWidth = 7; ctx.stroke();
        // linha do gráfico nítida com fade na cauda
        for (let i = 1; i < t.length; i++) {
          const a = i / t.length;
          ctx.beginPath(); ctx.moveTo(t[i - 1].x, t[i - 1].y); ctx.lineTo(t[i].x, t[i].y);
          ctx.strokeStyle = `rgba(255,190,120,${0.15 + a * 0.75})`;
          ctx.lineWidth = 2; ctx.stroke();
        }
      }
      // ponta em forma de flecha
      const dx = rk.x - rk.px, dy = rk.y - rk.py;
      const ang = Math.atan2(dy, dx);
      ctx.save();
      ctx.translate(rk.x, rk.y); ctx.rotate(ang);
      ctx.shadowColor = 'rgba(255,120,20,.9)'; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(7, 0); ctx.lineTo(-5, 4); ctx.lineTo(-2, 0); ctx.lineTo(-5, -4);
      ctx.closePath();
      ctx.fillStyle = '#fff4e2'; ctx.fill();
      ctx.restore();
      ctx.shadowBlur = 0;
    };

    onResize = resize; resize();
    rockets = []; sparks = []; flashes = [];

    const loop = (ts) => {
      ctx.clearRect(0, 0, w, h);
      ctx.shadowBlur = 0;
      // estrelas
      for (const s of stars) {
        s.tw += s.ts; s.x += s.vx; s.y += s.vy;
        if (s.x < 0) s.x = w; if (s.y < 0) s.y = h;
        const a = s.a * (0.6 + 0.4 * Math.sin(s.tw));
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7);
        ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
      }
      // brasas laranja subindo
      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        e.y -= e.v; e.x += e.drift;
        if (e.y < -10) embers[i] = spawnEmber();
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 4);
        g.addColorStop(0, `rgba(255,150,60,${e.a})`);
        g.addColorStop(1, 'rgba(255,106,0,0)');
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 4, 0, 7); ctx.fillStyle = g; ctx.fill();
      }
      // lança novas flechas
      if (ts - lastSpawn > 1400 && rockets.length < 3) { spawnRocket(); lastSpawn = ts; }
      // flechas de investimento
      for (let i = rockets.length - 1; i >= 0; i--) {
        const rk = rockets[i];
        const done = updateRocket(rk);
        drawRocket(rk);
        if (done) { explode(rk.x, rk.y); rockets.splice(i, 1); }
      }
      // anéis de impacto
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.r += 3.2; f.a -= 0.05;
        if (f.a <= 0) { flashes.splice(i, 1); continue; }
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7);
        ctx.strokeStyle = `rgba(255,200,130,${f.a})`; ctx.lineWidth = 2; ctx.stroke();
      }
      // fogos
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.vy += 0.045; sp.vx *= 0.99; sp.vy *= 0.99;
        sp.x += sp.vx; sp.y += sp.vy; sp.life -= sp.dec;
        if (sp.life <= 0) { sparks.splice(i, 1); continue; }
        ctx.globalAlpha = Math.max(sp.life, 0);
        ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, 7);
        ctx.fillStyle = sp.c; ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener('resize', resize);
  }

  /* -------- carrossel de slides -------- */
  function startSlides(root) {
    let i = 0;
    const tag = root.querySelector('#introTag');
    const title = root.querySelector('#introTitle');
    const lead = root.querySelector('#introLead');
    const dots = [...root.querySelectorAll('#introDots i')];
    const apply = (n) => {
      i = n;
      [tag, title, lead].forEach((el) => { el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap'); });
      tag.textContent = SLIDES[i].tag;
      title.innerHTML = SLIDES[i].title;
      lead.textContent = SLIDES[i].lead;
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
    };
    dots.forEach((d) => d.addEventListener('click', () => { apply(+d.dataset.i); restart(); }));
    const tick = () => apply((i + 1) % SLIDES.length);
    const restart = () => { clearInterval(slideTimer); slideTimer = setInterval(tick, 4000); };
    restart();
  }

  function show({ onStart, onSignIn }) {
    const root = document.getElementById('intro-root');
    root.innerHTML = html();
    animate(root.querySelector('#introCanvas'));
    startSlides(root);

    const go = (fn) => { destroy(); fn(); };
    root.querySelector('#introStart').onclick = () => go(onStart);
    root.querySelector('#introSignin').onclick = () => go(onSignIn);
    root.querySelector('#introLogin').onclick = () => go(onSignIn);
    root.querySelector('#introSkip').onclick = () => go(onSignIn);
  }

  function destroy() {
    if (raf) cancelAnimationFrame(raf), raf = null;
    if (slideTimer) clearInterval(slideTimer), slideTimer = null;
    if (onResize) window.removeEventListener('resize', onResize), onResize = null;
    const root = document.getElementById('intro-root');
    if (root) root.innerHTML = '';
  }

  return { show, destroy };
})();
