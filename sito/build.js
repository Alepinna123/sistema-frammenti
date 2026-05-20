'use strict';

const fs   = require('fs');
const path = require('path');
const { marked } = require('marked');
const fse  = require('fs-extra');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const ROOT       = path.join(__dirname, '..');   // Sistema di frammenti md/
const SITO       = __dirname;                    // sito/
const BUILD_DIR  = path.join(SITO, '..', 'docs');
const TMPL_DIR   = path.join(SITO, 'src', 'templates');
const ASSETS_DIR = path.join(SITO, 'src', 'assets');
const JS_DIR     = path.join(SITO, 'src', 'js');

// Cartelle sorgente markdown (lette direttamente, senza copia)
const MD_SOURCES = [
  path.join(ROOT, 'pozzi'),
  path.join(ROOT, 'soglie_P1'),
  path.join(ROOT, 'soglie_P2_P7'),
];

// ---------------------------------------------------------------------------
// Parser markdown frammenti
//
// Struttura attesa:
//   # [Meta-titolo]
//   **Identificazione per l'Architect …**   ← scartata
//   ---
//   ## [Titolo reale]
//   [corpo con [^N] inline]
//   ---
//   **Tag di connessione:** tag1 · tag2 · …
//   ---
//   ### Note
//   [^1]: …
// ---------------------------------------------------------------------------
function parseFragment(filePath) {
  const raw     = fs.readFileSync(filePath, 'utf8');
  const content = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const sections = content.split(/\n---\n/);

  if (sections.length < 3) {
    throw new Error(
      `${path.basename(filePath)}: struttura inattesa (${sections.length} sezioni, attese ≥ 3)`
    );
  }

  // Sezione 0 → meta (H1 + blocco identificazione)
  const metaHeader     = sections[0];
  const metaTitleMatch = metaHeader.match(/^#\s+(.+)/m);
  const metaTitle      = metaTitleMatch ? metaTitleMatch[1].trim() : '';

  // Sezione 1 → corpo (H2 + testo)
  const bodySection    = sections[1].trim();
  const realTitleMatch = bodySection.match(/^##\s+(.+)/);
  const realTitle      = realTitleMatch ? realTitleMatch[1].trim() : metaTitle;
  const bodyRaw        = bodySection.replace(/^##\s+.+\n\n?/, '').trim();

  // Sezione 2 → tag
  const tagSection = sections[2];
  const tagMatch   = tagSection.match(/\*\*Tag di connessione:\*\*\s*(.+)/);
  const tags       = tagMatch
    ? tagMatch[1].split(' · ').map(t => t.trim()).filter(Boolean)
    : [];

  // Sezione 3 → bibliografia (opzionale)
  const bibRaw = sections.length >= 4 ? sections[3].trim() : '';

  // Slug: "frammento_P1_prova5_proposizioneA" → "p1"
  //       "frammento_S1_1b_prova2"           → "s1-1b"
  const filename  = path.basename(filePath, '.md');
  const slugMatch = filename.match(/frammento_(.+?)_prova/i);
  const rawId     = slugMatch ? slugMatch[1] : filename;
  const id        = rawId.toLowerCase().replace(/_/g, '-');
  const tipo      = /^P\d/i.test(rawId) ? 'pozzo' : 'soglia';

  return { id, tipo, metaTitle, realTitle, tags, bodyRaw, bibRaw, filePath };
}

// ---------------------------------------------------------------------------
// Footnote rendering
//
// Converte [^N] nel corpo in <sup><a …>N</a></sup>
// e il blocco [^N]: testo in <div class="frag-notes"> …
// ---------------------------------------------------------------------------
function processFootnotes(bodyRaw, bibRaw) {
  // Costruisci mappa nota→testo dalla sezione bibliografia
  const noteMap = {};
  const noteRe  = /\[\^(\w+)\]:\s*([\s\S]*?)(?=\n\[\^|\n\n\[\^|$)/g;
  let m;
  while ((m = noteRe.exec(bibRaw)) !== null) {
    noteMap[m[1]] = m[2].replace(/\n\s+/g, ' ').trim();
  }

  // Sostituisci [^N] nel corpo con superscript linkati
  const bodyLinked = bodyRaw.replace(/\[\^(\w+)\]/g, (_, key) =>
    `<sup><a href="#note-${key}" id="ref-${key}" class="note-ref">${key}</a></sup>`
  );

  // Genera HTML sezione note
  let notesHtml = '';
  const keys = Object.keys(noteMap);
  if (keys.length > 0) {
    const items = keys.map(k => {
      const text = marked.parseInline(noteMap[k]);
      return `<p class="frag-note" id="note-${k}">` +
        `<a href="#ref-${k}" class="frag-note-num">[${k}]</a> ${text}</p>`;
    }).join('\n    ');
    notesHtml = `<div class="frag-notes">\n` +
      `  <div class="frag-notes-title">Note</div>\n` +
      `  ${items}\n</div>`;
  }

  return { bodyLinked, notesHtml };
}

// ---------------------------------------------------------------------------
// Concept-link: wrapping delle voci conosciute nel testo HTML
//
// buildConceptMap(fragments) → array [[termine, termine], …] ordinato
// per lunghezza decrescente (i termini lunghi hanno priorità sul matching).
//
// wrapConceptLinks(html, entries) → html con <span class="concept-link">
// intorno a ogni occorrenza, usando sostituzione-token per evitare
// doppie sostituzioni.
// ---------------------------------------------------------------------------
function buildConceptMap(fragments) {
  // Raccoglie tutti i tag unici
  const allTags = new Set();
  fragments.forEach(f => f.tags.forEach(t => allTags.add(t)));

  // Filtra: tieni solo tag che hanno senso come concept-link nel testo
  //   - lunghezza ≥ 3 caratteri
  //   - non iniziano con * (titoli in markdown: *The Language…*)
  //   - non sono puri numeri
  //   - non contengono solo punteggiatura
  const entries = [];
  allTags.forEach(tag => {
    if (tag.length < 3)          return;
    if (tag.startsWith('*'))     return;
    if (/^\d+$/.test(tag))       return;
    if (/^[^a-zA-ZÀ-ÿ]+$/.test(tag)) return;
    entries.push(tag);
  });

  // Ordina per lunghezza decrescente: "preferential attachment" prima di "attachment"
  entries.sort((a, b) => b.length - a.length);
  return entries;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wrapConceptLinks(html, conceptTerms) {
  if (!conceptTerms || conceptTerms.length === 0) return html;

  // Sostituisce le occorrenze delle voci all'interno dei nodi di testo dell'HTML.
  // Strategia token: ogni match viene prima sostituito con __TOK_N__ (non-HTML),
  // poi i token vengono espansi negli span finali. Questo evita che sostituzioni
  // successive trovino testo dentro attributi o span già inseriti.
  const tokens = [];

  const result = html.replace(/>([^<]+)</g, (match, textNode) => {
    let processed = textNode;
    for (const term of conceptTerms) {
      // Word-boundary adattata per termini che iniziano/finiscono con caratteri
      // non-ASCII (es. "Barabási", "wrAIting")
      const left  = /^\w/.test(term) ? '(?<![\\w\\u00C0-\\u024F])' : '';
      const right = /\w$/.test(term) ? '(?![\\w\\u00C0-\\u024F])'  : '';
      const re    = new RegExp(left + escapeRegex(term) + right, 'g');
      processed = processed.replace(re, m => {
        const idx = tokens.length;
        tokens.push(`<span class="concept-link" data-tag="${esc(term)}" tabindex="0" role="button">${esc(m)}</span>`);
        return `\x00TOK${idx}\x00`;
      });
    }
    return '>' + processed + '<';
  });

  // Espandi i token
  return result.replace(/\x00TOK(\d+)\x00/g, (_, i) => tokens[Number(i)]);
}

// ---------------------------------------------------------------------------
// formatFragmentLabel: id → etichetta strutturata leggibile
//   p1     → "Pozzo 1"
//   s1-1   → "Soglia 1.1"
//   s1-1b  → "Soglia 1.1b"
//   s1-2-a → "Soglia 1.2a"
// ---------------------------------------------------------------------------
function formatFragmentLabel(id) {
  const pozzo = id.match(/^p(\d+)$/);
  if (pozzo) return 'Pozzo ' + pozzo[1];
  const soglia = id.match(/^s(\d+)-(\d+)(?:-([a-z])|([a-z]))?$/);
  if (soglia) {
    const letter = soglia[3] || soglia[4] || '';
    return 'Soglia ' + soglia[1] + '.' + soglia[2] + letter;
  }
  return id;
}

// ---------------------------------------------------------------------------
// enrichTagsFromBody: due passate per estrarre tag dal corpo
//
// Filtri attivi (tutti devono essere soddisfatti per aggiungere un tag):
//   1. Tag già nel vocabolario autoriale (dichiarato in almeno un frammento)
//   2. Non è un puro numero (esclude anni, ID numerici)
//   3. Lunghezza ≥ 4 oppure acronimo ALL-CAPS con lunghezza ≥ 2
//   4. Non è nella stop-list di parole funzionali
//   5. (Filtro 4) Il tag non ha già raggiunto MAX_FRAG_PER_TAG frammenti
//      — baseline STATICA: conta solo i tag dichiarati nell'intestazione,
//        più quelli già propagati nei frammenti precedenti durante la stessa
//        esecuzione. Deterministico indipendentemente dall'ordine.
//   6. (Filtro 5) Appare almeno MIN_OCCURRENCES volte nel corpo del frammento
// ---------------------------------------------------------------------------

const MAX_FRAG_PER_TAG  = 10;   // soglia di saturazione
const MIN_OCCURRENCES   = 2;    // occorrenze minime nel corpo

// Parole funzionali che saturano il sistema se propagate automaticamente.
// I tag già dichiarati in un frammento non vengono rimossi.
const STOPLIST_AUTO = new Set([
  'processo', 'progressiva', 'progressivo', 'poesia', 'poetica',
  'sole', 'opera', 'testo', 'lettura', 'scrittura', 'parola',
  'parole', 'forma', 'tempo', 'spazio', 'mondo', 'sistema', 'dispositivo',
]);

function enrichTagsFromBody(fragments) {
  // ── 1. Vocabolario globale ─────────────────────────────────────────────────
  const vocab = new Set();
  fragments.forEach(f => f.tags.forEach(t => vocab.add(t)));

  // ── 2. Baseline statica: conta frammenti con quel tag DICHIARATO ──────────
  //   Chiave: normalized lowercase (senza asterischi)
  const baselineCount = {};
  fragments.forEach(f => {
    f.tags.forEach(t => {
      const k = t.replace(/^\*+|\*+$/g, '').toLowerCase();
      baselineCount[k] = (baselineCount[k] || 0) + 1;
    });
  });

  // Conta le propagazioni incrementali durante questo build
  const propagatedCount = {};

  // Raccoglie i tag che hanno bloccato propagazioni per saturazione
  const saturatedHits = {};   // normLow → contatore blocchi

  let totalAdded = 0;

  // ── 3. Per ogni frammento, cerca e propaga ─────────────────────────────────
  fragments.forEach(frag => {
    const existingNorm = new Set(
      frag.tags.map(t => t.replace(/^\*+|\*+$/g, '').toLowerCase())
    );

    const added = [];

    vocab.forEach(tag => {
      const normalized = tag.replace(/^\*+|\*+$/g, '');
      const normLow    = normalized.toLowerCase();

      // ── Filtro 1: puri numeri ─────────────────────────────────────────────
      if (/^\d+$/.test(normalized)) return;

      // ── Filtro 2: lunghezza ───────────────────────────────────────────────
      if (normalized.length < 2) return;
      if (normalized.length < 4 && normalized !== normalized.toUpperCase()) return;

      // ── Filtro 3: stop-list ───────────────────────────────────────────────
      if (STOPLIST_AUTO.has(normLow)) return;

      // ── Già presente nel frammento ────────────────────────────────────────
      if (existingNorm.has(normLow)) return;

      // ── Filtro 4: saturazione (baseline + propagazioni già effettuate) ────
      const currentCount = (baselineCount[normLow] || 0) + (propagatedCount[normLow] || 0);
      if (currentCount >= MAX_FRAG_PER_TAG) {
        saturatedHits[normLow] = (saturatedHits[normLow] || 0) + 1;
        return;
      }

      // ── Filtro 5: minimo MIN_OCCURRENCES occorrenze nel corpo ──────────────
      const left  = /^\w/.test(normalized) ? '(?<![\\w\\u00C0-\\u024F])' : '';
      const right = /\w$/.test(normalized) ? '(?![\\w\\u00C0-\\u024F])'  : '';
      let re;
      try {
        re = new RegExp(left + escapeRegex(normalized) + right, 'gi');
      } catch (_) { return; }

      const matches = frag.bodyRaw.match(re);
      if (!matches || matches.length < MIN_OCCURRENCES) return;

      // Tutti i filtri superati: aggiungi il tag
      added.push(tag);
      frag.tags.push(tag);
      existingNorm.add(normLow);
      propagatedCount[normLow] = (propagatedCount[normLow] || 0) + 1;
    });

    if (added.length > 0) {
      const lbl = formatFragmentLabel(frag.id).padEnd(14);
      console.log(`  [TAG-BODY] ${lbl} +${added.length}: ${added.join(', ')}`);
      totalAdded += added.length;
    }
  });

  // ── Log tag saturati ───────────────────────────────────────────────────────
  const saturatedList = Object.keys(saturatedHits).sort();
  if (saturatedList.length > 0) {
    console.log(`\n  Tag saturati (≥${MAX_FRAG_PER_TAG} frammenti, propagazione bloccata):`);
    saturatedList.forEach(k => {
      const total = (baselineCount[k] || 0) + (propagatedCount[k] || 0);
      console.log(`    ${k.padEnd(36)} presente in ${total} frammenti`);
    });
  }

  console.log('');
  if (totalAdded > 0) {
    console.log(`  Totale tag aggiunti dal corpo: ${totalAdded}\n`);
  } else {
    console.log('  Nessun tag aggiunto dal corpo.\n');
  }
}

// ---------------------------------------------------------------------------
// Tag pills HTML
// ---------------------------------------------------------------------------
function renderTagPills(tags) {
  return tags.map(t =>
    `<span class="concept-tag-pill" role="listitem" data-tag="${esc(t)}">${esc(t)}</span>`
  ).join('\n    ');
}

// ---------------------------------------------------------------------------
// Render un frammento usando il template fragment.html
// ---------------------------------------------------------------------------
function renderFragment(fragment, tmpl, conceptTerms) {
  const { bodyLinked, notesHtml } = processFootnotes(fragment.bodyRaw, fragment.bibRaw);
  const bodyHtml = wrapConceptLinks(marked.parse(bodyLinked), conceptTerms);

  return tmpl
    .replace(/{{FRAGMENT_TITLE}}/g,     esc(fragment.realTitle))
    .replace(/{{FRAGMENT_TITLE_JS}}/g,  JSON.stringify(fragment.realTitle))
    .replace(/{{FRAGMENT_TIPO}}/g,      esc(fragment.tipo))
    .replace(/{{FRAGMENT_ID}}/g,        fragment.id)
    .replace(/{{FRAGMENT_LABEL}}/g,     esc(formatFragmentLabel(fragment.id)))
    .replace(/{{FRAGMENT_TAGS_JSON}}/g, JSON.stringify(fragment.tags))
    .replace(/{{FRAGMENT_TAG_PILLS}}/g, renderTagPills(fragment.tags))
    .replace(/{{FRAGMENT_BODY}}/g,      bodyHtml)
    .replace(/{{FRAGMENT_NOTES}}/g,     notesHtml)
    .replace(/{{ASSET_PREFIX}}/g,       '');
}

// ---------------------------------------------------------------------------
// Render index usando il template network.html
// ---------------------------------------------------------------------------
function renderIndex(fragments, tmpl) {
  const totalTags = countUniqueTags(fragments);
  return tmpl
    .replace(/{{TOTAL_FRAGMENTS}}/g, String(fragments.length))
    .replace(/{{TOTAL_TAGS}}/g,      String(totalTags));
}

function countUniqueTags(fragments) {
  const set = new Set();
  fragments.forEach(f => f.tags.forEach(t => set.add(t)));
  return set.size;
}

// ---------------------------------------------------------------------------
// Genera system.json (indice globale)
// ---------------------------------------------------------------------------
function buildSystemJson(fragments) {
  // Mappa tag → lista fragment ID
  const tagIndex = {};
  fragments.forEach(f => {
    f.tags.forEach(t => {
      if (!tagIndex[t]) tagIndex[t] = [];
      tagIndex[t].push(f.id);
    });
  });

  // Lista frammenti (metadati minimi)
  const fragmentList = fragments.map(f => ({
    id:    f.id,
    tipo:  f.tipo,
    title: f.realTitle,
    tags:  f.tags,
    file:  `${f.id}.html`,
  }));

  return {
    generated: new Date().toISOString(),
    fragments: fragmentList,
    tags: tagIndex,
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readTemplate(name) {
  return fs.readFileSync(path.join(TMPL_DIR, name), 'utf8');
}

// ---------------------------------------------------------------------------
// Build principale
// ---------------------------------------------------------------------------
function build() {
  console.log('═══════════════════════════════════');
  console.log('  Sistema di frammenti — Build v1  ');
  console.log('═══════════════════════════════════\n');

  fse.ensureDirSync(BUILD_DIR);

  // 1. Leggi template
  const fragmentTmpl = readTemplate('fragment.html');
  const networkTmpl  = readTemplate('network.html');

  // Copia comment.html (pagina statica, nessuna sostituzione)
  fse.copySync(
    path.join(TMPL_DIR, 'comment.html'),
    path.join(BUILD_DIR, 'comment.html')
  );

  // 2. Copia assets in build/
  fse.copySync(path.join(ASSETS_DIR, 'style.css'), path.join(BUILD_DIR, 'style.css'));
  console.log('  ✓ style.css copiato in build/');

  // Copia JS (da src/js/ se esistono, altrimenti usa gli stub)
  const jsFiles = ['utils.js', 'profile.js', 'breadcrumb.js', 'network.js', 'viewer.js', 'comments.js', 'comment-page.js', 'extract-tags.js', 'onboarding.js'];
  jsFiles.forEach(f => {
    const src = path.join(JS_DIR, f);
    const dst = path.join(BUILD_DIR, f);
    if (fs.existsSync(src)) {
      fse.copySync(src, dst);
    } else if (!fs.existsSync(dst)) {
      // Stub vuoto se non esiste né in src né in build
      fs.writeFileSync(dst, `/* ${f} — stub */\n`, 'utf8');
    }
  });
  console.log('  ✓ JS copiati/stub creati in build/\n');

  // 3. Leggi tutti i markdown sorgente
  const fragments = [];
  MD_SOURCES.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .sort()
      .forEach(f => {
        try {
          const frag = parseFragment(path.join(dir, f));
          fragments.push(frag);
          console.log(`  [${frag.tipo.padEnd(6)}] ${frag.id.padEnd(12)} — "${frag.realTitle.slice(0, 55)}"`);
        } catch (e) {
          console.error(`  ✗ Errore parsing ${f}: ${e.message}`);
        }
      });
  });

  console.log(`\n  Totale: ${fragments.length} frammenti\n`);

  // 3b. Arricchisci tag dal corpo (seconda passata)
  console.log('  Arricchimento tag dal corpo del testo…');
  enrichTagsFromBody(fragments);

  // 4. Genera HTML per ogni frammento
  const conceptTerms = buildConceptMap(fragments);
  fragments.forEach(frag => {
    const html    = renderFragment(frag, fragmentTmpl, conceptTerms);
    const outPath = path.join(BUILD_DIR, `${frag.id}.html`);
    fs.writeFileSync(outPath, html, 'utf8');
  });
  console.log(`  ✓ ${fragments.length} pagine frammento generate`);

  // 5. Genera index.html (rete)
  const indexHtml = renderIndex(fragments, networkTmpl);
  fs.writeFileSync(path.join(BUILD_DIR, 'index.html'), indexHtml, 'utf8');
  console.log('  ✓ index.html generato');

  // 6. Genera system.json
  const systemData = buildSystemJson(fragments);
  fs.writeFileSync(
    path.join(BUILD_DIR, 'system.json'),
    JSON.stringify(systemData, null, 2),
    'utf8'
  );
  console.log(`  ✓ system.json generato (${Object.keys(systemData.tags).length} tag unici)`);

  console.log('\n  Build completata. Apri build/index.html nel browser.');
  console.log('═══════════════════════════════════\n');
}

build();
