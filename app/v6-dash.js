/* ORA v6 — Risk Intelligence: barras de escenarios por proceso en HTML (nombres completos, sin eje X, total por fila)
   y «Calidad y cobertura» como tabla con estado por indicador. */
(function () {
  const C = window.ORA, U = window.ORA_UI, I = window.ORA_I18N; const h = C.esc, L = I.L, tx = I.tx, ic = U.ic;
  const KS = ['Alto', 'Medio', 'Bajo', 'Pendiente'];
  U.barsSVG = function (rows) {
    const max = Math.max(1, ...rows.map(r => KS.reduce((n, k) => n + (r[k] || 0), 0)));
    return `<div class="v6bars" role="table" aria-label="${L('Escenarios por proceso y nivel', 'Scenarios by process and level')}">${rows.map(r => { const tot = KS.reduce((n, k) => n + (r[k] || 0), 0);
      return `<div class="v6bars-r" role="row"><span class="v6bars-n" role="rowheader" title="${h(r.name)}">${h(r.name)}</span><span class="v6bars-t" role="cell">${tot ? `<span class="v6bars-s" style="width:${tot / max * 100}%">${KS.filter(k => r[k]).map(k => `<i class="lv-${k.toLowerCase()}" style="flex:${r[k]}" title="${h(tx(k))}: ${r[k]}">${r[k] > 0 && r[k] / max > 0.06 ? r[k] : ''}</i>`).join('')}</span>` : `<span class="v6bars-e">${L('Sin escenarios: no evaluado (no equivale a bajo)', 'No scenarios: not assessed (not the same as low)')}</span>`}</span><b class="v6bars-x" role="cell">${tot || '—'}</b></div>`; }).join('')}
      ${rows.length > 1 ? `<div class="v6bars-r tot"><span class="v6bars-n">${L('Total', 'Total')}</span><span></span><b class="v6bars-x">${rows.reduce((n, r) => n + KS.reduce((m, k) => m + (r[k] || 0), 0), 0)}</b></div>` : ''}</div>`;
  };
  const d0 = U.views.dash;
  U.views.dash = function (a) {
    let html = d0.apply(this, arguments); const i = html.indexOf('<div class="toc">'); if (i < 0) return html; const j = html.indexOf('</div>', i) + 6;
    const m = C.metrics(a, C.S.ui.flt || {});
    const row = (lbl, v, help, warn, extra) => `<tr><td><b>${lbl}</b><small>${help}</small></td><td class="n">${v}${extra || ''}</td><td>${warn ? `<span class="pill warn">${L('Revisar', 'Review')}</span>` : `<span class="pill ok">${L('Al día', 'Up to date')}</span>`}</td></tr>`;
    const tbl = `<table class="v6qt"><thead><tr><th>${L('Indicador', 'Indicator')}</th><th class="n">${L('Valor', 'Value')}</th><th>${L('Estado', 'Status')}</th></tr></thead><tbody>
      ${row(L('Procesos fuera de alcance', 'Processes out of scope'), m.outScope, L('Excluidos del estudio por decisión del cliente.', 'Excluded from the study by client decision.'), false)}
      ${row(L('Procesos «No aplica»', '“Not applicable” processes'), m.na, L('Con justificación registrada.', 'With recorded justification.'), false)}
      ${row(L('Procesos con estado desconocido', 'Processes with unknown status'), m.unkProc, L('Falta decidir si se incluyen.', 'Inclusion still to decide.'), m.unkProc > 0)}
      ${row(L('Respuestas desconocidas', 'Unknown answers'), m.unknown, L('Brechas de información por verificar; no son riesgo.', 'Information gaps to verify; not risk.'), m.unknown > 0)}
      ${row(L('Excepciones fotográficas', 'Photo exceptions'), m.reqJust, L('Justificaciones de falta de foto por revisar.', 'Missing-photo justifications to review.'), m.reqJust > 0, ` <small class="mut">${L('por revisar', 'to review')}</small>`)}</tbody></table>`;
    return html.slice(0, i) + tbl + html.slice(j);
  };
})();
