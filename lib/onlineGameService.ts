// lib/onlineGameService.ts
import { supabase } from "@/lib/supabaseClient";
import type { GameState } from "@/types/gameOnline";

export type GameMeta = {
  id: string;
  deck_id_p1: string | null;
  deck_id_p2: string | null;
  status: string;
  state: GameState | null;
};

/**
 * Crée une nouvelle partie avec le deck du joueur 1.
 * - gameId : id de room (crypto.randomUUID côté client)
 * - deckIdP1 : deck choisi par le joueur 1
 */
export async function createGame(
  gameId: string,
  deckIdP1: string
): Promise<void> {
  const { error } = await supabase.from("tcg_games").insert({
    id: gameId,
    // ⬇️ on continue d'alimenter l’ancien champ
    deck_id: deckIdP1,      // <-- important pour NOT NULL / policies existantes
    deck_id_p1: deckIdP1,
    deck_id_p2: null,
    state: null,
    status: "waiting",
  });

  if (error) {
    console.error("createGame error:", error);
    throw error;
  }
}


/**
 * Charge la partie complète (deck P1/P2 + state + status)
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
 * Met à jour l'état de la partie (utilisé à chaque coup).
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
 * Utilisé quand le joueur 2 choisit son deck et qu'on initialise la partie.
 * On fixe deck_id_p2 et l'état initial en même temps.
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
