/* ORA v7 — Ficha única del activo: el mismo panel lateral desde Inventario, Base instalada, Modo campo y propuestas.
   Muestra origen (con la cita), estado Propuesto/Aceptado/Verificado, datos, evidencia, hallazgos, dependencias e historial. */
(function () {
  const C = window.ORA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, L = I.L, tx = I.tx, ic = U.ic, A = U.act;
  const LC = () => ({ active: L('Vigente', 'Active'), eol: L('Fin de vida', 'End of life'), discontinued: L('Descontinuado', 'Discontinued'), unknown: L('Desconocido', 'Unknown') });

  U.modals.v7asset = function (a, d) {
    const x = C.asset(a, d.id); if (!x) return { title: L('Activo', 'Asset'), body: `<div class="empty">${L('El activo ya no existe.', 'The asset no longer exists.')}</div>` };
    const m = C.mat(a, 'asset', x); const sys = x.sys ? C.system(a, x.sys) : null;
    const finds = a.findings.filter(f => (f.assets || []).includes(x.id));
    const out = a.deps.filter(dp => !C.isOut(dp) && dp.from === x.id), inn = a.deps.filter(dp => !C.isOut(dp) && dp.to === x.id);
    const props = C.props ? C.props(a).filter(p => p.status === 'pend' && ((p.kind === 'asset' && String(p.data.tag || '').toUpperCase() === x.tag) || p.data.assetRef === 't:' + x.tag || p.data.assetRef === 'id:' + x.id || p.data.fromRef === 't:' + x.tag)) : [];
    const dl = (k, v) => v ? `<div><dt>${k}</dt><dd>${v}</dd></div>` : '';
    const lc = x.lifecycle || {};
    const step = ['sugerido', 'aceptado', 'validado'].indexOf(m === 'evaluado' ? 'validado' : m);
    const flow = `<ol class="v7-flow">${[['sugerido', L('Propuesto', 'Proposed')], ['aceptado', L('Aceptado', 'Accepted')], ['validado', L('Verificado', 'Verified')]].map(([k, l], i) => `<li class="${i < step ? 'done' : i === step ? 'on' : ''}"><i>${i < step ? ic('check', 'sm') : i + 1}</i>${l}</li>`).join('')}</ol>`;
    const next = m === 'sugerido' ? `<button class="btn primary" data-act="v7a-acc" data-id="${x.id}">${ic('check', 'sm')}${L('Aceptar', 'Accept')}</button>` : m === 'aceptado' ? `<button class="btn primary" data-act="iv-decide" data-k="asset" data-id="${x.id}" data-m="validado">${ic('shield', 'sm')}${L('Verificar', 'Verify')}</button>` : '';
    const body = `<div class="v7-fh"><span class="v6w-id">${h(x.tag)}</span><b>${h(tx(x.name))}</b><small>${h(tx(x.type || ''))} · ${h(C.areaName(a, x.area) || L('Sin área', 'No area'))}${sys ? ' · ' + h(tx(sys.name)) : ''}</small></div>
      ${flow}
      <div class="v7-fa">${next}<button class="btn ghost sm" data-act="iv-edit" data-k="asset" data-id="${x.id}">${ic('edit', 'sm')}${L('Editar', 'Edit')}</button><button class="btn ghost sm" data-act="capture" data-link="asset:${x.id}">${ic('camera', 'sm')}${L('Foto', 'Photo')}</button><button class="btn ghost sm" data-act="jr-open" data-key="asset:${x.id}">${ic('map', 'sm')}Journey</button></div>
      ${x.src && x.src.quote ? `<div class="v7-fs"><span class="lbl">${L('Origen', 'Origin')} · ${h(C.provName(x.prov))}</span><blockquote class="v7-q">${ic('quote', 'sm')}<span>«${h(x.src.quote)}»<cite>${h(x.src.file || '')}${x.src.loc ? ' · ' + h(x.src.loc) : ''}</cite></span></blockquote></div>` : `<p class="small mut">${L('Origen', 'Origin')}: ${h(C.provName(x.prov))}${x.src && x.src.file ? ' · ' + h(x.src.file) : ''}</p>`}
      ${props.length ? `<div class="v7-fp"><span class="lbl">${ic('spark', 'sm')}${L('Propuestas pendientes sobre este activo', 'Pending proposals about this asset')}</span>${props.map(p => U.propCard(a, p)).join('')}</div>` : ''}
      <div class="sec-title">${L('Datos', 'Data')}</div>
      <dl class="v7-fd">${dl(L('Fabricante / modelo', 'Manufacturer / model'), h(x.mm || '—'))}${dl(L('Año', 'Year'), x.year || '—')}${dl(L('Ciclo de vida', 'Lifecycle'), h(LC()[lc.status] || lc.status || LC().unknown))}${dl(L('Redundancia', 'Redundancy'), h(tx(x.redundancy || '—')))}${dl(L('Procesos', 'Processes'), C.assetProcs(x).map(k => h(C.procName(a, k))).join(', ') || '—')}${x.note ? dl(L('Nota', 'Note'), h(x.note)) : ''}</dl>
      <div class="sec-title">${L('Evidencia', 'Evidence')}</div>${U.evidBox(a, 'asset', x.id)}
      <div class="sec-title">${L('Hallazgos', 'Findings')} <span class="mut">${finds.length}</span></div>
      ${finds.length ? `<ul class="v7-fl">${finds.map(f => `<li><button data-act="go" data-stage="6" data-target="finding-${f.id}"><code>${f.id}</code><span>${h(tx(f.title))}</span><small>${h(tx(f.status || ''))}</small></button></li>`).join('')}</ul>` : `<p class="small mut">${L('Sin hallazgos.', 'No findings.')}</p>`}
      <div class="sec-title">${L('Dependencias', 'Dependencies')} <span class="mut">${out.length + inn.length}</span></div>
      ${out.length + inn.length ? `<ul class="v7-fl">${out.map(dp => `<li><span>${L('Depende de', 'Depends on')} <b>${h(C.nodeLbl(a, dp.to))}</b> · ${h(C.depName(dp.type))}</span></li>`).join('')}${inn.map(dp => `<li><span><b>${h(C.nodeLbl(a, dp.from))}</b> ${L('depende de este activo', 'depends on this asset')} · ${h(C.depName(dp.type))}</span></li>`).join('')}</ul>` : `<p class="small mut">${L('Sin dependencias registradas.', 'No dependencies recorded.')}</p>`}
      ${(x.log || []).length ? `<div class="sec-title">${L('Historial', 'History')}</div><ul class="plain small v7-fhst">${x.log.slice(0, 8).map(l => `<li>${C.fmtDate(l.ts, true)} · ${h(C.uname(l.by) || l.by || '')} · ${h(L(l.es, l.en))}</li>`).join('')}</ul>` : ''}`;
    return { title: L('Ficha del activo', 'Asset record'), drawer: true, body, foot: `<button class="btn ghost" data-act="modal-close">${L('Cerrar', 'Close')}</button>` };
  };
  U.openAsset = id => U.openModal('v7asset', { id });
  A['v7-asset'] = el => U.openAsset(el.dataset.id);
  A['v7a-acc'] = el => { const a = C.cur(); const x = C.asset(a, el.dataset.id); C.setVal(a, 'asset', x, 'aceptado', { src: x.prov }); C.save(); U.renderModal(); U.render(); };
  // la ficha se reabre después de editar o verificar desde ella
  ['iv-rec-save', 'iv-decide-save'].forEach(k => { const f0 = A[k]; A[k] = function (el) { const back = U._fichaBack; f0.apply(this, arguments); if (back && !U.modal) { U._fichaBack = null; U.openAsset(back); } }; });
  ['iv-edit', 'iv-decide'].forEach(k => { const f0 = A[k]; A[k] = function (el) { U._fichaBack = U.modal && U.modal.type === 'v7asset' ? U.modal.data.id : null; return f0.apply(this, arguments); }; });

  // inventario: el TAG/nombre abre la ficha
  const inv0 = U.views.inventory;
  U.views.inventory = function (a) {
    return inv0.apply(this, arguments).replace(/<span class="ir-h"><span class="v6w-id ?(notag)?">([^<]+)<\/span>/g, (m0, nt, tag) => { const x = a.assets.find(y => h(y.tag) === tag); return x ? `<span class="ir-h"><button class="v7-open" data-act="v7-asset" data-id="${x.id}" title="${L('Abrir ficha', 'Open record')}"><span class="v6w-id ${nt || ''}">${tag}</span></button>` : m0; });
  };
  // modo campo: botón de ficha en cada activo
  const f0 = U.views.field;
  if (f0) U.views.field = function (a) { return f0.apply(this, arguments).replace(/<div class="fm-asa"><button class="btn ghost" data-act="capture" data-link="asset:([^"]+)">/g, (m0, id) => `<div class="fm-asa"><button class="btn ghost fm-fi" data-act="v7-asset" data-id="${id}" aria-label="${L('Ficha', 'Record')}">${ic('info', 'sm')}${L('Ficha', 'Record')}</button><button class="btn ghost" data-act="capture" data-link="asset:${id}">`); };
})();
