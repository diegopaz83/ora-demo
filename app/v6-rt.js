/* ORA v6 — Tiempo de recuperación frente a la tolerancia del negocio: indicadores, eje logarítmico en HTML
   (texto a tamaño fijo, no escalado) y desglose por fase con la fase que domina la recuperación. */
(function () {
  const C = window.ORA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, L = I.L, tx = I.tx;
  const toH = t => !t || t.value == null || t.value === '' ? null : +t.value * ({ min: 1 / 60, h: 1, 'días': 24 }[t.unit] || 1);
  const fmtH = x => { if (x == null || isNaN(x)) return '—'; if (x < 1) return Math.round(x * 60) + ' min'; if (x < 48) return (Math.round(x * 10) / 10) + ' h'; const d = x / 24; return d < 14 ? Math.round(d) + L(' días', ' days') : Math.round(d / 7) + L(' semanas', ' weeks'); };
  const UNIT = u => /^min/i.test(u) ? 1 / 60 : /^h/i.test(u) ? 1 : /^d/i.test(u) ? 24 : /^sem|^w/i.test(u) ? 168 : /^mes|^mo/i.test(u) ? 720 : null;
  const parse = s => { const m = /(\d+(?:[.,]\d+)?)(?:\s*[–-]\s*(\d+(?:[.,]\d+)?))?\s*(min\w*|h\w*|d[ií]a\w*|day\w*|sem\w*|week\w*|mes\w*|month\w*)/i.exec(String(s || '')); if (!m) return null; const k = UNIT(m[3]); if (!k) return null; const a = +m[1].replace(',', '.') * k, b = m[2] ? +m[2].replace(',', '.') * k : a; return { min: a, max: b, note: String(s).replace(m[0], '').replace(/^[\s·(]+|[\s)]+$/g, '') }; };
  const lo = 1 / 12, hi = 2160; // 5 min … 3 meses
  const X = v => Math.max(0, Math.min(100, (Math.log10(Math.max(lo, Math.min(hi, v))) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)) * 100));

  U.v6rbar = function (a, s) {
    const p = a.processes.find(z => z.key === s.proc) || {}; const tH = toH(p.tolerance); const rc = s.recovery || {}; const r = rc.total;
    if (tH == null && !r) return `<div class="v6-rt"><p class="v6-gap unk">${L('Sin tolerancia del proceso ni tiempo de recuperación: no se puede comparar.', 'No process tolerance and no recovery time: cannot compare.')}</p></div>`;
    const st = tH == null || !r ? 'unk' : r.min > tH ? 'bad' : r.max > tH ? 'warn' : 'ok';
    const gapTxt = st === 'unk' ? (tH == null ? L('Falta la tolerancia del proceso (etapa 2)', 'Process tolerance missing (stage 2)') : L('Falta el tiempo de recuperación', 'Recovery time missing'))
      : st === 'bad' ? L('Supera la tolerancia aun en el mejor caso', 'Exceeds tolerance even in the best case') : st === 'warn' ? L('El peor caso supera la tolerancia', 'Worst case exceeds tolerance') : L('Dentro de la tolerancia', 'Within tolerance');
    const ratio = st === 'bad' && tH ? Math.round(r.min / tH) : null;
    const kpi = `<div class="v6-rt-k">
      <div class="k tol"><span>${L('Tolerancia del negocio', 'Business tolerance')}</span><b>${tH == null ? '—' : fmtH(tH)}</b><small>${h(tx(p.name || ''))}</small></div>
      <div class="k rec"><span>${L('Recuperación estimada', 'Estimated recovery')}</span><b>${r ? fmtH(r.min) + (r.max !== r.min ? ' – ' + fmtH(r.max) : '') : '—'}</b><small>${L('Confianza: ', 'Confidence: ')}${h(tx(rc.conf || 'Desconocido'))}${rc.tested ? L(' · probado', ' · tested') : ''}</small></div>
      <div class="k gap ${st}"><span>${L('Brecha', 'Gap')}</span><b>${st === 'ok' ? L('Sin brecha', 'No gap') : st === 'unk' ? L('Por determinar', 'To determine') : ratio && ratio >= 2 ? '×' + ratio : L('Sí', 'Yes')}</b><small>${gapTxt}</small></div></div>`;
    const ticks = [[0.25, '15 min'], [1, '1 h'], [8, '8 h'], [24, L('1 día', '1 day')], [168, L('1 sem', '1 wk')], [720, L('1 mes', '1 mo')]];
    const track = `<div class="v6-rt-tr" role="img" aria-label="${h(L('Tolerancia ', 'Tolerance ') + fmtH(tH) + L(' frente a recuperación ', ' versus recovery ') + (r ? fmtH(r.min) + '–' + fmtH(r.max) : '—'))}">
      <div class="lane">${tH != null ? `<div class="zone ok" style="width:${X(tH)}%"></div><div class="zone bad" style="left:${X(tH)}%"></div>` : ''}
        ${ticks.map(t => `<i class="tk" style="left:${X(t[0])}%"></i>`).join('')}
        ${r ? `<div class="rng ${st}" style="left:${X(r.min)}%;width:${Math.max(1.2, X(r.max) - X(r.min))}%"><span>${L('Recuperación', 'Recovery')} ${fmtH(r.min)}${r.max !== r.min ? '–' + fmtH(r.max) : ''}</span></div>` : ''}
        ${tH != null ? `<div class="tol" style="left:${X(tH)}%"><span>${L('Tolerancia', 'Tolerance')} ${fmtH(tH)}</span></div>` : ''}</div>
      <div class="ax">${ticks.map(t => `<span style="left:${X(t[0])}%">${t[1]}</span>`).join('')}</div></div>`;
    const ph = [['diagnosis', L('Diagnóstico', 'Diagnosis')], ['supply', L('Suministro', 'Supply')], ['repair', L('Reparación', 'Repair')], ['return', L('Retorno', 'Return')]].map(([k, l]) => ({ k, l, raw: rc[k], v: parse(rc[k]) }));
    const dom = ph.filter(x => x.v).sort((x, y) => y.v.max - x.v.max)[0];
    const phases = ph.some(x => x.raw) ? `<div class="v6-rt-ph">${ph.map((x, i) => `<div class="ph ${dom && dom.k === x.k ? 'dom' : ''}"><span class="n">${i + 1}</span><span class="t">${x.l}</span><b>${x.v ? fmtH(x.v.min) + (x.v.max !== x.v.min ? '–' + fmtH(x.v.max) : '') : h(tx(x.raw || '—'))}</b>${x.v && x.v.note ? `<small>${h(tx(x.v.note))}</small>` : ''}${dom && dom.k === x.k ? `<em>${L('Domina la recuperación', 'Drives recovery')}</em>` : ''}</div>`).join('')}</div>` : '';
    return `<div class="v6-rt">${kpi}${track}${phases}${rc.source ? `<p class="small mut" style="margin:0">${L('Fuente: ', 'Source: ')}${h(tx(rc.source))}</p>` : ''}</div>`;
  };
})();

