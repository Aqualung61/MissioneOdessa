# Roadmap (Next Steps)

Questo file è una **sintesi** dei prossimi step.
La **fonte di verità operativa** (stato, discussione, assegnazioni, chiusura automatica via PR) deve restare su **GitHub Issues + Milestones**.

Documento operativo (da usare come TODO dettagliato, con HLD/TD/Plan per ogni issue):
- [docs/20260113_nextsteps.md](20260113_nextsteps.md)

## Link rapidi (GitHub)

- Issues aperte: https://github.com/Aqualung61/MissioneOdessa/issues
- Nuova Issue: https://github.com/Aqualung61/MissioneOdessa/issues/new/choose
- Milestones: https://github.com/Aqualung61/MissioneOdessa/milestones
- Nuova Milestone: https://github.com/Aqualung61/MissioneOdessa/milestones/new

Suggerimento: quando apri una PR, usa `Fixes #<id>` nella descrizione per chiudere automaticamente la Issue al merge.

## Milestones suggerite

Milestones già create su GitHub (nomi allineati alla UI):

- **1.3.2 (Stability e UX)**
- **v1.3.3 (i18n + polish)**
- **v1.3.4 (Cross-browser QA)**
- **v1.4.0 (Release readiness)**

## Now (prossima iterazione)

1) **Comandi troppo veloci (race/rapid input): analisi + soluzione**
   - Obiettivo: evitare doppie esecuzioni/desync UI/server quando l’utente invia input molto rapidamente.
   - GitHub: https://github.com/Aqualung61/MissioneOdessa/issues/57

## Done (recent)

- **Parser: validazione e messaggi per comandi non previsti/scorretti**
   - Obiettivo: messaggi coerenti, nessun 500/stack leak, IT/EN allineati.
   - GitHub: https://github.com/Aqualung61/MissioneOdessa/issues/55

- **HELP: ridurre hints (spoiler-free)**
  - Obiettivo: help più “neutro”, con comandi base e pochi esempi non risolutivi.
  - GitHub: https://github.com/Aqualung61/MissioneOdessa/issues/56 (chiusa)

## Next

4) **Debug esteso scoring/intercettazione/game over + invarianti**
   - Obiettivo: definire invarianti (es. punteggio monotono, game-over blocca, contatori coerenti) e aumentare copertura test dove serve.
   - GitHub: https://github.com/Aqualung61/MissioneOdessa/issues/58

5) **i18n: completamento messaggi e label (backend + frontend)**
   - Obiettivo: eliminare chiavi mancanti/fallback, coerenza terminologica IT/EN.
   - GitHub: https://github.com/Aqualung61/MissioneOdessa/issues/59

6) **Cambio lingua in `odessa_storia.html`**
   - Obiettivo: selettore lingua con persistenza (localStorage) e UI coerente.
   - GitHub: https://github.com/Aqualung61/MissioneOdessa/issues/60

## Later

7) **QA cross-browser (Edge/Safari) + mobile**
   - Obiettivo: checklist riproducibile su pagine storia/intro/main, viewport e input.
   - GitHub: https://github.com/Aqualung61/MissioneOdessa/issues/61

8) **Pubblicazione progetto (repo pubblico)**
   - Obiettivo: checklist pre-public (segreti, .env.example, hardening, attribution/licenze, contenuti).
   - GitHub: https://github.com/Aqualung61/MissioneOdessa/issues/62

9) **Quality gate: ESLint complexity rules + refactor funzioni critiche**
   - Obiettivo: rendere misurabile la manutenibilità (limiti ESLint) e ridurre complessità di `executeCommand()`/`ensureVocabulary()`.
   - GitHub: https://github.com/Aqualung61/MissioneOdessa/issues/63

## Convenzioni consigliate (Issues)

- Titoli brevi e azionabili (es. `Parser: messaggi per input invalidi`).
- Labels minime (proposta): `bug`, `enhancement`, `docs`, `i18n`, `parser`, `ux`, `stability`, `cross-browser`, `priority:high|medium|low`.
- Ogni Issue “Next” dovrebbe avere:
  - breve descrizione
  - acceptance criteria (AC)
  - milestone assegnata
