/* ORA v6 — Base instalada y ciclo de vida: lista con filtros y avance por activo, edición en línea con «Guardar»
   (se puede guardar parcial), y plantilla Excel para exportar, diligenciar afuera e importar con vista previa. */
(function () {
  const C = window.ORA, D = window.ORA_DATA, U = window.ORA_UI, I = window.ORA_I18N;
  const h = C.esc, ic = U.ic, L = I.L, tx = I.tx, A = U.act;
  const R = () => U.render();
  const now = () => new Date().toISOString();
  const LCN = () => ({ active: L('Activo', 'Active'), mature: L('Activo maduro', 'Active mature'), eol: L('Fin de vida', 'End of life'), discontinued: L('Descontinuado', 'Discontinued'), unknown: L('Por verificar', 'To verify') });
  const FAM = () => [['control', L('Control', 'Control')], ['software', 'Software'], ['redes', L('Redes', 'Networks')], ['infra', L('Infraestructura', 'Infrastructure')], ['energia', L('Energía', 'Power')]];
  const FAMN = k => (FAM().find(f => f[0] === k) || [null, L('Equipo de proceso', 'Process equipment')])[1];
  // campos que cuentan para el avance de la ficha
  const FIELDS = () => [['family', L('Familia', 'Family')], ['mfr', L('Fabricante', 'Manufacturer')], ['model', L('Modelo', 'Model')], ['version', L('Versión / firmware', 'Version / firmware')], ['lc', L('Ciclo de vida', 'Lifecycle')], ['lcsrc', L('Fuente del fabricante', 'Vendor source')], ['support', L('Soporte', 'Support')], ['spares', L('Repuestos', 'Spares')], ['redundancy', L('Redundancia', 'Redundancy')]];
  const val = (x, f) => f === 'lc' ? ((x.lifecycle || {}).status && x.lifecycle.status !== 'unknown' ? x.lifecycle.status : '') : f === 'lcsrc' ? (x.lifecycle || {}).source || '' : x[f] || '';
  const done = x => FIELDS().filter(([f]) => String(val(x, f)).trim()).length;
  const OPEN = new Set();

  U.installedBase = function (a) {
    const F = C.S.ui.ibf || (C.S.ui.ibf = {}); const all = a.assets.filter(x => !C.isOut(x)); const lcn = LCN(); const N = FIELDS().length;
    const fam = [['', L('Todas', 'All'), all.length]].concat(FAM().map(f => [f[0], f[1], all.filter(x => x.family === f[0]).length]), [['none', L('Equipo de proceso', 'Process equipment'), all.filter(x => !x.family).length]]);
    const q = (F.q || '').toLowerCase();
    const list = all.filter(x => (!F.fam || (F.fam === 'none' ? !x.family : x.family === F.fam)) && (!F.lc || ((x.lifecycle || {}).status || 'unknown') === F.lc) && (!F.inc || done(x) < N) && (!q || [x.tag, tx(x.name), x.mfr, x.model].join(' ').toLowerCase().includes(q)));
    const kpi = Object.keys(lcn).map(k => [k, all.filter(x => ((x.lifecycle || {}).status || 'unknown') === k).length]);
    const rows = list.map(x => {
      const lc = (x.lifecycle || {}).status || 'unknown', n = done(x), open = OPEN.has(x.id);
      return `<div class="v6b-row ${open ? 'open' : ''}" id="ib-${x.id}"><button class="v6b-h" data-act="v6b-tg" data-id="${x.id}" aria-expanded="${open}"><span class="v6w-id">${h(x.tag)}</span>
        <span class="v6w-main"><b>${h(tx(x.name))}</b><small>${h(FAMN(x.family))} · ${h(tx(x.type || ''))}</small></span>
        <span class="v6b-mm">${h([x.mfr, x.model, x.version].filter(Boolean).join(' · ') || L('Sin fabricante / modelo', 'No manufacturer / model'))}</span>
        <span class="v6-lc ${lc}">${lcn[lc]}</span><span class="v6b-prog" title="${n}/${N} ${L('campos diligenciados', 'fields filled in')}"><i style="width:${Math.round(n / N * 100)}%"></i><b>${n}/${N}</b></span><span class="v6w-caret">${ic('chev', 'sm')}</span></button>
        ${open ? form(a, x) : ''}</div>`;
    }).join('');
    return `<section class="box" id="v6-base"><div class="box-head"><h3>${L('Base instalada y ciclo de vida · Critical Infrastructure', 'Installed base and lifecycle · Critical Infrastructure')}</h3>
        <div class="row" style="gap:6px"><button class="btn ghost sm" data-act="v6b-export">${ic('down', 'sm')}${L('Descargar plantilla Excel', 'Download Excel template')}</button><label class="btn soft sm" for="v6b-imp">${ic('plus', 'sm')}${L('Importar Excel', 'Import Excel')}</label><input class="sr" type="file" id="v6b-imp" accept=".xlsx,.xls,.csv"></div>
        <p>${L('Cinco familias de la lámina 2. El estado de ciclo de vida requiere fuente del fabricante; no se infiere de la edad. Puede diligenciar aquí activo por activo y guardar parcial, o descargar la plantilla, completarla en Excel y subirla.', 'The five families of slide 2. Lifecycle status needs a vendor source; it is not inferred from age. Fill in asset by asset here and save partially, or download the template, complete it in Excel and upload it.')}</p></div>
      <div class="box-body"><div class="v6b-kpi">${kpi.map(([k, n]) => `<button class="v6b-k ${F.lc === k ? 'on' : ''}" data-act="v6b-f" data-f="lc" data-v="${F.lc === k ? '' : k}"><span class="v6-lc ${k}">${lcn[k]}</span><b>${n}</b></button>`).join('')}</div>
        <div class="v6b-bar"><div class="v6-pf">${fam.filter(f => !f[0] || f[2]).map(([k, l, n]) => `<button class="v6-pfb" data-act="v6b-f" data-f="fam" data-v="${k}" aria-pressed="${(F.fam || '') === k}">${l}<b>${n}</b></button>`).join('')}</div>
          <div class="row" style="gap:8px"><label class="check"><input type="checkbox" data-v6b-inc ${F.inc ? 'checked' : ''}><span>${L('Solo incompletos', 'Incomplete only')}</span></label><input id="v6b-q" class="inp" type="search" placeholder="${L('Buscar TAG, nombre, fabricante…', 'Search TAG, name, manufacturer…')}" value="${h(F.q || '')}" style="min-width:220px"></div></div>
        <div class="v6b-list">${rows || `<div class="empty">${all.length ? L('Ningún activo con estos filtros.', 'No assets match these filters.') : L('Sin activos todavía: regístrelos en «Por proceso y área» o impórtelos con la plantilla.', 'No assets yet: record them in “By process and area” or import them with the template.')}</div>`}</div>
        <p class="small mut">${list.length} ${L('de', 'of')} ${all.length} ${L('activos', 'assets')} · ${all.filter(x => done(x) === N).length} ${L('completos', 'complete')}</p></div></section>`;
  };
  function form(a, x) {
    const lc = x.lifecycle || {}; const f = (k, lbl, v, ph, type) => `<div class="field"><label for="v6b-${k}-${x.id}">${lbl}</label><input id="v6b-${k}-${x.id}" ${type ? `type="${type}"` : ''} value="${h(v == null ? '' : v)}" placeholder="${h(ph || '')}"></div>`;
    const s = (k, lbl, v, opts) => `<div class="field"><label for="v6b-${k}-${x.id}">${lbl}</label><select id="v6b-${k}-${x.id}">${opts.map(o => U.opt(o[0], o[1], v == null ? '' : v)).join('')}</select></div>`;
    return `<div class="v6b-form"><div class="sec-title">${L('Identificación', 'Identification')}</div><div class="grid3">${s('family', L('Familia', 'Family'), x.family || '', [['', L('Equipo de proceso', 'Process equipment')]].concat(FAM()))}${f('mfr', L('Fabricante', 'Manufacturer'), x.mfr)}${f('model', L('Modelo', 'Model'), x.model)}</div>
      <div class="grid3">${f('version', L('Versión / firmware', 'Version / firmware'), x.version)}</div>
      <div class="sec-title">${L('Ciclo de vida (fuente del fabricante)', 'Lifecycle (vendor source)')}</div><div class="grid3">${s('lc', L('Estado', 'Status'), lc.status || 'unknown', Object.entries(LCN()))}${f('lcsrc', L('Fuente del fabricante', 'Vendor source'), lc.source, L('Boletín, página, carta…', 'Bulletin, page, letter…'))}${f('lcdate', L('Fecha de consulta', 'Check date'), lc.consultedAt || '', '', 'date')}</div>
      <div class="sec-title">${L('Soportabilidad', 'Supportability')}</div><div class="grid3">${f('support', L('Soporte', 'Support'), x.support, L('Contrato, garantía…', 'Contract, warranty…'))}${f('spares', L('Repuestos', 'Spares'), x.spares, L('En bodega, ninguno…', 'In stock, none…'))}${f('redundancy', L('Redundancia', 'Redundancy'), x.redundancy, L('1oo2, equipo único…', '1oo2, single unit…'))}</div>
      <div class="v6w-card-f"><span class="small mut">${L('Puede guardar con campos vacíos y completarlos después.', 'You can save with empty fields and complete them later.')}</span><span class="row" style="gap:6px"><button class="btn ghost sm" data-act="v6b-tg" data-id="${x.id}">${L('Cancelar', 'Cancel')}</button><button class="btn primary sm" data-act="v6b-save" data-id="${x.id}">${ic('check', 'sm')}${L('Guardar', 'Save')}</button></span></div></div>`;
  }
  A['v6b-tg'] = el => { const id = el.dataset.id; OPEN.has(id) ? OPEN.delete(id) : OPEN.add(id); R(); };
  A['v6b-f'] = el => { const F = C.S.ui.ibf || (C.S.ui.ibf = {}); F[el.dataset.f] = el.dataset.v; C.save(); R(); };
  document.addEventListener('change', e => { if (e.target.dataset && 'v6bInc' in e.target.dataset) { (C.S.ui.ibf || (C.S.ui.ibf = {})).inc = e.target.checked; C.save(); R(); } if (e.target.id === 'v6b-imp') { const f = e.target.files[0]; e.target.value = ''; if (f) importFile(f); } });
  let qT; document.addEventListener('input', e => { if (e.target.id !== 'v6b-q') return; const v = e.target.value; clearTimeout(qT); qT = setTimeout(() => { (C.S.ui.ibf || (C.S.ui.ibf = {})).q = v; R(); const i = document.getElementById('v6b-q'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } }, 200); });
  function apply(a, x, d, src) {
    const prev = (x.lifecycle || {}).status; ['family', 'mfr', 'model', 'version', 'support', 'spares', 'redundancy'].forEach(k => { if (d[k] !== undefined) x[k] = k === 'family' ? (d[k] || null) : d[k]; });
    x.lifecycle = Object.assign({ status: 'unknown', source: '', consultedAt: null, reviewedBy: null }, x.lifecycle || {});
    if (d.lc !== undefined) x.lifecycle.status = d.lc || 'unknown'; if (d.lcsrc !== undefined) x.lifecycle.source = d.lcsrc; if (d.lcdate !== undefined) x.lifecycle.consultedAt = d.lcdate || null;
    if (x.lifecycle.status !== prev) x.lifecycle.reviewedBy = C.S.userId;
    C.recLog && C.recLog(x, 'Actualizó base instalada (' + src + ')', 'Updated installed base (' + src + ')');
  }
  A['v6b-save'] = el => {
    const a = C.cur(); const x = C.asset(a, el.dataset.id); if (!x) return; const g = k => ((document.getElementById(`v6b-${k}-${x.id}`) || {}).value || '').trim();
    apply(a, x, { family: g('family'), mfr: g('mfr'), model: g('model'), version: g('version'), lc: g('lc'), lcsrc: g('lcsrc'), lcdate: g('lcdate'), support: g('support'), spares: g('spares'), redundancy: g('redundancy') }, L('formulario', 'form'));
    C.log(a, 'Actualizó la base instalada de ' + x.tag, 'Updated installed base of ' + x.tag); C.save(); OPEN.delete(x.id); R(); U.toast(L(`${x.tag} guardado · ${done(x)}/${FIELDS().length} campos`, `${x.tag} saved · ${done(x)}/${FIELDS().length} fields`));
  };

  /* ---------- plantilla Excel ---------- */
  const AREAS = a => a.areas.filter(z => !C.isOut(z));
  const AREAL = (a, id) => { const z = C.area(a, id); return z ? (z.cat0 || z.id) + ' · ' + tx(z.name) : ''; };
  const findArea = (a, v) => { if (!v) return null; const t = String(v).trim().toLowerCase(); const code = t.split(' · ')[0];
    return AREAS(a).find(z => AREAL(a, z.id).toLowerCase() === t || String(z.id).toLowerCase() === code || String(z.cat0 || '').toLowerCase() === code) || AREAS(a).find(z => tx(z.name).toLowerCase() === t || String(z.name).toLowerCase() === t) || null; };
  const nextNoTag = (a, taken) => { let n = 1; const k = () => 'SIN-TAG-' + String(n).padStart(2, '0'); while (a.assets.some(y => String(y.tag).toUpperCase() === k()) || (taken && taken.has(k()))) n++; return k(); };
  const COLS = () => [['id', 'ID (no modificar)'], ['tag', 'TAG'], ['name', L('Descripción', 'Description')], ['area', L('Área', 'Area')], ['type', L('Tipo', 'Type')], ['family', L('Familia', 'Family')], ['mfr', L('Fabricante', 'Manufacturer')], ['model', L('Modelo', 'Model')], ['version', L('Versión / firmware', 'Version / firmware')],
    ['lc', L('Ciclo de vida', 'Lifecycle')], ['lcsrc', L('Fuente del fabricante', 'Vendor source')], ['lcdate', L('Fecha de consulta (AAAA-MM-DD)', 'Check date (YYYY-MM-DD)')], ['support', L('Soporte', 'Support')], ['spares', L('Repuestos', 'Spares')], ['redundancy', L('Redundancia', 'Redundancy')]];
  A['v6b-export'] = async () => {
    const a = C.cur(); let X; try { X = await U.loadXLSX(); } catch (e) { return U.toast(e.message); }
    const cols = COLS(); const lcn = LCN();
    const data = [cols.map(c => c[1])].concat(a.assets.filter(x => !C.isOut(x)).map(x => cols.map(([k]) => k === 'id' ? x.id : k === 'name' ? tx(x.name) : k === 'area' ? AREAL(a, x.area) : k === 'type' ? tx(x.type || '') : k === 'family' ? (x.family ? FAMN(x.family) : '') : k === 'lc' ? lcn[(x.lifecycle || {}).status || 'unknown'] : k === 'lcsrc' ? (x.lifecycle || {}).source || '' : k === 'lcdate' ? (x.lifecycle || {}).consultedAt || '' : x[k] || '')));
    const wb = X.utils.book_new(); const ws = X.utils.aoa_to_sheet(data); ws['!cols'] = cols.map(([k]) => ({ wch: k === 'name' || k === 'lcsrc' || k === 'area' ? 34 : k === 'id' ? 12 : 18 })); X.utils.book_append_sheet(wb, ws, L('Base instalada', 'Installed base'));
    const lists = [[L('Familia', 'Family'), L('Ciclo de vida', 'Lifecycle'), L('Área (para activos nuevos)', 'Area (for new assets)'), L('Tipo (sugeridos)', 'Type (suggested)')]]; const fl = FAM().map(f => f[1]).concat(L('Equipo de proceso', 'Process equipment')), ll = Object.values(lcn), al = AREAS(a).map(z => AREAL(a, z.id)), tl = [...new Set(D.ASSET_TYPES || [])].map(tx); for (let i = 0; i < Math.max(fl.length, ll.length, al.length, tl.length); i++) lists.push([fl[i] || '', ll[i] || '', al[i] || '', tl[i] || '']);
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(lists), L('Valores válidos', 'Valid values'));
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([[L('Instrucciones', 'Instructions')], [L('1. No modifique la columna ID: se usa para encontrar el activo. Si la deja vacía, se busca por TAG. Puede cambiar el TAG y la descripción de un activo existente.', '1. Do not change the ID column: it is used to find the asset. If empty, the TAG is used. You can change the TAG and description of an existing asset.')], [L('2. Familia y Ciclo de vida deben usar los valores de la hoja «Valores válidos».', '2. Family and Lifecycle must use the values in the “Valid values” sheet.')], [L('3. Las celdas vacías no borran lo que ya existe en ORA.', '3. Empty cells do not erase what already exists in ORA.')], [L('4. El ciclo de vida requiere fuente del fabricante; no lo infiera por la edad del equipo.', '4. Lifecycle needs a vendor source; do not infer it from equipment age.')], [L('5. Para crear un activo nuevo, deje el ID vacío y llene Descripción y Área (use un valor de la hoja «Valores válidos»). El TAG es opcional: si no lo tiene, ORA asigna SIN-TAG-01, SIN-TAG-02…', '5. To create a new asset, leave the ID empty and fill in Description and Area (use a value from the “Valid values” sheet). The TAG is optional: without one, ORA assigns SIN-TAG-01, SIN-TAG-02…')], [L('6. Todo pasa por una vista previa antes de aplicarse.', '6. Everything goes through a preview before it is applied.')]]), L('Instrucciones', 'Instructions'));
    const out = X.write(wb, { bookType: 'xlsx', type: 'array' });
    await U.save(`ORA_base_instalada_${a.code}.xlsx`, new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  };
  let PENDING = null;
  async function importFile(f) {
    const a = C.cur(); let X; try { X = await U.loadXLSX(); } catch (e) { return U.toast(e.message); }
    const wb = X.read(await f.arrayBuffer(), { type: 'array' }); const ws = wb.Sheets[wb.SheetNames[0]]; const rows = X.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const head = (rows[0] || []).map(v => String(v).trim().toLowerCase()); const cols = COLS(); const idx = {};
    cols.forEach(([k, lbl]) => { const i = head.findIndex(x => x === lbl.toLowerCase() || x.startsWith(lbl.toLowerCase().split(' (')[0])); if (i >= 0) idx[k] = i; });
    if (idx.id == null && idx.tag == null) return U.toast(L('El archivo no tiene columnas ID ni TAG: use la plantilla descargada', 'The file has no ID or TAG column: use the downloaded template'));
    const famBy = {}; FAM().forEach(f => { famBy[f[1].toLowerCase()] = f[0]; famBy[f[0]] = f[0]; }); famBy[L('equipo de proceso', 'process equipment').toLowerCase()] = '';
    const lcBy = {}; Object.entries(LCN()).forEach(([k, v]) => { lcBy[v.toLowerCase()] = k; lcBy[k] = k; }); Object.entries({ active: 'Active', mature: 'Active mature', eol: 'End of life', discontinued: 'Discontinued', unknown: 'To verify' }).forEach(([k, v]) => { lcBy[v.toLowerCase()] = k; });
    const res = { upd: [], add: [], miss: [], err: [] }; const seen = new Map(); const RW = L('Fila ', 'Row ');
    rows.slice(1).forEach((r, n) => {
      const rn = n + 2; const cell = k => idx[k] == null ? undefined : String(r[idx[k]] == null ? '' : r[idx[k]]).trim();
      const id = cell('id'), tag = (cell('tag') || '').toUpperCase(), name = cell('name') || ''; if (!id && !tag && !name) return;
      let x = id ? C.asset(a, id) : (tag ? a.assets.find(y => !C.isOut(y) && String(y.tag).toUpperCase() === tag) : null);
      if (id && !x) { res.miss.push(id); return; }
      const lbl = x ? x.tag : (tag || name);
      let tagOk = !!tag; if (tag) { const dup = a.assets.some(y => y !== x && !C.isOut(y) && String(y.tag).toUpperCase() === tag) || (seen.has(tag) && seen.get(tag) !== rn); if (dup) { tagOk = false; res.err.push(`${RW}${rn}: ${L('el TAG', 'TAG')} «${tag}» ${L('ya existe o está repetido en el archivo', 'already exists or is repeated in the file')}`); } else seen.set(tag, rn); }
      const d = {}; ['mfr', 'model', 'version', 'support', 'spares', 'redundancy', 'lcsrc', 'lcdate'].forEach(k => { const v = cell(k); if (v) d[k] = v; });
      const fm = cell('family'); if (fm) { if (fm.toLowerCase() in famBy) d.family = famBy[fm.toLowerCase()]; else res.err.push(`${lbl}: ${L('familia no válida', 'invalid family')} «${fm}»`); }
      const lc = cell('lc'); if (lc) { if (lc.toLowerCase() in lcBy) d.lc = lcBy[lc.toLowerCase()]; else res.err.push(`${lbl}: ${L('ciclo de vida no válido', 'invalid lifecycle')} «${lc}»`); }
      if (d.lcdate && /^\d{5}$/.test(d.lcdate)) { const dt = new Date(Date.UTC(1899, 11, 30) + (+d.lcdate) * 864e5); d.lcdate = dt.toISOString().slice(0, 10); }
      const ty = cell('type');
      if (!x) { // activo nuevo
        const arC = cell('area'); const ar = findArea(a, arC);
        if (!name) { res.err.push(`${RW}${rn}: ${L('para crear un activo falta la Descripción', 'Description is required to create an asset')}`); return; }
        if (!ar) { res.err.push(`${RW}${rn} (${name}): ${arC ? L('área no válida', 'invalid area') + ` «${arC}»` : L('para crear un activo falta el Área', 'Area is required to create an asset')}`); return; }
        if (tag && !tagOk) { res.err.push(`${RW}${rn} (${name}): ${L('no se crea por el TAG repetido', 'not created because of the repeated TAG')}`); return; }
        res.add.push({ row: rn, tag, name, type: ty || '', ar, d }); return;
      }
      if (tagOk && tag !== String(x.tag).toUpperCase()) d.tag = tag;
      if (name && name !== tx(x.name)) d.name = name;
      if (ty && ty !== tx(x.type || '')) d.type = ty;
      const cur = k => k === 'lc' ? (x.lifecycle || {}).status : k === 'lcsrc' ? (x.lifecycle || {}).source : k === 'lcdate' ? (x.lifecycle || {}).consultedAt : k === 'tag' ? String(x.tag).toUpperCase() : x[k] || '';
      const ch = Object.keys(d).filter(k => String(cur(k)) !== String(d[k]));
      if (ch.length) res.upd.push({ x, d, ch });
    });
    // TAG provisional para los nuevos sin TAG
    const taken = new Set(seen.keys()); res.add.filter(n => !n.tag).forEach(n => { n.tag = nextNoTag(a, taken); n.noTag = true; taken.add(n.tag); });
    PENDING = { res, file: f.name }; U.openModal('v6bimp', {});
  }
  U.modals.v6bimp = function (a) { a = a || C.cur();
    const r = PENDING.res; const NM = Object.fromEntries(COLS().map(c => [c[0], c[1]]));
    return { title: L('Importar base instalada · vista previa', 'Import installed base · preview'), wide: true, body: `<p class="small mut">${h(PENDING.file)}</p>
      <div class="v6b-kpi"><div class="v6b-k"><span>${L('Activos con cambios', 'Assets with changes')}</span><b>${r.upd.length}</b></div><div class="v6b-k"><span>${L('Activos nuevos', 'New assets')}</span><b>${r.add.length}</b></div><div class="v6b-k"><span>${L('ID no encontrados', 'IDs not found')}</span><b>${r.miss.length}</b></div><div class="v6b-k"><span>${L('Avisos', 'Warnings')}</span><b>${r.err.length}</b></div></div>
      ${r.upd.length ? `<div class="sec-title">${L('Se actualizan', 'To update')}</div><div class="v6b-prev">${r.upd.map(u => `<div><b>${h(u.x.tag)}</b>${u.d.tag ? ` → <b>${h(u.d.tag)}</b>` : ''} <span class="small mut">${u.ch.map(k => h(NM[k] || k)).join(', ')}</span></div>`).join('')}</div>` : ''}
      ${r.add.length ? `<div class="sec-title">${L('Se crean', 'To create')}</div><div class="v6b-prev">${r.add.map(n => `<div><span class="v6w-id ${n.noTag ? 'notag' : ''}">${h(n.tag)}</span> <b>${h(n.name)}</b> <span class="small mut">${h(AREAL(a, n.ar.id))}${n.noTag ? ' · ' + L('sin TAG: identificador provisional', 'no TAG: provisional identifier') : ''}</span></div>`).join('')}</div>` : ''}
      ${!r.upd.length && !r.add.length ? `<p>${L('No hay cambios para aplicar.', 'There are no changes to apply.')}</p>` : ''}
      ${r.miss.length ? `<p class="small"><b>${L('ID que no existen en este assessment (se ignoran): ', 'IDs not in this assessment (ignored): ')}</b>${h(r.miss.join(', '))}</p>` : ''}${r.err.length ? `<ul class="plain small">${r.err.map(e => `<li>${h(e)}</li>`).join('')}</ul>` : ''}
      <p class="hint">${L('Las celdas vacías no borran datos existentes. Los valores no válidos se ignoran (el resto de la fila sí se aplica) y las filas con aviso que no se pueden crear se omiten.', 'Empty cells do not erase existing data. Invalid values are ignored (the rest of the row is applied) and rows that cannot be created are skipped.')}</p>`,
      foot: `<button class="btn ghost" data-act="modal-close">${L('Cancelar', 'Cancel')}</button><button class="btn primary" data-act="v6b-imp-ok" ${r.upd.length + r.add.length ? '' : 'disabled'}>${L('Aplicar ', 'Apply ')}${r.upd.length + r.add.length}${L(' cambios', ' changes')}</button>` };
  };
  A['v6b-imp-ok'] = () => { const a = C.cur(); const r = PENDING.res; const me = C.uname(C.S.userId);
    r.upd.forEach(u => { const x = u.x; if (u.d.tag) { x.tag = u.d.tag; x.noTag = false; } if (u.d.name) x.name = u.d.name; if (u.d.type) x.type = u.d.type; apply(a, x, u.d, 'Excel'); });
    r.add.forEach(n => { const ps = C.recProcs(n.ar).filter(pk => C.included(a).some(p => p.key === pk)); const tag = a.assets.some(y => String(y.tag).toUpperCase() === n.tag) ? nextNoTag(a) : n.tag;
      const nx = { id: C.uid('AS'), tag, noTag: !!n.noTag || /^SIN-TAG-/.test(tag), name: n.name, type: n.type, area: n.ar.id, proc: ps[0] || n.ar.proc, procs: ps.length ? ps : [n.ar.proc].filter(Boolean), ver: '', prov: 'excel', val: { status: 'sugerido' }, log: [], by: me };
      a.assets.push(nx); C.setVal(a, 'asset', nx, 'validado', { src: PENDING.file, reason: L('Creado desde la plantilla Excel de base instalada', 'Created from the installed base Excel template') }); apply(a, nx, n.d, 'Excel'); });
    C.log(a, `Importó la base instalada desde Excel (${r.upd.length} actualizados, ${r.add.length} nuevos)`, `Imported installed base from Excel (${r.upd.length} updated, ${r.add.length} new)`); C.save(); PENDING = null; U.closeModal(); R();
    U.toast(L(`${r.upd.length} activos actualizados · ${r.add.length} creados`, `${r.upd.length} assets updated · ${r.add.length} created`)); };
  U.v6ibImport = importFile; // para pruebas
})();
