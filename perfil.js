(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const KEY = 'bioeduca-profile', PASS = 'bioeduca-profile-pass', SESSION = 'bioeduca-session';
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const FIELDS = ['name', 'role', 'email', 'phone', 'org', 'bio'];
  const blank = () => ({ name: '', role: '', email: '', phone: '', org: '', bio: '', avatar: '', prefs: { notif: true, digest: false, forum: true } });

  /* ---------- Almacenamiento ---------- */
  const read = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (_) { return false; } };
  const load = () => {
    const base = blank();
    try {
      const d = JSON.parse(read(KEY) || 'null');
      if (d && typeof d === 'object') return { ...base, ...d, prefs: { ...base.prefs, ...(d.prefs || {}) } };
      const s = JSON.parse(read(SESSION) || 'null');
      if (s && typeof s === 'object') return { ...base, name: String(s.name || ''), email: String(s.email || '') };
    } catch (_) { /* datos corruptos: se parte en blanco */ }
    return base;
  };
  const persist = p => write(KEY, JSON.stringify(p));

  /* ---------- Estado ---------- */
  let saved = load();
  let avatarDraft = saved.avatar;

  /* ---------- Avisos ---------- */
  let toastTimer;
  const toast = (msg, type = 'ok') => {
    const t = $('#toast');
    t.textContent = msg; t.className = 'toast toast--' + type; t.hidden = false;
    requestAnimationFrame(() => t.classList.add('is-on'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.classList.remove('is-on'); setTimeout(() => (t.hidden = true), 300); }, 3600);
  };

  /* ---------- Avatar e iniciales ---------- */
  const initials = n => {
    const w = n.trim().split(/\s+/).filter(Boolean);
    return w.length ? (w[0][0] + (w[1] ? w[1][0] : '')).toUpperCase() : 'TÚ';
  };
  const paintAvatar = (box, url, name) => {
    const img = $('img', box), tx = $('span', box);
    if (url) { img.src = url; img.hidden = false; tx.hidden = true; }
    else { img.removeAttribute('src'); img.hidden = true; tx.hidden = false; tx.textContent = initials(name); }
  };
  const paintSide = () => {
    paintAvatar($('#av-main'), avatarDraft, saved.name);
    paintAvatar($('#av-chip'), saved.avatar, saved.name);
    $('#s-name').textContent = saved.name || 'Completa tu perfil';
    $('#s-role').textContent = saved.role;
    $('#s-org').textContent = saved.org;
    $('#chip-name').textContent = saved.name ? saved.name.split(/\s+/)[0] : 'Mi perfil';
    $('#av-rm').disabled = !avatarDraft;
  };

  /* ---------- Validación ---------- */
  const val = {
    name: v => v.trim().length >= 3 || 'Escribe tu nombre completo (mínimo 3 caracteres).',
    role: v => v.trim().length <= 60 || 'El cargo admite máximo 60 caracteres.',
    email: v => EMAIL.test(v.trim()) || 'Ingresa un correo válido, por ejemplo nombre@institucion.edu.mx.',
    phone: v => {
      const t = v.trim(); if (!t) return true;
      const d = t.replace(/\D/g, '').length;
      return (/^[+()\d\s-]+$/.test(t) && d >= 8 && d <= 15) || 'Teléfono no válido: usa de 8 a 15 dígitos, por ejemplo +52 81 0000 0000.';
    },
    org: v => v.trim().length <= 80 || 'La institución admite máximo 80 caracteres.',
    bio: v => v.length <= 280 || 'La biografía admite máximo 280 caracteres.'
  };
  const mark = (el, msg) => {
    const f = el.closest('.field');
    f.classList.toggle('is-invalid', !!msg);
    $('.err', f).textContent = msg || '';
    el.setAttribute('aria-invalid', String(!!msg));
    return !msg;
  };
  const inp = id => $('#f-' + id);
  const check = id => { const r = val[id](inp(id).value); return mark(inp(id), r === true ? '' : r); };

  /* ---------- Formulario de datos ---------- */
  const form = $('#f-datos'), bioCount = $('#bio-count');
  const isDirty = () => FIELDS.some(k => inp(k).value.trim() !== saved[k]) || avatarDraft !== saved.avatar;
  const refreshDirty = () => { $('#dirty').hidden = !isDirty(); };
  const fill = () => {
    FIELDS.forEach(k => { inp(k).value = saved[k]; mark(inp(k), ''); });
    avatarDraft = saved.avatar;
    bioCount.textContent = `${inp('bio').value.length}/${inp('bio').maxLength}`;
    $('#av-err').textContent = '';
    paintSide(); refreshDirty();
  };
  FIELDS.forEach(k => {
    const el = inp(k);
    el.addEventListener('input', () => {
      if (el.closest('.field').classList.contains('is-invalid')) check(k);
      if (k === 'bio') bioCount.textContent = `${el.value.length}/${el.maxLength}`;
      refreshDirty();
    });
    el.addEventListener('blur', () => check(k));
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const results = FIELDS.map(k => check(k));
    if (results.includes(false)) {
      const bad = $('.field.is-invalid input, .field.is-invalid textarea', form);
      if (bad) bad.focus();
      toast('Revisa los campos marcados en rojo.', 'err');
      return;
    }
    const next = { ...saved, avatar: avatarDraft };
    FIELDS.forEach(k => { next[k] = inp(k).value.trim(); });
    if (!persist(next)) { toast('No se pudo guardar: el almacenamiento del navegador está lleno o desactivado.', 'err'); return; }
    saved = next; fill();
    toast('Cambios guardados correctamente.');
  });
  $('#f-reset').addEventListener('click', () => {
    if (!isDirty()) { toast('No hay cambios por descartar.', 'info'); return; }
    fill(); toast('Cambios descartados. Se restauraron tus datos guardados.', 'info');
  });
  window.addEventListener('beforeunload', e => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- Foto de perfil ---------- */
  const square = file => new Promise((ok, no) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const s = 256, c = document.createElement('canvas'), x = c.getContext('2d'), m = Math.min(img.width, img.height);
      c.width = c.height = s;
      x.fillStyle = '#fff'; x.fillRect(0, 0, s, s);
      x.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => { URL.revokeObjectURL(url); no(new Error('imagen')); };
    img.src = url;
  });
  const avFile = $('#av-file'), avErr = $('#av-err');
  avFile.addEventListener('change', async () => {
    const f = avFile.files[0]; avFile.value = ''; avErr.textContent = '';
    if (!f) return;
    if (!['image/jpeg', 'image/png'].includes(f.type)) { avErr.textContent = 'Formato no válido. Usa una imagen JPG o PNG.'; return; }
    if (f.size > 2 * 1024 * 1024) { avErr.textContent = `La imagen pesa ${(f.size / 1048576).toFixed(1)} MB. El máximo es 2 MB.`; return; }
    try {
      avatarDraft = await square(f);
      paintSide(); refreshDirty();
      toast('Foto lista. Pulsa «Guardar cambios» para aplicarla.', 'info');
    } catch (_) { avErr.textContent = 'No se pudo leer la imagen. Prueba con otra.'; }
  });
  $('#av-rm').addEventListener('click', () => {
    avatarDraft = ''; avErr.textContent = '';
    paintSide(); refreshDirty();
    toast('Foto quitada. Pulsa «Guardar cambios» para aplicarlo.', 'info');
  });

  /* ---------- Pestañas ---------- */
  const tablist = $('[data-tabs]'), tabs = $$('.tab', tablist);
  const selectTab = tab => tabs.forEach(t => {
    const on = t === tab;
    t.classList.toggle('is-active', on); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
    $('#' + t.getAttribute('aria-controls')).hidden = !on;
  });
  tablist.addEventListener('click', e => { const t = e.target.closest('.tab'); if (t) selectTab(t); });
  tablist.addEventListener('keydown', e => {
    const i = tabs.indexOf(document.activeElement); if (i < 0) return;
    const k = e.key; let n = null;
    if (k === 'ArrowDown' || k === 'ArrowRight') n = (i + 1) % tabs.length;
    else if (k === 'ArrowUp' || k === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    else if (k === 'Home') n = 0; else if (k === 'End') n = tabs.length - 1;
    if (n === null) return;
    e.preventDefault(); tabs[n].focus(); selectTab(tabs[n]);
  });

  /* ---------- Contraseña ---------- */
  const pf = $('#f-pass'), pNow = $('#p-now'), pNew = $('#p-new'), pRep = $('#p-rep');
  const meter = $('.meter'), meterTxt = $('#meter-txt');
  const labels = ['Usa mayúsculas, números y símbolos.', 'Débil: agrega más caracteres y variedad.', 'Media: casi lista, añade un símbolo o más longitud.', 'Buena: un poco más y será excelente.', 'Fuerte: ¡excelente contraseña!'];
  const hash = async s => {
    try {
      if (window.crypto && crypto.subtle) {
        const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
        return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
      }
    } catch (_) { /* sin crypto.subtle */ }
    return 'b64:' + btoa(unescape(encodeURIComponent(s)));
  };
  const strength = v => {
    let s = 0;
    if (v.length >= 8) s++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
    if (/\d/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v) || v.length >= 14) s++;
    return v ? Math.max(s, 1) : 0;
  };
  const syncPassUI = () => {
    const has = !!read(PASS);
    $('#now-field').hidden = !has; $('#pass-note').hidden = has;
  };
  const resetPass = () => {
    pf.reset();
    [pNow, pNew, pRep].forEach(el => { mark(el, ''); el.type = 'password'; });
    $$('.eye', pf).forEach(b => { b.setAttribute('aria-label', 'Mostrar contraseña'); b.setAttribute('aria-pressed', 'false'); $('use', b).setAttribute('href', '#i-eye'); });
    meter.dataset.level = 0; meterTxt.textContent = labels[0];
  };
  $$('.eye', pf).forEach(b => b.addEventListener('click', () => {
    const i = $('input', b.parentElement), show = i.type === 'password';
    i.type = show ? 'text' : 'password';
    b.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
    b.setAttribute('aria-pressed', String(show));
    $('use', b).setAttribute('href', show ? '#i-eye-off' : '#i-eye');
    i.focus();
  }));
  pNew.addEventListener('input', () => {
    const s = strength(pNew.value); meter.dataset.level = s; meterTxt.textContent = labels[s];
    if (pRep.value) mark(pRep, pRep.value === pNew.value ? '' : 'Las contraseñas no coinciden.');
  });
  pRep.addEventListener('input', () => mark(pRep, pRep.value && pRep.value !== pNew.value ? 'Las contraseñas no coinciden.' : ''));
  pf.addEventListener('submit', async e => {
    e.preventDefault();
    const stored = read(PASS), n = pNew.value, oks = [];
    if (stored) {
      if (!pNow.value) oks.push(mark(pNow, 'Escribe tu contraseña actual.'));
      else if (await hash(pNow.value) !== stored) oks.push(mark(pNow, 'La contraseña actual no coincide.'));
      else oks.push(mark(pNow, ''));
    }
    if (n.length < 8 || !/[A-Za-z]/.test(n) || !/\d/.test(n)) oks.push(mark(pNew, 'Usa al menos 8 caracteres, con letras y números.'));
    else if (stored && n === pNow.value) oks.push(mark(pNew, 'La nueva contraseña debe ser distinta de la actual.'));
    else oks.push(mark(pNew, ''));
    if (!pRep.value) oks.push(mark(pRep, 'Confirma tu nueva contraseña.'));
    else oks.push(mark(pRep, pRep.value === n ? '' : 'Las contraseñas no coinciden.'));
    if (oks.includes(false)) {
      const bad = $('.field.is-invalid input', pf); if (bad) bad.focus();
      toast('Revisa los campos marcados en rojo.', 'err');
      return;
    }
    if (!write(PASS, await hash(n))) { toast('No se pudo guardar la contraseña en este navegador.', 'err'); return; }
    resetPass(); syncPassUI();
    toast('Contraseña actualizada correctamente.');
  });
  $('#pass-reset').addEventListener('click', resetPass);

  /* ---------- Preferencias ---------- */
  const pref = $('#f-pref');
  const fillPrefs = () => $$('input[data-pref]', pref).forEach(i => { i.checked = !!saved.prefs[i.dataset.pref]; });
  pref.addEventListener('submit', e => {
    e.preventDefault();
    const prefs = {};
    $$('input[data-pref]', pref).forEach(i => { prefs[i.dataset.pref] = i.checked; });
    const next = { ...saved, prefs };
    if (!persist(next)) { toast('No se pudo guardar: el almacenamiento del navegador está lleno o desactivado.', 'err'); return; }
    saved = next;
    toast('Preferencias guardadas.');
  });
  $('#pref-reset').addEventListener('click', () => { fillPrefs(); toast('Preferencias restablecidas a lo último guardado.', 'info'); });

  /* ---------- Arranque (al final, cuando todo está declarado) ---------- */
  fill(); fillPrefs(); syncPassUI();
})();