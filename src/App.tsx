import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  Play, 
  Trash2, 
  ChevronRight, 
  Vote, 
  Trophy, 
  RotateCcw,
  Skull,
  User,
  Heart,
  Ghost,
  Home as HomeIcon,
  Search,
  Eye,
  X,
  RefreshCw,
  AlertTriangle,
  WifiOff,
} from "lucide-react";
import { Player, GameState, GamePhase, Role, Card, GroupData, ScoreDelta, SubmitScorePayload } from "./types";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const STORAGE_KEYS = {
  PLAYERS:    "undercover_v3_players",
  LEADERBOARD:"undercover_v3_leaderboard",
  SNAPSHOT:   "undercover_v3_snapshot",
  SETUP:       "undercover_v3_setup",
  GROUP:       "undercover_v3_group",
} as const;

const ACTIVE_PHASES: GamePhase[] = ["ROLES", "DISCUSSION", "VOTING", "RESULT"];

const INITIAL_STATE: GameState = {
  players: [],
  phase: "SETUP",
  round: 1,
  cardPool: [],
  missedVotes: 0,
};

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type ApiError = "network" | "server" | "empty" | null;

interface SetupPrefs {
  civilianTarget: number;
  undercoverTarget: number;
}

interface SnapshotPayload {
  gameState: GameState;
  showPickedCard: boolean;
  pickedCard: { role: Role; word: string } | null;
  showRevealReady: boolean;
  currentRevealingName: string;
  eliminatedPlayer: Player | null;
  isRestarting: boolean;
  civilianTarget: number;
  undercoverTarget: number;
  savedAt: number;
}

// ─────────────────────────────────────────────
// HELPERS — safe localStorage wrappers
// ─────────────────────────────────────────────
function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded or private-browsing restriction — fail silently
  }
}

function lsClear(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch { /* noop */ }
}


// ─────────────────────────────────────────────
// FISHER-YATES SHUFFLE — unbiased
// ─────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─────────────────────────────────────────────
// HOOK — game persistence
// ─────────────────────────────────────────────
function useGamePersistence() {
  const saveSnapshot = useCallback((payload: Omit<SnapshotPayload, "savedAt">) => {
    lsSet(STORAGE_KEYS.SNAPSHOT, { ...payload, savedAt: Date.now() });
  }, []);

  const loadSnapshot = useCallback((): SnapshotPayload | null => {
    return lsGet<SnapshotPayload | null>(STORAGE_KEYS.SNAPSHOT, null);
  }, []);

  const clearSnapshot = useCallback(() => {
    lsClear(STORAGE_KEYS.SNAPSHOT);
  }, []);

  return { saveSnapshot, loadSnapshot, clearSnapshot };
}

