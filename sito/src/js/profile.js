/* profile.js — profilo utente e autenticazione localStorage */
(function () {
  'use strict';

  var PROFILE_KEY = 'sdf_profile';
  var AUTH_KEY    = 'sdf_auth';

  // ── Auth ─────────────────────────────────────────────────────────────────
  function loadAuth() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || null; }
    catch (e) { return null; }
  }
  function saveAuth(data) { localStorage.setItem(AUTH_KEY, JSON.stringify(data)); }

  function profileIsLoggedIn() { return loadAuth() !== null; }
  function profileGetUser()    { return loadAuth(); }

  function profileRegister(username, email, password, registro) {
    saveAuth({ username: username, email: email, password: password, registro: registro });
    var p = load();
    p.registro = registro;
    save(p);
    updateDrawer();
  }

  function profileLogin(email, password) {
    var auth = loadAuth();
    if (!auth) return false;
    if (auth.email === email && auth.password === password) {
      var p = load();
      p.registro = auth.registro;
      save(p);
      updateDrawer();
      return true;
    }
    return false;
  }

  function profileLogout() {
    localStorage.removeItem(AUTH_KEY);
    var p = load();
    delete p.registro;
    save(p);
    location.reload();
  }

  // ── Profilo comportamentale ───────────────────────────────────────────────
  function load() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function save(data) { localStorage.setItem(PROFILE_KEY, JSON.stringify(data)); }

  function markRead(id) {
    var p = load();
    if (!p.letti) p.letti = [];
    if (p.letti.indexOf(id) === -1) p.letti.push(id);

    // Traccia tag esplorati dal frammento corrente (disponibili via window.FRAGMENT_TAGS)
    if (!p.tagEsplorati) p.tagEsplorati = [];
    var fragTags = window.FRAGMENT_TAGS || [];
    fragTags.forEach(function (tag) {
      if (p.tagEsplorati.indexOf(tag) === -1) p.tagEsplorati.push(tag);
    });

    save(p);
    updateDrawer();
  }

  function setRegistro(r) {
    var p = load();
    p.registro = r;
    save(p);
    updateDrawer();
  }

  function getRegistro() { return load().registro || null; }

  // ── Drawer ────────────────────────────────────────────────────────────────
  function updateDrawer() {
    var p    = load();
    var auth = loadAuth();

    var commenti = document.getElementById('drCommenti');
    if (commenti) commenti.textContent = (p.commenti || []).length;

    renderLettiList(p, null);
    renderTagList(p);

    var persona    = document.getElementById('drPersona');
    var personaSub = document.getElementById('drPersonaSub');

    if (persona) {
      persona.textContent = auth
        ? auth.username
        : (p.registro ? '— ' + p.registro : '— visitatore');
    }
    if (personaSub) {
      if (auth) {
        personaSub.textContent = auth.registro === 'accademico'
          ? 'Lettore accademico — registro pieno.'
          : auth.registro === 'curioso'
            ? 'Lettore curioso — contributi max 500 parole.'
            : 'Visitatore — registro non scelto.';
      } else if (p.registro) {
        personaSub.textContent = p.registro === 'accademico'
          ? 'Registro pieno — nessun limite sui contributi.'
          : 'Registro discorsivo — contributi max 500 parole.';
      }
    }
  }

  // ── Lista frammenti letti ─────────────────────────────────────────────────
  function renderLettiList(p, systemData) {
    var listEl  = document.getElementById('drLettiList');
    var moreBtn = document.getElementById('drLettiMore');
    if (!listEl) return;

    var letti = (p.letti || []).slice().reverse(); // cronologico inverso

    if (letti.length === 0) {
      listEl.innerHTML = '<p class="dr-empty">Nessun frammento ancora letto.</p>';
      if (moreBtn) moreBtn.hidden = true;
      return;
    }

    var SHOW     = 3;
    var expanded = listEl.dataset.expanded === 'true';
    var showing  = expanded ? letti : letti.slice(0, SHOW);

    listEl.innerHTML = showing.map(function (id) {
      var lbl  = window.formatFragmentLabel ? window.formatFragmentLabel(id) : id;
      var meta = systemData
        ? (systemData.fragments || []).filter(function (f) { return f.id === id; })[0] || null
        : null;
      var title = meta ? meta.title : '';
      return '<div class="dr-frag-item" data-frag-id="' + id + '" role="button" tabindex="0">'
        + '<div class="dr-frag-label">' + lbl + '</div>'
        + (title ? '<div class="dr-frag-title">' + title + '</div>' : '')
        + '</div>';
    }).join('');

    listEl.querySelectorAll('.dr-frag-item').forEach(function (el) {
      el.addEventListener('click', function () {
        window.location.href = el.dataset.fragId + '.html';
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.location.href = el.dataset.fragId + '.html';
        }
      });
    });

    if (moreBtn) {
      if (letti.length > SHOW) {
        moreBtn.hidden = false;
        moreBtn.textContent = expanded
          ? 'Mostra meno'
          : 'Vedi tutti (' + letti.length + ')';
        moreBtn.onclick = function () {
          listEl.dataset.expanded = expanded ? 'false' : 'true';
          renderLettiList(p, systemData);
        };
      } else {
        moreBtn.hidden = true;
      }
    }
  }

  // ── Lista tag esplorati ───────────────────────────────────────────────────
  function renderTagList(p) {
    var listEl  = document.getElementById('drTagList');
    var moreBtn = document.getElementById('drTagMore');
    if (!listEl) return;

    var tags = (p.tagEsplorati || []).slice().reverse();

    if (tags.length === 0) {
      listEl.innerHTML = '<p class="dr-empty">Nessun tag ancora esplorato.</p>';
      if (moreBtn) moreBtn.hidden = true;
      return;
    }

    var SHOW     = 3;
    var expanded = listEl.dataset.expanded === 'true';
    var showing  = expanded ? tags : tags.slice(0, SHOW);

    listEl.innerHTML = showing.map(function (tag) {
      return '<span class="dr-tag-pill" data-tag="' + tag + '" role="button" tabindex="0">' + tag + '</span>';
    }).join('');

    listEl.querySelectorAll('.dr-tag-pill').forEach(function (pill) {
      pill.addEventListener('click', function () { openTagFromDrawer(pill.dataset.tag); });
      pill.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTagFromDrawer(pill.dataset.tag); }
      });
    });

    if (moreBtn) {
      if (tags.length > SHOW) {
        moreBtn.hidden = false;
        moreBtn.textContent = expanded
          ? 'Mostra meno'
          : 'Vedi tutti (' + tags.length + ')';
        moreBtn.onclick = function () {
          listEl.dataset.expanded = expanded ? 'false' : 'true';
          renderTagList(p);
        };
      } else {
        moreBtn.hidden = true;
      }
    }
  }

  function openTagFromDrawer(tag) {
    if (window.openTagPopup) {
      window.openTagPopup(tag);
      var drawer = document.getElementById('drawer');
      if (drawer) drawer.classList.remove('open');
    } else {
      // Fallback: rete con tag pre-selezionato
      window.location.href = 'index.html?tag=' + encodeURIComponent(tag);
    }
  }

  // Chiamata da viewer.js dopo il caricamento di system.json
  function updateDrawerLists(systemData) {
    var p = load();
    renderLettiList(p, systemData);
    renderTagList(p);
  }

  // ── Export percorso ───────────────────────────────────────────────────────
  function profileExportPath() {
    var auth = loadAuth();
    var data = {
      profilo: load(),
      utente:  auth ? { username: auth.username, email: auth.email } : null
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'percorso-sdf.json';
    a.click();
  }

  function profileCambiaRegistro() {
    var auth = loadAuth();
    var msg  = auth
      ? 'Sei connesso come ' + auth.username + '. Vuoi uscire e tornare alla schermata di accesso?'
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
  window.updateDrawerLists     = updateDrawerLists;
}());
