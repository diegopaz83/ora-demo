/* ORA v7 — «Iniciar con omnIA»: fuentes (entrevistas, notas, documentos, Excel, dictado) → abstracción inicial.
   Motor 1: reglas deterministas sobre el texto y el catálogo (siempre disponible, sin conexión).
   Motor 2: Claude (capacidad `sample` del artefacto), cuando el visor lo permite. Ambos devuelven propuestas con su cita. */
(function () {
  const C = window.ORA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, L = I.L, tx = I.tx, ic = U.ic, A = U.act;
  const R = () => U.render();
  const now = () => new Date().toISOString();
  const norm = s => String(tx(s) || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const pl = (n, s, p) => n + ' ' + (n === 1 ? s : p);
  const ST = { step: 1, running: false, log: [], res: null, engine: 'auto', form: { type: 'entrevista', who: '', text: '' } };
  U.ingState = ST;

  // ---------- capacidades del visor (IA y dictado) ----------
  const CAP = { sample: null, dict: null, ready: false };
  U.vcap = CAP;
  (async () => { try { if (window.claude && claude.use) { const [s, d] = await Promise.all([claude.use('sample').catch(() => null), claude.use('dictation').catch(() => null)]); CAP.sample = s; CAP.dict = d; } } catch (e) {} CAP.ready = true; if (U.modal && U.modal.type === 'v7ing') U.renderModal(); })();

  const TYPES = () => [['entrevista', L('Entrevista', 'Interview'), 'users'], ['notas', L('Notas de visita', 'Visit notes'), 'edit'], ['documento', L('Documento', 'Document'), 'doc'], ['excel', L('Listado Excel', 'Excel list'), 'list'], ['dictado', L('Dictado de campo', 'Field dictation'), 'mic']];
  const tName = k => (TYPES().find(t => t[0] === k) || [k, k])[1];
  C.sources = a => (a.sources = a.sources || []);

  // ---------- material de ejemplo (se adapta a la industria del assessment) ----------
  function samplePack(a) {
    const t = C.S.lib.templates[a.cfg.industry] || {}; const tp = (t.processes || []).filter(p => p.active !== false);
    const procs = a.processes.slice(); const crit = procs.filter(p => /critic/i.test(norm(p.critCat || p.crit3 || ''))).concat(procs.filter(p => !/critic/i.test(norm(p.critCat || p.crit3 || ''))));
    const P1 = crit[0] || procs[0], P2 = crit[1] || procs[1] || P1;
    const short = p => tx(p.name).split('(')[0].trim();
    const ar = p => (a.catalog && a.catalog.areas || t.areas || []).filter(x => (x.procs || []).includes(p.key || p.catId));
    const A1 = (ar(P1)[0] || { name: L('Sala de control', 'Control room') }).name, A2 = (ar(P1)[1] || ar(P2)[0] || { name: L('Cuarto eléctrico', 'Electrical room') }).name, A3 = (ar(P2)[0] || ar(P1)[1] || { name: L('Área de servicios', 'Utilities area') }).name;
    const sA1 = tx(A1).split('(')[0].trim(), sA2 = tx(A2).split('(')[0].trim(), sA3 = tx(A3).split('(')[0].trim();
    const d = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
    void tp;
    const interview = [
      `[00:45] Consultor: ¿Cuáles son los procesos que más le preocupan si se detienen?`,
      `[01:10] Jorge Pérez: Lo más crítico para nosotros es ${short(P1)}. Si se para, perdemos la producción del día.`,
      `[02:30] Jorge Pérez: También es crítico ${short(P2)}, porque alimenta al resto de la planta.`,
      `[03:50] Jorge Pérez: Si ${short(P1)} se detiene, podemos aguantar máximo 4 horas antes de perder el lote.`,
      `[05:05] Jorge Pérez: En ${sA1} tenemos el PLC-101, un Siemens S7-300 instalado en 2005, que controla toda la secuencia. No tiene respaldo del programa: la última copia la hizo un integrador que ya no existe.`,
      `[07:20] Jorge Pérez: El HMI-101 de ${sA1} corre en Windows XP y nadie se atreve a actualizarlo.`,
      `[09:00] Jorge Pérez: El PLC-101 y el HMI-101 dependen de la UPS-01; si se cae la UPS, se cae el control.`,
      `[10:15] Jorge Pérez: La UPS-01 es la única del cuarto de control y las baterías tienen más de cinco años.`,
      `[11:30] Jorge Pérez: En ${sA2} el switch SW-01 es el único que conecta con el cuarto de control; no hay redundancia.`,
      `[12:45] Jorge Pérez: Los repuestos del variador VFD-201 de ${sA3} los trae un solo proveedor y tardan 8 semanas.`,
      `[14:10] Jorge Pérez: Del SCADA sí hacemos copias de respaldo cada mes, eso está controlado.`,
      `[15:30] Jorge Pérez: Recuperar ${short(P1)} si se daña el PLC-101 nos tomaría de 3 a 5 días, entre conseguir la CPU y reprogramar.`,
      `[16:40] Jorge Pérez: Una parada de ${short(P1)} nos cuesta alrededor de 18 millones de pesos por hora.`,
      `[18:00] Jorge Pérez: El proveedor entra por TeamViewer cuando hay fallas, con una contraseña compartida que no cambiamos.`].join('\n');
    const notes = [
      `Visita a ${sA2}: el gabinete del PLC-102 estaba sin llave y en el piso, cerca de un drenaje.`,
      `SCADA: no se encontraron copias de respaldo recientes; la última copia es de 2023.`,
      `${sA3}: el VFD-201 depende del TR-01, un solo transformador sin respaldo.`,
      `En ${sA1} se confirmó en pantalla que el HMI-101 corre en Windows XP.`].join('\n');
    const rows = [['TAG', 'Descripción', 'Tipo', 'Área', 'Fabricante / modelo', 'Año'],
      ['PLC-101', 'Controlador de secuencia', 'PLC', sA1, 'Siemens S7-300', '2008'],
      ['HMI-101', 'Estación de operación', 'HMI', sA1, 'PC industrial', '2006'],
      ['UPS-01', 'UPS del cuarto de control', 'UPS', sA1, 'APC Smart-UPS 3000', '2017'],
      ['PLC-102', 'Controlador auxiliar', 'PLC', sA2, 'Allen-Bradley CompactLogix', '2016'],
      ['SW-01', 'Switch de planta', 'Switch OT', sA2, 'Cisco IE-2000', '2014'],
      ['FW-01', 'Firewall perimetral OT', 'Firewall', sA2, 'Fortinet 60F', '2021'],
      ['VFD-201', 'Variador de la bomba principal', 'Variador', sA3, 'ABB ACS880', '2012'],
      ['TR-01', 'Transformador de alimentación', 'Otro', sA3, '—', '1998']];
    return [
      { type: 'entrevista', name: L('Entrevista · Jorge Pérez, jefe de mantenimiento', 'Interview · Jorge Pérez, maintenance lead'), who: 'Jorge Pérez (ficticio)', when: d, text: interview, sample: true },
      { type: 'notas', name: L('Notas de visita · recorrido inicial', 'Visit notes · first walkdown'), who: C.uname(C.S.userId), when: d, text: notes, sample: true },
      { type: 'excel', name: L('Listado de equipos.xlsx', 'Equipment list.xlsx'), who: L('Cliente', 'Client'), when: d, rows, text: rows.map(r => r.join(' | ')).join('\n'), sample: true }];
  }

  // ---------- motor de reglas ----------
  const TAG_RE = /\b([A-Z]{2,4})-(\d{2,4}[A-Z]?)\b/g;
  const PREFIX = { PLC: 'PLC', HMI: 'HMI', UPS: 'UPS', SW: 'Switch OT', VFD: 'Variador', VDF: 'Variador', RTU: 'RTU', FW: 'Firewall', SRV: 'Servidor', IED: 'IED', DCS: 'DCS', TR: 'Otro', PC: 'Servidor', SIS: 'PLC de seguridad', AI: 'Analizador' };
  const NAME = { PLC: 'Controlador', HMI: 'Estación de operación', UPS: 'UPS', SW: 'Switch', VFD: 'Variador', FW: 'Firewall', TR: 'Transformador', RTU: 'RTU', SRV: 'Servidor', IED: 'IED' };
  const MODEL_RE = /(Siemens\s+S7-\d{3,4}|S7-\d{3,4}|ControlLogix\s*\d*|CompactLogix|Modicon\s+\w+|PowerFlex\s*\d+|ACS\d{3}|Windows\s+(?:XP|7|2003|2008))/i;
  const RULES = [
    { k: 'backup', neg: /(no tiene|sin|no hay|no existe|no se encontr\w+)[^.;]{0,40}(respaldo|copia|backup)/i, not: /transformador|alimentaci|energ[ií]a/i, pos: /(s[ií] hacemos|hacemos|tenemos|existen?)[^.;]{0,30}(respaldo|copias?|backup)/i, q: [/respaldo[^?]*(programa|configuraci)/i, /copia|backup/i, /respaldo vigente/i], t: x => L(`Sin respaldo vigente${x ? ' de ' + x : ''}`, `No current backup${x ? ' of ' + x : ''}`), opp: 1 },
    { k: 'obsol', neg: /(windows\s+(xp|7|2003|2008)|descontinuad|obsolet|fin de vida|sin soporte)/i, q: [/obsolesc|ciclo de vida/i, /soporte vigente|soporte del fabricante/i, /soporte/i], t: x => L(`${x || 'Equipo'} con tecnología obsoleta o sin soporte`, `${x || 'Equipment'} with obsolete or unsupported technology`) },
    { k: 'spof', neg: /(es el único|es la única|el único|la única|un solo|una sola|sin redundancia|no hay redundancia|no tiene redundancia)/i, not: /proveedor/i, q: [/redundan/i, /punto único|único/i], t: x => L(`Punto único de falla${x ? ': ' + x : ''}`, `Single point of failure${x ? ': ' + x : ''}`) },
    { k: 'supply', neg: /(un solo proveedor|proveedor único|tardan?\s+\d+\s+semanas)/i, q: [/repuesto/i], t: x => L(`Repuestos de ${x || 'equipos críticos'} con un solo proveedor y entrega larga`, `Spares for ${x || 'critical equipment'} from a single supplier with long lead time`) },
    { k: 'phys', neg: /(sin llave|acceso libre|sin control de acceso|abierto)/i, q: [/acceso f[ií]sico/i, /gabinete|llave/i], t: x => L(`Gabinete${x ? ' de ' + x : ''} sin control de acceso físico`, `Cabinet${x ? ' of ' + x : ''} without physical access control`) },
    { k: 'remote', neg: /(teamviewer|anydesk|acceso remoto)[^.]{0,80}(contraseña compartida|sin control|siempre abierto|no cambiamos)/i, q: [/remot/i], t: () => L('Acceso remoto de terceros sin control', 'Uncontrolled third-party remote access') }];

  function segments(src) {
    if (src.rows) return [];
    const out = []; let last = '';
    String(src.text || '').split(/\n+/).forEach(line => {
      let loc = '', body = line.trim(); if (!body) return;
      const m = /^\[(\d{1,2}:\d{2})\]\s*([^:]{1,40}):\s*(.*)$/.exec(body); if (m) { loc = L('min ', 'min ') + m[1]; body = m[3]; if (/consultor|entrevistador/i.test(m[2])) return; }
      body.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿])/).forEach(s => { if (s.trim()) out.push({ s: s.trim(), loc, prev: last }); last = s.trim(); });
    });
    return out;
  }
  function qBest(a, re, proc) {
    const qs = a.questions.filter(q => q.active && (q.ind.includes('*') || q.ind.includes(a.cfg.industry)) && q.mods.includes(a.cfg.modality));
    for (const r of [].concat(re)) { const c = qs.filter(q => r.test(tx(q.text))); const x = c.find(q => q.proc && q.proc === proc) || c.find(q => !q.proc) || c[0]; if (x) return x; }
    return null;
  }

  function rulesEngine(a, src) {
    const out = []; const push = (kind, data, quote, loc, extra) => out.push(Object.assign({ kind, data, src: { sid: src.id, type: src.type, name: src.name, quote, loc }, conf: 'media', engine: 'reglas', impact: 40 }, extra || {}));
    const areas = [...(a.catalog && a.catalog.areas || []), ...a.areas].map(x => ({ name: tx(x.name), key: norm(tx(x.name).split('(')[0]), procs: x.procs || [x.proc] })).filter(x => x.key.length > 3);
    const procs = a.processes.map(p => ({ p, key: norm(tx(p.name).split('(')[0]) }));
    let curProc = null, curArea = null, curTag = null, curLoc = null;
    if (src.rows) {
      const hd = src.rows[0].map(norm); const col = re => hd.findIndex(x => re.test(x));
      const cT = col(/^tag/), cD = col(/descrip|nombre/), cY = col(/^tipo/), cA = col(/^area/), cM = col(/fabric|modelo/), cYr = col(/^ano|^año|year/);
      src.rows.slice(1).forEach((r, i) => { const tag = String(r[cT] || '').trim().toUpperCase(); if (!tag) return;
        const an = norm(r[cA] || ''); const ar = areas.find(x => an && (x.key.includes(an) || an.includes(x.key)));
        push('asset', { tag, name: r[cD] || tag, type: r[cY] || PREFIX[tag.split('-')[0]] || 'Otro', areaRef: ar ? 'n:' + ar.name : r[cA] ? 'n:' + r[cA] : '', proc: ar ? ar.procs[0] : null, mm: r[cM] && r[cM] !== '—' ? r[cM] : '', year: r[cYr] ? +r[cYr] : '' }, r.join(' | '), L('fila ', 'row ') + (i + 2), { conf: 'alta', impact: 45 });
        if (ar && !a.areas.some(x => norm(x.name) === norm(ar.name))) push('area', { name: ar.name, proc: ar.procs[0] }, r.join(' | '), L('fila ', 'row ') + (i + 2), { conf: 'media', impact: 50 });
      });
      return out;
    }
    segments(src).forEach(({ s, loc }) => {
      const n = norm(s);
      const pm = procs.find(x => x.key.length > 5 && n.includes(x.key)); if (pm) curProc = pm.p;
      const am = areas.find(x => n.includes(x.key)); if (am) { curArea = am; if (!a.areas.some(x => norm(x.name) === norm(am.name))) push('area', { name: am.name, proc: (curProc && am.procs.includes(curProc.key)) ? curProc.key : am.procs[0] }, s, loc, { conf: 'alta', impact: 50 }); }
      if (pm && /(cr[ií]tic|m[aá]s importante|si se para|no puede parar)/i.test(s)) push('process', { key: pm.p.key, just: s }, s, loc, { conf: 'alta', impact: 95 });
      if (curProc) {
        const tol = /aguanta\w*\s+(?:m[aá]ximo\s+|hasta\s+)?(\d+(?:[.,]\d+)?)\s*(horas?|h\b|minutos?|min)/i.exec(s);
        if (tol) push('process', { key: curProc.key, tol: { value: /min/i.test(tol[2]) ? +(tol[1].replace(',', '.')) / 60 : +tol[1].replace(',', '.'), unit: 'h' } }, s, loc, { conf: 'alta', impact: 85 });
        const rec = /(?:recuperar|volver a arrancar|reponer|restablecer)[^.]*?(\d+)\s*(?:a\s*(\d+)\s*)?(d[ií]as?|horas?|semanas?)/i.exec(s);
        if (rec) { const f = /d[ií]a/i.test(rec[3]) ? 24 : /semana/i.test(rec[3]) ? 168 : 1; push('process', { key: curProc.key, rec: { min: +rec[1] * f, max: +(rec[2] || rec[1]) * f } }, s, loc, { conf: 'media', impact: 80 }); }
        const cost = /(\d+(?:[.,]\d+)?)\s*millones[^.]*?por hora/i.exec(s);
        if (cost) push('process', { key: curProc.key, cost: { value: +cost[1].replace(',', '.') * 1e6, cur: 'COP' } }, s, loc, { conf: 'media', impact: 85 });
      }
      const tags = [...new Set([...s.matchAll(TAG_RE)].map(m => m[0]))];
      if (loc !== curLoc) { curTag = null; curLoc = loc; }
      const model = (MODEL_RE.exec(s) || [])[1] || ''; const yr = (/(?:de|en|del a[nñ]o|instalad[oa] en)\s+((?:19[89]|20[0-2])\d)\b/i.exec(s) || [])[1];
      tags.forEach((tag, i) => { const pf = tag.split('-')[0]; const mine = i === 0;
        push('asset', { tag, name: NAME[pf] || tag, type: PREFIX[pf] || 'Otro', areaRef: curArea ? 'n:' + curArea.name : '', proc: curProc ? curProc.key : curArea ? curArea.procs[0] : null, mm: mine && model && !/windows/i.test(model) ? model : '', year: mine && yr ? +yr : '', note: mine && /windows/i.test(model) ? model : '' }, s, loc, { conf: tags.length === 1 ? 'alta' : 'media', impact: 55 }); });
      const dm = /\b([A-Z]{2,4}-\d{2,4}[A-Z]?)\b(?:\s+y\s+(?:el\s+|la\s+)?\b([A-Z]{2,4}-\d{2,4}[A-Z]?)\b)?[^.;]*?depende[n]?\s+(?:de\s+la\s+|del\s+|de\s+el\s+|de\s+)?\b([A-Z]{2,4}-\d{2,4}[A-Z]?)\b/.exec(s);
      if (dm) [dm[1], dm[2]].filter(Boolean).forEach(f => push('dep', { fromRef: 't:' + f, toRef: 't:' + dm[3], type: /UPS|TR/.test(dm[3]) ? 'Energía' : /SW|FW/.test(dm[3]) ? 'Comunicación' : 'Control', note: s.length > 120 ? s.slice(0, 117) + '…' : s }, s, loc, { conf: 'alta', impact: 60 }));
      if (!tags.length && curTag && (yr || model)) push('asset', { tag: curTag, year: yr ? +yr : '', mm: model && !/windows/i.test(model) ? model : '', note: /windows/i.test(model) ? model : '' }, s, loc, { conf: 'media', impact: 50 });
      if (tags.length) curTag = tags[0];
      if (yr && +yr <= 2010 && tags[0] && !RULES[1].neg.test(s)) { const q = qBest(a, RULES[1].q, curProc && curProc.key); push('finding', { title: L(`${tags[0]} instalado en ${yr}: revisar soporte y obsolescencia`, `${tags[0]} installed in ${yr}: review support and obsolescence`), desc: s, assetRef: 't:' + tags[0], proc: curProc ? curProc.key : null, qid: q ? q.id : null, rule: 'obsol' }, s, loc, { conf: 'media', impact: 75 }); }
      RULES.forEach(r => {
        const neg = r.neg.test(s) && !(r.not && r.not.test(s)); const pos = r.pos && !neg && r.pos.test(s);
        if (!neg && !pos) return;
        const mi = s.search(r.neg); const before = [...s.matchAll(TAG_RE)].filter(m => mi < 0 || m.index < mi).map(m => m[0]);
        const subjTag = before.length ? before[before.length - 1] : tags[0] || (/scada/i.test(s) ? null : curTag);
        const subj = subjTag || (/scada/i.test(s) ? 'SCADA' : '');
        const q = qBest(a, r.q, curProc && curProc.key);
        if (q) push('answer', { qid: q.id, value: neg ? 'No' : 'Sí', note: s, topic: r.k + ':' + norm(subj) }, s, loc, { conf: 'media', impact: 65 });
        if (neg) push('finding', { title: r.t(subj), desc: s, assetRef: subjTag ? 't:' + subjTag : '', areaRef: !subjTag && curArea ? 'n:' + curArea.name : '', proc: curProc ? curProc.key : null, qid: q ? q.id : null, rule: r.k }, s, loc, { conf: subjTag ? 'alta' : 'media', impact: 90 });
      });
    });
    return out;
  }

  // ---------- motor Claude ----------
  async function claudeEngine(a, src) {
    if (!CAP.sample) throw new Error('sin IA');
    const cat = { processes: a.processes.map(p => ({ key: p.key, name: tx(p.name) })), areas: [...(a.catalog && a.catalog.areas || []), ...a.areas].map(x => tx(x.name)).slice(0, 40), assetTypes: C.assetTypes().slice(0, 30),
      questions: a.questions.filter(q => q.active && (q.ind.includes('*') || q.ind.includes(a.cfg.industry)) && q.mods.includes(a.cfg.modality)).slice(0, 60).map(q => ({ id: q.id, text: tx(q.text), proc: q.proc })) };
    const prompt = `Eres omnIA, asistente de un Operational Risk Assessment (riesgo operacional OT) de Omnicon. Lee la FUENTE y extrae propuestas estructuradas para el assessment. NO inventes: cada propuesta debe citar textualmente una frase de la fuente (campo "quote", copiada exacta) y su ubicación ("loc", p. ej. "min 05:05" si hay marcas de tiempo, o "fila 3").
Devuelve SOLO un arreglo JSON. Cada elemento: {"kind": "process"|"area"|"asset"|"dep"|"answer"|"finding", "data": {...}, "quote": "...", "loc": "...", "conf": "alta"|"media"|"baja"}.
data según kind:
- process: {"key": clave del catálogo, "just": por qué es crítico, "tol": {"value": horas, "unit":"h"}?, "rec": {"min": horas, "max": horas}?, "cost": {"value": número en pesos por hora, "cur":"COP"}?}
- area: {"name": nombre (preferir uno del catálogo), "proc": clave de proceso}
- asset: {"tag": TAG, "name": descripción corta, "type": uno de assetTypes, "areaRef": "n:" + nombre del área, "proc": clave, "mm": fabricante/modelo, "year": año o "", "note": dato relevante}
- dep: {"fromRef": "t:" + TAG que depende, "toRef": "t:" + TAG del que depende, "type": "Control"|"Comunicación"|"Energía"|"Software / datos", "note": ""}
- answer: {"qid": id de una pregunta de la lista, "value": "Sí"|"Parcial"|"No"|"Desconocido", "note": ""}
- finding: {"title": hallazgo breve y concreto, "desc": "", "assetRef": "t:" + TAG o "", "areaRef": "n:" + área o "", "proc": clave o null, "qid": id o null}
Un hallazgo es una debilidad observada (sin respaldo, obsolescencia, punto único de falla, repuestos, acceso físico o remoto). No es riesgo alto por sí solo.
CATÁLOGO: ${JSON.stringify(cat)}
FUENTE (${tName(src.type)} · ${src.name}):
"""
${String(src.text || '').slice(0, 12000)}
"""`;
    const arr = await CAP.sample.json(prompt, { modelTier: 'default' });
    if (!Array.isArray(arr)) throw new Error('formato');
    const ok = ['process', 'area', 'asset', 'dep', 'answer', 'finding'];
    return arr.filter(x => x && ok.includes(x.kind) && x.data).map(x => ({ kind: x.kind, data: x.data, src: { sid: src.id, type: src.type, name: src.name, quote: String(x.quote || '').slice(0, 400), loc: x.loc || '' }, conf: ['alta', 'media', 'baja'].includes(x.conf) ? x.conf : 'media', engine: 'claude', impact: { finding: 90, process: 90, answer: 65, dep: 60, asset: 50, area: 50 }[x.kind] }))
      .filter(x => (x.kind !== 'process' || a.processes.some(p => p.key === x.data.key)) && (x.kind !== 'answer' || a.questions.some(q => q.id === x.data.qid)));
  }

  // ---------- consolidación: deduplicar, fusionar y detectar conflictos ----------
  const keyOf = p => { const d = p.data; switch (p.kind) { case 'process': return 'process:' + d.key + ':' + Object.keys(d).filter(k => ['tol', 'rec', 'cost'].includes(k) && d[k]).join(',') + (d.just && !d.tol && !d.rec && !d.cost ? 'inc' : ''); case 'area': return 'area:' + norm(d.name); case 'system': return 'system:' + norm(d.name); case 'asset': return 'asset:' + norm(d.tag); case 'dep': return 'dep:' + norm(d.fromRef) + '>' + norm(d.toRef); case 'answer': return 'answer:' + d.qid; case 'finding': return 'finding:' + (d.rule || norm(d.title)) + ':' + norm(d.assetRef || d.areaRef || d.title); } return p.kind + Math.random(); };
  function merge(a, list) {
    const props = C.props(a); let seq = props.reduce((n, p) => Math.max(n, +String(p.id).split('-')[1] || 0), 0); const added = [];
    list.forEach(n => {
      const k = keyOf(n);
      const ex = props.find(p => p.key === k && (p.status === 'pend' || (p.status === 'acc' && n.kind !== 'asset')));
      if (ex && ex.status === 'acc') return;
      if (!ex && n.kind === 'asset') { const x = a.assets.find(y => !C.isOut(y) && norm(y.tag) === norm(n.data.tag)); if (x) { const d = { tag: x.tag }; let ch = 0;
        if (n.data.year && +n.data.year !== +x.year) { d.year = +n.data.year; ch++; } if (n.data.mm && norm(n.data.mm) !== norm(x.mm)) { d.mm = n.data.mm; ch++; } if (n.data.note && !norm(x.note).includes(norm(n.data.note))) { d.note = n.data.note; ch++; } if (n.data.type && n.data.type !== 'Otro' && (x.type === 'Otro' || !x.type)) { d.type = n.data.type; ch++; }
        if (!ch) return; n.data = d; } }
      if (ex) {
        if (ex.src.sid === n.src.sid && n.kind === 'answer' && n.data.value !== ex.data.value && ex.status === 'pend') { ex.data.value = 'Parcial'; ex.data.note = (ex.data.note || ex.src.quote) + ' / ' + n.src.quote; ex.src = Object.assign({}, ex.src, { quote: ex.src.quote + ' … ' + n.src.quote, loc: [ex.src.loc, n.src.loc].filter(Boolean).join(', ') }); return; }
        if (ex.src.sid === n.src.sid && n.kind !== 'asset') return;
        if (n.kind === 'asset') { // completar campos vacíos; año distinto → conflicto
          ['name', 'mm', 'note', 'type', 'areaRef', 'proc'].forEach(f => { if (!ex.data[f] && n.data[f]) ex.data[f] = n.data[f]; });
          if (n.data.name && ex.data.name === NAME[(ex.data.tag || '').split('-')[0]] && n.src.type === 'excel') ex.data.name = n.data.name;
          if (n.data.year && ex.data.year && +n.data.year !== +ex.data.year && ex.status === 'pend' && !ex.conflict && ex.src.sid !== n.src.sid) ex.conflict = { field: 'year', valA: ex.data.year, valB: n.data.year, quote: n.src.quote, name: n.src.name, sid: n.src.sid, loc: n.src.loc, why: L('Las fuentes no coinciden en el año de instalación.', 'Sources disagree on the installation year.') };
          else if (n.data.year && !ex.data.year) ex.data.year = n.data.year;
        } else if (n.kind === 'answer' && n.data.value !== ex.data.value && ex.status === 'pend' && !ex.conflict && ex.src.sid !== n.src.sid) {
          ex.conflict = { field: 'value', valA: ex.data.value, valB: n.data.value, quote: n.src.quote, name: n.src.name, sid: n.src.sid, loc: n.src.loc, why: L('Una fuente afirma y otra contradice el mismo punto.', 'One source affirms and another contradicts the same point.') };
        }
        (ex.also = ex.also || []).includes(n.src.sid) || ex.src.sid === n.src.sid || ex.also.push(n.src.sid);
        if (ex.also.length) ex.conf = 'alta';
        return;
      }
      // ya existe en el assessment → no proponer (salvo actualización de activo con datos nuevos)
      if (n.kind === 'area' && a.areas.some(x => !C.isOut(x) && norm(x.name) === norm(n.data.name))) return;
      if (n.kind === 'process') { const pr = a.processes.find(x => x.key === n.data.key); if (pr && pr.status === 'incluido' && !n.data.tol && !n.data.rec && !n.data.cost) return; }
      if (n.kind === 'answer' && C.answerOK(a, { id: n.data.qid })) return;
      const p = Object.assign({ id: 'P-' + (++seq), key: k, status: 'pend', ts: now() }, n); props.push(p); added.push(p);
    });
    return added;
  }

  async function run(a) {
    const srcs = C.sources(a).filter(s => !s.done); ST.running = true; ST.log = []; ST.step = 2; U.renderModal();
    const useAI = ST.engine !== 'rules' && !!CAP.sample; const tot = { n: 0, bySec: {} };
    for (const s of srcs) {
      const line = { name: s.name, type: s.type, st: 'run', msg: L('Leyendo…', 'Reading…') }; ST.log.push(line); U.renderModal();
      let list = []; let eng = 'reglas';
      if (useAI && !s.rows) { try { line.msg = L('Claude está leyendo la fuente…', 'Claude is reading the source…'); U.renderModal(); list = await claudeEngine(a, s); eng = 'claude'; } catch (e) { line.warn = L('IA no disponible (', 'AI unavailable (') + (e.code || e.message || 'error') + L('): se usaron reglas.', '): rules were used.'); } }
      if (eng === 'reglas') { await new Promise(r => setTimeout(r, 450)); list = rulesEngine(a, s); }
      const added = merge(a, list); s.done = true; s.engine = eng; s.found = added.length;
      const c = k => added.filter(p => p.kind === k).length;
      line.st = 'ok'; line.msg = [c('process') && pl(c('process'), L('proceso', 'process'), L('procesos', 'processes')), c('area') && pl(c('area'), L('área', 'area'), L('áreas', 'areas')), c('asset') && pl(c('asset'), L('activo', 'asset'), L('activos', 'assets')), c('dep') && pl(c('dep'), L('dependencia', 'dependency'), L('dependencias', 'dependencies')), c('answer') && pl(c('answer'), L('respuesta', 'answer'), L('respuestas', 'answers')), c('finding') && pl(c('finding'), L('hallazgo', 'finding'), L('hallazgos', 'findings'))].filter(Boolean).join(' · ') || L('Sin datos nuevos (ya estaban propuestos o registrados)', 'No new data (already proposed or recorded)');
      line.engine = eng; tot.n += added.length; U.renderModal();
    }
    C.log(a, `omnIA leyó ${pl(srcs.length, 'fuente', 'fuentes')} y preparó ${pl(tot.n, 'propuesta', 'propuestas')}`, `omnIA read ${pl(srcs.length, 'source', 'sources')} and prepared ${pl(tot.n, 'proposal', 'proposals')}`);
    ST.running = false; ST.step = 3; C.save(); U.renderModal(); R();
  }
  C.ingestRun = run; C.rulesEngine = rulesEngine; C.mergeProps = merge; C.claudeEngine = claudeEngine;

  // ---------- modal ----------
  U.modals.v7ing = function (a) {
    const srcs = C.sources(a); const pending = srcs.filter(s => !s.done);
    const steps = `<ol class="v7-isteps">${[L('Fuentes', 'Sources'), L('Lectura', 'Reading'), L('Resultado', 'Result')].map((l, i) => `<li class="${ST.step === i + 1 ? 'on' : ST.step > i + 1 ? 'done' : ''}"><i>${ST.step > i + 1 ? ic('check', 'sm') : i + 1}</i>${l}</li>`).join('')}</ol>`;
    let body = '', foot = '';
    if (ST.step === 1) {
      const F = ST.form;
      const list = srcs.length ? `<ul class="v7-srcs">${srcs.map(s => `<li class="${s.done ? 'done' : ''}"><span class="v7-sic">${ic((TYPES().find(t => t[0] === s.type) || [])[2] || 'doc', 'sm')}</span><span><b>${h(s.name)}</b><small>${h(tName(s.type))} · ${h(s.who || '—')} · ${h(s.when || '')}${s.done ? ' · ' + L('leída', 'read') + (s.engine === 'claude' ? ' (Claude)' : L(' (reglas)', ' (rules)')) : ''}</small></span>${s.done ? `<span class="pill ok">${L('Leída', 'Read')}</span>` : `<button class="icon-btn" data-act="ing-del" data-id="${s.id}" aria-label="${L('Quitar', 'Remove')}">${ic('x', 'sm')}</button>`}</li>`).join('')}</ul>` : `<div class="v7-empty">${ic('upload')}<span>${L('Aún no hay fuentes. Agregue entrevistas, notas o listados, o use el material de ejemplo.', 'No sources yet. Add interviews, notes or lists, or use the sample material.')}</span></div>`;
      const dictOK = !!(CAP.dict || window.webkitSpeechRecognition || window.SpeechRecognition);
      body = `${steps}
        <div class="v7-ing">
          <div class="v7-ingL">
            <div class="v7-ingT">${TYPES().filter(t => t[0] !== 'dictado').map(t => `<button class="v7-tt" data-act="ing-type" data-t="${t[0]}" aria-pressed="${F.type === t[0]}">${ic(t[2], 'sm')}${t[1]}</button>`).join('')}</div>
            <div class="grid2"><div class="field"><label for="ing-who">${F.type === 'entrevista' ? L('Persona entrevistada y cargo', 'Interviewee and role') : L('Autor', 'Author')}</label><input id="ing-who" value="${h(F.who)}" placeholder="${F.type === 'entrevista' ? L('p. ej. Jefe de mantenimiento', 'e.g. Maintenance lead') : ''}"></div><div class="field"><label for="ing-when">${L('Fecha', 'Date')}</label><input id="ing-when" type="date" value="${h(F.when || new Date().toISOString().slice(0, 10))}"></div></div>
            <div class="field"><label for="ing-text">${F.type === 'entrevista' ? L('Transcripción o notas de la entrevista', 'Interview transcript or notes') : F.type === 'excel' ? L('Archivo de equipos (.xlsx o .csv)', 'Equipment file (.xlsx or .csv)') : L('Texto', 'Text')}</label>
              ${F.type === 'excel' ? '' : `<textarea id="ing-text" rows="7" placeholder="${L('Pegue aquí el texto, o grábelo con el micrófono. Formato opcional por línea: [05:10] Nombre: lo que dijo', 'Paste the text here, or record it with the mic. Optional line format: [05:10] Name: what was said')}">${h(F.text)}</textarea>`}</div>
            <div class="row v7-ingB">
              ${F.type !== 'excel' && dictOK ? `<button class="btn ${U.dictOn ? 'danger' : 'soft'} sm" data-act="ing-mic">${ic(U.dictOn ? 'stop' : 'mic', 'sm')}${U.dictOn ? L('Detener grabación', 'Stop recording') : L('Grabar con micrófono', 'Record with mic')}</button>` : ''}
              <label class="btn ghost sm v7-file">${ic('upload', 'sm')}${L('Subir archivo', 'Upload file')}<input type="file" id="ing-file" accept="${F.type === 'excel' ? '.xlsx,.xls,.csv' : '.txt,.md,.csv,.xlsx'}" hidden></label>
              <button class="btn primary sm" data-act="ing-add">${ic('plus', 'sm')}${L('Agregar fuente', 'Add source')}</button></div>
            <p class="hint">${L('PDF y Word: pegue el texto por ahora. En producción el texto se extrae automáticamente.', 'PDF and Word: paste the text for now. In production text is extracted automatically.')}</p>
          </div>
          <div class="v7-ingR"><div class="row" style="justify-content:space-between"><b>${L('Fuentes de este assessment', 'Sources in this assessment')} <span class="mut">${srcs.length}</span></b>${srcs.some(s => s.sample) ? '' : `<button class="btn ghost sm" data-act="ing-sample">${ic('spark', 'sm')}${L('Usar material de ejemplo', 'Use sample material')}</button>`}</div>${list}
            <div class="v7-eng"><span>${L('Motor de lectura', 'Reading engine')}</span>
              <label><input type="radio" name="ing-eng" value="auto" ${ST.engine !== 'rules' ? 'checked' : ''} ${CAP.sample ? '' : 'disabled'}>${L('IA de Claude', 'Claude AI')} ${CAP.sample ? `<span class="v7-chip ok">${L('disponible', 'available')}</span>` : `<span class="v7-chip">${CAP.ready ? L('no disponible aquí', 'not available here') : L('comprobando…', 'checking…')}</span>`}</label>
              <label><input type="radio" name="ing-eng" value="rules" ${ST.engine === 'rules' || !CAP.sample ? 'checked' : ''}>${L('Reglas de omnIA (sin conexión)', 'omnIA rules (offline)')}</label></div></div>
        </div>`;
      foot = `<button class="btn ghost" data-act="modal-close">${L('Cerrar', 'Close')}</button><button class="btn primary" data-act="ing-run" ${pending.length ? '' : 'disabled'}>${ic('spark', 'sm')}${pending.length ? L(`Analizar ${pl(pending.length, 'fuente', 'fuentes')}`, `Analyze ${pl(pending.length, 'source', 'sources')}`) : L('Agregue una fuente', 'Add a source')}</button>`;
    } else if (ST.step === 2) {
      body = `${steps}<div class="v7-read">${ST.log.map(l => `<div class="v7-rl ${l.st}"><span class="v7-rli">${l.st === 'ok' ? ic('check', 'sm') : '<i class="v7-spin"></i>'}</span><span><b>${h(l.name)}</b><small>${h(l.msg)}${l.engine ? ' · ' + (l.engine === 'claude' ? 'Claude' : L('reglas', 'rules')) : ''}</small>${l.warn ? `<em>${h(l.warn)}</em>` : ''}</span></div>`).join('')}</div>`;
      foot = `<span class="mut small">${L('omnIA solo propone: usted decide qué entra.', 'omnIA only proposes: you decide what goes in.')}</span>`;
    } else {
      const secs = U.SECS().filter(s => U.propCount(a, s.k)); const cf = C.pend(a).filter(p => p.conflict && !p.conflict.resolved).length;
      const top = C.pend(a).slice().sort((x, y) => (y.impact || 0) - (x.impact || 0))[0];
      const topSec = top ? U.SECS().find(s => U.propCount(a, s.k) && C.pend(a, s.k).includes(top)) : null;
      body = `${steps}<div class="v7-read">${ST.log.map(l => `<div class="v7-rl ok"><span class="v7-rli">${ic('check', 'sm')}</span><span><b>${h(l.name)}</b><small>${h(l.msg)} · ${l.engine === 'claude' ? 'Claude' : L('reglas', 'rules')}</small>${l.warn ? `<em>${h(l.warn)}</em>` : ''}</span></div>`).join('')}</div>
        <table class="v7-rt"><thead><tr><th>${L('Etapa', 'Stage')}</th><th class="n">${L('Propuestas', 'Proposals')}</th><th></th></tr></thead><tbody>${secs.map(s => `<tr><td><b>${s.n}. ${s.name}</b></td><td class="n">${U.propCount(a, s.k)}</td><td class="r"><button class="btn ghost sm" data-act="ing-go" data-sec="${s.k}">${L('Revisar en ', 'Review in ')}${s.name}${ic('chev', 'sm')}</button></td></tr>`).join('') || `<tr><td colspan="3" class="mut">${L('No hay propuestas nuevas.', 'No new proposals.')}</td></tr>`}</tbody></table>
        ${cf ? `<p class="v7-cfn">${ic('alert', 'sm')}${L(`${pl(cf, 'propuesta tiene', 'propuestas tienen')} fuentes en conflicto: usted elige cuál vale.`, `${cf} with conflicting sources: you choose which one holds.`)}</p>` : ''}`;
      foot = `<button class="btn ghost" data-act="ing-more">${ic('plus', 'sm')}${L('Agregar más fuentes', 'Add more sources')}</button>${topSec ? `<button class="btn primary" data-act="ing-go" data-sec="${topSec.k}">${L('Empezar por lo más importante', 'Start with what matters most')}${ic('chev', 'sm')}</button>` : `<button class="btn primary" data-act="modal-close">${L('Cerrar', 'Close')}</button>`}`;
    }
    return { title: `${ic('spark')} ${L('Iniciar con omnIA', 'Start with omnIA')}`, wide: true, body, foot };
  };

  // ---------- acciones ----------
  const readForm = () => { const g = id => { const e = document.getElementById(id); return e ? e.value : undefined; }; const F = ST.form; const w = g('ing-who'), d = g('ing-when'), t = g('ing-text'); if (w !== undefined) F.who = w; if (d !== undefined) F.when = d; if (t !== undefined) F.text = t; };
  A['ing-open'] = () => { ST.step = 1; ST.log = []; U.openModal('v7ing', {}); };
  A['ing-type'] = el => { readForm(); ST.form.type = el.dataset.t; U.renderModal(); };
  A['ing-sample'] = () => { const a = C.cur(); readForm(); samplePack(a).forEach(s => C.sources(a).push(Object.assign({ id: C.uid('S'), ts: now(), by: C.S.userId }, s))); C.log(a, 'Cargó el material de ejemplo para omnIA', 'Loaded the sample material for omnIA'); C.save(); U.renderModal(); };
  A['ing-del'] = el => { const a = C.cur(); a.sources = C.sources(a).filter(s => s.id !== el.dataset.id); C.save(); U.renderModal(); };
  A['ing-add'] = () => { readForm(); const a = C.cur(); const F = ST.form;
    if (F.type !== 'excel' && !F.text.trim()) return U.toast(L('Escriba, pegue o grabe el contenido de la fuente', 'Type, paste or record the source content'));
    if (F.type === 'excel' && !F.rows) return U.toast(L('Suba el archivo Excel o CSV', 'Upload the Excel or CSV file'));
    const nm = F.type === 'entrevista' ? L('Entrevista · ', 'Interview · ') + (F.who || L('sin nombre', 'unnamed')) : F.type === 'excel' ? F.file : tName(F.type) + (F.who ? ' · ' + F.who : '');
    C.sources(a).push({ id: C.uid('S'), type: F.type, name: nm, who: F.who, when: F.when, text: F.type === 'excel' ? F.rows.map(r => r.join(' | ')).join('\n') : F.text, rows: F.type === 'excel' ? F.rows : null, ts: now(), by: C.S.userId });
    C.log(a, 'Agregó la fuente ' + nm, 'Added source ' + nm); ST.form = { type: F.type, who: '', text: '' }; C.save(); U.renderModal(); };
  A['ing-run'] = () => { const r = document.querySelector('input[name=ing-eng]:checked'); ST.engine = r ? r.value : 'rules'; run(C.cur()); };
  A['ing-go'] = el => { U.closeModal(); A['v7-sec']({ dataset: { sec: el.dataset.sec } }); };
  A['ing-more'] = () => { ST.step = 1; U.renderModal(); };
  document.addEventListener('change', async e => {
    if (e.target && e.target.id === 'ing-file') { const f = e.target.files[0]; if (!f) return; readForm(); const F = ST.form;
      try {
        if (/\.(xlsx|xls)$/i.test(f.name)) { const X = await U.loadXLSX(); const wb = X.read(await f.arrayBuffer(), { type: 'array' }); const rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }).filter(r => r.some(c => String(c).trim())); F.type = 'excel'; F.rows = rows.map(r => r.map(c => String(c))); F.file = f.name; }
        else if (/\.csv$/i.test(f.name) && F.type === 'excel') { const t = await f.text(); const sep = t.includes(';') ? ';' : ','; F.rows = t.split(/\r?\n/).filter(Boolean).map(l => l.split(sep).map(c => c.replace(/^"|"$/g, '').trim())); F.file = f.name; }
        else { F.text = (F.text ? F.text + '\n' : '') + await f.text(); if (!F.who) F.who = f.name; }
        U.renderModal(); U.toast(L('Archivo cargado: ', 'File loaded: ') + f.name + (F.type === 'excel' ? ' · ' + pl((F.rows || []).length - 1, L('fila', 'row'), L('filas', 'rows')) : ''));
      } catch (er) { U.toast(L('No se pudo leer el archivo: ', 'Could not read the file: ') + er.message); }
    }
  });
  A['ing-mic'] = el => { readForm(); U.dictate(txt => { const t = document.getElementById('ing-text'); ST.form.text = (ST.form.text ? ST.form.text.replace(/\s*$/, ' ') : '') + txt; if (t) t.value = ST.form.text; }, () => { if (U.modal && U.modal.type === 'v7ing') U.renderModal(); }, { keep: true }); if (U.modal && U.modal.type === 'v7ing') U.renderModal(); };

  // tarjeta del Resumen con las fuentes
  U.ingestCTA = function (a) {
    const s = C.sources(a); if (!s.length) return a.areas.length ? '' : `<section class="v7-src cta"><span class="v7-ppi">${ic('spark')}</span><div><b>${L('Ahorre el levantamiento inicial', 'Skip the blank-page start')}</b><small>${L('Suba entrevistas, notas de visita y listados de equipos. omnIA propone procesos, activos, dependencias, respuestas y hallazgos, cada uno con su cita.', 'Upload interviews, visit notes and equipment lists. omnIA proposes processes, assets, dependencies, answers and findings, each with its quote.')}</small></div><span></span><button class="btn primary" data-act="ing-open">${ic('spark', 'sm')}${L('Iniciar con omnIA', 'Start with omnIA')}</button></section>`;
    const np = U.propCount(a), na = C.props(a).filter(p => p.status === 'acc').length;
    return `<section class="v7-src"><span class="v7-ppi">${ic('spark')}</span><div><b>${L('Fuentes leídas por omnIA', 'Sources read by omnIA')}</b><small>${s.map(x => h(x.name)).join(' · ')}</small></div><div class="v7-srcn"><span><b>${np}</b>${L('por revisar', 'to review')}</span><span><b>${na}</b>${L('aceptadas', 'accepted')}</span></div><button class="btn ghost sm" data-act="ing-open">${ic('plus', 'sm')}${L('Agregar fuentes', 'Add sources')}</button></section>`;
  };
})();
