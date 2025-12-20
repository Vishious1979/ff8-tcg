"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { loadGame } from "@/lib/onlineGameService";

import { Player, Card, BoardCell } from "@/types/game";
import type { GameState } from "@/types/gameOnline";

import Board from "@/components/game/Board";
import PlayerHand from "@/components/game/PlayerHand";

/* =========================
   TYPES
========================= */

type TcgGameRow = {
  id: string;
  state: GameState | null;
};

/* =========================
   COMPONENT
========================= */

export default function GamePage() {
  const { gameId } = useParams() as { gameId: string };
  const searchParams = useSearchParams();
  const router = useRouter();

  const clientPlayer: Player =
    searchParams.get("p") === "2" ? 2 : 1;

  /* =========================
     STATE
  ========================= */

  const [board, setBoard] = useState<BoardCell[]>([]);
  const [hands, setHands] = useState<{ 1: Card[]; 2: Card[] } | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [winner, setWinner] = useState<Player | "draw" | null>(null);
  const [loading, setLoading] = useState(true);

  const imageBaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL +
    "/storage/v1/object/public/card-images";

  /* =========================
     HUD
  ========================= */

  const scoreP1 = board.filter((c) => c.owner === 1).length;
  const scoreP2 = board.filter((c) => c.owner === 2).length;

  /* =========================
     LOAD GAME
  ========================= */

  useEffect(() => {
    const load = async () => {
      const game = await loadGame(gameId);

      if (!game) {
        setLoading(false);
        return;
      }

      if (clientPlayer === 2 && !game.deck_id_p2) {
        router.push(`/play/${gameId}/join`);
        return;
      }

      if (!game.state) {
        setLoading(false);
        return;
      }

      setBoard(game.state.board);
      setHands(game.state.hands);
      setCurrentPlayer(game.state.currentPlayer);
      setWinner(game.state.winner);
      setLoading(false);
    };

    load();
  }, [gameId, clientPlayer, router]);

  /* =========================
     REALTIME
  ========================= */

  useEffect(() => {
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tcg_games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const row = payload.new as TcgGameRow | null;
          if (!row?.state) return;

          setBoard(row.state.board);
          setHands(row.state.hands);
          setCurrentPlayer(row.state.currentPlayer);
          setWinner(row.state.winner);
          setSelectedIndex(null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  /* =========================
     PLAY MOVE
  ========================= */

  const playMove = async (cardIndex: number, cellIndex: number) => {
    if (!hands || winner) return;
    if (currentPlayer !== clientPlayer) return;
    if (board[cellIndex].card) return;

    const card = hands[currentPlayer][cardIndex];
    if (!card) return;

    const newBoard: BoardCell[] = board.map((c) => ({
      card: c.card,
      owner: c.owner,
    }));

    newBoard[cellIndex] = {
      card,
      owner: currentPlayer,
    };

    const row = Math.floor(cellIndex / 3);
    const col = cellIndex % 3;

    const checks = [
      { idx: row > 0 ? cellIndex - 3 : null, a: card.value_top, b: "value_bottom" },
      { idx: row < 2 ? cellIndex + 3 : null, a: card.value_bottom, b: "value_top" },
      { idx: col > 0 ? cellIndex - 1 : null, a: card.value_left, b: "value_right" },
      { idx: col < 2 ? cellIndex + 1 : null, a: card.value_right, b: "value_left" },
    ] as const;

    checks.forEach(({ idx, a, b }) => {
      if (idx === null) return;
      const target = newBoard[idx];
      if (!target.card || target.owner === currentPlayer) return;
      if (a > target.card[b]) {
        newBoard[idx] = { ...target, owner: currentPlayer };
      }
    });

    const newHands = {
      1: [...hands[1]],
      2: [...hands[2]],
    };
    newHands[currentPlayer].splice(cardIndex, 1);

    const boardFull = newBoard.every((c) => c.card);
    let nextWinner: Player | "draw" | null = null;

    if (boardFull) {
      const s1 = newBoard.filter((c) => c.owner === 1).length;
      const s2 = newBoard.filter((c) => c.owner === 2).length;
      nextWinner = s1 === s2 ? "draw" : s1 > s2 ? 1 : 2;
    }

    const nextState: GameState = {
      board: newBoard,
      hands: newHands,
      currentPlayer:
        nextWinner ? currentPlayer : currentPlayer === 1 ? 2 : 1,
      winner: nextWinner,
      secondsLeft: 30,
    };

    setBoard(newBoard);
    setHands(newHands);
    setCurrentPlayer(nextState.currentPlayer);
    setWinner(nextWinner);
    setSelectedIndex(null);

    await supabase
      .from("tcg_games")
      .update({ state: nextState })
      .eq("id", gameId);
  };

  /* =========================
     RENDER
  ========================= */

  if (loading || !hands) {
    return <div className="text-white p-8">Chargement…</div>;
  }

  return (
    <main
      className="h-screen w-screen text-white flex flex-col"
      style={{
        backgroundImage: "url(/images/bg-ff8.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* HUD */}
      <div className="flex justify-between items-center px-8 py-4 bg-black/70">
        <div className="text-blue-400 font-bold">
          Joueur 1 — Score {scoreP1}
        </div>

        <div className="text-center">
          {winner ? (
            <span className="text-xl font-bold text-green-400">
              {winner === "draw" ? "Égalité" : `Victoire J${winner}`}
            </span>
          ) : (
            <span>
              Tour du joueur{" "}
              <strong className="text-yellow-400">
                J{currentPlayer}
              </strong>
            </span>
          )}
        </div>

        <div className="text-red-400 font-bold">
          Joueur 2 — Score {scoreP2}
        </div>
      </div>

      {/* GAME */}
      <div className="flex-1 grid grid-cols-3 place-items-center bg-black/50">
        <PlayerHand
          player={1}
          cards={hands[1]}
          currentPlayer={currentPlayer}
          selectedIndex={selectedIndex}
          onSelectCard={setSelectedIndex}
          imageBaseUrl={imageBaseUrl}
          cardWidth={150}
          cardHeight={210}
        />

        <div className="p-6 bg-black/40 rounded-xl">
          <Board
            board={board}
            onCellClick={(i) => {
              if (selectedIndex !== null) {
                playMove(selectedIndex, i);
              }
            }}
            imageBaseUrl={imageBaseUrl}
            cellWidth={150}
            cellHeight={210}
          />
        </div>

        <PlayerHand
          player={2}
          cards={hands[2]}
          currentPlayer={currentPlayer}
          selectedIndex={selectedIndex}
          onSelectCard={setSelectedIndex}
          imageBaseUrl={imageBaseUrl}
          cardWidth={150}
          cardHeight={210}
        />
      </div>
    </main>
  );
}