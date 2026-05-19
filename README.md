# Sistema di frammenti — cartella di lavoro

Cartella di lavoro per la tesi magistrale «Sistema di frammenti. Il *wrAIting* come forma culturale: opera-volume, database, Architect» di Alessandro Pinna (Architect).

## Stato attuale

Il sistema della tesi è completo come testo. 7 pozzi + 23 soglie prioritarie sono scritti, le note bibliografiche sono complete in tutte le soglie, la diagnostica conferma coerenza. Vedi `documenti_accompagnamento/mappa_soglie.md` per il quadro completo.

La fase corrente è **la costruzione della pubblicazione web del sistema**: un sito statico SVOD che metta in atto, nella propria forma, ciò che il testo articola — sinfilosofia digitale alla maniera dell'*Athenaeum* di Schlegel-Novalis-Schleiermacher, con la firma dissolta nella composizione collettiva.

## Struttura della cartella

```
pozzi/                          → I 7 pozzi del sistema (markdown)
soglie_P1/                      → Le 7 soglie del Pozzo 1
soglie_P2_P7/                   → Le 16 soglie dei pozzi 2-7
documenti_accompagnamento/      → Mappa, diario, indice, Background, architettura
prototipo/                      → Prototipo HTML di riferimento estetico/funzionale
direzione_sito.md               → Documento di indirizzo: cosa stiamo costruendo
specifica_tecnica.md            → Specifica tecnica: come costruirlo
```

## Il sito che costruiamo

Sito web statico, generato da markdown via build script.

**Estetica.** Palette marble-walnut-brass (avorio caldo, legno scuro, ottone). Font Fraunces (serif variabile contemporaneo) per il testo, DM Mono per le UI tecniche, Bebas Neue per il monumentale.

**Dispositivo d'apertura.** Rete dinamica di tag fullscreen, con quattro visualizzazioni intercambiabili (scale-free, reticolo periodico, mandala, spirale aurea). Drift orbitale lieve. Zoom multi-livello che rivela strati progressivi di tag (gli hub principali sono sempre visibili, i tag micro emergono zoomando). Gradazioni dorate progressive sui nodi in base al peso di lettura.

**Lettura del frammento.** Testo lungo continuo non spezzettato. I concetti chiave nel testo sono animati (glow dorato pulsante, riflesso a lamina). Hover su un concetto apre un popup multi-destinazione con tutte le possibili direzioni di lettura (frammento principale che articola, frammenti che citano di passaggio, tag connessi).

**Sistema commenti partecipativo.** L'utente registrato (accademico o lettore curioso) commenta i frammenti. Estrazione tag via LLM con conferma utente. I tag confermati entrano nella rete *indistinguibili* dal vocabolario autoriale. La firma è dissolta. Toggle pubblico/privato per ciascun commento (anche dai commenti privati i tag entrano nel sistema collettivo — principio sinfilosofico).

**Tendina laterale.** Sul lato sinistro, drawer richiudibile con: contatori sistema, profilo utente, azioni (esporta percorso letto, scarica PDF, crediti).

## Riferimenti

- `direzione_sito.md` — documento autoriale di indirizzo: lettore tipo, esperienza target, ciò che il sito NON deve essere.
- `specifica_tecnica.md` — specifica tecnica: stack, struttura file, build pipeline, pubblicazione.
- `prototipo/prototipo_sito_v5.html` — prototipo navigabile in un solo file (HTML+CSS+JS in linea). Aprilo nel browser per vedere l'estetica e le interazioni di riferimento. Il sito finale sarà tecnicamente diverso (modulare, generato da markdown), ma esteticamente e funzionalmente fedele a questo.

## Stato del sistema autoriale

- 7 pozzi completati
- 23 soglie prioritarie completate
- 53 note bibliografiche aggiunte nella revisione di maggio 2026
- Verifica diagnostica conferma coerenza completa
- Totale parole: ~105.000

## Task pendenti generali (rinviati dopo il sito)

1. Verifica sul fisico delle citazioni Caldwell-Cassar (P5 nota [^7]) e Caldwell (P1 «assimilated and conveyed»).
2. Eventuale scrittura delle soglie secondarie e opzionali.
3. Sintesi complessiva della tesi (introduzione e conclusione).
4. Background teorico dell'Architect — work in progress.
5. Animazione introduttiva 3D (Blender, pre-renderizzata, 20-30 sec, peso 2-5 MB).
