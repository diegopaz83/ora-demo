/* ORA v6 — cadena de valor completa sobre el modelo existente:
   prioridades del negocio (etapa 2), base instalada y ciclo de vida (etapa 3), cobertura por dominio, ficha de escenario y matriz FCOI (etapa 6),
   hoja de ruta por fases (etapa 7), cadena de valor en Risk Intelligence y omnIA con la experiencia de Kairos. */
(function () {
  const C = window.ORA, D = window.ORA_DATA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, ic = U.ic, L = I.L, tx = I.tx, A = U.act;
  const R = () => U.render();
  if (C.F4_QUESTIONS) C.F4_QUESTIONS(); // registra el inglés de las preguntas condicionales
  const find = (list, id) => (list || []).find(x => x.id === id);
  const now = () => new Date().toISOString();
  const pl = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  const STRAT = { mantener: ['Mantener', 'Maintain'], estabilizar: ['Estabilizar', 'Stabilize'], actualizar: ['Actualizar', 'Update'], migrar: ['Migrar', 'Migrate'] };
  const FRONT = () => ({ exposicion: [L('Exposición crítica', 'Critical exposure'), L('Acciones sobre los mayores riesgos', 'Actions on the highest risks')], recuperacion: [L('Brechas de recuperación', 'Recovery gaps'), L('Mejorar la capacidad de respuesta', 'Improve response capability')],
    actualizacion: [L('Actualizaciones selectivas', 'Selective updates'), L('Modernizar activos escogidos', 'Modernize selected assets')], migracion: [L('Migración de plataforma', 'Platform migration'), L('Transición cuando sea pertinente', 'Transition when relevant')] });
  const MS = () => ({ scope: L('Alcance aprobado', 'Scope approved'), funding: L('Financiación confirmada', 'Funding confirmed'), released: L('Fase autorizada', 'Phase released') });
  const LCN = () => ({ active: L('Activo', 'Active'), mature: L('Activo maduro', 'Active mature'), eol: L('Fin de vida', 'End of life'), discontinued: L('Descontinuado', 'Discontinued'), unknown: L('Por verificar', 'To verify') });
  const FAM = () => [['control', L('Control', 'Control')], ['software', 'Software'], ['redes', L('Redes', 'Networks')], ['infra', L('Infraestructura', 'Infrastructure')], ['energia', L('Energía', 'Power')]];
  const COVST = () => [['revisado', L('Revisado', 'Reviewed')], ['en curso', L('En curso', 'In progress')], ['no revisado', L('No revisado', 'Not reviewed')], ['no aplica', L('No aplica', 'Not applicable')]];
  const IVST = ['propuesta', 'por validar', 'aprobada', 'en ejecución', 'completada', 'verificada', 'descartada'];
  const DIMS_OPP = ['Continuidad', 'Recuperación', 'Confiabilidad', 'Seguridad', 'Calidad', 'Cumplimiento', 'Costo']; U.DIMS_OPP = DIMS_OPP;
  const stChip = (s, en) => s ? `<span class="v6-st ${s}">${L(STRAT[s][0], STRAT[s][1])}${en && I.lang === 'es' ? ` <small>· ${STRAT[s][1]}</small>` : ''}</span>` : `<span class="v6-st">${L('Por clasificar', 'To classify')}</span>`;
  const toH = t => !t || t.value == null || t.value === '' ? null : +t.value * ({ min: 1 / 60, h: 1, 'días': 24 }[t.unit] || 1);
  const fmtH = x => { if (x == null || isNaN(x)) return '—'; if (x < 1) return Math.round(x * 60) + ' min'; if (x < 48) return (Math.round(x * 10) / 10) + ' h'; const d = x / 24; return d < 14 ? Math.round(d) + L(' días', ' days') : Math.round(d / 7) + L(' semanas', ' weeks'); };
  const lvl = s => C.LEVEL(s.C, s.P);
  const proc = (a, k) => a.processes.find(p => p.key === k) || { name: k };
  const DN = k => tx(D.DOMAIN_NAME ? D.DOMAIN_NAME(k) : k);

  /* ---------- modelo v6: estructura mínima, recomendaciones ↔ intervenciones ---------- */
  function ensureV6(a) {
    if (!a.coverage) a.coverage = (D.DOMAINS || []).map(d => ({ domain: d.key, applicable: true, state: 'no revisado', source: '', gaps: '', just: '', findings: [] }));
    ['opportunities', 'interventions', 'dispositions', 'ai', 'docs'].forEach(k => { if (!a[k]) a[k] = []; });
    if (!a.phases || !a.phases.length) a.phases = (D.PHASE_NAMES || ['Fase 1', 'Fase 2', 'Fase 3']).map((n, i) => ({ n: i + 1, name: n, horizon: '', milestones: { scope: 'no iniciado', funding: 'no iniciado', released: 'no iniciado' } }));
  }
  C.ensureV6 = ensureV6;
  const HZ2PH = hz => /Inmediato|Corto/.test(hz || '') ? 1 : /Mediano/.test(hz || '') ? 2 : 3;
  C.syncRecs = function (a) {
    ensureV6(a);
    (a.recs || []).filter(r => !r.iv && !find(a.interventions, r.id)).forEach(r => {
      a.interventions.push({ id: r.id, order: a.interventions.length + 1, title: r.title, scope: '', kind: 'ejecución', strategy: null, strategy2: null, front: null, phase: HZ2PH(r.hz), opportunities: [], findings: [], scenarios: r.sc.slice(),
        targets: [], priorityRationale: r.basis || '', orderReason: '', duration: 'Por estimar', owner: r.owner || '', acceptance: 'Sugerido', cost: { range: 'Por estimar', currency: '', source: '', level: 'Por estimar' }, effort: '', dependsOn: [],
        prerequisites: '', authorizations: '', shutdownWindow: '', status: 'propuesta', closeCriterion: '', residual: '', log: [{ ts: now(), by: C.S.userId, es: 'Creada desde una recomendación del escenario', en: 'Created from a scenario recommendation' }] });
    });
    a.recs = a.interventions.filter(v => v.status !== 'descartada').map(v => ({ id: v.id, title: v.title, sc: v.scenarios.slice(), hz: (a.phases[v.phase - 1] || {}).name || '', owner: v.owner, pr: v.phase === 1 ? 'Alta' : v.phase === 2 ? 'Media' : 'Baja',
      st: (D.STMAP || {})[v.status] || 'Propuesta', basis: v.priorityRationale, iv: true }));
  };
  const ev0 = C.evaluate;
  C.evaluate = function (a) { if (a) C.syncRecs(a); return ev0(a); };
  // preguntas por categoría OT y por área: se activan con el inventario validado
  const sig0 = C.f4Signals;
  C.f4Signals = function (a) {
    const out = sig0 ? sig0(a) : {}; const inc = new Set(C.included(a).map(p => p.key));
    (a.systems || []).filter(s => !C.isOut(s) && C.okd(s) && C.recProcs(s).some(k => inc.has(k))).forEach(s => { if (!out['cat:' + s.cat]) out['cat:' + s.cat] = L('Activada por el inventario: sistema validado ', 'Triggered by the inventory: validated system ') + tx(s.name); });
    if (a.areas.some(x => !C.isOut(x) && C.okd(x))) out.areas = L('Activada por áreas validadas en el recorrido', 'Triggered by areas validated in the walkdown');
    return out;
  };
  // ejemplos completos: se cierran respuestas y excepciones de foto marcadas como DEMO
  function prepDemo(a) {
    if (!a.demo || a._demoPrep) return; ensureV6(a); C.syncRecs(a);
    if (a.stage >= 7) {
      const e = ev0(a); const lead = C.uname(a.leadId);
      e.app.forEach(({ q, cond }) => { if (!a.answers[q.id] && (q.req || (cond && !(q.cond && q.cond.opt)))) a.answers[q.id] = { value: 'Sí', note: L('Respuesta de ejemplo para completar el demo (ficticia).', 'Example answer to complete the demo (fictitious).'), conf: 'Estimado', source: 'Entrevista', by: lead, ts: a.updated, demoFill: true }; });
      C.included(a).forEach(p => { if (!a.scenarios.some(s => s.proc === p.key)) p.noScn = L('Revisado sin escenarios relevantes en el alcance acordado (ejemplo DEMO).', 'Reviewed with no relevant scenarios within the agreed scope (DEMO example).'); });
      C.included(a).forEach(p => { if (!a.assets.some(x => !C.isOut(x) && C.assetProcs(x).includes(p.key))) p.noAssets = L('Se apoya en activos de otro proceso ya registrados (ejemplo DEMO).', 'Relies on assets already recorded for another process (DEMO example).'); });
      C.photoReqs(a).forEach(r => { if (r.status === 'sin foto') a.photoRes[r.key] = { status: 'aceptada', reason: 'Otro', note: L('Ejemplo DEMO sin fotografía: se usa evidencia documental.', 'DEMO example without photo: documentary evidence used.'), by: lead, ts: a.updated }; });
    }
    a._demoPrep = true;
  }
  C.S.assessments.forEach(a => { ensureV6(a); prepDemo(a); }); C.save(true);

  /* ---------- reglas de vacíos (cadena de valor y omnIA) ---------- */
  C.v6gaps = function (a) {
    const g = { p1: [], p2: [], p3: [], p4: [], p5: [] }; const inc = C.included(a);
    const und = a.processes.filter(p => !p.status).length; if (und) g.p1.push(pl(und, L('proceso del catálogo por decidir', 'catalog process to decide'), L('procesos del catálogo por decidir', 'catalog processes to decide')));
    inc.forEach(p => { if (!p.tolerance && p.type !== 'salvaguarda') g.p1.push(tx(p.name) + L(': sin tolerancia registrada', ': no tolerance recorded')); });
    if (!inc.length) g.p1.push(L('Ningún proceso incluido todavía', 'No process included yet'));
    const live = a.assets.filter(x => !C.isOut(x));
    const unk = live.filter(x => x.family && (!x.lifecycle || x.lifecycle.status === 'unknown')).length; if (unk) g.p2.push(pl(unk, L('activo sin ciclo de vida verificado', 'asset without verified lifecycle'), L('activos sin ciclo de vida verificado', 'assets without verified lifecycle')));
    const sug = [...live, ...a.systems.filter(x => !C.isOut(x))].filter(x => !C.okd(x)).length; if (sug) g.p2.push(pl(sug, L('elemento sugerido sin validar', 'suggested item not validated'), L('elementos sugeridos sin validar', 'suggested items not validated')));
    if (live.length) FAM().forEach(f => { if (!live.some(x => x.family === f[0]) && !a.systems.some(x => x.family === f[0])) g.p2.push(L('Familia «', 'Family “') + f[1] + L('» sin registros', '” has no records')); });
    if (!live.length) g.p2.push(L('Sin activos registrados', 'No assets recorded'));
    const nr = a.coverage.filter(c => c.state === 'no revisado'); if (nr.length) g.p3.push(pl(nr.length, L('dominio no revisado', 'domain not reviewed'), L('dominios no revisados', 'domains not reviewed')));
    const pend = a.scenarios.filter(s => !lvl(s)).length; if (pend) g.p3.push(pl(pend, L('escenario pendiente de valoración', 'scenario pending rating'), L('escenarios pendientes de valoración', 'scenarios pending rating')));
    const norec = a.scenarios.filter(s => !(s.recovery && s.recovery.total)).length; if (norec) g.p3.push(pl(norec, L('escenario sin tiempo de recuperación', 'scenario without recovery time'), L('escenarios sin tiempo de recuperación', 'scenarios without recovery time')));
    const pv = a.findings.filter(f => f.status === 'pendiente de verificación').length; if (pv) g.p4.push(pl(pv, L('hallazgo pendiente de verificación', 'finding pending verification'), L('hallazgos pendientes de verificación', 'findings pending verification')));
    const noOpp = a.findings.filter(f => !a.opportunities.some(o => o.findings.includes(f.id))).length; if (a.findings.length && noOpp) g.p4.push(pl(noOpp, L('hallazgo sin oportunidad', 'finding without opportunity'), L('hallazgos sin oportunidad', 'findings without opportunity')));
    if (!a.findings.length) g.p4.push(L('Sin hallazgos registrados', 'No findings recorded'));
    const V = a.interventions.filter(v => v.status !== 'descartada');
    const pe = V.filter(v => (v.cost || {}).level === 'Por estimar').length; if (pe) g.p5.push(pl(pe, L('intervención con costo «Por estimar»', 'intervention with cost “To estimate”'), L('intervenciones con costo «Por estimar»', 'interventions with cost “To estimate”')));
    const ncl = V.filter(v => !v.strategy || !v.front).length; if (ncl) g.p5.push(pl(ncl, L('intervención sin estrategia o frente', 'intervention without strategy or front'), L('intervenciones sin estrategia o frente', 'interventions without strategy or front')));
    const hi = a.scenarios.filter(s => ['Alto', 'Medio'].includes(lvl(s)) && !V.some(v => v.scenarios.includes(s.id))).length; if (hi) g.p5.push(pl(hi, L('riesgo alto o medio sin intervención', 'high or medium risk without intervention'), L('riesgos altos o medios sin intervención', 'high or medium risks without intervention')));
    if (!V.length) g.p5.push(L('Hoja de ruta sin intervenciones', 'Roadmap without interventions'));
    const ph = a.phases.filter(p => p.milestones.funding !== 'aprobado' && V.some(v => v.phase === p.n)).length; if (ph) g.p5.push(pl(ph, L('fase sin financiación confirmada', 'phase without confirmed funding'), L('fases sin financiación confirmada', 'phases without confirmed funding')));
    return g;
  };

  /* ---------- edición genérica de campos v6 ---------- */
  function setV6(path, v, el) {
    const a = C.cur(); if (!a) return; const p = path.split('.');
    const num = el && el.type === 'number';
    const val = num ? (v === '' ? null : +v) : v;
    if (p[0] === 'proc') { const x = a.processes.find(q => q.key === p[1]); if (!x) return; if (p[2] === 'tol') { x.tolerance = x.tolerance || { value: null, unit: 'h', source: '', conf: 'Declarado' }; x.tolerance[p[3]] = val; } else x[p[2]] = val; }
    else if (p[0] === 'asset') { const x = find(a.assets, p[1]); if (!x) return; if (p[2] === 'lc') { x.lifecycle = x.lifecycle || { status: 'unknown', source: '', consultedAt: null, reviewedBy: null }; x.lifecycle[p[3]] = val; if (p[3] === 'status') { x.lifecycle.reviewedBy = C.S.userId; C.log(a, `Registró ciclo de vida de ${x.tag}: ${LCN()[val] || val}`, `Recorded lifecycle of ${x.tag}: ${val}`); } } else x[p[2]] = val; }
    else if (p[0] === 'cov') { const x = a.coverage.find(c => c.domain === p[1]); if (!x) return; x[p[2]] = val; if (p[2] === 'state') { x.applicable = val !== 'no aplica'; C.log(a, `Cobertura ${(D.DOMAINS.find(d => d.key === p[1]) || {}).name || p[1]}: ${val}`, `Coverage ${I.EN[(D.DOMAINS.find(d => d.key === p[1]) || {}).name] || p[1]}: ${I.EN[val] || val}`); } }
    else if (p[0] === 'find') { const x = find(a.findings, p[1]); if (x) x[p[2]] = val; }
    else if (p[0] === 'ph') { const x = a.phases.find(q => q.n === +p[1]); if (!x) return; if (p[2] === 'ms') { x.milestones[p[3]] = val; C.log(a, `Fase ${x.n}: ${p[3]} → ${val}`, `Phase ${x.n}: ${p[3]} → ${I.EN[val] || val}`); } else x[p[2]] = val; }
    C.save();
  }
  document.addEventListener('input', e => { const t = e.target; if (t.dataset && t.dataset.v6 && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type !== 'checkbox'))) setV6(t.dataset.v6, t.value, t); });
  document.addEventListener('change', e => { const t = e.target; if (t.dataset && t.dataset.v6) { setV6(t.dataset.v6, t.type === 'checkbox' ? t.checked : t.value, t); if (t.tagName === 'SELECT') R(); } });
  const inp = (path, v, ph, type) => `<input class="inp" id="v6-${path.replace(/\./g, '-')}" data-v6="${path}" ${type ? `type="${type}" step="any"` : ''} value="${h(v == null ? '' : v)}" placeholder="${h(ph || '')}" aria-label="${h(ph || path)}">`;
  const sel = (path, v, opts, lbl) => `<select class="inp" id="v6-${path.replace(/\./g, '-')}" data-v6="${path}" aria-label="${h(lbl || path)}">${opts.map(o => U.opt(o[0], o[1], v == null ? '' : v)).join('')}</select>`;
  const ta = (path, v, ph) => `<textarea class="inp" id="v6-${path.replace(/\./g, '-')}" data-v6="${path}" rows="2" placeholder="${h(ph || '')}" aria-label="${h(ph || path)}">${h(v || '')}</textarea>`;
  const fld = (lbl, html) => `<div class="field"><label>${lbl}</label>${html}</div>`;

  /* ---------- etapa 2: prioridad del negocio por proceso ---------- */
  // campos obligatorios de la prioridad del negocio (además de justificación y criticidad)
  const hasTol = p => !!(p.tolerance && p.tolerance.value != null && p.tolerance.value !== '');
  C.v6req = p => { if (p.status !== 'incluido') return []; const m = [];
    if (!p.type) m.push(['type', L('Tipo de proceso', 'Process type')]);
    if (!String(p.interruption || '').trim()) m.push(['interruption', L('Consecuencia de una interrupción', 'Consequence of an interruption')]);
    if (p.type !== 'salvaguarda' && !hasTol(p)) m.push(['tol', L('Tolerancia', 'Tolerance')]);
    return m; };
  C.v6missing = p => p.status !== 'incluido' ? (!String(p.just || '').trim() && p.status ? [['just', L('Justificación', 'Justification')]] : [])
    : [].concat(!String(p.just || '').trim() ? [['just', L('Justificación', 'Justification')]] : [], !p.crit ? [['crit', L('Criticidad', 'Criticality')]] : [], C.v6req(p));
  // sugerencias: valores registrados para el mismo proceso del catálogo en otros assessments
  const TYPE_L = () => ({ productivo: L('Productivo', 'Production'), auxiliar: L('Servicio auxiliar', 'Auxiliary service'), salvaguarda: L('Salvaguarda', 'Safeguard') });
  C.v6hist = function (a, p, f) {
    if (!p.catId) return null; const got = [];
    C.S.assessments.filter(o => o.id !== a.id).forEach(o => { const q = (o.processes || []).find(x => x.catId === p.catId && x.status === 'incluido'); if (!q) return;
      const v = f === 'tol' ? (hasTol(q) ? q.tolerance.value + '|' + (q.tolerance.unit || 'h') : '') : String(q[f] || '').trim(); if (v) got.push({ v, code: o.code, ts: o.updated || '' }); });
    if (!got.length) return null;
    const cnt = {}; got.forEach(g => { cnt[g.v] = (cnt[g.v] || 0) + 1; });
    const best = got.slice().sort((x, y) => (cnt[y.v] - cnt[x.v]) || String(y.ts).localeCompare(String(x.ts)))[0];
    const label = f === 'tol' ? best.v.split('|')[0] + ' ' + (best.v.split('|')[1] === 'días' ? L('días', 'days') : best.v.split('|')[1]) : f === 'type' ? (TYPE_L()[best.v] || best.v) : tx(best.v);
    return { v: best.v, label, n: cnt[best.v], total: got.length, codes: got.filter(g => g.v === best.v).map(g => g.code) };
  };
  const sugBox = (a, p, f) => { const s0 = C.v6hist(a, p, f); if (!s0) return '';
    return `<div class="v6-sug"><span class="v6-sug-ic" aria-hidden="true">✦</span><span class="v6-sug-t">${L('Sugerencia', 'Suggestion')}: <b>${h(s0.label)}</b><small>${L('registrado en ', 'recorded in ')}${h(s0.codes.join(', '))}${s0.total > s0.n ? L(` (${s0.n} de ${s0.total} assessments)`, ` (${s0.n} of ${s0.total} assessments)`) : ''}</small></span><button class="v6-sug-ok" data-act="v6-sug" data-k="${p.key}" data-fl="${f}">${L('Aceptar', 'Accept')}</button></div>`; };
  A['v6-sug'] = el => {
    const a = C.cur(); const p = a.processes.find(x => x.key === el.dataset.k); const f = el.dataset.fl; const s0 = C.v6hist(a, p, f); if (!s0) return;
    if (f === 'tol') { const [v, u] = s0.v.split('|'); p.tolerance = Object.assign({ source: '', conf: 'Estimado' }, p.tolerance || {}, { value: +v, unit: u, conf: 'Estimado', source: (p.tolerance && p.tolerance.source) || L('Sugerencia aceptada: ', 'Accepted suggestion: ') + s0.codes.join(', ') }); }
    else p[f] = s0.v;
    (p.sugAccepted = p.sugAccepted || {})[f] = { from: s0.codes, by: C.S.userId, ts: now() };
    C.log(a, `Aceptó la sugerencia «${s0.label}» para ${tx(p.name)} (de ${s0.codes.join(', ')})`, `Accepted suggestion “${s0.label}” for ${tx(p.name)} (from ${s0.codes.join(', ')})`); C.save(); R();
  };
  const fldR = (lbl, html, o) => `<div class="field ${o.miss ? 'miss v6-miss' : ''}"><label>${lbl}${o.req ? '<span class="v6-req" aria-hidden="true">*</span><span class="sr"> (' + L('obligatorio', 'required') + ')</span>' : ''}${o.miss ? `<span class="v6-falta">${L('Falta', 'Missing')}</span>` : ''}</label>${html}${o.sug || ''}</div>`;
  const st2 = U.stage[2];
  U.stage[2] = function (a, ev) {
    const html = st2(a, ev); const parts = html.split('</article>');
    if (parts.length !== a.processes.length + 1) return html;
    a.processes.forEach((p, i) => {
      if (p.status !== 'incluido') return; const t = p.tolerance || {}; const k = p.key; const miss = new Set(C.v6req(p).map(x => x[0]));
      const sg = f => miss.has(f) ? sugBox(a, p, f) : '';
      const typeOpts = (p.type ? [] : [['', L('Seleccione', 'Select')]]).concat([['productivo', L('Productivo', 'Production')], ['auxiliar', L('Servicio auxiliar', 'Auxiliary service')], ['salvaguarda', L('Salvaguarda', 'Safeguard')]]);
      parts[i] += `<div class="v6-biz"><div class="sec-title">${L('Prioridad del negocio · Plant Modeling & Business Priorities', 'Business priority · Plant Modeling & Business Priorities')}</div>
        <p class="v6-reqleg"><span><span class="v6-req">*</span> ${L('Obligatorio', 'Required')}</span><span><i class="v6-leg-miss"></i>${L('Falta por diligenciar', 'Still to fill in')}</span><span><span class="v6-sug-ic">✦</span> ${L('Sugerencia de otros assessments con el mismo proceso del catálogo; solo se guarda si la acepta', 'Suggestion from other assessments with the same catalog process; saved only if you accept it')}</span></p>
        ${p.critCat && p.critFromCat ? `<span class="v6-catcrit">${L('Criticidad sugerida por el catálogo', 'Catalog suggested criticality')}: <b>${h(tx(p.critCat))}</b> → ${h(tx(p.crit3 || ''))} ${L('(escala de 3 niveles; se confirma en la planta)', '(3-level scale; confirmed on site)')}</span>` : ''}
        <div class="g3">${fldR(L('Tipo de proceso', 'Process type'), sel(`proc.${k}.type`, p.type || '', typeOpts), { req: true, miss: miss.has('type'), sug: sg('type') })}
          ${fldR(L('Función', 'Function'), inp(`proc.${k}.function`, p.function, L('Qué hace para el negocio', 'What it does for the business')), { sug: !p.function ? sugBox(a, p, 'function') : '' })}${fldR(L('Capacidad afectada', 'Capacity affected'), inp(`proc.${k}.capacityAffected`, p.capacityAffected, L('p. ej. 100 % del despacho', 'e.g. 100 % of dispatch')), { sug: !p.capacityAffected ? sugBox(a, p, 'capacityAffected') : '' })}</div>
        ${fldR(L('Consecuencia de una interrupción', 'Consequence of an interruption'), ta(`proc.${k}.interruption`, p.interruption, L('Operacional y de negocio', 'Operational and business')), { req: true, miss: miss.has('interruption'), sug: sg('interruption') })}
        <div class="g4">${fldR(L('Tolerancia', 'Tolerance'), inp(`proc.${k}.tol.value`, t.value, L('Valor', 'Value'), 'number'), { req: p.type !== 'salvaguarda', miss: miss.has('tol') })}${fldR(L('Unidad', 'Unit'), sel(`proc.${k}.tol.unit`, t.unit || 'h', [['min', 'min'], ['h', 'h'], ['días', L('días', 'days')]]), {})}
          ${fldR(L('Fuente de la tolerancia', 'Tolerance source'), inp(`proc.${k}.tol.source`, t.source, L('Contrato, permiso, entrevista…', 'Contract, permit, interview…')), {})}${fldR(L('Confianza', 'Confidence'), sel(`proc.${k}.tol.conf`, t.conf || 'Declarado', [['Declarado', L('Declarado', 'Declared')], ['Documentado', L('Documentado', 'Documented')], ['Verificado', L('Verificado', 'Verified')], ['Estimado', L('Estimado', 'Estimated')]]), {})}</div>
        ${sg('tol')}
        ${p.type === 'salvaguarda' ? `<p class="hint">${L('Salvaguarda: protege personas y planta; la tolerancia no aplica y no es obligatoria.', 'Safeguard: protects people and plant; tolerance does not apply and is not required.')}</p>` : ''}
        <div class="grid2">${fldR(L('Restricciones', 'Constraints'), inp(`proc.${k}.constraints`, p.constraints, L('Ventanas de parada, contratos…', 'Shutdown windows, contracts…')), {})}${fldR(L('Fuente', 'Source'), inp(`proc.${k}.source`, p.source, L('Quién o qué documento lo sustenta', 'Who or what document supports it')), {})}</div>
        <p class="hint">${L('La prioridad del negocio no es un nivel de riesgo: la tolerancia se compara con el tiempo de recuperación de cada escenario.', 'Business priority is not a risk level: tolerance is compared with each scenario recovery time.')}</p></div>`;
    });
    return parts.join('</article>');
  };
  // estado «falta» de los obligatorios: se actualiza en el sitio, sin volver a pintar (no roba el foco)
  document.addEventListener('input', e => { const t = e.target, d = t.dataset || {}; if (!(/^proc\.[^.]+\.(interruption|tol\.value)$/.test(d.v6 || '') || /^proc\.[^.]+\.just$/.test(d.f || ''))) return;
    const f = t.closest('.field'); if (!f) return; const empty = !String(t.value || '').trim(); const req = !!f.querySelector('.v6-req') || /\*/.test((f.querySelector('label') || {}).textContent || '');
    if (!req) return; f.classList.toggle('miss', empty); f.classList.toggle('v6-miss', empty); let tag = f.querySelector('label .v6-falta');
    if (empty && !tag) f.querySelector('label').insertAdjacentHTML('beforeend', `<span class="v6-falta">${L('Falta', 'Missing')}</span>`); else if (!empty && tag) tag.remove(); });

  /* ---------- etapa 3: base instalada y ciclo de vida ---------- */
  U.installedBase = function (a, compact) {
    const live = a.assets.filter(x => !C.isOut(x));
    const fam = FAM().map(f => { const n = live.filter(x => x.family === f[0]).length; const s = a.systems.filter(x => !C.isOut(x) && x.family === f[0]).length; return `<div class="${n + s ? '' : 'zero'}"><span>${f[1]}</span><b>${n}</b><span>${pl(s, L('sistema', 'system'), L('sistemas', 'systems'))}</span></div>`; }).join('');
    const lcn = LCN();
    const rows = live.map(x => { const lc = x.lifecycle || { status: 'unknown' };
      return `<tr><td><b>${h(x.tag)}</b><small>${h(tx(x.name))}</small></td><td>${sel(`asset.${x.id}.family`, x.family || '', [['', L('Equipo de proceso', 'Process equipment')]].concat(FAM()))}</td>
        <td>${inp(`asset.${x.id}.mfr`, x.mfr, L('Fabricante', 'Manufacturer'))}</td><td>${inp(`asset.${x.id}.model`, x.model, L('Modelo', 'Model'))}</td><td>${inp(`asset.${x.id}.version`, x.version, L('Versión / firmware', 'Version / firmware'))}</td>
        <td>${sel(`asset.${x.id}.lc.status`, lc.status, Object.entries(lcn), L('Ciclo de vida', 'Lifecycle'))}</td><td>${inp(`asset.${x.id}.lc.source`, lc.source, L('Fuente del fabricante', 'Vendor source'))}<small>${lc.consultedAt ? L('Consultado ', 'Checked ') + h(lc.consultedAt) : L('Sin fecha de consulta', 'No check date')}</small></td>
        <td>${inp(`asset.${x.id}.support`, x.support, L('Soporte', 'Support'))}${inp(`asset.${x.id}.spares`, x.spares, L('Repuestos', 'Spares'))}</td><td>${inp(`asset.${x.id}.redundancy`, x.redundancy, L('Redundancia', 'Redundancy'))}</td></tr>`; }).join('');
    return `<section class="box" id="v6-base"><div class="box-head"><h3>${L('Base instalada y ciclo de vida · Critical Infrastructure', 'Installed base and lifecycle · Critical Infrastructure')}</h3><p>${L('Cinco familias de la lámina 2. El estado de ciclo de vida requiere fuente del fabricante y fecha de consulta; no se infiere de la edad. Ciclo comercial, condición física y soporte se registran por separado.', 'The five families of slide 2. Lifecycle status needs a vendor source and check date; it is not inferred from age. Commercial cycle, physical condition and support are recorded separately.')}</p></div>
      <div class="box-body"><div class="v6-fam">${fam}</div>${live.length ? `<div class="scroll-x"><table class="v6-lct"><thead><tr><th>TAG</th><th>${L('Familia', 'Family')}</th><th>${L('Fabricante', 'Manufacturer')}</th><th>${L('Modelo', 'Model')}</th><th>${L('Versión', 'Version')}</th><th>${L('Ciclo de vida', 'Lifecycle')}</th><th>${L('Fuente', 'Source')}</th><th>${L('Soporte y repuestos', 'Support and spares')}</th><th>${L('Redundancia', 'Redundancy')}</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="empty">${L('Sin activos todavía: se registran en el recorrido o se importan desde Excel.', 'No assets yet: record them in the walkdown or import them from Excel.')}</div>`}</div></section>`;
  };
  const st3 = U.stage[3];
  U.stage[3] = function (a, ev) { return st3(a, ev); };

  /* ---------- etapa 6: cobertura, ficha de escenario y matriz FCOI ---------- */
  // sugerencias de cobertura por dominio: reglas sobre el inventario, el cuestionario, la evidencia y los hallazgos
  const DOMFAM = { control: ['control'], redes: ['redes'], infra: ['infra'], software: ['software'], energia_amb: ['energia'], soporte: null, ciber: [], prog: [] };
  C.v6covSug = function (a, dk, ev) {
    const dn = (D.DOMAINS.find(d => d.key === dk) || {}).name; ev = ev || ev0(a); const qs = ev.app.filter(x => x.q.dim === dn);
    const ans = qs.filter(x => C.answerOK(a, x.q)), unk = qs.filter(x => (a.answers[x.q.id] || {}).value === 'Desconocido'), no = qs.filter(x => (a.answers[x.q.id] || {}).value === 'No');
    const live = a.assets.filter(x => !C.isOut(x)); const fam = DOMFAM[dk]; const as = fam === null ? live.filter(x => x.family) : live.filter(x => fam.includes(x.family));
    const val = as.filter(x => C.okd(x)); const lcu = as.filter(x => !x.lifecycle || x.lifecycle.status === 'unknown');
    const evd = id => a.photos.some(p => p.links && p.links.asset === id) || (a.docs || []).some(d => d.links && d.links.asset === id); const noEv = as.filter(x => !evd(x.id));
    const nPh = a.photos.filter(p => p.links && as.some(x => x.id === p.links.asset)).length, nDc = (a.docs || []).filter(d => d.links && as.some(x => x.id === d.links.asset)).length;
    const scn = a.scenarios.filter(x => x.domain === dk); const fnd = a.findings.filter(f => (f.assets || []).some(y => as.some(x => x.id === y)) || scn.some(x => x.findings.includes(f.id)));
    const noScn = no.filter(x => !fnd.some(f => f.q === x.q.id) && !a.findings.some(f => f.q === x.q.id));
    const r = qs.length ? ans.length / qs.length : 0; let st, why = [];
    if (!qs.length && !as.length) { st = 'no aplica'; why.push(L('No hay activos de esta familia ni preguntas de este dominio en el alcance.', 'No assets of this family and no questions of this domain in scope.')); }
    else if (r >= 0.8 && (!as.length || val.length) && !unk.length) { st = 'revisado'; why.push(L(`${ans.length}/${qs.length} preguntas respondidas sin desconocidos.`, `${ans.length}/${qs.length} questions answered with no unknowns.`)); }
    else if (ans.length || val.length || nPh || nDc) { st = 'en curso'; why.push(L(`Hay avance (${ans.length}/${qs.length} respuestas, ${val.length} activos validados) pero quedan vacíos.`, `There is progress (${ans.length}/${qs.length} answers, ${val.length} validated assets) but gaps remain.`)); }
    else { st = 'no revisado'; why.push(L('Todavía no hay respuestas, activos validados ni evidencia de este dominio.', 'No answers, validated assets or evidence for this domain yet.')); }
    const src = [as.length ? L(`Recorrido: ${val.length}/${as.length} activos validados`, `Walkdown: ${val.length}/${as.length} assets validated`) : '', qs.length ? L(`Cuestionario: ${ans.length}/${qs.length} respuestas`, `Questionnaire: ${ans.length}/${qs.length} answers`) : '', nPh || nDc ? L(`Evidencia: ${nPh} fotos, ${nDc} documentos`, `Evidence: ${nPh} photos, ${nDc} documents`) : ''].filter(Boolean).join(' · ');
    const gaps = [qs.length - ans.length ? L(`${qs.length - ans.length} preguntas sin responder`, `${qs.length - ans.length} unanswered questions`) : '', unk.length ? L(`Desconocido en ${unk.map(x => x.q.id).join(', ')}`, `Unknown in ${unk.map(x => x.q.id).join(', ')}`) : '',
      lcu.length && (dk === 'soporte' || fam && fam.length) ? L(`${lcu.length} activos sin ciclo de vida verificado`, `${lcu.length} assets without verified lifecycle`) : '', noEv.length && as.length ? L(`${noEv.length} activos sin evidencia`, `${noEv.length} assets without evidence`) : ''].filter(Boolean);
    const hints = noScn.map(x => ({ id: x.q.id, text: tx(x.q.text) }));
    return { st, why, src, gaps, hints, qs: qs.length, ans: ans.length, as: as.length, val: val.length, ev: nPh + nDc, fnd: fnd.length, scn: scn.length };
  };
  function covTab(a) {
    const E = ev0(a);
    const rows = a.coverage.map(c => {
      const sg = C.v6covSug(a, c.domain, E); const same = sg.st === c.state && String(c.source || '').trim();
      const fs = [...new Set(c.findings.concat(a.scenarios.filter(s => s.domain === c.domain).flatMap(s => s.findings)))];
      const sug = `<div class="v6c-sug ${same ? 'same' : ''}"><div class="v6c-sh"><span class="v6-sug-ic">✦</span><b>${L('Sugerencia', 'Suggestion')}:</b><span class="v6-cs ${sg.st.replace(' ', '-')}">${h(tx(sg.st))}</span>${same ? `<span class="small mut">${L('· coincide con lo registrado', '· matches what is recorded')}</span>` : `<button class="v6-sug-ok" data-act="v6c-ok" data-d="${c.domain}">${L('Aceptar sugerencia', 'Accept suggestion')}</button>`}</div>
        <ul>${sg.why.map(w => `<li>${h(w)}</li>`).join('')}${sg.src ? `<li><span class="mut">${L('Fuente sugerida', 'Suggested source')}:</span> ${h(sg.src)}</li>` : ''}${sg.gaps.length ? `<li><span class="mut">${L('Vacíos detectados', 'Detected gaps')}:</span> ${h(sg.gaps.join('; '))}</li>` : ''}</ul>
        ${sg.hints.length ? `<div class="v6c-hint"><span class="mut">${L('Posibles escenarios: respuestas «No» sin hallazgo ni escenario', 'Possible scenarios: “No” answers without finding or scenario')}</span>${sg.hints.slice(0, 3).map(x => `<span class="v6-tag" title="${h(x.text)}">${x.id}</span>`).join('')}<button class="plink" data-act="v6c-omnia">${L('Pedir propuestas a omnIA', 'Ask omnIA for proposals')}</button></div>` : ''}</div>`;
      return `<article class="v6c-card"><div class="v6c-h"><div class="v6c-t"><b>${h(DN(c.domain))}</b><small>${sg.qs} ${L('preguntas', 'questions')} · ${sg.as} ${L('activos', 'assets')} · ${sg.ev} ${L('evidencias', 'evidence')} · ${sg.fnd} ${L('hallazgos', 'findings')} · ${sg.scn} ${L('escenarios', 'scenarios')}</small></div>${sel(`cov.${c.domain}.state`, c.state, COVST(), DN(c.domain))}</div>
        ${sug}<div class="grid2">${fld(L('Fuente', 'Source'), inp(`cov.${c.domain}.source`, c.source, L('Fuente', 'Source')))}${fld(L('Vacíos de información', 'Information gaps'), ta(`cov.${c.domain}.gaps`, c.gaps, L('Vacíos de información', 'Information gaps')))}</div>
        ${c.state === 'no revisado' || c.state === 'no aplica' ? fld(L('Justificación (obligatoria si no se revisa)', 'Justification (required if not reviewed)'), ta(`cov.${c.domain}.just`, c.just, L('Justificación', 'Justification'))) : ''}
        ${fs.length || a.scenarios.some(s => s.domain === c.domain) ? `<div class="v6-chips">${fs.map(f => `<span class="v6-tag" title="${h(tx((find(a.findings, f) || {}).title || ''))}">${f}</span>`).join('')}${a.scenarios.filter(s => s.domain === c.domain).map(s => `<span class="v6-tag">${s.id}</span>`).join('')}</div>` : ''}</article>`;
    }).join('');
    const pend = a.coverage.filter(c => { const sg = C.v6covSug(a, c.domain, E); return !(sg.st === c.state && String(c.source || '').trim()); }).length;
    return `<section class="box"><div class="box-head"><h3>${L('Ocho dominios de revisión', 'Eight review domains')}</h3>${pend ? `<button class="btn primary sm" data-act="v6c-all">${L('Aceptar todas las sugerencias', 'Accept all suggestions')} (${pend})</button>` : ''}<p>${L('Cada dominio trae una sugerencia calculada con lo que ya registró: inventario, cuestionario, evidencia, hallazgos y escenarios. Usted decide; un dominio no revisado se informa como limitación, nunca como riesgo bajo.', 'Each domain brings a suggestion computed from what you already recorded: inventory, questionnaire, evidence, findings and scenarios. You decide; a domain not reviewed is reported as a limitation, never as low risk.')}</p></div>
      <div class="box-body"><p class="v6c-note">${ic('info', 'sm')}${L('Motor actual: reglas sobre los datos del assessment. Próximo paso: omnIA con búsqueda en la evidencia cargada (RAG) para sugerir estados, vacíos y escenarios con cita a la fuente.', 'Current engine: rules over the assessment data. Next step: omnIA with retrieval over the uploaded evidence (RAG) to suggest states, gaps and scenarios citing the source.')}</p><div class="v6c-list">${rows}</div></div></section>`;
  }
  const acceptCov = (a, c) => { const sg = C.v6covSug(a, c.domain); c.state = sg.st; c.applicable = sg.st !== 'no aplica'; if (!String(c.source || '').trim()) c.source = sg.src || L('Sin datos registrados para este dominio', 'No data recorded for this domain'); if (!String(c.gaps || '').trim() && sg.gaps.length) c.gaps = sg.gaps.join('; '); if ((sg.st === 'no aplica' || sg.st === 'no revisado') && !String(c.just || '').trim()) c.just = sg.why.join(' '); c.sugBy = C.S.userId; c.sugTs = now(); };
  A['v6c-ok'] = el => { const a = C.cur(); const c = a.coverage.find(x => x.domain === el.dataset.d); acceptCov(a, c); C.log(a, `Aceptó la sugerencia de cobertura de ${DN(c.domain)}: ${c.state}`, `Accepted coverage suggestion for ${DN(c.domain)}: ${c.state}`); C.save(); R(); };
  A['v6c-all'] = () => { const a = C.cur(); a.coverage.forEach(c => acceptCov(a, c)); C.log(a, 'Aceptó todas las sugerencias de cobertura', 'Accepted all coverage suggestions'); C.save(); R(); };
  A['v6c-omnia'] = () => { if (C.omnia) { C.omnia.open(); C.omnia.ask(L('Propón escenarios con lo que hay', 'Propose scenarios from what is there')); } };
  function matrix(a) {
    const cnt = {}; a.scenarios.forEach(s => { if (s.C && s.P) cnt[s.C + ',' + s.P] = (cnt[s.C + ',' + s.P] || 0) + 1; });
    const pend = a.scenarios.filter(s => !lvl(s)).length; const lb = ['', L('Baja', 'Low'), L('Media', 'Medium'), L('Alta', 'High')];
    const rows = [3, 2, 1].map(p => `<div class="h">${lb[p]}</div>` + [1, 2, 3].map(c => { const n = cnt[c + ',' + p] || 0, l = C.LEVEL(c, p); return `<div class="c ${C.lvlClass(l)}${n ? '' : ' z'}"><b>${n}</b><span>${tx(l)}</span></div>`; }).join('')).join('');
    return `<section class="box"><div class="box-head"><h3>${L('Matriz exposición × consecuencia', 'Exposure × consequence matrix')}</h3><p>${L('Escala 3×3 provisional, pendiente de aprobación de Omnicon. ', 'Provisional 3×3 scale, pending Omnicon approval. ')}${pl(pend, L('escenario pendiente de valoración no se ubica', 'scenario pending rating is not placed'), L('escenarios pendientes de valoración no se ubican', 'scenarios pending rating are not placed'))}${L(' en la matriz.', ' in the matrix.')}</p></div>
      <div class="box-body"><div class="v6-mx"><div class="h"></div><div class="h">${L('Consecuencia baja', 'Low consequence')}</div><div class="h">${L('Media', 'Medium')}</div><div class="h">${L('Alta', 'High')}</div>${rows}</div><span class="small mut">${L('Filas: exposición (probabilidad estimada con controles). Columnas: consecuencia.', 'Rows: exposure (estimated likelihood with controls). Columns: consequence.')}</span></div></section>`;
  }
  U.v6rbar = function (a, s) {
    const p = proc(a, s.proc), tH = toH(p.tolerance), r = s.recovery && s.recovery.total;
    if (tH == null && !r) return `<p class="v6-gap unk">${L('Sin tolerancia del proceso ni tiempo de recuperación: no se puede comparar.', 'No process tolerance and no recovery time: cannot compare.')}</p>`;
    const lo = 0.1, hi = 3000, W = 520, X = v => 40 + (Math.log10(Math.max(lo, Math.min(hi, v))) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)) * (W - 80);
    const ticks = [[0.25, '15 min'], [1, '1 h'], [8, '8 h'], [24, L('1 día', '1 day')], [168, L('1 sem', '1 wk')], [720, L('1 mes', '1 mo')]];
    const svg = `<svg viewBox="0 0 ${W} 92" role="img" aria-label="${L('Recuperación frente a tolerancia', 'Recovery versus tolerance')}"><line x1="40" x2="${W - 40}" y1="34" y2="34" stroke="var(--grid)" stroke-width="2"/>` +
      ticks.map(k => `<line x1="${X(k[0])}" x2="${X(k[0])}" y1="30" y2="38" stroke="var(--grid)"/><line x1="${X(k[0])}" x2="${X(k[0])}" y1="74" y2="78" stroke="var(--grid)"/><text x="${X(k[0])}" y="88" text-anchor="middle">${k[1]}</text>`).join('') +
      (r ? `<rect x="${X(r.min)}" y="26" width="${Math.max(6, X(r.max) - X(r.min))}" height="16" rx="5" fill="var(--rec)" opacity=".85"/><text x="${Math.min(X(r.min), W - 220)}" y="18" style="fill:var(--rec);font-weight:600">${L('Recuperación ', 'Recovery ')}${fmtH(r.min)}–${fmtH(r.max)}</text>` : '') +
      (tH != null ? `<line x1="${X(tH || 0.1)}" x2="${X(tH || 0.1)}" y1="20" y2="48" stroke="var(--tol)" stroke-width="3"/><text x="${X(tH || 0.1)}" y="63" text-anchor="middle" style="fill:var(--tol);font-weight:600">${L('Tolera ', 'Tolerates ')}${tH ? fmtH(tH) : '0 h'}</text>` : '') + '</svg>';
    const msg = tH == null ? `<p class="v6-gap unk">${L('El proceso no tiene tolerancia registrada: complétela en la etapa 2.', 'The process has no recorded tolerance: complete it in stage 2.')}</p>` : !r ? `<p class="v6-gap unk">${L('Tiempo de recuperación desconocido: falta para comparar con la tolerancia de ', 'Unknown recovery time: needed to compare with the tolerance of ')}${fmtH(tH)}.</p>`
      : r.min > tH ? `<p class="v6-gap bad">${L('Brecha: aun en el mejor caso la recuperación (', 'Gap: even in the best case recovery (')}${fmtH(r.min)}${L(') supera lo tolerable (', ') exceeds what is tolerable (')}${fmtH(tH)}).</p>`
      : r.max > tH ? `<p class="v6-gap bad">${L('Brecha posible: el peor caso (', 'Possible gap: the worst case (')}${fmtH(r.max)}${L(') supera lo tolerable (', ') exceeds what is tolerable (')}${fmtH(tH)}).</p>` : `<p class="v6-gap ok">${L('La recuperación estimada queda dentro de lo tolerable.', 'Estimated recovery is within what is tolerable.')}</p>`;
    return `<div class="v6-rbar">${svg}${msg}</div>`;
  };
  function ficha(a, s, open) {
    const p = proc(a, s.proc), r = s.recovery || {}, l = lvl(s), imp = s.impact || {}, key = 'v6s-' + s.id;
    const ctlPill = st => st === 'Verificado' ? 'ok' : st === 'Ausente' ? 'err' : 'warn';
    return `<details class="v6-scn" id="v6scn-${s.id}" data-open-key="${key}" ${U.openKeys.has(key) || open ? 'open' : ''}><summary><span class="v6-sid">${s.id}</span><span class="v6-stitle"><b>${h(tx(s.title))}</b><small>${h(DN(s.domain || 'control'))} · ${h(tx(p.name))}${s.origin === 'omnIA' ? ' · ' + L('borrador propuesto por omnIA', 'draft proposed by omnIA') : ''}</small></span>${U.lv(l)}<span class="v6-caret">${ic('chev')}</span></summary><div class="v6-sbody">
      <div class="v6-blk"><h4>Failure${L(' <small>· Falla</small>', '')}</h4><p class="small"><b>${h(tx(s.event || s.title))}</b></p>${(s.causes || []).length ? `<ul>${s.causes.map(c => `<li>${h(tx(c))}</li>`).join('')}</ul>` : `<p class="small mut">${h(tx(s.cause || L('Causas sin registrar', 'Causes not recorded')))}</p>`}</div>
      <div class="v6-blk"><h4>Impact${L(' <small>· Impacto</small>', '')}</h4><div class="v6-kv"><span>${L('Operacional', 'Operational')}</span><span>${h(tx(imp.operational || s.cons || '—'))}</span><span>${L('Negocio', 'Business')}</span><span>${h(tx(imp.business || '—'))}</span><span>${L('Magnitud', 'Magnitude')}</span><span>${h(tx(imp.magnitude || '—'))}</span><span>${L('Fundamento', 'Basis')}</span><span>${h(tx(imp.basis || '—'))}</span></div></div>
      <div class="v6-blk"><h4>Controls${L(' <small>· Controles existentes</small>', '')}</h4>${s.controls.length ? s.controls.map(c => `<div class="v6-ctl"><span class="nm">${h(tx(c.name))}</span>${c.type ? `<span class="v6-tag">${h(tx(c.type))}</span>` : ''}<span class="pill ${ctlPill(c.st)}">${h(tx(c.st))}</span></div>`).join('') : `<p class="small mut">${L('Sin controles registrados.', 'No controls recorded.')}</p>`}</div>
      <div class="v6-blk"><h4>Alternatives${L(' <small>· Alternativas</small>', '')}</h4>${(s.alternatives || []).length ? `<ul>${s.alternatives.map(x => `<li><b>${h(tx(x.kind))}:</b> ${h(tx(x.desc))}${x.limitation ? ` <span class="mut">— ${L('Limitación', 'Limitation')}: ${h(tx(x.limitation))}</span>` : ''}</li>`).join('')}</ul>` : `<p class="small mut">${L('Sin alternativas registradas.', 'No alternatives recorded.')}</p>`}</div>
      <div class="v6-blk full"><h4>Recovery Time <small>· ${L('Recuperación frente a la tolerancia del negocio', 'Recovery versus business tolerance')}</small></h4>${U.v6rbar(a, s)}
        <div class="v6-kv"><span>${L('Diagnóstico', 'Diagnosis')}</span><span>${h(r.diagnosis || '—')}</span><span>${L('Suministro', 'Supply')}</span><span>${h(r.supply || '—')}</span><span>${L('Reparación', 'Repair')}</span><span>${h(r.repair || '—')}</span><span>${L('Retorno', 'Return')}</span><span>${h(r['return'] || '—')}</span><span>${L('Fuente · confianza', 'Source · confidence')}</span><span>${h(r.source || '—')} · ${h(tx(r.conf || 'Desconocido'))}${r.tested ? L(' · probado', ' · tested') : ''}</span></div></div>
      <div class="v6-blk"><h4>${L('Valoración', 'Rating')}</h4><div class="v6-kv"><span>${L('Consecuencia', 'Consequence')}</span><span>${s.C || '—'} · ${h(tx(s.justC || ''))}</span><span>${L('Exposición', 'Exposure')}</span><span>${s.P || '—'} · ${h(tx(s.justP || L('Sin valorar', 'Not rated')))}</span><span>${L('Incertidumbre', 'Uncertainty')}</span><span>${h(tx(s.uncertainty || '—'))}</span></div>${!l ? `<div class="v6-rate-cta">${ic('alert', 'sm')}<span><b>${L('Pendiente de evaluación', 'Pending assessment')}</b>${[!s.C ? L('falta la consecuencia', 'consequence missing') : '', !s.P ? L('falta la exposición', 'exposure missing') : ''].filter(Boolean).join(' · ')}</span><button class="btn primary sm" data-act="v6-rate" data-id="${s.id}">${L('Valorar ahora', 'Rate now')}</button></div>` : `<button class="plink" style="align-self:flex-start" data-act="v6-rate" data-id="${s.id}">${ic('edit', 'sm')}${L('Ajustar valoración', 'Adjust rating')}</button>`}</div>
      <div class="v6-blk"><h4>${L('Vínculos', 'Links')}</h4><div class="v6-chips">${s.findings.map(x => `<span class="v6-tag">${x}</span>`).join('')}${s.assets.map(x => `<span class="v6-tag">${h(C.assetLbl(a, x))}</span>`).join('')}${(s.deps || []).map(x => `<span class="v6-tag">${x}</span>`).join('')}</div>
        <div class="v6-chips">${a.interventions.filter(v => v.scenarios.includes(s.id)).map(v => `<button class="v6-tag" data-act="v6-iv" data-id="${v.id}">${v.id} · ${v.strategy ? L(STRAT[v.strategy][0], STRAT[v.strategy][1]) : L('Por clasificar', 'To classify')}</button>`).join('')}</div>
        <div class="row"><button class="btn ghost sm" data-act="v6-scn-edit" data-id="${s.id}">${ic('edit', 'sm')}${L('Editar ficha', 'Edit sheet')}</button><button class="btn ghost sm" data-act="v6-scn-classic" data-id="${s.id}">${L('Valoración, controles y recomendaciones', 'Rating, controls and recommendations')}</button><button class="btn ghost sm" data-act="trace-open" data-key="scenario:${s.id}">${ic('link', 'sm')}${L('Trazabilidad', 'Traceability')}</button></div></div>
      </div></details>`;
  }
  function scnTab(a) {
    if (!a.scenarios.length) return `<div class="empty"><b>${L('Sin escenarios todavía', 'No scenarios yet')}</b><span>${L('Cree el primero en «Editor de escenarios» o acepte una propuesta de omnIA.', 'Create the first one in “Scenario editor” or accept an omnIA proposal.')}</span><button class="btn primary sm" data-act="v6-tab" data-tab="editor">${L('Abrir el editor', 'Open the editor')}</button></div>`;
    return matrix(a) + `<div style="display:flex;flex-direction:column;gap:10px">${a.scenarios.map((s, i) => ficha(a, s, i === 0 && !U.openKeys.size)).join('')}</div>`;
  }
  function fcoiTab(a, o2) {
    if (!a.findings.length) return `<div class="empty"><b>${L('Sin hallazgos todavía', 'No findings yet')}</b><span>${L('Los hallazgos se registran en el recorrido o el cuestionario con su contexto heredado.', 'Findings are recorded in the walkdown or questionnaire with inherited context.')}</span></div>`;
    const used = new Set(); const fst = f => `<span class="pill ${f.status === 'confirmado' ? 'ok' : f.status === 'descartado' ? '' : 'warn'}">${h(tx(f.status || 'confirmado'))}</span>`;
    const rows = a.opportunities.map(o => { o.findings.forEach(f => used.add(f)); const est = (o.impact || {}).estimate || 'Por estimar';
      return `<div class="v6-fcoi-r"><div><span class="lbl">${L('Finding · Hallazgo', 'Finding')}</span>${o.findings.map(fid => { const f = find(a.findings, fid) || { title: fid }; return `<span><b>${fid}</b> ${h(tx(f.title))}</span><span class="v6-chips">${fst(f)}${f.level ? `<span class="v6-tag">${h(tx(f.level))}</span>` : ''}</span>`; }).join('')}</div>
        <div><span class="lbl">${L('Consequence · Consecuencia', 'Consequence')}</span><span>${h(tx(o.consequence || '—'))}</span><span class="v6-chips">${o.scenarios.map(x => `<span class="v6-tag">${x}</span>`).join('')}</span></div>
        <div><span class="lbl">${L('Opportunity · Oportunidad', 'Opportunity')}</span><b>${o.id} · ${h(tx(o.title))}</b>${o.alternatives ? `<span class="mut">${L('Alternativas', 'Alternatives')}: ${h(tx(o.alternatives))}</span>` : ''}</div>
        <div><span class="lbl">Impact · ${L('Impacto esperado', 'Expected impact')}</span><span><span class="v6-tag">${h(tx((o.impact || {}).dimension || '—'))}</span> ${h(tx((o.impact || {}).text || ''))}</span><span class="${/por estimar/i.test(est) ? 'v6-pe' : ''}">${h(tx(est))}</span>${(o.impact || {}).basis ? `<span class="mut">${L('Base', 'Basis')}: ${h(tx(o.impact.basis))}</span>` : ''}${(o.impact || {}).assumption ? `<span class="mut">${L('Supuesto', 'Assumption')}: ${h(tx(o.impact.assumption))}</span>` : ''}</div>
        <div class="v6-fcoi-st"><span class="lbl">${L('Estado', 'Status')}</span><div class="v6-fcoi-sr"><span class="pill ${o.status === 'aceptada' ? 'ok' : o.status === 'descartada' ? '' : 'warn'}">${h(tx(o.status))}</span><span class="v6w v6w-inl">${U.v6kebab ? U.v6kebab('opp:' + o.id, o.id, [U.v6mi(`data-act="v6-opp" data-id="${o.id}"`, 'edit', L('Editar', 'Edit')), U.v6mi(`data-act="v6-opp-del" data-id="${o.id}"`, 'x', L('Borrar', 'Delete'), 'danger')]) : `<button class="icon-btn" data-act="v6-opp" data-id="${o.id}" aria-label="${L('Editar', 'Edit')}">${ic('edit', 'sm')}</button>`}</span></div>
          ${o.reviewer ? `<span class="v6-fcoi-rv">${U.av(o.reviewer, 'sm')}<small>${L('Revisa', 'Reviewer')}<b>${h(C.uname(o.reviewer))}</b></small></span>` : ''}</div></div>`; }).join('');
    const orphan = a.findings.filter(f => !used.has(f.id));
    return `<section class="box v6-fcoi"><div class="box-head"><h3>${L('Matriz Finding → Consequence → Opportunity → Impact', 'Finding → Consequence → Opportunity → Impact matrix')}</h3><button class="btn primary sm" data-act="v6-opp" data-id="">${ic('plus', 'sm')}${L('Oportunidad', 'Opportunity')}</button><p>${L('Una oportunidad puede atender varios hallazgos y un hallazgo puede tener varias oportunidades. El impacto sin base se marca «Por estimar».', 'One opportunity can address several findings and a finding can have several opportunities. Impact without a basis is marked “To estimate”.')}</p></div>
      <div class="v6-fcoi-h"><span>${L('Finding · Hallazgo', 'Finding')}</span><span>${L('Consequence · Consecuencia', 'Consequence')}</span><span>${L('Opportunity · Oportunidad', 'Opportunity')}</span><span>${L('Impact · Impacto', 'Impact')}</span><span>${L('Estado', 'Status')}</span></div>${rows || `<div class="box-body"><p class="small mut">${L('Sin oportunidades registradas.', 'No opportunities recorded.')}</p></div>`}</section>
      ${orphan.length && !(o2 && o2.noOrphan) ? `<section class="box"><div class="box-head"><h3>${L('Hallazgos sin oportunidad', 'Findings without opportunity')} · ${orphan.length}</h3><p>${L('Quedan visibles hasta que se asocien a una oportunidad o se descarten con motivo.', 'They stay visible until linked to an opportunity or discarded with a reason.')}</p></div><div class="box-body">${orphan.map(f => `<div class="v6-ctl"><span class="nm"><b>${f.id}</b> ${h(tx(f.title))}</span>${sel(`find.${f.id}.status`, f.status || 'confirmado', [['pendiente de verificación', L('Pendiente de verificación', 'Pending verification')], ['confirmado', L('Confirmado', 'Confirmed')], ['descartado', L('Descartado', 'Discarded')]], f.id)}<button class="btn ghost sm" data-act="v6-opp" data-id="" data-f="${f.id}">${L('Crear oportunidad', 'Create opportunity')}</button></div>`).join('')}</div></section>` : ''}`;
  }
  const st6 = U.stage[6];
  U.stage[6] = function (a, ev) {
    const tab = C.S.ui.v6tab || 'escenarios';
    const tabs = [['cobertura', L('Cobertura por dominio', 'Domain coverage')], ['escenarios', L('Escenarios', 'Scenarios') + ' · ' + a.scenarios.length], ['fcoi', L('Hallazgos y oportunidades', 'Findings and opportunities')], ['editor', L('Editor de escenarios', 'Scenario editor')]];
    const body = tab === 'cobertura' ? covTab(a) : tab === 'fcoi' ? (U.fcoiTab ? U.fcoiTab(a, fcoiTab) : fcoiTab(a)) : tab === 'editor' ? st6(a, ev) : scnTab(a);
    return `<div class="tabs" role="tablist">${tabs.map(t => `<button role="tab" data-act="v6-tab" data-tab="${t[0]}" aria-selected="${tab === t[0]}">${t[1]}</button>`).join('')}</div><div style="display:flex;flex-direction:column;gap:14px">${body}</div>`;
  };
  A['v6-tab'] = el => { C.S.ui.v6tab = el.dataset.tab; R(); };
  A['v6-scn-classic'] = el => { C.S.ui.v6tab = 'editor'; U.openKeys.add('scn-' + el.dataset.id); R(); setTimeout(() => { const t = document.getElementById('scn-' + el.dataset.id); if (t) t.scrollIntoView({ block: 'start' }); }, 0); };
  A['v6-scn-edit'] = el => U.openModal('v6scn', { id: el.dataset.id });
  const val = id => (document.getElementById(id) || {}).value || '';
  U.modals.v6scn = function (a, d) {
    const s = find(a.scenarios, d.id); if (!s) return { title: '—', body: '' }; const r = s.recovery || {}, t = r.total || {}, imp = s.impact || {};
    const alts = (s.alternatives || []).map(x => `${x.kind}: ${x.desc}${x.limitation ? ' | ' + x.limitation : ''}`).join('\n');
    const f = (id, lbl, v, ph) => `<div class="field"><label for="${id}">${lbl}</label><input id="${id}" value="${h(v || '')}" placeholder="${h(ph || '')}"></div>`;
    const t2 = (id, lbl, v, ph) => `<div class="field"><label for="${id}">${lbl}</label><textarea id="${id}" rows="2" placeholder="${h(ph || '')}">${h(v || '')}</textarea></div>`;
    return { title: s.id + ' · ' + L('Ficha del escenario', 'Scenario sheet'), wide: true, body: `
      <div class="grid2"><div class="field"><label for="v6s-dom">${L('Dominio de revisión', 'Review domain')}</label><select id="v6s-dom">${(D.DOMAINS || []).map(x => U.opt(x.key, DN(x.key), s.domain || 'control')).join('')}</select></div>${f('v6s-ev', 'Failure · ' + L('evento o modo de falla', 'event or failure mode'), s.event || s.title)}</div>
      ${t2('v6s-ca', L('Causas (una por línea)', 'Causes (one per line)'), (s.causes || (s.cause ? [s.cause] : [])).join('\n'))}
      <div class="grid2">${t2('v6s-io', 'Impact · ' + L('operacional', 'operational'), imp.operational || s.cons)}${t2('v6s-ib', 'Impact · ' + L('negocio', 'business'), imp.business)}</div>
      <div class="grid2">${f('v6s-im', L('Magnitud estimada', 'Estimated magnitude'), imp.magnitude, L('Alta, media, baja o cifra con unidad', 'High, medium, low or figure with unit'))}${f('v6s-ia', L('Fundamento', 'Basis'), imp.basis)}</div>
      ${t2('v6s-al', 'Alternatives · ' + L('una por línea: «Tipo: descripción | limitación»', 'one per line: “Type: description | limitation”'), alts)}
      <div class="sec-title">Recovery Time</div>
      <div class="grid2">${f('v6s-rd', L('Diagnóstico', 'Diagnosis'), r.diagnosis)}${f('v6s-rs', L('Suministro', 'Supply'), r.supply)}${f('v6s-rr', L('Reparación / restauración', 'Repair / restore'), r.repair)}${f('v6s-rt', L('Retorno a operación', 'Return to operation'), r['return'])}</div>
      <div class="grid2"><div class="field"><label for="v6s-tmin">${L('Total mínimo (h)', 'Total minimum (h)')}</label><input id="v6s-tmin" type="number" step="any" value="${t.min != null ? t.min : ''}"></div><div class="field"><label for="v6s-tmax">${L('Total máximo (h)', 'Total maximum (h)')}</label><input id="v6s-tmax" type="number" step="any" value="${t.max != null ? t.max : ''}"></div></div>
      <div class="grid2">${f('v6s-rsrc', L('Fuente', 'Source'), r.source)}<div class="field"><label for="v6s-rconf">${L('Confianza', 'Confidence')}</label><select id="v6s-rconf">${['Verificado', 'Estimado', 'Desconocido'].map(x => U.opt(x, tx(x), r.conf || 'Desconocido')).join('')}</select></div></div>
      <label class="check"><input type="checkbox" id="v6s-rtest" ${r.tested ? 'checked' : ''}><span>${L('Tiempo probado (no solo estimado)', 'Tested time (not only estimated)')}</span></label>
      ${t2('v6s-unc', L('Incertidumbre', 'Uncertainty'), s.uncertainty, L('Qué falta saber para confiar en la valoración', 'What is still unknown to trust the rating'))}
      <p class="hint">${L('La consecuencia, la exposición y los controles se editan en «Valoración, controles y recomendaciones».', 'Consequence, exposure and controls are edited in “Rating, controls and recommendations”.')}</p>`,
      foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button><button class="btn primary" data-act="v6-scn-save" data-id="${s.id}">${L('Guardar ficha', 'Save sheet')}</button>` };
  };
  A['v6-scn-save'] = el => {
    const a = C.cur(); const s = find(a.scenarios, el.dataset.id); if (!s) return;
    const lines = id => val(id).split('\n').map(x => x.trim()).filter(Boolean);
    s.domain = val('v6s-dom'); s.event = val('v6s-ev'); s.causes = lines('v6s-ca'); s.cause = s.causes.join('; ');
    s.impact = { operational: val('v6s-io'), business: val('v6s-ib'), magnitude: val('v6s-im'), basis: val('v6s-ia') }; s.cons = [s.impact.operational, s.impact.business].filter(Boolean).join(' ');
    s.alternatives = lines('v6s-al').map(x => { const [a1, lim] = x.split('|'); const i = a1.indexOf(':'); return { kind: i > 0 ? a1.slice(0, i).trim() : L('Alternativa', 'Alternative'), desc: (i > 0 ? a1.slice(i + 1) : a1).trim(), limitation: (lim || '').trim() }; });
    const mn = val('v6s-tmin'), mx = val('v6s-tmax');
    s.recovery = { diagnosis: val('v6s-rd'), supply: val('v6s-rs'), repair: val('v6s-rr'), 'return': val('v6s-rt'), total: mn !== '' || mx !== '' ? { min: +(mn || mx), max: +(mx || mn), unit: 'h' } : null, source: val('v6s-rsrc'), conf: val('v6s-rconf'), tested: !!(document.getElementById('v6s-rtest') || {}).checked };
    s.uncertainty = val('v6s-unc');
    C.log(a, 'Actualizó la ficha del escenario ' + s.id, 'Updated scenario sheet ' + s.id); C.save(); U.closeModal(); U.openKeys.add('v6s-' + s.id); R();
  };
  U.modals.v6opp = function (a, d) {
    const o = d.id ? find(a.opportunities, d.id) : { id: '', title: '', alternatives: '', findings: d.f ? [d.f] : [], scenarios: d.f ? a.scenarios.filter(s => s.findings.includes(d.f)).map(s => s.id) : [], consequence: '', impact: { dimension: 'Continuidad', text: '', basis: '', assumption: '', estimate: 'Por estimar' }, reviewer: a.leadId, status: 'propuesta' };
    const cb = (cls, list, on, lbl) => `<div class="cbs">${list.map(x => `<label><input type="checkbox" class="${cls}" value="${x.id}" ${on.includes(x.id) ? 'checked' : ''}>${h(lbl(x))}</label>`).join('')}</div>`;
    const imp = o.impact || {};
    return { title: (o.id || L('Nueva oportunidad', 'New opportunity')), wide: true, body: `
      <div class="field"><label for="v6o-t">Opportunity · ${L('mejora práctica', 'practical improvement')} *</label><input id="v6o-t" value="${h(o.title)}" data-autofocus></div>
      <div class="field"><span class="lbl">Finding · ${L('hallazgos que atiende', 'findings addressed')}</span>${cb('v6o-f', a.findings, o.findings, x => x.id + ' · ' + tx(x.title))}</div>
      <div class="field"><span class="lbl">${L('Escenarios relacionados', 'Related scenarios')}</span>${cb('v6o-s', a.scenarios, o.scenarios, x => x.id + ' · ' + tx(x.title))}</div>
      <div class="field"><label for="v6o-c">Consequence · ${L('efecto actual o potencial', 'current or potential effect')}</label><textarea id="v6o-c" rows="2">${h(o.consequence)}</textarea></div>
      <div class="field"><label for="v6o-a">${L('Alternativas consideradas', 'Alternatives considered')}</label><input id="v6o-a" value="${h(o.alternatives)}"></div>
      <div class="grid2"><div class="field"><label for="v6o-d">Impact · ${L('dimensión', 'dimension')}</label><select id="v6o-d">${DIMS_OPP.map(x => U.opt(x, tx(x), imp.dimension)).join('')}</select></div><div class="field"><label for="v6o-e">${L('Estimación (o «Por estimar»)', 'Estimate (or “To estimate”)')}</label><input id="v6o-e" value="${h(imp.estimate || 'Por estimar')}"></div></div>
      <div class="field"><label for="v6o-x">${L('Beneficio esperado', 'Expected benefit')}</label><input id="v6o-x" value="${h(imp.text)}"></div>
      <div class="grid2"><div class="field"><label for="v6o-b">${L('Base', 'Basis')}</label><input id="v6o-b" value="${h(imp.basis)}"></div><div class="field"><label for="v6o-u">${L('Supuesto', 'Assumption')}</label><input id="v6o-u" value="${h(imp.assumption)}"></div></div>
      <div class="grid2"><div class="field"><label for="v6o-st">${L('Estado', 'Status')}</label><select id="v6o-st">${['propuesta', 'por validar', 'aceptada', 'descartada'].map(x => U.opt(x, tx(x), o.status)).join('')}</select></div><div class="field"><label for="v6o-r">${L('Revisa', 'Reviewer')}</label><select id="v6o-r">${C.USERS.map(u => U.opt(u.id, u.name, o.reviewer)).join('')}</select></div></div>
      <p class="hint">${L('No se inventan ahorros ni porcentajes de reducción: sin base verificable, use «Por estimar».', 'No invented savings or reduction percentages: without a verifiable basis, use “To estimate”.')}</p>`,
      foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button><button class="btn primary" data-act="v6-opp-save" data-id="${o.id}">${L('Guardar', 'Save')}</button>` };
  };
  A['v6-opp'] = el => U.openModal('v6opp', { id: el.dataset.id || '', f: el.dataset.f || '' });
  A['v6-opp-del'] = el => { const a = C.cur(); const id = el.dataset.id; const o = find(a.opportunities, id); if (!o) return;
    U.openModal('confirm', { title: L('Borrar oportunidad', 'Delete opportunity'), msg: L(`Se borrará ${id} · ${tx(o.title)}. Los hallazgos y escenarios se conservan; las intervenciones que la citaban pierden ese vínculo.`, `${id} · ${tx(o.title)} will be deleted. Findings and scenarios are kept; interventions that cited it lose that link.`), yes: L('Borrar', 'Delete'), danger: true,
      onYes: () => { a.opportunities = a.opportunities.filter(z => z.id !== id); (a.interventions || []).forEach(v => { v.opportunities = (v.opportunities || []).filter(z => z !== id); }); C.log(a, 'Borró la oportunidad ' + id, 'Deleted opportunity ' + id); C.save(); R(); } }); };
  A['v6-opp-save'] = el => {
    const a = C.cur(); const t = val('v6o-t').trim(); if (!t) return U.toast(L('Escriba la oportunidad', 'Enter the opportunity'));
    let o = el.dataset.id ? find(a.opportunities, el.dataset.id) : null;
    if (!o) { let k = a.opportunities.length + 1, id; do { id = 'O-' + String(k++).padStart(2, '0'); } while (find(a.opportunities, id)); o = { id }; a.opportunities.push(o); C.log(a, 'Registró la oportunidad ' + id, 'Recorded opportunity ' + id); }
    const chk = cls => [...document.querySelectorAll('.' + cls + ':checked')].map(x => x.value);
    Object.assign(o, { title: t, findings: chk('v6o-f'), scenarios: chk('v6o-s'), consequence: val('v6o-c'), alternatives: val('v6o-a'), status: val('v6o-st'), reviewer: val('v6o-r'),
      impact: { dimension: val('v6o-d'), text: val('v6o-x'), basis: val('v6o-b'), assumption: val('v6o-u'), estimate: val('v6o-e').trim() || 'Por estimar' } });
    C.save(); U.closeModal(); R();
  };

  /* ---------- etapa 7: hoja de ruta priorizada ---------- */
  function rmList(a, V) {
    return `<section class="box"><div class="box-head"><h3>${L('Orden de ejecución', 'Execution order')}</h3><button class="btn primary sm" data-act="v6-iv" data-id="">${ic('plus', 'sm')}${L('Intervención', 'Intervention')}</button><p>${L('El orden se justifica y se puede cambiar a mano con motivo (queda en el historial).', 'The order is justified and can be changed manually with a reason (kept in history).')}</p></div><div>` +
      V.map(v => `<button class="v6-rm-row" data-act="v6-iv" data-id="${v.id}"><span class="v6-ord">${v.order}</span><span class="v6-rm-t"><b>${v.id} · ${h(tx(v.title))}</b><small>${h(tx(v.orderReason || v.priorityRationale || ''))}${v.dependsOn.length ? L(' · depende de ', ' · depends on ') + v.dependsOn.join(', ') : ''}</small></span>
        <span class="v6-chips">${stChip(v.strategy)}<span class="v6-tag">${L('Fase ', 'Phase ')}${v.phase}</span>${v.kind === 'estudio' ? `<span class="v6-tag">${L('Estudio', 'Study')}</span>` : ''}</span><span class="small ${(v.cost || {}).level === 'Por estimar' ? 'v6-pe' : ''}">${h(tx((v.cost || {}).range || 'Por estimar'))}</span><span class="pill ${['aprobada', 'completada', 'verificada'].includes(v.status) ? 'ok' : v.status === 'en ejecución' ? 'pri' : v.status === 'por validar' ? 'warn' : ''}">${h(tx(v.status))}</span></button>`).join('') + `</div></section>`;
  }
  function rmPhases(a, V) {
    const fr = FRONT(), ms = MS();
    const head = `<div class="v6-fr-h corner">${L('Frente / fase', 'Front / phase')}</div>` + a.phases.map(p => `<div class="v6-ph-h"><b>${L('Fase ', 'Phase ')}${p.n} · ${h(tx(p.name))}</b><small>${h(p.horizon || L('Horizonte por acordar', 'Horizon to agree'))}</small><div class="v6-ms">${Object.keys(ms).map(k => `<span><i class="${(p.milestones[k] || '').replace(' ', '-')}"></i>${ms[k]}: ${h(tx(p.milestones[k]))}</span>`).join('')}</div><button class="btn ghost sm" style="color:#fff;border-color:rgba(255,255,255,.3);background:transparent" data-act="v6-ph" data-n="${p.n}">${L('Editar fase', 'Edit phase')}</button></div>`).join('');
    const unc = V.filter(v => !v.front);
    const rows = Object.keys(fr).map(f => `<div class="v6-fr-h">${fr[f][0]}<small>${fr[f][1]}</small></div>` + [1, 2, 3].map(n => `<div class="v6-cell" aria-label="${h(fr[f][0])}, ${L('fase', 'phase')} ${n}">${V.filter(v => v.front === f && v.phase === n).map(v => icard(v)).join('')}</div>`).join('')).join('');
    return `<section class="box"><div class="box-head"><h3>${L('Fases según la capacidad de inversión del cliente', 'Phases by the client investment capacity')}</h3><p>${L('Los nombres de fase no fijan meses universales; el horizonte lo acuerda el cliente. Los hitos indican qué falta para ejecutar cada fase.', 'Phase names do not set universal months; the client agrees the horizon. Milestones show what is missing to execute each phase.')}</p></div><div class="box-body"><div class="v6-phgrid">${head}${rows}</div>
      ${unc.length ? `<div class="note-demo">${ic('alert')}<span>${L('Sin frente asignado: ', 'No front assigned: ')}${unc.map(v => v.id).join(', ')}</span></div>` : ''}</div></section>`;
    function icard(v) { return `<button class="v6-icard" data-act="v6-iv" data-id="${v.id}"><b>${v.id} · ${h(tx(v.title))}</b><span class="v6-chips">${stChip(v.strategy)}${v.kind === 'estudio' ? `<span class="v6-tag">${L('Estudio', 'Study')}</span>` : ''}</span><small>${h(tx((v.cost || {}).range || ''))}${v.dependsOn.length ? L(' · depende de ', ' · depends on ') + v.dependsOn.join(', ') : ''}</small></button>`; }
  }
  function dispTable(a) {
    if (!a.dispositions.length) return '';
    const lcn = LCN();
    return `<section class="box"><div class="box-head"><h3>${L('Disposición recomendada por activo o sistema', 'Recommended disposition by asset or system')}</h3><p>${L('No se prescribe modernización por antigüedad: cada disposición tiene justificación y quién la valida.', 'Modernization is not prescribed by age: each disposition has a justification and a validator.')}</p></div><div class="scroll-x"><table><thead><tr><th>${L('Activo / sistema', 'Asset / system')}</th><th>${L('Ciclo de vida', 'Lifecycle')}</th><th>${L('Estrategia', 'Strategy')}</th><th>${L('Justificación', 'Justification')}</th><th>${L('Valida', 'Validated by')}</th></tr></thead><tbody>` +
      a.dispositions.map(d => { const x = find(a.assets, d.target) || find(a.systems, d.target) || {}; const lc = x.lifecycle; return `<tr><td><b>${h(x.tag || tx(x.name || d.target))}</b><div class="small mut">${h(tx(x.name || ''))}</div></td><td>${lc ? `<span class="v6-lc ${lc.status}">${lcn[lc.status]}</span>` : '—'}</td><td>${stChip(d.strategy, true)}</td><td>${h(tx(d.justification))}${d.alternatives ? `<div class="small mut">${L('Alternativa considerada', 'Alternative considered')}: ${h(tx(d.alternatives))}</div>` : ''}</td><td>${h(C.uname(d.validatedBy))}</td></tr>`; }).join('') + `</tbody></table></div></section>`;
  }
  U.v6roadmap = function (a) {
    const V = a.interventions.filter(v => v.status !== 'descartada').slice().sort((x, y) => x.order - y.order); const mode = C.S.ui.v6rm || 'lista';
    const head = `<div class="row" style="justify-content:space-between;align-items:flex-end"><div><h3 class="grp" style="margin:0">${L('Hoja de ruta priorizada · Prioritized Roadmap', 'Prioritized Roadmap')}</h3><p class="small mut">${L('Qué hacer primero, después y por qué. Las estrategias no son etapas obligatorias: Mantener también es una decisión válida.', 'What to do first, next and why. Strategies are not mandatory stages: Maintain is also a valid decision.')}</p></div>
      <div class="seg" role="group" aria-label="${L('Vista', 'View')}"><button data-act="v6-rm" data-m="lista" aria-pressed="${mode === 'lista'}">${L('Lista priorizada', 'Prioritized list')}</button><button data-act="v6-rm" data-m="fases" aria-pressed="${mode === 'fases'}">${L('Fases y frentes', 'Phases and fronts')}</button></div></div>`;
    if (!V.length) return head + `<div class="empty"><b>${L('Sin intervenciones todavía', 'No interventions yet')}</b><span>${L('Se crean desde las oportunidades o desde las recomendaciones de los escenarios.', 'Create them from opportunities or from scenario recommendations.')}</span><button class="btn primary sm" data-act="v6-iv" data-id="">${L('Nueva intervención', 'New intervention')}</button></div>`;
    const pe = V.filter(v => (v.cost || {}).level === 'Por estimar').length;
    const kp = `<div class="kpis"><div class="kpi"><small>${L('Intervenciones', 'Interventions')}</small><span class="v">${V.length}</span><span class="d">${pl(V.filter(v => v.kind === 'estudio').length, L('estudio previo', 'prior study'), L('estudios previos', 'prior studies'))}</span></div>` +
      [1, 2, 3].map(n => `<div class="kpi"><small>${L('Fase ', 'Phase ')}${n}</small><span class="v">${V.filter(v => v.phase === n).length}</span><span class="d">${h(tx((a.phases[n - 1] || {}).name || ''))}</span></div>`).join('') + `</div>`;
    return head + kp + (mode === 'fases' ? rmPhases(a, V) : rmList(a, V)) + `<p class="small mut">${pl(pe, L('intervención con costo «Por estimar»: no se inventan cifras.', 'intervention with cost “To estimate”: no figures are invented.'), L('intervenciones con costo «Por estimar»: no se inventan cifras.', 'interventions with cost “To estimate”: no figures are invented.'))}</p>` + dispTable(a);
  };
  A['v6-rm'] = el => { C.S.ui.v6rm = el.dataset.m; R(); };
  const st7 = U.stage[7];
  U.stage[7] = function (a, ev) {
    let html = st7(a, ev);
    html = html.replace(/<section class="box"><div class="box-head"><h3>(Hoja de ruta de mitigación|Mitigation roadmap)<\/h3>[\s\S]*?<\/table><\/div><\/section>/, '');
    return `<div style="display:flex;flex-direction:column;gap:16px">${U.v6roadmap(a)}</div>` + html;
  };
  U.modals.v6ph = function (a, d) {
    const p = a.phases.find(x => x.n === +d.n); const ms = MS(); const o = [['no iniciado', L('No iniciado', 'Not started')], ['pendiente', L('Pendiente', 'Pending')], ['aprobado', L('Aprobado', 'Approved')]];
    return { title: L('Fase ', 'Phase ') + p.n + ' · ' + tx(p.name), body: `${fld(L('Horizonte acordado con el cliente', 'Horizon agreed with the client'), inp(`ph.${p.n}.horizon`, p.horizon, L('p. ej. Presupuesto 2027', 'e.g. 2027 budget')))}${Object.keys(ms).map(k => fld(ms[k], sel(`ph.${p.n}.ms.${k}`, p.milestones[k], o))).join('')}<p class="hint">${L('Responsable sugerido y presupuesto orientativo no significan compromiso aprobado.', 'Suggested owner and indicative budget do not mean an approved commitment.')}</p>`, foot: `<button class="btn primary" data-act="modal-close">${L('Listo', 'Done')}</button>` };
  };
  A['v6-ph'] = el => U.openModal('v6ph', { n: el.dataset.n });
  U.modals.v6iv = function (a, d) {
    const v = d.id ? find(a.interventions, d.id) : { id: '', order: a.interventions.length + 1, title: '', scope: '', kind: 'ejecución', strategy: '', strategy2: null, front: '', phase: 1, opportunities: [], findings: [], scenarios: [], targets: [], priorityRationale: '', orderReason: '', duration: 'Por estimar', owner: '', acceptance: 'Sugerido', cost: { range: 'Por estimar', currency: '', source: '', level: 'Por estimar' }, effort: '', dependsOn: [], prerequisites: '', authorizations: '', shutdownWindow: '', status: 'propuesta', closeCriterion: '', residual: '' };
    const opps = v.opportunities.map(x => find(a.opportunities, x)).filter(Boolean), scns = v.scenarios.map(x => find(a.scenarios, x)).filter(Boolean);
    const procs = [...new Set(scns.map(s => s.proc))].map(k => proc(a, k));
    const trail = v.id ? `<div class="sec-title">${L('Trazabilidad hasta la prioridad del negocio', 'Traceability to the business priority')}</div><div class="v6-trail"><span class="v6-tag">${v.id}</span><i>←</i>${opps.map(o => `<span class="v6-tag">${o.id}</span>`).join('') || `<span class="mut">${L('sin oportunidad', 'no opportunity')}</span>`}<i>←</i>${v.findings.map(f => `<span class="v6-tag">${f}</span>`).join('') || '<span class="mut">—</span>'}<i>←</i>${scns.map(s => `<span class="v6-tag">${s.id} · ${tx(lvl(s) || 'Pendiente')}</span>`).join('') || '<span class="mut">—</span>'}<i>←</i>${procs.map(p => `<span class="v6-tag">${h(tx(p.name))}${toH(p.tolerance) != null ? L(' · tolera ', ' · tolerates ') + fmtH(toH(p.tolerance)) : ''}</span>`).join('') || '<span class="mut">—</span>'}</div>` : '';
    const cb = (cls, list, on, lbl) => `<div class="cbs">${list.map(x => `<label><input type="checkbox" class="${cls}" value="${x.id}" ${on.includes(x.id) ? 'checked' : ''}>${h(lbl(x))}</label>`).join('') || `<span class="small mut">—</span>`}</div>`;
    const f = (id, lbl, val0) => `<div class="field"><label for="${id}">${lbl}</label><input id="${id}" value="${h(val0 == null ? '' : val0)}"></div>`;
    const s = (id, lbl, val0, opts) => `<div class="field"><label for="${id}">${lbl}</label><select id="${id}">${opts.map(o => U.opt(o[0], o[1], val0 == null ? '' : val0)).join('')}</select></div>`;
    const sts = [['', L('Por clasificar', 'To classify')]].concat(Object.keys(STRAT).map(k => [k, L(STRAT[k][0] + ' · ' + STRAT[k][1], STRAT[k][1])]));
    const frs = [['', L('Sin frente', 'No front')]].concat(Object.entries(FRONT()).map(([k, x]) => [k, x[0]]));
    return { title: v.id ? v.id + ' · ' + tx(v.title) : L('Nueva intervención', 'New intervention'), wide: true, body: `${trail}
      ${f('v6i-t', L('Intervención', 'Intervention') + ' *', v.title)}${f('v6i-sc', L('Alcance concreto', 'Concrete scope'), v.scope)}
      <div class="grid3">${s('v6i-k', L('Tipo', 'Type'), v.kind, [['ejecución', L('Ejecución', 'Execution')], ['estudio', L('Estudio previo', 'Prior study')]])}${s('v6i-s', L('Estrategia', 'Strategy'), v.strategy, sts)}${s('v6i-s2', L('Estrategia secundaria', 'Secondary strategy'), v.strategy2 || '', [['', '—']].concat(sts.slice(1)))}</div>
      <div class="grid3">${s('v6i-f', L('Frente', 'Front'), v.front, frs)}${s('v6i-p', L('Fase', 'Phase'), v.phase, a.phases.map(p => [p.n, p.n + ' · ' + tx(p.name)]))}${s('v6i-st', L('Estado', 'Status'), v.status, IVST.map(x => [x, tx(x)]))}</div>
      <div class="grid2">${f('v6i-o', L('Orden', 'Order'), v.order)}${f('v6i-or', L('Motivo del orden (obligatorio si cambia)', 'Order reason (required if changed)'), v.orderReason)}</div>
      ${f('v6i-pr', L('Por qué esta prioridad', 'Why this priority'), v.priorityRationale)}
      <div class="field"><span class="lbl">${L('Oportunidades', 'Opportunities')}</span>${cb('v6i-op', a.opportunities, v.opportunities, x => x.id + ' · ' + tx(x.title))}</div>
      <div class="field"><span class="lbl">${L('Escenarios', 'Scenarios')}</span>${cb('v6i-sn', a.scenarios, v.scenarios, x => x.id + ' · ' + tx(x.title))}</div>
      <div class="field"><span class="lbl">${L('Depende de', 'Depends on')}</span>${cb('v6i-dp', a.interventions.filter(x => x.id !== v.id), v.dependsOn, x => x.id + ' · ' + tx(x.title))}</div>
      <div class="grid3">${f('v6i-cr', L('Costo / rango', 'Cost / range'), (v.cost || {}).range)}${s('v6i-cl', L('Nivel de estimación', 'Estimate level'), (v.cost || {}).level, [['Por estimar', L('Por estimar', 'To estimate')], ['Orden de magnitud', L('Orden de magnitud', 'Order of magnitude')], ['Cotización', L('Cotización', 'Quote')]])}${f('v6i-cs', L('Fuente del costo', 'Cost source'), (v.cost || {}).source)}</div>
      <div class="grid3">${f('v6i-du', L('Duración', 'Duration'), v.duration)}${f('v6i-ow', L('Responsable sugerido', 'Suggested owner'), v.owner)}${f('v6i-w', L('Ventana de parada', 'Shutdown window'), v.shutdownWindow)}</div>
      <div class="grid2">${f('v6i-pq', L('Prerrequisitos', 'Prerequisites'), v.prerequisites)}${f('v6i-au', L('Autorizaciones', 'Authorizations'), v.authorizations)}</div>
      ${f('v6i-cc', L('Criterio de cierre / verificación', 'Closing / verification criterion'), v.closeCriterion)}${f('v6i-re', L('Exposición residual por revisar', 'Residual exposure to review'), v.residual)}
      <div class="note-demo">${ic('info')}<span>${L('Completar la tarea no equivale a riesgo mitigado: al cerrar se verifica la eficacia y se reevalúa el escenario.', 'Completing the task is not the same as mitigated risk: on closing, effectiveness is verified and the scenario reassessed.')}</span></div>`,
      foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button><button class="btn primary" data-act="v6-iv-save" data-id="${v.id}">${L('Guardar', 'Save')}</button>` };
  };
  A['v6-iv'] = el => { U.openModal('v6iv', { id: el.dataset.id || '' }); };
  A['v6-iv-save'] = el => {
    const a = C.cur(); const t = val('v6i-t').trim(); if (!t) return U.toast(L('Escriba la intervención', 'Enter the intervention'));
    let v = el.dataset.id ? find(a.interventions, el.dataset.id) : null; const isNew = !v;
    const ord = Math.max(1, +val('v6i-o') || 1), reason = val('v6i-or').trim();
    if (v && ord !== v.order && !reason) return U.toast(L('Explique por qué cambia el orden', 'Explain why the order changes'));
    if (!v) { let k = a.interventions.length + 1, id; do { id = 'I-' + String(k++).padStart(2, '0'); } while (find(a.interventions, id) || find(a.recs, id)); v = { id, log: [] }; a.interventions.push(v); }
    const chk = cls => [...document.querySelectorAll('.' + cls + ':checked')].map(x => x.value);
    const prevOrd = v.order;
    Object.assign(v, { title: t, scope: val('v6i-sc'), kind: val('v6i-k'), strategy: val('v6i-s') || null, strategy2: val('v6i-s2') || null, front: val('v6i-f') || null, phase: +val('v6i-p') || 1, status: val('v6i-st'), order: ord, orderReason: reason || v.orderReason || '',
      priorityRationale: val('v6i-pr'), opportunities: chk('v6i-op'), scenarios: chk('v6i-sn'), dependsOn: chk('v6i-dp'), findings: [...new Set(chk('v6i-op').flatMap(o => (find(a.opportunities, o) || { findings: [] }).findings).concat(v.findings || []))],
      cost: { range: val('v6i-cr') || 'Por estimar', currency: (v.cost || {}).currency || '', source: val('v6i-cs'), level: val('v6i-cl') }, duration: val('v6i-du'), owner: val('v6i-ow'), shutdownWindow: val('v6i-w'), prerequisites: val('v6i-pq'), authorizations: val('v6i-au'),
      closeCriterion: val('v6i-cc'), residual: val('v6i-re'), targets: v.targets || [], acceptance: v.acceptance || 'Sugerido', effort: v.effort || '' });
    const late = v.dependsOn.map(x => find(a.interventions, x)).filter(x => x && x.phase > v.phase);
    if (late.length) U.toast(L('Atención: depende de intervenciones de una fase posterior (', 'Warning: depends on interventions in a later phase (') + late.map(x => x.id).join(', ') + ')');
    if (isNew) C.log(a, 'Creó la intervención ' + v.id, 'Created intervention ' + v.id);
    else if (prevOrd !== ord) { (v.log = v.log || []).unshift({ ts: now(), by: C.S.userId, es: `Orden ${prevOrd} → ${ord}: ${reason}`, en: `Order ${prevOrd} → ${ord}: ${reason}` }); C.log(a, `Cambió el orden de ${v.id} (${prevOrd} → ${ord}): ${reason}`, `Changed order of ${v.id} (${prevOrd} → ${ord}): ${reason}`); }
    C.save(); U.closeModal(); R();
  };

  /* ---------- Risk Intelligence: cadena de valor y hilo de punta a punta ---------- */
  U.v6chain = function (a) {
    const g = C.v6gaps(a), inc = C.included(a), lcn = LCN();
    const lcc = {}; a.assets.filter(x => !C.isOut(x) && x.family).forEach(x => { const k = (x.lifecycle || {}).status || 'unknown'; lcc[k] = (lcc[k] || 0) + 1; });
    const rev = a.coverage.filter(c => c.state === 'revisado').length; const lv = { Alto: 0, Medio: 0, Bajo: 0, Pendiente: 0 }; a.scenarios.forEach(s => lv[lvl(s) || 'Pendiente']++);
    const V = a.interventions.filter(v => v.status !== 'descartada');
    const gl = L0 => L0.length ? `<ul class="gap-l">${L0.map(x => `<li>${h(x)}</li>`).join('')}</ul>` : `<p class="small" style="color:var(--ok-ink)">${L('Sin vacíos detectados por las reglas.', 'No gaps detected by the rules.')}</p>`;
    const prom = (n, en, es, big, list, gp, ui) => `<section class="v6-prom"><div class="n"><i>${n}</i><div><h4>${es}</h4><div class="en">${en}</div></div></div>${big}${list ? `<ul class="pl">${list}</ul>` : ''}<div class="sec-title">${L('Qué falta', 'What is missing')}</div>${gl(gp)}<div class="ui">${L('Interfaz: ', 'Interface: ')}${ui}</div></section>`;
    const proms = `<div class="v6-proms">` +
      prom(1, 'Plant Modeling & Business Priorities', L('Prioridades del negocio', 'Business priorities'), `<span class="big">${inc.length} <small>${L('de ', 'of ')}${a.processes.length}${L(' procesos incluidos', ' processes included')}</small></span>`,
        inc.slice(0, 4).map(p => `<li>${h(tx(p.name))} · <b>${h(tx(p.crit || '—'))}</b>${toH(p.tolerance) != null ? L(' · tolera ', ' · tolerates ') + fmtH(toH(p.tolerance)) : ''}</li>`).join(''), g.p1, L('etapas 1 y 2', 'stages 1 and 2')) +
      prom(2, 'Critical Infrastructure', L('Base instalada y ciclo de vida', 'Installed base and lifecycle'), `<span class="big">${a.assets.filter(x => !C.isOut(x)).length} <small>${L('activos · ', 'assets · ')}${a.systems.filter(x => !C.isOut(x)).length}${L(' sistemas', ' systems')}</small></span>`,
        Object.keys(lcn).filter(k => lcc[k]).map(k => `<li><span class="v6-lc ${k}">${lcn[k]}</span> ${lcc[k]}</li>`).join(''), g.p2, L('etapa 3', 'stage 3')) +
      prom(3, 'Operational Risk', L('Impacto y recuperación', 'Impact and recovery'), `<span class="big">${a.scenarios.length} <small>${L('escenarios · ', 'scenarios · ')}${rev}${L('/8 dominios revisados', '/8 domains reviewed')}</small></span>`,
        ['Alto', 'Medio', 'Bajo', 'Pendiente'].filter(k => lv[k]).map(k => `<li class="v6-lvli">${U.lv(k === 'Pendiente' ? null : k)} <b>${lv[k]}</b></li>`).join(''), g.p3, L('etapas 4 y 6', 'stages 4 and 6')) +
      prom(4, 'Findings & Opportunities', L('Mejoras prácticas', 'Practical improvements'), `<span class="big">${a.findings.length} <small>${L('hallazgos · ', 'findings · ')}${a.opportunities.length}${L(' oportunidades', ' opportunities')}</small></span>`,
        a.opportunities.slice(0, 3).map(o => `<li>${h(tx(o.title))}</li>`).join(''), g.p4, L('etapa 6', 'stage 6')) +
      prom(5, 'Prioritized Roadmap', L('Intervenciones por fases', 'Phased interventions'), `<span class="big">${V.length} <small>${L('intervenciones', 'interventions')}</small></span>`,
        V.length ? [1, 2, 3].map(n => `<li>${L('Fase ', 'Phase ')}${n}: ${V.filter(v => v.phase === n).length}</li>`).join('') : '', g.p5, L('etapa 7 y PDF', 'stage 7 and PDF')) + `</div>`;
    const iv = V.slice().sort((x, y) => x.order - y.order).find(v => v.scenarios.length);
    let hilo = `<div class="empty"><b>${L('El hilo aparece cuando una intervención se vincula a un escenario.', 'The thread appears when an intervention is linked to a scenario.')}</b></div>`;
    if (iv) {
      const sc = iv.scenarios.map(x => find(a.scenarios, x)).filter(Boolean); const s = sc.find(x => lvl(x) && x.recovery && x.recovery.total) || sc[0];
      if (s) {
        const p = proc(a, s.proc); const as = s.assets.map(x => find(a.assets, x)).find(x => x && x.family); const f = find(a.findings, s.findings[0]); const o = iv.opportunities.length ? find(a.opportunities, iv.opportunities[0]) : null; const r = s.recovery && s.recovery.total;
        const steps = [[L('1 · Prioridad', '1 · Priority'), tx(p.name), L('Prioridad ', 'Priority ') + tx(p.crit || '—') + (toH(p.tolerance) != null ? L(' · tolera ', ' · tolerates ') + fmtH(toH(p.tolerance)) : p.type === 'salvaguarda' ? L(' · salvaguarda: protege personas y planta', ' · safeguard: protects people and plant') : L(' · sin tolerancia', ' · no tolerance'))],
          [L('2 · Base instalada', '2 · Installed base'), as ? as.tag + ' · ' + tx(as.name) : '—', as ? lcn[(as.lifecycle || {}).status || 'unknown'] + (as.mfr ? ' · ' + as.mfr : '') : ''],
          [L('3 · Escenario', '3 · Scenario'), s.id + ' · ' + tx(s.title), tx(lvl(s) || 'Pendiente') + (r ? L(' · recupera en ', ' · recovers in ') + fmtH(r.min) + '–' + fmtH(r.max) : '')],
          [L('4 · Hallazgo', '4 · Finding'), f ? f.id + ' · ' + tx(f.title) : '—', f ? tx(f.status || '') : ''], [L('4 · Oportunidad', '4 · Opportunity'), o ? o.id + ' · ' + tx(o.title) : '—', o ? tx((o.impact || {}).dimension || '') + ' · ' + tx((o.impact || {}).estimate || '') : ''],
          [L('5 · Intervención', '5 · Intervention'), iv.id + ' · ' + tx(iv.title), L('Fase ', 'Phase ') + iv.phase + ' · ' + (iv.strategy ? L(STRAT[iv.strategy][0], STRAT[iv.strategy][1]) : L('Por clasificar', 'To classify')) + ' · ' + tx(iv.status)]];
        hilo = `<div class="v6-hilo">${steps.map(x => `<div class="v6-hstep"><span class="k">${x[0]}</span><b>${h(x[1])}</b><p>${h(x[2])}</p></div>`).join('')}</div><div class="row"><button class="btn ghost sm" data-act="v6-iv" data-id="${iv.id}">${ic('link', 'sm')}${L('Ver ', 'View ')}${iv.id}</button><button class="btn ghost sm" data-act="v6-goscn" data-id="${s.id}">${L('Ver ', 'View ')}${s.id}${L(' en Evaluación', ' in Assessment')}</button></div>`;
      }
    }
    return `<section class="box" id="v6-chain"><div class="box-head"><h3>${L('Cadena de valor · Understand your operational risks to ensure long-term operational sustainability', 'Value chain · Understand your operational risks to ensure long-term operational sustainability')}</h3><p>${L('Las cinco promesas del servicio sobre los mismos registros del wizard, Risk Journey y el PDF. «Qué falta» lo calculan reglas, no la IA.', 'The five service promises on the same records as the wizard, Risk Journey and PDF. “What is missing” is computed by rules, not AI.')}</p></div><div class="box-body">${proms}<div class="sec-title">${L('Hilo de punta a punta: la primera intervención rastreada hasta la prioridad del negocio', 'End-to-end thread: the first intervention traced back to the business priority')}</div>${hilo}</div></section>`;
  };
  A['v6-goscn'] = el => { C.S.ui.view = 'wizard'; C.S.ui.stage = 6; C.S.ui.v6tab = 'escenarios'; U.openKeys.add('v6s-' + el.dataset.id); U.closeModal(); R(); setTimeout(() => { const t = document.getElementById('v6scn-' + el.dataset.id); if (t) t.scrollIntoView({ block: 'start' }); }, 0); };
  const dash1 = U.views.dash;
  U.views.dash = function (a, ev) { const html = dash1(a, ev); const chain = U.v6chain(a); const k = '<section class="box mb-base">'; return html.includes(k) ? html.replace(k, chain + k) : chain + html; };

  /* ---------- omnIA (misma experiencia que Kairos: orbe, lanzador, panel, tarjetas; motor de reglas) ---------- */
  const O = { open: false, busy: false, threads: {} }; let fabOrb = null;
  function mountOmnia() {
    if (document.getElementById('v6Fab')) return;
    const fab = document.createElement('button'); fab.className = 'fab ox'; fab.id = 'v6Fab'; fab.setAttribute('aria-controls', 'v6Panel'); fab.setAttribute('aria-expanded', 'false'); fab.title = 'omnIA';
    fab.innerHTML = `<canvas class="orb-cv" id="v6FabOrb" data-size="50" width="100" height="100" aria-hidden="true"></canvas><span class="fab-tip" aria-hidden="true">omnIA</span>`;
    const pan = document.createElement('aside'); pan.className = 'panel ox'; pan.id = 'v6Panel'; pan.hidden = true; pan.setAttribute('aria-label', 'omnIA');
    pan.innerHTML = `<header class="p-head" id="v6PHead"></header><div class="p-body" id="v6PBody"></div><div class="composer"><div class="inbox"><label class="sr" for="v6OIn">${L('Mensaje para omnIA', 'Message to omnIA')}</label><textarea id="v6OIn" rows="1" placeholder="${L('Escribe a omnIA…', 'Write to omnIA…')}"></textarea><button class="send" id="v6OSend" aria-label="${L('Enviar', 'Send')}">${ic('chev')}</button></div><div class="hint"><span>${L('Responde con reglas sobre los datos del assessment (DEMO)', 'Answers with rules over the assessment data (DEMO)')}</span><span>${L('Uso interno de Omnicon', 'Omnicon internal use')}</span></div></div>`;
    document.body.appendChild(pan); document.body.appendChild(fab);
    if (window.OmniaOrb) fabOrb = new window.OmniaOrb(document.getElementById('v6FabOrb'));
    fab.addEventListener('click', () => { O.open = true; renderOmnia(); });
    document.getElementById('v6OSend').addEventListener('click', () => { const i = document.getElementById('v6OIn'); if (i.value.trim()) { ask(i.value.trim()); i.value = ''; } });
    document.getElementById('v6OIn').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('v6OSend').click(); } });
    pan.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.oclose) { O.open = false; return renderOmnia(); }
      if (b.dataset.osug) return ask(b.dataset.osug);
      if (b.dataset.oai) return decide(b.dataset.oai, b.dataset.do);
      if (b.dataset.ogo) { const [k, id] = b.dataset.ogo.split(':'); if (k === 'scenario') { A['v6-goscn']({ dataset: { id } }); } } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && O.open && !U.modal) { O.open = false; renderOmnia(); } });
  }
  const th = a => { const k = a ? a.id : '_'; if (!O.threads[k]) O.threads[k] = seed(a); return O.threads[k]; };
  function seed(a) {
    if (!a) return [{ who: 'bot', origin: L('Inicio', 'Home'), text: L('Abre un assessment y te ayudo a revisar vacíos y a proponer escenarios con sus fuentes.', 'Open an assessment and I will help review gaps and propose scenarios with sources.') }];
    ensureV6(a); const n = a.ai.filter(p => p.status === 'por revisar').length;
    const m = [{ who: 'bot', origin: L('Riesgo', 'Risk'), text: n ? L(`Revisé ${tx(a.cfg.plant)}. Tengo ${pl(n, 'propuesta', 'propuestas')} para revisar. Son borradores con sus fuentes: la decisión es tuya y la evaluación no cambia hasta que la apruebes.`, `I reviewed ${tx(a.cfg.plant)}. I have ${pl(n, 'proposal', 'proposals')} to review. They are drafts with sources: the decision is yours and the assessment does not change until you approve it.`) : L(`Revisé ${tx(a.cfg.plant)}. Puedo listar vacíos o proponer escenarios con lo que hay.`, `I reviewed ${tx(a.cfg.plant)}. I can list gaps or propose scenarios from what is there.`) }];
    a.ai.forEach(p => m.push({ who: 'card', ai: p.id })); return m;
  }
  function card(a, p) {
    const kind = { escenario: L('Propuesta de escenario', 'Scenario proposal'), vacio: L('Vacío detectado', 'Gap detected'), oportunidad: L('Fila FCOI propuesta', 'Proposed FCOI row') }[p.kind] || L('Propuesta', 'Proposal');
    const sec = (t, L0) => L0 && L0.length ? `<div class="prop-sec"><span>${t}</span><ul>${L0.map(x => `<li>${h(tx(x))}</li>`).join('')}</ul></div>` : '';
    const st = p.status; const done = st !== 'por revisar';
    return `<div class="ocard"><div class="hd"><span class="mini-orb"></span><span class="t">${kind}</span><span class="pills"><span class="pill ${st === 'por revisar' ? 'pending' : st === 'descartada' ? 'rejected' : st === 'verificación solicitada' ? 'missing' : 'approved'}">${h(tx(st))}</span></span></div>
      <div class="bd"><b style="font-size:13px">${h(tx(p.title))}</b>${sec(L('Hechos (del assessment)', 'Facts (from the assessment)'), p.facts)}${sec(L('Supuestos', 'Assumptions'), p.assumptions)}${sec(L('Falta para confirmarlo', 'Missing to confirm'), p.missing)}${sec(L('Controles conocidos', 'Known controls'), p.controls)}
      <div class="prop-sec"><span>${L('Fuentes', 'Sources')}</span><div class="row">${(p.sources || []).map(s => `<span class="src-chip">${h(s)}</span>`).join('')}</div></div><div class="trace">${L('Motor', 'Engine')}: ${h(tx(p.engine || 'reglas'))} · v${p.version || 1}${p.created ? ' · ' + L('creó ', 'created ') + p.created : ''}</div></div>
      <div class="ft"><div class="row">${done ? (p.created ? `<button class="btn sm" data-ogo="scenario:${p.created}">${L('Ver ', 'View ')}${p.created}</button>` : '') :
        `<button class="btn sm primary" data-oai="${p.id}" data-do="aceptar">${L('Aceptar como borrador', 'Accept as draft')}</button><button class="btn sm" data-oai="${p.id}" data-do="verificar">${L('Solicitar verificación', 'Request verification')}</button><button class="btn sm danger" data-oai="${p.id}" data-do="descartar">${L('Descartar', 'Discard')}</button>`}</div></div></div>`;
  }
  function renderOmnia() {
    mountOmnia(); const a = C.cur(); const pan = document.getElementById('v6Panel'), fab = document.getElementById('v6Fab');
    const show = !!C.me() && C.S.ui.view !== 'login';
    fab.hidden = !show || O.open; pan.hidden = !show || !O.open; fab.setAttribute('aria-expanded', O.open);
    if (fabOrb) fabOrb.setVisible(show && !O.open);
    document.querySelectorAll('.v6-somnia').forEach(b => b.setAttribute('aria-pressed', O.open));
    if (!show || !O.open) return;
    const inEl = document.getElementById('v6OIn'); inEl.placeholder = L('Escribe a omnIA…', 'Write to omnIA…'); pan.querySelector('.composer .hint').innerHTML = `<span>${L('Responde con reglas sobre los datos del assessment (DEMO)', 'Answers with rules over the assessment data (DEMO)')}</span><span>${L('Uso interno de Omnicon', 'Omnicon internal use')}</span>`;
    document.getElementById('v6PHead').innerHTML = `<span class="grab" aria-hidden="true"></span><div class="p-title"><canvas class="orb-cv sm" id="v6HOrb" data-size="24" width="48" height="48" aria-hidden="true"></canvas><span class="name">omnIA</span><span class="status${O.busy ? ' busy' : ''}"><i></i>${O.busy ? L('Pensando', 'Thinking') : L('En línea', 'Online')}</span><div class="p-actions"><button class="icon-btn" data-oclose="1" title="${L('Cerrar', 'Close')}" aria-label="${L('Cerrar omnIA', 'Close omnIA')}">${ic('x')}</button></div></div>` +
      (a ? `<div class="ctx-chip" title="${L('omnIA usa este assessment como contexto', 'omnIA uses this assessment as context')}"><span class="lbl">${L('Contexto', 'Context')}</span><b>${a.code} · ${h(tx(a.cfg.plant))}</b></div>` : `<div class="ctx-chip free"><span class="lbl">${L('Contexto', 'Context')}</span><b>${L('Sin assessment abierto', 'No open assessment')}</b></div>`);
    if (window.OmniaOrb) { const o = new window.OmniaOrb(document.getElementById('v6HOrb')); o.setState(O.busy ? 'thinking' : 'idle'); }
    const t = th(a);
    document.getElementById('v6PBody').innerHTML = `<div class="thread">${t.map(m => {
      if (m.who === 'user') return `<div class="msg user"><div class="bubble">${h(m.text)}</div></div>`;
      if (m.who === 'event') return `<div class="event">${ic('info', 'sm')}<span>${h(m.text)}</span></div>`;
      if (m.who === 'typing') return `<div class="msg bot"><div class="typing"><i></i><i></i><i></i></div></div>`;
      if (m.who === 'card') { const p = a && find(a.ai, m.ai); return p ? `<div class="msg bot">${card(a, p)}</div>` : ''; }
      return `<div class="msg bot"><div class="who"><span class="mini-orb"></span><b>omnIA</b>${m.origin ? `<span class="origin">${h(m.origin)}</span>` : ''}</div><div class="text">${m.text.split('\n').map(x => `<p>${h(x)}</p>`).join('')}</div></div>`; }).join('')}
      ${a ? `<div class="sugs">${(U.omniaSugs ? U.omniaSugs(a) : [L('¿Qué vacíos tiene este assessment?', 'What gaps does this assessment have?'), L('Propón escenarios con lo que hay', 'Propose scenarios from what is there'), L('Resume la hoja de ruta', 'Summarize the roadmap')]).map(s => `<button class="sug" data-osug="${h(s)}"><span class="mini-orb"></span>${h(s)}</button>`).join('')}</div>` : ''}</div>`;
    const pb = document.getElementById('v6PBody'); pb.scrollTop = pb.scrollHeight;
    if (U.omniaExtra) U.omniaExtra(a);
  }
  C.omnia = { open: () => { O.open = true; renderOmnia(); }, close: () => { O.open = false; renderOmnia(); }, ask: q => ask(q), state: O };
  function ask(q) {
    const a = C.cur(); const t = th(a); t.push({ who: 'user', text: q }); t.push({ who: 'typing' }); O.busy = true; renderOmnia();
    setTimeout(() => {
      t.pop(); O.busy = false; const low = q.toLowerCase();
      const pre = a && U.omniaAsk && U.omniaPre && U.omniaPre(q) ? U.omniaAsk(a, q) : null;
      if (pre && pre.length) pre.forEach(m => t.push(m));
      else if (!a) t.push({ who: 'bot', text: L('Abre un assessment para trabajar sobre sus datos.', 'Open an assessment to work on its data.') });
      else if (/vac[ií]o|falta|pendiente|gap/.test(low)) {
        const g = C.v6gaps(a); const rows = [['1 · ' + L('Prioridades', 'Priorities'), g.p1], ['2 · ' + L('Infraestructura', 'Infrastructure'), g.p2], ['3 · ' + L('Riesgo', 'Risk'), g.p3], ['4 · ' + L('Hallazgos', 'Findings'), g.p4], ['5 · ' + L('Hoja de ruta', 'Roadmap'), g.p5]].filter(x => x[1].length);
        t.push({ who: 'bot', origin: L('Reglas', 'Rules'), text: rows.length ? L('Estos son los vacíos que detectan las reglas del assessment:', 'These are the gaps the assessment rules detect:') + '\n' + rows.map(x => x[0] + ': ' + x[1].join('; ') + '.').join('\n') + '\n' + L('Son avisos sobre el assessment, no alarmas de la operación.', 'These are notes on the assessment, not operational alarms.') : L('No detecto vacíos con las reglas actuales.', 'No gaps detected with the current rules.') });
      } else if (/escenario|prop[oó]n|scenario|propose/.test(low)) {
        const inS = new Set(a.scenarios.flatMap(s => s.assets)); const known = new Set(a.ai.flatMap(p => p.sources || []));
        const cand = a.assets.filter(x => !C.isOut(x) && x.family && !inS.has(x.id) && !known.has('asset:' + x.id) && (/único|sin redundancia|equipo único|host único|enlace único/i.test(x.redundancy || '') || ['eol', 'discontinued'].includes((x.lifecycle || {}).status))).slice(0, 2);
        if (!cand.length) t.push({ who: 'bot', origin: L('Riesgo', 'Risk'), text: L('No encuentro activos sin redundancia o en fin de vida que no estén ya en un escenario o en una propuesta.', 'I find no assets without redundancy or at end of life that are not already in a scenario or proposal.') });
        cand.forEach(x => {
          let k = a.ai.length + 1, id; do { id = 'AI-' + String(k++).padStart(2, '0'); } while (find(a.ai, id));
          const lc = x.lifecycle || {}; const deps = a.deps.filter(d => d.from === x.id || d.to === x.id);
          const p = { id, kind: 'escenario', title: L('Falla de ', 'Failure of ') + x.tag + ' (' + tx(x.name) + ')', facts: [x.tag + ': ' + LCN()[lc.status || 'unknown'] + (lc.source ? ' (' + lc.source + ')' : ''), L('Redundancia registrada: ', 'Recorded redundancy: ') + (x.redundancy || L('sin dato', 'no data')), L('Procesos que soporta: ', 'Supported processes: ') + C.recProcs(x).map(k2 => tx(proc(a, k2).name)).join(', ')].concat(deps.length ? [L('Dependencias: ', 'Dependencies: ') + deps.map(d => d.id).join(', ')] : []),
            assumptions: [L('La falla afecta a todos los procesos que soporta', 'The failure affects all supported processes')], missing: [L('Tiempo de recuperación', 'Recovery time'), L('Controles existentes', 'Existing controls')], controls: [], sources: ['asset:' + x.id].concat(C.recProcs(x).map(k2 => 'process:' + k2), deps.map(d => 'dep:' + d.id)), status: 'por revisar', engine: L('reglas (DEMO)', 'rules (DEMO)'), version: 1, ts: now(), by: 'omnIA' };
          a.ai.push(p); t.push({ who: 'card', ai: id });
        });
        if (cand.length) t.push({ who: 'bot', origin: L('Riesgo', 'Risk'), text: L(`Propuse ${pl(cand.length, 'escenario', 'escenarios')} desde activos sin redundancia o en fin de vida que todavía no participan en ningún escenario. No asigné nivel de riesgo.`, `I proposed ${pl(cand.length, 'scenario', 'scenarios')} from assets without redundancy or at end of life not yet in any scenario. I did not assign a risk level.`) });
        C.save();
      } else if (/hoja|ruta|roadmap/.test(low)) {
        const V = a.interventions.filter(v => v.status !== 'descartada');
        t.push({ who: 'bot', origin: L('Hoja de ruta', 'Roadmap'), text: !V.length ? L('Este assessment todavía no tiene intervenciones.', 'This assessment has no interventions yet.') : a.phases.map(p => L('Fase ', 'Phase ') + p.n + ' (' + tx(p.name) + (p.horizon ? ', ' + p.horizon : '') + '): ' + pl(V.filter(v => v.phase === p.n).length, L('intervención', 'intervention'), L('intervenciones', 'interventions')) + L(' · financiación ', ' · funding ') + tx(p.milestones.funding) + '.').join('\n') + '\n' + L('Primero: ', 'First: ') + tx(V.slice().sort((x, y) => x.order - y.order)[0].title) + '.' });
      } else { const ex = U.omniaAsk ? U.omniaAsk(a, q) : null; if (ex && ex.length) ex.forEach(m => t.push(m)); else t.push({ who: 'bot', origin: L('Reglas', 'Rules'), text: L('Respondo con reglas sobre los datos del assessment y la base de conocimiento. Prueba con: ¿qué hago aquí?, sugiere hallazgos, sugiere oportunidades, busca <tema>, vacíos, escenarios u hoja de ruta.', 'I answer with rules over the assessment data and the knowledge base. Try: what do I do here?, suggest findings, suggest opportunities, search <topic>, gaps, scenarios or roadmap.') }); }
      renderOmnia();
    }, 650);
  }
  function decide(id, what) {
    const a = C.cur(); const p = find(a.ai, id); if (!p) return; const t = th(a); const me = C.uname(C.S.userId);
    if (what === 'aceptar') {
      if (p.kind === 'escenario') {
        let k = a.scenarios.length + 1, sid; do { sid = 'E-' + String(k++).padStart(2, '0'); } while (find(a.scenarios, sid));
        const src = p.sources || []; const pick = pre => src.filter(s => s.startsWith(pre + ':')).map(s => s.split(':')[1]);
        const procs = pick('process'); const asx = pick('asset').filter(x => find(a.assets, x)); const deps = pick('dep').filter(x => find(a.deps, x)); const sys = pick('system').filter(x => find(a.systems, x));
        const pk = procs.find(x => C.included(a).some(q => q.key === x)) || (C.included(a)[0] || {}).key;
        a.scenarios.push({ id: sid, title: tx(p.title), domain: 'control', proc: pk, event: tx(p.title), causes: [], cause: '', cons: '', impact: { operational: '', business: '', magnitude: '', basis: '' }, controls: (p.controls || []).map(c => ({ name: c, st: 'No verificado', type: '', efficacy: 'declarada' })),
          alternatives: [], recovery: { diagnosis: '', supply: '', repair: '', 'return': '', total: null, source: '', conf: 'Desconocido', tested: false }, C: null, P: null, justC: '', justP: '', uncertainty: (p.missing || []).join('; '), findings: [], assets: asx, systems: sys, deps, conf: 'Desconocido', status: 'pendiente', origin: 'omnIA', aiId: p.id });
        p.status = 'aceptada como borrador'; p.created = sid;
        t.push({ who: 'event', text: L(`${p.id}: aceptada como borrador por ${me}. Se creó ${sid} pendiente de valoración; la propuesta y sus fuentes quedan en el historial.`, `${p.id}: accepted as draft by ${me}. ${sid} was created pending rating; the proposal and its sources stay in history.`) });
        C.log(a, `Aceptó la propuesta ${p.id} de omnIA como borrador (${sid})`, `Accepted omnIA proposal ${p.id} as draft (${sid})`);
      } else { p.status = 'aceptada como borrador'; t.push({ who: 'event', text: p.id + L(': aceptada como borrador por ', ': accepted as draft by ') + me + '.' }); C.log(a, 'Aceptó la propuesta ' + p.id + ' de omnIA', 'Accepted omnIA proposal ' + p.id); }
    } else if (what === 'verificar') { p.status = 'verificación solicitada'; t.push({ who: 'event', text: p.id + L(': verificación solicitada por ', ': verification requested by ') + me + L('. Se registró en el historial.', '. Recorded in history.') }); C.log(a, 'Solicitó verificar la propuesta ' + p.id, 'Requested verification of proposal ' + p.id); }
    else { p.status = 'descartada'; t.push({ who: 'event', text: p.id + L(': descartada por ', ': discarded by ') + me + L('. La propuesta se conserva en el historial.', '. The proposal is kept in history.') }); C.log(a, 'Descartó la propuesta ' + p.id + ' de omnIA', 'Discarded omnIA proposal ' + p.id); }
    p.decidedBy = C.S.userId; p.decidedAt = now(); C.save(); R(); renderOmnia();
  }
  const render0 = U.render;
  U.render = function () {
    render0(); mountOmnia();
    const foot = document.querySelector('.side .side-foot');
    if (foot && C.me() && !foot.querySelector('.v6-somnia')) foot.insertAdjacentHTML('afterbegin', `<button class="v6-somnia" data-act="v6-omnia" aria-pressed="${O.open}" title="omnIA"><span class="v6-sorb" aria-hidden="true"></span><span class="s-lbl n-lbl"><b>omnIA</b><small>${L('Propuestas con fuentes', 'Proposals with sources')}</small></span></button>`);
    const cur = C.cur(), mi = document.querySelector('.main-in');
    if (mi && cur && cur.demo && I.lang === 'en' && !mi.querySelector('.v6-trnote')) mi.insertAdjacentHTML('afterbegin', `<div class="note-demo v6-trnote" role="note">${ic('info')}<span><b>Example content pending translation.</b> The interface is in English; the names of processes, questions, scenarios, findings and interventions in this DEMO assessment are still in Spanish and will be translated once the content is final.</span></div>`);
    renderOmnia();
  };
  A['v6-omnia'] = () => { O.open = !O.open; renderOmnia(); };
  R();
})();
