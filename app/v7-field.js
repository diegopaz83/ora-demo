/* ORA v7 — Micrófono y Modo campo.
   Dictado: capacidad `dictation` del artefacto (Claude) → Web Speech del navegador → nota escrita.
   Lo dictado se interpreta (Claude si está disponible, si no reglas) y aparece como propuestas en la etapa donde está. */
(function () {
  const C = window.ORA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, L = I.L, tx = I.tx, ic = U.ic, A = U.act;
  const R = () => U.render();
  const now = () => new Date().toISOString();
  const norm = s => String(tx(s) || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const pl = (n, s, p) => n + ' ' + (n === 1 ? s : p);
  const FM = { area: null, asset: null, last: [] };
  U.fm = FM;

  // ---------- dictado ----------
  let REC = null, SUBS = [];
  U.dictOn = false; U.dictPartial = ''; U.dictBuf = '';
  U.dictOK = () => !!((U.vcap && U.vcap.dict) || window.webkitSpeechRecognition || window.SpeechRecognition);
  function live() {
    let el = document.getElementById('v7-live');
    if (!U.dictOn) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'v7-live'; el.className = 'v7-live'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.innerHTML = `<span class="v7-lmic">${ic('mic')}</span><div><b>${L('Escuchando…', 'Listening…')}</b><p>${h(U.dictBuf)}<em>${h(U.dictPartial)}</em>${!U.dictBuf && !U.dictPartial ? `<span class="mut">${L('Hable con naturalidad: «El PLC-101 es de 2005 y no tiene respaldo».', 'Speak naturally: “PLC-101 is from 2005 and has no backup”.')}</span>` : ''}</p></div><button class="btn danger sm" data-act="dict-stop">${ic('stop', 'sm')}${L('Terminar', 'Finish')}</button>`;
  }
  // onPhrase(texto final), onEnd(textoCompleto); opt.keep: no interpretar al terminar (lo usa quien llama)
  U.dictate = function (onPhrase, onEnd, opt) {
    if (U.dictOn) { U.dictStop(); return; }
    U.dictBuf = ''; U.dictPartial = ''; const cb = { onPhrase, onEnd };
    const finish = () => { if (!U.dictOn) return; U.dictOn = false; const t = U.dictBuf.trim(); U.dictPartial = ''; live(); SUBS.forEach(f => { try { f(); } catch (e) {} }); SUBS = []; REC = null; cb.onEnd && cb.onEnd(t); };
    const d = U.vcap && U.vcap.dict;
    if (d) {
      U.dictOn = true; live();
      SUBS.push(d.onPartial(({ text }) => { U.dictPartial = text; live(); }));
      SUBS.push(d.onFinal(({ text }) => { U.dictPartial = ''; U.dictBuf += (U.dictBuf ? ' ' : '') + text; cb.onPhrase && cb.onPhrase(text); live(); }));
      SUBS.push(d.onState(({ state, reason }) => { if (state === 'idle') { if (reason === 'not_granted' || reason === 'unavailable') U.toast(L('Dictado no disponible: puede escribir la nota.', 'Dictation unavailable: you can type the note.')); finish(); } }));
      REC = { stop: () => d.stop().catch(() => {}) };
      d.start({ language: I.lang === 'en' ? 'en' : 'es' }).catch(e => { U.toast(e && e.code === 'not_granted' ? L('Sin permiso de micrófono: escriba la nota.', 'No microphone permission: type the note.') : L('No se pudo iniciar el dictado: ', 'Could not start dictation: ') + (e && (e.code || e.message))); finish(); });
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const r = new SR(); r.lang = I.lang === 'en' ? 'en-US' : 'es-CO'; r.continuous = true; r.interimResults = true;
      r.onresult = e => { let part = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) { U.dictBuf += (U.dictBuf ? ' ' : '') + t.trim(); cb.onPhrase && cb.onPhrase(t.trim()); } else part += t; } U.dictPartial = part; live(); };
      r.onerror = e => { if (e.error === 'not-allowed') U.toast(L('Sin permiso de micrófono: escriba la nota.', 'No microphone permission: type the note.')); };
      r.onend = finish; REC = r; U.dictOn = true; live();
      try { r.start(); } catch (e) { finish(); }
      return;
    }
    U.toast(L('Este navegador no permite dictado. Use «Escribir nota».', 'This browser does not support dictation. Use “Type a note”.'));
    if (!opt || !opt.keep) A['fm-note']();
  };
  U.dictStop = () => { if (REC) REC.stop(); };
  A['dict-stop'] = () => U.dictStop();

  // ---------- interpretar una nota dictada o escrita ----------
  const TYPE_WORDS = { PLC: /\bplc\b|controlador/, HMI: /\bhmi\b|pantalla|estacion de operacion/, UPS: /\bups\b/, 'Switch OT': /\bswitch\b/, Variador: /variador|\bvfd\b/, Firewall: /firewall/, Servidor: /servidor/, RTU: /\brtu\b/ };
  U.interpret = async function (a, text, ctx) {
    ctx = ctx || {}; const raw = String(text || '').trim(); if (!raw) return [];
    let t = raw; const area = ctx.areaId ? C.area(a, ctx.areaId) : null; const asset = ctx.assetId ? C.asset(a, ctx.assetId) : null;
    // relacionar palabras como «el PLC» con el activo del área cuando no se dijo el TAG
    if (!/\b[A-Z]{2,4}-\d{2,4}/.test(t)) {
      if (asset) t = asset.tag + ': ' + t;
      else if (area) { const n = norm(t); const hit = a.assets.filter(x => x.area === area.id && !C.isOut(x)).find(x => TYPE_WORDS[x.type] && TYPE_WORDS[x.type].test(n)); if (hit) t = hit.tag + ': ' + t; }
    }
    if (area && !norm(t).includes(norm(tx(area.name)).split(' ').slice(0, 2).join(' '))) t = L('En ', 'In ') + tx(area.name).split('(')[0].trim() + '. ' + t;
    const src = { id: C.uid('S'), type: 'dictado', name: L('Dictado de campo · ', 'Field dictation · ') + new Date().toLocaleString(I.loc ? I.loc() : 'es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), who: C.uname(C.S.userId), when: now().slice(0, 10), text: t, raw, ts: now(), by: C.S.userId, ctx };
    C.sources(a).push(src);
    let list = null;
    if (U.vcap && U.vcap.sample && U.ingState.engine !== 'rules') { try { list = await C.claudeEngine(a, src); src.engine = 'claude'; } catch (e) { list = null; } }
    if (!list) { list = C.rulesEngine(a, src); src.engine = 'reglas'; }
    list.forEach(p => { if (p.src && p.src.quote) p.src.quote = p.src.quote.replace(/^(En|In) [^.]{2,80}\.\s*/, '').replace(/^[A-Z]{2,4}-\d{2,4}[A-Z]?:\s*/, ''); if (p.kind === 'finding' && p.data.desc) p.data.desc = p.data.desc.replace(/^[A-Z]{2,4}-\d{2,4}[A-Z]?:\s*/, ''); });
    list.forEach(p => { if (p.kind === 'asset' && !p.data.areaRef && area) p.data.areaRef = 'id:' + area.id; if (p.kind === 'finding' && !p.data.areaRef && !p.data.assetRef && area) p.data.areaRef = 'id:' + area.id; });
    const added = C.mergeProps(a, list); src.done = true; src.found = added.length;
    C.log(a, `Dictó una nota de campo; omnIA propuso ${pl(added.length, 'elemento', 'elementos')}`, `Dictated a field note; omnIA proposed ${pl(added.length, 'item', 'items')}`);
    C.save(); return added;
  };
  async function afterNote(text, ctx) {
    const a = C.cur(); if (!a || !text) return;
    U.toast(L('omnIA está interpretando la nota…', 'omnIA is interpreting the note…'));
    const added = await U.interpret(a, text, ctx); FM.last = added.map(p => p.id);
    if (!added.length) { U.toast(L('No encontré datos nuevos en la nota. Quedó guardada como fuente.', 'I found no new data in the note. It was saved as a source.')); R(); return; }
    const secs = [...new Set(added.map(p => ({ process: 'scope', answer: 'quest', finding: 'risk' }[p.kind] || 'plant')))];
    R(); U.toast(L(`omnIA propone ${pl(added.length, 'elemento', 'elementos')}`, `omnIA proposes ${pl(added.length, 'item', 'items')}`) + ' · ' + secs.map(k => (U.SECS().find(s => s.k === k) || {}).name).join(', '));
  }
  const ctxNow = () => { const v = C.S.ui.view; return v === 'field' ? { areaId: FM.area, assetId: FM.asset, stage: 3 } : { stage: v === 'wizard' ? C.S.ui.stage : 0 }; };
  A['mic-quick'] = () => { const ctx = ctxNow(); U.dictate(null, txt => afterNote(txt, ctx)); };
  A['fm-note'] = () => U.openModal('v7note', {});
  U.modals.v7note = () => ({ title: L('Nota de campo', 'Field note'), body: `<div class="field"><label for="nt-x">${L('Escriba lo que observa. omnIA lo convertirá en propuestas.', 'Type what you observe. omnIA will turn it into proposals.')}</label><textarea id="nt-x" rows="5" data-autofocus placeholder="${L('p. ej. El PLC-101 es de 2005 y no tiene respaldo del programa.', 'e.g. PLC-101 is from 2005 and has no program backup.')}"></textarea></div>`,
    foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button><button class="btn primary" data-act="fm-note-ok">${ic('spark', 'sm')}${L('Interpretar', 'Interpret')}</button>` });
  A['fm-note-ok'] = () => { const t = (document.getElementById('nt-x') || {}).value || ''; if (!t.trim()) return U.toast(L('Escriba la nota', 'Type the note')); const ctx = ctxNow(); U.closeModal(); afterNote(t, ctx); };

  // micrófono en la barra superior de cada etapa del assessment
  const top0 = U.top;
  U.top = function (a, ev) { const html = top0(a, ev); const v = C.S.ui.view; if (!a || !['wizard', 'inventory', 'summary', 'dash', 'journey'].includes(v)) return html;
    return html.replace('<span class="saved"', `<button class="btn v7-micb ${U.dictOn ? 'on' : ''} sm" data-act="mic-quick" title="${L('Dictar a omnIA', 'Dictate to omnIA')}" aria-label="${L('Dictar a omnIA', 'Dictate to omnIA')}">${ic(U.dictOn ? 'stop' : 'mic', 'sm')}<span class="lbl-hide">${L('Dictar', 'Dictate')}</span></button><span class="saved"`); };

  // ---------- Modo campo ----------
  U.secOf0 = U.secOf; U.secOf = (v, st) => v === 'field' ? 'plant' : U.secOf0(v, st);
  const head0 = U.secHead;
  U.secHead = function (a, ev) { const html = head0(a, ev); if (U.secOf(C.S.ui.view, C.S.ui.stage) !== 'plant' || C.S.ui.view === 'field') return html;
    const btn = `<button class="btn cyan sm v7-fmb" data-act="fm-open">${ic('mic', 'sm')}${L('Modo campo', 'Field mode')}</button>`;
    return html.includes('<div class="v7-tabs"') ? html.replace(/(<div class="v7-tabs" role="tablist">[\s\S]*?)<\/div>$/, '$1' + btn + '</div>') : html + btn; };
  A['fm-open'] = () => { const a = C.cur(); const ars = areasOf(a); if (!FM.area || !C.area(a, FM.area)) FM.area = (ars[0] || {}).id || null; FM.asset = null; C.S.ui.view = 'field'; U.navOpen = false; C.save(); R(); const m = document.querySelector('.main'); if (m) m.scrollTop = 0; };
  A['fm-exit'] = () => { if (U.dictOn) U.dictStop(); C.S.ui.view = 'wizard'; C.S.ui.stage = 3; C.save(); R(); };
  A['fm-area'] = el => { FM.area = el.dataset.id; FM.asset = null; R(); };
  A['fm-asset'] = el => { FM.asset = FM.asset === el.dataset.id ? null : el.dataset.id; R(); };
  A['fm-seen'] = el => { const a = C.cur(); const x = C.asset(a, el.dataset.id); if (!x) return; C.setVal(a, 'asset', x, 'validado', { src: 'campo', reason: L('Visto en planta (modo campo)', 'Seen on site (field mode)') }); C.save(); R(); U.toast(x.tag + L(' verificado: visto en planta', ' verified: seen on site')); };
  A['fm-ans'] = el => { const a = C.cur(); a.answers[el.dataset.q] = Object.assign({}, a.answers[el.dataset.q] || {}, { value: el.dataset.v, conf: 'Verificado', source: 'Campo', by: C.uname(C.S.userId), ts: now() }); C.log(a, `Respondió ${el.dataset.q} en campo: ${el.dataset.v}`, `Answered ${el.dataset.q} in the field: ${el.dataset.v}`); C.save(); R(); };
  const areasOf = a => { const inc = new Set(C.included(a).map(p => p.key)); return a.areas.filter(x => !C.isOut(x) && (x.procs || [x.proc]).some(k => inc.has(k) || !inc.size)); };

  U.views.field = function (a) {
    const ars = areasOf(a); const ar = C.area(a, FM.area) || ars[0];
    if (!ar) return `<div class="fm"><header class="fm-h"><button class="btn ghost sm" data-act="fm-exit">${ic('back', 'sm')}${L('Salir', 'Exit')}</button><div><small>${L('Modo campo', 'Field mode')}</small><b>${h(tx(a.cfg.plant))}</b></div></header><div class="v7-empty">${ic('map')}<span>${L('Aún no hay áreas aceptadas. Acepte las áreas propuestas en Planta o use «Iniciar con omnIA».', 'No accepted areas yet. Accept the proposed areas in Plant or use “Start with omnIA”.')}</span></div></div>`;
    FM.area = ar.id;
    const as = a.assets.filter(x => x.area === ar.id && !C.isOut(x));
    const procs = (ar.procs || [ar.proc]).filter(Boolean);
    const qs = C.applicable(a).map(x => x.q).filter(q => q.proc && procs.includes(q.proc)).slice(0, 8);
    const ver = as.filter(x => C.mat(a, 'asset', x) === 'validado' || C.mat(a, 'asset', x) === 'evaluado').length;
    const pend = C.props(a).filter(p => p.status === 'pend' && (FM.last.includes(p.id) || (p.src.type === 'dictado' && ((p.data.areaRef === 'id:' + ar.id) || as.some(x => p.data.assetRef === 't:' + x.tag || norm(p.data.tag) === norm(x.tag) || p.data.fromRef === 't:' + x.tag)))));
    const nph = x => C.evPhotos(a, 'asset', x.id).length; const nf = x => a.findings.filter(f => f.assets.includes(x.id)).length;
    const chips = ars.map(x => { const n = a.assets.filter(y => y.area === x.id && !C.isOut(y)); const v = n.filter(y => ['validado', 'evaluado'].includes(C.mat(a, 'asset', y))).length; return `<button class="fm-chip ${x.id === ar.id ? 'on' : ''}" data-act="fm-area" data-id="${x.id}">${h(tx(x.name).split('(')[0].trim())}<small>${v}/${n.length}</small></button>`; }).join('');
    const card = x => { const m = C.mat(a, 'asset', x); const on = FM.asset === x.id;
      return `<article class="fm-as ${on ? 'on' : ''} m-${m}"><button class="fm-asb" data-act="fm-asset" data-id="${x.id}" aria-pressed="${on}"><b>${h(x.tag)}</b><span>${h(tx(x.name))}</span><small>${h(tx(x.type || ''))}${x.mm ? ' · ' + h(x.mm) : ''}${x.year ? ' · ' + x.year : ''}</small><span class="fm-asm">${U.mat(m)}${nph(x) ? `<span class="v7-chip">${ic('camera', 'sm')}${nph(x)}</span>` : ''}${nf(x) ? `<span class="v7-chip warn">${ic('flag', 'sm')}${nf(x)}</span>` : ''}</span></button>
        <div class="fm-asa"><button class="btn ghost" data-act="capture" data-link="asset:${x.id}">${ic('camera', 'sm')}${L('Foto', 'Photo')}</button>${['validado', 'evaluado'].includes(m) ? `<span class="fm-ok">${ic('shield', 'sm')}${L('Verificado', 'Verified')}</span>` : `<button class="btn soft" data-act="fm-seen" data-id="${x.id}">${ic('check', 'sm')}${L('Visto en planta', 'Seen on site')}</button>`}</div></article>`; };
    const VALS = [['Sí', 'si'], ['Parcial', 'par'], ['No', 'no'], ['Desconocido', 'unk']];
    const qrow = q => { const r = a.answers[q.id] || {}; return `<div class="fm-q ${r.value ? 'done' : ''}"><p>${h(tx(q.text))}</p><div class="fm-qa">${VALS.map(([v, c]) => `<button class="${c}" data-act="fm-ans" data-q="${q.id}" data-v="${v}" aria-pressed="${r.value === v}">${h(tx(v))}</button>`).join('')}</div></div>`; };
    return `<div class="fm">
      <header class="fm-h"><button class="btn ghost sm" data-act="fm-exit">${ic('back', 'sm')}${L('Salir', 'Exit')}</button><div><small>${L('Modo campo', 'Field mode')} · ${h(tx(a.cfg.plant))}</small><b>${h(tx(ar.name))}</b></div><span class="fm-prog"><b>${ver}/${as.length}</b><small>${L('verificados', 'verified')}</small></span></header>
      <nav class="fm-chips" aria-label="${L('Áreas', 'Areas')}">${chips}</nav>
      ${pend.length ? `<section class="fm-props"><h3>${ic('spark', 'sm')}${L('omnIA entendió', 'omnIA understood')}</h3>${pend.map(p => U.propCard(a, p)).join('')}</section>` : ''}
      <h3 class="fm-h3">${L('Activos', 'Assets')} <span>${as.length}</span>${FM.asset ? `<small>${L('Lo que dicte se asociará a ', 'What you dictate will be linked to ')}<b>${h((C.asset(a, FM.asset) || {}).tag || '')}</b></small>` : `<small>${L('Toque un activo para dictar sobre él', 'Tap an asset to dictate about it')}</small>`}</h3>
      <div class="fm-list">${as.map(card).join('') || `<div class="v7-empty">${ic('list')}<span>${L('Sin activos en esta área. Dicte lo que ve: «Aquí hay un PLC-301 Allen-Bradley de 2010».', 'No assets in this area. Dictate what you see: “There is a PLC-301 Allen-Bradley from 2010 here”.')}</span></div>`}</div>
      ${qs.length ? `<h3 class="fm-h3">${L('Preguntas de esta área', 'Questions for this area')} <span>${qs.filter(q => (a.answers[q.id] || {}).value).length}/${qs.length}</span></h3><div class="fm-qs">${qs.map(qrow).join('')}</div>` : ''}
      <div class="fm-pad"></div>
      <footer class="fm-bar"><button class="fm-sb" data-act="capture" data-link="${FM.asset ? 'asset:' + FM.asset : 'area:' + ar.id}">${ic('camera')}<span>${L('Foto', 'Photo')}</span></button>
        <button class="fm-mic ${U.dictOn ? 'on' : ''}" data-act="mic-quick" aria-label="${U.dictOn ? L('Terminar dictado', 'Finish dictation') : L('Dictar', 'Dictate')}">${ic(U.dictOn ? 'stop' : 'mic')}<span>${U.dictOn ? L('Terminar', 'Finish') : L('Hablar', 'Speak')}</span></button>
        <button class="fm-sb" data-act="fm-note">${ic('edit')}<span>${L('Escribir', 'Type')}</span></button></footer>
    </div>`;
  };
  // en Modo campo el menú lateral se oculta para ganar espacio
  const r0 = U.render; U.render = function () { r0.apply(this, arguments); document.body.classList.toggle('fm-on', C.S.ui.view === 'field'); if (U.dictOn) live(); };
})();
