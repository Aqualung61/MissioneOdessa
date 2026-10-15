# Missione Odessa – Release Notes (Unreleased)

Data: TBA
Branch: main

## Sintesi
TBD.

## Modifiche
- Test: percorsi di riferimento del gioco (minimo e completo, IT ed EN), compatibilità dei salvataggi v1.4.0 e verifica del punteggio massimo (138). Nessuna modifica al gioco (#99, #95).
- CI: eseguita anche su push e pull request verso `release/**`.
- Documentazione: test di completamento del gioco, decisioni di fedeltà all'originale e specifica della rete di sicurezza in `docs/`.
- Gioco: timer e sequenza finale dell'originale (#107, #97). Buio: tre turni senza luce, morte solo muovendosi, "È troppo buio per farlo." per le azioni al buio e avviso a ogni turno (R1). Zona aperta: morte al secondo comando consecutivo senza spostamento, avviso a ogni turno (R2). Alba: limite di 200 turni con avvisi a 30, 15 e 5 turni e due morti distinte, in casa o all'aperto (R3). Barriera: luce garantita, arresto al quinto comando senza porgere i documenti, anche arrivando senza documenti (R4, chiude #97). All'incontro con Ferenc spariscono tutti gli oggetti tranne i Documenti in inventario (R11). Testi originali IT con traduzione EN (R12). Specifica: `docs/20261015 - TD Timer e sequenza finale - v1.0.md`.
- Configurazione: `GAME_MAX_TURNS_CONSUMED` diventa solo un override per i test (regola di gioco: 200); in `.env.example` è commentata. Al rilascio va eliminata dalle variabili di produzione.

## Quality gates
- Build: TBA
- Test (Vitest): TBA

## Note
TBD.
