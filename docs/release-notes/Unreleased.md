# Missione Odessa – Release Notes (Unreleased)

Data: TBA
Branch: main

## Sintesi
TBD.

## Modifiche
- Isolamento delle sessioni con factory del motore (#91): ogni sessione usa un'istanza creata da `createEngine()` invece di un modulo ESM distinto. Memoria per sessione da ~210 KB non rilasciati a ~12 KB rilasciati all'evizione. Nessuna modifica di comportamento del gioco.
- Prerequisiti delle interazioni (#93): implementato `FLAG_FALSE`; i prerequisiti possono dichiarare una `risposta` dedicata (`accendi lampada` ora risponde "Non hai la lampada." / "Non hai i fiammiferi per accendere la lampada." / "La lampada è già accesa.", in IT ed EN); un tipo di prerequisito sconosciuto non è soddisfatto e viene segnalato una sola volta; nuovo test di schema su `Interazioni.json`.

## Quality gates
- Build: TBA
- Test (Vitest): TBA

## Note
TBD.