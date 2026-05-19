# Specifica tecnica del sito

Documento per l'istanza di Claude in Claude Code. Descrive l'architettura tecnica del sito, le scelte di implementazione, e l'ordine di costruzione.

## Stack tecnico

**Sito statico HTML/CSS/JavaScript vanilla.** Nessun framework grosso. Nessuna build complessa. Tutto deve essere leggibile in plain text fra dieci anni.

**Generatore in Node.js**, script semplice (non Eleventy, non Astro — script custom commentato). Legge i markdown, applica template, sputa HTML.

**Hosting GitHub Pages** (gratuito, persistente). Il repo Git è la fonte di verità.

**Persistenza utente in localStorage** del browser per la v1. Niente backend. Niente database.

**Estrazione tag commenti**: in v1 simulata client-side (come nel prototipo). In v1.1 vera via Claude API, attraverso un piccolo endpoint serverless (Cloudflare Workers o Vercel Functions) per non esporre la chiave API.

## Struttura della cartella di lavoro

```
sito/
├── content/
│   ├── pozzi/              ← (link simbolico o copia dei file markdown del sistema)
│   ├── soglie_P1/
│   └── soglie_P2_P7/
├── src/
│   ├── templates/
│   │   ├── layout.html     ← Template HTML base
│   │   ├── fragment.html   ← Template del singolo frammento
│   │   └── network.html    ← Template della rete d'apertura
│   ├── assets/
│   │   ├── style.css       ← CSS completo
│   │   ├── network.js      ← Logica rete (zoom, drift, transizioni, viz)
│   │   ├── viewer.js       ← Logica lettura frammento
│   │   ├── comments.js     ← Sistema commenti
│   │   ├── profile.js      ← Profilo utente in localStorage
│   │   └── extract-tags.js ← Estrazione tag (v1 simulata, v1.1 API)
│   └── data/
│       └── system.json     ← Generato dal build: tutti i tag, frammenti, connessioni
├── build/                  ← Output del generatore (commit su Git per GitHub Pages)
├── build.js                ← Script generatore Node.js
├── package.json            ← Solo dipendenze leggere (marked per markdown, fs-extra)
├── README.md
└── .gitignore
```

## Pipeline di build

`node build.js`:

1. **Legge tutti i markdown** in `content/`.
2. **Estrae i metadati** da ciascun frammento (titolo, tag di connessione, voci convocate, note).
3. **Costruisce l'indice dei tag**: per ogni tag, lista dei frammenti che lo contengono e dei frammenti dove è "articolato in dettaglio" (in base ai marker testuali).
4. **Trasforma il markdown in HTML**, sostituendo le menzioni di autori conosciuti con `<span class="concept-link" data-id="...">...</span>`.
5. **Genera il file `system.json`** con tag, frammenti, connessioni.
6. **Genera l'HTML statico** delle pagine dei frammenti.
7. **Copia gli asset** (CSS, JS, font, immagini) in `build/`.

Il sito risultante in `build/` può essere aperto come file locale o pubblicato come è.

## Mappatura testuale automatica autore → tag

Lo script di build deve riconoscere le menzioni di autori nel testo dei frammenti e trasformarle in concept-link. Mappa esempio (da costruire e mantenere):

```javascript
const AUTORI = {
  'Camillo': 'camillo',
  'Bolzoni': 'bolzoni',
  'Schlegel': 'schlegel',
  'Friedrich Schlegel': 'schlegel',
  'Tolkien': 'tolkien',
  'J.R.R. Tolkien': 'tolkien',
  'Wolf': 'wolf',
  'Mark J.P. Wolf': 'wolf',
  'Brembilla': 'brembilla',
  'Paola Brembilla': 'brembilla',
  // ...e così via per tutte le voci del sistema
};
```

Per ogni autore in mappa, il build cerca occorrenze nel testo (case-sensitive, parole intere) e le wrappa nel concept-link. Il sistema sa già quali destinazioni offrire grazie all'indice dei tag.

## Componenti

**Onboarding** (`onboarding.js`): mostra le due card di registro al primo accesso, salva la scelta in localStorage. Bypassabile con «entra come visitatore».

