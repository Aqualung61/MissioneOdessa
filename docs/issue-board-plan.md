# Issue board – piano e convenzioni

Questo documento definisce struttura, etichette e flusso del board (GitHub Projects) per Missione Odessa.

## Colonne suggerite
- Backlog (inbox, non prioritarie)
- Ready (prioritizzate e definite)
- In progress
- In review (PR aperta)
- Done (rilasciate su main)

## Etichette standard
- type:feature | type:bug | type:chore | type:docs | type:test
- area:parser | area:engine | area:db | area:ui | area:api | area:ci
- priority:P0 | P1 | P2 | P3
- triage (nuove issue da classificare)

## Milestone
- Next release (prossima iterazione significativa)
- Unreleased (attività correnti non ancora pianificate in una release)

## Regole rapide
- Ogni issue ha accettazione chiara; link a PR quando aperta.
- Quando si apre una PR, spostare l'issue in “In review”.
- Chiudere l’issue solo quando la PR è mergiata su main (Done).

## Backlog iniziale (proposta)
1. feat: Persistenza stato di gioco (snapshot per sessione) [area:engine, priority:P1]
2. feat: Verbi aggiuntivi (PARLA/USA/DAI/SPINGI/TIRA, ecc.) [area:engine, priority:P2]
3. feat: Disambiguazione NOUN e prompt "quale?" [area:parser, priority:P1]
4. chore: CI GitHub Actions (lint, typecheck, test) [area:ci, priority:P1]
5. chore: Logging strutturato e healthcheck [area:api, priority:P2]
6. test: E2E Playwright scenari base [area:test, priority:P2]
