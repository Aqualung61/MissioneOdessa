# QA cross-browser + mobile — checklist riproducibile (intro/storia/main)

Obiettivo: verificare compatibilità e UX su browser principali (Edge/Safari) e su mobile con una smoke checklist breve, ripetibile e versionata.

## Setup (prima di ogni run)

- Commit/tag testato: ________
- Avvio app: `npm install` (solo la prima volta), poi `npm run dev`
- URL base: `http://localhost:3001/` (oppure sotto `BASE_PATH` se configurato)
- Modalità test consigliata:
  - 1 run in profilo pulito (Incognito / nuovo profilo)
  - 1 run con storage già popolato (dopo aver giocato 2-3 comandi)
- Pulizia:
  - hard refresh
  - svuota cache e site data se serve ripetibilità

## Matrice ambienti (minimo richiesto)

- Desktop:
  - [ ] Edge (Windows)
  - [ ] Safari (macOS) oppure Safari (iOS) se disponibile
- Mobile (almeno 1):
  - [ ] Device reale (preferito) oppure emulazione credibile

Viewports consigliati (se usi DevTools):
- [ ] 360×740 (Android small)
- [ ] 390×844 (iPhone 12/13/14)
- [ ] 768×1024 (tablet portrait)
- [ ] 1366×768 (desktop)

## Smoke — pagine intro/storia/main (eseguire in ordine)

### A) Intro

- [ ] Rendering ok: nessun overflow orizzontale, niente elementi tagliati
- [ ] Call-to-action / navigazione: entra nella storia o nella main correttamente
- [ ] Back/Forward del browser: non rompe lo stato (nessuna pagina “bianca”)
- [ ] Accessibilità base: focus visibile, navigazione da tastiera non bloccata

### B) Storia

- [ ] Layout leggibile: testo non sovrapposto, font leggibili
- [ ] Scroll ok: non scatta, non “rimbalza” in modo anomalo
- [ ] Rotazione (mobile): portrait ↔ landscape senza glitch evidenti
- [ ] Navigazione verso main: funziona con click/tap e tastiera

### C) Main (gameplay)

Input e focus:
- [ ] Focus iniziale su input comandi (o almeno 1 tap lo attiva in modo chiaro)
- [ ] Digitazione ok + Invio invia il comando
- [ ] Focus non si perde dopo l’esecuzione del comando (a meno di motivi UX)

Comportamento UI:
- [ ] Nessun errore in console (o errori noti/documentati)
- [ ] UI non “salta” quando compare la tastiera on-screen (mobile)
- [ ] Nessun elemento essenziale coperto da notch/safe-area (iOS)

Persistenza/sessione (se applicabile):
- [ ] Refresh pagina: comportamento coerente (ripresa stato o reset, ma prevedibile)
- [ ] Nuova tab o nuova sessione: non contaminano lo stato di sessioni diverse

## Verifiche cross-browser specifiche (Safari/mobile)

Autoplay/media:
- [ ] Se esiste audio: nessun autoplay bloccante; eventuale fallback o CTA per avviare audio

Focus + tastiera (iOS/Android):
- [ ] L’input resta usabile dopo scroll e dopo invio comando
- [ ] La pagina non rimane “zoomata” o con layout spezzato dopo focus/blur

Storage:
- [ ] localStorage/sessionStorage: nessun crash in private mode / restrizioni Safari
- [ ] Eventuali errori storage sono gestiti con fallback (messaggio o degradazione)

Caching:
- [ ] Hard refresh carica asset aggiornati (nessun comportamento “vecchio” persistente)

## Annotazione risultati (run log)

Compila una riga per ogni ambiente testato.

| Data | Commit | Browser | Versione | Device | Viewport | Esito | Note / link issue |
|------|--------|---------|----------|--------|----------|------|------------------|
| 2026-01-18 | 2003094 | Chrome | 144.0.7559.59 (Build ufficiale) (64 bit) | Windows 11 Pro 10.0.26200 (build 26200) | n/a | OK | Smoke intro/storia/main |
| 2026-01-18 | 2003094 | MS Edge | 144.0.3719.82 (Build ufficiale) beta (64 bit) | Windows 11 Pro 10.0.26200 (build 26200) | n/a | OK | Smoke intro/storia/main |
| 2026-01-18 | 2003094 | Chrome | 143.0.7499.192 | Android 16 — SM-A256B (BP2A.250605.031.A3) | n/a | OK | Smoke intro/storia/main |
| 2026-01-18 | 2003094 | Internet Samsung | v29.01.12 | Android 16 — SM-A256B (BP2A.250605.031.A3) | n/a | OK | Smoke intro/storia/main |
| n/d | n/d | Safari | n/d | n/d | n/a | OK | Test eseguito nei giorni scorsi (dettagli non disponibili al momento) |
|      |        |         |          |        |          | OK/KO |                  |

## Se trovi un bug (regola pratica)

- Apri una issue separata usando il template “QA bug (cross-browser/mobile)”.
- Includi sempre: passi numerati, expected vs actual, browser+versione, device+viewport, screenshot/console log.
- Se KO solo su Safari/mobile, indicarlo nel titolo e nei label.
