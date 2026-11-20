/* ORA v6 — Evidencia en línea (fotos y documentos) para activos y áreas, sin modales adicionales:
   carga múltiple, foto principal para el informe, reasignar entre área y activo, borrar y justificar la falta de foto. */
(function () {
  const C = window.ORA, D = window.ORA_DATA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, ic = U.ic, L = I.L, tx = I.tx, A = U.act;
  const now = () => new Date().toISOString();
  const me = () => C.uname(C.S.userId);
  const MAX = 10 * 1024 * 1024;
  const DEL = new Set(); // confirmación de borrado en dos clics
  const CAR = new Map(); // foto visible en cada carrusel

  const ofTarget = (list, k, id) => (list || []).filter(p => p.links && p.links[k] === id && (k !== 'area' || !p.links.asset));
  C.evPhotos = (a, k, id) => ofTarget(a.photos, k, id);
  C.evDocs = (a, k, id) => ofTarget(a.docs, k, id);
  C.evMain = (a, k, id) => { const ph = C.evPhotos(a, k, id); return ph.find(p => p.main) || ph.find(p => p.inReport) || ph[0] || null; };
  const ext = n => ((/\.([a-z0-9]{2,4})$/i.exec(String(n || '')) || [0, ''])[1]).toLowerCase();
  const DOCI = n => ({ pdf: 'PDF', doc: 'Word', docx: 'Word', xls: 'Excel', xlsx: 'Excel', csv: 'CSV', ppt: 'PPT', pptx: 'PPT', txt: 'TXT', zip: 'ZIP', dwg: 'DWG' })[ext(n)] || (ext(n) || 'DOC').toUpperCase();
  const kb = s => s ? (s > 1048576 ? (s / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(s / 1024)) + ' KB') : '';
  const tgtLabel = (a, k, id) => k === 'asset' ? (C.asset(a, id) || {}).tag || id : tx((C.area(a, id) || {}).name || id);

  // opciones de reasignación: el área y sus activos
  function moveOpts(a, k, id, cur) {
    const ar = k === 'asset' ? C.area(a, (C.asset(a, id) || {}).area) : C.area(a, id); if (!ar) return '';
    const list = a.assets.filter(x => x.area === ar.id && !C.isOut(x));
    return `<option value="area:${ar.id}" ${cur === 'area:' + ar.id ? 'selected' : ''}>${L('Área · ', 'Area · ')}${h(tx(ar.name))}</option>` + list.map(x => `<option value="asset:${x.id}" ${cur === 'asset:' + x.id ? 'selected' : ''}>${h(x.tag + ' · ' + tx(x.name))}</option>`).join('');
  }
  U.evidBox = function (a, k, id, o) {
    o = o || {}; const ro = !!o.readonly; const ph = C.evPhotos(a, k, id), docs = C.evDocs(a, k, id); const main = C.evMain(a, k, id);
    const req = C.photoReqs(a).find(q => q.key === k + ':' + id); const cur = k + ':' + id;
    const ci = Math.min(CAR.get(cur) || 0, Math.max(0, ph.length - 1)); const p0 = ph[ci]; const isMain = p0 && main && main.id === p0.id;
    const pcards = !p0 ? '' : `<div class="v6e-car" data-car="${cur}"><div class="v6e-stage">
      <button class="v6e-big" data-act="lightbox" data-id="${p0.id}" aria-label="${L('Ampliar ', 'Enlarge ')}${h(tx(p0.title || ''))}"><img src="${C.photoURL(p0)}" alt="${h(tx(p0.title || ''))}"></button>
      ${ph.length > 1 ? `<button class="v6e-nav prev" data-act="v6e-car" data-t="${cur}" data-d="-1" aria-label="${L('Foto anterior', 'Previous photo')}">‹</button><button class="v6e-nav next" data-act="v6e-car" data-t="${cur}" data-d="1" aria-label="${L('Foto siguiente', 'Next photo')}">›</button>` : ''}
      <span class="v6e-cnt">${ci + 1} / ${ph.length}</span>${isMain ? `<span class="v6e-badge">★ ${L('En el informe', 'In report')}</span>` : ''}</div>
      <div class="v6e-ctl"><div class="v6e-cap"><b title="${h(tx(p0.title || ''))}">${h(tx(p0.title || ''))}</b><small>${h(p0.author || '')}${p0.ts ? ' · ' + C.fmtDate(p0.ts, true) : ''}</small></div>
      ${ro ? '' : `<div class="v6e-acts"><button class="btn sm ${isMain ? 'v6e-on' : 'ghost'}" data-act="v6e-main" data-p="${p0.id}" data-t="${cur}" aria-pressed="${!!isMain}">★ ${isMain ? L('En el informe', 'In report') : L('Usar en el informe', 'Use in report')}</button>
        ${(mo => mo ? `<label class="v6e-mvl">${L('Asociar a', 'Link to')}<select class="v6e-mv" data-v6e-mv="photo:${p0.id}">${mo}</select></label>` : '')(moveOpts(a, k, id, cur))}
        <button class="btn sm ${DEL.has(p0.id) ? 'danger' : 'ghost'}" data-act="v6e-del" data-kind="photo" data-id="${p0.id}">${ic('x', 'sm')}${DEL.has(p0.id) ? L('Confirmar borrado', 'Confirm delete') : L('Borrar', 'Delete')}</button></div>`}</div>
      ${ph.length > 1 ? `<div class="v6e-strip" role="list">${ph.map((p, n) => `<button role="listitem" class="v6e-th ${n === ci ? 'on' : ''}" data-act="v6e-go" data-t="${cur}" data-i="${n}" aria-label="${L('Foto ', 'Photo ')}${n + 1}${main && main.id === p.id ? L(' (en el informe)', ' (in report)') : ''}"><img src="${C.photoURL(p)}" alt="">${main && main.id === p.id ? '<i>★</i>' : ''}</button>`).join('')}</div>` : ''}</div>`;
    const drows = docs.map(d => `<div class="v6e-doc"><span class="v6e-ext">${h(DOCI(d.file || d.name))}</span><span class="v6e-dn"><b title="${h(tx(d.name))}">${h(tx(d.name))}</b><small title="${h(d.file || '')}"><span class="fn">${h(d.file || '')}</span><span>${d.size ? kb(d.size) : ''}${d.by ? ' · ' + h(C.uname(d.by) || d.by) : ''}</span></small></span>
      <button class="btn ghost sm" data-act="wk-doc-open" data-id="${d.id}" title="${L('Descargar', 'Download')}">${ic('down', 'sm')}</button>${ro ? '' : `${k === 'q' ? '' : `<select class="v6e-mv" data-v6e-mv="doc:${d.id}" aria-label="${L('Asociar a', 'Link to')}">${moveOpts(a, k, id, cur)}</select>`}<button class="v6e-del ${DEL.has(d.id) ? 'arm' : ''}" data-act="v6e-del" data-kind="doc" data-id="${d.id}" title="${L('Borrar', 'Delete')}">${DEL.has(d.id) ? L('¿Borrar?', 'Delete?') : ic('x', 'sm')}</button>`}</div>`).join('');
    const status = ph.length ? `<span class="pill ok">${ph.length} ${ph.length === 1 ? L('foto', 'photo') : L('fotos', 'photos')}</span>` : req && req.status === 'sin foto' ? `<span class="pill warn">${L('Foto requerida, sin cargar', 'Photo required, not uploaded')}</span>` : req && req.res ? `<span class="pill">${L('Sin foto · justificado', 'No photo · justified')}</span>` : `<span class="pill">${L('Sin fotos', 'No photos')}</span>`;
    const upl = ro ? '' : `<div class="v6e-up"><label class="btn primary sm" for="v6e-cam-${k}-${id}">${ic('camera', 'sm')}${L('Tomar foto', 'Take photo')}</label><input class="sr" type="file" id="v6e-cam-${k}-${id}" accept="image/*" capture="environment" data-v6e-up="${cur}">
      <label class="v6e-drop" for="v6e-file-${k}-${id}" data-v6e-drop="${cur}">${ic('plus', 'sm')}<span><b>${L('Subir archivos', 'Upload files')}</b> · ${L('fotos, PDF, Word, Excel… (varios a la vez, máx. 10 MB c/u)', 'photos, PDF, Word, Excel… (several at once, max 10 MB each)')}</span></label><input class="sr" type="file" id="v6e-file-${k}-${id}" multiple data-v6e-up="${cur}"></div>`;
    const just = !ro && !ph.length && req ? `<details class="v6e-just" ${req.status === 'sin foto' ? 'open' : ''}><summary>${req.res ? L('Justificación registrada · editar', 'Recorded justification · edit') : L('Justificar por qué no tiene foto', 'Justify why there is no photo')}</summary>
      <div class="row" style="align-items:flex-end"><div class="field" style="min-width:200px"><label for="v6e-jr-${k}-${id}">${L('Motivo', 'Reason')}</label><select id="v6e-jr-${k}-${id}">${D.PHOTO_REASONS.map(x => U.opt(x, tx(x), (req.res || {}).reason)).join('')}</select></div>
      <div class="field" style="flex:1;min-width:200px"><label for="v6e-jn-${k}-${id}">${L('Nota breve', 'Short note')} <span class="v6-req">*</span></label><input id="v6e-jn-${k}-${id}" value="${h(tx((req.res || {}).note || ''))}" placeholder="${L('p. ej. Equipo en mantenimiento, sin acceso', 'e.g. Equipment under maintenance, no access')}"></div>
      <button class="btn soft sm" data-act="v6e-just" data-t="${cur}">${L('Registrar', 'Record')}</button></div></details>` : (req && req.res && !ph.length ? `<p class="small mut">${L('Justificación: ', 'Justification: ')}<b>${h(tx(req.res.reason || ''))}</b> · ${h(tx(req.res.note || ''))}</p>` : '');
    return `<div class="v6e" data-v6e="${cur}"><div class="v6e-h"><b>${L('Evidencia', 'Evidence')}</b>${status}${docs.length ? `<span class="pill">${docs.length} ${docs.length === 1 ? L('documento', 'document') : L('documentos', 'documents')}</span>` : ''}</div>
      ${upl}${pcards}${docs.length ? `<div class="v6e-docs">${drows}</div>` : ''}${just}
      ${ro ? '' : `<p class="hint">${k === 'area' ? L('Suba aquí todo lo del recorrido y luego asócielo al activo que corresponda con la lista de cada archivo. ', 'Upload everything from the walkdown here, then link each file to its asset with the list on each file. ') : ''}${L('La foto marcada con ★ es la que aparece en el informe PDF; las demás quedan como archivo de evidencia.', 'The photo marked ★ is the one shown in the PDF report; the rest stay as evidence archive.')}</p>`}</div>`;
  };

  // repintar conservando lo editado en un modal o en una tarjeta en línea
  const stash = root => { const v = {}; (root || document).querySelectorAll('input[id],select[id],textarea[id]').forEach(el => { if (el.type === 'file') return; v[el.id] = el.type === 'checkbox' ? el.checked : el.multiple ? [...el.selectedOptions].map(o => o.value) : el.value; }); return v; };
  const restore = v => Object.entries(v).forEach(([id, val]) => { const el = document.getElementById(id); if (!el) return; if (el.type === 'checkbox') el.checked = val; else if (el.multiple) [...el.options].forEach(o => { o.selected = val.includes(o.value); }); else el.value = val; });
  U.v6refresh = function () { const inModal = !!document.querySelector('.modal .v6e'); const v = stash(inModal ? document.querySelector('.modal') : document.getElementById('main')); if (inModal) U.renderModal(); else U.render(); restore(v); };

  async function upload(target, files) {
    const a = C.cur(); const [k, id] = target.split(':'); if (!a || !files.length) return;
    let nP = 0, nD = 0, skip = 0; const base = tgtLabel(a, k, id); const hadMain = !!C.evMain(a, k, id);
    const links = { [k]: id }; if (k === 'asset') { const x = C.asset(a, id); if (x) { links.area = x.area; links.proc = C.assetProcs(x)[0]; } } else if (k === 'q') { const q = a.questions.find(z => z.id === id); if (q && q.proc) links.proc = q.proc; } else { const ar = C.area(a, id); if (ar) links.proc = C.recProcs(ar)[0]; }
    for (const f of files) {
      if (f.size > MAX) { skip++; continue; }
      if (/^image\//.test(f.type)) {
        let blob = f; try { blob = (await C.optimize(f)).blob; } catch (e) {}
        const pid = C.uid('PH'); await C.putPhoto(pid, blob); C.registerURL(pid, blob); const n = C.evPhotos(a, k, id).length + 1;
        const first = !hadMain && nP === 0;
        a.photos.push({ id: pid, src: 'idb:' + pid, title: base + (n > 1 ? ' (' + n + ')' : ''), caption: '', author: me(), ts: now(), review: 'Por revisar', inReport: first, main: first, links: Object.assign({}, links), origin: 'recorrido', file: f.name });
        nP++;
      } else {
        const did = C.uid('DOC'); await C.putPhoto(did, f); C.registerURL(did, f);
        (a.docs = a.docs || []).push({ id: did, name: f.name.replace(/\.[^.]+$/, ''), file: f.name, size: f.size, type: f.type, links: Object.assign({}, links), by: C.S.userId, ts: now() });
        nD++;
      }
    }
    if (nP) CAR.set(target, C.evPhotos(a, k, id).length - nP);
    C.log(a, `Subió evidencia a ${base}: ${nP} fotos, ${nD} documentos`, `Uploaded evidence to ${base}: ${nP} photos, ${nD} documents`); C.save(); U.v6refresh();
    U.toast(L(`${nP} fotos y ${nD} documentos asociados a ${base}`, `${nP} photos and ${nD} documents linked to ${base}`) + (skip ? L(` · ${skip} omitidos (más de 10 MB)`, ` · ${skip} skipped (over 10 MB)`) : ''));
  }
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset && t.dataset.v6eUp) { const fs = [...(t.files || [])]; const tg = t.dataset.v6eUp; t.value = ''; upload(tg, fs); }
    if (t.dataset && t.dataset.v6eMv) {
      const a = C.cur(); const [kind, rid] = t.dataset.v6eMv.split(':'); const rec = (kind === 'photo' ? a.photos : a.docs || []).find(x => x.id === rid); if (!rec) return;
      const [k, id] = t.value.split(':'); const L0 = rec.links || {}; const nl = Object.assign({}, L0); delete nl.asset; delete nl.area;
      if (k === 'asset') { const x = C.asset(a, id); nl.asset = id; nl.area = x && x.area; } else nl.area = id;
      rec.links = nl; if (kind === 'photo') { rec.main = false; rec.inReport = false; if (!C.evPhotos(a, k, id).some(p => p.main && p.id !== rid)) { rec.main = true; rec.inReport = true; } }
      C.log(a, `Asoció ${kind === 'photo' ? 'la foto' : 'el documento'} «${tx(rec.title || rec.name)}» a ${tgtLabel(a, k, id)}`, `Linked ${kind} “${tx(rec.title || rec.name)}” to ${tgtLabel(a, k, id)}`); C.save(); U.v6refresh();
    }
  });
  // arrastrar y soltar sobre la zona de carga
  document.addEventListener('dragover', e => { const z = e.target.closest && e.target.closest('[data-v6e-drop]'); if (z) { e.preventDefault(); z.classList.add('over'); } });
  document.addEventListener('dragleave', e => { const z = e.target.closest && e.target.closest('[data-v6e-drop]'); if (z) z.classList.remove('over'); });
  document.addEventListener('drop', e => { const z = e.target.closest && e.target.closest('[data-v6e-drop]'); if (!z) return; e.preventDefault(); z.classList.remove('over'); upload(z.dataset.v6eDrop, [...(e.dataTransfer.files || [])]); });

  A['v6e-car'] = el => { const a = C.cur(); const [k, id] = el.dataset.t.split(':'); const n = C.evPhotos(a, k, id).length; CAR.set(el.dataset.t, ((CAR.get(el.dataset.t) || 0) + +el.dataset.d + n) % n); U.v6refresh(); };
  A['v6e-go'] = el => { CAR.set(el.dataset.t, +el.dataset.i); U.v6refresh(); };
  A['v6e-main'] = el => { const a = C.cur(); const [k, id] = el.dataset.t.split(':'); C.evPhotos(a, k, id).forEach(p => { p.main = p.id === el.dataset.p; p.inReport = p.main; }); C.log(a, 'Eligió la foto del informe para ' + tgtLabel(a, k, id), 'Chose the report photo for ' + tgtLabel(a, k, id)); C.save(); U.v6refresh(); };
  A['v6e-del'] = el => {
    const id = el.dataset.id; if (!DEL.has(id)) { DEL.add(id); U.v6refresh(); setTimeout(() => { if (DEL.delete(id)) U.v6refresh(); }, 4000); return; }
    DEL.delete(id); const a = C.cur(); const arr = el.dataset.kind === 'photo' ? a.photos : a.docs; const i = arr.findIndex(x => x.id === id); if (i < 0) return; const r = arr[i]; arr.splice(i, 1);
    if (el.dataset.kind === 'photo' && r.main) { const k = r.links.asset ? 'asset' : r.links.area ? 'area' : 'q'; const nx = C.evPhotos(a, k, r.links[k])[0]; if (nx) { nx.main = true; nx.inReport = true; } }
    C.log(a, `Borró ${el.dataset.kind === 'photo' ? 'la foto' : 'el documento'} «${tx(r.title || r.name)}»`, `Deleted ${el.dataset.kind} “${tx(r.title || r.name)}”`); C.save(); U.v6refresh();
  };
  A['v6e-just'] = el => {
    const a = C.cur(); const [k, id] = el.dataset.t.split(':'); const note = ((document.getElementById(`v6e-jn-${k}-${id}`) || {}).value || '').trim();
    if (!note) return U.toast(L('Escriba una nota breve del motivo', 'Write a short note with the reason'));
    a.photoRes[el.dataset.t] = { status: 'justificada', reason: (document.getElementById(`v6e-jr-${k}-${id}`) || {}).value, note, by: me(), ts: now() };
    C.log(a, 'Justificó la foto faltante de ' + tgtLabel(a, k, id), 'Justified the missing photo of ' + tgtLabel(a, k, id)); C.save(); U.v6refresh(); U.toast(L('Motivo registrado · el pendiente sigue visible para revisión', 'Reason recorded · the item stays visible for review'));
  };

  // «Corregir activo / área»: la evidencia se gestiona en el mismo modal
  const rec0 = U.modals.rec;
  U.modals.rec = function (a, d) {
    const m = rec0(a, d); if (!d.id || !['asset', 'area'].includes(d.k)) return m;
    m.body = m.body.replace(/<div class="sec-title">(Evidencia fotográfica|Photo evidence)<\/div><div class="v6r-ph">[\s\S]*?<\/p><\/div>/, '');
    const box = `<div class="sec-title">${L('Evidencia', 'Evidence')}</div>` + U.evidBox(a, d.k, d.id);
    const i = m.body.indexOf('<div class="valbox">'); m.body = i >= 0 ? m.body.slice(0, i) + box + m.body.slice(i) : m.body + box; return m;
  };
})();

