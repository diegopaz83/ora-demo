/* ORA v6 — Historial como línea de tiempo conectada: agrupado por día, del más nuevo al más viejo,
   cada paso con su hora en un nodo, la persona, la acción y el tipo de cambio; filtros por persona y tipo. */
(function () {
  const C = window.ORA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, ic = U.ic, L = I.L, A = U.act;
  const KINDS = () => [
    ['create', L('Registro', 'Created'), 'plus', /^(Registr|Agreg|Cre[óo]|Subi[óo]|Import|Aplic|Asoci|Carg|Inici|Defini)/i],
    ['edit', L('Edición', 'Edit'), 'edit', /^(Edit|Actualiz|Corrig|Cambi|Mov|Eligi|Reorden|Orden|Ajust|Clasific|Complet|Recorrido|Guard|Abri[óo]|Reabri|Marc|Valor[óo]|Asign|Reasign|Renombr|Incluy|Excluy|Solicit|Restaur|Prioriz)/i],
    ['answer', L('Respuesta', 'Answer'), 'check', /^(Respond|Restaur|Descart[óo] la pregunta)/i],
    ['validate', L('Validación', 'Validation'), 'shield', /(Valid|Acept|Aprob|Cerr|Envi[óo]|liber)/i],
    ['delete', L('Borrado', 'Deleted'), 'x', /^(Borr|Elimin|Desvincul|Descart)/i]];
  const kindOf = x => { const t = x.es || ''; const k = KINDS().find(k => k[3].test(t)); return k ? k[0] : 'other'; };
  const dayKey = ts => (ts || '').slice(0, 10);
  const dayLbl = d => { const t = new Date(); const y = new Date(Date.now() - 864e5); const iso = z => z.toISOString().slice(0, 10); if (d === iso(t)) return L('Hoy', 'Today'); if (d === iso(y)) return L('Ayer', 'Yesterday'); return C.fmtDate(d + 'T12:00:00', false); };
  const hm = ts => { try { return new Date(ts).toLocaleTimeString(I.lang === 'en' ? 'en-US' : 'es-CO', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return (ts || '').slice(11, 16); } };
  const SHOW = { n: 40 };

  function timeline(a) {
    const all = a.history || []; const F = C.S.ui.hf || {};
    const ppl = [...new Set(all.map(x => x.by).filter(Boolean))];
    if (F.by) { delete F.by; C.save(); } // el filtro por persona se retiró: no debe quedar aplicado
    const list = all.filter(x => !F.k || kindOf(x) === F.k);
    const cnt = k => all.filter(x => kindOf(x) === k).length;
    const bar = `<div class="v6h-bar"><div class="v6-pf">${[['', L('Todo', 'All'), all.length]].concat(KINDS().map(k => [k[0], k[1], cnt(k[0])]).concat([['other', L('Otros', 'Other'), cnt('other')]]).filter(k => k[2])).map(([k, l, n]) => `<label class="v6-pfb v6h-rb ${(F.k || '') === k ? 'on' : ''}"><input type="radio" class="sr" name="v6hk" value="${k || 'all'}" ${(F.k || '') === k ? 'checked' : ''}>${l}<b>${n}</b></label>`).join('')}</div></div>`;
    if (!list.length) return bar + `<div class="box-body"><div class="empty">${all.length ? L('Ningún cambio con estos filtros.', 'No changes match these filters.') : L('Sin actividad registrada.', 'No activity recorded.')}</div></div>`;
    const shown = list.slice(0, SHOW.n); let out = '', cur = null;
    shown.forEach((x, i) => { const d = dayKey(x.ts); if (d !== cur) { if (cur) out += `</ol></div>`; cur = d; out += `<div class="v6h-day"><div class="v6h-dh"><span class="v6h-dc"><b>${h(dayLbl(d))}</b></span><span class="v6h-dn">${(n => n + ' ' + (n === 1 ? L('cambio', 'change') : L('cambios', 'changes')))(list.filter(z => dayKey(z.ts) === d).length)}</span></div><ol class="v6h-ol">`; }
      const k = kindOf(x), K = KINDS().find(z => z[0] === k); const prev = shown[i - 1]; const same = prev && prev.by === x.by && dayKey(prev.ts) === d;
      out += `<li class="v6h-it k-${k}"><span class="v6h-t">${hm(x.ts)}</span><i class="v6h-dot">${ic(K ? K[2] : 'clock', 'sm')}</i>
        <div class="v6h-row">${U.av(x.by)}<div class="v6h-tx"><b>${h(C.uname(x.by) || '—')}</b><p>${h(L(x.es, x.en))}</p></div>${K ? `<span class="v6h-kc">${K[1]}</span>` : ''}</div></li>`; });
    out += `</ol></div>`;
    const more = list.length > SHOW.n ? `<div class="v6h-more"><button class="btn ghost sm" data-act="v6h-more">${L('Ver más', 'Show more')} · ${list.length - SHOW.n}</button></div>` : '';
    return bar + `<div class="v6h">${out}</div>${more}`;
  }
  const team0 = U.views.team;
  U.views.team = function (a) {
    const html = team0.apply(this, arguments); let tl; try { tl = timeline(a); } catch (er) { tl = `<div class="box-body"><div class="empty">${h(L('No se pudo mostrar el historial: ', 'Could not show the history: ') + er.message)}</div></div>`; } const mark = `<h3>${L('Historial de cambios', 'Change history')}</h3>`; const i = html.lastIndexOf('<section class="box"><div class="box-head">' + mark); if (i < 0) return html;
    return html.slice(0, i) + `<section class="box"><div class="box-head">${mark}<span class="small mut">${(a.history || []).length} ${L('cambios · del más reciente al más antiguo', 'changes · newest first')}</span></div>${tl}</section>`;
  };
  A['v6h-by'] = el => { (C.S.ui.hf = C.S.ui.hf || {}).by = el.dataset.v; SHOW.n = 40; C.save(); U.render(); };
  A['v6h-k'] = el => { const F = (C.S.ui.hf = C.S.ui.hf || {}); F.k = F.k === el.dataset.v ? '' : el.dataset.v; SHOW.n = 40; C.save(); U.render(); };
  // filtro por tipo con su propio manejador (no depende del despachador global)
  // filtro por tipo con radios nativos: no depende de ningún manejador de clics
  document.addEventListener('change', e => { const t = e.target; if (!t || t.name !== 'v6hk') return; const F = (C.S.ui.hf = C.S.ui.hf || {}); F.k = t.value === 'all' ? '' : t.value; SHOW.n = 40; try { C.save(); } catch (er) {} try { U.render(); } catch (er) { console.error(er); U.toast && U.toast('Error: ' + er.message); } });
  A['v6h-more'] = () => { SHOW.n += 40; U.render(); };
})();
