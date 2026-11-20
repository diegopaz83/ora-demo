/* ORA — RQ-01 a RQ-10: respuesta, evidencia y hallazgos con contexto heredado */
(function () {
  const C = window.ORA, D = window.ORA_DATA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, ic = U.ic, L = I.L, tx = I.tx, A = U.act;
  const R = () => U.render();
  const $ = id => document.getElementById(id);
  const val = id => (($(id) || {}).value || '').trim();
  const meN = () => C.me().name; const now = () => new Date().toISOString();
  const uniq = x => [...new Set(x.filter(Boolean))];
  const ORIG = () => ({ cuestionario: L('Cuestionario', 'Questionnaire'), recorrido: L('Recorrido', 'Walkdown'), evidencias: L('Evidencias', 'Evidence'), hallazgo: L('Hallazgo', 'Finding'), general: L('Captura general', 'General capture') });
  I.B('Cuestionario', 'Questionnaire'); I.B('Recorrido', 'Walkdown'); I.B('Captura general', 'General capture');

  // ---------- vínculos múltiples (RQ-07) ----------
  C.lk = (p, k, id) => !!(p && p.links && (p.links[k] === id || (p.links[k + 's'] || []).includes(id)));

  // ---------- contexto de una pregunta (RQ-02): nunca inventa un activo ----------
  C.qCtx = function (a, q, seen) {
    const r = a.answers[q.id]; if (r && r.ctx) return r.ctx;
    seen = seen || new Set(); if (seen.has(q.id)) return { proc: q.proc || null, area: null, assets: [], systems: [], deps: [], how: 'pregunta' }; seen.add(q.id);
    let assets = [], systems = [], how = 'pregunta'; const c = q.cond || {};
    if (c.shared) { const sh = C.sharedControllers(a)[0]; if (sh) { assets = [...sh.pumps.map(x => x.id), sh.plc.id]; how = 'disparador'; } }
    if (c.q) { const pq = a.questions.find(x => x.id === c.q); if (pq) { const pc = C.qCtx(a, pq, seen); if (pc.assets.length || pc.systems.length) { assets = assets.length ? assets : pc.assets; systems = pc.systems; how = 'disparador'; } } }
    if (c.sig === 'spof' && C.depAnalysis) { Object.keys(C.depAnalysis(a).spof).forEach(id => C.asset(a, id) ? assets.push(id) : systems.push(id)); how = 'disparador'; }
    if (c.sig === 'energy') { const inc = new Set(C.included(a).map(p => p.key)); const s = a.systems.find(x => !C.isOut(x) && x.cat === 'energia' && C.recProcs(x).some(k => inc.has(k)) && C.okd(x)); const u = a.assets.find(x => !C.isOut(x) && x.type === 'UPS' && C.okd(x)); if (s) systems.push(s.id); if (u) assets.push(u.id); how = 'disparador'; }
    assets = uniq(assets); systems = uniq(systems);
    const ars = uniq(assets.map(id => (C.asset(a, id) || {}).area));
    let proc = q.proc || null; if (!proc && assets.length) { const inc = C.included(a).map(p => p.key); proc = inc.find(k => assets.every(id => C.assetProcs(C.asset(a, id)).includes(k))) || null; }
    return { proc, area: ars.length === 1 ? ars[0] : null, areas: ars, assets, systems, deps: [], how };
  };
  const snap = (a, ctx, q, ans, origin) => ({ assessment: a.code, proc: ctx.proc ? { key: ctx.proc, name: C.procName(a, ctx.proc) } : null, area: ctx.area ? { id: ctx.area, name: C.areaName(a, ctx.area) } : null,
    assets: (ctx.assets || []).map(id => ({ id, tag: C.nodeLbl(a, id) })), systems: (ctx.systems || []).map(id => ({ id, name: C.nodeLbl(a, id) })), deps: (ctx.deps || []).map(id => { const d = a.deps.find(x => x.id === id); return { id, lbl: d ? C.nodeLbl(a, d.from) + ' → ' + C.nodeLbl(a, d.to) : id }; }),
    q: q ? { id: q.id, text: tx(q.text) } : null, ans: ans ? { value: ans.value, ts: ans.ts } : null, origin, ts: now(), by: C.S.userId });
  const ctxOf = (a, rec) => rec.ctx || { proc: (rec.links || {}).proc || rec.proc || null, area: (rec.links || {}).area || rec.area || null, assets: uniq([...(((rec.links || {}).assets) || []), (rec.links || {}).asset, ...(rec.assets || [])]), systems: uniq([...(((rec.links || {}).systems) || []), (rec.links || {}).system]), deps: uniq([...(((rec.links || {}).deps) || []), (rec.links || {}).dep, ...(rec.deps || [])]) };

  // ---------- ruta visible (RQ-03/04) ----------
  U.ctxPath = function (a, ctx, q, ans, opts) {
    opts = opts || {}; const seg = [];
    seg.push(`<span class="cp-s cp-a">${h(a.code)}</span>`);
    seg.push(ctx.proc ? `<button class="cp-s" data-act="cp-go" data-key="process:${ctx.proc}">${h(C.procName(a, ctx.proc))}</button>` : `<span class="cp-s mut">${L('Assessment completo', 'Whole assessment')}</span>`);
    if (ctx.area) seg.push(`<button class="cp-s" data-act="cp-go" data-key="area:${ctx.area}">${h(C.areaName(a, ctx.area))}</button>`);
    else if ((ctx.areas || []).length > 1) seg.push(`<span class="cp-s">${ctx.areas.map(id => h(C.areaName(a, id))).join(' + ')}</span>`);
    const els = [...(ctx.assets || []).map(id => ['asset', id]), ...(ctx.systems || []).map(id => ['system', id]), ...(ctx.deps || []).map(id => ['dep', id])];
    if (els.length) seg.push(els.map(([k, id]) => `<button class="cp-s cp-el" data-act="cp-go" data-key="${k}:${id}">${h(k === 'dep' ? (d => d ? C.nodeLbl(a, d.from) + ' → ' + C.nodeLbl(a, d.to) : id)(a.deps.find(x => x.id === id)) : C.nodeLbl(a, id))}</button>`).join(''));
    if (q) seg.push(`<button class="cp-s" data-act="cp-go" data-key="q:${q.id}">${q.id}</button>`);
    if (ans && ans.value) seg.push(`<span class="cp-s cp-ans">${h(tx(ans.value))}</span>`);
    return `<nav class="ctxpath ${opts.cls || ''}" aria-label="${L('Contexto', 'Context')}">${opts.label ? `<span class="cp-l">${opts.label}</span>` : ''}${seg.join('<i aria-hidden="true">›</i>')}</nav>`;
  };
  const snapPath = (s) => [s.assessment, s.proc && s.proc.name, s.area && s.area.name, [...(s.assets || []).map(x => x.tag), ...(s.systems || []).map(x => x.name), ...(s.deps || []).map(x => x.lbl)].join(', '), s.q && s.q.id, s.ans && tx(s.ans.value)].filter(Boolean).map(x => h(x)).join(' › ');
  A['cp-go'] = el => { const key = el.dataset.key; const [k, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)]; U.closeModal();
    if (k === 'q') return U.goTo(4, 'q-' + id); if (k === 'process') return U.goTo(2, 'proc-' + id);
    C.S.ui.view = 'journey'; C.S.ui.jfoc = key; C.S.ui.jf = {}; C.save(); R(); };

  // ---------- respuesta (RQ-01, RQ-09): contexto, historial y fuente ----------
  const ans0 = A.ans;
  A.ans = el => {
    const a = C.cur(); const qid = el.dataset.q; const prev = a.answers[qid]; const q = a.questions.find(x => x.id === qid);
    const keepCtx = prev && prev.ctx; let ctx = keepCtx || C.qCtx(a, q);
    if (!keepCtx && el.dataset.ctx) { try { const c2 = JSON.parse(el.dataset.ctx); ctx = Object.assign({}, ctx, c2, { how: 'recorrido' }); } catch (e) {} }
    ans0(el);
    const r = a.answers[qid]; if (!r) return;
    r.ctx = ctx; r.src = (prev && prev.src) || (el.dataset.ctx ? 'campo' : 'entrevista'); r.origin = (prev && prev.origin) || (el.dataset.ctx ? 'recorrido' : 'cuestionario'); r.userId = C.S.userId;
    r.hist = (prev && prev.hist ? prev.hist.slice(0, 19) : []); r.hist.unshift({ value: r.value, by: C.S.userId, ts: r.ts, origin: el.dataset.ctx ? 'recorrido' : 'cuestionario' });
    r.ctxLog = (prev && prev.ctxLog) || [];
    C.save(); R();
  };

  // ---------- etapa 4: ruta, fuente y acciones con herencia ----------
  const st4 = U.stage[4];
  U.stage[4] = function (a, ev) {
    let html = st4(a, ev);
    ev.app.forEach(({ q }) => {
      const r = a.answers[q.id]; const ctx = C.qCtx(a, q);
      const o = `id="q-${q.id}">`; const i = html.indexOf(o); if (i < 0) return;
      const metaEnd = html.indexOf('</div>', i) + 6;
      const nPh = a.photos.filter(p => C.lk(p, 'q', q.id)).length, nDoc = (a.docs || []).filter(d => C.lk(d, 'q', q.id)).length, nF = a.findings.filter(f => f.q === q.id).length;
      const scn = C.trace ? C.trace(a, 'q:' + q.id).scns : [];
      const path = U.ctxPath(a, ctx, null, null, { label: ctx.how === 'disparador' ? L('Contexto (por el disparador)', 'Context (from the trigger)') : L('Contexto', 'Context'), cls: 'q-ctx' }) + (r ? `<button class="plink cp-chg" data-act="reassoc" data-kind="ans" data-id="${q.id}">${L('Cambiar asociación', 'Change association')}</button>` : '');
      html = html.slice(0, metaEnd) + `<div class="q-ctxw">${path}</div>` + html.slice(metaEnd);
      if (r) {
        const confEnd = `data-f="ans.${q.id}.conf">`; const j = html.indexOf(confEnd); if (j > 0) { const k = html.indexOf('</div>', html.indexOf('</select>', j)) + 6; html = html.slice(0, k) + `<div class="field"><label for="as-${q.id}">${L('Fuente', 'Source')}</label><select id="as-${q.id}" data-f="ans.${q.id}.src">${['campo', 'documento', 'entrevista'].map(x => U.opt(x, C.provName(x), r.src || 'entrevista')).join('')}</select></div>` + html.slice(k); }
        html = html.replace(`<button class="btn ghost sm" data-act="capture" data-link="q:${q.id}">`, `<button class="btn ghost sm" data-act="q-trace" data-q="${q.id}" title="${L('Respuesta, evidencias, hallazgos y escenarios', 'Answer, evidence, findings and scenarios')}">${ic('link', 'sm')}${nPh + nDoc + nF + scn.length ? `${nPh + nDoc} ${L('evid.', 'evid.')} · ${nF} ${L('hall.', 'find.')} · ${scn.length} ${L('esc.', 'scn.')}` : L('Trazabilidad', 'Traceability')}</button><button class="btn ghost sm" data-act="q-doc" data-q="${q.id}">${ic('doc', 'sm')}${L('Documento', 'Document')}</button><button class="btn ghost sm" data-act="q-photo" data-q="${q.id}">`);
        html = html.replace(`<button class="btn ghost sm" data-act="finding" data-q="${q.id}">`, `<button class="btn ghost sm" data-act="q-finding" data-q="${q.id}">`);
      }
    });
    return html;
  };

  // ---------- captura con contexto heredado (RQ-03, RQ-04, RQ-07, RQ-09, RQ-10) ----------
  const ctxFor = (a, d) => { const q = d.q && a.questions.find(x => x.id === d.q); const base = d.ctx || (q ? C.qCtx(a, q) : { proc: null, area: null, assets: [], systems: [], deps: [] }); return { q, ans: q ? a.answers[q.id] : null, ctx: JSON.parse(JSON.stringify(base)) }; };
  A['q-photo'] = el => { const a = C.cur(); const d = { q: el.dataset.q || null, origin: el.dataset.origin || 'cuestionario' }; if (el.dataset.el) { const [k, id] = el.dataset.el.split(':'); const c = ctxFor(a, d).ctx; if (k === 'asset' && !c.assets.includes(id)) c.assets.push(id); if (k === 'system' && !c.systems.includes(id)) c.systems.push(id); if (k === 'dep' && !c.deps.includes(id)) c.deps.push(id); if (k === 'area') c.area = id; const x = k === 'asset' && C.asset(a, id); if (x && !c.area) c.area = x.area; if (x && !c.proc) c.proc = C.assetProcs(x)[0]; d.ctx = c; } U.cap = {}; U.openModal('capq', d); };
  U.modals.capq = function (a, d) {
    const { q, ans, ctx } = ctxFor(a, d); d.ctx = d.ctx || ctx; const cap = U.cap || {};
    return { title: L('Evidencia', 'Evidence') + (q ? ' · ' + q.id : ''), wide: true, body: `${U.ctxPath(a, d.ctx, q, ans, { label: L('Se vincula a', 'Linked to'), cls: 'ro' })}
      <div class="drop ${cap.url ? 'has' : ''}">${cap.url ? `<img src="${cap.url}" alt="${L('Vista previa', 'Preview')}">` : `${ic('camera')}<b>${L('Tome una foto o cargue un archivo', 'Take a photo or upload a file')}</b>`}
        <div class="row"><label class="btn primary sm" for="cap-cam">${ic('camera', 'sm')}${L('Tomar foto', 'Take photo')}</label><input class="sr" type="file" id="cap-cam" accept="image/*" capture="environment" data-cap="1"><label class="btn ghost sm" for="cap-file">${ic('image', 'sm')}${L('Cargar archivo', 'Upload file')}</label><input class="sr" type="file" id="cap-file" accept="image/*" data-cap="1"></div>${cap.info ? `<span class="small mut">${h(cap.info)}</span>` : ''}${cap.err ? `<span class="small" style="color:var(--err-ink)">${h(cap.err)}</span>` : ''}</div>
      <div class="field"><label for="cp-cap">${L('Pie de foto (opcional)', 'Caption (optional)')}</label><textarea id="cp-cap" rows="2">${h(cap.caption || '')}</textarea></div>
      <div class="grid2"><div class="field"><label for="cp-sens">${L('Sensibilidad', 'Sensitivity')}</label><select id="cp-sens">${[['normal', L('Normal', 'Normal')], ['sensible', L('Sensible: requiere autorización del cliente', 'Sensitive: needs client authorization')], ['restringida', L('Restringida: nunca en el informe', 'Restricted: never in the report')]].map(([k, l]) => U.opt(k, l, cap.sens || 'normal')).join('')}</select></div>
        <div class="field"><span class="lbl">${L('Informe', 'Report')}</span><label class="check"><input type="checkbox" id="cp-auth" ${cap.auth ? 'checked' : ''}><span>${L('Autorizada por el cliente', 'Authorized by the client')}</span></label><label class="check"><input type="checkbox" id="cp-rep" ${cap.rep === false ? '' : 'checked'}><span>${L('Incluir en el informe (sujeta a revisión)', 'Include in the report (subject to review)')}</span></label></div></div>
      <p class="small mut">${ic('clock', 'sm')} ${h(C.me().name)} · ${C.fmtDate(now(), true)} · ${ORIG()[d.origin] || d.origin} · ${L('Por revisar', 'To review')}</p>`,
      foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button><button class="btn primary" data-act="capq-save" ${cap.blob ? '' : 'disabled'}>${ic('check', 'sm')}${L('Guardar evidencia', 'Save evidence')}</button>` };
  };
  const onCap0 = U.onCapFile;
  U.onCapFile = async function (input) { if (!U.modal || U.modal.type !== 'capq') return onCap0(input); const keep = { caption: val('cp-cap'), sens: val('cp-sens'), auth: ($('cp-auth') || {}).checked, rep: ($('cp-rep') || {}).checked }; const f = input.files && input.files[0]; if (!f) return; try { const o = await C.optimize(f); if (U.cap && U.cap.url) URL.revokeObjectURL(U.cap.url); U.cap = Object.assign(keep, { blob: o.blob, url: URL.createObjectURL(o.blob), info: `${o.ow}×${o.oh} px → ${o.w}×${o.h} px · ${(o.blob.size / 1024).toFixed(0)} KB` }); } catch (e) { U.cap = Object.assign(keep, { err: e.message }); } U.renderModal(); };
  const linksFrom = (ctx, q, ans) => { const l = {}; if (q) l.q = q.id; if (ans) l.ans = ans.value; if (ctx.proc) l.proc = ctx.proc; if (ctx.area) l.area = ctx.area; if (ctx.assets.length) { l.asset = ctx.assets[0]; l.assets = ctx.assets.slice(); } if ((ctx.systems || []).length) { l.system = ctx.systems[0]; l.systems = ctx.systems.slice(); } if ((ctx.deps || []).length) { l.dep = ctx.deps[0]; l.deps = ctx.deps.slice(); } return l; };
  const autoTitle = (a, ctx, q) => [(ctx.assets || []).map(id => C.nodeLbl(a, id)).join(', ') || (ctx.area && C.areaName(a, ctx.area)) || (ctx.proc && C.procName(a, ctx.proc)) || a.code, q && q.id].filter(Boolean).join(' · ');
  A['capq-save'] = async () => {
    const a = C.cur(); const d = U.modal.data; const cap = U.cap; if (!cap || !cap.blob) return; const q = d.q && a.questions.find(x => x.id === d.q); const ans = q && a.answers[q.id];
    const id = C.uid('PH'); await C.putPhoto(id, cap.blob); C.registerURL(id, cap.blob);
    const p = { id, src: 'idb:' + id, title: autoTitle(a, d.ctx, q), caption: val('cp-cap'), author: meN(), authorId: C.S.userId, ts: now(), review: 'Por revisar', inReport: $('cp-rep').checked, sens: val('cp-sens'), auth: $('cp-auth').checked, origin: d.origin, links: linksFrom(d.ctx, q, ans), ctx0: snap(a, d.ctx, q, ans, d.origin), ctxLog: [], hist: [{ ts: now(), by: C.S.userId, es: 'Capturada', en: 'Captured' }] };
    if (d.finding) p.links.finding = d.finding;
    a.photos.push(p); C.log(a, 'Cargó la evidencia ' + id + ' (' + p.title + ')', 'Uploaded evidence ' + id + ' (' + p.title + ')');
    URL.revokeObjectURL(cap.url); U.cap = null; U.closeModal(); C.save(); R(); U.toast(L('Evidencia vinculada a ', 'Evidence linked to ') + p.title);
  };

  // ---------- documento desde pregunta ----------
  A['q-doc'] = el => { U.docFile = null; U.openModal('docq', { q: el.dataset.q, origin: 'cuestionario' }); };
  U.modals.docq = function (a, d) { const { q, ans, ctx } = ctxFor(a, d); d.ctx = d.ctx || ctx;
    return { title: L('Documento', 'Document') + (q ? ' · ' + q.id : ''), body: `${U.ctxPath(a, d.ctx, q, ans, { label: L('Se vincula a', 'Linked to'), cls: 'ro' })}<div class="drop"><label class="btn primary sm" for="dc-file">${ic('down', 'sm')}${L('Elegir archivo', 'Choose file')}</label><input class="sr" type="file" id="dc-file" data-docfile="1"><span class="small mut" id="dc-size">${L('Máximo 10 MB. Se guarda en este navegador.', 'Up to 10 MB. Stored in this browser.')}</span></div><div class="field"><label for="dc-name">${L('Nombre', 'Name')} *</label><input id="dc-name"></div>`,
      foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button><button class="btn primary" data-act="docq-save">${L('Vincular', 'Link')}</button>` }; };
  A['docq-save'] = async () => { const a = C.cur(); const d = U.modal.data; const f = U.docFile; const name = val('dc-name'); if (!f) return U.toast(L('Seleccione un archivo', 'Choose a file')); if (!name) return U.toast(L('Agregue un nombre', 'Add a name'));
    const q = d.q && a.questions.find(x => x.id === d.q); const ans = q && a.answers[q.id]; const id = C.uid('DOC'); await C.putPhoto(id, f); C.registerURL(id, f);
    (a.docs = a.docs || []).push({ id, name, file: f.name, size: f.size, type: f.type, links: linksFrom(d.ctx, q, ans), ctx0: snap(a, d.ctx, q, ans, d.origin), ctxLog: [], origin: d.origin, review: 'Por revisar', by: C.S.userId, ts: now() });
    C.log(a, 'Adjuntó el documento «' + name + '»', 'Attached document “' + name + '”'); U.docFile = null; U.closeModal(); C.save(); R(); U.toast(L('Documento vinculado', 'Document linked')); };

  // ---------- hallazgo con contexto heredado (RQ-05) ----------
  A['q-finding'] = el => { U.fqFile = null; U.openModal('findq', { q: el.dataset.q || null, origin: el.dataset.origin || 'cuestionario', el: el.dataset.el || '' }); };
  U.modals.findq = function (a, d) { const r0 = ctxFor(a, d); if (!d.ctx) { d.ctx = r0.ctx; if (d.el) { const [k, id] = d.el.split(':'); if (k === 'asset' && !d.ctx.assets.includes(id)) { d.ctx.assets.push(id); const x = C.asset(a, id); if (x && !d.ctx.area) d.ctx.area = x.area; if (x && !d.ctx.proc) d.ctx.proc = C.assetProcs(x)[0]; } if (k === 'area') d.ctx.area = id; if (k === 'system' && !d.ctx.systems.includes(id)) d.ctx.systems.push(id); if (k === 'dep' && !d.ctx.deps.includes(id)) d.ctx.deps.push(id); } }
    return { title: L('Hallazgo', 'Finding') + (r0.q ? ' · ' + r0.q.id : ''), wide: true, body: `${U.ctxPath(a, d.ctx, r0.q, r0.ans, { label: L('Se vincula a', 'Linked to'), cls: 'ro' })}
      <div class="field"><label for="fq-title">${L('Título del hallazgo', 'Finding title')} *</label><input id="fq-title" data-autofocus></div><div class="field"><label for="fq-desc">${L('Detalle', 'Detail')}</label><textarea id="fq-desc" rows="3"></textarea></div>
      <div class="field"><span class="lbl">${L('Evidencia adicional (opcional)', 'Additional evidence (optional)')}</span><div class="row"><label class="btn ghost sm" for="fq-file">${ic('camera', 'sm')}${L('Foto', 'Photo')}</label><input class="sr" type="file" id="fq-file" accept="image/*" data-fqfile="1"><span class="small mut" id="fq-fn">${U.fqFile ? h(U.fqFile.name) : L('Sin archivo', 'No file')}</span></div></div>
      <p class="small mut">${ic('clock', 'sm')} ${h(C.me().name)} · ${C.fmtDate(now(), true)} · ${ORIG()[d.origin] || d.origin}</p>`,
      foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button><button class="btn primary" data-act="findq-save">${L('Registrar hallazgo', 'Record finding')}</button>` }; };
  document.addEventListener('change', e => { const t = e.target; if (t.dataset && t.dataset.fqfile) { U.fqFile = t.files && t.files[0]; const s = $('fq-fn'); if (s) s.textContent = U.fqFile ? U.fqFile.name : ''; } });
  A['findq-save'] = async () => {
    const a = C.cur(); const d = U.modal.data; const t = val('fq-title'); if (!t) return U.toast(L('Escriba el título del hallazgo', 'Enter the finding title'));
    const q = d.q && a.questions.find(x => x.id === d.q); const ans = q && a.answers[q.id];
    let k = a.findings.length + 1, id; do { id = 'F-' + String(k++).padStart(2, '0'); } while (a.findings.some(f => f.id === id));
    const f = { id, title: t, desc: val('fq-desc'), assets: d.ctx.assets.slice(), systems: (d.ctx.systems || []).slice(), deps: (d.ctx.deps || []).slice(), q: q ? q.id : null, ans: ans ? ans.value : null, proc: d.ctx.proc, area: d.ctx.area, ts: now(), by: meN(), byId: C.S.userId, origin: d.origin, review: 'Por revisar', ctx0: snap(a, d.ctx, q, ans, d.origin), ctxLog: [] };
    a.findings.push(f); C.log(a, 'Registró el hallazgo ' + id, 'Recorded finding ' + id);
    if (U.fqFile) { try { const o = await C.optimize(U.fqFile); const pid = C.uid('PH'); await C.putPhoto(pid, o.blob); C.registerURL(pid, o.blob); const l = linksFrom(d.ctx, q, ans); l.finding = id; a.photos.push({ id: pid, src: 'idb:' + pid, title: id + ' · ' + t, caption: '', author: meN(), authorId: C.S.userId, ts: now(), review: 'Por revisar', inReport: true, sens: 'normal', auth: false, origin: 'hallazgo', links: l, ctx0: snap(a, d.ctx, q, ans, 'hallazgo'), ctxLog: [] }); } catch (e) { U.toast(e.message); } }
    U.fqFile = null; U.closeModal(); C.save(); R(); U.toast(L(`Hallazgo ${id} registrado con su contexto`, `Finding ${id} recorded with its context`));
  };

  // ---------- cambiar asociación (RQ-06): secundaria, con motivo e historial ----------
  const recOf = (a, kind, id) => kind === 'ans' ? a.answers[id] : kind === 'photo' ? a.photos.find(x => x.id === id) : kind === 'doc' ? (a.docs || []).find(x => x.id === id) : a.findings.find(x => x.id === id);
  A.reassoc = el => U.openModal('reassoc', { kind: el.dataset.kind, id: el.dataset.id });
  U.modals.reassoc = function (a, d) {
    const r = recOf(a, d.kind, d.id); const c = d.kind === 'ans' ? (r.ctx || C.qCtx(a, a.questions.find(x => x.id === d.id))) : ctxOf(a, r);
    const cb = (cls, id, lbl, on) => `<label><input type="checkbox" class="${cls}" value="${id}" ${on ? 'checked' : ''}>${h(lbl)}</label>`;
    return { title: L('Cambiar asociación', 'Change association'), wide: true, body: `${U.ctxPath(a, c, null, null, { label: L('Actual', 'Current'), cls: 'ro' })}
      <div class="grid2"><div class="field"><label for="ra-proc">${L('Proceso', 'Process')}</label><select id="ra-proc">${U.opt('', L('— General del assessment —', '— Assessment-wide —'), c.proc || '')}${a.processes.filter(p => p.status === 'incluido').map(p => U.opt(p.key, tx(p.name), c.proc || '')).join('')}</select></div><div class="field"><label for="ra-area">${L('Área', 'Area')}</label><select id="ra-area">${U.opt('', L('— Ninguna (general del proceso) —', '— None (process-wide) —'), c.area || '')}${a.areas.filter(x => !C.isOut(x)).map(x => U.opt(x.id, tx(x.name), c.area || '')).join('')}</select></div></div>
      <div class="field"><span class="lbl">${L('Activos (puede elegir varios o ninguno)', 'Assets (choose several or none)')}</span><div class="cbs">${a.assets.filter(x => !C.isOut(x)).map(x => cb('ra-as', x.id, x.tag, c.assets.includes(x.id))).join('')}</div></div>
      ${a.systems.length ? `<div class="field"><span class="lbl">${L('Sistemas OT', 'OT systems')}</span><div class="cbs">${a.systems.filter(x => !C.isOut(x)).map(x => cb('ra-sy', x.id, tx(x.name), (c.systems || []).includes(x.id))).join('')}</div></div>` : ''}
      ${a.deps.length ? `<div class="field"><span class="lbl">${L('Dependencias', 'Dependencies')}</span><div class="cbs">${a.deps.filter(x => !C.isOut(x)).map(x => cb('ra-dp', x.id, C.nodeLbl(a, x.from) + ' → ' + C.nodeLbl(a, x.to), (c.deps || []).includes(x.id))).join('')}</div></div>` : ''}
      <div class="field"><label for="ra-why">${L('Motivo del cambio', 'Reason for the change')} *</label><input id="ra-why" placeholder="${L('p. ej. la foto corresponde también a P-101B', 'e.g. the photo also shows P-101B')}"></div>
      <p class="hint">${L('El contexto original se conserva; este cambio queda en el historial con autor y fecha.', 'The original context is kept; this change is logged with author and date.')}</p>`,
      foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button><button class="btn primary" data-act="reassoc-save" data-kind="${d.kind}" data-id="${h(d.id)}">${L('Guardar', 'Save')}</button>` };
  };
  A['reassoc-save'] = el => {
    const a = C.cur(); const why = val('ra-why'); if (!why) return U.toast(L('Indique el motivo del cambio', 'State the reason for the change'));
    const kind = el.dataset.kind, id = el.dataset.id; const r = recOf(a, kind, id); const q = kind === 'ans' ? a.questions.find(x => x.id === id) : null;
    const before = kind === 'ans' ? (r.ctx || C.qCtx(a, q)) : ctxOf(a, r);
    const pick = cls => [...document.querySelectorAll('.' + cls + ':checked')].map(i => i.value);
    const after = { proc: val('ra-proc') || null, area: val('ra-area') || null, assets: pick('ra-as'), systems: pick('ra-sy'), deps: pick('ra-dp'), how: 'manual' };
    (r.ctxLog = r.ctxLog || []).unshift({ ts: now(), by: C.S.userId, before: JSON.parse(JSON.stringify(before)), after, reason: why });
    if (kind === 'ans') r.ctx = after;
    else if (kind === 'finding') { Object.assign(r, { assets: after.assets, systems: after.systems, deps: after.deps, proc: after.proc, area: after.area }); }
    else { const keep = { q: r.links.q, ans: r.links.ans, finding: r.links.finding, scenario: r.links.scenario }; r.links = Object.assign(linksFrom(after, null, null), Object.fromEntries(Object.entries(keep).filter(([, v]) => v))); }
    C.log(a, `Cambió la asociación de ${kind === 'ans' ? 'la respuesta ' : ''}${id}: ${why}`, `Changed the association of ${kind === 'ans' ? 'answer ' : ''}${id}: ${why}`);
    U.closeModal(); C.save(); R(); U.toast(L('Asociación actualizada; el contexto anterior queda en el historial', 'Association updated; the previous context stays in history'));
  };

  // ---------- ficha de evidencia: origen, regreso y reclasificación (RQ-08, RQ-10) ----------
  U.ctxBlock = function (a, kind, rec) {
    const cur = ctxOf(a, rec); const q = rec.links && rec.links.q ? a.questions.find(x => x.id === rec.links.q) : rec.q ? a.questions.find(x => x.id === rec.q) : null; const ans = q ? { value: (rec.links && rec.links.ans) || rec.ans } : null;
    const log = (rec.ctxLog || []).map(l => `<li>${C.fmtDate(l.ts, true)} · ${h(C.uname(l.by) || '')} · «${h(l.reason)}»</li>`).join('');
    return `<div class="sec-title">${L('Contexto', 'Context')}</div>${U.ctxPath(a, cur, q, ans, { cls: 'ro' })}
      ${rec.ctx0 ? `<p class="small mut">${L('Al capturar', 'At capture')} (${ORIG()[rec.ctx0.origin] || rec.ctx0.origin || '—'}, ${C.fmtDate(rec.ctx0.ts, true)}, ${h(C.uname(rec.ctx0.by) || '')}): ${snapPath(rec.ctx0)}</p>` : `<p class="small mut">${L('Registrada antes del contexto automático; se muestra su asociación actual.', 'Recorded before automatic context; its current association is shown.')}</p>`}
      ${log ? `<ul class="plain small">${log}</ul>` : ''}<div class="row"><button class="plink" data-act="reassoc" data-kind="${kind}" data-id="${rec.id}">${L('Cambiar asociación', 'Change association')}</button>${q ? `<button class="plink" data-act="cp-go" data-key="q:${q.id}">${L('Ir a la pregunta', 'Go to the question')}</button>` : ''}</div>`;
  };
  const lb0 = U.modals.lightbox;
  U.modals.lightbox = function (a, d) { const r = lb0(a, d); const p = a.photos.find(x => x.id === d.id); if (!p) return r;
    r.body = r.body.replace(/<div class="sec-title">[^<]*<\/div><div class="grid2"><div class="field"><label for="lk-area">[\s\S]*?<\/select><\/div><\/div>(?=<p class="small mut">)/, U.ctxBlock(a, 'photo', p) + `<div class="grid2"><div class="field"><label for="lb-sens">${L('Sensibilidad', 'Sensitivity')}</label><select id="lb-sens">${[['normal', L('Normal', 'Normal')], ['sensible', L('Sensible', 'Sensitive')], ['restringida', L('Restringida', 'Restricted')]].map(([k, l]) => U.opt(k, l, p.sens || 'normal')).join('')}</select></div><div class="field"><span class="lbl">&nbsp;</span><label class="check"><input type="checkbox" id="lb-auth" ${p.auth ? 'checked' : ''}><span>${L('Autorizada por el cliente', 'Authorized by the client')}</span></label></div></div>`);
    r.body = r.body.replace(/<div class="grid2"><div class="field"><label for="lb-title">[\s\S]*?<\/div><\/div>/, m => m).replace(/<div class="field"><span class="lbl">(Fecha y autor|Date and author)<\/span><span class="small">[^<]*<\/span><\/div>/, `<div class="field"><span class="lbl">${L('Fecha, autor y origen', 'Date, author and origin')}</span><span class="small">${C.fmtDate(p.ts, true)} · ${h(p.author)} · ${ORIG()[p.origin] || L('Captura general', 'General capture')}</span></div>`);
    return r; };
  const lbs0 = A['lb-save'];
  A['lb-save'] = el => { const a = C.cur(); const p = a.photos.find(x => x.id === el.dataset.id); const keep = p.links; const sens = val('lb-sens'), auth = ($('lb-auth') || {}).checked; lbs0(el); if (!$('lk-area')) p.links = keep; if (sens) p.sens = sens; p.auth = !!auth; (p.hist = p.hist || []).unshift({ ts: now(), by: C.S.userId, es: 'Editó la ficha', en: 'Edited the record' }); C.save(); };
  // hallazgos en la etapa 6: ruta de origen y reclasificación
  const st6 = U.stage[6];
  U.stage[6] = function (a, ev) { let html = st6(a, ev); a.findings.forEach(f => { const o = `<div class="dep" id="finding-${f.id}">`; const i = html.indexOf(o); if (i < 0) return; const j = html.indexOf('</span></span>', i); if (j < 0) return;
    const q = f.q && a.questions.find(x => x.id === f.q); const add = `<br>${U.ctxPath(a, ctxOf(a, f), q, f.ans ? { value: f.ans } : (q && a.answers[q.id]), { cls: 'ro sm' })}<button class="plink" data-act="reassoc" data-kind="finding" data-id="${f.id}">${L('Cambiar asociación', 'Change association')}</button>`;
    html = html.slice(0, j) + add + html.slice(j); }); return html; };

  // ---------- trazabilidad desde la pregunta (RQ-08) ----------
  A['q-trace'] = el => U.openModal('qtrace', { q: el.dataset.q });
  U.modals.qtrace = function (a, d) { const q = a.questions.find(x => x.id === d.q); const r = a.answers[q.id] || {}; const ctx = C.qCtx(a, q);
    const ph = a.photos.filter(p => C.lk(p, 'q', q.id)); const docs = (a.docs || []).filter(x => C.lk(x, 'q', q.id)); const fs = a.findings.filter(f => f.q === q.id); const sc = C.trace ? C.trace(a, 'q:' + q.id).scns : [];
    const hist = (r.hist || []).map(x => `<li>${C.fmtDate(x.ts, true)} · ${h(C.uname(x.by) || x.by)} · ${h(tx(x.value))}</li>`).join('');
    return { title: q.id + ' · ' + L('Trazabilidad', 'Traceability'), wide: true, body: `${U.ctxPath(a, ctx, q, r, { cls: 'ro' })}<p class="qt" style="margin:6px 0">${h(tx(q.text))}</p>
      <div class="tr-row"><span class="tr-k">${L('Respuesta', 'Answer')}</span><div class="tr-v small"><b>${h(tx(r.value) || L('Sin responder', 'Unanswered'))}</b> · ${L('fuente', 'source')} ${h(C.provName(r.src || 'entrevista'))} · ${L('confianza', 'confidence')} ${h(tx(r.conf) || '—')} · ${h(r.by || '—')} · ${C.fmtDate(r.ts, true)}</div></div>
      <div class="tr-row"><span class="tr-k">${L('Nota', 'Note')}</span><div class="tr-v small">${h(tx(r.note) || '—')}</div></div>
      <div class="tr-row"><span class="tr-k">${L('Evidencias', 'Evidence')}</span><div class="tr-v">${ph.map(p => `<button class="wk-th" data-act="lightbox" data-id="${p.id}" aria-label="${h(tx(p.title))}"><img src="${C.photoURL(p)}" alt=""></button>`).join('')}${docs.map(x => `<button class="plink" data-act="wk-doc-open" data-id="${x.id}">${ic('doc', 'sm')}${h(x.name)}</button>`).join('') || (ph.length ? '' : '<span class="small mut">—</span>')}</div></div>
      <div class="tr-row"><span class="tr-k">${L('Hallazgos', 'Findings')}</span><div class="tr-v">${fs.map(f => `<button class="pchip" data-act="go" data-stage="6" data-target="finding-${f.id}">${f.id} · ${h(tx(f.title))}</button>`).join('') || '<span class="small mut">—</span>'}</div></div>
      <div class="tr-row"><span class="tr-k">${L('Escenarios', 'Scenarios')}</span><div class="tr-v">${sc.map(s => `<button class="pchip" data-act="trace-open" data-key="scenario:${s.id}">${s.id} · ${h(tx(s.title))}</button>`).join('') || '<span class="small mut">—</span>'}</div></div>
      ${hist ? U.dt('qh-' + q.id, L('Historial de la respuesta', 'Answer history'), `<ul class="plain small">${hist}</ul>`) : ''}`,
      foot: `<button class="btn ghost" data-act="cp-go" data-key="q:${q.id}">${L('Ir a la pregunta', 'Go to the question')}</button><button class="btn primary" data-act="modal-close">${L('Cerrar', 'Close')}</button>` }; };

  // ---------- recorrido: preguntas del elemento (respuesta y evidencia en campo) ----------
  const wv0 = U.walkView;
  U.walkView = function (a, ev) {
    const html = wv0(a, ev); const cur = (C.S.ui.wk || {}).cur; if (!cur) return html; const [k, id] = [cur.slice(0, cur.indexOf(':')), cur.slice(cur.indexOf(':') + 1)];
    const x = k === 'asset' ? C.asset(a, id) : k === 'system' ? C.system(a, id) : k === 'area' ? C.area(a, id) : null; if (!x) return html;
    const app = C.applicable(a); const procs = k === 'dep' ? [] : C.recProcs(x);
    const mine = app.filter(({ q }) => { const c = C.qCtx(a, q); return k === 'asset' ? c.assets.includes(id) : k === 'system' ? (c.systems || []).includes(id) : k === 'area' ? c.area === id : false; });
    const gen = app.filter(({ q }) => !mine.some(m => m.q.id === q.id) && (() => { const c = C.qCtx(a, q); return !c.assets.length && !(c.systems || []).length && (!c.proc || procs.includes(c.proc)); })());
    const elCtx = JSON.stringify({ proc: procs[0] || null, area: k === 'area' ? id : (x.area || null), assets: [], systems: [], deps: [] });
    const row = ({ q }) => { const r = a.answers[q.id] || {}; const b = (v, cls) => `<button class="${cls}" data-act="ans" data-q="${q.id}" data-v="${v}" data-ctx='${h(elCtx)}' aria-pressed="${r.value === v}">${tx(v)}</button>`;
      return `<div class="wk-q" id="wkq-${q.id}"><div class="wk-qt"><code>${q.id}</code> ${h(tx(q.text))}</div><div class="ans sm" role="group" aria-label="${q.id}">${b('Sí', 'si')}${b('No', 'no')}${b('Desconocido', 'unk')}${b('No aplica', 'na')}</div>${r.value ? `<div class="row"><button class="btn ghost sm" data-act="q-photo" data-q="${q.id}" data-el="${cur}" data-origin="recorrido">${ic('camera', 'sm')}${L('Foto', 'Photo')}</button><button class="btn ghost sm" data-act="q-finding" data-q="${q.id}" data-el="${cur}" data-origin="recorrido">${ic('flag', 'sm')}${L('Hallazgo', 'Finding')}</button><button class="plink" data-act="q-trace" data-q="${q.id}">${L('Trazabilidad', 'Traceability')}</button></div>` : ''}</div>`; };
    const block = `<div class="wk-sub wk-qs"><b>${L('Preguntas de este elemento', 'Questions for this item')} · ${mine.length}</b>${mine.map(row).join('') || `<span class="small mut">${L('Ninguna pregunta está asociada a este elemento.', 'No question is associated with this item.')}</span>`}
      ${gen.length ? U.dt('wkg-' + id, L('Preguntas generales del proceso', 'Process-wide questions') + ` · ${gen.length}`, gen.map(row).join('') + `<p class="hint">${L('Responderlas aquí las asocia al proceso y al área, no a este activo. La foto sí queda vinculada al elemento.', 'Answering here links them to the process and area, not to this asset. The photo is linked to the item.')}</p>`) : ''}</div>`;
    return html.replace('<div class="wk-sub"><label for="wk-note">', block + '<div class="wk-sub"><label for="wk-note">');
  };
  // la acción Evidencia del recorrido también hereda el contexto del elemento
  const wvA = U.walkView;
  U.walkView = function (a, ev) { const html = wvA(a, ev); const cur = (C.S.ui.wk || {}).cur || ''; return html.replace(/<button class="wk-btn pri" data-act="capture" data-link="[^"]*">/, `<button class="wk-btn pri" data-act="q-photo" data-el="${cur}" data-origin="recorrido">`).replace(/<button class="btn soft sm" data-act="capture" data-link="[^"]*">/, `<button class="btn soft sm" data-act="q-photo" data-el="${cur}" data-origin="recorrido">`).replace(/<button class="wk-btn" data-act="finding" data-asset="[^"]*">/, `<button class="wk-btn" data-act="q-finding" data-el="${cur}" data-origin="recorrido">`); };

  // ---------- PDF: solo fotos imprimibles ----------
  C.photoPrintable = p => !!p.inReport && p.sens !== 'restringida' && (p.sens !== 'sensible' || !!p.auth);
  // ---------- capturas y hallazgos generales: también guardan origen y contexto al capturar ----------
  const meta = (a, rec, kind) => { if (rec.ctx0) return; const c = ctxOf(a, rec); const q = (rec.links && rec.links.q) || rec.q; const qq = q && a.questions.find(x => x.id === q);
    rec.origin = rec.origin || (C.S.ui.view === 'wizard' ? ({ 3: 'recorrido', 4: 'cuestionario', 5: 'evidencias' }[C.S.ui.stage] || 'general') : 'general'); rec.ctx0 = snap(a, c, qq, qq && a.answers[qq.id], rec.origin); rec.ctxLog = rec.ctxLog || []; if (kind === 'photo') { rec.authorId = C.S.userId; rec.sens = rec.sens || 'normal'; } };
  const cs0 = A['cap-save'];
  A['cap-save'] = async el => { const a = C.cur(); const n = a.photos.length; await cs0(el); if (a.photos.length > n) { const p = a.photos[a.photos.length - 1]; if (p.links && p.links.asset && !p.links.proc) { const x = C.asset(a, p.links.asset); if (x) { p.links.proc = C.assetProcs(x)[0]; p.links.area = p.links.area || x.area; } } meta(a, p, 'photo'); C.save(); } };
  const fd0 = A['fd-save'];
  A['fd-save'] = el => { const a = C.cur(); const n = a.findings.length; fd0(el); if (a.findings.length > n) { const f = a.findings[a.findings.length - 1]; const q = f.q && a.answers[f.q]; if (q) f.ans = q.value; f.byId = C.S.userId; f.review = 'Por revisar'; meta(a, f, 'finding'); C.save(); } };
})();
