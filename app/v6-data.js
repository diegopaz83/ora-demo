/* ORA v6 · datos: catálogo v4 (listas maestras) y 12 assessments de ejemplo. Se carga después de data-v2.js y antes de core.js.
   Sustituye catálogo, preguntas, dominios y semillas; conserva usuarios, roles, modalidades y reglas de fotos. */
(function () {
  const D = window.ORA_DATA, CAT = window.ORA_CAT4, DEMO = window.ORA_DEMO6, B = window.ORA_I18N.B;
  if (!D || !CAT || !DEMO) return;
  const ALL = ['light', 'two', 'custom'];
  // Ocho dominios de revisión (lámina 3) reemplazan las seis dimensiones del radar
  D.DOMAINS = DEMO.domains.map(d => ({ key: d.key, name: d.name }));
  D.DIMS = D.DOMAINS.map(d => d.name);
  [['Control y equipos de campo', 'Control and field devices'], ['Redes y comunicaciones', 'Networks and communications'], ['Infraestructura compartida', 'Shared infrastructure'], ['Software y datos', 'Software and data'],
   ['Energía y ambiente', 'Power and environment'], ['Soportabilidad y recuperación', 'Supportability and recovery'], ['Ciberseguridad y accesos', 'Cybersecurity and access'], ['Problemas de programación', 'Programming issues']].forEach(([e, n]) => B(e, n));
  D.DOMAIN_NAME = k => (D.DOMAINS.find(d => d.key === k) || {}).name || k;
  D.LIFECYCLE = DEMO.lifecycle; D.PHASE_NAMES = DEMO.phases;
  D.INDUSTRIES = [{ key: 'oilgas', name: 'Oil & Gas', icon: 'assets/ind-oilgas.png' }, { key: 'cemento', name: B('Cemento', 'Cement') }, { key: 'mineria', name: B('Minería', 'Mining') },
    { key: 'energia', name: B('Generación de energía', 'Power generation') }, { key: 'quimica', name: B('Química', 'Chemicals'), draft: true }];
  // categorías OT: se agrega Infraestructura (servidores, virtualización, almacenamiento)
  if (!D.OT_CATS.some(c => c.key === 'infra')) D.OT_CATS.splice(7, 0, { key: 'infra', name: B('Infraestructura (servidores, virtualización)', 'Infrastructure (servers, virtualization)') });
  const CATKEY = { 'Control': 'control', 'Seguridad funcional': 'seg', 'Protección de máquina': 'control', 'Protección eléctrica': 'energia', 'Supervisión eléctrica': 'sup', 'Medición e inventario': 'instr', 'Medición fiscal': 'instr',
    'Instrumentación': 'instr', 'Instrumentación / analítica': 'instr', 'Datos / aplicación': 'datos', 'Comunicación remota': 'red', 'Comunicación': 'red', 'Energía / accionamiento': 'energia', 'Energía de respaldo': 'energia',
    'Ambiental / cumplimiento': 'instr', 'Mecánico / hidráulico': 'proceso', 'Infraestructura': 'infra' };
  D.CATKEY = CATKEY;
  // tipos de activo: base + los del catálogo («Equipo (tipo de activo)») + los usados en los ejemplos
  const types = new Set(D.ASSET_TYPES.filter(t => t !== 'Otro'));
  Object.values(CAT.industries).forEach(I => I.systems.filter(s => s.kind === 'tipoActivo').forEach(s => { types.add(s.name); D.ASSET_TYPE_CAT[s.name] = CATKEY[s.cat] || ''; }));
  DEMO.assessments.forEach(a => a.assets.forEach(x => { if (x.type) { types.add(x.type); if (!(x.type in D.ASSET_TYPE_CAT)) D.ASSET_TYPE_CAT[x.type] = ({ control: 'control', software: 'datos', redes: 'red', infra: 'infra', energia: 'energia' })[x.family] || 'proceso'; } }));
  D.ASSET_TYPES = [...types, 'Otro'];
  // plantillas por industria desde el catálogo v4
  const T = {};
  Object.values(CAT.industries).forEach(I => {
    const rel = I.relations;
    T[I.key] = { version: 4, source: CAT.source,
      processes: I.processes.map(p => ({ key: p.id, id: p.id, name: p.name, desc: B(`Catálogo: ${p.tipoCat === 'Critico' ? 'proceso crítico' : 'proceso secundario'} · criticidad sugerida ${p.critCat}`, `Catalog: ${p.tipoCat === 'Critico' ? 'critical' : 'secondary'} process · suggested criticality ${({ Critica: 'Critical', 'Crítica': 'Critical', Alta: 'High', Media: 'Medium', Baja: 'Low' })[p.critCat] || p.critCat}`), active: true, crit3: p.crit, critCat: p.critCat, scope: p.scope, prov: p.prov })),
      areas: I.areas.map(a => ({ id: a.id, name: a.name, procs: [...new Set(rel.filter(r => r.area === a.id).map(r => r.proc))], roles: Object.fromEntries(rel.filter(r => r.area === a.id).map(r => [r.proc, r.role])), active: true, v: 4 })),
      systems: I.systems.filter(s => s.kind === 'sistema' || s.kind === 'mixto').map(s => ({ id: s.id, name: s.name, cat: CATKEY[s.cat] || 'control', catLabel: s.cat, family: s.family, procs: [...new Set(rel.filter(r => r.sys === s.id).map(r => r.proc))],
        types: rel.filter(r => r.sys !== s.id && rel.some(q => q.sys === s.id && q.proc === r.proc)).map(r => (I.systems.find(x => x.id === r.sys) || {})).filter(x => x.kind === 'tipoActivo').map(x => x.name), obs: s.obs, active: true, v: 4 })),
      deps: [], controls: [],
      history: [{ v: 4, ts: '2026-11-10T12:00:00.000Z', by: 'gustavo-ramirez', es: 'Catálogo v4 generado desde las listas maestras normalizadas v2' + (I.key === 'quimica' ? ' · Química: investigación pública, borrador por validar' : ''), en: 'Catalog v4 generated from normalized master lists v2' + (I.key === 'quimica' ? ' · Chemicals: public research, draft to validate' : '') }],
      draft: I.key === 'quimica' };
  });
  D.TEMPLATES = T;
  // preguntas: tipo por proceso (industria) + por categoría OT y por área (condicionales, opcionales)
  const DOMQ = t => /respaldo|restaur|repuesto|soporte|recuper|copia/i.test(t) ? 'Soportabilidad y recuperación' : /anulacion|anulaci|acceso remoto|autorizaci|segreg/i.test(t) ? 'Ciberseguridad y accesos'
    : /red |enlace|comunica|gateway|sincroniz/i.test(t) ? 'Redes y comunicaciones' : /servidor|historiador/i.test(t) ? 'Infraestructura compartida' : /programa|receta|configuraci|scd|lógica/i.test(t) ? 'Problemas de programación'
    : /bater|energ|ups|climatiz|ambient|polvo|enfriamiento|vapor|aire|nitr/i.test(t) ? 'Energía y ambiente' : /software|sistema operativo|aplicaci|wms|dato/i.test(t) ? 'Software y datos' : 'Control y equipos de campo';
  const Q = [];
  Object.values(CAT.industries).forEach(I => I.questions.forEach(q => {
    const pi = I.processes.findIndex(p => p.id === q.proc), qi = +q.id.slice(-1) - 1;
    Q.push({ id: q.id, v: 1, text: q.text, dim: DOMQ(q.text), ind: [I.key], mods: ALL.slice(), order: pi * 3 + qi + 1, active: true, req: qi < 2, pol: 'control', proc: q.proc, cond: null, ev: false, status: q.status, draft: I.key === 'quimica' });
  }));
  const CQ = { 'Control': 'control', 'Seguridad funcional': 'seg', 'Protección de máquina': 'control', 'Protección eléctrica': 'energia', 'Supervisión eléctrica': 'sup', 'Medición e inventario': 'instr', 'Medición fiscal': 'instr', 'Datos / aplicación': 'datos',
    'Comunicación remota': 'red', 'Energía / accionamiento': 'energia', 'Energía de respaldo': 'energia', 'Ambiental / cumplimiento': 'instr', 'Instrumentación': 'instr', 'Instrumentación / analítica': 'instr', 'Mecánico / hidráulico': 'proceso' };
  CAT.common.questions.forEach((q, i) => {
    const area = /^AREA-/.test(q.id);
    Q.push({ id: q.id, v: 1, text: q.text, dim: DOMQ(q.text), ind: ['*'], mods: ALL.slice(), order: 60 + i, active: true, req: false, pol: 'control', proc: null, cond: { sig: area ? 'areas' : 'cat:' + (CQ[q.elem] || 'control'), opt: true, elem: q.elem }, ev: false, status: q.status });
  });
  D.QUESTIONS = Q;
  D.PHOTO_RULES = Object.assign({}, D.PHOTO_RULES, { assetTypes: ['Bomba', 'PLC', 'DCS', 'Variador', 'Servidor', 'Chiller'] });
  // assessments de ejemplo v6 → forma de la aplicación (se conservan todos los campos v6)
  const UN = Object.fromEntries(DEMO.users.map(u => [u.id, u.name]));
  const iso = (d, h) => d ? (d.length > 10 ? d : d + 'T' + String(h || 14).padStart(2, '0') + ':00:00.000Z') : new Date().toISOString();
  const val = (st, by, ts, src) => ({ status: st || 'validado', by: st === 'sugerido' ? '' : (by || ''), ts, src: src || '' });
  const STMAP = { 'propuesta': 'Propuesta', 'por validar': 'Propuesta', 'aprobada': 'Aceptada', 'en ejecución': 'En curso', 'completada': 'Completada', 'verificada': 'Completada', 'descartada': 'Propuesta' };
  D.STMAP = STMAP;
  function convert(x, lib) {
    const a = JSON.parse(JSON.stringify(x)); const T0 = iso(a.created, 9);
    const lead = UN[a.leadId] || '';
    a.created = T0; a.updated = iso(a.updated, 17); a.libVersion = lib.version; a.templateVersion = 4;
    a.cfg = Object.assign({ client: '', plant: '', industry: a.industry, modality: a.modality, customCount: 26, scope: '', contact: '', exclusions: '' }, a.cfg, { industry: a.industry, modality: a.modality });
    const tp = T[a.industry];
    a.processes = a.processes.map(p => { const c = tp.processes.find(q => q.key === p.catId) || {}; return Object.assign({}, p, { key: p.catId, name: c.name || p.name, desc: c.desc, status: p.status || null, just: p.just || '', crit: p.bizPriority || '', crit3: c.crit3, critCat: c.critCat, prov: 'catalogo', by: UN[p.by] || p.by || '', ts: T0 }); });
    a.areas = a.areas.map(r => Object.assign({}, r, { proc: (r.procs[0] || {}).proc || null, roles: Object.fromEntries(r.procs.map(z => [z.proc, z.role])), procs: r.procs.map(z => z.proc), cat0: r.catId || undefined, val: val(r.val, lead, T0, r.prov), log: [] }));
    a.systems = a.systems.map(s => Object.assign({}, s, { catLabel: s.cat, cat: CATKEY[s.cat] || (s.family === 'infra' ? 'infra' : 'control'), cat0: s.catId || undefined, val: val(s.val, lead, T0, s.prov), log: [] }));
    a.assets = a.assets.map(z => Object.assign({}, z, { proc: z.procs[0], mm: [z.mfr, z.model].filter(Boolean).join(' · '), ver: z.version, val: val(z.val, lead, T0, z.prov), log: [] }));
    a.deps = a.deps.map(d => Object.assign({}, d, { dir: 'uni', crit: '', val: val(d.val, lead, T0, d.prov), log: [] }));
    const ans = {}; Object.entries(a.answers).forEach(([k, r]) => { ans[k] = { value: r.value, note: r.note, conf: r.conf, source: r.source, by: UN[r.by] || r.by, ts: iso(r.ts, 11) }; }); a.answers = ans;
    a.findings = a.findings.map(f => Object.assign({}, f, { ts: T0, by: UN[f.reviewer] || '', origin: f.q ? 'cuestionario' : 'recorrido' }));
    a.scenarios = a.scenarios.map(s => Object.assign({}, s, { cause: s.causes.join('; '), cons: [s.impact.operational, s.impact.business].filter(Boolean).join(' '), controls: s.controls.map(c => ({ name: c.name, st: c.st, type: c.type, efficacy: c.efficacy })),
      conf: !s.P ? 'Desconocido' : s.recovery.tested ? 'Verificado' : 'Estimado', justP: s.justP || '' }));
    a.interventions.forEach(v => { v.log = []; });
    a.photos = a.evidence.filter(e => e.kind === 'foto' && e.file).map(e => ({ id: e.id, src: 'asset:' + e.file, title: e.title, caption: e.title + ' · ilustración de demostración, no es una fotografía.', author: UN[e.author] || e.author, ts: iso(e.ts, 10), review: e.review, inReport: e.inReport, links: e.links, sens: e.sensitivity }));
    a.docs = a.evidence.filter(e => e.kind === 'documento' || !e.file).map(e => ({ id: e.id, name: e.title, file: e.title, size: 0, type: e.kind === 'foto' ? 'image/jpeg' : 'application/pdf', links: e.links, by: e.author, ts: iso(e.ts, 10), review: e.review, sens: e.sensitivity, inReport: e.inReport, demo: true }));
    a.photoRes = {}; (a.photoExceptions || []).forEach(r => { a.photoRes[r.target] = { status: r.status, reason: r.reason, note: r.note, by: UN[r.by] || r.by, ts: T0 }; });
    a.recs = [];
    a.questions = JSON.parse(JSON.stringify(lib.questions));
    a.history = a.history.map(h => ({ ts: iso(h.ts, 12), by: h.by, es: h.text, en: h.text }));
    const done = a.reportStatus === 'Aprobado'; a.reviewNote = a.reportStatus === 'En revisión' ? 'En revisión' : '';
    a.reportStatus = done ? 'Aprobado' : 'Borrador'; a.reportVersion = done ? 2 : 1;
    a.review = { findings: done || a.reviewNote === 'En revisión', photos: done, consistency: done };
    a.imports = []; a._v6 = true;
    return a;
  }
  D.seedAll = function (lib) { return DEMO.assessments.map(x => convert(x, lib)); };
  D.SEED_P1 = { systems: [], assets: {}, deps: {}, extraDeps: [], areas: {} };
  D.DEMO_VERSION = 6;
})();
