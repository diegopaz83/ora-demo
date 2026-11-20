/* ORA v7 — Dinero y confianza: exposición = horas de brecha (recuperación − tolerancia) × costo de parada por hora.
   Cada cifra dice con qué datos se calculó (aceptados/verificados) y de dónde salen los supuestos. */
(function () {
  const C = window.ORA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, L = I.L, tx = I.tx, ic = U.ic, A = U.act;
  const R = () => U.render();
  const toH = t => { if (!t || t.value == null || t.value === '') return null; const v = +t.value; const u = String(t.unit || 'h').toLowerCase(); return u.startsWith('min') ? v / 60 : u.startsWith('d') ? v * 24 : u.startsWith('sem') || u.startsWith('w') ? v * 168 : v; };
  const fmtH = v => v == null ? '—' : v < 1 ? Math.round(v * 60) + ' min' : v < 48 ? (Math.round(v * 10) / 10) + ' h' : Math.round(v / 24 * 10) / 10 + L(' días', ' days');
  const money = v => U.money(v);
  U.EXAMPLE_COST = 10e6;

  C.expoProc = function (a, p) {
    const tol = toH(p.tolerance);
    const sc = (a.scenarios || []).filter(s => s.proc === p.key && s.recovery && s.recovery.total);
    let rec = null, recSrc = '';
    if (sc.length) { rec = { min: Math.max(...sc.map(s => toH({ value: s.recovery.total.min, unit: s.recovery.total.unit || 'h' }))), max: Math.max(...sc.map(s => toH({ value: s.recovery.total.max || s.recovery.total.min, unit: s.recovery.total.unit || 'h' }))) }; recSrc = L('escenarios evaluados', 'assessed scenarios'); }
    else if (p.recHint) { rec = { min: +p.recHint.min, max: +(p.recHint.max || p.recHint.min) }; recSrc = p.recHint.source || L('declarado', 'stated'); }
    const cost = p.costH && +p.costH.value ? +p.costH.value : null;
    const out = { p, tol, rec, recSrc, cost, costSrc: p.costH ? p.costH.source : '', example: !!(p.costH && p.costH.example) };
    if (tol == null || !rec) { out.missing = tol == null ? 'tol' : 'rec'; return out; }
    out.gap = { min: Math.max(0, rec.min - tol), max: Math.max(0, rec.max - tol) };
    if (cost == null) { out.missing = 'cost'; return out; }
    out.expo = { min: out.gap.min * cost, max: out.gap.max * cost };
    return out;
  };
  C.expo = function (a) {
    const rows = C.included(a).map(p => C.expoProc(a, p));
    const ok = rows.filter(r => r.expo);
    const tot = { min: ok.reduce((n, r) => n + r.expo.min, 0), max: ok.reduce((n, r) => n + r.expo.max, 0) };
    const dq = U.dataQuality ? U.dataQuality(a) : { okPct: 0, verPct: 0 };
    return { rows, ok, tot, missCost: rows.filter(r => r.missing === 'cost'), missOther: rows.filter(r => r.missing && r.missing !== 'cost'), dq, example: ok.some(r => r.example) };
  };
  const range = x => x.min === x.max ? money(x.min) : money(x.min) + ' – ' + money(x.max);

  U.expoCard = function (a, where) {
    const e = C.expo(a); const big = where === 'dash';
    const conf = `<span class="v7-conf" title="${L('Porcentaje del inventario aceptado o verificado por una persona', 'Share of the inventory accepted or verified by a person')}">${ic('shield', 'sm')}${L(`Calculado con ${e.dq.okPct} % de datos aceptados (${e.dq.verPct} % verificados)`, `Calculated with ${e.dq.okPct}% accepted data (${e.dq.verPct}% verified)`)}</span>`;
    if (!e.ok.length) {
      const msg = e.missCost.length ? L(`Falta el costo de parada por hora en ${e.missCost.length === 1 ? '1 proceso' : e.missCost.length + ' procesos'} con brecha calculable.`, `Downtime cost per hour is missing for ${e.missCost.length} process(es) with a computable gap.`) : L('Aparecerá cuando los procesos críticos tengan tolerancia y tiempo de recuperación.', 'It will appear once critical processes have tolerance and recovery time.');
      return `<div class="v7-expo empty"><span class="v7-ei">${ic('money')}</span><div><small>${L('Exposición estimada por parada', 'Estimated downtime exposure')}</small><b>${L('Por estimar', 'To be estimated')}</b><p>${msg}</p>${e.missCost.length ? `<button class="btn soft sm" data-act="v7-cost">${ic('money', 'sm')}${L('Registrar costo por hora', 'Enter cost per hour')}</button>` : ''}</div></div>`;
    }
    const rows = e.ok.sort((x, y) => y.expo.max - x.expo.max).slice(0, big ? 8 : 3).map(r => `<li><span><b>${h(tx(r.p.name).split('(')[0].trim())}</b><small>${L('Brecha', 'Gap')} ${r.gap.min === r.gap.max ? fmtH(r.gap.min) : fmtH(r.gap.min) + '–' + fmtH(r.gap.max)} × ${money(r.cost)}${L('/h', '/h')}${r.example ? ' · ' + L('costo de ejemplo', 'example cost') : ''}</small></span><em>${range(r.expo)}</em></li>`).join('');
    return `<div class="v7-expo ${big ? 'big' : ''}"><span class="v7-ei">${ic('money')}</span><div class="v7-eb"><small>${L('Exposición estimada por una parada', 'Estimated exposure per outage')} ${U.info ? U.info(L('Para cada proceso crítico: horas en que la recuperación supera la tolerancia × costo de una hora de parada. Es un orden de magnitud para priorizar, no una pérdida contable.', 'For each critical process: hours by which recovery exceeds tolerance × cost of one hour of downtime. An order of magnitude to prioritize, not an accounting loss.'), L('Cómo se calcula', 'How it is calculated')) : ''}</small><b>${range(e.tot)}</b>${conf}
      <ul class="v7-el">${rows}</ul>${e.missCost.length ? `<p class="v7-em">${L(`${e.missCost.length} proceso(s) sin costo por hora no suman.`, `${e.missCost.length} process(es) without cost per hour are not included.`)} <button class="plink" data-act="v7-cost">${L('Completar', 'Complete')}</button></p>` : ''}${e.example ? `<p class="v7-em">${ic('alert', 'sm')}${L('Incluye costos de ejemplo: reemplácelos por el dato del cliente.', 'Includes example costs: replace them with the client figure.')} <button class="plink" data-act="v7-cost">${L('Editar', 'Edit')}</button></p>` : ''}</div></div>`;
  };

  // modal: costo de parada por hora por proceso
  U.modals.v7cost = function (a) {
    const rows = C.included(a).map(p => { const r = C.expoProc(a, p); return `<tr><td><b>${h(tx(p.name))}</b><small>${L('Tolerancia', 'Tolerance')} ${fmtH(r.tol)} · ${L('recuperación', 'recovery')} ${r.rec ? (r.rec.min === r.rec.max ? fmtH(r.rec.min) : fmtH(r.rec.min) + '–' + fmtH(r.rec.max)) : '—'}</small></td><td><input class="inp v7-ci" type="number" min="0" step="100000" data-k="${p.key}" value="${p.costH ? p.costH.value : ''}" placeholder="${L('p. ej. ', 'e.g. ')}${U.EXAMPLE_COST}"></td><td><input class="inp v7-cs" data-k="${p.key}" value="${h(p.costH && !p.costH.example ? p.costH.source || '' : '')}" placeholder="${L('Fuente: p. ej. gerente de planta', 'Source: e.g. plant manager')}"></td></tr>`; }).join('');
    return { title: L('Costo de una hora de parada', 'Cost of one hour of downtime'), wide: true, body: `<p class="small mut">${L('Use el dato del cliente (producción perdida, penalidades, horas extra). Si no lo tiene, puede usar el valor de ejemplo y marcarlo para reemplazar.', 'Use the client figure (lost production, penalties, overtime). If you do not have it, use the example value and flag it to replace.')}</p><div class="scroll-x"><table class="v7-ct"><thead><tr><th>${L('Proceso incluido', 'Included process')}</th><th>${L('Costo por hora (COP)', 'Cost per hour (COP)')}</th><th>${L('Fuente', 'Source')}</th></tr></thead><tbody>${rows}</tbody></table></div>`,
      foot: `<button class="btn ghost" data-act="v7-cost-ex">${L('Usar valor de ejemplo en los vacíos', 'Use example value where empty')}</button><button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button><button class="btn primary" data-act="v7-cost-save">${L('Guardar', 'Save')}</button>` };
  };
  A['v7-cost'] = () => U.openModal('v7cost', {});
  A['v7-cost-ex'] = () => document.querySelectorAll('.v7-ci').forEach(i => { if (!i.value) { i.value = U.EXAMPLE_COST; i.dataset.ex = '1'; } });
  A['v7-cost-save'] = () => { const a = C.cur(); let n = 0;
    document.querySelectorAll('.v7-ci').forEach(i => { const p = a.processes.find(x => x.key === i.dataset.k); if (!p) return; const s = document.querySelector(`.v7-cs[data-k="${i.dataset.k}"]`); const v = +i.value;
      if (!v) { if (p.costH) { delete p.costH; n++; } return; }
      const ex = i.dataset.ex === '1' || (p.costH && p.costH.example && v === p.costH.value && !(s && s.value));
      const src = (s && s.value.trim()) || (ex ? L('Valor de ejemplo (reemplazar)', 'Example value (replace)') : L('Registrado por ', 'Recorded by ') + C.uname(C.S.userId));
      if (!p.costH || p.costH.value !== v || p.costH.source !== src) { p.costH = { value: v, cur: 'COP', source: src, conf: ex ? 'Supuesto' : 'Declarado', example: ex, by: C.S.userId, ts: new Date().toISOString() }; n++; } });
    if (n) C.log(a, `Actualizó el costo de parada por hora en ${n} proceso(s)`, `Updated downtime cost per hour for ${n} process(es)`); C.save(); U.closeModal(); R(); };

  // en Resultados (tablero) la exposición encabeza
  const d0 = U.views.dash;
  U.views.dash = function (a, ev) { const html = d0.apply(this, arguments); const card = `<section class="box v7-dx"><div class="box-head"><h3>${L('Exposición y confianza', 'Exposure and confidence')}</h3></div><div class="box-body">${U.expoCard(a, 'dash')}${U.dqBar ? U.dqBar(U.dataQuality(a)) : ''}</div></section>`;
    const i = html.indexOf('</div>', html.indexOf('<div class="v7-tabs"')); return i > 0 ? html.slice(0, i + 6) + card + html.slice(i + 6) : card + html; };
  // en Procesos críticos: acceso directo al costo por hora
  const s2 = U.stage[2];
  U.stage[2] = function (a) { const html = s2.apply(this, arguments); return html + `<section class="box"><div class="box-head"><h3>${L('Costo de parada por hora', 'Downtime cost per hour')}</h3><button class="btn ghost sm" data-act="v7-cost">${ic('money', 'sm')}${L('Registrar', 'Enter')}</button></div><div class="box-body">${U.expoCard(a, 'stage')}</div></section>`; };
})();
