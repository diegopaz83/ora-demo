/* ORA demo — real executive PDF (jsPDF) in the active language, same data as the dashboard */
(function () {
  const C = window.ORA, I = window.ORA_I18N;
  const L = I.L, tx = I.tx;
  const NAVY = '#001c3f', BRIGHT = '#0a58eb', CYAN = '#00dcfa', MUTED = '#556578', LINE = '#dbe2ea', SOFT = '#f2f5f9', INK = '#1a2b44';
  const LV = { Alto: ['#c2353d', '#fbeaeb'], Medio: ['#b86e00', '#fff4e0'], Bajo: ['#1d7a4a', '#e5f7ee'], Pendiente: ['#6b7a8d', '#eef1f5'] };
  const PW = 210, PH = 297, ML = 18, MR = 18, CW = PW - ML - MR, TOP = 30, BOT = 276;

  const toB64 = buf => { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  const blobToDataURL = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  async function imgData(blob, mode, ratio) {
    const url = URL.createObjectURL(blob);
    try {
      const im = await loadImg(url); let sw = im.naturalWidth, sh = im.naturalHeight, sx = 0, sy = 0;
      if (mode === 'cover') { const r = sw / sh; if (r > ratio) { sw = sh * ratio; sx = (im.naturalWidth - sw) / 2; } else { sh = sw / ratio; sy = (im.naturalHeight - sh) / 2; } }
      const s = Math.min(1, 1400 / Math.max(sw, sh)); const cv = document.createElement('canvas'); cv.width = Math.round(sw * s); cv.height = Math.round(sh * s);
      cv.getContext('2d').drawImage(im, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
      return { data: cv.toDataURL('image/jpeg', 0.88), w: cv.width, h: cv.height };
    } finally { URL.revokeObjectURL(url); }
  }
  async function fetchData(path) { const r = await fetch(path); if (!r.ok) throw new Error(path); const d = await blobToDataURL(await r.blob()); const im = await loadImg(d); return { data: d, w: im.naturalWidth, h: im.naturalHeight }; }

  async function build(a) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    let F = 'helvetica';
    try {
      for (const [file, style] of [['Poppins-Regular.ttf', 'normal'], ['Poppins-SemiBold.ttf', 'bold'], ['Poppins-Light.ttf', 'light'], ['Poppins-Medium.ttf', 'medium']]) { const r = await fetch('fonts/' + file); if (!r.ok) throw 0; doc.addFileToVFS(file, toB64(await r.arrayBuffer())); doc.addFont(file, 'Poppins', style); }
      F = 'Poppins';
    } catch (e) { F = 'helvetica'; }
    const font = (st, sz, col) => { doc.setFont(F, F === 'helvetica' && (st === 'light' || st === 'medium') ? (st === 'medium' ? 'bold' : 'normal') : st); doc.setFontSize(sz); doc.setTextColor(col || INK); };
    const m = C.metrics(a); const ev = m.ev;
    const approved = a.reportStatus === 'Aprobado'; const mod = C.mod(a);
    const plant = tx(a.cfg.plant) || L('Instalación', 'Facility'), client = tx(a.cfg.client) || '';
    const logoW = await fetchData('assets/logo-white.png').catch(() => null);
    const logoB = await fetchData('assets/logo-blue.png').catch(() => null);
    const coverBg = await fetchData('assets/cover-bg.jpg').catch(() => null);
    const bands = {}; for (const k of [1, 2, 3]) bands[k] = await fetchData('assets/band-' + k + '.jpg').catch(() => null);
    const bandPages = new Set(); const veil = o => { doc.setGState(new doc.GState({ opacity: o })); doc.setFillColor(NAVY); };
    const photos = {};
    for (const p of a.photos.filter(x => C.photoPrintable ? C.photoPrintable(x) : x.inReport)) { const b = await C.getBlob(p); if (b) photos[p.id] = await imgData(b, 'contain'); }
    const coverP = a.photos.find(p => p.cover && (C.photoPrintable ? C.photoPrintable(p) : p.inReport));
    let coverImg = null; if (coverP) { const b = await C.getBlob(coverP); if (b) coverImg = await imgData(b, 'cover', PW / PH); }
    const LVT = l => l ? tx(l).toUpperCase() : L('PENDIENTE', 'PENDING');

    // cover
    doc.setFillColor(NAVY); doc.rect(0, 0, PW, PH, 'F');
    const cvr = coverImg || coverBg; if (cvr) { doc.addImage(cvr.data, 'JPEG', 0, 0, PW, PH); veil(0.8); doc.rect(0, 0, PW, PH, 'F'); veil(0.55); doc.rect(0, PH * 0.6, PW, PH * 0.4, 'F'); doc.setGState(new doc.GState({ opacity: 1 })); }
    doc.setFillColor(CYAN); doc.rect(ML, 58, 26, 1.2, 'F');
    if (logoW) doc.addImage(logoW.data, 'PNG', ML, 20, 46, 46 * logoW.h / logoW.w);
    font('medium', 8.5, CYAN); doc.text('OPERATIONAL RISK ASSESSMENT', ML, 52, { charSpace: 0.6 });
    font('light', 34, '#ffffff'); const tl = doc.splitTextToSize(plant, CW); doc.text(tl, ML, 78);
    let cy = 78 + tl.length * 13;
    font('normal', 11, '#c3d0e1'); doc.text(doc.splitTextToSize(client, CW), ML, cy); cy += 10;
    const meta = [[L('Modalidad', 'Modality'), C.modName(mod) + ' · ' + C.modDur(mod)], [L('Alcance', 'Scope'), m.inc.map(p => tx(p.name)).join(' · ') || '—'], [L('Fecha', 'Date'), C.fmtDate(new Date().toISOString())], [L('Versión', 'Version'), 'v' + a.reportVersion + ' · ' + tx(a.reportStatus) + ' · ' + a.code], [L('Responsable', 'Lead'), C.uname(a.leadId) || '—'], [L('Equipo', 'Team'), (a.team || []).map(C.uname).join(', ') || '—']];
    let my = 214;
    meta.forEach(([k, v]) => { font('medium', 7.5, '#8ea3bd'); doc.text(k.toUpperCase(), ML, my, { charSpace: 0.4 }); font('normal', 9.5, '#ffffff'); const lines = doc.splitTextToSize(v, CW - 34); doc.text(lines, ML + 32, my); my += Math.max(6.5, lines.length * 4.6 + 2); });
    doc.setDrawColor(approved ? '#8fe3b6' : '#ffd28a'); doc.setLineWidth(0.4); doc.roundedRect(PW - MR - 34, 20, 34, 9, 1.5, 1.5, 'S');
    font('bold', 8.5, approved ? '#8fe3b6' : '#ffd28a'); doc.text(approved ? L('APROBADO', 'APPROVED') : L('BORRADOR', 'DRAFT'), PW - MR - 17, 25.8, { align: 'center', charSpace: 0.6 });
    font('normal', 7.5, '#8ea3bd'); doc.text(L('DEMO · datos ilustrativos · Contenido ficticio por validar con especialistas de Omnicon', 'DEMO · illustrative data · Fictitious content to be validated by Omnicon specialists'), ML, PH - 12);

    let y = TOP;
    const page = () => { doc.addPage(); y = TOP; };
    const ensure = hh => { if (y + hh > BOT) page(); };
    const outline = [];
    const H1 = (n, t, band) => { outline.push(n + ' ' + t); if (band && bands[band]) { page(); bandPages.add(doc.getNumberOfPages()); doc.addImage(bands[band].data, 'JPEG', 0, 0, PW, 42); veil(0.78); doc.rect(0, 0, PW, 42, 'F'); doc.setGState(new doc.GState({ opacity: 1 })); font('medium', 8, CYAN); doc.text(n, ML, 25, { charSpace: 0.5 }); font('bold', 19, '#ffffff'); doc.text(t, ML, 34); y = 54; return; }
      if (y > TOP + 2) { if (y + 72 > BOT) page(); else y += 4; } font('medium', 8, BRIGHT); doc.text(n, ML, y, { charSpace: 0.5 }); font('bold', 17, NAVY); doc.text(t, ML, y + 8); doc.setDrawColor(LINE); doc.setLineWidth(0.3); doc.line(ML, y + 12, PW - MR, y + 12); y += 19; };
    const H2 = t => { outline.push('  ' + t); ensure(14); font('bold', 11, NAVY); doc.text(t, ML, y); y += 6; };
    const P = (t, sz, col, w, x) => { font('normal', sz || 9.2, col || INK); const lines = doc.splitTextToSize(t, w || CW); const lh = (sz || 9.2) * 0.47; lines.forEach(l => { ensure(lh); doc.text(l, x || ML, y); y += lh; }); y += 1.5; };
    const bullet = (t, col) => { font('normal', 9.2, INK); const lines = doc.splitTextToSize(t, CW - 6); ensure(lines.length * 4.4 + 1); doc.setFillColor(col || BRIGHT); doc.circle(ML + 1.3, y - 1.2, 0.9, 'F'); doc.text(lines, ML + 5, y); y += lines.length * 4.4 + 1.6; };
    const pill = (x, yy, txt, lv) => { const [fg, bg] = LV[lv] || LV.Pendiente; font('bold', 7.5, fg); const w = doc.getTextWidth(txt) + 6; doc.setFillColor(bg); doc.roundedRect(x, yy - 3.6, w, 5.2, 2.6, 2.6, 'F'); doc.text(txt, x + 3, yy + 0.1); return w; };
    const table = (head, body, opts) => {
      doc.autoTable(Object.assign({ head: [head], body, startY: y, margin: { left: ML, right: MR, top: TOP, bottom: PH - BOT }, theme: 'grid',
        styles: { font: F, fontSize: 8, cellPadding: 2.2, textColor: INK, lineColor: LINE, lineWidth: 0.2, valign: 'top', overflow: 'linebreak' },
        headStyles: { font: F, fontStyle: 'bold', fillColor: NAVY, textColor: '#ffffff', fontSize: 7.8 }, alternateRowStyles: { fillColor: '#f8fafc' }, rowPageBreak: 'avoid' }, opts || {}));
      y = doc.lastAutoTable.finalY + 6;
    };

    // 1. executive summary
    H1('01', L('Resumen ejecutivo', 'Executive summary'), 1);
    if (a.demo && I.lang === 'en') P('Example content pending translation: the names of processes, questions, scenarios, findings and interventions in this DEMO assessment are still in Spanish and will be translated once the content is final.', 8.5, MUTED);
    const top = a.scenarios.filter(s => C.LEVEL(s.C, s.P)).sort((x, y2) => (y2.C * 10 + y2.P) - (x.C * 10 + x.P));
    const spof = C.sharedControllers(a);
    const procList = m.inc.map(p => tx(p.name)).join(', ') || '—';
    P(L(`Este informe presenta los resultados del Operational Risk Assessment de ${plant} (${client}), modalidad ${C.modName(mod)} (${C.modDur(mod)}). La evaluación cubrió ${m.inc.length} proceso(s) crítico(s) seleccionado(s): ${procList}. ${a.cfg.modality === 'light' ? 'Es un diagnóstico preliminar focalizado: los hallazgos no representan una evaluación integral de la planta.' : ''}`,
      `This report presents the results of the Operational Risk Assessment of ${plant} (${client}), ${C.modName(mod)} modality (${C.modDur(mod)}). The assessment covered ${m.inc.length} selected critical process(es): ${procList}. ${a.cfg.modality === 'light' ? 'It is a focused preliminary diagnosis: findings do not represent a whole-plant assessment.' : ''}`));
    const spofTxt = spof.map(x => x.pumps.map(p => p.tag).join(L(' y ', ' and ')) + L(' dependen de ', ' depend on ') + x.plc.tag).join('; ');
    P(L(`Se identificaron ${m.scn.length} escenarios de riesgo: ${m.lv.Alto} alto, ${m.lv.Medio} medio, ${m.lv.Bajo} bajo y ${m.lv.Pendiente} pendiente(s) de evaluación por falta de información verificable. ${spof.length ? `El hallazgo principal es una dependencia común de control: ${spofTxt}. La redundancia mecánica existente no implica redundancia del control.` : ''}`,
      `${m.scn.length} risk scenarios were identified: ${m.lv.Alto} high, ${m.lv.Medio} medium, ${m.lv.Bajo} low and ${m.lv.Pendiente} pending assessment due to lack of verifiable information. ${spof.length ? `The main finding is a common control dependency: ${spofTxt}. Existing mechanical redundancy does not imply control redundancy.` : ''}`));
    ensure(42);
    const K = [[`${m.procEval.length}/${m.procs.length}`, L('Procesos evaluados', 'Processes assessed'), L('con ≥1 escenario clasificado', 'with ≥1 rated scenario')], [`${m.scn.length}`, L('Escenarios', 'Scenarios'), `${m.lv.Alto} ${tx('Alto').toLowerCase()} · ${m.lv.Medio} ${tx('Medio').toLowerCase()} · ${m.lv.Pendiente} ${L('pend.', 'pend.')}`], [`${m.ctlVer}/${m.ctlTotal}`, L('Controles verificados', 'Controls verified'), L('de los registrados', 'of those recorded')], [`${m.reqOk}/${m.reqTotal}`, L('Cobertura de evidencia', 'Evidence coverage'), `${m.photos} ${L('fotos', 'photos')} · ${m.reqJust + m.reqNone} ${L('pendientes', 'pending')}`],
      [`${m.appDone}/${m.appTotal}`, L('Preguntas respondidas', 'Questions answered'), `${m.unknown} ${L('desconocidas', 'unknown')}`], [`${a.findings.length}`, L('Hallazgos', 'Findings'), L('trazables a respuesta y activo', 'traceable to answer and asset')], [`${a.recs.length}`, L('Acciones en hoja de ruta', 'Roadmap actions'), `${m.recHigh} ${L('de prioridad alta', 'high priority')}`], [`${ev.done}/${ev.total}`, L('Completitud', 'Completeness'), L('criterios cumplidos', 'criteria met')]];
    const kw = (CW - 9) / 4;
    K.forEach((k, i) => { const x = ML + (i % 4) * (kw + 3), yy = y + Math.floor(i / 4) * 21; doc.setFillColor(SOFT); doc.roundedRect(x, yy, kw, 18, 2, 2, 'F'); font('bold', 14, NAVY); doc.text(k[0], x + 3.5, yy + 7.5); font('medium', 7.4, INK); doc.text(k[1], x + 3.5, yy + 12); font('normal', 6.6, MUTED); doc.text(doc.splitTextToSize(k[2], kw - 6)[0], x + 3.5, yy + 15.6); });
    y += 46;
    H2(L('Riesgos prioritarios', 'Priority risks'));
    top.slice(0, 4).forEach(s => { ensure(12); const l = C.LEVEL(s.C, s.P); const w = pill(ML, y, LVT(l), l); font('bold', 9, INK); const lines = doc.splitTextToSize(s.id + ' · ' + tx(s.title), CW - w - 4); doc.text(lines, ML + w + 3, y); y += lines.length * 4.4 + 2.4; });
    a.scenarios.filter(s => !C.LEVEL(s.C, s.P)).forEach(s => { ensure(10); const w = pill(ML, y, LVT(null), 'Pendiente'); font('normal', 9, INK); const lines = doc.splitTextToSize(s.id + ' · ' + tx(s.title) + L(' — requiere verificación antes de clasificar.', ' — requires verification before rating.'), CW - w - 4); doc.text(lines, ML + w + 3, y); y += lines.length * 4.4 + 2.4; });
    y += 2; H2(L('Decisiones recomendadas', 'Recommended decisions'));
    a.recs.filter(r => r.pr === 'Alta').forEach(r => bullet(`${r.id} · ${tx(r.title)} (${tx(r.hz)}).`, NAVY));
    y += 2; P(L('Clasificación con matriz ordinal 3×3 propuesta (metodología v0.1, pendiente de validación). Las categorías no representan probabilidades estadísticas. Datos ficticios con fines de demostración.', 'Rated with a proposed ordinal 3×3 matrix (methodology v0.1, pending validation). Categories do not represent statistical probabilities. Fictitious data for demonstration purposes.'), 8, MUTED);

    // 2. scope
    H1('02', L('Alcance, metodología y limitaciones', 'Scope, methodology and limitations'));
    P(tx(a.cfg.scope) || L('Alcance no especificado.', 'Scope not specified.'));
    if (a.cfg.exclusions) P(L('Exclusiones: ', 'Exclusions: ') + tx(a.cfg.exclusions), 9, MUTED);
    const stL = { incluido: L('Incluido', 'Included'), fuera: L('Fuera de alcance', 'Out of scope'), na: L('No aplica', 'Not applicable'), desconocido: L('Desconocido', 'Unknown') };
    table([L('Proceso', 'Process'), L('Estado', 'Status'), L('Criticidad', 'Criticality'), L('Justificación', 'Justification')], a.processes.map(p => [tx(p.name), stL[p.status] || L('Sin definir', 'Not set'), tx(p.crit) || '—', tx(p.just) || '—']), { columnStyles: { 0: { cellWidth: 42, fontStyle: 'bold' }, 1: { cellWidth: 26 }, 2: { cellWidth: 20 } } });
    H2(L('Método', 'Method'));
    P(L('Entrevista con operaciones, selección de procesos críticos, recorrido focalizado autorizado, cuestionario adaptativo (núcleo por modalidad y ramificaciones por contexto, hallazgo o incertidumbre), registro de evidencia fotográfica y evaluación de escenarios con consecuencia (C) y probabilidad considerando controles existentes (P). «Desconocido» se registra como brecha de información y no como riesgo automático; «No aplica» exige justificación.', 'Operations interview, selection of critical processes, authorized focused walkdown, adaptive questionnaire (core per modality plus branches by context, finding or uncertainty), photo evidence recording, and scenario assessment with consequence (C) and likelihood considering existing controls (P). “Unknown” is recorded as an information gap, not automatic risk; “Not applicable” requires justification.'));

    if (C.ensureV6) C.ensureV6(a);
    const fmtT = t => !t || t.value == null || t.value === '' ? L('Sin registrar', 'Not recorded') : t.value + ' ' + t.unit + (t.conf ? ' · ' + tx(t.conf) : '');
    H2(L('Prioridades del negocio y tolerancias', 'Business priorities and tolerances'));
    table([L('Proceso', 'Process'), L('Tipo', 'Type'), L('Consecuencia de interrupción', 'Interruption consequence'), L('Tolerancia', 'Tolerance'), L('Fuente', 'Source')], m.inc.map(p => [tx(p.name) + '\n' + tx(p.crit || ''), tx(p.type || ''), tx(p.interruption || '—') + (p.capacityAffected ? '\n' + L('Capacidad: ', 'Capacity: ') + tx(p.capacityAffected) : ''), fmtT(p.tolerance), tx((p.tolerance || {}).source || p.source || '—')]),
      { columnStyles: { 0: { cellWidth: 38, fontStyle: 'bold' }, 1: { cellWidth: 20 }, 3: { cellWidth: 26 }, 4: { cellWidth: 34 } } });
    // 3. results
    H1('03', L('Resultados de la evaluación', 'Assessment results'));
    ensure(80);
    const y0 = y; H2(L('Matriz de riesgos 3×3', '3×3 risk matrix'));
    const mx = ML + 14, my0 = y + 2, cw = 22, ch = 15;
    for (let p = 3; p >= 1; p--) for (let c = 1; c <= 3; c++) {
      const l = C.LEVEL(c, p); const n = m.scn.filter(s => s.C === c && s.P === p).length; const [fg, bg] = LV[l];
      const x = mx + (c - 1) * (cw + 1.5), yy = my0 + (3 - p) * (ch + 1.5);
      doc.setFillColor(bg); doc.roundedRect(x, yy, cw, ch, 1.5, 1.5, 'F'); font('bold', 13, n ? fg : '#c0c8d2'); doc.text(String(n), x + cw / 2, yy + 8, { align: 'center' }); font('medium', 6.5, fg); doc.text(tx(l), x + cw / 2, yy + 12.3, { align: 'center' });
    }
    font('normal', 6.8, MUTED);
    [tx('Alta'), tx('Media'), tx('Baja')].forEach((t, i) => doc.text(t, mx - 2, my0 + i * (ch + 1.5) + 9, { align: 'right' }));
    [tx('Baja'), tx('Media'), tx('Alta')].forEach((t, i) => doc.text(t, mx + i * (cw + 1.5) + cw / 2, my0 + 3 * (ch + 1.5) + 3, { align: 'center' }));
    doc.text(L('Consecuencia →', 'Consequence →'), mx + 1.5 * (cw + 1.5), my0 + 3 * (ch + 1.5) + 7.5, { align: 'center' });
    doc.text(L('Probabilidad →', 'Likelihood →'), ML + 2, my0 + 3 * (ch + 1.5) - 2, { angle: 90 });
    font('normal', 7.5, INK); doc.text(L('Pendientes de evaluación (fuera de matriz): ', 'Pending assessment (outside matrix): ') + m.lv.Pendiente, mx, my0 + 3 * (ch + 1.5) + 13);
    const bx = ML + 96, bw = CW - 96; let by = y0 + 6; font('bold', 11, NAVY); doc.text(L('Escenarios por proceso', 'Scenarios by process'), bx, y0);
    const maxV = Math.max(1, ...m.byProc.map(r => r.Alto + r.Medio + r.Bajo + r.Pendiente)); const unit = (bw - 4) / maxV;
    m.byProc.forEach(r => { font('medium', 7.6, INK); doc.text(doc.splitTextToSize(r.name, bw)[0], bx, by + 3); let x = bx; by += 5;
      ['Alto', 'Medio', 'Bajo', 'Pendiente'].forEach(k => { if (r[k]) { doc.setFillColor(LV[k][0]); doc.roundedRect(x, by, r[k] * unit - 1, 6, 1, 1, 'F'); font('bold', 7, '#ffffff'); doc.text(String(r[k]), x + r[k] * unit / 2 - .5, by + 4.3, { align: 'center' }); x += r[k] * unit; } });
      if (!(r.Alto + r.Medio + r.Bajo + r.Pendiente)) { font('normal', 7, MUTED); doc.text(L('Sin escenarios: no evaluado', 'No scenarios: not assessed'), bx, by + 4); }
      by += 10; });
    let lx = bx; ['Alto', 'Medio', 'Bajo', 'Pendiente'].forEach(k => { doc.setFillColor(LV[k][0]); doc.rect(lx, by, 3, 3, 'F'); font('normal', 7, MUTED); doc.text(tx(k), lx + 4, by + 2.6); lx += doc.getTextWidth(tx(k)) + 9; });
    y = Math.max(my0 + 3 * (ch + 1.5) + 20, by + 10);
    ensure(96); H2(L('Radar de dimensiones de control', 'Control dimensions radar'));
    const rcx = ML + 46, rcy = y + 40, RR = 30, n = m.radar.length;
    const rp = (i, v) => { const ang = -Math.PI / 2 + i * 2 * Math.PI / n; return [rcx + Math.cos(ang) * RR * v, rcy + Math.sin(ang) * RR * v]; };
    doc.setDrawColor('#d6dee8'); doc.setLineWidth(0.2);
    [.25, .5, .75, 1].forEach(r => { for (let i = 0; i < n; i++) { const p1 = rp(i, r), p2 = rp((i + 1) % n, r); doc.line(p1[0], p1[1], p2[0], p2[1]); } });
    m.radar.forEach((d, i) => { const p = rp(i, 1); if (d.idx == null) doc.setLineDashPattern([1, 1], 0); doc.line(rcx, rcy, p[0], p[1]); doc.setLineDashPattern([], 0); });
    const avail = m.radar.map((d, i) => d.idx == null ? null : rp(i, d.idx / 100)).filter(Boolean);
    if (avail.length >= 3) {
      const rel = avail.slice(1).map((p, i) => [p[0] - avail[i][0], p[1] - avail[i][1]]);
      doc.setGState(new doc.GState({ opacity: 0.2 })); doc.setFillColor(BRIGHT); doc.lines(rel, avail[0][0], avail[0][1], [1, 1], 'F', true); doc.setGState(new doc.GState({ opacity: 1 }));
      doc.setDrawColor(BRIGHT); doc.setLineWidth(0.6); doc.lines(rel, avail[0][0], avail[0][1], [1, 1], 'S', true);
    }
    avail.forEach(p => { doc.setFillColor(BRIGHT); doc.circle(p[0], p[1], 0.9, 'F'); });
    m.radar.forEach((d, i) => { const p = rp(i, 1.22); const al = Math.abs(p[0] - rcx) < 3 ? 'center' : p[0] > rcx ? 'left' : 'right'; font('medium', 6.8, INK); doc.text(tx(d.dim), p[0], p[1], { align: al }); font('normal', 6.3, MUTED); doc.text(d.idx == null ? L('sin datos', 'no data') : String(d.idx), p[0], p[1] + 3, { align: al }); });
    const tx0 = ML + 112, tw = CW - 112;
    table([L('Dimensión', 'Dimension'), L('Índice', 'Index'), L('Sí/No', 'Yes/No'), L('Desc.', 'Unk.')], m.radar.map(d => [tx(d.dim), d.idx == null ? L('sin datos', 'no data') : String(d.idx), d.yes + '/' + d.no, String(d.unk)]), { startY: y + 4, margin: { left: tx0, right: MR, top: TOP, bottom: PH - BOT }, tableWidth: tw, styles: { font: F, fontSize: 7.2, cellPadding: 1.5, textColor: INK, lineColor: LINE, lineWidth: 0.2 } });
    y = Math.max(y, rcy + RR + 14);
    P(L('Índice relativo de control (0–100) = respuestas «Sí» ÷ (respuestas «Sí» + «No») × 100, solo en preguntas cuyo «Sí» indica un control presente. «Desconocido» y «No aplica» no puntúan. Con menos de dos respuestas se reporta «sin datos», no cero. No es una probabilidad.', 'Relative control index (0–100) = “Yes” answers ÷ (“Yes” + “No” answers) × 100, only for questions where “Yes” means a control is present. “Unknown” and “Not applicable” are not scored. With fewer than two answers it shows “no data”, not zero. It is not a probability.'), 7.6, MUTED);

    const LCN = { active: L('Activo', 'Active'), mature: L('Activo maduro', 'Active mature'), eol: L('Fin de vida', 'End of life'), discontinued: L('Descontinuado', 'Discontinued'), unknown: L('Por verificar', 'To verify') };
    H2(L('Cobertura por dominio de revisión', 'Coverage by review domain'));
    table([L('Dominio', 'Domain'), L('Estado', 'Status'), L('Fuente', 'Source'), L('Vacíos o justificación', 'Gaps or justification')], a.coverage.map(c => [tx(window.ORA_DATA.DOMAIN_NAME ? window.ORA_DATA.DOMAIN_NAME(c.domain) : c.domain), tx(c.state), tx(c.source || '—'), tx([c.gaps, c.just].filter(Boolean).join(' · ') || '—')]),
      { columnStyles: { 0: { cellWidth: 36, fontStyle: 'bold' }, 1: { cellWidth: 22 }, 2: { cellWidth: 40 } } });
    P(L('Un dominio no revisado se informa como limitación, no como riesgo bajo.', 'A domain not reviewed is reported as a limitation, not as low risk.'), 8.5, MUTED);
    const ib = a.assets.filter(x => !C.isOut(x) && x.family);
    if (ib.length) { H2(L('Base instalada y ciclo de vida', 'Installed base and lifecycle'));
      table(['TAG', L('Equipo', 'Equipment'), L('Fabricante · modelo · versión', 'Manufacturer · model · version'), L('Ciclo de vida', 'Lifecycle'), L('Fuente', 'Source'), L('Soporte / repuestos / redundancia', 'Support / spares / redundancy')], ib.map(x => { const lc = x.lifecycle || { status: 'unknown' }; return [x.tag, tx(x.name), [x.mfr, x.model, x.version].filter(Boolean).join(' · ') || '—', LCN[lc.status] || '—', (lc.source || L('Sin fuente', 'No source')) + (lc.consultedAt ? '\n' + lc.consultedAt : ''), [x.support, x.spares, x.redundancy].filter(Boolean).map(tx).join(' · ') || '—']; }),
        { columnStyles: { 0: { cellWidth: 20, fontStyle: 'bold' }, 3: { cellWidth: 22 } } });
      P(L('El estado de ciclo de vida proviene de la fuente del fabricante indicada; no se infiere de la antigüedad. Datos de fabricante ficticios en el DEMO.', 'Lifecycle status comes from the stated vendor source; it is not inferred from age. Vendor data is fictitious in the DEMO.'), 8.5, MUTED); }
    // 4. risk sheets
    H1('04', L('Fichas de riesgo', 'Risk sheets'), 2);
    for (const s of a.scenarios) {
      const l = C.LEVEL(s.C, s.P) || 'Pendiente'; const [fg, bg] = LV[l];
      const ph = a.photos.filter(p => photos[p.id] && p.links && (p.links.scenario === s.id || s.findings.includes(p.links.finding))).slice(0, 2);
      const recs = a.recs.filter(r => r.sc.includes(s.id)); const fnd = a.findings.filter(f => s.findings.includes(f.id));
      font('normal', 8.4); const jc = doc.splitTextToSize('C: ' + (tx(s.justC) || '—'), CW / 2 - 6), jp = doc.splitTextToSize('P: ' + (tx(s.justP) || L('Pendiente: faltan datos verificables.', 'Pending: verifiable data missing.')), CW / 2 - 6);
      const est = 24 + Math.max(jc.length, jp.length) * 3.9 + s.controls.length * 4.2 + fnd.length * 8 + recs.length * 4.6 + (ph.length ? 46 : 0) + 14;
      ensure(Math.min(est, BOT - TOP));
      doc.setFillColor(bg); doc.roundedRect(ML, y, CW, 13, 2, 2, 'F');
      font('bold', 10.5, NAVY); doc.text(doc.splitTextToSize(s.id + ' · ' + tx(s.title), CW - 44)[0], ML + 4, y + 5.6);
      font('normal', 7.4, MUTED); doc.text(`${C.procName(a, s.proc)} · ${s.assets.map(x => C.assetLbl(a, x)).join(', ')} · ${L('confianza', 'confidence')} ${tx(s.conf).toLowerCase()}`, ML + 4, y + 10.2);
      font('bold', 8.5, fg); doc.text(l === 'Pendiente' ? LVT(null) : C.lvlText(l).toUpperCase(), PW - MR - 4, y + 5.6, { align: 'right' }); font('normal', 7.4, fg); doc.text(`C ${s.C || '—'} · P ${s.P || '—'}`, PW - MR - 4, y + 10.2, { align: 'right' });
      y += 18;
      font('normal', 8.4, INK); doc.text(jc, ML, y); doc.text(jp, ML + CW / 2 + 2, y); y += Math.max(jc.length, jp.length) * 3.9 + 3;
      if (s.cause || s.cons) P(L('Causa: ', 'Cause: ') + (tx(s.cause) || '—') + '  ·  ' + L('Consecuencia: ', 'Consequence: ') + (tx(s.cons) || '—'), 8.2, MUTED);
      font('bold', 8, NAVY); doc.text(L('Controles existentes', 'Existing controls'), ML, y); y += 4.4;
      s.controls.forEach(c => { const col = c.st === 'Verificado' ? LV.Bajo[0] : c.st === 'Ausente' ? LV.Alto[0] : LV.Medio[0]; font('normal', 8.2, INK); doc.text('• ' + tx(c.name), ML + 2, y); font('medium', 7.6, col); doc.text(tx(c.st), PW - MR, y, { align: 'right' }); y += 4.2; });
      if (!s.controls.length) { font('normal', 8, MUTED); doc.text(L('Sin controles registrados.', 'No controls recorded.'), ML + 2, y); y += 4.2; }
      if (fnd.length) { y += 1; font('bold', 8, NAVY); doc.text(L('Trazabilidad', 'Traceability'), ML, y); y += 4.4; fnd.forEach(f => { const ans = f.q ? (a.answers[f.q] || {}).value : null; P(`${f.id} ${tx(f.title)} ← ${f.q ? L('respuesta ', 'answer ') + f.q + ': ' + (tx(ans) || '—') + ' · ' : ''}${L('activos', 'assets')} ${f.assets.map(x => C.assetLbl(a, x)).join(', ')}`, 8, INK, CW - 2, ML + 2); }); }
      if (ph.length) { ensure(46); const w = (CW - 4) / 2; ph.forEach((p, i) => { const im = photos[p.id]; const bh = 34; const r = Math.min(w / im.w, bh / im.h); const iw = im.w * r, ih = im.h * r; const x = ML + i * (w + 4); doc.setFillColor(SOFT); doc.rect(x, y, w, bh, 'F'); doc.addImage(im.data, 'JPEG', x + (w - iw) / 2, y + (bh - ih) / 2, iw, ih); font('medium', 7.2, INK); doc.text(doc.splitTextToSize(p.id + ' · ' + tx(p.title), w)[0], x, y + bh + 4); }); y += 42; }
      if (recs.length) { font('bold', 8, NAVY); doc.text(L('Recomendación', 'Recommendation'), ML, y); y += 4.4; recs.forEach(r => P(`${r.id} · ${tx(r.title)} — ${tx(r.hz)}`, 8.2, INK, CW - 2, ML + 2)); }
      y += 4; doc.setDrawColor(LINE); doc.line(ML, y - 2, PW - MR, y - 2); y += 3;
    }

    // 5. photos
    ensure(112);
    H1('05', L('Evidencias fotográficas', 'Photo evidence'));
    const inRep = a.photos.filter(p => photos[p.id]);
    if (!inRep.length) P(L('No hay fotografías marcadas para el informe.', 'No photos marked for the report.'), 9, MUTED);
    const gw = (CW - 6) / 2, gh = 62;
    for (let i = 0; i < inRep.length; i += 2) {
      ensure(gh + 26);
      inRep.slice(i, i + 2).forEach((p, j) => {
        const im = photos[p.id]; const x = ML + j * (gw + 6); const r = Math.min(gw / im.w, gh / im.h); const iw = im.w * r, ih = im.h * r;
        doc.setFillColor(SOFT); doc.rect(x, y, gw, gh, 'F'); doc.addImage(im.data, 'JPEG', x + (gw - iw) / 2, y + (gh - ih) / 2, iw, ih);
        font('bold', 8.4, NAVY); doc.text(doc.splitTextToSize(tx(p.title), gw)[0], x, y + gh + 4.5);
        font('normal', 7.4, INK); const cl = doc.splitTextToSize(tx(p.caption) || '', gw).slice(0, 3); doc.text(cl, x, y + gh + 8.5);
        const Lk = p.links || {}; const lk = [Lk.area && C.areaName(a, Lk.area), Lk.asset && C.assetLbl(a, Lk.asset), Lk.q, Lk.finding, Lk.scenario].filter(Boolean).join(' · ');
        font('normal', 6.8, MUTED); doc.text(doc.splitTextToSize(`${p.id} · ${C.fmtDate(p.ts, true)} · ${p.author} · ${tx(p.review)}${lk ? ' · ' + lk : ''}`, gw).slice(0, 2), x, y + gh + 8.5 + cl.length * 3.4 + 0.6);
      });
      y += gh + 26;
    }

    // 6. roadmap
    H1('06', L('Hallazgos, oportunidades y hoja de ruta priorizada', 'Findings, opportunities and prioritized roadmap'), 3);
    H2('Finding · Consequence · Opportunity · Impact');
    if (a.opportunities.length) table([L('Hallazgo', 'Finding'), L('Consecuencia', 'Consequence'), L('Oportunidad', 'Opportunity'), L('Impacto esperado', 'Expected impact')], a.opportunities.map(o => [o.findings.map(f => { const x = a.findings.find(q => q.id === f); return f + (x ? ' · ' + tx(x.title) : ''); }).join('\n'), tx(o.consequence || '—') + (o.scenarios.length ? '\n' + o.scenarios.join(', ') : ''), o.id + ' · ' + tx(o.title), tx((o.impact || {}).dimension || '') + ': ' + tx((o.impact || {}).text || '') + '\n' + tx((o.impact || {}).estimate || 'Por estimar') + ((o.impact || {}).basis ? '\n' + L('Base: ', 'Basis: ') + tx(o.impact.basis) : '')]));
    else P(L('Sin oportunidades registradas.', 'No opportunities recorded.'), 9, MUTED);
    const SN = { mantener: L('Mantener', 'Maintain'), estabilizar: L('Estabilizar', 'Stabilize'), actualizar: L('Actualizar', 'Update'), migrar: L('Migrar', 'Migrate') };
    const FN = { exposicion: L('Exposición crítica', 'Critical exposure'), recuperacion: L('Brechas de recuperación', 'Recovery gaps'), actualizacion: L('Actualizaciones selectivas', 'Selective updates'), migracion: L('Migración de plataforma', 'Platform migration') };
    const MSN = { scope: L('Alcance', 'Scope'), funding: L('Financiación', 'Funding'), released: L('Autorización', 'Release') };
    const V = a.interventions.filter(v => v.status !== 'descartada').slice().sort((x, y2) => x.order - y2.order);
    P(L(`Intervenciones ordenadas y agrupadas en fases según la capacidad de inversión del cliente. Detalle proporcional a la modalidad ${C.modName(mod)}: costos orientativos o «Por estimar», sin ingeniería de detalle ni compromiso de implementación. Evaluación técnicamente independiente de oportunidades comerciales.`, `Interventions ordered and grouped in phases by the client investment capacity. Detail proportional to the ${C.modName(mod)} modality: indicative costs or “To estimate”, no detailed engineering or implementation commitment. Technically independent of commercial opportunities.`));
    a.phases.forEach(ph => {
      const pv = V.filter(v => v.phase === ph.n); H2(L('Fase ', 'Phase ') + ph.n + ' · ' + tx(ph.name) + (ph.horizon ? ' · ' + ph.horizon : ''));
      P(Object.keys(MSN).map(k => MSN[k] + ': ' + tx(ph.milestones[k])).join(' · '), 8.5, MUTED);
      if (!pv.length) { P(L('Sin intervenciones en esta fase.', 'No interventions in this phase.'), 9, MUTED); return; }
      table(['#', L('Intervención', 'Intervention'), L('Estrategia · frente', 'Strategy · front'), L('Atiende', 'Addresses'), L('Costo', 'Cost'), L('Estado', 'Status')], pv.map(v => [String(v.order), v.id + ' · ' + tx(v.title) + (v.kind === 'estudio' ? '\n' + L('Estudio previo', 'Prior study') : '') + (v.priorityRationale ? '\n' + tx(v.priorityRationale) : ''), (SN[v.strategy] || L('Por clasificar', 'To classify')) + '\n' + (FN[v.front] || '—'), v.scenarios.map(x => { const s = a.scenarios.find(q => q.id === x); return x + (s ? ' (' + (tx(C.LEVEL(s.C, s.P)) || L('Pend.', 'Pend.')) + ')' : ''); }).concat(v.opportunities).join('\n') + (v.dependsOn.length ? '\n' + L('Depende de ', 'Depends on ') + v.dependsOn.join(', ') : ''), tx((v.cost || {}).range || 'Por estimar'), tx(v.status)]),
        { columnStyles: { 0: { cellWidth: 8, fontStyle: 'bold' }, 1: { cellWidth: 62 }, 2: { cellWidth: 28 }, 3: { cellWidth: 30 }, 4: { cellWidth: 22 } } });
    });
    if (a.dispositions.length) { H2(L('Disposición recomendada por activo o sistema', 'Recommended disposition by asset or system'));
      table([L('Activo / sistema', 'Asset / system'), L('Estrategia', 'Strategy'), L('Justificación', 'Justification'), L('Valida', 'Validated by')], a.dispositions.map(d => { const x = a.assets.find(q => q.id === d.target) || a.systems.find(q => q.id === d.target) || {}; return [(x.tag ? x.tag + ' · ' : '') + tx(x.name || d.target), SN[d.strategy] || '—', tx(d.justification) + (d.alternatives ? '\n' + L('Alternativa: ', 'Alternative: ') + tx(d.alternatives) : ''), C.uname(d.validatedBy)]; }),
        { columnStyles: { 0: { cellWidth: 44, fontStyle: 'bold' }, 1: { cellWidth: 22 }, 3: { cellWidth: 30 } } }); }
    P(L('Completar una intervención no equivale a riesgo mitigado: al cerrarla se verifica la eficacia y se reevalúa el escenario.', 'Completing an intervention does not mean mitigated risk: on closing, effectiveness is verified and the scenario reassessed.'), 8.5, MUTED);
    // 7. limitations
    H1('07', L('Limitaciones, pendientes y excepciones', 'Limitations, open items and exceptions'));
    const reqRows = ev.reqs.filter(r => r.status !== 'capturada').map(r => [r.label, C.PH_LBL[r.status], r.res ? (tx(r.res.reason) + ': ' + tx(r.res.note)) : L('Sin explicación registrada', 'No explanation recorded')]);
    if (reqRows.length) { H2(L('Evidencia fotográfica faltante', 'Missing photo evidence')); table([L('Elemento', 'Item'), L('Estado', 'Status'), L('Motivo', 'Reason')], reqRows, { columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 36 } } }); P(L('Una justificación no constituye evidencia ni elimina la incertidumbre técnica asociada.', 'A justification is not evidence and does not remove the associated technical uncertainty.'), 8, MUTED); }
    const gaps = ev.app.filter(x => (a.answers[x.q.id] || {}).value === 'Desconocido').map(x => x.q.id + ': ' + tx(x.q.text) + (a.answers[x.q.id].note ? ' — ' + tx(a.answers[x.q.id].note) : ''));
    const pend = ev.app.filter(x => (x.q.req || x.cond) && !C.answerOK(a, x.q)).map(x => x.q.id + ': ' + tx(x.q.text));
    if (gaps.length) { H2(L('Brechas de información (respuestas desconocidas)', 'Information gaps (unknown answers)')); gaps.forEach(g => bullet(g, '#7543ff')); }
    if (pend.length) { H2(L('Preguntas esenciales sin responder', 'Unanswered essential questions')); pend.forEach(g => bullet(g, MUTED)); }
    const outP = a.processes.filter(p => p.status !== 'incluido' && p.status);
    if (outP.length) { H2(L('Procesos no evaluados', 'Processes not assessed')); outP.forEach(p => bullet(`${tx(p.name)} — ${stL[p.status]}: ${tx(p.just)}`, MUTED)); }
    if (C.modelBase) { const b = C.modelBase(a); const K = [['area', L('Áreas', 'Areas')], ['system', L('Sistemas OT', 'OT systems')], ['asset', L('Activos', 'Assets')], ['dep', L('Dependencias', 'Dependencies')]];
      H2(L('Madurez del inventario OT', 'OT inventory maturity'));
      table([L('Elemento', 'Item'), C.matName('sugerido'), C.matName('validado'), C.matName('evaluado'), C.matName('descartado'), L('Vigentes', 'Current')], K.map(([k, l]) => { const c = b.by[k]; return [l, String(c.sugerido), String(c.validado), String(c.evaluado), String(c.descartado), String(c.total)]; }).concat([[L('Total', 'Total'), String(b.sug), String(b.val - b.evl), String(b.evl), String(b.dis), String(b.tot)]]), { columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold' } } });
      P(L(`Validados ${b.val} de ${b.tot} elementos vigentes; ${b.noev} sin evaluar. Importado no significa validado y no evaluado no significa riesgo bajo. Los elementos sugeridos por el catálogo son hipótesis de plantilla, no la instalación real.`, `Validated ${b.val} of ${b.tot} current items; ${b.noev} not assessed. Imported does not mean validated and not assessed does not mean low risk. Catalog-suggested items are template hypotheses, not the real facility.`), 8.4, MUTED); }

    // annexes
    H1('A', L('Anexo A · Respuestas del cuestionario', 'Annex A · Questionnaire answers'));
    table(['ID', L('Pregunta', 'Question'), L('Respuesta', 'Answer'), L('Confianza', 'Confidence'), L('Explicación y fuente', 'Explanation and source')], ev.app.map(x => { const r = a.answers[x.q.id] || {}; return [x.q.id + (x.cond ? L('\n(condicional)', '\n(conditional)') : ''), tx(x.q.text), tx(r.value) || L('Sin responder', 'Unanswered'), tx(r.conf) || '—', tx(r.note) || '—']; }),
      { columnStyles: { 0: { cellWidth: 22, fontStyle: 'bold' }, 1: { cellWidth: 64 }, 2: { cellWidth: 20 }, 3: { cellWidth: 18 } }, styles: { font: F, fontSize: 7.4, cellPadding: 1.8, textColor: INK, lineColor: LINE, lineWidth: 0.2 } });
    H1('B', L('Anexo B · Activos y dependencias', 'Annex B · Assets and dependencies'));
    table(['TAG', L('Descripción', 'Description'), L('Tipo', 'Type'), L('Área', 'Area'), L('Procedencia · madurez', 'Provenance · maturity')], a.assets.filter(x => !C.isOut(x)).map(x => [x.tag, tx(x.name), tx(x.type), C.areaName(a, x.area) || '—', C.provName(x.prov) + ' · ' + C.matName(C.mat(a, 'asset', x))]), { columnStyles: { 0: { cellWidth: 22, fontStyle: 'bold' } } });
    table([L('Elemento', 'Item'), L('Depende de', 'Depends on'), L('Tipo', 'Type'), L('Nota', 'Note'), L('Procedencia · madurez', 'Provenance · maturity')], a.deps.filter(d => !C.isOut(d)).map(d => [C.nodeLbl(a, d.from), C.nodeLbl(a, d.to), C.depName(d.type), tx(d.note) || '—', C.provName(d.prov) + ' · ' + C.matName(C.mat(a, 'dep', d))]));
    if (C.scnElements) {
      H1('C', L('Anexo C · Trazabilidad de escenarios', 'Annex C · Scenario traceability'));
      P(L('Cada ID puede buscarse en el artefacto (botón «Trazabilidad») para volver a su fuente.', 'Each ID can be searched in the artifact (“Traceability” button) to return to its source.'), 8.4, MUTED);
      table([L('Escenario', 'Scenario'), L('Elementos (procedencia · madurez)', 'Items (provenance · maturity)'), L('Hallazgos y preguntas', 'Findings and questions'), L('Evidencias', 'Evidence'), L('Recomendaciones', 'Recommendations')], a.scenarios.map(s => { const el = C.scnElements(a, s); const qs = [...new Set(s.findings.map(fid => (a.findings.find(f => f.id === fid) || {}).q).filter(Boolean))]; const ph = a.photos.filter(p => p.links && (p.links.scenario === s.id || s.findings.includes(p.links.finding) || el.some(e => C.lk ? C.lk(p, e.k, e.id) : p.links[e.k] === e.id))).map(p => p.id);
        return [s.id + '\n' + (C.LEVEL(s.C, s.P) ? tx(C.LEVEL(s.C, s.P)) : L('Pendiente', 'Pending')), el.map(e => e.lbl + ' (' + C.provName(e.x.prov) + ' · ' + C.matName(C.mat(a, e.k, e.x)) + ')').join('\n') || '—', s.findings.concat(qs).join(', ') || '—', ph.join(', ') || '—', a.recs.filter(r => r.sc.includes(s.id)).map(r => r.id).join(', ') || '—']; }), { columnStyles: { 0: { cellWidth: 20, fontStyle: 'bold' }, 1: { cellWidth: 62 } } });
    }

    const N = doc.getNumberOfPages();
    for (let i = 2; i <= N; i++) {
      doc.setPage(i);
      if (!approved) { doc.setGState(new doc.GState({ opacity: 0.06 })); font('bold', 74, NAVY); doc.text(L('BORRADOR', 'DRAFT'), PW / 2, PH / 2 + 20, { align: 'center', angle: 35 }); doc.setGState(new doc.GState({ opacity: 1 })); }
      if (bandPages.has(i)) { if (logoW) doc.addImage(logoW.data, 'PNG', ML, 8, 24, 24 * logoW.h / logoW.w); font('normal', 7.4, '#c3d0e1'); doc.text(`Operational Risk Assessment · ${plant}`, PW - MR, 13, { align: 'right' }); }
      else { if (logoB) doc.addImage(logoB.data, 'PNG', ML, 11, 24, 24 * logoB.h / logoB.w); font('normal', 7.4, MUTED); doc.text(`Operational Risk Assessment · ${plant}`, PW - MR, 15, { align: 'right' }); doc.setDrawColor(LINE); doc.setLineWidth(0.2); doc.line(ML, 20, PW - MR, 20); }
      doc.setDrawColor(LINE); doc.setLineWidth(0.2); doc.line(ML, PH - 14, PW - MR, PH - 14);
      font('normal', 7, MUTED); doc.text(`${a.code} · v${a.reportVersion} · ${tx(a.reportStatus)} · ${L('DEMO, datos ilustrativos', 'DEMO, illustrative data')}`, ML, PH - 9);
      doc.text(`${L('Página', 'Page')} ${i} ${L('de', 'of')} ${N}`, PW - MR, PH - 9, { align: 'right' });
    }
    doc.setProperties({ title: 'Operational Risk Assessment · ' + plant, subject: L('Informe ejecutivo (demo)', 'Executive report (demo)'), author: 'Omnicon', creator: 'ORA demo' });
    const blob = doc.output('blob');
    const name = `ORA_${plant.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_')}_${approved ? L('final', 'final') : L('borrador', 'draft')}_v${a.reportVersion}_${I.lang.toUpperCase()}.pdf`;
    return { blob, pages: N, name, outline, draft: !approved };
  }
  window.ORA_PDF = { build };
})();
