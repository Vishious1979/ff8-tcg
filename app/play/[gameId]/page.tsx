"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { Player, Card, BoardCell } from "@/types/game";
import type { GameState } from "@/types/gameOnline";

import Board from "@/components/game/Board";
import PlayerHand from "@/components/game/PlayerHand";

// 🔒 Typage STRICT de la ligne Supabase
type TcgGameRow = {
  id: string;
  state: GameState | null;
};

export default function GamePage() {
  const params = useParams() as { gameId: string };
  const gameId = params.gameId;

  const searchParams = useSearchParams();
  const clientPlayer: Player =
    searchParams.get("p") === "2" ? 2 : 1;

  const [board, setBoard] = useState<BoardCell[]>([]);
  const [hands, setHands] = useState<{ 1: Card[]; 2: Card[] } | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [winner, setWinner] = useState<Player | "draw" | null>(null);
  const [loading, setLoading] = useState(true);

  const imageBaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL +
    "/storage/v1/object/public/card-images";

  // =============================
  // CHARGEMENT INITIAL
  // =============================
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("tcg_games")
        .select("state")
        .eq("id", gameId)
        .maybeSingle();

      const state = (data as TcgGameRow | null)?.state;
      if (!state) return;

      setBoard(state.board);
      setHands(state.hands);
      setCurrentPlayer(state.currentPlayer);
      setWinner(state.winner);
      setLoading(false);
    };

    load();
  }, [gameId]);

  // =============================
  // REALTIME (SANS any)
  // =============================
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

  // =============================
  // PLAY MOVE (ULTRA CLAIR)
  // =============================
  const playMove = async (cardIndex: number, cellIndex: number) => {
    if (!hands || winner) return;
    if (currentPlayer !== clientPlayer) return;
    if (board[cellIndex].card) return;

    const card = hands[currentPlayer][cardIndex];
    if (!card) return;

    // clone board
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
      currentPlayer: nextWinner ? currentPlayer : currentPlayer === 1 ? 2 : 1,
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

  // =============================
  // RENDER
  // =============================
  if (loading || !hands) {
    return <div className="text-white p-8">Chargement…</div>;
  }

  return (
    <main className="h-screen w-screen bg-black grid grid-cols-3 text-white">
      <PlayerHand
        player={1}
        cards={hands[1]}
        currentPlayer={currentPlayer}
        selectedIndex={selectedIndex}
        onSelectCard={(i) => setSelectedIndex(i)}
        imageBaseUrl={imageBaseUrl}
        cardWidth={150}
        cardHeight={210}
      />

      <Board
        board={board}
        onCellClick={(i) => selectedIndex !== null && playMove(selectedIndex, i)}
        imageBaseUrl={imageBaseUrl}
        cellWidth={150}
        cellHeight={210}
      />

      <PlayerHand
        player={2}
        cards={hands[2]}
        currentPlayer={currentPlayer}
        selectedIndex={selectedIndex}
        onSelectCard={(i) => setSelectedIndex(i)}
        imageBaseUrl={imageBaseUrl}
        cardWidth={150}
        cardHeight={210}
      />
    </main>
  );
}

