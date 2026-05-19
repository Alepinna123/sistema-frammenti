# Direzione del sito

Documento autoriale di indirizzo per la pubblicazione web del sistema della tesi. Le decisioni qui registrate sono state prese dall'Architect; ogni scelta tecnica successiva deve esserne coerente.

## Cosa stiamo costruendo

Una pubblicazione web del sistema dei frammenti che sia simultaneamente:

— **dispositivo critico**, non narrativo. L'apparenza deve essere coerente con il contenuto della tesi, che è analisi critica dei paradigmi mediali contemporanei. Niente effetti spettacolari, niente immersività cattura-attenzione, niente «ambiente» 3D camilliano (che sarebbe imitazione mimetica del Teatro). Sobrietà critica.

— **sinfilosofia digitale**. Il sito mette in atto, nella propria forma, ciò che il testo articola: la dissoluzione della firma nella composizione collettiva, sull'esempio dell'*Athenaeum* di Schlegel-Novalis-Schleiermacher. I commenti dei lettori, i tag che generano, entrano nel sistema indistinguibili dal pensiero autoriale.

— **realizzazione fedele delle promesse teoriche**. Le formule «altrove nel sistema della tesi» che il testo usa diventano effettivamente cliccabili: il sito *realizza* l'apertura ipertestuale che il testo annuncia. La rete scale-free che la tesi articola come modello teorico è anche la *forma visibile* dell'interfaccia d'accesso.

## Chi è il lettore

Due figure principali. Sono *registri*, non gerarchie: cambia la cifra con cui il sistema parla, non quanto del sistema è accessibile.

**Lettore accademico.** Ricercatore, studente magistrale, docente. Cerca articolazione concettuale piena. Tempo di lettura: settimane o mesi di consultazione ricorrente. Nessun limite sulla lunghezza dei propri commenti. La sua presenza nel sistema può essere ricca e duratura.

**Lettore curioso.** Professionista interessato, studente di altre discipline, lettore generale che ha sentito parlare della tesi. Cerca articolazione discorsiva. Tempo di lettura: alcune ore distribuite nel tempo. Limite di 500 parole sui commenti per favorire sintesi. La sua presenza è più leggera ma non meno legittima.

**Visitatore.** Chi entra senza scegliere. Può leggere tutto liberamente, non può commentare (per commentare deve dichiarare un registro). Nessun obbligo, nessun login forzato all'apertura.

## Esperienza target

All'apertura il visitatore vede una **rete fullscreen di tag**. Non un'introduzione, non una hero scrollabile: direttamente l'interfaccia di navigazione. La rete è in lieve movimento (drift orbitale costante), comunica subito che il sistema è dinamico e che cambierà col tempo.

Il visitatore può: **esplorare la rete** (zoom, pan, cambio di visualizzazione fra le quattro geometrie); **aprire un frammento** cliccando un nodo; **leggere il frammento** (testo lungo continuo, concetti chiave illuminati con animazione subtle); **proseguire** o tornando alla rete o seguendo i suggerimenti di proseguimento in fondo al frammento o cliccando un concetto nel testo (che offre destinazioni multiple).

Se ha scelto un registro: può **commentare il frammento**, vedere i tag estratti dal commento dall'LLM, confermare quali entrino nel sistema, scegliere se il commento è pubblico o privato (i tag entrano sempre, anche dai privati).

Il **pannello sinistro** è il suo profilo nel sistema: vede cosa ha letto, quali tag ha esplorato, quanti commenti ha scritto, quali tag suoi sono entrati nel vocabolario condiviso. Lì può anche scaricare la tesi come PDF tradizionale, esportare il proprio percorso di lettura, cambiare registro.

## Quello che il sito NON deve essere

— **NON una griglia 7×7 statica.** La struttura combinatoria del Teatro camilliano è categoria *teorica* del sistema, non vincolo di interfaccia. Le soglie sono asimmetriche per pozzo (P1 ne ha 7, P5 ne ha 2): una griglia 7×7 finge una simmetria che il sistema non ha.

— **NON un atlante alla Warburg.** L'Atlante Mnemosyne dispone immagini iconograficamente situate, non concetti astratti. Una disposizione spaziale degli autori per analogia tradisce il senso dell'opera warburghiana.

— **NON un ambiente 3D immersivo.** Il 3D è pesante (peggiora la fruizione mobile), contraddice la critica strutturale che la tesi rivolge alle interfacce SVOD industriali, e impone *un* percorso visivo dominante. L'animazione 3D introduttiva pre-renderizzata (Blender, 20-30 sec) è ammessa come elemento liminale, non come ambiente di fruizione.

