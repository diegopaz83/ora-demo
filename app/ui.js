/* ORA demo — shell, sign-in, management dashboard, new-assessment flow and 7-stage wizard */
(function () {
  const C = window.ORA, D = window.ORA_DATA, I = window.ORA_I18N;
  const h = C.esc, L = I.L, tx = I.tx;
  const U = { views: {}, act: {}, modal: null, openKeys: new Set() };
  window.ORA_UI = U;
  const ic = (n, cls) => `<svg class="ic ${cls || ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  U.ic = ic;
  U.lv = l => `<span class="lv ${C.lvlClass(l)}">${C.lvlText(l)}</span>`;
  U.phState = st => { const m = { 'capturada': ['cap', 'check'], 'sin foto': ['none', 'alert'], 'justificada': ['just', 'flag'], 'aceptada': ['acc', 'shield'] }[st] || ['none', 'alert']; return `<span class="ph-state ${m[0]}">${ic(m[1], 'sm')}${C.PH_LBL[st]}</span>`; };
  U.opt = (v, l, sel) => `<option value="${h(v)}" ${String(sel) === String(v) ? 'selected' : ''}>${h(l)}</option>`;
  U.toast = function (msg) { document.querySelectorAll('.toast').forEach(x => x.remove()); const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); };
  U.langSwitch = cls => `<div class="seg lang ${cls || ''}" role="group" aria-label="Language / Idioma"><button data-act="lang" data-l="en" aria-pressed="${I.lang === 'en'}">EN</button><button data-act="lang" data-l="es" aria-pressed="${I.lang === 'es'}">ES</button></div>`;
  U.av = (id, cls) => { const u = C.user(id); return u ? `<span class="av ${cls || ''}" title="${h(u.name)}"><img src="assets/faces/${u.id}.jpg" alt="${h(u.name)}"></span>` : `<span class="av ${cls || ''} none" title="${L('Sin asignar', 'Unassigned')}">?</span>`; };
  U.stack = ids => `<span class="stack">${ids.map(id => U.av(id, 'xs')).join('')}</span>`;
  U.dt = (key, summary, body, cls) => `<details class="dt ${cls || ''}" data-open-key="${key}" ${U.openKeys.has(key) ? 'open' : ''}><summary>${summary}</summary><div class="dt-b">${body}</div></details>`;
  const CTX = ['wizard', 'dash', 'journey', 'team', 'inventory', 'summary', 'field'];
  const VIEWS = () => ({ summary: L('Resumen', 'Overview'), home: L('Mis assessments', 'My assessments'), new: L('Nuevo assessment', 'New assessment'), dash: 'Risk Intelligence', journey: 'Risk Journey', inventory: L('Inventario OT', 'OT inventory'), team: L('Equipo e historial', 'Team & history'), config: L('Biblioteca y plantillas', 'Library & templates'), settings: L('Ajustes', 'Settings') });

  U.render = function () {
    const S = C.S, app = document.getElementById('app');
    const main = document.querySelector('.main');
    const keep = { top: main ? main.scrollTop : 0, id: document.activeElement && document.activeElement.id, view: U._lastView };
    if (!C.me()) { S.ui.view = 'login'; app.innerHTML = U.login(); U._lastView = 'login'; return; }
    if (S.ui.view === 'login') S.ui.view = 'home';
    const a = C.cur();
    if (!a && CTX.includes(S.ui.view)) S.ui.view = 'home';
    if (S.ui.view === 'config' && !C.can('library')) S.ui.view = 'home';
    const ev = a ? C.evaluate(a) : null; U.ev = ev;
    const body = (U.views[S.ui.view] || U.views.home)(a, ev);
    app.innerHTML = `<div class="shell ${U.navOpen ? 'nav-open' : ''} ${S.ui.sideMin ? 'side-min' : ''}" id="shell">${U.side(a, ev)}<div class="work">${U.top(a, ev)}<main class="main v-${S.ui.view}" id="main"><div class="main-in">${body}</div></main></div></div>${U.navOpen ? `<button class="navscrim" data-act="nav-close" aria-label="${L('Cerrar menú', 'Close menu')}"></button>` : ''}`;
    const m2 = document.querySelector('.main');
    if (keep.view === S.ui.view + ':' + S.ui.stage) m2.scrollTop = keep.top;
    U._lastView = S.ui.view + ':' + S.ui.stage;
    if (keep.id) { const el = document.getElementById(keep.id); if (el && el.focus) el.focus({ preventScroll: true }); }
    if (U.after) { const f = U.after; U.after = null; f(); }
  };

  // ---------- Sign-in (simulated) ----------
  U.login = function () {
    const row = u => `<button class="choice" data-act="login" data-id="${u.id}">${U.av(u.id)}<span><b>${h(u.name)}</b><span class="d">${C.roleName(u)}</span></span><span class="pill ${u.role === 'admin' ? 'nv' : 'pri'}">${u.role === 'admin' ? L('Todo el portafolio', 'Full portfolio') : L('Sus assessments', 'Own assessments')}</span></button>`;
    return `<section class="landing" aria-label="Operational Risk Assessment">
      <div class="brand"><div class="brand-photo" aria-hidden="true"></div>
        <div class="row" style="justify-content:space-between"><img class="brand-logo" src="assets/logo-white.png" alt="Omnicon">${U.langSwitch('on-dark')}</div>
        <div class="brand-copy">
          <span class="eyebrow"><span class="wm">operational <b>risk</b> assessment</span></span>
          <h1>${L('Riesgo operacional, <b>con evidencia.</b>', 'Operational risk, <b>backed by evidence.</b>')}</h1>
          <p>${L('De los procesos críticos a los escenarios de falla: cada hallazgo trazable a una respuesta, un activo y una evidencia, y un informe ejecutivo listo para decidir.', 'From critical processes to failure scenarios: every finding traceable to an answer, an asset and a piece of evidence, and an executive report ready for decisions.')}</p>
          <div class="brand-chain" aria-label="${L('Ciclo del servicio', 'Service cycle')}"><span>${L('Alcance', 'Scope')}</span><i></i><span>${L('Recorrido', 'Walkdown')}</span><i></i><span>${L('Cuestionario', 'Questionnaire')}</span><i></i><span>${L('Evaluación', 'Assessment')}</span><i></i><span>${L('Informe', 'Report')}</span></div>
        </div>
        <p class="brand-foot">© 2026 Omnicon S.A.S. · Smart Manufacturing · Automation · ${L('Consultoría', 'Consulting')}</p>
      </div>
      <div class="access"><div class="access-card">
        <div class="access-head"><span class="demo-chip">${ic('info', 'sm')}${L('Acceso simulado · usuarios de demostración', 'Simulated sign-in · demo users')}</span><h2>${L('Ingresar', 'Sign in')}</h2><p>${L('Elija con quién entrar. Cada persona ve los assessments donde participa; el administrador ve todo.', 'Choose who to enter as. Each person sees the assessments they take part in; the administrator sees everything.')}</p></div>
        <div class="roles">${C.USERS.map(row).join('')}</div>
        <p class="access-foot">${L('En producción el acceso será con la cuenta corporativa (Microsoft Entra ID). Aquí no hay autenticación real: nombres y fotos provienen de Kairos Ecosistema.', 'In production, access will use the corporate account (Microsoft Entra ID). There is no real authentication here: names and photos come from Kairos Ecosistema.')}</p>
      </div></div></section>`;
  };

  // ---------- Shell ----------
  U.side = function (a, ev) {
    const v = C.S.ui.view, st = C.S.ui.stage;
    const item = (view, icon, label, extra, stage) => { const on = v === view && (!stage || st === stage) && !(view === 'wizard' && !stage && (st === 5 || st === 7)); return `<button data-act="nav" data-view="${view}" ${stage ? `data-stage="${stage}"` : ''} title="${label}" ${on ? 'aria-current="page"' : ''}>${ic(icon)}<span class="n-lbl">${label}</span>${extra || ''}</button>`; };
    const nb = ev ? C.pendCount(ev) : 0; const me = C.me();
    return `<aside class="side" aria-label="${L('Menú principal', 'Main menu')}">
      <div class="side-logo"><span class="side-mark" aria-hidden="true">o</span><img src="assets/logo-white.png" alt="Omnicon"><span class="wm">risk<br><b>assessment</b></span><button class="side-close" data-act="nav-close" aria-label="${L('Cerrar menú', 'Close menu')}">${ic('x')}</button></div>
      <nav class="nav">
        ${item('home', 'home', C.isAdmin() ? L('Todos los assessments', 'All assessments') : L('Mis assessments', 'My assessments'))}
        ${a ? `<div class="nav-label">${L('Assessment abierto', 'Open assessment')}</div>
        <div class="side-case"><b>${h(tx(a.cfg.plant) || L('Nuevo assessment', 'New assessment'))}</b><div class="sbar"><i style="width:${ev.pct}%"></i></div><span>${ev.pct} % · ${h(C.modName(C.mod(a)))} · ${h(a.code)}</span></div>
        ${item('wizard', 'steps', 'Wizard', nb ? `<span class="nb" title="${L('Pendientes', 'Pending')}">${nb}</span>` : '')}
        ${item('inventory', 'list', L('Inventario OT', 'OT inventory'), (() => { const n = ['areas', 'systems', 'assets', 'deps'].reduce((s, k) => s + a[k].filter(x => C.mat(a, k === 'areas' ? 'area' : k === 'systems' ? 'system' : k === 'assets' ? 'asset' : 'dep', x) === 'sugerido').length, 0); return n ? `<span class="nb sug" title="${L('Sugeridos por validar', 'Suggested to validate')}">${n}</span>` : ''; })())}
        ${item('wizard', 'camera', L('Evidencias', 'Evidence'), '', 5)}
        ${item('dash', 'radar', 'Risk Intelligence')}
        ${item('journey', 'map', 'Risk Journey')}
        ${item('wizard', 'doc', L('Informe PDF', 'PDF report'), '', 7)}
        ${item('team', 'users', L('Equipo e historial', 'Team & history'))}` : ''}
        <div class="nav-label">${L('Administración', 'Administration')}</div>
        ${C.can('library') ? item('config', 'list', L('Biblioteca y plantillas', 'Library & templates')) : ''}
        ${item('settings', 'gear', L('Ajustes', 'Settings'))}
      </nav>
      <div class="side-foot">
        <button class="side-user" data-act="user-menu" title="${h(me.name)}">${U.av(me.id, 'sm')}<span class="s-lbl"><b>${h(me.name)}</b><small>${C.roleName(me)}</small></span></button>
        <button class="side-collapse" data-act="side-toggle" title="${C.S.ui.sideMin ? L('Expandir menú', 'Expand menu') : L('Contraer menú', 'Collapse menu')}">${ic('collapse')}<span class="n-lbl">${L('Contraer menú', 'Collapse menu')}</span></button>
        <div class="side-ver">v0.3 · DEMO</div>
      </div></aside>`;
  };

  U.top = function (a, ev) {
    const v = C.S.ui.view; const ctx = a && CTX.includes(v);
    let title = VIEWS()[v] || '', sub = 'Omnicon · Operational Risk Assessment';
    if (v === 'home' && C.isAdmin()) title = L('Todos los assessments', 'All assessments');
    if (ctx) sub = a.code + ' · ' + (tx(a.cfg.plant) || L('Sin instalación', 'No facility'));
    if (v === 'wizard') { const s = C.STAGES[C.S.ui.stage - 1]; title = s.n + '/7 · ' + s.name; }
    const r = 17, cf = 2 * Math.PI * r;
    return `<header class="top">
      <button class="menu-btn" data-act="${U.navOpen ? 'nav-close' : 'nav-open'}" aria-label="${U.navOpen ? L('Cerrar menú', 'Close menu') : L('Abrir menú', 'Open menu')}" aria-expanded="${!!U.navOpen}">${ic(U.navOpen ? 'x' : 'menu')}</button>
      <div class="crumb"><small>${h(sub)}</small><strong>${h(title)}</strong></div>
      <div class="top-right">
        ${ctx ? `<span class="saved" title="${L('Borrador guardado en este navegador', 'Draft saved in this browser')}"><i></i>${C.storageOK ? L('Guardado ', 'Saved ') + (C.S.savedAt ? new Date(C.S.savedAt).toLocaleTimeString(I.loc(), { hour: '2-digit', minute: '2-digit' }) : '') : L('Sin persistencia', 'Not persisted')}</span>
        <div class="ring ${ev.pct >= 100 ? 'full' : ''} ${U._ringPct !== ev.pct ? 'anim' : ''}" title="${ev.done} / ${ev.total} ${L('criterios', 'criteria')}" role="img" aria-label="${L('Avance', 'Progress')} ${ev.pct} %" style="--p:${ev.pct}"><svg viewBox="0 0 44 44" aria-hidden="true"><defs><linearGradient id="ring-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--bright)"/><stop offset="1" stop-color="var(--cyan)"/></linearGradient></defs><circle class="rt" cx="22" cy="22" r="18" pathLength="100"/><circle class="rp" cx="22" cy="22" r="18" pathLength="100"/></svg><span><i><b>${ev.pct}</b><small>%</small></i></span></div>${(U._ringPct = ev.pct, '')}` : ''}
        ${v === 'wizard' && a ? `<button class="btn soft sm" data-act="capture" aria-label="${L('Capturar foto', 'Capture photo')}">${ic('camera')}<span class="lbl-hide">${L('Foto', 'Photo')}</span></button>
        <button class="btn ghost sm" data-act="finding" aria-label="${L('Registrar hallazgo', 'Record finding')}">${ic('flag')}<span class="lbl-hide">${L('Hallazgo', 'Finding')}</span></button>` : ''}
        <button class="user-btn" data-act="user-menu" aria-label="${L('Cuenta', 'Account')}: ${h(C.me().name)}">${U.av(C.me().id, 'sm')}</button>
      </div></header>`;
  };

  // ---------- Management dashboard ----------
  U.views.home = function () {
    const S = C.S, me = C.me(), admin = C.isAdmin();
    const all = C.visible().map(a => ({ a, ev: C.evaluate(a) }));
    const hf = S.ui.hf || 'all', hind = S.ui.hind || '';
    let list = all.filter(x => hf === 'lead' ? x.a.leadId === me.id : hf === 'team' ? (x.a.team || []).includes(me.id) : hf === 'open' ? x.a.reportStatus !== 'Aprobado' : true).filter(x => !hind || x.a.cfg.industry === hind);
    const pendMine = all.reduce((n, x) => n + C.pendCount(x.ev), 0);
    const kp = (v, l, d) => `<div class="hk"><b>${v}</b><span>${l}</span><small>${d}</small></div>`;
    const card = ({ a, ev }) => {
      const cur = ev.stages.find(s => s.state !== 'complete') || ev.stages[6]; const pc = C.pendCount(ev);
      const ind = D.INDUSTRIES.find(i => i.key === a.cfg.industry) || {};
      return `<article class="acard ${a.id === S.activeId ? 'on' : ''}">
        <header><div class="as-ic">${ind.icon ? `<img src="${ind.icon}" alt="">` : ic('steps')}</div><div class="ac-t"><b>${h(tx(a.cfg.plant) || L('Assessment sin nombre', 'Untitled assessment'))}</b><span>${h(tx(a.cfg.client) || L('Cliente por definir', 'Client to be defined'))} · ${h(a.code)}</span></div><span class="pill ${a.reportStatus === 'Aprobado' ? 'ok' : 'pri'}">${a.reportStatus === 'Aprobado' ? L('Informe aprobado', 'Report approved') : C.STATE_LBL[cur.state === 'complete' ? 'complete' : 'progress']}</span></header>
        <dl class="ac-meta"><div><dt>${L('Industria', 'Industry')}</dt><dd>${h(tx(ind.name || ''))}</dd></div><div><dt>${L('Modalidad', 'Modality')}</dt><dd>${h(C.modName(C.mod(a)))}</dd></div><div><dt>${L('Etapa actual', 'Current stage')}</dt><dd>${cur.n}. ${h(cur.name)}</dd></div><div><dt>${L('Pendientes', 'Pending')}</dt><dd>${pc ? `<span class="pill warn">${pc}</span>` : `<span class="pill ok">0</span>`}</dd></div></dl>
        <div class="ac-prog"><div class="pbar"><i style="width:${ev.pct}%"></i></div><span><b>${ev.pct} %</b> · ${ev.done}/${ev.total} ${L('criterios', 'criteria')}</span></div>
        <div class="ac-people"><div class="ac-lead">${U.av(a.leadId, 'sm')}<span><small>${L('Responsable', 'Lead')}</small><b>${h(C.uname(a.leadId) || L('Sin asignar', 'Unassigned'))}</b></span></div><div class="ac-team">${(a.team || []).length ? U.stack(a.team) : ''}<small>${(a.team || []).length} ${L('evaluadores', 'assessors')}</small></div></div>
        <footer><span class="small mut">${admin ? '' : C.myRole(a) + ' · '}${L('Actualizado', 'Updated')} ${C.fmtDate(a.updated, true)}</span><span class="row" style="gap:8px">${C.canAssign(a) ? `<button class="btn ghost sm" data-act="assign" data-id="${a.id}">${ic('users', 'sm')}${L('Asignar', 'Assign')}</button>` : ''}<button class="btn primary sm" data-act="open" data-id="${a.id}">${ev.done ? L('Continuar', 'Continue') : L('Iniciar', 'Start')}${ic('chev', 'sm')}</button></span></footer>
      </article>`;
    };
    const chips = [['all', admin ? L('Todos', 'All') : L('Todos los míos', 'All mine')], ['lead', L('Soy responsable', 'I lead')], ['team', L('Soy evaluador', 'I assess')], ['open', L('Sin aprobar', 'Not approved')]].map(([k, l]) => `<button class="chip" data-act="hf" data-f="${k}" aria-pressed="${hf === k}">${l}</button>`).join('');
    return `<section class="home-hero"><div><span class="eyebrow">${admin ? L('Vista global · Administrador', 'Global view · Administrator') : L('Vista personal · Ingeniero ejecutor', 'Personal view · Field engineer')}</span><h1>${L('Hola, ', 'Hello, ')}${h(me.name.split(' ')[0])}</h1><p>${admin ? L('Todos los assessments de Omnicon, su responsable, equipo y avance.', 'Every Omnicon assessment, with its lead, team and progress.') : L('Los assessments donde usted es responsable, evaluador o creador.', 'The assessments where you are lead, assessor or creator.')}</p></div>
        ${C.can('create') ? `<button class="btn cyan" data-act="new">${ic('plus')}${L('Nuevo assessment', 'New assessment')}</button>` : ''}
        <div class="hks">${kp(all.length, L('Assessments', 'Assessments'), admin ? L('en el portafolio', 'in the portfolio') : L('donde participo', 'I take part in'))}${kp(all.filter(x => x.a.leadId === me.id).length, L('Como responsable', 'As lead'), L('asignación por assessment', 'per-assessment assignment'))}${kp(pendMine, L('Pendientes', 'Pending items'), L('requeridos, en total', 'required, in total'))}${kp(all.filter(x => x.a.reportStatus === 'Aprobado').length + '/' + all.length, L('Informes aprobados', 'Reports approved'), L('aprobados / assessments', 'approved / assessments'))}</div></section>
      <div class="row" style="justify-content:space-between"><div class="row" role="group" aria-label="${L('Filtrar', 'Filter')}" style="gap:6px">${chips}</div><div class="field" style="min-width:200px"><label class="sr" for="hind">${L('Industria', 'Industry')}</label><select id="hind" data-cfgui="hind">${U.opt('', L('Todas las industrias', 'All industries'), hind)}${D.INDUSTRIES.map(i => U.opt(i.key, tx(i.name), hind)).join('')}</select></div></div>
      ${list.length ? `<div class="acards">${list.map(card).join('')}</div>` : `<div class="empty">${ic('steps')}<b>${all.length ? L('Ningún assessment con este filtro', 'No assessments match this filter') : L('Aún no participa en ningún assessment', 'You are not part of any assessment yet')}</b><span>${C.can('create') ? L('Cree uno nuevo o pida al administrador que lo asigne a un equipo.', 'Create a new one or ask the administrator to assign you to a team.') : L('Pida al administrador que lo asigne a un equipo.', 'Ask the administrator to assign you to a team.')}</span></div>`}
      <p class="hint">${L('DEMO · datos ilustrativos. Las fotos, hallazgos y evidencias se registran siempre dentro de un assessment abierto.', 'DEMO · illustrative data. Photos, findings and evidence are always recorded inside an open assessment.')}</p>`;
  };

  // ---------- New assessment: modality first, then setup ----------
  U.views.new = function () {
    const d = U.draft || (U.draft = { step: 1, modality: null, industry: 'oilgas', leadId: C.S.userId, team: [] });
    const lib = C.S.lib;
    const steps = `<ol class="nsteps"><li class="${d.step === 1 ? 'on' : 'done'}"><i>${d.step === 1 ? 1 : '✓'}</i>${L('Modalidad', 'Modality')}</li><li class="${d.step === 2 ? 'on' : ''}"><i>2</i>${L('Cliente, alcance y equipo', 'Client, scope and team')}</li></ol>`;
    if (d.step === 1) {
      const cards = Object.values(lib.modalities).map(m => `<button class="mcard ${d.modality === m.key ? 'on' : ''}" data-act="new-mod" data-m="${m.key}"><span class="mc-img" style="background-image:url(${m.img || D.MODALITIES[m.key].img})"><span class="mc-dur">${h(C.modDur(m))}</span></span><span class="mc-b"><b>${h(C.modName(m))}</b><span class="mc-d">${h(tx(m.desc))}</span><span class="mc-k">${L('Alcance', 'Scope')}</span><span class="mc-s">${h(tx(m.scope || D.MODALITIES[m.key].scope))}</span><span class="mc-k">${L('Entregables', 'Deliverables')}</span><ul>${(m.out || D.MODALITIES[m.key].out).map(o => `<li>${ic('check', 'sm')}${h(tx(o))}</li>`).join('')}<li>${ic('check', 'sm')}${L('Hoja de ruta de mitigación priorizada', 'Prioritized mitigation roadmap')}</li></ul><span class="mc-go">${L('Elegir ', 'Choose ')}${h(C.modName(m))}${ic('chev', 'sm')}</span></span></button>`).join('');
      return `<div class="hello"><div><h1>${L('Nuevo assessment', 'New assessment')}</h1><p>${L('Primero elija la modalidad. Las tres comparten metodología; cambian el alcance, la profundidad y los entregables.', 'Choose the modality first. All three share the methodology; scope, depth and deliverables differ.')}</p></div><button class="btn ghost" data-act="nav" data-view="home">${L('Cancelar', 'Cancel')}</button></div>
        ${steps}<div class="mcards">${cards}</div>
        <p class="hint">${L('Definiciones tomadas de la propuesta de modalidades v0.1 (pendiente de validación comercial). La modalidad puede cambiarse después en la etapa 1.', 'Definitions taken from the modalities proposal v0.1 (pending commercial validation). The modality can be changed later in stage 1.')}</p>`;
    }
    const m = lib.modalities[d.modality];
    const f = (k, l, ph, ta) => `<div class="field"><label for="nw-${k}">${l}</label>${ta ? `<textarea id="nw-${k}" placeholder="${h(ph || '')}">${h(d[k] || '')}</textarea>` : `<input id="nw-${k}" value="${h(d[k] || '')}" placeholder="${h(ph || '')}">`}</div>`;
    const execs = C.USERS;
    return `<div class="hello"><div><h1>${L('Nuevo assessment', 'New assessment')} · ${h(C.modName(m))}</h1><p>${h(C.modDur(m))}. ${L('Puede dejar campos vacíos: quedarán como pendientes en la etapa 1.', 'You may leave fields empty: they will show as pending in stage 1.')}</p></div><button class="btn ghost" data-act="nav" data-view="home">${L('Cancelar', 'Cancel')}</button></div>
      ${steps}
      <section class="box"><div class="box-head"><h3>${L('Cliente e instalación', 'Client and facility')}</h3></div><div class="box-body"><div class="grid2">${f('client', L('Cliente', 'Client'), L('Nombre del cliente', 'Client name'))}${f('plant', L('Instalación', 'Facility'), L('Planta o estación', 'Plant or station'))}</div>
        <div class="grid2"><div class="field"><label for="nw-industry">${L('Industria', 'Industry')}</label><select id="nw-industry">${D.INDUSTRIES.map(i => U.opt(i.key, tx(i.name), d.industry)).join('')}</select><span class="hint">${L('Carga los procesos sugeridos de la plantilla sectorial.', 'Loads the suggested processes from the industry template.')}</span></div>${f('contact', L('Contraparte del cliente', 'Client counterpart'))}</div></div></section>
      <section class="box"><div class="box-head"><h3>${L('Alcance', 'Scope')}</h3></div><div class="box-body">${f('scope', L('Alcance', 'Scope'), L('Procesos y áreas incluidos en esta evaluación', 'Processes and areas included in this assessment'), true)}${f('exclusions', L('Exclusiones y restricciones', 'Exclusions and constraints'), L('p. ej. sin acceso a lógica PLC ni pruebas intrusivas', 'e.g. no PLC logic access or intrusive testing'), true)}</div></section>
      <section class="box"><div class="box-head"><h3>${L('Responsable y equipo', 'Lead and team')}</h3><p>${L('El responsable es una asignación de este assessment, no un rol. Puede reasignarse después.', 'The lead is an assignment for this assessment, not a role. It can be reassigned later.')}</p></div><div class="box-body">
        <div class="field" style="max-width:360px"><label for="nw-lead">${L('Responsable', 'Lead')}</label><select id="nw-lead" ${C.can('assign') ? '' : 'disabled'}>${execs.map(u => U.opt(u.id, u.name + ' · ' + C.roleName(u), d.leadId)).join('')}</select></div>
        <div class="field"><span class="lbl">${L('Evaluadores', 'Assessors')}</span><div class="people-pick">${execs.map(u => `<label class="pp ${u.id === d.leadId ? 'is-lead' : ''}"><input type="checkbox" class="nw-team" value="${u.id}" ${d.team.includes(u.id) && u.id !== d.leadId ? 'checked' : ''} ${u.id === d.leadId ? 'disabled' : ''}>${U.av(u.id, 'sm')}<span class="pp-n">${h(u.name)}<em class="pp-tag">${L('Responsable', 'Lead')}</em></span></label>`).join('')}</div></div></div></section>
      <div class="stage-nav"><button class="btn ghost" data-act="new-back">${ic('back')}${L('Modalidad', 'Modality')}</button><button class="btn primary" data-act="new-create">${L('Crear y abrir el wizard', 'Create and open the wizard')}${ic('chev')}</button></div>`;
  };

  // ---------- Wizard ----------
  U.views.wizard = function (a, ev) {
    const n = C.S.ui.stage; const st = ev.stages; const STG = C.STAGES; const s = st[n - 1];
    const steps = st.map(x => { const cls = { none: 's-none', progress: 's-progress', complete: 's-complete', review: 's-review', blocked: 's-blocked', evidence: 's-evidence' }[x.state];
      return `<button class="stp ${cls}" data-act="stage" data-stage="${x.n}" ${x.n === n ? 'aria-current="step"' : ''} title="${x.name}: ${C.STATE_LBL[x.state]} · ${x.done + x.phDone}/${x.total + x.phTotal}"><i>${x.state === 'complete' ? ic('check', 'sm') : x.n}</i><span><b>${x.name}</b><small>${C.STATE_LBL[x.state]}</small></span></button>`; }).join('');
    const items = s.items.slice().sort((x, y) => C.SEV_ORDER[x.sev] - C.SEV_ORDER[y.sev]); const nx = items[0];
    const allPend = C.pendCount(ev);
    const tot = s.total + s.phTotal, dn = s.done + s.phDone;
    const nextAct = nx ? `<button class="next-act" data-act="go" data-stage="${n}" data-target="${h(nx.target || '')}"><span class="na-k">${L('Siguiente acción', 'Next action')}</span><span class="na-t"><b>${h(nx.title)}</b><span>${h(nx.reason)}</span></span><span class="na-go">${L('Ir', 'Go')}${ic('chev', 'sm')}</span></button>`
      : `<div class="next-act done"><span class="na-k">${ic('check', 'sm')}${L('Etapa al día', 'Stage up to date')}</span><span class="na-t"><b>${n < 7 ? L('Continúe con ', 'Continue with ') + STG[n].name : L('Assessment listo para informe', 'Assessment ready for report')}</b></span></div>`;
    const prev = n > 1 ? `<button class="btn ghost" data-act="stage" data-stage="${n - 1}">${ic('back')}<span class="lbl-hide">${STG[n - 2].name}</span></button>` : '<span></span>';
    const next = n < 7 ? `<button class="btn primary" data-act="stage" data-stage="${n + 1}"><span>${L('Continuar', 'Continue')}<span class="lbl-hide">: ${STG[n].name}</span></span>${ic('chev')}</button>` : `<button class="btn primary" data-act="nav" data-view="dash">${ic('radar')}Risk Intelligence</button>`;
    return `<nav class="steps" aria-label="${L('Etapas del assessment', 'Assessment stages')}">${steps}</nav>
      <section class="stage-card"><div class="sc-main"><h2>${s.name}</h2><p>${U.stageHelp()[n]}</p></div>
        <div class="sc-meter"><div class="sc-num"><b>${dn}</b><span>/ ${tot}</span></div><div><div class="pbar"><i style="width:${tot ? dn / tot * 100 : 0}%"></i></div><small>${L('criterios de esta etapa', 'criteria in this stage')}${s.phTotal ? ' · ' + L('evidencia ', 'evidence ') + s.phDone + '/' + s.phTotal : ''}</small></div><span class="pill ${s.state === 'complete' ? 'ok' : s.state === 'blocked' ? 'err' : s.state === 'evidence' ? 'warn' : s.state === 'review' ? 'vio' : 'pri'}">${C.STATE_LBL[s.state]}</span></div>
        ${nextAct}</section>
      <div class="wz-body">${U.stage[n](a, ev, s)}</div>
      <div class="wz-foot">${prev}<button class="btn ${allPend ? 'warnb' : 'ghost'}" data-act="pend-open">${ic('list')}<span class="lbl-hide">${L('Pendientes', 'Pending')}</span> <b>${allPend}</b></button>${next}</div>`;
  };
  U.stageHelp = () => ({
    1: L('Confirme modalidad, cliente, alcance y equipo. La modalidad define el núcleo de preguntas y los entregables.', 'Confirm modality, client, scope and team. The modality sets the core questions and deliverables.'),
    2: L('Decida qué procesos se evalúan y por qué. Cada decisión queda registrada con autor y fecha.', 'Decide which processes are assessed and why. Each decision is recorded with author and date.'),
    3: L('Recorra por proceso y área. Registre activos, fotos y hallazgos donde los ve; las fotos pendientes no bloquean.', 'Walk by process and area. Record assets, photos and findings where you see them; pending photos do not block.'),
    4: L('Responda lo esencial. Las preguntas de profundización aparecen solo cuando el contexto lo amerita.', 'Answer the essentials. Follow-up questions appear only when context calls for them.'),
    5: L('Revise la cobertura sugerida y la galería. Una justificación explica la ausencia, no la reemplaza.', 'Review suggested coverage and the gallery. A justification explains an absence; it does not replace it.'),
    6: L('Clasifique cada escenario con consecuencia y probabilidad justificadas. Sin datos, queda pendiente.', 'Rate each scenario with justified consequence and likelihood. Without data, it stays pending.'),
    7: L('Revise, apruebe y genere el informe PDF con los mismos datos del dashboard.', 'Review, approve and generate the PDF report from the same data as the dashboard.')
  });

  // pending drawer content (What I have / What's missing)
  U.rail = function (a, ev) {
    const f = C.S.ui.pf || 'all';
    let items = ev.stages.flatMap(s => s.items);
    if (f === 'stage') items = items.filter(i => i.stage === C.S.ui.stage);
    if (f === 'photo') items = items.filter(i => /req-|ph-/.test(i.target || '') || i.stage === 5);
    items.sort((x, y) => C.SEV_ORDER[x.sev] - C.SEV_ORDER[y.sev] || x.stage - y.stage);
    const sevTxt = { block: L('Bloquea', 'Blocking'), imp: L('Requerido', 'Required'), rev: L('Por revisar', 'To review'), sug: L('Sugerido', 'Suggested') };
    const list = items.length ? items.map(i => `<button class="pend" data-act="go" data-stage="${i.stage}" data-target="${h(i.target || '')}"><span class="sv ${i.sev}" aria-hidden="true"></span><span><b>${h(i.title)}</b><span>${L('Etapa', 'Stage')} ${i.stage} · ${sevTxt[i.sev]} · ${h(i.reason)}</span></span><span class="go">${L('Ir', 'Go')}</span></button>`).join('') : `<div class="note-info">${ic('check')}<span>${L('Sin pendientes en este filtro.', 'Nothing pending in this filter.')}</span></div>`;
    const m = C.metrics(a);
    return `<div class="pbar"><i style="width:${ev.pct}%"></i></div><p class="small mut">${ev.done} ${L('de', 'of')} ${ev.total} ${L('criterios verificables (respuestas esenciales + evidencia fotográfica). Visitar una etapa no la completa.', 'verifiable criteria (essential answers + photo evidence). Visiting a stage does not complete it.')}</p>
      <div class="sec-title">${L('Qué tengo', 'What I have')}</div>
      <div class="have"><div><b>${m.inc.length}</b><span>${L('procesos incluidos', 'processes included')}</span></div><div><b>${a.assets.length}</b><span>${L('activos', 'assets')} · ${a.deps.length} ${L('dependencias', 'dependencies')}</span></div><div><b>${m.appDone}/${m.appTotal}</b><span>${L('preguntas respondidas', 'questions answered')}</span></div><div><b>${a.photos.length}</b><span>${L('fotos', 'photos')} · ${m.reqOk}/${m.reqTotal} ${L('cobertura', 'coverage')}</span></div><div><b>${a.findings.length}</b><span>${L('hallazgos', 'findings')}</span></div><div><b>${a.scenarios.length}</b><span>${L('escenarios', 'scenarios')} · ${m.lv.Pendiente} ${L('pendientes', 'pending')}</span></div></div>
      <div class="row" style="justify-content:space-between"><div class="sec-title">${L('Qué me falta', 'What’s missing')} · ${items.length}</div><div class="row" role="group" style="gap:6px"><button class="chip" data-act="pf" data-f="all" aria-pressed="${f === 'all'}">${L('Todos', 'All')}</button><button class="chip" data-act="pf" data-f="stage" aria-pressed="${f === 'stage'}">${L('Esta etapa', 'This stage')}</button><button class="chip" data-act="pf" data-f="photo" aria-pressed="${f === 'photo'}">${L('Fotos', 'Photos')}</button></div></div>
      <div class="pend-list">${list}</div>`;
  };

  U.stage = {};
  U.people = function (a) {
    return `<div class="team-row"><div class="ac-lead">${U.av(a.leadId)}<span><small>${L('Responsable', 'Lead')}</small><b>${h(C.uname(a.leadId) || L('Sin asignar', 'Unassigned'))}</b></span></div>
      <div class="ac-lead"><span class="row" style="gap:0">${(a.team || []).length ? U.stack(a.team) : U.av(null, 'sm')}</span><span><small>${L('Evaluadores', 'Assessors')}</small><b>${(a.team || []).map(id => C.uname(id).split(' ')[0]).join(', ') || L('Ninguno', 'None')}</b></span></div>
      <div class="ac-lead">${U.av(a.creator, 'sm')}<span><small>${L('Creado por', 'Created by')}</small><b>${h(C.uname(a.creator))}</b></span></div>
      ${C.canAssign(a) ? `<button class="btn ghost sm" data-act="assign" data-id="${a.id}">${ic('users', 'sm')}${L('Asignar o reasignar', 'Assign or reassign')}</button>` : `<span class="small mut">${L('Solo el responsable o el administrador asignan', 'Only the lead or the administrator assigns')}</span>`}</div>`;
  };
  U.stage[1] = function (a) {
    const c = a.cfg, lib = C.S.lib;
    const fld = (k, l, req, type, ph) => `<div class="field ${req && !(c[k] || '').trim() ? 'miss' : ''}"><label for="f-${k}">${l}${req ? ' <span class="req">*</span>' : ''}</label>${type === 'ta' ? `<textarea id="f-${k}" data-f="cfg.${k}" placeholder="${h(ph || '')}">${h(tx(c[k]))}</textarea>` : `<input id="f-${k}" data-f="cfg.${k}" value="${h(tx(c[k]))}" placeholder="${h(ph || '')}">`}</div>`;
    const mods = Object.values(lib.modalities).map(m => `<button class="modopt" data-act="modality" data-m="${m.key}" aria-pressed="${c.modality === m.key}"><b>${h(C.modName(m))}</b><span>${h(C.modDur(m))}</span><small>${L('Núcleo', 'Core')}: ${m.key === 'custom' ? (c.customCount || m.count) : m.count} ${L('preguntas', 'questions')}</small></button>`).join('');
    return `<section class="box"><div class="box-head"><h3>${L('Modalidad', 'Modality')}</h3><span class="pill">${L('Biblioteca', 'Library')} v${a.libVersion} · ${L('plantilla', 'template')} ${h(C.indName(c.industry))} v${a.templateVersion || lib.templates[c.industry].version}</span></div>
      <div class="box-body"><div class="modopts">${mods}</div>
      ${c.modality === 'custom' ? `<div class="field" style="max-width:260px"><label for="f-customCount">${L('Núcleo de preguntas (Custom)', 'Core questions (Custom)')}</label><input id="f-customCount" type="number" min="1" max="60" data-f="cfg.customCount" value="${h(c.customCount)}"></div>` : ''}
      <p class="hint">${L('Cambiar la modalidad recalcula las preguntas aplicables y conserva las respuestas. Las cantidades son de demostración, no límites contractuales.', 'Changing the modality recalculates applicable questions and keeps answers. Counts are demo values, not contractual limits.')}</p></div></section>
      <section class="box"><div class="box-head"><h3>${L('Cliente e instalación', 'Client and facility')}</h3></div>
      <div class="box-body"><div class="grid2">${fld('client', L('Cliente', 'Client'), true)}${fld('plant', L('Instalación', 'Facility'), true)}</div>
      <div class="grid2"><div class="field"><label for="f-industry">${L('Industria', 'Industry')} <span class="req">*</span></label><select id="f-industry" data-f="cfg.industry">${D.INDUSTRIES.map(i => U.opt(i.key, tx(i.name), c.industry)).join('')}</select></div>${fld('contact', L('Contraparte del cliente', 'Client counterpart'), false)}</div></div></section>
      <section class="box"><div class="box-head"><h3>${L('Alcance', 'Scope')}</h3></div><div class="box-body">
      ${fld('scope', L('Alcance', 'Scope'), true, 'ta', L('Procesos y áreas incluidos en esta evaluación', 'Processes and areas included in this assessment'))}
      ${fld('exclusions', L('Exclusiones y restricciones', 'Exclusions and constraints'), false, 'ta', L('p. ej. sin acceso a lógica PLC ni pruebas intrusivas', 'e.g. no PLC logic access or intrusive testing'))}</div></section>
      <section class="box" id="f-lead"><div class="box-head"><h3>${L('Equipo', 'Team')}</h3><button class="btn ghost sm" data-act="nav" data-view="team">${L('Ver historial', 'View history')}</button></div><div class="box-body">${U.people(a)}</div></section>`;
  };

  U.stage[2] = function (a) {
    const stI = { incluido: ['check', L('Incluido', 'Included')], fuera: ['x', L('Fuera del alcance', 'Out of scope')], na: ['slash', L('No aplica', 'Not applicable')] };
    const rows = a.processes.map(p => {
      const ph = { incluido: L('Por qué es crítico: impacto de una interrupción, tolerancia, contratos', 'Why it is critical: interruption impact, tolerance, contracts'), fuera: L('Por qué queda fuera del alcance', 'Why it is out of scope'), na: L('Explique por qué no existe en esta instalación (obligatorio)', 'Explain why it does not exist at this facility (required)'), desconocido: L('Qué falta para confirmarlo y quién puede hacerlo', 'What is needed to confirm it and who can do it') }[p.status] || '';
      const btn = k => `<button class="pbtn ${k}" data-act="proc-status" data-k="${p.key}" data-v="${k}" aria-pressed="${p.status === k}">${ic(stI[k][0], 'sm')}${stI[k][1]}</button>`;
      return `<article class="pcard st-${p.status || 'none'}" id="proc-${p.key}">
        <div class="pc-top"><div><h4>${h(tx(p.name))}</h4><p>${h(tx(p.desc || ''))}</p><div class="ir-chips">${U.prov(p.prov || 'manual')}${U.mat(C.mat(a, 'process', p))}${p.name0 ? `<span class="small mut">${L('Adaptado de', 'Adapted from')} «${h(tx(p.name0))}»</span>` : ''}</div></div>${!p.status ? `<span class="pill warn">${L('Por decidir', 'To decide')}</span>` : p.status === 'desconocido' ? `<span class="pill vio">${L('Desconocido', 'Unknown')}</span>` : ''}</div>
        <div class="pc-actions" role="group" aria-label="${h(tx(p.name))}">${btn('incluido')}${btn('fuera')}${btn('na')}<button class="plink" data-act="proc-status" data-k="${p.key}" data-v="desconocido" aria-pressed="${p.status === 'desconocido'}">${L('Aún no se sabe', 'Not known yet')}</button><button class="plink" data-act="proc-adapt" data-k="${p.key}">${L('Adaptar nombre', 'Adapt name')}</button></div>
        ${p.status ? `<div class="pc-fields ${p.status === 'incluido' ? 'two' : ''}">
          <div class="field ${!p.just.trim() ? 'miss' : ''}"><label for="pj-${p.key}">${p.status === 'na' ? L('Explicación de «No aplica» *', '“Not applicable” explanation *') : L('Justificación *', 'Justification *')}</label><textarea id="pj-${p.key}" data-f="proc.${p.key}.just" placeholder="${h(ph)}">${h(tx(p.just))}</textarea></div>
          ${p.status === 'incluido' ? `<div class="field ${!p.crit ? 'miss' : ''}"><label for="pc-${p.key}">${L('Criticidad del proceso *', 'Process criticality *')}</label><select id="pc-${p.key}" data-f="proc.${p.key}.crit">${U.opt('', L('Seleccione', 'Select'), p.crit)}${['Alta', 'Media', 'Baja'].map(x => U.opt(x, tx(x), p.crit)).join('')}</select><span class="hint">${L('No es el nivel de riesgo.', 'Not the risk level.')}</span></div>` : ''}</div>
          <p class="trace">${ic('clock', 'sm')}${L('Decisión registrada por', 'Decision recorded by')} ${h(p.by || C.uname(a.leadId) || '—')}${p.ts ? ' · ' + C.fmtDate(p.ts, true) : ''}${p.status === 'desconocido' ? ' · ' + L('brecha de información, no equivale a «No aplica»', 'information gap, not the same as “Not applicable”') : ''}</p>` : ''}
      </article>`;
    }).join('');
    const cnt = k => a.processes.filter(p => p.status === k).length;
    return `<div class="crit" id="proc-list"><span>${L('Incluidos', 'Included')} <b>${cnt('incluido')}</b></span><span>${L('Fuera del alcance', 'Out of scope')} <b>${cnt('fuera')}</b></span><span>${L('No aplica', 'Not applicable')} <b>${cnt('na')}</b></span><span>${L('Desconocidos', 'Unknown')} <b>${cnt('desconocido')}</b></span><span>${L('Por decidir', 'To decide')} <b>${a.processes.filter(p => !p.status).length}</b></span></div>
      ${a.cfg.modality === 'light' ? `<div class="note-info">${ic('info')}<span>${L('Light evalúa procesos críticos seleccionados; los hallazgos no representan toda la planta.', 'Light assesses selected critical processes; findings do not represent the whole plant.')}</span></div>` : ''}
      <div class="pcards">${rows || `<div class="empty">${L('Sin procesos en la plantilla.', 'No processes in template.')}</div>`}</div>
      ${U.dt('np', ic('plus', 'sm') + L('Agregar un proceso propio de la instalación', 'Add a facility-specific process'), `<div class="row"><div class="field" style="flex:1;min-width:200px"><label for="np-name">${L('Nombre del proceso', 'Process name')}</label><input id="np-name" placeholder="${L('p. ej. Inyección de químicos', 'e.g. Chemical injection')}"></div><button class="btn primary sm" data-act="add-proc" style="align-self:flex-end">${L('Agregar', 'Add')}</button></div>`)}`;
  };

  U.stage[3] = function (a, ev) {
    const inc = C.included(a);
    if (!inc.length) return `<div class="empty">${ic('alert')}<b>${L('Etapa bloqueada', 'Stage blocked')}</b><span>${L('Incluya al menos un proceso crítico en la etapa 2 para planear el recorrido.', 'Include at least one critical process in stage 2 to plan the walkdown.')}</span><button class="btn primary sm" data-act="stage" data-stage="2">${L('Ir a Procesos críticos', 'Go to Critical processes')}</button></div>`;
    const reqs = ev.reqs; const sh = C.sharedControllers(a);
    const spof = sh.map(x => `<div class="alert-spof">${ic('branch')}<div><b>${L('Dependencia común detectada: ', 'Common dependency detected: ')}${h(x.pumps.map(p => p.tag).join(L(' y ', ' and ')))} ${L('dependen de', 'depend on')} ${h(x.plc.tag)}.</b><p class="small">${L('La redundancia mecánica no implica redundancia del control. Se activaron preguntas condicionales; esto no clasifica el riesgo como alto por sí solo.', 'Mechanical redundancy does not imply control redundancy. Conditional questions were triggered; this alone does not rate the risk as high.')}</p><button class="btn ghost sm" data-act="stage" data-stage="4" style="margin-top:8px">${L('Ver preguntas activadas', 'See triggered questions')}</button></div></div>`).join('');
    const assetRow = x => { const r = reqs.find(q => q.key === 'asset:' + x.id);
      return `<div class="arow" id="req-asset-${x.id}"><div class="ar-main"><b>${h(x.tag)}</b><span>${h(tx(x.name))}</span><small>${h(tx(x.type))}${x.sys ? ' · ' + h(C.nodeLbl(a, x.sys)) : ''}</small><div class="ir-chips">${U.prov(x.prov)}${U.mat(C.mat(a, 'asset', x))}${C.recProcs(x).length > 1 ? `<span class="pill vio">${L('Compartido · ', 'Shared · ')}${C.recProcs(x).length} ${L('procesos', 'processes')}</span>` : ''}</div></div>
        <div class="ar-ph">${r ? U.phState(r.status) : `<span class="small mut">${L('Foto opcional', 'Photo optional')}</span>`}${r && r.res && r.status !== 'capturada' ? `<small class="mut">“${h(tx(r.res.note))}”</small>` : ''}</div>
        <div class="ar-act">${r && r.status !== 'capturada' ? `<button class="btn soft sm" data-act="capture" data-link="asset:${x.id}" aria-label="${L('Foto de', 'Photo of')} ${h(x.tag)}">${ic('camera', 'sm')}</button>` : ''}${r && r.status === 'sin foto' ? `<button class="btn ghost sm" data-act="justify" data-key="asset:${x.id}">${L('Sin foto', 'No photo')}</button>` : ''}<button class="btn ghost sm" data-act="finding" data-asset="${x.id}" aria-label="${L('Hallazgo en', 'Finding on')} ${h(x.tag)}">${ic('flag', 'sm')}</button><button class="icon-btn" data-act="iv-decide" data-k="asset" data-id="${x.id}" data-m="descartado" aria-label="${L('Descartar', 'Discard')} ${h(x.tag)}" title="${L('Descartar con motivo', 'Discard with reason')}">${ic('x', 'sm')}</button></div></div>`; };
    const areaCard = ar => { const r = reqs.find(q => q.key === 'area:' + ar.id); const list = a.assets.filter(x => x.area === ar.id && !C.isOut(x));
      return `<div class="area" id="req-area-${ar.id}"><div class="area-h"><div><b>${h(tx(ar.name))}</b> ${C.mat(a, 'area', ar) === 'sugerido' ? U.mat('sugerido') : ''}<small>${list.length} ${L('activos', 'assets')}</small></div><div class="row" style="gap:6px">${r ? U.phState(r.status) : ''}<button class="btn soft sm" data-act="capture" data-link="area:${ar.id}">${ic('camera', 'sm')}${L('Foto', 'Photo')}</button><button class="btn ghost sm" data-act="finding">${ic('flag', 'sm')}${L('Hallazgo', 'Finding')}</button></div></div>
        ${list.map(assetRow).join('') || `<p class="small mut" style="padding:10px 14px">${L('Sin activos en esta área.', 'No assets in this area.')}</p>`}
        ${U.dt('aa-' + ar.id, ic('plus', 'sm') + L('Agregar activo en ', 'Add asset in ') + h(tx(ar.name)), `<div class="grid3"><div class="field"><label for="nx-tag-${ar.id}">TAG *</label><input id="nx-tag-${ar.id}" placeholder="P-101A"></div><div class="field"><label for="nx-name-${ar.id}">${L('Descripción', 'Description')}</label><input id="nx-name-${ar.id}" placeholder="${L('Bomba principal A', 'Main pump A')}"></div><div class="field"><label for="nx-type-${ar.id}">${L('Tipo', 'Type')}</label><select id="nx-type-${ar.id}">${C.assetTypes().map(t => U.opt(t, tx(t))).join('')}</select></div></div>
          <div class="row" style="justify-content:space-between"><div class="field" style="min-width:200px"><label for="nx-ver-${ar.id}">${L('Fuente de la validación', 'Validation source')}</label><select id="nx-ver-${ar.id}">${['campo', 'documento', 'entrevista'].map(t => U.opt(t, C.provName(t))).join('')}</select></div><button class="btn primary sm" data-act="add-asset" data-area="${ar.id}" style="align-self:flex-end">${L('Registrar activo', 'Record asset')}</button></div>`, 'in')}</div>`; };
    const procs = inc.map(p => { const ars = a.areas.filter(x => C.recProcs(x).includes(p.key) && !C.isOut(x));
      return `<section class="box"><div class="box-head"><h3>${h(tx(p.name))}</h3><span class="row" style="gap:6px"><span class="pill">${L('Criticidad', 'Criticality')}: ${h(tx(p.crit) || '—')}</span><span class="small mut">${ars.length} ${L('áreas', 'areas')} · ${a.assets.filter(x => C.assetProcs(x).includes(p.key) && !C.isOut(x)).length} ${L('activos', 'assets')}</span></span></div>
        <div class="areas">${ars.map(areaCard).join('') || `<div class="empty" style="margin:14px">${L('Aún no hay áreas en este proceso. Agregue la primera para empezar el recorrido.', 'No areas in this process yet. Add the first one to start the walkdown.')}</div>`}</div>
        <div class="box-body" style="border-top:1px solid var(--line-2)">${U.dt('na-' + p.key, ic('plus', 'sm') + L('Agregar área', 'Add area'), `<div class="row"><div class="field" style="flex:1;min-width:180px"><label for="na-name-${p.key}">${L('Nombre del área', 'Area name')}</label><input id="na-name-${p.key}" placeholder="${L('p. ej. Casa de bombas', 'e.g. Pump house')}"></div><button class="btn primary sm" data-act="add-area" data-proc="${p.key}" style="align-self:flex-end">${L('Agregar área', 'Add area')}</button></div>`)}</div></section>`; }).join('');
    const deps = a.deps.filter(d => !C.isOut(d)).map(d => `<div class="dep">${U.mat(C.mat(a, 'dep', d))}<code>${h(C.assetLbl(a, d.from))}</code><span class="mut small">${L('depende de', 'depends on')} (${h(C.depName(d.type).toLowerCase())})</span><code>${h(C.assetLbl(a, d.to))}</code><span class="small mut">${h(tx(d.note))}</span><span class="spacer"></span><button class="icon-btn" data-act="iv-decide" data-k="dep" data-id="${d.id}" data-m="descartado" aria-label="${L('Descartar dependencia', 'Discard dependency')}" title="${L('Descartar con motivo', 'Discard with reason')}">${ic('x', 'sm')}</button></div>`).join('');
    const aOpts = `<optgroup label="${L('Activos', 'Assets')}">${a.assets.filter(x => !C.isOut(x)).map(x => U.opt(x.id, x.tag + ' · ' + tx(x.name))).join('')}</optgroup>${a.systems.length ? `<optgroup label="${L('Sistemas OT', 'OT systems')}">${a.systems.filter(x => !C.isOut(x)).map(x => U.opt(x.id, tx(x.name))).join('')}</optgroup>` : ''}`;
    return `${spof}<div id="asset-form" style="display:flex;flex-direction:column;gap:18px">${procs}</div>
      <section class="box" id="dep-form"><div class="box-head"><h3>${L('Dependencias', 'Dependencies')}</h3><span class="small mut">${a.deps.length}</span><p>${L('De qué depende cada activo o sistema OT para operar. Gestione procedencia, validación y descartes en', 'What each asset or OT system needs to operate. Manage provenance, validation and discards in')} <button class="plink" data-act="nav" data-view="inventory">${L('Inventario OT', 'OT inventory')}</button>.</p></div>
        <div>${deps || `<div class="box-body"><div class="empty">${L('Sin dependencias registradas.', 'No dependencies recorded.')}</div></div>`}</div>
        <div class="box-body" style="border-top:1px solid var(--line-2)">${U.dt('nd', ic('link', 'sm') + L('Registrar dependencia', 'Record dependency'), `<div class="grid3"><div class="field"><label for="nd-from">${L('Activo', 'Asset')}</label><select id="nd-from">${aOpts}</select></div><div class="field"><label for="nd-type">${L('Depende de (tipo)', 'Depends on (type)')}</label><select id="nd-type">${D.DEP_TYPES.map(t => U.opt(t, C.depName(t))).join('')}</select></div><div class="field"><label for="nd-to">${L('Activo del que depende', 'Asset it depends on')}</label><select id="nd-to">${aOpts}</select></div></div>
        <div class="row"><div class="field" style="flex:1;min-width:200px"><label for="nd-note">${L('Nota', 'Note')}</label><input id="nd-note" placeholder="${L('p. ej. arranque, parada y permisivos', 'e.g. start, stop and permissives')}"></div><button class="btn primary sm" data-act="add-dep" style="align-self:flex-end">${L('Registrar', 'Record')}</button></div>`)}</div></section>`;
  };

  U.stage[4] = function (a, ev) {
    const app = ev.app; const qf = C.S.ui.qf || 'all';
    const show = x => qf === 'open' ? !C.answerOK(a, x.q) : qf === 'cond' ? x.cond : true;
    const qRow = ({ q, cond, why }) => {
      const r = a.answers[q.id] || {}; const v = r.value;
      const btn = (val, cls) => `<button class="${cls}" data-act="ans" data-q="${q.id}" data-v="${val}" aria-pressed="${v === val}">${tx(val)}</button>`;
      const kids = a.questions.filter(k => k.cond && k.cond.q === q.id && k.active && (k.ind.includes('*') || k.ind.includes(a.cfg.industry)));
      const needNote = v === 'No aplica' && !(r.note || '').trim();
      const phCount = a.photos.filter(p => p.links && p.links.q === q.id).length;
      return `<article class="qc ${cond ? 'cond' : ''} ${C.answerOK(a, q) ? 'ok' : ''}" id="q-${q.id}">
        <div class="q-meta"><code>${q.id}</code><span>${h(tx(q.dim))}</span>${q.proc ? `<span>· ${h(C.procName(a, q.proc))}</span>` : ''}${q.req || cond ? '' : `<span class="pill">${L('Complementaria', 'Supplementary')}</span>`}${q.pol === 'contexto' ? `<span class="pill">${L('Contexto', 'Context')}</span>` : ''}</div>
        <p class="qt">${h(tx(q.text))}</p>${cond ? `<span class="trig">${ic('branch', 'sm')}${h(why)}</span>` : ''}
        <div class="ans" role="group" aria-label="${q.id}">${btn('Sí', 'si')}${btn('No', 'no')}${btn('Desconocido', 'unk')}${btn('No aplica', 'na')}</div>
        ${v ? `<div class="q-extra"><div class="field ${needNote ? 'miss' : ''}"><label for="an-${q.id}">${v === 'No aplica' ? L('Justificación de «No aplica» *', '“Not applicable” justification *') : v === 'Desconocido' ? L('Qué se sabe y cómo verificarlo', 'What is known and how to verify it') : L('Explicación y fuente', 'Explanation and source')}</label><input id="an-${q.id}" data-f="ans.${q.id}.note" value="${h(tx(r.note))}"></div>
          <div class="field"><label for="ac-${q.id}">${L('Confianza', 'Confidence')}</label><select id="ac-${q.id}" data-f="ans.${q.id}.conf">${['Verificado', 'Estimado', 'Desconocido'].map(x => U.opt(x, tx(x), r.conf)).join('')}</select></div></div>
          <div class="q-foot"><span class="trace">${ic('clock', 'sm')}${h(r.by || '—')} · ${C.fmtDate(r.ts, true)}</span>${v === 'Desconocido' ? `<span class="pill vio">${L('Brecha de información · no es riesgo automático', 'Information gap · not automatic risk')}</span>` : ''}${kids.length && !kids.some(k => app.find(x => x.q.id === k.id)) ? `<span class="small mut">${kids.length} ${L('preguntas más si responde', 'more questions if you answer')} ${h(kids[0].cond.in.map(tx).join(L(' o ', ' or ')))}</span>` : ''}<span class="spacer"></span>
          <button class="btn ghost sm" data-act="capture" data-link="q:${q.id}">${ic('camera', 'sm')}${L('Foto', 'Photo')}${phCount ? ' (' + phCount + ')' : ''}</button><button class="btn ghost sm" data-act="finding" data-q="${q.id}">${ic('flag', 'sm')}${L('Hallazgo', 'Finding')}</button></div>` : ''}
      </article>`;
    };
    const base = app.filter(x => !x.cond && show(x)), cond = app.filter(x => x.cond && show(x)); const m = C.mod(a);
    const open = app.filter(x => !C.answerOK(a, x.q)).length;
    return `<div class="row" style="justify-content:space-between"><div class="row" role="group" style="gap:6px">${[['all', L('Todas', 'All') + ' · ' + app.length], ['open', L('Sin responder', 'Unanswered') + ' · ' + open], ['cond', L('Condicionales', 'Conditional') + ' · ' + app.filter(x => x.cond).length]].map(([k, l]) => `<button class="chip" data-act="qf" data-f="${k}" aria-pressed="${qf === k}">${l}</button>`).join('')}</div><span class="small mut">${h(C.modName(m))}: ${L('núcleo de', 'core of')} ${C.modCount(a)} · ${L('biblioteca', 'library')} v${a.libVersion}</span></div>
      ${qf !== 'cond' ? `<h3 class="grp">${L('Núcleo esencial', 'Essential core')}</h3><div class="qcs">${base.map(qRow).join('') || `<div class="empty">${qf === 'open' ? L('Núcleo respondido por completo.', 'Core fully answered.') : L('Sin preguntas aplicables para este alcance.', 'No applicable questions for this scope.')}</div>`}</div>` : ''}
      <h3 class="grp">${L('Ramificaciones condicionales', 'Conditional branches')}</h3><div class="qcs">${cond.map(qRow).join('') || `<div class="empty"><b>${qf === 'open' ? L('Sin condicionales por responder.', 'No conditional questions left.') : L('Ninguna ramificación activa.', 'No active branches.')}</b>${qf === 'open' ? '' : `<span>${L('Aparecen por respuestas, por dependencias registradas en el recorrido o por incertidumbre.', 'They appear from answers, dependencies recorded in the walkdown, or uncertainty.')}</span>`}</div>`}</div>`;
  };

  U.stage[5] = function (a, ev) {
    const reqs = ev.reqs; const R = C.S.lib.photoRules;
    const cnt = k => reqs.filter(r => r.status === k).length;
    const kindL = { area: L('Área', 'Area'), asset: L('Activo', 'Asset'), finding: L('Hallazgo', 'Finding') };
    const rows = reqs.map(r => `<div class="cov-row" id="req-${r.key.replace(':', '-')}"><div><b>${h(r.label)}</b><div class="why">${kindL[r.kind]} · ${h(r.why)} · ${r.have.length}/${r.need}</div>${r.res && r.status !== 'capturada' ? `<div class="jnote"><b>${h(tx(r.res.reason))}:</b> ${h(tx(r.res.note))} <span class="mut">— ${h(r.res.by || '')}</span></div>` : ''}</div>
      <div>${U.phState(r.status)}</div>
      <div class="row" style="gap:6px;justify-content:flex-end">${r.status !== 'capturada' ? `<button class="btn soft sm" data-act="capture" data-link="${r.key}">${ic('camera', 'sm')}${L('Foto', 'Photo')}</button>` : ''}${r.status === 'sin foto' ? `<button class="btn ghost sm" data-act="justify" data-key="${r.key}">${L('Registrar motivo', 'Record reason')}</button>` : ''}${r.status === 'justificada' ? `<button class="btn ghost sm" data-act="accept-exc" data-key="${r.key}">${L('Aceptar excepción', 'Accept exception')}</button>` : ''}${r.status === 'aceptada' ? `<button class="btn ghost sm" data-act="reopen-exc" data-key="${r.key}">${L('Reabrir', 'Reopen')}</button>` : ''}</div></div>`).join('');
    const gf = C.S.ui.gf || 'all';
    let ph = a.photos.slice();
    if (gf === 'report') ph = ph.filter(p => p.inReport);
    if (gf === 'review') ph = ph.filter(p => p.review === 'Por revisar');
    if (gf === 'finding') ph = ph.filter(p => p.links && p.links.finding);
    const gal = ph.map(p => U.photoCard(a, p)).join('');
    return `<div class="crit"><span>${L('Capturadas', 'Captured')} <b>${cnt('capturada')}</b></span><span>${L('Excepciones aceptadas', 'Exceptions accepted')} <b>${cnt('aceptada')}</b></span><span>${L('Por revisar', 'To review')} <b>${cnt('justificada')}</b></span><span>${L('Sin foto ni explicación', 'No photo, no explanation')} <b>${cnt('sin foto')}</b></span></div>
      <section class="box"><div class="box-head"><h3>${L('Galería del assessment', 'Assessment gallery')}</h3>
        <div class="row" style="gap:6px"><div class="row" style="gap:6px">${[['all', L('Todas', 'All')], ['report', L('En informe', 'In report')], ['review', L('Por revisar', 'To review')], ['finding', L('De hallazgos', 'Of findings')]].map(([k, l]) => `<button class="chip" data-act="gf" data-f="${k}" aria-pressed="${gf === k}">${l}</button>`).join('')}</div><button class="btn primary sm" data-act="capture">${ic('camera', 'sm')}${L('Tomar o cargar foto', 'Take or upload photo')}</button></div></div>
        <div class="box-body">${gal ? `<div class="gallery">${gal}</div>` : `<div class="empty">${L('Sin fotos en este filtro.', 'No photos in this filter.')}</div>`}<p class="hint">${L('Almacenamiento', 'Storage')}: ${C.photoStore === 'idb' ? L('IndexedDB, solo en este navegador', 'IndexedDB, this browser only') : L('memoria de la sesión', 'session memory')}. ${L('Las imágenes del caso demo son ilustraciones.', 'Demo case images are illustrations.')}</p></div></section>
      <section class="box"><div class="box-head"><h3>${L('Guía de cobertura', 'Coverage guide')}</h3><p>${L(`Sugerencias configurables: ${R.perArea} por área, ${R.perAsset} por ${R.assetTypes.join(' / ')}, ${R.perFinding} por hallazgo. No son umbrales universales.`, `Configurable suggestions: ${R.perArea} per area, ${R.perAsset} per ${R.assetTypes.map(tx).join(' / ')}, ${R.perFinding} per finding. Not universal thresholds.`)}</p></div><div class="cov">${rows || `<div class="box-body"><div class="empty">${L('Registre áreas, activos o hallazgos para generar sugerencias.', 'Record areas, assets or findings to generate suggestions.')}</div></div>`}</div></section>`;
  };
  U.photoCard = function (a, p) {
    const Lk = p.links || {}; const tags = [];
    if (Lk.area) tags.push(C.areaName(a, Lk.area) || Lk.area);
    if (Lk.asset) tags.push(C.assetLbl(a, Lk.asset));
    if (Lk.q) tags.push(Lk.q); if (Lk.finding) tags.push(Lk.finding); if (Lk.scenario) tags.push(Lk.scenario);
    const url = C.photoURL(p);
    return `<button class="ph" id="ph-${p.id}" data-act="lightbox" data-id="${p.id}"><div class="img">${url ? `<img src="${url}" alt="${h(tx(p.title))}" loading="lazy">` : `<div class="empty" style="height:100%;border:0">${L('Imagen no disponible en este navegador', 'Image not available in this browser')}</div>`}
      <span class="badge pill ${p.review === 'Aprobada' ? 'ok' : 'warn'}">${h(tx(p.review))}</span>${p.inReport ? `<span class="rep pill pri">${L('En informe', 'In report')}</span>` : ''}</div>
      <div class="cap"><b>${h(tx(p.title))}</b><span>${h(p.author)} · ${C.fmtDate(p.ts, true)}</span><div class="links">${tags.map(t => `<span>${h(t)}</span>`).join('')}</div></div></button>`;
  };

  U.stage[6] = function (a) {
    const finds = a.findings.map(f => { const sc = a.scenarios.filter(s => s.findings.includes(f.id)); const n = a.photos.filter(p => p.links && p.links.finding === f.id).length;
      return `<div class="dep" id="finding-${f.id}"><code>${f.id}</code><span style="flex:1;min-width:200px"><b style="font-weight:600">${h(tx(f.title))}</b><br><span class="small mut">${f.q ? f.q + ' · ' : ''}${f.assets.map(x => C.assetLbl(a, x)).join(', ')} · ${n} ${L('foto', 'photo')}${n === 1 ? '' : 's'}${f.by ? ' · ' + h(f.by) : ''}</span></span>${sc.length ? sc.map(s => `<span class="pill pri">${s.id}</span>`).join('') : `<button class="btn soft sm" data-act="scn-from" data-id="${f.id}">${ic('plus', 'sm')}${L('Crear escenario', 'Create scenario')}</button>`}</div>`; }).join('');
    return `<div class="v6-evstack">
      <section class="box"><div class="box-head"><h3>${L('Matriz 3×3 propuesta', 'Proposed 3×3 matrix')}</h3><p>${L('Ordinal, de priorización; no es un cálculo de probabilidad.', 'Ordinal, for prioritization; not a probability calculation.')}</p></div><div class="box-body">${U.matrix(a, a.scenarios, null, 'mx-eval')}</div></section>
      <section class="box"><div class="box-head"><h3>${L('Hallazgos', 'Findings')}</h3><button class="btn ghost sm" data-act="finding">${ic('plus', 'sm')}${L('Hallazgo', 'Finding')}</button></div><div>${finds || `<div class="box-body"><div class="empty">${L('Sin hallazgos. Regístrelos desde el recorrido o el cuestionario.', 'No findings. Record them from the walkdown or the questionnaire.')}</div></div>`}</div></section></div>
      <h3 class="grp">${L('Escenarios de riesgo', 'Risk scenarios')} · ${a.scenarios.length}</h3>
      <div style="display:flex;flex-direction:column;gap:12px">${a.scenarios.map(s => U.scenarioCard(a, s)).join('') || `<div class="empty">${L('Aún no hay escenarios. Cree uno desde un hallazgo o con el formulario de abajo.', 'No scenarios yet. Create one from a finding or with the form below.')}</div>`}</div>
      <section class="box" id="scn-new"><div class="box-head"><h3>${L('Nuevo escenario de riesgo', 'New risk scenario')}</h3></div><div class="box-body">
        <div class="grid2"><div class="field"><label for="ns-title">${L('Evento o modo de falla', 'Event or failure mode')}</label><input id="ns-title" placeholder="${L('p. ej. Falla de la CPU del PLC detiene ambas bombas', 'e.g. PLC CPU failure stops both pumps')}"></div><div class="field"><label for="ns-proc">${L('Proceso afectado', 'Affected process')}</label><select id="ns-proc">${C.included(a).map(p => U.opt(p.key, tx(p.name))).join('')}</select></div></div>
        <div class="row end"><button class="btn primary sm" data-act="add-scn">${ic('plus', 'sm')}${L('Crear escenario', 'Create scenario')}</button></div></div></section>`;
  };
  U.HZ = ['Inmediato (0–30 días)', 'Corto plazo (1–3 meses)', 'Mediano plazo (3–6 meses)', 'Análisis posterior recomendado'];
  U.scenarioCard = function (a, s) {
    const l = C.LEVEL(s.C, s.P);
    const ph = a.photos.filter(p => p.links && (p.links.scenario === s.id || (p.links.finding && s.findings.includes(p.links.finding))));
    const recs = a.recs.filter(r => r.sc.includes(s.id));
    const sel = (f, val) => `<select id="sc-${s.id}-${f}" data-f="scn.${s.id}.${f}">${U.opt('', L('Pendiente', 'Pending'), val)}${[1, 2, 3].map(x => U.opt(x, x + ' · ' + tx(['Baja', 'Media', 'Alta'][x - 1]), val)).join('')}</select>`;
    const ctls = s.controls.map((c, i) => `<div class="ctl"><input class="inp" id="ct-${s.id}-${i}" data-f="ctl.${s.id}.${i}.name" value="${h(tx(c.name))}" aria-label="${L('Control', 'Control')}"><select class="inp" id="cs-${s.id}-${i}" data-f="ctl.${s.id}.${i}.st" aria-label="${L('Estado del control', 'Control status')}">${['Verificado', 'Parcial', 'No verificado', 'Ausente'].map(x => U.opt(x, tx(x), c.st)).join('')}</select><button class="icon-btn" data-act="del-ctl" data-s="${s.id}" data-i="${i}" aria-label="${L('Quitar control', 'Remove control')}">${ic('x', 'sm')}</button></div>`).join('');
    const key = 'scn-' + s.id;
    return `<details class="scn" id="${key}" data-open-key="${key}" ${U.openKeys.has(key) ? 'open' : ''}><summary class="scn-h"><span class="scn-id">${s.id}</span><span class="scn-t"><b>${h(tx(s.title))}</b><small>${h(C.procName(a, s.proc))} · ${s.assets.map(x => C.assetLbl(a, x)).join(', ') || L('sin activos', 'no assets')} · C ${s.C || '—'} · P ${s.P || '—'} · ${s.controls.filter(c => c.st === 'Verificado').length}/${s.controls.length} ${L('controles verificados', 'controls verified')}</small></span>${U.lv(l)}${ic('chev', 'sm caret')}</summary>
      <div class="scn-b">
        <div class="grid2"><div class="field"><label for="sc-${s.id}-cause">${L('Causa', 'Cause')}</label><input id="sc-${s.id}-cause" data-f="scn.${s.id}.cause" value="${h(tx(s.cause))}"></div><div class="field"><label for="sc-${s.id}-cons">${L('Consecuencia', 'Consequence')}</label><input id="sc-${s.id}-cons" data-f="scn.${s.id}.cons" value="${h(tx(s.cons))}"></div></div>
        <div class="cp"><div class="field"><label for="sc-${s.id}-C">${L('Consecuencia (C)', 'Consequence (C)')}</label>${sel('C', s.C)}<textarea id="sc-${s.id}-justC" data-f="scn.${s.id}.justC" placeholder="${L('Justificación obligatoria de C', 'Required justification of C')}">${h(tx(s.justC))}</textarea></div>
          <div class="field"><label for="sc-${s.id}-P">${L('Probabilidad con controles existentes (P)', 'Likelihood with existing controls (P)')}</label>${sel('P', s.P)}<textarea id="sc-${s.id}-justP" data-f="scn.${s.id}.justP" placeholder="${L('Justificación obligatoria de P', 'Required justification of P')}">${h(tx(s.justP))}</textarea></div></div>
        ${!l ? `<div class="note-info">${ic('info')}<span>${L('Pendiente de evaluación: faltan datos para clasificar. No se fuerza una celda de la matriz.', 'Pending assessment: not enough data to rate. No matrix cell is forced.')}</span></div>` : ''}
        <div class="field"><span class="lbl">${L('Controles existentes', 'Existing controls')}</span>${ctls}<div class="row"><input class="inp" id="nc-${s.id}" placeholder="${L('Agregar control', 'Add control')}" style="flex:1;min-width:180px"><button class="btn ghost sm" data-act="add-ctl" data-s="${s.id}">${ic('plus', 'sm')}${L('Control', 'Control')}</button></div></div>
        <div class="grid2"><div class="field"><label for="sc-${s.id}-conf">${L('Confianza de la evaluación', 'Assessment confidence')}</label><select id="sc-${s.id}-conf" data-f="scn.${s.id}.conf">${['Verificado', 'Estimado', 'Desconocido'].map(x => U.opt(x, tx(x), s.conf)).join('')}</select></div>
        <div class="field"><span class="lbl">${L('Evidencia vinculada', 'Linked evidence')}</span><div class="row" style="gap:6px">${ph.map(p => `<button data-act="lightbox" data-id="${p.id}" class="thumb"><img src="${C.photoURL(p)}" alt="${h(tx(p.title))}"></button>`).join('')}<button class="btn ghost sm" data-act="capture" data-link="scenario:${s.id}">${ic('camera', 'sm')}${L('Foto', 'Photo')}</button>${s.findings.map(f => `<span class="pill pri">${f}</span>`).join('')}</div></div></div>
        <div class="field"><span class="lbl">${L('Recomendaciones vinculadas', 'Linked recommendations')}</span>${recs.map(r => `<div class="dep" style="padding:6px 0;border:0"><code>${r.id}</code><span>${h(tx(r.title))}</span><span class="pill">${h(tx(r.hz))}</span></div>`).join('') || `<span class="small mut">${L('Sin recomendaciones.', 'No recommendations.')}</span>`}
          <div class="row"><input class="inp" id="nr-${s.id}" placeholder="${L('Nueva recomendación vinculada', 'New linked recommendation')}" style="flex:1;min-width:200px"><select class="inp" id="nh-${s.id}" style="max-width:240px" aria-label="${L('Horizonte', 'Horizon')}">${U.HZ.map(x => U.opt(x, tx(x))).join('')}</select><button class="btn ghost sm" data-act="add-rec" data-s="${s.id}">${ic('plus', 'sm')}${L('Agregar', 'Add')}</button></div></div>
      </div></details>`;
  };
  U.matrix = function (a, scns, selCell, id) {
    const cells = []; const lb = ['', L('Baja', 'Low'), L('Media', 'Medium'), L('Alta', 'High')];
    for (let p = 3; p >= 1; p--) {
      cells.push(`<div class="h">${lb[p]}</div>`);
      for (let c = 1; c <= 3; c++) { const l = C.LEVEL(c, p); const n = scns.filter(s => s.C === c && s.P === p).length;
        cells.push(`<button class="c ${C.lvlClass(l)} ${n ? '' : 'zero'} ${selCell === c + ',' + p ? 'sel' : ''}" data-act="cell" data-cell="${c},${p}" aria-label="${tx(l)}: ${n}, C${c} P${p}"><b>${n}</b><span>${tx(l)}</span></button>`); }
    }
    const pend = scns.filter(s => !C.LEVEL(s.C, s.P));
    return `<div id="${id}" class="mx-wrap"><div class="mx-y">${L('Probabilidad (con controles)', 'Likelihood (with controls)')}</div><div><div class="mx">${cells.join('')}<div></div>${[1, 2, 3].map(x => `<div class="h">${lb[x]}</div>`).join('')}</div></div><div class="mx-x">${L('Consecuencia', 'Consequence')}</div></div>
      <button class="row small" data-act="cell" data-cell="pend" style="margin-top:8px;${selCell === 'pend' ? 'font-weight:600' : ''}"><span class="lv pend">${L('Pendientes de evaluación', 'Pending assessment')}: ${pend.length}</span><span class="mut">${L('fuera de la matriz', 'outside the matrix')}</span></button>`;
  };
})();
