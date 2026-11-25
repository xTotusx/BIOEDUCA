(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const CURRENT = 'bioeduca_current_user', FOLIOS = 'bioeduca-folios-exp';

  /* ---------- Almacenamiento ---------- */
  const read = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const write = k_v => { try { localStorage.setItem(k_v[0], k_v[1]); return true; } catch (_) { return false; } };
  const json = (k, d) => { try { const v = JSON.parse(read(k) || 'null'); return v === null ? d : v; } catch (_) { return d; } };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Sesión y expediente ---------- */
  const cur = json(CURRENT, null);
  if (!cur || !cur.email) { window.location.replace('login.html'); return; }
  const KEY = 'bioeduca-exp:' + cur.email;
  const prof = json('bioeduca-profile:' + cur.email, {});
  const exp = json(KEY, null) || {};
  Object.assign(exp, { folio: exp.folio || '', done: exp.done || {}, data: exp.data || {}, bitacora: exp.bitacora || [], pending: !!exp.pending, iter: exp.iter || 0, closed: !!exp.closed, createdAt: exp.createdAt || new Date().toISOString() });
  const persist = () => write([KEY, JSON.stringify(exp)]);

  /* ---------- Avisos ---------- */
  let toastTimer;
  const toast = (msg, type = 'ok') => {
    const t = $('#toast');
    t.textContent = msg; t.className = 'toast toast--' + type; t.hidden = false;
    requestAnimationFrame(() => t.classList.add('is-on'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.classList.remove('is-on'); setTimeout(() => (t.hidden = true), 300); }, 4200);
  };

  /* ---------- Definición de módulos ---------- */
  const F = (k, l, t = 'text', x = {}) => ({ k, l, t, ...x });
  const H = h => ({ h });
  const B = k => ({ t: 'block', k });
  const TA = (k, l, x = {}) => F(k, l, 'textarea', { req: true, ...x });
  const RATE = ['1 · Crítico', '2 · Deficiente', '3 · Aceptable', '4 · Bueno', '5 · Óptimo'];
  const VIAB = ['Viable', 'Viable con condiciones', 'No viable'];
  const MODS = [
    { id: 'alta', phase: 'Preparación', title: 'Espacio educativo y responsable', intro: 'Registra el espacio que vas a transformar y a la persona responsable. Al guardar se genera el folio de tu expediente institucional.', fields: [
      H('Espacio educativo'), F('edificio', 'Edificio', 'text', { req: 1 }), F('aula', 'Aula o espacio', 'text', { req: 1 }),
      F('capacidad', 'Capacidad de usuarios', 'number', { req: 1, min: 1 }), F('superficie', 'Superficie (m²)', 'number', { req: 1, min: 1 }),
      F('uso', 'Uso principal', 'select', { req: 1, o: ['Aula regular', 'Laboratorio', 'Biblioteca', 'Taller', 'Patio o área exterior', 'Usos múltiples'] }),
      H('Responsable del espacio'), F('rNombre', 'Nombre completo', 'text', { req: 1 }), F('rCargo', 'Cargo', 'text', { req: 1 }),
      F('rCorreo', 'Correo institucional', 'email', { req: 1 }), F('rTel', 'Teléfono de contacto', 'tel', { req: 1 }),
      F('privacidad', 'Acepto el aviso de privacidad y el tratamiento de mis datos para el expediente.', 'check', { req: 1 })] },
    { id: 'diagnostico', phase: 'Planear', title: 'Diagnóstico', intro: 'Evalúa los 5 rubros del espacio. Puedes capturar desde la App móvil (con o sin conexión) o desde la Web.', fields: [
      F('canal', 'Canal de captura', 'select', { req: 1, o: ['Web', 'App móvil'] }), B('sync'),
      H('Rubros evaluados (1 = crítico, 5 = óptimo)'),
      F('r1', 'Confort térmico', 'select', { req: 1, o: RATE }), F('r2', 'Iluminación y confort visual', 'select', { req: 1, o: RATE }),
      F('r3', 'Confort acústico', 'select', { req: 1, o: RATE }), F('r4', 'Calidad del aire y ventilación', 'select', { req: 1, o: RATE }),
      F('r5', 'Conexión con la naturaleza (biofilia)', 'select', { req: 1, o: RATE }),
      TA('obs', 'Observaciones del diagnóstico', { w: 1 }),
      F('validado', 'Confirmo que los datos fueron revisados y validados.', 'check', { req: 1 })] },
    { id: 'estrategia', phase: 'Planear', title: 'Estrategia', intro: 'Traduce el diagnóstico en necesidades, objetivos, alternativas y un plan de intervención viable.', fields: [
      TA('necesidades', 'Necesidades detectadas'), TA('objetivos', 'Objetivos'), TA('indicadores', 'Indicadores de éxito', { w: 1 }),
      F('altBio', 'Alternativas biofílicas', 'checks', { req: 1, o: ['Vegetación interior', 'Luz natural y vistas al exterior', 'Materiales naturales', 'Colores y formas orgánicas', 'Agua y sonidos naturales'] }),
      F('altMim', 'Alternativas biomiméticas', 'checks', { o: ['Ventilación pasiva inspirada en termiteros', 'Sombreado adaptativo', 'Superficies autolimpiantes', 'Estructuras eficientes inspiradas en la naturaleza'] }),
      H('Viabilidad'), F('vTec', 'Técnica', 'select', { req: 1, o: VIAB }), F('vEco', 'Económica', 'select', { req: 1, o: VIAB }),
      F('vFun', 'Funcional', 'select', { req: 1, o: VIAB }), F('vNor', 'Normativa', 'select', { req: 1, o: VIAB }),
      H('Plan de intervención'), TA('acciones', 'Acciones'), TA('recursos', 'Recursos'), TA('responsables', 'Responsables'),
      F('inicio', 'Inicio del cronograma', 'date', { req: 1 }), F('fin', 'Fin del cronograma', 'date', { req: 1 })] },
    { id: 'propuesta', phase: 'Planear', title: 'Propuesta y desarrollo', intro: 'Desarrolla la propuesta. Si requiere ajustes, regístralos: el bucle se repite hasta que ya no haya cambios pendientes.', fields: [
      TA('alternativas', 'Alternativas evaluadas'), TA('solBio', 'Soluciones biofílicas'), TA('solMim', 'Soluciones biomiméticas', { req: false }),
      TA('planos', 'Planos y especificaciones (describe o indica los nombres de archivo)'),
      H('Ficha de propuesta'), F('fTitulo', 'Título de la propuesta', 'text', { req: 1 }), F('vProp', 'Viabilidad de la propuesta', 'select', { req: 1, o: VIAB }),
      TA('fResumen', 'Resumen de la propuesta', { w: 1 }),
      H('Bucle de ajuste'), F('ajuste', '¿Requiere ajustes?', 'select', { req: 1, o: ['No', 'Sí'] }),
      F('ajAreas', 'Qué debe ajustarse (si aplica)', 'checks', { o: ['Diseño', 'Soluciones', 'Documentación técnica'] })] },
    { id: 'validacion', phase: 'Planear', title: 'Validación institucional y auditoría externa', intro: 'Registra el dictamen de la institución y la auditoría externa. Solo una propuesta «Aprobada» avanza a la ejecución.', fields: [
      F('estado', 'Estado de la validación', 'select', { req: 1, o: ['Pendiente de revisión', 'En revisión', 'Requiere ajustes', 'Aprobada', 'No aprobada'] }),
      TA('dictamen', 'Dictamen institucional', { w: 1 }),
      H('Auditoría externa (obligatoria para aprobar)'), TA('criterios', 'Criterios de auditoría', { req: false }), TA('hallazgos', 'Hallazgos', { req: false }),
      TA('correctivas', 'Acciones correctivas', { req: false }), TA('informe', 'Informe de auditoría', { req: false })] },
    { id: 'ejecucion', phase: 'Hacer', title: 'Preparación, ejecución y seguimiento', intro: 'Prepara las condiciones, levanta el área, implementa y registra avances, incidencias y evidencias.', fields: [
      H('Preparación'), TA('condiciones', 'Condiciones institucionales'), TA('actividades', 'Actividades'), TA('recursosE', 'Recursos'), TA('respE', 'Responsables'),
      TA('cronograma', 'Cronograma definitivo'), F('disp', 'Disponibilidad de aula y recursos', 'select', { req: 1, o: ['Aula y recursos disponibles', 'Disponibilidad parcial', 'No disponible'] }),
      H('Levantamiento de área y condiciones iniciales'), TA('levantamiento', 'Levantamiento del área', { w: 1 }),
      F('tIni', 'Temperatura inicial (°C)', 'number', { req: 1 }), F('lIni', 'Iluminancia inicial (lx)', 'number', { req: 1, min: 0 }),
      F('dbIni', 'Ruido inicial (dB)', 'number', { req: 1, min: 0 }), F('co2Ini', 'CO₂ inicial (ppm)', 'number', { req: 1, min: 0 }),
      H('Implementación y seguimiento'), TA('implementacion', 'Implementación'), B('bit'), TA('incidencias', 'Incidencias y ajustes', { req: false }),
      F('evid', 'Confirmo que las evidencias (planos, fotografías y registros) están consolidadas.', 'check', { req: 1 })] },
    { id: 'verificar', phase: 'Verificar', title: 'Verificar: mediciones y auditoría', intro: 'Mide las condiciones finales de confort y compáralas con las iniciales.', fields: [
      F('tFin', 'Temperatura final (°C)', 'number', { req: 1 }), F('lFin', 'Iluminancia final (lx)', 'number', { req: 1, min: 0 }),
      F('dbFin', 'Ruido final (dB)', 'number', { req: 1, min: 0 }), F('co2Fin', 'CO₂ final (ppm)', 'number', { req: 1, min: 0 }),
      F('auditoria', 'Auditoría de cumplimiento', 'select', { req: 1, o: ['Cumple', 'Cumple parcialmente', 'No cumple'] }),
      TA('comparacion', 'Comparación de resultados', { w: 1 }), B('dash')] },
    { id: 'actuar', phase: 'Actuar', title: 'Actuar: mejora y mantenimiento', intro: 'Define cómo se mantendrán los resultados y qué lineamientos se actualizan con lo aprendido.', fields: [
      TA('mantenimiento', 'Plan de mantenimiento'), TA('lineamientos', 'Actualización de lineamientos'), TA('mejora', 'Acciones de mejora', { req: false })] },
    { id: 'cierre', phase: 'Cierre', title: 'Consolidación PHVA y cierre', intro: 'Confirma la consolidación del ciclo. Al cerrar, el expediente queda en estado «Cerrado» y se conserva completo.', fields: [
      F('cPlan', 'Planear consolidado (diagnóstico, estrategia, propuesta y validación)', 'check', { req: 1 }),
      F('cHacer', 'Hacer consolidado (ejecución y evidencias)', 'check', { req: 1 }),
      F('cVer', 'Verificar consolidado (mediciones y auditoría)', 'check', { req: 1 }),
      F('cAct', 'Actuar consolidado (mantenimiento y lineamientos)', 'check', { req: 1 }), B('close')] }
  ];
  const mod = id => MODS.find(m => m.id === id);
  const idx = id => MODS.findIndex(m => m.id === id);
  const unlocked = i => MODS.slice(0, i).every(m => exp.done[m.id]);
  const score = () => { const d = exp.data.diagnostico; if (!d) return null; const v = ['r1', 'r2', 'r3', 'r4', 'r5'].map(k => parseInt(d[k], 10)).filter(n => n > 0); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 20) : null; };

  /* ---------- Bloques especiales ---------- */
  const today = () => new Date().toISOString().slice(0, 10);
  const blocks = {
    sync: () => {
      const on = navigator.onLine;
      return `<div class="block span2" id="sync"><p><span class="dot${on ? ' on' : ''}"></span><b>${on ? 'En línea' : 'Sin conexión'}</b> · ${exp.pending ? 'Hay un diagnóstico pendiente de sincronizar.' : 'Sin registros pendientes de sincronizar.'}</p>${exp.pending ? `<div><button type="button" class="btn btn--outline btn--sm" data-act="sync" ${on ? '' : 'disabled'}><svg class="i" aria-hidden="true" focusable="false"><use href="#i-refresh"/></svg> Sincronizar ahora</button></div>` : ''}<p class="muted">Con el canal «App móvil» y sin conexión, el diagnóstico se guarda en este dispositivo y se sincroniza al volver a estar en línea.</p></div>`;
    },
    bit: () => `<div class="block span2" id="bit"><b>Registro de avances, planos y fotografías</b><ul class="bit">${exp.bitacora.length ? exp.bitacora.map((e, i) => `<li><div><b>${esc(e.fecha)}</b> · ${esc(e.texto)}${e.foto ? `<small>Archivo: ${esc(e.foto)}</small>` : ''}</div>${exp.closed ? '' : `<button type="button" class="icon-btn" data-act="bit-del" data-i="${i}" aria-label="Eliminar registro"><svg class="i" aria-hidden="true" focusable="false"><use href="#i-trash"/></svg></button>`}</li>`).join('') : '<li class="muted">Aún no hay registros. Agrega al menos uno.</li>'}</ul>${exp.closed ? '' : `<div class="bit-form"><input type="date" id="b-fecha" value="${today()}" aria-label="Fecha del avance"><input type="text" id="b-texto" maxlength="200" placeholder="Describe el avance, plano o hallazgo" aria-label="Descripción del avance"><input class="full" type="file" id="b-foto" accept="image/*,.pdf" aria-label="Fotografía o plano (opcional)"></div><div><button type="button" class="btn btn--outline btn--sm" data-act="bit-add"><svg class="i" aria-hidden="true" focusable="false"><use href="#i-plus"/></svg> Agregar registro</button></div>`}</div>`,
    dash: () => {
      const a = exp.data.ejecucion || {}, b = exp.data.verificar || {};
      if (b.tFin === undefined || b.tFin === '') return '<div class="block span2" id="dash"><p class="muted">Guarda las mediciones finales para ver el comparativo y el dashboard.</p></div>';
      const rows = [['Temperatura (°C)', 'tIni', 'tFin', v => v >= 20 && v <= 26, '20–26'], ['Iluminancia (lx)', 'lIni', 'lFin', v => v >= 300, '≥ 300'], ['Ruido (dB)', 'dbIni', 'dbFin', v => v <= 45, '≤ 45'], ['CO₂ (ppm)', 'co2Ini', 'co2Fin', v => v <= 1000, '≤ 1000']];
      const body = rows.map(([l, i, f, ok, ref]) => { const x = +a[i], y = +b[f], d = (y - x).toFixed(1); return `<tr><td>${l}</td><td>${x}</td><td>${y}</td><td>${d > 0 ? '+' : ''}${d}</td><td>${ref}</td><td><span class="${ok(y) ? 'tag-ok' : 'tag-no'}">${ok(y) ? 'En rango' : 'Fuera de rango'}</span></td></tr>`; }).join('');
      const s = score();
      return `<div class="block span2" id="dash"><b>Dashboard de resultados</b>${s !== null ? `<p>Puntaje del diagnóstico inicial: <span class="score">${s}/100</span></p>` : ''}<div class="scroll-x"><table class="tbl"><thead><tr><th>Indicador</th><th>Inicial</th><th>Final</th><th>Cambio</th><th>Referencia</th><th>Estado</th></tr></thead><tbody>${body}</tbody></table></div>${exp.done.verificar ? '<div><button type="button" class="btn btn--outline btn--sm" data-act="rep-final"><svg class="i" aria-hidden="true" focusable="false"><use href="#i-download"/></svg> Descargar informe de evaluación</button></div>' : ''}</div>`;
    },
    close: () => `<div class="block span2" id="close"><p>${exp.closed ? `<b>Expediente cerrado</b> el ${esc(new Date(exp.closedAt).toLocaleDateString('es-MX'))}. Se conserva completo para consulta.` : 'Al guardar este paso, el expediente pasará a <b>Cerrado</b> sin perder ningún dato.'}</p><div><button type="button" class="btn btn--outline btn--sm" data-act="rep-final"><svg class="i" aria-hidden="true" focusable="false"><use href="#i-download"/></svg> Descargar informe completo</button></div></div>`
  };

  /* ---------- Render de campos ---------- */
  const val = (m, k) => (exp.data[m.id] || {})[k];
  function fieldHTML(m, f) {
    if (f.h) return `<h3 class="sec">${f.h}</h3>`;
    if (f.t === 'block') return blocks[f.k]();
    let v = val(m, f.k);
    if (v === undefined && m.id === 'alta') v = f.k === 'rNombre' ? (prof.name || cur.name || '') : f.k === 'rCorreo' ? (cur.email || '') : f.k === 'rCargo' ? (prof.position || '') : f.k === 'rTel' ? (prof.phone || '') : '';
    const id = 'x-' + f.k, req = f.req ? '<b class="req" aria-hidden="true">*</b>' : '', wide = f.t === 'textarea' || f.t === 'check' || f.t === 'checks' || f.w ? ' span2' : '';
    const ro = exp.closed ? ' disabled' : '', err = '<small class="err" aria-live="polite"></small>';
    if (f.t === 'check') return `<div class="field span2" data-k="${f.k}"><label class="chk"><input type="checkbox" id="${id}"${v ? ' checked' : ''}${ro}><span class="box"></span><span>${f.l}${req}</span></label>${err}</div>`;
    if (f.t === 'checks') return `<fieldset class="field span2" data-k="${f.k}"><legend>${f.l}${req}</legend><div class="opts">${f.o.map(o => `<label class="chk"><input type="checkbox" name="${f.k}" value="${esc(o)}"${(v || []).includes(o) ? ' checked' : ''}${ro}><span class="box"></span><span>${o}</span></label>`).join('')}</div>${err}</fieldset>`;
    let ctl;
    if (f.t === 'select') ctl = `<select id="${id}"${ro}><option value="">Selecciona…</option>${f.o.map(o => `<option${o === v ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
    else if (f.t === 'textarea') ctl = `<textarea id="${id}" rows="4" maxlength="800"${ro}>${esc(v || '')}</textarea>`;
    else ctl = `<input id="${id}" type="${f.t}" value="${esc(v || '')}"${f.t === 'number' ? ' step="any"' : ''}${f.t === 'text' || f.t === 'email' || f.t === 'tel' ? ' maxlength="90"' : ''}${ro}>`;
    return `<div class="field${wide}" data-k="${f.k}"><label for="${id}">${f.l}${req}</label>${ctl}${err}</div>`;
  }

  /* ---------- Render principal ---------- */
  let curId = 'alta';
  const estado = () => { if (exp.closed) return 'Cerrado'; const n = MODS.find(m => !exp.done[m.id]); return n ? `En curso · ${n.title}` : 'Completo'; };
  function paintHead() {
    $('#p-folio').textContent = exp.folio ? 'Folio ' + exp.folio : 'Sin folio';
    $('#p-estado').textContent = estado();
    $('#p-prog').textContent = `${MODS.filter(m => exp.done[m.id]).length} de ${MODS.length} etapas`;
    $('#chip-name').textContent = (prof.name || cur.name || 'Mi cuenta').split(/\s+/)[0];
    $('#banner').hidden = !!cur.profileComplete;
    const av = $('#av-chip'), img = $('img', av), tx = $('span', av);
    if (prof.avatar) { img.src = prof.avatar; img.hidden = false; tx.hidden = true; } else { img.hidden = true; tx.hidden = false; tx.textContent = ((prof.name || cur.name || 'T').trim()[0] || 'T').toUpperCase(); }
  }
  function paintSteps() {
    $('#steps').innerHTML = MODS.map((m, i) => {
      const done = !!exp.done[m.id], open = unlocked(i) || exp.closed, cls = (m.id === curId ? ' is-current' : '') + (done ? ' is-done' : '');
      return `<li><button type="button" class="step${cls}" data-go="${m.id}" ${open ? '' : 'disabled'}${m.id === curId ? ' aria-current="step"' : ''}><span class="step__n">${done ? '<svg class="i" aria-hidden="true" focusable="false"><use href="#i-check"/></svg>' : open ? i + 1 : '<svg class="i" aria-hidden="true" focusable="false"><use href="#i-lock"/></svg>'}</span><span class="step__t"><small>${m.phase}</small>${m.title}</span></button></li>`;
    }).join('');
  }
  function render() {
    const m = mod(curId), i = idx(curId), last = i === MODS.length - 1, done = !!exp.done[m.id];
    $('#mod').innerHTML = `<header class="panel__h"><div><p class="phase">${m.phase} · Etapa ${i + 1} de ${MODS.length}</p><h2>${m.title}</h2><p class="muted">${m.intro}</p></div><span class="badge${done ? ' done' : ''}">${done ? 'Completada' : 'Pendiente'}</span></header><form id="mf" novalidate><div class="grid">${m.fields.map(f => fieldHTML(m, f)).join('')}</div><div class="actions">${exp.closed ? '' : `<button class="btn btn--primary" type="submit"><svg class="i" aria-hidden="true" focusable="false"><use href="#i-check"/></svg> ${last ? 'Cerrar expediente' : 'Guardar y continuar'}</button>`}${i > 0 ? `<button class="btn btn--outline" type="button" data-go="${MODS[i - 1].id}"><svg class="i" aria-hidden="true" focusable="false"><use href="#i-arrow-left"/></svg> Anterior</button>` : ''}${m.id === 'diagnostico' && done ? '<button class="btn btn--outline" type="button" data-act="rep-diag"><svg class="i" aria-hidden="true" focusable="false"><use href="#i-download"/></svg> Descargar reporte del diagnóstico</button>' : ''}${exp.closed && i < MODS.length - 1 ? `<button class="btn btn--outline" type="button" data-go="${MODS[i + 1].id}">Siguiente <svg class="i" aria-hidden="true" focusable="false"><use href="#i-arrow-right"/></svg></button>` : ''}</div></form>`;
    paintSteps(); paintHead();
  }
  function go(id) { curId = id; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  /* ---------- Validación y guardado ---------- */
  const mark = (k, msg) => { const c = $(`[data-k="${k}"]`); if (!c) return; c.classList.toggle('is-invalid', !!msg); $('.err', c).textContent = msg || ''; };
  const gather = m => { const v = {}; m.fields.forEach(f => { if (!f.k || f.t === 'block') return; if (f.t === 'check') v[f.k] = $('#x-' + f.k).checked; else if (f.t === 'checks') v[f.k] = $$(`[name="${f.k}"]:checked`).map(c => c.value); else v[f.k] = $('#x-' + f.k).value.trim(); }); return v; };
  function validate(m, v) {
    let first = null;
    m.fields.forEach(f => {
      if (!f.k || f.t === 'block') return;
      const x = v[f.k]; let msg = '';
      if (f.req) { if (f.t === 'check' && !x) msg = 'Debes confirmar para continuar.'; else if (f.t === 'checks' && !x.length) msg = 'Selecciona al menos una opción.'; else if (f.t !== 'check' && f.t !== 'checks' && !x) msg = 'Este campo es obligatorio.'; }
      if (!msg && x && f.t === 'email' && !EMAIL.test(x)) msg = 'Ingresa un correo válido, por ejemplo nombre@institucion.edu.mx.';
      if (!msg && x && f.t === 'tel' && !(/^[+()\d\s-]+$/.test(x) && x.replace(/\D/g, '').length >= 8 && x.replace(/\D/g, '').length <= 15)) msg = 'Teléfono no válido: usa de 8 a 15 dígitos.';
      if (!msg && x && f.t === 'number' && (isNaN(+x) || (f.min !== undefined && +x < f.min))) msg = f.min !== undefined ? `Escribe un número válido (mínimo ${f.min}).` : 'Escribe un número válido.';
      mark(f.k, msg); if (msg && !first) first = f.k;
    });
    return first;
  }
  const newFolio = () => {
    const used = json(FOLIOS, []); let f;
    do { f = `EXP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`; } while (used.includes(f));
    used.push(f); write([FOLIOS, JSON.stringify(used)]); return f;
  };
  const E = (k, msg) => ({ error: { k, msg } });
  const HOOK = {
    alta: () => { if (!exp.folio) exp.folio = newFolio(); return { done: true, msg: `Espacio y responsable registrados. Tu folio es ${exp.folio}.` }; },
    diagnostico: v => {
      if (v.canal === 'App móvil' && !navigator.onLine) { exp.pending = true; return { done: false, msg: 'Sin conexión: el diagnóstico quedó guardado en este dispositivo. Sincronízalo al volver a estar en línea.', type: 'info' }; }
      exp.pending = false; return { done: true };
    },
    estrategia: v => (v.fin < v.inicio ? E('fin', 'La fecha final debe ser posterior a la inicial.') : { done: true }),
    propuesta: v => {
      if (v.ajuste === 'Sí') {
        if (!v.ajAreas.length) return E('ajAreas', 'Indica qué debe ajustarse: diseño, soluciones o documentación técnica.');
        exp.iter += 1; return { done: false, msg: `Ajuste n.º ${exp.iter} registrado. Aplica los cambios y vuelve a guardar con «No» en ajustes.`, type: 'info' };
      }
      return { done: true };
    },
    validacion: v => {
      if (v.estado === 'Aprobada') {
        const miss = ['criterios', 'hallazgos', 'correctivas', 'informe'].find(k => !v[k]);
        return miss ? E(miss, 'Completa la auditoría externa para aprobar.') : { done: true, msg: 'Propuesta aprobada. Puedes pasar a la ejecución.' };
      }
      if (v.estado === 'Requiere ajustes' || v.estado === 'No aprobada') {
        exp.done.propuesta = false; (exp.data.propuesta = exp.data.propuesta || {}).ajuste = 'Sí';
        return { done: false, goto: 'propuesta', msg: `Estado «${v.estado}»: regresas a la propuesta para ajustarla.`, type: 'info' };
      }
      return { done: false, msg: `Validación guardada como «${v.estado}». El expediente avanza cuando sea «Aprobada».`, type: 'info' };
    },
    ejecucion: () => (exp.bitacora.length ? { done: true } : { error: { msg: 'Agrega al menos un registro de avance a la bitácora.' } }),
    cierre: () => {
      if (!MODS.slice(0, -1).every(m => exp.done[m.id])) return { error: { msg: 'Completa todas las etapas anteriores antes de cerrar.' } };
      exp.closed = true; exp.closedAt = new Date().toISOString();
      return { done: true, msg: `Expediente ${exp.folio} cerrado y conservado.` };
    }
  };
  document.addEventListener('submit', e => {
    if (e.target.id !== 'mf') return;
    e.preventDefault();
    if (exp.closed) return;
    const m = mod(curId), v = gather(m), bad = validate(m, v);
    if (bad) { const c = $(`[data-k="${bad}"]`); (c.querySelector('input,select,textarea') || c).focus(); toast('Revisa los campos marcados en rojo.', 'err'); return; }
    const prev = exp.data[m.id];
    exp.data[m.id] = v;
    const r = (HOOK[m.id] || (() => ({ done: true })))(v);
    if (r.error) {
      if (r.error.k) { mark(r.error.k, r.error.msg); const c = $(`[data-k="${r.error.k}"]`); (c.querySelector('input,select,textarea') || c).focus(); }
      toast(r.error.msg, 'err'); if (prev === undefined) delete exp.data[m.id]; else exp.data[m.id] = prev; return;
    }
    exp.done[m.id] = !!r.done;
    if (!persist()) { toast('No se pudo guardar: el almacenamiento del navegador está lleno o desactivado.', 'err'); return; }
    toast(r.msg || `«${m.title}» guardado en el expediente.`, r.type || 'ok');
    const i = idx(m.id);
    if (r.goto) go(r.goto); else if (r.done && i < MODS.length - 1) go(MODS[i + 1].id); else render();
  });

  /* ---------- Informes descargables ---------- */
  function report(full) {
    const L = [`BIOEDUCA · ${full ? 'INFORME DE EVALUACIÓN' : 'REPORTE DE DIAGNÓSTICO'}`, `Folio: ${exp.folio || '(sin folio)'}`, `Estado: ${estado()}`, `Generado: ${new Date().toLocaleString('es-MX')}`, ''];
    const show = full ? MODS : MODS.slice(0, 2);
    show.forEach(m => {
      const d = exp.data[m.id]; if (!d) return;
      L.push(`== ${m.title.toUpperCase()} ==`);
      m.fields.forEach(f => { if (!f.k || f.t === 'block') return; const x = d[f.k]; if (x === undefined || x === '' || (Array.isArray(x) && !x.length)) return; L.push(`${f.l}: ${Array.isArray(x) ? x.join(', ') : x === true ? 'Sí' : x}`); });
      if (m.id === 'diagnostico' && score() !== null) L.push(`Puntaje general: ${score()}/100`);
      if (m.id === 'ejecucion') exp.bitacora.forEach(b => L.push(`Bitácora ${b.fecha}: ${b.texto}${b.foto ? ` (archivo: ${b.foto})` : ''}`));
      L.push('');
    });
    const url = URL.createObjectURL(new Blob([L.join('\n')], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `${exp.folio || 'expediente'}-${full ? 'informe' : 'diagnostico'}.txt`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Descarga iniciada.');
  }

  /* ---------- Acciones de bloques y navegación ---------- */
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (g && !g.disabled) { go(g.dataset.go); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'rep-diag') report(false);
    else if (act === 'rep-final') report(true);
    else if (act === 'sync') {
      if (!navigator.onLine) { toast('Sin conexión: no se puede sincronizar todavía.', 'err'); return; }
      exp.pending = false; exp.done.diagnostico = !!(exp.data.diagnostico && exp.data.diagnostico.validado); persist();
      toast('Diagnóstico sincronizado y guardado en el expediente.'); render();
    } else if (act === 'bit-add') {
      const t = $('#b-texto').value.trim(), f = $('#b-fecha').value, file = $('#b-foto').files[0];
      if (!t || !f) { toast('Escribe la fecha y la descripción del avance.', 'err'); return; }
      exp.bitacora.push({ fecha: f, texto: t, foto: file ? file.name : '' }); persist();
      $('#bit').outerHTML = blocks.bit(); toast('Registro agregado a la bitácora.');
    } else if (act === 'bit-del') {
      exp.bitacora.splice(+b.dataset.i, 1); persist(); $('#bit').outerHTML = blocks.bit(); toast('Registro eliminado.', 'info');
    }
  });
  const net = () => { const s = $('#sync'); if (s) s.outerHTML = blocks.sync(); toast(navigator.onLine ? 'Conexión restablecida.' : 'Sin conexión: trabajarás en modo local.', 'info'); };
  window.addEventListener('online', net); window.addEventListener('offline', net);

  /* ---------- Arranque ---------- */
  const firstOpen = MODS.find((m, i) => !exp.done[m.id] && unlocked(i));
  curId = exp.closed ? 'cierre' : (firstOpen ? firstOpen.id : 'cierre');
  render();
})();