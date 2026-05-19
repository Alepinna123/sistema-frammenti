/* comment-page.js — carica un commento da localStorage e popola la pagina */
(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const cid    = params.get('cid');

  const titleEl  = document.getElementById('commentTitle');
  const bodyEl   = document.getElementById('fragmentBody');
  const backEl   = document.getElementById('commentBack');
  const tagsRow  = document.getElementById('tagsRow');
  const tagsToggle = document.getElementById('tagsToggle');
  const authorEl = document.getElementById('commentAuthorBlock');

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  if (!cid) {
    if (titleEl) titleEl.textContent = 'Commento non trovato.';
    return;
  }

  // Cerca il commento in tutti i bucket sdf_comments_*
  function findCommentById(id) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('sdf_comments_')) continue;
      try {
        const arr = JSON.parse(localStorage.getItem(key)) || [];
        const found = arr.find(c => c.id === id);
        if (found) return { comment: found, fragId: key.replace('sdf_comments_', '') };
      } catch {}
    }
    return null;
  }

  const result = findCommentById(cid);

  if (!result) {
    if (titleEl) titleEl.textContent = 'Commento non trovato.';
    if (bodyEl)  bodyEl.innerHTML = '<p>Il commento potrebbe essere stato eliminato o non è accessibile.</p>';
    return;
  }

  const { comment, fragId } = result;

  // Imposta FRAGMENT_ID per comments.js (sub-commenti su questo commento)
  window.FRAGMENT_ID = 'comment-' + cid;

  // Titolo pagina
  document.title = (comment.title || 'Commento') + ' — Sistema di frammenti';

  // Titolo h1
  if (titleEl) titleEl.textContent = comment.title || 'Senza titolo';

  // Link "torna al frammento"
  if (backEl) {
    backEl.href = fragId + '.html';
  }

  // Metadati autore/data
  if (authorEl) {
    const dateStr = new Date(comment.date).toLocaleDateString('it-IT', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    authorEl.innerHTML =
      `<span class="comment-attr-author">${escHtml(comment.author || 'Visitatore')}</span>` +
      `<span class="comment-attr-sep">·</span>` +
      `<span class="comment-attr-date">${dateStr}</span>`;
  }

  // Corpo del commento (testo libero → paragrafi)
  if (bodyEl && comment.text) {
    bodyEl.innerHTML = comment.text
      .split(/\n{2,}/)
      .filter(Boolean)
      .map(p => `<p>${escHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  // Tag pills
  if (tagsRow && comment.tags && comment.tags.length) {
    tagsRow.innerHTML = comment.tags.map(t =>
      `<span class="concept-tag-pill" role="listitem" data-tag="${escHtml(t)}">${escHtml(t)}</span>`
    ).join('\n');
    if (tagsToggle) tagsToggle.style.display = '';

    // Click su tag → naviga alla rete con il tag evidenziato
    tagsRow.querySelectorAll('.concept-tag-pill').forEach(pill => {
      pill.style.cursor = 'pointer';
      pill.addEventListener('click', () => {
        sessionStorage.setItem('sdf_highlight', pill.dataset.tag);
        window.location.href = 'index.html';
      });
    });
  }

}());
