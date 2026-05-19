/* viewer.js — lettura frammento: continua + concept-link popup */
(function () {
  'use strict';

  // Toggle tag di riassunto
  const tagsToggle = document.getElementById('tagsToggle');
  const tagsRow    = document.getElementById('tagsRow');
  if (tagsToggle && tagsRow) {
    tagsToggle.addEventListener('click', () => {
      const open = tagsToggle.getAttribute('aria-expanded') === 'true';
      tagsToggle.setAttribute('aria-expanded', !open);
      tagsToggle.querySelector('.tags-toggle-icon').textContent = open ? '+' : '−';
      tagsRow.hidden = open;
    });
  }

  fetch(window.SYSTEM_DATA || 'system.json')
    .then(r => r.json())
    .then(data => {
      window._systemData = data;
      populateContinua(data);
      initConceptLinks(data);
    })
    .catch(() => {});

  // ---------------------------------------------------------------------------
  // Continua a leggere
  // ---------------------------------------------------------------------------
  function populateContinua(data) {
    const fragId = window.FRAGMENT_ID;
    if (!fragId || !data.fragments) return;

    const current = data.fragments.find(f => f.id === fragId);
    if (!current) return;

    const related = data.fragments
      .filter(f => f.id !== fragId && f.tags.some(t => current.tags.includes(t)))
      .slice(0, 4);

    const grid = document.getElementById('continuaGrid');
    if (!grid || related.length === 0) {
      const continua = document.getElementById('continua');
      if (continua) continua.style.display = 'none';
      return;
    }

    grid.innerHTML = related.map(f => {
      const shared = f.tags.filter(t => current.tags.includes(t)).slice(0, 2).join(', ');
      return `<a class="continua-card" href="${f.file}">
        <div class="continua-card-meta">${f.tipo}${shared ? ' · ' + shared : ''}</div>
        <div class="continua-card-title">${f.title}</div>
        <div class="continua-card-cta">Leggi</div>
      </a>`;
    }).join('');
  }

  // ---------------------------------------------------------------------------
  // Concept-link: click → popup tendina con frammenti che condividono il tag
  // ---------------------------------------------------------------------------
  function initConceptLinks(data) {
    const popup   = document.getElementById('multidest');
    const mdName  = document.getElementById('mdName');
    const mdContent = document.getElementById('mdContent');
    const fragBody  = document.getElementById('fragmentBody');
    if (!popup || !fragBody) return;

    let activeEl = null;

    // Delegated listener sul corpo del frammento
    fragBody.addEventListener('click', e => {
      const el = e.target.closest('.concept-link');
      if (!el) return;
      e.stopPropagation();
      const tag = el.dataset.tag;
      if (!tag) return;
      openPopup(el, tag, data);
    });

    // Tastiera
    fragBody.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('concept-link')) {
        e.preventDefault();
        const tag = e.target.dataset.tag;
        if (tag) openPopup(e.target, tag, data);
      }
    });

    // Chiudi cliccando fuori
    document.addEventListener('click', () => closePopup());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePopup(); });

    function openPopup(el, tag, data) {
      const destinations = (data.tags[tag] || [])
        .map(id => data.fragments.find(f => f.id === id))
        .filter(Boolean);

      mdName.textContent = tag;
      mdContent.innerHTML = destinations.length
        ? destinations.map(f =>
            `<a class="md-dest" href="${f.file}" data-highlight="${tag}">
              <span class="md-dest-tipo">${f.tipo}</span>
              <span class="md-dest-title">${f.title}</span>
            </a>`).join('')
        : '<p class="md-empty">Nessun frammento associato.</p>';

      mdContent.querySelectorAll('.md-dest[data-highlight]').forEach(a => {
        a.addEventListener('click', () => {
          sessionStorage.setItem('sdf_highlight', a.dataset.highlight);
        });
      });

      popup.classList.add('visible');
      activeEl = el;
      positionPopup(el);
    }

    function closePopup() {
      if (!popup.classList.contains('visible')) return;
      popup.classList.remove('visible');
      if (activeEl) { activeEl = null; }
    }

    function positionPopup(el) {
      const rect = el.getBoundingClientRect();
      const vw   = window.innerWidth;
      const vh   = window.innerHeight;

      // Forza un reflow per avere offsetWidth reale
      popup.style.top  = '-9999px';
      popup.style.left = '0';

      const popW = popup.offsetWidth  || 340;
      const popH = popup.offsetHeight || 200;

      let top  = rect.bottom + 10;
      let left = rect.left;

      if (top + popH > vh - 8) top = rect.top - popH - 10;
      top  = Math.max(8, Math.min(top,  vh - popH - 8));
      left = Math.max(8, Math.min(left, vw - popW - 8));

      popup.style.top  = top  + 'px';
      popup.style.left = left + 'px';
    }
  }

  // ---------------------------------------------------------------------------
  // All'arrivo sulla pagina: se ?highlight=tag → scroll + highlight
  // ---------------------------------------------------------------------------
  const fragBody = document.getElementById('fragmentBody');
  (function highlightFromSession() {
    const tag = sessionStorage.getItem('sdf_highlight');
    if (!tag || !fragBody) return;
    sessionStorage.removeItem('sdf_highlight'); // consuma subito
    setTimeout(() => {
      const target = findConceptLink(fragBody, tag);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => litSpan(target), 700);
    }, 150);
  }());

  // ---------------------------------------------------------------------------
  // Click su tag-pill → scroll alla prima occorrenza nel corpo + highlight
  // ---------------------------------------------------------------------------
  document.querySelectorAll('.concept-tag-pill').forEach(pill => {
    pill.style.cursor = 'pointer';
    pill.addEventListener('click', () => {
      const tag = pill.dataset.tag;
      if (!tag || !fragBody) return;
      const target = findConceptLink(fragBody, tag);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => litSpan(target), 400);
    });
  });

  function findConceptLink(container, tag) {
    return Array.from(container.querySelectorAll('.concept-link'))
      .find(el => el.dataset.tag === tag) || null;
  }

  function litSpan(el) {
    el.classList.remove('lit');
    void el.offsetWidth;
    el.classList.add('lit');
    el.addEventListener('animationend', () => el.classList.remove('lit'), { once: true });
  }

}());
