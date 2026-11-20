/* ORA demo — actions, data editing and boot */
(function () {
  const C = window.ORA, D = window.ORA_DATA, U = window.ORA_UI, I = window.ORA_I18N;
  const L = I.L, tx = I.tx;
  const $ = id => document.getElementById(id);
  const val = id => (($(id) || {}).value || '').trim();
  const save = () => C.save();
  const R = () => U.render();
  const A = U.act;
  const plural = (n, es1, esN, en1, enN) => n === 1 ? L(es1, en1) : L(esN, enN);

  const me = () => C.me().name;
  A.login = el => { U.closeModal(); C.S.userId = el.dataset.id; C.S.ui.view = 'home'; U.navOpen = false; if (!C.cur()) C.S.activeId = null; C.save(true); R(); U.toast(L('Sesión demo: ', 'Demo session: ') + me() + ' · ' + C.roleName(C.me())); };
  A.logout = () => { U.closeModal(); C.S.userId = null; C.S.ui.view = 'login'; C.save(true); R(); };
  A['user-menu'] = () => U.openModal('user', {});
  A['side-toggle'] = () => { C.S.ui.sideMin = !C.S.ui.sideMin; save(); R(); };
  A.hf = el => { C.S.ui.hf = el.dataset.f; R(); };
  A.qf = el => { C.S.ui.qf = el.dataset.f; R(); };
  A['pend-open'] = () => U.openModal('pending', {});
  A.assign = el => { if (!C.canAssign(C.S.assessments.find(x => x.id === el.dataset.id))) return U.toast(L('No tiene permiso para asignar', 'You do not have permission to assign')); U.openModal('assign', { id: el.dataset.id }); };
  A['assign-save'] = el => {
    const a = C.S.assessments.find(x => x.id === el.dataset.id); if (!C.canAssign(a)) return; const lead = C.isAdmin() ? val('as-lead') : a.leadId; const team = [...document.querySelectorAll('.as-team:checked')].map(x => x.value).filter(x => x !== lead);
    if (lead !== a.leadId) C.log(a, (a.leadId ? 'Reasignó la responsabilidad de ' + C.uname(a.leadId) + ' a ' : 'Asignó como responsable a ') + C.uname(lead), (a.leadId ? 'Reassigned lead from ' + C.uname(a.leadId) + ' to ' : 'Assigned as lead ') + C.uname(lead));
    if (team.slice().sort().join() !== (a.team || []).slice().sort().join()) C.log(a, 'Actualizó los evaluadores: ' + (team.map(C.uname).join(', ') || 'ninguno'), 'Updated assessors: ' + (team.map(C.uname).join(', ') || 'none'));
    a.leadId = lead; a.team = team; U.closeModal(); save(); R(); U.toast(L('Asignación guardada', 'Assignment saved'));
  };
  A.perm = el => { if (!C.isAdmin()) return; C.S.perms[el.dataset.p] = !C.S.perms[el.dataset.p]; save(); R(); };
  A['theme-set'] = el => { const r = document.documentElement, t = el.dataset.t; try { if (t === 'system') { delete r.dataset.theme; localStorage.removeItem('ora-theme'); } else { r.dataset.theme = t; localStorage.setItem('ora-theme', t); } } catch (e) {} R(); };
  const readDraft = () => { const d = U.draft; ['client', 'plant', 'contact', 'scope', 'exclusions'].forEach(k => { const e = $('nw-' + k); if (e) d[k] = e.value.trim(); }); if ($('nw-industry')) { d.industry = val('nw-industry'); d.leadId = val('nw-lead') || d.leadId; d.team = [...document.querySelectorAll('.nw-team:checked')].map(x => x.value).filter(x => x !== d.leadId); } };
  document.addEventListener('change', e => { const t = e.target; if (!t || (t.id !== 'nw-lead' && t.id !== 'as-lead')) return; const cls = t.id === 'nw-lead' ? '.nw-team' : '.as-team'; let moved = false;
    document.querySelectorAll(cls).forEach(cb => { const isLead = cb.value === t.value; if (isLead && cb.checked) moved = true; if (isLead) cb.checked = false; cb.disabled = isLead; cb.closest('.pp').classList.toggle('is-lead', isLead); });
    if (t.id === 'nw-lead' && U.draft) { U.draft.leadId = t.value; U.draft.team = (U.draft.team || []).filter(x => x !== t.value); }
    if (moved) U.toast(L('Se quitó de evaluadores: ahora es el responsable', 'Removed from assessors: now the lead')); });
  A['new-mod'] = el => { U.draft.modality = el.dataset.m; U.draft.step = 2; R(); const m = document.querySelector('.main'); if (m) m.scrollTop = 0; const f = $('nw-client'); if (f) f.focus(); };
  A['new-back'] = () => { readDraft(); U.draft.step = 1; R(); };
  A['new-create'] = () => {
    readDraft(); const d = U.draft;
    const a = C.newAssessment({ client: d.client || '', plant: d.plant || '', industry: d.industry, modality: d.modality, contact: d.contact || '', scope: d.scope || '', exclusions: d.exclusions || '' }, { leadId: d.leadId, team: d.team });
    U.draft = null; C.S.ui.view = 'wizard'; C.S.ui.stage = 1; C.save(true); R(); U.toast(L(`Assessment ${a.code} creado · ${C.modName(C.mod(a))} · biblioteca v${C.S.lib.version}`, `Assessment ${a.code} created · ${C.modName(C.mod(a))} · library v${C.S.lib.version}`));
  };
  A.new = () => { if (!C.can('create')) return U.toast(L('No tiene permiso para crear assessments', 'You do not have permission to create assessments')); U.draft = { step: 1, modality: null, industry: 'oilgas', leadId: C.S.userId, team: [] }; C.S.ui.view = 'new'; U.navOpen = false; R(); };
  A.open = el => { C.S.activeId = el.dataset.id; C.S.ui.view = 'wizard'; const e0 = C.evaluate(C.cur()); C.S.ui.stage = (e0.stages.find(s => s.state !== 'complete') || e0.stages[6]).n; save(); C.hydratePhotos(C.cur()).then(R); R(); };
  A.nav = el => { U.closeModal(); C.S.ui.view = el.dataset.view; if (el.dataset.stage) C.S.ui.stage = +el.dataset.stage; else if (el.dataset.view === 'wizard') { const a = C.cur(); const ev = a && C.evaluate(a); const first = ev ? (ev.stages.find(s => s.state !== 'complete') || {}).n : 1; C.S.ui.stage = C.S.ui.wzStage || first || 1; } U.navOpen = false; save(); R(); const m = document.querySelector('.main'); if (m) m.scrollTop = 0; };
  A['nav-open'] = () => { U.navOpen = true; R(); const b = document.querySelector('.side-close'); if (b) b.focus(); };
  A['nav-close'] = () => { U.navOpen = false; R(); const b = document.querySelector('.menu-btn'); if (b) b.focus(); };
  A.lang = el => { I.set(el.dataset.l); if (U.modal) U.renderModal(); R(); };
  A.theme = () => {
    const r = document.documentElement; const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    r.dataset.theme = dark ? 'light' : 'dark'; try { localStorage.setItem('ora-theme', r.dataset.theme); } catch (e) {} R();
  };
  A.reset = () => C.isAdmin() && U.openModal('confirm', { title: L('Reiniciar datos de demostración', 'Reset demo data'), msg: L('Se eliminarán los assessments, fotos y cambios de biblioteca guardados en este navegador y se cargará de nuevo el caso Estación de Bombeo Río Claro.', 'Assessments, photos and library changes saved in this browser will be deleted, and the Río Claro Pumping Station case will be reloaded.'), yes: L('Reiniciar', 'Reset'), danger: true, onYes: () => { C.reset(); R(); U.toast(L('Datos de demostración restaurados', 'Demo data restored')); } });
  A.stage = el => { C.S.ui.view = 'wizard'; C.S.ui.stage = C.S.ui.wzStage = +el.dataset.stage; save(); R(); const m = document.querySelector('.main'); if (m) m.scrollTop = 0; };
  A.pf = el => { C.S.ui.pf = el.dataset.f; if (U.modal) U.renderModal(); else R(); };
  A.gf = el => { C.S.ui.gf = el.dataset.f; R(); };
  A.go = el => U.goTo(+el.dataset.stage, el.dataset.target);
  U.goTo = function (stage, target) {
    U.closeModal(); C.S.ui.view = 'wizard'; C.S.ui.stage = stage; U.navOpen = false;
    U.after = () => {
      const m = document.querySelector('.main'); if (m) m.scrollTop = 0;
      const el = target && $(target); if (!el) return;
      for (let d = el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) { d.open = true; if (d.dataset.openKey) U.openKeys.add(d.dataset.openKey); }
      el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1700);
      const f = el.matches('input,select,textarea') ? el : el.querySelector('input,select,textarea,button'); if (f) f.focus({ preventScroll: true });
    };
    save(); R();
  };
  A.script = el => {
    const g = el.dataset.go;
    if (g === 'new') return A.new();
    if (!C.cur()) return;
    if (g === 'capture') { C.S.ui.view = 'wizard'; C.S.ui.stage = 5; R(); return A.capture({ dataset: { link: 'finding:' + ((C.cur().findings[1] || C.cur().findings[0] || {}).id || '') } }); }
    if (g.startsWith('go:')) return U.goTo(+g.slice(3), '');
    C.S.ui.view = g; R();
  };
  A['flt-clear'] = () => { C.S.ui.flt = {}; C.S.ui.cell = null; R(); };
  A.cell = el => { const c = el.dataset.cell; C.S.ui.cell = C.S.ui.cell === c || !c ? null : c; if (C.S.ui.view !== 'dash') C.S.ui.view = 'dash'; R(); const t = $('dash-scn'); if (t && c) t.scrollIntoView({ block: 'nearest' }); };
  A['k-proc'] = A['k-scn'] = () => { const t = $('dash-scn'); if (t) t.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
  A['k-high'] = () => { C.S.ui.flt = Object.assign(C.S.ui.flt || {}, { level: 'Alto' }); R(); const t = $('dash-scn'); if (t) t.scrollIntoView({ block: 'start' }); };
  A['k-ev'] = () => U.goTo(5, ''); A['k-q'] = () => U.goTo(4, ''); A['k-rec'] = () => U.goTo(7, ''); A['k-wiz'] = () => U.goTo(C.S.ui.stage || 1, '');
  A.noop = () => {};

  A.modality = el => { const a = C.cur(); const before = C.applicable(a).length; a.cfg.modality = el.dataset.m; C.log(a, 'Cambió la modalidad a ' + C.modName(C.mod(a)), 'Changed modality to ' + C.modName(C.mod(a))); save(); R(); U.toast(L(`Modalidad ${C.modName(C.mod(a))}: ${C.applicable(a).length} preguntas aplicables (antes ${before})`, `${C.modName(C.mod(a))} modality: ${C.applicable(a).length} applicable questions (was ${before})`)); };
  A['proc-status'] = el => { const a = C.cur(); const p = a.processes.find(x => x.key === el.dataset.k); if (p.status === el.dataset.v) return; p.status = el.dataset.v; p.by = me(); p.ts = new Date().toISOString(); const sl = { incluido: ['Incluido', 'Included'], fuera: ['Fuera del alcance', 'Out of scope'], na: ['No aplica', 'Not applicable'], desconocido: ['Desconocido', 'Unknown'] }[p.status]; C.log(a, 'Marcó «' + p.name + '» como ' + sl[0], 'Marked “' + tx(p.name) + '” as ' + sl[1]); save(); R(); const j = $('pj-' + p.key); if (j && !j.value) j.focus(); };
  A['add-proc'] = () => { const n = val('np-name'); if (!n) return U.toast(L('Escriba el nombre del proceso', 'Enter the process name')); const a = C.cur(); a.processes.push({ key: C.uid('p').toLowerCase(), name: n, desc: 'Agregado por el evaluador', status: null, just: '', crit: '', prov: 'manual', active: true }); save(); R(); };
  A['add-area'] = el => { const pk = el.dataset.proc; const n = val('na-name-' + pk); if (!n) return U.toast(L('Escriba el nombre del área', 'Enter the area name')); const a = C.cur(); const id = C.uid('A'); a.areas.push({ id, name: n, proc: pk, procs: [pk], prov: 'manual', val: { status: 'validado', by: me(), ts: new Date().toISOString(), src: 'campo' }, log: [], by: me() }); U.openKeys.delete('na-' + pk); U.openKeys.add('aa-' + id); C.log(a, 'Agregó el área ' + n, 'Added area ' + n); save(); R(); U.toast(L('Área registrada. Agregue sus activos.', 'Area recorded. Add its assets.')); const t = $('nx-tag-' + id); if (t) t.focus(); };
  A['proc-adapt'] = el => { const a = C.cur(); const p = a.processes.find(x => x.key === el.dataset.k); U.openModal('padapt', { k: p.key }); };
  A['proc-adapt-save'] = el => { const a = C.cur(); const p = a.processes.find(x => x.key === el.dataset.k); const n = val('pa-name'); if (!n || n === tx(p.name)) return U.closeModal(); if (!p.name0) p.name0 = p.name; const old = tx(p.name); p.name = n; C.log(a, `Adaptó el proceso «${old}» a «${n}»`, `Adapted process “${old}” to “${n}”`); U.closeModal(); save(); R(); };
  A['add-asset'] = el => {
    const a = C.cur(); const ar = C.area(a, el.dataset.area); const k = '-' + ar.id; const tag = val('nx-tag' + k).toUpperCase(); if (!tag) return U.toast(L('El TAG es obligatorio', 'TAG is required'));
    const before = C.applicable(a).length;
    if (a.assets.some(y => !C.isOut(y) && y.tag.toUpperCase() === tag)) return U.toast(L('Ya existe un activo con ese TAG: corríjalo en Inventario OT', 'An asset with that TAG exists: correct it in OT inventory'));
    const ps = C.recProcs(ar).filter(pk => C.included(a).some(p => p.key === pk)); const nx = { id: C.uid('AS'), tag, name: val('nx-name' + k) || tag, type: val('nx-type' + k), area: ar.id, proc: ps[0] || ar.proc, procs: ps.length ? ps : [ar.proc], ver: '', prov: 'manual', val: { status: 'sugerido' }, log: [], by: me() }; a.assets.push(nx); C.setVal(a, 'asset', nx, 'validado', { src: val('nx-ver' + k), reason: L('Registrado en el recorrido', 'Recorded during the walkdown') }); C.log(a, 'Registró el activo ' + tag, 'Recorded asset ' + tag);
    save(); R(); const d = C.applicable(a).length - before;
    U.toast(L(`Activo ${tag} registrado`, `Asset ${tag} recorded`) + (d > 0 ? L(` · ${d} preguntas activadas`, ` · ${d} questions triggered`) : ''));
    const t = $('nx-tag' + k); if (t) t.focus();
  };
  A['del-asset'] = el => { const a = C.cur(); const id = el.dataset.id; const x = C.asset(a, id); U.openModal('confirm', { title: L('Eliminar activo', 'Delete asset'), msg: L(`Se eliminará ${x.tag} y sus dependencias. Las fotos y hallazgos se conservan sin ese vínculo.`, `${x.tag} and its dependencies will be deleted. Photos and findings are kept without that link.`), yes: L('Eliminar', 'Delete'), danger: true, onYes: () => { a.assets = a.assets.filter(y => y.id !== id); a.deps = a.deps.filter(d => d.from !== id && d.to !== id); a.photos.forEach(p => { if (p.links && p.links.asset === id) delete p.links.asset; }); a.findings.forEach(f => f.assets = f.assets.filter(y => y !== id)); a.scenarios.forEach(s => s.assets = s.assets.filter(y => y !== id)); save(); R(); } }); };
  A['add-dep'] = () => {
    const a = C.cur(); const from = val('nd-from'), to = val('nd-to'); if (!from || !to || from === to) return U.toast(L('Seleccione dos elementos distintos', 'Select two different elements'));
    const before = C.applicable(a).length; const had = C.sharedControllers(a).length;
    a.deps.push({ id: C.uid('D'), from, to, type: val('nd-type'), dir: 'uni', note: val('nd-note'), prov: 'manual', val: { status: 'validado', by: me(), ts: new Date().toISOString(), src: 'campo' }, log: [], by: me() }); C.log(a, 'Registró que ' + C.assetLbl(a, from) + ' depende de ' + C.assetLbl(a, to), 'Recorded that ' + C.assetLbl(a, from) + ' depends on ' + C.assetLbl(a, to)); save(); R();
    const d = C.applicable(a).length - before;
    U.toast(C.sharedControllers(a).length > had ? L(`Dependencia común detectada · ${d} preguntas condicionales activadas`, `Common dependency detected · ${d} conditional questions triggered`) : L('Dependencia registrada', 'Dependency recorded'));
  };
  A['del-dep'] = el => { const a = C.cur(); a.deps = a.deps.filter(d => d.id !== el.dataset.id); save(); R(); };
  A.ans = el => {
    const a = C.cur(); const q = el.dataset.q, v = el.dataset.v; const before = C.applicable(a).length; const o = a.answers[q] || {};
    a.answers[q] = { value: v, note: o.note || '', conf: v === 'Desconocido' ? 'Desconocido' : (o.conf && o.conf !== 'Desconocido' ? o.conf : 'Estimado'), ts: new Date().toISOString(), prev: o.value || null, by: me() };
    save(); R(); const d = C.applicable(a).length - before;
    if (d > 0) U.toast(plural(d, `${d} pregunta condicional activada`, `${d} preguntas condicionales activadas`, `${d} conditional question triggered`, `${d} conditional questions triggered`));
    else if (d < 0) U.toast(L(`${-d} preguntas ya no aplican; sus respuestas se conservan en el historial`, `${-d} questions no longer apply; their answers are kept in history`));
    else if (v === 'No aplica') { const n = $('an-' + q); if (n) n.focus(); }
  };
  A['accept-exc'] = el => { const a = C.cur(); const r = a.photoRes[el.dataset.key]; if (r) { r.status = 'aceptada'; r.acceptedTs = new Date().toISOString(); } save(); R(); U.toast(L('Excepción aceptada; se declarará como limitación del informe', 'Exception accepted; it will be declared as a report limitation')); };
  A['reopen-exc'] = el => { const a = C.cur(); const r = a.photoRes[el.dataset.key]; if (r) r.status = 'justificada'; save(); R(); };
  A.justify = el => U.openModal('justify', { key: el.dataset.key });
  A['just-save'] = el => { const note = val('js-note'); if (!note) return U.toast(L('Escriba una nota breve del motivo', 'Write a short note with the reason')); const a = C.cur(); a.photoRes[el.dataset.key] = { status: 'justificada', reason: val('js-reason'), note, by: me(), ts: new Date().toISOString() }; C.log(a, 'Justificó una foto faltante', 'Justified a missing photo'); U.closeModal(); save(); R(); U.toast(L('Motivo registrado · el pendiente sigue visible para revisión', 'Reason recorded · the item stays visible for review')); };

  A.capture = el => {
    const links = {}; const l = el && el.dataset && el.dataset.link;
    if (l) { const [k, id] = l.split(':'); if (id) links[k] = id; }
    const a = C.cur();
    if (links.asset) { const x = C.asset(a, links.asset); if (x) links.area = x.area; }
    if (links.finding) { const f = a.findings.find(x => x.id === links.finding); if (f && f.assets[0]) { links.asset = links.asset || f.assets[0]; const x = C.asset(a, links.asset); if (x) links.area = x.area; } if (f && f.q) links.q = f.q; }
    U.cap = {}; U.openModal('capture', { links });
  };
  U.onCapFile = async function (input) {
    const file = input.files && input.files[0]; if (!file) return;
    const keep = { title: val('cp-title'), author: val('cp-author'), caption: val('cp-cap'), links: U.readLinks() };
    try {
      const o = await C.optimize(file); if (U.cap.url) URL.revokeObjectURL(U.cap.url);
      U.cap = Object.assign(keep, { blob: o.blob, url: URL.createObjectURL(o.blob), info: `${o.ow}×${o.oh} px → ${o.w}×${o.h} px · ${(o.blob.size / 1024).toFixed(0)} KB`, title: keep.title || file.name.replace(/\.[^.]+$/, '') });
    } catch (e) { U.cap = Object.assign(keep, { err: e.message }); }
    U.modal.data.links = keep.links; U.renderModal();
  };
  A['cap-save'] = async () => {
    const a = C.cur(); const cap = U.cap; if (!cap || !cap.blob) return;
    const title = val('cp-title'); if (!title) return U.toast(L('Agregue un título a la foto', 'Add a title to the photo'));
    const id = C.uid('PH'); const links = U.readLinks();
    await C.putPhoto(id, cap.blob); C.registerURL(id, cap.blob);
    C.log(a, 'Cargó la evidencia «' + title + '»', 'Uploaded evidence “' + title + '”'); a.photos.push({ id, src: 'idb:' + id, title, caption: val('cp-cap'), author: me(), ts: new Date().toISOString(), review: 'Por revisar', inReport: $('cp-rep').checked, links });
    URL.revokeObjectURL(cap.url); U.cap = null; U.closeModal(); save(); R();
    const Lk = Object.entries(links).map(([k, v]) => k === 'asset' ? C.assetLbl(a, v) : k === 'area' ? C.areaName(a, v) : v).join(', ');
    U.toast(L('Foto guardada', 'Photo saved') + (Lk ? L(' y asociada a ', ' and linked to ') + Lk : '') + (C.photoStore === 'idb' ? '' : L(' (solo en memoria de esta sesión)', ' (session memory only)')));
  };
  A.lightbox = el => U.openModal('lightbox', { id: el.dataset.id });
  A['lb-save'] = el => {
    const a = C.cur(); const p = a.photos.find(x => x.id === el.dataset.id);
    const nt = val('lb-title'), nc = val('lb-cap');
    if (nt && nt !== tx(p.title)) p.title = nt; if (nc !== tx(p.caption)) p.caption = nc;
    p.review = val('lb-rev'); p.inReport = $('lb-rep').checked; p.links = U.readLinks();
    if ($('lb-cov').checked) a.photos.forEach(x => x.cover = x.id === p.id); else p.cover = false;
    U.closeModal(); save(); R(); U.toast(L('Evidencia actualizada', 'Evidence updated'));
  };

  A.finding = el => U.openModal('finding', { asset: el && el.dataset ? el.dataset.asset : null, q: el && el.dataset ? el.dataset.q : null });
  A['fd-save'] = () => {
    const a = C.cur(); const t = val('fd-title'); if (!t) return U.toast(L('Describa el hallazgo', 'Describe the finding'));
    let k = a.findings.length + 1, id; do { id = 'F-' + String(k++).padStart(2, '0'); } while (a.findings.some(f => f.id === id));
    a.findings.push({ id, title: t, desc: val('fd-desc'), assets: [...document.querySelectorAll('.fd-as:checked')].map(x => x.value), q: val('fd-q') || null, ts: new Date().toISOString(), by: me() }); C.log(a, 'Registró el hallazgo ' + id, 'Recorded finding ' + id);
    save(); U.openModal('confirm', { title: L('Hallazgo ', 'Finding ') + id + L(' registrado', ' recorded'), msg: L('La guía de cobertura sugiere una foto de evidencia para este hallazgo. ¿Desea tomarla ahora? Puede hacerlo después: quedará como pendiente.', 'The coverage guide suggests an evidence photo for this finding. Take it now? You can do it later: it will stay as pending.'), yes: L('Tomar foto ahora', 'Take photo now'), onYes: () => A.capture({ dataset: { link: 'finding:' + id } }), onNo: () => R() }); R();
  };
  A['scn-from'] = el => { const a = C.cur(); const f = a.findings.find(x => x.id === el.dataset.id); const id = U.newScn(a, f.title, (C.asset(a, f.assets[0]) || {}).proc || (C.included(a)[0] || {}).key, f); U.goTo(6, 'scn-' + id); };
  U.newScn = function (a, title, proc, f) {
    let k = a.scenarios.length + 1, id; do { id = 'E-' + String(k++).padStart(2, '0'); } while (a.scenarios.some(s => s.id === id));
    a.scenarios.push({ id, title, proc, assets: f ? f.assets.slice() : [], findings: f ? [f.id] : [], cause: '', cons: '', C: null, P: null, justC: '', justP: '', controls: [], conf: 'Estimado', by: me() }); C.log(a, 'Creó el escenario ' + id, 'Created scenario ' + id);
    save(); return id;
  };
  A['add-scn'] = () => { const a = C.cur(); const t = val('ns-title'); if (!t) return U.toast(L('Describa el evento o modo de falla', 'Describe the event or failure mode')); const id = U.newScn(a, t, val('ns-proc'), null); U.goTo(6, 'scn-' + id); };
  A['add-ctl'] = el => { const a = C.cur(); const s = a.scenarios.find(x => x.id === el.dataset.s); const n = val('nc-' + s.id); if (!n) return; s.controls.push({ name: n, st: 'No verificado' }); save(); R(); };
  A['del-ctl'] = el => { const a = C.cur(); const s = a.scenarios.find(x => x.id === el.dataset.s); s.controls.splice(+el.dataset.i, 1); save(); R(); };
  A['add-rec'] = el => { const a = C.cur(); const sid = el.dataset.s; const t = val('nr-' + sid); if (!t) return U.toast(L('Escriba la recomendación', 'Enter the recommendation')); const s = a.scenarios.find(x => x.id === sid); let k = a.recs.length + 1, id; do { id = 'R-' + String(k++).padStart(2, '0'); } while (a.recs.some(r => r.id === id)); a.recs.push({ id, title: t, sc: [sid], hz: val('nh-' + sid), owner: 'Por definir con el cliente', pr: C.LEVEL(s.C, s.P) === 'Alto' ? 'Alta' : 'Media', st: 'Propuesta', basis: sid }); save(); R(); U.toast(L('Recomendación agregada a la hoja de ruta', 'Recommendation added to the roadmap')); };
  A['scn-open'] = el => U.openModal('scenario', { id: el.dataset.id });

  A.review = el => { const a = C.cur(); a.review[el.dataset.k] = el.checked; if (!el.checked && a.reportStatus === 'Aprobado') a.reportStatus = 'Borrador'; save(); R(); };
  A.approve = () => { const a = C.cur(); a.reportStatus = 'Aprobado'; C.log(a, 'Aprobó el informe v' + a.reportVersion, 'Approved report v' + a.reportVersion); save(); R(); U.toast(L('Informe aprobado. El PDF se generará sin marca de borrador.', 'Report approved. The PDF will be generated without the draft watermark.')); };
  A.draft = () => { const a = C.cur(); a.reportStatus = 'Borrador'; a.reportVersion++; save(); R(); };
  A.pdf = async () => {
    const a = C.cur(); U.pdfState = { busy: true }; R();
    try {
      await C.hydratePhotos(a);
      const out = await window.ORA_PDF.build(a);
      U.lastPdf = out; U.pdfState = { done: true, pages: out.pages, size: out.blob.size, name: out.name }; R();
      await A['pdf-save']();
    } catch (e) { console.error(e); U.pdfState = { err: L('No se pudo generar el PDF: ', 'The PDF could not be generated: ') + (e && e.message || e) }; R(); }
  };
  A['pdf-save'] = async () => {
    const o = U.lastPdf; if (!o) return;
    let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
    if (!dl) { await U.save(o.name, o.blob); U.pdfState.msg = L('PDF descargado.', 'PDF downloaded.'); R(); return; }
    try { await dl.save({ filename: o.name, data: o.blob }); U.pdfState.msg = L('Descarga confirmada.', 'Download confirmed.'); }
    catch (e) { U.pdfState.msg = e && e.code === 'declined' ? L('Descarga cancelada. Puede intentarlo de nuevo.', 'Download cancelled. You can try again.') : L('La descarga no se completó', 'The download did not complete') + ' (' + (e && e.code || 'error') + ').'; }
    R();
  };

  A['j-node'] = el => { C.S.ui.jsel = el.dataset.id; R(); };
  A['j-mode'] = el => { C.S.ui.jm = el.dataset.m; R(); };

  A.ctab = el => { C.S.ui.ctab = el.dataset.t; R(); };
  A['q-new'] = () => U.openModal('qedit', {});
  A['q-edit'] = el => U.openModal('qedit', { id: el.dataset.id });
  A['q-toggle'] = el => { const q = C.S.lib.questions.find(x => x.id === el.dataset.id); q.active = !q.active; q.v++; C.S.lib.version++; save(); R(); U.toast(`${q.id} ${q.active ? L('activada', 'activated') : L('desactivada', 'deactivated')} · ${L('biblioteca', 'library')} v${C.S.lib.version}`); };
  A['qe-save'] = el => {
    const lib = C.S.lib; const text = val('qe-text'); if (!text) return U.toast(L('Escriba la pregunta', 'Enter the question'));
    const ind = [...document.querySelectorAll('.qe-ind:checked')].map(x => x.value); const mods = [...document.querySelectorAll('.qe-mod:checked')].map(x => x.value);
    if (!ind.length || !mods.length) return U.toast(L('Seleccione al menos una industria y una modalidad', 'Select at least one industry and one modality'));
    const cq = val('qe-cq'); const cin = [...document.querySelectorAll('.qe-cin:checked')].map(x => x.value);
    if (cq && !cin.length) return U.toast(L('Indique qué respuesta activa la condición', 'Select which answer triggers the condition'));
    const id = el.dataset.id; let q = id ? lib.questions.find(x => x.id === id) : null;
    const patch = { dim: val('qe-dim'), pol: val('qe-pol'), order: val('qe-order') === '' ? 99 : +val('qe-order'), ind, mods, proc: val('qe-proc') || null, req: $('qe-req').checked, active: $('qe-act').checked, cond: cq ? { q: cq, in: cin, shared: !!(q && q.cond && q.cond.shared) } : null };
    if (q) { if (text !== tx(q.text)) q.text = text; Object.assign(q, patch); q.v++; }
    else { const n = lib.questions.filter(x => x.id.startsWith('Q-USR')).length + 1; q = Object.assign({ id: 'Q-USR-' + String(n).padStart(3, '0'), v: 1, ev: false, text }, patch); lib.questions.push(q); }
    lib.version++; U.closeModal(); save(); R(); U.toast(L(`${q.id} guardada · biblioteca v${lib.version}. Cree un assessment nuevo para verla aplicada.`, `${q.id} saved · library v${lib.version}. Create a new assessment to see it applied.`));
  };
  A['tpl-add'] = el => { const k = el.dataset.i; const n = val('tp-' + k); if (!n) return; const t = C.S.lib.templates[k]; t.processes.push({ key: C.uid('p').toLowerCase(), name: n, desc: '' }); t.version++; save(); R(); };
  A['tpl-del'] = el => { const t = C.S.lib.templates[el.dataset.i]; t.processes = t.processes.filter(p => p.key !== el.dataset.k); t.version++; save(); R(); };
  A['rule-type'] = el => { const R0 = C.S.lib.photoRules; const v = el.dataset.v; R0.assetTypes = el.checked ? [...new Set([...R0.assetTypes, v])] : R0.assetTypes.filter(x => x !== v); save(); R(); };

  A.scrim = (el, e) => { if (e.target === el) U.closeModal(); };
  A['modal-close'] = () => { const d = U.modal && U.modal.data; U.closeModal(); if (d && d.onNo) d.onNo(); };
  A['confirm-yes'] = () => { const d = U.modal.data; U.closeModal(); d.onYes && d.onYes(); };

  // text fields: when the shown value is a translation of the stored one and unchanged, keep the stored value
  function setF(path, v, final) {
    const a = C.cur(); const p = path.split('.');
    const put = (obj, k) => { if (v !== tx(obj[k])) obj[k] = v; };
    if (p[0] === 'cfg') {
      if (p[1] === 'industry') {
        if (v === a.cfg.industry) return;
        const has = a.processes.some(x => x.status);
        const doIt = () => { a.cfg.industry = v; C.loadTemplate(a); save(); R(); U.toast(L('Plantilla cargada: ', 'Template loaded: ') + C.indName(v)); };
        if (has) { U.openModal('confirm', { title: L('Cambiar industria', 'Change industry'), msg: L('Se reemplazarán los procesos y sus justificaciones por los de la nueva plantilla. Activos, respuestas y fotos se conservan.', 'Processes and their justifications will be replaced by the new template. Assets, answers and photos are kept.'), yes: L('Cambiar plantilla', 'Change template'), onYes: doIt, onNo: R }); return; }
        return doIt();
      }
      if (p[1] === 'customCount') a.cfg.customCount = Math.max(1, +v || 1); else put(a.cfg, p[1]);
    } else if (p[0] === 'proc') { const o = a.processes.find(x => x.key === p[1]); if (p[2] === 'crit') o.crit = v; else put(o, p[2]); }
    else if (p[0] === 'ans') { const r = a.answers[p[1]]; if (r) { if (p[2] === 'note') put(r, 'note'); else r[p[2]] = v; } }
    else if (p[0] === 'scn') { const s = a.scenarios.find(x => x.id === p[1]); if (p[2] === 'C' || p[2] === 'P') s[p[2]] = v ? +v : null; else if (p[2] === 'conf') s.conf = v; else put(s, p[2]); }
    else if (p[0] === 'ctl') { const c = a.scenarios.find(x => x.id === p[1]).controls[+p[2]]; if (p[3] === 'st') c.st = v; else put(c, 'name'); }
    else if (p[0] === 'rec') { a.recs.find(x => x.id === p[1])[p[2]] = v; }
    save(); if (final) R();
  }
  function setLib(path, v) {
    const p = path.split('.'); const lib = C.S.lib;
    if (p[0] === 'mod') lib.modalities[p[1]].count = Math.max(1, +v || 1);
    if (p[0] === 'rule') lib.photoRules[p[1]] = Math.max(0, +v || 0);
    save(); R();
  }
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    if (el.tagName === 'INPUT' && el.type === 'checkbox') return;
    const f = A[el.dataset.act]; if (!f) return;
    if (el.dataset.act !== 'scrim') e.preventDefault();
    if (U.navOpen && el.closest('.side') && el.dataset.act !== 'nav-close') U.navOpen = false;
    f(el, e);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (U.modal) { U.closeModal(); return; } if (U.navOpen) { A['nav-close'](); return; } }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('jnode')) { e.preventDefault(); A['j-node'](e.target); }
  });
  window.addEventListener('resize', () => { if (U.navOpen && window.innerWidth > 900) { U.navOpen = false; R(); } });
  document.addEventListener('input', e => { const t = e.target; if (t.dataset.f && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type !== 'number'))) setF(t.dataset.f, t.value, false); });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.f) {
      if (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type !== 'number')) { setF(t.dataset.f, t.value, false); clearTimeout(U._rt); U._rt = setTimeout(R, 0); return; }
      return setF(t.dataset.f, t.value, true);
    }
    if (t.dataset.lib) return setLib(t.dataset.lib, t.value);
    if (t.dataset.flt) { C.S.ui.flt = C.S.ui.flt || {}; C.S.ui.flt[t.dataset.flt] = t.value; C.S.ui.cell = null; return R(); }
    if (t.dataset.cfgui) { C.S.ui[t.dataset.cfgui] = t.value; return R(); }
    if (t.dataset.cap) return U.onCapFile(t);
    if (t.dataset.act === 'review' || t.dataset.act === 'rule-type') return A[t.dataset.act](t);
  });

  try { const th = localStorage.getItem('ora-theme'); if (th) document.documentElement.dataset.theme = th; } catch (e) {}
  C.S.ui.view = C.me() ? 'home' : 'login';
  document.addEventListener('toggle', e => { const k = e.target.dataset && e.target.dataset.openKey; if (!k) return; if (e.target.open) U.openKeys.add(k); else U.openKeys.delete(k); }, true);
  R();
  const a = C.cur(); if (a) C.hydratePhotos(a).then(miss => { R(); if (miss) U.toast(miss + L(' foto(s) no están disponibles en este navegador', ' photo(s) are not available in this browser')); });
  window.addEventListener('pagehide', () => C.save(true));
})();
