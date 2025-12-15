"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { Player, Card, BoardCell } from "@/types/game";
import PlayerHand from "@/components/game/PlayerHand";
import Board from "@/components/game/Board";


import {
  loadGame,
  saveGameState,
  setDeckP2AndInitialState,
} from "@/lib/onlineGameService";

import { createInitialGameStateFromTwoDecks } from "@/lib/gameState";
import type { GameState } from "@/types/gameOnline";

type Deck = {
  id: string;
  name: string;
};

type DeckCardRow = {
  quantity: number | null;
  card: Card | Card[] | null;
};

type ResolutionPreset = "2560x1440" | "1920x1080" | "1280x720";

type LayoutConfig = {
  cardWidth: number;
  cardHeight: number;
  cellWidth: number;
  cellHeight: number;
};

const LAYOUTS: Record<ResolutionPreset, LayoutConfig> = {
  "1280x720": {
    cardWidth: 120,
    cardHeight: 170,
    cellWidth: 120,
    cellHeight: 170,
  },
  "1920x1080": {
    cardWidth: 150,
    cardHeight: 210,
    cellWidth: 150,
    cellHeight: 210,
  },
  "2560x1440": {
    cardWidth: 190,
    cardHeight: 260,
    cellWidth: 190,
    cellHeight: 260,
  },
};

