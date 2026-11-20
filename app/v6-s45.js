/* ORA v6 — Cuestionario como jerarquía (Núcleo general › Proceso › Área) con descarte rápido,
   y Evidencias con filtros por proceso, área, tipo y cobertura (sin la guía de cobertura). */
(function () {
  const C = window.ORA, D = window.ORA_DATA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, ic = U.ic, L = I.L, tx = I.tx, A = U.act;
  const R = () => U.render();
  const now = () => new Date().toISOString();
  const QO = new Map();
  const isDisc = r => r && r.value === 'No aplica' && r.quick;

  /* ---------- etapa 4 ---------- */
  const st4 = U.stage[4];
  U.stage[4] = function (a, ev) {
    const html = st4(a, ev); const i0 = html.indexOf('<h3 class="grp">'); if (i0 < 0) return html;
    const head = html.slice(0, i0); const arts = {};
    (html.match(/<article class="qc[^"]*" id="q-[^"]+">[\s\S]*?<\/article>/g) || []).forEach(s => { const m = s.match(/id="q-([^"]+)"/); arts[m[1]] = s; });
    const shown = ev.app.filter(x => arts[x.q.id]); const inc = C.included(a);
    const groups = [{ key: 'core', id: L('Núcleo', 'Core'), name: L('Preguntas generales', 'General questions'), sub: L('Aplican a toda la instalación', 'Apply to the whole facility'), items: [] }];
    const gp = {}; inc.forEach(p => { gp[p.key] = { key: 'p:' + p.key, id: p.catId || p.key, name: tx(p.name), sub: L('Criticidad ', 'Criticality ') + tx(p.crit || '—'), items: [], areas: {} }; groups.push(gp[p.key]); });
    const incK = new Set(inc.map(p => p.key));
    const sigProc = q => { const sg = q.cond && q.cond.sig; if (!sg || !String(sg).startsWith('cat:')) return null; const ck = sg.slice(4); const sy = a.systems.find(y => !C.isOut(y) && y.cat === ck && C.okd(y) && C.recProcs(y).some(k => incK.has(k))); return sy ? C.recProcs(sy).find(k => incK.has(k)) : null; };
    shown.forEach(x => { const ctx = C.qCtx ? C.qCtx(a, x.q) : { proc: x.q.proc }; const pk = x.q.proc || (ctx.proc && incK.has(ctx.proc) ? ctx.proc : null) || sigProc(x.q); const g = pk && gp[pk];
      if (!g) { groups[0].items.push(x); return; }
      const arId = ctx.area || (ctx.areas || [])[0]; if (arId && !x.q.proc) { const ar = C.area(a, arId); (g.areas[arId] = g.areas[arId] || { id: ar ? (ar.cat0 || ar.id) : arId, name: ar ? tx(ar.name) : arId, items: [] }).items.push(x); } else g.items.push(x); });
    const qrow = x => { const r = a.answers[x.q.id]; const d = isDisc(r); const art = arts[x.q.id];
      const km = U.v6kebab, mi = U.v6mi;
      const btn = d ? km('q:' + x.q.id, x.q.id, [mi(`data-act="v6q-undo" data-q="${x.q.id}"`, 'reset', L('Restaurar', 'Restore'))]) : km('q:' + x.q.id, x.q.id, [mi(`data-act="v6qa-edit" data-q="${x.q.id}"`, 'edit', L('Editar', 'Edit')), mi(`data-act="v6qa-addf" data-q="${x.q.id}"`, 'flag', L('Agregar hallazgo', 'Add finding')), mi(`data-act="v6q-dis" data-q="${x.q.id}"`, 'x', L('Borrar', 'Delete'), 'danger')]);
      return d ? `<div class="v6q-row dis" id="q-${x.q.id}"><code>${x.q.id}</code><span class="t">${h(tx(x.q.text))}</span><span class="small mut">${L('Borrada por ', 'Deleted by ')}${h(r.by || '')}</span>${btn}</div>` : (U.qCard ? U.qCard(a, x, btn) : `<div class="v6q-wrap">${btn}${art}</div>`); };
    const stat = items => { const live = items.filter(x => !isDisc(a.answers[x.q.id])); const n = live.length, ans = live.filter(x => C.answerOK(a, x.q)).length, dis = items.length - n; return { n, ans, dis, open: n - ans }; };
    const block = (g, level) => {
      const all = g.items.concat(Object.values(g.areas || {}).flatMap(z => z.items)); if (!all.length) return '';
      const s = stat(all), key = 'q:' + g.key, open = QO.has(key) ? QO.get(key) : s.open > 0;
      const live = g.items.filter(x => !isDisc(a.answers[x.q.id])), dead = g.items.filter(x => isDisc(a.answers[x.q.id]));
      const areas = Object.entries(g.areas || {}).map(([aid, z]) => { const zs = stat(z.items), zk = key + ':' + aid, zo = QO.has(zk) ? QO.get(zk) : zs.open > 0;
        return `<div class="v6q-area"><button class="v6w-tg v6q-ah" data-act="v6q-tg" data-k="${zk}" aria-expanded="${zo}"><span class="v6w-caret">${ic('chev', 'sm')}</span><span class="v6w-id">${h(z.id)}</span><span class="v6w-main"><b>${h(z.name)}</b><small>${zs.ans}/${zs.n} ${L('respondidas', 'answered')}${zs.dis ? ' · ' + zs.dis + (zs.dis === 1 ? L(' borrada', ' deleted') : L(' borradas', ' deleted')) : ''}</small></span>${prog(zs)}</button>
          ${zo ? `<div class="v6q-list">${z.items.filter(x => !isDisc(a.answers[x.q.id])).map(qrow).join('')}${z.items.filter(x => isDisc(a.answers[x.q.id])).map(qrow).join('')}</div>` : ''}</div>`; }).join('');
      return `<section class="v6w-proc v6q-g ${open ? 'open' : ''}"><div class="v6w-ph-h"><button class="v6w-tg" data-act="v6q-tg" data-k="${key}" aria-expanded="${open}"><span class="v6w-caret">${ic('chev', 'sm')}</span><span class="v6-pc-id">${h(g.id)}</span><span class="v6w-main"><b>${h(g.name)}</b><small>${h(g.sub)} · ${s.ans}/${s.n} ${L('respondidas', 'answered')}${s.dis ? ' · ' + s.dis + (s.dis === 1 ? L(' borrada', ' deleted') : L(' borradas', ' deleted')) : ''}</small></span>${prog(s)}</button></div>
        ${open ? `<div class="v6w-areas">${live.length || dead.length ? `<div class="v6q-list">${live.map(qrow).join('')}${dead.map(qrow).join('')}</div>` : ''}${areas}</div>` : ''}</section>`;
    };
    const prog = s => `<span class="v6b-prog v6q-prog"><i style="width:${s.n ? Math.round(s.ans / s.n * 100) : s.dis ? 100 : 0}%"></i><b>${s.ans}/${s.n}</b></span>`;
    return head + `<div class="v6w-bar"><span class="small mut">${L('Núcleo general › Proceso › Área. «Borrar» (menú ⋮) quita la pregunta de este alcance: queda como «No aplica», registrado, y se puede restaurar.', 'General core › Process › Area. “Delete” (⋮ menu) removes the question from this scope: it is marked “Not applicable”, logged, and can be restored.')}</span><span class="row" style="gap:6px"><button class="btn ghost sm" data-act="v6q-all" data-v="1">${L('Expandir todo', 'Expand all')}</button><button class="btn ghost sm" data-act="v6q-all" data-v="0">${L('Colapsar todo', 'Collapse all')}</button></span></div>
      <div class="v6w">${groups.map(g => block(g)).join('') || `<div class="empty">${L('Sin preguntas en este filtro.', 'No questions in this filter.')}</div>`}</div>`;
  };
  A['v6q-tg'] = el => { const k = el.dataset.k; const cur = document.querySelector(`[data-act=v6q-tg][data-k="${k}"]`); QO.set(k, !(cur && cur.getAttribute('aria-expanded') === 'true')); R(); };
  A['v6q-all'] = el => { const v = el.dataset.v === '1'; document.querySelectorAll('[data-act=v6q-tg]').forEach(b => QO.set(b.dataset.k, v)); if (v) { R(); document.querySelectorAll('[data-act=v6q-tg]').forEach(b => QO.set(b.dataset.k, true)); } R(); };
  A['v6q-dis'] = el => { const a = C.cur(); const q = el.dataset.q;
    U.openModal('confirm', { title: L('¿Borrar esta pregunta?', 'Delete this question?'), msg: L(`La pregunta ${q} quedará como «No aplica» y no se tendrá en cuenta en la evaluación. Puede restaurarla después con «Restaurar».`, `Question ${q} will be marked "Not applicable" and excluded from the evaluation. You can bring it back later with "Restore".`), yes: L('Sí, borrar', 'Yes, delete'), tone: 'warn', onYes: () => discardQ(a, q) }); };
  const discardQ = (a, q) => { a.answers[q] = { value: 'No aplica', note: L('Descartada en revisión rápida: no aplica a este alcance.', 'Discarded in quick review: not applicable to this scope.'), conf: 'Estimado', source: 'Entrevista', by: C.uname(C.S.userId), ts: now(), quick: true }; C.log(a, 'Descartó la pregunta ' + q, 'Discarded question ' + q); C.save(); R(); };
  A['v6q-undo'] = el => { const a = C.cur(); const q = el.dataset.q; delete a.answers[q]; C.log(a, 'Restauró la pregunta ' + q, 'Restored question ' + q); C.save(); R(); };
  // al ir a una pregunta desde pendientes, abrir su grupo
  const goTo0 = U.goTo; U.goTo = function (stage, target) { if (stage === 4 && /^q-/.test(target || '')) { QO.clear(); } return goTo0(stage, target); };

  /* ---------- etapa 5: evidencias con filtros ---------- */
  const evProc = (a, rec) => { const l = rec.links || {}; const out = new Set(); if (l.proc) out.add(l.proc); if (l.asset) { const x = C.asset(a, l.asset); if (x) C.assetProcs(x).forEach(k => out.add(k)); } if (l.area) { const ar = C.area(a, l.area); if (ar) C.recProcs(ar).forEach(k => out.add(k)); } if (l.q) { const q = a.questions.find(z => z.id === l.q); if (q && q.proc) out.add(q.proc); } return out; };
  const evArea = (a, rec) => { const l = rec.links || {}; if (l.area) return l.area; if (l.asset) { const x = C.asset(a, l.asset); return x && x.area; } return null; };
  U.stage[5] = function (a, ev) {
    const F = C.S.ui.evf || (C.S.ui.evf = {}); const inc = C.included(a); const docs = a.docs || [];
    const items = a.photos.map(p => ({ k: 'photo', r: p })).concat(docs.map(d => ({ k: 'doc', r: d })));
    const byProc = p => items.filter(it => evProc(a, it.r).has(p.key));
    const areasOf = p => a.areas.filter(x => !C.isOut(x) && C.recProcs(x).includes(p.key));
    const assetsOf = p => a.assets.filter(x => !C.isOut(x) && C.assetProcs(x).includes(p.key));
    const has = (k, id) => items.some(it => (it.r.links || {})[k] === id);
    const summ = inc.map(p => { const its = byProc(p); const ars = areasOf(p), ass = assetsOf(p); return { p, n: its.length, ph: its.filter(i => i.k === 'photo').length, dc: its.filter(i => i.k === 'doc').length, arNo: ars.filter(z => !has('area', z.id) && !a.assets.some(x => x.area === z.id && has('asset', x.id))).length, ar: ars.length, asNo: ass.filter(x => !has('asset', x.id)).length, as: ass.length }; });
    let list = items.filter(it => (!F.proc || evProc(a, it.r).has(F.proc)) && (!F.area || evArea(a, it.r) === F.area) && (!F.type || it.k === F.type) && (!F.st || (F.st === 'report' ? it.k === 'photo' && it.r.inReport : F.st === 'review' ? it.k === 'photo' && it.r.review === 'Por revisar' : F.st === 'finding' ? (it.r.links || {}).finding : true)));
    const noEv = summ.filter(s => !s.n).length;
    const sel = (k, lbl, opts) => `<div class="field v6-hf"><label for="v6ev-${k}">${lbl}</label><select id="v6ev-${k}" data-evf="${k}">${U.opt('', L('Todos', 'All'), F[k] || '')}${opts.map(o => U.opt(o[0], o[1], F[k] || '')).join('')}</select></div>`;
    const areaOpts = (F.proc ? a.areas.filter(x => !C.isOut(x) && C.recProcs(x).includes(F.proc)) : a.areas.filter(x => !C.isOut(x))).map(x => [x.id, tx(x.name)]);
    const filt = `<section class="v6-hfbar"><div class="v6-hf-grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">${sel('proc', L('Proceso', 'Process'), inc.map(p => [p.key, (p.catId || '') + ' · ' + tx(p.name)]))}${sel('area', L('Área', 'Area'), areaOpts)}${sel('type', L('Tipo', 'Type'), [['photo', L('Fotos', 'Photos')], ['doc', L('Documentos', 'Documents')]])}${sel('st', L('Estado', 'Status'), [['report', L('En el informe', 'In report')], ['review', L('Por revisar', 'To review')], ['finding', L('De hallazgos', 'Of findings')]])}</div>
      <div class="row" style="justify-content:space-between"><span class="small mut"><b>${list.length}</b> ${L('de', 'of')} ${items.length} ${L('archivos de evidencia', 'evidence files')}${noEv ? ` · <b style="color:var(--warn-ink)">${noEv} ${noEv === 1 ? L('proceso sin evidencia', 'process without evidence') : L('procesos sin evidencia', 'processes without evidence')}</b>` : ''}</span>${Object.values(F).some(Boolean) ? `<button class="plink" data-act="v6ev-clear">${L('Limpiar filtros', 'Clear filters')}</button>` : ''}</div></section>`;
    const cov = `<section class="box"><div class="box-head"><h3>${L('Evidencia por proceso', 'Evidence by process')}</h3><p>${L('Clic en un proceso para ver solo su evidencia. En ámbar, lo que todavía no tiene ningún archivo.', 'Click a process to see only its evidence. In amber, what has no file yet.')}</p></div><div class="v6ev-sum">${summ.map(s => `<button class="v6ev-p ${s.n ? '' : 'none'} ${F.proc === s.p.key ? 'on' : ''}" data-act="v6ev-proc" data-k="${s.p.key}"><span class="v6-pc-id">${h(s.p.catId || s.p.key)}</span><span class="v6w-main"><b>${h(tx(s.p.name))}</b><small>${s.ph} ${L('fotos', 'photos')} · ${s.dc} ${L('documentos', 'documents')}</small></span>
      <span class="v6ev-gap ${s.arNo ? 'w' : ''}">${s.ar - s.arNo}/${s.ar} ${L('áreas', 'areas')}</span><span class="v6ev-gap ${s.asNo ? 'w' : ''}">${s.as - s.asNo}/${s.as} ${L('activos', 'assets')}</span></button>`).join('')}</div></section>`;
    const tag = it => { const l = it.r.links || {}; return [l.asset ? C.assetLbl(a, l.asset) : '', l.area ? C.areaName(a, l.area) : '', l.q || '', l.finding || ''].filter(Boolean).join(' · '); };
    const phs = list.filter(i => i.k === 'photo').map(i => U.photoCard(a, i.r)).join('');
    const dcs = list.filter(i => i.k === 'doc').map(i => `<div class="v6e-doc"><span class="v6e-ext">${h((/\.([a-z0-9]{2,4})$/i.exec(i.r.file || '') || [0, 'DOC'])[1].toUpperCase())}</span><span class="v6e-dn"><b>${h(tx(i.r.name))}</b><small>${h(tag(i))}</small></span><button class="btn ghost sm" data-act="wk-doc-open" data-id="${i.r.id}">${ic('down', 'sm')}</button></div>`).join('');
    const gal = `<section class="box"><div class="box-head"><h3>${L('Evidencia', 'Evidence')}</h3><button class="btn soft sm" data-act="capture">${ic('camera', 'sm')}${L('Foto sin asociar', 'Unlinked photo')}</button><p>${L('Para subir varias fotos o documentos a un activo o área, use su tarjeta en el Recorrido.', 'To upload several photos or documents to an asset or area, use its card in the Walkdown.')}</p></div><div class="box-body">
      ${phs ? `<div class="gallery">${phs}</div>` : ''}${dcs ? `<div class="sec-title">${L('Documentos', 'Documents')}</div><div class="v6e-docs">${dcs}</div>` : ''}${!phs && !dcs ? `<div class="empty">${L('Sin evidencia con estos filtros.', 'No evidence with these filters.')}</div>` : ''}</div></section>`;
    const reqs = (ev.reqs || C.photoReqs(a)).filter(r => r.status !== 'capturada' && r.status !== 'aceptada');
    const kindL = { area: L('Área', 'Area'), asset: L('Activo', 'Asset'), finding: L('Hallazgo', 'Finding'), q: L('Pregunta', 'Question') };
    const pend = reqs.length ? `<section class="box" id="v6ev-pend"><div class="box-head"><h3>${L('Pendientes de evidencia', 'Evidence pending')} · ${reqs.length}</h3><p>${L('Agregue la foto o registre el motivo por el que no la hay; una justificación queda por revisar hasta que se acepte la excepción.', 'Add the photo or record why there is none; a justification stays under review until the exception is accepted.')}</p></div><div>
      ${reqs.map(r => `<div class="cov-row" id="req-${r.key.replace(':', '-')}"><div><b>${h(r.label)}</b><div class="why">${kindL[r.kind] || r.kind} · ${h(r.why)} · ${r.have.length}/${r.need}</div>${r.res ? `<div class="jnote"><b>${h(tx(r.res.reason))}:</b> ${h(tx(r.res.note))} <span class="mut">— ${h(r.res.by || '')}</span></div>` : ''}</div>
        <div>${U.phState(r.status)}</div>
        <div class="row" style="gap:6px;justify-content:flex-end"><button class="btn soft sm" data-act="capture" data-link="${r.key}">${ic('camera', 'sm')}${L('Foto', 'Photo')}</button>${r.status === 'sin foto' ? `<button class="btn ghost sm" data-act="justify" data-key="${r.key}">${L('Registrar motivo', 'Record reason')}</button>` : ''}${r.status === 'justificada' ? `<button class="btn ghost sm" data-act="accept-exc" data-key="${r.key}">${L('Aceptar excepción', 'Accept exception')}</button>` : ''}</div></div>`).join('')}</div></section>` : '';
    return pend + filt + cov + gal;
  };
  document.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.evf; if (!k) return; const F = C.S.ui.evf || (C.S.ui.evf = {}); F[k] = e.target.value; if (k === 'proc') F.area = ''; C.save(); R(); });
  A['v6ev-proc'] = el => { const F = C.S.ui.evf || (C.S.ui.evf = {}); F.proc = F.proc === el.dataset.k ? '' : el.dataset.k; F.area = ''; C.save(); R(); };
  A['v6ev-clear'] = () => { C.S.ui.evf = {}; C.save(); R(); };
  R();
})();
