export type Role = "CIVILIAN" | "UNDERCOVER";

export interface Player {
  id: string;
  name: string;
  role: Role;
  isAlive: boolean;
  word: string;
  score: number;
  eliminatedAtRound?: number; // ronde ke berapa dia dieliminasi
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
  missedVotes: number; // berapa kali civilian salah dieliminasi dalam game ini
}

// ─────────────────────────────────────────────
// GROUP & LEADERBOARD TYPES
// ─────────────────────────────────────────────
export interface PlayerStreak {
  role: Role;
  count: number; // berapa ronde berturut-turut menang dengan peran ini
}

export interface PlayerStats {
  points: number;
  streak: PlayerStreak;
  lastRoundIndex: number; // roundIndex terakhir dia main, untuk deteksi skip
}

export interface GroupData {
  players: string[];                      // nama-nama yang pernah main di grup ini
  leaderboard: Record<string, PlayerStats>;
  roundIndex: number;                     // total ronde yang sudah selesai di grup ini
  createdAt: number;
}

// Delta poin untuk satu pemain, dikirim ke API setelah WINNER
export interface ScoreDelta {
  name: string;
  role: Role;
  points: number;      // base points (sebelum streak bonus)
  won: boolean;
  eliminatedAtRound: number | null; // null = masih hidup sampai akhir
}

export interface SubmitScorePayload {
  roundIndex: number;  // roundIndex grup setelah ronde ini selesai
  deltas: ScoreDelta[];
}