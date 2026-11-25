(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const auth = $('#auth');
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---------- Cambio de panel ---------- */
  const panelIn = $('.sign-in'), panelUp = $('.sign-up');
  function setPanels(to) {
    const up = to === 'up';
    panelIn.inert = up; panelUp.inert = !up;
    panelIn.setAttribute('aria-hidden', String(up));
    panelUp.setAttribute('aria-hidden', String(!up));
  }
  function go(to) {
    auth.classList.toggle('is-up', to === 'up');
    setPanels(to);
    const target = to === 'up' ? $('#u-name') : $('#i-mail');
    setTimeout(() => matchMedia('(max-width:768px)').matches && target.focus({ preventScroll: true }), 80);
  }
  $$('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
  setPanels('in');

  /* ---------- Mostrar / ocultar contraseña ---------- */
  $$('.eye').forEach(btn => btn.addEventListener('click', () => {
    const input = $('input', btn.parentElement);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
    btn.innerHTML = `<svg class="i" aria-hidden="true" focusable="false"><use href="#i-${show ? 'eye-off' : 'eye'}"/></svg>`;
    input.focus();
  }));

  /* ---------- Validación ---------- */
  const rules = {
    'u-name': v => v.trim().length >= 2 || 'Escribe tu nombre (mínimo 2 caracteres).',
    'u-mail': v => EMAIL.test(v.trim()) || 'Ingresa un correo válido, por ejemplo tu@correo.com.',
    'u-pass': v => v.length >= 8 || 'La contraseña debe tener al menos 8 caracteres.',
    'u-terms': (v, el) => el.checked || 'Debes aceptar los términos para continuar.',
    'i-mail': v => EMAIL.test(v.trim()) || 'Ingresa un correo válido, por ejemplo tu@correo.com.',
    'i-pass': v => v.length > 0 || 'Escribe tu contraseña.',
    'f-mail': v => EMAIL.test(v.trim()) || 'Ingresa el correo con el que te registraste.'
  };
  function check(el) {
    const rule = rules[el.id]; if (!rule) return true;
    const field = el.closest('.field'), res = rule(el.value, el), ok = res === true;
    field.classList.toggle('is-valid', ok && el.type !== 'checkbox' && !!el.value);
    field.classList.toggle('is-invalid', !ok);
    $('.err', field).textContent = ok ? '' : res;
    return ok;
  }
  $$('input[id]').forEach(el => {
    if (!rules[el.id]) return;
    el.addEventListener('input', () => { if (el.closest('.field').classList.contains('is-invalid') || el.value) check(el); });
    el.addEventListener('blur', () => el.value && check(el));
    el.addEventListener('change', () => el.type === 'checkbox' && check(el));
  });

  /* ---------- Medidor de seguridad ---------- */
  const meter = $('.meter'), meterTxt = $('#meter-txt');
  const labels = ['Usa mayúsculas, números y símbolos.', 'Débil: agrega más caracteres y variedad.', 'Media: casi lista, añade un símbolo o más longitud.', 'Buena: un poco más y será excelente.', 'Fuerte: ¡excelente contraseña!'];
  $('#u-pass').addEventListener('input', e => {
    const v = e.target.value; let s = 0;
    if (v.length >= 8) s++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
    if (/\d/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v) || v.length >= 14) s++;
    if (!v) s = 0; else if (s === 0) s = 1;
    meter.dataset.level = s; meterTxt.textContent = labels[s];
  });

  /* ---------- Toasts ---------- */
  function toast(title, text, type = 'ok') {
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'info' ? ' info' : '');
    t.setAttribute('role', 'status');
    t.innerHTML = `<svg class="i" aria-hidden="true" focusable="false"><use href="#i-${type === 'info' ? 'info' : 'check-circle-2'}"/></svg><div><b></b><span></span></div>`;
    $('b', t).textContent = title; $('span', t).textContent = text;
    $('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 4000);
  }

  /* ---------- Envío con spinner ---------- */
  function submit(form, fields, onDone) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const results = fields.map(id => check($('#' + id)));
      if (results.includes(false)) { $('.is-invalid input', form)?.focus(); return; }
      const btn = $('.btn', form); btn.classList.add('is-loading'); btn.disabled = true;
      setTimeout(() => { btn.classList.remove('is-loading'); btn.disabled = false; onDone(); }, 1600);
    });
  }
  const reset = form => { form.reset(); $$('.field', form).forEach(f => f.classList.remove('is-valid', 'is-invalid')); };

  const formIn = $('#form-in'), formUp = $('#form-up'), formForgot = $('#form-forgot');
  const saved = localStorage.getItem('bio-email');
  if (saved) { $('#i-mail').value = saved; $('#i-remember').checked = true; }

  submit(formIn, ['i-mail', 'i-pass'], () => {
    if ($('#i-remember').checked) localStorage.setItem('bio-email', $('#i-mail').value.trim());
    else localStorage.removeItem('bio-email');
    toast('¡Bienvenido de nuevo!', 'Inicio de sesión exitoso.');
    setTimeout(() => { window.location.href = 'index.html'; }, 1400);
    $('#i-pass').value = ''; $('#i-pass').closest('.field').classList.remove('is-valid');
  });
  submit(formUp, ['u-name', 'u-mail', 'u-pass', 'u-terms'], () => {
    toast('Cuenta creada', `Revisa ${$('#u-mail').value.trim()} para confirmar tu cuenta.`);
    reset(formUp); meter.dataset.level = 0; meterTxt.textContent = labels[0];
    setTimeout(() => go('in'), 900);
  });
  submit(formForgot, ['f-mail'], () => {
    toast('Enlace enviado', 'Si el correo existe, recibirás instrucciones en unos minutos.', 'info');
    reset(formForgot); closeModal();
  });

  /* ---------- Redes sociales ---------- */
  $$('[data-social]').forEach(b => b.addEventListener('click', () =>
    toast(`Continuar con ${b.dataset.social}`, 'Conecta aquí tu proveedor de autenticación.', 'info')));
  $$('[data-noop]').forEach(a => a.addEventListener('click', e => e.preventDefault()));

  /* ---------- Modal ---------- */
  const modal = $('#forgot'); let lastFocus = null;
  function openModal() {
    lastFocus = document.activeElement; modal.hidden = false;
    const src = $('#i-mail').value; if (EMAIL.test(src)) $('#f-mail').value = src;
    setTimeout(() => $('#f-mail').focus(), 50);
  }
  function closeModal() { modal.hidden = true; lastFocus && lastFocus.focus(); }
  $('#open-forgot').addEventListener('click', e => { e.preventDefault(); openModal(); });
  modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-close]')) closeModal(); });
  document.addEventListener('keydown', e => {
    if (modal.hidden) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') {
      const f = $$('button,input,a[href]', modal).filter(x => !x.disabled);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
})();