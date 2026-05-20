/* viewer.js — lettura frammento: blocchi A/B + concept-link popup */
(function () {
  'use strict';

  // ── Toggle tag di riassunto ────────────────────────────────────────────────
  var tagsToggle = document.getElementById('tagsToggle');
  var tagsRow    = document.getElementById('tagsRow');
  if (tagsToggle && tagsRow) {
    tagsToggle.addEventListener('click', function () {
      var open = tagsToggle.getAttribute('aria-expanded') === 'true';
      tagsToggle.setAttribute('aria-expanded', String(!open));
      tagsToggle.querySelector('.tags-toggle-icon').textContent = open ? '+' : '−';
      tagsRow.hidden = open;
    });
  }

  fetch(window.SYSTEM_DATA || 'system.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      window._systemData = data;
      populateBlocks(data);
      initConceptLinks(data);
      updateExploredTags(data);
      if (window.updateDrawerLists) window.updateDrawerLists(data);
    })
    .catch(function () {});

  // ── Utility HTML escape ───────────────────────────────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fragLabel(id) {
    return window.formatFragmentLabel ? window.formatFragmentLabel(id) : id;
  }

  // ── Soglie subordinate di un frammento ────────────────────────────────────
  //   pozzo pX → tutte le soglie sX-*
  //   soglia sX-Y (base, senza lettera) → sub-soglie sX-Y-L e sX-YL
  //   soglia foglia (sX-YL) → nessuna
  function getSubordinates(fragId, allFragments) {
    var pozzoM = fragId.match(/^p(\d+)$/);
    if (pozzoM) {
      var px = pozzoM[1];
      var re = new RegExp('^s' + px + '-');
      return allFragments.filter(function (f) { return re.test(f.id); });
    }
    var sogliaM = fragId.match(/^s(\d+)-(\d+)$/);
    if (sogliaM) {
      var sx = sogliaM[1], sy = sogliaM[2];
      var reDash   = new RegExp('^s' + sx + '-' + sy + '-[a-z]$');
      var reAttach = new RegExp('^s' + sx + '-' + sy + '[a-z]$');
      return allFragments.filter(function (f) {
        return reDash.test(f.id) || reAttach.test(f.id);
      });
    }
    return [];
  }

  // ── Frammenti correlati per tag, escludendo il breadcrumb di sessione ─────
  function getRelated(fragId, allFragments, currentTags) {
    var bcIds = {};
    if (window.breadcrumbLoad) {
      window.breadcrumbLoad().forEach(function (item) { bcIds[item.id] = true; });
    }

    return allFragments
      .filter(function (f) { return f.id !== fragId && !bcIds[f.id]; })
      .map(function (f) {
        var shared = f.tags.filter(function (t) { return currentTags.indexOf(t) !== -1; }).length;
        return { id: f.id, tipo: f.tipo, title: f.title, tags: f.tags, file: f.file, shared: shared };
      })
      .filter(function (f) { return f.shared > 0; })
      .sort(function (a, b) {
        return b.shared - a.shared || b.tags.length - a.tags.length;
      })
      .slice(0, 3);
  }

  // ── Card HTML con identificatore strutturato sopra il titolo ──────────────
  function makeCard(frag) {
    return '<a class="continua-card" href="' + frag.file + '">'
      + '<div class="continua-card-meta">' + escHtml(fragLabel(frag.id)) + '</div>'
      + '<div class="continua-card-title">' + escHtml(frag.title) + '</div>'
      + '<div class="continua-card-cta">apri il frammento</div>'
      + '</a>';
  }

  // ── Blocco A (subordinate) e Blocco B (correlati per tag) ─────────────────
  function populateBlocks(data) {
    var fragId = window.FRAGMENT_ID;
    if (!fragId || !data.fragments) return;

    var current = null;
    data.fragments.forEach(function (f) { if (f.id === fragId) current = f; });
    if (!current) return;

    // Blocco A
    var blockA = document.getElementById('continuaA');
    var gridA  = document.getElementById('continuaGridA');
    if (blockA && gridA) {
      var subs = getSubordinates(fragId, data.fragments);
      if (subs.length > 0) {
        gridA.innerHTML = subs.map(makeCard).join('');
        blockA.hidden = false;
      }
    }

    // Blocco B
    var blockB = document.getElementById('continuaB');
    var gridB  = document.getElementById('continuaGridB');
    if (blockB && gridB) {
      var related = getRelated(fragId, data.fragments, current.tags);
      if (related.length > 0) {
        gridB.innerHTML = related.map(makeCard).join('');
        blockB.hidden = false;
      }
    }
  }

  // ── Aggiorna tag esplorati nel profilo (arricchisce dopo system.json) ─────
  function updateExploredTags(data) {
    var fragId = window.FRAGMENT_ID;
    if (!fragId || !window.profileLoad || !window.profileSave) return;

    var frag = null;
    (data.fragments || []).forEach(function (f) { if (f.id === fragId) frag = f; });
    if (!frag) return;

    var p = window.profileLoad();
    if (!p.tagEsplorati) p.tagEsplorati = [];
    frag.tags.forEach(function (tag) {
      if (p.tagEsplorati.indexOf(tag) === -1) p.tagEsplorati.push(tag);
    });
    window.profileSave(p);
  }

  // ── Concept-link popup ────────────────────────────────────────────────────
  function initConceptLinks(data) {
    var popup    = document.getElementById('multidest');
    var mdName   = document.getElementById('mdName');
    var mdContent = document.getElementById('mdContent');
    var fragBody  = document.getElementById('fragmentBody');
    if (!popup || !fragBody) return;

    var activeEl = null;

    fragBody.addEventListener('click', function (e) {
      var el = e.target.closest('.concept-link');
      if (!el) return;
      e.stopPropagation();
      var tag = el.dataset.tag;
      if (tag) openPopup(el, tag);
    });

    fragBody.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('concept-link')) {
        e.preventDefault();
        var tag = e.target.dataset.tag;
        if (tag) openPopup(e.target, tag);
      }
    });

    document.addEventListener('click', function () { closePopup(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePopup(); });

    function openPopup(el, tag) {
      var destinations = (data.tags[tag] || [])
        .map(function (id) {
          var found = null;
          data.fragments.forEach(function (f) { if (f.id === id) found = f; });
          return found;
        })
        .filter(Boolean);

      mdName.textContent = tag;
      mdContent.innerHTML = destinations.length
        ? destinations.map(function (f) {
            return '<a class="md-dest" href="' + f.file + '" data-highlight="' + escHtml(tag) + '">'
              + '<span class="md-dest-tipo">' + escHtml(fragLabel(f.id)) + '</span>'
              + '<span class="md-dest-title">' + escHtml(f.title) + '</span>'
              + '</a>';
          }).join('')
        : '<p class="md-empty">Nessun frammento associato.</p>';

      mdContent.querySelectorAll('.md-dest[data-highlight]').forEach(function (a) {
        a.addEventListener('click', function () {
          sessionStorage.setItem('sdf_highlight', a.dataset.highlight);
        });
      });

      popup.classList.add('visible');
      activeEl = el;
      if (el) {
        positionPopup(el);
      } else {
        centerPopup();
      }
    }

    function closePopup() {
      if (!popup.classList.contains('visible')) return;
      popup.classList.remove('visible');
      activeEl = null;
    }

    function positionPopup(el) {
      var rect = el.getBoundingClientRect();
      var vw = window.innerWidth, vh = window.innerHeight;
      popup.style.top  = '-9999px';
      popup.style.left = '0';
      var popW = popup.offsetWidth  || 340;
      var popH = popup.offsetHeight || 200;
      var top  = rect.bottom + 10;
      var left = rect.left;
      if (top + popH > vh - 8) top = rect.top - popH - 10;
      top  = Math.max(8, Math.min(top,  vh - popH - 8));
      left = Math.max(8, Math.min(left, vw - popW - 8));
      popup.style.top  = top  + 'px';
      popup.style.left = left + 'px';
    }

    function centerPopup() {
      popup.style.top  = '-9999px';
      popup.style.left = '0';
      var popW = popup.offsetWidth  || 340;
      var popH = popup.offsetHeight || 200;
      popup.style.top  = ((window.innerHeight - popH) / 2) + 'px';
      popup.style.left = ((window.innerWidth  - popW) / 2) + 'px';
    }

    // Esponi per uso dal drawer ("Tag esplorati")
    window.openTagPopup = function (tag) { openPopup(null, tag); };
  }

  // ── Highlight da sessione ─────────────────────────────────────────────────
  var fragBody = document.getElementById('fragmentBody');
  (function highlightFromSession() {
    var tag = sessionStorage.getItem('sdf_highlight');
    if (!tag || !fragBody) return;
    sessionStorage.removeItem('sdf_highlight');
    setTimeout(function () {
      var target = findConceptLink(fragBody, tag);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function () { litSpan(target); }, 700);
    }, 150);
  }());

  // ── Click su tag-pill → scroll + highlight ────────────────────────────────
  document.querySelectorAll('.concept-tag-pill').forEach(function (pill) {
    pill.style.cursor = 'pointer';
    pill.addEventListener('click', function () {
      var tag = pill.dataset.tag;
      if (!tag || !fragBody) return;
      var target = findConceptLink(fragBody, tag);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function () { litSpan(target); }, 400);
    });
  });

  function findConceptLink(container, tag) {
    var links = Array.from(container.querySelectorAll('.concept-link'));
    for (var i = 0; i < links.length; i++) {
      if (links[i].dataset.tag === tag) return links[i];
    }
    return null;
  }

  function litSpan(el) {
    el.classList.remove('lit');
    void el.offsetWidth;
    el.classList.add('lit');
    el.addEventListener('animationend', function () { el.classList.remove('lit'); }, { once: true });
  }

}());
