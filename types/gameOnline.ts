// types/gameOnline.ts

import type { BoardCell, Card, Player } from "./game";

/**
 * État complet d'une partie TCG.
 * C'est cet objet qu'on stockera dans la colonne "state" de la table tcg_games.
 */
export type GameState = {
  board: BoardCell[];              // la grille 3x3
  hands: {
    1: Card[];                     // main du joueur 1
    2: Card[];                     // main du joueur 2
  };
  currentPlayer: Player;           // 1 ou 2
  winner: Player | "draw" | null;  // vainqueur ou égalité / pas fini
  secondsLeft: number;             // temps restant pour le tour en cours
};