**Rete** (`network.js`): tutta la logica del prototipo v5 modularizzata. Render SVG, zoom multi-livello, pan, drift orbitale, quattro visualizzazioni, transizioni, gradazioni dorate per peso di lettura. Riceve i dati da `system.json`.

**Viewer** (`viewer.js`): apertura frammento, rendering HTML, popup multi-destinazione sui concept-link, suggerimenti di proseguimento, note bibliografiche.

**Comments** (`comments.js`): sezione commenti in fondo a ogni frammento, textarea con limite parole differenziato per persona, toggle pubblico/privato, flusso di estrazione tag con conferma utente, pubblicazione in localStorage.

**Profile** (`profile.js`): mantiene in localStorage lo stato del lettore — frammenti letti, tag esplorati, commenti scritti, tag generati. Pannello laterale che lo visualizza.

**Tag extraction** (`extract-tags.js`): in v1 simulata client-side come nel prototipo. In v1.1 chiamata vera all'endpoint serverless.

## Performance e accessibilità

- **Caricamento iniziale leggero**: niente librerie pesanti, fonts via Google Fonts (caching browser), SVG inline per la rete (no immagini bitmap).
- **Mobile-friendly**: la rete deve funzionare su touch (pinch-to-zoom, drag). Il viewer deve essere leggibile su schermi piccoli (single column).
- **Accessibilità WCAG**: testo con contrasto sufficiente, ARIA labels sui controlli, navigazione da tastiera, focus visibile, alt-text su elementi visuali significativi.
- **Performance**: la rete con drift e transizioni gira a 60fps su hardware medio. requestAnimationFrame, no setInterval. Re-rendering parziale (solo trasformazioni, non rigenerazione DOM).

## Pubblicazione

Repo Git su GitHub (privato finché non si è pronti, poi pubblico). GitHub Pages punta alla cartella `build/`. URL del tipo `architect.github.io/sistema-frammenti` finché non si decide se prendere un dominio custom (es. `sistemadiframmenti.it` — circa 10€/anno).

Aggiornamenti del sito: l'Architect modifica i markdown, rilancia `node build.js`, commit + push. GitHub Pages serve automaticamente la nuova versione.

## Versioni del codice

- **v1.0**: sito statico funzionante con tutti i 30 frammenti del sistema. Estrazione tag commenti simulata client-side. Hosting GitHub Pages. Pubblicabile.

- **v1.1**: estrazione tag commenti via Claude API vera (richiede endpoint serverless e chiave API gestita).

- **v2.0**: sincronizzazione profili cross-device se necessaria, animazione 3D introduttiva.

## Ordine di costruzione raccomandato

1. **Setup cartelle e package.json**. Installazione minima di Node modules (marked, fs-extra).
2. **Build script v0**: legge un solo markdown di prova, lo trasforma in HTML, lo sputa in build/.
3. **Template HTML**: layout base + template frammento. Sposta CSS dal prototipo in file dedicato.
4. **Build script v1**: gestisce tutti i markdown, estrae metadati, genera system.json.
5. **Rete dei tag**: importa la logica del prototipo, la collega a system.json reale.
6. **Viewer del frammento**: importa la logica del prototipo, la collega ai frammenti markdown veri.
7. **Multi-destinazione**: costruisce le DESTINATIONS dal sistema vero, non più hardcoded.
8. **Sistema commenti** con persistenza localStorage.
9. **Profilo utente** in localStorage.
10. **Onboarding** persistente.
11. **Test mobile**.
12. **Pubblicazione GitHub Pages**.

Per ogni passo: build, verifica nel browser locale (`python -m http.server` nella cartella build, oppure `npx serve build`), commit Git con messaggio chiaro.

## Vincoli da rispettare

Tutte le scelte estetiche, funzionali, autoriali sono già fissate in `direzione_sito.md`. Il prototipo `prototipo_sito_v5.html` è riferimento estetico e funzionale: se nel costruire si trova un conflitto fra ciò che è scritto in `direzione_sito.md` e ciò che fa il prototipo, vince `direzione_sito.md` (è il documento autoriale). Se il prototipo invece *mostra* qualcosa che `direzione_sito.md` non specifica, allora il prototipo è la fonte.

Per qualunque decisione autoriale che richieda interpretazione, l'Architect torna nella chat web di discussione (vedi README della cartella). Claude Code non inventa decisioni autoriali da solo.
