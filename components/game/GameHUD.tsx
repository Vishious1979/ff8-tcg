"use client";

import { Player } from "@/types/game";
import type { BoardCell } from "@/types/game";

type Props = {
  board: BoardCell[];
  currentPlayer: Player;
  winner: Player | "draw" | null;
};

export default function GameHUD({ board, currentPlayer, winner }: Props) {
  const scoreP1 = board.filter((c) => c.owner === 1).length;
  const scoreP2 = board.filter((c) => c.owner === 2).length;

  return (
    <div className="w-full flex justify-between items-center px-8 py-4 bg-black/70 text-white">
      {/* Joueur 1 */}
      <div className="flex flex-col items-start">
        <span className="font-bold text-blue-400">Joueur 1</span>
        <span>Score : {scoreP1}</span>
      </div>

      {/* Centre */}
      <div className="text-center">
        {winner ? (
          <span className="text-xl font-bold text-green-400">
            {winner === "draw" ? "Égalité" : `Victoire J${winner}`}
          </span>
        ) : (
          <span className="text-lg">
            Tour du joueur{" "}
            <span className="font-bold text-yellow-400">
              J{currentPlayer}
            </span>
          </span>
        )}
      </div>

      {/* Joueur 2 */}
      <div className="flex flex-col items-end">
        <span className="font-bold text-red-400">Joueur 2</span>
        <span>Score : {scoreP2}</span>
      </div>
    </div>
  );
}