// ─────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────
export default function App() {
  // ── Core game state ──────────────────────────
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [newName, setNewName] = useState("");
  const [showPickedCard, setShowPickedCard] = useState(false);
  const [pickedCard, setPickedCard] = useState<{ role: Role; word: string } | null>(null);
  const [eliminatedPlayer, setEliminatedPlayer] = useState<Player | null>(null);
  const [civilianTarget, setCivilianTarget] = useState<number>(() =>
    lsGet<SetupPrefs>(STORAGE_KEYS.SETUP, { civilianTarget: 3, undercoverTarget: 1 }).civilianTarget
  );
  const [undercoverTarget, setUndercoverTarget] = useState<number>(() =>
    lsGet<SetupPrefs>(STORAGE_KEYS.SETUP, { civilianTarget: 3, undercoverTarget: 1 }).undercoverTarget
  );
  const [view, setView] = useState<"GAME" | "LEADERBOARD">("GAME");
  const [namingPlayerCardId, setNamingPlayerCardId] = useState<number | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [showRevealReady, setShowRevealReady] = useState(false);
  const [currentRevealingName, setCurrentRevealingName] = useState("");
  const [playerToEliminate, setPlayerToEliminate] = useState<Player | null>(null);
  const [playerToPeek, setPlayerToPeek] = useState<Player | null>(null);
  const [isPeeking, setIsPeeking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isRefreshConfirmOpen, setIsRefreshConfirmOpen] = useState(false);
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const [showBackHomeConfirm, setShowBackHomeConfirm] = useState(false);
  const [showDeleteHistoryConfirm, setShowDeleteHistoryConfirm] = useState<string | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [apiError, setApiError] = useState<ApiError>(null);
  const [totalWordPairs, setTotalWordPairs] = useState<number | null>(null);

  // ── Persistence state ─────────────────────────
  const [pastPlayers, setPastPlayers] = useState<string[]>(() =>
    lsGet<string[]>(STORAGE_KEYS.PLAYERS, [])
  );
  const [leaderboard, setLeaderboard] = useState<Record<string, number>>(() =>
    lsGet<Record<string, number>>(STORAGE_KEYS.LEADERBOARD, {})
  );
  const [groupCode, setGroupCode] = useState<string>(() => lsGet<string>(STORAGE_KEYS.GROUP, ""));
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [isLoadingGroup, setIsLoadingGroup] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  // Resume banner: shown when there is a valid mid-game snapshot
  const [pendingResume, setPendingResume] = useState<SnapshotPayload | null>(null);

  const { saveSnapshot, loadSnapshot, clearSnapshot } = useGamePersistence();

  // Ref used by beforeunload — always reflects latest gameState.phase
  const gamePhaseRef = useRef<GamePhase>(gameState.phase);
  useEffect(() => {
    gamePhaseRef.current = gameState.phase;
  }, [gameState.phase]);

  // ─────────────────────────────────────────────
  // API HELPER — defined early, used by useEffects below
  // ─────────────────────────────────────────────
  const fetchWordPair = useCallback(async (): Promise<{ civilian: string; undercover: string; totalPairs: number }> => {
    const attempt = async (retries = 2): Promise<Response> => {
      try {
        const res = await fetch("/api/random-pair");
        if (!res.ok && retries > 0) return attempt(retries - 1);
        return res;
      } catch (e) {
        if (retries > 0) return attempt(retries - 1);
        throw e;
      }
    };
    let res: Response;
    try { res = await attempt(); } catch { throw new Error("network"); }
    if (res.status === 503) throw new Error("empty");
    if (!res.ok) throw new Error("server");
    return res.json();
  }, []);

  // ── On mount: check for resumable snapshot ────
  useEffect(() => {
    const snapshot = loadSnapshot();
    if (snapshot && ACTIVE_PHASES.includes(snapshot.gameState.phase)) {
      setPendingResume(snapshot);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── On mount: re-fetch group data if groupCode saved ──
  useEffect(() => {
    if (!groupCode) return;
    fetchGroup(groupCode).then((data) => {
      if (data) setGroupData(data);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch word-pair count ─────────────────────
  useEffect(() => {
    fetchWordPair()
      .then((data) => { if (data.totalPairs) setTotalWordPairs(data.totalPairs); })
      .catch(() => { /* non-critical, silent fail */ });
  }, [fetchWordPair]);

  // ── Persist leaderboard & pastPlayers ─────────
  useEffect(() => { lsSet(STORAGE_KEYS.LEADERBOARD, leaderboard); }, [leaderboard]);
  useEffect(() => { lsSet(STORAGE_KEYS.PLAYERS, pastPlayers); }, [pastPlayers]);
  useEffect(() => {
    if (groupCode) lsSet(STORAGE_KEYS.GROUP, groupCode);
    else lsClear(STORAGE_KEYS.GROUP);
  }, [groupCode]);
  useEffect(() => {
    lsSet(STORAGE_KEYS.SETUP, { civilianTarget, undercoverTarget });
  }, [civilianTarget, undercoverTarget]);

  // ── Auto-save snapshot when game is active ────
  useEffect(() => {
    if (!ACTIVE_PHASES.includes(gameState.phase)) return;
    saveSnapshot({
      gameState,
      showPickedCard,
      pickedCard,
      showRevealReady,
      currentRevealingName,
      eliminatedPlayer,
      isRestarting,
      civilianTarget,
      undercoverTarget,
    });
  }, [
    gameState, showPickedCard, pickedCard,
    showRevealReady, currentRevealingName, eliminatedPlayer,
    isRestarting, civilianTarget, undercoverTarget, saveSnapshot,
  ]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (ACTIVE_PHASES.includes(gamePhaseRef.current)) {
        e.preventDefault();
        // Modern browsers show their own generic message; setting returnValue
        // is required for the dialog to appear in most browsers.
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // ─────────────────────────────────────────────
  // RESUME HANDLER
  // ─────────────────────────────────────────────
  const handleResume = () => {
    if (!pendingResume) return;
    // Sanitize snapshot — old snapshots may not have missedVotes
    const restoredState: GameState = {
      ...pendingResume.gameState,
      missedVotes: pendingResume.gameState.missedVotes ?? 0,
    };
    setGameState(restoredState);
    setShowPickedCard(pendingResume.showPickedCard);
    setPickedCard(pendingResume.pickedCard);
    setShowRevealReady(pendingResume.showRevealReady);
    setCurrentRevealingName(pendingResume.currentRevealingName);
    setEliminatedPlayer(pendingResume.eliminatedPlayer);
    setIsRestarting(pendingResume.isRestarting);
    setCivilianTarget(pendingResume.civilianTarget);
    setUndercoverTarget(pendingResume.undercoverTarget);
    setPendingResume(null);
  };

  const handleDismissResume = () => {
    clearSnapshot();
    setPendingResume(null);
  };


  // ─────────────────────────────────────────────
  // GROUP API HELPERS
  // ─────────────────────────────────────────────
  const fetchGroup = useCallback(async (code: string): Promise<GroupData | null> => {
    if (!code.trim()) return null;
    try {
      const res = await fetch(`/api/group/${code.toUpperCase()}`);
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }, []);

  const joinGroup = async (code: string) => {
    const trimmed = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (trimmed.length < 2) {
      setGroupError("Kode minimal 2 karakter");
      return;
    }
    setIsLoadingGroup(true);
    setGroupError(null);
    try {
      const data = await fetchGroup(trimmed);
      setGroupCode(trimmed);
      setGroupData(data);
    } catch {
      setGroupError("Gagal terhubung ke server");
    } finally {
      setIsLoadingGroup(false);
    }
  };

  const submitGroupScore = useCallback(async (payload: SubmitScorePayload) => {
    if (!groupCode) return;
    try {
      await fetch(`/api/group/${groupCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await fetchGroup(groupCode);
      if (updated) setGroupData(updated);
    } catch (err) {
      console.error("[submitGroupScore]", err);
    }
  }, [groupCode, fetchGroup]);

  // ─────────────────────────────────────────────
  // GAME ACTIONS
  // ─────────────────────────────────────────────
  const startGame = async () => {
    const playerCount = civilianTarget + undercoverTarget;
    if (playerCount < 3 || isStartingGame) return;

    setIsStartingGame(true);
    setApiError(null);

    try {
      const wordPair = await fetchWordPair();

      const roles: Role[] = [
        ...Array(civilianTarget).fill("CIVILIAN" as Role),
        ...Array(undercoverTarget).fill("UNDERCOVER" as Role),
      ];
      const shuffledRoles = shuffle(roles);
      const cardPool: Card[] = shuffledRoles.map((role, idx) => ({
        id: idx,
        role,
        word: role === "UNDERCOVER" ? wordPair.undercover : wordPair.civilian,
        isTaken: false,
      }));

      const pickingOrder = shuffle(
        gameState.players
          .slice(0, playerCount)
          .map((p) => p.id)
      );

      setGameState((prev) => ({
        ...prev,
        players: prev.players
          .slice(0, playerCount)
          .map((p) => ({ ...p, isAlive: true, word: "", role: "CIVILIAN" })),
        wordPair,
        cardPool,
        phase: "ROLES",
        round: 1,
        pickingOrder,
        currentPickerIndex: 0,
        starterPlayerId: undefined,
      }));
      setIsRestarting(gameState.players.length > 0);
      setShowPickedCard(false);
      setPickedCard(null);
      setNamingPlayerCardId(null);
      // Dismiss any stale resume banner when starting fresh
      setPendingResume(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "unknown";
      setApiError(msg === "network" ? "network" : msg === "empty" ? "empty" : "server");
    } finally {
      setIsStartingGame(false);
    }
  };

  const refreshWords = async () => {
    setIsRefreshConfirmOpen(false);
    setApiError(null);
    try {
      const wordPair = await fetchWordPair();

      setGameState((prev) => {
        const playerCount = isRestarting ? prev.players.length : prev.cardPool.length;
        const uCount = Math.max(1, Math.floor(playerCount / 3));
        const cCount = playerCount - uCount;

        const roles: Role[] = shuffle([
          ...Array(cCount).fill("CIVILIAN" as Role),
          ...Array(uCount).fill("UNDERCOVER" as Role),
        ]);

        const newCardPool: Card[] = roles.map((role, idx) => ({
          id: idx,
          role,
          word: role === "UNDERCOVER" ? wordPair.undercover : wordPair.civilian,
          isTaken: false,
        }));

        const updatedPlayers = prev.players.map((p) => ({
          ...p,
          isAlive: true,
          word: "",
          role: "CIVILIAN" as Role,
        }));
        const finalizedPlayers = isRestarting ? updatedPlayers : [];
        const pickingOrder =
          finalizedPlayers.length > 0
            ? finalizedPlayers.map((p) => p.id).sort(() => Math.random() - 0.5)
            : undefined;

        return {
          ...prev,
          wordPair,
          cardPool: newCardPool,
          players: finalizedPlayers,
          phase: "ROLES",
          round: 1,
          pickingOrder,
          currentPickerIndex: 0,
          starterPlayerId: undefined,
        };
      });
      setShowPickedCard(false);
      setPickedCard(null);
      setNamingPlayerCardId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "unknown";
      setApiError(msg === "network" ? "network" : msg === "empty" ? "empty" : "server");
    }
  };

  const handleRefreshClick = () => {
    const hasAnyPicked = gameState.cardPool.some((c) => c.isTaken);
    if (hasAnyPicked) {
      setIsRefreshConfirmOpen(true);
    } else {
      refreshWords();
    }
  };

  const restartGame = async () => {
    setApiError(null);
    try {
      const wordPair = await fetchWordPair();
  
      const roles: Role[] = [
        ...Array(civilianTarget).fill("CIVILIAN" as Role),
        ...Array(undercoverTarget).fill("UNDERCOVER" as Role),
      ];
      const shuffledRoles = shuffle(roles);
      const cardPool: Card[] = shuffledRoles.map((role, idx) => ({
        id: idx,
        role,
        word: role === "UNDERCOVER" ? wordPair.undercover : wordPair.civilian,
        isTaken: false,
      }));

      const pickingOrder = shuffle(
        gameState.players.map((p) => p.id)
      );

      setGameState((prev) => ({
        ...prev,
        players: prev.players.map((p) => ({
          ...p,
          isAlive: true,
          word: "",
          role: "CIVILIAN" as Role,
          eliminatedAtRound: undefined,
        })),
        wordPair,
        cardPool,
        phase: "ROLES",
        round: 1,
        missedVotes: 0,
        pickingOrder,
        currentPickerIndex: 0,
        starterPlayerId: undefined,
      }));
      setIsRestarting(true);
      setShowPickedCard(false);
      setPickedCard(null);
      setNamingPlayerCardId(null);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "unknown";
      setApiError(msg === "network" ? "network" : msg === "empty" ? "empty" : "server");
    }
  };

  const confirmPlayerName = (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName || namingPlayerCardId === null) return;

    if (
      gameState.players.some(
        (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      setError("Nama ini sudah ada di permainan!");
      return;
    }

    if (!pastPlayers.includes(trimmedName)) {
      setPastPlayers((prev) => [...prev, trimmedName]);
    }

    const card = gameState.cardPool.find((c) => c.id === namingPlayerCardId);
    if (!card) return;

    const newPlayer: Player = {
      id: Math.random().toString(36).substring(2, 11),
      name: name.trim(),
      role: card.role,
      isAlive: true,
      word: card.word,
      score: leaderboard[name.trim()] || 0,
    };

    const updatedCardPool = gameState.cardPool.map((c) =>
      c.id === namingPlayerCardId
        ? { ...c, isTaken: true, playerName: trimmedName }
        : c
    );

    setGameState((prev) => ({
      ...prev,
      players: [...prev.players, newPlayer],
      cardPool: updatedCardPool,
    }));

    setPickedCard({ role: card.role, word: card.word });
    setCurrentRevealingName(trimmedName);
    setShowRevealReady(true);
    setNamingPlayerCardId(null);
    setShowHistoryModal(false);
    setNewName("");
    setError(null);
  };

  const pickCard = (cardId: number) => {
    if (showPickedCard || namingPlayerCardId !== null || showRevealReady) return;

    const card = gameState.cardPool.find((c) => c.id === cardId);
    if (!card || card.isTaken) return;

    setError(null);

    if (
      isRestarting &&
      gameState.pickingOrder &&
      gameState.currentPickerIndex !== undefined
    ) {
      const pickerId = gameState.pickingOrder[gameState.currentPickerIndex];
      const picker = gameState.players.find((p) => p.id === pickerId);
      if (picker) {
        setPickedCard({ role: card.role, word: card.word });
        setCurrentRevealingName(picker.name);

        const updatedPlayers = gameState.players.map((p) =>
          p.id === pickerId ? { ...p, role: card.role, word: card.word } : p
        );
        const updatedCardPool = gameState.cardPool.map((c) =>
          c.id === cardId ? { ...c, isTaken: true, playerName: picker.name } : c
        );

        setGameState((prev) => ({
          ...prev,
          players: updatedPlayers,
          cardPool: updatedCardPool,
        }));
        setShowRevealReady(true);
      }
    } else {
      setNamingPlayerCardId(cardId);
    }
  };

  const startReveal = () => {
    setShowRevealReady(false);
    setShowPickedCard(true);
  };

  const nextReveal = () => {
    const targetCount = civilianTarget + undercoverTarget;

    if (isRestarting && gameState.currentPickerIndex !== undefined) {
      setGameState((prev) => ({
        ...prev,
        currentPickerIndex: (prev.currentPickerIndex || 0) + 1,
      }));
    }

    const totalPicked = gameState.cardPool.filter((c) => c.isTaken).length;
    const hasMore = totalPicked < targetCount;

    if (hasMore) {
      setShowPickedCard(false);
      setPickedCard(null);
      setCurrentRevealingName("");
    } else {
      setGameState((prev) => {
        const shuffledPlayers = [...prev.players].sort(
          () => Math.random() - 0.5
        );
        return {
          ...prev,
          players: shuffledPlayers,
          phase: "DISCUSSION",
          starterPlayerId: shuffledPlayers[0]?.id,
        };
      });
    }
  };

  const eliminatePlayer = (player: Player) => {
    const isMissedVote = player.role === "CIVILIAN";
    setEliminatedPlayer(player);
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === player.id
          ? { ...p, isAlive: false, eliminatedAtRound: prev.round }
          : p
      ),
      missedVotes: isMissedVote ? prev.missedVotes + 1 : prev.missedVotes,
      phase: "RESULT",
    }));
  };

  const checkWinner = () => {
    const alivePlayers = gameState.players.filter((p) => p.isAlive);
    const aliveUndercovers = alivePlayers.filter((p) => p.role === "UNDERCOVER");
    const aliveCivilians = alivePlayers.filter((p) => p.role === "CIVILIAN");

    const nextStarter = () => {
      if (!eliminatedPlayer) return;
      const eliminatedIndex = gameState.players.findIndex(
        (p) => p.id === eliminatedPlayer.id
      );
      for (let i = 1; i <= gameState.players.length; i++) {
        const nextIndex = (eliminatedIndex + i) % gameState.players.length;
        if (gameState.players[nextIndex].isAlive) {
          return gameState.players[nextIndex].id;
        }
      }
      return gameState.players[0].id;
    };

    if (aliveUndercovers.length === 0) {
      updateScores("CIVILIANS");
      setGameState((prev) => ({ ...prev, phase: "WINNER", winner: "CIVILIANS" }));
      clearSnapshot(); // Game over — remove snapshot
    } else if (aliveCivilians.length <= 1) {
      updateScores("UNDERCOVERS");
      setGameState((prev) => ({
        ...prev,
        phase: "WINNER",
        winner: "UNDERCOVERS",
      }));
      clearSnapshot(); // Game over — remove snapshot
    } else {
      setGameState((prev) => ({
        ...prev,
        phase: "DISCUSSION",
        round: prev.round + 1,
        starterPlayerId: nextStarter(),
      }));
    }
  };

  const calculateDeltas = (winner: "CIVILIANS" | "UNDERCOVERS"): ScoreDelta[] => {
    const civilianWon = winner === "CIVILIANS";
    const missedVotes = gameState.missedVotes ?? 0;

    return gameState.players.map((p) => {
      let points = 0;
      const survived = p.isAlive;
      const won = civilianWon ? p.role === "CIVILIAN" : p.role === "UNDERCOVER";

      if (civilianWon) {
        if (p.role === "CIVILIAN" && survived) points = 3;
        // Undercover bonus: survived past round 1 but still lost
        if (p.role === "UNDERCOVER" && !survived && (p.eliminatedAtRound ?? 1) >= 2) points = 2;
      } else {
        if (p.role === "UNDERCOVER" && survived) {
          points = 5 + missedVotes; // +1 per missed vote
        }
      }

      return {
        name: p.name,
        role: p.role,
        points,
        won,
        eliminatedAtRound: p.eliminatedAtRound ?? null,
      };
    });
  };

  const updateScores = (winner: "CIVILIANS" | "UNDERCOVERS") => {
    const deltas = calculateDeltas(winner);

    // Update local leaderboard (poin display lokal)
    setLeaderboard((prev) => {
      const next = { ...prev };
      deltas.forEach((d) => { next[d.name] = (next[d.name] || 0) + d.points; });
      return next;
    });

    // Submit ke Redis kalau grup aktif (tidak perlu groupData — server yang kelola roundIndex)
    if (groupCode) {
      const payload: SubmitScorePayload = {
        roundIndex: 0, // ignored by server, server increment sendiri
        deltas,
      };
      submitGroupScore(payload);
    }
  };

  const backToHome = () => {
    // Re-read snapshot so resume banner shows when returning to SETUP
    const snapshot = loadSnapshot();
    setIsStartingGame(false);
    setGameState(INITIAL_STATE);
    setView("GAME");
    setNewName("");
    setShowPickedCard(false);
    setPickedCard(null);
    setEliminatedPlayer(null);
    setIsRestarting(false);
    setPendingResume(snapshot && ACTIVE_PHASES.includes(snapshot.gameState.phase) ? snapshot : null);
  };

  const deleteHistoryPlayer = (name: string) => {
    setPastPlayers((prev) => prev.filter((n) => n !== name));
    setShowDeleteHistoryConfirm(null);
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5F2EA] text-[#4A453E] font-sans p-3 flex flex-col items-center">
      <header
        className={`w-full max-w-sm ${
          gameState.phase === "SETUP" && view === "GAME"
            ? "py-4 md:py-6"
            : "py-1.5"
        } text-center transition-all duration-300`}
      >
        <h1
          className={`${
            gameState.phase === "SETUP" && view === "GAME"
              ? "text-3xl"
              : "text-xl"
          } font-black tracking-tight text-[#4A5D4E] transition-all`}
        >
          UNDERCOVER
          {gameState.phase === "SETUP" && view === "GAME" && (
            <span className="text-[#8E745A] block text-2xl">INDONESIA</span>
          )}
        </h1>
        {gameState.phase === "SETUP" && view === "GAME" && (
          <p className="text-[#A49F96] text-[9px] font-black tracking-[0.3em] uppercase">
            Awas Tukang Tipu!
          </p>
        )}
      </header>

      {/* ── RESUME BANNER ─────────────────────────── */}
      <AnimatePresence>
        {pendingResume && gameState.phase === "SETUP" && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="w-full max-w-sm mb-3"
          >
            <div className="bg-[#4A5D4E] text-white rounded-[1.75rem] px-5 py-4 flex items-center gap-3 shadow-lg shadow-[#4A5D4E]/20 border-2 border-[#5D6D5E]">
              <div className="p-2 bg-white/15 rounded-xl flex-shrink-0">
                <RefreshCw size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm leading-snug">Game belum selesai!</p>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                  Ronde {pendingResume.gameState.round} •{" "}
                  {pendingResume.gameState.players.length} pemain
                  {groupCode ? ` • ${groupCode}` : ""}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={handleResume}
                  className="px-3 py-2 bg-white text-[#4A5D4E] rounded-xl font-black text-xs active:scale-95 transition-all"
                >
                  LANJUT
                </button>
                <button
                  onClick={handleDismissResume}
                  className="p-2 bg-white/15 rounded-xl active:scale-95 transition-all"
                  aria-label="Tutup notifikasi resume"
                >
                  <X size={14} className="text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── API ERROR BANNER ──────────────────────── */}
      <AnimatePresence>
        {apiError && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="w-full max-w-sm mb-3"
          >
            <div className="bg-[#C17C5C] text-white rounded-[1.75rem] px-5 py-4 flex items-center gap-3 shadow-lg border-2 border-[#D08060]">
              <div className="p-2 bg-white/15 rounded-xl flex-shrink-0">
                {apiError === "network"
                  ? <WifiOff size={18} className="text-white" />
                  : <AlertTriangle size={18} className="text-white" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm leading-snug">
                  {apiError === "network"
                    ? "Tidak ada koneksi"
                    : apiError === "empty"
                    ? "Kata belum tersedia"
                    : "Server bermasalah"}
                </p>
                <p className="text-white/70 text-[10px] font-bold mt-0.5">
                  {apiError === "network"
                    ? "Periksa koneksi internet lalu coba lagi"
                    : apiError === "empty"
                    ? "Buka /admin lalu jalankan Import terlebih dahulu"
                    : "Gagal mengambil kata. Coba lagi sebentar"}
                </p>
              </div>
              <button
                onClick={() => setApiError(null)}
                className="p-2 bg-white/15 rounded-xl active:scale-95 transition-all flex-shrink-0"
                aria-label="Tutup error"
              >
                <X size={14} className="text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main
        className={`w-full max-w-sm flex-1 px-1 ${
          gameState.phase === "SETUP" && view === "GAME" ? "mb-16" : "mb-6"
        } relative`}
      >
        <AnimatePresence mode="wait">
          {view === "LEADERBOARD" ? (
            <motion.div
              key="leaderboard-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-[#FDFCFB] p-6 rounded-[2.5rem] shadow-xl shadow-[#D8D2C2]/30 border-4 border-[#E6E2D9]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#E6E2D9] rounded-2xl">
                      <Trophy size={28} className="text-[#8E745A]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-[#4A453E] uppercase tracking-tight">
                        Papan Skor
                      </h2>
                      {groupCode && (
                        <p className="text-[10px] font-black text-[#A49F96] uppercase tracking-widest mt-0.5">
                          Grup {groupCode} · {groupData?.roundIndex ?? 0} ronde
                        </p>
                      )}
                    </div>
                  </div>
                  {groupCode && groupData && (
                    <button
                      onClick={async () => {
                        const data = await fetchGroup(groupCode);
                        if (data) setGroupData(data);
                      }}
                      className="p-2 bg-[#E6E2D9] rounded-xl text-[#A49F96] hover:text-[#4A5D4E] transition-colors active:scale-90"
                      aria-label="Refresh leaderboard"
                    >
                      <RefreshCw size={14} />
                    </button>
                  )}
                </div>

                {/* Group leaderboard */}
                {groupCode && groupData && Object.keys(groupData.leaderboard).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(groupData.leaderboard)
                      .sort(([, a], [, b]) => (b as any).points - (a as any).points)
                      .map(([name, stats]: [string, any], idx) => {
                        const streak = stats.streak?.count >= 2 ? stats.streak : null;
                        return (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            key={name}
                            className="flex items-center justify-between bg-[#FDFCFB] px-4 py-3 rounded-2xl border border-[#E6E2D9] shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${idx === 0 ? "bg-[#C17C5C] text-white" : "bg-[#E6E2D9] text-[#A49F96]"}`}>
                                {idx + 1}
                              </span>
                              <div>
                                <span className="font-bold text-sm text-[#4A453E]">{name}</span>
                                {streak && (
                                  <span className={`ml-2 text-[9px] font-black px-1.5 py-0.5 rounded-full ${streak.role === "CIVILIAN" ? "bg-[#4A5D4E]/10 text-[#4A5D4E]" : "bg-[#C17C5C]/10 text-[#C17C5C]"}`}>
                                    🔥 {streak.count}× {streak.role === "CIVILIAN" ? "WARGA" : "PENYUSUP"}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-black text-[#4A5D4E]">{stats.points} pts</div>
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                ) : groupCode && !groupData ? (
                  <div className="text-center py-8 opacity-40">
                    <p className="font-bold text-sm">Join grup dulu untuk lihat leaderboard.</p>
                  </div>
                ) : !groupCode ? (
                  <div className="text-center py-8 opacity-40">
                    <Trophy size={48} className="mx-auto mb-3" />
                    <p className="font-bold text-sm">Belum join grup.</p>
                    <p className="text-[10px] mt-1 text-[#A49F96]">Set kode grup di halaman utama untuk sinkron leaderboard.</p>
                  </div>
                ) : (
                  <div className="text-center py-8 opacity-30">
                    <Trophy size={48} className="mx-auto mb-3" />
                    <p className="font-bold text-sm">Belum ada skor di grup ini.</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setView("GAME")}
                className="w-full py-6 rounded-[2rem] bg-[#4A5D4E] text-white font-black text-xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-[#4A5D4E]/20"
              >
                <HomeIcon size={24} />
                KEMBALI KE HOME
              </button>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {gameState.phase === "SETUP" && (
                <motion.div
                  key="setup"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="space-y-6"
                >
                  {/* ── GRUP CODE INPUT ─────────────────────── */}
                  <div className="bg-[#FDFCFB] p-5 rounded-[2.5rem] shadow-xl shadow-[#D8D2C2]/30 border-4 border-[#E6E2D9]">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-[#E6E2D9] rounded-2xl">
                        <Users className="text-[#4A5D4E]" size={18} />
                      </div>
                      <h2 className="text-base font-black text-[#4A453E] uppercase tracking-tight">
                        Kode Grup
                      </h2>
                    </div>
                    {groupCode && groupData ? (
                      <div className="flex items-center justify-between p-3 bg-[#F5F2EA] rounded-2xl border border-[#E6E2D9]">
                        <div>
                          <p className="text-xs font-black text-[#4A5D4E] tracking-widest uppercase">{groupCode}</p>
                          <p className="text-[10px] text-[#A49F96] font-bold mt-0.5">
                            {Object.keys(groupData.leaderboard).length} pemain · ronde {groupData.roundIndex}
                          </p>
                        </div>
                        <button
                          onClick={() => { setGroupCode(""); setGroupData(null); }}
                          className="p-2 bg-[#E6E2D9] rounded-xl text-[#A49F96] hover:text-[#C17C5C] transition-colors active:scale-90"
                          aria-label="Keluar dari grup"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={groupCode}
                            onChange={(e) => { setGroupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")); setGroupError(null); }}
                            onKeyDown={(e) => e.key === "Enter" && joinGroup(groupCode)}
                            placeholder="Kode grup (misal: GENG)"
                            maxLength={8}
                            className={`flex-1 bg-[#F5F2EA] border-2 rounded-xl px-4 py-3 text-[#4A453E] font-black text-sm tracking-widest outline-none focus:ring-4 focus:ring-[#4A5D4E]/20 transition-all ${groupError ? "border-red-400" : "border-[#E6E2D9]"}`}
                          />
                          <button
                            onClick={() => joinGroup(groupCode)}
                            disabled={isLoadingGroup || groupCode.length < 2}
                            className="px-4 py-3 bg-[#4A5D4E] text-white rounded-xl font-black text-sm active:scale-95 transition-all disabled:opacity-40 flex items-center gap-1.5"
                          >
                            {isLoadingGroup
                              ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}><RefreshCw size={14} /></motion.div>
                              : "JOIN"
                            }
                          </button>
                        </div>
                        {groupError && <p className="text-red-500 text-[10px] font-bold animate-pulse">⚠️ {groupError}</p>}
                        <p className="text-[#A49F96] text-[10px] font-bold leading-relaxed">
                          Buat kode bebas atau pakai kode yang sama dengan teman — leaderboard akan tersinkron antar device.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#FDFCFB] p-5 rounded-[2.5rem] shadow-xl shadow-[#D8D2C2]/30 border-4 border-[#E6E2D9]">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-[#E6E2D9] rounded-2xl">
                        <Users className="text-[#4A5D4E]" size={18} />
                      </div>
                      <h2 className="text-base font-black text-[#4A453E] uppercase tracking-tight">
                        Atur Pemain
                      </h2>
                    </div>

                    <div className="space-y-4">
                      {gameState.players.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[10px] font-black text-[#A49F96] uppercase tracking-[0.2em] mb-2">
                            Pemain Terdaftar ({gameState.players.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5 p-3 bg-[#F5F2EA] rounded-2xl border border-[#E6E2D9]">
                            {gameState.players.map((p) => (
                              <span
                                key={p.id}
                                className="px-2 py-1 bg-white border border-[#E6E2D9] rounded-lg text-[10px] font-bold text-[#8E745A]"
                              >
                                {p.name}
                              </span>
                            ))}
                            {civilianTarget + undercoverTarget >
                              gameState.players.length && (
                              <span className="px-2 py-1 bg-[#C17C5C]/10 border border-[#C17C5C]/20 rounded-lg text-[10px] font-bold text-[#C17C5C] animate-pulse">
                                +{" "}
                                {civilianTarget +
                                  undercoverTarget -
                                  gameState.players.length}{" "}
                                Pemain Baru
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-[#A49F96] uppercase tracking-widest">
                            Civilian
                          </span>
                          <span className="text-[10px] font-bold text-[#D3CFC6]">
                            Warga jujur
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              setCivilianTarget(Math.max(2, civilianTarget - 1))
                            }
                            className="w-10 h-10 rounded-xl bg-[#E6E2D9] flex items-center justify-center font-black text-xl text-[#8E745A] active:scale-90 transition-all"
                          >
                            -
                          </button>
                          <span className="text-xl font-black text-[#4A5D4E] min-w-[24px] text-center">
                            {civilianTarget}
                          </span>
                          <button
                            onClick={() =>
                              setCivilianTarget(Math.min(10, civilianTarget + 1))
                            }
                            className="w-10 h-10 rounded-xl bg-[#E6E2D9] flex items-center justify-center font-black text-xl text-[#8E745A] active:scale-90 transition-all"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-[#A49F96] uppercase tracking-widest">
                            Undercover
                          </span>
                          <span className="text-[10px] font-bold text-[#D3CFC6]">
                            Penyusup
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              setUndercoverTarget(
                                Math.max(1, undercoverTarget - 1)
                              )
                            }
                            className="w-10 h-10 rounded-xl bg-[#E6E2D9] flex items-center justify-center font-black text-xl text-[#8E745A] active:scale-90 transition-all"
                          >
                            -
                          </button>
                          <span className="text-xl font-black text-[#C17C5C] min-w-[24px] text-center">
                            {undercoverTarget}
                          </span>
                          <button
                            onClick={() =>
                              setUndercoverTarget(
                                Math.min(4, undercoverTarget + 1)
                              )
                            }
                            className="w-10 h-10 rounded-xl bg-[#E6E2D9] flex items-center justify-center font-black text-xl text-[#8E745A] active:scale-90 transition-all"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-[#F5F2EA] rounded-2xl border border-[#E6E2D9] text-center flex flex-col gap-3">
                      <div>
                        <span className="text-[#A49F96] text-[10px] font-black uppercase tracking-widest">
                          Total Pemain
                        </span>
                        <p className="text-xl font-black text-[#4A453E]">
                          {civilianTarget + undercoverTarget}
                        </p>
                      </div>

                      {totalWordPairs && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="pt-3 border-t border-[#D3CFC6]"
                        >
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <p className="text-base font-black text-[#4A5D4E]">
                              {totalWordPairs}+ Pasangan Kata
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={startGame}
                    className="w-full py-5 rounded-[2rem] bg-[#4A5D4E] text-white font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-[#4A5D4E]/20 active:scale-95 transition-all"
                  >
                    <Play size={20} fill="currentColor" />
                    PILIH KARTU
                  </button>

                  <button
                    onClick={() => setView("LEADERBOARD")}
                    className="w-full py-4 rounded-[1.5rem] bg-[#FDFCFB] text-[#4A5D4E] border-2 border-[#E6E2D9] font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Trophy size={18} />
                    PAPAN SKOR
                  </button>
                </motion.div>
              )}

              {gameState.phase === "ROLES" && (
                <motion.div
                  key="roles"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6 w-full"
                >
                  <div className="text-center mb-6">
                    <p className="text-[#4A5D4E] font-black tracking-widest uppercase text-xs mb-1">
                      Ambil Kartumu
                    </p>
                    <h2 className="text-3xl font-black text-[#4A453E] tracking-tight leading-tight">
                      {isRestarting &&
                      gameState.pickingOrder &&
                      gameState.currentPickerIndex !== undefined &&
                      gameState.currentPickerIndex < gameState.players.length ? (
                        <>
                          <span className="text-[#C17C5C] italic">
                            {
                              gameState.players.find(
                                (p) =>
                                  p.id ===
                                  gameState.pickingOrder![
                                    gameState.currentPickerIndex!
                                  ]
                              )?.name
                            }
                          </span>
                          <span className="block text-lg font-bold text-[#8E745A] mt-1">
                            Silakan pilih kartu!
                          </span>
                        </>
                      ) : (
                        "Siapa Berikutnya?"
                      )}
                    </h2>
                  </div>

                  {!showPickedCard && !showRevealReady && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3 w-full">
                        {gameState.cardPool.map((card) => (
                          <motion.div
                            whileHover={!card.isTaken ? { scale: 1.05, rotate: 2 } : {}}
                            whileTap={!card.isTaken ? { scale: 0.95 } : {}}
                            key={card.id}
                            onClick={() => pickCard(card.id)}
                            className={`aspect-[3/4] rounded-3xl border-4 flex flex-col items-center justify-center transition-all ${
                              card.isTaken
                                ? "bg-[#E6E2D9] border-[#D3CFC6] opacity-60"
                                : "bg-[#FDFCFB] border-[#E6E2D9] cursor-pointer shadow-lg shadow-[#D8D2C2]/20"
                            }`}
                          >
                            {card.isTaken ? (
                              <div className="flex flex-col items-center gap-1 p-1 px-2 w-full">
                                <span className="text-sm font-black text-[#4A5D4E] uppercase text-center truncate w-full">
                                  {card.playerName}
                                </span>
                                <span className="text-[8px] font-black text-[#4A5D4E] uppercase">
                                  DIPILIH
                                </span>
                              </div>
                            ) : (
                              <User size={20} className="text-[#D3CFC6]" />
                            )}
                          </motion.div>
                        ))}
                      </div>

                      <button
                        disabled={!gameState.cardPool.some((c) => c.isTaken)}
                        onClick={handleRefreshClick}
                        className="w-full py-3 bg-[#FDFCFB] text-[#8E745A] border-2 border-[#E6E2D9] rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <RotateCcw size={14} />
                        Ganti Kata
                      </button>
                    </div>
                  )}

                  {/* Back Home — visible except when showing secret word */}
                  {!showPickedCard && !showRevealReady && (
                    <button
                      onClick={() => setShowBackHomeConfirm(true)}
                      className="w-full py-3 bg-[#FDFCFB] text-[#4A5D4E] border-2 border-[#E6E2D9] rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <HomeIcon size={14} />
                      Back Home
                    </button>
                  )}

                  {showRevealReady && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-full aspect-[3/4] rounded-[3rem] bg-[#FDFCFB] border-8 border-[#E6E2D9] flex flex-col items-center justify-center shadow-2xl p-6 text-center"
                    >
                      <div className="w-20 h-20 bg-[#E6E2D9] rounded-full flex items-center justify-center mb-6">
                        <User size={40} className="text-[#4A5D4E]" />
                      </div>
                      <p className="text-[#A49F96] font-black text-xs tracking-widest uppercase mb-2">
                        Giliran Kamu:
                      </p>
                      <h3 className="text-3xl font-black text-[#4A453E] mb-8 truncate w-full px-2">
                        {currentRevealingName}
                      </h3>
                      <button
                        onClick={startReveal}
                        className="w-full py-5 bg-[#4A5D4E] text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all"
                      >
                        LIHAT KATA
                      </button>
                    </motion.div>
                  )}

                  {showPickedCard && (
                    <motion.div
                      key="picked-card"
                      initial={{ rotateY: 90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      className="w-full aspect-[3/4] max-h-[450px] rounded-[4rem] bg-[#4A5D4E] border-8 border-[#5D6D5E] flex flex-col items-center justify-center shadow-2xl p-10 text-center relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10" />
                      <div className="mb-4">
                        <span className="bg-white/20 text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          {currentRevealingName}
                        </span>
                      </div>
                      <p className="text-[#D3CFC6] font-black text-sm tracking-[0.2em] uppercase mb-6">
                        Kata Rahasiamu:
                      </p>
                      <h3 className="text-5xl font-black text-white mb-6 drop-shadow-lg tracking-tighter">
                        {pickedCard?.word}
                      </h3>
                      <div className="p-5 bg-white/10 rounded-[2.5rem] backdrop-blur-md">
                        <p className="text-white text-xs font-medium leading-relaxed opacity-90">
                          Ingat baik-baik, jangan biarkan siapapun melihat! 🤫
                        </p>
                      </div>
                    </motion.div>
                  )}

                  <div className="h-20 flex items-center justify-center">
                    {showPickedCard && (
                      <button
                        onClick={nextReveal}
                        className="flex items-center gap-3 font-black px-10 py-5 rounded-[3rem] bg-[#4A453E] text-white shadow-xl transition-all active:scale-95"
                      >
                        {gameState.cardPool.filter((c) => c.isTaken).length <
                        civilianTarget + undercoverTarget
                          ? "KARTU BERIKUTNYA"
                          : "MULAI FITNAH!"}
                        <ChevronRight size={24} />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {gameState.phase === "DISCUSSION" && (
                <motion.div
                  key="discussion"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="text-center py-2 md:py-4">
                    <h2 className="text-2xl font-black text-[#4A453E] tracking-tight uppercase py-2">
                      Waktunya Membual!
                    </h2>
                    <div className="flex flex-col items-center gap-2">
                      <div className="inline-block bg-[#F5F2EA] text-[#8E745A] px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.4em]">
                        RONDE {gameState.round}
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-[#A49F96] bg-white/40 px-4 py-2 rounded-2xl border border-[#E6E2D9]">
                        <div className="flex items-center gap-1.5">
                          <Heart
                            size={10}
                            className="text-[#4A5D4E] fill-[#4A5D4E]"
                          />
                          <span>
                            {
                              gameState.players.filter(
                                (p) => p.isAlive && p.role === "CIVILIAN"
                              ).length
                            }{" "}
                            WARGA
                          </span>
                        </div>
                        <div className="w-px h-3 bg-[#E6E2D9]" />
                        <div className="flex items-center gap-1.5">
                          <Ghost size={10} className="text-[#C17C5C]" />
                          <span>
                            {
                              gameState.players.filter(
                                (p) => p.isAlive && p.role === "UNDERCOVER"
                              ).length
                            }{" "}
                            PENYUSUP
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {[...gameState.players]
                      .sort((a, b) => {
                        if (!a.isAlive && b.isAlive) return 1;
                        if (a.isAlive && !b.isAlive) return -1;
                        if (a.id === gameState.starterPlayerId) return -1;
                        if (b.id === gameState.starterPlayerId) return 1;
                        return 0;
                      })
                      .map((p) => (
                        <motion.div
                          layout
                          key={p.id}
                          className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 h-32 transition-all relative ${
                            p.isAlive
                              ? "bg-[#FDFCFB] border-[#E6E2D9] shadow-sm"
                              : "bg-[#E6E2D9] border-[#D3CFC6] opacity-40 shadow-inner"
                          }`}
                        >
                          {p.isAlive && gameState.starterPlayerId === p.id && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-1.5 -left-1.5 w-7 h-7 bg-[#C17C5C] rounded-full border-2 border-white flex items-center justify-center z-10 shadow-md"
                            >
                              <span className="text-white text-[11px] font-black">
                                1
                              </span>
                            </motion.div>
                          )}
                          {p.isAlive && (
                            <button
                              onClick={() => setPlayerToPeek(p)}
                              className="absolute top-1 right-1 p-1.5 bg-[#F5F2EA] rounded-full text-[#A49F96] hover:text-[#C17C5C] transition-colors"
                            >
                              <Eye size={12} />
                            </button>
                          )}
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${
                              p.isAlive
                                ? "bg-[#4A5D4E] text-white shadow-md"
                                : "bg-[#A49F96] text-[#D3CFC6]"
                            }`}
                          >
                            {p.name.charAt(0)}
                          </div>
                          <span
                            className={`font-black text-[10px] truncate w-full text-center ${
                              p.isAlive ? "text-[#4A453E]" : "text-[#A49F96]"
                            }`}
                          >
                            {p.name}
                          </span>
                          {!p.isAlive && (
                            <div className="flex flex-col items-center gap-0.5 mt-0.5">
                              <Skull size={10} className="text-[#A49F96]" />
                              <span
                                className={`text-[7px] font-black uppercase tracking-tighter ${
                                  p.role === "CIVILIAN"
                                    ? "text-[#4A5D4E]"
                                    : "text-[#C17C5C]"
                                }`}
                              >
                                {p.role === "CIVILIAN" ? "WARGA" : "PENYUSUP"}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      ))}
                  </div>

                  {/* Peek Modal */}
                  <AnimatePresence>
                    {playerToPeek && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#4A453E]/60 backdrop-blur-md"
                      >
                        <motion.div
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0.9 }}
                          className="bg-[#FDFCFB] w-full max-w-[300px] rounded-[3rem] p-8 shadow-2xl text-center space-y-6 border-4 border-[#E6E2D9]"
                        >
                          {!isPeeking ? (
                            <>
                              <div className="w-16 h-16 bg-[#F5F2EA] rounded-full flex items-center justify-center mx-auto">
                                <User className="text-[#4A5D4E]" size={32} />
                              </div>
                              <div>
                                <h3 className="text-xl font-black text-[#4A453E] mb-2">
                                  Halo, {playerToPeek.name}!
                                </h3>
                                <p className="text-[#A49F96] text-xs font-bold leading-relaxed px-4">
                                  Pastikan hanya kamu yang melihat layar ini ya!
                                </p>
                              </div>
                              <button
                                onClick={() => setIsPeeking(true)}
                                className="w-full py-4 bg-[#4A5D4E] text-white rounded-2xl font-black shadow-lg"
                              >
                                TAMPILKAN KATA
                              </button>
                              <button
                                onClick={() => setPlayerToPeek(null)}
                                className="w-full py-2 text-[#A49F96] font-black text-xs uppercase"
                              >
                                BATAL
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="py-8 bg-[#4A5D4E] rounded-[2rem] border-4 border-[#5D6D5E]">
                                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-2">
                                  Kata Rahasiamu:
                                </p>
                                <h3 className="text-4xl font-black text-white px-4 break-words">
                                  {playerToPeek.word}
                                </h3>
                              </div>
                              <button
                                onClick={() => {
                                  setPlayerToPeek(null);
                                  setIsPeeking(false);
                                }}
                                className="w-full py-4 bg-[#4A453E] text-white rounded-2xl font-black shadow-lg"
                              >
                                OKE, SUDAH INGAT!
                              </button>
                            </>
                          )}
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={() =>
                      setGameState((prev) => ({ ...prev, phase: "VOTING" }))
                    }
                    className="w-full py-5 bg-[#4A5D4E] text-white rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-[#4A5D4E]/20 active:scale-95 transition-all"
                  >
                    <Vote size={24} />
                    MULAI EKSEKUSI!
                  </button>
                </motion.div>
              )}

              {gameState.phase === "VOTING" && (
                <motion.div
                  key="voting"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 py-4"
                >
                  <div className="text-center py-2 md:py-3 space-y-3">
                    <h2 className="text-2xl font-black text-[#C17C5C] tracking-tight uppercase mb-1">
                      Eksekusi Siapa?
                    </h2>
                    <p className="text-[#A49F96] font-bold px-8 leading-relaxed text-xs">
                      Pilih pemain yang dicurigai sebagai penyusup!
                    </p>
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-[#A49F96] bg-white/40 px-4 py-2 rounded-2xl border border-[#E6E2D9]">
                        <div className="flex items-center gap-1.5">
                          <Heart
                            size={10}
                            className="text-[#4A5D4E] fill-[#4A5D4E]"
                          />
                          <span>
                            {
                              gameState.players.filter(
                                (p) => p.isAlive && p.role === "CIVILIAN"
                              ).length
                            }{" "}
                            WARGA
                          </span>
                        </div>
                        <div className="w-px h-3 bg-[#E6E2D9]" />
                        <div className="flex items-center gap-1.5">
                          <Ghost size={10} className="text-[#C17C5C]" />
                          <span>
                            {
                              gameState.players.filter(
                                (p) => p.isAlive && p.role === "UNDERCOVER"
                              ).length
                            }{" "}
                            PENYUSUP
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {gameState.players
                      .filter((p) => p.isAlive)
                      .map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setPlayerToEliminate(p)}
                          className="aspect-square bg-[#FDFCFB] hover:bg-[#E6E2D9] border-4 border-[#E6E2D9] p-3 rounded-3xl flex flex-col items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 group"
                        >
                          <div className="w-10 h-10 rounded-full bg-[#F5F2EA] group-hover:bg-[#C17C5C] group-hover:text-white flex items-center justify-center font-black text-base transition-all shadow-inner">
                            {p.name.charAt(0)}
                          </div>
                          <span className="text-sm font-black text-[#4A453E] truncate w-full text-center">
                            {p.name}
                          </span>
                          <Vote
                            className="text-[#D3CFC6] group-hover:text-[#C17C5C] transition-colors"
                            size={14}
                          />
                        </button>
                      ))}
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() =>
                        setGameState((prev) => ({
                          ...prev,
                          phase: "DISCUSSION",
                        }))
                      }
                      className="text-[#A49F96] font-black text-[10px] uppercase tracking-wider underline underline-offset-4"
                    >
                      KEMBALI KE DISKUSI (INTIP KATA)
                    </button>
                  </div>

                  {/* Confirmation Modal for Elimination */}
                  <AnimatePresence>
                    {playerToEliminate && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-[#4A453E]/40 backdrop-blur-sm"
                      >
                        <motion.div
                          initial={{ scale: 0.9, y: 20 }}
                          animate={{ scale: 1, y: 0 }}
                          exit={{ scale: 0.9, y: 20 }}
                          className="bg-[#FDFCFB] w-full max-w-[280px] rounded-[2.5rem] p-8 shadow-2xl text-center space-y-6 border-4 border-[#E6E2D9]"
                        >
                          <div className="w-14 h-14 bg-[#E6E2D9] rounded-full flex items-center justify-center mx-auto">
                            <Skull className="text-[#C17C5C]" size={28} />
                          </div>
                          <div>
                            <p className="text-[#A49F96] text-[9px] font-black uppercase tracking-widest mb-1">
                              Yakin Eksekusi?
                            </p>
                            <h3 className="text-xl font-black text-[#4A453E]">
                              {playerToEliminate.name}
                            </h3>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            <button
                              onClick={() => {
                                eliminatePlayer(playerToEliminate);
                                setPlayerToEliminate(null);
                              }}
                              className="w-full py-3.5 bg-[#C17C5C] text-white rounded-xl font-black text-sm shadow-md"
                            >
                              YA, ELIMINASI!
                            </button>
                            <button
                              onClick={() => setPlayerToEliminate(null)}
                              className="w-full py-2.5 text-[#A49F96] font-black text-[10px] uppercase tracking-wider"
                            >
                              BATAL
                            </button>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {gameState.phase === "RESULT" && eliminatedPlayer && (
                <motion.div
                  key="result"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-10"
                >
                  <div className="relative">
                    <motion.div
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      className={`w-36 h-36 rounded-full border-8 flex items-center justify-center shadow-xl ${
                        eliminatedPlayer.role === "CIVILIAN"
                          ? "border-[#4A5D4E] bg-[#FDFCFB]"
                          : "border-[#C17C5C] bg-[#FDFCFB]"
                      }`}
                    >
                      {eliminatedPlayer.role === "CIVILIAN" ? (
                        <Heart
                          size={72}
                          className="text-[#4A5D4E] fill-[#4A5D4E]"
                        />
                      ) : (
                        <Ghost size={72} className="text-[#C17C5C]" />
                      )}
                    </motion.div>
                    <div className="px-5 py-1.5 bg-[#4A453E] text-white rounded-full absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap font-black text-xs tracking-tighter">
                      {eliminatedPlayer.name.toUpperCase()} KELUAR!
                    </div>
                  </div>

                  <div
                    className={`p-8 rounded-[3rem] border-4 w-full shadow-lg ${
                      eliminatedPlayer.role === "CIVILIAN"
                        ? "bg-[#4A5D4E]/10 border-[#4A5D4E]"
                        : "bg-[#C17C5C]/10 border-[#C17C5C]"
                    }`}
                  >
                    <p className="text-[#A49F96] font-black uppercase tracking-[0.2em] text-[10px] mb-3">
                      Identitas Aslinya:
                    </p>
                    <h3
                      className={`text-4xl font-black tracking-tight uppercase ${
                        eliminatedPlayer.role === "CIVILIAN"
                          ? "text-[#4A5D4E]"
                          : "text-[#C17C5C]"
                      }`}
                    >
                      {eliminatedPlayer.role === "CIVILIAN"
                        ? "Warga!"
                        : "Penyusup!"}
                    </h3>
                  </div>

                  <button
                    onClick={checkWinner}
                    className="bg-[#4A453E] text-white font-black px-12 py-5 rounded-[2rem] text-lg shadow-xl active:scale-95 transition-all"
                  >
                    OKE, LANJUT!
                  </button>
                </motion.div>
              )}

              {gameState.phase === "WINNER" && (
                <motion.div
                  key="winner"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-10 pt-6 mt-6"
                >
                  <div className="relative">
                    <motion.div
                      animate={{
                        y: [0, -20, 0],
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 2.5,
                        ease: "easeInOut",
                      }}
                    >
                      <Trophy
                        size={120}
                        className="text-[#8E745A] drop-shadow-2xl"
                      />
                    </motion.div>
                    <div className="absolute -top-3 -right-3 p-2 bg-[#4A5D4E] rounded-full text-white text-[10px] font-black rotate-12 shadow-lg tracking-wider">
                      MENANG!
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-5xl font-black tracking-tighter text-[#4A453E] uppercase">
                      {gameState.winner === "CIVILIANS" ? "WARGA" : "PENYUSUP"}
                      <span className="block text-3xl mt-1 text-[#8E745A]">
                        JUARANYA!
                      </span>
                    </h2>
                  </div>

                  <div className="w-full bg-[#FDFCFB] rounded-[3rem] shadow-xl shadow-[#D8D2C2]/30 border-4 border-[#E6E2D9] overflow-hidden flex flex-col">
                    <div className="p-6 bg-[#F5F2EA] border-b-2 border-[#E6E2D9]">
                      <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-[#A49F96] mb-4 italic text-center">
                        Rahasia Kata
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center">
                          <p className="text-[#4A5D4E] text-[8px] font-black uppercase mb-1">
                            Warga
                          </p>
                          <p className="text-sm font-black text-[#4A453E] tracking-tight">
                            {gameState.wordPair?.civilian}
                          </p>
                        </div>
                        <div className="text-center border-l border-[#E6E2D9]">
                          <p className="text-[#C17C5C] text-[8px] font-black uppercase mb-1">
                            Penyusup
                          </p>
                          <p className="text-sm font-black text-[#C17C5C] tracking-tight">
                            {gameState.wordPair?.undercover}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 flex flex-col min-h-[150px] max-h-[30vh]">
                      <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-[#A49F96] mb-4 italic text-center">
                        Status Pemain
                      </h4>
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                        {gameState.players.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-3 bg-[#F5F2EA] rounded-2xl border border-[#E6E2D9]"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                                  p.role === "CIVILIAN"
                                    ? "bg-[#4A5D4E] text-white"
                                    : "bg-[#C17C5C] text-white"
                                }`}
                              >
                                {p.name.charAt(0)}
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="text-xs font-black text-[#4A453E]">
                                  {p.name}
                                </span>
                                <span
                                  className={`text-[7px] font-black uppercase tracking-widest ${
                                    p.role === "CIVILIAN"
                                      ? "text-[#4A5D4E]"
                                      : "text-[#C17C5C]"
                                  }`}
                                >
                                  {p.role === "CIVILIAN" ? "Warga" : "Penyusup"}
                                </span>
                              </div>
                            </div>
                            <div className="text-[10px] font-black text-[#8E745A]">
                              {groupCode && groupData?.leaderboard[p.name] ? groupData.leaderboard[p.name].points : leaderboard[p.name] || 0} pts
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 w-full">
                    <button
                      onClick={restartGame}
                      className="w-full bg-[#4A5D4E] text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 text-lg"
                    >
                      <Play size={24} fill="currentColor" />
                      MAIN LAGI YUK!
                    </button>
                    <button
                      onClick={backToHome}
                      className="w-full bg-[#E6E2D9] text-[#8E745A] font-black py-4 rounded-[2rem] flex items-center justify-center gap-2 active:scale-95 text-sm"
                    >
                      <HomeIcon size={18} />
                      KEMBALI KE HOME
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>

        {/* ── REFRESH CONFIRM MODAL ──────────────────── */}
        <AnimatePresence>
          {isRefreshConfirmOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#FDFCFB] w-full max-w-sm rounded-[3rem] p-8 shadow-3xl text-center space-y-6 border-4 border-[#E6E2D9]"
              >
                <div className="w-14 h-14 bg-[#E6E2D9] rounded-2xl flex items-center justify-center mx-auto">
                  <RotateCcw className="text-[#8E745A]" size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#4A453E]">
                    Ganti Kata?
                  </h3>
                  <p className="text-[#A49F96] text-xs font-bold mt-2 leading-relaxed">
                    Semua pemain harus mengambil ulang kartu jika kata diganti.
                    Lanjutkan?
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={refreshWords}
                    className="w-full py-4 bg-[#C17C5C] text-white rounded-xl font-black shadow-md active:scale-95 transition-all"
                  >
                    YA, GANTI KATA
                  </button>
                  <button
                    onClick={() => setIsRefreshConfirmOpen(false)}
                    className="w-full py-3.5 text-[#A49F96] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                  >
                    BATAL
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── NEW GAME CONFIRM ──────────────────────── */}
        <AnimatePresence>
          {showNewGameConfirm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#FDFCFB] w-full max-w-sm rounded-[3rem] p-8 shadow-3xl text-center space-y-6 border-4 border-[#E6E2D9]">
                <div className="w-14 h-14 bg-[#C17C5C]/10 rounded-2xl flex items-center justify-center mx-auto">
                  <RefreshCw className="text-[#C17C5C]" size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#4A453E]">Mulai Game Baru?</h3>
                  <p className="text-[#A49F96] text-xs font-bold mt-2 leading-relaxed">
                    Ada game ronde {pendingResume?.gameState.round} yang belum selesai. Kalau lanjut, progress tersebut akan hilang.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={() => { setShowNewGameConfirm(false); handleDismissResume(); startGame(); }} className="w-full py-4 bg-[#C17C5C] text-white rounded-xl font-black shadow-md active:scale-95 transition-all">YA, GAME BARU</button>
                  <button onClick={() => { setShowNewGameConfirm(false); handleResume(); }} className="w-full py-3.5 bg-[#4A5D4E] text-white rounded-xl font-black text-sm shadow-md active:scale-95 transition-all">LANJUTKAN GAME LAMA</button>
                  <button onClick={() => setShowNewGameConfirm(false)} className="w-full py-2.5 text-[#A49F96] font-black text-[10px] uppercase tracking-widest">BATAL</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── BACK HOME CONFIRM ─────────────────────── */}
        <AnimatePresence>
          {showBackHomeConfirm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#FDFCFB] w-full max-w-sm rounded-[3rem] p-8 shadow-3xl text-center space-y-6 border-4 border-[#E6E2D9]">
                <div className="w-14 h-14 bg-[#E6E2D9] rounded-2xl flex items-center justify-center mx-auto">
                  <HomeIcon className="text-[#8E745A]" size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#4A453E]">Kembali ke Home?</h3>
                  <p className="text-[#A49F96] text-xs font-bold mt-2 leading-relaxed">
                    Game akan disimpan otomatis. Bisa dilanjutkan lagi nanti dari home.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={() => { setShowBackHomeConfirm(false); backToHome(); }} className="w-full py-4 bg-[#4A453E] text-white rounded-xl font-black shadow-md active:scale-95 transition-all">YA, KEMBALI KE HOME</button>
                  <button onClick={() => setShowBackHomeConfirm(false)} className="w-full py-2.5 text-[#A49F96] font-black text-[10px] uppercase tracking-widest">LANJUT MAIN</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── NAMING MODAL ──────────────────────────── */}
        <AnimatePresence>
          {namingPlayerCardId !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#4A453E]/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#FDFCFB] w-full max-w-sm rounded-[2.5rem] p-8 shadow-3xl space-y-6 border-4 border-[#E6E2D9]"
              >
                <div className="text-center">
                  <div className="w-14 h-14 bg-[#E6E2D9] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <User className="text-[#4A5D4E]" size={28} />
                  </div>
                  <h3 className="text-xl font-black text-[#4A453E]">
                    Siapa Kamu?
                  </h3>
                  <p className="text-[#A49F96] text-[10px] font-bold mt-1 uppercase tracking-tight">
                    Ketik namamu di bawah ini
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="relative">
                    <input
                      autoFocus
                      type="text"
                      value={newName}
                      onChange={(e) => {
                        setNewName(e.target.value);
                        setError(null);
                      }}
                      onKeyDown={(e) =>
                        e.key === "Enter" && confirmPlayerName(newName)
                      }
                      placeholder="Nama kamu..."
                      className={`w-full bg-[#F5F2EA] border-2 rounded-xl px-5 py-4 text-[#4A453E] focus:ring-4 focus:ring-[#8E745A]/20 outline-none font-bold text-base transition-all ${
                        error ? "border-red-400" : "border-[#E6E2D9]"
                      }`}
                    />
                    {error && (
                      <p className="text-red-500 text-[10px] font-bold mt-2 ml-1 animate-pulse">
                        ⚠️ {error}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => confirmPlayerName(newName)}
                      className="w-full py-4 bg-[#4A5D4E] text-white rounded-xl font-black shadow-md active:scale-95 transition-all"
                    >
                      KONFIRMASI
                    </button>
                    {pastPlayers.length > 0 && (
                      <button
                        onClick={() => setShowHistoryModal(true)}
                        className="w-full py-3.5 bg-[#E6E2D9] text-[#8E745A] rounded-xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        <Search size={14} />
                        IMPORT DARI HISTORY
                      </button>
                    )}
                    <button
                      onClick={() => setNamingPlayerCardId(null)}
                      className="w-full py-2 text-[#A49F96] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                    >
                      BATAL
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── HISTORY MODAL ─────────────────────────── */}
        <AnimatePresence>
          {showHistoryModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#4A453E]/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.9, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 30 }}
                className="bg-[#FDFCFB] w-full max-w-sm rounded-[3rem] p-8 shadow-4xl space-y-6 border-4 border-[#E6E2D9] max-h-[80vh] flex flex-col"
              >
                <div className="text-center">
                  <h3 className="text-xl font-black text-[#4A453E] uppercase tracking-tighter">
                    History Pemain
                  </h3>
                  <p className="text-[#A49F96] text-[9px] font-black uppercase tracking-widest mt-1 italic">
                    Pilih nama atau hapus dari history
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                  {pastPlayers.slice().reverse().map((name) => {
                    const isAlreadyInGame = gameState.players.some((p) => p.name === name);
                    return (
                      <div key={name} className="flex items-center gap-2">
                        <button
                          disabled={isAlreadyInGame}
                          onClick={() => confirmPlayerName(name)}
                          className={`flex-1 px-5 py-4 rounded-2xl font-bold flex items-center justify-between transition-all ${isAlreadyInGame ? "bg-[#E6E2D9]/30 text-[#D3CFC6] cursor-not-allowed grayscale" : "bg-[#F5F2EA] text-[#8E745A] border border-[#E6E2D9] active:scale-95 hover:bg-[#E6E2D9]/50"}`}
                        >
                          <span className="text-sm truncate pr-2">{name}</span>
                          {isAlreadyInGame
                            ? <span className="text-[8px] font-black bg-[#E6E2D9] px-2 py-1 rounded-full text-[#A49F96] uppercase">In Game</span>
                            : <ChevronRight size={16} />
                          }
                        </button>
                        {!isAlreadyInGame && (
                          <button
                            onClick={() => setShowDeleteHistoryConfirm(name)}
                            className="p-3 bg-[#F5F2EA] border border-[#E6E2D9] rounded-xl text-[#D3CFC6] hover:text-[#C17C5C] hover:bg-[#C17C5C]/10 transition-all active:scale-90"
                            aria-label={`Hapus ${name} dari history`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="w-full py-4 text-[#A49F96] font-black text-xs uppercase tracking-widest border-t-2 border-[#F5F2EA] pt-6"
                >
                  KEMBALI KE INPUT
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── DELETE HISTORY CONFIRM ────────────────── */}
        <AnimatePresence>
          {showDeleteHistoryConfirm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#FDFCFB] w-full max-w-[280px] rounded-[2.5rem] p-8 shadow-2xl text-center space-y-6 border-4 border-[#E6E2D9]">
                <div className="w-14 h-14 bg-[#E6E2D9] rounded-full flex items-center justify-center mx-auto">
                  <Trash2 className="text-[#C17C5C]" size={24} />
                </div>
                <div>
                  <p className="text-[#A49F96] text-[9px] font-black uppercase tracking-widest mb-1">Hapus dari History?</p>
                  <h3 className="text-xl font-black text-[#4A453E]">{showDeleteHistoryConfirm}</h3>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={() => deleteHistoryPlayer(showDeleteHistoryConfirm!)} className="w-full py-3.5 bg-[#C17C5C] text-white rounded-xl font-black text-sm shadow-md active:scale-95">YA, HAPUS</button>
                  <button onClick={() => setShowDeleteHistoryConfirm(null)} className="w-full py-2.5 text-[#A49F96] font-black text-[10px] uppercase tracking-wider">BATAL</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      <footer className="w-full max-w-md py-8 text-center text-[#A49F96] text-[10px] font-black uppercase tracking-[0.6em]">
        Undercover Indonesia • 2026
      </footer>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E6E2D9; border-radius: 10px; }
      `,
        }}
      />
    </div>
  );
}