/* Modales que requieren atención: rojo suave y advertencia de borrado permanente; ámbar para cambios con impacto */
(function () {
  const U = window.ORA_UI, I = window.ORA_I18N, L = I.L, ic = U.ic;
  const toneOf = M => { if (!M) return null; const d = M.data || {};
    if (M.type === 'confirm' && d.tone) return d.tone;
    if (M.type === 'confirm') return d.danger || /Elimin|Borr|Reinici|Delete|Reset/i.test(d.title || '') ? 'danger' : (d.onYes ? 'warn' : null);
    if (['v6pcdel', 'v6wdelar'].includes(M.type)) return 'danger';
    if (M.type === 'v6pcdis' || (M.type === 'decide' && d.m === 'descartado')) return 'warn';
    return null; };
  const r0 = U.renderModal;
  U.renderModal = function () { r0(); const t = toneOf(U.modal); const m = document.querySelector('#layer .modal'); if (!t || !m) return;
    m.classList.add('tone-' + t); const b = m.querySelector('.modal-b'); if (!b || b.querySelector('.v6-tone')) return;
    b.insertAdjacentHTML('afterbegin', t === 'danger' ? `<div class="v6-tone danger" role="alert">${ic('alert')}<div><b>${L('Acción permanente', 'Permanent action')}</b><span>${L('Lo que borre no se puede recuperar ni deshacer.', 'What you delete cannot be recovered or undone.')}</span></div></div>`
      : `<div class="v6-tone warn" role="alert">${ic('alert')}<div><b>${L('Revise antes de confirmar', 'Review before confirming')}</b><span>${L('Este cambio afecta otros registros del assessment y queda en el historial.', 'This change affects other assessment records and is logged.')}</span></div></div>`); };
})();