— **NON un libro impaginato sul web.** La promessa SVOD del database non è onorata da una lettura lineare. Il PDF tradizionale è disponibile come export, non come forma primaria.

— **NON una piattaforma che traccia il fruitore.** Niente cookie di tracking, niente analytics esterni, niente algoritmi di raccomandazione. La privacy del lettore è inviolabile. Il profilo personale resta nel browser dell'utente (eventualmente con login opzionale per sincronizzare fra dispositivi, ma senza profilazione).

— **NON una piattaforma di spettacolarità.** Niente animazioni esagerate, niente effetti tridimensionali superflui, niente onboarding lungo e didattico. Sobrietà.

— **NON una piattaforma che chiede a pagamento il testo integrale.** Il sistema è interamente liberamente accessibile. Eventuali modelli editoriali futuri saranno decisi dopo la discussione della tesi, e non condizionano l'architettura attuale.

— **NON un sito firmato in modo esibito.** La firma dell'Architect è dichiarata sobriamente (nome nella tendina, nel footer, nel PDF di export), ma non è elemento estetico-monumentale. Il sito è il sistema, non un autore individuale.

## Decisioni estetiche fondamentali

— **Palette**: marble (avorio caldo) per superfici di lettura, walnut (legno scuro) per spazi liminali e mappa, brass (ottone) come accento per le connessioni cliccabili. Sei gradazioni dorate progressive per i nodi della rete in base al peso di lettura.

— **Font**: Fraunces (serif variabile contemporaneo, eleganza editoriale + leggibilità ottima) per il testo di lettura, DM Mono per UI tecniche e label, Bebas Neue per elementi monumentali (logo, ornamenti, grandi numeri).

— **Animazioni**: drift orbitale lieve sulla rete, transizioni fluide tra le quattro visualizzazioni, glow dorato pulsante sui concept-link nel testo. Niente di esibito; tutto al servizio della leggibilità e della scoperta.

— **Layout fullscreen**: la rete è il sito. Tendina informativa a sinistra (drawer richiudibile), toggle di visualizzazione a destra, navigazione minima in alto.

## Decisioni funzionali fondamentali

— **Sistema commenti**: l'utente scrive, l'LLM estrae tag, l'utente conferma quali entrino nella rete. I tag confermati sono indistinguibili dal vocabolario autoriale (forma quadrata invece di circolare per riconoscibilità formale, stesso peso semantico). Toggle pubblico/privato sul commento; i tag entrano nella rete in ogni caso (principio sinfilosofico). I commenti pubblici sono visibili a tutti sotto al frammento; quelli privati solo nel profilo dell'autore.

— **Quattro visualizzazioni della rete** (scale-free / reticolo / mandala / spirale aurea): stesso materiale, articolazioni multiple. La rete *è* il sistema della tesi che produce la propria immagine.

— **Zoom multi-livello**: la rete ha strati. A zoom basso solo i tag-hub sono leggibili come etichette, gli altri sono presenti come cerchi muti. Zoomando, i nomi emergono per strati. La struttura completa è sempre lì, lo zoom rivela il nominabile.

— **Multi-destinazione sui concept-link**: cliccare un autore nel testo non porta a un solo posto. Apre un popup con le destinazioni: frammento principale che articola, frammenti che citano di passaggio, tag connessi. Il lettore sceglie dove andare.

— **Persistenza dei dati utente**: in localStorage del browser per la v1 (nessun backend). Eventualmente integrazione con un servizio leggero (Cloudflare KV, Supabase, etc.) per sincronizzazione cross-device come fase 2.

## Sequenza di pubblicazione

1. **v0 — Prototipo HTML** (fatto). Riferimento estetico/funzionale in `prototipo/prototipo_sito_v5.html`. Tutto in un solo file.

2. **v1 — Sito statico generato** (fase corrente). Markdown sorgente + generatore + sito HTML/CSS/JS modulare. Pubblicato gratuitamente su GitHub Pages.

3. **v1.1 — Estrazione tag reale via Claude API**. Sostituisce la simulazione del prototipo con una chiamata API vera. Richiede una chiave API e un piccolo endpoint serverless.

4. **v2 — Sincronizzazione cross-device dei profili utente**. Da decidere se necessaria. Probabilmente sì se il sito viene utilizzato attivamente da una comunità.

5. **v2.1 — Animazione introduttiva 3D**. Pre-renderizzata in Blender, 20-30 sec, 2-5 MB. Si vede all'apertura una sola volta poi cede alla rete operativa.
