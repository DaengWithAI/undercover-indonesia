import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  Play, 
  Trash2, 
  UserPlus, 
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
  Eye
} from "lucide-react";
import { Player, GameState, GamePhase, Role, Card } from "./types";

const INITIAL_STATE: GameState = {
  players: [],
  phase: "SETUP",
  round: 1,
  cardPool: [],
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [newName, setNewName] = useState("");
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [showPickedCard, setShowPickedCard] = useState(false);
  const [pickedCard, setPickedCard] = useState<{ role: Role, word: string } | null>(null);
  const [eliminatedPlayer, setEliminatedPlayer] = useState<Player | null>(null);
  const [undercoverTarget, setUndercoverTarget] = useState(1);
  const [civilianTarget, setCivilianTarget] = useState(3);
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

  // Persistence for player names
  const [pastPlayers, setPastPlayers] = useState<string[]>(() => {
    const saved = localStorage.getItem("undercover_v3_players");
    return saved ? JSON.parse(saved) : [];
  });

  // Load leaderboard from localStorage (Reset by changing key)
  const [leaderboard, setLeaderboard] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("undercover_v3_leaderboard");
    return saved ? JSON.parse(saved) : {};
  });
  const [totalWordPairs, setTotalWordPairs] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/random-pair");
        if (res.ok) {
          const data = await res.json();
          if (data.totalPairs) setTotalWordPairs(data.totalPairs);
        }
      } catch (e) {
        console.error("Failed to fetch word count", e);
      }
    };
    fetchCount();
  }, []);

  useEffect(() => {
    localStorage.setItem("undercover_v3_leaderboard", JSON.stringify(leaderboard));
  }, [leaderboard]);

  useEffect(() => {
    localStorage.setItem("undercover_v3_players", JSON.stringify(pastPlayers));
  }, [pastPlayers]);

  const startGame = async () => {
    const playerCount = civilianTarget + undercoverTarget;
    if (playerCount < 3) return;

    try {
      const fetchWithRetry = async (url: string, retries = 2): Promise<Response> => {
        const res = await fetch(url);
        if (!res.ok && retries > 0) return fetchWithRetry(url, retries - 1);
        return res;
      };

      const response = await fetchWithRetry("/api/random-pair");
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API failed: ${response.status} ${text}`);
      }
      const wordPair = await response.json();

      const roles: Role[] = [
        ...Array(civilianTarget).fill("CIVILIAN" as Role),
        ...Array(undercoverTarget).fill("UNDERCOVER" as Role)
      ];
      
      const shuffledRoles = roles.sort(() => Math.random() - 0.5);
      
      const cardPool: Card[] = shuffledRoles.map((role, idx) => ({
        id: idx,
        role,
        word: role === "UNDERCOVER" ? wordPair.undercover : wordPair.civilian,
        isTaken: false
      }));

      setGameState(prev => ({
        ...prev,
        players: [], // Reset for fresh game
        wordPair,
        cardPool,
        phase: "ROLES",
        round: 1
      }));
      setIsRestarting(false);
      setActivePlayerIndex(0);
      setShowPickedCard(false);
      setPickedCard(null);
      setNamingPlayerCardId(null);
    } catch (error) {
      console.error("Failed to start game", error);
    }
  };

  const restartGame = async () => {
    try {
      const response = await fetch("/api/random-pair");
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      const wordPair = await response.json();
      
      const roles: Role[] = [
        ...Array(civilianTarget).fill("CIVILIAN" as Role),
        ...Array(undercoverTarget).fill("UNDERCOVER" as Role)
      ];
      
      const shuffledRoles = roles.sort(() => Math.random() - 0.5);

      const cardPool: Card[] = shuffledRoles.map((role, idx) => ({
        id: idx,
        role,
        word: role === "UNDERCOVER" ? wordPair.undercover : wordPair.civilian,
        isTaken: false,
      }));

      // Shuffle player IDs for picking order
      const pickingOrder = gameState.players.map(p => p.id).sort(() => Math.random() - 0.5);

      setGameState(prev => ({
        ...prev,
        players: prev.players.map(p => ({ ...p, isAlive: true, word: "", role: "CIVILIAN" })),
        wordPair,
        cardPool,
        phase: "ROLES",
        round: 1,
        pickingOrder,
        currentPickerIndex: 0
      }));
      setIsRestarting(true);
      setActivePlayerIndex(0);
      setShowPickedCard(false);
      setPickedCard(null);
      setNamingPlayerCardId(null);
      setError(null);
    } catch (error) {
      console.error("Failed to restart", error);
    }
  };

  const confirmPlayerName = (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName || namingPlayerCardId === null) return;
    
    // Duplicate check
    if (gameState.players.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError("Nama ini sudah ada di permainan!");
      return;
    }

    if (!pastPlayers.includes(trimmedName)) {
      setPastPlayers(prev => [...prev, trimmedName]);
    }

    const card = gameState.cardPool.find(c => c.id === namingPlayerCardId);
    if (!card) return;

    const newPlayer: Player = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      role: card.role,
      isAlive: true,
      word: card.word,
      score: leaderboard[name.trim()] || 0,
    };

    const updatedCardPool = gameState.cardPool.map(c => 
      c.id === namingPlayerCardId ? { ...c, isTaken: true, playerName: trimmedName } : c
    );

    setGameState(prev => ({
      ...prev,
      players: [...prev.players, newPlayer],
      cardPool: updatedCardPool
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

    const card = gameState.cardPool.find(c => c.id === cardId);
    if (!card || card.isTaken) return;

    setError(null);

    if (isRestarting && gameState.pickingOrder && gameState.currentPickerIndex !== undefined) {
      const pickerId = gameState.pickingOrder[gameState.currentPickerIndex];
      const picker = gameState.players.find(p => p.id === pickerId);
      if (picker) {
        setPickedCard({ role: card.role, word: card.word });
        setCurrentRevealingName(picker.name);
        
        const updatedPlayers = gameState.players.map(p => 
          p.id === pickerId ? { ...p, role: card.role, word: card.word } : p
        );
        const updatedCardPool = gameState.cardPool.map(c => 
          c.id === cardId ? { ...c, isTaken: true, playerName: picker.name } : c
        );

        setGameState(prev => ({
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
    
    // Increment picker index if we are in restart mode
    if (isRestarting && gameState.currentPickerIndex !== undefined) {
      setGameState(prev => ({
        ...prev,
        currentPickerIndex: (prev.currentPickerIndex || 0) + 1
      }));
    }

    // Check if everyone has picked
    const totalPicked = gameState.cardPool.filter(c => c.isTaken).length;
    const hasMore = totalPicked < targetCount;

    if (hasMore) {
      setShowPickedCard(false);
      setPickedCard(null);
      setCurrentRevealingName("");
    } else {
      setGameState(prev => ({ ...prev, phase: "DISCUSSION" }));
    }
  };

  const eliminatePlayer = (player: Player) => {
    const updatedPlayers = gameState.players.map(p => 
      p.id === player.id ? { ...p, isAlive: false } : p
    );

    setEliminatedPlayer(player);
    setGameState(prev => ({
      ...prev,
      players: updatedPlayers,
      phase: "RESULT"
    }));
  };

  const checkWinner = () => {
    const alivePlayers = gameState.players.filter(p => p.isAlive);
    const aliveUndercovers = alivePlayers.filter(p => p.role === "UNDERCOVER");
    const aliveCivilians = alivePlayers.filter(p => p.role === "CIVILIAN");

    if (aliveUndercovers.length === 0) {
      updateScores("CIVILIANS");
      setGameState(prev => ({ ...prev, phase: "WINNER", winner: "CIVILIANS" }));
    } else if (aliveCivilians.length <= 1) {
      updateScores("UNDERCOVERS");
      setGameState(prev => ({ ...prev, phase: "WINNER", winner: "UNDERCOVERS" }));
    } else {
      setGameState(prev => ({ ...prev, phase: "DISCUSSION", round: prev.round + 1 }));
    }
  };

  const updateScores = (winner: "CIVILIANS" | "UNDERCOVERS") => {
    const newLeaderboard = { ...leaderboard };
    gameState.players.forEach(p => {
      if ((winner === "CIVILIANS" && p.role === "CIVILIAN") || 
          (winner === "UNDERCOVERS" && p.role === "UNDERCOVER")) {
        newLeaderboard[p.name] = (newLeaderboard[p.name] || 0) + 1;
      }
    });
    setLeaderboard(newLeaderboard);
  };

  const backToHome = () => {
    setGameState(INITIAL_STATE);
    setNewName("");
    setActivePlayerIndex(0);
    setShowPickedCard(false);
    setPickedCard(null);
    setEliminatedPlayer(null);
    setIsRestarting(false);
  };

  const resetGame = () => {
    setGameState({
      ...INITIAL_STATE,
      players: gameState.players.map(p => ({ ...p, isAlive: true, word: "", role: "CIVILIAN" }))
    });
  };

  return (
    <div className="min-h-screen bg-[#F5F2EA] text-[#4A453E] font-sans p-3 flex flex-col items-center">
      <header className={`w-full max-w-sm ${gameState.phase === "SETUP" && view === "GAME" ? "py-4 md:py-6" : "py-1.5"} text-center transition-all duration-300`}>
        <h1 className={`${gameState.phase === "SETUP" && view === "GAME" ? "text-3xl" : "text-xl"} font-black tracking-tight text-[#4A5D4E] transition-all`}>
          UNDERCOVER
          {(gameState.phase === "SETUP" && view === "GAME") && <span className="text-[#8E745A] block text-2xl">INDONESIA</span>}
        </h1>
        {(gameState.phase === "SETUP" && view === "GAME") && (
          <p className="text-[#A49F96] text-[9px] font-black tracking-[0.3em] uppercase">Game Pengelabuan Kata</p>
        )}
      </header>

      <main className={`w-full max-w-sm flex-1 px-1 ${gameState.phase === "SETUP" && view === "GAME" ? "mb-16" : "mb-6"} relative`}>
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
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-[#E6E2D9] rounded-2xl">
                      <Trophy size={28} className="text-[#8E745A]" />
                    </div>
                    <h2 className="text-xl font-black text-[#4A453E] uppercase tracking-tight">Papan Skor</h2>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(leaderboard).length > 0 ? (
                      Object.entries(leaderboard)
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .map(([name, score], idx) => (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={name} 
                            className="flex items-center justify-between bg-[#FDFCFB] px-5 py-3.5 rounded-2xl border border-[#E6E2D9] shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                                idx === 0 ? "bg-[#C17C5C] text-white" : "bg-[#E6E2D9] text-[#A49F96]"
                              }`}>
                                {idx + 1}
                              </span>
                              <span className="font-bold text-base text-[#4A453E]">{name}</span>
                            </div>
                            <div className="bg-[#E6E2D9]/30 text-[#4A5D4E] px-3 py-1.5 rounded-xl text-xs font-black">
                              {score} WIN
                            </div>
                          </motion.div>
                        ))
                    ) : (
                      <div className="text-center py-12 opacity-30">
                        <Trophy size={64} className="mx-auto mb-4" />
                        <p className="font-bold">Belum ada skor tercatat.</p>
                      </div>
                    )}
                  </div>
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
                  <div className="bg-[#FDFCFB] p-5 rounded-[2.5rem] shadow-xl shadow-[#D8D2C2]/30 border-4 border-[#E6E2D9]">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-[#E6E2D9] rounded-2xl">
                        <Users className="text-[#4A5D4E]" size={18} />
                      </div>
                      <h2 className="text-base font-black text-[#4A453E] uppercase tracking-tight">Atur Pemain</h2>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-[#A49F96] uppercase tracking-widest">Civilian</span>
                          <span className="text-[10px] font-bold text-[#D3CFC6]">Warga jujur</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setCivilianTarget(Math.max(2, civilianTarget - 1))}
                            className="w-10 h-10 rounded-xl bg-[#E6E2D9] flex items-center justify-center font-black text-xl text-[#8E745A] active:scale-90 transition-all"
                          >
                            -
                          </button>
                          <span className="text-xl font-black text-[#4A5D4E] min-w-[24px] text-center">{civilianTarget}</span>
                          <button 
                            onClick={() => setCivilianTarget(Math.min(10, civilianTarget + 1))}
                            className="w-10 h-10 rounded-xl bg-[#E6E2D9] flex items-center justify-center font-black text-xl text-[#8E745A] active:scale-90 transition-all"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-[#A49F96] uppercase tracking-widest">Undercover</span>
                          <span className="text-[10px] font-bold text-[#D3CFC6]">Penyusup</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setUndercoverTarget(Math.max(1, undercoverTarget - 1))}
                            className="w-10 h-10 rounded-xl bg-[#E6E2D9] flex items-center justify-center font-black text-xl text-[#8E745A] active:scale-90 transition-all"
                          >
                            -
                          </button>
                          <span className="text-xl font-black text-[#C17C5C] min-w-[24px] text-center">{undercoverTarget}</span>
                          <button 
                            onClick={() => setUndercoverTarget(Math.min(4, undercoverTarget + 1))}
                            className="w-10 h-10 rounded-xl bg-[#E6E2D9] flex items-center justify-center font-black text-xl text-[#8E745A] active:scale-90 transition-all"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-[#F5F2EA] rounded-2xl border border-[#E6E2D9] text-center flex flex-col gap-3">
                       <div>
                        <span className="text-[#A49F96] text-[10px] font-black uppercase tracking-widest">Total Pemain</span>
                        <p className="text-xl font-black text-[#4A453E]">{civilianTarget + undercoverTarget}</p>
                       </div>
                       
                       {totalWordPairs && (
                         <div className="pt-3 border-t border-[#D3CFC6]">
                            <p className="text-base font-black text-[#4A5D4E]">{totalWordPairs}+ Pasangan Kata</p>
                            <p className="text-[8px] font-bold text-[#C17C5C] mt-0.5 uppercase">Koleksi Diperbarui</p>
                         </div>
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
                    <p className="text-[#4A5D4E] font-black tracking-widest uppercase text-xs mb-1">Ambil Kartumu</p>
                    <h2 className="text-3xl font-black text-[#4A453E] tracking-tight leading-tight">
                      {isRestarting && gameState.pickingOrder && gameState.currentPickerIndex !== undefined && gameState.currentPickerIndex < (civilianTarget + undercoverTarget)
                        ? (
                          <>
                            <span className="text-[#C17C5C] italic">{gameState.players.find(p => p.id === gameState.pickingOrder![gameState.currentPickerIndex])?.name}</span>
                            <span className="block text-lg font-bold text-[#8E745A] mt-1">Silakan pilih kartu!</span>
                          </>
                        ) 
                        : "Siapa Berikutnya?"}
                    </h2>
                  </div>

                  {!showPickedCard && !showRevealReady && (
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
                              <span className="text-[10px] font-black text-[#4A5D4E] uppercase text-center truncate w-full">{card.playerName}</span>
                              <span className="text-[8px] font-black text-[#4A5D4E] uppercase">DIPILIH</span>
                            </div>
                          ) : (
                            <User size={20} className="text-[#D3CFC6]" />
                          )}
                        </motion.div>
                      ))}
                    </div>
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
                      <p className="text-[#A49F96] font-black text-xs tracking-widest uppercase mb-2">Giliran Kamu:</p>
                      <h3 className="text-3xl font-black text-[#4A453E] mb-8 truncate w-full px-2">{currentRevealingName}</h3>
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
                        <span className="bg-white/20 text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">{currentRevealingName}</span>
                      </div>
                      <p className="text-[#D3CFC6] font-black text-sm tracking-[0.2em] uppercase mb-6">Kata Rahasiamu:</p>
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
                        {gameState.cardPool.filter(c => c.isTaken).length < (civilianTarget + undercoverTarget) ? "KARTU BERIKUTNYA" : "MULAI FITNAH!"}
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
                    <div className="inline-block bg-[#F5F2EA] text-[#8E745A] px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-2">
                      RONDE {gameState.round}
                    </div>
                    <h2 className="text-3xl font-black text-[#4A453E] tracking-tight uppercase">Waktunya Membual!</h2>
                    <p className="text-[#A49F96] font-bold text-xs mt-1">Ingat, jangan sebut kata aslinya!</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {gameState.players.map((p) => (
                      <div 
                        key={p.id}
                        className={`p-3 rounded-3xl border-4 flex flex-col items-center justify-center gap-1.5 aspect-square transition-all relative ${
                          p.isAlive 
                          ? "bg-[#FDFCFB] border-[#E6E2D9] shadow-sm" 
                          : "bg-[#E6E2D9] border-[#D3CFC6] opacity-40 shadow-inner"
                        }`}
                      >
                        {p.isAlive && (
                          <button
                            onClick={() => setPlayerToPeek(p)}
                            className="absolute top-1 right-1 p-1.5 bg-[#F5F2EA] rounded-full text-[#A49F96] hover:text-[#C17C5C] transition-colors"
                          >
                            <Eye size={12} />
                          </button>
                        )}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${p.isAlive ? "bg-[#4A5D4E] text-white shadow-md" : "bg-[#A49F96] text-[#D3CFC6]"}`}>
                          {p.name.charAt(0)}
                        </div>
                        <span className={`font-black text-[10px] truncate w-full text-center ${p.isAlive ? "text-[#4A453E]" : "text-[#A49F96]"}`}>{p.name}</span>
                        {!p.isAlive && <Skull size={14} className="text-[#A49F96]" />}
                      </div>
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
                                <h3 className="text-xl font-black text-[#4A453E] mb-2">Halo, {playerToPeek.name}!</h3>
                                <p className="text-[#A49F96] text-xs font-bold leading-relaxed px-4">Pastikan hanya kamu yang melihat layar ini ya!</p>
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
                                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-2">Kata Rahasiamu:</p>
                                <h3 className="text-4xl font-black text-white px-4 break-words">{playerToPeek.word}</h3>
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
                    onClick={() => setGameState(prev => ({ ...prev, phase: "VOTING" }))}
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
                  <div className="text-center py-2 md:py-3">
                    <h2 className="text-3xl font-black text-[#C17C5C] tracking-tight uppercase mb-1">Eksekusi Siapa?</h2>
                    <p className="text-[#A49F96] font-bold px-8 leading-relaxed text-xs">Pilih pemain yang dicurigai sebagai penyusup!</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {gameState.players.filter(p => p.isAlive).map((p) => (
                      <button 
                        key={p.id}
                        onClick={() => setPlayerToEliminate(p)}
                        className="aspect-square bg-[#FDFCFB] hover:bg-[#E6E2D9] border-4 border-[#E6E2D9] p-3 rounded-3xl flex flex-col items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 group"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#F5F2EA] group-hover:bg-[#C17C5C] group-hover:text-white flex items-center justify-center font-black text-base transition-all shadow-inner">
                          {p.name.charAt(0)}
                        </div>
                        <span className="text-sm font-black text-[#4A453E] truncate w-full text-center">{p.name}</span>
                        <Vote className="text-[#D3CFC6] group-hover:text-[#C17C5C] transition-colors" size={14} />
                      </button>
                    ))}
                  </div>

                  <div className="text-center">
                    <button 
                      onClick={() => setGameState(prev => ({ ...prev, phase: "DISCUSSION" }))}
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
                            <p className="text-[#A49F96] text-[9px] font-black uppercase tracking-widest mb-1">Yakin Eksekusi?</p>
                            <h3 className="text-xl font-black text-[#4A453E]">{playerToEliminate.name}</h3>
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
                        eliminatedPlayer.role === "CIVILIAN" ? "border-[#4A5D4E] bg-[#FDFCFB]" : "border-[#C17C5C] bg-[#FDFCFB]"
                      }`}
                    >
                      {eliminatedPlayer.role === "CIVILIAN" ? (
                        <Heart size={72} className="text-[#4A5D4E] fill-[#4A5D4E]" />
                      ) : (
                        <Ghost size={72} className="text-[#C17C5C]" />
                      )}
                    </motion.div>
                    <div className="px-5 py-1.5 bg-[#4A453E] text-white rounded-full absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap font-black text-xs tracking-tighter">
                      {eliminatedPlayer.name.toUpperCase()} KELUAR!
                    </div>
                  </div>

                  <div className={`p-8 rounded-[3rem] border-4 w-full shadow-lg ${
                    eliminatedPlayer.role === "CIVILIAN" 
                    ? "bg-[#4A5D4E]/10 border-[#4A5D4E]" 
                    : "bg-[#C17C5C]/10 border-[#C17C5C]"
                  }`}>
                    <p className="text-[#A49F96] font-black uppercase tracking-[0.2em] text-[10px] mb-3">Identitas Aslinya:</p>
                    <h3 className={`text-4xl font-black tracking-tight uppercase ${
                      eliminatedPlayer.role === "CIVILIAN" ? "text-[#4A5D4E]" : "text-[#C17C5C]"
                    }`}>
                      {eliminatedPlayer.role === "CIVILIAN" ? "Warga!" : "Penyusup!"}
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
                  className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-10"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ 
                        y: [0, -20, 0],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                    >
                      <Trophy size={120} className="text-[#8E745A] drop-shadow-2xl" />
                    </motion.div>
                    <div className="absolute -top-3 -right-3 p-2 bg-[#4A5D4E] rounded-full text-white text-[10px] font-black rotate-12 shadow-lg tracking-wider">MENANG!</div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-5xl font-black tracking-tighter text-[#4A453E] uppercase">
                      {gameState.winner === "CIVILIANS" ? "WARGA" : "PENYUSUP"}
                      <span className="block text-3xl mt-1 text-[#8E745A]">JUARANYA!</span>
                    </h2>
                  </div>

                  <div className="w-full bg-[#FDFCFB] p-8 rounded-[3rem] shadow-xl shadow-[#D8D2C2]/30 border-4 border-[#E6E2D9]">
                    <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-[#A49F96] mb-6 italic">Rahasia Kata</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-5 bg-[#F5F2EA] rounded-2xl border-2 border-[#E6E2D9]">
                        <p className="text-[#4A5D4E] text-[9px] font-black uppercase mb-1">Pasukan Warga</p>
                        <p className="text-xl font-black text-[#4A453E] tracking-tight">{gameState.wordPair?.civilian}</p>
                      </div>
                      <div className="p-5 bg-[#F5F2EA] rounded-2xl border-2 border-[#E6E2D9]">
                        <p className="text-[#C17C5C] text-[9px] font-black uppercase mb-1">Kelompok Penyusup</p>
                        <p className="text-xl font-black text-[#C17C5C] tracking-tight">{gameState.wordPair?.undercover}</p>
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
                    <UserPlus className="text-[#4A5D4E]" size={28} />
                  </div>
                  <h3 className="text-xl font-black text-[#4A453E]">Siapa Kamu?</h3>
                  <p className="text-[#A49F96] text-[10px] font-bold mt-1 uppercase tracking-tight">Ketik namamu di bawah ini</p>
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
                      onKeyPress={(e) => e.key === "Enter" && confirmPlayerName(newName)}
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

        {/* History Modal */}
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
                  <h3 className="text-xl font-black text-[#4A453E] uppercase tracking-tighter">History Pemain</h3>
                  <p className="text-[#A49F96] text-[9px] font-black uppercase tracking-widest mt-1 italic">Pilih nama yang sudah terdaftar</p>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                  {pastPlayers.slice().reverse().map((name) => {
                    const isAlreadyInGame = gameState.players.some(p => p.name === name);
                    return (
                      <button
                        key={name}
                        disabled={isAlreadyInGame}
                        onClick={() => confirmPlayerName(name)}
                        className={`w-full px-5 py-4 rounded-2xl font-bold flex items-center justify-between transition-all ${
                          isAlreadyInGame 
                          ? "bg-[#E6E2D9]/30 text-[#D3CFC6] cursor-not-allowed grayscale" 
                          : "bg-[#F5F2EA] text-[#8E745A] border border-[#E6E2D9] active:scale-95 hover:bg-[#E6E2D9]/50"
                        }`}
                      >
                        <span className="text-sm truncate pr-2">{name}</span>
                        {isAlreadyInGame && (
                          <span className="text-[8px] font-black bg-[#E6E2D9] px-2 py-1 rounded-full text-[#A49F96] uppercase">In Game</span>
                        )}
                        {!isAlreadyInGame && <ChevronRight size={16} />}
                      </button>
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
      </main>

      <footer className="w-full max-w-md py-8 text-center text-[#A49F96] text-[10px] font-black uppercase tracking-[0.6em]">
        Undercover Indonesia • 2026
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E6E2D9; border-radius: 10px; }
      `}} />
    </div>
  );
}
