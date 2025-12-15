// lib/gameState.ts
import type { GameState } from "@/types/gameOnline";
import type { BoardCell, Card, Player } from "@/types/game";

/**
 * Construit un GameState en prenant 5 cartes pour chaque joueur.
 * - hand1Cards / hand2Cards : toutes les cartes dispo de chaque deck (avec quantités déjà dupliquées)
 */
export function createInitialGameStateFromTwoDecks(
  hand1Cards: Card[],
  hand2Cards: Card[]
): GameState {
  const safe1 = hand1Cards ?? [];
  const safe2 = hand2Cards ?? [];

  const hand1 = safe1.slice(0, 5);
  const hand2 = safe2.slice(0, 5);

  // si un deck n'a pas 5 cartes (dev / test)
  while (hand1.length < 5 && safe1.length > 0) {
    hand1.push(safe1[hand1.length % safe1.length]);
  }
  while (hand2.length < 5 && safe2.length > 0) {
    hand2.push(safe2[hand2.length % safe2.length]);
  }

  const emptyBoard: BoardCell[] = Array.from({ length: 9 }, () => ({
    card: null,
    owner: null,
  }));

  const currentPlayer: Player = 1;

  return {
    board: emptyBoard,
    hands: {
      1: hand1,
      2: hand2,
    },
    currentPlayer,
    winner: null,
    secondsLeft: 30,
  };
}
