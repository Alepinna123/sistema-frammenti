/* comments.js — tendina commenti con titolo obbligatorio e pagine dedicate */
(function () {
  'use strict';

  const fragId = window.FRAGMENT_ID;
  if (!fragId) return;

  const KEY = 'sdf_comments_' + fragId;

  function loadComments() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }

  function saveComments(arr) {
    localStorage.setItem(KEY, JSON.stringify(arr));
  }

  function genId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  // ── Rendering lista titoli (area scrollabile) ─────────────────────────────
  function renderComments() {
    const list  = document.getElementById('commentiList');
    const count = document.getElementById('commentiCount');
    if (!list) return;

    const all      = loadComments();
    const username = window.profileGetUser ? window.profileGetUser()?.username : null;
    const visible  = all.filter(c => !c.privato || c.author === username);

    if (count) count.textContent = visible.length;

    if (visible.length === 0) {
      list.innerHTML = '<p class="cd-empty">Ancora nessun commento.</p>';
      return;
    }

    list.innerHTML = visible.map(c => {
      const dateStr = new Date(c.date).toLocaleDateString('it-IT', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
      const isMine = c.author && c.author === username;
      return `
        <a class="cd-item${isMine ? ' mine' : ''}"
           href="comment.html?cid=${encodeURIComponent(c.id)}">
          <div class="cd-item-title">${escHtml(c.title || 'Senza titolo')}</div>
          <div class="cd-item-meta">
            <span class="cd-item-author">${escHtml(c.author || 'Visitatore')}</span>
            <span class="cd-item-date">${dateStr}</span>
            ${c.privato ? '<span class="cd-item-priv">Privato</span>' : ''}
          </div>
        </a>`;
    }).join('');
  }

  // ── Compose area (fissa in fondo al drawer) ───────────────────────────────
  function setupCompose() {
    const user     = window.profileGetUser ? window.profileGetUser() : null;
    const registro = window.profileGetRegistro ? window.profileGetRegistro() : null;
    const compose  = document.getElementById('composeArea');
    const guest    = document.getElementById('guestMsg');

    const canComment = user || registro;

    if (!canComment) {
      if (compose) compose.style.display = 'none';
      if (guest)   guest.style.display   = 'block';
      return;
    }

    const titleInput = document.getElementById('composeTitleInput');
    const textarea   = document.getElementById('composeText');
    const wordCount  = document.getElementById('wordCount');
    const cta        = document.getElementById('composeCta');
    const limit      = (user?.registro || registro) === 'curioso' ? 500 : Infinity;

    if (!titleInput || !textarea) return;

    function validate() {
      const hasTitle = titleInput.value.trim().length > 0;
      const words    = textarea.value.trim().split(/\s+/).filter(Boolean).length;
      const over     = words > limit;
      if (wordCount) {
        wordCount.textContent = over
          ? `${words} / ${limit} parole — limite superato`
          : `${words}${limit < Infinity ? ' / ' + limit : ''} parole`;
        wordCount.classList.toggle('over', over);
      }
      if (cta) cta.disabled = !hasTitle || words === 0 || over;
    }

    titleInput.addEventListener('input', validate);
    textarea.addEventListener('input', validate);

    if (cta) {
      cta.addEventListener('click', () => {
        const title = titleInput.value.trim();
        const text  = textarea.value.trim();
        const priv  = document.getElementById('privToggle')?.checked || false;
        if (!title || !text) return;

        if (window.extractTags) {
          window.extractTags(text, tags => publishComment(title, text, priv, tags));
        } else {
          publishComment(title, text, priv, []);
        }
      });
    }
  }

  // ── Pubblicazione ─────────────────────────────────────────────────────────
  function publishComment(title, text, privato, tags) {
    const user     = window.profileGetUser ? window.profileGetUser() : null;
    const author   = user?.username || 'Visitatore';
    const registro = user?.registro || (window.profileGetRegistro ? window.profileGetRegistro() : null);
    const id       = genId();

    const comments = loadComments();
    comments.push({ id, title, text, privato, author, registro, date: Date.now(), tags });
    saveComments(comments);

    if (tags.length && window.profileLoad && window.profileSave) {
      const p = window.profileLoad();
      if (!p.tag) p.tag = [];
      tags.forEach(t => { if (!p.tag.includes(t)) p.tag.push(t); });
      if (!p.commenti) p.commenti = [];
      p.commenti.push({ fragId, date: Date.now(), tags });
      window.profileSave(p);
    }

    const titleInput = document.getElementById('composeTitleInput');
    const textarea   = document.getElementById('composeText');
    const wordCount  = document.getElementById('wordCount');
    const cta        = document.getElementById('composeCta');
    if (titleInput) titleInput.value = '';
    if (textarea)   textarea.value   = '';
    if (wordCount)  wordCount.textContent = '0 parole';
    if (cta)        cta.disabled = true;

    renderComments();
  }

  // ── Drawer toggle ─────────────────────────────────────────────────────────
  function setupDrawer() {
    const drawer  = document.getElementById('commentsDrawer');
    const toggle  = document.getElementById('cdToggle');
    const openBtn = document.getElementById('cdOpenBtn');

    if (!drawer || !toggle) return;

    toggle.addEventListener('click', () => {
      drawer.classList.remove('open');
      if (openBtn) openBtn.hidden = false;
    });

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        drawer.classList.add('open');
        openBtn.hidden = true;
      });
    }
  }

  // ── Utility ───────────────────────────────────────────────────────────────
  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  renderComments();
  setupCompose();
  setupDrawer();

}());
