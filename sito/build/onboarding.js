/* onboarding.js — autenticazione e scelta registro al primo accesso */
(function () {
  'use strict';

  const el = document.getElementById('onboarding');
  if (!el) return;

  // Auto-login: se credenziali già salvate, salta la schermata
  if (window.profileIsLoggedIn && window.profileIsLoggedIn()) {
    el.classList.add('dismissed');
    return;
  }

  // ── Tab switching ─────────────────────────────────────────────────────────
  window.showAuthTab = function (tab) {
    ['reg', 'login'].forEach(t => {
      const btn   = document.getElementById('tab-' + t);
      const panel = document.getElementById('ob-panel-' + t);
      if (btn)   { btn.classList.toggle('active', t === tab); btn.setAttribute('aria-selected', String(t === tab)); }
      if (panel) { panel.hidden = t !== tab; }
    });
    // Reset errori
    const err = document.getElementById(tab === 'reg' ? 'reg-error' : 'login-error');
    if (err) err.textContent = '';
  };

  // ── Registro selezione ────────────────────────────────────────────────────
  let selectedRegistro = null;

  window.selectPersona = function (r) {
    document.querySelectorAll('.ob-card').forEach(c => c.classList.remove('selected'));
    const card = document.getElementById('ob-' + r);
    if (card) card.classList.add('selected');
    selectedRegistro = r;
    validateRegForm();
  };

  function validateRegForm() {
    const username = document.getElementById('regUsername')?.value.trim();
    const email    = document.getElementById('regEmail')?.value.trim();
    const password = document.getElementById('regPassword')?.value;
    const cta      = document.getElementById('obCta');
    if (!cta) return;
    cta.disabled = !(username && email && password && selectedRegistro);
  }

  // Validation live sui campi registrazione
  ['regUsername', 'regEmail', 'regPassword'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', validateRegForm);
  });

  // ── Registrazione ─────────────────────────────────────────────────────────
  window.submitRegister = function () {
    const username = document.getElementById('regUsername')?.value.trim();
    const email    = document.getElementById('regEmail')?.value.trim();
    const password = document.getElementById('regPassword')?.value;
    const errEl    = document.getElementById('reg-error');

    if (!username || !email || !password || !selectedRegistro) {
      if (errEl) errEl.textContent = 'Compila tutti i campi e scegli un registro.';
      return;
    }

    if (window.profileRegister) window.profileRegister(username, email, password, selectedRegistro);
    el.classList.add('dismissed');
  };

  // Enter su password registrazione
  document.getElementById('regPassword')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') window.submitRegister();
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  window.submitLogin = function () {
    const email    = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    const errEl    = document.getElementById('login-error');

    if (!email || !password) {
      if (errEl) errEl.textContent = 'Inserisci email e password.';
      return;
    }

    if (window.profileLogin && window.profileLogin(email, password)) {
      el.classList.add('dismissed');
    } else {
      if (errEl) errEl.textContent = 'Credenziali non riconosciute.';
    }
  };

  // Enter su password login
  document.getElementById('loginPassword')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') window.submitLogin();
  });

  // ── Salta ─────────────────────────────────────────────────────────────────
  window.dismissOnboarding = function () {
    el.classList.add('dismissed');
  };

  // ── Tastiera sulle card ───────────────────────────────────────────────────
  document.querySelectorAll('.ob-card').forEach(card => {
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.selectPersona(card.id.replace('ob-', ''));
      }
    });
  });

}());
