# Missione Odessa – Release Notes (Unreleased)

Data: TBA
Branch: main

## Sintesi
TBD.

## Modifiche
- Isolamento delle sessioni con factory del motore (#91): ogni sessione usa un'istanza creata da `createEngine()` invece di un modulo ESM distinto. Memoria per sessione da ~210 KB non rilasciati a ~12 KB rilasciati all'evizione. Nessuna modifica di comportamento del gioco.

## Quality gates
- Build: TBA
- Test (Vitest): TBA

## Note
TBD.