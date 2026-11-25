(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* --- Router por hash --- */
  const titles = { '': 'Inicio', 'quienes-somos': 'Quiénes somos', recursos: 'Recursos', comunidad: 'Comunidad', soporte: 'Soporte técnico' };
  function route() {
    const key = location.hash.replace(/^#\/?/, '');
    const name = key in titles ? key : '';
    $$('.view').forEach(v => (v.hidden = v.dataset.view !== name));
    $$('.nav a').forEach(a => {
      const on = a.dataset.route === name;
      a.classList.toggle('is-active', on);
      on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
    });
    document.title = `${titles[name]} · Bioeduca`;
    closeMenu();
    window.scrollTo({ top: 0 });
    countUp($(`.view[data-view="${name}"]`));
  }
  window.addEventListener('hashchange', route);

  /* --- Menú móvil --- */
  const burger = $('.burger'), nav = $('#nav');
  function closeMenu() { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open);
  });
  document.addEventListener('keydown', e => e.key === 'Escape' && closeMenu());

  /* --- Modales --- */
  const open = id => { closeMenu(); $(id).showModal(); };
  document.addEventListener('click', e => {
    if (e.target.closest('[data-open-diag]')) open('#diag');
    const dlg = e.target.closest('dialog');
    if (dlg && e.target === dlg) dlg.close();
  });

  /* --- Filtros de recursos --- */
  const group = $('[data-filter-group="res"]');
  group.addEventListener('click', e => {
    const chip = e.target.closest('.chip'); if (!chip) return;
    $$('.chip', group).forEach(c => c.classList.toggle('is-active', c === chip));
    const f = chip.dataset.f; let shown = 0;
    $$('#res-grid .res').forEach(card => {
      const ok = f === 'all' || card.dataset.cat.split(' ').includes(f);
      card.classList.toggle('is-out', !ok); if (ok) shown++;
    });
    $('.empty').hidden = shown > 0;
  });

  /* --- Tabs --- */
  const tabs = $('[data-tabs]');
  function selectTab(tab) {
    $$('.tab', tabs).forEach(t => {
      const on = t === tab;
      t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.addEventListener('click', e => { const t = e.target.closest('.tab'); t && selectTab(t); });
  tabs.addEventListener('keydown', e => {
    const list = $$('.tab', tabs), i = list.indexOf(document.activeElement);
    if (i < 0 || !['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    const next = list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length];
    next.focus(); selectTab(next);
  });

  /* --- Contadores animados --- */
  function countUp(view) {
    if (!view || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    $$('[data-count]', view).forEach(el => {
      const end = +el.dataset.count, suf = el.dataset.suffix || '', t0 = performance.now();
      (function tick(t) {
        const p = Math.min((t - t0) / 1200, 1), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
        el.textContent = v.toLocaleString('en-US') + (p === 1 ? suf : '');
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }

  /* --- Newsletter --- */
  const form = $('.news'), msg = $('.news__msg', form), input = $('#email');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
    msg.className = 'news__msg ' + (valid ? 'ok' : 'err');
    msg.textContent = valid ? '¡Listo! Revisa tu correo para confirmar.' : 'Escribe un correo válido, por ejemplo tu@correo.com.';
    if (valid) form.reset(); else input.focus();
  });
  /* --- Avisos breves y acciones "próximamente" --- */
  const toastEl = $('#toast'); let toastTimer;
  function showToast(msg) {
    toastEl.textContent = msg; toastEl.hidden = false;
    requestAnimationFrame(() => toastEl.classList.add('is-on'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.classList.remove('is-on'); setTimeout(() => (toastEl.hidden = true), 300); }, 3200);
  }
  document.addEventListener('click', e => {
    const soon = e.target.closest('[data-soon]');
    if (!soon) return;
    e.preventDefault();
    showToast(soon.dataset.soon);
  });
  const diagDlg = $('#diag');
  if (diagDlg) diagDlg.addEventListener('close', () => {
    if (diagDlg.returnValue === 'ok') showToast('¡Listo! Tu diagnóstico ha comenzado.');
  });
  /* --- Utilidades: folios únicos y sesión --- */
  function newFolio(prefix, digits, key) {
    let used = [];
    try { used = JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) { used = []; }
    let f;
    do { f = `${prefix}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * Math.pow(10, digits))).padStart(digits, '0')}`; } while (used.includes(f));
    try { used.push(f); localStorage.setItem(key, JSON.stringify(used)); } catch (_) { /* sin almacenamiento */ }
    return f;
  }
  try {
    const session = JSON.parse(localStorage.getItem('bioeduca-session') || 'null');
    const cta = $('.nav__cta');
    if (session && cta) { cta.textContent = 'Mi expediente'; cta.setAttribute('href', 'onboarding.html'); }
  } catch (_) { /* sin sesión */ }

  /* --- Recursos: descarga simulada con confirmación --- */
  const dl = $('#dl'), dlProg = $('#dl-prog'), dlBar = $('#dl-prog i'), dlStatus = $('#dl-status'), dlStart = $('#dl-start');
  let dlTimer, dlTitle = '';
  function dlReset() {
    clearInterval(dlTimer); dlProg.hidden = true; dlBar.style.width = '0'; dlStatus.textContent = ''; dlStart.disabled = false;
  }
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-download]'); if (!btn) return;
    const card = btn.closest('.res');
    dlTitle = card.dataset.title;
    $('#dl-title').textContent = dlTitle;
    $('#dl-meta').textContent = card.dataset.meta;
    dlReset(); dl.showModal();
  });
  dlStart.addEventListener('click', () => {
    let p = 0; dlStart.disabled = true; dlProg.hidden = false; dlStatus.textContent = 'Preparando descarga…';
    dlTimer = setInterval(() => {
      p = Math.min(100, p + 12 + Math.random() * 10); dlBar.style.width = p + '%';
      if (p >= 100) {
        clearInterval(dlTimer); dlStatus.textContent = 'Descarga completada.';
        setTimeout(() => { dl.close(); showToast(`Descarga completada: ${dlTitle}`); }, 350);
      }
    }, 220);
  });
  $('#dl-cancel').addEventListener('click', () => dl.close());
  dl.addEventListener('close', dlReset);

  /* --- Soporte: acordeón de preguntas frecuentes --- */
  $$('.faq details').forEach(d => d.addEventListener('toggle', () => {
    if (d.open) $$('.faq details').forEach(o => { if (o !== d) o.open = false; });
  }));

  /* --- Soporte: formulario de reporte técnico --- */
  const spForm = $('#sp-form');
  if (spForm) {
    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const rules = {
      'sp-name': v => v.trim().length >= 2 || 'Escribe tu nombre.',
      'sp-mail': v => EMAIL.test(v.trim()) || 'Ingresa un correo válido, por ejemplo tu@correo.com.',
      'sp-type': v => !!v || 'Selecciona el tipo de problema.',
      'sp-module': v => !!v || 'Indica el módulo donde ocurrió.',
      'sp-desc': v => v.trim().length >= 20 || 'Describe el problema con al menos 20 caracteres.'
    };
    const chk = el => {
      const r = rules[el.id](el.value), f = el.closest('.sp-field');
      f.classList.toggle('is-invalid', r !== true);
      $('.sp-err', f).textContent = r === true ? '' : r;
      return r === true;
    };
    Object.keys(rules).forEach(id => {
      const el = $('#' + id);
      el.addEventListener('blur', () => chk(el));
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { if (el.closest('.sp-field').classList.contains('is-invalid')) chk(el); });
    });
    const fileInput = $('#sp-file'), prev = $('#sp-prev'), prevImg = $('#sp-prev img'), prevName = $('#sp-prev-name'), fileErr = $('#sp-file-err');
    let imgUrl = null;
    const clearFile = () => {
      fileInput.value = ''; if (imgUrl) URL.revokeObjectURL(imgUrl); imgUrl = null;
      prev.hidden = true; prevImg.removeAttribute('src'); fileErr.textContent = '';
    };
    fileInput.addEventListener('change', () => {
      const f = fileInput.files[0]; if (!f) { clearFile(); return; }
      if (!['image/jpeg', 'image/png'].includes(f.type)) { clearFile(); fileErr.textContent = 'Formato no válido. Usa una imagen JPG o PNG.'; return; }
      if (f.size > 2 * 1024 * 1024) { clearFile(); fileErr.textContent = `La imagen pesa ${(f.size / 1048576).toFixed(1)} MB. El máximo es 2 MB.`; return; }
      fileErr.textContent = '';
      if (imgUrl) URL.revokeObjectURL(imgUrl);
      imgUrl = URL.createObjectURL(f); prevImg.src = imgUrl;
      prevName.textContent = `${f.name} · ${Math.max(1, Math.round(f.size / 1024))} KB`; prev.hidden = false;
    });
    $('#sp-rm').addEventListener('click', clearFile);

    const done = $('#sp-done'), submitBtn = $('#sp-submit');
    spForm.addEventListener('submit', e => {
      e.preventDefault();
      const results = Object.keys(rules).map(id => chk($('#' + id)));
      if (results.includes(false)) { $('.sp-field.is-invalid input, .sp-field.is-invalid select, .sp-field.is-invalid textarea', spForm).focus(); return; }
      submitBtn.disabled = true; submitBtn.firstChild.textContent = 'Enviando… ';
      setTimeout(() => {
        const folio = newFolio('SOP', 4, 'bioeduca-tickets');
        $('#sp-folio').textContent = folio;
        $('#sp-note').textContent = `Enviaremos el seguimiento a ${$('#sp-mail').value.trim()}.`;
        spForm.hidden = true; done.hidden = false;
        submitBtn.disabled = false; submitBtn.firstChild.textContent = 'Enviar reporte ';
        showToast(`Reporte enviado. Tu folio es ${folio}.`);
      }, 1100);
    });
    $('#sp-copy').addEventListener('click', () => {
      const folio = $('#sp-folio').textContent;
      const ok = () => showToast('Folio copiado al portapapeles.');
      const fallback = () => { const r = document.createRange(); r.selectNodeContents($('#sp-folio')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); try { document.execCommand('copy'); ok(); } catch (_) { showToast('Selecciona el folio y cópialo manualmente.'); } };
      if (navigator.clipboard) navigator.clipboard.writeText(folio).then(ok, fallback); else fallback();
    });
    $('#sp-again').addEventListener('click', () => {
      spForm.reset(); clearFile(); $$('.sp-field', spForm).forEach(f => { f.classList.remove('is-invalid'); const s = $('.sp-err', f); if (s) s.textContent = ''; });
      done.hidden = true; spForm.hidden = false; $('#sp-name').focus();
    });
  }

  /* --- Foro de discusiones: hilos, aportes y nuevas preguntas --- */
  const askForm = $('#ask-form');
  if (askForm) {
    const askText = $('#ask-text'), askErr = $('#ask-err'), askCount = $('#ask-count');
    const list = $('#thread-list'), countEl = $('#thread-count');
    const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt !== undefined) n.textContent = txt; return n; };
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    const postEl = p => {
      const li = el('li', 'post');
      const body = el('div');
      body.append(el('b', null, p.author), ' ', el('span', 'post__when', '· ' + p.when), el('p', null, p.text));
      li.append(el('span', 'avatar avatar--sm ' + (p.me ? 'avatar--me' : 'avatar--b'), p.me ? 'TÚ' : p.author.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()), body);
      return li;
    };
    const emptyEl = () => el('li', 'post-empty', 'Aún no hay aportes. ¡Sé la primera persona en responder!');
    function threadEl(t, isNew) {
      const art = el('article', 'card thread' + (isNew ? ' is-new' : ''));
      const body = el('div', 'thread__body');
      const who = el('p', 'thread__who'); who.append(el('b', null, t.name), ' ', el('span', null, 'Miembro Bioeduca · ' + t.when));
      const foot = el('div', 'thread__foot'), meta = el('p', 'thread__meta');
      meta.setAttribute('aria-live', 'polite');
      art._n = { r: t.replies, c: t.contrib };
      art._render = () => { meta.textContent = `${plural(art._n.r, 'respuesta', 'respuestas')} · ${plural(art._n.c, 'aporte', 'aportes')}`; };
      art._render();
      const btn = el('button', 'thread__btn'); btn.type = 'button'; btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = '<svg class="i" aria-hidden="true" focusable="false"><use href="#i-chevron-down"/></svg>';
      btn.append(el('span', null, 'Ver aportes'));
      foot.append(meta, btn);
      const panel = el('div', 'thread__panel'); panel.hidden = true;
      art._ul = el('ul', 'posts');
      if (t.posts.length) t.posts.forEach(p => art._ul.append(postEl(p))); else art._ul.append(emptyEl());
      const form = el('form', 'reply'); form.noValidate = true;
      const inp = el('input'); inp.type = 'text'; inp.maxLength = 200; inp.placeholder = 'Suma tu aporte a esta conversación…'; inp.setAttribute('aria-label', 'Tu aporte');
      const send = el('button', 'btn btn--primary', 'Aportar'); send.type = 'submit';
      form.append(inp, send, el('small', 'reply__err'));
      form.lastChild.setAttribute('role', 'alert');
      panel.append(art._ul, form);
      body.append(who, el('h4', null, t.q), foot, panel);
      art.append(el('span', 'avatar avatar--' + t.cls, t.ini), body);
      return art;
    }
    const updateCount = () => { const n = $$('.thread', list).length; countEl.textContent = `${n} ${n === 1 ? 'hilo' : 'hilos'}`; };
    [
      { cls: 'a', ini: 'MB', name: 'María B.', when: 'hoy', q: '¿Qué plantas funcionan mejor en aulas con poca luz natural?', replies: 3, contrib: 8,
        posts: [{ author: 'Carlos B.', when: 'hoy', text: 'En mi escuela funcionó bien el pothos y la sansevieria: aguantan poca luz y poco riego.' }, { author: 'Laura M.', when: 'hoy', text: 'Ayuda también ubicarlas cerca de ventanas y rotarlas cada semana.' }] },
      { cls: 'b', ini: 'CB', name: 'Carlos B.', when: 'ayer', q: '¿Cómo medir el confort acústico de un aula sin equipo especializado?', replies: 5, contrib: 12,
        posts: [{ author: 'María B.', when: 'ayer', text: 'Hay apps de sonómetro que sirven para una primera aproximación; compáralas con la plantilla de registro de la biblioteca.' }] },
      { cls: 'c', ini: 'LM', name: 'Laura M.', when: 'hace 3 días', q: 'Experiencias con aulas flexibles en primaria: ¿qué les funcionó?', replies: 7, contrib: 21, posts: [] }
    ].forEach(t => list.append(threadEl(t, false)));
    updateCount();

    list.addEventListener('click', e => {
      const b = e.target.closest('.thread__btn'); if (!b) return;
      const panel = $('.thread__panel', b.closest('.thread')), open = panel.hidden;
      panel.hidden = !open; b.setAttribute('aria-expanded', String(open));
      $('span', b).textContent = open ? 'Ocultar aportes' : 'Ver aportes';
      if (open) $('input', panel).focus();
    });
    list.addEventListener('submit', e => {
      const form = e.target.closest('.reply'); if (!form) return;
      e.preventDefault();
      const input = $('input', form), err = $('.reply__err', form), art = form.closest('.thread'), text = input.value.trim();
      if (!text) { err.textContent = 'Escribe tu aporte antes de enviarlo.'; input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
      err.textContent = ''; input.removeAttribute('aria-invalid');
      const empty = $('.post-empty', art); if (empty) empty.remove();
      art._ul.append(postEl({ author: 'Tú', me: true, when: 'ahora', text }));
      art._n.r += 1; art._n.c += 1; art._render();
      input.value = '';
      showToast('Aporte publicado. ¡Gracias por sumar!');
    });

    const MIN_Q = 10;
    const clean = s => s.trim().replace(/\s+/g, ' ');
    const issue = text => {
      if (!text) return 'Escribe tu pregunta antes de publicarla.';
      if (text.length < MIN_Q) return `Tu pregunta es muy corta: escribe al menos ${MIN_Q} caracteres.`;
      if ($$('.thread h4', list).some(h => h.textContent.trim().toLowerCase() === text.toLowerCase())) return 'Esa pregunta ya está publicada. Súmate a la conversación existente.';
      return '';
    };
    const setError = msg => { askErr.textContent = msg; askText.setAttribute('aria-invalid', msg ? 'true' : 'false'); };
    askText.addEventListener('input', () => {
      askCount.textContent = `${askText.value.length}/${askText.maxLength}`;
      if (askErr.textContent && !issue(clean(askText.value))) setError('');
    });
    askText.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); askForm.requestSubmit(); }
    });
    askForm.addEventListener('submit', e => {
      e.preventDefault();
      const text = clean(askText.value), problem = issue(text);
      if (problem) { setError(problem); askText.focus(); return; }
      const art = threadEl({ cls: 'me', ini: 'TÚ', name: 'Tú', when: 'ahora', q: text, replies: 0, contrib: 0, posts: [] }, true);
      list.prepend(art);
      askText.value = ''; askCount.textContent = `0/${askText.maxLength}`; setError('');
      updateCount();
      art.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      showToast('¡Pregunta publicada! La comunidad ya puede responderte.');
    });
  }

  /* --- Arranque: se ejecuta al final, cuando todo ya está declarado --- */
  route();
})();