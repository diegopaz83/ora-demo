/* ORA v6 — tarjetas de proceso con ID, colapsables, vista de solo lectura y menú de acciones (editar, descartar, restaurar, borrar);
   y vista de lista ordenable en «Todos los assessments». */
(function () {
  const C = window.ORA, D = window.ORA_DATA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, ic = U.ic, L = I.L, tx = I.tx, A = U.act;
  const R = () => U.render();
  const EDIT = new Set(); const OPEN = new Map(); let MENU = null;
  const now = () => new Date().toISOString();
  const me = () => C.uname(C.S.userId);

  /* ---------- tarjetas de proceso (etapa 2) ---------- */
  const dispId = (a, p) => p.catId || p.id || ('PX-' + String(a.processes.filter(x => !x.catId && !x.id).indexOf(p) + 1).padStart(2, '0'));
  const incomplete = p => !p.status || !String(p.just || '').trim() || (p.status === 'incluido' && !p.crit);
  const modeOf = p => p.discarded ? 'discarded' : !p.status ? 'suggest' : (EDIT.has(p.key) || incomplete(p)) ? 'edit' : 'view';
  const isOpen = (p, m) => OPEN.has(p.key) ? OPEN.get(p.key) : (m === 'suggest' || m === 'edit');
  const ST = () => ({ incluido: [L('Incluido', 'Included'), 'ok'], fuera: [L('Fuera del alcance', 'Out of scope'), ''], na: [L('No aplica', 'Not applicable'), ''], desconocido: [L('Desconocido', 'Unknown'), 'vio'] });
  const fmtTol = t => !t || t.value == null || t.value === '' ? null : t.value + ' ' + (t.unit === 'días' ? L('días', 'days') : t.unit);
  const kv = rows => `<div class="v6-kv v6-pc-kv">${rows.filter(r => r[1] != null && String(r[1]).trim() !== '').map(r => `<span>${r[0]}</span><span>${h(tx(String(r[1])))}</span>`).join('')}</div>`;

  function viewBody(a, p) {
    const t = p.tolerance || {}, inc = p.status === 'incluido';
    const TYPE = { productivo: L('Productivo', 'Production'), auxiliar: L('Servicio auxiliar', 'Auxiliary service'), salvaguarda: L('Salvaguarda', 'Safeguard') };
    const st = ST()[p.status] || ['—', ''];
    const lv = { Alta: 'alto', Media: 'medio', Baja: 'bajo' }[p.crit] || 'pend';
    const row = (k, v, raw, req) => v == null || String(v).trim() === '' ? (req ? `<div class="v6-kvr miss"><dt>${k}<span class="v6-req" aria-hidden="true">*</span></dt><dd><span class="v6-falta">${L('Falta diligenciar', 'To fill in')}</span></dd></div>` : '') : `<div class="v6-kvr"><dt>${k}</dt><dd>${raw ? v : h(tx(String(v)))}</dd></div>`;
    let html = `<dl class="v6-kv2">${row(L('Estado', 'Status'), `<span class="pill ${st[1]}">${st[0]}</span>`, true)}${row(p.status === 'na' ? L('Explicación', 'Explanation') : L('Justificación', 'Justification'), p.just)}
      ${inc ? row(L('Criticidad del proceso', 'Process criticality'), `<span class="lv ${lv}">${h(tx(p.crit || '—'))}</span>`, true) : ''}</dl>`;
    if (inc) html += `<div class="sec-title">${L('Prioridad del negocio', 'Business priority')}</div><dl class="v6-kv2">
      ${row(L('Tipo de proceso', 'Process type'), TYPE[p.type] ? `<span class="v6-chip-sys">${TYPE[p.type]}</span>` : '', true, true)}${row(L('Función', 'Function'), p.function)}${row(L('Capacidad afectada', 'Capacity affected'), p.capacityAffected)}
      ${row(L('Consecuencia de una interrupción', 'Consequence of an interruption'), p.interruption, false, true)}
      ${row(L('Tolerancia', 'Tolerance'), fmtTol(t) ? `<b>${h(fmtTol(t))}</b>${t.conf ? ` <span class="v6-chip-sys">${h(tx(t.conf))}</span>` : ''}` : (p.type === 'salvaguarda' ? `<span class="mut">${L('No aplica (salvaguarda)', 'Not applicable (safeguard)')}</span>` : ''), true, p.type !== 'salvaguarda')}
      ${row(L('Fuente de la tolerancia', 'Tolerance source'), t.source)}${row(L('Restricciones', 'Constraints'), p.constraints)}${row(L('Fuente', 'Source'), p.source)}</dl>`;
    return html + `<p class="trace">${ic('clock', 'sm')}${L('Decisión registrada por', 'Decision recorded by')} ${h(p.by || C.uname(a.leadId) || '—')}${p.ts ? ' · ' + C.fmtDate(p.ts, true) : ''}</p>`;
  }
  function menu(p, m) {
    const it = (act, icon, lbl, cls) => `<button role="menuitem" class="${cls || ''}" data-act="${act}" data-k="${p.key}">${ic(icon, 'sm')}${lbl}</button>`;
    const items = m === 'discarded' ? [it('v6pc-restore', 'reset', L('Restaurar sugerencia', 'Restore suggestion')), it('v6pc-del', 'x', L('Borrar', 'Delete'), 'danger')]
      : [m === 'view' ? it('v6pc-edit', 'edit', L('Editar', 'Edit')) : m === 'edit' && p.status ? it('v6pc-done', 'check', L('Terminar edición', 'Finish editing')) : '',
        it('proc-adapt', 'edit', L('Adaptar nombre', 'Adapt name')), it('v6pc-discard', 'slash', L('Descartar', 'Discard')), it('v6pc-del', 'x', L('Borrar', 'Delete'), 'danger')];
    const open = MENU === p.key;
    return `<div class="v6-kebab"><button class="icon-btn" data-act="v6pc-menu" data-k="${p.key}" aria-haspopup="menu" aria-expanded="${open}" aria-label="${L('Acciones de ', 'Actions for ')}${h(tx(p.name))}" title="${L('Acciones', 'Actions')}"><span class="v6-dots" aria-hidden="true"><i></i><i></i><i></i></span></button>${open ? `<div class="v6-menu" role="menu">${items.join('')}</div>` : ''}</div>`;
  }
  function card(a, p, i, inner) {
    const m = modeOf(p), open = isOpen(p, m), st = ST()[p.status];
    const pill = m === 'discarded' ? `<span class="pill">${L('Descartado', 'Discarded')}</span>` : m === 'suggest' ? `<span class="pill warn">${p.prov === 'catalogo' ? L('Sugerencia de la industria', 'Industry suggestion') : L('Por decidir', 'To decide')}</span>`
      : `<span class="pill ${st[1]}">${st[0]}</span>${m === 'edit' ? `<span class="pill pri">${L('Editando', 'Editing')}</span>` : ''}`;
    const mis = m === 'discarded' || m === 'suggest' ? [] : (C.v6missing ? C.v6missing(p) : []);
    const misPill = mis.length ? `<span class="v6-faltan" title="${h(L('Falta: ', 'Missing: ') + mis.map(x => x[1]).join(', '))}">${mis.length === 1 ? L('Falta 1 obligatorio', '1 required missing') : L(`Faltan ${mis.length} obligatorios`, `${mis.length} required missing`)}</span>` : '';
    const sum = m === 'view' || m === 'discarded' ? [p.status === 'incluido' && p.crit ? L('Criticidad ', 'Criticality ') + tx(p.crit) : '', p.status === 'incluido' && fmtTol(p.tolerance) ? L('Tolera ', 'Tolerates ') + fmtTol(p.tolerance) : '', m === 'discarded' ? tx(p.discardReason || '') : ''].filter(Boolean).join(' · ') : '';
    let body = '';
    if (open) {
      if (m === 'view') body = viewBody(a, p);
      else if (m === 'discarded') body = kv([[L('Motivo', 'Reason'), p.discardReason], [L('Descartado por', 'Discarded by'), p.discardBy ? p.discardBy + ' · ' + C.fmtDate(p.discardTs, true) : '']]);
      else body = inner.replace(/ \*<\/label>/g, '<span class="v6-req" aria-hidden="true">*</span><span class="sr"> (' + L('obligatorio', 'required') + ')</span></label>') + (m === 'edit' ? `<div class="v6-pc-foot"><span class="small mut">${L('Los cambios se guardan al escribir; queda registrado quién decidió.', 'Changes save as you type; who decided is recorded.')}</span><button class="btn primary sm" data-act="v6pc-done" data-k="${p.key}">${ic('check', 'sm')}${L('Guardar y cerrar edición', 'Save and finish editing')}</button></div>` : '');
    }
    return `<article class="pcard v6-pc m-${m} st-${p.status || 'none'}" id="proc-${p.key}">
      <div class="v6-pc-h"><button class="v6-pc-tg" data-act="v6pc-tg" data-k="${p.key}" aria-expanded="${open}" aria-controls="pcb-${p.key}"><span class="v6-pc-id">${h(dispId(a, p))}</span><span class="v6-pc-n">#${String(i + 1).padStart(2, '0')}</span>
        <span class="v6-pc-t"><b>${h(tx(p.name))}</b><small>${m === 'suggest' || m === 'edit' ? h(tx(p.desc || '')) : ''}${p.name0 ? ' · ' + L('Adaptado de', 'Adapted from') + ' «' + h(tx(p.name0)) + '»' : ''}</small>${sum ? `<small class="v6-pc-sum">${h(sum)}</small>` : ''}</span></button>
        <span class="v6-pc-pills">${misPill}${pill}</span>${menu(p, m)}<button class="icon-btn v6-pc-car" data-act="v6pc-tg" data-k="${p.key}" aria-label="${open ? L('Colapsar', 'Collapse') : L('Expandir', 'Expand')}" tabindex="-1">${ic('chev', 'sm')}</button></div>
      ${open ? `<div class="v6-pc-b" id="pcb-${p.key}">${body}</div>` : ''}</article>`;
  }
  const st2 = U.stage[2];
  U.stage[2] = function (a, ev) {
    const html = st2(a, ev); const i0 = html.indexOf('<div class="pcards">'), i1 = html.lastIndexOf('</article>');
    if (i0 < 0 || i1 < 0) return html;
    const inner = {};
    html.slice(i0 + 20, i1 + 10).split('</article>').forEach(c => { const j = c.indexOf('<article'); if (j < 0) return; const m = c.match(/id="proc-([^"]+)"/); if (m) inner[m[1]] = c.slice(c.indexOf('>', j) + 1); });
    const nd = a.processes.filter(p => p.discarded).length;
    const bar = `<div class="v6-pc-bar"><span class="small mut">${L('Todo lo que aparece aquí empieza como sugerencia del catálogo de la industria. Decida, edite, descarte o borre cada proceso.', 'Everything here starts as a suggestion from the industry catalog. Decide, edit, discard or delete each process.')}${nd ? ' · ' + nd + L(' descartados', ' discarded') : ''}</span>
      <span class="row" style="gap:6px"><button class="btn ghost sm" data-act="v6pc-all" data-v="1">${L('Expandir todo', 'Expand all')}</button><button class="btn ghost sm" data-act="v6pc-all" data-v="0">${L('Colapsar todo', 'Collapse all')}</button></span></div>`;
    let tail = html.slice(i1 + 10);
    tail = tail.replace(/<div class="row"><div class="field" style="flex:1;min-width:200px"><label for="np-name">[\s\S]*?data-act="add-proc"[^>]*>[\s\S]*?<\/button><\/div>/, addForm(a));
    // filtros por estado (por defecto: incluidos). Las tarjetas en edición no se ocultan hasta guardarlas.
    const grp = p => p.discarded ? 'descartado' : p.status || 'none';
    const PF = [['incluido', L('Incluidos', 'Included')], ['fuera', L('Fuera del alcance', 'Out of scope')], ['na', L('No aplica', 'Not applicable')], ['desconocido', L('Desconocidos', 'Unknown')], ['none', L('Por decidir', 'To decide')], ['descartado', L('Descartados', 'Discarded')], ['all', L('Todos', 'All')]];
    const pf = C.S.ui.pf || 'incluido', cnt = k => k === 'all' ? a.processes.length : a.processes.filter(p => grp(p) === k).length;
    const fbar = `<div class="v6-pf" role="group" aria-label="${L('Filtrar procesos por estado', 'Filter processes by status')}">${PF.filter(([k]) => k === 'all' || k === 'incluido' || cnt(k)).map(([k, l]) => `<button class="v6-pfb f-${k}" data-act="v6-pf" data-v="${k}" aria-pressed="${pf === k}">${l}<b>${cnt(k)}</b></button>`).join('')}</div>`;
    const head = html.slice(0, i0).replace(/<div class="crit" id="proc-list">[\s\S]*?<\/div>/, fbar);
    const shown = a.processes.map((p, i) => [p, i]).filter(([p]) => pf === 'all' || grp(p) === pf || EDIT.has(p.key));
    const none = cnt('none');
    const empty = `<div class="empty"><b>${pf === 'incluido' ? L('Todavía no hay procesos incluidos', 'No included processes yet') : L('Ningún proceso en este estado', 'No processes in this status')}</b>${none && pf !== 'none' ? `<button class="btn primary sm" data-act="v6-pf" data-v="none">${L('Ver los ', 'See the ')}${none}${L(' por decidir', ' to decide')}</button>` : ''}</div>`;
    return head + bar + `<div class="pcards v6-pcards">` + (shown.length ? shown.map(([p, i]) => card(a, p, i, inner[p.key] || '')).join('') : empty) + tail;
  };
  // agregar proceso: lista desplegable con el catálogo + «Otro»
  function addForm(a) {
    const T = C.S.lib.templates || {}, have = new Set(a.processes.map(p => p.catId || p.key)), ind = a.cfg.industry;
    const opts = list => list.filter(p => p.active !== false && !have.has(p.id || p.key)).map(p => `<option value="${h(p.key)}">${h((p.id || p.key) + ' · ' + tx(p.name))}</option>`).join('');
    const own = opts((T[ind] || {}).processes || []);
    const others = '';
    const indName = tx((D.INDUSTRIES.find(i => i.key === ind) || {}).name || '');
    return `<div class="row v6-np"><div class="field" style="flex:1;min-width:240px"><label for="v6np-sel">${L('Proceso', 'Process')}</label><select id="v6np-sel"><option value="">${L('Seleccione…', 'Select…')}</option>${own ? `<optgroup label="${h(L('Catálogo de ', 'Catalog: ') + indName + L(' (no incluidos)', ' (not included)'))}">${own}</optgroup>` : ''}${others}${own ? '' : `<option value="" disabled>${L('Todos los procesos del catálogo ya están en el assessment', 'All catalog processes are already in the assessment')}</option>`}<option value="__other">${L('Otro (escribir uno nuevo)', 'Other (enter a new one)')}</option></select></div>
      <div class="field" id="v6np-ow" style="flex:1;min-width:200px" hidden><label for="np-name">${L('Nombre del proceso nuevo', 'New process name')}</label><input id="np-name" placeholder="${L('p. ej. Inyección de químicos', 'e.g. Chemical injection')}"></div>
      <button class="btn primary sm" data-act="v6-add-proc" style="align-self:flex-end">${L('Agregar', 'Add')}</button></div><p class="hint">${L('Solo se listan procesos del catálogo de ', 'Only processes from the catalog of ') + indName + L(' que aún no están en el assessment. Conservan su ID; «Otro» crea uno propio de la instalación con ID PX.', ' not yet in the assessment are listed. They keep their ID; “Other” creates a facility-specific one with a PX ID.')}</p>`;
  }
  document.addEventListener('change', e => { if (e.target.id === 'v6np-sel') { const w = document.getElementById('v6np-ow'); if (w) { w.hidden = e.target.value !== '__other'; if (!w.hidden) document.getElementById('np-name').focus(); } } });
  A['v6-add-proc'] = () => {
    const a = C.cur(); const v = (document.getElementById('v6np-sel') || {}).value || '';
    if (!v) return U.toast(L('Seleccione un proceso o «Otro»', 'Select a process or “Other”'));
    if (v === '__other') { if (!((document.getElementById('np-name') || {}).value || '').trim()) return U.toast(L('Escriba el nombre del proceso', 'Enter the process name')); const n0 = a.processes.length; A['add-proc'](); const p = a.processes[a.processes.length - 1]; if (a.processes.length > n0) { OPEN.set(p.key, true); C.log(a, 'Agregó el proceso propio ' + dispId(a, p) + ' · ' + p.name, 'Added facility process ' + dispId(a, p) + ' · ' + p.name); C.save(); R(); } return; }
    const T = C.S.lib.templates || {}; let src = null; src = ((T[a.cfg.industry] || {}).processes || []).find(p => p.key === v);
    if (!src) return; if (a.processes.some(p => p.key === src.key)) return U.toast(L('Ese proceso ya está en el assessment', 'That process is already in the assessment'));
    a.processes.push({ key: src.key, name: src.name, desc: src.desc, status: null, just: '', crit: '', prov: 'catalogo', catId: src.id || src.key, crit3: src.crit3, critCat: src.critCat, type: 'productivo' });
    OPEN.set(src.key, true); C.log(a, 'Agregó desde el catálogo el proceso ' + (src.id || src.key), 'Added catalog process ' + (src.id || src.key)); C.save(); R();
  };
  A['v6pc-tg'] = el => { const a = C.cur(); const p = a.processes.find(x => x.key === el.dataset.k); OPEN.set(p.key, !isOpen(p, modeOf(p))); MENU = null; R(); };
  const goTo0 = U.goTo;
  if (goTo0) U.goTo = (st, target) => { const m = String(target || '').match(/^proc-(.+)$/); const a = C.cur(); if (m && a) { const p = a.processes.find(x => x.key === m[1]); if (p) { const g = p.discarded ? 'descartado' : p.status || 'none'; const pf = C.S.ui.pf || 'incluido'; if (pf !== 'all' && pf !== g) C.S.ui.pf = g; OPEN.set(p.key, true); } } return goTo0(st, target); };
  A['v6-pf'] = el => { C.S.ui.pf = el.dataset.v; MENU = null; C.save(); R(); };
  A['v6pc-all'] = el => { C.cur().processes.forEach(p => OPEN.set(p.key, el.dataset.v === '1')); MENU = null; R(); };
  A['v6pc-menu'] = el => { MENU = MENU === el.dataset.k ? null : el.dataset.k; R(); setTimeout(() => { const f = document.querySelector('.v6-menu [role=menuitem]'); if (f) f.focus(); }, 0); };
  A['v6pc-edit'] = el => { EDIT.add(el.dataset.k); OPEN.set(el.dataset.k, true); MENU = null; const a = C.cur(); const p = a.processes.find(x => x.key === el.dataset.k); C.log(a, 'Abrió para edición el proceso ' + dispId(a, p), 'Opened process ' + dispId(a, p) + ' for editing'); C.save(); R(); };
  A['v6pc-done'] = el => {
    const a = C.cur(); const p = a.processes.find(x => x.key === el.dataset.k); MENU = null;
    if (incomplete(p)) { R(); return U.toast(!String(p.just || '').trim() ? L('Falta la justificación', 'Justification is missing') : L('Falta la criticidad del proceso', 'Process criticality is missing')); }
    p.critFromCat = false; EDIT.delete(p.key); OPEN.set(p.key, false); C.log(a, 'Guardó el proceso ' + dispId(a, p), 'Saved process ' + dispId(a, p)); C.save(); R();
  };
  document.addEventListener('change', e => { const m = (e.target.dataset && e.target.dataset.f || '').match(/^proc\.(.+)\.crit$/); if (!m) return; const a = C.cur(); const p = a && a.processes.find(x => x.key === m[1]); if (p && p.critFromCat) { p.critFromCat = false; C.save(); } });
  const ps0 = A['proc-status'];
  A['proc-status'] = el => { EDIT.add(el.dataset.k); OPEN.set(el.dataset.k, true); ps0(el);
    const a = C.cur(), p = a && a.processes.find(x => x.key === el.dataset.k);
    if (p && p.status === 'incluido' && !p.crit && p.crit3) { p.crit = p.crit3; p.critFromCat = true; C.save(); R(); } };
  const ad0 = A['proc-adapt']; A['proc-adapt'] = el => { MENU = null; R(); ad0(el); };
  // descartar / restaurar / borrar
  const val = id => ((document.getElementById(id) || {}).value || '').trim();
  U.modals.v6pcdis = function (a, d) {
    const p = a.processes.find(x => x.key === d.k);
    return { title: L('Descartar ', 'Discard ') + dispId(a, p), body: `<p>${h(tx(p.name))}</p><div class="field"><label for="v6pd-r">${L('Motivo *', 'Reason *')}</label><textarea id="v6pd-r" rows="2" data-autofocus placeholder="${L('p. ej. no existe en esta planta o está fuera del alcance acordado', 'e.g. does not exist at this plant or is outside the agreed scope')}"></textarea></div><p class="hint">${L('La tarjeta queda en gris y cuenta como fuera del alcance. Puede restaurarla después.', 'The card turns grey and counts as out of scope. You can restore it later.')}</p>`,
      foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button><button class="btn primary" data-act="v6pc-dis-ok" data-k="${p.key}">${L('Descartar', 'Discard')}</button>` };
  };
  A['v6pc-discard'] = el => { MENU = null; R(); U.openModal('v6pcdis', { k: el.dataset.k }); };
  A['v6pc-dis-ok'] = el => {
    const a = C.cur(); const p = a.processes.find(x => x.key === el.dataset.k); const r = val('v6pd-r'); if (!r) return U.toast(L('Escriba el motivo', 'Enter the reason'));
    p.prev = { status: p.status, just: p.just, crit: p.crit }; Object.assign(p, { discarded: true, discardReason: r, discardBy: me(), discardTs: now(), status: 'fuera', just: r, by: me(), ts: now() });
    EDIT.delete(p.key); OPEN.set(p.key, false); C.log(a, `Descartó el proceso ${dispId(a, p)}: ${r}`, `Discarded process ${dispId(a, p)}: ${r}`); C.save(); U.closeModal(); R();
  };
  A['v6pc-restore'] = el => {
    const a = C.cur(); const p = a.processes.find(x => x.key === el.dataset.k); const pv = p.prev || { status: null, just: '', crit: '' };
    Object.assign(p, { discarded: false, status: pv.status, just: pv.just || '', crit: pv.crit || '' }); delete p.prev; MENU = null; OPEN.set(p.key, true);
    C.log(a, 'Restauró el proceso ' + dispId(a, p), 'Restored process ' + dispId(a, p)); C.save(); R();
  };
  const refsOf = (a, k) => [].concat(a.scenarios.filter(s => s.proc === k).map(s => s.id), a.findings.filter(f => f.proc === k).map(f => f.id),
    a.assets.filter(x => !C.isOut(x) && C.assetProcs(x).includes(k)).map(x => x.tag), a.systems.filter(x => !C.isOut(x) && C.recProcs(x).includes(k)).map(x => tx(x.name)));
  U.modals.v6pcdel = function (a, d) {
    const p = a.processes.find(x => x.key === d.k); const refs = refsOf(a, p.key);
    return { title: L('Borrar ', 'Delete ') + dispId(a, p), body: refs.length ? `<p>${L('No se puede borrar: otros registros dependen de este proceso.', 'Cannot delete: other records depend on this process.')}</p><div class="v6-chips">${refs.map(r => `<span class="v6-tag">${h(r)}</span>`).join('')}</div><p class="hint">${L('Desvincúlelos primero o use «Descartar», que conserva la trazabilidad.', 'Unlink them first or use “Discard”, which keeps traceability.')}</p>`
      : `<p>${L('Se borrará «', 'This will delete “')}${h(tx(p.name))}${L('» de este assessment. La acción queda en el historial y no se puede deshacer.', '” from this assessment. The action is logged and cannot be undone.')}</p>`,
      foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button>${refs.length ? '' : `<button class="btn danger" data-act="v6pc-del-ok" data-k="${p.key}">${L('Borrar', 'Delete')}</button>`}` };
  };
  A['v6pc-del'] = el => { MENU = null; R(); U.openModal('v6pcdel', { k: el.dataset.k }); };
  A['v6pc-del-ok'] = el => {
    const a = C.cur(); const i = a.processes.findIndex(x => x.key === el.dataset.k); if (i < 0) return; const p = a.processes[i]; if (refsOf(a, p.key).length) return;
    const id = dispId(a, p); a.processes.splice(i, 1); (a.areas || []).forEach(x => { if (x.procs) x.procs = x.procs.filter(r => (r.proc || r) !== p.key); });
    C.log(a, `Borró el proceso ${id} (${tx(p.name)})`, `Deleted process ${id} (${tx(p.name)})`); C.save(); U.closeModal(); R();
  };
  document.addEventListener('click', e => { if (MENU && !e.target.closest('.v6-kebab')) { MENU = null; R(); } });
  document.addEventListener('keydown', e => { if (MENU && e.key === 'Escape') { const k = MENU; MENU = null; R(); const b = document.querySelector(`[data-act=v6pc-menu][data-k="${k}"]`); if (b) b.focus(); } });

  /* ---------- Todos los assessments: tarjetas o lista ---------- */
  const home0 = U.views.home;
  const stKey = a => a.reportStatus === 'Aprobado' ? 'aprobado' : a.reviewNote ? 'revision' : 'curso';
  const ST_LBL = () => ({ curso: L('En curso', 'In progress'), revision: L('Informe en revisión', 'Report in review'), aprobado: L('Informe aprobado', 'Report approved') });
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  U.views.home = function () {
    const S = C.S, mode = S.ui.hview || 'cards', F = S.ui.hfl || (S.ui.hfl = {});
    // tarjetas completas sin filtros del original, para reutilizarlas
    const hf0 = S.ui.hf, hi0 = S.ui.hind; S.ui.hf = 'all'; S.ui.hind = ''; const base = home0(); S.ui.hf = hf0; S.ui.hind = hi0;
    const heroEnd = base.indexOf('</section>') + 10, hintAt = base.lastIndexOf('<p class="hint">');
    const cardsById = {}; (base.match(/<article class="acard[\s\S]*?<\/article>/g) || []).forEach(c => { const m = c.match(/data-act="open" data-id="([^"]+)"/); if (m) cardsById[m[1]] = c; });
    const me0 = C.me(), role = S.ui.hf === 'open' ? 'all' : (S.ui.hf || 'all');
    const all = C.visible().map(a => ({ a, ev: C.evaluate(a) })).map(({ a, ev }) => { const cur = ev.stages.find(s => s.state !== 'complete') || ev.stages[6]; const ind = D.INDUSTRIES.find(i => i.key === a.cfg.industry) || {};
      return { a, ev, code: a.code, plant: tx(a.cfg.plant) || '', client: tx(a.cfg.client) || '', ind: tx(ind.name || ''), mod: C.modName(C.mod(a)), modKey: C.mod(a).key || a.cfg.modality, stage: cur.n, stageName: cur.name, pct: ev.pct, pend: C.pendCount(ev), lead: C.uname(a.leadId) || '', stk: stKey(a), st: ST_LBL()[stKey(a)], upd: a.updated || '' }; });
    const q = norm(F.q);
    const rows = all.filter(r => role === 'lead' ? r.a.leadId === me0.id : role === 'team' ? (r.a.team || []).includes(me0.id) : true)
      .filter(r => !q || norm([r.code, r.plant, r.client, r.lead, r.ind].join(' ')).includes(q))
      .filter(r => (!F.st || r.stk === F.st) && (!F.cl || r.client === F.cl) && (!F.ind || r.a.cfg.industry === F.ind) && (!F.mod || r.modKey === F.mod) && (!F.ld || r.a.leadId === F.ld) && (!F.stage || r.stage === +F.stage));
    const [sk, sd] = (S.ui.hsort || 'upd:-1').split(':'); const dir = +sd;
    rows.sort((x, y) => { const p = x[sk], q2 = y[sk]; return (typeof p === 'number' ? p - q2 : String(p).localeCompare(String(q2), I.loc())) * dir; });
    // barra de filtros
    const uniq = (arr) => [...new Map(arr.filter(x => x[0]).map(x => [x[0], x])).values()].sort((x, y) => String(x[1]).localeCompare(String(y[1]), I.loc()));
    const sel = (k, lbl, opts) => `<div class="field v6-hf"><label for="v6f-${k}">${lbl}</label><select id="v6f-${k}" data-hf="${k}">${U.opt('', L('Todos', 'All'), F[k] || '')}${opts.map(o => U.opt(String(o[0]), o[1], String(F[k] || ''))).join('')}</select></div>`;
    const nAct = ['q', 'st', 'cl', 'ind', 'mod', 'ld', 'stage'].filter(k => F[k]).length + (role !== 'all' ? 1 : 0);
    const chips = [['all', L('Todos', 'All')], ['lead', L('Soy responsable', 'I lead')], ['team', L('Soy evaluador', 'I assess')]].map(([k, l]) => `<button class="chip" data-act="hf" data-f="${k}" aria-pressed="${role === k}">${l}</button>`).join('');
    const filters = `<section class="v6-hfbar" aria-label="${L('Filtros', 'Filters')}">
      <div class="v6-hf-top"><div class="v6-hsearch"><label class="sr" for="v6f-q">${L('Buscar', 'Search')}</label><input id="v6f-q" type="search" value="${h(F.q || '')}" placeholder="${L('Buscar por nombre, cliente, ID o responsable', 'Search by name, client, ID or lead')}" autocomplete="off"></div>
        <div class="row" role="group" aria-label="${L('Mi participación', 'My role')}" style="gap:6px">${chips}</div></div>
      <div class="v6-hf-grid">${sel('st', L('Estado', 'Status'), Object.entries(ST_LBL()))}${sel('cl', L('Cliente', 'Client'), uniq(all.map(r => [r.client, r.client])))}${sel('ind', L('Industria', 'Industry'), D.INDUSTRIES.map(i => [i.key, tx(i.name)]))}
        ${sel('mod', L('Modalidad', 'Modality'), uniq(all.map(r => [r.modKey, r.mod])))}${sel('ld', L('Responsable', 'Lead'), uniq(all.map(r => [r.a.leadId, r.lead])))}${sel('stage', L('Etapa', 'Stage'), [1, 2, 3, 4, 5, 6, 7].map(n => [n, n + ' · ' + (all.find(r => r.stage === n) || { stageName: '' }).stageName]).map(x => [x[0], x[1].replace(/ · $/, '')]))}</div></section>`;
    const tog = `<div class="seg" role="group" aria-label="${L('Vista', 'View')}"><button data-act="v6-hview" data-v="cards" aria-pressed="${mode === 'cards'}">${L('Tarjetas', 'Cards')}</button><button data-act="v6-hview" data-v="list" aria-pressed="${mode === 'list'}">${L('Lista', 'List')}</button></div>`;
    const sortSel = `<div class="field v6-hsort"><label for="v6f-sort">${L('Ordenar por', 'Sort by')}</label><select id="v6f-sort">${[['upd:-1', L('Actualizado (reciente)', 'Updated (recent)')], ['pend:-1', L('Más pendientes', 'Most pending')], ['pct:1', L('Menor avance', 'Least progress')], ['pct:-1', L('Mayor avance', 'Most progress')], ['plant:1', L('Nombre (A–Z)', 'Name (A–Z)')], ['client:1', L('Cliente (A–Z)', 'Client (A–Z)')], ['code:1', 'ID']].map(o => U.opt(o[0], o[1], S.ui.hsort || 'upd:-1')).join('')}</select></div>`;
    const head = `<div class="v6-hres"><span class="v6-hcount"><b>${rows.length}</b> ${L('de', 'of')} ${all.length} assessments${nAct ? ` · <button class="plink" data-act="v6-hclear">${L('Limpiar filtros', 'Clear filters')} (${nAct})</button>` : ''}</span><div class="row" style="gap:10px;align-items:flex-end">${mode === 'cards' ? sortSel : ''}<div class="v6-hview"><span class="lbl">${L('Vista', 'View')}</span>${tog}</div></div></div>`;
    let body;
    if (!rows.length) body = `<div class="empty">${ic('steps')}<b>${L('Ningún assessment con estos filtros', 'No assessments match these filters')}</b><button class="btn ghost sm" data-act="v6-hclear">${L('Limpiar filtros', 'Clear filters')}</button></div>`;
    else if (mode === 'cards') body = `<div class="acards">${rows.map(r => cardsById[r.a.id] || '').join('')}</div>`;
    else {
      const cols = [['code', 'ID', 'c-id'], ['lead', L('Responsable', 'Lead'), 'c-ld'], ['plant', L('Instalación · cliente', 'Facility · client'), 'c-pl'], ['ind', L('Industria · modalidad', 'Industry · modality'), 'c-in'], ['pct', L('Etapa · avance', 'Stage · progress'), 'c-pr'], ['pend', L('Pendientes', 'Pending'), 'c-pe'], ['upd', L('Estado · actualizado', 'Status · updated'), 'c-st']];
      const th = cols.map(([k, l, c]) => `<th class="${c}" aria-sort="${sk === k ? (dir > 0 ? 'ascending' : 'descending') : 'none'}"><button class="v6-sort" data-act="v6-hsort" data-k="${k}">${l}<span aria-hidden="true">${sk === k ? (dir > 0 ? '▲' : '▼') : ''}</span></button></th>`).join('') + `<th class="c-ac"><span class="sr">${L('Acciones', 'Actions')}</span></th>`;
      const tr = rows.map(r => `<tr class="${r.a.id === S.activeId ? 'on' : ''}" data-row-open="${r.a.id}" title="${L('Clic para abrir', 'Click to open')}"><td class="c-id" title="${h(r.code)}"><b>${h(r.code.replace(/^ORA-/, ''))}</b></td><td class="c-ld"><span class="v6-ld">${U.av(r.a.leadId, 'sm')}<span>${h(r.lead || L('Sin asignar', 'Unassigned'))}</span></span></td><td class="c-pl"><b>${h(r.plant || L('Assessment sin nombre', 'Untitled assessment'))}</b><small>${h(r.client)}</small></td><td class="c-in"><span>${h(r.ind)}</span><small>${h(r.mod)}</small></td>
      <td class="c-pr"><span>${r.stage}/7 · ${h(r.stageName)}</span><div class="v6-lprog"><div class="pbar"><i style="width:${r.pct}%"></i></div><b>${r.pct} %</b></div></td><td class="c-pe"><span class="v6-pend ${r.pend ? 'on' : 'zero'}" title="${L('Pendientes requeridos', 'Required pending items')}">${r.pend}</span></td>
      <td class="c-st"><span class="pill ${r.stk === 'aprobado' ? 'ok' : r.stk === 'revision' ? 'warn' : 'pri'}">${h(r.st)}</span><small>${C.fmtDate(r.upd)}</small></td>
      <td class="c-ac"><span class="v6-acts">${C.canAssign(r.a) ? `<button class="btn ghost sm" data-act="assign" data-id="${r.a.id}" title="${L('Asignar', 'Assign')}" aria-label="${L('Asignar ', 'Assign ')}${h(r.code)}">${ic('users', 'sm')}</button>` : ''}<button class="icon-btn v6-go" data-act="open" data-id="${r.a.id}" title="${r.ev.done ? L('Continuar', 'Continue') : L('Iniciar', 'Start')}" aria-label="${(r.ev.done ? L('Continuar ', 'Continue ') : L('Iniciar ', 'Start ')) + h(r.code)}">${ic('chev', 'sm')}</button></span></td></tr>`).join('');
      body = `<section class="box v6-hlist"><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></section>`;
    }
    return base.slice(0, heroEnd) + filters + head + body + (hintAt > 0 ? base.slice(hintAt) : '');
  };
  document.addEventListener('change', e => {
    const t = e.target; if (t.dataset && t.dataset.hf) { const F = C.S.ui.hfl || (C.S.ui.hfl = {}); F[t.dataset.hf] = t.value; C.save(); R(); }
    else if (t.id === 'v6f-sort') { C.S.ui.hsort = t.value; C.save(); R(); }
  });
  let qT = null;
  document.addEventListener('input', e => { if (e.target.id !== 'v6f-q') return; const v = e.target.value; clearTimeout(qT); qT = setTimeout(() => { (C.S.ui.hfl || (C.S.ui.hfl = {})).q = v; C.save(); R(); const i = document.getElementById('v6f-q'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } }, 180); });
  A['v6-hclear'] = () => { C.S.ui.hfl = {}; C.S.ui.hf = 'all'; C.S.ui.hind = ''; C.save(); R(); };
  document.addEventListener('click', e => {
    if (e.target.closest('button, a, input, select, textarea, label, [data-act]')) return;
    const row = e.target.closest('tr[data-row-open]'); const cardEl = !row && e.target.closest('.acard');
    const id = row ? row.dataset.rowOpen : cardEl ? ((cardEl.querySelector('[data-act=open]') || {}).dataset || {}).id : null;
    if (id && A.open) A.open({ dataset: { id } });
  });
  A['v6-hview'] = el => { C.S.ui.hview = el.dataset.v; C.save(); R(); };
  A['v6-hsort'] = el => { const [k, d] = (C.S.ui.hsort || 'upd:-1').split(':'); C.S.ui.hsort = el.dataset.k + ':' + (k === el.dataset.k ? -d : 1); C.save(); R(); };
  R();
})();
