/* ORA — Fase 4: integración y trazabilidad bidireccional (escenarios, dashboard, PDF, búsqueda por ID) */
(function () {
  const C = window.ORA, D = window.ORA_DATA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, ic = U.ic, L = I.L, tx = I.tx, A = U.act;
  const R = () => U.render();
  const lblDep = (a, d) => C.nodeLbl(a, d.from) + (d.dir === 'bi' ? ' ↔ ' : ' → ') + C.nodeLbl(a, d.to);

  // ---------- elementos de un escenario (activos, sistemas OT y dependencias) ----------
  C.scnElements = function (a, s) {
    const el = [];
    s.assets.forEach(id => { const x = C.asset(a, id); if (x) el.push({ k: 'asset', id, x, lbl: x.tag }); });
    (s.systems || []).forEach(id => { const x = C.system(a, id); if (x) el.push({ k: 'system', id, x, lbl: tx(x.name) }); });
    (s.deps || []).forEach(id => { const x = a.deps.find(d => d.id === id); if (x) el.push({ k: 'dep', id, x, lbl: lblDep(a, x) }); });
    return el;
  };
  const scnCard0 = U.scenarioCard;
  U.scenarioCard = function (a, s) {
    const html = scnCard0(a, s); const el = C.scnElements(a, s);
    const weak = el.filter(e => C.mat(a, e.k, e.x) === 'sugerido' || C.isOut(e.x));
    const chips = el.map(e => `<button class="pchip" data-act="jr-open" data-key="${e.k}:${e.id}" title="${L('Ver en Risk Journey', 'View in Risk Journey')}">${h(e.lbl)} · ${C.matName(C.mat(a, e.k, e.x))}</button>`).join('') || `<span class="small mut">${L('Sin elementos vinculados', 'No linked items')}</span>`;
    const cb = (k, id, lbl, on) => `<label><input type="checkbox" data-scnel="${s.id}" data-k="${k}" value="${id}" ${on ? 'checked' : ''}>${h(lbl)}</label>`;
    const editor = U.dt('se-' + s.id, L('Editar activos, sistemas OT y dependencias del escenario', 'Edit the scenario’s assets, OT systems and dependencies'),
      `<div class="sec-title">${L('Activos', 'Assets')}</div><div class="cbs">${a.assets.filter(x => !C.isOut(x) || s.assets.includes(x.id)).map(x => cb('asset', x.id, x.tag, s.assets.includes(x.id))).join('')}</div>
       ${a.systems.length ? `<div class="sec-title">${L('Sistemas OT', 'OT systems')}</div><div class="cbs">${a.systems.filter(x => !C.isOut(x) || (s.systems || []).includes(x.id)).map(x => cb('system', x.id, tx(x.name), (s.systems || []).includes(x.id))).join('')}</div>` : ''}
       ${a.deps.length ? `<div class="sec-title">${L('Dependencias', 'Dependencies')}</div><div class="cbs">${a.deps.filter(x => !C.isOut(x) || (s.deps || []).includes(x.id)).map(x => cb('dep', x.id, lblDep(a, x) + ' (' + C.depName(x.type) + ')', (s.deps || []).includes(x.id))).join('')}</div>` : ''}
       <p class="hint">${L('Vincular una dependencia compartida no asigna riesgo: la valoración sigue siendo C × P con justificación.', 'Linking a shared dependency does not assign risk: the rating is still C × P with justification.')}</p>`);
    const block = `<div class="field"><span class="lbl">${L('Elementos involucrados', 'Involved items')}</span><div class="ir-chips">${chips}<button class="btn ghost sm" data-act="trace-open" data-key="scenario:${s.id}">${ic('link', 'sm')}${L('Trazabilidad', 'Traceability')}</button></div>
      ${weak.length ? `<div class="note-demo">${ic('alert')}<span>${L('Evaluado sobre datos sin validar o descartados: ', 'Assessed on unvalidated or discarded data: ')}${weak.map(e => h(e.lbl)).join(', ')}. ${L('Confirme en el recorrido antes de aprobar el informe.', 'Confirm in the walkdown before approving the report.')}</span></div>` : ''}${editor}</div>`;
    return html.replace('<div class="scn-b">', '<div class="scn-b">' + block);
  };
  document.addEventListener('change', e => {
    const t = e.target; if (!t.dataset || !t.dataset.scnel) return;
    const a = C.cur(); const s = a.scenarios.find(x => x.id === t.dataset.scnel); const k = t.dataset.k; const f = k === 'asset' ? 'assets' : k === 'system' ? 'systems' : 'deps';
    const cur = new Set(s[f] || []); t.checked ? cur.add(t.value) : cur.delete(t.value); s[f] = [...cur];
    const lb = k === 'asset' ? C.nodeLbl(a, t.value) : k === 'system' ? C.nodeLbl(a, t.value) : lblDep(a, a.deps.find(d => d.id === t.value));
    C.log(a, `${t.checked ? 'Vinculó' : 'Desvinculó'} ${lb} ${t.checked ? 'al' : 'del'} escenario ${s.id}`, `${t.checked ? 'Linked' : 'Unlinked'} ${lb} ${t.checked ? 'to' : 'from'} scenario ${s.id}`);
    C.save(); R();
  });

  // ---------- trazabilidad bidireccional ----------
  C.resolveId = function (a, raw) {
    const q = String(raw || '').trim(); if (!q) return null; const u = q.toUpperCase();
    if (/^[a-z]+:/.test(q)) return q;
    if (a.scenarios.some(s => s.id === u)) return 'scenario:' + u;
    if (a.findings.some(f => f.id === u)) return 'finding:' + u;
    if (a.recs.some(r => r.id === u)) return 'rec:' + u;
    if (a.photos.some(p => p.id === u)) return 'photo:' + u;
    if (a.questions.some(x => x.id === u)) return 'q:' + u;
    const asx = a.assets.find(x => x.id === u || x.tag.toUpperCase() === u); if (asx) return 'asset:' + asx.id;
    if (a.systems.some(x => x.id === u)) return 'system:' + u; const sy = a.systems.find(x => tx(x.name).toUpperCase() === u || String(x.name).toUpperCase() === u); if (sy) return 'system:' + sy.id;
    if (a.deps.some(x => x.id === u)) return 'dep:' + u;
    if (a.areas.some(x => x.id === u)) return 'area:' + u;
    const p = a.processes.find(x => x.key === q || tx(x.name).toUpperCase() === u); if (p) return 'process:' + p.key;
    return null;
  };
  C.trace = function (a, key) {
    const [k, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    let scns = [];
    if (k === 'scenario') scns = a.scenarios.filter(s => s.id === id);
    else if (k === 'finding') scns = a.scenarios.filter(s => s.findings.includes(id));
    else if (k === 'rec') { const r = a.recs.find(x => x.id === id); scns = a.scenarios.filter(s => r && r.sc.includes(s.id)); }
    else if (k === 'photo') { const p = a.photos.find(x => x.id === id) || {}; const lk = p.links || {}; scns = a.scenarios.filter(s => s.id === lk.scenario || s.findings.includes(lk.finding) || s.assets.includes(lk.asset) || (s.deps || []).includes(lk.dep) || (s.systems || []).includes(lk.system)); }
    else if (k === 'q') scns = a.scenarios.filter(s => s.findings.some(fid => (a.findings.find(f => f.id === fid) || {}).q === id));
    else if (k === 'process') scns = a.scenarios.filter(s => s.proc === id);
    else if (['asset', 'system', 'dep', 'area'].includes(k)) { const x = (k === 'asset' ? a.assets : k === 'system' ? a.systems : k === 'dep' ? a.deps : a.areas).find(y => y.id === id); scns = x ? C.scnOf(a, k, x) : []; }
    return { k, id, scns };
  };
  const recLbl = (a, key) => { const [k, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    if (k === 'scenario') { const s = a.scenarios.find(x => x.id === id); return s ? id + ' · ' + tx(s.title) : id; }
    if (k === 'finding') { const f = a.findings.find(x => x.id === id); return f ? id + ' · ' + tx(f.title) : id; }
    if (k === 'rec') { const r = a.recs.find(x => x.id === id); return r ? id + ' · ' + tx(r.title) : id; }
    if (k === 'photo') { const p = a.photos.find(x => x.id === id); return p ? id + ' · ' + tx(p.title) : id; }
    if (k === 'q') { const q = a.questions.find(x => x.id === id); return q ? id + ' · ' + tx(q.text) : id; }
    if (k === 'process') return C.procName(a, id);
    if (k === 'dep') { const d = a.deps.find(x => x.id === id); return d ? lblDep(a, d) : id; }
    return C.nodeLbl(a, id); };
  const goBtn = (a, key) => { const [k, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    if (k === 'scenario') return `<button class="btn ghost sm" data-act="go" data-stage="6" data-target="scn-${id}">${L('Abrir en Evaluación', 'Open in Assessment')}</button>`;
    if (k === 'finding') return `<button class="btn ghost sm" data-act="go" data-stage="6" data-target="finding-${id}">${L('Abrir en Evaluación', 'Open in Assessment')}</button>`;
    if (k === 'q') return `<button class="btn ghost sm" data-act="go" data-stage="4" data-target="q-${id}">${L('Abrir en Cuestionario', 'Open in Questionnaire')}</button>`;
    if (k === 'photo') return `<button class="btn ghost sm" data-act="lightbox" data-id="${id}">${L('Ver foto', 'View photo')}</button>`;
    if (k === 'rec') return `<button class="btn ghost sm" data-act="go" data-stage="7" data-target="">${L('Abrir en Resultados', 'Open in Results')}</button>`;
    if (k === 'process') return `<button class="btn ghost sm" data-act="go" data-stage="2" data-target="proc-${id}">${L('Abrir en Procesos críticos', 'Open in Critical processes')}</button>`;
    return `<button class="btn ghost sm" data-act="jr-open" data-key="${key}">${L('Ver en Risk Journey', 'View in Risk Journey')}</button><button class="btn ghost sm" data-act="jr-inv" data-k="${k}" data-id="${id}">${L('Inventario OT', 'OT inventory')}</button>`; };
  U.modals.trace = function (a, d) {
    const key = d.key || ''; const t = key ? C.trace(a, key) : null;
    const search = `<div class="row" style="align-items:flex-end"><div class="field" style="flex:1;min-width:200px"><label for="tr-q">${L('Buscar por ID o TAG (como aparece en el informe)', 'Search by ID or TAG (as shown in the report)')}</label><input id="tr-q" value="${h(d.q || '')}" placeholder="E-01, F-02, R-03, PH-01, Q-OG-101, PLC-01…" data-autofocus></div><button class="btn primary sm" data-act="trace-find">${L('Buscar', 'Search')}</button></div>${d.miss ? `<p class="small" style="color:var(--err-ink)">${L('No se encontró ese ID en este assessment.', 'That ID was not found in this assessment.')}</p>` : ''}`;
    if (!t) return { title: L('Trazabilidad', 'Traceability'), wide: true, body: search };
    const row = (lbl, keys) => `<div class="tr-row"><span class="tr-k">${lbl}</span><div class="tr-v">${keys.length ? keys.map(kk => `<button class="pchip" data-act="trace-open" data-key="${kk}">${h(recLbl(a, kk).slice(0, 70))}</button>`).join('') : `<span class="small mut">—</span>`}</div></div>`;
    const blocks = t.scns.map(s => {
      const el = C.scnElements(a, s); const fnd = s.findings; const qs = [...new Set(fnd.map(fid => (a.findings.find(f => f.id === fid) || {}).q).filter(Boolean))];
      const ph = a.photos.filter(p => p.links && (p.links.scenario === s.id || fnd.includes(p.links.finding) || el.some(e => C.lk ? C.lk(p, e.k, e.id) : p.links[e.k] === e.id))).map(p => 'photo:' + p.id);
      const recs = a.recs.filter(r => r.sc.includes(s.id)).map(r => 'rec:' + r.id);
      const lv = C.LEVEL(s.C, s.P);
      const src = el.map(e => `<li><button class="plink" data-act="trace-open" data-key="${e.k}:${e.id}">${h(e.lbl)}</button> · ${C.provName(e.x.prov)} · ${C.matName(C.mat(a, e.k, e.x))}${e.x.src && e.x.src.file ? ` · ${h(e.x.src.file)} ${L('fila', 'row')} ${e.x.src.row}` : e.x.src && e.x.src.catalog ? ` · ${L('catálogo', 'catalog')} v${e.x.src.version}` : ''}${e.x.val && e.x.val.by ? ` · ${h(C.uname(e.x.val.by))} ${C.fmtDate(e.x.val.ts)}` : ''}</li>`).join('');
      return `<section class="tr-b"><div class="row" style="justify-content:space-between"><b>${s.id} · ${h(tx(s.title))}</b>${U.lv(lv)}</div>
        ${row(L('Proceso', 'Process'), ['process:' + s.proc])}
        <div class="tr-row"><span class="tr-k">${L('Fuentes (elementos)', 'Sources (items)')}</span><div class="tr-v"><ul class="plain small">${src || `<li class="mut">${L('Sin elementos vinculados', 'No linked items')}</li>`}</ul></div></div>
        ${row(L('Preguntas', 'Questions'), qs.map(x => 'q:' + x))}${row(L('Hallazgos', 'Findings'), fnd.map(x => 'finding:' + x))}${row(L('Evidencias', 'Evidence'), ph)}
        <div class="tr-row"><span class="tr-k">${L('Valoración', 'Rating')}</span><div class="tr-v small">C ${s.C || '—'} · P ${s.P || '—'} · ${L('confianza', 'confidence')} ${h(tx(s.conf))} · ${s.controls.filter(c => c.st === 'Verificado').length}/${s.controls.length} ${L('controles verificados', 'controls verified')}</div></div>
        ${row(L('Recomendaciones', 'Recommendations'), recs)}
        <div class="tr-row"><span class="tr-k">${L('Dónde aparece', 'Where it appears')}</span><div class="tr-v small">${L('Etapa 6 · Risk Intelligence (matriz y lista) · Risk Journey · Informe PDF: ficha ', 'Stage 6 · Risk Intelligence (matrix and list) · Risk Journey · PDF report: sheet ')}${s.id}${L(' y Anexo C', ' and Annex C')}</div></div>
        <div class="row">${goBtn(a, 'scenario:' + s.id)}<button class="btn ghost sm" data-act="go-dash" data-cell="${s.C && s.P ? s.C + ',' + s.P : 'pend'}">Risk Intelligence</button></div></section>`;
    }).join('');
    return { title: L('Trazabilidad · ', 'Traceability · ') + h(recLbl(a, key).slice(0, 60)), wide: true,
      body: search + `<div class="row">${goBtn(a, key)}</div>` + (blocks || `<div class="note-demo">${ic('info')}<span>${L('Este registro aún no participa en ningún escenario: no evaluado, no equivale a riesgo bajo.', 'This record is not part of any scenario yet: not assessed, not the same as low risk.')}</span></div>`) };
  };
  A['trace-open'] = el => { U.openModal('trace', { key: el.dataset.key || '' }); };
  A['trace-find'] = () => { const a = C.cur(); const q = (document.getElementById('tr-q') || {}).value || ''; const key = C.resolveId(a, q); U.openModal('trace', key ? { key, q } : { q, miss: !!q.trim() }); };
  A['go-dash'] = el => { U.closeModal(); C.S.ui.view = 'dash'; C.S.ui.cell = el.dataset.cell; C.save(); R(); U.after = null; const m = document.querySelector('.main'); setTimeout(() => { const t = document.getElementById('dash-scn'); if (t) t.scrollIntoView({ block: 'start' }); }, 0); };
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'tr-q') { e.preventDefault(); A['trace-find'](); } });

  // botón de trazabilidad en la barra superior (assessment abierto)
  const top0 = U.top;
  U.top = function (a, ev) { const html = top0(a, ev); if (!a || C.S.ui.view === 'home' || C.S.ui.view === 'new') return html; return html.replace('<button class="user-btn"', `<button class="btn ghost sm" data-act="trace-open" data-key="" aria-label="${L('Trazabilidad por ID', 'Traceability by ID')}" title="${L('Trazabilidad por ID', 'Traceability by ID')}">${ic('link', 'sm')}<span class="lbl-hide">${L('Trazabilidad', 'Traceability')}</span></button><button class="user-btn"`); };

  // escenario en modal: acceso a trazabilidad y mapa
  const scnModal = U.modals.scenario;
  if (scnModal) U.modals.scenario = function (a, d) { const r = scnModal(a, d); const s = a.scenarios.find(x => x.id === d.id); r.foot = `<button class="btn ghost" data-act="trace-open" data-key="scenario:${d.id}">${ic('link', 'sm')}${L('Trazabilidad', 'Traceability')}</button>${s && s.assets[0] ? `<button class="btn ghost" data-act="jr-open" data-key="asset:${s.assets[0]}">Risk Journey</button>` : ''}` + (r.foot || ''); return r; };

  // ---------- dashboard: base del modelo con denominadores (misma fuente que wizard y PDF) ----------
  C.modelBase = function (a) {
    const inc = new Set(C.included(a).map(p => p.key)); const out = { by: {} };
    const kinds = [['area', a.areas], ['system', a.systems], ['asset', a.assets], ['dep', a.deps]];
    let tot = 0, val = 0, evl = 0, sug = 0, dis = 0, noev = 0;
    kinds.forEach(([k, l]) => { const c = { total: 0, sugerido: 0, aceptado: 0, validado: 0, evaluado: 0, descartado: 0 }; l.forEach(x => { const m = C.mat(a, k, x); c[m]++; if (m === 'descartado') { dis++; return; } c.total++; tot++; if (m === 'sugerido') sug++; if (m === 'validado') val++; if (m === 'evaluado') evl++; if (C.riskStatus && C.riskStatus(a, k, x).code === 'noeval') noev++; }); out.by[k] = c; });
    Object.assign(out, { tot, val: val + evl, evl, sug, dis, noev, imp: a.assets.filter(x => x.prov === 'excel' && !C.isOut(x)).length, cat: [...a.areas, ...a.systems, ...a.deps].filter(x => x.prov === 'catalogo' && !C.isOut(x)).length, field: [...a.areas, ...a.systems, ...a.assets, ...a.deps].filter(x => x.prov === 'campo' && !C.isOut(x)).length });
    return out;
  };
  const dash0 = U.views.dash;
  U.views.dash = function (a, ev) {
    const html = dash0(a, ev); const b = C.modelBase(a); const pct = (n, d) => d ? Math.round(n / d * 100) + ' %' : '—';
    const kpi = (lbl, v, den, d, act, extra) => `<button class="kpi" data-act="${act}" ${extra || ''}><small>${lbl}</small><span class="v">${v}${den != null ? `<em> / ${den}</em>` : ''}</span><span class="d">${d}</span></button>`;
    const card = `<section class="box mb-base"><div class="box-head"><h3>${L('Base del modelo: inventario OT', 'Model base: OT inventory')}</h3><p>${L('Misma fuente que el wizard, el recorrido, Risk Journey y el PDF. Importado no significa aceptado; no evaluado no significa riesgo bajo.', 'Same source as the wizard, walkdown, Risk Journey and PDF. Imported does not mean validated; not assessed does not mean low risk.')}</p></div>
      <div class="box-body"><div class="kpis">${kpi(L('Verificados', 'Verified'), b.val, b.tot, pct(b.val, b.tot) + L(' del inventario vigente (incluye evaluados)', ' of the current inventory (includes assessed)'), 'mb-go', 'data-mat="validado"')}${kpi(L('Evaluados', 'Assessed'), b.evl, b.tot, L('En escenarios clasificados con controles', 'In rated scenarios with controls'), 'mb-go', 'data-mat="evaluado"')}${kpi(L('Sugeridos sin validar', 'Suggested, not validated'), b.sug, b.tot, L(`Catálogo ${b.cat} · Excel ${b.imp} activos`, `Catalog ${b.cat} · Excel ${b.imp} assets`), 'mb-go', 'data-mat="sugerido"')}${kpi(L('No evaluados', 'Not assessed'), b.noev, b.tot, L('Sin escenarios: brecha, no riesgo bajo', 'No scenarios: gap, not low risk'), 'mb-go', 'data-ev="noeval"')}${kpi(L('Descartados', 'Discarded'), b.dis, null, L('Con motivo; fuera de vistas y del PDF', 'With reason; out of views and PDF'), 'mb-go', 'data-mat="descartado"')}${kpi(L('Procedencia campo', 'Field provenance'), b.field, b.tot, L('Verificados en sitio o agregados en el recorrido', 'Verified on site or added during the walkdown'), 'mb-go', 'data-prov="campo"')}</div></div></section>`;
    return html.replace('<div class="dgrid">', card + '<div class="dgrid">');
  };
  A['mb-go'] = el => { C.S.ui.view = 'journey'; C.S.ui.jf = {}; if (el.dataset.mat) C.S.ui.jf.mat = el.dataset.mat; if (el.dataset.ev) C.S.ui.jf.ev = el.dataset.ev; if (el.dataset.prov) C.S.ui.jf.prov = el.dataset.prov; C.save(); R(); const m = document.querySelector('.main'); if (m) m.scrollTop = 0; };

  // ---------- persistencia: aviso si el navegador no guarda ----------
  const save0 = C.save; let warned = false;
  C.save = function (now) { save0(now); setTimeout(() => { if (C.storageOK === false && !warned) { warned = true; U.toast(L('No se pudo guardar en este navegador (espacio lleno o modo privado). Exporte el PDF antes de cerrar.', 'Could not save in this browser (storage full or private mode). Export the PDF before closing.')); } }, now ? 0 : 300); };
})();
