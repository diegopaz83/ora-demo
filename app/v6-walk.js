/* ORA v6 — Recorrido (etapa 3, modo lista) como jerarquía Proceso › Área › Activo:
   niveles plegables con ID, foto con vista previa o ícono de cámara, contador de hallazgos con modal,
   y altas desde el catálogo de la industria (lista desplegable + «Otro»). */
(function () {
  const C = window.ORA, D = window.ORA_DATA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, ic = U.ic, L = I.L, tx = I.tx, A = U.act;
  const R = () => U.render();
  const now = () => new Date().toISOString();
  const OPEN = new Map(); // clave → abierto
  const isOpen = (k, def) => OPEN.has(k) ? OPEN.get(k) : def;
  const tpl = a => (C.S.lib.templates || {})[a.cfg.industry] || D.TEMPLATES[a.cfg.industry] || { areas: [], systems: [] };

  const photosOf = (a, k, id) => (a.photos || []).filter(p => p.links && p.links[k] === id && !p.deleted && (k !== 'area' || !p.links.asset));
  const findingsOfAsset = (a, x) => a.findings.filter(f => (f.assets || []).includes(x.id));
  const findingsOfArea = (a, ar) => { const ids = new Set(a.assets.filter(x => x.area === ar.id).map(x => x.id)); return a.findings.filter(f => f.area === ar.id || (f.assets || []).some(y => ids.has(y))); };
  const areaId = ar => ar.cat0 || ar.catId || ar.id;
  let MENU = null;

  // indicadores (sin acciones): foto y hallazgos
  function photoInd(a, k, id, req, label) {
    const ph = C.evPhotos(a, k, id), mainP = C.evMain(a, k, id), nd = C.evDocs(a, k, id).length;
    const docB = nd ? `<span class="v6w-doc" title="${nd} ${L('documentos', 'documents')}">${ic('doc', 'sm')}<b>${nd}</b></span>` : '';
    if (mainP) return `<button class="v6w-thumb" data-act="lightbox" data-id="${mainP.id}" title="${h(tx(mainP.title || '') || L('Ver foto', 'View photo'))}" aria-label="${L('Ver foto de ', 'View photo of ')}${h(label)}"><img src="${C.photoURL(mainP)}" alt="">${ph.length > 1 ? `<span class="v6w-n">${ph.length}</span>` : ''}</button>${docB}`;
    const need = req && req.status === 'sin foto', exc = req && req.res && req.status !== 'capturada';
    const tip = need ? L('Sin foto · requerida', 'No photo · required') : exc ? L('Sin foto · excepción: ', 'No photo · exception: ') + tx(req.res.note || '') : L('Sin foto', 'No photo');
    return `<span class="v6w-noph ${need ? 'need' : ''}" title="${h(tip)}" role="img" aria-label="${h(label + ': ' + tip)}">${ic('camera', 'sm')}${need ? '<i></i>' : ''}</span>${docB}`;
  }
  function findInd(list, attrs, label) {
    return list.length ? `<button class="v6w-fnd on" data-act="v6w-fnd" ${attrs} title="${L('Ver hallazgos', 'View findings')}" aria-label="${list.length} ${L('hallazgos en ', 'findings on ')}${h(label)}">${ic('flag', 'sm')}<b>${list.length}</b></button>`
      : `<span class="v6w-fnd" title="${L('Sin hallazgos', 'No findings')}" role="img" aria-label="${h(label)}: ${L('sin hallazgos', 'no findings')}">${ic('flag', 'sm')}<b>0</b></span>`;
  }
  function kebab(key, label, items) {
    const open = MENU === key;
    return `<div class="v6-kebab"><button class="icon-btn" data-act="v6w-menu" data-k="${h(key)}" aria-haspopup="menu" aria-expanded="${open}" aria-label="${L('Acciones de ', 'Actions for ')}${h(label)}" title="${L('Acciones', 'Actions')}"><span class="v6-dots" aria-hidden="true"><i></i><i></i><i></i></span></button>${open ? `<div class="v6-menu" role="menu">${items.filter(Boolean).join('')}</div>` : ''}</div>`;
  }
  const mi = (attrs, icon, lbl, cls) => `<button role="menuitem" class="${cls || ''}" ${attrs}>${ic(icon, 'sm')}${lbl}</button>`;
  U.v6kebab = kebab; U.v6mi = mi;
  U.v6openAsset = id => XO.set(id, 'view');
  const XO = new Map(); // activo → 'view' | 'edit'
  const LCN = () => ({ active: L('Activo', 'Active'), mature: L('Activo maduro', 'Active mature'), eol: L('Fin de vida', 'End of life'), discontinued: L('Descontinuado', 'Discontinued'), unknown: L('Por verificar', 'To verify') });
  const FAMS = () => [['', L('Equipo de proceso', 'Process equipment')], ['control', L('Control', 'Control')], ['software', 'Software'], ['redes', L('Redes', 'Networks')], ['infra', L('Infraestructura', 'Infrastructure')], ['energia', L('Energía', 'Power')]];
  const NEWF = new Map(); const FDEL = new Set();
  const FST = () => [['pendiente de verificación', L('Pendiente de verificación', 'Pending verification')], ['confirmado', L('Confirmado', 'Confirmed')]];
  function findEditor(a, x) {
    const fs = findingsOfAsset(a, x); const n = NEWF.get(x.id) || 0;
    const row = (fid, f, isNew) => `<tr class="${isNew ? 'new' : ''}"><td class="id"><span class="v6w-id">${isNew ? L('Nuevo', 'New') : fid}</span></td>
      <td><input id="v6f-t-${fid}" value="${h(f ? tx(f.title) : '')}" placeholder="${L('Qué se observó *', 'What was observed *')}" aria-label="${L('Hallazgo', 'Finding')}"></td>
      <td><input id="v6f-d-${fid}" value="${h(f ? tx(f.desc || '') : '')}" placeholder="${L('Descripción', 'Description')}" aria-label="${L('Descripción', 'Description')}"></td>
      <td class="st"><select id="v6f-s-${fid}" aria-label="${L('Estado', 'Status')}">${FST().map(o => U.opt(o[0], o[1], f ? f.status || 'confirmado' : 'pendiente de verificación')).join('')}</select></td>
      <td class="x"><button class="v6e-del ${FDEL.has(fid) ? 'arm' : ''}" data-act="v6f-del" data-a="${x.id}" data-f="${fid}" title="${L('Quitar', 'Remove')}" aria-label="${L('Quitar hallazgo', 'Remove finding')}">${FDEL.has(fid) ? L('¿Borrar?', 'Delete?') : ic('x', 'sm')}</button></td></tr>`;
    return `<div class="v6f"><div class="v6e-h"><b>${L('Hallazgos', 'Findings')}</b><span class="pill">${fs.length}</span></div>
      <table class="v6f-tb"><thead><tr><th class="id">ID</th><th>${L('Hallazgo', 'Finding')}</th><th>${L('Descripción', 'Description')}</th><th class="st">${L('Estado', 'Status')}</th><th class="x"></th></tr></thead>
      <tbody>${fs.map(f => row(f.id, f)).join('')}${Array.from({ length: n }, (_, i) => row('new' + i, null, true)).join('')}</tbody></table>
      <button class="plink v6f-addl" data-act="v6f-new" data-id="${x.id}">${ic('plus', 'sm')}${L('Agregar hallazgo', 'Add finding')}</button></div>`;
  }
  A['v6f-new'] = el => { NEWF.set(el.dataset.id, (NEWF.get(el.dataset.id) || 0) + 1); U.v6refresh(); setTimeout(() => { const i = document.getElementById('v6f-t-new' + (NEWF.get(el.dataset.id) - 1)); if (i) { i.scrollIntoView({ block: 'center' }); i.focus(); } }, 0); };
  A['v6f-add'] = el => { const id = el.dataset.id; XO.set(id, 'edit'); NEWF.set(id, (NEWF.get(id) || 0) + 1); R(); setTimeout(() => { const i = document.getElementById('v6f-t-new' + (NEWF.get(id) - 1)); if (i) { i.scrollIntoView({ block: 'center' }); i.focus(); } }, 0); };
  A['v6f-del'] = el => {
    const fid = el.dataset.f, aid = el.dataset.a; const a = C.cur();
    if (fid.startsWith('new')) { const k = +fid.slice(3), n = NEWF.get(aid) || 1; for (let i = k; i < n - 1; i++) ['t', 'd', 's'].forEach(c => { const a1 = document.getElementById(`v6f-${c}-new${i}`), b1 = document.getElementById(`v6f-${c}-new${i + 1}`); if (a1 && b1) a1.value = b1.value; }); NEWF.set(aid, Math.max(0, n - 1)); U.v6refresh(); return; }
    if (!FDEL.has(fid)) { FDEL.add(fid); U.v6refresh(); setTimeout(() => { if (FDEL.delete(fid)) U.v6refresh(); }, 4000); return; }
    FDEL.delete(fid); const f = a.findings.find(q => q.id === fid); if (!f) return;
    const used = a.scenarios.some(s => s.findings.includes(fid)) || (a.opportunities || []).some(o => o.findings.includes(fid)) || (a.interventions || []).some(v => (v.findings || []).includes(fid));
    if ((f.assets || []).length > 1 || used) { f.assets = (f.assets || []).filter(y => y !== aid); if (!f.assets.length && used) { /* queda sin activo pero vinculado a escenarios */ } C.log(a, `Desvinculó el hallazgo ${fid} del activo`, `Unlinked finding ${fid} from the asset`); U.toast(used ? L(`${fid} está en escenarios u oportunidades: se desvinculó de este activo, no se borró`, `${fid} is used in scenarios or opportunities: unlinked from this asset, not deleted`) : L(`${fid} se desvinculó de este activo`, `${fid} unlinked from this asset`)); }
    else { a.findings = a.findings.filter(q => q.id !== fid); C.log(a, 'Borró el hallazgo ' + fid, 'Deleted finding ' + fid); }
    C.save(); U.v6refresh();
  };
  function saveFindings(a, x) {
    const g = id => ((document.getElementById(id) || {}).value || '').trim(); let n = 0;
    findingsOfAsset(a, x).forEach(f => { const t = g('v6f-t-' + f.id); if (!t) return; const d = g('v6f-d-' + f.id), st = g('v6f-s-' + f.id); if (t !== tx(f.title) || d !== tx(f.desc || '') || st !== (f.status || '')) { Object.assign(f, { title: t, desc: d, status: st }); n++; } });
    for (let i = 0; i < (NEWF.get(x.id) || 0); i++) { const t = g('v6f-t-new' + i); if (!t) continue; let k = a.findings.length + 1, id; do { id = 'F-' + String(k++).padStart(2, '0'); } while (a.findings.some(f => f.id === id));
      a.findings.push({ id, title: t, desc: g('v6f-d-new' + i), status: g('v6f-s-new' + i), level: 'activo', assets: [x.id], systems: [], deps: [], evidence: [], area: x.area, proc: C.assetProcs(x)[0] || null, q: null, source: 'Campo', ts: now(), by: C.uname(C.S.userId) }); C.log(a, 'Registró el hallazgo ' + id + ' en ' + x.tag, 'Recorded finding ' + id + ' on ' + x.tag); n++; }
    NEWF.delete(x.id); return n;
  }
  function assetCard(a, x, mode) {
    const lc = x.lifecycle || { status: 'unknown' }; const fs = findingsOfAsset(a, x);
    if (mode === 'edit') {
      const f = (fld, lbl, v, ph) => `<div class="field"><label for="v6x-${fld}-${x.id}">${lbl}</label><input id="v6x-${fld}-${x.id}" value="${h(v == null ? '' : v)}" placeholder="${h(ph || '')}"></div>`;
      const sl = (fld, lbl, v, opts) => `<div class="field"><label for="v6x-${fld}-${x.id}">${lbl}</label><select id="v6x-${fld}-${x.id}">${opts.map(o => U.opt(o[0], o[1], v == null ? '' : v)).join('')}</select></div>`;
      return `<div class="v6w-card edit"><div class="v6w-card-mode edit">${ic('edit', 'sm')}${L('Editando el activo', 'Editing the asset')}</div><div class="grid3">${f('tag', 'TAG' + L(' (si lo tiene)', ' (if available)'), x.noTag ? '' : x.tag, x.noTag ? x.tag : '')}${f('name', L('Descripción', 'Description'), tx(x.name))}${sl('type', L('Tipo', 'Type'), x.type, [...new Set([...D.ASSET_TYPES, x.type].filter(Boolean))].map(t => [t, tx(t)]))}</div>
        <div class="grid3">${sl('family', L('Familia', 'Family'), x.family || '', FAMS())}${f('mfr', L('Fabricante', 'Manufacturer'), x.mfr)}${f('model', L('Modelo', 'Model'), x.model)}</div>
        <div class="grid3">${f('version', L('Versión / firmware', 'Version / firmware'), x.version)}${sl('lc', L('Ciclo de vida', 'Lifecycle'), lc.status, Object.entries(LCN()))}${f('lcsrc', L('Fuente del fabricante', 'Vendor source'), lc.source, L('Boletín, página, carta…', 'Bulletin, page, letter…'))}</div>
        <div class="grid3">${f('support', L('Soporte', 'Support'), x.support)}${f('spares', L('Repuestos', 'Spares'), x.spares)}${f('redundancy', L('Redundancia', 'Redundancy'), x.redundancy)}</div>
        ${U.evidBox(a, 'asset', x.id)}
        ${findEditor(a, x)}
        <div class="v6w-card-f"><button class="btn ghost sm" data-act="v6x-cancel" data-id="${x.id}">${L('Cancelar', 'Cancel')}</button><button class="btn primary sm" data-act="v6x-save" data-id="${x.id}">${ic('check', 'sm')}${L('Guardar', 'Save')}</button></div></div>`;
    }
    const row = (k, v) => v == null || String(v).trim() === '' ? '' : `<div class="v6-kvr"><dt>${k}</dt><dd>${v}</dd></div>`;
    return `<div class="v6w-card"><div class="v6w-card-mode">${ic('info', 'sm')}${L('Ficha del activo · solo lectura', 'Asset sheet · read only')}</div><div class="v6w-card-g"><div class="v6w-left"><dl class="v6-kv2">${row(L('Tipo', 'Type'), h(tx(x.type)))}${row(L('Familia', 'Family'), x.family ? `<span class="v6-chip-sys">${h((FAMS().find(f => f[0] === x.family) || [])[1] || x.family)}</span>` : '')}${row(L('Sistema OT', 'OT system'), x.sys ? h(C.nodeLbl(a, x.sys)) : '')}
        ${row(L('Procesos', 'Processes'), C.assetProcs(x).map(k => h(C.procName(a, k))).join(' · '))}${row(L('Fabricante · modelo · versión', 'Manufacturer · model · version'), h([x.mfr, x.model, x.version].filter(Boolean).join(' · ')))}
        ${row(L('Ciclo de vida', 'Lifecycle'), `<span class="v6-lc ${lc.status}">${LCN()[lc.status]}</span>${lc.source ? ` <small class="mut">${h(lc.source)}${lc.consultedAt ? ' · ' + h(lc.consultedAt) : ''}</small>` : ''}`)}
        ${row(L('Soporte', 'Support'), h(tx(x.support || '')))}${row(L('Repuestos', 'Spares'), h(tx(x.spares || '')))}${row(L('Redundancia', 'Redundancy'), h(tx(x.redundancy || '')))}</dl>${fs.length ? `<table class="v6f-vt"><caption>${L('Hallazgos', 'Findings')} · ${fs.length}</caption>${fs.map(f => `<tr><td class="id"><span class="v6w-id">${f.id}</span></td><td><b>${h(tx(f.title))}</b>${f.desc ? `<small>${h(tx(f.desc))}</small>` : ''}</td><td class="st">${f.status ? `<span class="pill ${f.status === 'confirmado' ? 'ok' : 'warn'}">${h((FST().find(o => o[0] === f.status) || [0, tx(f.status)])[1])}</span>` : ''}</td></tr>`).join('')}</table>` : ''}</div>
        <div>${U.evidBox(a, 'asset', x.id, { readonly: true })}</div></div>
      <div class="v6w-card-f" style="justify-content:flex-end"><span class="row" style="gap:6px"><button class="btn ghost sm" data-act="v6f-add" data-id="${x.id}">${ic('flag', 'sm')}${L('Agregar hallazgo', 'Add finding')}</button><button class="btn primary sm" data-act="v6x-edit" data-id="${x.id}">${ic('edit', 'sm')}${L('Editar', 'Edit')}</button></span></div></div>`;
  }
  function assetRow(a, x, reqs) {
    const r = reqs.find(q => q.key === 'asset:' + x.id); const fs = findingsOfAsset(a, x); const need = r && r.status === 'sin foto'; const mode = XO.get(x.id);
    return `<div class="v6w-arow ${mode ? 'open' : ''}" id="req-asset-${x.id}"><div class="v6w-asset"><button class="v6w-x" data-act="v6x-tg" data-id="${x.id}" aria-expanded="${!!mode}"><span class="v6w-id ${x.noTag ? 'notag' : ''}" title="${x.noTag ? L('Sin TAG en campo · identificador provisional', 'No field TAG · provisional identifier') : ''}">${h(x.tag)}</span>
      <span class="v6w-main"><b>${h(tx(x.name))}</b><small>${h(tx(x.type))}${x.sys ? ' · ' + h(C.nodeLbl(a, x.sys)) : ''}</small><span class="ir-chips">${U.prov(x.prov)}${U.mat(C.mat(a, 'asset', x))}${C.recProcs(x).length > 1 ? `<span class="pill vio">${L('Compartido · ', 'Shared · ')}${C.recProcs(x).length}</span>` : ''}</span></span></button>
      <span class="v6w-inds">${photoInd(a, 'asset', x.id, r, x.tag)}${findInd(fs, `data-a="${x.id}"`, x.tag)}</span>
      ${kebab('asset:' + x.id, x.tag, [mi(`data-act="v6x-edit" data-id="${x.id}"`, 'edit', L('Editar', 'Edit')), mi(`data-act="del-asset" data-id="${x.id}"`, 'x', L('Borrar', 'Delete'), 'danger')])}</div>
      ${mode ? assetCard(a, x, mode) : ''}</div>`;
  }
  A['v6x-tg'] = el => { const id = el.dataset.id; if (XO.has(id)) XO.delete(id); else XO.set(id, 'view'); R(); };
  A['v6x-edit'] = el => { const a = C.cur(); const x = C.asset(a, el.dataset.id); if (x) C.recProcs(x).forEach(pk => OPEN.set('a:' + pk + ':' + x.area, true)); XO.set(el.dataset.id, 'edit'); R(); setTimeout(() => { const t = document.getElementById('v6x-tag-' + el.dataset.id); if (t) t.closest('.v6w-arow').scrollIntoView({ block: 'nearest' }); }, 0); };
  A['v6x-cancel'] = el => { NEWF.delete(el.dataset.id); XO.set(el.dataset.id, 'view'); R(); };
  A['v6x-save'] = el => {
    const a = C.cur(); const x = C.asset(a, el.dataset.id); if (!x) return; const g = f => ((document.getElementById(`v6x-${f}-${x.id}`) || {}).value || '').trim();
    let tag = g('tag').toUpperCase(); if (!tag) { tag = x.noTag ? x.tag : nextNoTag(a); x.noTag = true; } else if (tag !== x.tag) x.noTag = /^SIN-TAG-/.test(tag);
    if (a.assets.some(y => y.id !== x.id && !C.isOut(y) && String(y.tag).toUpperCase() === tag)) return U.toast(L('Ya existe un activo con ese TAG', 'An asset with that TAG exists'));
    const prevLc = (x.lifecycle || {}).status;
    Object.assign(x, { tag, name: g('name') || tag, type: g('type'), family: g('family') || null, mfr: g('mfr'), model: g('model'), version: g('version'), support: g('support'), spares: g('spares'), redundancy: g('redundancy') });
    x.lifecycle = Object.assign({ status: 'unknown', source: '', consultedAt: null, reviewedBy: null }, x.lifecycle || {}, { status: g('lc') || 'unknown', source: g('lcsrc') });
    if (x.lifecycle.status !== prevLc) { x.lifecycle.reviewedBy = C.S.userId; x.lifecycle.consultedAt = x.lifecycle.consultedAt || now().slice(0, 10); }
    saveFindings(a, x);
    C.recLog && C.recLog(x, 'Editó el activo en el recorrido', 'Edited the asset in the walkdown'); C.log(a, 'Editó el activo ' + tag, 'Edited asset ' + tag); C.save(); XO.set(x.id, 'view'); R(); U.toast(L('Activo guardado', 'Asset saved'));
  };
  function addAssetForm(a, ar, p) {
    const T = tpl(a); const procs = C.recProcs(ar);
    const sys = (T.systems || []).filter(s => s.procs.some(k => procs.includes(k)));
    const types = [...new Set(sys.flatMap(s => s.types || []))].filter(Boolean);
    const known = new Set(a.assets.filter(x => !C.isOut(x)).map(x => x.type));
    const opt = (v, l) => `<option value="${h(v)}">${h(l)}</option>`;
    const pick = `<select id="v6nx-pick-${ar.id}" data-v6pick="${ar.id}"><option value="">${L('Seleccione…', 'Select…')}</option>
      ${types.length ? `<optgroup label="${h(L('Típicos en ', 'Typical in ') + tx(p.name))}">${types.map(t => opt('t:' + t, tx(t) + (known.has(t) ? L(' · ya registrado', ' · already recorded') : ''))).join('')}</optgroup>` : ''}
      ${sys.length ? `<optgroup label="${h(L('Sistemas del catálogo', 'Catalog systems'))}">${sys.map(s => opt('s:' + s.id, s.id + ' · ' + tx(s.name))).join('')}</optgroup>` : ''}
      <option value="__other">${L('Otro (escribir uno nuevo)', 'Other (enter a new one)')}</option></select>`;
    if (!U.openKeys.has('aa-' + ar.id)) return '';
    return `<div class="v6w-form"><div class="v6w-form-h"><b>${L('Agregar activo en ', 'Add asset in ') + h(tx(ar.name))}</b><button class="btn ghost sm" data-act="v6w-cancel" data-k="aa-${ar.id}">${L('Cancelar', 'Cancel')}</button></div><div class="v6w-addf">
      <div class="field"><label for="v6nx-pick-${ar.id}">${L('Qué agregar (catálogo)', 'What to add (catalog)')}</label>${pick}</div>
      <div class="grid3"><div class="field"><label for="nx-type-${ar.id}">${L('Tipo', 'Type')}</label><select id="nx-type-${ar.id}">${D.ASSET_TYPES.map(t => U.opt(t, tx(t))).join('')}</select></div>
        <div class="field"><label for="nx-tag-${ar.id}">TAG <span class="small mut">${L('(si lo tiene)', '(if available)')}</span></label><input id="nx-tag-${ar.id}" placeholder="${L('p. ej. P-101A · vacío si no tiene placa', 'e.g. P-101A · empty if no tag plate')}"></div>
        <div class="field"><label for="nx-ver-${ar.id}">${L('Fuente de la validación', 'Validation source')}</label><select id="nx-ver-${ar.id}">${['campo', 'documento', 'entrevista'].map(t => U.opt(t, C.provName(t))).join('')}</select></div></div>
      <div class="field"><label for="nx-name-${ar.id}">${L('Descripción', 'Description')} <span class="v6-req">*</span></label><input id="nx-name-${ar.id}" placeholder="${L('p. ej. Bomba principal A del lado norte', 'e.g. Main pump A, north side')}"></div>
      <div class="row" style="justify-content:flex-end"><button class="btn primary sm" data-act="add-asset" data-area="${ar.id}">${L('Registrar activo', 'Record asset')}</button></div>
      <p class="hint">${L('La lista muestra lo típico del catálogo para este proceso; al elegirlo se precargan tipo y descripción. Si el equipo no tiene TAG, déjelo vacío: se asigna un identificador provisional «SIN-TAG» que puede corregir después.', 'The list shows catalog items typical for this process; choosing one pre-fills type and description. If the equipment has no TAG, leave it empty: a provisional “SIN-TAG” identifier is assigned that you can correct later.')}</p></div>`;
  }
  function areaBlock(a, ar, p, reqs) {
    const list = a.assets.filter(x => x.area === ar.id && !C.isOut(x)); const r = reqs.find(q => q.key === 'area:' + ar.id); const fs = findingsOfArea(a, ar);
    const k = 'a:' + p.key + ':' + ar.id, open = isOpen(k, false);
    const withPh = list.filter(x => photosOf(a, 'asset', x.id).length).length;
    const role = (ar.roles && ar.roles[p.key]) || ((ar.procs || []).find(q => (q.proc || q) === p.key) || {}).role || '';
    return `<div class="v6w-area ${open ? 'open' : ''}" id="req-area-${ar.id}">
      <div class="v6w-ah"><button class="v6w-tg" data-act="v6w-tg" data-k="${k}" aria-expanded="${open}"><span class="v6w-caret">${ic('chev', 'sm')}</span><span class="v6w-id">${h(areaId(ar))}</span><span class="v6w-main"><b>${h(tx(ar.name))}</b><small>${list.length} ${L('activos', 'assets')} · ${withPh}/${list.length} ${L('con foto', 'with photo')}${role ? ' · ' + h(tx(role)) : ''}</small></span></button>
        ${C.mat(a, 'area', ar) === 'sugerido' ? U.mat('sugerido') : ''}<span class="v6w-inds">${photoInd(a, 'area', ar.id, r, tx(ar.name))}${findInd(fs, `data-ar="${ar.id}"`, tx(ar.name))}</span>
        ${kebab('area:' + ar.id + ':' + p.key, tx(ar.name), [mi(`data-act="v6w-add" data-k="aa-${ar.id}" data-open="${k}"`, 'plus', L('Agregar activo', 'Add asset')), mi(`data-act="iv-edit" data-k="area" data-id="${ar.id}"`, 'edit', L('Editar', 'Edit')), mi(`data-act="v6w-del-area" data-id="${ar.id}"`, 'x', L('Borrar', 'Delete'), 'danger')])}</div>
      ${open ? `<div class="v6w-assets">${list.map(x => assetRow(a, x, reqs)).join('') || `<p class="small mut" style="padding:10px 14px">${L('Sin activos en esta área.', 'No assets in this area.')}</p>`}<div class="v6w-addwrap">${addAssetForm(a, ar, p)}</div></div>` : ''}</div>`;
  }
  function addAreaForm(a, p) {
    const T = tpl(a); const have = new Set(a.areas.filter(x => !C.isOut(x)).map(x => x.cat0 || x.catId || '').filter(Boolean));
    const cands = (T.areas || []).filter(x => x.procs.includes(p.key) && !have.has(x.id));
    if (!U.openKeys.has('na-' + p.key)) return '';
    return `<div class="v6w-form"><div class="v6w-form-h"><b>${L('Agregar área en ', 'Add area in ') + h(tx(p.name))}</b><button class="btn ghost sm" data-act="v6w-cancel" data-k="na-${p.key}">${L('Cancelar', 'Cancel')}</button></div><div class="row"><div class="field" style="flex:1;min-width:220px"><label for="v6na-pick-${p.key}">${L('Área', 'Area')}</label><select id="v6na-pick-${p.key}" data-v6apick="${p.key}"><option value="">${L('Seleccione…', 'Select…')}</option>${cands.length ? `<optgroup label="${h(L('Catálogo para ', 'Catalog for ') + tx(p.name))}">${cands.map(x => `<option value="${h(x.id)}">${h(x.id + ' · ' + tx(x.name))}</option>`).join('')}</optgroup>` : ''}<option value="__other">${L('Otra (escribir una nueva)', 'Other (enter a new one)')}</option></select></div>
      <div class="field" id="v6na-ow-${p.key}" style="flex:1;min-width:200px" hidden><label for="na-name-${p.key}">${L('Nombre del área', 'Area name')}</label><input id="na-name-${p.key}" placeholder="${L('p. ej. Casa de bombas', 'e.g. Pump house')}"></div>
      <button class="btn primary sm" data-act="v6w-add-area" data-proc="${p.key}" style="align-self:flex-end">${L('Agregar', 'Add')}</button></div></div>`;
  }
  function hierarchy(a, ev) {
    const reqs = ev.reqs;
    return `<div class="v6w-bar"><span class="small mut">${L('Proceso › Área › Activo. Abra cada nivel para registrar fotos, hallazgos y activos.', 'Process › Area › Asset. Open each level to record photos, findings and assets.')}</span><span class="row" style="gap:6px"><button class="btn ghost sm" data-act="v6w-all" data-v="1">${L('Expandir todo', 'Expand all')}</button><button class="btn ghost sm" data-act="v6w-all" data-v="0">${L('Colapsar todo', 'Collapse all')}</button></span></div>` +
      C.included(a).map(p => {
        const ars = a.areas.filter(x => C.recProcs(x).includes(p.key) && !C.isOut(x)); const nA = a.assets.filter(x => C.assetProcs(x).includes(p.key) && !C.isOut(x));
        const k = 'p:' + p.key, open = isOpen(k, true); const fs = a.findings.filter(f => f.proc === p.key || (f.assets || []).some(y => nA.some(x => x.id === y)));
        return `<section class="v6w-proc ${open ? 'open' : ''}"><div class="v6w-ph-h"><button class="v6w-tg" data-act="v6w-tg" data-k="${k}" aria-expanded="${open}"><span class="v6w-caret">${ic('chev', 'sm')}</span><span class="v6-pc-id">${h(p.catId || p.key)}</span><span class="v6w-main"><b>${h(tx(p.name))}</b><small>${ars.length} ${L('áreas', 'areas')} · ${nA.length} ${L('activos', 'assets')} · ${fs.length} ${L('hallazgos', 'findings')}</small></span></button><span class="lv ${{ Alta: 'alto', Media: 'medio', Baja: 'bajo' }[p.crit] || 'pend'}">${L('Criticidad ', 'Criticality ')}${h(tx(p.crit || '—'))}</span>${kebab('proc:' + p.key, tx(p.name), [mi(`data-act="v6w-add" data-k="na-${p.key}" data-open="${k}"`, 'plus', L('Agregar área', 'Add area')), mi(`data-act="finding"`, 'flag', L('Agregar hallazgo', 'Add finding'))])}</div>
          ${open ? `<div class="v6w-areas">${ars.map(ar => areaBlock(a, ar, p, reqs)).join('') || `<div class="empty" style="margin:12px">${L('Aún no hay áreas en este proceso. Agregue la primera para empezar el recorrido.', 'No areas in this process yet. Add the first one to start the walkdown.')}</div>`}<div class="v6w-addwrap">${addAreaForm(a, p)}</div></div>` : ''}</section>`;
      }).join('');
  }
  const st3 = U.stage[3];
  U.stage[3] = function (a, ev) {
    const html = st3(a, ev);
    if ((C.S.ui.s3mode || 'list') === 'base') { const k = html.indexOf('<div class="wk-mode">'); const e = html.indexOf('</div></div>', k) + 12; return (k >= 0 ? html.slice(k, e) : '') + U.installedBase(a); } const i0 = html.indexOf('<div id="asset-form"'), i1 = html.indexOf('<section class="box" id="dep-form">');
    if (i0 < 0 || i1 < 0) return html;
    return html.slice(0, i0) + `<div id="asset-form" class="v6w">${hierarchy(a, ev)}</div>\n      ` + html.slice(i1);
  };
  A['v6w-menu'] = el => { MENU = MENU === el.dataset.k ? null : el.dataset.k; R(); setTimeout(() => { const f = document.querySelector('.v6w .v6-menu [role=menuitem]'); if (f) f.focus(); }, 0); };
  A['v6w-add'] = el => { MENU = null; U.openKeys.add(el.dataset.k); OPEN.set(el.dataset.open, true); R(); setTimeout(() => { const f = document.querySelector('.v6w-form select, .v6w-form input'); if (f) { f.scrollIntoView({ block: 'center' }); f.focus(); } }, 0); };
  A['v6w-cancel'] = el => { U.openKeys.delete(el.dataset.k); R(); };
  document.addEventListener('click', e => { if (!MENU) return; const it = e.target.closest('.v6w .v6-menu [role=menuitem]'); if (it || !e.target.closest('.v6w .v6-kebab')) { MENU = null; setTimeout(R, 0); } }, true);
  document.addEventListener('keydown', e => { if (MENU && e.key === 'Escape') { MENU = null; R(); } });
  // TAG opcional: si no tiene, se asigna un identificador provisional
  const nextNoTag = a => { let n = 1; while (a.assets.some(y => String(y.tag).toUpperCase() === 'SIN-TAG-' + String(n).padStart(2, '0'))) n++; return 'SIN-TAG-' + String(n).padStart(2, '0'); };
  const addA0 = A['add-asset'];
  A['add-asset'] = el => { const a = C.cur(); const k = '-' + el.dataset.area; const tg = document.getElementById('nx-tag' + k), nm = document.getElementById('nx-name' + k);
    if (tg && !tg.value.trim()) { if (!nm || !nm.value.trim()) return U.toast(L('Sin TAG, escriba al menos la descripción', 'Without a TAG, enter at least the description')); tg.value = nextNoTag(a); const n0 = a.assets.length; addA0(el); if (a.assets.length > n0) { a.assets[a.assets.length - 1].noTag = true; C.save(); R(); } return; }
    addA0(el); };
  U.modals.v6wdelar = function (a, d) { const ar = C.area(a, d.id); const as = a.assets.filter(x => x.area === ar.id && !C.isOut(x));
    return { title: L('Borrar área ', 'Delete area ') + tx(ar.name), body: as.length ? `<p>${L('No se puede borrar: el área tiene activos registrados.', 'Cannot delete: the area has recorded assets.')}</p><div class="v6-chips">${as.map(x => `<span class="v6-tag">${h(x.tag)}</span>`).join('')}</div><p class="hint">${L('Muévalos a otra área o bórrelos primero.', 'Move them to another area or delete them first.')}</p>` : `<p>${L('Se borrará el área «', 'The area “')}${h(tx(ar.name))}${L('» de este assessment. Sus fotos y documentos se conservan sin ese vínculo.', '” will be deleted from this assessment. Its photos and documents are kept without that link.')}</p>`,
      foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button>${as.length ? '' : `<button class="btn danger" data-act="v6w-del-area-ok" data-id="${ar.id}">${L('Borrar', 'Delete')}</button>`}` }; };
  A['v6w-del-area'] = el => U.openModal('v6wdelar', { id: el.dataset.id });
  A['v6w-del-area-ok'] = el => { const a = C.cur(); const ar = C.area(a, el.dataset.id); if (!ar || a.assets.some(x => x.area === ar.id && !C.isOut(x))) return; a.areas = a.areas.filter(x => x.id !== ar.id); [...a.photos, ...(a.docs || [])].forEach(p => { if (p.links && p.links.area === ar.id) delete p.links.area; }); C.log(a, 'Borró el área ' + tx(ar.name), 'Deleted area ' + tx(ar.name)); C.save(); U.closeModal(); R(); };
  A['v6w-tg'] = el => { const k = el.dataset.k; const def = k.startsWith('p:'); OPEN.set(k, !isOpen(k, def)); R(); };
  A['v6w-all'] = el => { const a = C.cur(), v = el.dataset.v === '1'; C.included(a).forEach(p => { OPEN.set('p:' + p.key, true); a.areas.filter(x => C.recProcs(x).includes(p.key)).forEach(ar => OPEN.set('a:' + p.key + ':' + ar.id, v)); }); R(); };
  // al ir a un activo o área desde «pendientes», abrir su nivel
  const goTo0 = U.goTo;
  U.goTo = function (stage, target) { const m = /^req-(asset|area)-(.+)$/.exec(target || ''); const a = C.cur();
    if (stage === 3 && m && a) { const ar = m[1] === 'area' ? C.area(a, m[2]) : (C.asset(a, m[2]) && C.area(a, C.asset(a, m[2]).area)); if (ar) C.recProcs(ar).forEach(pk => { OPEN.set('p:' + pk, true); OPEN.set('a:' + pk + ':' + ar.id, true); }); }
    return goTo0(stage, target); };
  // elegir del catálogo precarga tipo y descripción
  document.addEventListener('change', e => {
    const t = e.target, ar = t.dataset && t.dataset.v6pick, pk = t.dataset && t.dataset.v6apick;
    if (ar) { const a = C.cur(); const v = t.value; const nm = document.getElementById('nx-name-' + ar), ty = document.getElementById('nx-type-' + ar), tg = document.getElementById('nx-tag-' + ar);
      if (v.startsWith('t:')) { const tt = v.slice(2); if (ty && [...ty.options].some(o => o.value === tt)) ty.value = tt; if (nm && !nm.value) nm.value = tx(tt); }
      else if (v.startsWith('s:')) { const s = (tpl(a).systems || []).find(x => x.id === v.slice(2)); if (s && nm) nm.value = tx(s.name); }
      if (tg) tg.focus(); }
    if (pk) { const w = document.getElementById('v6na-ow-' + pk); if (w) { w.hidden = t.value !== '__other'; if (!w.hidden) document.getElementById('na-name-' + pk).focus(); } }
  });
  A['v6w-add-area'] = el => {
    const a = C.cur(), pk = el.dataset.proc; const v = (document.getElementById('v6na-pick-' + pk) || {}).value || '';
    if (!v) return U.toast(L('Seleccione un área o «Otra»', 'Select an area or “Other”'));
    if (v !== '__other') { const src = (tpl(a).areas || []).find(x => x.id === v); if (!src) return; const inp = document.getElementById('na-name-' + pk); if (inp) inp.value = tx(src.name); }
    const n0 = a.areas.length; A['add-area']({ dataset: { proc: pk } });
    if (a.areas.length > n0) { const ar = a.areas[a.areas.length - 1]; if (v !== '__other') { ar.cat0 = v; ar.prov = 'catalogo'; ar.roles = { [pk]: ((tpl(a).areas || []).find(x => x.id === v) || {}).roles?.[pk] || '' }; } OPEN.set('p:' + pk, true); OPEN.set('a:' + pk + ':' + ar.id, true); C.save(); R(); }
  };
  // modal de hallazgos de un activo o área
  U.modals.v6wfnd = function (a, d) {
    const x = d.a ? C.asset(a, d.a) : null, ar = d.ar ? C.area(a, d.ar) : null; const list = x ? findingsOfAsset(a, x) : ar ? findingsOfArea(a, ar) : [];
    const label = x ? x.tag + ' · ' + tx(x.name) : ar ? tx(ar.name) : '';
    return { title: L('Hallazgos · ', 'Findings · ') + label, wide: true, body: `<div class="v6w-flist">${list.map(f => `<div class="v6w-fi"><span class="v6w-id">${f.id}</span><div class="v6w-main"><b>${h(tx(f.title))}</b>${f.desc ? `<small>${h(tx(f.desc))}</small>` : ''}<div class="ir-chips">${f.status ? `<span class="pill ${f.status === 'confirmado' ? 'ok' : 'warn'}">${h(tx(f.status))}</span>` : ''}${f.level ? `<span class="v6-tag">${h(tx(f.level))}</span>` : ''}${(f.assets || []).map(y => `<span class="v6-tag">${h(C.assetLbl(a, y))}</span>`).join('')}</div></div><button class="btn ghost sm" data-act="trace-open" data-key="finding:${f.id}">${ic('link', 'sm')}${L('Trazabilidad', 'Traceability')}</button></div>`).join('') || `<p class="small mut">${L('Sin hallazgos.', 'No findings.')}</p>`}</div>`,
      foot: `<button class="btn ghost" data-act="modal-close">${L('Cerrar', 'Close')}</button><button class="btn primary" data-act="v6w-fnd-new" ${x ? `data-asset="${x.id}"` : ''}>${ic('flag', 'sm')}${L('Nuevo hallazgo', 'New finding')}</button>` };
  };
  A['v6w-fnd'] = el => U.openModal('v6wfnd', { a: el.dataset.a || '', ar: el.dataset.ar || '' });
  A['v6w-fnd-new'] = el => { U.closeModal(); A.finding({ dataset: { asset: el.dataset.asset || null } }); };

  // guarda lo editado del formulario y vuelve a él después de la foto o la justificación
  const stash = () => { const v = {}; document.querySelectorAll('[id^="rc-"]').forEach(el => { v[el.id] = el.type === 'checkbox' ? el.checked : el.multiple ? [...el.selectedOptions].map(o => o.value) : el.value; }); document.querySelectorAll('.modal input[type=checkbox]').forEach((el, i) => { if (!el.id) v['__cb' + i] = el.checked; }); return v; };
  const restore = v => { Object.entries(v).forEach(([id, val]) => { if (id.startsWith('__cb')) { const el = document.querySelectorAll('.modal input[type=checkbox]')[+id.slice(4)]; if (el && !el.id) el.checked = val; return; } const el = document.getElementById(id); if (!el) return; if (el.type === 'checkbox') el.checked = val; else if (el.multiple) [...el.options].forEach(o => { o.selected = val.includes(o.value); }); else el.value = val; }); };
  let RET = null;
  const back = () => { if (!RET) return; const r = RET; RET = null; setTimeout(() => { U.openModal('rec', { k: r.k, id: r.id }); setTimeout(() => restore(r.draft), 0); }, 0); };
  A['v6r-cap'] = el => { const a = C.cur(); RET = { k: el.dataset.k, id: el.dataset.id, draft: stash(), fresh: true };
    A.capture({ dataset: { link: el.dataset.k + ':' + el.dataset.id } });
    const x = el.dataset.k === 'asset' ? C.asset(a, el.dataset.id) : C.area(a, el.dataset.id); const n = photosOf(a, el.dataset.k, el.dataset.id).length;
    U.cap = { title: (el.dataset.k === 'asset' ? x.tag + ' · ' + tx(x.name) : tx(x.name)) + (n ? ' (' + (n + 1) + ')' : ''), caption: '' }; U.renderModal(); };
  A['v6r-just'] = el => { RET = { k: el.dataset.k, id: el.dataset.id, draft: stash(), fresh: true }; A.justify({ dataset: { key: el.dataset.k + ':' + el.dataset.id } }); };
  // capturar desde el menú ⋮ también precarga el título
  const cap0 = A.capture;
  A.capture = el => { if (RET && !RET.fresh) RET = null; if (RET) RET.fresh = false; cap0(el); const l = el && el.dataset && el.dataset.link; const a = C.cur(); if (!l || !a || (U.cap && U.cap.title)) return; const [k, id] = l.split(':'); const x = k === 'asset' ? C.asset(a, id) : k === 'area' ? C.area(a, id) : null; if (x) { U.cap = Object.assign(U.cap || {}, { title: k === 'asset' ? x.tag + ' · ' + tx(x.name) : tx(x.name) }); U.renderModal(); } };
  const jus0 = A.justify; A.justify = el => { if (RET && !RET.fresh) RET = null; if (RET) RET.fresh = false; jus0(el); };
  ['cap-save', 'just-save'].forEach(n => { const f0 = A[n]; A[n] = async el => { const before = U.modal; const t = before && before.type; await f0(el); if (RET && (t === 'capture' || t === 'justify') && (!U.modal || U.modal !== before)) back(); }; });
  const close0 = A['modal-close']; A['modal-close'] = el => { const t = U.modal && U.modal.type; if (close0) close0(el); else U.closeModal(); if (RET && (t === 'capture' || t === 'justify')) back(); };
  R();
})();
