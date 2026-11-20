/* ORA v6 — Biblioteca y plantillas en Excel: exportación formateada con identidad Omnicon (portada con instrucciones,
   encabezados, columnas obligatorias, listas desplegables, notas) e importación con vista previa y validación. */
(function () {
  const C = window.ORA, D = window.ORA_DATA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, ic = U.ic, L = I.L, tx = I.tx, A = U.act;
  const NAVY = 'FF001C3F', NAVY2 = 'FF00285A', CYAN = 'FF00DCFA', BLUE = 'FF0A58EB', INK = 'FF001C3F', MUTED = 'FF556578', LINE = 'FFDBE2EA', ALT = 'FFF6F8FB', IDF = 'FFEEF2F6', REQ = 'FFFFF8E6';
  let ejP; const loadEJ = () => ejP || (ejP = new Promise((res, rej) => { if (window.ExcelJS) return res(window.ExcelJS); const s = document.createElement('script'); s.src = 'lib/exceljs.min.js'; s.onload = () => res(window.ExcelJS); s.onerror = () => { ejP = null; rej(new Error(L('No se pudo cargar el generador de Excel', 'Could not load the Excel generator'))); }; document.head.appendChild(s); }));
  const lib = () => C.S.lib; const T = k => lib().templates[k];
  const IND = () => D.INDUSTRIES.map(i => [i.key, tx(i.name)]);
  const indName = k => k === '*' ? L('Común (todas)', 'Common (all)') : (IND().find(i => i[0] === k) || [k, k])[1];
  const MODS = () => Object.values(lib().modalities).map(m => [m.key, tx(m.name)]);
  const YES = () => L('Sí', 'Yes'), NO = () => L('No', 'No');
  const yn = v => v ? YES() : NO();
  const isYes = v => /^(s[ií]|yes|y|true|1|x)$/i.test(String(v || '').trim());
  const split = v => String(v || '').split(/[,;|\n]/).map(s => s.trim()).filter(Boolean);
  const norm = s => String(s == null ? '' : s).trim();
  const low = s => norm(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const CRIT = ['Critica', 'Alta', 'Media', 'Baja'];
  const ANS = ['Sí', 'No', 'Desconocido', 'No aplica'];

  /* ---------- definición de hojas ---------- */
  const SHEETS = () => [
    { key: 'q', name: L('Preguntas', 'Questions'), color: CYAN, desc: L('Biblioteca de preguntas del cuestionario. Una fila por pregunta. Deje el ID vacío para crear una nueva.', 'Questionnaire question library. One row per question. Leave ID empty to create a new one.'),
      cols: [['id', 'ID', 16, 'id'], ['text', L('Pregunta', 'Question'), 60, 'req'], ['dim', L('Dimensión', 'Dimension'), 28, 'req', 'dims'], ['ind', L('Industrias', 'Industries'), 26, 'req', null, L('Una o varias separadas por coma, o «Común (todas)». Ver hoja Listas.', 'One or more separated by commas, or “Common (all)”. See Lists sheet.')], ['mods', L('Modalidades', 'Modalities'), 24, 'req', null, L('Una o varias separadas por coma (Light, Dos semanas, Custom).', 'One or more separated by commas (Light, Two weeks, Custom).')],
        ['order', L('Orden', 'Order'), 9, '', null, L('Número. Define el orden dentro del núcleo.', 'Number. Sets the order within the core.')], ['proc', L('Proceso (ID)', 'Process (ID)'), 16, '', 'procs', L('ID del proceso del catálogo, p. ej. OG-PR-01. Vacío = general.', 'Catalog process ID, e.g. OG-PR-01. Empty = general.')], ['req', L('Tipo', 'Type'), 16, 'req', 'qtype'], ['pol', L('Política', 'Policy'), 13, '', 'pol'], ['ev', L('Pide evidencia', 'Asks evidence'), 12, '', 'yn'],
        ['cq', L('Condición · pregunta', 'Condition · question'), 18, '', null, L('ID de la pregunta que la activa (solo condicionales).', 'ID of the triggering question (conditional only).')], ['cin', L('Condición · respuestas', 'Condition · answers'), 20, '', null, L('Respuestas que la activan, separadas por coma: Sí, No, Desconocido, No aplica.', 'Triggering answers, comma separated: Yes, No, Unknown, Not applicable.')], ['csig', L('Condición · señal', 'Condition · signal'), 16, '', null, L('Señal del sistema, p. ej. cat:control. Avanzado: no modificar si no la conoce.', 'System signal, e.g. cat:control. Advanced: do not change if unsure.')], ['active', L('Activa', 'Active'), 9, 'req', 'yn']] },
    { key: 'p', name: L('Procesos', 'Processes'), color: CYAN, desc: L('Procesos críticos sugeridos por industria.', 'Suggested critical processes by industry.'),
      cols: [['ind', L('Industria', 'Industry'), 22, 'req', 'inds'], ['id', 'ID', 14, 'id'], ['name', L('Nombre', 'Name'), 40, 'req'], ['desc', L('Descripción', 'Description'), 50, ''], ['crit', L('Criticidad sugerida', 'Suggested criticality'), 18, '', 'crit'], ['active', L('Activo', 'Active'), 9, 'req', 'yn']] },
    { key: 'a', name: L('Áreas', 'Areas'), color: CYAN, desc: L('Áreas típicas por industria y los procesos a los que pertenecen.', 'Typical areas by industry and the processes they belong to.'),
      cols: [['ind', L('Industria', 'Industry'), 22, 'req', 'inds'], ['id', 'ID', 14, 'id'], ['name', L('Nombre', 'Name'), 40, 'req'], ['procs', L('Procesos (IDs)', 'Processes (IDs)'), 30, 'req', null, L('IDs de procesos de la misma industria separados por coma.', 'Process IDs of the same industry, comma separated.')], ['active', L('Activa', 'Active'), 9, 'req', 'yn']] },
    { key: 's', name: L('Sistemas OT', 'OT systems'), color: CYAN, desc: L('Sistemas OT típicos por industria, su categoría y los tipos de activo que agrupan.', 'Typical OT systems by industry, their category and the asset types they group.'),
      cols: [['ind', L('Industria', 'Industry'), 22, 'req', 'inds'], ['id', 'ID', 14, 'id'], ['name', L('Nombre', 'Name'), 40, 'req'], ['cat', L('Categoría OT', 'OT category'), 22, 'req', 'cats'], ['procs', L('Procesos (IDs)', 'Processes (IDs)'), 28, '', null, L('IDs separados por coma.', 'Comma separated IDs.')], ['types', L('Tipos de activo', 'Asset types'), 36, '', null, L('Separados por punto y coma (;). Use los de la hoja Tipos de activo.', 'Separated by semicolons (;). Use those in the Asset types sheet.')], ['obs', L('Observaciones', 'Notes'), 30, ''], ['active', L('Activo', 'Active'), 9, 'req', 'yn']] },
    { key: 'd', name: L('Dependencias', 'Dependencies'), color: CYAN, desc: L('Dependencias típicas entre sistemas OT del catálogo.', 'Typical dependencies between catalog OT systems.'),
      cols: [['ind', L('Industria', 'Industry'), 22, 'req', 'inds'], ['id', 'ID', 14, 'id'], ['from', L('Sistema que depende (ID)', 'Dependent system (ID)'), 22, 'req', 'syss'], ['to', L('Depende de (ID)', 'Depends on (ID)'), 22, 'req', 'syss'], ['type', L('Tipo', 'Type'), 20, 'req', 'deps'], ['desc', L('Descripción', 'Description'), 44, ''], ['active', L('Activa', 'Active'), 9, 'req', 'yn']] },
    { key: 't', name: L('Tipos de activo', 'Asset types'), color: CYAN, desc: L('Tipos de activo disponibles en el recorrido, la importación y las reglas fotográficas.', 'Asset types available in the walkdown, import and photo rules.'),
      cols: [['name', L('Nombre', 'Name'), 34, 'req'], ['cat', L('Categoría OT', 'OT category'), 24, '', 'cats'], ['photo', L('Requiere foto', 'Requires photo'), 14, '', 'yn'], ['active', L('Activo', 'Active'), 9, 'req', 'yn']] },
    { key: 'm', name: L('Modalidades', 'Modalities'), color: CYAN, desc: L('Modalidades del servicio y número de preguntas del núcleo (parámetro demostrativo).', 'Service modalities and number of core questions (demo parameter).'),
      cols: [['key', L('Clave', 'Key'), 12, 'id'], ['name', L('Nombre', 'Name'), 22, 'req'], ['dur', L('Duración', 'Duration'), 28, ''], ['count', L('Preguntas del núcleo', 'Core questions'), 18, 'req', null, L('Número entre 1 y 60.', 'Number between 1 and 60.')]] }
  ];
  const catName = k => tx((lib().otCats.find(c => c.key === k) || {}).name || k);
  const rowsOf = sk => {
    const l = lib(); const out = [];
    if (sk === 'q') l.questions.forEach(q => out.push({ id: q.id, text: tx(q.text), dim: tx(q.dim), ind: q.ind.map(indName).join(', '), mods: q.mods.map(m => (MODS().find(x => x[0] === m) || [m, m])[1]).join(', '), order: q.order, proc: q.proc || '', req: q.req ? L('Núcleo', 'Core') : L('Complementaria', 'Supplementary'), pol: q.pol || '', ev: yn(q.ev), cq: (q.cond || {}).q || '', cin: ((q.cond || {}).in || []).map(tx).join(', '), csig: (q.cond || {}).sig || '', active: yn(q.active) }));
    Object.entries(l.templates).forEach(([ik, t]) => {
      if (sk === 'p') t.processes.forEach(p => out.push({ ind: indName(ik), id: p.key, name: tx(p.name), desc: tx(p.desc || ''), crit: p.critCat || '', active: yn(p.active !== false) }));
      if (sk === 'a') t.areas.forEach(a => out.push({ ind: indName(ik), id: a.id, name: tx(a.name), procs: (a.procs || []).join(', '), active: yn(a.active !== false) }));
      if (sk === 's') t.systems.forEach(s => out.push({ ind: indName(ik), id: s.id, name: tx(s.name), cat: catName(s.cat), procs: (s.procs || []).join(', '), types: (s.types || []).map(tx).join('; '), obs: tx(s.obs || ''), active: yn(s.active !== false) }));
      if (sk === 'd') (t.deps || []).forEach(d => out.push({ ind: indName(ik), id: d.id, from: d.from, to: d.to, type: C.depName ? C.depName(d.type) : d.type, desc: tx(d.desc || ''), active: yn(d.active !== false) }));
    });
    if (sk === 't') l.assetTypes.forEach(t => out.push({ name: tx(t.name), cat: t.cat ? catName(t.cat) : '', photo: yn((l.photoRules.assetTypes || []).includes(t.name)), active: yn(t.active !== false) }));
    if (sk === 'm') Object.values(l.modalities).forEach(m => out.push({ key: m.key, name: tx(m.name), dur: tx(m.dur || ''), count: m.count }));
    return out;
  };
  const LISTS = () => { const l = lib(); const procs = Object.values(l.templates).flatMap(t => t.processes.map(p => p.key)); const syss = Object.values(l.templates).flatMap(t => t.systems.map(s => s.id));
    return { yn: [YES(), NO()], inds: D.INDUSTRIES.map(i => tx(i.name)), dims: [...new Set(l.questions.map(q => tx(q.dim)))], qtype: [L('Núcleo', 'Core'), L('Complementaria', 'Supplementary')], pol: [...new Set(l.questions.map(q => q.pol).filter(Boolean))], crit: CRIT, cats: l.otCats.map(c => tx(c.name)), deps: D.DEP_TYPES.map(t => C.depName ? C.depName(t) : t), procs, syss, mods: MODS().map(m => m[1]), ans: ANS.map(tx) }; };

  /* ---------- exportación con formato ---------- */
  A['libx-export'] = async () => {
    let EJ; try { EJ = await loadEJ(); } catch (e) { return U.toast(e.message); }
    U.toast(L('Generando la plantilla de Excel…', 'Generating the Excel template…'));
    const wb = new EJ.Workbook(); wb.creator = 'Omnicon · ORA'; wb.created = new Date(); const LS = LISTS(); const today = new Date().toISOString().slice(0, 10);
    const font = (o) => Object.assign({ name: 'Arial', size: 10, color: { argb: INK } }, o || {});
    const fill = c => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: c } });
    const thin = { style: 'thin', color: { argb: LINE } }; const box = { top: thin, left: thin, bottom: thin, right: thin };
    let logo = null; try { const r = await fetch('assets/logo-white.png'); if (r.ok) logo = wb.addImage({ buffer: await r.arrayBuffer(), extension: 'png' }); } catch (e) {}
    // listas (rangos con nombre para las validaciones)
    const ls = wb.addWorksheet(L('Listas', 'Lists'), { properties: { tabColor: { argb: 'FF9DB0C5' } } });
    const lkeys = [['yn', L('Sí / No', 'Yes / No')], ['inds', L('Industrias', 'Industries')], ['dims', L('Dimensiones', 'Dimensions')], ['qtype', L('Tipo de pregunta', 'Question type')], ['pol', L('Política', 'Policy')], ['crit', L('Criticidad', 'Criticality')], ['cats', L('Categorías OT', 'OT categories')], ['deps', L('Tipos de dependencia', 'Dependency types')], ['mods', L('Modalidades', 'Modalities')], ['ans', L('Respuestas', 'Answers')], ['procs', L('Procesos (IDs)', 'Processes (IDs)')], ['syss', L('Sistemas (IDs)', 'Systems (IDs)')]];
    const lref = {};
    lkeys.forEach(([k, t], ci) => { const col = ci + 1; const c = ls.getCell(1, col); c.value = t; c.font = font({ bold: true, color: { argb: 'FFFFFFFF' } }); c.fill = fill(NAVY); c.alignment = { vertical: 'middle', wrapText: true }; ls.getColumn(col).width = k === 'dims' ? 32 : 20;
      LS[k].forEach((v, i) => { const cc = ls.getCell(i + 2, col); cc.value = v; cc.font = font(); cc.fill = fill(i % 2 ? ALT : 'FFFFFFFF'); });
      const L1 = ls.getColumn(col).letter; lref[k] = `'${ls.name}'!$${L1}$2:$${L1}$${Math.max(2, LS[k].length + 1)}`; });
    ls.getRow(1).height = 30; ls.views = [{ state: 'frozen', ySplit: 1 }];
    // portada con instrucciones
    const ins = wb.addWorksheet(L('Instrucciones', 'Instructions'), { properties: { tabColor: { argb: NAVY } }, views: [{ showGridLines: false }] });
    ins.columns = [{ width: 3 }, { width: 26 }, { width: 70 }, { width: 22 }];
    for (let r = 1; r <= 5; r++) for (let c = 1; c <= 4; c++) ins.getCell(r, c).fill = fill(NAVY);
    if (logo != null) ins.addImage(logo, { tl: { col: 1.05, row: 0.6 }, ext: { width: 150, height: 36 } });
    ins.getCell('C2').value = L('ORA · Biblioteca y plantillas', 'ORA · Library & templates'); ins.getCell('C2').font = font({ size: 18, bold: true, color: { argb: 'FFFFFFFF' } });
    ins.getCell('C3').value = L('Operational Risk Assessment · plantilla de gestión en Excel', 'Operational Risk Assessment · Excel management template'); ins.getCell('C3').font = font({ size: 11, color: { argb: CYAN } });
    ins.getCell('C4').value = L(`Biblioteca v${lib().version} · exportada el ${today}`, `Library v${lib().version} · exported on ${today}`); ins.getCell('C4').font = font({ size: 10, color: { argb: 'FFC9D6E6' } });
    for (let c = 1; c <= 4; c++) ins.getCell(6, c).fill = fill(CYAN); ins.getRow(6).height = 4;
    let r = 8; const sec = t => { ins.getCell(r, 2).value = t; ins.getCell(r, 2).font = font({ size: 12, bold: true, color: { argb: NAVY } }); ins.getCell(r, 2).border = { bottom: { style: 'medium', color: { argb: CYAN } } }; ins.mergeCells(r, 2, r, 4); r += 2; };
    const line = (a, b, opt) => { const ca = ins.getCell(r, 2), cb = ins.getCell(r, 3); ca.value = a; cb.value = b; ca.font = font({ bold: true }); cb.font = font(); cb.alignment = ca.alignment = { wrapText: true, vertical: 'top' }; if (opt && opt.fill) { ca.fill = fill(opt.fill); } ins.mergeCells(r, 3, r, 4); ins.getRow(r).height = Math.max(18, Math.ceil(String(b).length / 95) * 15); r++; };
    sec(L('Cómo usar esta plantilla', 'How to use this template'));
    [[L('1. Edite', '1. Edit'), L('Cada hoja de color es un catálogo. Modifique las celdas blancas; los encabezados azules no se cambian.', 'Each colored sheet is a catalog. Edit the white cells; do not change the blue headers.')],
      [L('2. Agregue', '2. Add'), L('Para crear un registro nuevo agregue una fila al final y deje el ID vacío: ORA lo asigna al importar.', 'To create a new record add a row at the end and leave the ID empty: ORA assigns it on import.')],
      [L('3. Desactive, no borre', '3. Deactivate, do not delete'), L('Para retirar un registro ponga «No» en Activo/Activa. Borrar la fila no elimina nada en ORA.', 'To retire a record set Active to “No”. Deleting the row does not remove anything in ORA.')],
      [L('4. Use las listas', '4. Use the lists'), L('Las columnas con flecha tienen lista desplegable. Las de varios valores (industrias, procesos, tipos) se separan con coma y sus valores válidos están en la hoja Listas.', 'Columns with an arrow have a drop-down list. Multi-value columns (industries, processes, types) are comma separated and their valid values are in the Lists sheet.')],
      [L('5. Importe', '5. Import'), L('En ORA › Biblioteca y plantillas › Importar Excel. Verá una vista previa con lo nuevo, lo que cambia y los errores antes de aplicar.', 'In ORA › Library & templates › Import Excel. You will see a preview of new items, changes and errors before applying.')],
      [L('6. Versiones', '6. Versions'), L('Cada importación crea una versión nueva de la biblioteca o del catálogo. Aplica a assessments nuevos; los existentes y los cerrados no cambian.', 'Each import creates a new library or catalog version. It applies to new assessments; existing and closed ones do not change.')]].forEach(x => line(x[0], x[1]));
    r++; sec(L('Convenciones de color', 'Color conventions'));
    [[IDF, L('ID · no modificar', 'ID · do not change'), L('Identifica el registro. Si lo cambia, ORA creará uno nuevo en lugar de actualizar.', 'Identifies the record. If changed, ORA will create a new one instead of updating.')], [REQ, L('Obligatorio *', 'Required *'), L('Encabezado con asterisco: la celda no puede quedar vacía.', 'Header with asterisk: the cell cannot be empty.')], ['FFFFFFFF', L('Editable', 'Editable'), L('Contenido libre o lista desplegable.', 'Free content or drop-down list.')]].forEach(([f, a, b]) => { line(a, b); ins.getCell(r - 1, 2).fill = fill(f); ins.getCell(r - 1, 2).border = box; });
    r++; sec(L('Hojas incluidas', 'Included sheets'));
    SHEETS().forEach(s => line(s.name, s.desc + ` (${rowsOf(s.key).length} ${L('registros', 'records')})`));
    line(L('Listas', 'Lists'), L('Valores válidos para las listas y columnas de varios valores. No la modifique.', 'Valid values for drop-downs and multi-value columns. Do not modify it.'));
    r++; ins.getCell(r, 2).value = L('Omnicon · contenido de demostración por validar con especialistas.', 'Omnicon · demo content to be validated by specialists.'); ins.getCell(r, 2).font = font({ italic: true, size: 9, color: { argb: MUTED } }); ins.mergeCells(r, 2, r, 4);
    // hojas de datos
    SHEETS().forEach(s => {
      const ws = wb.addWorksheet(s.name, { properties: { tabColor: { argb: s.color } }, views: [{ state: 'frozen', ySplit: 4, xSplit: s.cols[0][0] === 'id' || s.cols[1] && s.cols[1][0] === 'id' ? (s.cols[0][0] === 'id' ? 1 : 2) : 0, showGridLines: false }] });
      const n = s.cols.length; ws.columns = s.cols.map(c => ({ width: c[2] }));
      ws.mergeCells(1, 1, 1, n); const t = ws.getCell(1, 1); t.value = `ORA · ${s.name}`; t.font = font({ size: 14, bold: true, color: { argb: 'FFFFFFFF' } }); t.fill = fill(NAVY); t.alignment = { vertical: 'middle', indent: 1 }; ws.getRow(1).height = 30;
      ws.mergeCells(2, 1, 2, n); const d = ws.getCell(2, 1); d.value = s.desc + ' ' + L('Columnas con * son obligatorias; las grises (ID) no se modifican.', 'Columns with * are required; grey ones (ID) are not modified.'); d.font = font({ size: 9.5, color: { argb: MUTED }, italic: true }); d.alignment = { vertical: 'middle', wrapText: true, indent: 1 }; ws.getRow(2).height = 30;
      for (let c = 1; c <= n; c++) ws.getCell(3, c).fill = fill(CYAN); ws.getRow(3).height = 3;
      s.cols.forEach((c, i) => { const cell = ws.getCell(4, i + 1); cell.value = c[1] + (c[3] === 'req' ? ' *' : ''); cell.font = font({ bold: true, color: { argb: 'FFFFFFFF' } }); cell.fill = fill(c[3] === 'id' ? NAVY2 : NAVY); cell.alignment = { vertical: 'middle', wrapText: true }; cell.border = { bottom: { style: 'medium', color: { argb: CYAN } } };
        const note = [c[3] === 'id' ? L('No modificar. Vacío = registro nuevo.', 'Do not change. Empty = new record.') : '', c[3] === 'req' ? L('Obligatorio.', 'Required.') : '', c[5] || '', c[4] ? L('Lista desplegable.', 'Drop-down list.') : ''].filter(Boolean).join(' '); if (note) cell.note = { texts: [{ text: note }], margins: { insetmode: 'auto' } }; });
      ws.getRow(4).height = 34; ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: n } };
      const data = rowsOf(s.key); const last = 4 + data.length + 200;
      data.forEach((row, ri) => { const rr = ws.getRow(5 + ri); s.cols.forEach((c, ci) => { const cell = rr.getCell(ci + 1); cell.value = row[c[0]] == null ? '' : row[c[0]]; cell.font = font(c[3] === 'id' ? { color: { argb: MUTED } } : {}); cell.alignment = { vertical: 'top', wrapText: true }; cell.border = box; cell.fill = fill(c[3] === 'id' ? IDF : ri % 2 ? ALT : 'FFFFFFFF'); }); });
      for (let rr = 5 + data.length; rr <= Math.min(last, 5 + data.length + 30); rr++) s.cols.forEach((c, ci) => { const cell = ws.getCell(rr, ci + 1); cell.border = box; if (c[3] === 'id') cell.fill = fill(IDF); });
      s.cols.forEach((c, ci) => { if (!c[4] || !lref[c[4]]) return; const L1 = ws.getColumn(ci + 1).letter;
        ws.dataValidations.add(`${L1}5:${L1}${last}`, { type: 'list', allowBlank: c[3] !== 'req', formulae: [lref[c[4]]], showErrorMessage: !['procs', 'syss'].includes(c[4]) || true, errorStyle: 'stop', errorTitle: 'ORA', error: L('Elija un valor de la lista.', 'Choose a value from the list.'), showInputMessage: true, promptTitle: c[1], prompt: c[5] || L('Elija de la lista.', 'Choose from the list.') }); });
      s.cols.forEach((c, ci) => { if (c[0] !== 'order' && c[0] !== 'count') return; const L1 = ws.getColumn(ci + 1).letter; ws.dataValidations.add(`${L1}5:${L1}${last}`, { type: 'whole', operator: 'between', allowBlank: c[0] === 'order', formulae: [c[0] === 'count' ? 1 : 0, c[0] === 'count' ? 60 : 9999], showErrorMessage: true, errorTitle: 'ORA', error: L('Debe ser un número entero.', 'Must be a whole number.') }); });
    });
    wb.views = [{ activeTab: 1 }]; wb.worksheets.forEach((w, i) => { if (w === ls) { /* listas al final */ } });
    // mover «Listas» al final
    const order = wb.worksheets.filter(w => w !== ls).concat([ls]); order.forEach((w, i) => { w.orderNo = i; });
    const buf = await wb.xlsx.writeBuffer();
    await U.save(`ORA_biblioteca_v${lib().version}_${today}.xlsx`, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  };

  /* ---------- importación con vista previa ---------- */
  let PEND = null;
  const findHead = (rows, first) => { for (let i = 0; i < Math.min(8, rows.length); i++) { const r = rows[i].map(v => low(String(v).replace(/\*$/, ''))); if (r.includes(low(first))) return i; } return -1; };
  const indKey = v => { const s = low(v); if (!s) return null; if (s === '*' || /^comun|^common/.test(s)) return '*'; const f = D.INDUSTRIES.find(i => low(i.key) === s || low(tx(i.name)) === s || low(i.name) === s); return f ? f.key : null; };
  const modKey = v => { const s = low(v); const f = Object.values(lib().modalities).find(m => low(m.key) === s || low(tx(m.name)) === s || low(m.name) === s); return f ? f.key : null; };
  const catKey = v => { const s = low(v); if (!s) return null; const f = lib().otCats.find(c => low(c.key) === s || low(tx(c.name)) === s || low(c.name) === s); return f ? f.key : null; };
  const depKey = v => { const s = low(v); return D.DEP_TYPES.find(t => low(t) === s || low(C.depName ? C.depName(t) : t) === s) || null; };
  const ansKey = v => { const s = low(v); return ANS.find(a => low(a) === s || low(tx(a)) === s) || null; };
  const critKey = v => { const s = low(v); return CRIT.find(c => low(c) === s) || null; };
  const pfx = ik => ((T(ik).processes[0] || {}).key || ik.slice(0, 2).toUpperCase() + '-').split('-')[0];
  const nextId = (list, base, pad) => { let n = 1, id; do { id = base + String(n++).padStart(pad || 2, '0'); } while (list.some(x => (x.id || x.key) === id)); return id; };

  async function importFile(f) {
    let X; try { X = await U.loadXLSX(); } catch (e) { return U.toast(e.message); }
    const wb = X.read(await f.arrayBuffer(), { type: 'array' }); const l = lib();
    const res = { sheets: {}, err: [], ops: [] }; const S = SHEETS();
    const sheetBy = s => wb.SheetNames.find(n => low(n) === low(s.name) || low(n) === low(L(s.name, s.name))) || wb.SheetNames.find(n => [ 'preguntas|questions', 'procesos|processes', 'areas', 'sistemas ot|ot systems', 'dependencias|dependencies', 'tipos de activo|asset types', 'modalidades|modalities'][S.indexOf(s)].split('|').includes(low(n)));
    S.forEach(s => {
      const sn = sheetBy(s); if (!sn) return; const rows = X.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '' });
      const hi = findHead(rows, s.cols[0][1]); if (hi < 0) { res.err.push(`${s.name}: ${L('no se encontró la fila de encabezados', 'header row not found')}`); return; }
      const head = rows[hi].map(v => low(String(v).replace(/\s*\*$/, ''))); const idx = {}; s.cols.forEach(c => { const i = head.indexOf(low(c[1])); if (i >= 0) idx[c[0]] = i; });
      const st = res.sheets[s.key] = { name: s.name, add: 0, upd: 0, same: 0, err: 0 };
      rows.slice(hi + 1).forEach((r, n) => { const rn = hi + n + 2; const g = k => idx[k] == null ? undefined : norm(r[idx[k]]); if (s.cols.every(c => !g(c[0]))) return;
        const bad = m => { st.err++; res.err.push(`${s.name} · ${L('fila', 'row')} ${rn}: ${m}`); };
        const reqd = s.cols.filter(c => c[3] === 'req' && idx[c[0]] != null && !g(c[0])); if (reqd.length) return bad(L('falta ', 'missing ') + reqd.map(c => c[1]).join(', '));
        if (s.key === 'q') {
          const inds = split(g('ind')).map(indKey); if (inds.includes(null)) return bad(L('industria no válida', 'invalid industry') + ` «${g('ind')}»`);
          const mods = split(g('mods')).map(modKey); if (mods.includes(null)) return bad(L('modalidad no válida', 'invalid modality') + ` «${g('mods')}»`);
          const proc = g('proc') || null; if (proc && !Object.values(l.templates).some(t => t.processes.some(p => p.key === proc))) return bad(L('proceso inexistente', 'unknown process') + ` «${proc}»`);
          const cin = split(g('cin')).map(ansKey); if (cin.includes(null)) return bad(L('respuesta de condición no válida', 'invalid condition answer'));
          const cq = g('cq') || null; if (cq && !l.questions.some(q => q.id === cq) && cq !== g('id')) return bad(L('la pregunta de la condición no existe', 'condition question does not exist') + ` «${cq}»`);
          const v = { text: g('text'), dim: g('dim'), ind: inds, mods, order: +g('order') || 0, proc, req: low(g('req')).startsWith('nucl') || low(g('req')) === 'core', pol: g('pol') || 'control', ev: isYes(g('ev')), cq, cin, csig: g('csig') || null, active: isYes(g('active')) };
          const x = g('id') && l.questions.find(q => q.id === g('id'));
          if (x) { const same = tx(x.text) === v.text && tx(x.dim) === v.dim && x.ind.join() === v.ind.join() && x.mods.join() === v.mods.join() && (+x.order || 0) === v.order && (x.proc || null) === v.proc && !!x.req === v.req && (x.pol || 'control') === v.pol && !!x.ev === v.ev && ((x.cond || {}).q || null) === v.cq && ((x.cond || {}).in || []).join() === v.cin.join() && ((x.cond || {}).sig || null) === v.csig && !!x.active === v.active;
            if (same) st.same++; else { st.upd++; res.ops.push({ k: 'q', x, v }); } }
          else { st.add++; res.ops.push({ k: 'q', x: null, v, id: g('id') || null }); }
        } else if (s.key === 't') {
          const cat = g('cat') ? catKey(g('cat')) : ''; if (cat === null) return bad(L('categoría OT no válida', 'invalid OT category') + ` «${g('cat')}»`);
          const v = { name: g('name'), cat, photo: isYes(g('photo')), active: isYes(g('active')) }; const x = l.assetTypes.find(t => low(t.name) === low(v.name) || low(tx(t.name)) === low(v.name));
          if (x) { if ((x.cat || '') === v.cat && !!x.active === v.active && (l.photoRules.assetTypes || []).includes(x.name) === v.photo) st.same++; else { st.upd++; res.ops.push({ k: 't', x, v }); } } else { st.add++; res.ops.push({ k: 't', x: null, v }); }
        } else if (s.key === 'm') {
          const x = l.modalities[g('key')]; if (!x) return bad(L('clave de modalidad inexistente', 'unknown modality key') + ` «${g('key')}»`); const cnt = +g('count'); if (!(cnt >= 1 && cnt <= 60)) return bad(L('preguntas del núcleo debe estar entre 1 y 60', 'core questions must be between 1 and 60'));
          const v = { name: g('name'), dur: g('dur'), count: cnt }; if (tx(x.name) === v.name && tx(x.dur || '') === (v.dur || '') && x.count === cnt) st.same++; else { st.upd++; res.ops.push({ k: 'm', x, v }); }
        } else {
          const ik = indKey(g('ind')); if (!ik || ik === '*') return bad(L('industria no válida', 'invalid industry') + ` «${g('ind')}»`); const t = T(ik);
          const list = { p: t.processes, a: t.areas, s: t.systems, d: (t.deps = t.deps || []) }[s.key]; const x = g('id') && list.find(z => (z.id || z.key) === g('id'));
          const pk = new Set(t.processes.map(p => p.key)); const procs = split(g('procs')); const badP = procs.filter(p => !pk.has(p)); if (badP.length && !res.ops.some(o => o.k === 'p' && o.ik === ik)) return bad(L('procesos inexistentes en ', 'processes not in ') + tx(indName(ik)) + `: ${badP.join(', ')}`);
          let v;
          if (s.key === 'p') { const crit = g('crit') ? critKey(g('crit')) : ''; if (crit === null) return bad(L('criticidad no válida', 'invalid criticality')); v = { name: g('name'), desc: g('desc') || '', critCat: crit, active: isYes(g('active')) }; if (x && tx(x.name) === v.name && tx(x.desc || '') === v.desc && (x.critCat || '') === v.critCat && (x.active !== false) === v.active) { st.same++; return; } }
          if (s.key === 'a') { v = { name: g('name'), procs, active: isYes(g('active')) }; if (x && tx(x.name) === v.name && (x.procs || []).join() === procs.join() && (x.active !== false) === v.active) { st.same++; return; } }
          if (s.key === 's') { const cat = catKey(g('cat')); if (!cat) return bad(L('categoría OT no válida', 'invalid OT category') + ` «${g('cat')}»`); v = { name: g('name'), cat, procs, types: String(g('types') || '').split(/[;\n]/).map(z => z.trim()).filter(Boolean), obs: g('obs') || '', active: isYes(g('active')) }; if (x && tx(x.name) === v.name && x.cat === cat && (x.procs || []).join() === procs.join() && (x.types || []).map(tx).join() === v.types.join() && tx(x.obs || '') === v.obs && (x.active !== false) === v.active) { st.same++; return; } }
          if (s.key === 'd') { const sk = new Set(t.systems.map(z => z.id)); const ty = depKey(g('type')); if (!ty) return bad(L('tipo de dependencia no válido', 'invalid dependency type')); if (!sk.has(g('from')) || !sk.has(g('to'))) return bad(L('sistema inexistente en esa industria', 'system not in that industry')); if (g('from') === g('to')) return bad(L('un sistema no puede depender de sí mismo', 'a system cannot depend on itself')); v = { from: g('from'), to: g('to'), type: ty, desc: g('desc') || '', active: isYes(g('active')) }; if (x && x.from === v.from && x.to === v.to && x.type === ty && tx(x.desc || '') === v.desc && (x.active !== false) === v.active) { st.same++; return; } }
          if (x) st.upd++; else st.add++; res.ops.push({ k: s.key, ik, x: x || null, v, id: g('id') || null });
        }
      });
    });
    if (!Object.keys(res.sheets).length) return U.toast(L('El archivo no tiene hojas de la biblioteca: use la plantilla descargada', 'The file has no library sheets: use the downloaded template'));
    PEND = { res, file: f.name }; U.openModal('libximp', {});
  }
  U.modals.libximp = function () {
    const r = PEND.res; const tot = k => Object.values(r.sheets).reduce((n, s) => n + s[k], 0); const nOps = r.ops.length;
    return { title: L('Importar biblioteca y plantillas · vista previa', 'Import library & templates · preview'), wide: true, body: `<p class="small mut" style="margin:0">${h(PEND.file)}</p>
      <div class="v6b-kpi"><div class="v6b-k"><span>${L('Nuevos', 'New')}</span><b>${tot('add')}</b></div><div class="v6b-k"><span>${L('Con cambios', 'Changed')}</span><b>${tot('upd')}</b></div><div class="v6b-k"><span>${L('Sin cambios', 'Unchanged')}</span><b>${tot('same')}</b></div><div class="v6b-k"><span>${L('Filas con error', 'Rows with errors')}</span><b>${tot('err')}</b></div></div>
      <table class="v6lx-t"><thead><tr><th>${L('Hoja', 'Sheet')}</th><th>${L('Nuevos', 'New')}</th><th>${L('Con cambios', 'Changed')}</th><th>${L('Sin cambios', 'Unchanged')}</th><th>${L('Errores', 'Errors')}</th></tr></thead><tbody>${Object.values(r.sheets).map(s => `<tr><td><b>${h(s.name)}</b></td><td>${s.add || '—'}</td><td>${s.upd || '—'}</td><td>${s.same || '—'}</td><td class="${s.err ? 'e' : ''}">${s.err || '—'}</td></tr>`).join('')}</tbody></table>
      ${r.err.length ? `<div class="v6lx-err"><b>${L('Filas que no se importarán', 'Rows that will not be imported')}</b><ul>${r.err.slice(0, 40).map(e => `<li>${h(e)}</li>`).join('')}${r.err.length > 40 ? `<li>… ${r.err.length - 40} ${L('más', 'more')}</li>` : ''}</ul></div>` : ''}
      <p class="hint" style="margin:0">${L('Se creará una versión nueva de la biblioteca o del catálogo de cada industria afectada. Aplica a assessments nuevos; los existentes conservan su versión.', 'A new version of the library or of each affected industry catalog will be created. It applies to new assessments; existing ones keep their version.')}</p>`,
      foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button><button class="btn primary" data-act="libx-apply" ${nOps ? '' : 'disabled'}>${L('Aplicar ', 'Apply ')}${nOps}${L(' cambios', ' changes')}</button>` };
  };
  A['libx-apply'] = () => {
    const l = lib(); const r = PEND.res; const touched = new Set(); let qch = false, other = false;
    ['p', 'a', 's', 'd', 'q', 't', 'm'].forEach(k => r.ops.filter(o => o.k === k).forEach(o => {
      const v = o.v;
      if (k === 'q') { qch = true; const cond = v.cq || v.csig ? Object.assign({}, (o.x && o.x.cond) || {}, { q: v.cq || undefined, in: v.cin.length ? v.cin : undefined, sig: v.csig || undefined }) : null; if (cond) Object.keys(cond).forEach(z => cond[z] === undefined && delete cond[z]);
        const f = { text: v.text, dim: v.dim, ind: v.ind, mods: v.mods, order: v.order, proc: v.proc, req: v.req, pol: v.pol, ev: v.ev, cond, active: v.active };
        if (o.x) { Object.assign(o.x, f); o.x.v = (o.x.v || 1) + 1; } else { const base = v.proc ? v.proc + '-Q' : (v.ind[0] === '*' ? 'GEN' : pfx(v.ind[0])) + '-Q'; l.questions.push(Object.assign({ id: o.id || nextId(l.questions, base, 2), v: 1, status: 'Borrador' }, f)); } }
      else if (k === 't') { other = true; let x = o.x; if (!x) { x = { name: v.name, cat: v.cat, active: v.active }; l.assetTypes.push(x); } else Object.assign(x, { cat: v.cat, active: v.active }); const pr = l.photoRules.assetTypes = l.photoRules.assetTypes || []; const i = pr.indexOf(x.name); if (v.photo && i < 0) pr.push(x.name); if (!v.photo && i >= 0) pr.splice(i, 1); }
      else if (k === 'm') { other = true; Object.assign(o.x, { name: v.name, dur: v.dur, count: v.count }); }
      else { const t = T(o.ik); touched.add(o.ik); const P = pfx(o.ik);
        if (k === 'p') { if (o.x) { Object.assign(o.x, v); o.x.crit3 = v.critCat === 'Critica' ? 'Alta' : v.critCat || o.x.crit3; } else { const key = o.id || nextId(t.processes, P + '-PR-'); t.processes.push(Object.assign({ key, id: key, scope: 'incluido', prov: L('Importado desde Excel', 'Imported from Excel'), crit3: v.critCat === 'Critica' ? 'Alta' : v.critCat || 'Media' }, v)); } }
        if (k === 'a') { if (o.x) { Object.assign(o.x, v); o.x.v = (o.x.v || 1) + 1; } else t.areas.push(Object.assign({ id: o.id || nextId(t.areas, P + '-AR-'), roles: {}, v: 1 }, v)); }
        if (k === 's') { const lbl = (l.otCats.find(c => c.key === v.cat) || {}).name; if (o.x) { Object.assign(o.x, v, { catLabel: lbl }); o.x.v = (o.x.v || 1) + 1; } else t.systems.push(Object.assign({ id: o.id || nextId(t.systems, P + '-SY-'), catLabel: lbl, family: v.cat, v: 1 }, v)); }
        if (k === 'd') { if (o.x) { Object.assign(o.x, v); o.x.v = (o.x.v || 1) + 1; } else t.deps.push(Object.assign({ id: o.id || nextId(t.deps, P + '-DP-'), v: 1 }, v)); } }
    }));
    if (qch || other) l.version++;
    touched.forEach(ik => { const t = T(ik); t.version++; (t.history = t.history || []).unshift({ v: t.version, ts: new Date().toISOString(), by: C.S.userId, es: 'Importó cambios desde Excel (' + PEND.file + ')', en: 'Imported changes from Excel (' + PEND.file + ')' }); });
    C.save(); const n = r.ops.length; PEND = null; U.closeModal(); U.render(); U.toast(L(`${n} cambios aplicados`, `${n} changes applied`) + (touched.size ? L(` · ${touched.size} catálogos con versión nueva`, ` · ${touched.size} catalogs with a new version`) : '') + (qch || other ? L(` · biblioteca v${l.version}`, ` · library v${l.version}`) : ''));
  };
  A['libx-import'] = () => { const i = document.getElementById('libx-file'); if (i) i.click(); };
  document.addEventListener('change', e => { if (e.target.id === 'libx-file') { const f = e.target.files[0]; e.target.value = ''; if (f) importFile(f); } });
  U.libxImport = importFile;

  /* ---------- botones en la vista ---------- */
  const cfg0 = U.views.config;
  U.views.config = function () {
    const html = cfg0.apply(this, arguments);
    const btns = `<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn ghost" data-act="libx-export">${ic('down', 'sm')}${L('Exportar a Excel', 'Export to Excel')}</button><button class="btn primary" data-act="libx-import">${ic('plus', 'sm')}${L('Importar Excel', 'Import Excel')}</button><input class="sr" type="file" id="libx-file" accept=".xlsx,.xls"></div>`;
    return html.replace(/(<div class="hello"><div><h1>[\s\S]*?<\/p><\/div>)(<\/div>)/, `$1${btns}$2`);
  };
})();
