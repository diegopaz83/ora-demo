/* ORA v7 — Resumen del assessment: siguiente paso, etapas, calidad del dato y lo que más importa. */
(function () {
  const C = window.ORA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, L = I.L, tx = I.tx, ic = U.ic, A = U.act;
  const pl = (n, s, p) => n + ' ' + (n === 1 ? s : p);

  // calidad del dato: Propuesto / Aceptado / Verificado sobre el inventario vigente (+ propuestas de omnIA pendientes)
  U.dataQuality = function (a) {
    const c = { prop: 0, acc: 0, ver: 0 };
    [['area', a.areas], ['system', a.systems], ['asset', a.assets], ['dep', a.deps]].forEach(([k, l]) => (l || []).forEach(x => {
      const m = C.mat(a, k, x); if (m === 'descartado') return;
      if (m === 'sugerido') c.prop++; else if (m === 'aceptado') c.acc++; else c.ver++; }));
    c.prop += U.propCount ? U.propCount(a) : 0;
    c.tot = c.prop + c.acc + c.ver; c.okPct = c.tot ? Math.round((c.acc + c.ver) / c.tot * 100) : 0; c.verPct = c.tot ? Math.round(c.ver / c.tot * 100) : 0;
    return c;
  };
  U.dqBar = function (c, big) {
    const seg = (k, n, l) => n ? `<i class="dq-${k}" style="flex:${n}" title="${l}: ${n}"></i>` : '';
    return `<div class="v7-dq ${big ? 'big' : ''}"><div class="v7-dqb">${c.tot ? seg('prop', c.prop, L('Propuesto', 'Proposed')) + seg('acc', c.acc, L('Aceptado', 'Accepted')) + seg('ver', c.ver, L('Verificado', 'Verified')) : '<i class="dq-none" style="flex:1"></i>'}</div>
      <div class="v7-dql"><span><i class="dq-prop"></i>${L('Propuesto', 'Proposed')} <b>${c.prop}</b></span><span><i class="dq-acc"></i>${L('Aceptado', 'Accepted')} <b>${c.acc}</b></span><span><i class="dq-ver"></i>${L('Verificado', 'Verified')} <b>${c.ver}</b></span></div></div>`;
  };

  function nextStep(a, ev) {
    const secs = U.SECS();
    const withProps = secs.map(s => ({ s, n: U.propCount ? U.propCount(a, s.k) : 0 })).filter(x => x.n).sort((x, y) => y.n - x.n);
    if (withProps.length) { const x = withProps[0]; return { k: L('Propuestas de omnIA', 'omnIA proposals'), t: L(`${x.s.name} tiene ${pl(x.n, 'propuesta', 'propuestas')} por revisar`, `${x.s.name} has ${pl(x.n, 'proposal', 'proposals')} to review`), d: L('Acéptalas, edítalas o recházalas: nada entra al análisis sin tu decisión.', 'Accept, edit or reject them: nothing enters the analysis without your decision.'), btn: `<button class="btn primary" data-act="v7-sec" data-sec="${x.s.k}">${L('Revisar', 'Review')}${ic('chev', 'sm')}</button>`, ai: true }; }
    if (U.ingestCTA && !(a.sources || []).length && !(a.props || []).length && !a.areas.length) return { k: L('Empieza aquí', 'Start here'), t: L('Dale a omnIA tus entrevistas, notas y documentos', 'Give omnIA your interviews, notes and documents'), d: L('Prepara un primer borrador del assessment con la fuente de cada dato. Tú decides qué entra.', 'It drafts the assessment with the source of every data point. You decide what goes in.'), btn: `<button class="btn primary" data-act="ing-open">${ic('spark', 'sm')}${L('Iniciar con omnIA', 'Start with omnIA')}</button>`, ai: true };
    const st = ev.stages.find(s => s.items.some(i => i.sev !== 'sug'));
    if (st) { const nx = st.items.filter(i => i.sev !== 'sug').sort((x, y) => C.SEV_ORDER[x.sev] - C.SEV_ORDER[y.sev])[0]; const s = secs.find(x => x.st.includes(st.n));
      return { k: s ? s.n + '. ' + s.name : st.name, t: nx.title, d: nx.reason, btn: `<button class="btn primary" data-act="go" data-stage="${st.n}" data-target="${h(nx.target || '')}">${L('Ir', 'Go')}${ic('chev', 'sm')}</button>` }; }
    return { k: L('Todo al día', 'All up to date'), t: L('El assessment está listo para presentar resultados', 'The assessment is ready to present results'), d: L('Revisa el tablero y genera el informe para el cliente.', 'Review the dashboard and generate the client report.'), btn: `<button class="btn primary" data-act="v7-sec" data-sec="res">${ic('radar', 'sm')}${L('Ver resultados', 'See results')}</button>` };
  }

  U.views.summary = function (a, ev) {
    const ns = nextStep(a, ev); const dq = U.dataQuality(a);
    const cards = U.SECS().map(s => { const ss = U.secState(ev, s); const np = U.propCount ? U.propCount(a, s.k) : 0;
      return `<button class="v7-scard st-${ss.state}" data-act="v7-sec" data-sec="${s.k}">
        <span class="v7-sch"><i class="v7-scn">${ss.state === 'complete' ? ic('check', 'sm') : s.n}</i><span class="pill ${ss.state === 'complete' ? 'ok' : ss.state === 'blocked' ? 'err' : ss.state === 'none' ? '' : 'pri'}">${C.STATE_LBL[ss.state]}</span></span>
        <b>${s.name}</b><small>${s.help}</small>
        <span class="v7-scm"><span class="pbar"><i style="width:${ss.pct}%"></i></span><em>${ss.pct} %</em></span>
        <span class="v7-scf">${np ? `<span class="v7-chip ai">${ic('spark', 'sm')}${pl(np, L('propuesta', 'proposal'), L('propuestas', 'proposals'))}</span>` : ''}${ss.pend ? `<span class="v7-chip warn">${pl(ss.pend, L('pendiente', 'pending'), L('pendientes', 'pending'))}</span>` : ''}${!np && !ss.pend ? `<span class="v7-chip ok">${L('Al día', 'Up to date')}</span>` : ''}</span></button>`; }).join('');
    const lv = { Alto: 0, Medio: 1, Bajo: 2 };
    const top = (a.scenarios || []).map(s => ({ s, l: C.LEVEL(s.C, s.P) })).filter(x => x.l).sort((x, y) => lv[x.l] - lv[y.l]).slice(0, 3);
    const risks = top.length ? `<ol class="v7-top">${top.map(({ s, l }) => `<li><button data-act="go" data-stage="6" data-target="scn-${h(s.id)}">${U.lv(l)}<span><b>${h(tx(s.title))}</b><small>${h(C.procName(a, s.proc))}</small></span>${ic('chev', 'sm')}</button></li>`).join('')}</ol>`
      : `<div class="v7-empty">${ic('flag')}<span>${L('Los riesgos principales aparecerán cuando evalúes escenarios en «Riesgos y oportunidades».', 'Top risks will appear once you assess scenarios in “Risks & opportunities”.')}</span></div>`;
    const expo = U.expoCard ? U.expoCard(a, 'sum') : '';
    const ids = [a.leadId, ...(a.team || []).filter(x => x !== a.leadId)].filter(Boolean);
    return `<section class="v7-hero"><div class="v7-ht"><span class="eyebrow">${h(a.code)} · ${h(C.modName(C.mod(a)))}</span><h1>${h(tx(a.cfg.plant) || L('Nuevo assessment', 'New assessment'))}</h1><p>${h(tx(a.cfg.client) || L('Cliente por definir', 'Client to be defined'))}</p>
        <button class="v7-hteam" data-act="nav" data-view="team">${U.stack(ids)}<small>${L('Equipo e historial', 'Team & history')}</small></button></div>
        <div class="v7-hp"><div class="v7-hpn"><b>${ev.pct}</b><small>%</small></div><span>${L('Avance del método', 'Method progress')}</span><small>${ev.done}/${ev.total} ${L('criterios', 'criteria')}</small></div></section>
      <section class="v7-next ${ns.ai ? 'ai' : ''}"><span class="v7-nk">${ns.ai ? ic('spark', 'sm') : ic('chev', 'sm')}${h(ns.k)}</span><div><b>${h(ns.t)}</b><p>${h(ns.d || '')}</p></div>${ns.btn}</section>
      ${U.ingestCTA ? U.ingestCTA(a, ev) : ''}
      <h2 class="v7-h2">${L('Etapas del método', 'Method stages')}</h2>
      <div class="v7-scards">${cards}</div>
      <div class="v7-g2">
        <section class="box"><div class="box-head"><h3>${L('Calidad del dato', 'Data quality')}</h3>${U.info ? U.info(L('Propuesto: lo sugiere el catálogo u omnIA, aún no cuenta. Aceptado: una persona confirmó que existe y entra al análisis. Verificado: confirmado en planta o con evidencia; sube la confianza de los resultados.', 'Proposed: suggested by the catalog or omnIA, not counted yet. Accepted: a person confirmed it exists and it enters the analysis. Verified: confirmed on site or with evidence; it raises confidence in the results.')) : ''}</div>
          <div class="box-body">${U.dqBar(dq, true)}<p class="v7-dqs">${dq.tot ? L(`<b>${dq.okPct} %</b> del inventario cuenta para el análisis y <b>${dq.verPct} %</b> está verificado.`, `<b>${dq.okPct}%</b> of the inventory counts for the analysis and <b>${dq.verPct}%</b> is verified.`) : L('Aún no hay inventario.', 'No inventory yet.')}</p></div></section>
        <section class="box"><div class="box-head"><h3>${L('Lo que más importa', 'What matters most')}</h3></div><div class="box-body">${expo}${risks}</div></section>
      </div>`;
  };
  // la nueva vista vive dentro del assessment abierto
  const r0 = U.render;
  U.render = function () { if (C.S.ui.view === 'summary' && !C.cur()) C.S.ui.view = 'home'; return r0.apply(this, arguments); };
  // crear un assessment lleva al Resumen
  const nc0 = A['new-create']; A['new-create'] = function () { nc0.apply(this, arguments); if (C.cur() && C.S.ui.view === 'wizard') { C.S.ui.view = 'summary'; C.save(); U.render(); } };

  // ⓘ: ayuda bajo demanda que se abre al tocar (globo en escritorio, hoja inferior en celular)
  U.info = (txt, title) => `<button class="v7-i" data-act="v7-info" data-t="${h(title || '')}" data-x="${h(txt)}" aria-label="${L('Más información', 'More information')}">i</button>`;
  A['v7-info'] = el => {
    document.querySelectorAll('.v7-pop').forEach(x => x.remove());
    const pop = document.createElement('div'); pop.className = 'v7-pop'; pop.setAttribute('role', 'dialog');
    pop.innerHTML = `<div class="v7-popc">${el.dataset.t ? `<b>${h(el.dataset.t)}</b>` : ''}${el.dataset.x.split(/\n\n/).map(t => `<p>${h(t)}</p>`).join("")}<button class="btn ghost sm" data-v7close>${L('Entendido', 'Got it')}</button></div>`;
    document.body.appendChild(pop);
    if (innerWidth > 720) { const r = el.getBoundingClientRect(); const c = pop.firstChild; c.style.position = 'fixed'; c.style.left = Math.max(12, Math.min(innerWidth - 332, r.left - 150)) + 'px'; c.style.top = (r.bottom + 8 + 220 > innerHeight ? Math.max(12, r.top - 8 - c.offsetHeight) : r.bottom + 8) + 'px'; } else pop.classList.add('sheet');
    setTimeout(() => pop.addEventListener('click', e => { if (e.target === pop || e.target.closest('[data-v7close]')) pop.remove(); }), 0);
  };
})();
/* ORA v7 — menos texto fijo: las explicaciones de cada sección pasan a un ⓘ que se abre al tocar. */
(function () {
  const U = window.ORA_UI, C = window.ORA, L = window.ORA_I18N.L;
  const r0 = U.render;
  U.render = function () {
    r0.apply(this, arguments);
    if (C.S.ui.view === 'login') return;
    document.querySelectorAll('.main .box').forEach(box => {
      const head = box.querySelector(':scope > .box-head'); if (!head || head.querySelector('.v7-i')) return;
      const texts = [];
      head.querySelectorAll(':scope > p').forEach(p => { if (p.querySelector('button, a, input, select')) return; const t = p.textContent.trim(); if (t) texts.push(t); p.remove(); });
      box.querySelectorAll(':scope > .box-body > p.hint').forEach(p => { if (p.querySelector('button, a, input, select')) return; const t = p.textContent.trim(); if (t) texts.push(t); p.remove(); });
      if (!texts.length) return;
      const t = head.querySelector('h3'); const b = document.createElement('button');
      b.className = 'v7-i'; b.dataset.act = 'v7-info'; b.dataset.t = t ? t.textContent.trim() : ''; b.dataset.x = texts.join('\n\n'); b.setAttribute('aria-label', L('Más información', 'More information')); b.textContent = 'i';
      if (t) t.insertAdjacentElement('afterend', b); else head.prepend(b);
    });
  };
})();
