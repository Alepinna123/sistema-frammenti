/* breadcrumb.js — cronologia di navigazione della sessione (sessionStorage) */
(function () {
  'use strict';

  var BC_KEY     = 'sdf_breadcrumb';
  var BC_NAV_KEY = 'sdf_breadcrumb_nav';

  // ── Storage ────────────────────────────────────────────────────────────────
  function load() {
    try { return JSON.parse(sessionStorage.getItem(BC_KEY)) || []; }
    catch (e) { return []; }
  }

  function save(arr) {
    sessionStorage.setItem(BC_KEY, JSON.stringify(arr));
  }

  // ── Push frammento corrente ────────────────────────────────────────────────
  // Se arriviamo da un click sul breadcrumb, il BC è già troncato: non pushare.
  function push(fragId, fragTitle) {
    if (sessionStorage.getItem(BC_NAV_KEY) === 'true') {
      sessionStorage.removeItem(BC_NAV_KEY);
      return load();
    }
    var bc = load();
    if (bc.length > 0 && bc[bc.length - 1].id === fragId) return bc;
    bc.push({ id: fragId, title: fragTitle || '' });
    save(bc);
    return bc;
  }

  // ── Navigazione da breadcrumb: tronca e vai ────────────────────────────────
  function navigateTo(index) {
    var bc = load();
    if (index < 0 || index >= bc.length) return;
    var truncated = bc.slice(0, index + 1);
    save(truncated);
    sessionStorage.setItem(BC_NAV_KEY, 'true');
    window.location.href = truncated[index].id + '.html';
  }

  // ── Etichetta di un item ───────────────────────────────────────────────────
  function getLabel(item) {
    var fn = window.formatFragmentLabel || function (id) { return id; };
    return fn(item.id);
  }

  function escAttr(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Costruisce gli slot da renderizzare (max 5 visibili) ──────────────────
  function buildSlots(bc) {
    if (bc.length <= 5) {
      return bc.map(function (item, i) { return { type: 'item', item: item, index: i }; });
    }
    // primo + … + ultimi 3
    var lastStart = bc.length - 3;
    var hidden = bc.slice(1, lastStart);
    var slots = [{ type: 'item', item: bc[0], index: 0 }];
    if (hidden.length > 0) slots.push({ type: 'ellipsis', hidden: hidden });
    for (var i = lastStart; i < bc.length; i++) {
      slots.push({ type: 'item', item: bc[i], index: i });
    }
    return slots;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function render(bc, expanded) {
    var nav = document.getElementById('breadcrumb');
    if (!nav) return;

    if (bc.length <= 1) {
      nav.innerHTML = '';
      nav.hidden = true;
      return;
    }
    nav.hidden = false;

    var slots = expanded
      ? bc.map(function (item, i) { return { type: 'item', item: item, index: i }; })
      : buildSlots(bc);

    var lastIndex = bc.length - 1;
    var parts = [];

    slots.forEach(function (slot, pos) {
      if (pos > 0) parts.push('<span class="bc-sep" aria-hidden="true"> › </span>');

      if (slot.type === 'ellipsis') {
        var tooltip = escAttr(
          slot.hidden.map(function (h) { return h.title || getLabel(h); }).join(' › ')
        );
        parts.push(
          '<span class="bc-ellipsis" title="' + tooltip + '" tabindex="0" role="button"' +
          ' aria-label="Mostra passaggi intermedi">…</span>'
        );
      } else {
        var lbl = getLabel(slot.item);
        var tip = slot.item.title ? ' title="' + escAttr(slot.item.title) + '"' : '';
        if (slot.index === lastIndex) {
          parts.push('<span class="bc-current"' + tip + '>' + lbl + '</span>');
        } else {
          parts.push(
            '<span class="bc-item" data-bc-index="' + slot.index + '" tabindex="0" role="button"' + tip + '>' +
            lbl + '</span>'
          );
        }
      }
    });

    nav.innerHTML = parts.join('');

    nav.querySelectorAll('.bc-item').forEach(function (el) {
      var idx = +el.dataset.bcIndex;
      el.addEventListener('click', function () { navigateTo(idx); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo(idx); }
      });
    });

    var ell = nav.querySelector('.bc-ellipsis');
    if (ell) {
      ell.addEventListener('click', function () { render(bc, true); });
      ell.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); render(bc, true); }
      });
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  var fragId = window.FRAGMENT_ID;
  if (fragId) {
    var bc = push(fragId, window.FRAGMENT_TITLE || '');
    render(bc, false);
  }

  window.breadcrumbNavigateTo = navigateTo;
  window.breadcrumbLoad       = load;
}());