/* Valorar un escenario desde su ficha: consecuencia y exposición con justificación y vista previa del nivel */
(function () {
  const C = window.ORA, U = window.ORA_UI, I = window.ORA_I18N; const h = C.esc, L = I.L, tx = I.tx, A = U.act;
  const DC = () => [L('1 · Baja: efecto menor, sin parada relevante ni daño', '1 · Low: minor effect, no relevant stop or harm'), L('2 · Media: parada parcial o recuperable dentro de la tolerancia ampliada', '2 · Medium: partial stop or recoverable within extended tolerance'), L('3 · Alta: supera la tolerancia del negocio o afecta seguridad, ambiente o cumplimiento', '3 · High: exceeds business tolerance or affects safety, environment or compliance')];
  const DP = () => [L('1 · Baja: controles verificados; no se espera en el horizonte del estudio', '1 · Low: verified controls; not expected within the study horizon'), L('2 · Media: controles parciales o sin probar; podría ocurrir', '2 · Medium: partial or untested controls; could happen'), L('3 · Alta: sin controles o con antecedentes; es probable', '3 · High: no controls or with history; likely')];
  U.modals.v6rate = function (a, d) {
    const s = a.scenarios.find(z => z.id === d.id); if (!s) return { title: '—', body: '' };
    const opts = (k, list, v) => `<div class="v6-rate-o" role="radiogroup" aria-label="${k}">${list.map((t, i) => `<label class="v6-rate-r"><input type="radio" name="v6r-${k}" value="${i + 1}" ${+v === i + 1 ? 'checked' : ''}><span>${h(t)}</span></label>`).join('')}</div>`;
    const ctl = s.controls || []; const cv = ctl.filter(c => c.st === 'Verificado').length;
    return { title: `${s.id} · ${L('Valoración del escenario', 'Scenario rating')}`, wide: true, body: `
      <p class="small mut" style="margin:0"><b>${h(tx(s.title))}</b> · ${L('Controles: ', 'Controls: ')}${cv}/${ctl.length} ${L('verificados', 'verified')}${s.recovery && s.recovery.total ? ' · ' + L('recuperación estimada registrada', 'estimated recovery recorded') : ''}</p>
      <div class="grid2"><div class="field"><span class="lbl">${L('Consecuencia (C) *', 'Consequence (C) *')}</span>${opts('C', DC(), s.C)}<label for="v6r-jC" class="lbl" style="margin-top:6px">${L('Justificación de C *', 'Justification of C *')}</label><textarea id="v6r-jC" rows="3" placeholder="${L('Por qué esta consecuencia: tolerancia, recuperación, seguridad…', 'Why this consequence: tolerance, recovery, safety…')}">${h(tx(s.justC || ''))}</textarea></div>
        <div class="field"><span class="lbl">${L('Exposición con controles existentes (P) *', 'Exposure with existing controls (P) *')}</span>${opts('P', DP(), s.P)}<label for="v6r-jP" class="lbl" style="margin-top:6px">${L('Justificación de P *', 'Justification of P *')}</label><textarea id="v6r-jP" rows="3" placeholder="${L('Qué controles hay y si están probados, antecedentes…', 'Which controls exist and whether tested, history…')}">${h(tx(s.justP || ''))}</textarea></div></div>
      <div class="v6-rate-prev" id="v6r-prev"></div>
      <p class="hint" style="margin:0">${L('Si no hay datos suficientes, deje el escenario pendiente: no se fuerza una celda de la matriz.', 'If there is not enough data, leave the scenario pending: no matrix cell is forced.')}</p>`,
      foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button><button class="btn primary" data-act="v6-rate-save" data-id="${s.id}">${L('Guardar valoración', 'Save rating')}</button>` };
  };
  const prev = () => { const el = document.getElementById('v6r-prev'); if (!el) return; const c = +((document.querySelector('[name=v6r-C]:checked') || {}).value || 0), p = +((document.querySelector('[name=v6r-P]:checked') || {}).value || 0);
    el.innerHTML = c && p ? `<span>${L('Nivel resultante en la matriz 3×3:', 'Resulting level in the 3×3 matrix:')}</span>${U.lv(C.LEVEL(c, p))}<span class="small mut">C${c} × P${p}</span>` : `<span class="small mut">${L('Elija C y P para ver el nivel resultante.', 'Choose C and P to see the resulting level.')}</span>`; };
  document.addEventListener('change', e => { if (e.target.name === 'v6r-C' || e.target.name === 'v6r-P') prev(); });
  const rm0 = U.renderModal; U.renderModal = function () { rm0.apply(this, arguments); prev(); };
  A['v6-rate'] = el => U.openModal('v6rate', { id: el.dataset.id });
  A['v6-rate-save'] = el => { const a = C.cur(); const s = a.scenarios.find(z => z.id === el.dataset.id); if (!s) return;
    const c = +((document.querySelector('[name=v6r-C]:checked') || {}).value || 0), p = +((document.querySelector('[name=v6r-P]:checked') || {}).value || 0);
    const jC = (document.getElementById('v6r-jC').value || '').trim(), jP = (document.getElementById('v6r-jP').value || '').trim();
    if (c && !jC) return U.toast(L('Justifique la consecuencia', 'Justify the consequence')); if (p && !jP) return U.toast(L('Justifique la exposición', 'Justify the exposure'));
    Object.assign(s, { C: c || null, P: p || null, justC: jC, justP: jP }); C.log(a, `Valoró el escenario ${s.id}: C${c || '—'} × P${p || '—'}`, `Rated scenario ${s.id}: C${c || '—'} × P${p || '—'}`); C.save(); U.closeModal(); U.render();
    U.toast(c && p ? L('Valoración guardada · ', 'Rating saved · ') + tx(C.LEVEL(c, p)) : L('Guardado; el escenario sigue pendiente', 'Saved; the scenario stays pending')); };
})();
