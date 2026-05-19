/* extract-tags.js — estrazione tag dal commento (v1: simulata; v1.1: Claude API) */
(function () {
  'use strict';

  // v1: simulazione client-side
  // Legge i tag dal sistema e restituisce quelli che compaiono nel testo del commento.
  // Apre poi il modal di conferma.

  function extractTags(text, callback) {
    if (!window._systemData) {
      callback([]);
      return;
    }

    const allTags   = Object.keys(window._systemData.tags || {});
    const textLower = text.toLowerCase();

    // Tag che compaiono nel testo (match semplice per v1)
    const found = allTags.filter(t => textLower.includes(t.toLowerCase()));

    openModal(found, text, callback);
  }

  function openModal(suggestedTags, text, callback) {
    const modal    = document.getElementById('tagModal');
    const temTags  = document.getElementById('temTags');
    if (!modal || !temTags) { callback([]); return; }

    // Popola le chip
    const selected = new Set(suggestedTags);
    temTags.innerHTML = suggestedTags.map(t =>
      `<span class="tem-tag selected" data-tag="${esc(t)}">${esc(t)}</span>`
    ).join('');

    if (suggestedTags.length === 0) {
      temTags.innerHTML = '<em style="font-size:.85rem;color:var(--mid)">Nessun tag trovato nel testo.</em>';
    }

    // Toggle selezione chip
    temTags.querySelectorAll('.tem-tag').forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = chip.dataset.tag;
        chip.classList.toggle('selected');
        if (chip.classList.contains('selected')) selected.add(tag);
        else selected.delete(tag);
      });
    });

    modal.classList.add('active');

    window.confirmTags = function () {
      modal.classList.remove('active');
      callback(Array.from(selected));
    };
  }

  window.closeTagModal = function () {
    const modal = document.getElementById('tagModal');
    if (modal) modal.classList.remove('active');
  };

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  window.extractTags = extractTags;
}());
