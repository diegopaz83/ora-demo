/* ORA — Fase 3: Risk Journey en dos vistas (Process View y OT Dependency View) sobre el mismo modelo */
(function () {
  const C = window.ORA, D = window.ORA_DATA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, ic = U.ic, L = I.L, tx = I.tx, A = U.act;
  const R = () => U.render();
  const areaView = U.views.journey; // vista existente por área (se conserva)
  const KN = () => ({ process: L('Proceso', 'Process'), area: L('Área', 'Area'), system: L('Sistema OT', 'OT system'), asset: L('Activo', 'Asset'), dep: L('Dependencia', 'Dependency') });
  const list = (a, k) => k === 'process' ? a.processes : k === 'asset' ? a.assets : k === 'system' ? a.systems : k === 'dep' ? a.deps : a.areas;
  const idOf = (k, x) => k === 'process' ? x.key : x.id;
  const get = (a, key) => { if (!key) return null; const i = key.indexOf(':'); const k = key.slice(0, i), id = key.slice(i + 1); const x = list(a, k).find(y => idOf(k, y) === id); return x ? { k, id, x } : null; };
  const name = (a, k, x) => k === 'asset' ? x.tag : k === 'dep' ? C.nodeLbl(a, x.from) + (x.dir === 'bi' ? ' ↔ ' : ' → ') + C.nodeLbl(a, x.to) : tx(x.name);
  const evalScn = s => C.LEVEL(s.C, s.P) && s.controls && s.controls.length;

  // ---------- estado de riesgo: nunca presenta lo no evaluado como seguro ----------
  C.scnOf = function (a, k, x) {
    if (k === 'process') return a.scenarios.filter(s => s.proc === x.key);
    if (k === 'asset') return a.scenarios.filter(s => s.assets.includes(x.id));
    if (k === 'system') { const ids = a.assets.filter(y => y.sys === x.id).map(y => y.id); return a.scenarios.filter(s => s.assets.some(i => ids.includes(i)) || (s.systems || []).includes(x.id)); }
    if (k === 'area') { const ids = a.assets.filter(y => y.area === x.id).map(y => y.id); return a.scenarios.filter(s => s.assets.some(i => ids.includes(i))); }
    return a.scenarios.filter(s => (s.deps || []).includes(x.id) || (s.assets.includes(x.from) && s.assets.includes(x.to)));
  };
  C.riskStatus = function (a, k, x) {
    if (k !== 'process' && C.isOut(x)) return { code: 'out', label: L('Descartado', 'Discarded') };
    const sc = C.scnOf(a, k, x); const lv = sc.map(s => C.LEVEL(s.C, s.P));
    if (sc.length) { const w = lv.includes('Alto') ? 'Alto' : lv.includes('Medio') ? 'Medio' : lv.includes(null) || lv.includes(undefined) ? null : lv.includes('Bajo') ? 'Bajo' : null; return { code: w === 'Alto' ? 'alto' : w === 'Medio' ? 'medio' : w === 'Bajo' ? 'bajo' : 'pend', label: C.lvlText(w), n: sc.length }; }
    if (k !== 'process' && C.okd(x)) {
      const ps = k === 'dep' ? [] : C.recProcs(x); const evalProc = ps.length && ps.every(pk => a.scenarios.some(s => s.proc === pk && evalScn(s)));
      const fnd = k === 'asset' && a.findings.some(f => f.assets.includes(x.id));
      if (evalProc && !fnd) return { code: 'sinhall', label: L('Revisado · sin hallazgos', 'Reviewed · no findings') };
    }
    return { code: 'noeval', label: L('No evaluado', 'Not assessed') };
  };
  C.covStatus = function (a, k, x) { const r = C.photoReqs(a).find(q => q.key === k + ':' + idOf(k, x)); return r ? r.status : 'norequerida'; };
  const RISK_CODES = () => [['alto', C.lvlText('Alto')], ['medio', C.lvlText('Medio')], ['bajo', C.lvlText('Bajo')], ['pend', C.lvlText(null)], ['sinhall', L('Revisado · sin hallazgos', 'Reviewed · no findings')], ['noeval', L('No evaluado', 'Not assessed')]];

  // ---------- filtros comunes a ambas vistas ----------
  const F = () => C.S.ui.jf || (C.S.ui.jf = {});
  const procsOf = (a, k, x) => k === 'process' ? [x.key] : k === 'dep' ? [...new Set([x.from, x.to].flatMap(id => { const n = C.asset(a, id) || C.system(a, id); return n ? C.recProcs(n) : []; }))] : C.recProcs(x);
  C.jMatch = function (a, k, x) {
    const f = F();
    if (f.mat && C.mat(a, k, x) !== f.mat) return false;
    if (f.prov && k !== 'process' && x.prov !== f.prov) return false;
    if (f.prov && k === 'process' && (x.prov || 'catalogo') !== f.prov) return false;
    if (f.proc && !procsOf(a, k, x).includes(f.proc)) return false;
    if (f.type && (f.type.startsWith('k:') ? k !== f.type.slice(2) : !(k === 'asset' && x.type === f.type))) return false;
    if (f.ev && C.riskStatus(a, k, x).code !== f.ev) return false;
    if (f.cov && C.covStatus(a, k, x) !== f.cov) return false;
    return true;
  };
  const filterBar = a => {
    const f = F(); const sel = (k, lbl, opts) => `<div class="field"><label for="jf-${k}">${lbl}</label><select id="jf-${k}" data-jf="${k}">${U.opt('', L('Todos', 'All'), f[k] || '')}${opts.map(([v, l]) => U.opt(v, l, f[k] || '')).join('')}</select></div>`;
    const types = [...new Set(a.assets.map(x => x.type))];
    return `<div class="filters">${sel('mat', L('Madurez', 'Maturity'), ['sugerido', 'aceptado', 'validado', 'evaluado', 'descartado'].map(k => [k, C.matName(k)]))}${sel('prov', L('Procedencia', 'Provenance'), C.PROVS.map(k => [k, C.provName(k)]))}${sel('ev', L('Evaluación', 'Assessment'), RISK_CODES())}${sel('cov', L('Cobertura', 'Coverage'), [['capturada', C.PH_LBL['capturada']], ['sin foto', C.PH_LBL['sin foto']], ['justificada', C.PH_LBL['justificada']], ['aceptada', C.PH_LBL['aceptada']], ['norequerida', L('Foto no requerida', 'Photo not required')]])}${sel('proc', L('Proceso', 'Process'), a.processes.map(p => [p.key, tx(p.name)]))}${sel('type', L('Tipo', 'Type'), [['k:process', KN().process], ['k:area', KN().area], ['k:system', KN().system], ['k:asset', KN().asset], ['k:dep', KN().dep]].concat(types.map(t => [t, KN().asset + ' · ' + tx(t)])))}<button class="btn ghost sm" data-act="jf-clear" style="align-self:flex-end">${L('Limpiar', 'Clear')}</button></div>`;
  };
  C.jCounts = function (a) {
    const c = { sugerido: 0, aceptado: 0, validado: 0, evaluado: 0, descartado: 0, total: 0 };
    ['process', 'area', 'system', 'asset', 'dep'].forEach(k => list(a, k).forEach(x => { if (k === 'process' && x.status !== 'incluido') return; if (!C.jMatch(a, k, x)) return; c[C.mat(a, k, x)]++; c.total++; }));
    return c;
  };

  // ---------- elemento clicable común ----------
  const item = (a, k, x, extra) => {
    const key = k + ':' + idOf(k, x); const m = C.mat(a, k, x); const r = C.riskStatus(a, k, x); const on = C.S.ui.jfoc === key;
    return `<button class="jr-it rk-${r.code} m-${m} ${C.jMatch(a, k, x) ? '' : 'dim'} ${on ? 'sel' : ''}" data-act="jr-focus" data-key="${key}" aria-pressed="${on}"><span class="jr-n">${h(name(a, k, x))}</span><span class="jr-s"><i class="rkd" aria-hidden="true"></i>${h(r.label)}</span>${m === 'sugerido' ? `<span class="jr-m">${C.matName('sugerido')}</span>` : ''}${extra || ''}</button>`;
  };

  // ---------- Process View ----------
  U.jProcess = function (a) {
    const inc = a.processes.filter(p => p.status === 'incluido'); const rest = a.processes.filter(p => p.status !== 'incluido');
    const sharedSys = s => C.recProcs(s).length > 1 ? `<span class="jr-sh">${L('Compartido · ', 'Shared · ')}${C.recProcs(s).length}</span>` : '';
    const col = (p, i) => {
      const areas = a.areas.filter(ar => !C.isOut(ar) && C.recProcs(ar).includes(p.key));
      const sys = a.systems.filter(s => !C.isOut(s) && C.recProcs(s).includes(p.key));
      const orphan = a.assets.filter(x => !C.isOut(x) && C.assetProcs(x).includes(p.key) && !areas.some(ar => ar.id === x.area));
      const sc = a.scenarios.filter(s => s.proc === p.key);
      return `<section class="pv-col"><div class="pv-step"><span class="pv-n">${i + 1}</span>${i < inc.length - 1 ? '<span class="pv-arr" aria-hidden="true">→</span>' : ''}</div>
        ${item(a, 'process', p, `<span class="jr-x">${L('Criticidad', 'Criticality')} ${h(tx(p.crit) || '—')} · ${sc.length} ${L('escenarios', 'scenarios')}</span>`)}
        ${areas.map(ar => `<div class="pv-area">${item(a, 'area', ar)}<div class="pv-assets">${a.assets.filter(x => !C.isOut(x) && x.area === ar.id && C.assetProcs(x).includes(p.key)).map(x => item(a, 'asset', x, C.recProcs(x).length > 1 ? `<span class="jr-sh">${L('Compartido', 'Shared')}</span>` : '')).join('') || `<span class="small mut">${L('Sin activos', 'No assets')}</span>`}</div></div>`).join('') || `<p class="small mut">${L('Sin áreas registradas.', 'No areas recorded.')}</p>`}
        ${orphan.length ? `<div class="pv-area"><span class="small mut">${L('Sin área', 'No area')}</span><div class="pv-assets">${orphan.map(x => item(a, 'asset', x)).join('')}</div></div>` : ''}
        <div class="pv-sys"><span class="pv-lbl">${L('Sistemas OT que lo soportan', 'Supporting OT systems')}</span>${sys.map(s => item(a, 'system', s, sharedSys(s))).join('') || `<span class="small mut">${L('Ninguno registrado', 'None recorded')}</span>`}</div></section>`;
    };
    return `<div class="pv">${inc.map(col).join('') || `<div class="empty">${L('Incluya procesos en la etapa 2.', 'Include processes in stage 2.')}</div>`}</div>
      ${rest.length ? `<div class="pv-out">${ic('slash', 'sm')}<span><b>${L('Fuera de la evaluación', 'Not assessed')}:</b> ${rest.map(p => `${h(tx(p.name))} (${p.status === 'fuera' ? L('fuera del alcance', 'out of scope') : p.status === 'na' ? L('no aplica', 'not applicable') : p.status === 'desconocido' ? L('desconocido', 'unknown') : L('por decidir', 'to decide')})`).join(' · ')}. ${L('No se representan como seguros.', 'They are not shown as safe.')}</span></div>` : ''}`;
  };

  // ---------- OT Dependency View ----------
  C.depAnalysis = function (a) {
    const all = a.deps.filter(d => !C.isOut(d)); const deps = all.filter(d => C.mat(a, 'dep', d) !== 'sugerido'); const inn = {};
    deps.forEach(d => { (inn[d.to] = inn[d.to] || []).push(d); if (d.dir === 'bi') (inn[d.from] = inn[d.from] || []).push({ ...d, from: d.to, to: d.from }); });
    const shared = {}, spof = {};
    Object.entries(inn).forEach(([id, ds]) => { const dependents = [...new Set(ds.map(d => d.from))]; if (dependents.length < 2) return; shared[id] = dependents.length;
      const alone = dependents.filter(dep => !deps.some(o => o.from === dep && o.to !== id && ds.some(d => d.from === dep && d.type === o.type)));
      if (alone.length >= 2) spof[id] = alone.length; });
    const inAll = {}; all.forEach(d => { (inAll[d.to] = inAll[d.to] || new Set()).add(d.from); }); Object.entries(inAll).forEach(([id, s]) => { if (s.size >= 2 && !shared[id]) shared[id] = s.size; });
    return { shared, spof };
  };
  U.jDeps = function (a) {
    const f = F(); const deps = a.deps.filter(d => !C.isOut(d)); const an = C.depAnalysis(a);
    let ids = new Set([...a.systems.filter(s => !C.isOut(s)).map(s => s.id), ...deps.flatMap(d => [d.from, d.to])]);
    if (f.proc) { const core = [...ids].filter(id => { const n = C.asset(a, id) || C.system(a, id); return n && C.recProcs(n).includes(f.proc); }); const keep = new Set(core); deps.forEach(d => { if (keep.has(d.from) || keep.has(d.to)) { keep.add(d.from); keep.add(d.to); } }); ids = keep; }
    ids = [...ids].filter(id => { const n = C.asset(a, id) || C.system(a, id); return n && !C.isOut(n); });
    // filtros: se muestran los elementos que cumplen y, atenuados, sus vecinos directos como contexto
    const fAct = ['mat', 'prov', 'ev', 'cov', 'type'].some(k => f[k]); const nTot = ids.length; let nMatch = nTot;
    if (fAct) { const kd = id => C.system(a, id) ? 'system' : 'asset'; const nd = id => C.system(a, id) || C.asset(a, id);
      const match = new Set(ids.filter(id => C.jMatch(a, kd(id), nd(id)))); const keep = new Set(match);
      deps.forEach(d => { if (match.has(d.from) || match.has(d.to) || C.jMatch(a, 'dep', d)) { keep.add(d.from); keep.add(d.to); } });
      ids = ids.filter(id => keep.has(id)); nMatch = match.size;
      if (!ids.length) return `<div class="empty">${ic('branch')}<b>${L('Ningún elemento cumple los filtros', 'No element matches the filters')}</b><button class="btn ghost sm" data-act="jf-clear">${L('Limpiar filtros', 'Clear filters')}</button></div>`; }
    if (!ids.length) return `<div class="empty">${ic('branch')}<b>${L('Sin sistemas ni dependencias', 'No systems or dependencies')}</b><span>${L('Registre o importe dependencias en el inventario o en el recorrido.', 'Record or import dependencies in the inventory or the walkdown.')}</span></div>`;
    const out = {}; deps.forEach(d => (out[d.from] = out[d.from] || []).push(d.to));
    const lvl = {}; const walk = (id, seen) => { if (lvl[id] != null) return lvl[id]; if (seen.has(id)) return 0; seen.add(id); const t = (out[id] || []).filter(x => ids.includes(x)); lvl[id] = t.length ? 1 + Math.max(...t.map(x => walk(x, seen))) : 0; return lvl[id]; };
    ids.forEach(id => walk(id, new Set()));
    const maxL = Math.max(...ids.map(id => lvl[id])); const cols = {};
    ids.sort((x, y) => (C.system(a, x) ? 0 : 1) - (C.system(a, y) ? 0 : 1) || C.nodeLbl(a, x).localeCompare(C.nodeLbl(a, y))).forEach(id => (cols[maxL - lvl[id]] = cols[maxL - lvl[id]] || []).push(id));
    const NW = 200, NH = 64, CW = 290, RH = 84, TOP = 44; const pos = {};
    const place = () => Object.entries(cols).forEach(([c, arr]) => arr.forEach((id, i) => { pos[id] = { x: 16 + c * CW, y: TOP + i * RH }; }));
    // ordenar cada columna por el baricentro de sus vecinos para acortar y desenredar las conexiones
    const nb = {}; deps.forEach(d => { if (!ids.includes(d.from) || !ids.includes(d.to)) return; (nb[d.from] = nb[d.from] || []).push(d.to); (nb[d.to] = nb[d.to] || []).push(d.from); });
    place(); const ks = Object.keys(cols).map(Number).sort((x, y) => x - y);
    for (let it = 0; it < 4; it++) { (it % 2 ? ks.slice().reverse() : ks).forEach(c => { const bc = id => { const n = (nb[id] || []).filter(z => pos[z]); return n.length ? n.reduce((t, z) => t + pos[z].y, 0) / n.length : pos[id].y; }; cols[c].sort((x, y) => bc(x) - bc(y)); cols[c].forEach((id, i) => { pos[id].y = TOP + i * RH; }); }); }
    place();
    const W = 16 + (maxL + 1) * CW, H = TOP + Math.max(...Object.values(cols).map(x => x.length)) * RH + 10;
    const TYPE_COL = { Control: 'var(--primary)', 'Comunicación': 'var(--bright)', 'Energía': 'var(--lv-med)', 'Software / datos': 'var(--approval)', 'Servicio auxiliar': 'var(--muted)', 'Señal / medición': 'var(--ok-ink)', Proceso: 'var(--lv-high)' };
    let g = `<defs><pattern id="jhatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="var(--line)" stroke-width="3"/></pattern><marker id="jarw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>`;
    for (let c = 0; c <= maxL; c++) g += `<text x="${16 + c * CW}" y="22" font-size="11" fill="var(--muted)">${c === maxL ? L('Proveen el servicio', 'Provide the service') : c === 0 ? L('Dependen de otros', 'Depend on others') : ''}</text>`;
    const jf = C.S.ui.jfoc || ''; const [fk, fid] = [jf.split(':')[0], jf.slice(jf.indexOf(':') + 1)];
    const hlE = new Set(), hlN = new Set(); if (fk === 'dep') { const d0 = deps.find(d => d.id === fid); if (d0) { hlE.add(d0.id); hlN.add(d0.from); hlN.add(d0.to); } } else if ((fk === 'asset' || fk === 'system') && pos[fid]) { hlN.add(fid); deps.forEach(d => { if (d.from === fid || d.to === fid) { hlE.add(d.id); hlN.add(d.from); hlN.add(d.to); } }); }
    const anySel = hlN.size > 0; const lane = {}; const R6 = 6;
    const orth = (pts) => pts.reduce((acc, [x, y], i) => { if (!i) return `M${x} ${y}`; const [px, py] = pts[i - 1], nx = pts[i + 1]; if (!nx) return acc + ` L${x} ${y}`; const dx1 = Math.sign(x - px), dy1 = Math.sign(y - py), dx2 = Math.sign(nx[0] - x), dy2 = Math.sign(nx[1] - y); const r = Math.min(R6, Math.abs(x - px || y - py) / 2, Math.abs(nx[0] - x || nx[1] - y) / 2); return acc + ` L${x - dx1 * r} ${y - dy1 * r} Q${x} ${y} ${x + dx2 * r} ${y + dy2 * r}`; }, '');
    deps.slice().sort((d1, d2) => (hlE.has(d1.id) ? 1 : 0) - (hlE.has(d2.id) ? 1 : 0)).forEach(d => {
      const p1 = pos[d.from], p2 = pos[d.to]; if (!p1 || !p2) return;
      const key = 'dep:' + d.id; const on = C.S.ui.jfoc === key; const dim = !C.jMatch(a, 'dep', d); const m = C.mat(a, 'dep', d);
      const x1 = p1.x + NW, y1 = p1.y + NH / 2, x2 = p2.x, y2 = p2.y + NH / 2; const back = x2 <= x1; const mx = (x1 + x2) / 2;
      const ln = lane[x1] = (lane[x1] || 0) + 1; const lx = x1 + 14 + ((ln - 1) % 10) * 6;
      const by = Math.max(p1.y, p2.y) + NH + 12 + ((ln - 1) % 3) * 6;
      const path = back ? orth([[p1.x + NW / 2, p1.y + NH], [p1.x + NW / 2, by], [p2.x + NW / 2, by], [p2.x + NW / 2, p2.y + NH]]) : Math.abs(y1 - y2) < 1 ? `M${x1} ${y1} L${x2} ${y2}` : orth([[x1, y1], [lx, y1], [lx, y2], [x2, y2]]);
      const hl = hlE.has(d.id), fade = anySel && !hl;
      g += `<g class="jedge ${dim ? 'dim' : ''} ${on ? 'sel' : ''} ${hl ? 'hl' : ''} ${fade ? 'fade' : ''}" data-act="jr-focus" data-key="${key}" role="button" tabindex="0" aria-label="${h(KN().dep + ' ' + name(a, 'dep', d) + ' · ' + C.depName(d.type) + ' · ' + C.matName(m))}"><path d="${path}" fill="none" stroke="transparent" stroke-width="14"/><path d="${path}" fill="none" stroke="${TYPE_COL[d.type] || 'var(--muted)'}" stroke-width="${hl ? 3.2 : 1.8}" stroke-linejoin="round" ${m === 'sugerido' ? 'stroke-dasharray="6 5"' : ''} marker-end="url(#jarw)" ${d.dir === 'bi' ? 'marker-start="url(#jarw)"' : ''}/></g>`;
    });
    ids.forEach(id => {
      const p = pos[id]; const isSys = !!C.system(a, id); const k = isSys ? 'system' : 'asset'; const x = isSys ? C.system(a, id) : C.asset(a, id);
      const key = k + ':' + id; const on = C.S.ui.jfoc === key; const r = C.riskStatus(a, k, x); const m = C.mat(a, k, x); const dim = !C.jMatch(a, k, x);
      const fill = { alto: 'var(--lv-high-bg)', medio: 'var(--lv-med-bg)', bajo: 'var(--lv-low-bg)', pend: 'var(--lv-pend-bg)', sinhall: 'var(--surface)', noeval: 'var(--surface-2)' }[r.code] || 'var(--surface)';
      const stroke = an.spof[id] ? 'var(--approval)' : { alto: 'var(--lv-high)', medio: 'var(--lv-med)', bajo: 'var(--lv-low)', sinhall: 'var(--ok-ink)' }[r.code] || 'var(--line)';
      const lbl = name(a, k, x); const sub = an.spof[id] ? L('Posible punto único de falla', 'Possible single point of failure') : an.shared[id] ? L(`Compartida por ${an.shared[id]}`, `Shared by ${an.shared[id]}`) : r.label;
      const nhl = hlN.has(id), nfade = anySel && !nhl;
      g += `<g class="jnode2 ${dim ? 'dim' : ''} ${on ? 'sel' : ''} ${nhl && !on ? 'hl' : ''} ${nfade ? 'fade' : ''}" data-act="jr-focus" data-key="${key}" role="button" tabindex="0" aria-label="${h(KN()[k] + ' ' + lbl + ' · ' + r.label + ' · ' + C.matName(m) + (an.shared[id] ? ' · ' + sub : ''))}">
        <rect x="${p.x}" y="${p.y}" width="${NW}" height="${NH}" rx="${isSys ? 16 : 8}" fill="${fill}" stroke="${on || nhl ? 'var(--bright)' : stroke}" stroke-width="${on ? 3.2 : nhl || an.spof[id] ? 2.4 : 1.6}" ${m === 'sugerido' ? 'stroke-dasharray="5 4"' : ''}/>${r.code === 'noeval' ? `<rect x="${p.x}" y="${p.y}" width="${NW}" height="${NH}" rx="${isSys ? 16 : 8}" fill="url(#jhatch)" opacity=".45"/>` : ''}
        <text x="${p.x + 10}" y="${p.y + 18}" font-size="10" fill="var(--muted)">${isSys ? KN().system : h(tx(x.type))}${m === 'sugerido' ? ' · ' + C.matName('sugerido') : ''}</text>
        <text x="${p.x + 10}" y="${p.y + 36}" font-size="12.5" font-weight="600" fill="var(--ink)">${h(lbl.length > 25 ? lbl.slice(0, 24) + '…' : lbl)}</text>
        <text x="${p.x + 10}" y="${p.y + 53}" font-size="10.5" fill="${an.spof[id] ? 'var(--approval)' : 'var(--muted)'}">${h(sub.length > 31 ? sub.slice(0, 30) + '…' : sub)}</text></g>`;
    });
    const legend = Object.entries(TYPE_COL).map(([t, c]) => `<span><i style="background:${c}"></i>${h(C.depName(t))}</span>`).join('');
    return `${fAct ? `<p class="small mut" style="margin:0 0 8px">${L(`Filtro activo: ${nMatch} de ${nTot} elementos cumplen; los atenuados se muestran solo como contexto porque se conectan con ellos.`, `Filter on: ${nMatch} of ${nTot} elements match; dimmed ones are shown only as context because they connect to them.`)} <button class="plink" data-act="jf-clear">${L('Limpiar', 'Clear')}</button></p>` : ''}<div class="scroll-x jdv"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="group" aria-label="${L('Red de dependencias OT', 'OT dependency network')}">${g}</svg></div>
      <div class="legend">${legend}<span>${L('Línea o borde discontinuo: Propuesto', 'Dashed line or border: Proposed')}</span><span><i style="background:var(--approval)"></i>${L('Candidato a punto único de falla (por confirmar)', 'Single point of failure candidate (to confirm)')}</span><span>${L('Rayado: no evaluado', 'Hatched: not assessed')}</span></div>
      <p class="def">${L('Una dependencia compartida no implica riesgo alto por sí sola. «Candidato a punto único de falla»: dos o más elementos dependen de este nodo, con dependencias validadas, sin otro proveedor registrado del mismo tipo. Las dependencias solo sugeridas no generan candidatos. Es una hipótesis para revisar en campo, no una conclusión.', 'A shared dependency does not imply high risk by itself. “Single point of failure candidate”: two or more items depend on this node, through validated dependencies, with no other recorded provider of the same type. Suggested-only dependencies do not create candidates. It is a hypothesis to check in the field, not a conclusion.')}</p>`;
  };

  // ---------- detalle del elemento (registro único) ----------
  U.jDetail = function (a) {
    const r0 = get(a, C.S.ui.jfoc);
    if (!r0) return `<div class="box-body"><div class="empty">${ic('map')}<b>${L('Seleccione un elemento', 'Select an item')}</b><span>${L('Proceso, área, sistema OT, activo o dependencia. Verá su procedencia, madurez, evidencia, hallazgos, escenarios, controles y recomendaciones.', 'Process, area, OT system, asset or dependency. You will see its provenance, maturity, evidence, findings, scenarios, controls and recommendations.')}</span></div></div>`;
    const { k, x } = r0; const id = idOf(k, x); const m = C.mat(a, k, x); const rs = C.riskStatus(a, k, x); const sc = C.scnOf(a, k, x);
    const fnd = k === 'asset' ? a.findings.filter(f => f.assets.includes(id)) : k === 'process' ? a.findings.filter(f => sc.some(s => s.findings.includes(f.id))) : a.findings.filter(f => sc.some(s => s.findings.includes(f.id)));
    const recs = a.recs.filter(r => r.sc.some(s => sc.some(y => y.id === s)));
    const ph = a.photos.filter(p => p.links && ((C.lk ? C.lk(p, k, id) : p.links[k] === id) || (k === 'process' && sc.some(s => p.links.scenario === s.id))));
    const docs = (a.docs || []).filter(d => d.links && d.links[k] === id);
    const ctls = sc.flatMap(s => (s.controls || []).map(c => ({ s: s.id, n: tx(c.name), st: tx(c.st) })));
    const catCtl = (a.catalog.controls || []).filter(c => procsOf(a, k, x).some(pk => (c.procs || []).includes(pk)));
    const ends = k === 'dep' ? [x.from, x.to].map(i => (C.asset(a, i) ? 'asset:' : 'system:') + i) : [];
    const rel = k === 'dep' ? [] : a.deps.filter(d => !C.isOut(d) && (d.from === id || d.to === id));
    const sec = (t, body) => `<div class="sec-title">${t}</div>${body}`;
    const go = [];
    if (k === 'process') go.push(`<button class="btn ghost sm" data-act="go" data-stage="2" data-target="proc-${id}">${L('Abrir en Procesos críticos', 'Open in Critical processes')}</button>`);
    else { go.push(`<button class="btn ghost sm" data-act="jr-inv" data-k="${k}" data-id="${id}">${ic('list', 'sm')}${L('Abrir en Inventario OT', 'Open in OT inventory')}</button>`); go.push(`<button class="btn ghost sm" data-act="jr-walk" data-key="${k}:${id}">${ic('map', 'sm')}${L('Abrir en el recorrido', 'Open in walkdown')}</button>`); }
    const tl = (x.log || []).slice(0, 8).map(l => `<li>${C.fmtDate(l.ts, true)} · ${h(C.uname(l.by) || l.by || '')} · ${h(L(l.es, l.en))}</li>`).join('');
    return `<div class="box-body jdet"><div><span class="pill">${KN()[k]}</span><h3>${h(name(a, k, x))}</h3>${k === 'asset' ? `<p class="small mut">${h(tx(x.name))} · ${h(tx(x.type))} · ${h(C.areaName(a, x.area) || '—')}${x.sys ? ' · ' + h(C.nodeLbl(a, x.sys)) : ''}</p>` : ''}${k === 'dep' ? `<p class="small mut">${h(C.depName(x.type))}${x.crit ? ' · ' + L('criticidad ', 'criticality ') + h(tx(x.crit)) : ''}${x.note ? ' · ' + h(tx(x.note)) : ''}</p>` : ''}
        <div class="ir-chips">${k !== 'process' ? U.prov(x.prov) : ''}${U.mat(m)}<span class="lv ${{ alto: 'alto', medio: 'medio', bajo: 'bajo' }[rs.code] || 'pend'}">${h(rs.label)}</span></div>
        ${k !== 'dep' ? `<div class="ir-chips">${procsOf(a, k, x).map(pk => `<button class="pchip" data-act="jr-focus" data-key="process:${pk}">${h(C.procName(a, pk))}</button>`).join('')}</div>` : `<div class="ir-chips">${ends.map(e => `<button class="pchip" data-act="jr-focus" data-key="${e}">${h(C.nodeLbl(a, e.split(':')[1]))}</button>`).join(' ')}</div>`}
        ${k !== 'process' ? U.srcLine(a, x) : ''}</div>
      ${rs.code === 'noeval' ? `<div class="note-demo">${ic('info')}<span>${L('No evaluado: no hay escenarios clasificados que lo involucren. No equivale a riesgo bajo.', 'Not assessed: no rated scenarios involve it. It is not the same as low risk.')}</span></div>` : ''}
      ${rel.length ? sec(L('Dependencias', 'Dependencies'), rel.map(d => `<button class="jd-row" data-act="jr-focus" data-key="dep:${d.id}"><span>${h(name(a, 'dep', d))}</span><small>${h(C.depName(d.type))}</small>${U.mat(C.mat(a, 'dep', d))}</button>`).join('')) : ''}
      ${sec(L('Escenarios', 'Scenarios'), sc.map(s => `<button class="scn-item" style="padding:8px 0" data-act="go" data-stage="6" data-target="scn-${s.id}"><span class="pill pri">${s.id}</span><span><b>${h(tx(s.title))}</b></span>${U.lv(C.LEVEL(s.C, s.P))}</button>`).join('') || `<p class="small mut">${L('Sin escenarios vinculados.', 'No linked scenarios.')}</p>`)}
      ${sec(L('Hallazgos', 'Findings'), fnd.map(f => `<button class="jd-row" data-act="go" data-stage="6" data-target="finding-${f.id}"><span><b>${f.id}</b> ${h(tx(f.title))}</span></button>`).join('') || `<p class="small mut">${L('Sin hallazgos vinculados.', 'No linked findings.')}</p>`)}
      ${sec(L('Controles', 'Controls'), (ctls.map(c => `<p class="small">${h(c.n)} <span class="mut">· ${h(c.st)} · ${c.s}</span></p>`).join('') || `<p class="small mut">${L('Sin controles evaluados.', 'No assessed controls.')}</p>`) + (catCtl.length ? `<p class="small mut">${L('Sugeridos por el catálogo (no verificados)', 'Suggested by the catalog (not verified)')}: ${catCtl.map(c => h(tx(c.name))).join(' · ')}</p>` : ''))}
      ${recs.length ? sec(L('Recomendaciones', 'Recommendations'), recs.map(r => `<button class="jd-row" data-act="go" data-stage="6" data-target="scn-${r.sc[0]}"><span><b>${r.id}</b> ${h(tx(r.title))}</span><small>${h(tx(r.hz))}</small></button>`).join('')) : ''}
      ${sec(L('Evidencia', 'Evidence'), `<div class="row">${ph.map(p => `<button class="wk-th" data-act="lightbox" data-id="${p.id}" aria-label="${h(tx(p.title))}"><img src="${C.photoURL(p)}" alt=""></button>`).join('')}${docs.map(d => `<button class="plink" data-act="wk-doc-open" data-id="${d.id}">${ic('doc', 'sm')}${h(d.name)}</button>`).join('')}${k !== 'process' && k !== 'dep' ? (C.covStatus(a, k, x) === 'norequerida' ? `<span class="small mut">${L('Foto no requerida', 'Photo not required')}</span>` : U.phState(C.covStatus(a, k, x))) : ''}${!ph.length && !docs.length ? `<span class="small mut">${L('Sin evidencia vinculada.', 'No linked evidence.')}</span>` : ''}</div>`)}
      ${tl ? U.dt('jd-log-' + id, L('Historial de madurez', 'Maturity history'), `<ul class="plain small">${tl}</ul>`) : ''}
      <div class="row">${go.join('')}</div></div>`;
  };

  // ---------- RF-28: instantáneas de madurez y evaluación ----------
  const snapNow = a => { const m = {}, r = {}; ['process', 'area', 'system', 'asset', 'dep'].forEach(k => list(a, k).forEach(x => { if (k === 'process' && x.status !== 'incluido') return; const key = k + ':' + idOf(k, x); m[key] = C.mat(a, k, x); r[key] = C.riskStatus(a, k, x).code; })); return { m, r }; };
  C.snapshot = function (a, label, auto) { const s = snapNow(a); const o = { id: C.uid('SN'), ts: new Date().toISOString(), by: C.S.userId, label: label || (auto ? 'Línea base automática' : 'Instantánea'), m: s.m, r: s.r }; (a.snaps = a.snaps || []).unshift(o); C.log(a, 'Guardó la instantánea «' + o.label + '»', 'Saved snapshot “' + (I.EN[o.label] || o.label) + '”'); return o; };
  C.snapDiff = function (a, snap) {
    const now = snapNow(a); const out = []; const keys = new Set([...Object.keys(snap.m), ...Object.keys(now.m)]);
    keys.forEach(key => { const b = snap.m[key], n = now.m[key], rb = snap.r[key], rn = now.r[key]; if (b === n && rb === rn) return; const g = get(a, key); const lg = g && (g.x.log || [])[0]; out.push({ key, before: b || null, now: n || null, rb: rb || null, rn: rn || null, label: g ? KN()[g.k] + ' · ' + name(a, g.k, g.x) : key, by: lg && lg.by, ts: lg && lg.ts }); });
    return out;
  };
  I.B && I.B('Línea base automática', 'Automatic baseline'); I.B && I.B('Instantánea', 'Snapshot');
  const evo = a => {
    const snaps = a.snaps || []; const sel = snaps.find(s => s.id === C.S.ui.jsnap) || snaps[snaps.length - 1];
    const cnt = mm => { const c = { sugerido: 0, aceptado: 0, validado: 0, evaluado: 0, descartado: 0 }; Object.values(mm).forEach(v => { if (c[v] != null) c[v]++; }); return c; };
    const diff = sel ? C.snapDiff(a, sel) : []; const cb = sel ? cnt(sel.m) : null, cn = cnt(snapNow(a).m);
    const rl = c => (RISK_CODES().find(x => x[0] === c) || [0, c === 'out' ? L('Descartado', 'Discarded') : '—'])[1];
    return `<section class="box"><div class="box-head"><h3>${L('Evolución: propuesto, aceptado, verificado y evaluado', 'Evolution: proposed, accepted, verified and assessed')}</h3><button class="btn ghost sm" data-act="jr-snap">${ic('plus', 'sm')}${L('Guardar instantánea', 'Save snapshot')}</button><p>${L('Compara el estado actual con una instantánea anterior. Las instantáneas solo registran madurez y evaluación; no alteran evidencias ni registros.', 'Compares the current state with an earlier snapshot. Snapshots only record maturity and assessment; they do not alter evidence or records.')}</p></div>
      <div class="box-body">${sel ? `<div class="row" style="align-items:flex-end"><div class="field" style="min-width:240px"><label for="jsnap">${L('Comparar con', 'Compare with')}</label><select id="jsnap" data-jsnap="1">${snaps.map(s => U.opt(s.id, `${tx(s.label)} · ${C.fmtDate(s.ts, true)} · ${C.uname(s.by) || ''}`, sel.id)).join('')}</select></div></div>
        <div class="scroll-x"><table class="evo-t"><thead><tr><th></th>${['sugerido', 'aceptado', 'validado', 'evaluado', 'descartado'].map(k => `<th>${C.matName(k)}</th>`).join('')}</tr></thead><tbody><tr><td>${L('Instantánea', 'Snapshot')}</td>${['sugerido', 'aceptado', 'validado', 'evaluado', 'descartado'].map(k => `<td>${cb[k]}</td>`).join('')}</tr><tr><td><b>${L('Ahora', 'Now')}</b></td>${['sugerido', 'aceptado', 'validado', 'evaluado', 'descartado'].map(k => `<td><b>${cn[k]}</b></td>`).join('')}</tr></tbody></table></div>
        ${diff.length ? `<ul class="plain small evo-l">${diff.slice(0, 40).map(d => `<li><button class="plink" data-act="jr-focus" data-key="${d.key}">${h(d.label)}</button>: ${d.before ? C.matName(d.before) : L('nuevo', 'new')} → <b>${d.now ? C.matName(d.now) : L('eliminado', 'removed')}</b>${d.rb !== d.rn ? ` · ${rl(d.rb)} → <b>${rl(d.rn)}</b>` : ''}${d.by ? ` <span class="mut">· ${h(C.uname(d.by))} · ${C.fmtDate(d.ts, true)}</span>` : ''}</li>`).join('')}</ul>${diff.length > 40 ? `<p class="hint">${L('Se muestran 40 cambios.', 'Showing 40 changes.')}</p>` : ''}` : `<p class="small mut">${L('Sin cambios desde esta instantánea.', 'No changes since this snapshot.')}</p>`}` : ''}</div></section>`;
  };

  // ---------- vista principal ----------
  U.views.journey = function (a, ev) {
    const v = C.S.ui.jv || 'process';
    if (!(a.snaps || []).length) { C.snapshot(a, '', true); C.save(); }
    const tabs = `<div class="tabs" role="tablist">${[['process', 'Process View'], ['deps', 'OT Dependency View'], ['areas', L('Mapa por área', 'Area map')]].map(([k, l]) => `<button role="tab" data-act="jr-view" data-v="${k}" aria-selected="${v === k}">${l}</button>`).join('')}</div>`;
    if (v === 'areas') return areaView(a, ev).replace('<div class="journey">', tabs + '<div class="journey">');
    const c = C.jCounts(a);
    return `<div class="hello"><div><h1>Risk Journey</h1><p>${L('Dos vistas del mismo modelo registrado: secuencia de procesos y red de dependencias OT. Es ilustrativo: no es un gemelo digital, ni una topología certificada, ni un P&ID.', 'Two views of the same recorded model: process sequence and OT dependency network. It is illustrative: not a digital twin, a certified topology or a P&ID.')}</p></div><span class="pill demo">${L('Ilustrativo · generado de los registros', 'Illustrative · generated from records')}</span></div>
      ${tabs}${filterBar(a)}
      <div class="mat-sum jr-cnt">${['sugerido', 'aceptado', 'validado', 'evaluado', 'descartado'].map(k => `<div class="ms" data-c="${k}"><b>${c[k]}</b>${U.mat(k)}</div>`).join('')}</div>
      <div class="journey jr2"><section class="box"><div class="box-body">${v === 'deps' ? U.jDeps(a) : U.jProcess(a)}</div></section><section class="box jr-det" id="jr-det">${U.jDetail(a)}</section></div>
      ${evo(a)}`;
  };

  // ---------- acciones ----------
  A['jr-view'] = el => { C.S.ui.jv = el.dataset.v; C.save(); R(); };
  A['jr-focus'] = el => { C.S.ui.jfoc = el.dataset.key; const g = el.dataset.key.split(':'); if (g[0] === 'asset') C.S.ui.jsel = g[1]; U.closeModal(); C.save(); R(); if (window.innerWidth < 1100) { const d = document.getElementById('jr-det'); if (d) d.scrollIntoView({ block: 'start' }); } };
  A['jf-clear'] = () => { C.S.ui.jf = {}; C.S.ui.jfoc = null; C.S.ui.jsel = null; C.save(); R(); };
  A['jr-snap'] = () => { C.snapshot(C.cur(), L('Instantánea', 'Snapshot')); C.save(); R(); U.toast(L('Instantánea guardada', 'Snapshot saved')); };
  A['jr-inv'] = el => { U.closeModal(); const k = el.dataset.k, id = el.dataset.id; C.S.ui.view = 'inventory'; C.S.ui.inv = { tab: k }; U.after = () => { const r = document.getElementById('iv-' + id); if (r) { r.scrollIntoView({ block: 'center' }); r.classList.add('flash'); setTimeout(() => r.classList.remove('flash'), 1700); } }; C.save(); R(); };
  A['jr-walk'] = el => { U.closeModal(); C.S.ui.s3mode = 'list'; const [k, id] = el.dataset.key.split(':'); const a = C.cur();
    if (k === 'asset') { if (U.v6openAsset) U.v6openAsset(id); return U.goTo(3, 'req-asset-' + id); }
    if (k === 'area') return U.goTo(3, 'req-area-' + id);
    const n = k === 'system' && C.system(a, id); const ar = n && a.areas.find(z => !C.isOut(z) && a.assets.some(x => x.area === z.id && x.sys === id)); return U.goTo(3, ar ? 'req-area-' + ar.id : ''); };
  // enlaces a la etapa 6 desde el detalle: abrir la pestaña y la ficha correctas
  const go6 = U.goTo; U.goTo = function (stage, target) { const t = target || '';
    if (stage === 6 && /^scn-/.test(t)) { const id = t.slice(4); C.S.ui.v6tab = 'escenarios'; U.openKeys.add('v6s-' + id); return go6(6, 'v6scn-' + id); }
    if (stage === 6 && /^finding-/.test(t)) { const id = t.slice(8); C.S.ui.v6tab = 'fcoi'; C.S.ui.fov = 'list'; C.S.ui.fof = 'all'; if (U.foOpen) U.foOpen(id); return go6(6, 'fo-' + id); }
    return go6(stage, target); };
  A['jr-open'] = el => { C.S.ui.view = 'journey'; C.S.ui.jfoc = el.dataset.key; C.S.ui.jf = {}; U.closeModal(); C.save(); R(); const m = document.querySelector('.main'); if (m) m.scrollTop = 0; };
  A['j-node'] = el => { C.S.ui.jsel = el.dataset.id; C.S.ui.jfoc = 'asset:' + el.dataset.id; R(); };
  document.addEventListener('change', e => { const t = e.target; if (t.dataset && t.dataset.jf) { F()[t.dataset.jf] = t.value; R(); } if (t.dataset && t.dataset.jsnap) { C.S.ui.jsnap = t.value; R(); } });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && (e.target.classList.contains('jnode2') || e.target.classList.contains('jedge'))) { e.preventDefault(); A['jr-focus'](e.target); } });
})();
