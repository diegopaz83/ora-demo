/* ORA demo — EN/ES. L(es,en) for interface text; tx(s) translates seed/library content; user-typed text stays as typed. */
(function () {
  const EN = {};
  let lang = 'en';
  try { const v = localStorage.getItem('ora-lang'); if (v === 'es' || v === 'en') lang = v; } catch (e) {}
  const I = {
    EN,
    get lang() { return lang; },
    set(l) { lang = l; document.documentElement.lang = l; try { localStorage.setItem('ora-lang', l); } catch (e) {} },
    L: (es, en) => lang === 'en' ? en : es,
    tx: s => (lang === 'en' && s != null && Object.prototype.hasOwnProperty.call(EN, s)) ? EN[s] : s,
    B: (es, en) => { EN[es] = en; return es; },
    loc: () => lang === 'en' ? 'en-US' : 'es-CO'
  };
  // shared vocabulary (internal values stay in Spanish; display is translated)
  [['Sí', 'Yes'], ['No', 'No'], ['Desconocido', 'Unknown'], ['No aplica', 'Not applicable'], ['Verificado', 'Verified'], ['Estimado', 'Estimated'], ['Parcial', 'Partial'], ['No verificado', 'Not verified'], ['Ausente', 'Absent'],
    ['Alto', 'High'], ['Medio', 'Medium'], ['Bajo', 'Low'], ['Pendiente', 'Pending'], ['Alta', 'High'], ['Media', 'Medium'], ['Baja', 'Low'],
    ['Por revisar', 'To review'], ['Aprobada', 'Approved'], ['Requiere nueva toma', 'Retake needed'], ['Borrador', 'Draft'], ['Aprobado', 'Approved'],
    ['Propuesta', 'Proposed'], ['Aceptada', 'Accepted'], ['En curso', 'In progress'], ['Completada', 'Completed'], ['Evaluado', 'Assessed'],
    ['Verificado en sitio', 'Verified on site'], ['Documentado', 'Documented'], ['Declarado', 'Declared'],
    ['Bomba', 'Pump'], ['PLC', 'PLC'], ['HMI', 'HMI'], ['Switch OT', 'OT switch'], ['UPS', 'UPS'], ['Instrumento', 'Instrument'], ['Computador de flujo', 'Flow computer'], ['Variador', 'Drive'], ['Otro', 'Other'],
    ['Control', 'Control'], ['Energía', 'Power'], ['Comunicación', 'Communication'], ['Señal / medición', 'Signal / measurement'], ['Proceso', 'Process'],
    ['Redundancia', 'Redundancy'], ['Respaldo y recuperación', 'Backup & recovery'], ['Obsolescencia', 'Obsolescence'], ['Redes OT', 'OT networks'], ['Instrumentación', 'Instrumentation'], ['Continuidad operativa', 'Operational continuity'],
    ['Inmediato (0–30 días)', 'Immediate (0–30 days)'], ['Corto plazo (1–3 meses)', 'Short term (1–3 months)'], ['Mediano plazo (3–6 meses)', 'Medium term (3–6 months)'], ['Análisis posterior recomendado', 'Further analysis recommended'],
    ['Acceso restringido', 'Restricted access'], ['Prohibición de fotografía del cliente', 'Client photography ban'], ['Condición insegura', 'Unsafe condition'], ['Equipo inaccesible', 'Equipment not accessible'], ['Limitación técnica (iluminación, cámara)', 'Technical limitation (lighting, camera)'],
    ['Por definir con el cliente', 'To be agreed with client'], ['Agregado por el evaluador', 'Added by assessor']
  ].forEach(([e, n]) => { EN[e] = n; });
  I.set(lang);
  window.ORA_I18N = I;
})();
