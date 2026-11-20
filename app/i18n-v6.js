/* ORA v6 — vocabulario del sistema en ES/EN. Los valores internos se guardan en español; la interfaz y el PDF los muestran con tx(). */
(function () {
  const EN = window.ORA_I18N.EN;
  [
    // procesos
    ['incluido', 'Included'], ['fuera', 'Out of scope'], ['na', 'Not applicable'], ['desconocido', 'Unknown'], ['productivo', 'Production'], ['auxiliar', 'Auxiliary service'], ['salvaguarda', 'Safeguard'],
    ['Critica', 'Critical'], ['Crítica', 'Critical'], ['Critico', 'Critical'], ['Secundario', 'Secondary'],
    // cobertura y hallazgos
    ['revisado', 'Reviewed'], ['en curso', 'In progress'], ['no revisado', 'Not reviewed'], ['no aplica', 'Not applicable'],
    ['confirmado', 'Confirmed'], ['pendiente de verificación', 'Pending verification'], ['descartado', 'Discarded'],
    ['activo', 'Asset'], ['area', 'Area'], ['dependencia', 'Dependency'], ['proceso', 'Process'], ['sistema', 'System'],
    ['Campo', 'Field'], ['Documento', 'Document'], ['Entrevista', 'Interview'], ['Inventario', 'Inventory'],
    // escenarios
    ['evaluado', 'Assessed'], ['pendiente', 'Pending'], ['detección', 'Detection'], ['mitigación', 'Mitigation'], ['prevención', 'Prevention'], ['declarada', 'Declared'], ['verificada', 'Verified'],
    ['Enfriamiento alterno', 'Alternate cooling'], ['Equipo alterno', 'Alternate equipment'], ['Mecánica', 'Mechanical'], ['Medición alterna', 'Alternate measurement'], ['Medición portátil', 'Portable measurement'],
    ['Operación local', 'Local operation'], ['Operación manual', 'Manual operation'], ['Parada manual', 'Manual shutdown'], ['Reconstrucción', 'Rebuild'], ['Repuesto', 'Spare'], ['Servicio', 'Service'], ['Servicio alternativo', 'Alternate service'], ['Alternativa', 'Alternative'],
    // oportunidades
    ['aceptada', 'Accepted'], ['borrador', 'Draft'], ['por validar', 'To validate'], ['propuesta', 'Proposed'], ['descartada', 'Discarded'],
    ['Continuidad', 'Continuity'], ['Recuperación', 'Recovery'], ['Confiabilidad', 'Reliability'], ['Seguridad', 'Safety'], ['Calidad', 'Quality'], ['Cumplimiento', 'Compliance'], ['Costo', 'Cost'],
    ['Por estimar', 'To estimate'], ['Bajo (ficticio)', 'Low (fictitious)'],
    // intervenciones y fases
    ['ejecución', 'Execution'], ['estudio', 'Prior study'], ['aprobada', 'Approved'], ['en ejecución', 'In execution'], ['completada', 'Completed'],
    ['Aceptado', 'Accepted'], ['Sugerido', 'Suggested'], ['Cotización', 'Quote'], ['Orden de magnitud', 'Order of magnitude'], ['Incluido', 'Included'], ['Incluido en mantenimiento', 'Included in maintenance'], ['Continuo', 'Ongoing'],
    ['aprobado', 'Approved'], ['no iniciado', 'Not started'],
    ['Prioridades inmediatas', 'Immediate priorities'], ['Primer ciclo financiado', 'First funded cycle'], ['Siguiente ciclo de inversión', 'Next investment cycle'],
    ['mantener', 'Maintain'], ['estabilizar', 'Stabilize'], ['actualizar', 'Update'], ['migrar', 'Migrate'],
    // omnIA
    ['por revisar', 'To review'], ['aceptada como borrador', 'Accepted as draft'], ['verificación solicitada', 'Verification requested'], ['reglas', 'rules'], ['reglas (DEMO)', 'rules (DEMO)'],
    // informe
    ['En revisión', 'In review'], ['Informe en revisión', 'Report in review'],
    // categorías OT
    ['Ambiental / cumplimiento', 'Environmental / compliance'], ['Comunicación remota', 'Remote communication'], ['Datos / aplicación', 'Data / application'], ['Energía / accionamiento', 'Power / drives'],
    ['Energía de respaldo', 'Backup power'], ['Infraestructura', 'Infrastructure'], ['Medición e inventario', 'Measurement and inventory'], ['Medición fiscal', 'Custody measurement'], ['Protección de máquina', 'Machine protection'],
    ['Seguridad funcional', 'Functional safety'], ['Supervisión eléctrica', 'Electrical supervision'], ['Protección eléctrica', 'Electrical protection'],
    // tipos de activo
    ['Acceso remoto', 'Remote access'], ['Analizador', 'Analyzer'], ['Baterías', 'Batteries'], ['Chiller', 'Chiller'], ['Compresor', 'Compressor'], ['Comunicaciones', 'Communications'], ['Controlador', 'Controller'], ['DCS', 'DCS'],
    ['Detector', 'Detector'], ['Dispositivo de parada', 'Shutdown device'], ['Estación', 'Station'], ['Excitatriz', 'Exciter'], ['Firewall', 'Firewall'], ['Gateway', 'Gateway'], ['IED', 'IED'], ['Módulos E/S', 'I/O modules'],
    ['PLC de seguridad', 'Safety PLC'], ['RTU', 'RTU'], ['Reactor', 'Reactor'], ['Recipiente', 'Vessel'], ['Rectificador', 'Rectifier'], ['Servidor', 'Server'], ['Tanque', 'Tank'], ['Válvula', 'Valve'],
    // soporte y repuestos frecuentes
    ['Vigente', 'Current'], ['Soporte vigente', 'Support current'], ['Sin soporte', 'No support'], ['Por verificar', 'To verify'], ['Ninguno', 'None'], ['Redundante', 'Redundant'], ['Licencia vigente', 'License current'],
    ['Contrato de servicio', 'Service contract'], ['Sin garantía', 'No warranty'], ['Soporte limitado', 'Limited support']
  ].forEach(([e, n]) => { if (!(e in EN)) EN[e] = n; });
})();
