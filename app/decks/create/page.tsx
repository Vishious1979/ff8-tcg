"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Card = {
  id: string;
  name: string;
  level: number;
  cost: number;
  value_top: number;
  value_right: number;
  value_bottom: number;
  value_left: number;
};

type SortKey =
  | "level"
  | "name"
  | "cost"
  | "top"
  | "right"
  | "bottom"
  | "left";

type SortDir = "asc" | "desc";

export default function CreateDeckPage() {
  const router = useRouter();

  const [deckName, setDeckName] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortKey>("level");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const MAX_CARDS = 5;
  const MAX_POINTS = 100;

  const totalCost = useMemo(
    () => selected.reduce((sum, c) => sum + c.cost, 0),
    [selected]
  );

  const remainingCards = MAX_CARDS - selected.length;
  const remainingPoints = MAX_POINTS - totalCost;

  useEffect(() => {
    const loadCards = async () => {
      const { data, error } = await supabase
        .from("cards")
        .select(
          "id, name, level, cost, value_top, value_right, value_bottom, value_left"
        )
        .order("level", { ascending: true });

      if (error) {
        console.error(error);
        setErrorMsg("Impossible de charger les cartes.");
        return;
      }

      setCards(data as Card[]);
      setLoading(false);
    };

    loadCards();
  }, []);

  const sortedCards = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;

    return [...cards].sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;

      switch (sortBy) {
        case "level":
          va = a.level;
          vb = b.level;
          break;
        case "name":
          va = a.name;
          vb = b.name;
          break;
        case "cost":
          va = a.cost;
          vb = b.cost;
          break;
        case "top":
          va = a.value_top;
          vb = b.value_top;
          break;
        case "right":
          va = a.value_right;
          vb = b.value_right;
          break;
        case "bottom":
          va = a.value_bottom;
          vb = b.value_bottom;
          break;
        case "left":
          va = a.value_left;
          vb = b.value_left;
          break;
      }

      return va > vb ? dir : va < vb ? -dir : 0;
    });
  }, [cards, sortBy, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const addCard = (card: Card) => {
    if (selected.find((c) => c.id === card.id)) return;
    if (selected.length >= MAX_CARDS) return;
    if (totalCost + card.cost > MAX_POINTS) return;

    setSelected([...selected, card]);
  };

  const removeCard = (id: string) => {
    setSelected(selected.filter((c) => c.id !== id));
  };

  const createDeck = async () => {
    if (!deckName.trim()) {
      setErrorMsg("Nom du deck obligatoire.");
      return;
    }

    if (selected.length !== MAX_CARDS) {
      setErrorMsg("Le deck doit contenir exactement 5 cartes.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("decks")
      .insert({
        name: deckName,
        max_cost: MAX_POINTS,
        user_id: user.id,
      })
      .select()
      .single();

    if (error || !data) {
      console.error(error);
      setErrorMsg("Impossible de créer le deck.");
      return;
    }

    await supabase.from("deck_cards").insert(
      selected.map((c) => ({
        deck_id: data.id,
        card_id: c.id,
        quantity: 1,
      }))
    );

    router.push(`/decks/${data.id}`);
  };

  if (loading) {
    return <main className="p-8 text-white">Chargement…</main>;
  }

  return (
    <main className="min-h-screen p-8 bg-black text-white flex flex-col gap-6">
      <button
        onClick={() => router.push("/decks")}
        className="underline text-sm w-fit"
      >
        ← Retour aux decks
      </button>

      <input
        value={deckName}
        onChange={(e) => setDeckName(e.target.value)}
        placeholder="Nom du deck"
        className="bg-slate-800 px-3 py-2 rounded w-64"
      />

      <div className="flex gap-8">
        {/* TABLE */}
        <div className="flex-1 overflow-auto border border-gray-700">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-black">
              <tr className="border-b border-gray-700">
                {[
                  ["Lvl", "level"],
                  ["Nom", "name"],
                  ["Coût", "cost"],
                  ["H", "top"],
                  ["D", "right"],
                  ["B", "bottom"],
                  ["G", "left"],
                ].map(([label, key]) => (
                  <th
                    key={key}
                    className="px-2 py-1 border-r border-gray-700 cursor-pointer"
                    onClick={() => toggleSort(key as SortKey)}
                  >
                    {label}
                  </th>
                ))}
                <th className="px-2 py-1" />
              </tr>
            </thead>
            <tbody>
              {sortedCards.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-gray-800 hover:bg-gray-900"
                >
                  <td className="px-2 border-r">{c.level}</td>
                  <td className="px-2 border-r">{c.name}</td>
                  <td className="px-2 border-r">{c.cost}</td>
                  <td className="px-2 border-r">{c.value_top}</td>
                  <td className="px-2 border-r">{c.value_right}</td>
                  <td className="px-2 border-r">{c.value_bottom}</td>
                  <td className="px-2 border-r">{c.value_left}</td>
                  <td className="px-2">
                    <button
                      onClick={() => addCard(c)}
                      disabled={
                        remainingCards === 0 ||
                        remainingPoints < c.cost ||
                        selected.some((s) => s.id === c.id)
                      }
                      className="bg-blue-600 px-2 py-0.5 rounded disabled:opacity-40"
                    >
                      Ajouter
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SIDEBAR */}
        <div className="w-72 sticky top-8 space-y-4">
          <div className="border p-4">
            <p>Cartes : {selected.length} / 5</p>
            <p>Points : {totalCost} / 100</p>
          </div>

          <div className="border p-4">
            <h3 className="font-bold mb-2">Deck</h3>
            {selected.map((c) => (
              <div
                key={c.id}
                className="flex justify-between text-xs mb-1"
              >
                <span>{c.name}</span>
                <button
                  onClick={() => removeCard(c.id)}
                  className="text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={createDeck}
            className="bg-green-600 py-2 rounded font-bold"
          >
            Créer le deck
          </button>

          {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
        </div>
      </div>
    </main>
  );
}
