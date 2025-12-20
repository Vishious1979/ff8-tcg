"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { setDeckP2AndInitialState } from "@/lib/onlineGameService";
import type { GameState } from "@/types/gameOnline";
import type { BoardCell, Card } from "@/types/game";

type Deck = {
  id: string;
  name: string;
};

export default function JoinGamePage() {
  const { gameId } = useParams() as { gameId: string };
  const router = useRouter();

  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // =========================
  // Chargement des decks (J2)
  // =========================
  useEffect(() => {
    const loadDecks = async () => {
      try {
        const { data, error } = await supabase
          .from("decks")
          .select("id, name")
          .order("name");

        if (error) throw error;

        setDecks(data ?? []);
      } catch (e) {
        console.error(e);
        setError("Impossible de charger les decks.");
      } finally {
        setLoading(false);
      }
    };

    loadDecks();
  }, []);

  // =========================
  // Validation J2
  // =========================
  const handleJoin = async () => {
    if (!selectedDeckId) return;

    try {
      // 1️⃣ récupérer le deck du joueur 1
      const { data: game, error: gameError } = await supabase
        .from("tcg_games")
        .select("deck_id_p1")
        .eq("id", gameId)
        .single();

      if (gameError || !game?.deck_id_p1) {
        throw new Error("Deck du joueur 1 introuvable.");
      }

      // 2️⃣ charger les cartes du deck J1
      const { data: deck1Cards, error: deck1Error } = await supabase
        .from("deck_cards")
        .select("card:cards(*)")
        .eq("deck_id", game.deck_id_p1);

      if (deck1Error || !deck1Cards) {
        throw new Error("Impossible de charger les cartes du joueur 1.");
      }

      // 3️⃣ charger les cartes du deck J2
      const { data: deck2Cards, error: deck2Error } = await supabase
        .from("deck_cards")
        .select("card:cards(*)")
        .eq("deck_id", selectedDeckId);

      if (deck2Error || !deck2Cards) {
        throw new Error("Impossible de charger les cartes du joueur 2.");
      }

      // 4️⃣ plateau vide
      const emptyBoard: BoardCell[] = Array.from({ length: 9 }, () => ({
        card: null,
        owner: null,
      }));

      // 5️⃣ état initial COMPLET
      const initialState: GameState = {
        board: emptyBoard,
        hands: {
          1: deck1Cards.map((d: any) => d.card as Card),
          2: deck2Cards.map((d: any) => d.card as Card),
        },
        currentPlayer: 1,
        winner: null,
        secondsLeft: 30,
      };

      // 6️⃣ sauvegarde finale
      await setDeckP2AndInitialState(gameId, selectedDeckId, initialState);

      // 7️⃣ redirection J2
      router.push(`/play/${gameId}?p=2`);
    } catch (e) {
      console.error(e);
      setError("Impossible de rejoindre la partie.");
    }
  };

  // =========================
  // RENDER
  // =========================
  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Chargement…
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center pt-16 gap-6">
      <h1 className="text-2xl font-bold">Choisis ton deck</h1>

      <div className="w-full max-w-md space-y-2">
        {decks.map((deck) => (
          <label
            key={deck.id}
            className={`block px-4 py-2 rounded border cursor-pointer ${
              selectedDeckId === deck.id
                ? "border-blue-500 bg-slate-800"
                : "border-slate-700"
            }`}
          >
            <input
              type="radio"
              name="deck"
              value={deck.id}
              className="mr-2"
              onChange={() => setSelectedDeckId(deck.id)}
            />
            {deck.name}
          </label>
        ))}
      </div>

      <button
        onClick={handleJoin}
        disabled={!selectedDeckId}
        className="px-6 py-2 bg-blue-600 rounded disabled:opacity-50"
      >
        Rejoindre la partie
      </button>
    </main>
  );
}