# Missione Odessa – Release Notes (Unreleased)

Data: TBA
Branch: release/v1.4.4

## Sintesi
Il parser riconosce i nomi di oggetto di tre o più parole digitati per intero (#128).

## Modifiche

### Parser
- Nomi di 3 o più parole dopo un verbo d'azione o `carica`/`load`: `esamina bastone di comando`, `prendi lista di servizio`, `esamina banco degli attrezzi`, `esamina arazzo in pessime condizioni`, `esamina trofei alle pareti`, e in inglese `examine tapestry in terrible condition`, `examine trophies on the walls`. Prima davano un errore di struttura; ora hanno la stessa risposta del comando con la voce breve (`esamina bastone`, ecc.) (Refs #128).
- Il nome si riconosce solo se il resto del comando coincide per intero con il nome: `esamina bastone comando` e `esamina bastone di` restano errori di struttura (`di` e `degli` non sono parole ignorate). Per i nomi che contengono parole ignorate (`in`, `alle`, `on`, `the`) sono accettate anche le forme senza di esse o con un'altra parola ignorata.
- Un indice numerico dopo il nome (`esamina bastone di comando 2`) resta non valido.
- Nessuna modifica ai dati di gioco, al frontend, alle API e ai salvataggi.

### Test
- Nuovo `tests/parser.longnouns.test.ts`; aggiornati i test del corpus del parser (`parser.regression`), `lexicon.l3` (TC-03) e le istantanee del parser e delle risposte, con i soli cambi attesi dalla specifica (`docs/20261024 - TD Parser nomi lunghi v1.4.4 - v1.1.md`).

## Quality gates
- Build: TBA
- Test (Vitest): TBA

## Note
Specifica: `docs/20261024 - TD Parser nomi lunghi v1.4.4 - v1.1.md`.
