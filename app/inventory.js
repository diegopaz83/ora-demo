/* ORA — Fase 1: inventario OT (procedencia y madurez), importación Excel/CSV y catálogo industrial */
(function () {
  const C = window.ORA, D = window.ORA_DATA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, ic = U.ic, L = I.L, tx = I.tx, A = U.act;
  const $ = id => document.getElementById(id);
  const val = id => (($(id) || {}).value || '').trim();
  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const R = () => U.render();
  const LIM = { bytes: 5 * 1024 * 1024, rows: 3000 };

  // ---------- chips ----------
  const MAT_IC = { sugerido: 'spark', aceptado: 'check', validado: 'shield', evaluado: 'radar', descartado: 'x' };
  U.mat = k => `<span class="mat m-${k}" title="${L('Madurez', 'Maturity')}">${ic(MAT_IC[k] || 'info', 'sm')}${C.matName(k)}</span>`;
  U.prov = k => `<span class="prov" title="${L('Procedencia', 'Provenance')}">${C.provName(k)}</span>`;
  U.procChips = (a, x) => { const ps = C.recProcs(x); return ps.map(k => `<span class="pchip">${h(C.procName(a, k))}</span>`).join('') + (ps.length > 1 ? `<span class="pill vio">${L('Compartido · ', 'Shared · ')}${ps.length} ${L('procesos', 'processes')}</span>` : ''); };
  U.srcLine = (a, x) => {
    const s = x.src || {}; const v = x.val || {}; const parts = [];
    if (s.file) parts.push(`${h(s.file)} · ${h(s.sheet || '')} · ${L('fila', 'row')} ${s.row}`);
    else if (s.catalog) parts.push(`${L('Catálogo', 'Catalog')} ${h(C.indName(s.catalog))} v${s.version}`);
    if (v.status === 'validado' || v.status === 'aceptado' || v.status === 'descartado') parts.push(`${C.matName(v.status)}${v.src ? ' (' + C.provName(v.src) + ')' : ''} · ${h(C.uname(v.by) || v.by || '—')} · ${C.fmtDate(v.ts)}`);
    if (v.reason) parts.push(`«${h(tx(v.reason))}»`);
    return parts.length ? `<span class="srcl">${ic('clock', 'sm')}${parts.join(' · ')}</span>` : '';
  };
  const recs = (a, kind) => kind === 'asset' ? a.assets : kind === 'system' ? a.systems : kind === 'dep' ? a.deps : a.areas;
  const find = (a, kind, id) => recs(a, kind).find(x => x.id === id);
  U.dupGroups = a => { const m = {}; a.assets.filter(x => !C.isOut(x)).forEach(x => { const k = norm(x.tag); (m[k] = m[k] || []).push(x); }); return Object.values(m).filter(g => g.length > 1); };

  // ---------- Inventario OT (vista transversal del assessment, no es una etapa) ----------
  U.views.inventory = function (a) {
    const f = C.S.ui.inv || (C.S.ui.inv = { tab: 'asset' });
    const all = [['area', a.areas], ['system', a.systems], ['asset', a.assets], ['dep', a.deps]];
    const cnt = { sugerido: 0, aceptado: 0, validado: 0, evaluado: 0, descartado: 0 };
    all.forEach(([k, list]) => list.forEach(x => cnt[C.mat(a, k, x)]++));
    const pend = C.catalogPending(a); const pn = pend.areas.length + pend.systems.length + pend.deps.length;
    const t = C.S.lib.templates[a.cfg.industry] || {}; const closed = a.reportStatus === 'Aprobado';
    const newer = (t.version || 0) > (a.catalog.version || 0);
    const dups = U.dupGroups(a);
    let list = recs(a, f.tab === 'imports' ? 'asset' : f.tab).slice();
    if (f.mat) list = list.filter(x => C.mat(a, f.tab, x) === f.mat);
    if (f.prov) list = list.filter(x => x.prov === f.prov);
    if (f.proc) list = list.filter(x => f.tab === 'dep' ? [x.from, x.to].some(id => { const n = C.asset(a, id) || C.system(a, id); return n && C.recProcs(n).includes(f.proc); }) : C.recProcs(x).includes(f.proc));
    if (f.q) { const q = norm(f.q); list = list.filter(x => norm([x.tag, tx(x.name), x.name, C.nodeLbl(a, x.from || ''), C.nodeLbl(a, x.to || '')].join(' ')).includes(q)); }
    const tabs = [['asset', L('Activos', 'Assets'), a.assets.length], ['system', L('Sistemas OT', 'OT systems'), a.systems.length], ['dep', L('Dependencias', 'Dependencies'), a.deps.length], ['area', L('Áreas', 'Areas'), a.areas.length], ['imports', L('Importaciones', 'Imports'), a.imports.length]];
    const sel = (k, lbl, opts) => `<div class="field"><label for="iv-${k}">${lbl}</label><select id="iv-${k}" data-inv="${k}">${U.opt('', L('Todos', 'All'), f[k] || '')}${opts.map(([v, l]) => U.opt(v, l, f[k] || '')).join('')}</select></div>`;
    const row = x => {
      const k = f.tab, m = C.mat(a, k, x);
      const nm = k === 'asset' ? x.tag : k === 'dep' ? C.nodeLbl(a, x.from) + ' → ' + C.nodeLbl(a, x.to) : tx(x.name);
      const act = `<div class="ir-act">${m === 'sugerido' ? `<button class="btn soft sm" data-act="iv-accept" data-k="${k}" data-id="${x.id}">${ic('check', 'sm')}${L('Aceptar', 'Accept')}</button>` : m === 'aceptado' ? `<button class="btn ghost sm" data-act="iv-decide" data-k="${k}" data-id="${x.id}" data-m="validado">${ic('shield', 'sm')}${L('Verificar', 'Verify')}</button>` : ''}<span class="v6w v6w-inl">${U.v6kebab ? U.v6kebab('iv:' + k + ':' + x.id, nm, [U.v6mi(`data-act="iv-edit" data-k="${k}" data-id="${x.id}"`, 'edit', L('Editar', 'Edit')), U.v6mi(`data-act="jr-open" data-key="${k}:${x.id}"`, 'map', L('Ver en Risk Journey', 'View in Risk Journey')), m === 'descartado' ? U.v6mi(`data-act="iv-reopen" data-k="${k}" data-id="${x.id}"`, 'reset', L('Reabrir', 'Reopen')) : '', U.v6mi(`data-act="iv-del" data-k="${k}" data-id="${x.id}"`, 'x', L('Borrar', 'Delete'), 'danger')]) : ''}</span></div>`;
      let main = '';
      if (k === 'asset') main = `<span class="ir-h"><span class="v6w-id ${x.noTag ? 'notag' : ''}">${h(x.tag)}</span><b>${h(tx(x.name))}</b></span><small>${h(tx(x.type))} · ${h(C.areaName(a, x.area) || L('Sin área', 'No area'))}${x.sys ? ' · ' + h(C.nodeLbl(a, x.sys)) : ''}${x.mm ? ' · ' + h(x.mm) : ''}</small>`;
      else if (k === 'system') main = `<b>${h(tx(x.name))}</b><small>${h(C.catName(x.cat))} · ${a.assets.filter(y => y.sys === x.id && !C.isOut(y)).length} ${L('activos', 'assets')}${x.cat0 ? ' · ' + x.cat0 : ''}</small>`;
      else if (k === 'dep') main = `<b>${h(C.nodeLbl(a, x.from))} <span class="mut">${x.dir === 'bi' ? '↔' : '→'}</span> ${h(C.nodeLbl(a, x.to))}</b><small>${h(C.depName(x.type))}${x.crit ? ' · ' + L('criticidad ', 'criticality ') + h(tx(x.crit)) : ''}${x.note ? ' · ' + h(tx(x.note)) : ''}</small>`;
      else main = `<b>${h(tx(x.name))}</b><small>${a.assets.filter(y => y.area === x.id && !C.isOut(y)).length} ${L('activos', 'assets')}</small>`;
      return `<article class="irow v6-ir m-${m} ${m === 'descartado' ? 'off' : ''}" id="iv-${x.id}"><div class="ir-main">${main}<div class="ir-chips">${k !== 'dep' ? U.procChips(a, x) : ''}</div>${U.srcLine(a, x)}</div><div class="ir-st">${U.prov(x.prov)}${U.mat(m)}</div>${act}</article>`;
    };
    const imports = a.imports.map(im => `<article class="irow"><div class="ir-main"><b>${h(im.file)}</b><small>${h(im.sheet)} · ${C.fmtDate(im.ts, true)} · ${h(C.uname(im.by))}</small><div class="ir-chips"><span class="pill ok">${L('Creados', 'Created')} ${im.counts.crear}</span><span class="pill pri">${L('Actualizados', 'Updated')} ${im.counts.actualizar}</span><span class="pill">${L('Omitidos', 'Skipped')} ${im.counts.omitir}</span><span class="pill err">${L('Erróneos', 'Errors')} ${im.counts.error}</span></div></div><div class="ir-act"><button class="btn ghost sm" data-act="iv-imp-detail" data-id="${im.id}">${L('Ver detalle', 'View detail')}</button></div></article>`).join('');
    return `<div class="hello"><div><h1>${L('Inventario OT', 'OT inventory')}</h1><p>${L('Áreas, sistemas OT, activos y dependencias del assessment, con su procedencia y su madurez. Importado no significa aceptado y no evaluado no significa riesgo bajo.', 'Areas, OT systems, assets and dependencies of the assessment, with provenance and maturity. Imported does not mean validated, and not assessed does not mean low risk.')}</p></div>
        <div class="row"><button class="btn ghost" data-act="iv-sample">${ic('down', 'sm')}${L('Archivo de ejemplo', 'Sample file')}</button><button class="btn primary" data-act="iv-import">${ic('plus', 'sm')}${L('Importar Excel o CSV', 'Import Excel or CSV')}</button></div></div>
      <div class="mat-sum">${['sugerido', 'aceptado', 'validado', 'evaluado', 'descartado'].map(k => `<button class="ms m-${k}" data-act="iv-mat" data-m="${k}" aria-pressed="${f.mat === k}"><b>${cnt[k]}</b>${U.mat(k)}</button>`).join('')}</div>
      ${pn ? `<div class="note-info cat-sug">${ic('book')}<span><b>${L('Sugerencias del catálogo', 'Catalog suggestions')} ${h(C.indName(a.catalog.ind))} v${a.catalog.version}:</b> ${pend.areas.length} ${L('áreas', 'areas')}, ${pend.systems.length} ${L('sistemas OT', 'OT systems')} ${L('y', 'and')} ${pend.deps.length} ${L('dependencias para los procesos incluidos. Entran como «Propuesto»: son hipótesis de la plantilla, no la planta real.', 'dependencies for the included processes. They enter as “Proposed”: template hypotheses, not the real plant.')}</span><button class="btn primary sm" data-act="iv-apply">${L('Aplicar sugerencias', 'Apply suggestions')}</button></div>` : ''}
      ${newer ? `<div class="note-demo">${ic('info')}<span>${closed ? L(`Assessment cerrado: conserva el catálogo v${a.catalog.version} aunque ya existe la v${t.version}.`, `Closed assessment: keeps catalog v${a.catalog.version} although v${t.version} exists.`) : L(`Hay una versión más reciente del catálogo (v${t.version}). Este assessment usa la v${a.catalog.version}.`, `A newer catalog version exists (v${t.version}). This assessment uses v${a.catalog.version}.`)}</span>${closed ? '' : `<button class="btn ghost sm" data-act="iv-catup">${L('Usar v', 'Use v')}${t.version}</button>`}</div>` : ''}
      ${dups.length ? `<div class="note-demo">${ic('alert')}<span>${L('Posibles duplicados por TAG: ', 'Possible duplicates by TAG: ')}${dups.map(g => h(g[0].tag) + ' ×' + g.length).join(', ')}</span><button class="btn ghost sm" data-act="iv-merge" data-id="${dups[0][1].id}" data-into="${dups[0][0].id}">${L('Conciliar ', 'Reconcile ')}${h(dups[0][0].tag)}</button></div>` : ''}
      <div class="tabs" role="tablist">${tabs.map(([k, l, n]) => `<button role="tab" data-act="iv-tab" data-t="${k}" aria-selected="${f.tab === k}">${l} <span class="mut">${n}</span></button>`).join('')}</div>
      ${f.tab === 'imports' ? `<section class="box">${imports || `<div class="box-body"><div class="empty">${ic('list')}<b>${L('Sin importaciones', 'No imports yet')}</b><span>${L('Importe un inventario en Excel (.xlsx, .xls) o CSV. Puede probar con el archivo de ejemplo.', 'Import an inventory in Excel (.xlsx, .xls) or CSV. You can try the sample file.')}</span></div></div>`}</section>` : `
      <div class="filters">${sel('mat', L('Madurez', 'Maturity'), ['sugerido', 'aceptado', 'validado', 'evaluado', 'descartado'].map(k => [k, C.matName(k)]))}${sel('prov', L('Procedencia', 'Provenance'), C.PROVS.map(k => [k, C.provName(k)]))}${sel('proc', L('Proceso', 'Process'), a.processes.map(p => [p.key, tx(p.name)]))}<div class="field" style="flex:2"><label for="iv-q">${L('Buscar', 'Search')}</label><input id="iv-q" data-inv="q" value="${h(f.q || '')}" placeholder="${L('TAG, nombre…', 'TAG, name…')}"></div><button class="btn ghost sm" data-act="iv-clear" style="align-self:flex-end">${L('Limpiar', 'Clear')}</button></div>
      <section class="box"><div class="box-head"><h3>${tabs.find(x => x[0] === f.tab)[1]} · ${list.length}</h3><button class="btn ghost sm" data-act="iv-edit" data-k="${f.tab}" data-id="">${ic('plus', 'sm')}${L('Agregar manualmente', 'Add manually')}</button></div>
        <div class="ilist">${list.map(row).join('') || `<div class="box-body"><div class="empty">${L('Nada con estos filtros.', 'Nothing with these filters.')}</div></div>`}</div></section>`}
      <p class="hint">${L('«Evaluado» se calcula: el elemento participa en un escenario clasificado con controles. Validar requiere una persona, una fuente y una fecha. Descartar exige motivo y conserva el registro.', '“Assessed” is computed: the item takes part in a rated scenario with controls. Validating requires a person, a source and a date. Discarding requires a reason and keeps the record.')}</p>`;
  };

  // ---------- modales ----------
  const procChecks = (a, sel, name) => `<div class="cbs">${a.processes.map(p => `<label><input type="checkbox" class="${name}" value="${p.key}" ${sel.includes(p.key) ? 'checked' : ''}>${h(tx(p.name))}${p.status === 'incluido' ? '' : ` <span class="mut small">(${p.status ? L('no incluido', 'not included') : L('por decidir', 'to decide')})</span>`}</label>`).join('')}</div>`;
  const nodeOpts = (a, cur) => `<optgroup label="${L('Sistemas OT', 'OT systems')}">${a.systems.map(s => U.opt(s.id, tx(s.name), cur)).join('')}</optgroup><optgroup label="${L('Activos', 'Assets')}">${a.assets.map(x => U.opt(x.id, x.tag + ' · ' + tx(x.name), cur)).join('')}</optgroup>`;
  Object.assign(U.modals, {
    decide(a, d) {
      const x = find(a, d.k, d.id); const lb = d.k === 'asset' ? x.tag : d.k === 'dep' ? C.nodeLbl(a, x.from) + ' → ' + C.nodeLbl(a, x.to) : tx(x.name);
      const v = d.m === 'validado';
      return { title: (v ? L('Verificar', 'Verify') : L('Descartar', 'Discard')) + ' · ' + h(lb), body: `<div class="row">${U.prov(x.prov)}${U.mat(C.mat(a, d.k, x))}</div>
        ${v ? `<div class="field"><label for="dc-src">${L('¿Cómo lo verificó?', 'How did you verify it?')}</label><select id="dc-src">${U.opt('campo', L('Visto en planta', 'Seen on site'))}${U.opt('documento', L('Con evidencia documental', 'With documentary evidence'))}${U.opt('foto', L('Con foto vinculada', 'With a linked photo'))}</select><span class="hint">${L('Quedará como Verificado con su nombre y la fecha de hoy. Sube la confianza de los resultados.', 'It will be Verified with your name and today’s date. It raises confidence in the results.')}</span></div><div class="field"><label for="dc-note">${L('Nota (opcional)', 'Note (optional)')}</label><input id="dc-note"></div>`
        : `<div class="field"><label for="dc-why">${L('Motivo', 'Reason')} *</label><select id="dc-why">${[L('No existe en la instalación', 'Does not exist at the facility'), L('Duplicado de otro registro', 'Duplicate of another record'), L('Fuera del alcance del assessment', 'Outside the assessment scope'), L('Dato incorrecto en la fuente', 'Wrong data in the source'), L('Otro', 'Other')].map(t => U.opt(t, t)).join('')}</select></div><div class="field"><label for="dc-note">${L('Detalle', 'Detail')} *</label><textarea id="dc-note" placeholder="${L('Explique la decisión', 'Explain the decision')}"></textarea></div><p class="hint">${L('El registro no se borra: queda «Descartado» con motivo, autor y fecha.', 'The record is not deleted: it stays “Discarded” with reason, author and date.')}</p>`}`,
        foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button><button class="btn ${v ? 'primary' : 'danger'}" data-act="iv-decide-save" data-k="${d.k}" data-id="${d.id}" data-m="${d.m}">${v ? L('Verificar', 'Verify') : L('Descartar', 'Discard')}</button>` };
    },
    rec(a, d) {
      const k = d.k; const x = d.id ? find(a, k, d.id) : { procs: d.proc ? [d.proc] : (C.included(a)[0] ? [C.included(a)[0].key] : []), area: d.area || '', sys: d.sys || null, from: d.sys || d.from || '', prov: 'manual', val: { status: 'sugerido' }, type: 'Otro', cat: 'control', dir: 'uni', type0: 'Control' };
      const ps = C.recProcs(x); const T = { asset: L('Activo', 'Asset'), system: L('Sistema OT', 'OT system'), dep: L('Dependencia', 'Dependency'), area: L('Área', 'Area') }[k];
      let body = '';
      if (k === 'asset') body = `<div class="grid2"><div class="field"><label for="rc-tag">TAG *</label><input id="rc-tag" value="${h(x.tag || '')}"></div><div class="field"><label for="rc-name">${L('Descripción', 'Description')}</label><input id="rc-name" value="${h(tx(x.name) || '')}"></div></div>
        <div class="grid3"><div class="field"><label for="rc-type">${L('Tipo', 'Type')}</label><select id="rc-type">${[...new Set([...C.assetTypes(), x.type])].map(t => U.opt(t, tx(t), x.type)).join('')}</select></div><div class="field"><label for="rc-area">${L('Área', 'Area')} *</label><select id="rc-area">${a.areas.map(r => U.opt(r.id, tx(r.name), x.area)).join('')}</select></div><div class="field"><label for="rc-sys">${L('Sistema OT', 'OT system')}</label><select id="rc-sys">${U.opt('', '—', x.sys || '')}${a.systems.map(s => U.opt(s.id, tx(s.name), x.sys || '')).join('')}</select></div></div>
        <div class="field"><label for="rc-mm">${L('Fabricante / modelo', 'Manufacturer / model')}</label><input id="rc-mm" value="${h(x.mm || '')}"></div>`;
      else if (k === 'system') body = `<div class="grid2"><div class="field"><label for="rc-name">${L('Nombre', 'Name')} *</label><input id="rc-name" value="${h(tx(x.name) || '')}"></div><div class="field"><label for="rc-cat">${L('Categoría OT', 'OT category')}</label><select id="rc-cat">${C.S.lib.otCats.map(c => U.opt(c.key, tx(c.name), x.cat)).join('')}</select></div></div>`;
      else if (k === 'area') body = `<div class="field"><label for="rc-name">${L('Nombre', 'Name')} *</label><input id="rc-name" value="${h(tx(x.name) || '')}"></div>`;
      else body = `<div class="grid2"><div class="field"><label for="rc-from">${L('Elemento que depende', 'Dependent element')} *</label><select id="rc-from">${nodeOpts(a, x.from)}</select></div><div class="field"><label for="rc-to">${L('Depende de', 'Depends on')} *</label><select id="rc-to">${nodeOpts(a, x.to)}</select></div></div>
        <div class="grid3"><div class="field"><label for="rc-type">${L('Tipo', 'Type')}</label><select id="rc-type">${D.DEP_TYPES.map(t => U.opt(t, C.depName(t), x.type || 'Control')).join('')}</select></div><div class="field"><label for="rc-dir">${L('Dirección', 'Direction')}</label><select id="rc-dir">${U.opt('uni', L('Unidireccional (→)', 'One-way (→)'), x.dir)}${U.opt('bi', L('Bidireccional (↔)', 'Two-way (↔)'), x.dir)}</select></div><div class="field"><label for="rc-crit">${L('Criticidad contextual', 'Contextual criticality')}</label><select id="rc-crit">${U.opt('', '—', x.crit || '')}${['Alta', 'Media', 'Baja'].map(c => U.opt(c, tx(c), x.crit || '')).join('')}</select></div></div>
        <div class="field"><label for="rc-note">${L('Descripción', 'Description')}</label><input id="rc-note" value="${h(tx(x.note) || '')}"></div><p class="hint">${L('Una dependencia compartida no implica riesgo alto por sí sola.', 'A shared dependency does not imply high risk by itself.')}</p>`;
      if (k !== 'dep') body += `<div class="field"><span class="lbl">${L('Procesos que soporta', 'Processes it supports')} ${k === 'area' ? '' : L('(puede ser más de uno, sin duplicar el registro)', '(can be more than one, without duplicating the record)')}</span>${procChecks(a, ps, 'rc-proc')}</div>`;
      const wasVal = x.val && x.val.status === 'validado';
      body += `<div class="valbox"><label class="check"><input type="checkbox" id="rc-val" ${x.val && x.val.status === 'validado' ? 'checked' : ''}><span><b>${L('Marcar como Verificado (visto en planta o con evidencia)', 'Mark as Verified (seen on site or with evidence)')}</b><br><span class="small mut">${L('Si no lo marca, queda Aceptado: cuenta para el análisis, pero aún sin verificar.', 'If unchecked, it stays Accepted: it counts for the analysis, but is not verified yet.')}</span></span></label>
        <div class="field" style="max-width:240px"><label for="rc-src">${L('Fuente', 'Source')}</label><select id="rc-src">${['campo', 'documento', 'entrevista'].map(s => U.opt(s, C.provName(s), (x.val && x.val.src) || 'campo')).join('')}</select></div></div>
        ${d.id ? `<div class="sec-title">${L('Procedencia y trazabilidad', 'Provenance and traceability')}</div><div class="row">${U.prov(x.prov)}${U.mat(C.mat(a, k, x))}</div>${U.srcLine(a, x)}
        ${(x.log || []).length ? `<ul class="plain small">${x.log.slice(0, 8).map(l => `<li>${C.fmtDate(l.ts, true)} · ${h(C.uname(l.by) || l.by || '')} · ${h(L(l.es, l.en))}</li>`).join('')}</ul>` : ''}${(x.srcs || []).length ? `<p class="small mut">${L('Importaciones previas', 'Previous imports')}: ${x.srcs.map(s => h(s.file) + ' ' + L('fila ', 'row ') + s.row).join(' · ')}</p>` : ''}` : ''}`;
      void wasVal;
      return { title: (d.id ? L('Editar ', 'Edit ') : L('Agregar ', 'Add ')) + T.toLowerCase(), wide: true, body, foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button><button class="btn primary" data-act="iv-rec-save" data-k="${k}" data-id="${d.id || ''}">${L('Guardar', 'Save')}</button>` };
    },
    impdetail(a, d) {
      const im = a.imports.find(x => x.id === d.id);
      return { title: L('Importación · ', 'Import · ') + h(im.file), wide: true, body: `<p class="small mut">${h(im.sheet)} · ${C.fmtDate(im.ts, true)} · ${h(C.uname(im.by))} · ${L('mapeo', 'mapping')}: ${Object.entries(im.map).filter(([, v]) => v !== '').map(([k, v]) => k + '←' + h(im.headers[v] || '')).join(', ')}</p>${U.impTable(im.rows)}`,
        foot: `<button class="btn ghost" data-act="iv-rej-dl" data-id="${im.id}">${ic('down', 'sm')}${L('Descargar filas rechazadas (CSV)', 'Download rejected rows (CSV)')}</button><button class="btn primary" data-act="modal-close">${L('Cerrar', 'Close')}</button>` };
    },
    imp(a) { return U.impModal(a); },
    padapt(a, d) { const p = a.processes.find(x => x.key === d.k); return { title: L('Adaptar nombre del proceso', 'Adapt process name'), body: `<div class="field"><label for="pa-name">${L('Nombre en esta instalación', 'Name at this facility')}</label><input id="pa-name" value="${h(tx(p.name))}" data-autofocus></div><p class="hint">${L('Se conserva el nombre original de la plantilla para trazabilidad.', 'The original template name is kept for traceability.')}${p.name0 ? ' ' + L('Original', 'Original') + ': «' + h(tx(p.name0)) + '»' : ''}</p>`, foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button><button class="btn primary" data-act="proc-adapt-save" data-k="${p.key}">${L('Guardar', 'Save')}</button>` }; },
    catitem(a, d) { return U.catItemModal(d); }
  });
  U.impTable = rows => {
    const st = { crear: ['ok', L('Crear', 'Create')], actualizar: ['pri', L('Actualizar', 'Update')], omitir: ['', L('Omitir', 'Skip')], error: ['err', L('Error', 'Error')] };
    return `<div class="scroll-x imp-t"><table><thead><tr><th>${L('Fila', 'Row')}</th><th>${L('Resultado', 'Result')}</th><th>TAG</th><th>${L('Detalle', 'Detail')}</th></tr></thead><tbody>${rows.slice(0, 300).map(r => `<tr><td>${r.row}</td><td><span class="pill ${st[r.status][0]}">${st[r.status][1]}</span></td><td><b>${h(r.tag || '—')}</b></td><td class="small">${r.msgs.map(m => h(m)).join('<br>') || '—'}</td></tr>`).join('')}</tbody></table>${rows.length > 300 ? `<p class="hint">${L('Se muestran 300 filas.', 'Showing 300 rows.')}</p>` : ''}</div>`;
  };

  // ---------- acciones de inventario ----------
  A['iv-tab'] = el => { C.S.ui.inv.tab = el.dataset.t; R(); };
  A['iv-mat'] = el => { const f = C.S.ui.inv; f.mat = f.mat === el.dataset.m ? '' : el.dataset.m; if (f.tab === 'imports') f.tab = 'asset'; R(); };
  A['iv-clear'] = () => { const t = C.S.ui.inv.tab; C.S.ui.inv = { tab: t }; R(); };
  A['iv-decide'] = el => U.openModal('decide', { k: el.dataset.k, id: el.dataset.id, m: el.dataset.m });
  A['iv-del'] = el => { const a = C.cur(); const k = el.dataset.k, id = el.dataset.id;
    if (k === 'asset') return A['del-asset']({ dataset: { id } });
    const x = (k === 'system' ? a.systems : k === 'dep' ? a.deps : a.areas).find(z => z.id === id); if (!x) return;
    const lb = k === 'dep' ? C.nodeLbl(a, x.from) + ' → ' + C.nodeLbl(a, x.to) : tx(x.name);
    if (k === 'area') { const n = a.assets.filter(y => y.area === id && !C.isOut(y)).length; if (n) return U.toast(L(`No se puede borrar: el área tiene ${n} activos. Muévalos o bórrelos primero.`, `Cannot delete: the area has ${n} assets. Move or delete them first.`)); }
    const msg = k === 'system' ? L(`Se borrará el sistema ${lb} y sus dependencias. Los activos se conservan sin ese sistema.`, `System ${lb} and its dependencies will be deleted. Assets are kept without that system.`) : k === 'dep' ? L(`Se borrará la dependencia ${lb}.`, `Dependency ${lb} will be deleted.`) : L(`Se borrará el área ${lb}.`, `Area ${lb} will be deleted.`);
    U.openModal('confirm', { title: L('Borrar ', 'Delete ') + ({ system: L('sistema', 'system'), dep: L('dependencia', 'dependency'), area: L('área', 'area') }[k]), msg, yes: L('Borrar', 'Delete'), danger: true, onYes: () => {
      if (k === 'dep') a.deps = a.deps.filter(d => d.id !== id);
      if (k === 'system') { a.systems = a.systems.filter(z => z.id !== id); a.deps = a.deps.filter(d => d.from !== id && d.to !== id); a.assets.forEach(y => { if (y.sys === id) y.sys = null; }); a.findings.forEach(f => { if (f.systems) f.systems = f.systems.filter(z => z !== id); }); }
      if (k === 'area') { a.areas = a.areas.filter(z => z.id !== id); a.photos.forEach(p => { if (p.links && p.links.area === id) delete p.links.area; }); }
      C.log(a, 'Borró ' + lb + ' del inventario', 'Deleted ' + lb + ' from the inventory'); C.save(); R(); } }); };
  A['iv-decide-save'] = el => {
    const a = C.cur(); const x = find(a, el.dataset.k, el.dataset.id); const m = el.dataset.m;
    if (m === 'descartado') { const n = val('dc-note'); if (!n) return U.toast(L('Explique el motivo del descarte', 'Explain why you discard it')); C.setVal(a, el.dataset.k, x, 'descartado', { reason: val('dc-why') + ': ' + n }); }
    else C.setVal(a, el.dataset.k, x, 'validado', { src: val('dc-src'), reason: val('dc-note') });
    U.closeModal(); C.save(); R(); U.toast(m === 'descartado' ? L('Descartado con motivo; el registro se conserva', 'Discarded with reason; the record is kept') : L('Verificado', 'Verified'));
  };
  A['iv-accept'] = el => { const a = C.cur(); const x = find(a, el.dataset.k, el.dataset.id); C.setVal(a, el.dataset.k, x, 'aceptado', { src: x.prov || '' }); C.save(); R(); U.toast(L('Aceptado: ya cuenta para el análisis', 'Accepted: it now counts for the analysis')); };
  A['iv-reopen'] = el => { const a = C.cur(); C.setVal(a, el.dataset.k, find(a, el.dataset.k, el.dataset.id), 'sugerido', { reason: L('Reabierto para revisión', 'Reopened for review') }); C.save(); R(); };
  A['iv-edit'] = el => { const k = el.dataset.k === 'imports' ? 'asset' : el.dataset.k; if (!el.dataset.id && k === 'asset' && !C.cur().areas.length) return U.toast(L('Primero registre o aplique un área', 'First record or apply an area')); U.openModal('rec', { k, id: el.dataset.id }); };
  A['iv-rec-save'] = el => {
    const a = C.cur(); const k = el.dataset.k; const id = el.dataset.id; const isNew = !id; const x = isNew ? { id: C.uid({ asset: 'AS', system: 'SY', dep: 'D', area: 'A' }[k]), prov: 'manual', log: [], val: { status: 'sugerido' } } : find(a, k, id);
    const procs = [...document.querySelectorAll('.rc-proc:checked')].map(i => i.value);
    const before = JSON.stringify(x);
    const put = (f, v) => { if (v !== tx(x[f])) x[f] = v; };
    if (k === 'asset') {
      const tag = val('rc-tag').toUpperCase(); if (!tag) return U.toast(L('El TAG es obligatorio', 'TAG is required'));
      const dup = a.assets.find(y => y.id !== x.id && !C.isOut(y) && norm(y.tag) === norm(tag)); if (dup) return U.toast(L('Ya existe un activo con ese TAG: corrija ese registro en lugar de duplicarlo', 'An asset with that TAG exists: correct that record instead of duplicating it'));
      if (!procs.length) return U.toast(L('Seleccione al menos un proceso', 'Select at least one process'));
      x.tag = tag; put('name', val('rc-name') || tag); x.type = val('rc-type'); x.area = val('rc-area'); x.sys = val('rc-sys') || null; x.mm = val('rc-mm'); x.procs = procs; x.proc = procs[0];
    } else if (k === 'system' || k === 'area') {
      const n = val('rc-name'); if (!n) return U.toast(L('El nombre es obligatorio', 'Name is required')); if (!procs.length) return U.toast(L('Seleccione al menos un proceso', 'Select at least one process'));
      put('name', n); x.procs = procs; x.proc = procs[0]; if (k === 'system') x.cat = val('rc-cat');
    } else {
      const fr = val('rc-from'), to = val('rc-to'); if (!fr || !to || fr === to) return U.toast(L('Seleccione dos elementos distintos', 'Select two different elements'));
      if (a.deps.some(y => y.id !== x.id && !C.isOut(y) && y.from === fr && y.to === to)) return U.toast(L('Esa dependencia ya existe', 'That dependency already exists'));
      x.from = fr; x.to = to; x.type = val('rc-type'); x.dir = val('rc-dir'); x.crit = val('rc-crit'); put('note', val('rc-note'));
    }
    const changed = before !== JSON.stringify(x);
    if (isNew) { recs(a, k).push(x); C.recLog(x, 'Agregó el registro', 'Added the record'); C.log(a, 'Agregó manualmente ' + (x.tag || x.name || C.nodeLbl(a, x.from) + ' → ' + C.nodeLbl(a, x.to)), 'Manually added ' + (x.tag || tx(x.name) || C.nodeLbl(a, x.from) + ' → ' + C.nodeLbl(a, x.to))); }
    else if (changed) { C.recLog(x, 'Corrigió el registro', 'Corrected the record'); }
    if ($('rc-val').checked && (isNew || changed || x.val.status !== 'validado')) C.setVal(a, k, x, 'validado', { src: val('rc-src'), reason: isNew ? L('Agregado manualmente', 'Added manually') : changed ? L('Editado', 'Edited') : '' });
    else if (!$('rc-val').checked && (isNew || x.val.status === 'sugerido' || x.val.status === 'validado')) C.setVal(a, k, x, 'aceptado', { src: val('rc-src'), reason: isNew ? L('Agregado manualmente', 'Added manually') : L('Editado', 'Edited') });
    U.closeModal(); C.save(); R(); U.toast(L('Registro guardado', 'Record saved'));
  };
  A['iv-apply'] = () => { const a = C.cur(); const r = C.applyCatalog(a); C.S.ui.inv.tab = r.systems ? 'system' : 'area'; C.S.ui.inv.mat = 'sugerido'; C.save(); R(); U.toast(L(`Sugerencias agregadas: ${r.areas} áreas, ${r.systems} sistemas, ${r.deps} dependencias (Propuesto)`, `Suggestions added: ${r.areas} areas, ${r.systems} systems, ${r.deps} dependencies (Proposed)`)); };
  A['iv-catup'] = () => { const a = C.cur(); if (a.reportStatus === 'Aprobado') return; const old = a.catalog.version; a.catalog = C.catSnapshot(a.cfg.industry); C.log(a, `Actualizó el catálogo de v${old} a v${a.catalog.version}`, `Updated catalog from v${old} to v${a.catalog.version}`); C.save(); R(); U.toast(L('Catálogo actualizado; los registros existentes no cambian', 'Catalog updated; existing records do not change')); };
  A['iv-merge'] = el => {
    const a = C.cur(); const keep = C.asset(a, el.dataset.into), drop = C.asset(a, el.dataset.id);
    U.openModal('confirm', { title: L('Conciliar duplicado ', 'Reconcile duplicate ') + keep.tag, msg: L(`Se conserva el registro ${keep.id} y se trasladan a él fotos, hallazgos, escenarios y dependencias de ${drop.id}. El duplicado queda «Descartado» con motivo.`, `Record ${keep.id} is kept and photos, findings, scenarios and dependencies of ${drop.id} move to it. The duplicate becomes “Discarded” with a reason.`), yes: L('Conciliar', 'Reconcile'), onYes: () => {
      const sw = v => v === drop.id ? keep.id : v;
      a.photos.forEach(p => { if (p.links && p.links.asset === drop.id) p.links.asset = keep.id; }); a.findings.forEach(f => f.assets = [...new Set(f.assets.map(sw))]); a.scenarios.forEach(s => s.assets = [...new Set(s.assets.map(sw))]); a.deps.forEach(d => { d.from = sw(d.from); d.to = sw(d.to); });
      keep.procs = [...new Set([...C.recProcs(keep), ...C.recProcs(drop)])]; C.recLog(keep, 'Concilió el duplicado ' + drop.id, 'Reconciled duplicate ' + drop.id);
      C.setVal(a, 'asset', drop, 'descartado', { reason: L('Duplicado conciliado con ', 'Duplicate reconciled into ') + keep.id }); C.save(); R(); } });
  };
  A['iv-imp-detail'] = el => U.openModal('impdetail', { id: el.dataset.id });

  // ---------- lectura de archivos ----------
  let xlsxP = null;
  const loadXLSX = () => xlsxP || (xlsxP = new Promise((res, rej) => { if (window.XLSX) return res(window.XLSX); const s = document.createElement('script'); s.src = 'lib/xlsx.full.min.js'; s.onload = () => res(window.XLSX); s.onerror = () => { xlsxP = null; rej(new Error(L('No se pudo cargar el lector de Excel', 'The Excel reader could not be loaded'))); }; document.head.appendChild(s); }));
  U.loadXLSX = loadXLSX;
  C.parseCSV = function (text) {
    text = text.replace(/^﻿/, ''); const first = text.split(/\r?\n/)[0] || '';
    const cands = [';', ',', '\t', '|']; const dl = cands.sort((x, y) => first.split(y).length - first.split(x).length)[0];
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) { const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true; else if (c === dl) { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c; }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return { rows, delimiter: dl };
  };
  const detectHeader = rows => { for (let i = 0; i < Math.min(rows.length, 15); i++) if (rows[i].filter(c => String(c).trim()).length >= 2) return i; return 0; };
  U.readFile = async function (file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) throw new Error(L('Formato no soportado: use .xlsx, .xls o .csv', 'Unsupported format: use .xlsx, .xls or .csv'));
    if (file.size > LIM.bytes) throw new Error(L('El archivo supera 5 MB (límite de este prototipo)', 'The file exceeds 5 MB (prototype limit)'));
    if (ext === 'csv') { const t = await file.text(); const p = C.parseCSV(t); return { name: file.name, kind: 'csv', sheets: { 'CSV': p.rows }, names: ['CSV'], note: L('Delimitador detectado: ', 'Detected delimiter: ') + (p.delimiter === '\t' ? 'TAB' : p.delimiter) }; }
    const X = await loadXLSX(); const wb = X.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const sheets = {}; wb.SheetNames.forEach(n => { sheets[n] = X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '', blankrows: true }); });
    return { name: file.name, kind: ext, sheets, names: wb.SheetNames };
  };

  // ---------- importación: mapeo, validación y aplicación ----------
  const DFIELDS = () => [['from', L('Elemento que depende (TAG o sistema)', 'Dependent element (TAG or system)'), true], ['to', L('Depende de (TAG o sistema)', 'Depends on (TAG or system)'), true], ['type', L('Tipo de dependencia', 'Dependency type')], ['dir', L('Dirección', 'Direction')], ['crit', L('Criticidad contextual', 'Contextual criticality')], ['note', L('Descripción', 'Description')]];
  const FIELDS = () => U.imp && U.imp.kind === 'dep' ? DFIELDS() : AFIELDS();
  const AFIELDS = () => [['tag', 'TAG', true], ['name', L('Descripción', 'Description')], ['type', L('Tipo de activo', 'Asset type')], ['area', L('Área', 'Area'), true], ['procs', L('Proceso(s)', 'Process(es)')], ['sys', L('Sistema OT', 'OT system')], ['mm', L('Fabricante / modelo', 'Manufacturer / model')]];
  const SYN = { tag: ['tag', 'id', 'codigo', 'etiqueta', 'asset id', 'identificador', 'tag id'], name: ['descripcion', 'nombre', 'description', 'name', 'equipo'], type: ['tipo', 'type', 'clase', 'categoria', 'tipo de activo', 'asset type'], area: ['area', 'ubicacion', 'location', 'zona'], procs: ['proceso', 'procesos', 'process', 'processes', 'proceso(s)', 'unidad'], sys: ['sistema', 'sistema ot', 'system', 'ot system'], mm: ['fabricante', 'modelo', 'fabricante / modelo', 'manufacturer', 'model', 'marca', 'vendor'] };
  const DSYN = { from: ['elemento', 'desde', 'origen', 'from', 'source', 'activo', 'elemento que depende', 'dependiente'], to: ['depende de', 'hacia', 'destino', 'to', 'target', 'depends on', 'proveedor'], type: ['tipo', 'type', 'tipo de dependencia'], dir: ['direccion', 'direction', 'sentido'], crit: ['criticidad', 'criticality', 'criticidad contextual'], note: ['descripcion', 'description', 'nota', 'note', 'detalle'] };
  const autoMap = (headers, S1) => { const S0 = S1 || (U.imp && U.imp.kind === 'dep' ? DSYN : SYN); const m = {}; Object.keys(S0).forEach(f => { const i = headers.findIndex(hd => S0[f].includes(norm(hd))); m[f] = i >= 0 ? String(i) : ''; }); return m; };
  const TYPE_SYN = { 'bomba': 'Bomba', 'pump': 'Bomba', 'plc': 'PLC', 'controlador': 'PLC', 'hmi': 'HMI', 'switch': 'Switch OT', 'switch ot': 'Switch OT', 'ups': 'UPS', 'instrumento': 'Instrumento', 'instrument': 'Instrumento', 'transmisor': 'Instrumento', 'transmitter': 'Instrumento', 'medidor': 'Instrumento', 'computador de flujo': 'Computador de flujo', 'flow computer': 'Computador de flujo', 'variador': 'Variador', 'vfd': 'Variador', 'drive': 'Variador' };
  C.importPreview = function (a, rows, map, meta) {
    const get = (r, f) => map[f] === '' || map[f] == null ? '' : String(r[+map[f]] == null ? '' : r[+map[f]]).trim();
    const types = C.assetTypes(); const matchType = v => { const n = norm(v); if (!n) return ['Otro', null]; const t = types.find(x => norm(x) === n || norm(tx(x)) === n) || TYPE_SYN[n]; return t ? [t, null] : ['Otro', L(`Tipo «${v}» no reconocido: se registra como «Otro»`, `Type “${v}” not recognized: recorded as “Other”`)]; };
    const procIdx = a.processes.map(p => ({ k: p.key, n: [norm(p.name), norm(tx(p.name)), norm(p.key)] }));
    const matchProcs = v => { const out = [], bad = []; String(v).split(/[;|,]/).map(s => s.trim()).filter(Boolean).forEach(t => { const n = norm(t); let c = procIdx.filter(p => p.n.includes(n)); if (!c.length && n.length >= 4) c = procIdx.filter(p => p.n.some(x => x.startsWith(n))); if (c.length === 1) out.push(c[0].k); else bad.push(t + (c.length > 1 ? L(' (ambiguo)', ' (ambiguous)') : '')); }); return [[...new Set(out)], bad]; };
    const findArea = v => { const n = norm(v); return a.areas.find(x => norm(x.name) === n || norm(tx(x.name)) === n); };
    const findSys = v => { const n = norm(v); return a.systems.find(x => norm(x.name) === n || norm(tx(x.name)) === n); };
    const catArea = v => { const n = norm(v); return (a.catalog.areas || []).find(x => norm(x.name) === n || norm(tx(x.name)) === n); };
    const catSys = v => { const n = norm(v); return (a.catalog.systems || []).find(x => norm(x.name) === n || norm(tx(x.name)) === n); };
    const seen = {}; const newAreas = {}, newSys = {}; const out = [];
    rows.forEach((r, i) => {
      const rowNo = meta.headerRow + 2 + i; const msgs = []; const tag = get(r, 'tag').toUpperCase();
      if (!r.some(c => String(c).trim())) return; // filas vacías: no se reportan
      const o = { row: rowNo, tag, msgs, status: 'crear', data: {} };
      if (!tag) { o.status = 'error'; msgs.push(L('Falta TAG (obligatorio)', 'Missing TAG (required)')); out.push(o); return; }
      if (tag.length > 40) { o.status = 'error'; msgs.push(L('TAG de más de 40 caracteres', 'TAG longer than 40 characters')); out.push(o); return; }
      if (seen[norm(tag)]) { o.status = 'omitir'; msgs.push(L('Duplicado en el archivo (fila ', 'Duplicate in the file (row ') + seen[norm(tag)] + ')'); out.push(o); return; }
      seen[norm(tag)] = rowNo;
      const [procs, bad] = matchProcs(get(r, 'procs'));
      if (bad.length) { o.status = 'error'; msgs.push(L('Proceso no existe en este assessment: ', 'Process does not exist in this assessment: ') + bad.join(', ')); }
      const areaV = get(r, 'area'); let area = areaV ? findArea(areaV) : null; let areaKey = area ? area.id : null;
      if (!areaV) { o.status = 'error'; msgs.push(L('Falta Área (obligatoria)', 'Missing Area (required)')); }
      else if (!area) { const ca = catArea(areaV); const ap = procs.length ? procs : ca ? ca.procs.filter(k => a.processes.some(p => p.key === k)) : [];
        if (!ap.length) { o.status = 'error'; msgs.push(L(`Área «${areaV}» nueva: indique el proceso para crearla`, `New area “${areaV}”: give the process to create it`)); }
        else { areaKey = 'new:' + norm(areaV); newAreas[areaKey] = newAreas[areaKey] || { name: areaV, procs: ap, cat0: ca ? ca.id : null }; msgs.push(L(`Se creará el área «${areaV}»`, `Area “${areaV}” will be created`)); } }
      const aprocs = procs.length ? procs : area ? C.recProcs(area) : newAreas[areaKey] ? newAreas[areaKey].procs : [];
      aprocs.forEach(k => { const p = a.processes.find(x => x.key === k); if (p && p.status !== 'incluido') msgs.push(L(`Proceso «${tx(p.name)}» no está incluido en el alcance`, `Process “${tx(p.name)}” is not in scope`)); });
      const [type, tw] = matchType(get(r, 'type')); if (tw) msgs.push(tw);
      const sysV = get(r, 'sys'); let sysKey = null;
      if (sysV) { const s = findSys(sysV); if (s) sysKey = s.id; else { const cs = catSys(sysV); sysKey = 'new:' + norm(sysV); newSys[sysKey] = newSys[sysKey] || { name: sysV, procs: aprocs, cat: cs ? cs.cat : (D.ASSET_TYPE_CAT[type] || ''), cat0: cs ? cs.id : null }; msgs.push(L(`Se creará el sistema OT «${sysV}»`, `OT system “${sysV}” will be created`)); } }
      o.data = { tag, name: get(r, 'name') || tag, type, area: areaKey, procs: aprocs, sys: sysKey, mm: get(r, 'mm') };
      if (o.status === 'error') { out.push(o); return; }
      const ex = a.assets.find(x => norm(x.tag) === norm(tag));
      if (ex) {
        if (C.isOut(ex)) { o.status = 'omitir'; msgs.push(L('Existe y fue descartado: reábralo para actualizarlo', 'Exists and was discarded: reopen it to update')); }
        else { const diff = []; const d = o.data;
          if (get(r, 'name') && d.name !== ex.name && d.name !== tx(ex.name)) diff.push(L('descripción', 'description'));
          if (get(r, 'type') && d.type !== ex.type) diff.push(L('tipo', 'type'));
          if (d.area !== ex.area) diff.push(L('área', 'area'));
          if (get(r, 'procs') && d.procs.slice().sort().join() !== C.recProcs(ex).slice().sort().join()) diff.push(L('procesos', 'processes'));
          if (sysV && d.sys !== ex.sys) diff.push(L('sistema', 'system'));
          if (get(r, 'mm') && d.mm !== (ex.mm || '')) diff.push(L('fabricante/modelo', 'manufacturer/model'));
          o.target = ex.id;
          if (diff.length) { o.status = 'actualizar'; msgs.push(L('Cambia: ', 'Changes: ') + diff.join(', ') + (ex.val && ex.val.status === 'validado' ? L(' · requerirá revalidación', ' · will need revalidation') : '')); }
          else { o.status = 'omitir'; msgs.push(L('Sin cambios respecto al registro existente', 'No changes from the existing record')); } }
      }
      out.push(o);
    });
    const counts = { crear: 0, actualizar: 0, omitir: 0, error: 0 }; out.forEach(o => counts[o.status]++);
    return { rows: out, counts, newAreas, newSys };
  };
  C.importCommit = function (a, pv, meta) {
    const ts = new Date().toISOString(), by = C.S.userId, impId = C.uid('IMP'); const idMap = {};
    const src = row => ({ file: meta.file, sheet: meta.sheet, row, by, ts, importId: impId });
    const used = new Set(pv.rows.filter(r => r.status === 'crear' || r.status === 'actualizar').flatMap(r => [r.data.area, r.data.sys]));
    Object.entries(pv.newAreas).forEach(([k, v]) => { if (!used.has(k)) return; const id = C.uid('A'); idMap[k] = id; a.areas.push({ id, name: v.name, proc: v.procs[0], procs: v.procs, cat0: v.cat0, prov: 'excel', val: { status: 'sugerido', by: '', ts }, src: src(pv.rows.find(r => r.data && r.data.area === k).row), log: [] }); });
    Object.entries(pv.newSys).forEach(([k, v]) => { if (!used.has(k)) return; const id = C.uid('SY'); idMap[k] = id; a.systems.push({ id, name: v.name, cat: v.cat, procs: v.procs, proc: v.procs[0], cat0: v.cat0, prov: 'excel', val: { status: 'sugerido', by: '', ts }, src: src(pv.rows.find(r => r.data && r.data.sys === k).row), log: [] }); });
    const res = (v) => v && idMap[v] ? idMap[v] : v;
    pv.rows.forEach(r => {
      if (r.status === 'crear') { const d = r.data; const x = { id: C.uid('AS'), tag: d.tag, name: d.name, type: d.type, area: res(d.area), proc: d.procs[0], procs: d.procs, sys: res(d.sys), mm: d.mm, ver: '', prov: 'excel', val: { status: 'sugerido', by: '', ts }, src: src(r.row), srcs: [], log: [] }; C.recLog(x, 'Importado desde ' + meta.file, 'Imported from ' + meta.file); a.assets.push(x); r.id = x.id; }
      else if (r.status === 'actualizar') { const x = C.asset(a, r.target); const d = r.data; const wasVal = x.val && x.val.status === 'validado';
        (x.srcs = x.srcs || []).unshift(x.src || { file: L('registro previo', 'previous record'), row: '—' }); x.src = src(r.row);
        x.name = d.name; x.type = d.type; x.area = res(d.area); x.procs = d.procs.length ? d.procs : C.recProcs(x); x.proc = x.procs[0]; if (d.sys) x.sys = res(d.sys); if (d.mm) x.mm = d.mm;
        C.recLog(x, 'Actualizado por importación (' + meta.file + ', fila ' + r.row + ')', 'Updated by import (' + meta.file + ', row ' + r.row + ')');
        if (wasVal) { x.val = { status: 'sugerido', by: '', ts, reason: 'Actualizado por importación; requiere revalidación' }; } r.id = x.id; }
    });
    const rec = { id: impId, file: meta.file, sheet: meta.sheet, ts, by, map: meta.map, headers: meta.headers, counts: pv.counts, rows: pv.rows.map(r => ({ row: r.row, tag: r.tag, status: r.status, msgs: r.msgs, raw: r.raw })) };
    a.imports.unshift(rec);
    C.log(a, `Importó ${meta.file}: ${pv.counts.crear} creados, ${pv.counts.actualizar} actualizados, ${pv.counts.omitir} omitidos, ${pv.counts.error} erróneos`, `Imported ${meta.file}: ${pv.counts.crear} created, ${pv.counts.actualizar} updated, ${pv.counts.omitir} skipped, ${pv.counts.error} errors`);
    return rec;
  };
  const DEP_SYN = { control: 'Control', red: 'Comunicación', 'red ot': 'Comunicación', comunicacion: 'Comunicación', 'red / comunicacion': 'Comunicación', network: 'Comunicación', communication: 'Comunicación', energia: 'Energía', power: 'Energía', electrica: 'Energía', software: 'Software / datos', datos: 'Software / datos', 'software / datos': 'Software / datos', data: 'Software / datos', 'servicio auxiliar': 'Servicio auxiliar', auxiliar: 'Servicio auxiliar', auxiliary: 'Servicio auxiliar', 'aire de instrumentos': 'Servicio auxiliar', senal: 'Señal / medición', medicion: 'Señal / medición', 'senal / medicion': 'Señal / medición', signal: 'Señal / medición', proceso: 'Proceso', operacional: 'Proceso', 'operacional / proceso': 'Proceso', process: 'Proceso' };
  C.importDepPreview = function (a, rows, map, meta) {
    const get = (r, f) => map[f] === '' || map[f] == null ? '' : String(r[+map[f]] == null ? '' : r[+map[f]]).trim();
    const node = v => { const n = norm(v); const x = a.assets.find(y => !C.isOut(y) && norm(y.tag) === n); if (x) return x.id; const s = a.systems.find(y => !C.isOut(y) && (norm(y.name) === n || norm(tx(y.name)) === n)); if (s) return s.id; return (meta.virtual && meta.virtual[n]) || null; };
    const seen = {}; const out = [];
    rows.forEach((r, i) => {
      if (!r.some(c => String(c).trim())) return;
      const rowNo = meta.headerRow + 2 + i; const msgs = []; const fv = get(r, 'from'), tv = get(r, 'to');
      const o = { row: rowNo, tag: (fv || '∅') + ' → ' + (tv || '∅'), msgs, status: 'crear', data: {} };
      if (!fv || !tv) { o.status = 'error'; msgs.push(L('Faltan los dos extremos (obligatorios)', 'Both ends are required')); out.push(o); return; }
      const from = node(fv), to = node(tv);
      if (!from) msgs.push(L(`«${fv}» no existe como activo o sistema OT: impórtelo o agréguelo primero`, `“${fv}” does not exist as an asset or OT system: import or add it first`));
      if (!to) msgs.push(L(`«${tv}» no existe como activo o sistema OT: impórtelo o agréguelo primero`, `“${tv}” does not exist as an asset or OT system: import or add it first`));
      if (!from || !to) { o.status = 'error'; out.push(o); return; }
      if (from === to) { o.status = 'error'; msgs.push(L('Un elemento no puede depender de sí mismo', 'An element cannot depend on itself')); out.push(o); return; }
      const tv0 = get(r, 'type'); let type = tv0 ? (D.DEP_TYPES.find(t => norm(t) === norm(tv0) || norm(C.depName(t)) === norm(tv0)) || DEP_SYN[norm(tv0)]) : 'Control';
      if (!type) { o.status = 'error'; msgs.push(L(`Tipo «${tv0}» no reconocido`, `Type “${tv0}” not recognized`)); out.push(o); return; }
      if (!tv0) msgs.push(L('Sin tipo: se registra como «Control»', 'No type: recorded as “Control”'));
      const dir = /bi|↔|doble|two|ambas/.test(norm(get(r, 'dir'))) ? 'bi' : 'uni';
      const cv = norm(get(r, 'crit')); const crit = { alta: 'Alta', high: 'Alta', media: 'Media', medium: 'Media', baja: 'Baja', low: 'Baja' }[cv] || '';
      if (cv && !crit) msgs.push(L(`Criticidad «${get(r, 'crit')}» no reconocida: se deja vacía`, `Criticality “${get(r, 'crit')}” not recognized: left empty`));
      const k = from + '|' + to + '|' + type; if (seen[k]) { o.status = 'omitir'; msgs.push(L('Duplicada en el archivo (fila ', 'Duplicate in the file (row ') + seen[k] + ')'); out.push(o); return; } seen[k] = rowNo;
      o.data = { from, to, type, dir, crit, note: get(r, 'note') };
      const ex = a.deps.find(d => d.from === from && d.to === to && d.type === type);
      if (ex) { o.target = ex.id;
        if (C.isOut(ex)) { o.status = 'omitir'; msgs.push(L('Existe y fue descartada: reábrala para actualizarla', 'Exists and was discarded: reopen it to update')); }
        else { const diff = []; if (dir !== (ex.dir || 'uni')) diff.push(L('dirección', 'direction')); if (crit && crit !== (ex.crit || '')) diff.push(L('criticidad', 'criticality')); if (o.data.note && o.data.note !== ex.note && o.data.note !== tx(ex.note)) diff.push(L('descripción', 'description'));
          if (diff.length) { o.status = 'actualizar'; msgs.push(L('Cambia: ', 'Changes: ') + diff.join(', ') + (ex.val && ex.val.status === 'validado' ? L(' · requerirá revalidación', ' · will need revalidation') : '')); } else { o.status = 'omitir'; msgs.push(L('Sin cambios respecto a la dependencia existente', 'No changes from the existing dependency')); } } }
      out.push(o);
    });
    const counts = { crear: 0, actualizar: 0, omitir: 0, error: 0 }; out.forEach(o => counts[o.status]++);
    return { rows: out, counts, newAreas: {}, newSys: {}, kind: 'dep' };
  };
  C.importDepCommit = function (a, pv, meta) {
    const ts = new Date().toISOString(), by = C.S.userId, impId = C.uid('IMP'); const src = row => ({ file: meta.file, sheet: meta.sheet, row, by, ts, importId: impId });
    const rv = v => { if (!v || !String(v).startsWith('new:')) return v; const t = norm(v.slice(4)); const x = a.assets.find(y => norm(y.tag) === t); return x ? x.id : v; };
    pv.rows.forEach(r => { const d = r.data; if (d) { d.from = rv(d.from); d.to = rv(d.to); }
      if (r.status === 'crear') { const x = { id: C.uid('D'), from: d.from, to: d.to, type: d.type, dir: d.dir, crit: d.crit, note: d.note, prov: 'excel', val: { status: 'sugerido', by: '', ts }, src: src(r.row), srcs: [], log: [] }; C.recLog(x, 'Importada desde ' + meta.file, 'Imported from ' + meta.file); a.deps.push(x); r.id = x.id; }
      else if (r.status === 'actualizar') { const x = a.deps.find(y => y.id === r.target); const wasVal = x.val && x.val.status === 'validado'; (x.srcs = x.srcs || []).unshift(x.src || { file: L('registro previo', 'previous record'), row: '—' }); x.src = src(r.row); x.dir = d.dir; if (d.crit) x.crit = d.crit; if (d.note) x.note = d.note; C.recLog(x, 'Actualizada por importación (' + meta.file + ', fila ' + r.row + ')', 'Updated by import (' + meta.file + ', row ' + r.row + ')'); if (wasVal) x.val = { status: 'sugerido', by: '', ts, reason: 'Actualizado por importación; requiere revalidación' }; r.id = x.id; } });
    const rec = { id: impId, kind: 'dep', file: meta.file, sheet: meta.sheet, ts, by, map: meta.map, headers: meta.headers, counts: pv.counts, rows: pv.rows.map(r => ({ row: r.row, tag: r.tag, status: r.status, msgs: r.msgs, raw: r.raw })) };
    a.imports.unshift(rec);
    C.log(a, `Importó dependencias de ${meta.file}: ${pv.counts.crear} creadas, ${pv.counts.actualizar} actualizadas, ${pv.counts.omitir} omitidas, ${pv.counts.error} erróneas`, `Imported dependencies from ${meta.file}: ${pv.counts.crear} created, ${pv.counts.actualizar} updated, ${pv.counts.omitir} skipped, ${pv.counts.error} errors`);
    return rec;
  };
  B0();
  function B0() { ['Actualizado por importación; requiere revalidación'].forEach(s => I.B(s, 'Updated by import; needs revalidation')); }

  // ---------- modal de importación (5 pasos) ----------
  U.impModal = function (a) {
    const s = U.imp || (U.imp = { step: 1 });
    const steps = [L('Archivo', 'File'), L('Hoja', 'Sheet'), L('Columnas', 'Columns'), L('Validación', 'Validation'), L('Resultado', 'Result')];
    const head = `<ol class="nsteps">${steps.map((t, i) => `<li class="${s.step === i + 1 ? 'on' : s.step > i + 1 ? 'done' : ''}"><i>${s.step > i + 1 ? '✓' : i + 1}</i>${t}</li>`).join('')}</ol>`;
    let body = '', foot = '';
    if (s.step === 1) {
      body = `<div class="field"><span class="lbl">${L('Qué va a importar', 'What you are importing')}</span><div class="seg" role="group">${[['both', L('Activos y dependencias', 'Assets and dependencies')], ['asset', L('Solo activos', 'Assets only')], ['dep', L('Solo dependencias', 'Dependencies only')]].map(([k, l]) => `<button data-act="imp-kind" data-k="${k}" aria-pressed="${(s.kind || 'both') === k}">${l}</button>`).join('')}</div>${(s.kind || 'both') === 'both' ? `<span class="hint">${L('Un solo archivo: elija la hoja de activos y la de dependencias. Se importan primero los activos, así las dependencias pueden apuntar a activos del mismo archivo.', 'One file: choose the assets sheet and the dependencies sheet. Assets are imported first, so dependencies can point to assets in the same file.')}</span>` : ''}${s.kind === 'dep' ? `<span class="hint">${L('Cada fila: elemento que depende, del que depende (TAG de activo o nombre de sistema OT ya registrados), tipo, dirección y criticidad.', 'Each row: dependent element, what it depends on (asset TAG or OT system name already recorded), type, direction and criticality.')}</span>` : ''}</div><div class="drop">${ic('list')}<b>${L('Seleccione un inventario en Excel o CSV', 'Choose an Excel or CSV inventory')}</b><span class="small mut">${L('Formatos: .xlsx, .xls y .csv (delimitador «;», «,» o tabulador). Máximo 5 MB y 3.000 filas en este prototipo. El archivo se lee en su navegador; no se envía a ningún servidor ni se guarda: solo se conservan los registros incorporados y su trazabilidad.', 'Formats: .xlsx, .xls and .csv (“;”, “,” or tab delimiter). Up to 5 MB and 3,000 rows in this prototype. The file is read in your browser; it is not sent to any server or stored: only incorporated records and their traceability are kept.')}</span>
        <div class="row"><label class="btn primary sm" for="imp-file">${ic('down', 'sm')}${L('Elegir archivo', 'Choose file')}</label><input class="sr" type="file" id="imp-file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" data-impfile="1"><button class="btn ghost sm" data-act="imp-sample">${L('Usar archivo de ejemplo (DEMO)', 'Use sample file (DEMO)')}</button></div>${s.busy ? `<span class="small">${L('Leyendo…', 'Reading…')}</span>` : ''}${s.err ? `<span class="small" style="color:var(--err-ink)">${h(s.err)}</span>` : ''}</div>`;
    } else if (s.step === 2) {
      const rows = s.file.sheets[s.sheet] || []; const hr = s.headerRow; const prev = rows.slice(hr, hr + 6);
      body = `<p class="small"><b>${h(s.file.name)}</b> · ${s.file.names.length} ${L('hoja(s)', 'sheet(s)')}${s.file.note ? ' · ' + h(s.file.note) : ''}</p>
        <div class="grid2"><div class="field"><label for="imp-sheet">${L('Hoja', 'Sheet')}</label><select id="imp-sheet" data-imp="sheet">${s.file.names.map(n => U.opt(n, n + ' · ' + (s.file.sheets[n] || []).length + L(' filas', ' rows'), s.sheet)).join('')}</select></div><div class="field"><label for="imp-hr">${L('Fila de encabezados', 'Header row')}</label><input id="imp-hr" type="number" min="1" max="50" value="${hr + 1}" data-imp="hr"></div></div>
        ${s.kind === 'both' ? `<div class="grid2"><div class="field"><label for="imp-sheet2">${L('Hoja de dependencias', 'Dependencies sheet')}</label><select id="imp-sheet2" data-imp="sheet2">${U.opt('', L('— Ninguna —', '— None —'), s.sheet2 || '')}${s.file.names.map(n => U.opt(n, n + ' · ' + (s.file.sheets[n] || []).length + L(' filas', ' rows'), s.sheet2 || '')).join('')}</select></div></div>` : ''}
        <div class="scroll-x imp-t"><table><tbody>${prev.map((r, i) => `<tr class="${i === 0 ? 'hdr' : ''}">${r.slice(0, 10).map(c => `<td>${h(String(c).slice(0, 40))}</td>`).join('')}</tr>`).join('') || `<tr><td>${L('Hoja vacía', 'Empty sheet')}</td></tr>`}</tbody></table></div>
        <p class="hint">${L('La primera fila resaltada se usará como encabezados.', 'The highlighted first row will be used as headers.')}</p>`;
      foot = `<button class="btn ghost" data-act="imp-step" data-s="1">${L('Atrás', 'Back')}</button><button class="btn primary" data-act="imp-step" data-s="3" ${prev.length > 1 ? '' : 'disabled'}>${L('Continuar', 'Continue')}</button>`;
    } else if (s.step === 3) {
      const mapRows = (F, M, hd, first, attr) => `<div class="maprows">${F.map(([f, l, req]) => `<div class="maprow"><label for="imp-${attr}-${f}"><b>${l}</b>${req ? ' <span class="req">*</span>' : ''}</label><select id="imp-${attr}-${f}" data-${attr}="${f}">${U.opt('', L('— No importar —', '— Do not import —'), M[f])}${hd.map((x, i) => U.opt(String(i), x || L('(columna ', '(column ') + (i + 1) + ')', M[f])).join('')}</select><span class="small mut">${M[f] !== '' ? L('Ej.: ', 'E.g.: ') + h(String(first[+M[f]] || '—').slice(0, 40)) : ''}</span></div>`).join('')}</div>`;
      const both = s.kind === 'both' && s.sheet2;
      body = `<p class="small mut">${L('Relacione las columnas del archivo con los campos del inventario. Detectamos automáticamente las que coinciden por nombre.', 'Match file columns to inventory fields. Matching names were detected automatically.')}</p>
        ${both ? `<div class="sec-title">${L('Activos', 'Assets')} · ${h(s.sheet)}</div>` : ''}${mapRows(s.kind === 'dep' ? DFIELDS() : AFIELDS(), s.map, s.headers, s.data[0] || [], 'impmap')}
        ${s.kind !== 'dep' ? `<p class="hint">${L('Proceso(s) acepta varios valores separados por «;». Si falta, se usa el proceso del área.', 'Process(es) accepts several values separated by “;”. If missing, the area’s process is used.')}</p>` : ''}
        ${both ? `<div class="sec-title">${L('Dependencias', 'Dependencies')} · ${h(s.sheet2)}</div>${mapRows(DFIELDS(), s.map2, s.headers2, s.data2[0] || [], 'impmap2')}` : ''}`;
      const okA = s.kind === 'dep' ? s.map.from !== '' && s.map.to !== '' : s.map.tag !== '' && s.map.area !== ''; const okD = !both || (s.map2.from !== '' && s.map2.to !== '');
      foot = `<button class="btn ghost" data-act="imp-step" data-s="2">${L('Atrás', 'Back')}</button><button class="btn primary" data-act="imp-step" data-s="4" ${okA && okD ? '' : 'disabled'}>${L('Validar filas', 'Validate rows')}</button>`;
    } else if (s.step === 4) {
      const pv = s.pv; const c = pv.counts; const na = Object.keys(pv.newAreas || {}).length, ns = Object.keys(pv.newSys || {}).length;
      body = `<div class="mat-sum">${[['crear', 'ok', L('Crear', 'Create')], ['actualizar', 'pri', L('Actualizar', 'Update')], ['omitir', '', L('Omitir', 'Skip')], ['error', 'err', L('Erróneos', 'Errors')]].map(([k, cl, l]) => `<div class="ms"><b>${c[k]}</b><span class="pill ${cl}">${l}</span></div>`).join('')}</div>
        ${na || ns ? `<p class="small">${L('También se crearán', 'Will also create')}: ${na} ${L('área(s)', 'area(s)')} ${L('y', 'and')} ${ns} ${L('sistema(s) OT', 'OT system(s)')}, ${L('como «Propuesto».', 'as “Suggested”.')}</p>` : ''}
        <div class="note-info">${ic('info')}<span>${L('Los registros importados entran como «Propuesto · Excel». No cuentan para el análisis hasta que una persona los acepte. Las filas con error u omitidas no se incorporan.', 'Imported records enter as “Suggested · Excel”. They are not validated until a person confirms them. Error and skipped rows are not incorporated.')}</span></div>${U.impTable(pv.rows)}`;
      const sum = c0 => `<div class="mat-sum">${[['crear', 'ok', L('Crear', 'Create')], ['actualizar', 'pri', L('Actualizar', 'Update')], ['omitir', '', L('Omitir', 'Skip')], ['error', 'err', L('Erróneos', 'Errors')]].map(([k, cl, l]) => `<div class="ms"><b>${c0[k]}</b><span class="pill ${cl}">${l}</span></div>`).join('')}</div>`;
      if (s.pv2) body = `<div class="sec-title">${L('Activos', 'Assets')}</div>` + body + `<div class="sec-title">${L('Dependencias', 'Dependencies')}</div>${sum(s.pv2.counts)}${U.impTable(s.pv2.rows)}`;
      const nIn = c.crear + c.actualizar + (s.pv2 ? s.pv2.counts.crear + s.pv2.counts.actualizar : 0);
      foot = `<button class="btn ghost" data-act="imp-step" data-s="3">${L('Atrás', 'Back')}</button><button class="btn primary" data-act="imp-commit" ${nIn ? '' : 'disabled'}>${L('Incorporar ', 'Incorporate ')}${nIn} ${L('registros', 'records')}</button>`;
    } else {
      const r = s.rec; const c = r.counts;
      body = `<div class="pdf-result">${ic('check')}<span><b>${L('Importación aplicada', 'Import applied')}:</b> ${c.crear} ${L('creados', 'created')}, ${c.actualizar} ${L('actualizados', 'updated')}, ${c.omitir} ${L('omitidos', 'skipped')}, ${c.error} ${L('erróneos', 'errors')}.</span></div>
        ${s.rec2 ? `<div class="pdf-result">${ic('check')}<span><b>${L('Dependencias', 'Dependencies')}:</b> ${s.rec2.counts.crear} ${L('creadas', 'created')}, ${s.rec2.counts.actualizar} ${L('actualizadas', 'updated')}, ${s.rec2.counts.omitir} ${L('omitidas', 'skipped')}, ${s.rec2.counts.error} ${L('erróneas', 'errors')}.</span></div>` : ''}
        <p class="small">${L('Cada registro conserva archivo, hoja, fila, autor y fecha. Revíselos en Inventario OT y valídelos o descártelos.', 'Each record keeps file, sheet, row, author and date. Review them in OT inventory and validate or discard them.')}</p>${U.impTable(r.rows.filter(x => x.status === 'error' || x.status === 'omitir').concat(s.rec2 ? s.rec2.rows.filter(x => x.status === 'error' || x.status === 'omitir') : []))}`;
      foot = `${s.rec2 ? `<button class="btn ghost" data-act="iv-rej-dl" data-id="${s.rec2.id}">${ic('down', 'sm')}${L('Dependencias rechazadas', 'Rejected dependencies')}</button>` : ''}<button class="btn ghost" data-act="iv-rej-dl" data-id="${r.id}">${ic('down', 'sm')}${L('Descargar rechazadas (CSV)', 'Download rejected (CSV)')}</button><button class="btn primary" data-act="imp-done">${L('Revisar en inventario', 'Review in inventory')}</button>`;
    }
    return { title: L('Importar inventario', 'Import inventory'), wide: true, body: head + body, foot: foot || `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button>` };
  };
  const toStep2 = file => { const s = U.imp; s.file = file; s.sheet = file.names[0]; s.sheet2 = s.kind === 'both' ? (file.names.find(n => /depend/i.test(n)) || '') : ''; s.headerRow = detectHeader(file.sheets[s.sheet]); s.step = 2; s.busy = false; s.err = ''; U.renderModal(); };
  const prepMap = () => { const s = U.imp; const rows = s.file.sheets[s.sheet] || []; s.headers = (rows[s.headerRow] || []).map(x => String(x).trim()); s.data = rows.slice(s.headerRow + 1).slice(0, LIM.rows); s.truncated = rows.length - s.headerRow - 1 > LIM.rows; s.map = autoMap(s.headers, s.kind === 'dep' ? DSYN : SYN); s.pv2 = null; s.rec2 = null; if (s.kind === 'both' && s.sheet2) { const r2 = s.file.sheets[s.sheet2] || []; s.headerRow2 = detectHeader(r2); s.headers2 = (r2[s.headerRow2] || []).map(x => String(x).trim()); s.data2 = r2.slice(s.headerRow2 + 1).slice(0, LIM.rows); s.map2 = autoMap(s.headers2, DSYN); } };
  A['iv-import'] = () => { U.imp = { step: 1, kind: 'both' }; U.openModal('imp', {}); };
  U.onImpFile = async input => { const f = input.files && input.files[0]; if (!f) return; const s = U.imp; s.busy = true; s.err = ''; U.renderModal(); try { toStep2(await U.readFile(f)); } catch (e) { s.busy = false; s.err = e.message || String(e); U.renderModal(); } };
  A['imp-step'] = el => {
    const s = U.imp; const n = +el.dataset.s;
    if (n === 3 && s.step === 2) prepMap();
    if (n === 4) { const a = C.cur(); s.pv = (s.kind === 'dep' ? C.importDepPreview : C.importPreview)(a, s.data, s.map, { headerRow: s.headerRow }); s.pv2 = null; if (s.kind === 'both' && s.sheet2) { const virtual = {}; s.pv.rows.filter(r => r.status === 'crear').forEach(r => { virtual[norm(r.tag)] = 'new:' + r.tag; }); s.pv2 = C.importDepPreview(a, s.data2, s.map2, { headerRow: s.headerRow2, virtual }); } if (s.truncated) s.pv.rows.push({ row: '>' + (LIM.rows + s.headerRow + 1), tag: '', status: 'omitir', msgs: [L('Filas por encima del límite de 3.000 no se procesan', 'Rows above the 3,000 limit are not processed')], data: {} }) && s.pv.counts.omitir++; }
    s.step = n; U.renderModal();
  };
  A['imp-commit'] = () => { const a = C.cur(); const s = U.imp; s.pv.rows.forEach(r => { r.raw = s.data[r.row - s.headerRow - 2]; }); s.rec = (s.kind === 'dep' ? C.importDepCommit : C.importCommit)(a, s.pv, { file: s.file.name, sheet: s.sheet, map: s.map, headers: s.headers }); if (s.pv2) { s.pv2.rows.forEach(r => { r.raw = s.data2[r.row - s.headerRow2 - 2]; }); s.rec2 = C.importDepCommit(a, s.pv2, { file: s.file.name, sheet: s.sheet2, map: s.map2, headers: s.headers2 }); } s.step = 5; C.save(); U.renderModal(); R(); };
  A['imp-done'] = () => { const k = U.imp.kind === 'dep' ? 'dep' : 'asset'; U.closeModal(); C.S.ui.view = 'inventory'; C.S.ui.inv = { tab: k, prov: 'excel' }; R(); };
  A['imp-kind'] = el => { U.imp.kind = el.dataset.k; U.renderModal(); };

  // ---------- archivo de ejemplo y descargas ----------
  U.sampleRows = () => [
    ['TAG', 'Descripción', 'Tipo', 'Área', 'Proceso', 'Sistema OT', 'Fabricante / modelo'],
    ['P-101A', 'Bomba principal A', 'Bomba', 'Casa de bombas', 'Bombeo de crudo', 'Unidades de bombeo', 'Fabricante X · 250 HP'],
    ['FT-202', 'Medidor fiscal de respaldo', 'Instrumento', 'Skid de medición fiscal', 'Medición fiscal', 'Sistema de medición fiscal', 'Coriolis 6"'],
    ['PT-101', 'Transmisor de presión de descarga', 'Transmisor', 'Casa de bombas', 'Bombeo de crudo', '', ''],
    ['VFD-101A', 'Variador de P-101A', 'Variador', 'Casa de bombas', 'Bombeo de crudo', 'Unidades de bombeo', ''],
    ['SW-OT-02', 'Switch OT secundario', 'Switch', 'Cuarto de control', 'Bombeo de crudo; Medición fiscal', 'Red OT de la estación', ''],
    ['PT-101', 'Transmisor de presión (duplicado)', 'Transmisor', 'Casa de bombas', 'Bombeo de crudo', '', ''],
    ['', 'Equipo sin TAG', 'Otro', 'Casa de bombas', 'Bombeo de crudo', '', ''],
    ['XV-301', 'Válvula de salida de tanque', 'Otro', 'Patio de tanques', 'Almacenamiento en tanques', '', ''],
    ['GEN-01', 'Generador de emergencia', 'Otro', 'Subestación', 'Generación eléctrica', '', ''],
    ['TT-205', 'Sensor de temperatura del skid', 'Sensor', 'Skid de medición fiscal', 'Medición fiscal', '', ''],
    ['PLC-01', 'PLC de control de bombeo', 'PLC', 'Cuarto de control', 'Bombeo de crudo', 'Sistema de control de bombeo', '']
  ];
  U.sampleDeps = () => [
    ['Elemento', 'Depende de', 'Tipo', 'Dirección', 'Criticidad', 'Descripción'],
    ['FC-201', 'SW-OT-01', 'Red', 'Unidireccional', 'Alta', 'Envío de datos fiscales al SCADA'],
    ['HMI-01', 'PLC-01', 'Software / datos', 'Bidireccional', 'Media', 'Supervisión y comandos'],
    ['VFD-101A', 'PLC-01', 'Control', '', 'Alta', 'Mando de arranque y velocidad'],
    ['P-101A', 'VFD-101A', 'Energía', '', 'Alta', 'Alimentación del motor'],
    ['FT-202', 'SW-OT-02', 'Red', '', 'Media', 'Datos del medidor de respaldo'],
    ['FC-201', 'SW-OT-01', 'Red', '', 'Alta', 'Fila duplicada'],
    ['XX-999', 'PLC-01', 'Control', '', '', 'Equipo que no existe'],
    ['PLC-01', 'PLC-01', 'Control', '', '', 'Se referencia a sí mismo'],
    ['FT-201', 'FC-201', 'Telepatía', '', '', 'Tipo no reconocido']
  ];
  const csvOf = rows => '﻿' + rows.map(r => r.map(c => { const v = String(c == null ? '' : c); return /[";\n,]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';')).join('\r\n');
  A['imp-sample'] = async () => {
    const s = U.imp; s.busy = true; U.renderModal();
    try { const X = await loadXLSX(); const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([['DEMO · inventario ficticio para probar la importación'], ['Incluye filas válidas, duplicadas y con errores.']]), 'Leeme'); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(U.sampleRows()), 'Inventario OT'); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(U.sampleDeps()), 'Dependencias');
      const buf = X.write(wb, { type: 'array', bookType: 'xlsx' }); const file = new File([buf], 'inventario-ejemplo-DEMO.xlsx'); const r = await U.readFile(file); toStep2(r); s.sheet = s.kind === 'dep' ? 'Dependencias' : 'Inventario OT'; s.sheet2 = s.kind === 'both' ? 'Dependencias' : ''; s.headerRow = 0; U.renderModal();
    } catch (e) { const file = new File([csvOf(s.kind === 'dep' ? U.sampleDeps() : U.sampleRows())], 'inventario-ejemplo-DEMO.csv', { type: 'text/csv' }); toStep2(await U.readFile(file)); }
  };
  U.save = async (name, data) => { let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) {} if (!dl) { try { const blob = data instanceof Blob ? data : new Blob([data]); const url = URL.createObjectURL(blob); const lk = document.createElement('a'); lk.href = url; lk.download = name; document.body.appendChild(lk); lk.click(); setTimeout(() => { URL.revokeObjectURL(url); lk.remove(); }, 1500); } catch (e) { U.toast(L('No se pudo descargar el archivo', 'Could not download the file')); } return; } try { await dl.save({ filename: name, data }); } catch (e) { U.toast(e && e.code === 'declined' ? L('Descarga cancelada', 'Download cancelled') : L('La descarga no se completó', 'The download did not complete')); } };
  A['iv-sample'] = async () => { try { const X = await loadXLSX(); const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(U.sampleRows()), 'Inventario OT'); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(U.sampleDeps()), 'Dependencias'); await U.save('inventario-ejemplo-DEMO.xlsx', new Blob([X.write(wb, { type: 'array', bookType: 'xlsx' })])); } catch (e) { await U.save('inventario-ejemplo-DEMO.csv', csvOf(U.sampleRows())); } };
  A['iv-rej-dl'] = el => { const a = C.cur(); const im = a.imports.find(x => x.id === el.dataset.id); const rows = [[L('Fila', 'Row'), 'TAG', L('Resultado', 'Result'), L('Detalle', 'Detail'), ...im.headers]].concat(im.rows.filter(r => r.status === 'error' || r.status === 'omitir').map(r => [r.row, r.tag, r.status, r.msgs.join(' | '), ...(r.raw || [])])); U.save('rechazadas-' + im.file.replace(/\.[^.]+$/, '') + '.csv', csvOf(rows)); };

  // ---------- catálogo industrial (Biblioteca) ----------
  const KINDS = () => [['processes', L('Procesos', 'Processes'), 'PR'], ['areas', L('Áreas típicas', 'Typical areas'), 'AR'], ['systems', L('Sistemas OT', 'OT systems'), 'SY'], ['deps', L('Dependencias sugeridas', 'Suggested dependencies'), 'DP'], ['controls', L('Controles sugeridos', 'Suggested controls'), 'CT']];
  const tplOf = ind => C.S.lib.templates[ind];
  const itemName = (t, kind, x) => kind === 'deps' ? `${tx((t.systems.find(s => s.id === x.from) || {}).name || x.from)} → ${tx((t.systems.find(s => s.id === x.to) || {}).name || x.to)}` : tx(x.name);
  U.catalogTab = function () {
    const ind = C.S.ui.cind2 || 'oilgas'; const t = tplOf(ind); const sec = C.S.ui.csec || 'systems';
    const inUse = C.S.assessments.filter(a => a.cfg.industry === ind).map(a => `${a.code} v${(a.catalog || {}).version || a.templateVersion}${a.reportStatus === 'Aprobado' ? L(' (cerrado)', ' (closed)') : ''}`);
    const all = t[sec] || []; const F = (C.S.ui.catf = C.S.ui.catf || {})[ind] || {}; const M = k2 => [].concat(F[k2] || []).filter(Boolean);
    const norm = v => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const sysOfProc = k2 => t.systems.filter(z => (z.procs || []).includes(k2));
    const list = all.filter(x => { const pk2 = x.key; const procs = sec === 'processes' ? [pk2] : sec === 'deps' ? [...new Set([x.from, x.to].flatMap(sid => ((t.systems.find(z => z.id === sid) || {}).procs || [])))] : (x.procs || []);
      if (F.q && !norm([x.id, x.key, tx(x.name), tx(x.desc || ''), tx(x.obs || ''), sec === 'deps' ? itemName(t, 'deps', x) : ''].join(' ')).includes(norm(F.q))) return false;
      if (F.st && (F.st === 'on') !== (x.active !== false)) return false;
      if (M('proc').length && !M('proc').some(v => procs.includes(v))) return false;
      if (M('area').length) { const ap = M('area').flatMap(aid => ((t.areas.find(z => z.id === aid) || {}).procs || [])); if (sec === 'areas' ? !M('area').includes(x.id) : !procs.some(p2 => ap.includes(p2))) return false; }
      if (M('sys').length) { const S2 = M('sys'); const sp = S2.flatMap(sid => ((t.systems.find(z => z.id === sid) || {}).procs || [])); if (sec === 'systems' ? !S2.includes(x.id) : sec === 'deps' ? !S2.includes(x.from) && !S2.includes(x.to) : !procs.some(p2 => sp.includes(p2))) return false; }
      if (M('cat').length) { const cats = sec === 'systems' ? [x.cat] : sec === 'deps' ? [x.from, x.to].map(sid => (t.systems.find(z => z.id === sid) || {}).cat) : procs.flatMap(p2 => sysOfProc(p2).map(z => z.cat)); if (!M('cat').some(v => cats.includes(v))) return false; }
      if (M('type').length) { const types = sec === 'systems' ? x.types || [] : sec === 'deps' ? [x.from, x.to].flatMap(sid => (t.systems.find(z => z.id === sid) || {}).types || []) : procs.flatMap(p2 => sysOfProc(p2).flatMap(z => z.types || [])); if (!M('type').some(v => types.includes(v))) return false; }
      return true; });
    const fsel = (k2, lbl, opts) => { if (k2 === 'st') return `<div class="field"><label for="cf-${k2}">${lbl}</label><select id="cf-${k2}" data-catf="${k2}">${U.opt('', L('Todos', 'All'), F[k2] || '')}${opts.map(o => U.opt(o[0], o[1], F[k2] || '')).join('')}</select></div>`;
      const on = M(k2); return `<div class="field"><label for="cf-${k2}">${lbl}${on.length ? ` <span class="cat-fk">${on.length}</span>` : ''}</label><select id="cf-${k2}" data-catf="${k2}" data-multi="1"><option value="">${on.length ? L('+ Agregar otro', '+ Add another') : L('Todos', 'All')}</option>${opts.map(o => `<option value="${h(o[0])}">${on.includes(o[0]) ? '✓ ' : ''}${h(o[1])}</option>`).join('')}</select></div>`; };
    const allTypes = [...new Set(t.systems.flatMap(z => z.types || []))].sort();
    const fbar = `<div class="cat-fb"><div class="field cat-fq"><label for="cf-q">${L('Buscar', 'Search')}</label><input id="cf-q" type="search" data-catf="q" value="${h(F.q || '')}" placeholder="${L('ID, nombre, descripción…', 'ID, name, description…')}"></div>
      ${fsel('proc', L('Proceso', 'Process'), t.processes.map(p2 => [p2.key, tx(p2.name)]))}${fsel('area', L('Área', 'Area'), t.areas.map(z => [z.id, tx(z.name)]))}${fsel('sys', L('Sistema OT', 'OT system'), t.systems.map(z => [z.id, tx(z.name)]))}${fsel('cat', L('Categoría OT', 'OT category'), C.S.lib.otCats.map(c => [c.key, tx(c.name)]))}${allTypes.length ? fsel('type', L('Tipo de activo', 'Asset type'), allTypes.map(n => [n, tx(n)])) : ''}${fsel('st', L('Estado', 'Status'), [['on', L('Activos', 'Active')], ['off', L('Inactivos', 'Inactive')]])}
      </div>`;
    const FL = { q: L('Buscar', 'Search'), proc: L('Proceso', 'Process'), area: L('Área', 'Area'), sys: L('Sistema OT', 'OT system'), cat: L('Categoría OT', 'OT category'), type: L('Tipo de activo', 'Asset type'), st: L('Estado', 'Status') };
    const fv = (k2, v) => k2 === 'proc' ? tx((t.processes.find(p2 => p2.key === v) || {}).name || v) : k2 === 'area' ? tx((t.areas.find(z => z.id === v) || {}).name || v) : k2 === 'sys' ? tx((t.systems.find(z => z.id === v) || {}).name || v) : k2 === 'cat' ? C.catName(v) : k2 === 'st' ? (v === 'on' ? L('Activos', 'Active') : L('Inactivos', 'Inactive')) : k2 === 'q' ? '«' + v + '»' : tx(v);
    const act = Object.entries(F).flatMap(([k2, v]) => [].concat(v || []).filter(Boolean).map(v2 => [k2, v2]));
    const fchips = `<div class="cat-fc"><span class="small mut"><b>${list.length}</b> ${L('de', 'of')} ${all.length}</span>${act.length ? `<span class="cat-fcl">${L('Filtros activos en todas las secciones:', 'Active filters in all sections:')}</span>${act.map(([k2, v]) => `<span class="cat-chip"><small>${FL[k2]}</small>${h(fv(k2, v))}<button data-act="catf-rm" data-k="${k2}" data-v="${h(v)}" aria-label="${L('Quitar filtro', 'Remove filter')} ${FL[k2]}">${ic('x', 'sm')}</button></span>`).join('')}<button class="plink" data-act="catf-clear">${L('Limpiar todo', 'Clear all')}</button>` : ''}</div>`;
    const pn = k => tx((t.processes.find(p => p.key === k) || {}).name || k);
    const pchips = arr => (arr || []).map(k => `<span class="pchip">${h(pn(k))}</span>`).join('') || '<span class="mut">—</span>';
    const more = (arr, f) => arr.slice(0, 3).map(f).join('') + (arr.length > 3 ? `<span class="pchip mut">+${arr.length - 3}</span>` : '');
    const relCell = (x, kk, list) => { const items = list || (t[kk] || []).filter(z => (z.procs || []).includes(x.key)); const key = (x.key || x.id) + ':' + kk; const open = CEXP.has(key);
      if (!items.length) return `<span class="cat-rel"><span class="cat-n z">0</span><span class="mut small">${['types', 'procs'].includes(kk) ? L('Ninguno', 'None') : L('Ninguna', 'None')}</span></span>`;
      const shown = open ? items : items.slice(0, 3);
      return `<span class="cat-rel"><button class="cat-n" data-act="cat-exp" data-k="${h(key)}" aria-expanded="${open}" title="${open ? L('Contraer', 'Collapse') : L('Ver todas', 'Show all')}">${items.length}</button><span class="cat-chips">${shown.map(z => `<span class="pchip">${h(tx(z.name))}</span>`).join('')}${!open && items.length > 3 ? `<button class="pchip more" data-act="cat-exp" data-k="${h(key)}">+${items.length - 3}</button>` : ''}</span></span>`; };
    const COLS = {
      processes: [[L('Proceso', 'Process'), x => `<b>${h(tx(x.name))}</b>${x.desc ? `<small>${h(tx(x.desc))}</small>` : ''}`], [L('Criticidad', 'Criticality'), x => x.critCat ? `<span class="pill ${/crit/i.test(x.critCat) ? 'err' : x.critCat === 'Alta' ? 'warn' : ''}">${h(tx(x.critCat))}</span>` : '—'], [L('Áreas típicas', 'Typical areas'), x => relCell(x, 'areas')], [L('Sistemas OT', 'OT systems'), x => relCell(x, 'systems')]],
      areas: [[L('Área', 'Area'), x => `<b>${h(tx(x.name))}</b>`], [L('Procesos', 'Processes'), x => relCell(x, 'procs', (x.procs || []).map(k2 => ({ name: pn(k2) })))]],
      systems: [[L('Sistema', 'System'), x => `<b>${h(tx(x.name))}</b>${x.obs ? `<small>${h(tx(x.obs))}</small>` : ''}`], [L('Categoría OT', 'OT category'), x => `<span class="pill pri">${h(C.catName(x.cat))}</span>`], [L('Procesos', 'Processes'), x => relCell(x, 'procs', (x.procs || []).map(k2 => ({ name: pn(k2) })))], [L('Tipo de activo', 'Asset type'), x => relCell(x, 'types', (x.types || []).map(n => ({ name: n })))]],
      deps: [[L('Dependencia', 'Dependency'), x => `<b>${h(itemName(t, 'deps', x))}</b>${x.desc ? `<small>${h(tx(x.desc))}</small>` : ''}`], [L('Tipo', 'Type'), x => h(C.depName(x.type))]],
      controls: [[L('Control', 'Control'), x => `<b>${h(tx(x.name))}</b>`], [L('Procesos', 'Processes'), x => relCell(x, 'procs', (x.procs || []).map(k2 => ({ name: pn(k2) })))]] }[sec] || [[L('Nombre', 'Name'), x => `<b>${h(itemName(t, sec, x))}</b>`]];
    const kb = x => { const id = x.id || x.key; return U.v6kebab ? `<span class="v6w v6w-inl">${U.v6kebab('cat:' + sec + ':' + id, id, [U.v6mi(`data-act="cat-edit" data-s="${sec}" data-id="${id}"`, 'edit', L('Editar', 'Edit')), sec === 'processes' ? U.v6mi(`data-act="cat-addarea" data-p="${x.key}"`, 'plus', L('Agregar área típica', 'Add typical area')) : '', sec === 'processes' ? U.v6mi(`data-act="cat-addsys" data-p="${x.key}"`, 'plus', L('Agregar sistema OT', 'Add OT system')) : '', U.v6mi(`data-act="cat-del" data-s="${sec}" data-id="${id}"`, 'x', L('Borrar', 'Delete'), 'danger')])}</span>` : `<button class="icon-btn" data-act="cat-edit" data-s="${sec}" data-id="${id}">${ic('edit', 'sm')}</button>`; };
    const rows = list.length ? `<div class="cat-tw"><table class="cat-t"><thead><tr><th class="id">ID</th>${COLS.map(c => `<th>${c[0]}</th>`).join('')}<th class="v">v</th><th class="on">${L('Activo', 'Active')}</th><th class="k"></th></tr></thead><tbody>${list.map(x => `<tr class="${x.active === false ? 'off' : ''}"><td class="id"><span class="v6w-id">${h(x.id || x.key)}</span></td>${COLS.map(c => `<td>${c[1](x)}</td>`).join('')}<td class="v">${x.v ? 'v' + x.v : '—'}</td><td class="on"><button class="tog" role="switch" aria-checked="${x.active !== false}" aria-label="${L('Activo', 'Active')} ${h(x.id || x.key)}" data-act="cat-toggle" data-s="${sec}" data-id="${x.id || x.key}"></button></td><td class="k">${kb(x)}</td></tr>`).join('')}</tbody></table></div>` : '';
    return `<div class="row" style="justify-content:space-between;align-items:flex-end"><div class="field" style="min-width:220px"><label for="cind2">${L('Industria', 'Industry')}</label><select id="cind2" data-cfgui="cind2">${D.INDUSTRIES.map(i => U.opt(i.key, tx(i.name), ind)).join('')}</select></div><span class="pill pri">${L('Plantilla', 'Template')} v${t.version}</span></div>
      <div class="note-info">${ic('info')}<span>${L('El catálogo sugiere estructura inicial; no representa una planta real. Cada cambio crea una nueva versión que aplica a assessments nuevos. Los assessments existentes conservan su versión y los cerrados no cambian. DEMO · contenido ficticio por validar con especialistas.', 'The catalog suggests an initial structure; it does not represent a real plant. Each change creates a new version that applies to new assessments. Existing assessments keep their version and closed ones never change. DEMO · fictitious content to be validated by specialists.')}</span></div>
      <div class="tabs" role="tablist">${KINDS().map(([k, l]) => `<button role="tab" data-act="cat-sec" data-s="${k}" aria-selected="${sec === k}">${l} <span class="mut">${(t[k] || []).length}</span></button>`).join('')}</div>
      <section class="box"><div class="box-head"><h3>${KINDS().find(k => k[0] === sec)[1]}</h3><button class="btn primary sm" data-act="cat-edit" data-s="${sec}" data-id="">${ic('plus', 'sm')}${L('Agregar', 'Add')}</button></div>${fbar}${fchips}${rows || `<div class="box-body"><div class="empty">${all.length ? L('Ningún elemento con estos filtros.', 'No items match these filters.') : L('Sin elementos.', 'No items.')}</div></div>`}</section>
      <p class="hint">${L('Preguntas sugeridas de esta industria: pestaña «Biblioteca de preguntas».', 'Suggested questions for this industry: “Question library” tab.')}</p>
      ${U.dt('cat-hist', L('Historial de versiones', 'Version history') + ` · v${t.version}`, `<ul class="plain small">${(t.history || []).map(x => `<li><b>v${x.v}</b> · ${C.fmtDate(x.ts, true)} · ${h(C.uname(x.by) || x.by)} · ${h(L(x.es, x.en))}</li>`).join('')}</ul><p class="small mut">${L('En uso por', 'In use by')}: ${inUse.join(', ') || '—'}</p>`)}`;
  };
  U.typesTab = function () {
    const lib = C.S.lib;
    return `<section class="box"><div class="box-head"><h3>${L('Tipos de activo', 'Asset types')}</h3><p>${L('Se usan en el recorrido, la importación y las reglas de cobertura fotográfica. Desactivar un tipo no cambia los activos ya registrados.', 'Used in the walkdown, import and photo coverage rules. Deactivating a type does not change assets already recorded.')}</p></div>
      <div class="ilist">${lib.assetTypes.map((t, i) => `<div class="irow ${t.active ? '' : 'off'}"><div class="ir-main"><b>${h(tx(t.name))}</b></div><div class="ir-act"><select class="inp" data-typecat="${i}" aria-label="${L('Categoría OT', 'OT category')}" style="max-width:240px">${U.opt('', L('Sin categoría', 'Uncategorized'), t.cat)}${lib.otCats.map(c => U.opt(c.key, tx(c.name), t.cat)).join('')}</select><button class="tog" role="switch" aria-checked="${t.active}" aria-label="${h(tx(t.name))}" data-act="type-toggle" data-i="${i}"></button></div></div>`).join('')}</div>
      <div class="box-body" style="border-top:1px solid var(--line-2)"><div class="row"><input class="inp" id="nt-name" placeholder="${L('Nuevo tipo, p. ej. Analizador', 'New type, e.g. Analyzer')}" style="flex:1;min-width:180px"><select class="inp" id="nt-cat" style="max-width:240px" aria-label="${L('Categoría OT', 'OT category')}">${lib.otCats.map(c => U.opt(c.key, tx(c.name))).join('')}</select><button class="btn primary sm" data-act="type-add">${L('Agregar', 'Add')}</button></div></div></section>
      <section class="box"><div class="box-head"><h3>${L('Categorías OT', 'OT categories')}</h3></div><div class="box-body"><div class="row" style="gap:6px">${lib.otCats.map(c => `<span class="pill pri">${h(tx(c.name))}</span>`).join('')}</div></div></section>`;
  };
  const bump = (ind, es, en) => { const t = tplOf(ind); t.version++; (t.history = t.history || []).unshift({ v: t.version, ts: new Date().toISOString(), by: C.S.userId, es, en }); };
  A['go-catalog'] = () => { C.S.ui.view = 'config'; C.S.ui.ctab = 'tpl'; R(); };
  A['cat-sec'] = el => { C.S.ui.csec = el.dataset.s; R(); };
  A['cat-toggle'] = el => { const ind = C.S.ui.cind2 || 'oilgas'; const t = tplOf(ind); const x = t[el.dataset.s].find(y => (y.id || y.key) === el.dataset.id); x.active = x.active === false; x.v = (x.v || 1) + 1; bump(ind, `${x.active ? 'Activó' : 'Desactivó'} ${x.id || x.key}`, `${x.active ? 'Activated' : 'Deactivated'} ${x.id || x.key}`); C.save(); R(); U.toast(L('Catálogo v', 'Catalog v') + t.version + L(' · aplica a assessments nuevos', ' · applies to new assessments')); };
  A['cat-edit'] = el => U.openModal('catitem', { s: el.dataset.s, id: el.dataset.id });
  const catF = () => { const k3 = C.S.ui.cind2 || 'oilgas'; const all = (C.S.ui.catf = C.S.ui.catf || {}); return all[k3] = all[k3] || {}; };
  document.addEventListener('change', e => { const k3 = e.target.dataset && e.target.dataset.catf; if (!k3 || k3 === 'q') return; const F2 = catF(); const v = e.target.value;
    if (e.target.dataset.multi) { if (!v) return; const arr = [].concat(F2[k3] || []).filter(Boolean); const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); F2[k3] = arr; } else F2[k3] = v; C.save(); R(); });
  let cfT; document.addEventListener('input', e => { if (!e.target.dataset || e.target.dataset.catf !== 'q') return; const v = e.target.value; clearTimeout(cfT); cfT = setTimeout(() => { catF().q = v; R(); const i = document.getElementById('cf-q'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } }, 220); });
  A['catf-clear'] = () => { C.S.ui.catf[C.S.ui.cind2 || 'oilgas'] = {}; C.save(); R(); };
  A['catf-rm'] = el => { const F2 = catF(); const k3 = el.dataset.k; if (Array.isArray(F2[k3])) { F2[k3] = F2[k3].filter(v => v !== el.dataset.v); if (!F2[k3].length) delete F2[k3]; } else delete F2[k3]; C.save(); R(); };
  const CEXP = new Set(); A['cat-exp'] = el => { const k = el.dataset.k; CEXP.has(k) ? CEXP.delete(k) : CEXP.add(k); R(); };
  A['cat-addarea'] = el => U.openModal('catitem', { s: 'areas', id: '', proc: el.dataset.p });
  A['cat-addsys'] = el => U.openModal('catitem', { s: 'systems', id: '', proc: el.dataset.p });
  A['cat-del'] = el => { const ind = C.S.ui.cind2 || 'oilgas'; const t = tplOf(ind); const k = el.dataset.s, id = el.dataset.id; const x = (t[k] || []).find(y => (y.id || y.key) === id); if (!x) return;
    const nm = itemName(t, k, x); const KN = { areas: L('área', 'area'), systems: L('sistema', 'system'), controls: L('control', 'control') };
    const linked = k === 'processes' ? ['areas', 'systems', 'controls'].flatMap(kk => (t[kk] || []).filter(y => (y.procs || []).includes(x.key)).map(y => ({ kk, y, only: (y.procs || []).length === 1 }))) : [];
    const deps = k === 'systems' ? (t.deps || []).filter(d => d.from === id || d.to === id) : [];
    const only = linked.filter(z => z.only);
    const det = [linked.length ? L(`Tiene ${linked.length} elementos asociados (${linked.map(z => KN[z.kk] + ' ' + tx(z.y.name)).slice(0, 5).join(', ')}${linked.length > 5 ? '…' : ''}): se desvincularán.`, `It has ${linked.length} linked items (${linked.map(z => KN[z.kk] + ' ' + tx(z.y.name)).slice(0, 5).join(', ')}${linked.length > 5 ? '…' : ''}): they will be unlinked.`) : '',
      only.length ? L(`${only.length} de ellos solo pertenecen a este proceso y quedarán deshabilitados.`, `${only.length} of them belong only to this process and will be disabled.`) : '',
      deps.length ? L(`También se borrarán ${deps.length} dependencias del catálogo que usan este sistema.`, `${deps.length} catalog dependencies using this system will also be deleted.`) : ''].filter(Boolean).join(' ');
    U.openModal('confirm', { title: L('¿Borrar ', 'Delete ') + id + '?', msg: L(`Vas a borrar ${id} · ${nm} del catálogo de ${C.indName(ind)}. `, `You are about to delete ${id} · ${nm} from the ${C.indName(ind)} catalog. `) + (det ? det + ' ' : '') + L('Se crea una versión nueva del catálogo; los assessments existentes no cambian. Si solo quiere retirarlo temporalmente, cancele y use el interruptor «Activo».', 'A new catalog version is created; existing assessments do not change. If you only want to retire it temporarily, cancel and use the “Active” switch.'), yes: L('Sí, borrar', 'Yes, delete'), danger: true,
      onYes: () => { t[k] = t[k].filter(y => y !== x); linked.forEach(z => { z.y.procs = (z.y.procs || []).filter(p => p !== x.key); if (!z.y.procs.length) z.y.active = false; }); if (deps.length) t.deps = t.deps.filter(d => !deps.includes(d)); bump(ind, 'Borró ' + id, 'Deleted ' + id); C.save(); R(); U.toast(L(`${id} borrado · catálogo v${t.version}`, `${id} deleted · catalog v${t.version}`)); } }); };
  const CRITS = ['Critica', 'Alta', 'Media', 'Baja'];
  const CI = { addA: false, addS: false, newA: [], newS: [], key: null };
  const ciRefresh = () => { const m = document.querySelector('#layer .modal'); const v = {}; if (m) m.querySelectorAll('input[id],select[id],textarea[id]').forEach(e => { v[e.id] = e.value; }); const ck = m ? [...m.querySelectorAll('input[type=checkbox]')].map(e => [e.className, e.value, e.checked, e.id]) : [];
    U.renderModal(); Object.entries(v).forEach(([id, val2]) => { const e = document.getElementById(id); if (e && e.type !== 'checkbox' && !['ci-na', 'ci-ns'].includes(id)) e.value = val2; });
    ck.forEach(([cls, val2, on, id]) => { const e = id ? document.getElementById(id) : document.querySelector(`#layer input.${(cls || '').split(' ')[0]}[value="${CSS.escape(val2)}"]`); if (e && !String(val2).startsWith('new:')) e.checked = on; });
    const f = document.querySelector('#ci-na, #ci-ns'); if (f) f.focus(); };
  A['ci-add'] = el => { if (el.dataset.w === 'A') CI.addA = true; else CI.addS = true; ciRefresh(); };
  A['ci-x'] = el => { if (el.dataset.w === 'A') CI.addA = false; else CI.addS = false; ciRefresh(); };
  A['ci-ok'] = el => { const w = el.dataset.w; const inp = document.getElementById(w === 'A' ? 'ci-na' : 'ci-ns'); const n = (inp && inp.value || '').trim(); if (!n) return U.toast(L('Escriba el nombre', 'Enter the name'));
    if (w === 'A') { CI.newA.push(n); CI.addA = false; } else { CI.newS.push({ name: n, cat: document.getElementById('ci-nsc').value }); CI.addS = false; } ciRefresh(); };
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.target.id === 'ci-na' || e.target.id === 'ci-ns')) { e.preventDefault(); A['ci-ok']({ dataset: { w: e.target.id === 'ci-na' ? 'A' : 'S' } }); } });
  U.catItemModal = function (d) {
    const ind = C.S.ui.cind2 || 'oilgas'; const t = tplOf(ind); const k = d.s; const ck = k + ':' + (d.id || '') + ':' + (d._n || (d._n = Date.now())); if (CI.key !== ck) Object.assign(CI, { addA: false, addS: false, newA: [], newS: [], key: ck });
    const x = d.id ? t[k].find(y => (y.id || y.key) === d.id) : { procs: d.proc ? [d.proc] : [], name: '', active: true, cat: d.cat || (C.S.lib.otCats[0] || {}).key, types: [] };
    const pk = x.key; const cb = (cls, list, on, lbl, sub) => `<div class="ci-cbs">${list.map(y => `<label class="ci-cb"><input type="checkbox" class="${cls}" value="${h(y.id || y.key || y)}" ${on(y) ? 'checked' : ''}><span><b>${h(lbl(y))}</b>${sub ? `<small>${h(sub(y))}</small>` : ''}</span></label>`).join('') || `<span class="small mut">${L('No hay registros.', 'No records.')}</span>`}</div>`;
    const fld = (id, lbl, v, req) => `<div class="field"><label for="${id}">${lbl}${req ? ' *' : ''}</label><input id="${id}" value="${h(v || '')}"></div>`;
    const act = `<label class="check ci-act"><input type="checkbox" id="ci-active" ${x.active !== false ? 'checked' : ''}><span><b>${L('Activo', 'Active')}</b><br><span class="small mut">${L('Los registros inactivos no se proponen en assessments nuevos.', 'Inactive records are not proposed in new assessments.')}</span></span></label>`;
    const pch = cb('ci-proc', t.processes, y => (x.procs || []).includes(y.key), y => tx(y.name), y => y.key);
    const sec = (title, inner, note, btn) => `<div class="sec-title ci-sh"><span>${title}</span>${btn || ''}</div>${note ? `<p class="small mut" style="margin:-4px 0 0">${note}</p>` : ''}${inner}`;
    const sysSel = cur => t.systems.map(s2 => U.opt(s2.id, s2.id + ' · ' + tx(s2.name), cur)).join('');
    let body = '';
    if (k === 'processes') body = sec(L('Proceso', 'Process'), `<div class="grid2">${fld('ci-name', L('Nombre', 'Name'), tx(x.name), 1)}<div class="field"><label for="ci-crit">${L('Criticidad sugerida', 'Suggested criticality')}</label><select id="ci-crit">${U.opt('', '—', x.critCat || '')}${CRITS.map(c => U.opt(c, tx(c), x.critCat || '')).join('')}</select></div></div>${fld('ci-desc', L('Descripción', 'Description'), tx(x.desc || ''))}${act}`)
      + sec(L('Áreas típicas', 'Typical areas'), (CI.addA ? `<div class="ci-add"><input id="ci-na" placeholder="${L('Nombre del área nueva', 'New area name')}" data-autofocus><button class="btn primary sm" data-act="ci-ok" data-w="A">${ic('check', 'sm')}${L('Guardar', 'Save')}</button><button class="icon-btn" data-act="ci-x" data-w="A" aria-label="${L('Cancelar', 'Cancel')}">${ic('x', 'sm')}</button></div>` : '') + cb('ci-area', CI.newA.map((n, i) => ({ id: 'new:' + i, name: n, isNew: 1 })).concat(t.areas), y => y.isNew || (!!pk && (y.procs || []).includes(pk)), y => tx(y.name), y => y.isNew ? L('Nueva · se crea al guardar', 'New · created on save') : y.id), L('Marque las áreas donde ocurre este proceso. Un área puede servir a varios procesos.', 'Check the areas where this process takes place. An area can serve several processes.'), CI.addA ? '' : `<button class="btn ghost sm" data-act="ci-add" data-w="A">${ic('plus', 'sm')}${L('Agregar área', 'Add area')}</button>`)
      + sec(L('Sistemas OT', 'OT systems'), (CI.addS ? `<div class="ci-add"><input id="ci-ns" placeholder="${L('Nombre del sistema nuevo', 'New system name')}" data-autofocus><select id="ci-nsc" aria-label="${L('Categoría OT', 'OT category')}">${C.S.lib.otCats.map(c => U.opt(c.key, tx(c.name))).join('')}</select><button class="btn primary sm" data-act="ci-ok" data-w="S">${ic('check', 'sm')}${L('Guardar', 'Save')}</button><button class="icon-btn" data-act="ci-x" data-w="S" aria-label="${L('Cancelar', 'Cancel')}">${ic('x', 'sm')}</button></div>` : '') + cb('ci-sys', CI.newS.map((n, i) => ({ id: 'new:' + i, name: n.name, cat: n.cat, isNew: 1 })).concat(t.systems), y => y.isNew || (!!pk && (y.procs || []).includes(pk)), y => tx(y.name), y => (y.isNew ? L('Nuevo · ', 'New · ') : y.id + ' · ') + C.catName(y.cat)), '', CI.addS ? '' : `<button class="btn ghost sm" data-act="ci-add" data-w="S">${ic('plus', 'sm')}${L('Agregar sistema OT', 'Add OT system')}</button>`)
      + ((t.controls || []).length ? sec(L('Controles sugeridos', 'Suggested controls'), cb('ci-ctl', t.controls, y => !!pk && (y.procs || []).includes(pk), y => tx(y.name), y => y.id)) : '');
    else if (k === 'areas') body = sec(L('Área', 'Area'), fld('ci-name', L('Nombre', 'Name'), tx(x.name), 1) + act) + sec(L('Procesos que ocurren en esta área', 'Processes in this area'), pch);
    else if (k === 'systems') { const types = [...new Set(C.S.lib.assetTypes.map(z => z.name).concat(x.types || []))];
      body = sec(L('Sistema OT', 'OT system'), `<div class="grid2">${fld('ci-name', L('Nombre', 'Name'), tx(x.name), 1)}<div class="field"><label for="ci-cat">${L('Categoría OT', 'OT category')}</label><select id="ci-cat">${C.S.lib.otCats.map(c => U.opt(c.key, tx(c.name), x.cat)).join('')}</select></div></div>${fld('ci-obs', L('Observaciones', 'Notes'), tx(x.obs || ''))}${act}`)
        + sec(L('Procesos que soporta', 'Supported processes'), pch) + sec(L('Tipos de activo que agrupa', 'Asset types it groups'), cb('ci-type', types.map(n => ({ id: n, name: n })), y => (x.types || []).includes(y.id), y => tx(y.name))); }
    else if (k === 'deps') body = sec(L('Dependencia', 'Dependency'), `<div class="grid2"><div class="field"><label for="ci-from">${L('Sistema que depende', 'Dependent system')} *</label><select id="ci-from">${sysSel(x.from)}</select></div><div class="field"><label for="ci-to">${L('Depende de', 'Depends on')} *</label><select id="ci-to">${sysSel(x.to)}</select></div></div><div class="grid2"><div class="field"><label for="ci-type">${L('Tipo', 'Type')}</label><select id="ci-type">${D.DEP_TYPES.map(y => U.opt(y, C.depName(y), x.type)).join('')}</select></div>${fld('ci-desc', L('Descripción', 'Description'), tx(x.desc || ''))}</div>${act}`);
    else body = sec(L('Control', 'Control'), fld('ci-name', L('Nombre', 'Name'), tx(x.name), 1) + act) + sec(L('Procesos', 'Processes'), pch);
    const KN = { processes: L('proceso', 'process'), areas: L('área típica', 'typical area'), systems: L('sistema OT', 'OT system'), deps: L('dependencia', 'dependency'), controls: L('control', 'control') }[k];
    return { title: (d.id ? L('Editar ', 'Edit ') + KN + ' · ' + h(d.id) : L('Agregar ', 'Add ') + KN) + ' · ' + h(C.indName(ind)), wide: true, body: body + `<p class="hint">${L(`Se guardará como catálogo v${t.version + 1}. Aplica a assessments nuevos.`, `Will be saved as catalog v${t.version + 1}. Applies to new assessments.`)}</p>`, foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button><button class="btn primary" data-act="cat-save" data-s="${k}" data-id="${h(d.id || '')}">${L('Guardar', 'Save')}</button>` };
  };
  A['cat-save'] = el => {
    const ind = C.S.ui.cind2 || 'oilgas'; const t = tplOf(ind); const k = el.dataset.s; const isNew = !el.dataset.id;
    const ref = [].concat(...['areas', 'systems', 'deps', 'controls', 'processes'].map(kk => t[kk] || [])).find(y => /^[A-Z]{2}-/.test(y.id || y.key || '')); const P2 = ref ? (ref.id || ref.key).slice(0, 2) : ind.slice(0, 2).toUpperCase();
    const pre = kk => P2 + '-' + KINDS().find(z => z[0] === kk)[2] + '-'; const newId = kk => { let n = (t[kk] || []).length + 1, id; do { id = pre(kk) + String(n++).padStart(2, '0'); } while ((t[kk] || []).some(y => (y.id || y.key) === id)); return id; };
    const chk = cls => [...document.querySelectorAll('.' + cls + ':checked')].map(i => i.value); const act = (document.getElementById('ci-active') || { checked: true }).checked;
    let x = isNew ? { active: true, v: 0 } : t[k].find(y => (y.id || y.key) === el.dataset.id);
    if (k === 'deps') { if (val('ci-from') === val('ci-to')) return U.toast(L('Seleccione dos sistemas distintos', 'Select two different systems')); if (t.deps.some(dd => dd !== x && dd.from === val('ci-from') && dd.to === val('ci-to'))) return U.toast(L('Esa dependencia ya existe', 'That dependency already exists')); Object.assign(x, { from: val('ci-from'), to: val('ci-to'), type: val('ci-type'), desc: val('ci-desc') }); }
    else { const n = val('ci-name'); if (!n) return U.toast(L('El nombre es obligatorio', 'Name is required')); if (n !== tx(x.name)) x.name = n;
      if (k === 'processes') { x.desc = val('ci-desc'); x.critCat = val('ci-crit') || null; if (x.critCat) x.crit3 = x.critCat === 'Critica' ? 'Alta' : x.critCat; }
      if (k === 'systems') { x.cat = val('ci-cat'); x.catLabel = (C.S.lib.otCats.find(c => c.key === x.cat) || {}).name; x.obs = val('ci-obs'); x.types = chk('ci-type'); }
      if (k !== 'processes') x.procs = chk('ci-proc'); }
    x.active = act;
    if (isNew) { const id = newId(k); if (k === 'processes') { x.key = id; x.id = id; x.scope = 'incluido'; x.prov = L('Catálogo', 'Catalog'); } else x.id = id; t[k] = t[k] || []; t[k].push(x); }
    if (k === 'processes') { const key = x.key; const rel = (kk, cls) => { const on = new Set(chk(cls)); (t[kk] || []).forEach(y => { const has = (y.procs || []).includes(key); if (on.has(y.id) && !has) y.procs = (y.procs || []).concat(key); if (!on.has(y.id) && has) y.procs = y.procs.filter(p => p !== key); }); };
      rel('areas', 'ci-area'); rel('systems', 'ci-sys'); if ((t.controls || []).length) rel('controls', 'ci-ctl');
      const onA = new Set(chk('ci-area')), onS = new Set(chk('ci-sys'));
      CI.newA.forEach((nm, i) => { if (onA.has('new:' + i)) t.areas.push({ id: newId('areas'), name: nm, procs: [key], roles: {}, active: true, v: 1 }); });
      CI.newS.forEach((n, i) => { if (onS.has('new:' + i)) t.systems.push({ id: newId('systems'), name: n.name, cat: n.cat, catLabel: (C.S.lib.otCats.find(c => c.key === n.cat) || {}).name, family: n.cat, procs: [key], types: [], obs: '', active: true, v: 1 }); }); }
    CI.addA = CI.addS = false; CI.newA = []; CI.newS = [];
    x.v = (x.v || 0) + 1; bump(ind, `${isNew ? 'Agregó' : 'Editó'} ${x.id || x.key}`, `${isNew ? 'Added' : 'Edited'} ${x.id || x.key}`);
    U.closeModal(); C.save(); R(); U.toast(L('Catálogo v', 'Catalog v') + t.version + L(' · aplica a assessments nuevos', ' · applies to new assessments'));
  };
  A['type-toggle'] = el => { const t = C.S.lib.assetTypes[+el.dataset.i]; t.active = !t.active; C.save(); R(); };
  A['type-add'] = () => { const n = val('nt-name'); if (!n) return; if (C.S.lib.assetTypes.some(t => norm(t.name) === norm(n))) return U.toast(L('Ese tipo ya existe', 'That type already exists')); C.S.lib.assetTypes.push({ name: n, cat: val('nt-cat'), active: true }); C.save(); R(); };

  // ---------- eventos propios ----------
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.impfile) return U.onImpFile(t);
    if (t.dataset.inv) { C.S.ui.inv[t.dataset.inv] = t.value; R(); }
    if (t.dataset.typecat) { C.S.lib.assetTypes[+t.dataset.typecat].cat = t.value; C.save(); }
    if (t.dataset.imp === 'sheet') { U.imp.sheet = t.value; U.imp.headerRow = detectHeader(U.imp.file.sheets[t.value]); U.renderModal(); }
    if (t.dataset.imp === 'hr') { U.imp.headerRow = Math.max(0, (+t.value || 1) - 1); U.renderModal(); }
    if (t.dataset.impmap) { U.imp.map[t.dataset.impmap] = t.value; U.renderModal(); }
    if (t.dataset.impmap2) { U.imp.map2[t.dataset.impmap2] = t.value; U.renderModal(); }
    if (t.dataset.imp === 'sheet2') { U.imp.sheet2 = t.value; U.renderModal(); }
  });
})();
