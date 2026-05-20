export type Role = "CIVILIAN" | "UNDERCOVER";

export interface Player {
  id: string;
  name: string;
  role: Role;
  isAlive: boolean;
  word: string;
  score: number;
}

export type GamePhase = "SETUP" | "ROLES" | "DISCUSSION" | "VOTING" | "RESULT" | "WINNER";

export interface Card {
  id: number;
  role: Role;
  word: string;
  isTaken: boolean;
  playerName?: string;
}

export interface GameState {
  players: Player[];
  phase: GamePhase;
  winner?: "CIVILIANS" | "UNDERCOVERS";
  round: number;
  cardPool: Card[];
  wordPair?: {
    civilian: string;
    undercover: string;
  };
  pickingOrder?: string[];
  currentPickerIndex?: number;
  starterPlayerId?: string;
}
