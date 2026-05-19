/* profile.js — profilo utente e autenticazione localStorage */
(function () {
  'use strict';

  const PROFILE_KEY = 'sdf_profile';
  const AUTH_KEY    = 'sdf_auth';

  // ── Auth ─────────────────────────────────────────────────────────────────
  function loadAuth() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || null; }
    catch { return null; }
  }
  function saveAuth(data) { localStorage.setItem(AUTH_KEY, JSON.stringify(data)); }

  function profileIsLoggedIn() { return loadAuth() !== null; }
  function profileGetUser()    { return loadAuth(); }

  function profileRegister(username, email, password, registro) {
    saveAuth({ username, email, password, registro });
    const p = load();
    p.registro = registro;
    save(p);
    updateDrawer();
  }

  function profileLogin(email, password) {
    const auth = loadAuth();
    if (!auth) return false;
    if (auth.email === email && auth.password === password) {
      const p = load();
      p.registro = auth.registro;
      save(p);
      updateDrawer();
      return true;
    }
    return false;
  }

  function profileLogout() {
    localStorage.removeItem(AUTH_KEY);
    const p = load();
    delete p.registro;
    save(p);
    location.reload();
  }

  // ── Profilo comportamentale ───────────────────────────────────────────────
  function load() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; }
    catch { return {}; }
  }
  function save(data) { localStorage.setItem(PROFILE_KEY, JSON.stringify(data)); }

  function markRead(id) {
    const p = load();
    if (!p.letti) p.letti = [];
    if (!p.letti.includes(id)) p.letti.push(id);
    save(p);
    updateDrawer();
  }

  function setRegistro(r) {
    const p = load();
    p.registro = r;
    save(p);
    updateDrawer();
  }

  function getRegistro() { return load().registro || null; }

  // ── Drawer ────────────────────────────────────────────────────────────────
  function updateDrawer() {
    const p    = load();
    const auth = loadAuth();

    const letti    = document.getElementById('drLetti');
    const tagEl    = document.getElementById('drTag');
    const commenti = document.getElementById('drCommenti');
    const persona  = document.getElementById('drPersona');
    const personaSub = document.getElementById('drPersonaSub');

    if (letti)    letti.textContent    = (p.letti    || []).length;
    if (tagEl)    tagEl.textContent    = (p.tag      || []).length;
    if (commenti) commenti.textContent = (p.commenti || []).length;

    if (persona) {
      if (auth) {
        persona.textContent = auth.username;
      } else {
        const reg = p.registro || null;
        persona.textContent = reg ? `— ${reg}` : '— visitatore';
      }
    }
    if (personaSub) {
      if (auth) {
        const regLabel = auth.registro === 'accademico'
          ? 'Lettore accademico — registro pieno.'
          : auth.registro === 'curioso'
            ? 'Lettore curioso — contributi max 500 parole.'
            : 'Visitatore — registro non scelto.';
        personaSub.textContent = regLabel;
      } else if (p.registro) {
        personaSub.textContent = p.registro === 'accademico'
          ? 'Registro pieno — nessun limite sui contributi.'
          : 'Registro discorsivo — contributi max 500 parole.';
      }
    }
  }

  // ── Export percorso ───────────────────────────────────────────────────────
  function profileExportPath() {
    const data = { profilo: load(), utente: loadAuth() ? { username: loadAuth().username, email: loadAuth().email } : null };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'percorso-sdf.json';
    a.click();
  }

  function profileCambiaRegistro() {
    const auth = loadAuth();
    const msg  = auth
      ? `Sei connesso come ${auth.username}. Vuoi uscire e tornare alla schermata di accesso?`
      : 'Vuoi cambiare registro?';
    if (confirm(msg)) profileLogout();
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  if (window.FRAGMENT_ID) markRead(window.FRAGMENT_ID);
  updateDrawer();

  // API globale
  window.profileIsLoggedIn     = profileIsLoggedIn;
  window.profileGetUser        = profileGetUser;
  window.profileRegister       = profileRegister;
  window.profileLogin          = profileLogin;
  window.profileLogout         = profileLogout;
  window.profileMarkRead       = markRead;
  window.profileSetRegistro    = setRegistro;
  window.profileGetRegistro    = getRegistro;
  window.profileExportPath     = profileExportPath;
  window.profileCambiaRegistro = profileCambiaRegistro;
  window.profileLoad           = load;
  window.profileSave           = save;
}());
