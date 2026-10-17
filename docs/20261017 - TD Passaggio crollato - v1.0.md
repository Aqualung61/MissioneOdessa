# TD — Passaggio crollato nel sotterraneo (32 → 36)

| Campo | Valore |
|---|---|
| Documento | Specifica tecnica (TD) |
| Versione | v1.0 — approvata (2026-10-17, decisioni F1–F4 come proposte) |
| Data | 2026-10-17 |
| Issue | da creare nella milestone v1.4.1 (Fase 0 dell'handoff) |
| Riferimenti | Sorgente `missione_odessa.bas`, righe 330–340 e 5160–5210; decisione E7 del lotto L3 (superata da questa specifica) |
| Baseline | `release/v1.4.1` @ `f675ef4` |
| Modello consigliato | Claude Sonnet 5.5: Fase 1A effort alto; 1B e 2 medio |

## 0. Decisioni (approvate)

| # | Punto | Proposta |
|---|---|---|
| F1 | Quando avviene il crollo | Al **primo** passaggio da 32 a sud (36), come l'originale: si mostra il racconto del crollo, poi la descrizione del 36 |
| F2 | Dopo il crollo, `s` dal 32 | Bloccato: "Non puoi passare: il passaggio è crollato." / "You can't get through: the passage has collapsed." (BAS 5160) |
| F3 | Descrizione del 32 dopo il crollo | **Invariata** ("Sei in uno stretto passaggio."). L'originale aggiungeva "Il soffitto è crollato a sud.", ma le descrizioni del porting sono fisse; il messaggio di F2 basta |
| F4 | Descrizione del 36 | Fissa, breve: "Sei in uno stretto passaggio. Il soffitto è crollato a nord." / "You are in a narrow passage. The ceiling has collapsed to the north." (BAS 340). Il racconto del crollo esce solo da F1 |

## 1. Valutazione del rischio di regressione

**Basso.** Cambia un solo movimento (32 → sud) e la descrizione di un luogo. I percorsi di riferimento passano 32 → 36 una sola volta (passo 81) e non tornano al 32: luoghi, turni e punteggio invariati. Nessuno dei 7 punti dell'istantanea delle risposte si trova al 32 o al 36. Salvataggi: un salvataggio che ha già visitato il 36 deve risultare "crollato" (§3).

## 2. Comportamento

| Situazione | Oggi | Dopo |
|---|---|---|
| Primo `s` dal 32 | Entra al 36; la descrizione del 36 contiene il racconto del crollo | Entra al 36; si mostra il racconto del crollo (testo attuale della prima parte della descrizione del 36), poi la descrizione breve di F4 |
| `s` dal 32, crollo già avvenuto | Entra di nuovo al 36 e rivede il crollo | Resta al 32: messaggio di F2; il turno si consuma come ogni movimento bloccato |
| Ingresso al 36 da altre direzioni (39, 41, 37) | Descrizione con il racconto del crollo | Descrizione breve di F4 |
| `n` dal 36 | Bloccato | Invariato |

Testi del racconto (dalla descrizione attuale del 36, senza le ultime due frasi):
- IT: "Appena ti lasci alle spalle il tratto di passaggio, questo crolla: sei stato fortunato a non restare sepolto dal crollo ma da quella parte ora non si può più passare."
- EN: "As soon as you leave the stretch of passage behind you, it collapses. You were lucky not to be buried by the cave-in, but you can't go back that way anymore."

## 3. Stato e salvataggi

- Nuovo flag `flags.passaggioCrollato` (falso all'inizio), impostato al primo passaggio di F1.
- Caricamento di un salvataggio senza il flag (v1.4.0, v1.4.1 attuale): vero se `visitedPlaces` contiene 36, altrimenti falso (stesso schema dei flag di #96).
- Un salvataggio con il flag deve restare caricabile nella v1.4.0 (il campo in più viene ignorato): da verificare come per i flag di #96.

## 4. Test

`tests/passage.collapse.test.ts`, in IT ed EN:

| ID | Caso | Atteso |
|---|---|---|
| TP-01 | Percorso fino al passo 80 (al 32), `s` | Luogo 36; messaggio con il racconto del crollo; flag vero |
| TP-02 | Percorso fino al passo 84 (`infila medaglione` al 36), poi `o`, `o`, `n`, `n`, `e`, `e` (36 → 37 → 27 → 28 → 29 → 30 → 32, verificato sul codice attuale), poi `s` | Resta al 32; messaggio di F2; turno consumato |
| TP-03 | `guarda` al 36 | Descrizione breve di F4, senza il racconto |
| TP-04 | `n` dal 36 | Bloccato, come oggi |
| TP-05 | Salvataggio con 36 visitato e senza flag | Dopo il caricamento il flag è vero; `s` dal 32 è bloccato |
| TP-06 | Percorsi completi e punteggio 138 | Invariati (test protetti) |

Istantanea delle risposte e corpus del parser: attesi **invariati**; ogni differenza va segnalata.

## 5. Prova manuale (Mauro, `localhost:3001`)

| # | Prova | Atteso |
|---|---|---|
| M1 | Salvataggio prima del 32 (o partita fino al 32): `s` | Racconto del crollo, poi "Sei in uno stretto passaggio. Il soffitto è crollato a nord." |
| M2 | Dopo `infila medaglione` al 36: `o`, `o`, `n`, `n`, `e`, `e`, poi `s` | "Non puoi passare: il passaggio è crollato." |

## 6. Criteri di accettazione

Lint, build, typecheck, test PASS; test protetti, corpus e istantanea invariati; TP-01…TP-06 PASS; prova manuale PASS.
