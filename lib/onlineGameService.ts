// lib/onlineGameService.ts
import { supabase } from "@/lib/supabaseClient";
import type { GameState } from "@/types/gameOnline";
import type { BoardCell } from "@/types/game";
import type { Card } from "@/types/game";

export type GameMeta = {
  id: string;
  deck_id_p1: string | null;
  deck_id_p2: string | null;
  status: string;
  state: GameState | null;
};

/**
 * Création de l'état initial du jeu
 */
function createInitialState(): GameState {
  const emptyBoard: BoardCell[] = Array.from({ length: 9 }, () => ({
    card: null,
    owner: null,
  }));

  return {
    board: emptyBoard,
    hands: {
      1: [] as Card[],
      2: [] as Card[],
    },
    currentPlayer: 1,
    winner: null,
    secondsLeft: 30,
  };
}

/**
 * Crée une nouvelle partie avec le deck du joueur 1
 */
export async function createGame(
  gameId: string,
  deckIdP1: string
): Promise<void> {
  const initialState = createInitialState();

  const { error } = await supabase.from("tcg_games").insert({
    id: gameId,
    deck_id: deckIdP1,      // compat policies existantes
    deck_id_p1: deckIdP1,
    deck_id_p2: null,
    state: initialState,    // ✅ ÉTAT INITIAL CRÉÉ ICI
    status: "active",
  });

  if (error) {
    console.error("createGame error:", error);
    throw error;
  }
}

/**
 * Charge la partie complète
 */
export async function loadGame(gameId: string): Promise<GameMeta | null> {
  const { data, error } = await supabase
    .from("tcg_games")
    .select("id, deck_id_p1, deck_id_p2, status, state")
    .eq("id", gameId)
    .maybeSingle();

  if (error) {
    console.error("loadGame error:", error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id as string,
    deck_id_p1: data.deck_id_p1 as string | null,
    deck_id_p2: data.deck_id_p2 as string | null,
    status: (data.status as string) ?? "waiting",
    state: (data.state as GameState | null) ?? null,
  };
}

/**
 * Sauvegarde de l'état à chaque coup
 */
export async function saveGameState(
  gameId: string,
  state: GameState
): Promise<void> {
  const { error } = await supabase
    .from("tcg_games")
    .update({
      state,
      status: "active",
    })
    .eq("id", gameId);

  if (error) {
    console.error("saveGameState error:", error);
    throw error;
  }
}

/**
 * (optionnel plus tard) joueur 2 choisit son deck
 */
export async function setDeckP2AndInitialState(
  gameId: string,
  deckIdP2: string,
  initialState: GameState
): Promise<void> {
  const { error } = await supabase
    .from("tcg_games")
    .update({
      deck_id_p2: deckIdP2,
      state: initialState,
      status: "active",
    })
    .eq("id", gameId);

  if (error) {
    console.error("setDeckP2AndInitialState error:", error);
    throw error;
  }
}