/* Dependencias: un elemento no puede depender de sí mismo ni repetir una dependencia ya registrada */
(function () {
  const C = window.ORA, U = window.ORA_UI, I = window.ORA_I18N, L = I.L, A = U.act;
  const PAIRS = [['nd-from', 'nd-to'], ['rc-from', 'rc-to'], ['ci-from', 'ci-to']];
  const TAG = / · \((mismo elemento|same element|ya registrada|already recorded)\)$/;
  const depsFor = (a, f) => f === 'ci-from' ? ((C.S.lib.templates[C.S.ui.cind2 || 'oilgas'] || {}).deps || []) : (a ? a.deps || [] : []);
  const exists = (a, fr, to, skip, list) => (list || a.deps || []).some(d => !C.isOut(d) && d.from === fr && d.to === to && !(skip && skip[0] === fr && skip[1] === to));
  function sync() {
    const a = C.cur && C.cur();
    PAIRS.forEach(([f, t]) => { const F = document.getElementById(f), T = document.getElementById(t); if (!F || !T) return;
      if (!a && f !== 'ci-from') return; if ((f === 'rc-from' || f === 'ci-from') && !F.dataset.init) F.dataset.init = F.value + '|' + T.value;
      const skip = F.dataset.init ? F.dataset.init.split('|') : null;
      [...T.options].forEach(o => { o.textContent = o.textContent.replace(TAG, ''); if (!o.value) return;
        const same = o.value === F.value, dup = !same && exists(a, F.value, o.value, skip, depsFor(a, f));
        o.disabled = same || dup; if (same) o.textContent += L(' · (mismo elemento)', ' · (same element)'); else if (dup) o.textContent += L(' · (ya registrada)', ' · (already recorded)'); });
      const cur = T.options[T.selectedIndex]; if (!cur || cur.disabled) { const alt = [...T.options].find(o => o.value && !o.disabled); if (alt) T.value = alt.value; } });
  }
  document.addEventListener('change', e => { if (PAIRS.some(p => p[0] === e.target.id)) sync(); });
  const r0 = U.render; U.render = function () { r0.apply(this, arguments); sync(); };
  const m0 = U.renderModal; U.renderModal = function () { m0.apply(this, arguments); sync(); };
  const add0 = A['add-dep'];
  A['add-dep'] = el => { const a = C.cur(); const g = id => (document.getElementById(id) || {}).value || ''; const fr = g('nd-from'), to = g('nd-to');
    if (fr && fr === to) return U.toast(L('Un elemento no puede depender de sí mismo', 'An element cannot depend on itself'));
    if (exists(a, fr, to)) return U.toast(L('Esa dependencia ya está registrada', 'That dependency is already recorded'));
    return add0(el); };
  sync();
})();
