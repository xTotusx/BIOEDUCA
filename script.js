(() => {
  'use strict';

  const CURRENT_USER_KEY = 'bioeduca_current_user';
  const LEGACY_SESSION_KEY = 'bioeduca-session';
  const FORUM_THREADS_KEY = 'bioeduca_forum_threads';

  const DEFAULT_THREADS = [
    {
      id: 't-1',
      author: 'Miembro Bioeduca',
      initials: 'MB',
      date: 'hoy',
      question: '¿Qué plantas han funcionado mejor en aulas con poca luz?',
      replies: 3,
      contributions: 8
    },
    {
      id: 't-2',
      author: 'Comunidad Bioeduca',
      initials: 'CB',
      date: 'hoy',
      question: 'Ideas para mejorar la acústica con materiales locales',
      replies: 4,
      contributions: 9
    },
    {
      id: 't-3',
      author: 'Elena Ríos',
      initials: 'ER',
      date: 'ayer',
      question: '¿Cómo combinan ventilación cruzada y control térmico sin elevar el ruido?',
      replies: 2,
      contributions: 5
    }
  ];

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignora fallos de almacenamiento
    }
  }

  function getSessionUser() {
    const current = readJson(CURRENT_USER_KEY, null);
    const legacy = readJson(LEGACY_SESSION_KEY, null);
    const rawUser = current?.user || current || legacy || null;
    if (!rawUser || typeof rawUser !== 'object') return null;

    const email = String(rawUser.email || rawUser.correo || '').trim();
    const name = String(rawUser.name || rawUser.nombre || rawUser.fullName || '').trim();
    if (!email && !name) return null;

    return {
      email,
      name: name || email.split('@')[0] || 'Mi cuenta'
    };
  }

  function getInitials(name) {
    const parts = String(name || 'MB').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'MB';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const toastEl = document.getElementById('toast');
  let toastTimer = null;

  function showToast(message, variant = 'ok') {
    if (!toastEl) return;
    toastEl.className = 'toast is-on';
    if (variant === 'info') toastEl.classList.add('toast--info');
    if (variant === 'err') toastEl.classList.add('toast--err');
    toastEl.textContent = message;
    toastEl.hidden = false;

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('is-on');
      setTimeout(() => {
        if (!toastEl.classList.contains('is-on')) {
          toastEl.hidden = true;
        }
      }, 300);
    }, 3200);
  }

  // Cabecera y sesión
  const burgerBtn = document.querySelector('.burger');
  const navEl = document.getElementById('nav');
  const profileLink = navEl?.querySelector('.nav__profile');
  const ctaLink = navEl?.querySelector('.nav__cta');

  function setMenuOpen(open) {
    if (!burgerBtn || !navEl) return;
    burgerBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    navEl.classList.toggle('is-open', open);
    burgerBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  }

  if (burgerBtn && navEl) {
    burgerBtn.addEventListener('click', () => {
      const isOpen = burgerBtn.getAttribute('aria-expanded') === 'true';
      setMenuOpen(!isOpen);
    });

    document.addEventListener('click', (e) => {
      if (!navEl.classList.contains('is-open')) return;
      if (!navEl.contains(e.target) && !burgerBtn.contains(e.target)) {
        setMenuOpen(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navEl.classList.contains('is-open')) {
        setMenuOpen(false);
        burgerBtn.focus();
      }
    });
  }

  function syncSessionUI() {
    const user = getSessionUser();
    if (profileLink) {
      profileLink.hidden = !user;
    }
    if (ctaLink) {
      if (user) {
        ctaLink.href = 'onboarding.html';
        ctaLink.textContent = 'Mi expediente';
      } else {
        ctaLink.href = 'login.html';
        ctaLink.textContent = 'Ingresar';
      }
    }
  }

  syncSessionUI();

  document.querySelectorAll('[data-open-diag]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      setMenuOpen(false);
      if (getSessionUser()) {
        window.location.href = 'onboarding.html';
      } else {
        window.location.href = 'login.html?next=onboarding.html';
      }
    });
  });

  // Enrutador de vistas por hash (#/, #/quienes-somos, #/recursos, #/comunidad, #/soporte)
  const views = Array.from(document.querySelectorAll('.view[data-view]'));
  const navLinks = Array.from(document.querySelectorAll('#nav a[data-route]'));

  function parseRoute() {
    const hash = (window.location.hash || '').trim();
    if (!hash || hash === '#' || hash === '#/') return '';
    const clean = hash.replace(/^#\/?/, '').split('?')[0].split('#')[0].toLowerCase();
    return clean;
  }

  function renderRoute() {
    let route = parseRoute();
    const matched = views.find((v) => (v.getAttribute('data-view') || '').toLowerCase() === route);
    if (!matched) {
      route = '';
    }

    views.forEach((v) => {
      const vRoute = (v.getAttribute('data-view') || '').toLowerCase();
      v.hidden = vRoute !== route;
    });

    navLinks.forEach((a) => {
      const isCurrent = (a.getAttribute('data-route') || '').toLowerCase() === route;
      a.classList.toggle('is-active', isCurrent);
      if (isCurrent) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    });

    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  window.addEventListener('hashchange', renderRoute);
  renderRoute();

  // Avisos de secciones pendientes ([data-soon])
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-soon]');
    if (!trigger) return;
    if (trigger.getAttribute('href') === '#' || trigger.getAttribute('href')?.startsWith('#/comunidad')) {
      e.preventDefault();
    }
    const msg = trigger.getAttribute('data-soon') || 'Esta sección estará disponible pronto.';
    showToast(msg, 'info');
  });

  // Filtros y modal de descarga de Recursos
  const filterGroup = document.querySelector('[data-filter-group="res"]');
  const resCards = Array.from(document.querySelectorAll('#res-grid .res'));
  const emptyResEl = document.querySelector('[data-view="recursos"] .empty');

  if (filterGroup && resCards.length) {
    const filterButtons = Array.from(filterGroup.querySelectorAll('.chip[data-f]'));
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = (btn.getAttribute('data-f') || 'all').toLowerCase();
        filterButtons.forEach((b) => b.classList.toggle('is-active', b === btn));

        let visibleCount = 0;
        resCards.forEach((card) => {
          const cats = (card.getAttribute('data-cat') || '').toLowerCase().split(/\s+/).filter(Boolean);
          const show = filter === 'all' || cats.includes(filter);
          card.hidden = !show;
          if (show) visibleCount += 1;
        });

        if (emptyResEl) {
          emptyResEl.hidden = visibleCount > 0;
        }
      });
    });
  }

  const dlDialog = document.getElementById('dl');
  const dlTitle = document.getElementById('dl-title');
  const dlMeta = document.getElementById('dl-meta');
  const dlProg = document.getElementById('dl-prog');
  const dlStatus = document.getElementById('dl-status');
  const dlCancel = document.getElementById('dl-cancel');
  const dlStart = document.getElementById('dl-start');
  let activeResource = null;
  let dlTimer = null;

  function resetDownloadDialog() {
    clearInterval(dlTimer);
    if (dlProg) {
      dlProg.hidden = true;
      const bar = dlProg.querySelector('i');
      if (bar) bar.style.width = '0%';
    }
    if (dlStatus) dlStatus.textContent = '';
    if (dlStart) dlStart.disabled = false;
    if (dlCancel) dlCancel.disabled = false;
  }

  document.querySelectorAll('#res-grid [data-download]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.res');
      activeResource = {
        title: card?.getAttribute('data-title') || card?.querySelector('h3')?.textContent?.trim() || 'Recurso Bioeduca',
        meta: card?.getAttribute('data-meta') || card?.querySelector('footer span')?.textContent?.trim() || 'Archivo'
      };
      resetDownloadDialog();
      if (dlTitle) dlTitle.textContent = activeResource.title;
      if (dlMeta) dlMeta.textContent = activeResource.meta;

      if (dlDialog && typeof dlDialog.showModal === 'function') {
        dlDialog.showModal();
      } else {
        showToast(`Descargando "${activeResource.title}"...`, 'ok');
      }
    });
  });

  if (dlCancel && dlDialog) {
    dlCancel.addEventListener('click', () => {
      resetDownloadDialog();
      dlDialog.close();
    });
  }

  if (dlStart && dlDialog) {
    dlStart.addEventListener('click', () => {
      if (!activeResource) return;
      dlStart.disabled = true;
      dlCancel.disabled = true;
      if (dlProg) dlProg.hidden = false;
      const bar = dlProg?.querySelector('i');
      let pct = 0;

      if (dlStatus) dlStatus.textContent = 'Preparando descarga...';

      dlTimer = setInterval(() => {
        pct += 25;
        if (bar) bar.style.width = `${Math.min(pct, 100)}%`;
        if (pct < 100) {
          if (dlStatus) dlStatus.textContent = `Descargando... ${pct}%`;
          return;
        }
        clearInterval(dlTimer);
        if (dlStatus) dlStatus.textContent = 'Descarga completada.';

        const slug = activeResource.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'recurso-bioeduca';
        const blob = new Blob(
          [`BIOEDUCA - ${activeResource.title}\nDetalle: ${activeResource.meta}\nMaterial de referencia de la biblioteca Bioeduca.\n`],
          { type: 'text/plain;charset=utf-8' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${slug}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        showToast(`"${activeResource.title}" descargado.`, 'ok');
        setTimeout(() => {
          resetDownloadDialog();
          dlDialog.close();
        }, 450);
      }, 180);
    });
  }

  // Pestañas y Foro de discusiones en Comunidad
  const tabList = document.querySelector('[data-tabs]');
  if (tabList) {
    const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
    const panels = tabs
      .map((tab) => document.getElementById(tab.getAttribute('aria-controls') || ''))
      .filter(Boolean);

    function activateTab(selectedTab) {
      tabs.forEach((tab) => {
        const selected = tab === selectedTab;
        tab.classList.toggle('is-active', selected);
        tab.setAttribute('aria-selected', selected ? 'true' : 'false');
        tab.setAttribute('tabindex', selected ? '0' : '-1');
      });

      const targetId = selectedTab.getAttribute('aria-controls');
      panels.forEach((panel) => {
        panel.hidden = panel.id !== targetId;
      });
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => activateTab(tab));
    });
  }

  const askForm = document.getElementById('ask-form');
  const askText = document.getElementById('ask-text');
  const askErr = document.getElementById('ask-err');
  const askCount = document.getElementById('ask-count');
  const threadList = document.getElementById('thread-list');
  const threadCountEl = document.getElementById('thread-count');

  let threads = readJson(FORUM_THREADS_KEY, null);
  if (!Array.isArray(threads) || !threads.length) {
    threads = [...DEFAULT_THREADS];
    writeJson(FORUM_THREADS_KEY, threads);
  }

  function updateCharCounter() {
    if (!askText || !askCount) return;
    const max = Number(askText.getAttribute('maxlength') || 160);
    askCount.textContent = `${askText.value.length}/${max}`;
  }

  function renderThreads() {
    if (!threadList) return;
    threadList.innerHTML = threads
      .map((t) => {
        const replies = Number(t.replies ?? 0);
        const contributions = Number(t.contributions ?? 1);
        return `
          <article class="card thread">
            <header class="thread__head">
              <span class="avatar" aria-hidden="true">${escapeHtml(t.initials || getInitials(t.author))}</span>
              <div>
                <strong>${escapeHtml(t.author || 'Miembro Bioeduca')}</strong>
                <small>· ${escapeHtml(t.date || 'hoy')}</small>
              </div>
            </header>
            <h4>${escapeHtml(t.question)}</h4>
            <footer class="thread__meta">
              <span>${replies} ${replies === 1 ? 'respuesta' : 'respuestas'}</span>
              <span>·</span>
              <span>${contributions} ${contributions === 1 ? 'aporte' : 'aportes'}</span>
            </footer>
          </article>
        `;
      })
      .join('');

    if (threadCountEl) {
      threadCountEl.textContent = `${threads.length} ${threads.length === 1 ? 'hilo' : 'hilos'}`;
    }
  }

  if (askText) {
    askText.addEventListener('input', () => {
      updateCharCounter();
      if (askErr && askText.value.trim()) {
        askErr.textContent = '';
      }
    });
    updateCharCounter();
  }

  if (askForm && askText) {
    askForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const question = askText.value.trim();
      if (!question) {
        if (askErr) askErr.textContent = 'Escribe una pregunta antes de publicar.';
        askText.focus();
        return;
      }

      if (askErr) askErr.textContent = '';
      const user = getSessionUser();
      const author = user ? user.name : 'Miembro Bioeduca';

      threads.unshift({
        id: `t-${Date.now()}`,
        author,
        initials: getInitials(author),
        date: 'hoy',
        question,
        replies: 0,
        contributions: 1
      });
      writeJson(FORUM_THREADS_KEY, threads);
      renderThreads();

      askText.value = '';
      updateCharCounter();
      showToast('Pregunta publicada en el foro de discusiones.', 'ok');
    });
  }

  renderThreads();

  // Soporte técnico con validación de evidencia y generación de folio
  const spForm = document.getElementById('sp-form');
  const spDone = document.getElementById('sp-done');
  const spName = document.getElementById('sp-name');
  const spMail = document.getElementById('sp-mail');
  const spType = document.getElementById('sp-type');
  const spModule = document.getElementById('sp-module');
  const spDesc = document.getElementById('sp-desc');
  const spFile = document.getElementById('sp-file');
  const spPrev = document.getElementById('sp-prev');
  const spPrevName = document.getElementById('sp-prev-name');
  const spRm = document.getElementById('sp-rm');
  const spFileErr = document.getElementById('sp-file-err');
  const spFolio = document.getElementById('sp-folio');
  const spNote = document.getElementById('sp-note');
  const spCopy = document.getElementById('sp-copy');
  const spAgain = document.getElementById('sp-again');

  const MAX_EVIDENCE_BYTES = 2 * 1024 * 1024;
  const ALLOWED_MIME = ['image/jpeg', 'image/png'];
  let evidenceDataUrl = '';
  let evidenceFileName = '';

  function setSpFieldError(inputEl, message) {
    const field = inputEl?.closest('.sp-field');
    const err = field?.querySelector('.sp-err');
    if (!field || !err) return;
    if (message) {
      field.classList.add('is-invalid');
      err.textContent = message;
    } else {
      field.classList.remove('is-invalid');
      err.textContent = '';
    }
  }

  function clearEvidence() {
    evidenceDataUrl = '';
    evidenceFileName = '';
    if (spFile) spFile.value = '';
    if (spPrev) {
      spPrev.hidden = true;
      const img = spPrev.querySelector('img');
      if (img) img.removeAttribute('src');
    }
    if (spPrevName) spPrevName.textContent = '';
    if (spFileErr) spFileErr.textContent = '';
  }

  if (spFile) {
    spFile.addEventListener('change', () => {
      if (spFileErr) spFileErr.textContent = '';
      const file = spFile.files && spFile.files[0];
      if (!file) {
        clearEvidence();
        return;
      }

      if (!ALLOWED_MIME.includes(file.type)) {
        clearEvidence();
        if (spFileErr) spFileErr.textContent = 'Solo se admiten imágenes en formato JPG o PNG.';
        return;
      }

      if (file.size > MAX_EVIDENCE_BYTES) {
        clearEvidence();
        if (spFileErr) spFileErr.textContent = 'La imagen supera el tamaño máximo permitido de 2 MB.';
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        evidenceDataUrl = typeof reader.result === 'string' ? reader.result : '';
        evidenceFileName = file.name;
        if (spPrev) {
          const img = spPrev.querySelector('img');
          if (img && evidenceDataUrl) img.src = evidenceDataUrl;
          spPrev.hidden = false;
        }
        if (spPrevName) spPrevName.textContent = file.name;
      };
      reader.readAsDataURL(file);
    });
  }

  if (spRm) {
    spRm.addEventListener('click', clearEvidence);
  }

  if (spForm) {
    spForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = (spName?.value || '').trim();
      const mail = (spMail?.value || '').trim();
      const type = (spType?.value || '').trim();
      const mod = (spModule?.value || '').trim();
      const desc = (spDesc?.value || '').trim();

      setSpFieldError(spName, '');
      setSpFieldError(spMail, '');
      setSpFieldError(spType, '');
      setSpFieldError(spModule, '');
      setSpFieldError(spDesc, '');

      let ok = true;
      if (!name) { setSpFieldError(spName, 'Ingresa tu nombre.'); ok = false; }
      if (!mail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
        setSpFieldError(spMail, 'Ingresa un correo electrónico válido.');
        ok = false;
      }
      if (!type) { setSpFieldError(spType, 'Selecciona el tipo de problema.'); ok = false; }
      if (!mod) { setSpFieldError(spModule, 'Selecciona el módulo donde ocurrió.'); ok = false; }
      if (!desc) { setSpFieldError(spDesc, 'Describe brevemente el problema.'); ok = false; }

      if (!ok) {
        showToast('Revisa los campos obligatorios del reporte técnico.', 'err');
        return;
      }

      const year = new Date().getFullYear();
      const folio = `SOP-${year}-${Math.floor(1000 + Math.random() * 9000)}`;

      try {
        const prevReports = readJson('bioeduca_support_tickets', []);
        prevReports.unshift({
          folio,
          name,
          mail,
          type,
          module: mod,
          desc,
          evidenceName: evidenceFileName || null,
          createdAt: new Date().toISOString()
        });
        writeJson('bioeduca_support_tickets', prevReports);
      } catch {
        // Ignora errores de cuota
      }

      if (spFolio) spFolio.textContent = folio;
      if (spNote) {
        spNote.textContent = `Registramos tu reporte sobre "${type}" en el módulo "${mod}"${evidenceFileName ? ` con evidencia (${evidenceFileName})` : ''}.`;
      }

      spForm.hidden = true;
      if (spDone) spDone.hidden = false;
      showToast(`Reporte enviado. Folio: ${folio}`, 'ok');
    });
  }

  if (spCopy && spFolio) {
    spCopy.addEventListener('click', async () => {
      const code = (spFolio.textContent || '').trim();
      if (!code) return;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(code);
          showToast('Folio copiado al portapapeles.', 'ok');
          return;
        }
      } catch {
        // Usa respaldo
      }
      showToast(`Folio: ${code}`, 'info');
    });
  }

  if (spAgain && spForm && spDone) {
    spAgain.addEventListener('click', () => {
      spForm.reset();
      clearEvidence();
      setSpFieldError(spName, '');
      setSpFieldError(spMail, '');
      setSpFieldError(spType, '');
      setSpFieldError(spModule, '');
      setSpFieldError(spDesc, '');
      spDone.hidden = true;
      spForm.hidden = false;
    });
  }

  // Newsletter del pie de página
  const newsForm = document.querySelector('.news');
  const newsInput = document.getElementById('email');
  const newsMsg = newsForm?.querySelector('.news__msg');

  if (newsForm && newsInput) {
    newsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = newsInput.value.trim();
      if (!val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        if (newsMsg) newsMsg.textContent = 'Ingresa un correo electrónico válido.';
        showToast('Ingresa un correo electrónico válido.', 'err');
        newsInput.focus();
        return;
      }

      if (newsMsg) newsMsg.textContent = `Listo: registramos ${val} para recibir novedades.`;
      newsInput.value = '';
      showToast('Suscripción registrada correctamente.', 'ok');
    });
  }
})();