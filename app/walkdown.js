/* ORA — Fase 2: Guided OT Walkdown (etapa 3, modo guiado) */
(function () {
  const C = window.ORA, D = window.ORA_DATA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, ic = U.ic, L = I.L, tx = I.tx, A = U.act;
  const R = () => U.render();
  const KN = () => ({ area: L('Área', 'Area'), system: L('Sistema OT', 'OT system'), asset: L('Activo', 'Asset'), dep: L('Dependencia', 'Dependency') });
  const recs = (a, k) => k === 'asset' ? a.assets : k === 'system' ? a.systems : k === 'dep' ? a.deps : a.areas;
  const find = (a, k, id) => recs(a, k).find(x => x.id === id);
  const lbl = (a, k, x) => k === 'asset' ? x.tag + ' · ' + tx(x.name) : k === 'dep' ? C.nodeLbl(a, x.from) + (x.dir === 'bi' ? ' ↔ ' : ' → ') + C.nodeLbl(a, x.to) : tx(x.name);
  const wk = () => C.S.ui.wk || (C.S.ui.wk = { cur: '', only: true });

  // ---------- paradas del recorrido ----------
  C.walkStops = function (a) {
    const reqs = C.photoReqs(a); const out = []; const seen = new Set();
    const rank = { Alta: 0, Media: 1, Baja: 2 };
    const inc = C.included(a).slice().sort((x, y) => (rank[x.crit] ?? 3) - (rank[y.crit] ?? 3));
    const add = (k, x, p, ar) => {
      const key = k + ':' + x.id; if (seen.has(key)) return; seen.add(key);
      const m = C.mat(a, k, x); const rq = reqs.find(r => r.key === key);
      const why = [];
      if (m === 'sugerido') {
        if (x.prov === 'catalogo') why.push(L(`Propuesto por el catálogo ${C.indName(a.catalog.ind)} v${(x.src || {}).version || a.catalog.version}: confirme que existe en la instalación.`, `Proposed by the ${C.indName(a.catalog.ind)} v${(x.src || {}).version || a.catalog.version} catalog: confirm it exists at the facility.`));
        else if (x.prov === 'excel') why.push(x.val && x.val.reason ? L('Actualizado por importación: requiere revalidación en campo.', 'Updated by import: needs field revalidation.') : L(`Importado de ${(x.src || {}).file} (fila ${(x.src || {}).row}): confirme en campo.`, `Imported from ${(x.src || {}).file} (row ${(x.src || {}).row}): confirm in the field.`));
        else if (x.prov === 'entrevista') why.push(L('Declarado en entrevista: verifique en sitio.', 'Stated in an interview: verify on site.'));
        else why.push(L('Sin validar: confirme, corrija o descarte.', 'Not validated: confirm, correct or discard.'));
      }
      if (k === 'asset' && C.recProcs(x).length > 1) why.push(L(`Soporta ${C.recProcs(x).length} procesos: confirme que es un solo equipo compartido.`, `Supports ${C.recProcs(x).length} processes: confirm it is a single shared item.`));
      if (k === 'asset' && C.sharedControllers(a).some(s => s.plc.id === x.id)) why.push(L('Dependencia común: varios equipos dependen de este control.', 'Common dependency: several items depend on this control.'));
      if (rq && rq.status === 'sin foto') why.push(L('Falta evidencia fotográfica sugerida por la guía de cobertura.', 'Evidence photo suggested by the coverage guide is missing.'));
      if (rq && rq.status === 'justificada') why.push(L('Foto faltante justificada: queda visible para revisión.', 'Missing photo justified: kept visible for review.'));
      const pend = m === 'sugerido' || (rq && rq.status === 'sin foto');
      out.push({ key, k, id: x.id, proc: p ? p.key : null, area: ar ? ar.id : (x.area || null), m, rq, why, pend });
    };
    inc.forEach(p => {
      const areas = a.areas.filter(ar => !C.isOut(ar) && C.recProcs(ar).includes(p.key));
      areas.forEach(ar => {
        add('area', ar, p, ar);
        a.assets.filter(x => !C.isOut(x) && x.area === ar.id && C.assetProcs(x).includes(p.key)).forEach(x => add('asset', x, p, ar));
      });
      a.assets.filter(x => !C.isOut(x) && C.assetProcs(x).includes(p.key) && !a.areas.some(ar => ar.id === x.area)).forEach(x => add('asset', x, p, null));
      a.systems.filter(s => !C.isOut(s) && C.recProcs(s).includes(p.key)).forEach(s => add('system', s, p, null));
      const ids = new Set([...a.assets.filter(x => C.assetProcs(x).includes(p.key)).map(x => x.id), ...a.systems.filter(s => C.recProcs(s).includes(p.key)).map(s => s.id)]);
      a.deps.filter(d => !C.isOut(d) && (ids.has(d.from) || ids.has(d.to))).forEach(d => add('dep', d, p, null));
    });
    return out;
  };

  // ---------- documentos de campo (blob en IndexedDB, metadatos en el assessment) ----------
  A['wk-doc'] = el => U.openModal('wkdoc', { k: el.dataset.k, id: el.dataset.id });
  U.onDocFile = input => { const f = input.files && input.files[0]; if (!f) return; if (f.size > 10 * 1024 * 1024) { U.toast(L('Máximo 10 MB por documento en este prototipo', 'Up to 10 MB per document in this prototype')); input.value = ''; return; } U.docFile = f; const n = document.getElementById('dc-name'); if (n && !n.value) n.value = f.name; const s = document.getElementById('dc-size'); if (s) s.textContent = f.name + ' · ' + (f.size / 1024).toFixed(0) + ' KB'; };
  A['wk-doc-save'] = async el => {
    const a = C.cur(); const f = U.docFile; const name = (document.getElementById('dc-name').value || '').trim();
    if (!f) return U.toast(L('Seleccione un archivo', 'Choose a file')); if (!name) return U.toast(L('Agregue un nombre', 'Add a name'));
    const id = C.uid('DOC'); await C.putPhoto(id, f); C.registerURL(id, f);
    (a.docs = a.docs || []).push({ id, name, file: f.name, size: f.size, type: f.type, links: { [el.dataset.k]: el.dataset.id }, by: C.S.userId, ts: new Date().toISOString() });
    const x = find(a, el.dataset.k, el.dataset.id); C.recLog(x, 'Adjuntó el documento «' + name + '»', 'Attached document “' + name + '”'); C.log(a, 'Adjuntó el documento «' + name + '»', 'Attached document “' + name + '”');
    U.docFile = null; U.closeModal(); C.save(); R(); U.toast(L('Documento vinculado a ', 'Document linked to ') + lbl(a, el.dataset.k, x));
  };
  A['wk-doc-open'] = async el => { const a = C.cur(); const d = (a.docs || []).find(x => x.id === el.dataset.id); const b = await C.getBlob({ id: d.id, src: 'idb:' + d.id }); if (!b) return U.toast(L('El archivo no está disponible en este navegador', 'The file is not available in this browser')); U.save ? U.save(d.file, b) : null; };

  // ---------- notas de campo ----------
  A['wk-note'] = el => { const a = C.cur(); const t = document.getElementById('wk-note'); const v = (t.value || '').trim(); if (!v) return U.toast(L('Escriba la nota', 'Write the note')); const x = find(a, el.dataset.k, el.dataset.id); (x.notes = x.notes || []).unshift({ text: v, by: C.S.userId, ts: new Date().toISOString() }); C.recLog(x, 'Agregó una nota de campo', 'Added a field note'); C.save(); R(); U.toast(L('Nota guardada', 'Note saved')); };

  // ---------- acciones del recorrido ----------
  const advance = (a, fromKey) => { const st = C.walkStops(a); const i = st.findIndex(s => s.key === fromKey); const nx = st.slice(i + 1).find(s => s.pend) || st.find(s => s.pend); wk().cur = nx ? nx.key : fromKey; };
  A['wk-go'] = el => { wk().cur = el.dataset.key; U.closeModal(); C.save(); R(); const m = document.querySelector('.main'); if (m) m.scrollTop = 0; };
  A['wk-step'] = el => { const a = C.cur(); const st = C.walkStops(a); const vis = wk().only ? st.filter(s => s.pend || s.key === wk().cur) : st; const i = vis.findIndex(s => s.key === wk().cur); const n = vis[Math.min(vis.length - 1, Math.max(0, i + (+el.dataset.d)))]; if (n) wk().cur = n.key; C.save(); R(); const m = document.querySelector('.main'); if (m) m.scrollTop = 0; };
  A['wk-only'] = () => { wk().only = !wk().only; C.save(); R(); };
  A['wk-list'] = () => U.openModal('wklist', {});
  A['wk-confirm'] = el => {
    const a = C.cur(); const k = el.dataset.k; const x = find(a, k, el.dataset.id); const key = k + ':' + x.id;
    C.setVal(a, k, x, 'validado', { src: 'campo', reason: L('Confirmado en el recorrido', 'Confirmed during the walkdown') });
    const st = C.walkStops(a).find(s => s.key === key); const still = st && st.rq && st.rq.status === 'sin foto';
    if (!still) advance(a, key);
    C.save(); R(); U.toast(L('Confirmado en campo', 'Confirmed in the field') + (still ? L(' · falta la foto sugerida', ' · suggested photo still missing') : ''));
  };
  A['wk-discard'] = el => U.openModal('decide', { k: el.dataset.k, id: el.dataset.id, m: 'descartado', walk: 1 });
  A['wk-correct'] = el => U.openModal('rec', { k: el.dataset.k, id: el.dataset.id, walk: 1 });
  A['wk-add'] = el => U.openModal('wkadd', { proc: el.dataset.proc, area: el.dataset.area, sys: el.dataset.sys || '' });
  A['wk-add-go'] = el => { const k = el.dataset.k; U.openModal('rec', { k, id: '', walk: 1, proc: el.dataset.proc, area: el.dataset.area, sys: el.dataset.sys, from: el.dataset.from }); };
  A['wk-mode'] = el => { C.S.ui.s3mode = el.dataset.m; C.save(); R(); };

  // ---------- vista guiada ----------
  U.walkView = function (a, ev) {
    const st = C.walkStops(a); const w = wk();
    if (!st.length) return `<div class="empty">${ic('map')}<b>${L('Sin elementos para recorrer', 'Nothing to walk yet')}</b><span>${L('Aplique las sugerencias del catálogo o importe un inventario; también puede agregar hallazgos de campo.', 'Apply catalog suggestions or import an inventory; you can also add field discoveries.')}</span><div class="row"><button class="btn primary sm" data-act="nav" data-view="inventory">${L('Ir a Inventario OT', 'Go to OT inventory')}</button></div></div>`;
    let cur = st.find(s => s.key === w.cur); if (!cur) { cur = st.find(s => s.pend) || st[0]; w.cur = cur.key; }
    const pend = st.filter(s => s.pend).length; const vis = w.only ? st.filter(s => s.pend || s.key === cur.key) : st; const pos = vis.findIndex(s => s.key === cur.key);
    const x = find(a, cur.k, cur.id); const p = cur.proc && a.processes.find(q => q.key === cur.proc); const ar = cur.area && C.area(a, cur.area);
    const m = C.mat(a, cur.k, x); const out = m === 'descartado';
    const deps = cur.k === 'dep' ? [] : a.deps.filter(d => !C.isOut(d) && (d.from === x.id || d.to === x.id));
    const kids = cur.k === 'area' ? a.assets.filter(y => !C.isOut(y) && y.area === x.id) : cur.k === 'system' ? a.assets.filter(y => !C.isOut(y) && y.sys === x.id) : [];
    const linkKey = cur.k; const photos = a.photos.filter(ph => C.lk ? C.lk(ph, linkKey, x.id) : ph.links && ph.links[linkKey] === x.id);
    const docs = (a.docs || []).filter(d => d.links && d.links[linkKey] === x.id);
    const finds = cur.k === 'asset' ? a.findings.filter(f => f.assets.includes(x.id)) : [];
    const rq = cur.rq;
    const big = (act, icon, label, cls, extra) => `<button class="wk-btn ${cls || ''}" data-act="${act}" data-k="${cur.k}" data-id="${x.id}" ${extra || ''}>${ic(icon)}<span>${label}</span></button>`;
    const capLink = cur.k === 'dep' ? `dep:${x.id}` : `${cur.k}:${x.id}`;
    const actions = `<div class="wk-actions" role="group" aria-label="${L('Acciones de campo', 'Field actions')}">
      ${out ? big('iv-reopen', 'reset', L('Reabrir', 'Reopen'), '') : big('wk-confirm', 'check', L('Confirmar', 'Confirm'), 'ok', m !== 'sugerido' ? 'aria-pressed="true"' : '')}
      ${out ? '' : big('wk-discard', 'x', L('Descartar', 'Discard'), 'err')}
      ${big('wk-correct', 'edit', L('Corregir', 'Correct'), '')}
      <button class="wk-btn" data-act="wk-add" data-proc="${cur.proc || ''}" data-area="${cur.area || ''}" data-sys="${cur.k === 'system' ? x.id : ''}">${ic('plus')}<span>${L('Agregar', 'Add')}</span></button>
      <button class="wk-btn pri" data-act="capture" data-link="${capLink}">${ic('camera')}<span>${L('Evidencia', 'Evidence')}</span></button>
      <button class="wk-btn" data-act="finding" data-asset="${cur.k === 'asset' ? x.id : ''}">${ic('flag')}<span>${L('Hallazgo', 'Finding')}</span></button></div>`;
    const crumbs = [p ? tx(p.name) : '', ar && cur.k !== 'area' ? tx(ar.name) : ''].filter(Boolean).join(' › ');
    const thumbs = photos.map(ph => `<button class="wk-th" data-act="lightbox" data-id="${ph.id}" aria-label="${h(tx(ph.title))}"><img src="${C.photoURL(ph)}" alt=""></button>`).join('');
    const depRow = d => { const dm = C.mat(a, 'dep', d); return `<div class="wk-dep"><div><b>${h(C.nodeLbl(a, d.from))} ${d.dir === 'bi' ? '↔' : '→'} ${h(C.nodeLbl(a, d.to))}</b><small>${h(C.depName(d.type))}${d.note ? ' · ' + h(tx(d.note)) : ''}</small></div>${U.mat(dm)}<button class="btn ghost sm" data-act="wk-go" data-key="dep:${d.id}">${L('Revisar', 'Review')}</button></div>`; };
    const card = `<article class="wk-card ${out ? 'off' : ''}" id="wk-${cur.key.replace(':', '-')}">
      <div class="wk-head"><div><span class="wk-crumb">${h(crumbs)}</span><span class="pill">${KN()[cur.k]}</span><h3>${h(lbl(a, cur.k, x))}</h3>${cur.k === 'asset' ? `<small class="mut">${h(tx(x.type))}${x.mm ? ' · ' + h(x.mm) : ''}${x.sys ? ' · ' + h(C.nodeLbl(a, x.sys)) : ''}</small>` : ''}</div><div class="ir-st">${U.prov(x.prov)}${U.mat(m)}<button class="plink" data-act="jr-open" data-key="${cur.key}">${ic('map', 'sm')}Risk Journey</button></div></div>
      ${cur.k !== 'dep' ? `<div class="ir-chips">${U.procChips(a, x)}</div>` : ''}
      <div class="wk-why"><b>${L('Por qué revisarlo', 'Why review it')}</b>${cur.why.length ? `<ul>${cur.why.map(t => `<li>${h(t)}</li>`).join('')}</ul>` : `<p class="small mut">${L('Validado. Puede agregar evidencia, notas o hallazgos si lo ve necesario.', 'Validated. You can add evidence, notes or findings if needed.')}</p>`}</div>
      ${actions}
      <div class="wk-ev"><div class="wk-ev-h"><b>${L('Evidencia', 'Evidence')}</b>${rq ? U.phState(rq.status) : `<span class="small mut">${L('Foto opcional para este elemento', 'Photo optional for this item')}</span>`}</div>
        ${rq && rq.status === 'sin foto' ? `<div class="row"><button class="btn soft sm" data-act="capture" data-link="${capLink}">${ic('camera', 'sm')}${L('Tomar foto', 'Take photo')}</button><button class="btn ghost sm" data-act="justify" data-key="${cur.key}">${L('Omitir y justificar', 'Skip and justify')}</button></div>` : ''}
        ${rq && rq.res && rq.status !== 'capturada' ? `<p class="small mut">“${h(tx(rq.res.note))}”</p>` : ''}
        ${thumbs ? `<div class="wk-ths">${thumbs}</div>` : ''}
        ${docs.length ? `<ul class="plain small">${docs.map(d => `<li><button class="plink" data-act="wk-doc-open" data-id="${d.id}">${ic('doc', 'sm')}${h(d.name)}</button> · ${h(C.uname(d.by))} · ${C.fmtDate(d.ts, true)}</li>`).join('')}</ul>` : ''}
        ${finds.length ? `<ul class="plain small">${finds.map(f => `<li>${ic('flag', 'sm')}<b>${f.id}</b> · ${h(tx(f.title))}</li>`).join('')}</ul>` : ''}
        <div class="row"><button class="btn ghost sm" data-act="wk-doc" data-k="${cur.k}" data-id="${x.id}">${ic('doc', 'sm')}${L('Adjuntar documento', 'Attach document')}</button></div></div>
      ${kids.length ? `<div class="wk-sub"><b>${cur.k === 'area' ? L('Activos en esta área', 'Assets in this area') : L('Activos de este sistema', 'Assets of this system')}</b>${kids.map(y => `<button class="wk-kid" data-act="wk-go" data-key="asset:${y.id}"><span><b>${h(y.tag)}</b> ${h(tx(y.name))}</span>${U.mat(C.mat(a, 'asset', y))}</button>`).join('')}</div>` : ''}
      ${deps.length ? `<div class="wk-sub"><b>${L('Dependencias', 'Dependencies')}</b>${deps.map(depRow).join('')}</div>` : ''}
      <div class="wk-sub"><label for="wk-note"><b>${L('Nota de campo', 'Field note')}</b></label><div class="row"><textarea id="wk-note" rows="2" style="flex:1;min-width:200px" placeholder="${L('Lo observado, condición, placa, contacto…', 'What you saw, condition, nameplate, contact…')}"></textarea><button class="btn ghost sm" data-act="wk-note" data-k="${cur.k}" data-id="${x.id}" style="align-self:flex-end">${L('Guardar nota', 'Save note')}</button></div>
        ${(x.notes || []).length ? `<ul class="plain small">${x.notes.slice(0, 4).map(n => `<li>${h(n.text)} <span class="mut">· ${h(C.uname(n.by))} · ${C.fmtDate(n.ts, true)}</span></li>`).join('')}</ul>` : ''}</div>
      ${U.dt('wk-log-' + x.id, L('Trazabilidad', 'Traceability'), `${U.srcLine(a, x)}<ul class="plain small">${(x.log || []).slice(0, 10).map(l => `<li>${C.fmtDate(l.ts, true)} · ${h(C.uname(l.by) || l.by || '')} · ${h(L(l.es, l.en))}</li>`).join('') || `<li class="mut">${L('Sin cambios registrados', 'No changes recorded')}</li>`}</ul>`)}
    </article>`;
    const done = st.length - pend;
    return `<div class="wk-top"><div class="wk-prog"><b>${L('Recorrido guiado', 'Guided walkdown')}</b><span>${done}/${st.length} ${L('verificados', 'verified')} · ${pend} ${L('pendientes', 'pending')}</span><div class="sbar"><i style="width:${Math.round(done / st.length * 100)}%"></i></div></div>
      <div class="row"><button class="btn ghost sm" data-act="wk-only" aria-pressed="${!!w.only}">${w.only ? L('Solo pendientes', 'Pending only') : L('Todos', 'All')}</button><button class="btn ghost sm" data-act="wk-list">${ic('list', 'sm')}${L('Paradas', 'Stops')}</button></div></div>
      ${card}
      <div class="wk-nav"><button class="btn ghost" data-act="wk-step" data-d="-1" ${pos <= 0 ? 'disabled' : ''}>${ic('back')}${L('Anterior', 'Previous')}</button><span class="small mut">${pos + 1} / ${vis.length}</span><button class="btn primary" data-act="wk-step" data-d="1" ${pos >= vis.length - 1 ? 'disabled' : ''}>${L('Siguiente', 'Next')}${ic('chev')}</button></div>
      <p class="hint">${L('El recorrido valida lo sugerido sin dibujar la arquitectura. La madurez cambia solo con una decisión registrada (persona, fuente y fecha). Datos guardados en este navegador; sin modo sin conexión ni sincronización entre dispositivos.', 'The walkdown validates suggestions without drawing the architecture. Maturity changes only with a recorded decision (person, source and date). Data saved in this browser; no offline mode or cross-device sync.')}</p>`;
  };

  // ---------- modales ----------
  Object.assign(U.modals, {
    wklist(a) {
      const st = C.walkStops(a); const w = wk(); let html = '', lastP = '';
      st.forEach(s => { if (s.proc !== lastP) { lastP = s.proc; html += `<h4 class="wk-lh">${h(C.procName(a, s.proc))}</h4>`; } const x = find(a, s.k, s.id);
        html += `<button class="wk-li ${s.key === w.cur ? 'on' : ''} ${s.k === 'area' ? 'lvl0' : ''}" data-act="wk-go" data-key="${s.key}"><span class="dot ${s.pend ? 'p' : 'd'}" aria-hidden="true"></span><span><small>${KN()[s.k]}</small> ${h(lbl(a, s.k, x))}</span>${U.mat(s.m)}</button>`; });
      return { title: L('Paradas del recorrido', 'Walkdown stops'), drawer: true, body: html, foot: `<button class="btn primary" data-act="modal-close">${L('Cerrar', 'Close')}</button>` };
    },
    wkadd(a, d) {
      const opt = (k, icon, t, s) => `<button class="choice" data-act="wk-add-go" data-k="${k}" data-proc="${d.proc}" data-area="${d.area}" data-sys="${d.sys}">${ic(icon)}<span><b>${t}</b><span class="d">${s}</span></span></button>`;
      return { title: L('Agregar descubrimiento de campo', 'Add field discovery'), body: `<div class="roles">${opt('asset', 'plus', L('Activo', 'Asset'), L('Equipo encontrado en sitio que no estaba en el inventario', 'Item found on site that was not in the inventory'))}${opt('system', 'branch', L('Sistema OT', 'OT system'), L('Sistema de control, red, energía o datos', 'Control, network, power or data system'))}${opt('dep', 'link', L('Dependencia', 'Dependency'), L('De qué depende un activo o sistema para operar', 'What an asset or system needs to operate'))}${opt('area', 'map', L('Área', 'Area'), L('Zona física del proceso', 'Physical area of the process'))}</div><p class="hint">${L('Queda con procedencia «Campo», validado por usted, con fecha.', 'It gets “Field” provenance, validated by you, with date.')}</p>` };
    },
    wkdoc(a, d) {
      const x = find(a, d.k, d.id); U.docFile = null;
      return { title: L('Adjuntar documento · ', 'Attach document · ') + h(lbl(a, d.k, x)), body: `<div class="drop"><label class="btn primary sm" for="dc-file">${ic('down', 'sm')}${L('Elegir archivo', 'Choose file')}</label><input class="sr" type="file" id="dc-file" data-docfile="1"><span class="small mut" id="dc-size">${L('Plano, ficha técnica, diagrama, manual… Máximo 10 MB. Se guarda en este navegador.', 'Drawing, datasheet, diagram, manual… Up to 10 MB. Stored in this browser.')}</span></div><div class="field"><label for="dc-name">${L('Nombre', 'Name')} *</label><input id="dc-name"></div>`,
        foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button><button class="btn primary" data-act="wk-doc-save" data-k="${d.k}" data-id="${d.id}">${L('Vincular', 'Link')}</button>` };
    }
  });
  document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.docfile) U.onDocFile(e.target); });

  // ---------- etapa 3: modo guiado / lista ----------
  const list3 = U.stage[3];
  U.stage[3] = function (a, ev) {
    if (!C.included(a).length) return list3(a, ev);
    const mode = C.S.ui.s3mode || 'list'; const st = C.walkStops(a); const pend = st.filter(s => s.pend).length;
    const seg = `<div class="wk-mode"><div class="seg" role="group" aria-label="${L('Modo del recorrido', 'Walkdown mode')}"><button data-act="wk-mode" data-m="list" aria-pressed="${mode === 'list'}">${ic('list', 'sm')}${L('Por proceso y área', 'By process and area')}</button><button data-act="wk-mode" data-m="base" aria-pressed="${mode === 'base'}">${ic('steps', 'sm')}${L('Base instalada y ciclo de vida', 'Installed base and lifecycle')}</button></div></div>`;
    return seg + (mode === 'guided' ? U.walkView(a, ev) : list3(a, ev));
  };

  // ---------- ir al elemento exacto desde pendientes ----------
  const goTo0 = U.goTo;
  U.goTo = function (stage, target) {
    if (stage === 3 && (C.S.ui.s3mode || 'list') === 'guided') {
      const m = /^req-(asset|area)-(.+)$/.exec(target || '');
      if (m) wk().cur = m[1] + ':' + m[2]; else if (target) C.S.ui.s3mode = 'list';
    }
    return goTo0(stage, target);
  };

  // ---------- integración con modales de inventario ----------
  const recSave = A['iv-rec-save'];
  A['iv-rec-save'] = el => {
    const d = (U.modal && U.modal.data) || {}; const a = C.cur(); const before = new Set(recs(a, el.dataset.k).map(x => x.id));
    recSave(el);
    if (!d.walk || U.modal) return;
    const nx = recs(a, el.dataset.k).find(x => !before.has(x.id));
    if (nx) { nx.prov = 'campo'; if (nx.val && nx.val.status === 'validado') nx.val.src = 'campo'; C.recLog(nx, 'Descubierto en el recorrido', 'Discovered during the walkdown'); wk().cur = el.dataset.k + ':' + nx.id; C.save(); R(); U.toast(L('Agregado desde campo · agregue la evidencia', 'Added from the field · add the evidence')); }
  };
  const decSave = A['iv-decide-save'];
  A['iv-decide-save'] = el => { const d = (U.modal && U.modal.data) || {}; decSave(el); if (d.walk && !U.modal) { advance(C.cur(), el.dataset.k + ':' + el.dataset.id); C.save(); R(); } };
})();
