/* ORA v7 — Propuestas dentro del método (human in the loop).
   Una propuesta vive en a.props hasta que una persona la acepta (crea/actualiza el registro real en estado «Aceptado»),
   la edita (se acepta con los cambios) o la rechaza (queda en «Rechazadas», recuperable). Cada una conserva la cita de su fuente. */
(function () {
  const C = window.ORA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, L = I.L, tx = I.tx, ic = U.ic, A = U.act;
  const R = () => U.render();
  const now = () => new Date().toISOString();
  const norm = s => String(tx(s) || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const pl = (n, s, p) => n + ' ' + (n === 1 ? s : p);
  const SEC_OF = { process: 'scope', area: 'plant', system: 'plant', asset: 'plant', dep: 'plant', answer: 'quest', finding: 'risk' };
  const KIND_LBL = () => ({ process: L('Procesos críticos', 'Critical processes'), area: L('Áreas', 'Areas'), system: L('Sistemas OT', 'OT systems'), asset: L('Activos', 'Assets'), dep: L('Dependencias', 'Dependencies'), answer: L('Respuestas del cuestionario', 'Questionnaire answers'), finding: L('Hallazgos', 'Findings') });
  const KIND_IC = { process: 'steps', area: 'map', system: 'branch', asset: 'list', dep: 'link', answer: 'check', finding: 'flag' };
  const CONF = () => ({ alta: L('Confianza alta', 'High confidence'), media: L('Confianza media', 'Medium confidence'), baja: L('Confianza baja', 'Low confidence') });
  const UI = { open: {}, rej: {} };

  C.props = a => (a.props = a.props || []);
  C.pend = (a, sec) => C.props(a).filter(p => p.status === 'pend' && (!sec || SEC_OF[p.kind] === sec));
  U.propCount = (a, sec) => a ? C.pend(a, sec).length : 0;
  C.srcName = (a, sid) => { const s = (a.sources || []).find(x => x.id === sid); return s ? s.name : ''; };

  // ---------- resolución de referencias ----------
  // ref: 'id:X' registro existente · 'p:P-1' otra propuesta · 'n:Nombre' / 't:TAG' por nombre o TAG
  function resolve(a, ref, kind, chain) {
    if (!ref) return null; const [t, ...rest] = String(ref).split(':'); const v = rest.join(':');
    const list = kind === 'area' ? a.areas : kind === 'system' ? a.systems : a.assets;
    if (t === 'id') return list.find(x => x.id === v) ? v : null;
    if (t === 'p') { const p = C.props(a).find(x => x.id === v); if (!p) return null; if (p.status === 'acc' && p.refId) return p.refId; if (p.status === 'pend' && chain) { apply(a, p, null, chain); return p.refId || null; } return null; }
    if (t === 't') { const x = a.assets.find(y => !C.isOut(y) && norm(y.tag) === norm(v)); if (x) return x.id; const p = C.props(a).find(y => y.kind === 'asset' && y.status !== 'rej' && norm(y.data.tag) === norm(v)); return p ? resolve(a, 'p:' + p.id, kind, chain) : null; }
    if (t === 'n') { const nv = norm(v); const like = nm => { const z = norm(nm); return z === nv || (nv.length > 3 && (z.startsWith(nv) || nv.startsWith(z.split(' ').slice(0, 3).join(' ')))); }; const x = list.find(y => !C.isOut(y) && like(y.name)); if (x) return x.id; const p = C.props(a).find(y => y.kind === kind && y.status !== 'rej' && like(y.data.name)); return p ? resolve(a, 'p:' + p.id, kind, chain) : null; }
    return null;
  }
  const refLbl = (a, ref, kind) => { if (!ref) return ''; const [t, ...r] = String(ref).split(':'); const v = r.join(':'); if (t === 'id') { const x = (kind === 'area' ? a.areas : kind === 'system' ? a.systems : a.assets).find(y => y.id === v); return x ? (x.tag || tx(x.name)) : v; } if (t === 'p') { const p = C.props(a).find(x => x.id === v); return p ? (p.data.tag || p.data.name || v) : v; } return v; };
  U.propRefLbl = refLbl;
  // ¿la propuesta actualiza un registro existente?
  const existingAsset = (a, d) => d.tag && a.assets.find(y => !C.isOut(y) && norm(y.tag) === norm(d.tag));

  // ---------- texto de una propuesta ----------
  function title(a, p) {
    const d = p.data;
    switch (p.kind) {
      case 'process': { const pr = a.processes.find(x => x.key === d.key); const nm = pr ? tx(pr.name) : d.key; const sh = nm.split('(')[0].trim();
        if (d.tol) return L('Tolerancia de ', 'Tolerance of ') + sh + ': ' + d.tol.value + ' h';
        if (d.rec) return L('Recuperación declarada de ', 'Stated recovery of ') + sh + ': ' + d.rec.min + (d.rec.max && d.rec.max !== d.rec.min ? '–' + d.rec.max : '') + ' h';
        if (d.cost) return L('Costo de parada de ', 'Downtime cost of ') + sh + ': ' + U.money(d.cost.value) + L('/hora', '/hour');
        return pr && pr.status === 'incluido' ? L('Completar datos de ', 'Complete data for ') + nm : L('Incluir ', 'Include ') + nm; }
      case 'area': return d.name;
      case 'system': return d.name;
      case 'asset': return (existingAsset(a, d) ? L('Actualizar ', 'Update ') : '') + d.tag + (d.name && d.name !== d.tag ? ' · ' + d.name : '');
      case 'dep': return refLbl(a, d.fromRef, 'asset') + ' → ' + refLbl(a, d.toRef, 'asset');
      case 'answer': { const q = a.questions.find(x => x.id === d.qid); return q ? tx(q.text) : d.qid; }
      case 'finding': return d.title;
    }
    return p.id;
  }
  function detail(a, p) {
    const d = p.data; const out = [];
    if (p.kind === 'process') { if (d.just && !d.tol && !d.rec && !d.cost) out.push(L('Proceso crítico según la fuente', 'Critical process according to the source')); if (false && d.tol) out.push(L('Tolerancia: ', 'Tolerance: ') + d.tol.value + ' ' + d.tol.unit); if (d.rec) out.push(L('Recuperación declarada: ', 'Stated recovery: ') + d.rec.min + (d.rec.max && d.rec.max !== d.rec.min ? '–' + d.rec.max : '') + ' h'); if (d.cost) out.push(L('Costo de parada: ', 'Downtime cost: ') + U.money(d.cost.value) + L('/hora', '/hour')); }
    if (p.kind === 'area') out.push(L('Proceso: ', 'Process: ') + C.procName(a, d.proc));
    if (p.kind === 'system') out.push(C.S.lib.otCats.some(c => c.key === d.cat) ? tx(C.S.lib.otCats.find(c => c.key === d.cat).name) : d.cat || '');
    if (p.kind === 'asset') { const ex = existingAsset(a, d); if (d.type) out.push(tx(d.type)); if (d.areaRef && !ex) out.push(L('Área: ', 'Area: ') + refLbl(a, d.areaRef, 'area')); if (d.mm) out.push(d.mm); if (d.year) out.push(L('año ', 'year ') + d.year); if (d.note) out.push(d.note); }
    if (p.kind === 'dep') out.push(C.depName ? C.depName(d.type || 'Control') : d.type, d.note || '');
    if (p.kind === 'answer') { out.push(`<b class="v7-pa v-${norm(d.value)}">${h(tx(d.value))}</b>`); if (d.note) out.push(h(d.note)); return out.join(' · '); }
    if (p.kind === 'finding') { if (d.desc) out.push(d.desc); const tags = [d.assetRef && refLbl(a, d.assetRef, 'asset'), d.areaRef && refLbl(a, d.areaRef, 'area')].filter(Boolean); if (tags.length) out.push(tags.join(', ')); }
    return out.filter(Boolean).map(x => h(x)).join(' · ');
  }
  U.propTitle = title;

  // ---------- aplicar (aceptar) ----------
  function srcInfo(a, p) { const s = (a.sources || []).find(x => x.id === p.src.sid) || {}; return { type: s.type || p.src.type || 'omnia', name: s.name || p.src.name || 'omnIA', quote: p.src.quote || '', loc: p.src.loc || '' }; }
  const valAcc = si => ({ status: 'aceptado', by: C.S.userId, ts: now(), src: si.type, reason: L('Propuesta de omnIA aceptada', 'omnIA proposal accepted') });
  function apply(a, p, edited, chain) {
    if (p.status !== 'pend') return p.refId;
    chain = chain || new Set(); if (chain.has(p.id)) return null; chain.add(p.id);
    const d = Object.assign({}, p.data, edited || {}); const si = srcInfo(a, p); const prov = ['entrevista', 'notas', 'documento', 'dictado', 'excel', 'campo'].includes(si.type) ? si.type : 'omnia';
    const srcRec = { file: si.name, quote: si.quote, loc: si.loc, prop: p.id };
    const stamp = x => { x.prov = x.prov || prov; x.val = valAcc(si); x.src = srcRec; x.log = x.log || []; C.recLog(x, `Aceptó la propuesta ${p.id} de omnIA (fuente: ${si.name}${si.loc ? ', ' + si.loc : ''})`, `Accepted omnIA proposal ${p.id} (source: ${si.name}${si.loc ? ', ' + si.loc : ''})`); return x; };
    let id = null;
    if (p.kind === 'process') {
      const pr = a.processes.find(x => x.key === d.key); if (!pr) return null;
      if (pr.status !== 'incluido' && !d.tol && !d.rec && !d.cost) { pr.status = 'incluido'; pr.just = d.just || pr.just || ''; pr.by = C.uname(C.S.userId); pr.ts = now(); }
      if (d.tol) pr.tolerance = { value: +d.tol.value, unit: d.tol.unit || 'h', source: si.name + (si.loc ? ' · ' + si.loc : ''), conf: 'Declarado' };
      if (d.rec) pr.recHint = { min: +d.rec.min, max: +(d.rec.max || d.rec.min), source: si.name, conf: 'Declarado' };
      if (d.cost) pr.costH = { value: +d.cost.value, cur: d.cost.cur || 'COP', source: si.name + (si.loc ? ' · ' + si.loc : ''), conf: 'Declarado' };
      pr.src = srcRec; id = pr.key;
      if (!(a.areas || []).length && C.applyCatalog && a.catalog) { /* el catálogo se aplica desde Planta, no se fuerza aquí */ }
    } else if (p.kind === 'area') {
      const ex = a.areas.find(y => !C.isOut(y) && norm(y.name) === norm(d.name));
      if (ex) { if (!C.okd(ex)) stamp(ex); id = ex.id; }
      else { const x = stamp({ id: C.uid('A'), name: d.name, proc: d.proc, procs: [d.proc].filter(Boolean) }); a.areas.push(x); id = x.id; }
    } else if (p.kind === 'system') {
      const ex = a.systems.find(y => !C.isOut(y) && norm(y.name) === norm(d.name));
      if (ex) { if (!C.okd(ex)) stamp(ex); id = ex.id; }
      else { const x = stamp({ id: C.uid('SY'), name: d.name, cat: d.cat || 'control', procs: [d.proc].filter(Boolean), types: [] }); a.systems.push(x); id = x.id; }
    } else if (p.kind === 'asset') {
      const ex = existingAsset(a, d);
      if (ex) { ['name', 'type', 'mm', 'note'].forEach(f => { if (d[f]) ex[f] = d[f]; }); if (d.year) { ex.year = +d.year; } if (d.redundancy) ex.redundancy = d.redundancy; if (d.lifecycle) ex.lifecycle = Object.assign({}, ex.lifecycle || {}, d.lifecycle); C.recLog(ex, `Actualizó con la propuesta ${p.id} (fuente: ${si.name})`, `Updated with proposal ${p.id} (source: ${si.name})`); ex.src = srcRec; if (!C.okd(ex)) ex.val = valAcc(si); id = ex.id; }
      else {
        const area = resolve(a, d.areaRef, 'area', chain) || (a.areas.find(x => !C.isOut(x) && (x.procs || [x.proc]).includes(d.proc)) || a.areas.find(x => !C.isOut(x)) || {}).id;
        if (!area) { chain.delete(p.id); U.toast(L('Primero acepte un área para este activo', 'First accept an area for this asset')); return null; }
        const ar = C.area(a, area); const procs = d.proc ? [d.proc] : (ar.procs || [ar.proc]).filter(Boolean);
        const x = stamp({ id: C.uid('AS'), tag: d.tag, name: d.name || d.tag, type: d.type || 'Otro', area, sys: resolve(a, d.sysRef, 'system', chain), procs, proc: procs[0], mm: d.mm || '', year: d.year ? +d.year : undefined, redundancy: d.redundancy || '', lifecycle: d.lifecycle || { status: 'unknown' }, srcs: [] });
        a.assets.push(x); id = x.id;
      }
    } else if (p.kind === 'dep') {
      const from = resolve(a, d.fromRef, 'asset', chain), to = resolve(a, d.toRef, 'asset', chain);
      if (!from || !to || from === to) { chain.delete(p.id); U.toast(L('La dependencia necesita sus dos activos aceptados', 'The dependency needs both assets accepted')); return null; }
      const ex = a.deps.find(y => !C.isOut(y) && y.from === from && y.to === to);
      if (ex) id = ex.id; else { const x = stamp({ id: C.uid('D'), from, to, type: d.type || 'Control', dir: 'uni', note: d.note || '', crit: d.crit || '' }); a.deps.push(x); id = x.id; }
    } else if (p.kind === 'answer') {
      a.answers[d.qid] = { value: d.value, note: d.note || si.quote, conf: 'Declarado', source: C.provName(si.type), by: C.uname(C.S.userId), ts: now(), prop: p.id, quote: si.quote, srcName: si.name };
      id = d.qid;
    } else if (p.kind === 'finding') {
      const asset = resolve(a, d.assetRef, 'asset', chain); const area = resolve(a, d.areaRef, 'area', chain) || (asset ? C.asset(a, asset).area : null);
      let n = a.findings.length + 1, fid; do { fid = 'F-' + String(n++).padStart(2, '0'); } while (a.findings.some(f => f.id === fid));
      a.findings.push({ id: fid, title: d.title, desc: d.desc || '', status: 'pendiente de verificación', level: asset ? 'activo' : d.qid ? 'pregunta' : 'area', assets: asset ? [asset] : [], systems: [], deps: [], evidence: [], area, proc: d.proc || (asset ? C.assetProcs(C.asset(a, asset))[0] : null) || null, q: d.qid || null, source: C.provName(si.type), origin: 'omnIA · ' + si.name, quote: si.quote, srcLoc: si.loc, prop: p.id, ts: now(), by: C.uname(C.S.userId) });
      id = fid;
    }
    p.status = 'acc'; p.refId = id; p.decidedBy = C.S.userId; p.decidedAt = now(); if (edited) p.edited = true;
    C.log(a, `Aceptó propuesta de omnIA: ${tx(title(a, p))} (fuente: ${si.name}${si.loc ? ', ' + si.loc : ''})`, `Accepted omnIA proposal: ${tx(title(a, p))} (source: ${si.name}${si.loc ? ', ' + si.loc : ''})`);
    return id;
  }
  C.applyProp = apply;

  // ---------- render de una propuesta ----------
  function card(a, p) {
    const si = srcInfo(a, p); const cf = p.conflict;
    const sug = p.kind === 'finding' && C.oppSuggest ? C.oppSuggest(a, { title: p.data.title, desc: p.data.desc || '', assets: [], q: null }).slice(0, 1) : [];
    const rej = p.status === 'rej';
    return `<article class="v7-prop k-${p.kind} ${rej ? 'rej' : ''} ${cf && !cf.resolved ? 'conf' : ''}" id="prop-${p.id}">
      <span class="v7-pi">${ic(KIND_IC[p.kind] || 'spark', 'sm')}</span>
      <div class="v7-pb">
        <div class="v7-pt"><b>${h(title(a, p))}</b><span class="v7-chip ai">${ic('spark', 'sm')}${L('Propuesto por omnIA', 'Proposed by omnIA')}</span>${p.conf ? `<span class="v7-cf c-${p.conf}" title="${CONF()[p.conf]}"><i></i><i></i><i></i></span>` : ''}</div>
        ${detail(a, p) ? `<p class="v7-pd">${detail(a, p)}</p>` : ''}
        ${si.quote ? `<blockquote class="v7-q">${ic('quote', 'sm')}<span>«${h(si.quote)}»<cite>${h(si.name)}${si.loc ? ' · ' + h(si.loc) : ''}</cite></span></blockquote>` : ''}
        ${cf && !cf.resolved ? `<div class="v7-cfl"><b>${ic('alert', 'sm')}${L('Fuentes en conflicto', 'Conflicting sources')}</b><p>${h(cf.why || '')}</p>
          <div class="v7-cfo"><button class="v7-cfb" data-act="pr-cf" data-id="${p.id}" data-o="a"><small>${L('Opción A', 'Option A')} · ${h(si.name)}</small><b>${h(String(cf.valA))}</b><span>«${h(si.quote)}»</span></button>
          <button class="v7-cfb" data-act="pr-cf" data-id="${p.id}" data-o="b"><small>${L('Opción B', 'Option B')} · ${h(cf.name)}</small><b>${h(String(cf.valB))}</b><span>«${h(cf.quote)}»</span></button></div></div>` : ''}
        ${sug.length ? `<p class="v7-ps">${ic('spark', 'sm')}${L('Oportunidad sugerida al aceptar: ', 'Suggested opportunity once accepted: ')}<b>${h(sug[0].t)}</b></p>` : ''}
      </div>
      <div class="v7-pact">${rej ? `<button class="btn ghost sm" data-act="pr-restore" data-id="${p.id}">${ic('reset', 'sm')}${L('Restaurar', 'Restore')}</button>` : `
        <button class="btn primary sm" data-act="pr-acc" data-id="${p.id}" ${cf && !cf.resolved ? 'disabled title="' + L('Elija primero una de las dos fuentes', 'First choose one of the two sources') + '"' : ''}>${ic('check', 'sm')}<span>${L('Aceptar', 'Accept')}</span></button>
        <button class="btn ghost sm" data-act="pr-edit" data-id="${p.id}" aria-label="${L('Editar', 'Edit')}">${ic('edit', 'sm')}<span>${L('Editar', 'Edit')}</span></button>
        <button class="btn ghost sm v7-prx" data-act="pr-rej" data-id="${p.id}" aria-label="${L('Rechazar', 'Reject')}">${ic('x', 'sm')}<span>${L('Rechazar', 'Reject')}</span></button>`}</div>
    </article>`;
  }

  U.propCard = card;
  // ---------- panel de propuestas de una sección ----------
  U.propPanel = function (a, sec, opt) {
    opt = opt || {};
    const all = C.props(a).filter(p => SEC_OF[p.kind] === sec && (!opt.kinds || opt.kinds.includes(p.kind)));
    const pend = all.filter(p => p.status === 'pend'), rej = all.filter(p => p.status === 'rej'), acc = all.filter(p => p.status === 'acc');
    if (!pend.length && !rej.length) return acc.length ? `<div class="v7-pdone">${ic('check', 'sm')}${L(`${pl(acc.length, 'propuesta de omnIA aceptada', 'propuestas de omnIA aceptadas')} en esta etapa. Quedan marcadas con su fuente.`, `${pl(acc.length, 'omnIA proposal accepted', 'omnIA proposals accepted')} in this stage. They keep their source.`)}</div>` : '';
    const key = sec + (opt.kinds ? opt.kinds.join('') : ''); const open = UI.open[key] !== false;
    const okN = pend.filter(p => !(p.conflict && !p.conflict.resolved)).length; const cfN = pend.length - okN;
    const groups = Object.keys(KIND_LBL()).map(k => [k, pend.filter(p => p.kind === k)]).filter(g => g[1].length);
    return `<section class="v7-pp ${open ? 'open' : ''}" id="pp-${sec}">
      <header class="v7-pph"><span class="v7-ppi">${ic('spark')}</span><div><b>${pend.length ? L(`omnIA propone ${pl(pend.length, 'elemento', 'elementos')} en esta etapa`, `omnIA proposes ${pl(pend.length, 'item', 'items')} in this stage`) : L('Sin propuestas pendientes', 'No pending proposals')}</b>
        <small>${pend.length ? L('Cada propuesta muestra la cita de su fuente. Nada entra al análisis sin tu decisión.', 'Each proposal shows the quote from its source. Nothing enters the analysis without your decision.') + (cfN ? ' ' + L(`${pl(cfN, 'tiene', 'tienen')} fuentes en conflicto.`, `${cfN} with conflicting sources.`) : '') : ''}</small></div>
        <div class="v7-ppa">${okN ? `<button class="btn primary sm" data-act="pr-all" data-sec="${sec}" data-kinds="${(opt.kinds || []).join(',')}">${ic('check', 'sm')}${L('Aceptar todos', 'Accept all')}${cfN ? ` (${okN})` : ''}</button>` : ''}${pend.length ? `<button class="btn ghost sm" data-act="pr-tg" data-k="${key}" aria-expanded="${open}">${open ? L('Ocultar', 'Hide') : L('Revisar uno por uno', 'Review one by one')}</button>` : ''}</div></header>
      ${open && pend.length ? `<div class="v7-ppb">${groups.map(([k, l]) => `<div class="v7-ppg"><h4>${KIND_LBL()[k]} <span>${l.length}</span></h4>${l.sort((x, y) => (y.impact || 0) - (x.impact || 0)).map(p => card(a, p)).join('')}</div>`).join('')}</div>` : ''}
      ${rej.length ? `<footer class="v7-ppf"><button class="plink" data-act="pr-rejtg" data-k="${key}">${UI.rej[key] ? L('Ocultar rechazadas', 'Hide rejected') : L(`Rechazadas (${rej.length})`, `Rejected (${rej.length})`)}</button>${UI.rej[key] ? `<div class="v7-ppb">${rej.map(p => card(a, p)).join('')}</div>` : ''}</footer>` : ''}
    </section>`;
  };

  // ---------- inserción en las etapas ----------
  const STAGE_SEC = { 2: 'scope', 3: 'plant', 4: 'quest', 6: 'risk' };
  const wz0 = U.views.wizard;
  U.views.wizard = function (a, ev) {
    const html = wz0.apply(this, arguments); const sec = STAGE_SEC[C.S.ui.stage]; if (!sec) return html;
    const pp = U.propPanel(a, sec); if (!pp) return html;
    return html.replace('<div class="wz-body">', '<div class="wz-body">' + pp);
  };
  const inv0 = U.views.inventory;
  U.views.inventory = function (a) {
    const html = inv0.apply(this, arguments); const pp = U.propPanel(a, 'plant'); if (!pp) return html;
    const i = html.indexOf('<div class="hello">'); return i < 0 ? pp + html : html.slice(0, i) + pp + html.slice(i);
  };
  // pregunta con respuesta propuesta: aviso dentro de la tarjeta
  if (U.qCard) { const q0 = U.qCard; U.qCard = function (a, x) { const html = q0.apply(this, arguments); const p = C.props(a).find(y => y.kind === 'answer' && y.status === 'pend' && y.data.qid === x.q.id); if (!p) return html;
    const si = srcInfo(a, p); const strip = `<div class="v7-qp"><span class="v7-chip ai">${ic('spark', 'sm')}omnIA</span><span>${L('Respuesta propuesta', 'Proposed answer')}: <b class="v7-pa v-${norm(p.data.value)}">${h(tx(p.data.value))}</b> <small>«${h(si.quote)}» — ${h(si.name)}</small></span>${p.conflict && !p.conflict.resolved ? `<a class="plink" href="#prop-${p.id}" data-act="pr-goto" data-id="${p.id}">${L('Resolver conflicto', 'Resolve conflict')}</a>` : `<button class="btn primary sm" data-act="pr-acc" data-id="${p.id}">${ic('check', 'sm')}${L('Confirmar', 'Confirm')}</button>`}<button class="btn ghost sm" data-act="pr-rej" data-id="${p.id}" aria-label="${L('Rechazar', 'Reject')}">${ic('x', 'sm')}</button></div>`;
    return html.replace(/(<div class="v6qa-h">[\s\S]*?<\/button>)/, '$1' + strip); }; }

  // ---------- acciones ----------
  const find = id => C.props(C.cur()).find(p => p.id === id);
  A['pr-acc'] = el => { const a = C.cur(); const p = find(el.dataset.id); if (!p) return; const id = apply(a, p); if (id) { C.save(); R(); U.toast(L('Aceptado: ya cuenta para el análisis', 'Accepted: it now counts for the analysis')); } else R(); };
  A['pr-rej'] = el => { const a = C.cur(); const p = find(el.dataset.id); if (!p) return; p.status = 'rej'; p.decidedBy = C.S.userId; p.decidedAt = now(); C.log(a, `Rechazó propuesta de omnIA: ${tx(title(a, p))}`, `Rejected omnIA proposal: ${tx(title(a, p))}`); C.save(); R(); U.toast(L('Rechazada. Puede restaurarla desde «Rechazadas».', 'Rejected. You can restore it from “Rejected”.')); };
  A['pr-restore'] = el => { const a = C.cur(); const p = find(el.dataset.id); if (!p) return; p.status = 'pend'; C.log(a, `Restauró propuesta de omnIA: ${tx(title(a, p))}`, `Restored omnIA proposal: ${tx(title(a, p))}`); C.save(); R(); };
  A['pr-tg'] = el => { UI.open[el.dataset.k] = UI.open[el.dataset.k] === false; R(); };
  A['pr-rejtg'] = el => { UI.rej[el.dataset.k] = !UI.rej[el.dataset.k]; R(); };
  A['pr-goto'] = el => { const p = find(el.dataset.id); if (!p) return; const t = document.getElementById('prop-' + p.id); if (t) { t.scrollIntoView({ block: 'center', behavior: 'smooth' }); t.classList.add('flash'); setTimeout(() => t.classList.remove('flash'), 1600); } };
  A['pr-all'] = el => { const a = C.cur(); const ks = el.dataset.kinds ? el.dataset.kinds.split(',') : null; let n = 0;
    const order = ['process', 'area', 'system', 'asset', 'dep', 'answer', 'finding'];
    C.pend(a, el.dataset.sec).filter(p => !(p.conflict && !p.conflict.resolved) && (!ks || ks.includes(p.kind))).sort((x, y) => order.indexOf(x.kind) - order.indexOf(y.kind)).forEach(p => { if (p.status === 'pend' && apply(a, p)) n++; });
    C.save(); R(); U.toast(L(`${pl(n, 'propuesta aceptada', 'propuestas aceptadas')}. Quedan como «Aceptado» con su fuente.`, `${pl(n, 'proposal accepted', 'proposals accepted')}. They stay “Accepted” with their source.`)); };
  A['pr-cf'] = el => { const a = C.cur(); const p = find(el.dataset.id); if (!p || !p.conflict) return; const cf = p.conflict;
    if (el.dataset.o === 'b') { p.data[cf.field] = cf.valB; p.src = Object.assign({}, p.src, { quote: cf.quote, sid: cf.sid, name: cf.name, loc: cf.loc }); }
    else p.data[cf.field] = cf.valA;
    cf.resolved = el.dataset.o; C.log(a, `Resolvió conflicto de fuentes en ${tx(title(a, p))}: eligió ${el.dataset.o === 'b' ? cf.name : C.srcName(a, cf.sidA) || 'opción A'}`, `Resolved a source conflict in ${tx(title(a, p))}`); C.save(); R(); };

  // editar: formulario según el tipo; al guardar se acepta con los cambios
  A['pr-edit'] = el => U.openModal('v7prop', { id: el.dataset.id });
  U.modals.v7prop = function (a, d) {
    const p = find(d.id); const x = p.data; const si = srcInfo(a, p);
    const f = (k, l, v, t) => `<div class="field"><label for="pe-${k}">${l}</label>${t === 'ta' ? `<textarea id="pe-${k}">${h(v || '')}</textarea>` : `<input id="pe-${k}" value="${h(v == null ? '' : v)}" ${t === 'n' ? 'type="number" step="any"' : ''}>`}</div>`;
    const sel = (k, l, opts, v) => `<div class="field"><label for="pe-${k}">${l}</label><select id="pe-${k}">${opts.map(([ov, ol]) => U.opt(ov, ol, v)).join('')}</select></div>`;
    const areas = [...a.areas.filter(z => !C.isOut(z)).map(z => ['id:' + z.id, tx(z.name)]), ...C.pend(a).filter(z => z.kind === 'area').map(z => ['p:' + z.id, z.data.name + ' · ' + L('propuesta', 'proposal')])];
    const assets = [...a.assets.filter(z => !C.isOut(z)).map(z => ['id:' + z.id, z.tag]), ...C.pend(a).filter(z => z.kind === 'asset' && !existingAsset(a, z.data)).map(z => ['p:' + z.id, z.data.tag + ' · ' + L('propuesta', 'proposal')])];
    const procs = a.processes.map(z => [z.key, tx(z.name)]);
    let body = '';
    if (p.kind === 'process') body = sel('key', L('Proceso', 'Process'), procs, x.key) + f('just', L('Justificación', 'Justification'), x.just, 'ta') + `<div class="grid3">${f('tol', L('Tolerancia (h)', 'Tolerance (h)'), x.tol ? x.tol.value : '', 'n')}${f('rec', L('Recuperación declarada (h)', 'Stated recovery (h)'), x.rec ? x.rec.min : '', 'n')}${f('cost', L('Costo de parada por hora', 'Downtime cost per hour'), x.cost ? x.cost.value : '', 'n')}</div>`;
    if (p.kind === 'area') body = f('name', L('Nombre', 'Name'), x.name) + sel('proc', L('Proceso', 'Process'), procs, x.proc);
    if (p.kind === 'system') body = f('name', L('Nombre', 'Name'), x.name) + sel('cat', L('Categoría OT', 'OT category'), C.S.lib.otCats.map(c => [c.key, tx(c.name)]), x.cat) + sel('proc', L('Proceso', 'Process'), procs, x.proc);
    if (p.kind === 'asset') body = `<div class="grid2">${f('tag', 'TAG', x.tag)}${f('name', L('Descripción', 'Description'), x.name)}</div><div class="grid3">${sel('type', L('Tipo de activo', 'Asset type'), [...new Set([...C.assetTypes(), x.type || 'Otro'])].map(t => [t, tx(t)]), x.type)}${existingAsset(a, x) ? '' : sel('areaRef', L('Área', 'Area'), areas, x.areaRef && x.areaRef.startsWith('n:') ? (areas.find(z => norm(z[1]) === norm(x.areaRef.slice(2))) || [x.areaRef])[0] : x.areaRef)}${f('year', L('Año de instalación', 'Installation year'), x.year, 'n')}</div>${f('mm', L('Fabricante / modelo', 'Manufacturer / model'), x.mm)}${f('note', L('Nota', 'Note'), x.note)}`;
    if (p.kind === 'dep') body = `<div class="grid2">${sel('fromRef', L('Elemento que depende', 'Dependent element'), assets, x.fromRef)}${sel('toRef', L('Depende de', 'Depends on'), assets, x.toRef)}</div>${f('note', L('Descripción', 'Description'), x.note)}`;
    if (p.kind === 'answer') body = `<p class="small">${h(title(a, p))}</p>` + sel('value', L('Respuesta', 'Answer'), ['Sí', 'Parcial', 'No', 'Desconocido', 'No aplica'].map(v => [v, tx(v)]), x.value) + f('note', L('Nota', 'Note'), x.note, 'ta');
    if (p.kind === 'finding') body = f('title', L('Hallazgo', 'Finding'), x.title) + f('desc', L('Descripción', 'Description'), x.desc, 'ta');
    return { title: L('Editar propuesta · ', 'Edit proposal · ') + h(KIND_LBL()[p.kind]), wide: true, body: `${si.quote ? `<blockquote class="v7-q">${ic('quote', 'sm')}<span>«${h(si.quote)}»<cite>${h(si.name)}${si.loc ? ' · ' + h(si.loc) : ''}</cite></span></blockquote>` : ''}${body}<p class="hint">${L('Al guardar, la propuesta queda Aceptada con sus cambios y conserva la fuente.', 'On save, the proposal is Accepted with your changes and keeps its source.')}</p>`,
      foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button><button class="btn primary" data-act="pr-edit-save" data-id="${p.id}">${ic('check', 'sm')}${L('Guardar y aceptar', 'Save and accept')}</button>` };
  };
  A['pr-edit-save'] = el => {
    const a = C.cur(); const p = find(el.dataset.id); const g = k => { const e = document.getElementById('pe-' + k); return e ? e.value.trim() : undefined; };
    const e = {};
    if (p.kind === 'process') { e.key = g('key'); e.just = g('just'); const t = g('tol'), r = g('rec'), c = g('cost'); e.tol = t ? { value: +t, unit: 'h' } : null; e.rec = r ? { min: +r, max: +r } : null; e.cost = c ? { value: +c, cur: 'COP' } : null; }
    else ['name', 'proc', 'cat', 'tag', 'type', 'areaRef', 'year', 'mm', 'note', 'fromRef', 'toRef', 'value', 'title', 'desc'].forEach(k => { const v = g(k); if (v !== undefined) e[k] = v; });
    if (p.kind === 'asset' && !e.tag) return U.toast(L('El TAG es obligatorio', 'TAG is required'));
    if (p.kind === 'dep' && e.fromRef === e.toRef) return U.toast(L('Seleccione dos elementos distintos', 'Select two different elements'));
    if (p.conflict) p.conflict.resolved = p.conflict.resolved || 'edit';
    const id = apply(a, p, e); if (!id) return; U.closeModal(); C.save(); R(); U.toast(L('Guardado y aceptado', 'Saved and accepted'));
  };
  U.money = v => { const n = +v || 0; const loc = I.loc ? I.loc() : 'es-CO'; const f = (x, d) => x.toLocaleString(loc, { maximumFractionDigits: d });
    if (n >= 1e9) return '$' + f(n / 1e9, 1) + (I.lang === 'en' ? ' B' : ' mil M'); if (n >= 1e6) return '$' + f(n / 1e6, 1) + ' M'; return '$' + f(n, 0); };
})();
