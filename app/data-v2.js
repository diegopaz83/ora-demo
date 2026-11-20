/* ORA demo — initial configuration (fictitious content, to be validated by Omnicon specialists) */
(function () {
  const B = window.ORA_I18N.B;
  const ALL = ['light', 'two', 'custom'];
  const DIMS = ['Redundancia', 'Respaldo y recuperación', 'Obsolescencia', 'Redes OT', 'Instrumentación', 'Continuidad operativa'];

  const INDUSTRIES = [
    { key: 'oilgas', name: 'Oil & Gas', icon: 'assets/ind-oilgas.png' },
    { key: 'cemento', name: B('Cemento', 'Cement') },
    { key: 'mineria', name: B('Minería', 'Mining') },
    { key: 'energia', name: B('Generación de energía', 'Power generation') }
  ];
  const P = (key, es, en, des, den) => ({ key, name: B(es, en), desc: B(des, den) });
  const TEMPLATES = {
    oilgas: { version: 2, processes: [
      P('bombeo', 'Bombeo de crudo', 'Crude oil pumping', 'Impulsión del crudo hacia el oleoducto troncal.', 'Pumping crude into the trunk pipeline.'),
      P('medicion', 'Medición fiscal / transferencia de custodia', 'Fiscal metering / custody transfer', 'Medición de volumen para facturación y nominaciones.', 'Volume measurement for billing and nominations.'),
      P('almac', 'Almacenamiento en tanques', 'Tank storage', 'Recepción y almacenamiento previo al bombeo.', 'Receipt and storage before pumping.'),
      P('compresion', 'Compresión de gas', 'Gas compression', 'Compresión de gas asociado para venta o reinyección.', 'Associated gas compression for sale or reinjection.'),
      P('agua', 'Tratamiento de agua de producción', 'Produced water treatment', 'Separación y disposición del agua asociada.', 'Separation and disposal of associated water.'),
      P('incendio', 'Sistema contra incendio', 'Fire protection system', 'Bombas, red y detección contra incendio.', 'Fire pumps, network and detection.')
    ] },
    cemento: { version: 1, processes: [
      P('molcrudo', 'Molienda de crudo', 'Raw milling', 'Preparación de harina cruda.', 'Raw meal preparation.'),
      P('horno', 'Clinkerización (horno)', 'Clinker production (kiln)', 'Horno rotatorio, precalentador y enfriador.', 'Rotary kiln, preheater and cooler.'),
      P('molcem', 'Molienda de cemento', 'Cement milling', 'Molienda de clínker y adiciones.', 'Clinker and additives grinding.'),
      P('despacho', 'Empaque y despacho', 'Packing and dispatch', 'Ensacado y cargue.', 'Bagging and loading.')
    ] },
    mineria: { version: 1, processes: [
      P('chancado', 'Chancado', 'Crushing', 'Reducción primaria de mineral.', 'Primary ore size reduction.'),
      P('molienda', 'Molienda', 'Grinding', 'Molinos SAG y de bolas.', 'SAG and ball mills.'),
      P('flotacion', 'Flotación', 'Flotation', 'Concentración de mineral.', 'Ore concentration.'),
      P('relaves', 'Bombeo de relaves', 'Tailings pumping', 'Transporte de relaves al depósito.', 'Tailings transport to storage facility.')
    ] },
    energia: { version: 1, processes: [
      P('generacion', 'Generación', 'Generation', 'Unidades de generación y su control.', 'Generating units and their control.'),
      P('subestacion', 'Subestación y evacuación', 'Substation and grid export', 'Transformación y conexión a la red.', 'Transformation and grid connection.'),
      P('auxiliares', 'Servicios auxiliares', 'Auxiliary services', 'Energía auxiliar, refrigeración, aire.', 'Auxiliary power, cooling, air.')
    ] }
  };

  // ---------- Industrial Knowledge Catalog (v1, DEMO · ficticio, por validar con especialistas) ----------
  const OT_CATS = [['control', 'Control', 'Control'], ['red', 'Red OT', 'OT network'], ['energia', 'Energía', 'Power'], ['instr', 'Instrumentación y medición', 'Instrumentation & metering'], ['sup', 'Supervisión / HMI / SCADA', 'Supervision / HMI / SCADA'], ['seg', 'Seguridad (ESD / SIS)', 'Safety (ESD / SIS)'], ['datos', 'Software y datos', 'Software & data'], ['aux', 'Servicios auxiliares', 'Auxiliary services'], ['proceso', 'Equipo de proceso', 'Process equipment']].map(([key, es, en]) => ({ key, name: B(es, en) }));
  const ASSET_TYPE_CAT = { 'Bomba': 'proceso', 'PLC': 'control', 'HMI': 'sup', 'Switch OT': 'red', 'UPS': 'energia', 'Instrumento': 'instr', 'Computador de flujo': 'instr', 'Variador': 'control', 'Otro': '' };
  const CA = (id, es, en, procs) => ({ id, name: B(es, en), procs, active: true, v: 1 });
  const CS = (id, es, en, cat, procs, types) => ({ id, name: B(es, en), cat, procs, types: types || [], active: true, v: 1 });
  const CD = (id, from, to, type, es, en) => ({ id, from, to, type, desc: es ? B(es, en) : '', active: true, v: 1 });
  const CC = (id, es, en, procs) => ({ id, name: B(es, en), procs: procs || [], active: true, v: 1 });
  const CATALOG = {
    oilgas: {
      areas: [CA('OG-AR-01', 'Casa de bombas', 'Pump house', ['bombeo']), CA('OG-AR-02', 'Cuarto de control', 'Control room', ['bombeo', 'medicion']), CA('OG-AR-03', 'Skid de medición fiscal', 'Fiscal metering skid', ['medicion']), CA('OG-AR-04', 'Patio de tanques', 'Tank farm', ['almac']), CA('OG-AR-05', 'Subestación eléctrica', 'Electrical substation', ['bombeo', 'compresion']), CA('OG-AR-06', 'Sala de compresores', 'Compressor house', ['compresion'])],
      systems: [CS('OG-SY-01', 'Sistema de control de bombeo', 'Pumping control system', 'control', ['bombeo'], ['PLC', 'HMI']), CS('OG-SY-02', 'Red OT de la instalación', 'Facility OT network', 'red', ['bombeo', 'medicion', 'almac'], ['Switch OT']), CS('OG-SY-03', 'Energía respaldada de control', 'Backed-up control power', 'energia', ['bombeo', 'medicion'], ['UPS']), CS('OG-SY-04', 'Sistema de medición fiscal', 'Fiscal metering system', 'instr', ['medicion'], ['Instrumento', 'Computador de flujo']), CS('OG-SY-05', 'Sistema de parada de emergencia', 'Emergency shutdown system', 'seg', ['bombeo']), CS('OG-SY-06', 'SCADA / centro de control', 'SCADA / control center', 'sup', ['bombeo', 'medicion']), CS('OG-SY-07', 'Unidades de bombeo', 'Pumping units', 'proceso', ['bombeo'], ['Bomba', 'Variador']), CS('OG-SY-08', 'Control de tanques', 'Tank control', 'control', ['almac']), CS('OG-SY-09', 'Sistema contra incendio', 'Fire protection system', 'seg', ['incendio'])],
      deps: [CD('OG-DP-01', 'OG-SY-07', 'OG-SY-01', 'Control', 'Arranque, parada y permisivos de las bombas.', 'Pump start, stop and permissives.'), CD('OG-DP-02', 'OG-SY-01', 'OG-SY-03', 'Energía'), CD('OG-DP-03', 'OG-SY-01', 'OG-SY-02', 'Comunicación'), CD('OG-DP-04', 'OG-SY-06', 'OG-SY-02', 'Comunicación'), CD('OG-DP-05', 'OG-SY-04', 'OG-SY-03', 'Energía'), CD('OG-DP-06', 'OG-SY-04', 'OG-SY-06', 'Software / datos', 'Envío de volúmenes al centro de control.', 'Volume reports to the control center.'), CD('OG-DP-07', 'OG-SY-05', 'OG-SY-03', 'Energía')],
      controls: [CC('OG-CT-01', 'Respaldo verificado del programa del PLC', 'Verified PLC program backup', ['bombeo']), CC('OG-CT-02', 'CPU y módulos de repuesto en sitio', 'Spare CPU and modules on site', ['bombeo']), CC('OG-CT-03', 'Procedimiento probado de operación local', 'Tested local operation procedure', ['bombeo']), CC('OG-CT-04', 'UPS con autonomía verificada', 'UPS with verified autonomy'), CC('OG-CT-05', 'Calibración trazable de medidores', 'Traceable meter calibration', ['medicion']), CC('OG-CT-06', 'Verificación intermedia contra patrón', 'Intermediate check against master meter', ['medicion']), CC('OG-CT-07', 'Segmentación red OT / corporativa', 'OT / corporate network segmentation'), CC('OG-CT-08', 'Ruta alterna de comunicaciones', 'Alternate communications route')]
    },
    cemento: {
      areas: [CA('CE-AR-01', 'Trituración y prehomogeneización', 'Crushing and pre-blending', ['molcrudo']), CA('CE-AR-02', 'Molino de crudo', 'Raw mill', ['molcrudo']), CA('CE-AR-03', 'Horno y enfriador', 'Kiln and cooler', ['horno']), CA('CE-AR-04', 'Molino de cemento', 'Cement mill', ['molcem']), CA('CE-AR-05', 'Ensacado y despacho', 'Packing and dispatch', ['despacho']), CA('CE-AR-06', 'Cuarto de control central', 'Central control room', ['molcrudo', 'horno', 'molcem', 'despacho'])],
      systems: [CS('CE-SY-01', 'DCS de planta', 'Plant DCS', 'control', ['molcrudo', 'horno', 'molcem', 'despacho'], ['PLC', 'HMI']), CS('CE-SY-02', 'Red OT de planta', 'Plant OT network', 'red', ['molcrudo', 'horno', 'molcem', 'despacho'], ['Switch OT']), CS('CE-SY-03', 'Analizadores de gases del horno', 'Kiln gas analyzers', 'instr', ['horno'], ['Instrumento']), CS('CE-SY-04', 'Accionamientos del horno', 'Kiln drives', 'proceso', ['horno'], ['Variador']), CS('CE-SY-05', 'Accionamientos de molinos', 'Mill drives', 'proceso', ['molcrudo', 'molcem'], ['Variador']), CS('CE-SY-06', 'Básculas y dosificación', 'Weighing and dosing', 'instr', ['molcrudo', 'molcem']), CS('CE-SY-07', 'Aire comprimido', 'Compressed air', 'aux', ['molcrudo', 'horno', 'molcem', 'despacho']), CS('CE-SY-08', 'Energía de planta', 'Plant power', 'energia', ['molcrudo', 'horno', 'molcem', 'despacho'], ['UPS'])],
      deps: [CD('CE-DP-01', 'CE-SY-04', 'CE-SY-01', 'Control'), CD('CE-DP-02', 'CE-SY-05', 'CE-SY-01', 'Control'), CD('CE-DP-03', 'CE-SY-01', 'CE-SY-02', 'Comunicación'), CD('CE-DP-04', 'CE-SY-01', 'CE-SY-08', 'Energía'), CD('CE-DP-05', 'CE-SY-06', 'CE-SY-01', 'Señal / medición'), CD('CE-DP-06', 'CE-SY-04', 'CE-SY-07', 'Servicio auxiliar')],
      controls: [CC('CE-CT-01', 'Protección de parada segura independiente del DCS', 'Safe-shutdown protection independent of the DCS', ['horno']), CC('CE-CT-02', 'Repuestos críticos de accionamientos', 'Critical drive spares'), CC('CE-CT-03', 'Respaldo de configuración del DCS', 'DCS configuration backup'), CC('CE-CT-04', 'Calibración de analizadores', 'Analyzer calibration', ['horno'])]
    },
    mineria: {
      areas: [CA('MI-AR-01', 'Chancado primario', 'Primary crushing', ['chancado']), CA('MI-AR-02', 'Molienda SAG y bolas', 'SAG and ball milling', ['molienda']), CA('MI-AR-03', 'Flotación', 'Flotation', ['flotacion']), CA('MI-AR-04', 'Espesadores y relaves', 'Thickeners and tailings', ['relaves', 'flotacion']), CA('MI-AR-05', 'Sala de control', 'Control room', ['chancado', 'molienda', 'flotacion', 'relaves'])],
      systems: [CS('MI-SY-01', 'Sistema de control de planta', 'Plant control system', 'control', ['chancado', 'molienda', 'flotacion', 'relaves'], ['PLC', 'HMI']), CS('MI-SY-02', 'Red OT de planta', 'Plant OT network', 'red', ['chancado', 'molienda', 'flotacion', 'relaves'], ['Switch OT']), CS('MI-SY-03', 'Variadores de molinos', 'Mill drives', 'control', ['molienda'], ['Variador']), CS('MI-SY-04', 'Bombas de relaves', 'Tailings pumps', 'proceso', ['relaves'], ['Bomba']), CS('MI-SY-05', 'Instrumentación de nivel y densidad', 'Level and density instrumentation', 'instr', ['flotacion', 'relaves'], ['Instrumento']), CS('MI-SY-06', 'Agua de proceso', 'Process water', 'aux', ['molienda', 'flotacion']), CS('MI-SY-07', 'Energía de planta', 'Plant power', 'energia', ['chancado', 'molienda', 'flotacion', 'relaves'], ['UPS'])],
      deps: [CD('MI-DP-01', 'MI-SY-03', 'MI-SY-01', 'Control'), CD('MI-DP-02', 'MI-SY-04', 'MI-SY-01', 'Control'), CD('MI-DP-03', 'MI-SY-01', 'MI-SY-02', 'Comunicación'), CD('MI-DP-04', 'MI-SY-05', 'MI-SY-01', 'Señal / medición'), CD('MI-DP-05', 'MI-SY-01', 'MI-SY-07', 'Energía'), CD('MI-DP-06', 'MI-SY-04', 'MI-SY-06', 'Servicio auxiliar')],
      controls: [CC('MI-CT-01', 'Bomba de relaves de respaldo con control independiente', 'Standby tailings pump with independent control', ['relaves']), CC('MI-CT-02', 'Soporte vigente de variadores', 'Current drive support', ['molienda']), CC('MI-CT-03', 'Redundancia de instrumentación de nivel', 'Level instrumentation redundancy', ['flotacion', 'relaves'])]
    },
    energia: {
      areas: [CA('EN-AR-01', 'Casa de máquinas', 'Powerhouse', ['generacion']), CA('EN-AR-02', 'Sala de control', 'Control room', ['generacion', 'subestacion']), CA('EN-AR-03', 'Subestación', 'Substation', ['subestacion']), CA('EN-AR-04', 'Servicios auxiliares', 'Auxiliary services', ['auxiliares'])],
      systems: [CS('EN-SY-01', 'Control de turbina', 'Turbine control', 'control', ['generacion'], ['PLC', 'HMI']), CS('EN-SY-02', 'SCADA de planta', 'Plant SCADA', 'sup', ['generacion', 'subestacion']), CS('EN-SY-03', 'Protecciones de subestación', 'Substation protection', 'seg', ['subestacion']), CS('EN-SY-04', 'Red OT de planta', 'Plant OT network', 'red', ['generacion', 'subestacion', 'auxiliares'], ['Switch OT']), CS('EN-SY-05', 'Servicios auxiliares AC/DC', 'AC/DC auxiliary services', 'energia', ['generacion', 'subestacion', 'auxiliares'], ['UPS']), CS('EN-SY-06', 'Refrigeración', 'Cooling', 'aux', ['generacion'], ['Bomba'])],
      deps: [CD('EN-DP-01', 'EN-SY-01', 'EN-SY-05', 'Energía'), CD('EN-DP-02', 'EN-SY-02', 'EN-SY-04', 'Comunicación'), CD('EN-DP-03', 'EN-SY-03', 'EN-SY-05', 'Energía'), CD('EN-DP-04', 'EN-SY-01', 'EN-SY-06', 'Servicio auxiliar'), CD('EN-DP-05', 'EN-SY-01', 'EN-SY-02', 'Software / datos')],
      controls: [CC('EN-CT-01', 'Controlador de turbina redundante', 'Redundant turbine controller', ['generacion']), CC('EN-CT-02', 'Ajustes de protección respaldados', 'Backed-up protection settings', ['subestacion']), CC('EN-CT-03', 'Prueba periódica de baterías DC', 'Periodic DC battery test', ['auxiliares'])]
    }
  };
  Object.keys(CATALOG).forEach(k => { Object.assign(TEMPLATES[k], CATALOG[k]); TEMPLATES[k].history = [{ v: TEMPLATES[k].version, ts: '2026-11-09T12:00:00.000Z', by: 'gustavo-ramirez', es: 'Versión inicial del catálogo (DEMO)', en: 'Initial catalog version (DEMO)' }]; TEMPLATES[k].processes.forEach(p => { p.active = true; p.id = k.slice(0, 2).toUpperCase() + '-PR-' + p.key; }); });
  [['Bomba', 'Pump'], ['Variador', 'Drive']].forEach(() => {});
  B('Importado (Excel)', 'Imported (Excel)'); B('Red / comunicación', 'Network / communication'); B('Operacional / proceso', 'Operational / process'); B('Software / datos', 'Software / data'); B('Servicio auxiliar', 'Auxiliary service');

  const MODALITIES = {
    light: { key: 'light', name: 'Light', dur: B('3 días totales', '3 days total'), count: 10, desc: B('Diagnóstico focalizado de procesos críticos seleccionados. Incluye preparación, campo, análisis e informe.', 'Focused diagnosis of selected critical processes. Includes preparation, fieldwork, analysis and report.') },
    two: { key: 'two', name: B('Dos semanas', 'Two weeks'), dur: B('10 días hábiles (hipótesis)', '10 business days (hypothesis)'), count: 20, desc: B('Evaluación estructurada con mayor cobertura, triangulación y validación en campo.', 'Structured assessment with broader coverage, triangulation and field validation.') },
    custom: { key: 'custom', name: 'Custom', dur: B('Variable', 'Variable'), count: 26, desc: B('Investigación especializada con alcance configurable.', 'Specialized investigation with configurable scope.') }
  };

  const USERS = [
    { id: 'gustavo-ramirez', name: 'Gustavo Ramírez', role: 'admin' },
    { id: 'kenya-sanchez', name: 'Kenya Sánchez', role: 'ejecutor' },
    { id: 'cristian-perez', name: 'Cristian Pérez', role: 'ejecutor' },
    { id: 'juan-menco', name: 'Juan Menco', role: 'ejecutor' },
    { id: 'kevin-pena', name: 'Kevin Peña', role: 'ejecutor' },
    { id: 'laura-posso', name: 'Laura Posso', role: 'ejecutor' },
    { id: 'simon-giraldo', name: 'Simón Giraldo', role: 'ejecutor' }
  ];
  MODALITIES.light.img = 'assets/mod-light.jpg'; MODALITIES.two.img = 'assets/mod-two.jpg'; MODALITIES.custom.img = 'assets/mod-custom.jpg';
  MODALITIES.light.scope = B('Uno o varios procesos críticos seleccionados; no toda la planta.', 'One or several selected critical processes; not the whole plant.');
  MODALITIES.two.scope = B('Procesos y sistemas críticos dentro del alcance pactado.', 'Critical processes and systems within the agreed scope.');
  MODALITIES.custom.scope = B('Análisis especializado según hallazgos, criticidad y objetivos del cliente.', 'Specialized analysis based on findings, criticality and client goals.');
  MODALITIES.light.out = [B('Informe ejecutivo', 'Executive report'), B('Mapa preliminar de exposición', 'Preliminary exposure map'), B('Hallazgos priorizados', 'Prioritized findings'), B('Acciones inmediatas y análisis posteriores', 'Immediate actions and further analysis')];
  MODALITIES.two.out = [B('Informe ejecutivo y técnico', 'Executive and technical report'), B('Matriz de riesgos con evidencia y limitaciones', 'Risk matrix with evidence and limitations'), B('Recomendaciones priorizadas', 'Prioritized recommendations'), B('Hoja de ruta preliminar', 'Preliminary roadmap')];
  MODALITIES.custom.out = [B('Informe especializado', 'Specialized report'), B('Escenarios profundizados', 'In-depth scenarios'), B('Plan de mitigación con criterios de priorización', 'Mitigation plan with prioritization criteria')];

  const ASSET_TYPES = ['Bomba', 'PLC', 'HMI', 'Switch OT', 'UPS', 'Instrumento', 'Computador de flujo', 'Variador', 'Otro'];
  const DEP_TYPES = ['Control', 'Comunicación', 'Energía', 'Software / datos', 'Servicio auxiliar', 'Señal / medición', 'Proceso'];

  const Q = (id, es, en, dim, o) => { if (o && o.why) o.why = B(o.why[0], o.why[1]); return Object.assign({ id, v: 1, text: B(es, en), dim, ind: ['*'], mods: ALL.slice(), order: 99, active: true, req: true, pol: 'control', proc: null, cond: null, ev: false }, o || {}); };

  const QUESTIONS = [
    Q('Q-OG-001', '¿Las bombas del proceso de bombeo son físicamente redundantes (una sola puede asumir el caudal nominal)?', 'Are the pumping process pumps physically redundant (can one alone handle rated flow)?', 'Redundancia', { ind: ['oilgas'], order: 1, proc: 'bombeo', ev: true }),
    Q('Q-COM-003', '¿Se realizan respaldos periódicos de programas y configuraciones de los controladores críticos?', 'Are programs and configurations of critical controllers backed up periodically?', 'Respaldo y recuperación', { order: 2 }),
    Q('Q-COM-001', '¿La instalación tiene definida la tolerancia máxima a interrupción de sus procesos críticos?', 'Has the facility defined the maximum tolerable downtime for its critical processes?', 'Continuidad operativa', { order: 3 }),
    Q('Q-OG-003', '¿Los instrumentos de medición fiscal tienen calibración vigente y trazable?', 'Do fiscal metering instruments have current, traceable calibration?', 'Instrumentación', { ind: ['oilgas'], order: 4, proc: 'medicion', ev: true }),
    Q('Q-COM-007', '¿Los equipos de control críticos tienen alimentación respaldada (UPS) con autonomía verificada?', 'Do critical control devices have backed-up power (UPS) with verified autonomy?', 'Redundancia', { order: 5, ev: true }),
    Q('Q-OG-005', '¿El sistema de parada de emergencia es independiente del PLC de control?', 'Is the emergency shutdown system independent from the control PLC?', 'Redundancia', { ind: ['oilgas'], order: 6, proc: 'bombeo' }),
    Q('Q-COM-004', '¿La red OT está segmentada de la red corporativa?', 'Is the OT network segmented from the corporate network?', 'Redes OT', { order: 7 }),
    Q('Q-COM-006', '¿Existe un plan de continuidad que cubra la pérdida del sistema de control?', 'Is there a continuity plan covering loss of the control system?', 'Continuidad operativa', { order: 8 }),
    Q('Q-OG-004', '¿Las señales críticas de presión y caudal tienen alarmas configuradas y atendidas?', 'Do critical pressure and flow signals have configured and attended alarms?', 'Instrumentación', { ind: ['oilgas'], order: 9, proc: 'bombeo' }),
    Q('Q-COM-005', '¿Los equipos de control críticos tienen soporte vigente del fabricante?', 'Do critical control devices have current vendor support?', 'Obsolescencia', { order: 10 }),
    Q('Q-COM-002', '¿Existe un inventario de activos de control actualizado en los últimos 12 meses?', 'Is there a control asset inventory updated in the last 12 months?', 'Obsolescencia', { order: 11, req: false }),
    Q('Q-COM-008', '¿Se registran y analizan las fallas de los equipos críticos?', 'Are failures of critical equipment recorded and analyzed?', 'Continuidad operativa', { order: 12, req: false }),
    Q('Q-COM-009', '¿El acceso remoto a la red OT está controlado y registrado?', 'Is remote access to the OT network controlled and logged?', 'Redes OT', { order: 13 }),
    Q('Q-COM-010', '¿Hay personal entrenado para restaurar el sistema de control sin apoyo externo?', 'Are there trained staff able to restore the control system without external support?', 'Respaldo y recuperación', { order: 14 }),
    Q('Q-OG-006', '¿Los variadores y arrancadores de las bombas tienen repuestos críticos identificados?', 'Do pump drives and starters have identified critical spares?', 'Obsolescencia', { ind: ['oilgas'], order: 15, proc: 'bombeo', req: false }),
    Q('Q-OG-007', '¿Las comunicaciones con el centro de control tienen ruta alterna?', 'Do communications with the control center have an alternate route?', 'Redes OT', { ind: ['oilgas'], order: 16 }),
    Q('Q-OG-008', '¿El computador de flujo conserva sus registros ante pérdida de energía?', 'Does the flow computer retain its records on power loss?', 'Instrumentación', { ind: ['oilgas'], order: 17, proc: 'medicion' }),
    Q('Q-OG-009', '¿Los PLC y HMI críticos están en versiones de firmware soportadas?', 'Are critical PLCs and HMIs on supported firmware versions?', 'Obsolescencia', { ind: ['oilgas'], order: 18 }),
    Q('Q-OG-010', '¿Existe monitoreo de condición (vibración, temperatura) de las bombas críticas?', 'Is there condition monitoring (vibration, temperature) of critical pumps?', 'Instrumentación', { ind: ['oilgas'], order: 19, proc: 'bombeo', req: false }),
    Q('Q-COM-011', '¿Se han realizado ejercicios de recuperación ante falla del sistema de control?', 'Have recovery drills for control system failure been performed?', 'Continuidad operativa', { order: 20 }),
    Q('Q-COM-012', '¿Los cambios en la lógica de control siguen un procedimiento de gestión del cambio?', 'Do control logic changes follow a management-of-change procedure?', 'Respaldo y recuperación', { order: 21, mods: ['two', 'custom'] }),
    Q('Q-COM-013', '¿Los equipos de red OT críticos tienen redundancia de enlace o equipo?', 'Do critical OT network devices have link or device redundancy?', 'Redes OT', { order: 22, mods: ['two', 'custom'] }),
    Q('Q-OG-002', '¿Las bombas redundantes son controladas por el mismo PLC?', 'Are the redundant pumps controlled by the same PLC?', 'Redundancia', { ind: ['oilgas'], pol: 'contexto', proc: 'bombeo', cond: { q: 'Q-OG-001', in: ['Sí'], shared: true }, why: ['Se activa si las bombas son redundantes o si el recorrido registra dos bombas que dependen del mismo controlador.', 'Triggered if pumps are redundant or the walkdown records two pumps depending on the same controller.'] }),
    Q('Q-OG-101', '¿Existe un respaldo vigente y verificado del programa del PLC compartido?', 'Is there a current, verified backup of the shared PLC program?', 'Respaldo y recuperación', { ind: ['oilgas'], proc: 'bombeo', ev: true, cond: { q: 'Q-OG-002', in: ['Sí'] } }),
    Q('Q-OG-102', '¿Hay CPU y módulos de repuesto del PLC compartido disponibles en sitio?', 'Are spare CPU and modules for the shared PLC available on site?', 'Respaldo y recuperación', { ind: ['oilgas'], proc: 'bombeo', ev: true, cond: { q: 'Q-OG-002', in: ['Sí'] } }),
    Q('Q-OG-103', '¿Existe un procedimiento probado para operar las bombas en modo local si falla el PLC?', 'Is there a tested procedure to run the pumps locally if the PLC fails?', 'Continuidad operativa', { ind: ['oilgas'], proc: 'bombeo', cond: { q: 'Q-OG-002', in: ['Sí'] } }),
    Q('Q-OG-104', '¿Se ha probado la restauración del PLC compartido en los últimos 12 meses?', 'Has restoration of the shared PLC been tested in the last 12 months?', 'Respaldo y recuperación', { ind: ['oilgas'], proc: 'bombeo', req: false, cond: { q: 'Q-OG-002', in: ['Sí'] } }),
    Q('Q-OG-105', '¿Se identificó quién custodia la última copia del programa y en qué medio?', 'Has it been identified who holds the latest program copy and on what media?', 'Respaldo y recuperación', { ind: ['oilgas'], proc: 'bombeo', cond: { q: 'Q-OG-101', in: ['No', 'Desconocido'] } }),
    Q('Q-CEM-001', '¿El horno tiene protección de parada segura independiente del DCS?', 'Does the kiln have safe-shutdown protection independent of the DCS?', 'Redundancia', { ind: ['cemento'], order: 1, proc: 'horno' }),
    Q('Q-CEM-002', '¿Los analizadores de gases del horno tienen calibración y respaldo?', 'Do kiln gas analyzers have calibration and backup?', 'Instrumentación', { ind: ['cemento'], order: 4, proc: 'horno' }),
    Q('Q-CEM-003', '¿Los accionamientos del molino tienen repuestos críticos en sitio?', 'Do mill drives have critical spares on site?', 'Obsolescencia', { ind: ['cemento'], order: 6, proc: 'molcem' }),
    Q('Q-MIN-001', '¿Las bombas de relaves tienen respaldo operativo y control independiente?', 'Do tailings pumps have operational backup and independent control?', 'Redundancia', { ind: ['mineria'], order: 1, proc: 'relaves' }),
    Q('Q-MIN-002', '¿Los sistemas de control del molino SAG tienen soporte vigente?', 'Do SAG mill control systems have current support?', 'Obsolescencia', { ind: ['mineria'], order: 4, proc: 'molienda' }),
    Q('Q-MIN-003', '¿La instrumentación de nivel de espesadores tiene redundancia?', 'Is thickener level instrumentation redundant?', 'Instrumentación', { ind: ['mineria'], order: 6, proc: 'flotacion' }),
    Q('Q-ENE-001', '¿El control de turbina tiene redundancia de controlador?', 'Does turbine control have controller redundancy?', 'Redundancia', { ind: ['energia'], order: 1, proc: 'generacion' }),
    Q('Q-ENE-002', '¿Las protecciones de la subestación tienen ajustes respaldados y verificados?', 'Are substation protection settings backed up and verified?', 'Respaldo y recuperación', { ind: ['energia'], order: 4, proc: 'subestacion' }),
    Q('Q-ENE-003', '¿Los servicios auxiliares críticos tienen alimentación de respaldo probada?', 'Do critical auxiliary services have tested backup power?', 'Continuidad operativa', { ind: ['energia'], order: 6, proc: 'auxiliares' })
  ];
  // why texts for the four shared-PLC branches
  ['Q-OG-101', 'Q-OG-102', 'Q-OG-103', 'Q-OG-104'].forEach((id, i) => { QUESTIONS.find(q => q.id === id).why = B(['Control común: la recuperación depende del respaldo del programa.', 'Control común: el tiempo de recuperación depende de los repuestos.', 'Control común: alternativa operativa ante falla del controlador.', 'Control común: un respaldo no probado es incertidumbre, no control verificado.'][i], ['Common control: recovery depends on the program backup.', 'Common control: recovery time depends on spares.', 'Common control: operating alternative if the controller fails.', 'Common control: an untested backup is uncertainty, not a verified control.'][i]); });
  QUESTIONS.find(q => q.id === 'Q-OG-105').why = B('Se profundiza porque el respaldo es inexistente o desconocido.', 'Deeper inquiry because the backup is missing or unknown.');

  const PHOTO_RULES = { perArea: 1, perFinding: 1, assetTypes: ['Bomba', 'PLC'], perAsset: 1 };
  const PHOTO_REASONS = ['Acceso restringido', 'Prohibición de fotografía del cliente', 'Condición insegura', 'Equipo inaccesible', 'Limitación técnica (iluminación, cámara)', 'Otro'];

  // ---------- Demo assessment: Río Claro Pumping Station (fictitious) ----------
  function seedAssessment(lib, now) {
    const d = (days, h) => { const t = new Date(now); t.setDate(t.getDate() - days); t.setHours(h || 10, 15, 0, 0); return t.toISOString(); };
    const procs = TEMPLATES.oilgas.processes.map(p => ({ key: p.key, name: p.name, desc: p.desc, status: null, just: '', crit: '' }));
    const set = (k, status, es, en, crit) => { const p = procs.find(x => x.key === k); p.status = status; p.just = B(es, en); p.crit = crit || ''; };
    set('bombeo', 'incluido', 'Su interrupción detiene el despacho completo de la estación hacia el oleoducto; el operador reporta penalidades por incumplimiento de nominaciones.', 'An interruption stops all station dispatch to the pipeline; the operator reports penalties for missed nominations.', 'Alta');
    set('medicion', 'incluido', 'Determina el volumen facturado; un error sostenido tiene impacto contractual directo.', 'Determines billed volume; a sustained error has direct contractual impact.', 'Media');
    set('almac', 'fuera', 'Excluido por alcance Light acordado con el cliente; se recomienda evaluarlo en una fase posterior.', 'Excluded under the Light scope agreed with the client; recommended for a later phase.');
    set('compresion', 'na', 'La estación solo maneja crudo; el gas asociado se trata en el campo productor, aguas arriba.', 'The station handles crude only; associated gas is treated upstream at the producing field.');
    set('agua', 'desconocido', 'El responsable de operaciones no pudo confirmar si el tratamiento es propio o de un tercero.', 'The operations lead could not confirm whether treatment is in-house or by a third party.');
    set('incendio', 'fuera', 'Fuera del alcance contratado; tiene programa de inspección propio.', 'Outside contracted scope; it has its own inspection program.');

    const answers = {};
    const A = (q, value, es, en, conf, days) => { answers[q] = { value, note: B(es, en), conf: conf || 'Verificado', ts: d(days || 1, 11), by: (days || 1) === 2 ? 'Kenya Sánchez' : 'Cristian Pérez' }; };
    A('Q-OG-001', 'Sí', 'P-101A y P-101B de 100 % de capacidad cada una (placa y hoja de datos).', 'P-101A and P-101B rated at 100 % capacity each (nameplate and datasheet).', 'Verificado', 1);
    A('Q-OG-002', 'Sí', 'Ambas bombas cableadas al rack del PLC-01 en el cuarto de control.', 'Both pumps wired to the PLC-01 rack in the control room.', 'Verificado', 1);
    A('Q-OG-101', 'Desconocido', 'El responsable de mantenimiento cree que el integrador tiene una copia; no se pudo verificar.', 'The maintenance lead believes the integrator holds a copy; it could not be verified.', 'Desconocido', 1);
    A('Q-OG-102', 'No', 'No hay CPU de repuesto en bodega; el último pedido se canceló por obsolescencia del modelo.', 'No spare CPU in stores; the last order was cancelled because the model is obsolete.', 'Estimado', 1);
    A('Q-COM-003', 'No', 'No existe rutina formal de respaldo.', 'There is no formal backup routine.', 'Estimado', 2);
    A('Q-COM-001', 'Sí', 'Tolerancia declarada: 4 h de parada antes de penalidad contractual.', 'Declared tolerance: 4 h of downtime before contractual penalty.', 'Estimado', 2);
    A('Q-OG-003', 'Sí', 'Certificado de calibración de FT-201 vigente (revisado en sitio).', 'FT-201 calibration certificate current (checked on site).', 'Verificado', 1);
    A('Q-COM-007', 'Sí', 'UPS-01 con 30 min de autonomía; prueba registrada en bitácora.', 'UPS-01 with 30 min autonomy; test recorded in the logbook.', 'Verificado', 1);
    A('Q-OG-005', 'No', 'La ESD comparte el PLC-01; no hay sistema instrumentado independiente.', 'The ESD shares PLC-01; there is no independent instrumented system.', 'Estimado', 1);
    A('Q-COM-006', 'No', 'El plan de continuidad no contempla la pérdida del PLC; solo cubre energía externa.', 'The continuity plan does not cover PLC loss; it only covers external power.', 'Verificado', 1);
    A('Q-OG-004', 'Sí', 'Alarmas de alta/baja presión y bajo caudal configuradas en HMI-01 y atendidas por turno.', 'High/low pressure and low flow alarms configured on HMI-01 and attended each shift.', 'Verificado', 1);
    A('Q-OG-103', 'No', 'Existe un instructivo informal; no se ha ensayado la operación local de las bombas.', 'There is an informal instruction; local pump operation has never been drilled.', 'Estimado', 1);
    A('Q-COM-005', 'No', 'CPU del PLC-01 descontinuada por el fabricante desde 2021.', 'PLC-01 CPU discontinued by the vendor since 2021.', 'Verificado', 1);
    A('Q-COM-004', 'Sí', 'Firewall entre red corporativa y OT (diagrama de red entregado).', 'Firewall between corporate and OT networks (network diagram provided).', 'Estimado', 2);

    const areas = [
      { id: 'A-01', name: B('Casa de bombas', 'Pump house'), proc: 'bombeo' },
      { id: 'A-02', name: B('Cuarto de control', 'Control room'), proc: 'bombeo' },
      { id: 'A-03', name: B('Skid de medición fiscal', 'Fiscal metering skid'), proc: 'medicion' }
    ];
    const AS = (id, tag, es, en, type, area, proc, ver) => ({ id, tag, name: B(es, en), type, area, proc, ver });
    const assets = [
      AS('AS-01', 'P-101A', 'Bomba principal A', 'Main pump A', 'Bomba', 'A-01', 'bombeo', 'Verificado en sitio'),
      AS('AS-02', 'P-101B', 'Bomba principal B', 'Main pump B', 'Bomba', 'A-01', 'bombeo', 'Declarado'),
      AS('AS-03', 'PLC-01', 'PLC de control de bombeo', 'Pumping control PLC', 'PLC', 'A-02', 'bombeo', 'Verificado en sitio'),
      AS('AS-04', 'HMI-01', 'Estación de operación', 'Operator station', 'HMI', 'A-02', 'bombeo', 'Verificado en sitio'),
      AS('AS-05', 'SW-OT-01', 'Switch de red OT', 'OT network switch', 'Switch OT', 'A-02', 'bombeo', 'Documentado'),
      AS('AS-06', 'UPS-01', 'UPS del tablero de control', 'Control panel UPS', 'UPS', 'A-02', 'bombeo', 'Verificado en sitio'),
      AS('AS-07', 'FT-201', 'Medidor de flujo fiscal', 'Fiscal flow meter', 'Instrumento', 'A-03', 'medicion', 'Verificado en sitio'),
      AS('AS-08', 'FC-201', 'Computador de flujo', 'Flow computer', 'Computador de flujo', 'A-03', 'medicion', 'Documentado')
    ];
    const ctlNote = B('Arranque, parada y permisivos.', 'Start, stop and permissives.');
    const deps = [
      { id: 'D-01', from: 'AS-01', to: 'AS-03', type: 'Control', note: ctlNote },
      { id: 'D-02', from: 'AS-02', to: 'AS-03', type: 'Control', note: ctlNote },
      { id: 'D-03', from: 'AS-03', to: 'AS-06', type: 'Energía', note: '' },
      { id: 'D-04', from: 'AS-03', to: 'AS-05', type: 'Comunicación', note: B('Enlace con HMI y centro de control.', 'Link to HMI and control center.') },
      { id: 'D-05', from: 'AS-04', to: 'AS-05', type: 'Comunicación', note: '' },
      { id: 'D-06', from: 'AS-08', to: 'AS-07', type: 'Señal / medición', note: B('Pulsos de volumen.', 'Volume pulses.') }
    ];
    const findings = [
      { id: 'F-01', title: B('Redundancia mecánica sin redundancia de control', 'Mechanical redundancy without control redundancy'), desc: B('P-101A y P-101B son físicamente redundantes, pero ambas dependen del mismo PLC-01. Una falla del controlador detiene las dos bombas.', 'P-101A and P-101B are physically redundant, but both depend on the same PLC-01. A controller failure stops both pumps.'), assets: ['AS-01', 'AS-02', 'AS-03'], q: 'Q-OG-002', ts: d(1, 12) },
      { id: 'F-02', title: B('Respaldo del programa del PLC-01 no verificado', 'PLC-01 program backup not verified'), desc: B('No se encontró evidencia de un respaldo vigente; la custodia se atribuye al integrador sin confirmación.', 'No evidence of a current backup was found; custody is attributed to the integrator without confirmation.'), assets: ['AS-03'], q: 'Q-OG-101', ts: d(1, 12) },
      { id: 'F-03', title: B('Sin CPU de repuesto para PLC-01', 'No spare CPU for PLC-01'), desc: B('El modelo de CPU está descontinuado y no hay unidad de reemplazo en sitio.', 'The CPU model is discontinued and there is no replacement unit on site.'), assets: ['AS-03'], q: 'Q-OG-102', ts: d(1, 13) }
    ];
    const ctl = (es, en, st) => ({ name: B(es, en), st });
    const scenarios = [
      { id: 'E-01', title: B('Falla de la CPU del PLC-01 detiene P-101A y P-101B a la vez', 'PLC-01 CPU failure stops P-101A and P-101B at once'), proc: 'bombeo', assets: ['AS-01', 'AS-02', 'AS-03'], findings: ['F-01', 'F-03'],
        cause: B('Falla de hardware de la CPU o del rack del PLC-01.', 'Hardware failure of the PLC-01 CPU or rack.'), cons: B('Parada total del bombeo; superaría la tolerancia declarada de 4 h si no hay repuesto.', 'Total pumping stop; would exceed the declared 4 h tolerance without a spare.'),
        C: 3, P: 2, justC: B('Detiene el proceso crítico completo; el tiempo de recuperación excede la tolerancia contractual sin repuesto en sitio.', 'Stops the entire critical process; recovery time exceeds contractual tolerance without an on-site spare.'), justP: B('Plausible: equipo con 14 años de servicio, UPS verificada pero sin redundancia de CPU ni repuesto. Probabilidad media considerando controles parciales.', 'Plausible: 14-year-old equipment, verified UPS but no CPU redundancy or spare. Medium likelihood considering partial controls.'),
        controls: [ctl('UPS-01 con autonomía de 30 min', 'UPS-01 with 30 min autonomy', 'Verificado'), ctl('Procedimiento de operación local de bombas', 'Local pump operation procedure', 'No verificado'), ctl('CPU de repuesto en sitio', 'Spare CPU on site', 'Ausente')], conf: 'Estimado' },
      { id: 'E-02', title: B('Pérdida del programa del PLC-01 prolonga la recuperación', 'Loss of PLC-01 program prolongs recovery'), proc: 'bombeo', assets: ['AS-03'], findings: ['F-02'],
        cause: B('Falla de memoria o reemplazo de CPU sin copia recuperable del programa.', 'Memory failure or CPU replacement without a recoverable program copy.'), cons: B('La reconstrucción de la lógica podría tomar días.', 'Rebuilding the logic could take days.'),
        C: 3, P: null, justC: B('Prolongaría una parada total del bombeo más allá de la tolerancia.', 'Would extend a total pumping stop beyond tolerance.'), justP: '',
        controls: [ctl('Respaldo del programa custodiado por el integrador', 'Program backup held by the integrator', 'No verificado')], conf: 'Desconocido' },
      { id: 'E-03', title: B('Falla del SW-OT-01 deja la HMI sin visibilidad', 'SW-OT-01 failure leaves the HMI blind'), proc: 'bombeo', assets: ['AS-05', 'AS-04'], findings: [],
        cause: B('Falla del switch o de su fuente.', 'Switch or power supply failure.'), cons: B('Pérdida de supervisión remota; el control local del PLC sigue operando.', 'Loss of remote supervision; local PLC control keeps running.'),
        C: 2, P: 1, justC: B('Afecta supervisión y coordinación, no detiene el bombeo.', 'Affects supervision and coordination; does not stop pumping.'), justP: B('Equipo reciente con soporte vigente; fallas no registradas en 24 meses.', 'Recent device with current support; no failures recorded in 24 months.'),
        controls: [ctl('Operación desde panel local', 'Operation from local panel', 'Parcial')], conf: 'Estimado' },
      { id: 'E-04', title: B('Deriva del medidor FT-201 afecta la medición fiscal', 'FT-201 meter drift affects fiscal metering'), proc: 'medicion', assets: ['AS-07', 'AS-08'], findings: [],
        cause: B('Desgaste o incrustación del elemento primario.', 'Wear or fouling of the primary element.'), cons: B('Diferencias de volumen facturado y reclamaciones contractuales.', 'Billed volume discrepancies and contractual claims.'),
        C: 2, P: 2, justC: B('Impacto económico y contractual relevante, sin parada del proceso.', 'Relevant economic and contractual impact, without process stop.'), justP: B('Calibración anual vigente, pero sin verificación intermedia ni comparación con medidor patrón.', 'Annual calibration current, but no intermediate verification against a master meter.'),
        controls: [ctl('Calibración anual certificada', 'Certified annual calibration', 'Verificado'), ctl('Verificación intermedia con patrón', 'Intermediate check against master meter', 'Ausente')], conf: 'Verificado' }
    ];
    const recs = [
      { id: 'R-01', title: B('Obtener, verificar y custodiar una copia vigente del programa del PLC-01', 'Obtain, verify and safeguard a current copy of the PLC-01 program'), sc: ['E-02', 'E-01'], hz: 'Inmediato (0–30 días)', owner: B('Jefe de mantenimiento (cliente)', 'Maintenance manager (client)'), pr: 'Alta', st: 'Propuesta', basis: B('F-02 · respuesta Q-OG-101 desconocida', 'F-02 · Q-OG-101 answer unknown') },
      { id: 'R-02', title: B('Documentar y ensayar la operación local de las bombas ante falla del PLC', 'Document and drill local pump operation for PLC failure'), sc: ['E-01'], hz: 'Corto plazo (1–3 meses)', owner: B('Superintendente de operaciones (cliente)', 'Operations superintendent (client)'), pr: 'Alta', st: 'Propuesta', basis: B('Control no verificado en E-01', 'Unverified control in E-01') },
      { id: 'R-03', title: B('Evaluar alternativas para eliminar el punto único de falla de control (CPU redundante o control independiente)', 'Evaluate options to remove the control single point of failure (redundant CPU or independent control)'), sc: ['E-01'], hz: 'Análisis posterior recomendado', owner: B('Ingeniería (cliente) con especialista', 'Engineering (client) with specialist'), pr: 'Media', st: 'Propuesta', basis: B('F-01 · requiere análisis fuera del alcance Light', 'F-01 · requires analysis beyond Light scope') },
      { id: 'R-04', title: B('Agregar verificación intermedia del FT-201 contra patrón', 'Add intermediate verification of FT-201 against a master meter'), sc: ['E-04'], hz: 'Corto plazo (1–3 meses)', owner: B('Coordinador de medición (cliente)', 'Metering coordinator (client)'), pr: 'Media', st: 'Propuesta', basis: B('Control ausente en E-04', 'Absent control in E-04') }
    ];
    const photos = [
      { id: 'PH-01', src: 'asset:assets/ev-pumps.jpg', title: B('Vista general de la casa de bombas', 'Pump house overview'), caption: B('P-101A y P-101B con su cabezal de descarga. Ilustración de demostración, no es una fotografía.', 'P-101A and P-101B with their discharge header. Demo illustration, not a photograph.'), author: 'Cristian Pérez', ts: d(1, 9), review: 'Aprobada', inReport: true, links: { area: 'A-01', asset: 'AS-01', q: 'Q-OG-001' } },
      { id: 'PH-02', src: 'asset:assets/ev-plc.jpg', title: B('Tablero del PLC-01 y estación de operación', 'PLC-01 panel and operator station'), caption: B('Rack del PLC-01 que controla P-101A y P-101B. Ilustración de demostración, no es una fotografía.', 'PLC-01 rack controlling P-101A and P-101B. Demo illustration, not a photograph.'), author: 'Cristian Pérez', ts: d(1, 10), review: 'Por revisar', inReport: true, links: { area: 'A-02', asset: 'AS-03', finding: 'F-01', scenario: 'E-01', q: 'Q-OG-002' } },
      { id: 'PH-03', src: 'asset:assets/ev-meter.jpg', title: B('Skid de medición fiscal FT-201', 'FT-201 fiscal metering skid'), caption: B('Medidor FT-201 y computador de flujo FC-201. Ilustración de demostración, no es una fotografía.', 'FT-201 meter and FC-201 flow computer. Demo illustration, not a photograph.'), author: 'Laura Posso', ts: d(1, 14), review: 'Aprobada', inReport: true, links: { area: 'A-03', asset: 'AS-07', scenario: 'E-04', q: 'Q-OG-003' } }
    ];
    const photoRes = {
      'asset:AS-02': { status: 'justificada', reason: 'Acceso restringido', note: B('P-101B en mantenimiento con bloqueo LOTO; foto programada para la próxima visita.', 'P-101B under maintenance with LOTO lockout; photo scheduled for next visit.'), by: 'Cristian Pérez', ts: d(1, 11) },
      'finding:F-03': { status: 'aceptada', reason: 'Prohibición de fotografía del cliente', note: B('La bodega de repuestos no permite fotografía; se adjunta listado de inventario.', 'Photography not allowed in the spares store; inventory listing attached.'), by: 'Kenya Sánchez', ts: d(1, 15) }
    };
    return {
      id: 'AS-2026-014', code: 'ORA-2026-014', created: d(3, 8), updated: d(0, 9), libVersion: lib.version, demo: true,
      cfg: { client: B('Andina Midstream S.A.S. (ficticio)', 'Andina Midstream S.A.S. (fictitious)'), plant: B('Estación de Bombeo Río Claro', 'Río Claro Pumping Station'), industry: 'oilgas', modality: 'light', customCount: 26,
        scope: B('Procesos de bombeo de crudo y medición fiscal de la estación. Excluye almacenamiento y sistema contra incendio.', 'Crude pumping and fiscal metering processes at the station. Excludes storage and fire protection.'), contact: B('Superintendente de operaciones (cliente)', 'Operations superintendent (client)'), exclusions: B('Revisión de lógica PLC, pruebas intrusivas y acceso a red OT.', 'PLC logic review, intrusive testing and OT network access.') },
      processes: procs, areas, assets, deps, answers, findings, scenarios, recs, photos, photoRes,
      questions: JSON.parse(JSON.stringify(lib.questions)), templateVersion: 2,
      creator: 'gustavo-ramirez', leadId: 'kenya-sanchez', team: ['cristian-perez', 'laura-posso'],
      history: [
        { ts: d(0, 9), by: 'kenya-sanchez', es: 'Registró el escenario E-04 y su recomendación', en: 'Recorded scenario E-04 and its recommendation' },
        { ts: d(1, 15), by: 'kenya-sanchez', es: 'Aceptó la excepción fotográfica de F-03', en: 'Accepted the photo exception for F-03' },
        { ts: d(1, 14), by: 'laura-posso', es: 'Cargó la evidencia PH-03 del skid de medición', en: 'Uploaded evidence PH-03 of the metering skid' },
        { ts: d(1, 12), by: 'cristian-perez', es: 'Registró los hallazgos F-01 y F-02', en: 'Recorded findings F-01 and F-02' },
        { ts: d(1, 10), by: 'cristian-perez', es: 'Cargó las evidencias PH-01 y PH-02', en: 'Uploaded evidence PH-01 and PH-02' },
        { ts: d(2, 11), by: 'kenya-sanchez', es: 'Respondió el núcleo del cuestionario con operaciones', en: 'Answered the core questionnaire with operations' },
        { ts: d(3, 9), by: 'gustavo-ramirez', es: 'Asignó a Kenya Sánchez como responsable', en: 'Assigned Kenya Sánchez as lead' },
        { ts: d(3, 8), by: 'gustavo-ramirez', es: 'Creó el assessment (Light)', en: 'Created the assessment (Light)' }
      ],
      review: { findings: false, photos: false, consistency: false }, reportStatus: 'Borrador', reportVersion: 1
    };
  }
  function skeleton(lib, now, o) {
    const t = TEMPLATES[o.industry];
    const a = { id: o.id, code: o.code, created: o.ts, updated: o.ts, libVersion: lib.version, demo: true, templateVersion: t.version,
      cfg: Object.assign({ client: '', plant: '', industry: o.industry, modality: 'light', customCount: 26, scope: '', contact: '', exclusions: '' }, o.cfg),
      processes: t.processes.map(p => ({ key: p.key, name: p.name, desc: p.desc, status: null, just: '', crit: '' })), areas: [], assets: [], deps: [], answers: {}, findings: [], scenarios: [], recs: [], photos: [], photoRes: {},
      questions: JSON.parse(JSON.stringify(lib.questions)), creator: o.creator, leadId: o.leadId, team: o.team, history: o.history,
      review: { findings: false, photos: false, consistency: false }, reportStatus: 'Borrador', reportVersion: 1 };
    (o.procs || []).forEach(([k, st, es, en, crit]) => { const p = a.processes.find(x => x.key === k); p.status = st; p.just = B(es, en); p.crit = crit || ''; p.by = (USERS.find(u => u.id === o.leadId) || {}).name; p.ts = o.ts; });
    return a;
  }
  function seedAll(lib, now) {
    const d = (days, h) => { const t = new Date(now); t.setDate(t.getDate() - days); t.setHours(h || 10, 30, 0, 0); return t.toISOString(); };
    return [
      seedAssessment(lib, now),
      skeleton(lib, now, { id: 'AS-2026-015', code: 'ORA-2026-015', ts: d(1, 16), industry: 'cemento', creator: 'gustavo-ramirez', leadId: 'juan-menco', team: ['kevin-pena', 'simon-giraldo'],
        cfg: { client: B('Cementos del Pacífico S.A. (ficticio)', 'Cementos del Pacífico S.A. (fictitious)'), plant: B('Planta La Cumbre', 'La Cumbre Plant'), modality: 'two', scope: B('Línea de clinkerización y molienda de cemento.', 'Clinker production line and cement milling.'), contact: B('Gerente de planta (cliente)', 'Plant manager (client)') },
        procs: [['horno', 'incluido', 'Una parada del horno detiene toda la producción de clínker; el rearranque toma más de 24 h.', 'A kiln stop halts all clinker production; restart takes more than 24 h.', 'Alta'], ['molcem', 'incluido', 'Define el despacho diario; inventario de cemento para dos días.', 'Drives daily dispatch; two days of cement inventory.', 'Media'], ['molcrudo', 'fuera', 'Se evaluará en una segunda fase acordada con el cliente.', 'To be assessed in a second phase agreed with the client.']],
        history: [{ ts: d(1, 16), by: 'juan-menco', es: 'Definió los procesos críticos del alcance', en: 'Defined the critical processes in scope' }, { ts: d(2, 9), by: 'gustavo-ramirez', es: 'Creó el assessment (Dos semanas) y asignó a Juan Menco', en: 'Created the assessment (Two weeks) and assigned Juan Menco' }] }),
      skeleton(lib, now, { id: 'AS-2026-016', code: 'ORA-2026-016', ts: d(0, 8), industry: 'mineria', creator: 'laura-posso', leadId: 'laura-posso', team: ['kenya-sanchez'],
        cfg: { client: B('Minera Altiplano S.A. (ficticio)', 'Minera Altiplano S.A. (fictitious)'), plant: B('Concentradora Quebrada Honda', 'Quebrada Honda Concentrator'), modality: 'light', scope: '', contact: '' },
        history: [{ ts: d(0, 8), by: 'laura-posso', es: 'Creó el assessment (Light)', en: 'Created the assessment (Light)' }] })
    ];
  }
  // register seed texts in the dictionary even when state comes from storage
  seedAll({ version: 0, questions: [] }, new Date());

  // Fase 1: procedencia, madurez y sistemas OT del caso demo
  const SEED_P1 = {
    systems: [
      { id: 'SY-01', cat0: 'OG-SY-01', name: B('Sistema de control de bombeo', 'Pumping control system'), cat: 'control', procs: ['bombeo'], prov: 'catalogo', val: ['validado', 'Cristian Pérez', 'campo'] },
      { id: 'SY-02', cat0: 'OG-SY-02', name: B('Red OT de la estación', 'Station OT network'), cat: 'red', procs: ['bombeo', 'medicion'], prov: 'catalogo', val: ['validado', 'Kenya Sánchez', 'documento'] },
      { id: 'SY-03', cat0: 'OG-SY-03', name: B('Energía respaldada de control', 'Backed-up control power'), cat: 'energia', procs: ['bombeo'], prov: 'catalogo', val: ['validado', 'Cristian Pérez', 'campo'] },
      { id: 'SY-04', cat0: 'OG-SY-04', name: B('Sistema de medición fiscal', 'Fiscal metering system'), cat: 'instr', procs: ['medicion'], prov: 'catalogo', val: ['validado', 'Laura Posso', 'campo'] },
      { id: 'SY-05', cat0: 'OG-SY-07', name: B('Unidades de bombeo', 'Pumping units'), cat: 'proceso', procs: ['bombeo'], prov: 'catalogo', val: ['validado', 'Cristian Pérez', 'campo'] },
      { id: 'SY-06', cat0: 'OG-SY-05', name: B('Sistema de parada de emergencia', 'Emergency shutdown system'), cat: 'seg', procs: ['bombeo'], prov: 'catalogo', val: ['sugerido'] }
    ],
    assets: { 'AS-01': ['SY-05', 'campo'], 'AS-02': ['SY-05', 'entrevista'], 'AS-03': ['SY-01', 'campo'], 'AS-04': ['SY-01', 'campo'], 'AS-05': ['SY-02', 'documento', ['bombeo', 'medicion']], 'AS-06': ['SY-03', 'campo'], 'AS-07': ['SY-04', 'campo'], 'AS-08': ['SY-04', 'documento'] },
    deps: { 'D-01': 'campo', 'D-02': 'campo', 'D-03': 'campo', 'D-04': 'documento', 'D-05': 'campo', 'D-06': 'documento' },
    extraDeps: [{ id: 'D-07', from: 'SY-04', to: 'SY-02', type: 'Comunicación', note: B('Envío de volúmenes al centro de control (sugerido por catálogo).', 'Volume reports to the control center (catalog suggestion).'), prov: 'catalogo', cat0: 'OG-DP-06' }],
    areas: { 'A-01': 'OG-AR-01', 'A-02': 'OG-AR-02', 'A-03': 'OG-AR-03' }
  };
  window.ORA_DATA = { OT_CATS, ASSET_TYPE_CAT, ALL, DIMS, INDUSTRIES, TEMPLATES, MODALITIES, ASSET_TYPES, DEP_TYPES, QUESTIONS, PHOTO_RULES, PHOTO_REASONS, USERS, seedAll, SEED_P1 };
})();
