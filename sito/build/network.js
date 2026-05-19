/* network.js — Rete SVG dei tag
   Quattro visualizzazioni: scale-free · reticolo · mandala · spirale aurea
   Zoom multi-livello con etichette emergenti, drift orbitale per-nodo, transizioni fluide.
*/
(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────
  const MAX_NODES = 150;
  const MIN_COOC  = 3;

  const Z_L0 =  1.0;
  const Z_L1 =  1.55;
  const Z_L2 =  2.4;
  const HUB_ALWAYS =  6;
  const L1_LABELS  = 20;
  const L2_LABELS  = 80;

  const GOLD = ['#e8e0d4', '#dfcfa8', '#d4be88', '#caa860', '#b8862a', '#d4a84a'];

  // ── Stato globale ────────────────────────────────────────────────────────
  let nodes = [], edges = [];
  let layouts = {};
  let curLayout = 'sf';
  let anim = null;          // { from[], to[], t }
  let basePos = [];         // posizioni logiche correnti (senza drift)
  let driftPhases = [];     // { px, py, ax, ay } per nodo
  let rotOffsetSP  = 0;     // orientazione spirale (salvata da computeLayouts per SP animation)
  let frameCount   = 0;    // contatore frame, per aggiornamenti throttled
  let scale = 1, tx = 0, ty = 0;
  let driftT = 0;
  let isDragging = false, dragX = 0, dragY = 0;
  let W, H, cx, cy;
  let svgEl, nodesG, edgesG;
  let nodeEls = [], edgeEls = [];

  // ── Bootstrap ────────────────────────────────────────────────────────────
  fetch(window.SYSTEM_DATA || 'system.json')
    .then(r => r.json())
    .then(data => { window._systemData = data; init(data); })
    .catch(e => console.warn('network.js: impossibile caricare system.json', e));

  function init(data) {
    svgEl  = document.getElementById('reteSvg');
    nodesG = document.getElementById('nodesGroup');
    edgesG = document.getElementById('edgesGroup');
    if (!svgEl || !nodesG) return;

    resize();
    buildGraph(data);
    computeLayouts();
    createElement();
    applyLayout('sf', false);
    updateLabels();
    setupInteractions();
    requestAnimationFrame(loop);
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    cx = W / 2;
    cy = H / 2;
  }

  // ── Grafo ────────────────────────────────────────────────────────────────
  function buildGraph(data) {
    const HUB_PINNED   = 30;
    const TARGET_TOTAL = MAX_NODES;

    const allSorted = Object.entries(data.tags || {})
      .map(([id, frags]) => ({ id, degree: frags.length, frags }))
      .sort((a, b) => b.degree - a.degree);

    const pinned    = allSorted.slice(0, HUB_PINNED);
    const remaining = allSorted.slice(HUB_PINNED);

    // Fisher-Yates shuffle della periferia — diversa a ogni refresh
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    nodes = [...pinned, ...remaining.slice(0, TARGET_TOTAL - HUB_PINNED)]
      .map((n, rank) => ({
        ...n,
        rank,
        size:  nodeSize(n.degree),
        color: nodeColor(n.degree),
      }));

    const idx = {};
    nodes.forEach((n, i) => { idx[n.id] = i; });

    const edgeMap = {};
    (data.fragments || []).forEach(frag => {
      const ft = frag.tags.filter(t => idx[t] !== undefined);
      for (let a = 0; a < ft.length - 1; a++) {
        for (let b = a + 1; b < ft.length; b++) {
          const ia = idx[ft[a]], ib = idx[ft[b]];
          const key = Math.min(ia, ib) + '_' + Math.max(ia, ib);
          edgeMap[key] = (edgeMap[key] || 0) + 1;
        }
      }
    });

    edges = Object.entries(edgeMap)
      .filter(([, w]) => w >= MIN_COOC)
      .map(([key, weight]) => {
        const [a, b] = key.split('_').map(Number);
        return { a, b, weight };
      });

    // Fasi drift deterministiche per ogni nodo (angolo aureo come offset)
    const PHI = 2.399963229728653;
    driftPhases = nodes.map((_, i) => ({
      px: i * PHI,
      py: i * PHI * 0.71,
      ax: 1.0 + (i % 3) * 0.35,   // ampiezza x: 1.0 – 1.7 px
      ay: 0.65 + (i % 5) * 0.12,  // ampiezza y: 0.65 – 1.1 px
    }));
  }

  function nodeSize(degree) {
    return Math.min(3.5 + Math.pow(degree, 0.62) * 2.1, 24);
  }

  function nodeColor(degree) {
    const i = degree <= 1 ? 0
            : degree <= 3  ? 1
            : degree <= 6  ? 2
            : degree <= 11 ? 3
            : degree <= 20 ? 4 : 5;
    return GOLD[i];
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  function computeLayouts() {
    const n = nodes.length;

    // 1. Scale-free: anelli concentrici per grado (nucleo denso + corona rarefatta)
    const SF_MAX_R = Math.min(W, H) * 0.44;
    const sfBands = [
      { minDeg: 6, rMin:   0, rMax:  90 },
      { minDeg: 3, rMin: 110, rMax: 230 },
      { minDeg: 2, rMin: 260, rMax: 380 },
      { minDeg: 0, rMin: 410, rMax: SF_MAX_R },
    ];
    layouts.sf = (() => {
      const placed  = [];
      const MIN_GAP = 5;
      const MAX_TRY = 60;

      return nodes.map(node => {
        const band = sfBands.find(b => node.degree >= b.minDeg);
        const rMax = Math.min(band.rMax, SF_MAX_R);

        let best = null, bestGap = -Infinity;
        for (let k = 0; k < MAX_TRY; k++) {
          const r     = band.rMin + Math.random() * (rMax - band.rMin);
          const angle = Math.random() * 2 * Math.PI;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);

          let gap = Infinity;
          for (const { px, py, sz } of placed) {
            const d = Math.sqrt((x - px) ** 2 + (y - py) ** 2) - sz - node.size;
            if (d < gap) gap = d;
          }

          if (gap >= MIN_GAP) { best = { x, y }; break; }
          if (gap > bestGap)  { bestGap = gap; best = { x, y }; }
        }

        placed.push({ px: best.x, py: best.y, sz: node.size });
        return best;
      });
    })();

    // 2. Reticolo
    const cols = Math.ceil(Math.sqrt(n * (W / H)));
    const rows = Math.ceil(n / cols);
    const gw   = (W * 0.85) / cols;
    const gh   = (H * 0.85) / rows;
    const ox   = (W - gw * cols) / 2;
    const oy   = (H - gh * rows) / 2;
    layouts.rt = nodes.map((_, i) => ({
      x: ox + (i % cols) * gw + gw / 2,
      y: oy + Math.floor(i / cols) * gh + gh / 2,
    }));

    // 3. Mandala: rosetta a 12 raggi simmetrici fissi, rotazione casuale a refresh
    {
      const RAYS        = 12;
      const minR_md     = 60;
      const maxR_md     = Math.min(W, H) * 0.46;
      const rotOffset   = Math.random() * 2 * Math.PI;
      const ringsPerRay = Math.ceil(n / RAYS);

      layouts.md = nodes.map((_, i) => {
        const ray   = i % RAYS;
        const ring  = Math.floor(i / RAYS);
        const angle = rotOffset + (ray / RAYS) * 2 * Math.PI;
        const r     = minR_md + ((ring + 0.5) / ringsPerRay) * (maxR_md - minR_md);
        return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
      });
    }

    // 4. Spirale di Archimede a singolo braccio
    {
      const minR_sp      = 20;
      const maxR_sp      = Math.min(W, H) * 0.46;
      const turns        = 4.5;
      rotOffsetSP = Math.random() * 2 * Math.PI;
      layouts.sp = nodes.map((_, i) => {
        const t     = n > 1 ? i / (n - 1) : 0;
        const theta = rotOffsetSP + t * turns * 2 * Math.PI;
        const r     = minR_sp + t * (maxR_sp - minR_sp);
        return { x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) };
      });
    }
  }

  // ── Elementi SVG ─────────────────────────────────────────────────────────
  function createElement() {
    edgeEls = edges.map(e => {
      const line = svgEl.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', 'tag-edge');
      edgesG.appendChild(line);
      return line;
    });

    nodeEls = nodes.map((node, i) => {
      const g = svgEl.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'tag-node');
      g.setAttribute('data-tag', node.id);
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', node.id + ' — ' + node.degree + ' frammento/i');
      if (i < 60) g.setAttribute('tabindex', '0');

      const circle = svgEl.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r',    node.size);
      circle.setAttribute('fill', node.color);
      circle.setAttribute('stroke', 'rgba(184,134,42,.3)');
      circle.setAttribute('stroke-width', '0.8');

      const text = svgEl.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', 'tag-label');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', labelSize(node.degree));
      text.setAttribute('dy', -(node.size + 4) + 'px');
      text.textContent = node.id.length > 30 ? node.id.slice(0, 28) + '…' : node.id;

      g.appendChild(circle);
      g.appendChild(text);
      nodesG.appendChild(g);

      g.addEventListener('click',      e => { e.stopPropagation(); onNodeClick(node, g); });
      g.addEventListener('mouseenter', () => onNodeEnter(i));
      g.addEventListener('mouseleave', () => onNodeLeave());
      g.addEventListener('keydown',    e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNodeClick(node, g); }
      });

      return { g, circle, text };
    });
  }

  function labelSize(degree) {
    return Math.max(9, Math.min(14, 9 + Math.log2(degree + 1)));
  }

  // ── Layout application ───────────────────────────────────────────────────
  function applyLayout(id, animate) {
    if (!layouts[id]) return;
    clearAnimationStates();
    curLayout = id;

    const idMap = { sf: 'viz-sf', rt: 'viz-rt', md: 'viz-md', sp: 'viz-sp' };
    document.querySelectorAll('.viz-btn').forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    });
    const btn = document.getElementById(idMap[id]);
    if (btn) { btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); }

    if (!animate) {
      basePos = layouts[id].slice();
      renderVisual(basePos);
      anim = null;
    } else {
      anim = {
        from: basePos.length === nodes.length ? basePos.slice() : layouts[id].slice(),
        to:   layouts[id],
        t:    0,
      };
    }
  }

  // ── Rendering ─────────────────────────────────────────────────────────────
  function renderVisual(pos) {
    nodeEls.forEach(({ circle, text }, i) => {
      const p = pos[i]; if (!p) return;
      circle.setAttribute('cx', p.x);
      circle.setAttribute('cy', p.y);
      text.setAttribute('x', p.x);
      text.setAttribute('y', p.y);
    });
    edgeEls.forEach((line, i) => {
      const e = edges[i];
      const pa = pos[e.a], pb = pos[e.b];
      if (!pa || !pb) return;
      line.setAttribute('x1', pa.x); line.setAttribute('y1', pa.y);
      line.setAttribute('x2', pb.x); line.setAttribute('y2', pb.y);
    });
  }

  // ── Pulizia stati animazione ─────────────────────────────────────────────
  function clearAnimationStates() {
    nodeEls.forEach(({ g, circle, text }) => {
      g.classList.remove('radar-lit');
      circle.removeAttribute('opacity');
      text.removeAttribute('opacity');
    });
  }

  // ── Animazioni layout-specifiche ──────────────────────────────────────────

  // SF: pulsazione radiale — la periferia oscilla verso/dal centro
  function animateScaleFree(time) {
    return basePos.map((p, i) => {
      if (!p) return p;
      const dx = p.x - cx;
      const dy = p.y - cy;
      const r  = Math.sqrt(dx * dx + dy * dy);
      if (r < 1) return p;
      const ux  = dx / r;
      const uy  = dy / r;
      const amp = Math.min(r * 0.08, 14);
      const off = Math.sin(time * 0.0007 + driftPhases[i].px) * amp;
      return { x: p.x + ux * off, y: p.y + uy * off };
    });
  }

  // RT: radar verticale che attraversa la griglia, i nodi si illuminano al passaggio
  function animateReticolo(time) {
    const radarPeriod = 12000;
    const t           = (time % radarPeriod) / radarPeriod;
    const radarX      = -50 + t * (W + 100);

    return basePos.map((p, i) => {
      if (!p) return p;
      const distX = Math.abs(p.x - radarX);
      const g     = nodeEls[i] && nodeEls[i].g;
      if (distX < 40) {
        if (g) g.classList.add('radar-lit');
        return { x: p.x, y: p.y + Math.sin(driftPhases[i].py * 0.5) * 1.5 };
      } else {
        if (g) g.classList.remove('radar-lit');
        return { x: p.x, y: p.y };
      }
    });
  }

  // MD: rotazione lentissima dell'intero mandala (1 giro ogni 3 minuti)
  function animateMandala(time) {
    const globalRot = time * (2 * Math.PI / 180000);
    const cosR      = Math.cos(globalRot);
    const sinR      = Math.sin(globalRot);
    return basePos.map(p => {
      if (!p) return p;
      const dx = p.x - cx;
      const dy = p.y - cy;
      return {
        x: cx + dx * cosR - dy * sinR,
        y: cy + dx * sinR + dy * cosR,
      };
    });
  }

  // SP: flusso continuo centro→periferia con fade in/out
  function animateSpirale(time) {
    const n          = basePos.length;
    const minR_sp    = 20;
    const maxR_sp    = Math.min(W, H) * 0.46;
    const turns      = 4.5;
    const flowPeriod = 200000;

    return basePos.map((p, i) => {
      if (!p) return p;
      const t0    = n > 1 ? i / (n - 1) : 0;
      const t     = (t0 + time / flowPeriod) % 1;
      const theta = rotOffsetSP + t * turns * 2 * Math.PI;
      const r     = minR_sp + t * (maxR_sp - minR_sp);

      const opacity = t < 0.05 ? t / 0.05
                    : t > 0.95 ? (1 - t) / 0.05
                    : 1;
      if (nodeEls[i]) {
        nodeEls[i].circle.setAttribute('opacity', opacity);
        nodeEls[i].text.setAttribute('opacity', opacity);
      }

      return {
        x: cx + r * Math.cos(theta),
        y: cy + r * Math.sin(theta),
      };
    });
  }

  // Dispatcher — seleziona l'animazione del layout corrente
  function animatedPos(time) {
    switch (curLayout) {
      case 'sf': return animateScaleFree(time);
      case 'rt': return animateReticolo(time);
      case 'md': return animateMandala(time);
      case 'sp': return animateSpirale(time);
      default:   return basePos;
    }
  }

  // ── Label anti-collisione ────────────────────────────────────────────────
  function computeNonOverlappingLabels(limit, pos) {
    pos = pos || basePos;
    const placed  = [];
    const visible = new Set();
    const PADDING = 8;

    for (let i = 0; i < Math.min(limit, nodes.length); i++) {
      const node = nodes[i];
      const el   = nodeEls[i];
      const p    = pos[i];
      if (!el || !p) continue;

      const fs = parseFloat(el.text.getAttribute('font-size') || 10);
      const fw = node.id.length * fs * 0.62;
      const fh = fs + 2;
      const lx = p.x - fw / 2;
      const ly = p.y - node.size - fh - 2;
      const bbox = { x1: lx - PADDING, y1: ly - PADDING, x2: lx + fw + PADDING, y2: ly + fh + PADDING };

      const overlaps = placed.some(b =>
        bbox.x1 < b.x2 && bbox.x2 > b.x1 && bbox.y1 < b.y2 && bbox.y2 > b.y1
      );
      if (!overlaps) { placed.push(bbox); visible.add(i); }
    }
    return visible;
  }

  function updateLabels(pos) {
    const softLimit = scale < Z_L0 ? HUB_ALWAYS
                    : scale < Z_L1 ? L1_LABELS
                    : scale < Z_L2 ? L2_LABELS
                    : nodes.length;

    const visible = computeNonOverlappingLabels(softLimit, pos);
    nodeEls.forEach(({ text }, i) => {
      text.classList.toggle('visible', visible.has(i));
    });

    const fill  = document.getElementById('zoomFill');
    const label = document.getElementById('zoomLabel');
    const pct   = Math.round(((scale - 0.25) / (6 - 0.25)) * 100);
    if (fill)  fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
    if (label) label.textContent =
      scale < Z_L0 ? 'Panoramica' :
      scale < Z_L1 ? 'Sistema'    :
      scale < Z_L2 ? 'Dettaglio'  : 'Microscopico';
  }

  // ── Loop principale ──────────────────────────────────────────────────────
  function loop() {
    // Transizione layout
    if (anim) {
      anim.t = Math.min(1, anim.t + 0.032);
      const e = easeOut(anim.t);
      basePos = anim.from.map((p, i) => ({
        x: p.x + (anim.to[i].x - p.x) * e,
        y: p.y + (anim.to[i].y - p.y) * e,
      }));
      if (anim.t >= 1) { basePos = anim.to.slice(); anim = null; updateLabels(); }
    }

    driftT += 0.00022;
    frameCount++;

    const curPos = anim ? basePos : animatedPos(performance.now());
    renderVisual(curPos);

    // Per SP e MD le posizioni cambiano ogni frame: ricalcola anti-collisione label
    // ogni 45 frame (~0.75s a 60fps) usando le posizioni reali animate
    if (!anim && (curLayout === 'sp' || curLayout === 'md') && frameCount % 45 === 0) {
      updateLabels(curPos);
    }

    // Pan + zoom via transform sul gruppo SVG
    const t = `translate(${tx},${ty}) scale(${scale})`;
    edgesG.setAttribute('transform', t);
    nodesG.setAttribute('transform', t);

    requestAnimationFrame(loop);
  }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  // ── Interazioni ──────────────────────────────────────────────────────────
  function setupInteractions() {
    svgEl.addEventListener('wheel', e => {
      e.preventDefault();
      const factor   = e.deltaY > 0 ? 0.87 : 1.15;
      const newScale = Math.max(0.25, Math.min(6, scale * factor));
      const rect     = svgEl.getBoundingClientRect();
      const mx       = e.clientX - rect.left;
      const my       = e.clientY - rect.top;
      tx = mx - (mx - tx) * (newScale / scale);
      ty = my - (my - ty) * (newScale / scale);
      scale = newScale;
      updateLabels();
    }, { passive: false });

    svgEl.addEventListener('mousedown', e => {
      if (e.target.closest('.tag-node')) return;
      isDragging = true; dragX = e.clientX; dragY = e.clientY;
      svgEl.classList.add('dragging');
    });
    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      tx += e.clientX - dragX; ty += e.clientY - dragY;
      dragX = e.clientX; dragY = e.clientY;
    });
    document.addEventListener('mouseup', () => { isDragging = false; svgEl.classList.remove('dragging'); });

    let ltDist = 0;
    svgEl.addEventListener('touchstart', e => {
      if (e.touches.length === 2) ltDist = tDist(e.touches);
      else { isDragging = true; dragX = e.touches[0].clientX; dragY = e.touches[0].clientY; }
    }, { passive: true });
    svgEl.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const d = tDist(e.touches);
        scale = Math.max(0.25, Math.min(6, scale * (d / ltDist)));
        ltDist = d;
        updateLabels();
      } else if (isDragging) {
        tx += e.touches[0].clientX - dragX; ty += e.touches[0].clientY - dragY;
        dragX = e.touches[0].clientX; dragY = e.touches[0].clientY;
      }
    }, { passive: false });
    svgEl.addEventListener('touchend', () => { isDragging = false; });

    window.addEventListener('resize', () => {
      resize();
      computeLayouts();
      applyLayout(curLayout, false);
    });

    updateLabels();
  }

  function tDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ── Popup multi-destinazione ─────────────────────────────────────────────
  const popup    = document.getElementById('multidest');
  const mdName   = document.getElementById('mdName');
  const mdContent = document.getElementById('mdContent');

  function openPopup(node, svgNodeEl) {
    if (!popup || !mdName || !mdContent) return;

    mdName.textContent = node.id;

    const data = window._systemData;
    const destinations = (node.frags || [])
      .map(id => data && data.fragments ? data.fragments.find(f => f.id === id) : null)
      .filter(Boolean);

    mdContent.innerHTML = destinations.length
      ? destinations.map(f =>
          `<a class="md-dest" href="${f.file}" data-highlight="${node.id}">
            <span class="md-dest-tipo">${f.tipo}</span>
            <span class="md-dest-title">${f.title}</span>
          </a>`).join('')
      : '<p class="md-empty">Nessun frammento associato.</p>';

    // Salva il tag in sessionStorage al click, prima della navigazione
    mdContent.querySelectorAll('.md-dest[data-highlight]').forEach(a => {
      a.addEventListener('click', () => {
        sessionStorage.setItem('sdf_highlight', a.dataset.highlight);
      });
    });

    popup.classList.add('visible');
    positionPopupNearNode(svgNodeEl);
  }

  function closePopup() {
    if (popup) popup.classList.remove('visible');
  }

  function positionPopupNearNode(svgNodeEl) {
    if (!svgNodeEl || !popup) return;

    const rect = svgNodeEl.getBoundingClientRect();
    const vw   = window.innerWidth;
    const vh   = window.innerHeight;

    popup.style.top  = '-9999px';
    popup.style.left = '0';

    const popW = popup.offsetWidth  || 340;
    const popH = popup.offsetHeight || 200;

    let top  = rect.bottom + 10;
    let left = rect.left + rect.width / 2 - popW / 2;

    // Preferisci sotto; se non c'è spazio metti sopra
    if (top + popH > vh - 8) top = rect.top - popH - 10;
    // Clamp: mai fuori dal viewport
    top  = Math.max(8, Math.min(top,  vh - popH - 8));
    left = Math.max(8, Math.min(left, vw - popW - 8));

    popup.style.top  = top  + 'px';
    popup.style.left = left + 'px';
  }

  // Chiudi cliccando fuori dal popup
  document.addEventListener('click', e => {
    if (popup && popup.classList.contains('visible') && !popup.contains(e.target)) {
      closePopup();
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePopup(); });

  // ── Click e hover nodo ───────────────────────────────────────────────────
  function onNodeClick(node, svgNodeEl) {
    openPopup(node, svgNodeEl);
  }

  function onNodeEnter(nodeIdx) {
    edgeEls.forEach((line, i) => {
      const e = edges[i];
      line.classList.toggle('lit', e.a === nodeIdx || e.b === nodeIdx);
    });
  }

  function onNodeLeave() {
    edgeEls.forEach(line => line.classList.remove('lit'));
  }

  // ── Controlli globali ────────────────────────────────────────────────────
  window.zoomIn  = () => { scale = Math.min(6, scale * 1.28);    updateLabels(); };
  window.zoomOut = () => { scale = Math.max(0.25, scale * 0.78); updateLabels(); };
  window.zoomFit = () => { scale = 1; tx = 0; ty = 0; updateLabels(); };

  window.setViz = function (name) {
    const map = { 'scale-free': 'sf', reticolo: 'rt', mandala: 'md', spirale: 'sp' };
    applyLayout(map[name] || name, true);
  };

}());
