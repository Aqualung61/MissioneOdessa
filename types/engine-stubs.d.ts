declare module "../src/logic/engine.js" {
  export interface EngineVerbInfo {
    canonical: string;
    termId: number | null;
    concept: string | null;
  }
  export interface EngineNounInfo {
    canonical: string;
    termId: number | null;
    concept: string | null;
    index: number | null;
  }
  export interface CommandDTO {
    original: string;
    normalized: string;
    type: string;
    verb: EngineVerbInfo | null;
    noun: EngineNounInfo | null;
  }
  export interface EngineResult {
    accepted: boolean;
    resultType: "OK" | "ERROR";
    message: string;
    effects?: any[];
  }
  export function toCommandDTO(parseResult: any): CommandDTO | null;
  export function executeCommand(parseResult: any): EngineResult;
  export function resetGameState(): void;
  export function getGameStateSnapshot(): { roomItems: string[]; inventory: string[] };
}
declare module "../src/logic/messages.js" {
  export function mapParseErrorToUserMessage(parseResult: any): string;
}
