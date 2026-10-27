# Roadmap

Sintesi breve. La **fonte di verità** (stato, discussione, assegnazioni) sono **GitHub Issues e Milestones**; questo file si aggiorna a ogni rilascio.

- Issues aperte: https://github.com/Aqualung61/MissioneOdessa/issues
- Milestones: https://github.com/Aqualung61/MissioneOdessa/milestones
- Piano operativo di gennaio 2026, conservato come **storico**: [20260113_nextsteps.md](20260113_nextsteps.md)

## Fatto

- **v1.4.5 — CI, Node 24 e qualità:** CI su Node 22 e 24, produzione su Node 24, `aiuto` in italiano all'imperativo, suite di test e commenti ripuliti, Prettier con `format:check` in CI (#158, #160, #162, #164, #165, #168, #170, #172). [Note](release-notes/2026-10-27_v1.4.5.md)
- **v1.4.4 — Parser: nomi composti:** riconoscimento dei nomi di oggetto di 3+ parole (#128). [Note](release-notes/2026-10-26_v1.4.4.md)
- **v1.4.3 — Sicurezza e testi:** lock npm aggiornato, `help` EN con iniziale maiuscola, test del limitatore di frequenza (#137, #144, #147). [Note](release-notes/2026-10-24_v1.4.3.md)
- **v1.4.2 — Refactor del motore:** motore, parser e configurazione riorganizzati a comportamento invariato, endpoint legacy rimossi, ESLint di complessità bloccante (#63, #123, #124, #125, #126). [Note](release-notes/2026-10-21_v1.4.2.md)
- **v1.4.1 — Fedeltà all'originale:** regole, enigmi, punteggio, lessico e risposte dal sorgente BASIC del 1986. [Note](release-notes/2026-10-17_v1.4.1.md)
- **v1.4.0 — Stabilità:** sessioni isolate, robustezza, difetti. [Note](release-notes/2026-10-15_v1.4.0.md)

## Dopo (senza milestone)

- #150 — Test: instabilità sporadica di `tests/engine.examine-open.test.ts` (`VociLessico` non definita in `beforeAll`), preesistente.
- #127 — Frontend: `executeCommandOnServer`.
- #129 — Candidati dalla traccia del lotto 0.
- #138 — Frontend: messaggi dedicati per 409 `LANGUAGE_MISMATCH` e 429 `RATE_LIMITED`.
- #139 — Motore: candidati emersi dal refactor v1.4.2.
- #140 — API: candidati di gestione degli errori.

## Convenzioni

- Un'issue per ogni lavoro eseguibile, con criteri di accettazione e milestone.
- Etichette: `type:*`, `area:*`, `priority:P*`.
- Le PR di lotto usano `Refs #<n>`; `Fixes #<n>` solo nella PR finale verso `main`.
