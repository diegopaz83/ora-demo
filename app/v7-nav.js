/* ORA v7 — Navegación por método: el menú son las etapas (Resumen + 6 secciones con pestañas).
   Las vistas existentes no cambian: cada sección agrupa vistas/etapas como pestañas. */
(function () {
  const C = window.ORA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, L = I.L, tx = I.tx, ic = U.ic, A = U.act;
  const R = () => U.render();

  // sección → pestañas [vista, etapa, etiqueta]
  U.SECS = () => [
    { k: 'scope', n: 1, icon: 'gear', name: L('Alcance', 'Scope'), help: L('Cliente, equipo y procesos críticos que se evaluarán.', 'Client, team and the critical processes to assess.'), st: [1, 2],
      tabs: [['wizard', 1, L('Cliente y equipo', 'Client and team')], ['wizard', 2, L('Procesos críticos', 'Critical processes')]] },
    { k: 'plant', n: 2, icon: 'map', name: L('Planta', 'Plant'), help: L('Áreas, sistemas OT, activos y dependencias de la instalación.', 'Areas, OT systems, assets and dependencies of the facility.'), st: [3],
      tabs: [['wizard', 3, L('Por proceso y área', 'By process and area'), 'list'], ['wizard', 3, L('Base instalada y ciclo de vida', 'Installed base and lifecycle'), 'base'], ['inventory', 0, L('Inventario OT', 'OT inventory')]] },
    { k: 'quest', n: 3, icon: 'check', name: L('Cuestionario', 'Questionnaire'), help: L('Preguntas por proceso, área y sistema.', 'Questions by process, area and system.'), st: [4], tabs: [['wizard', 4, L('Cuestionario', 'Questionnaire')]] },
    { k: 'evid', n: 4, icon: 'camera', name: L('Evidencias', 'Evidence'), help: L('Fotos y documentos que respaldan cada dato.', 'Photos and documents backing each data point.'), st: [5], tabs: [['wizard', 5, L('Evidencias', 'Evidence')]] },
    { k: 'risk', n: 5, icon: 'flag', name: L('Riesgos y oportunidades', 'Risks & opportunities'), help: L('Hallazgos, escenarios y oportunidades de mejora.', 'Findings, scenarios and improvement opportunities.'), st: [6], tabs: [['wizard', 6, L('Riesgos y oportunidades', 'Risks & opportunities')]] },
    { k: 'res', n: 6, icon: 'radar', name: L('Resultados', 'Results'), help: L('Tablero, Risk Journey e informe para el cliente.', 'Dashboard, Risk Journey and the client report.'), st: [7],
      tabs: [['dash', 0, L('Tablero', 'Dashboard')], ['journey', 0, 'Risk Journey'], ['wizard', 7, L('Informe', 'Report')]] }];
  U.secOf = (view, stage) => { if (view === 'summary') return 'sum'; const s = U.SECS().find(s => s.tabs.some(t => t[0] === view && (view !== 'wizard' || t[1] === stage))); return s ? s.k : null; };
  const tabOn = t => C.S.ui.view === t[0] && (t[0] !== 'wizard' || C.S.ui.stage === t[1]) && (!t[3] || (C.S.ui.s3mode || 'list') === t[3]);

  // estado agregado de una sección a partir de las etapas del método
  U.secState = function (ev, s) {
    const sts = s.st.map(n => ev.stages[n - 1]);
    const states = sts.map(x => x.state);
    const state = states.every(x => x === 'complete') ? 'complete' : states.includes('blocked') ? 'blocked' : states.includes('review') ? 'review' : states.includes('evidence') ? 'evidence' : states.every(x => x === 'none') ? 'none' : 'progress';
    const pend = sts.reduce((n, x) => n + x.items.filter(i => i.sev !== 'sug').length, 0);
    const done = sts.reduce((n, x) => n + x.done + x.phDone, 0), total = sts.reduce((n, x) => n + x.total + x.phTotal, 0);
    return { state, pend, done, total, pct: total ? Math.round(done / total * 100) : 0 };
  };
  // propuestas pendientes por sección (lo completa el motor de propuestas)
  U.secProps = (a, k) => (U.propCount ? U.propCount(a, k) : 0);
  const stIc = st => st === 'complete' ? ic('check', 'sm') : st === 'blocked' ? ic('alert', 'sm') : '';

  // ---------- Menú lateral ----------
  U.side = function (a, ev) {
    const v = C.S.ui.view, cs = U.secOf(v, C.S.ui.stage); const me = C.me();
    const item = (view, icon, label, extra, on) => `<button data-act="nav" data-view="${view}" title="${h(label)}" ${on ? 'aria-current="page"' : ''}>${ic(icon)}<span class="n-lbl">${label}</span>${extra || ''}</button>`;
    const secBtn = s => { const ss = U.secState(ev, s); const np = U.secProps(a, s.k);
      return `<button class="v7-ns st-${ss.state}" data-act="v7-sec" data-sec="${s.k}" title="${h(s.name)}" ${cs === s.k ? 'aria-current="page"' : ''}><span class="v7-nn">${ss.state === 'complete' ? ic('check', 'sm') : s.n}</span><span class="n-lbl">${s.name}</span>${np ? `<span class="nb ai" title="${L('Propuestas por revisar', 'Proposals to review')}">${np}</span>` : ss.pend ? `<span class="nb" title="${L('Pendientes', 'Pending')}">${ss.pend}</span>` : ''}</button>`; };
    return `<aside class="side" aria-label="${L('Menú principal', 'Main menu')}">
      <div class="side-logo"><span class="side-mark" aria-hidden="true">o</span><img src="assets/logo-white.png" alt="Omnicon"><span class="wm">risk<br><b>assessment</b></span><button class="side-close" data-act="nav-close" aria-label="${L('Cerrar menú', 'Close menu')}">${ic('x')}</button></div>
      <nav class="nav">
        ${item('home', 'home', C.isAdmin() ? L('Todos los assessments', 'All assessments') : L('Mis assessments', 'My assessments'), '', v === 'home')}
        ${a ? `<div class="nav-label">${L('Assessment abierto', 'Open assessment')}</div>
        <button class="side-case v7-sc" data-act="nav" data-view="summary" ${v === 'summary' ? 'aria-current="page"' : ''}><b>${h(tx(a.cfg.plant) || L('Nuevo assessment', 'New assessment'))}</b><div class="sbar"><i style="width:${ev.pct}%"></i></div><span>${ev.pct} % · ${h(C.modName(C.mod(a)))} · ${h(a.code)}</span></button>
        ${item('summary', 'home', L('Resumen', 'Overview'), '', v === 'summary')}
        <div class="v7-nsecs">${U.SECS().map(secBtn).join('')}</div>` : ''}
        <div class="nav-label">${L('Administración', 'Administration')}</div>
        ${C.can('library') ? item('config', 'list', L('Biblioteca y plantillas', 'Library & templates'), '', v === 'config') : ''}
        ${item('settings', 'gear', L('Ajustes', 'Settings'), '', v === 'settings')}
      </nav>
      <div class="side-foot">
        <button class="side-user" data-act="user-menu" title="${h(me.name)}">${U.av(me.id, 'sm')}<span class="s-lbl"><b>${h(me.name)}</b><small>${C.roleName(me)}</small></span></button>
        <button class="side-collapse" data-act="side-toggle" title="${C.S.ui.sideMin ? L('Expandir menú', 'Expand menu') : L('Contraer menú', 'Collapse menu')}">${ic('collapse')}<span class="n-lbl">${L('Contraer menú', 'Collapse menu')}</span></button>
        <div class="side-ver">v0.4 · DEMO</div>
      </div></aside>`;
  };

  // ---------- Barra superior: título de sección y equipo ----------
  const top0 = U.top;
  U.top = function (a, ev) {
    let html = top0(a, ev); const v = C.S.ui.view; if (!a || !['wizard', 'dash', 'journey', 'inventory', 'team', 'summary', 'field'].includes(v)) return html;
    const k = U.secOf(v, C.S.ui.stage); const s = U.SECS().find(x => x.k === k);
    const title = v === 'summary' ? L('Resumen', 'Overview') : v === 'team' ? L('Equipo e historial', 'Team & history') : s ? s.n + '. ' + s.name : '';
    html = html.replace(/<strong>[\s\S]*?<\/strong>/, `<strong>${h(title)}</strong>`);
    const ids = [a.leadId, ...(a.team || []).filter(x => x !== a.leadId)].filter(Boolean);
    const team = `<button class="v7-team" data-act="nav" data-view="team" title="${L('Equipo e historial', 'Team & history')}" aria-label="${L('Equipo e historial', 'Team & history')}" ${v === 'team' ? 'aria-current="page"' : ''}>${U.stack(ids.slice(0, 4))}${ids.length > 4 ? `<small>+${ids.length - 4}</small>` : ''}</button>`;
    void team; return html; // el equipo se abre desde el Resumen, no desde la barra superior
  };

  // ---------- Encabezado de sección (pasos + pestañas) ----------
  U.secHead = function (a, ev) {
    const k = U.secOf(C.S.ui.view, C.S.ui.stage); const secs = U.SECS(); const s = secs.find(x => x.k === k); if (!s) return '';
    const steps = secs.map(x => { const ss = U.secState(ev, x); return `<button class="v7-stp st-${ss.state} ${x.k === k ? 'on' : ''}" data-act="v7-sec" data-sec="${x.k}" ${x.k === k ? 'aria-current="step"' : ''} title="${h(x.name)} · ${C.STATE_LBL[ss.state]}"><i>${ss.state === 'complete' ? ic('check', 'sm') : x.n}</i><span>${x.name}</span></button>`; }).join('<b class="v7-sep" aria-hidden="true"></b>');
    const tabs = s.tabs.length > 1 ? `<div class="v7-tabs" role="tablist">${s.tabs.map(t => `<button role="tab" data-act="v7-tab" data-view="${t[0]}" data-stage="${t[1]}" ${t[3] ? `data-mode="${t[3]}"` : ''} aria-selected="${tabOn(t)}">${t[2]}</button>`).join('')}</div>` : '';
    return `<nav class="v7-steps" aria-label="${L('Etapas del assessment', 'Assessment stages')}">${steps}</nav>${tabs}`;
  };
  const wz0 = U.views.wizard;
  U.views.wizard = function (a, ev) { const html = wz0.apply(this, arguments); return html.replace(/<nav class="steps"[\s\S]*?<\/nav>/, U.secHead(a, ev)).replace(/<div class="wk-mode">[\s\S]*?<\/div><\/div>/, ''); };
  ['inventory', 'dash', 'journey'].forEach(v => { const f0 = U.views[v]; U.views[v] = function (a, ev) { return U.secHead(a, ev || U.ev) + f0.apply(this, arguments); }; });

  // ---------- Acciones ----------
  const goView = (view, stage) => { U.closeModal(); C.S.ui.view = view; if (view === 'wizard') C.S.ui.stage = C.S.ui.wzStage = stage; U.navOpen = false; C.save(); R(); const m = document.querySelector('.main'); if (m) m.scrollTop = 0; };
  const PROP_TAB = { scope: 1, plant: 0 };
  A['v7-sec'] = el => { const s = U.SECS().find(x => x.k === el.dataset.sec); if (!s) return; const a = C.cur(); const hasP = a && U.propCount && U.propCount(a, s.k) && PROP_TAB[s.k] != null; const last = (C.S.ui.secTab || {})[s.k]; const t = s.tabs[hasP ? PROP_TAB[s.k] : last != null && s.tabs[last] ? last : 0]; if (t[3]) C.S.ui.s3mode = t[3]; goView(t[0], t[1]); };
  A['v7-tab'] = el => { const k = U.secOf(el.dataset.view, +el.dataset.stage); const s = U.SECS().find(x => x.k === k); const i = s ? s.tabs.findIndex(t => t[0] === el.dataset.view && (t[0] !== 'wizard' || t[1] === +el.dataset.stage) && (!t[3] || t[3] === el.dataset.mode)) : 0; if (el.dataset.mode) C.S.ui.s3mode = el.dataset.mode; (C.S.ui.secTab = C.S.ui.secTab || {})[k] = i; goView(el.dataset.view, +el.dataset.stage); };
  // abrir un assessment lleva al Resumen
  A.open = el => { C.S.activeId = el.dataset.id; C.S.ui.view = 'summary'; U.navOpen = false; C.save(); C.hydratePhotos(C.cur()).then(R); R(); const m = document.querySelector('.main'); if (m) m.scrollTop = 0; };
})();
