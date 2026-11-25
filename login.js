(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const auth = $('#auth');
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const USERS = 'bioeduca_users', CURRENT = 'bioeduca_current_user', SESSION = 'bioeduca-session', PASS = 'bioeduca-profile-pass';

  /* ---------- Almacenamiento ---------- */
  const read = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (_) { return false; } };
  const getUsers = () => { try { const u = JSON.parse(read(USERS) || '[]'); return Array.isArray(u) ? u : []; } catch (_) { return []; } };
  const hash = async s => {
    try {
      if (window.crypto && crypto.subtle) {
        const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
        return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
      }
    } catch (_) { /* sin crypto.subtle */ }
    return 'b64:' + btoa(unescape(encodeURIComponent(s)));
  };

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
  function fail(el, msg) {
    const field = el.closest('.field');
    field.classList.remove('is-valid'); field.classList.add('is-invalid');
    $('.err', field).textContent = msg; el.focus();
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

  /* ---------- Envío con spinner (acepta onDone asíncrono) ---------- */
  function submit(form, fields, onDone) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const results = fields.map(id => check($('#' + id)));
      if (results.includes(false)) { $('.is-invalid input', form)?.focus(); return; }
      const btn = $('.btn', form); btn.classList.add('is-loading'); btn.disabled = true;
      setTimeout(async () => {
        try { await onDone(); } finally { btn.classList.remove('is-loading'); btn.disabled = false; }
      }, 1600);
    });
  }
  const reset = form => { form.reset(); $$('.field', form).forEach(f => f.classList.remove('is-valid', 'is-invalid')); };

  const formIn = $('#form-in'), formUp = $('#form-up'), formForgot = $('#form-forgot');
  const saved = read('bio-email');
  if (saved) { $('#i-mail').value = saved; $('#i-remember').checked = true; }

  /* ---------- Entrar: valida contra bioeduca_users ---------- */
  submit(formIn, ['i-mail', 'i-pass'], async () => {
    const email = $('#i-mail').value.trim().toLowerCase();
    const user = getUsers().find(u => u.email === email);
    const h = await hash($('#i-pass').value);
    if (!user || user.passHash !== h) {
      fail($('#i-pass'), 'Correo o contraseña incorrectos. Revisa tus datos o crea una cuenta.');
      toast('No pudimos iniciar sesión', 'Correo o contraseña incorrectos.', 'info');
      return;
    }
    if ($('#i-remember').checked) write('bio-email', email); else { try { localStorage.removeItem('bio-email'); } catch (_) { /* nada */ } }
    const session = { name: user.name, email: user.email, profileComplete: !!user.profileComplete, loginAt: new Date().toISOString() };
    write(CURRENT, JSON.stringify(session));
    write(SESSION, JSON.stringify({ name: user.name, email: user.email }));
    write(PASS, user.passHash);
    toast(`¡Bienvenido, ${user.name.split(/\s+/)[0]}!`, user.profileComplete ? 'Inicio de sesión exitoso.' : 'Completa tu perfil para aprovechar Bioeduca.');
    $('#i-pass').value = ''; $('#i-pass').closest('.field').classList.remove('is-valid');
    setTimeout(() => openNext(session), 900);
  });

  /* ---------- Siguiente paso tras entrar ---------- */
  const nextModal = $('#next');
  function openNext(session) {
    $('#next-perfil').hidden = !!session.profileComplete;
    $('#next-sub').textContent = session.profileComplete
      ? 'Tu perfil está completo. Elige tu siguiente paso.'
      : 'Tu perfil aún está incompleto. Puedes completarlo ahora o hacerlo más tarde.';
    nextModal.hidden = false;
    setTimeout(() => $('.opt:not([hidden])', nextModal).focus(), 50);
  }
  nextModal.addEventListener('click', e => {
    const b = e.target.closest('[data-next]'); if (!b) return;
    if (b.hasAttribute('data-postpone')) write('bioeduca_postponed', new Date().toISOString());
    window.location.href = b.dataset.next;
  });

  /* ---------- Registro: valida, verifica código y guarda ---------- */
  let pending = null, code = '';
  submit(formUp, ['u-name', 'u-mail', 'u-pass', 'u-terms'], async () => {
    const email = $('#u-mail').value.trim().toLowerCase();
    if (getUsers().some(u => u.email === email)) {
      fail($('#u-mail'), 'Ya existe una cuenta con este correo. Inicia sesión.');
      return;
    }
    pending = { name: $('#u-name').value.trim(), email, passHash: await hash($('#u-pass').value), profileComplete: false, createdAt: new Date().toISOString() };
    openVerify();
  });
  submit(formForgot, ['f-mail'], () => {
    toast('Enlace enviado', 'Si el correo existe, recibirás instrucciones en unos minutos.', 'info');
    reset(formForgot); closeModal();
  });

  /* ---------- Modal de verificación (OTP) ---------- */
  const verify = $('#verify'), otp = $$('#otp input'), vErr = $('#v-err');
  const newCode = () => { code = String(Math.floor(100000 + Math.random() * 900000)); $('#v-demo').textContent = code; };
  function openVerify() {
    newCode(); otp.forEach(i => (i.value = '')); vErr.textContent = '';
    $('#v-mail').textContent = pending.email;
    verify.hidden = false; setTimeout(() => otp[0].focus(), 50);
  }
  function closeVerify() { verify.hidden = true; pending = null; }
  otp.forEach((inp, i) => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '').slice(-1); vErr.textContent = '';
      if (inp.value && otp[i + 1]) otp[i + 1].focus();
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !inp.value && otp[i - 1]) otp[i - 1].focus();
      if (e.key === 'Enter') { e.preventDefault(); $('#v-submit').click(); }
    });
    inp.addEventListener('paste', e => {
      const d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      if (!d) return; e.preventDefault();
      d.split('').forEach((c, k) => { if (otp[k]) otp[k].value = c; });
      otp[Math.min(d.length, 5)].focus();
    });
  });
  $('#v-submit').addEventListener('click', () => {
    const typed = otp.map(i => i.value).join('');
    if (typed.length < 6) { vErr.textContent = 'Escribe los 6 dígitos del código.'; otp.find(i => !i.value).focus(); return; }
    if (typed !== code) { vErr.textContent = 'El código no es correcto. Inténtalo de nuevo.'; otp.forEach(i => (i.value = '')); otp[0].focus(); return; }
    const users = getUsers();
    if (users.some(u => u.email === pending.email)) { vErr.textContent = 'Este correo ya está registrado.'; return; }
    users.push(pending);
    if (!write(USERS, JSON.stringify(users))) { vErr.textContent = 'No se pudo guardar: el almacenamiento del navegador está lleno o desactivado.'; return; }
    const email = pending.email;
    closeVerify(); reset(formUp); meter.dataset.level = 0; meterTxt.textContent = labels[0];
    toast('Cuenta creada', 'Ya puedes iniciar sesión con tu correo y contraseña.');
    $('#i-mail').value = email;
    setTimeout(() => go('in'), 700);
  });
  $('#v-resend').addEventListener('click', () => { newCode(); otp.forEach(i => (i.value = '')); vErr.textContent = ''; otp[0].focus(); toast('Código reenviado', `Enviamos un nuevo código a ${pending ? pending.email : 'tu correo'}.`, 'info'); });
  verify.addEventListener('click', e => { if (e.target === verify || e.target.closest('[data-vclose]')) closeVerify(); });

  /* ---------- Redes sociales ---------- */
  $$('[data-social]').forEach(b => b.addEventListener('click', () =>
    toast(`Continuar con ${b.dataset.social}`, 'Conecta aquí tu proveedor de autenticación.', 'info')));
  $$('[data-noop]').forEach(a => a.addEventListener('click', e => e.preventDefault()));

  /* ---------- Modal recuperar contraseña ---------- */
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
    if (!nextModal.hidden && e.key === 'Escape') { window.location.href = 'index.html'; return; }
    if (!verify.hidden && e.key === 'Escape') { closeVerify(); return; }
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