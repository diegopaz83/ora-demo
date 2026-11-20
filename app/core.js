/* ORA demo — state, persistence and completeness rules (single source for wizard, dashboard and report) */
(function () {
  const D = window.ORA_DATA, I = window.ORA_I18N;
  const L = I.L, tx = I.tx;
  const KEY = 'ora-demo-v6', KEY4 = 'ora-demo-v5';
  const clone = o => JSON.parse(JSON.stringify(o));
  const C = { L, tx };

  function freshLib() {
    return { version: 3, questions: clone(D.QUESTIONS), templates: clone(D.TEMPLATES), modalities: clone(D.MODALITIES), photoRules: clone(D.PHOTO_RULES) };
  }
  function freshState() {
    const lib = freshLib();
    return { v: 6, demoVersion: D.DEMO_VERSION || 6, lib, assessments: D.seedAll(lib, new Date()), activeId: null, userId: null, perms: { create: true, assign: true, library: false }, ui: { view: 'login', stage: 1, sideMin: false }, savedAt: null };
  }
  C.storageOK = true;
  C.load = function () {
    try {
      const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (s && s.v === 6 && s.demoVersion === (D.DEMO_VERSION || 6)) return s; }
      /* v5 (demo anterior) no se migra: los datos demo se reemplazaron por los ejemplos v6 con autorización del usuario */
    } catch (e) { C.storageOK = false; }
    return freshState();
  };
  let saveT = null;
  C.save = function (now) {
    C.S.savedAt = new Date().toISOString();
    const a = C.cur(); if (a) a.updated = C.S.savedAt;
    const doIt = () => { try { localStorage.setItem(KEY, JSON.stringify(C.S)); C.storageOK = true; } catch (e) { C.storageOK = false; } };
    clearTimeout(saveT); if (now) doIt(); else saveT = setTimeout(doIt, 250);
  };
  C.reset = function () { const u = C.S.userId; try { localStorage.removeItem(KEY); localStorage.removeItem(KEY4); } catch (e) {} idbClear(); C.S = freshState(); C.S.userId = u; C.S.ui.view = u ? 'home' : 'login'; C.boot(); C.save(true); };
  // ---------- people, roles and permissions (demo sign-in; Entra ID pending) ----------
  C.USERS = D.USERS;
  C.user = id => D.USERS.find(u => u.id === id) || null;
  C.uname = id => (C.user(id) || {}).name || '';
  C.me = () => C.user(C.S.userId);
  C.isAdmin = () => (C.me() || {}).role === 'admin';
  C.can = p => C.isAdmin() || !!(C.S.perms && C.S.perms[p]);
  C.canAssign = a => !!a && (C.isAdmin() || (a.leadId === C.S.userId && !!(C.S.perms && C.S.perms.assign)));
  C.roleName = u => u.role === 'admin' ? L('Administrador', 'Administrator') : L('Ingeniero ejecutor', 'Field engineer');
  C.members = a => [...new Set([a.leadId, ...(a.team || [])].filter(Boolean))];
  C.canSee = a => C.isAdmin() || a.creator === C.S.userId || C.members(a).includes(C.S.userId);
  C.visible = () => C.S.assessments.filter(C.canSee);
  C.myRole = a => a.leadId === C.S.userId ? L('Responsable', 'Lead') : (a.team || []).includes(C.S.userId) ? L('Evaluador', 'Assessor') : a.creator === C.S.userId ? L('Creador', 'Creator') : L('Administrador', 'Administrator');
  C.log = function (a, es, en) { if (!a) return; (a.history = a.history || []).unshift({ ts: new Date().toISOString(), by: C.S.userId, es, en }); if (a.history.length > 80) a.history.length = 80; };
  C.pendCount = ev => ev.stages.reduce((n, s) => n + s.items.filter(i => i.sev !== 'sug').length, 0);
  C.cur = () => { const a = C.S.assessments.find(x => x.id === C.S.activeId) || null; return a && C.S.userId && !C.canSee(a) ? null : a; };
  let seq = Date.now() % 100000;
  C.uid = p => p + '-' + (++seq).toString(36).toUpperCase();

  // ---------- photos: IndexedDB with in-memory fallback ----------
  let dbp = null; const MEM = new Map(); const URLS = new Map();
  C.photoStore = 'idb';
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise(res => { try { const r = indexedDB.open('ora-photos', 1); r.onupgradeneeded = () => r.result.createObjectStore('p'); r.onsuccess = () => res(r.result); r.onerror = () => { C.photoStore = 'mem'; res(null); }; } catch (e) { C.photoStore = 'mem'; res(null); } });
    return dbp;
  }
  function idbClear() { idb().then(db => { if (!db) return; try { db.transaction('p', 'readwrite').objectStore('p').clear(); } catch (e) {} }); MEM.clear(); URLS.forEach(u => URL.revokeObjectURL(u)); URLS.clear(); }
  C.putPhoto = async function (id, blob) {
    MEM.set(id, blob); const db = await idb(); if (!db) return false;
    return new Promise(res => { try { const t = db.transaction('p', 'readwrite'); t.objectStore('p').put(blob, id); t.oncomplete = () => res(true); t.onerror = () => { C.photoStore = 'mem'; res(false); }; } catch (e) { C.photoStore = 'mem'; res(false); } });
  };
  C.getBlob = async function (ph) {
    if (ph.src.startsWith('asset:')) { const r = await fetch(ph.src.slice(6)); return r.ok ? r.blob() : null; }
    if (MEM.has(ph.id)) return MEM.get(ph.id);
    const db = await idb(); if (!db) return null;
    return new Promise(res => { try { const g = db.transaction('p').objectStore('p').get(ph.id); g.onsuccess = () => { if (g.result) MEM.set(ph.id, g.result); res(g.result || null); }; g.onerror = () => res(null); } catch (e) { res(null); } });
  };
  C.photoURL = ph => ph.src.startsWith('asset:') ? ph.src.slice(6) : (URLS.get(ph.id) || '');
  C.hydratePhotos = async function (a) {
    let missing = 0;
    for (const ph of a.photos) { if (ph.src.startsWith('asset:') || URLS.has(ph.id)) continue; const b = await C.getBlob(ph); if (b) URLS.set(ph.id, URL.createObjectURL(b)); else missing++; }
    return missing;
  };
  C.registerURL = (id, blob) => { URLS.set(id, URL.createObjectURL(blob)); };
  C.optimize = function (file, max) {
    max = max || 1600;
    return new Promise((res, rej) => {
      const img = new Image(); const u = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)); const w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0, w, h); URL.revokeObjectURL(u);
        cv.toBlob(b => b ? res({ blob: b, w, h, ow: img.naturalWidth, oh: img.naturalHeight }) : rej(new Error(L('No se pudo procesar la imagen', 'The image could not be processed'))), 'image/jpeg', 0.86);
      };
      img.onerror = () => { URL.revokeObjectURL(u); rej(new Error(L('El archivo no es una imagen legible', 'The file is not a readable image'))); };
      img.src = u;
    });
  };

  // ---------- domain rules ----------
  C.LEVEL = (c, p) => { if (!c || !p) return null; const m = [[0, 0, 0, 0], [0, 'Bajo', 'Bajo', 'Medio'], [0, 'Bajo', 'Medio', 'Alto'], [0, 'Medio', 'Alto', 'Alto']]; return m[p][c]; };
  C.lvlClass = l => l === 'Alto' ? 'alto' : l === 'Medio' ? 'medio' : l === 'Bajo' ? 'bajo' : 'pend';
  C.lvlText = l => l ? L('Riesgo ' + l.toLowerCase(), tx(l) + ' risk') : L('Pendiente de evaluación', 'Pending assessment');
  C.mod = a => C.S.lib.modalities[a.cfg.modality] || D.MODALITIES.light;
  C.modName = m => tx(m.name); C.modDur = m => tx(m.dur);
  C.modCount = a => a.cfg.modality === 'custom' ? (+a.cfg.customCount || C.S.lib.modalities.custom.count) : C.mod(a).count;
  C.included = a => a.processes.filter(p => p.status === 'incluido');
  C.procName = (a, k) => tx((a.processes.find(p => p.key === k) || {}).name || k);
  C.asset = (a, id) => a.assets.find(x => x.id === id);
  C.assetLbl = (a, id) => { const x = C.asset(a, id); if (x) return x.tag; const s = (a.systems || []).find(y => y.id === id); return s ? tx(s.name) : id; };
  C.area = (a, id) => a.areas.find(x => x.id === id);
  C.areaName = (a, id) => tx((C.area(a, id) || {}).name || '');
  C.indName = k => tx((D.INDUSTRIES.find(i => i.key === k) || {}).name || '');

  C.sharedControllers = function (a) {
    const out = [];
    a.assets.filter(x => x.type === 'PLC').forEach(plc => {
      const pumps = a.deps.filter(d => d.to === plc.id && d.type === 'Control').map(d => C.asset(a, d.from)).filter(x => x && x.type === 'Bomba');
      if (pumps.length >= 2) out.push({ plc, pumps });
    });
    return out;
  };

  C.applicable = function (a) {
    const inc = new Set(C.included(a).map(p => p.key));
    const ok = q => q.active && (q.ind.includes('*') || q.ind.includes(a.cfg.industry)) && q.mods.includes(a.cfg.modality) && (!q.proc || inc.has(q.proc));
    const base = a.questions.filter(q => ok(q) && !q.cond).sort((x, y) => x.order - y.order).slice(0, C.modCount(a));
    const list = base.map(q => ({ q, cond: false }));
    const vis = new Set(base.map(q => q.id));
    const shared = C.sharedControllers(a).length > 0; const sig = C.f4Signals ? C.f4Signals(a) : {};
    let changed = true;
    while (changed) {
      changed = false;
      a.questions.filter(q => ok(q) && q.cond && !vis.has(q.id)).forEach(q => {
        const c = q.cond; let why = null;
        if (c.q && vis.has(c.q) && a.answers[c.q] && c.in.includes(a.answers[c.q].value)) why = L(`Activada por ${c.q} = ${a.answers[c.q].value}`, `Triggered by ${c.q} = ${tx(a.answers[c.q].value)}`);
        else if (c.shared && shared) why = L('Activada por el recorrido: dos bombas dependen del mismo PLC', 'Triggered by the walkdown: two pumps depend on the same PLC');
        else if (c.sig && sig[c.sig]) why = sig[c.sig];
        if (why) { vis.add(q.id); list.push({ q, cond: true, why }); changed = true; }
      });
    }
    return list;
  };
  C.answerOK = (a, q) => { const r = a.answers[q.id]; return !!(r && r.value && (r.value !== 'No aplica' || (r.note || '').trim())); };

  C.photoReqs = function (a) {
    const R = C.S.lib.photoRules; const inc = new Set(C.included(a).map(p => p.key)); const out = [];
    const linked = (k, id) => a.photos.filter(p => p.links && (p.links[k] === id || (p.links[k + 's'] || []).includes(id)));
    const push = (key, kind, id, label, why, need, have) => { const res = a.photoRes[key]; const status = have.length >= need ? 'capturada' : res ? res.status : 'sin foto'; out.push({ key, kind, id, label, why, need, have: have.map(p => p.id), status, res }); };
    if (R.perArea > 0) a.areas.filter(ar => a.assets.some(x => x.area === ar.id && !C.isOut(x) && C.assetProcs(x).some(k => inc.has(k)))).forEach(ar => push('area:' + ar.id, 'area', ar.id, tx(ar.name), L('Vista contextual del área', 'Area context view'), R.perArea, linked('area', ar.id)));
    if (R.perAsset > 0) a.assets.filter(x => !C.isOut(x) && C.assetProcs(x).some(k => inc.has(k)) && R.assetTypes.includes(x.type) && (C.okd(x) || a.photoRes['asset:' + x.id] || a.photos.some(p => p.links && p.links.asset === x.id))).forEach(x => push('asset:' + x.id, 'asset', x.id, x.tag + ' · ' + tx(x.name), L('Contexto o placa del equipo (si está autorizado)', 'Equipment context or nameplate (if authorized)'), R.perAsset, linked('asset', x.id)));
    if (R.perFinding > 0) a.findings.forEach(f => push('finding:' + f.id, 'finding', f.id, f.id + ' · ' + tx(f.title), L('Evidencia del hallazgo', 'Finding evidence'), R.perFinding, linked('finding', f.id)));
    return out;
  };
  Object.defineProperty(C, 'PH_LBL', { get: () => ({ 'capturada': L('Foto capturada', 'Photo captured'), 'sin foto': L('Sin foto', 'No photo'), 'justificada': L('Justificación por revisar', 'Justification to review'), 'aceptada': L('Excepción aceptada', 'Exception accepted') }) });
  const STG = [['config', 'Configuración', 'Setup', 'Cliente, instalación, modalidad y responsables', 'Client, facility, modality and owners'], ['procesos', 'Procesos críticos', 'Critical processes', 'Selección y justificación de alcance', 'Scope selection and justification'], ['recorrido', 'Recorrido', 'Walkdown', 'Áreas, activos y dependencias', 'Areas, assets and dependencies'], ['cuestionario', 'Cuestionario', 'Questionnaire', 'Preguntas adaptativas', 'Adaptive questions'], ['evidencias', 'Evidencias', 'Evidence', 'Fotografías y cobertura', 'Photos and coverage'], ['evaluacion', 'Evaluación', 'Assessment', 'Escenarios, controles y matriz', 'Scenarios, controls and matrix'], ['resultados', 'Resultados', 'Results', 'Revisión, hoja de ruta e informe', 'Review, roadmap and report']];
  Object.defineProperty(C, 'STAGES', { get: () => STG.map((s, i) => ({ n: i + 1, key: s[0], name: L(s[1], s[2]), sub: L(s[3], s[4]) })) });
  Object.defineProperty(C, 'STATE_LBL', { get: () => ({ none: L('No iniciado', 'Not started'), progress: L('En curso', 'In progress'), complete: L('Completo', 'Complete'), review: L('Requiere revisión', 'Needs review'), blocked: L('Bloqueado', 'Blocked'), evidence: L('En curso — evidencia pendiente', 'In progress — evidence pending') }) });
  C.SEV_ORDER = { block: 0, imp: 1, rev: 2, sug: 3 };

  C.evaluate = function (a) {
    const st = C.STAGES.map(s => ({ ...s, done: 0, total: 0, phDone: 0, phTotal: 0, review: 0, items: [] }));
    const add = (n, ok, item) => { const s = st[n - 1]; s.total++; if (ok) s.done++; else if (item) s.items.push(item); };
    const pend = (n, sev, title, reason, target) => st[n - 1].items.push({ stage: n, sev, title, reason, target });
    const f = a.cfg;
    [['client', 'Cliente', 'Client'], ['plant', 'Instalación', 'Facility'], ['industry', 'Industria', 'Industry'], ['modality', 'Modalidad', 'Modality'], ['scope', 'Alcance', 'Scope']].forEach(([k, es, en]) =>
      add(1, !!(f[k] || '').toString().trim(), { stage: 1, sev: 'imp', title: L(es + ' sin definir', en + ' missing'), reason: L('Dato requerido de configuración', 'Required setup field'), target: 'f-' + k }));
    add(1, !!a.leadId, { stage: 1, sev: 'imp', title: L('Responsable sin asignar', 'Lead not assigned'), reason: L('Asigne un responsable del assessment', 'Assign an assessment lead'), target: 'f-lead' });
    const inc = C.included(a);
    add(2, inc.length > 0, { stage: 2, sev: 'block', title: L('Ningún proceso crítico incluido', 'No critical process included'), reason: L('El recorrido y la evaluación dependen del alcance', 'Walkdown and assessment depend on scope'), target: 'proc-list' });
    a.processes.forEach(p => {
      const v6m = p.status === 'incluido' && C.v6req ? C.v6req(p) : [];
      const ok = p.status && p.just.trim() && (p.status !== 'incluido' || p.crit) && !v6m.length;
      const why = !p.status ? L('Defina si se incluye, está fuera de alcance, no aplica o se desconoce', 'Set as included, out of scope, not applicable or unknown') : !p.just.trim() ? (p.status === 'na' ? L('«No aplica» requiere explicación', '"Not applicable" requires an explanation') : L('Falta justificación', 'Justification missing')) : p.status === 'incluido' && !p.crit ? L('Falta criticidad del proceso', 'Process criticality missing') : L('Falta: ', 'Missing: ') + v6m.map(x => x[1]).join(', ');
      add(2, ok, { stage: 2, sev: p.status === 'na' && !p.just.trim() ? 'block' : 'imp', title: tx(p.name), reason: why, target: 'proc-' + p.key });
      if (p.status === 'desconocido') pend(2, 'sug', tx(p.name) + L(': estado desconocido', ': status unknown'), L('Brecha de información; no equivale a «No aplica» ni a riesgo bajo', 'Information gap; not the same as "Not applicable" or low risk'), 'proc-' + p.key);
    });
    const blocked3 = inc.length === 0;
    inc.forEach(p => add(3, !!p.noAssets || a.assets.some(x => !C.isOut(x) && C.assetProcs(x).includes(p.key)), { stage: 3, sev: 'imp', title: tx(p.name) + L(': sin activos registrados', ': no assets recorded'), reason: L('Registre los activos y sistemas relevantes', 'Record the relevant assets and systems'), target: 'asset-form' }));
    if (inc.length) add(3, a.deps.length > 0, { stage: 3, sev: 'imp', title: L('Sin dependencias registradas', 'No dependencies recorded'), reason: L('Registre de qué depende cada activo crítico', 'Record what each critical asset depends on'), target: 'dep-form' });
    const reqs = C.photoReqs(a);
    reqs.filter(r => r.kind !== 'finding').forEach(r => { st[2].phTotal++; if (r.status === 'capturada' || r.status === 'aceptada') st[2].phDone++; });
    const app = C.applicable(a);
    app.forEach(({ q, cond }) => {
      const r = a.answers[q.id];
      if (q.req || (cond && !(q.cond && q.cond.opt))) add(4, C.answerOK(a, q), { stage: 4, sev: 'imp', title: q.id + (cond ? L(' (condicional)', ' (conditional)') : ''), reason: r && r.value === 'No aplica' ? L('«No aplica» requiere justificación', '"Not applicable" requires justification') : tx(q.text), target: 'q-' + q.id });
      if (r && r.value === 'Desconocido') pend(4, 'sug', q.id + L(': respuesta desconocida', ': unknown answer'), L('Brecha de información registrada; requiere verificación, no es riesgo automático', 'Information gap recorded; needs verification, not automatic risk'), 'q-' + q.id);
    });
    reqs.forEach(r => {
      add(5, r.status === 'capturada' || r.status === 'aceptada', { stage: 5, sev: r.status === 'justificada' ? 'rev' : 'imp', title: r.label, reason: r.status === 'justificada' ? L('Justificación por revisar: ', 'Justification to review: ') + tx(r.res.reason || '') : L('Sin foto y sin explicación · ', 'No photo and no explanation · ') + r.why, target: 'req-' + r.key.replace(':', '-') });
      if (r.status === 'justificada') st[4].review++;
    });
    a.photos.filter(p => p.review === 'Por revisar').forEach(p => pend(5, 'sug', L('Foto por revisar: ', 'Photo to review: ') + tx(p.title), L('Revise descripción y autorización antes del informe', 'Check caption and authorization before the report'), 'ph-' + p.id));
    st[4].phTotal = reqs.length; st[4].phDone = reqs.filter(r => r.status === 'capturada' || r.status === 'aceptada').length;
    inc.forEach(p => add(6, !!p.noScn || a.scenarios.some(s => s.proc === p.key), { stage: 6, sev: 'imp', title: tx(p.name) + L(': sin escenarios', ': no scenarios'), reason: L('Identifique al menos un escenario de falla o documente por qué no aplica', 'Identify at least one failure scenario or document why none applies'), target: 'scn-new' }));
    a.scenarios.forEach(s => {
      const l = C.LEVEL(s.C, s.P); const ok = l && s.justC.trim() && s.justP.trim();
      add(6, ok, { stage: 6, sev: 'imp', title: s.id + L(': pendiente de evaluación', ': pending assessment'), reason: !s.C || !s.P ? L('Falta ' + (!s.C ? 'consecuencia' : 'probabilidad'), 'Missing ' + (!s.C ? 'consequence' : 'likelihood')) + ' · ' + tx(s.title) : L('Justifique consecuencia y probabilidad', 'Justify consequence and likelihood'), target: 'scn-' + s.id });
      if (l === 'Alto' || l === 'Medio') add(6, a.recs.some(r => r.sc.includes(s.id)), { stage: 6, sev: 'imp', title: s.id + L(': riesgo ' + l.toLowerCase() + ' sin recomendación', ': ' + tx(l).toLowerCase() + ' risk without recommendation'), reason: L('Vincule una acción de la hoja de ruta', 'Link a roadmap action'), target: 'scn-' + s.id });
    });
    a.findings.filter(fd => !a.scenarios.some(s => s.findings.includes(fd.id))).forEach(fd => pend(6, 'sug', fd.id + L(' sin escenario asociado', ' without scenario'), tx(fd.title), 'finding-' + fd.id));
    add(7, a.review.findings, { stage: 7, sev: 'imp', title: L('Revisión de hallazgos', 'Findings review'), reason: L('Confirme que hallazgos y recomendaciones fueron revisados', 'Confirm findings and recommendations were reviewed'), target: 'rv-findings' });
    add(7, a.review.photos, { stage: 7, sev: 'imp', title: L('Autorización de fotografías', 'Photo authorization'), reason: L('Confirme la autorización del cliente para las fotos del informe', 'Confirm client authorization for report photos'), target: 'rv-photos' });
    add(7, a.review.consistency, { stage: 7, sev: 'imp', title: L('Consistencia de datos', 'Data consistency'), reason: L('Confirme alcance, exclusiones y limitaciones', 'Confirm scope, exclusions and limitations'), target: 'rv-consistency' });
    add(7, a.reportStatus === 'Aprobado', { stage: 7, sev: 'sug', title: L('Informe en borrador', 'Report in draft'), reason: L('Apruebe el informe cuando la revisión esté completa', 'Approve the report once review is complete'), target: 'rep-approve' });
    st.forEach(s => {
      const allDone = s.done === s.total && s.total > 0; const phOk = s.phDone === s.phTotal;
      if (s.n >= 3 && s.n <= 6 && blocked3 && s.n !== 4) s.state = 'blocked';
      else if ((s.total === 0 && s.phTotal === 0) || (s.done === 0 && s.phDone === 0)) s.state = 'none';
      else if (allDone && phOk && !s.review) s.state = 'complete';
      else if (s.review && allDone) s.state = 'review';
      else if (allDone && !phOk) s.state = 'evidence';
      else s.state = 'progress';
    });
    reqs.filter(r => r.kind !== 'finding' && r.status === 'sin foto').forEach(r => pend(3, 'imp', L('Foto pendiente: ', 'Photo pending: ') + r.label, L('Puede continuar; el pendiente queda registrado', 'You can continue; the item stays tracked'), 'req-' + r.key.replace(':', '-')));
    const tot = st.reduce((n, s) => n + s.total + s.phTotal, 0); const dn = st.reduce((n, s) => n + s.done + s.phDone, 0);
    return { stages: st, done: dn, total: tot, pct: tot ? Math.round(dn / tot * 100) : 0, reqs, app };
  };

  C.metrics = function (a, flt) {
    flt = flt || {};
    const ev = C.evaluate(a); const inc = C.included(a);
    let scn = a.scenarios.slice();
    if (flt.proc) scn = scn.filter(s => s.proc === flt.proc);
    if (flt.level) scn = scn.filter(s => (C.LEVEL(s.C, s.P) || 'Pendiente') === flt.level);
    if (flt.conf) scn = scn.filter(s => s.conf === flt.conf);
    if (flt.state) scn = scn.filter(s => (C.LEVEL(s.C, s.P) ? 'Evaluado' : 'Pendiente') === flt.state);
    if (flt.area) scn = scn.filter(s => s.assets.some(id => (C.asset(a, id) || {}).area === flt.area));
    const lv = { Alto: 0, Medio: 0, Bajo: 0, Pendiente: 0 }; scn.forEach(s => lv[C.LEVEL(s.C, s.P) || 'Pendiente']++);
    const ctl = scn.flatMap(s => s.controls);
    const procs = flt.proc ? inc.filter(p => p.key === flt.proc) : inc;
    const procEval = procs.filter(p => a.scenarios.some(s => s.proc === p.key && C.LEVEL(s.C, s.P)));
    const app = ev.app.filter(x => !flt.proc || !x.q.proc || x.q.proc === flt.proc).filter(x => !flt.dim || x.q.dim === flt.dim);
    const answered = app.filter(x => C.answerOK(a, x.q)); const unknown = app.filter(x => (a.answers[x.q.id] || {}).value === 'Desconocido');
    const scnIds = new Set(scn.map(s => s.id)); const recs = a.recs.filter(r => r.sc.some(id => scnIds.has(id)));
    const radar = D.DIMS.map(dim => {
      const qs = ev.app.filter(x => x.q.dim === dim && x.q.pol === 'control' && (!flt.proc || !x.q.proc || x.q.proc === flt.proc));
      const vals = qs.map(x => (a.answers[x.q.id] || {}).value);
      const yes = vals.filter(v => v === 'Sí').length, no = vals.filter(v => v === 'No').length, unk = vals.filter(v => v === 'Desconocido').length, na = vals.filter(v => v === 'No aplica').length; const n = yes + no;
      return { dim, yes, no, unk, na, n, q: qs.length, idx: n >= 2 ? Math.round(yes / n * 100) : null };
    });
    const byProc = inc.map(p => { const o = { key: p.key, name: tx(p.name), Alto: 0, Medio: 0, Bajo: 0, Pendiente: 0 }; scn.filter(s => s.proc === p.key).forEach(s => o[C.LEVEL(s.C, s.P) || 'Pendiente']++); return o; });
    return {
      ev, scn, lv, procs, procEval, inc, ctlTotal: ctl.length, ctlVer: ctl.filter(c => c.st === 'Verificado').length,
      reqTotal: ev.reqs.length, reqOk: ev.reqs.filter(r => r.status === 'capturada' || r.status === 'aceptada').length, reqJust: ev.reqs.filter(r => r.status === 'justificada').length, reqNone: ev.reqs.filter(r => r.status === 'sin foto').length,
      photos: a.photos.length, appTotal: app.length, appDone: answered.length, unknown: unknown.length,
      recs, recHigh: recs.filter(r => r.pr === 'Alta').length, recDone: recs.filter(r => r.st === 'Completada').length,
      outScope: a.processes.filter(p => p.status === 'fuera').length, na: a.processes.filter(p => p.status === 'na').length, unkProc: a.processes.filter(p => p.status === 'desconocido').length, radar, byProc
    };
  };

  C.newAssessment = function (cfgPatch, people) {
    people = people || {}; const lib = C.S.lib; let n = C.S.assessments.length + 14; while (C.S.assessments.some(x => x.code === 'ORA-2026-' + String(n).padStart(3, '0'))) n++;
    const a = {
      id: C.uid('AS'), code: 'ORA-2026-' + String(n).padStart(3, '0'), created: new Date().toISOString(), updated: new Date().toISOString(), libVersion: lib.version, demo: false,
      cfg: Object.assign({ client: '', plant: '', industry: 'oilgas', modality: 'light', customCount: lib.modalities.custom.count, scope: '', contact: '', exclusions: '' }, cfgPatch || {}),
      creator: C.S.userId, leadId: people.leadId || C.S.userId, team: (people.team || []).filter(x => x !== (people.leadId || C.S.userId)), history: [],
      processes: [], areas: [], assets: [], deps: [], systems: [], imports: [], _v5: true, _v6: true, answers: {}, findings: [], scenarios: [], recs: [], photos: [], photoRes: {}, docs: [],
      coverage: (D.DOMAINS || []).map(d => ({ domain: d.key, applicable: true, state: 'no revisado', source: '', gaps: '', just: '', findings: [] })), opportunities: [], interventions: [], dispositions: [], evidence: [], ai: [],
      phases: (D.PHASE_NAMES || []).map((n, i) => ({ n: i + 1, name: n, horizon: '', milestones: { scope: 'no iniciado', funding: 'no iniciado', released: 'no iniciado' } })),
      questions: clone(lib.questions), review: { findings: false, photos: false, consistency: false }, reportStatus: 'Borrador', reportVersion: 1
    };
    C.loadTemplate(a); C.S.assessments.unshift(a); C.S.activeId = a.id; C.log(a, 'Creó el assessment (' + C.modName(C.mod(a)) + ')', 'Created the assessment (' + C.modName(C.mod(a)) + ')'); return a;
  };
  C.loadTemplate = function (a) { const t = C.S.lib.templates[a.cfg.industry] || { processes: [] }; a.processes = t.processes.filter(p => p.active !== false).map(p => ({ key: p.key, name: p.name, desc: p.desc, status: null, just: '', crit: '', prov: 'catalogo', catId: p.id, crit3: p.crit3, critCat: p.critCat, type: 'productivo' })); a.templateVersion = t.version; a.catalog = C.catSnapshot(a.cfg.industry); };

  C.fmtDate = (iso, withTime) => { if (!iso) return '—'; const d = new Date(iso); const s = d.toLocaleDateString(I.loc(), { day: 'numeric', month: 'short', year: 'numeric' }); return withTime ? s + ' · ' + d.toLocaleTimeString(I.loc(), { hour: '2-digit', minute: '2-digit' }) : s; };
  C.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  C.S = C.load();
  // ---------- Fase 4: preguntas condicionales por inventario, dependencias, hallazgos e incertidumbre ----------
  C.F4_QUESTIONS = () => {
    const Q = (id, es, en, dim, sig, o) => { I.B(es, en); return Object.assign({ id, v: 1, text: es, dim, ind: ['*'], mods: ['light', 'two', 'custom'], order: 99, active: true, req: true, pol: 'control', proc: null, cond: { sig }, ev: false }, o || {}); };
    return [
      Q('Q-GEN-201', '¿Existe una alternativa probada (redundancia, operación manual o repuesto) para los elementos señalados como candidatos a punto único de falla?', 'Is there a tested alternative (redundancy, manual operation or spare) for the items flagged as single point of failure candidates?', 'Redundancia', 'spof', { ev: true }),
      Q('Q-GEN-202', '¿Existe un inventario OT documentado y vigente que confirme los elementos sugeridos o importados?', 'Is there a documented, current OT inventory that confirms the suggested or imported items?', 'Continuidad operativa', 'unval', { pol: 'contexto' }),
      Q('Q-GEN-203', '¿La energía de los sistemas de control tiene respaldo con autonomía conocida y probada?', 'Does control-system power have backup with known, tested autonomy?', 'Continuidad operativa', 'energy', { ev: true }),
      Q('Q-GEN-204', '¿Cada hallazgo registrado tiene responsable y fecha para su atención?', 'Does each recorded finding have an owner and a date?', 'Continuidad operativa', 'finding', { req: false }),
      Q('Q-GEN-205', '¿Se identificó quién puede confirmar las respuestas «Desconocido» y cuándo?', 'Has someone been identified to confirm the “Unknown” answers, and by when?', 'Continuidad operativa', 'unknown', { pol: 'contexto' })
    ];
  };
  C.f4Signals = function (a) {
    const inc = new Set(C.included(a).map(p => p.key)); const out = {};
    const inScope = x => C.recProcs(x).some(k => inc.has(k));
    if (C.depAnalysis) { const sp = Object.keys(C.depAnalysis(a).spof); if (sp.length) out.spof = L('Activada por las dependencias: candidato a punto único de falla en ', 'Triggered by dependencies: single point of failure candidate at ') + sp.map(id => C.nodeLbl(a, id)).join(', '); }
    const sug = [...a.assets, ...a.systems].filter(x => !C.isOut(x) && inScope(x) && !C.okd(x)).length;
    if (sug) out.unval = L(`Activada por el inventario: ${sug} elementos sin validar`, `Triggered by the inventory: ${sug} items not validated`);
    const en = a.systems.find(s => !C.isOut(s) && s.cat === 'energia' && inScope(s) && C.okd(s)) || a.assets.find(x => !C.isOut(x) && x.type === 'UPS' && inScope(x) && C.okd(x));
    if (en) out.energy = L('Activada por el catálogo e inventario: energía de control validada (', 'Triggered by catalog and inventory: validated control power (') + (en.tag || tx(en.name)) + ')';
    if (a.findings.length) out.finding = L(`Activada por ${a.findings.length} hallazgo(s) registrado(s)`, `Triggered by ${a.findings.length} recorded finding(s)`);
    const unk = Object.entries(a.answers).filter(([id, r]) => r.value === 'Desconocido' && id !== 'Q-GEN-205').length;
    if (unk) out.unknown = L(`Activada por incertidumbre: ${unk} respuesta(s) «Desconocido»`, `Triggered by uncertainty: ${unk} “Unknown” answer(s)`);
    return out;
  };
  C.boot = function () { C.normLib(C.S.lib); C.S.assessments.forEach(C.normAssessment); C.S.v = 6; };
  // ======== Fase 1: modelo común, procedencia y madurez ========
  C.PROVS = ['catalogo', 'excel', 'manual', 'documento', 'entrevista', 'campo', 'notas', 'dictado', 'omnia'];
  C.provName = k => ({ catalogo: L('Catálogo', 'Catalog'), excel: 'Excel', manual: L('Manual', 'Manual'), documento: L('Documento', 'Document'), entrevista: L('Entrevista', 'Interview'), campo: L('Campo', 'Field'), foto: L('Foto', 'Photo'), notas: L('Notas', 'Notes'), dictado: L('Dictado de campo', 'Field dictation'), omnia: 'omnIA' }[k] || k || '—');
  C.okd = x => !!(x && x.val && (x.val.status === 'validado' || x.val.status === 'aceptado'));
  C.matName = k => ({ sugerido: L('Propuesto', 'Proposed'), aceptado: L('Aceptado', 'Accepted'), validado: L('Verificado', 'Verified'), evaluado: L('Evaluado', 'Assessed'), descartado: L('Descartado', 'Discarded') }[k] || k);
  C.catName = k => tx(((C.S.lib.otCats || D.OT_CATS).find(c => c.key === k) || {}).name || '') || L('Sin categoría', 'Uncategorized');
  C.depName = t => t === 'Comunicación' ? tx('Red / comunicación') : t === 'Proceso' ? tx('Operacional / proceso') : tx(t);
  C.assetTypes = () => (C.S.lib.assetTypes || []).filter(t => t.active).map(t => t.name);
  C.assetProcs = x => (x.procs && x.procs.length ? x.procs : [x.proc]).filter(Boolean);
  C.recProcs = x => x.procs && x.procs.length ? x.procs : x.proc ? [x.proc] : [];
  C.isOut = x => !!(x && x.val && x.val.status === 'descartado');
  C.system = (a, id) => (a.systems || []).find(s => s.id === id);
  C.nodeLbl = (a, id) => { const x = C.asset(a, id); if (x) return x.tag; const s = C.system(a, id); if (s) return tx(s.name); const ar = C.area(a, id); return ar ? tx(ar.name) : id; };
  const evalScn = s => C.LEVEL(s.C, s.P) && s.controls && s.controls.length;
  // madurez: Evaluado se calcula (escenario clasificado con controles); el resto viene de la decisión registrada
  C.mat = function (a, kind, x) {
    if (!x) return 'sugerido';
    if (kind === 'process') { if (a.scenarios.some(s => s.proc === x.key && evalScn(s))) return 'evaluado'; return x.status ? 'validado' : 'sugerido'; }
    if (C.isOut(x)) return 'descartado';
    if (!C.okd(x)) return 'sugerido';
    const sc = a.scenarios.filter(evalScn);
    if (kind === 'asset' && sc.some(s => s.assets.includes(x.id))) return 'evaluado';
    if (kind === 'system' && a.assets.some(y => y.sys === x.id && sc.some(s => s.assets.includes(y.id)))) return 'evaluado';
    if (kind === 'area' && a.assets.some(y => y.area === x.id && sc.some(s => s.assets.includes(y.id)))) return 'evaluado';
    if (kind === 'dep' && sc.some(s => (s.deps || []).includes(x.id) || (s.assets.includes(x.from) && s.assets.includes(x.to)))) return 'evaluado';
    return (x.val && x.val.status) || 'sugerido';
  };
  C.recLog = function (x, es, en, extra) { (x.log = x.log || []).unshift(Object.assign({ ts: new Date().toISOString(), by: C.S.userId, es, en }, extra || {})); };
  C.setVal = function (a, kind, x, status, info) {
    info = info || {}; const prev = (x.val && x.val.status) || 'sugerido';
    x.val = { status, by: C.S.userId, ts: new Date().toISOString(), src: info.src || '', reason: info.reason || '' };
    const lb = kind === 'asset' ? x.tag : kind === 'dep' ? C.nodeLbl(a, x.from) + ' → ' + C.nodeLbl(a, x.to) : (x.name || x.id);
    const ves = { validado: 'Verificó', aceptado: 'Aceptó', descartado: 'Descartó', sugerido: 'Reabrió' }[status], ven = { validado: 'Verified', aceptado: 'Accepted', descartado: 'Discarded', sugerido: 'Reopened' }[status];
    C.recLog(x, `${ves} (${prev} → ${status})${info.reason ? ': ' + info.reason : ''}`, `${ven} (${prev} → ${status})${info.reason ? ': ' + info.reason : ''}`, { from: prev, to: status });
    C.log(a, `${ves} ${lb}${info.reason ? ' · ' + info.reason : ''}`, `${ven} ${lb}${info.reason ? ' · ' + info.reason : ''}`);
  };
  C.catSnapshot = ind => { const t = C.S.lib.templates[ind] || {}; return clone({ ind, version: t.version || 1, areas: (t.areas || []).filter(x => x.active), systems: (t.systems || []).filter(x => x.active), deps: (t.deps || []).filter(x => x.active), controls: (t.controls || []).filter(x => x.active) }); };
  // sugerencias del catálogo para los procesos incluidos: crean registros «Sugerido» de procedencia catálogo
  C.catalogPending = function (a) {
    const inc = new Set(C.included(a).map(p => p.key)); const cat = a.catalog || { areas: [], systems: [], deps: [] };
    const has = (list, id) => list.some(x => x.cat0 === id);
    const areas = cat.areas.filter(x => x.procs.some(p => inc.has(p)) && !has(a.areas, x.id));
    const systems = cat.systems.filter(x => x.procs.some(p => inc.has(p)) && !has(a.systems, x.id));
    const sysIds = new Set([...a.systems.map(s => s.cat0), ...systems.map(s => s.id)]);
    const deps = cat.deps.filter(d => sysIds.has(d.from) && sysIds.has(d.to) && !has(a.deps, d.id));
    return { areas, systems, deps };
  };
  C.applyCatalog = function (a) {
    const pend = C.catalogPending(a); const inc = new Set(C.included(a).map(p => p.key)); const now = new Date().toISOString();
    const base = (o, id) => Object.assign(o, { cat0: id, prov: 'catalogo', val: { status: 'sugerido', by: '', ts: now }, src: { catalog: a.catalog.ind, version: a.catalog.version, ts: now, by: C.S.userId }, log: [] });
    pend.areas.forEach(x => { const procs = x.procs.filter(p => inc.has(p)); a.areas.push(base({ id: C.uid('A'), name: x.name, proc: procs[0], procs }, x.id)); });
    pend.systems.forEach(x => a.systems.push(base({ id: C.uid('SY'), name: x.name, cat: x.cat, procs: x.procs.filter(p => inc.has(p)), types: x.types }, x.id)));
    const byCat = id => (a.systems.find(s => s.cat0 === id) || {}).id;
    pend.deps.forEach(d => a.deps.push(base({ id: C.uid('D'), from: byCat(d.from), to: byCat(d.to), type: d.type, note: d.desc, dir: 'uni', crit: '' }, d.id)));
    const n = pend.areas.length + pend.systems.length + pend.deps.length;
    if (n) C.log(a, `Aplicó sugerencias del catálogo v${a.catalog.version}: ${pend.areas.length} áreas, ${pend.systems.length} sistemas, ${pend.deps.length} dependencias`, `Applied catalog v${a.catalog.version} suggestions: ${pend.areas.length} areas, ${pend.systems.length} systems, ${pend.deps.length} dependencies`);
    return { areas: pend.areas.length, systems: pend.systems.length, deps: pend.deps.length, total: n };
  };
  // normalización e migración (idempotente) de datos guardados v4 → v5
  const VER_MAP = { 'Verificado en sitio': ['campo', 'validado'], 'Documentado': ['documento', 'validado'], 'Declarado': ['entrevista', 'sugerido'] };
  C.normLib = function (lib) {
    lib.otCats = lib.otCats || clone(D.OT_CATS);
    lib.assetTypes = lib.assetTypes || D.ASSET_TYPES.map(n => ({ name: n, cat: D.ASSET_TYPE_CAT[n] || '', active: true }));
    Object.keys(D.TEMPLATES).forEach(k => { const t = lib.templates[k] = lib.templates[k] || clone(D.TEMPLATES[k]); const d = D.TEMPLATES[k];
      ['areas', 'systems', 'deps', 'controls'].forEach(f => { if (!t[f]) t[f] = clone(d[f] || []); });
      if (!t.history) t.history = clone(d.history || []);
      t.processes.forEach(p => { if (p.active === undefined) p.active = true; if (!p.id) p.id = k.slice(0, 2).toUpperCase() + '-PR-' + p.key; });
    });
    if (!lib._f4) { C.F4_QUESTIONS().forEach(q => { if (!lib.questions.some(x => x.id === q.id)) lib.questions.push(q); }); lib.version++; lib._f4 = true; }
    return lib;
  };
  C.normAssessment = function (a) {
    if (a._v5) return a;
    const seedP = a.id === 'AS-2026-014' && a.demo ? D.SEED_P1 : null;
    const by0 = C.uname(a.leadId) || C.uname(a.creator) || '', ts0 = a.created;
    a.systems = a.systems || []; a.imports = a.imports || [];
    if (!a.catalog) a.catalog = C.catSnapshot(a.cfg.industry);
    const tpl = C.S.lib.templates[a.cfg.industry] || { processes: [] };
    a.processes.forEach(p => { if (!p.prov) p.prov = tpl.processes.some(x => x.key === p.key) ? 'catalogo' : 'manual'; });
    a.areas.forEach(x => { x.procs = x.procs || [x.proc]; if (!x.prov) { x.prov = seedP ? 'campo' : 'manual'; x.val = { status: 'validado', by: x.by || by0, ts: ts0, src: seedP ? 'campo' : '' }; if (seedP && seedP.areas[x.id]) x.cat0 = seedP.areas[x.id]; } x.log = x.log || []; });
    if (seedP && !a.systems.length) seedP.systems.forEach(s => a.systems.push({ id: s.id, cat0: s.cat0, name: s.name, cat: s.cat, procs: s.procs.slice(), prov: s.prov, val: s.val[0] === 'validado' ? { status: 'validado', by: s.val[1], ts: a.created, src: s.val[2] } : { status: 'sugerido', by: '', ts: a.created }, src: { catalog: 'oilgas', version: 2, ts: a.created }, log: [] }));
    a.assets.forEach(x => {
      if (!x.procs) x.procs = [x.proc];
      if (!x.prov) { const m = VER_MAP[x.ver] || ['manual', 'validado']; const sp = seedP && seedP.assets[x.id];
        if (sp) { x.sys = sp[0]; if (sp[2]) x.procs = sp[2].slice(); }
        x.prov = m[0]; x.val = { status: m[1], by: m[1] === 'validado' ? (x.by || by0) : '', ts: ts0, src: m[0] === 'manual' ? '' : m[0] }; }
      x.log = x.log || [];
    });
    a.deps.forEach(d => { if (!d.prov) { const pv = seedP && seedP.deps[d.id]; d.prov = pv || 'manual'; d.val = { status: 'validado', by: d.by || by0, ts: ts0, src: pv || '' }; d.dir = d.dir || 'uni'; d.crit = d.crit || ''; } d.log = d.log || []; });
    if (seedP && !a.deps.some(d => d.id === 'D-07')) seedP.extraDeps.forEach(d => a.deps.push(Object.assign({}, d, { dir: 'uni', crit: '', val: { status: 'sugerido', by: '', ts: a.created }, src: { catalog: 'oilgas', version: 2, ts: a.created }, log: [] })));
    a._v5 = true; return a;
  };
  C.boot();
  window.ORA = C;
})();
