"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { createGame } from "@/lib/onlineGameService";
import { useEffect, useState } from "react";
import Link from "next/link";

type Deck = {
  id: string;
  name: string;
};

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [creatingGameId, setCreatingGameId] = useState<string | null>(null);
  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null);
  const [shareGameUrl, setShareGameUrl] = useState<string | null>(null);
  const router = useRouter();

  // =========================
  // CHARGEMENT DES DECKS
  // =========================
  useEffect(() => {
    const loadDecks = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("decks")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error(error);
        setErrorMsg("Impossible de charger les decks.");
        setLoading(false);
        return;
      }

      setDecks(data ?? []);
      setLoading(false);
    };

    loadDecks();
  }, []);

  // =========================
  // CRÉER UNE PARTIE
  // =========================
const handleCreateGame = async (deckId: string) => {
  try {
    const gameId = crypto.randomUUID();
    setCreatingGameId(gameId);

    await createGame(gameId, deckId);

    const url = `${window.location.origin}/play/${gameId}?p=2`;
    setShareGameUrl(url);
  } catch (e) {
    console.error(e);
    setErrorMsg("Impossible de créer la partie.");
    setCreatingGameId(null);
  }
};

  // =========================
  // SUPPRIMER UN DECK
  // =========================
  const handleDeleteDeck = async (deckId: string) => {
    const confirmed = window.confirm(
      "⚠️ Supprimer ce deck ? Cette action est définitive."
    );
    if (!confirmed) return;

    setDeletingDeckId(deckId);
    setErrorMsg(null);

    try {
      // 1️⃣ supprimer les cartes du deck
      const { error: cardsError } = await supabase
        .from("deck_cards")
        .delete()
        .eq("deck_id", deckId);

      if (cardsError) {
        throw cardsError;
      }

      // 2️⃣ supprimer le deck
      const { error: deckError } = await supabase
        .from("decks")
        .delete()
        .eq("id", deckId);

      if (deckError) {
        throw deckError;
      }

      // 3️⃣ MAJ UI
      setDecks((prev) => prev.filter((d) => d.id !== deckId));
    } catch (e) {
      console.error(e);
      setErrorMsg("Impossible de supprimer le deck.");
    } finally {
      setDeletingDeckId(null);
    }
  };

  // =========================
  // RENDER
  // =========================
  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Chargement des decks...</p>
      </main>
    );
  }

  if (errorMsg) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-red-400">{errorMsg}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center pt-16">
      <h1 className="text-3xl font-bold mb-6">Mes decks</h1>

      {/* BOUTON CRÉER */}
      <Link
        href="/decks/create"
        className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded bg-green-600 hover:bg-green-500 text-white"
      >
        ➕ Créer un nouveau deck
      </Link>

      <div className="w-full max-w-3xl px-4 space-y-4">
        {decks.length === 0 && (
          <p className="text-center text-gray-400">
            Aucun deck pour le moment.
          </p>
        )}

        {decks.map((deck) => (
          <div
            key={deck.id}
            className="flex items-center justify-between bg-slate-900 px-4 py-3 rounded-lg"
          >
            <span className="font-medium">{deck.name}</span>

            <div className="flex gap-2">
              {/* JOUER */}
              <button
                onClick={() => void handleCreateGame(deck.id)}
                disabled={creatingGameId !== null}
                className="px-3 py-1.5 rounded bg-blue-600 text-sm hover:bg-blue-500 disabled:opacity-50"
              >
                Créer partie (J1)
              </button>

              {/* ÉDITER */}
              <Link
                href={`/decks/${deck.id}`}
                className="px-3 py-1.5 rounded bg-slate-700 text-sm hover:bg-slate-600"
              >
                Éditer
              </Link>

              {/* SUPPRIMER */}
              <button
                onClick={() => handleDeleteDeck(deck.id)}
                disabled={deletingDeckId === deck.id}
                className="px-3 py-1.5 rounded bg-red-600 text-sm hover:bg-red-500 disabled:opacity-50"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

{shareGameUrl && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-md space-y-4">
      <h2 className="text-lg font-bold">Inviter un joueur</h2>

      <p className="text-sm text-gray-300">
        Envoie ce lien au second joueur :
      </p>

      <input
        readOnly
        value={shareGameUrl}
        className="w-full px-3 py-2 bg-black border border-gray-600 rounded text-sm"
        onFocus={(e) => e.target.select()}
      />

      <div className="flex justify-between">
        <button
          onClick={() => {
            const gameId = shareGameUrl.split("/play/")[1].split("?")[0];
            router.push(`/play/${gameId}?p=1`);
          }}
          className="px-4 py-2 bg-blue-600 rounded"
        >
          Lancer la partie (J1)
        </button>

        <button
          onClick={() => {
            setShareGameUrl(null);
            setCreatingGameId(null);
          }}
          className="px-4 py-2 bg-slate-700 rounded"
        >
          Fermer
        </button>
      </div>
    </div>
  </div>
)}

    </main>
  );
}
