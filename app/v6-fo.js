/* ORA v6 — Hallazgos y oportunidades como lista: cada hallazgo con su contexto heredado (proceso, área, activo,
   pregunta, evidencia), sus oportunidades y sugerencias estándar por reglas (la IA sobre evidencia vendrá después). */
(function () {
  const C = window.ORA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, ic = U.ic, L = I.L, tx = I.tx, A = U.act;
  const R = () => U.render();
  const FO = new Set();
  U.foOpen = id => FO.add(id);
  const used = (a, f) => a.opportunities.filter(o => (o.findings || []).includes(f.id));
  const FST = () => [['pendiente de verificación', L('Pendiente de verificación', 'Pending verification')], ['confirmado', L('Confirmado', 'Confirmed')], ['descartado', L('Descartado', 'Discarded')]];
  const stLbl = s => (FST().find(o => o[0] === s) || [0, tx(s || 'confirmado')])[1];
  const stCls = s => s === 'confirmado' ? 'ok' : s === 'descartado' ? '' : 'warn';

  /* contexto heredado del hallazgo */
  C.findCtx = function (a, f) {
    const assets = (f.assets || []).map(id => C.asset(a, id)).filter(Boolean);
    const q = f.q ? a.questions.find(z => z.id === f.q) : null;
    const areaId = f.area || (assets[0] && assets[0].area) || null; const ar = areaId ? C.area(a, areaId) : null;
    const procs = new Set(); if (f.proc) procs.add(f.proc); assets.forEach(x => C.assetProcs(x).forEach(k => procs.add(k))); if (q && q.proc) procs.add(q.proc); if (!procs.size && ar) C.recProcs(ar).forEach(k => procs.add(k));
    const systems = (f.systems || []).map(id => (a.systems || []).find(s => s.id === id)).filter(Boolean);
    const ev = [['finding', f.id]].concat(assets.map(x => ['asset', x.id]), f.q ? [['q', f.q]] : [], !assets.length && areaId ? [['area', areaId]] : []);
    const nev = ev.reduce((n, [k, id]) => n + C.evPhotos(a, k, id).length + C.evDocs(a, k, id).length, 0);
    return { assets, q, ar, procs: [...procs], systems, ev, nev };
  };

  /* biblioteca estándar de oportunidades (reglas; la IA sobre evidencia la reemplazará) */
  const LIB = () => [
    { re: /climatiz|temperatura|aire acondicionado|hvac|°c/i, t: L('Climatización redundante para el cuarto de gabinetes y alarma de alta temperatura', 'Redundant cooling for the cabinet room and high-temperature alarm'), d: 'Confiabilidad', c: L('Una falla del único equipo de clima puede llevar los controladores a sobretemperatura y disparo.', 'A failure of the single cooling unit can overheat controllers and trip them.') },
    { re: /respaldo|backup|copia/i, t: L('Respaldo periódico y probado de configuraciones y lógica (PLC, DCS, HMI)', 'Periodic, tested backups of configurations and logic (PLC, DCS, HMI)'), d: 'Recuperación', c: L('Sin respaldo verificado, la recuperación tras una falla se alarga o no es posible.', 'Without a verified backup, recovery after a failure takes longer or is not possible.') },
    { re: /redundan|único|unico|punto único|spof|sin respaldo/i, t: L('Evaluar redundancia del elemento crítico (controlador, alimentación o comunicación)', 'Assess redundancy of the critical element (controller, power or communication)'), d: 'Continuidad', c: L('Un punto único de falla detiene el proceso que depende de él.', 'A single point of failure stops the process that depends on it.') },
    { re: /fin de vida|obsolet|descontinu|eol|sin soporte|end of life/i, t: L('Plan de migración o reemplazo del equipo en fin de vida', 'Migration or replacement plan for the end-of-life equipment'), d: 'Confiabilidad', c: L('Sin soporte del fabricante, una falla puede no tener reparación ni repuesto.', 'Without vendor support, a failure may have no repair or spare.') },
    { re: /repuesto|spare|bodega|inventario/i, t: L('Asegurar repuestos críticos en bodega', 'Secure critical spares in stock'), d: 'Recuperación', c: L('La falta de repuestos alarga el tiempo de recuperación.', 'Lack of spares lengthens recovery time.') },
    { re: /acceso f[ií]sico|gabinete|tablero|llave|candado|puerta/i, t: L('Control de acceso físico a gabinetes y salas de control', 'Physical access control for cabinets and control rooms'), d: 'Seguridad', c: L('Cualquier persona podría manipular el equipo de control.', 'Anyone could tamper with control equipment.') },
    { re: /red|switch|firewall|segment|plana|ethernet|vlan/i, t: L('Segmentación de la red OT en zonas y conductos (IEC 62443)', 'OT network segmentation into zones and conduits (IEC 62443)'), d: 'Seguridad', c: L('Una red plana permite que un incidente se propague a todo el proceso.', 'A flat network lets an incident spread to the whole process.') },
    { re: /remot|vpn|teamviewer|anydesk/i, t: L('Acceso remoto seguro con MFA, aprobación y registro', 'Secure remote access with MFA, approval and logging'), d: 'Seguridad', c: L('Accesos remotos sin control abren una vía de entrada al sistema de control.', 'Uncontrolled remote access opens a path into the control system.') },
    { re: /contraseñ|password|usuario|cuenta|credencial/i, t: L('Gestión de cuentas y contraseñas en equipos OT', 'Account and password management on OT equipment'), d: 'Seguridad', c: L('Credenciales compartidas o por defecto facilitan cambios no autorizados.', 'Shared or default credentials enable unauthorized changes.') },
    { re: /ups|energ[ií]a|alimentaci|bater/i, t: L('Revisar autonomía de UPS y pruebas periódicas de transferencia', 'Review UPS autonomy and periodic transfer tests'), d: 'Continuidad', c: L('Un corte de energía puede apagar el control antes de una parada segura.', 'A power outage can shut down control before a safe stop.') },
    { re: /alarma|alto-alto|independient|sis|sil/i, t: L('Verificar independencia de alarmas críticas respecto del control de proceso', 'Verify critical alarm independence from process control'), d: 'Seguridad', c: L('Si la alarma depende del mismo control que falla, no avisa cuando más se necesita.', 'If the alarm depends on the same control that fails, it does not warn when most needed.') },
    { re: /document|diagrama|plano|arquitectura|inventario/i, t: L('Actualizar arquitectura y documentación OT', 'Update OT architecture and documentation'), d: 'Recuperación', c: L('Sin documentación vigente, el diagnóstico y la recuperación son más lentos.', 'Without current documentation, diagnosis and recovery are slower.') }
  ];
  C.oppSuggest = function (a, f) {
    const cx = C.findCtx(a, f); const txt = [tx(f.title), tx(f.desc || ''), ...cx.assets.map(x => [tx(x.type || ''), tx(x.name)].join(' '))].join(' ');
    const out = LIB().filter(s => s.re.test(txt));
    if (cx.assets.some(x => ['eol', 'discontinued'].includes((x.lifecycle || {}).status)) && !out.some(s => /fin de vida|end-of-life/i.test(s.t))) out.unshift(LIB()[3]);
    const have = new Set(used(a, f).map(o => tx(o.title).toLowerCase()));
    return out.filter(s => !have.has(s.t.toLowerCase())).slice(0, 3);
  };

  const ctxChips = (a, cx) => [cx.procs.map(k => `<span class="v6fo-c p" title="${L('Proceso', 'Process')}">${h(C.procName(a, k))}</span>`).join(''), cx.ar ? `<span class="v6fo-c ar" title="${L('Área', 'Area')}">${h(tx(cx.ar.name))}</span>` : '', cx.assets.map(x => `<span class="v6fo-c as" title="${L('Activo', 'Asset')}">${h(x.tag)}</span>`).join(''), cx.q ? `<span class="v6fo-c q" title="${L('Pregunta', 'Question')}">${h(cx.q.id)}</span>` : ''].join('');

  function detail(a, f) {
    const cx = C.findCtx(a, f); const ops = used(a, f); const sug = f.status === 'descartado' ? [] : C.oppSuggest(a, f);
    const row = (k, v) => !v ? '' : `<div class="v6-kvr"><dt>${k}</dt><dd>${v}</dd></div>`;
    const evk = cx.ev.find(([k, id]) => C.evPhotos(a, k, id).length + C.evDocs(a, k, id).length) || cx.ev[0];
    return `<div class="v6w-card"><div class="v6w-card-g"><div class="v6w-left"><dl class="v6-kv2">
        ${row(L('Descripción', 'Description'), h(tx(f.desc || '')))}${row(L('Proceso', 'Process'), cx.procs.map(k => h(C.procName(a, k))).join(' · '))}${row(L('Área', 'Area'), cx.ar ? h(tx(cx.ar.name)) : '')}
        ${row(L('Activos', 'Assets'), cx.assets.map(x => `<b>${h(x.tag)}</b> ${h(tx(x.name))}${(x.lifecycle || {}).status && x.lifecycle.status !== 'unknown' ? ` <span class="v6-lc ${x.lifecycle.status}">${h(tx({ active: L('Activo', 'Active'), mature: L('Activo maduro', 'Active mature'), eol: L('Fin de vida', 'End of life'), discontinued: L('Descontinuado', 'Discontinued') }[x.lifecycle.status] || ''))}</span>` : ''}`).join('<br>'))}
        ${row(L('Sistemas', 'Systems'), cx.systems.map(s => h(tx(s.name))).join(' · '))}${row(L('Pregunta', 'Question'), cx.q ? `<b>${h(cx.q.id)}</b> ${h(tx(cx.q.text))}${(a.answers[cx.q.id] || {}).value ? ` <span class="v6qa-chip ${({ 'Sí': 'si', 'No': 'no', 'Desconocido': 'unk', 'No aplica': 'na' })[a.answers[cx.q.id].value] || ''}">${h(tx(a.answers[cx.q.id].value))}</span>` : ''}` : '')}
        ${row(L('Escenarios', 'Scenarios'), a.scenarios.filter(s => (s.findings || []).includes(f.id)).map(s => `<span class="v6-tag">${s.id}</span> ${h(tx(s.title))}`).join('<br>'))}
        ${row(L('Origen', 'Source'), h([tx(f.source || ''), f.by, f.ts ? C.fmtDate(f.ts, true) : ''].filter(Boolean).join(' · ')))}
        <div class="v6-kvr"><dt><label for="v6-find-${f.id}-status">${L('Estado', 'Status')}</label></dt><dd><select class="inp" id="v6-find-${f.id}-status" data-v6="find.${f.id}.status">${FST().map(o => U.opt(o[0], o[1], f.status || 'confirmado')).join('')}</select></dd></div></dl></div>
        <div>${U.evidBox(a, evk[0], evk[1], { readonly: true })}${evk[0] !== 'finding' ? `<p class="small mut" style="margin:6px 2px 0">${evk[0] === 'asset' ? L('Evidencia del activo asociado.', 'Evidence of the linked asset.') : evk[0] === 'q' ? L('Evidencia de la pregunta asociada.', 'Evidence of the linked question.') : L('Evidencia del área.', 'Evidence of the area.')}</p>` : ''}</div></div>
      <div class="v6fo-ops"><div class="v6e-h"><b>${L('Oportunidades', 'Opportunities')}</b><span class="pill">${ops.length}</span><span class="spacer"></span><button class="btn primary sm" data-act="v6-opp" data-id="" data-f="${f.id}">${ic('plus', 'sm')}${L('Crear oportunidad', 'Create opportunity')}</button></div>
        ${ops.length ? `<div class="v6fo-ol">${ops.map(o => { const im = o.impact || {}; const est = im.estimate || 'Por estimar'; return `<button class="v6fo-o" data-act="v6-opp" data-id="${o.id}"><span class="v6w-id">${o.id}</span><span class="v6w-main"><b>${h(tx(o.title))}</b><small>${h(tx(o.consequence || ''))}</small></span><span class="v6-tag">${h(tx(im.dimension || '—'))}</span><span class="small ${/por estimar/i.test(est) ? 'v6-pe' : ''}">${h(tx(est))}</span><span class="pill ${o.status === 'aceptada' ? 'ok' : o.status === 'descartada' ? '' : 'warn'}">${h(tx(o.status))}</span>${ic('edit', 'sm')}</button>`; }).join('')}</div>` : `<p class="small mut" style="margin:0">${L('Este hallazgo todavía no tiene oportunidad.', 'This finding has no opportunity yet.')}</p>`}
        ${sug.length ? `<div class="v6fo-sug"><div class="v6fo-sh">${ic('spark', 'sm')}<b>${L('Oportunidades estándar sugeridas', 'Suggested standard opportunities')}</b><small>${L('Por reglas sobre el texto y el activo · después las sugerirá omnIA con la evidencia', 'Rule-based on text and asset · later omnIA will suggest them from the evidence')}</small></div>
          ${sug.map((s, i) => `<div class="v6fo-si"><span class="v6w-main"><b>${h(s.t)}</b><small>${h(s.c)}</small></span><span class="v6-tag">${h(tx(s.d))}</span><button class="btn soft sm" data-act="v6-opp" data-id="" data-f="${f.id}" data-sug="${i}">${L('Usar', 'Use')}</button></div>`).join('')}</div>` : ''}</div></div>`;
  }

  U.fcoiTab = function (a, legacy) {
    const ui = C.S.ui; const view = ui.fov || 'list';
    const seg = `<div class="seg" role="group" aria-label="${L('Vista', 'View')}"><button data-act="v6fo-v" data-v="list" aria-pressed="${view === 'list'}">${L('Por hallazgo', 'By finding')}</button><button data-act="v6fo-v" data-v="matrix" aria-pressed="${view === 'matrix'}">${L('Matriz FCOI', 'FCOI matrix')}</button></div>`;
    if (view === 'matrix') return `<div class="row" style="justify-content:flex-end">${seg}</div>` + legacy(a, { noOrphan: true });
    if (!a.findings.length) return `<div class="row" style="justify-content:flex-end">${seg}</div><div class="empty"><b>${L('Sin hallazgos todavía', 'No findings yet')}</b><span>${L('Los hallazgos se registran en el recorrido o el cuestionario con su contexto heredado.', 'Findings are recorded in the walkdown or questionnaire with inherited context.')}</span></div>`;
    const flt = ui.fof || 'all', q = (ui.foq || '').toLowerCase(), pf = ui.fop || '';
    const cxs = new Map(a.findings.map(f => [f.id, C.findCtx(a, f)]));
    const cnt = { all: a.findings.length, orphan: a.findings.filter(f => f.status !== 'descartado' && !used(a, f).length).length, linked: a.findings.filter(f => used(a, f).length).length, disc: a.findings.filter(f => f.status === 'descartado').length };
    const list = a.findings.filter(f => (flt === 'all' || (flt === 'orphan' ? f.status !== 'descartado' && !used(a, f).length : flt === 'linked' ? used(a, f).length : f.status === 'descartado'))
      && (!pf || cxs.get(f.id).procs.includes(pf)) && (!q || [f.id, tx(f.title), tx(f.desc || ''), ...cxs.get(f.id).assets.map(x => x.tag)].join(' ').toLowerCase().includes(q)));
    const procs = [...new Set(a.findings.flatMap(f => cxs.get(f.id).procs))];
    const chip = (k, l) => `<button class="v6-pfb" data-act="v6fo-f" data-v="${k}" aria-pressed="${flt === k}">${l}<b>${cnt[k]}</b></button>`;
    const rows = list.map(f => { const cx = cxs.get(f.id), ops = used(a, f), open = FO.has(f.id), dis = f.status === 'descartado';
      return `<article class="v6fo ${open ? 'open' : ''} ${dis ? 'dis' : ''} ${!dis && !ops.length ? 'orphan' : ''}" id="fo-${f.id}"><div class="v6qa-h"><button class="v6qa-x" data-act="v6fo-tg" data-id="${f.id}" aria-expanded="${open}"><span class="v6w-caret">${ic('chev', 'sm')}</span><span class="v6w-id">${f.id}</span>
        <span class="v6qa-main"><b>${h(tx(f.title))}</b><span class="v6fo-cs">${ctxChips(a, cx)}</span></span></button>
        <span class="v6qa-inds">${cx.nev ? `<span class="v6qa-ind" title="${L('Evidencia', 'Evidence')}">${ic('camera', 'sm')}${cx.nev}</span>` : `<span class="v6qa-ind mut" title="${L('Sin evidencia', 'No evidence')}">${ic('camera', 'sm')}0</span>`}
          ${ops.length ? `<span class="v6fo-oc">${ops.length} ${ops.length === 1 ? L('oportunidad', 'opportunity') : L('oportunidades', 'opportunities')}</span>` : dis ? '' : `<span class="v6fo-oc none">${L('Sin oportunidad', 'No opportunity')}</span>`}
          <span class="pill ${stCls(f.status)}">${h(stLbl(f.status))}</span>
          ${U.v6kebab('fo:' + f.id, f.id, [U.v6mi(`data-act="v6-opp" data-id="" data-f="${f.id}"`, 'plus', L('Crear oportunidad', 'Create opportunity')), U.v6mi(`data-act="trace-open" data-key="finding:${f.id}"`, 'link', L('Trazabilidad', 'Traceability')), dis ? U.v6mi(`data-act="v6fo-st" data-id="${f.id}" data-v="confirmado"`, 'reset', L('Restaurar', 'Restore')) : U.v6mi(`data-act="v6fo-dis" data-id="${f.id}"`, 'x', L('Descartar hallazgo', 'Discard finding'), 'danger')])}</span></div>
        ${open ? detail(a, f) : ''}</article>`; }).join('');
    return `<section class="box"><div class="box-head"><h3>${L('Hallazgos y oportunidades', 'Findings and opportunities')}</h3>${seg}<p>${L('Cada hallazgo trae su contexto (proceso, área, activo, pregunta y evidencia). Desde ahí se crean sus oportunidades; una oportunidad puede atender varios hallazgos.', 'Each finding carries its context (process, area, asset, question and evidence). Its opportunities are created from there; one opportunity can address several findings.')}</p></div>
      <div class="box-body"><div class="v6fo-bar"><div class="v6-pf">${chip('all', L('Todos', 'All'))}${chip('orphan', L('Sin oportunidad', 'No opportunity'))}${chip('linked', L('Con oportunidad', 'With opportunity'))}${chip('disc', L('Descartados', 'Discarded'))}</div>
        <div class="row" style="gap:8px">${procs.length > 1 ? `<select class="inp" id="v6fo-p" aria-label="${L('Proceso', 'Process')}"><option value="">${L('Todos los procesos', 'All processes')}</option>${procs.map(k => U.opt(k, C.procName(a, k), pf)).join('')}</select>` : ''}<input id="v6fo-q" class="inp" type="search" placeholder="${L('Buscar hallazgo, TAG…', 'Search finding, TAG…')}" value="${h(ui.foq || '')}" style="min-width:200px"></div></div>
        <div class="v6fo-list">${rows || `<div class="empty">${L('Ningún hallazgo con estos filtros.', 'No findings match these filters.')}</div>`}</div></div></section>`;
  };
  A['v6fo-v'] = el => { C.S.ui.fov = el.dataset.v; C.save(); R(); };
  A['v6fo-f'] = el => { C.S.ui.fof = el.dataset.v; C.save(); R(); };
  A['v6fo-tg'] = el => { const id = el.dataset.id; FO.has(id) ? FO.delete(id) : FO.add(id); R(); };
  A['v6fo-st'] = el => { const a = C.cur(); const f = a.findings.find(z => z.id === el.dataset.id); if (!f) return; f.status = el.dataset.v; C.log(a, `Cambió el estado del hallazgo ${f.id}: ${f.status}`, `Changed finding ${f.id} status: ${f.status}`); C.save(); R(); };
  A['v6fo-dis'] = el => { const id = el.dataset.id; U.openModal('confirm', { title: L('¿Descartar este hallazgo?', 'Discard this finding?'), msg: L(`${id} quedará como «Descartado» y no se pedirá oportunidad para él. Se puede restaurar desde el menú ⋮.`, `${id} will be marked “Discarded” and no opportunity will be required for it. It can be restored from the ⋮ menu.`), yes: L('Sí, descartar', 'Yes, discard'), tone: 'warn', onYes: () => A['v6fo-st']({ dataset: { id, v: 'descartado' } }) }); };
  document.addEventListener('change', e => { if (e.target.id === 'v6fo-p') { C.S.ui.fop = e.target.value; C.save(); R(); } });
  let qT; document.addEventListener('input', e => { if (e.target.id !== 'v6fo-q') return; const v = e.target.value; clearTimeout(qT); qT = setTimeout(() => { C.S.ui.foq = v; R(); const i = document.getElementById('v6fo-q'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } }, 200); });

  /* ---------- modal de oportunidad con la línea de diseño de las fichas ---------- */
  U.modals.v6opp = function (a, d) {
    const ex = d.id ? a.opportunities.find(o => o.id === d.id) : null; const f0 = d.f ? a.findings.find(z => z.id === d.f) : null;
    const sg = f0 && d.sug != null && d.sug !== '' ? C.oppSuggest(a, f0)[+d.sug] : null;
    const o = ex || { id: '', title: sg ? sg.t : '', alternatives: '', findings: d.f ? [d.f] : [], scenarios: d.f ? a.scenarios.filter(s => (s.findings || []).includes(d.f)).map(s => s.id) : [], consequence: sg ? sg.c : '', impact: { dimension: sg ? sg.d : 'Continuidad', text: '', basis: '', assumption: '', estimate: 'Por estimar' }, reviewer: a.leadId, status: 'propuesta' };
    const imp = o.impact || {};
    const fl = o.findings.map(id => a.findings.find(z => z.id === id)).filter(Boolean);
    const ctxBox = fl.length ? `<div class="v6fo-mctx">${fl.map(f => `<div><span class="v6w-id">${f.id}</span> <b>${h(tx(f.title))}</b><span class="v6fo-cs">${ctxChips(a, C.findCtx(a, f))}</span></div>`).join('')}</div>` : '';
    const pills = (cls, list, on, lbl) => `<div class="v6fo-pk">${list.map(x => `<label class="v6fo-pkl"><input type="checkbox" class="${cls}" value="${x.id}" ${on.includes(x.id) ? 'checked' : ''}><span><b>${x.id}</b> ${h(lbl(x))}</span></label>`).join('') || `<span class="small mut">${L('No hay registros.', 'No records.')}</span>`}</div>`;
    const fld = (id, lbl, v, ph) => `<div class="field"><label for="${id}">${lbl}</label><input id="${id}" value="${h(tx(v || ''))}" placeholder="${h(ph || '')}"></div>`;
    return { title: ex ? `${o.id} · ${L('Oportunidad', 'Opportunity')}` : L('Nueva oportunidad', 'New opportunity'), wide: true, body: `
      ${ctxBox ? `<div class="sec-title">${L('Hallazgo de origen', 'Source finding')}</div>${ctxBox}` : ''}
      ${sg ? `<p class="small mut" style="margin:0">${ic('spark', 'sm')} ${L('Prellenado con la oportunidad estándar sugerida. Ajústela al caso.', 'Prefilled with the suggested standard opportunity. Adjust it to the case.')}</p>` : ''}
      <div class="sec-title">${L('Oportunidad', 'Opportunity')}</div>
      <div class="field"><label for="v6o-t">${L('Mejora práctica *', 'Practical improvement *')}</label><input id="v6o-t" value="${h(tx(o.title))}" data-autofocus></div>
      <div class="field"><label for="v6o-c">${L('Consecuencia · efecto actual o potencial', 'Consequence · current or potential effect')}</label><textarea id="v6o-c" rows="2">${h(tx(o.consequence || ''))}</textarea></div>
      ${fld('v6o-a', L('Alternativas consideradas', 'Alternatives considered'), o.alternatives)}
      <div class="sec-title">${L('Impacto', 'Impact')}</div>
      <div class="grid3"><div class="field"><label for="v6o-d">${L('Dimensión', 'Dimension')}</label><select id="v6o-d">${(U.DIMS_OPP || []).map(x => U.opt(x, tx(x), imp.dimension)).join('')}</select></div>${fld('v6o-e', L('Estimación', 'Estimate'), imp.estimate || 'Por estimar', L('Por estimar', 'To estimate'))}${fld('v6o-x', L('Beneficio esperado', 'Expected benefit'), imp.text)}</div>
      <div class="grid2">${fld('v6o-b', L('Base de la estimación', 'Estimate basis'), imp.basis, L('Cotización, histórico, norma…', 'Quote, history, standard…'))}${fld('v6o-u', L('Supuesto', 'Assumption'), imp.assumption)}</div>
      <p class="hint" style="margin:0">${L('No se inventan ahorros ni porcentajes: sin base verificable, deje «Por estimar». La cuantificación se completa después.', 'No invented savings or percentages: without a verifiable basis, keep “To estimate”. Quantification is completed later.')}</p>
      <div class="sec-title">${L('Vínculos', 'Links')}</div>
      <div class="field"><span class="lbl">${L('Hallazgos que atiende', 'Findings addressed')}</span>${pills('v6o-f', a.findings.filter(f => f.status !== 'descartado' || o.findings.includes(f.id)), o.findings, x => tx(x.title))}</div>
      <div class="field"><span class="lbl">${L('Escenarios relacionados', 'Related scenarios')}</span>${pills('v6o-s', a.scenarios, o.scenarios, x => tx(x.title))}</div>
      <div class="sec-title">${L('Gestión', 'Management')}</div>
      <div class="grid2"><div class="field"><label for="v6o-st">${L('Estado', 'Status')}</label><select id="v6o-st">${['propuesta', 'por validar', 'aceptada', 'descartada'].map(x => U.opt(x, tx(x), o.status)).join('')}</select></div><div class="field"><label for="v6o-r">${L('Revisa', 'Reviewer')}</label><select id="v6o-r">${C.USERS.map(u => U.opt(u.id, u.name, o.reviewer)).join('')}</select></div></div>`,
      foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button><button class="btn primary" data-act="v6-opp-save" data-id="${o.id}">${ic('check', 'sm')}${L('Guardar', 'Save')}</button>` };
  };
  const ao = A['v6-opp']; A['v6-opp'] = el => { if (el.dataset.f) FO.add(el.dataset.f); U.openModal('v6opp', { id: el.dataset.id || '', f: el.dataset.f || '', sug: el.dataset.sug }); };
  const as0 = A['v6-opp-save']; A['v6-opp-save'] = el => { [...document.querySelectorAll('.v6o-f:checked')].forEach(c => FO.add(c.value)); return as0(el); };
})();
