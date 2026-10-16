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
- Gioco: fiammiferi dell'originale (#108). Scorta di 6, consumata a ogni accensione (anche quella della lampada); esauriti, l'oggetto sparisce. `accendi fiammifero`/`accendi fiammiferi` dà luce per il comando successivo, poi si spegne. La lampada accesa fa luce solo dove si trova (in inventario o nel luogo), non più ovunque; un fiammifero acceso evita la morte immediata se si lascia la lampada accesa altrove. Lessico: aggiunto il singolare `fiammifero`/`match`. Specifica: `docs/20261015 - TD Fiammiferi - v1.0.md`.
- Gioco: enigmi e punteggio delle interazioni (#96). Il bastone di comando (ufficio) è ora bloccato dalle macerie: va liberato scavando con il badile prima di poterlo prendere, e si può esaminare solo in mano. Il quadro (biblioteca) è ora prendibile: prenderlo scopre la cassaforte, come già faceva `sposta quadro`, con lo stesso punteggio condiviso (non doppio). Nuovo campo `punteggio` nelle interazioni (assente, `false` o chiave condivisa) e nuovo prerequisito `INVENTARIO_NON_PIENO`. Specifica: `docs/20261015 - TD Enigmi e punteggio - v1.0.md`.
- Lessico: sinonimi e preposizioni dell'originale, lotto L1 (#109). Aggiunti 19 sinonimi/parole vuote del lessico originale: `osserva`/`observe` (= esamina), `gira`/`rotate` (= ruota), `introduci` (= infila), `pigia`/`schiaccia`/`push` (= premi), `sedia`/`chair` (singolare di sedie), `b` (= basso, IT); nuove parole vuote (preposizioni) `alla`, `col`, `con`, `verso` (IT) e `with`, `to`, `towards`, `at` (EN), scartate come gli articoli. In inglese `look`, `examine` e `observe` da soli ora sono validi e descrivono il luogo come `guarda` in italiano (prima: "What do you want?"). Nessun'altra modifica all'analisi dei comandi esistenti, verificata su un corpus di 5.080 casi registrato sulla baseline. Specifica: `docs/20261015 - TD Lessico L1 sinonimi - v1.1.md`.

## Quality gates
- Build: TBA
- Test (Vitest): TBA

## Note
TBD.
