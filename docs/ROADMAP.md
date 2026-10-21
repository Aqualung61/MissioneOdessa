# Roadmap

Sintesi breve. La **fonte di verità** (stato, discussione, assegnazioni) sono **GitHub Issues e Milestones**; questo file si aggiorna a ogni rilascio.

- Issues aperte: https://github.com/Aqualung61/MissioneOdessa/issues
- Milestones: https://github.com/Aqualung61/MissioneOdessa/milestones
- Piano operativo di gennaio 2026, conservato come **storico**: [20260113_nextsteps.md](20260113_nextsteps.md)

## Fatto

- **v1.4.2 — Refactor del motore:** motore, parser e configurazione riorganizzati a comportamento invariato, endpoint legacy rimossi, ESLint di complessità bloccante (#63, #123, #124, #125, #126). [Note](release-notes/2026-10-21_v1.4.2.md)
- **v1.4.1 — Fedeltà all'originale:** regole, enigmi, punteggio, lessico e risposte dal sorgente BASIC del 1986. [Note](release-notes/2026-10-17_v1.4.1.md)
- **v1.4.0 — Stabilità:** sessioni isolate, robustezza, difetti. [Note](release-notes/2026-10-15_v1.4.0.md)

## Prossimo (milestone v1.4.3 — Parser: nomi composti)

- #128 — Parser: nomi di 3+ parole e preposizione "di".
- #137 — `help` EN: voci in maiuscolo.

## Dopo (senza milestone)

- #127 — Frontend: `executeCommandOnServer`.
- #129 — Candidati dalla traccia del lotto 0.
- #138 — Frontend: messaggi dedicati per 409 `LANGUAGE_MISMATCH` e 429 `RATE_LIMITED`.
- #139 — Motore: candidati emersi dal refactor v1.4.2.
- #140 — API: candidati di gestione degli errori.

## Convenzioni

- Un'issue per ogni lavoro eseguibile, con criteri di accettazione e milestone.
- Etichette: `type:*`, `area:*`, `priority:P*`.
- Le PR di lotto usano `Refs #<n>`; `Fixes #<n>` solo nella PR finale verso `main`.