export default function GamePage() {
  const router = useRouter();
  const params = useParams() as { gameId?: string };
  const gameId = params.gameId as string | undefined;

  const searchParams = useSearchParams();
  const initialPlayer = (searchParams.get("p") === "2" ? 2 : 1) as Player;
  const [clientPlayer] = useState<Player>(initialPlayer);

  const [gameMeta, setGameMeta] = useState<{
  id: string;
  deck_id_p1: string | null;
  deck_id_p2: string | null;
  state: GameState | null;
} | null>(null);

  const [deckP1, setDeckP1] = useState<Deck | null>(null);
  const [deckP2, setDeckP2] = useState<Deck | null>(null);

  const [board, setBoard] = useState<BoardCell[]>([]);
  const [hands, setHands] = useState<{ 1: Card[]; 2: Card[] } | null>(
    null
  );
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [winner, setWinner] = useState<Player | "draw" | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(30);

  // pour le choix du deck du joueur 2
  const [allDecks, setAllDecks] = useState<Deck[]>([]);
  const [selectedDeckP2Id, setSelectedDeckP2Id] = useState<string | null>(
    null
  );
  const [choosingP2Deck, setChoosingP2Deck] = useState(false);

  const [resolution, setResolution] =
    useState<ResolutionPreset>("2560x1440");

  const layout = useMemo(
    () => LAYOUTS[resolution],
    [resolution]
  );

  const imageBaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL +
    "/storage/v1/object/public/card-images";

  const { score1, score2 } = useMemo(() => {
    let s1 = 0;
    let s2 = 0;
    board.forEach((cell) => {
      if (cell.owner === 1) s1 += 1;
      else if (cell.owner === 2) s2 += 1;
    });
    return { score1: s1, score2: s2 };
  }, [board]);

  const otherPlayer: Player = (currentPlayer === 1 ? 2 : 1) as Player;

  // ----------- UTIL : charger les cartes d'un deck en liste "flat" -----------
  const loadFlatCardsForDeck = async (deckId: string): Promise<Card[]> => {
    const { data, error } = await supabase
      .from("deck_cards")
      .select(
        "quantity, card:cards (id, code, name, level, cost, value_top, value_right, value_bottom, value_left, image_name)"
      )
      .eq("deck_id", deckId);

    if (error) {
      console.error("loadFlatCardsForDeck error:", error);
      throw error;
    }

    const rows: DeckCardRow[] = (data as DeckCardRow[]) ?? [];
    const flatCards: Card[] = [];

    rows.forEach((row) => {
      let card: Card | null = null;
      if (Array.isArray(row.card)) {
        card = row.card[0] ?? null;
      } else {
        card = row.card as Card | null;
      }
      if (!card) return;

      const qty = row.quantity ?? 1;
      for (let i = 0; i < qty; i += 1) {
        flatCards.push(card);
      }
    });

    return flatCards;
  };

  // ----------- UTIL : vainqueur à partir du board -----------
  const getWinnerFromBoard = (b: BoardCell[]): Player | "draw" | null => {
    let s1 = 0;
    let s2 = 0;
    b.forEach((cell) => {
      if (cell.owner === 1) s1 += 1;
      else if (cell.owner === 2) s2 += 1;
    });
    if (s1 > s2) return 1;
    if (s2 > s1) return 2;
    return "draw";
  };

  // ----------- appliquer un état + sauvegarder en BDD -----------
  const applyAndPersistState = async (
    nextBoard: BoardCell[],
    nextHands: { 1: Card[]; 2: Card[] },
    nextCurrentPlayer: Player,
    nextWinner: Player | "draw" | null,
    nextSecondsLeft: number
  ) => {
    setBoard(nextBoard);
    setHands(nextHands);
    setCurrentPlayer(nextCurrentPlayer);
    setWinner(nextWinner);
    setSecondsLeft(nextSecondsLeft);
    setSelectedIndex(null);

    if (!gameId) return;

    const nextState: GameState = {
      board: nextBoard,
      hands: nextHands,
      currentPlayer: nextCurrentPlayer,
      winner: nextWinner,
      secondsLeft: nextSecondsLeft,
    };

    try {
      await saveGameState(gameId, nextState);
    } catch (e) {
      console.error("Erreur saveGameState pendant la partie :", e);
      setErrorMsg("Erreur lors de la sauvegarde de la partie.");
    }
  };

  // ================== CHARGEMENT INITIAL ==================
  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      setErrorMsg(null);

      if (!gameId) {
        setErrorMsg("Partie introuvable (URL invalide).");
        setLoading(false);
        return;
      }

      const meta = await loadGame(gameId);
      if (!meta) {
        setErrorMsg("Partie introuvable.");
        setLoading(false);
        return;
      }
      setGameMeta(meta);

      // charger le deck P1
      if (meta.deck_id_p1) {
        const { data: deck1, error: d1error } = await supabase
          .from("decks")
          .select("id, name")
          .eq("id", meta.deck_id_p1)
          .maybeSingle();
        if (d1error) {
          console.error(d1error);
        } else if (deck1) {
          setDeckP1(deck1 as Deck);
        }
      }

      // deck P2 s'il existe déjà
      if (meta.deck_id_p2) {
        const { data: deck2, error: d2error } = await supabase
          .from("decks")
          .select("id, name")
          .eq("id", meta.deck_id_p2)
          .maybeSingle();
        if (d2error) {
          console.error(d2error);
        } else if (deck2) {
          setDeckP2(deck2 as Deck);
        }
      }

      // s'il y a déjà un état de partie : on l'applique
      if (meta.state) {
        const st = meta.state;
        console.log("🔁 Chargement état existant", {
          hand1_len: st.hands[1].length,
          hand2_len: st.hands[2].length,
        });
        setBoard(st.board);
        setHands(st.hands);
        setCurrentPlayer(st.currentPlayer);
        setWinner(st.winner);
        setSecondsLeft(st.secondsLeft);
        setLoading(false);
        return;
      }

      // sinon : pas encore d'état → on attend le choix du J2
      if (clientPlayer === 1) {
        // J1 attend tranquillement
        setLoading(false);
        return;
      }

      // Joueur 2 : on lui propose de choisir son deck
      const { data: allDecksData, error: decksError } = await supabase
        .from("decks")
        .select("id, name")
        .order("name", { ascending: true });

      if (decksError) {
        console.error(decksError);
        setErrorMsg("Impossible de charger les decks pour le joueur 2.");
        setLoading(false);
        return;
      }

      setAllDecks((allDecksData as Deck[]) ?? []);
      setChoosingP2Deck(true);
      setLoading(false);
    };

    void loadInitial();
  }, [gameId, clientPlayer]);

  // ================== SYNCHRO TEMPS RÉEL ==================
  useEffect(() => {
    if (!gameId) return;

    const channel = supabase
      .channel(`tcg_game_${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tcg_games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const newRow = payload.new as {
            state: GameState | null;
            deck_id_p2: string | null;
            status: string;
          } | null;
          if (!newRow) return;

          if (newRow.state) {
            const st = newRow.state;
            console.log("📡 Realtime update reçu", {
              hand1_len: st.hands[1].length,
              hand2_len: st.hands[2].length,
            });
            setBoard(st.board);
            setHands(st.hands);
            setCurrentPlayer(st.currentPlayer);
            setWinner(st.winner);
            setSecondsLeft(st.secondsLeft);
            setSelectedIndex(null);
          }

          // si le deck P2 vient d'être fixé, on arrête l'écran de choix
          setChoosingP2Deck(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  // ================== CHRONO ==================
  useEffect(() => {
    setSecondsLeft(30);
  }, [currentPlayer]);

  useEffect(() => {
    if (loading || winner || !hands) return;

    // seul l'onglet du joueur dont c'est le tour gère le chrono
    if (clientPlayer !== currentPlayer) return;

    const timer = setTimeout(() => {
      if (secondsLeft <= 1) {
        void autoPlay();
      } else {
        setSecondsLeft((prev) => prev - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    secondsLeft,
    loading,
    winner,
    hands,
    board,
    currentPlayer,
    clientPlayer,
  ]);

  // ================== LOGIQUE DE CHOIX DU DECK P2 ==================
  const handleConfirmDeckP2 = async () => {
    if (!gameId || !gameMeta || !gameMeta.deck_id_p1) {
      console.log("❌ handleConfirmDeckP2: gameId ou deck_id_p1 manquant", {
        gameId,
        gameMeta,
      });
      return;
    }
    if (!selectedDeckP2Id) {
      setErrorMsg("Choisissez un deck pour le joueur 2.");
      return;
    }

    try {
      setErrorMsg(null);
      setLoading(true);

      console.log("▶️ handleConfirmDeckP2: decks utilisés", {
        deckIdP1: gameMeta.deck_id_p1,
        deckIdP2: selectedDeckP2Id,
      });

      const flatP1 = await loadFlatCardsForDeck(gameMeta.deck_id_p1);
      const flatP2 = await loadFlatCardsForDeck(selectedDeckP2Id);

      console.log("📦 flat cards chargées", {
        flatP1_len: flatP1.length,
        flatP2_len: flatP2.length,
      });

      const initialState = createInitialGameStateFromTwoDecks(
        flatP1,
        flatP2
      );

      console.log("🧩 initialState.hands lengths", {
        hand1_len: initialState.hands[1].length,
        hand2_len: initialState.hands[2].length,
      });

      await setDeckP2AndInitialState(
        gameId,
        selectedDeckP2Id,
        initialState
      );

      setDeckP2(
        allDecks.find((d) => d.id === selectedDeckP2Id) ?? null
      );
      setBoard(initialState.board);
      setHands(initialState.hands);
      setCurrentPlayer(initialState.currentPlayer);
      setWinner(initialState.winner);
      setSecondsLeft(initialState.secondsLeft);
      setChoosingP2Deck(false);
    } catch (e) {
      console.error("❌ handleConfirmDeckP2 error:", e);
      setErrorMsg("Impossible d'initialiser la partie.");
    } finally {
      setLoading(false);
    }
  };

  // ================== LOGIQUE DE JEU ==================
  const playMove = async (cardIndex: number, cellIndex: number) => {
    if (!hands) return;
    if (winner) return;

    const targetCell = board[cellIndex];
    if (targetCell.card) return;

    const currentHand = hands[currentPlayer];
    const card = currentHand[cardIndex];
    if (!card) return;

    const newBoard: BoardCell[] = board.map((cell, idx) =>
      idx === cellIndex ? { card, owner: currentPlayer } : { ...cell }
    );

    const newHands: { 1: Card[]; 2: Card[] } = {
      1: [...hands[1]],
      2: [...hands[2]],
    };

    const neighbor = (idx: number | null) =>
      idx === null || idx < 0 || idx > 8 ? null : newBoard[idx];

    const row = Math.floor(cellIndex / 3);
    const col = cellIndex % 3;

    const upIndex = row > 0 ? cellIndex - 3 : null;
    const downIndex = row < 2 ? cellIndex + 3 : null;
    const leftIndex = col > 0 ? cellIndex - 1 : null;
    const rightIndex = col < 2 ? cellIndex + 1 : null;

    const placed = card;

    const up = neighbor(upIndex);
    if (up && up.card && up.owner && up.owner !== currentPlayer) {
      if (placed.value_top > up.card.value_bottom) {
        up.owner = currentPlayer;
      }
    }

    const down = neighbor(downIndex);
    if (down && down.card && down.owner && down.owner !== currentPlayer) {
      if (placed.value_bottom > down.card.value_top) {
        down.owner = currentPlayer;
      }
    }

    const left = neighbor(leftIndex);
    if (left && left.card && left.owner && left.owner !== currentPlayer) {
      if (placed.value_left > left.card.value_right) {
        left.owner = currentPlayer;
      }
    }

    const right = neighbor(rightIndex);
    if (right && right.card && right.owner && right.owner !== currentPlayer) {
      if (placed.value_right > right.card.value_left) {
        right.owner = currentPlayer;
      }
    }

    const newHandCurrent = currentHand.filter((_c, idx) => idx !== cardIndex);
    newHands[currentPlayer] = newHandCurrent;

    const boardFull = newBoard.every((c) => c.card !== null);
    const handsEmpty =
      newHands[1].length === 0 && newHands[2].length === 0;

    let nextWinner: Player | "draw" | null = null;
    let nextCurrentPlayer: Player = currentPlayer;

    if (boardFull || handsEmpty) {
      nextWinner = getWinnerFromBoard(newBoard);
    } else {
      nextCurrentPlayer = (currentPlayer === 1 ? 2 : 1) as Player;
    }

    const nextSecondsLeft = 30;

    await applyAndPersistState(
      newBoard,
      newHands,
      nextCurrentPlayer,
      nextWinner,
      nextSecondsLeft
    );
  };

  const handleSelectCard = (player: Player, index: number) => {
    if (winner) return;
    if (!hands) return;

    if (player !== clientPlayer) return;
    if (currentPlayer !== player) return;

    if (!hands[player][index]) return;
    setSelectedIndex(index);
  };

  const handleCellClick = (cellIndex: number) => {
    if (winner) return;
    if (!hands) return;
    if (selectedIndex === null) return;
    void playMove(selectedIndex, cellIndex);
  };

  async function autoPlay() {
    if (winner) return;
    if (!hands) return;

    const playerHand = hands[currentPlayer];
    const firstEmptyCell = board.findIndex((c) => !c.card);

    if (playerHand.length === 0 || firstEmptyCell === -1) {
      const otherHasCards = hands[otherPlayer].length > 0;
      const boardFull = firstEmptyCell === -1;

      if (!otherHasCards || boardFull) {
        const nextWinner = getWinnerFromBoard(board);
        await applyAndPersistState(
          board,
          hands,
          currentPlayer,
          nextWinner,
          secondsLeft
        );
      } else {
        const nextCurrentPlayer = otherPlayer;
        await applyAndPersistState(
          board,
          hands,
          nextCurrentPlayer,
          null,
          30
        );
      }
      return;
    }

    await playMove(0, firstEmptyCell);
  }

  const handleReset = () => {
    alert("Reset non géré dans cette V1 multi-decks 😉");
  };

  // ================== RENDU ==================
  if (loading) {
    return (
      <main className="h-screen w-screen overflow-hidden bg-black text-white flex items-center justify-center">
        <p>Chargement de la partie...</p>
      </main>
    );
  }

  if (!gameMeta) {
    return (
      <main className="h-screen w-screen overflow-hidden bg-black text-white flex items-center justify-center">
        <p>Partie introuvable.</p>
      </main>
    );
  }

  // Écran spécial : joueur 2 choisit son deck
  if (choosingP2Deck && clientPlayer === 2) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center pt-16">
        <h1 className="text-2xl font-bold mb-4">
          Choisissez votre deck (Joueur 2)
        </h1>
        {errorMsg && (
          <p className="mb-4 text-red-400 text-sm">{errorMsg}</p>
        )}

        <div className="w-full max-w-3xl px-4 space-y-2">
          {allDecks.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDeckP2Id(d.id)}
              className={`w-full text-left px-4 py-2 rounded border ${
                selectedDeckP2Id === d.id
                  ? "bg-blue-600 border-blue-400"
                  : "bg-slate-900 border-slate-700"
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>

        <button
          onClick={() => void handleConfirmDeckP2()}
          className="mt-6 px-4 py-2 rounded bg-green-600 hover:bg-green-500"
        >
          Valider ce deck
        </button>
      </main>
    );
  }

  // Joueur 1 en attente de l'autre
  if (!hands && clientPlayer === 1) {
    return (
      <main className="h-screen w-screen overflow-hidden bg-black text-white flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">
          En attente que le Joueur 2 choisisse son deck...
        </h1>
        <p className="text-sm text-gray-300">
          Partage ce lien à ton adversaire :{" "}
          <span className="font-mono bg-slate-800 px-2 py-1 rounded">
            {typeof window !== "undefined"
              ? window.location.href.replace("p=1", "p=2")
              : ""}
          </span>
        </p>
      </main>
    );
  }

  if (!hands) {
    return (
      <main className="h-screen w-screen overflow-hidden bg-black text-white flex items-center justify-center">
        <p>En attente de l&apos;initialisation de la partie...</p>
      </main>
    );
  }

  const title =
    deckP1 && deckP2
      ? `${deckP1.name} (J1) vs ${deckP2.name} (J2)`
      : "Partie TCG";

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#05060a] text-white">
      <div className="h-full w-full grid grid-cols-3 bg-slate-900/70">
        {/* Colonne 1 : Joueur 1 */}
        <section className="border-r border-slate-800 flex flex-col h-full">
          <div className="p-4">
            <h2
              className={`text-2xl font-bold ${
                currentPlayer === 1 ? "text-blue-300" : ""
              }`}
            >
              Joueur 1
            </h2>
            <p className="mt-2 text-base">
              Score : <span className="font-semibold">{score1}</span> points
            </p>
            <p className="text-xs text-gray-400">
              Cartes en main : {hands[1].length}
            </p>
          </div>

          <div className="flex-1 flex items-center justify-center px-2">
            <PlayerHand
              player={1 as Player}
              cards={hands[1]}
              currentPlayer={currentPlayer}
              selectedIndex={selectedIndex}
              onSelectCard={(idx) => handleSelectCard(1 as Player, idx)}
              imageBaseUrl={imageBaseUrl}
              cardWidth={layout.cardWidth}
              cardHeight={layout.cardHeight}
            />
          </div>
        </section>

        {/* Colonne 2 : Board + timer */}
        <section className="flex flex-col h-full">
          <div className="p-4 flex flex-col items-center gap-2">
            <div className="w-full flex justify-between items-center">
              <button
                onClick={() => router.push("/decks")}
                className="text-sm text-gray-300 underline"
              >
                ← Retour aux decks
              </button>

              <select
                value={resolution}
                onChange={(e) =>
                  setResolution(e.target.value as ResolutionPreset)
                }
                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs sm:text-sm"
              >
                <option value="2560x1440">2560 × 1440</option>
                <option value="1920x1080">1920 × 1080</option>
                <option value="1280x720">1280 × 720</option>
              </select>
            </div>

            <h1 className="text-xl font-bold text-center truncate max-w-[90%]">
              {title}
            </h1>

            <p className="text-xs text-gray-300">
              Vous jouez en tant que{" "}
              <span className="font-semibold">Joueur {clientPlayer}</span>
            </p>

            <p className="text-sm">
              Temps restant :{" "}
              <span
                className={
                  secondsLeft <= 5
                    ? "text-red-400 font-bold"
                    : "font-semibold"
                }
              >
                {secondsLeft} sec
              </span>
            </p>

            {winner && (
              <p className="text-sm font-bold">
                {winner === "draw"
                  ? "Égalité !"
                  : winner === 1
                  ? "Victoire Joueur 1"
                  : "Victoire Joueur 2"}
              </p>
            )}
            {errorMsg && (
              <p className="text-xs text-red-400 text-center">{errorMsg}</p>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center px-2">
            <Board
              board={board}
              onCellClick={handleCellClick}
              imageBaseUrl={imageBaseUrl}
              cellWidth={layout.cellWidth}
              cellHeight={layout.cardHeight}
            />
          </div>

          <div className="p-3 flex justify-center">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded bg-gray-700 text-white text-sm hover:bg-gray-600"
            >
              Recommencer la partie
            </button>
          </div>
        </section>

        {/* Colonne 3 : Joueur 2 */}
        <section className="border-l border-slate-800 flex flex-col h-full">
          <div className="p-4 text-right">
            <h2
              className={`text-2xl font-bold ${
                currentPlayer === 2 ? "text-red-300" : ""
              }`}
            >
              Joueur 2
            </h2>
            <p className="mt-2 text-base">
              Score : <span className="font-semibold">{score2}</span> points
            </p>
            <p className="text-xs text-gray-400">
              Cartes en main : {hands[2].length}
            </p>
          </div>

          <div className="flex-1 flex items-center justify-center px-2">
            <PlayerHand
              player={2 as Player}
              cards={hands[2]}
              currentPlayer={currentPlayer}
              selectedIndex={selectedIndex}
              onSelectCard={(idx: number) =>
 handleSelectCard(2 as Player, idx)}
              imageBaseUrl={imageBaseUrl}
              cardWidth={layout.cardWidth}
              cardHeight={layout.cardHeight}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
