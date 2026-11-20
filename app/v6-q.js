/* ORA v6 — Pregunta como formulario: fila contraíble, modo vista (solo lectura) y modo edición con
   Guardar / Descartar cambios, evidencia (fotos y documentos) y hallazgos editables dentro de la tarjeta. */
(function () {
  const C = window.ORA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, ic = U.ic, L = I.L, tx = I.tx, A = U.act;
  const R = () => U.render();
  const now = () => new Date().toISOString();
  const QM = new Map();   // pregunta → 'view' | 'edit'
  const QD = new Map();   // borrador de respuesta en edición
  const NEWF = new Map(); const FDEL = new Set();
  const VALS = ['Sí', 'No', 'Desconocido', 'No aplica'];
  const VCLS = { 'Sí': 'si', 'No': 'no', 'Desconocido': 'unk', 'No aplica': 'na' };
  const FST = () => [['pendiente de verificación', L('Pendiente de verificación', 'Pending verification')], ['confirmado', L('Confirmado', 'Confirmed')]];
  const findsOf = (a, q) => a.findings.filter(f => f.q === q.id);
  const noteLbl = v => v === 'No aplica' ? L('Justificación de «No aplica» *', '“Not applicable” justification *') : v === 'Desconocido' ? L('Qué se sabe y cómo verificarlo', 'What is known and how to verify it') : L('Explicación y fuente', 'Explanation and source');
  const ansChip = v => v ? `<span class="v6qa-chip ${VCLS[v] || ''}">${h(tx(v))}</span>` : `<span class="v6qa-chip none">${L('Sin responder', 'Not answered')}</span>`;

  function findEditor(a, q) {
    const fs = findsOf(a, q); const n = NEWF.get(q.id) || 0;
    const row = (fid, f, isNew) => `<tr class="${isNew ? 'new' : ''}"><td class="id"><span class="v6w-id">${isNew ? L('Nuevo', 'New') : fid}</span></td>
      <td><input id="v6qf-t-${fid}" value="${h(f ? tx(f.title) : '')}" placeholder="${L('Qué se observó *', 'What was observed *')}" aria-label="${L('Hallazgo', 'Finding')}"></td>
      <td><input id="v6qf-d-${fid}" value="${h(f ? tx(f.desc || '') : '')}" placeholder="${L('Descripción', 'Description')}" aria-label="${L('Descripción', 'Description')}"></td>
      <td class="st"><select id="v6qf-s-${fid}" aria-label="${L('Estado', 'Status')}">${FST().map(o => U.opt(o[0], o[1], f ? f.status || 'confirmado' : 'pendiente de verificación')).join('')}</select></td>
      <td class="x"><button class="v6e-del ${FDEL.has(fid) ? 'arm' : ''}" data-act="v6qf-del" data-q="${q.id}" data-f="${fid}" aria-label="${L('Quitar hallazgo', 'Remove finding')}">${FDEL.has(fid) ? L('¿Borrar?', 'Delete?') : ic('x', 'sm')}</button></td></tr>`;
    return `<div class="v6f"><div class="v6e-h"><b>${L('Hallazgos', 'Findings')}</b><span class="pill">${fs.length}</span></div>
      ${fs.length || n ? `<table class="v6f-tb"><thead><tr><th class="id">ID</th><th>${L('Hallazgo', 'Finding')}</th><th>${L('Descripción', 'Description')}</th><th class="st">${L('Estado', 'Status')}</th><th class="x"></th></tr></thead>
      <tbody>${fs.map(f => row(f.id, f)).join('')}${Array.from({ length: n }, (_, i) => row('new' + i, null, true)).join('')}</tbody></table>` : `<p class="small mut" style="margin:0">${L('Sin hallazgos en esta pregunta.', 'No findings on this question.')}</p>`}
      <button class="plink v6f-addl" data-act="v6qf-new" data-q="${q.id}">${ic('plus', 'sm')}${L('Agregar hallazgo', 'Add finding')}</button></div>`;
  }
  const focusNew = qid => setTimeout(() => { const i = document.getElementById('v6qf-t-new' + ((NEWF.get(qid) || 1) - 1)); if (i) { i.scrollIntoView({ block: 'center' }); i.focus(); } }, 0);
  A['v6qf-new'] = el => { const id = el.dataset.q; NEWF.set(id, (NEWF.get(id) || 0) + 1); U.v6refresh(); focusNew(id); };
  A['v6qa-addf'] = el => { const id = el.dataset.q; QM.set(id, 'edit'); NEWF.set(id, (NEWF.get(id) || 0) + 1); R(); focusNew(id); };
  A['v6qf-del'] = el => {
    const fid = el.dataset.f, qid = el.dataset.q; const a = C.cur();
    if (fid.startsWith('new')) { const k = +fid.slice(3), n = NEWF.get(qid) || 1; for (let i = k; i < n - 1; i++) ['t', 'd', 's'].forEach(c => { const a1 = document.getElementById(`v6qf-${c}-new${i}`), b1 = document.getElementById(`v6qf-${c}-new${i + 1}`); if (a1 && b1) a1.value = b1.value; }); NEWF.set(qid, Math.max(0, n - 1)); U.v6refresh(); return; }
    if (!FDEL.has(fid)) { FDEL.add(fid); U.v6refresh(); setTimeout(() => { if (FDEL.delete(fid)) U.v6refresh(); }, 4000); return; }
    FDEL.delete(fid); const f = a.findings.find(z => z.id === fid); if (!f) return;
    const used = a.scenarios.some(s => s.findings.includes(fid)) || (a.opportunities || []).some(o => o.findings.includes(fid)) || (a.interventions || []).some(v => (v.findings || []).includes(fid));
    if (used || (f.assets || []).length) { f.q = null; C.log(a, `Desvinculó el hallazgo ${fid} de la pregunta ${qid}`, `Unlinked finding ${fid} from question ${qid}`); U.toast(L(`${fid} se usa en otros registros: se desvinculó de esta pregunta, no se borró`, `${fid} is used elsewhere: unlinked from this question, not deleted`)); }
    else { a.findings = a.findings.filter(z => z.id !== fid); C.log(a, 'Borró el hallazgo ' + fid, 'Deleted finding ' + fid); }
    C.save(); U.v6refresh();
  };
  function saveFindings(a, q) {
    const g = id => ((document.getElementById(id) || {}).value || '').trim(); let n = 0;
    findsOf(a, q).forEach(f => { const t = g('v6qf-t-' + f.id); if (!t) return; const d = g('v6qf-d-' + f.id), st = g('v6qf-s-' + f.id); if (t !== tx(f.title) || d !== tx(f.desc || '') || st !== (f.status || '')) { Object.assign(f, { title: t, desc: d, status: st }); n++; } });
    for (let i = 0; i < (NEWF.get(q.id) || 0); i++) { const t = g('v6qf-t-new' + i); if (!t) continue; let k = a.findings.length + 1, id; do { id = 'F-' + String(k++).padStart(2, '0'); } while (a.findings.some(f => f.id === id));
      a.findings.push({ id, title: t, desc: g('v6qf-d-new' + i), status: g('v6qf-s-new' + i), level: 'pregunta', assets: [], systems: [], deps: [], evidence: [], area: null, proc: q.proc || null, q: q.id, source: 'Entrevista', ts: now(), by: C.uname(C.S.userId) });
      C.log(a, 'Registró el hallazgo ' + id + ' en la pregunta ' + q.id, 'Recorded finding ' + id + ' on question ' + q.id); n++; }
    NEWF.delete(q.id); return n;
  }

  function body(a, x, mode) {
    const q = x.q; const r = a.answers[q.id] || {}; const fs = findsOf(a, q);
    const kids = a.questions.filter(k => k.cond && k.cond.q === q.id && k.active && (k.ind.includes('*') || k.ind.includes(a.cfg.industry)));
    if (mode === 'edit') {
      const v = QD.has(q.id) ? QD.get(q.id) : r.value; const miss = v === 'No aplica';
      return `<div class="v6w-card edit"><div class="v6w-card-mode edit">${ic('edit', 'sm')}${L('Editando la respuesta', 'Editing the answer')}</div>
        <div class="v6qa-f"><span class="v6qa-l">${L('Respuesta *', 'Answer *')}</span><div class="ans v6qa-seg" role="group" aria-label="${L('Respuesta', 'Answer')}">${VALS.map(val => `<button class="${VCLS[val]}" data-act="v6qa-pick" data-q="${q.id}" data-v="${val}" aria-pressed="${v === val}">${tx(val)}</button>`).join('')}</div></div>
        <div class="grid2" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)"><div class="field ${miss ? 'req' : ''}"><label for="v6qa-n-${q.id}">${noteLbl(v)}</label><textarea id="v6qa-n-${q.id}" rows="2">${h(tx(r.note || ''))}</textarea></div>
          <div class="field"><label for="v6qa-c-${q.id}">${L('Confianza', 'Confidence')}</label><select id="v6qa-c-${q.id}">${['Verificado', 'Estimado', 'Desconocido'].map(o => U.opt(o, tx(o), r.conf || (v === 'Desconocido' ? 'Desconocido' : 'Estimado'))).join('')}</select></div></div>
        ${kids.length ? `<p class="small mut" style="margin:0">${ic('branch', 'sm')} ${kids.length} ${L('preguntas más se activan si responde', 'more questions are triggered if you answer')} ${h(kids[0].cond.in.map(tx).join(L(' o ', ' or ')))}</p>` : ''}
        ${U.evidBox(a, 'q', q.id)}
        ${findEditor(a, q)}
        <div class="v6w-card-f"><span class="small mut">${L('Las fotos y documentos se guardan al subirlos.', 'Photos and documents are saved when uploaded.')}</span><span class="row" style="gap:6px"><button class="btn ghost sm" data-act="v6qa-cancel" data-q="${q.id}">${L('Descartar cambios', 'Discard changes')}</button><button class="btn primary sm" data-act="v6qa-save" data-q="${q.id}">${ic('check', 'sm')}${L('Guardar', 'Save')}</button></span></div></div>`;
    }
    const row = (k, v) => v == null || String(v).trim() === '' ? '' : `<div class="v6-kvr"><dt>${k}</dt><dd>${v}</dd></div>`;
    return `<div class="v6w-card"><div class="v6w-card-mode">${ic('info', 'sm')}${L('Respuesta · solo lectura', 'Answer · read only')}</div><div class="v6w-card-g"><div class="v6w-left"><dl class="v6-kv2">
        ${row(L('Respuesta', 'Answer'), ansChip(r.value))}${row(noteLbl(r.value).replace(' *', ''), h(tx(r.note || '')))}${row(L('Confianza', 'Confidence'), h(tx(r.conf || '')))}
        ${row(L('Dimensión', 'Dimension'), h(tx(q.dim || '')))}${row(L('Proceso', 'Process'), q.proc ? h(C.procName(a, q.proc)) : '')}${x.cond ? row(L('Activada por', 'Triggered by'), h(x.why || '')) : ''}
        ${row(L('Registrado', 'Recorded'), r.ts ? h(r.by || '—') + ' · ' + C.fmtDate(r.ts, true) : '')}</dl>
        ${r.value === 'Desconocido' ? `<p class="small mut" style="margin:8px 0 0">${L('Brecha de información: no es un riesgo automático.', 'Information gap: not an automatic risk.')}</p>` : ''}
        ${fs.length ? `<table class="v6f-vt"><caption>${L('Hallazgos', 'Findings')} · ${fs.length}</caption>${fs.map(f => `<tr><td class="id"><span class="v6w-id">${f.id}</span></td><td><b>${h(tx(f.title))}</b>${f.desc ? `<small>${h(tx(f.desc))}</small>` : ''}</td><td class="st">${f.status ? `<span class="pill ${f.status === 'confirmado' ? 'ok' : 'warn'}">${h((FST().find(o => o[0] === f.status) || [0, tx(f.status)])[1])}</span>` : ''}</td></tr>`).join('')}</table>` : ''}</div>
        <div>${U.evidBox(a, 'q', q.id, { readonly: true })}</div></div>
      <div class="v6w-card-f" style="justify-content:flex-end"><span class="row" style="gap:6px"><button class="btn ghost sm" data-act="v6qa-addf" data-q="${q.id}">${ic('flag', 'sm')}${L('Agregar hallazgo', 'Add finding')}</button><button class="btn primary sm" data-act="v6qa-edit" data-q="${q.id}">${ic('edit', 'sm')}${L('Editar', 'Edit')}</button></span></div></div>`;
  }

  U.qCard = function (a, x, disBtn) {
    const q = x.q; const r = a.answers[q.id] || {}; const mode = QM.get(q.id); const ok = C.answerOK(a, q);
    const nph = C.evPhotos(a, 'q', q.id).length + C.evDocs(a, 'q', q.id).length, nf = findsOf(a, q).length;
    const meta = [h(tx(q.dim || '')), q.proc ? h(C.procName(a, q.proc)) : '', !q.req && !x.cond ? L('Complementaria', 'Supplementary') : '', q.pol === 'contexto' ? L('Contexto', 'Context') : ''].filter(Boolean).join(' · ');
    return `<article class="v6qa ${x.cond ? 'cond' : ''} ${ok ? 'ok' : ''} ${mode ? 'open' : ''} ${mode === 'edit' ? 'editing' : ''}" id="q-${q.id}">
      <div class="v6qa-h"><button class="v6qa-x" data-act="v6qa-tg" data-q="${q.id}" aria-expanded="${!!mode}"><span class="v6w-caret">${ic('chev', 'sm')}</span><code class="v6qa-id">${q.id}</code>
        <span class="v6qa-main"><b>${h(tx(q.text))}</b><small>${meta}${x.cond ? ` · <span class="v6qa-trig">${ic('branch', 'sm')}${h(x.why || L('Condicional', 'Conditional'))}</span>` : ''}</small></span></button>
        <span class="v6qa-inds">${nph ? `<span class="v6qa-ind" title="${L('Evidencia', 'Evidence')}">${ic('camera', 'sm')}${nph}</span>` : ''}${nf ? `<span class="v6qa-ind f" title="${L('Hallazgos', 'Findings')}">${ic('flag', 'sm')}${nf}</span>` : ''}${ansChip(r.value)}${disBtn}</span></div>
      ${mode ? body(a, x, mode) : ''}</article>`;
  };
  A['v6qa-tg'] = el => { const id = el.dataset.q; if (QM.has(id)) { if (QM.get(id) === 'edit' && !confirmLeave(id)) return; QM.delete(id); QD.delete(id); NEWF.delete(id); } else { const a = C.cur(); QM.set(id, (a.answers[id] || {}).value ? 'view' : 'edit'); } R(); };
  A['v6qa-edit'] = el => { QM.set(el.dataset.q, 'edit'); R(); };
  A['v6qa-pick'] = el => { QD.set(el.dataset.q, el.dataset.v); U.v6refresh(); };
  A['v6qa-cancel'] = el => { const id = el.dataset.q; QD.delete(id); NEWF.delete(id); const a = C.cur(); if ((a.answers[id] || {}).value) QM.set(id, 'view'); else QM.delete(id); R(); };
  // contraer en edición con cambios sin guardar: pedir confirmación
  function confirmLeave(id) {
    const a = C.cur(); const r = a.answers[id] || {}; const n = document.getElementById('v6qa-n-' + id);
    const dirty = (QD.has(id) && QD.get(id) !== r.value) || (n && n.value.trim() !== tx(r.note || '').trim()) || (NEWF.get(id) || 0) > 0;
    if (!dirty) return true;
    U.openModal('confirm', { title: L('¿Descartar los cambios?', 'Discard the changes?'), msg: L('La respuesta tiene cambios sin guardar. Si contrae la pregunta se perderán.', 'The answer has unsaved changes. If you collapse the question they will be lost.'), yes: L('Sí, descartar cambios', 'Yes, discard changes'), onYes: () => { QM.delete(id); QD.delete(id); NEWF.delete(id); R(); } });
    return false;
  }
  A['v6qa-save'] = el => {
    const a = C.cur(); const id = el.dataset.q; const q = a.questions.find(z => z.id === id); if (!q) return;
    const o = a.answers[id] || {}; const v = QD.has(id) ? QD.get(id) : o.value;
    const note = ((document.getElementById('v6qa-n-' + id) || {}).value || '').trim(); const conf = (document.getElementById('v6qa-c-' + id) || {}).value || 'Estimado';
    if (!v) return U.toast(L('Seleccione una respuesta', 'Select an answer'));
    if (v === 'No aplica' && !note) { const n = document.getElementById('v6qa-n-' + id); if (n) n.focus(); return U.toast(L('Justifique por qué no aplica', 'Justify why it does not apply')); }
    const before = C.applicable(a).length;
    if (v !== o.value || note !== tx(o.note || '').trim() || conf !== o.conf) {
      a.answers[id] = { value: v, note, conf: v === 'Desconocido' ? 'Desconocido' : conf, ts: now(), prev: o.value || null, by: C.uname(C.S.userId), source: o.source };
      C.log(a, `Respondió la pregunta ${id}: ${v}`, `Answered question ${id}: ${tx(v)}`);
    }
    saveFindings(a, q); QD.delete(id); QM.set(id, 'view'); C.save(); R();
    const d = C.applicable(a).length - before;
    U.toast(d > 0 ? L(`Respuesta guardada · ${d} preguntas condicionales activadas`, `Answer saved · ${d} conditional questions triggered`) : L('Respuesta guardada', 'Answer saved'));
  };
  // al ir a una pregunta desde pendientes, abrirla en edición
  const goTo0 = U.goTo; U.goTo = function (stage, target) { if (stage === 4 && /^q-/.test(target || '')) { const id = target.slice(2); QM.set(id, (C.cur().answers[id] || {}).value ? 'view' : 'edit'); } return goTo0(stage, target); };
})();
