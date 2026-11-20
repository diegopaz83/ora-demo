/* ORA v6 — Evidencias: tabla de control con todo lo que tiene o necesita evidencia (área, activo, sistema OT,
   pregunta, hallazgo), su origen, N fotos y N documentos, si la regla la pide y el estado; checklist para aceptar
   «no requiere evidencia» y modal para ver o agregar evidencia. La galería se conserva debajo. */
(function () {
  const C = window.ORA, U = window.ORA_UI, I = window.ORA_I18N; const h = C.esc, L = I.L, tx = I.tx, ic = U.ic, A = U.act;
  const R = () => U.render(); const now = () => new Date().toISOString();
  const KL = () => ({ area: L('Área', 'Area'), asset: L('Activo', 'Asset'), system: L('Sistema OT', 'OT system'), q: L('Pregunta', 'Question'), finding: L('Hallazgo', 'Finding') });
  const cnt = (a, k, id) => ({ ph: C.evPhotos(a, k, id).length, dc: C.evDocs(a, k, id).length });
  const lvlOf = (a, f) => { const ss = a.scenarios.filter(s => (s.findings || []).includes(f.id)); const ls = ss.map(s => s.C && s.P ? C.LEVEL(s.C, s.P) : null).filter(Boolean); return ls.includes('Alto') ? 'Alto' : ls.includes('Medio') ? 'Medio' : ls.includes('Bajo') ? 'Bajo' : null; };
  function rows(a) {
    const reqs = C.photoReqs(a); const rq = Object.fromEntries(reqs.map(r => [r.key, r])); const inc = new Set(C.included(a).map(p => p.key)); const out = [];
    const add = (k, id, name, procs, extra) => { const c = cnt(a, k, id); const key = k + ':' + id; const r = rq[key]; const res = (a.photoRes || {})[key];
      const crit = extra && extra.crit; const required = !!r || crit; const has = c.ph + c.dc > 0;
      const st = has ? 'ok' : res && res.status === 'aceptada' ? 'accepted' : res && res.status === 'justificada' ? 'justified' : required ? 'pending' : 'optional';
      out.push({ k, id, key, name, procs: procs || [], ph: c.ph, dc: c.dc, required, crit, st, res, why: r ? r.why : crit ? L('Hallazgo de riesgo alto: debe tener evidencia', 'High-risk finding: must have evidence') : '' }); };
    a.areas.filter(z => !C.isOut(z) && C.recProcs(z).some(k => inc.has(k))).forEach(z => add('area', z.id, tx(z.name), C.recProcs(z)));
    a.assets.filter(x => !C.isOut(x) && C.assetProcs(x).some(k => inc.has(k))).forEach(x => add('asset', x.id, x.tag + ' · ' + tx(x.name), C.assetProcs(x)));
    (a.systems || []).filter(s => !C.isOut(s) && (C.evPhotos(a, 'system', s.id).length || C.evDocs(a, 'system', s.id).length)).forEach(s => add('system', s.id, tx(s.name), C.recProcs(s)));
    a.questions.filter(q => (a.answers[q.id] || {}).value && (C.evPhotos(a, 'q', q.id).length || C.evDocs(a, 'q', q.id).length || q.ev)).forEach(q => add('q', q.id, q.id + ' · ' + tx(q.text), q.proc ? [q.proc] : []));
    a.findings.filter(f => f.status !== 'descartado').forEach(f => { const lv = lvlOf(a, f); const cx = C.findCtx ? C.findCtx(a, f) : { procs: [] }; add('finding', f.id, f.id + ' · ' + tx(f.title), cx.procs, { crit: lv === 'Alto', lv }); });
    return out;
  }
  const STL = () => ({ ok: [L('Con evidencia', 'Has evidence'), 'ok'], pending: [L('Pendiente', 'Pending'), 'err'], justified: [L('Justificada · por revisar', 'Justified · to review'), 'warn'], accepted: [L('Aceptado sin evidencia', 'Accepted without evidence'), 'pri'], optional: [L('No requerida', 'Not required'), ''] });
  function table(a) {
    const all = rows(a); const F = C.S.ui.evt || (C.S.ui.evt = {}); const E = C.S.ui.evf || {};
    const list = all.filter(r => (!F.st || (F.st === 'crit' ? r.crit && r.st !== 'ok' : r.st === F.st)) && (!F.k || r.k === F.k) && (!E.proc || r.procs.includes(E.proc)));
    const n = s => all.filter(r => r.st === s).length; const nc = all.filter(r => r.crit && r.st !== 'ok').length;
    const chip = (k, l, c, cls) => `<button class="v6-pfb ${cls || ''}" data-act="evt-f" data-f="st" data-v="${k}" aria-pressed="${(F.st || '') === k}">${l}<b>${c}</b></button>`;
    const kchip = (k, l) => `<button class="v6-pfb" data-act="evt-f" data-f="k" data-v="${k}" aria-pressed="${(F.k || '') === k}">${l}<b>${all.filter(r => !k || r.k === k).length}</b></button>`;
    const SIC = { ok: 'check', pending: 'alert', justified: 'clock', accepted: 'shield', optional: 'slash' };
    const body = list.map(r => { const s = STL()[r.st]; const can = !r.ph && !r.dc; const main = C.evMain(a, r.k, r.id);
      const d0 = !main && r.dc ? C.evDocs(a, r.k, r.id)[0] : null; const mt = d0 ? String(d0.type || '') : ''; const ext = d0 ? ((/\.([a-z0-9]{2,5})$/i.exec(d0.file || '') || [0, /pdf/.test(mt) ? 'pdf' : /word|document/.test(mt) ? 'docx' : /sheet|excel|csv/.test(mt) ? 'xlsx' : /presentation|powerpoint/.test(mt) ? 'pptx' : ''])[1]).toLowerCase() : '';
      const fam = /pdf/.test(ext) ? 'pdf' : /docx?|rtf|odt/.test(ext) ? 'word' : /xlsx?|csv|ods/.test(ext) ? 'excel' : /pptx?|odp/.test(ext) ? 'ppt' : /png|jpe?g|gif|webp/.test(ext) ? 'img' : 'file';
      const thumb = main ? `<img src="${C.photoURL(main)}" alt="">${r.ph + r.dc > 1 ? `<i class="evt-badge">${r.ph + r.dc}</i>` : ''}` : d0 ? `<span class="evt-file f-${fam}"><span class="evt-fold"></span><b>${h((ext || 'doc').toUpperCase().slice(0, 4))}</b></span>${r.dc > 1 ? `<i class="evt-badge">${r.dc}</i>` : ''}` : ic('camera');
      const cnts = [r.ph ? `${r.ph} ${r.ph === 1 ? L('foto', 'photo') : L('fotos', 'photos')}` : '', r.dc ? `${r.dc} ${r.dc === 1 ? L('documento', 'document') : L('documentos', 'documents')}` : ''].filter(Boolean).join(' · ');
      return `<tr id="req-${r.k}-${r.id}" class="st-${r.st}">
        <td class="evt-th"><button class="evt-thumb ${main ? 'img' : d0 ? 'doc' : 'none'}" data-act="evt-open" data-k="${r.k}" data-id="${r.id}" aria-label="${L('Ver evidencia', 'View evidence')}">${thumb}</button></td>
        <td><div class="evt-el"><b>${h(r.name)}</b><span class="evt-meta"><span class="evt-k k-${r.k}">${KL()[r.k]}</span>${r.procs.length ? `<span>${r.procs.map(k => h(C.procName(a, k))).join(' · ')}</span>` : ''}${r.crit ? `<span class="evt-crit">${ic('alert', 'sm')}${L('Riesgo alto', 'High risk')}</span>` : r.required ? `<span class="evt-req">${L('Evidencia requerida', 'Evidence required')}</span>` : ''}</span>${r.res && r.res.note && r.st !== 'ok' ? `<small class="evt-note">${h(tx(r.res.reason || ''))} · ${h(r.res.by || '')}</small>` : ''}</div></td>
        <td class="evt-cnt">${cnts ? `<b>${cnts}</b>` : `<span class="mut">${L('Sin archivos', 'No files')}</span>`}</td>
        <td><span class="evt-st s-${r.st}">${ic(SIC[r.st], 'sm')}${s[0]}</span>${can && r.required ? `<label class="evt-acc"><input type="checkbox" data-evtacc="${r.key}" ${r.st === 'accepted' ? 'checked' : ''}><span>${L('No requiere evidencia', 'No evidence needed')}</span></label>` : ''}</td>
        <td class="evt-ac"><button class="btn ghost sm" data-act="evt-go" data-k="${r.k}" data-id="${r.id}" title="${L('Ir al elemento para revisarlo', 'Go to the item to review it')}">${L('Ir', 'Go')}${ic('chev', 'sm')}</button><button class="btn ${can ? 'soft' : 'ghost'} sm" data-act="evt-open" data-k="${r.k}" data-id="${r.id}">${can ? ic('plus', 'sm') + L('Agregar', 'Add') : L('Ver', 'View')}</button></td></tr>`; }).join('');
    return `<section class="box" id="v6-evt"><div class="box-head"><h3>${L('Control de evidencia', 'Evidence control')} · ${all.length}</h3><p>${L('Todo lo que tiene o debería tener evidencia, con su origen y cuántas fotos y documentos tiene. Marque «No requiere» para aceptar conscientemente lo que no necesita evidencia; queda registrado con su nombre y fecha.', 'Everything that has or should have evidence, with its origin and how many photos and documents it has. Check “Not needed” to consciously accept items that do not need evidence; it is recorded with your name and date.')}</p></div>
      <div class="box-body" style="gap:8px"><div class="v6-pf">${chip('', L('Todos', 'All'), all.length)}${chip('pending', L('Pendientes', 'Pending'), n('pending'), 'warn')}${nc ? chip('crit', L('Riesgo alto sin evidencia', 'High risk without evidence'), nc, 'err') : ''}${chip('justified', L('Justificadas', 'Justified'), n('justified'))}${chip('accepted', L('Aceptadas sin evidencia', 'Accepted without'), n('accepted'))}${chip('ok', L('Con evidencia', 'Has evidence'), n('ok'))}${chip('optional', L('No requeridas', 'Not required'), n('optional'))}</div>
        <div class="v6-pf">${kchip('', L('Todo origen', 'Any origin'))}${['area', 'asset', 'system', 'q', 'finding'].filter(k => all.some(r => r.k === k)).map(k => kchip(k, KL()[k])).join('')}</div></div>
      <div class="evt-tw"><table class="evt-t"><thead><tr><th></th><th>${L('Elemento', 'Item')}</th><th>${L('Evidencia', 'Evidence')}</th><th>${L('Estado y checklist', 'Status and checklist')}</th><th></th></tr></thead><tbody>${body || `<tr><td colspan="5" class="mut" style="text-align:center;padding:18px">${L('Nada con estos filtros.', 'Nothing with these filters.')}</td></tr>`}</tbody></table></div></section>`;
  }
  const st0 = U.stage[5];
  U.stage[5] = function (a, ev) {
    let html = st0.apply(this, arguments);
    const cut = (start) => { const i = html.indexOf(start); if (i < 0) return; let d = 0, j = i; const re = /<section\b|<\/section>/g; re.lastIndex = i; let m; while ((m = re.exec(html))) { d += m[0] === '</section>' ? -1 : 1; if (!d) { j = m.index + 10; break; } } html = html.slice(0, i) + html.slice(j); };
    cut('<section class="box" id="v6ev-pend">'); cut(`<section class="box"><div class="box-head"><h3>${L('Evidencia por proceso', 'Evidence by process')}`);
    const i = html.indexOf('<section class="box"><div class="box-head"><h3>' + L('Evidencia', 'Evidence') + '</h3>');
    return i < 0 ? html + table(a) : html.slice(0, i) + table(a) + html.slice(i);
  };
  A['evt-f'] = el => { const F = C.S.ui.evt || (C.S.ui.evt = {}); F[el.dataset.f] = F[el.dataset.f] === el.dataset.v ? '' : el.dataset.v; C.save(); R(); };
  document.addEventListener('change', e => { const key = e.target.dataset && e.target.dataset.evtacc; if (!key) return; const a = C.cur(); a.photoRes = a.photoRes || {};
    if (e.target.checked) { a.photoRes[key] = { status: 'aceptada', reason: L('No requiere evidencia', 'No evidence needed'), note: L('Revisado en el control de evidencia', 'Reviewed in the evidence control'), by: C.uname(C.S.userId), ts: now(), acceptedTs: now() }; C.log(a, `Aceptó sin evidencia ${key}`, `Accepted without evidence ${key}`); }
    else { delete a.photoRes[key]; C.log(a, `Reabrió el pendiente de evidencia ${key}`, `Reopened evidence item ${key}`); }
    C.save(); R(); });
  U.modals.evt = function (a, d) { const nm = d.k === 'asset' ? (C.asset(a, d.id) || {}).tag : d.k === 'area' ? tx((C.area(a, d.id) || {}).name || d.id) : d.id;
    return { title: `${KL()[d.k]} · ${h(nm || d.id)} · ${L('Evidencia', 'Evidence')}`, wide: true, body: U.evidBox(a, d.k, d.id), foot: `<button class="btn primary" data-act="modal-close">${L('Listo', 'Done')}</button>` }; };
  A['evt-go'] = el => { const k = el.dataset.k, id = el.dataset.id; U.closeModal();
    if (k === 'asset') { C.S.ui.s3mode = 'list'; if (U.v6openAsset) U.v6openAsset(id); return U.goTo(3, 'req-asset-' + id); }
    if (k === 'area') { C.S.ui.s3mode = 'list'; return U.goTo(3, 'req-area-' + id); }
    if (k === 'q') return U.goTo(4, 'q-' + id);
    if (k === 'finding') return U.goTo(6, 'finding-' + id);
    if (k === 'system') return A['jr-inv'] ? A['jr-inv']({ dataset: { k: 'system', id } }) : null; };
  A['evt-open'] = el => U.openModal('evt', { k: el.dataset.k, id: el.dataset.id });
})();
