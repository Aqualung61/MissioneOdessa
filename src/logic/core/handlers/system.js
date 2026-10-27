// Gestore generico di SYSTEM.
// Il lessico ha solo i 6 concetti gestiti; un caso residuo cade nel
// ripiego di `dispatch`.

// Concetti di SISTEMA gestiti (confrontati con il lessico).
export const HANDLED_SYSTEM_CONCEPTS = [
  'INVENTARIO',
  'AIUTO',
  'SALVARE',
  'CARICARE',
  'PUNTI',
  'FINE',
];

// 5 — core.system
export const system = {
  id: 'core.system',
  types: ['SYSTEM'],
  run: (cmd, ctx) => {
    const { concept } = cmd;
    const gameState = ctx.state;
    switch (concept) {
      case 'INVENTARIO': {
        const inventoryItems = (gameState.Oggetti || []).filter(
          (item) =>
            item.Attivo >= 3 && item.IDLuogo === 0 && item.IDLingua === gameState.currentLingua
        );
        if (inventoryItems.length === 0) {
          return {
            accepted: true,
            resultType: 'OK',
            message: ctx.msg('engine.inventory.empty'),
            effects: [],
            showLocation: true,
          };
        }
        const itemNames = inventoryItems.map((item) => item.Oggetto).join(', ');
        return {
          accepted: true,
          resultType: 'OK',
          message: ctx.msg('engine.inventory.list', [itemNames]),
          effects: [],
          showLocation: true,
        };
      }
      case 'AIUTO': {
        const message = ctx.helpers.generateHelpMessage(gameState.currentLingua);
        return { accepted: true, resultType: 'OK', message, effects: [], showLocation: true };
      }
      case 'SALVARE': {
        return {
          accepted: true,
          resultType: 'SAVE_GAME',
          message: ctx.msg('engine.save.inProgress'),
          effects: [],
        };
      }
      case 'CARICARE':
        return {
          accepted: true,
          resultType: 'LOAD_GAME',
          message: ctx.msg('engine.load.inProgress'),
          effects: [],
        };
      case 'PUNTI': {
        // § 3.2.3 Task 6: Display score with rank and breakdown (i18n ready)
        const totale = gameState.punteggio.totale;
        const visitedPlaces = gameState.visitedPlaces.size;
        const interazioni = gameState.punteggio.interazioniPunteggio.size;
        const misteri = gameState.punteggio.misteriRisolti.size;

        // Ranghi basati su soglie (localizzati)
        const rangoKey = ctx.game.rules.rankKey(totale);

        const rango = ctx.msg(rangoKey);
        const breakdown = ctx.msg('engine.score.breakdown', [
          totale.toString(),
          rango,
          visitedPlaces.toString(),
          interazioni.toString(),
          misteri.toString(),
        ]);
        return {
          accepted: true,
          resultType: 'OK',
          message: breakdown,
          effects: [],
          showLocation: true,
        };
      }
      case 'FINE':
        gameState.awaitingEndConfirm = true;
        return {
          accepted: true,
          resultType: 'CONFIRM_END',
          message: ctx.msg('engine.end.confirm'),
          effects: [],
        };
      default:
        return null;
    }
  },
};
