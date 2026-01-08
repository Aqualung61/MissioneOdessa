/**
 * Type definitions for Game State (Sprint 3.3.5)
 * 
 * Definizioni TypeScript per la struttura Turn System v3.0
 */

export interface TurnCurrent {
  parseResult: any | null;
  consumesTurn: boolean;
  location: number;
  hasLight: boolean;
  inDangerZone: boolean;
}

export interface TurnPrevious {
  location: number;
  hasLight: boolean;
  consumedTurn: boolean;
  inDangerZone: boolean;
}

export interface TurnState {
  globalTurnNumber: number;
  totalTurnsConsumed: number;
  turnsInDarkness: number;
  turnsInDangerZone: number;
  current: TurnCurrent;
  previous: TurnPrevious;
}

export interface GameState {
  currentLocationId: number;
  currentLingua: number;
  Oggetti: any[];
  ended: boolean;
  awaitingRestart: boolean;
  awaitingContinue: boolean;
  victory: boolean;
  movementBlocked: boolean;
  unusefulCommandsCounter: number;
  narrativeState: string | null;
  narrativePhase: number;
  timers: {
    torciaDifettosa: boolean;
    lampadaAccesa: boolean;
    azioniInLuogoPericoloso: number;
    ultimoLuogoPericoloso: number | null;
  };
  turn: TurnState;
}
