# Roadmap (Next Steps)

Questo file è una **sintesi** dei prossimi step.
La **fonte di verità operativa** (stato, discussione, assegnazioni, chiusura automatica via PR) deve restare su **GitHub Issues + Milestones**.

## Link rapidi (GitHub)

- Issues aperte: https://github.com/Aqualung61/MissioneOdessa/issues
- Nuova Issue: https://github.com/Aqualung61/MissioneOdessa/issues/new/choose
- Milestones: https://github.com/Aqualung61/MissioneOdessa/milestones
- Nuova Milestone: https://github.com/Aqualung61/MissioneOdessa/milestones/new

Suggerimento: quando apri una PR, usa `Fixes #<id>` nella descrizione per chiudere automaticamente la Issue al merge.

## Milestones suggerite

- **v1.3.2 (Stability + UX)**
- **v1.3.3 (i18n + polish)**
- **v1.3.4 (Cross-browser QA)**
- **v1.4.0 (Release readiness / pubblicazione)**

## Now (prossima iterazione)

1) **Parser: validazione e messaggi per comandi non previsti/scorretti**
   - Obiettivo: messaggi coerenti, nessun 500/stack leak, IT/EN allineati.

2) **HELP: ridurre hints (spoiler-free)**
   - Obiettivo: help più “neutro”, con comandi base e pochi esempi non risolutivi.

3) **Comandi troppo veloci (race/rapid input): analisi + soluzione**
   - Obiettivo: evitare doppie esecuzioni/desync UI/server quando l’utente invia input molto rapidamente.

## Next

4) **Debug esteso scoring/intercettazione/game over + invarianti**
   - Obiettivo: definire invarianti (es. punteggio monotono, game-over blocca, contatori coerenti) e aumentare copertura test dove serve.

5) **i18n: completamento messaggi e label (backend + frontend)**
   - Obiettivo: eliminare chiavi mancanti/fallback, coerenza terminologica IT/EN.

6) **Cambio lingua in `odessa_storia.html`**
   - Obiettivo: selettore lingua con persistenza (localStorage) e UI coerente.

## Later

7) **QA cross-browser (Edge/Safari) + mobile**
   - Obiettivo: checklist riproducibile su pagine storia/intro/main, viewport e input.

8) **Pubblicazione progetto (repo pubblico)**
   - Obiettivo: checklist pre-public (segreti, .env.example, hardening, attribution/licenze, contenuti).

## Convenzioni consigliate (Issues)

- Titoli brevi e azionabili (es. `Parser: messaggi per input invalidi`).
- Labels minime (proposta): `bug`, `enhancement`, `docs`, `i18n`, `parser`, `ux`, `stability`, `cross-browser`, `priority:high|medium|low`.
- Ogni Issue “Next” dovrebbe avere:
  - breve descrizione
  - acceptance criteria (AC)
  - milestone assegnata
