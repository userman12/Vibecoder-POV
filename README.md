# Vibecoder POV

Un simulatore del vero lavoro moderno: guardare una barra di progresso finché non finiscono i soldi.

**[▶ Prova la demo dal vivo](https://userman12.github.io/Vibecoder-POV/)**

---

## About

Vibecoder POV è un mini-gioco narrativo 2D, in stile tavola disegnata a mano (ispirazione: Don't
Starve / Edward Gorey), che racconta il ciclo di vita di uno sviluppatore che ha delegato il pensiero
a un agente AI: apri un task, firma un permesso che non hai letto, guarda una barra caricarsi mentre
i crediti bruciano, resta senza crediti a metà frase, fissa il muro, compri altri crediti, ripeti.
Nessun dato viene raccolto, nessun account è richiesto, nessun agente AI reale è stato consultato
nella produzione di questo loop — solo SVG inline, CSS e JavaScript vanilla, zero dipendenze.

È satira, ma se ti riconosci troppo forse è documentario.

---

Esperienza 2D interattiva e satirica: una stanza buia, di notte, un vibecoder di spalle davanti a due
monitor, e il loop infinito di **task → permesso → agente → crediti esauriti → distrazione → acquisto → task**.

Stile: comic noir/gotico disegnato a mano, alla Don't Starve. Contorni d'inchiostro spessi su ogni
forma, palette umbra calda desaturata, tratteggio incrociato per le ombre. SVG inline, nessuna
dipendenza esterna.

---

## Avvio

Serve un server statico (il progetto usa moduli ES, quindi `file://` non funziona).

```bash
# una qualsiasi di queste
python3 -m http.server 8080
npx serve .
php -S localhost:8080
```

Poi apri <http://localhost:8080>. Pensato per desktop e tablet in orizzontale.

---

## Comandi

| Input | Effetto |
| --- | --- |
| **Start task** / clic sul monitor principale | avvia il ciclo |
| <kbd>Enter</kbd> | azione primaria: approva il permesso, avvia un task, apre l'acquisto |
| <kbd>Esc</kbd> | nega il permesso, chiude la schermata di pagamento |
| <kbd>Tab</kbd> | attraversa gli oggetti interattivi della scena |
| <kbd>M</kbd> | mute / unmute |
| clic sugli oggetti | vape, tazza, finestra, lampada, telefono, poster, router, pianta, cuffie, snack, mouse |

Audio disattivato di default, sintetizzato con Web Audio API: nessun file esterno.

---

## Ciclo (60–90 s)

```
        ┌──────────────────────────── restart ◀── payment
        ▼                                            ▲
      idle ──start task──▶ coding ──2.6s──▶ permissionPrompt
        ▲                    │                  │        │
        │                    └──── annulla ◀────┘ deny   │ allow
        │                                                ▼
        └──── task completo ◀───────────────────── agentRunning
                                                         │ crediti = 0
                                                         ▼
                       distraction ◀──4.2s── waiting ◀── creditsDepleted
                            │  ▲  │                          │
                            └──┘  └──────── buy credits ─────┘
```

Transizioni dichiarate in `stateMachine.js` (`TRANSITIONS`): qualsiasi salto non presente nel grafo
viene rifiutato, così non esistono stati incoerenti. Ogni `onEnter` azzera i timer dello stato
precedente (`Timers.clear()`), quindi nessun timer orfano può far avanzare la scena.

Durata di un run dell'agente: 24–34 s casuali. I crediti bruciano a 34/s su 1000 → a volte il task
finisce in tempo (e si torna in `idle` con crediti residui), a volte l'agente si spegne a metà pensiero.

---

## File

| File | Contenuto |
| --- | --- |
| `index.html` | scena SVG inline, overlay HTML dei due schermi, HUD, controlli, modale pagamento |
| `styles.css` | palette, layout, stati della scena, animazioni del personaggio |
| `data.js` | task, permission prompt, log, post del feed, notifiche, battute, palette, timing, crediti |
| `stateMachine.js` | FSM + scheduler di timer raggruppati |
| `interactions.js` | click/hover/tastiera, tooltip, fumetti, oggetti, audio, pioggia e vapore |
| `roughen.js` | passata "disegnato a mano": tremola i contorni della scena con rumore deterministico |
| `app.js` | bootstrap, rendering, crediti, loop, collegamento fra scena e FSM |

---

## Come è ottenuto lo stile

- **Contorni a mano**: `roughen.js` gira una volta al boot su tutti i 100+ poligoni della scena,
  suddivide ogni spigolo e sposta i punti con un PRNG a seme fisso — il tremolio è deterministico
  (stesso disegno a ogni ricarica) ma non è mai una linea perfettamente retta. Un secondo passaggio
  fuori registro (`data-ink="2"`) ripassa le silhouette principali, come una linea disegnata due volte.
- **Palette**: umbra calda desaturata (`#241D18`…`#6B5238`) su inchiostro quasi nero (`#0B0907`).
  La separazione tra i piani la fa il contorno, non il contrasto dei pieni — per questo i corpi
  possono stare più chiari del fondo senza perdere leggibilità.
- **Ombre**: tratteggio incrociato a penna (`#hatch`, `#hatchCross`, `#hatchTight`) al posto di
  campiture piatte, alla Edward Gorey.
- **Luce**: fasci diagonali e aloni sfocati in `mix-blend-mode: screen` per verde monitor, rosso
  d'allarme e crema della lampada — gli unici tre accenti di colore ammessi nella palette, perché
  nella stanza sono l'unica luce artificiale.
- **Animazioni**: keyframes CSS brevi e `steps()` quasi ovunque (flicker, glitch, alert, camera shake)
  per un movimento secco e nervoso; solo il respiro e i gesti del braccio usano easing morbidi.
- **Testo dei monitor**: HTML posizionato in percentuale sopra l'SVG e inclinato con `rotateX` /
  `rotateY`, calcolato dal rapporto reale fra i lati del pannello disegnato (non un valore a occhio)
  così il testo si agancia esattamente alla prospettiva del vetro.

---

## Accessibilità

- Ogni oggetto della scena è un `role="button"` con `tabindex` e `aria-label`; <kbd>Enter</kbd> e
  <kbd>Spazio</kbd> lo attivano.
- Gli stati non sono comunicati solo dal colore: l'HUD scrive sempre lo stato dell'agente per esteso,
  il terminale usa marcatori testuali (`⚠`, `✓`, `✕`) e la barra crediti mostra il numero.
- Il terminale è un `role="log"` con `aria-live="polite"`.
- Focus sempre visibile (`:focus-visible`), con tratteggio color crema sugli oggetti della scena.
- `prefers-reduced-motion: reduce` azzera animazioni e transizioni.

---

## Estendere

- Nuovi testi: tutto in `data.js` (task, prompt, log, feed, notifiche, `OBJECT_LINES`).
- Nuovo oggetto cliccabile: aggiungi un `<g id="…" class="hot" tabindex="0" role="button">` con un
  `<rect class="hit">` dentro, poi una voce in `TOOLTIPS` e una in `actions` dentro `initInteractions`.
- Nuovo stato: aggiungilo a `STATES` e `TRANSITIONS`, poi crea l'handler `onEnter`/`onExit` in `app.js`.
- Ritmo del loop: `TIMING` e `CREDITS` in `data.js`.

Nessun marchio reale è riprodotto: i nomi (`TERMINALMIND`, `PromptCloud`), la UI del feed e la
schermata di pagamento sono invenzioni parodistiche.
