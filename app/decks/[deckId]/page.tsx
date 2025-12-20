/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* =======================
   TYPES
======================= */

type Deck = {
  id: string;
  name: string;
  max_cost: number;
};

type Card = {
  id: string;
  code: string;
  name: string;
  level: number;
  cost: number;
  value_top: number;
  value_right: number;
  value_bottom: number;
  value_left: number;
  image_name: string | null;
};

type DeckCard = any;

type SortKey =
  | "level"
  | "name"
  | "cost"
  | "top"
  | "right"
  | "bottom"
  | "left";

type SortDir = "asc" | "desc";

/* =======================
   COMPONENT
======================= */

export default function DeckEditorPage() {
  const router = useRouter();
  const params = useParams() as { deckId?: string };
  const deckId = params.deckId;
  const isCreateMode = deckId === "create";

  const [deck, setDeck] = useState<Deck | null>(null);
  const [deckName, setDeckName] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [deckCards, setDeckCards] = useState<DeckCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);

  const [sortBy, setSortBy] = useState<SortKey>("level");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const imageBaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL +
    "/storage/v1/object/public/card-images";

  /* =======================
     DERIVED
  ======================= */

  const totalCost = useMemo(
    () =>
      deckCards.reduce(
        (sum, dc) => sum + (dc.card?.cost ?? 0) * dc.quantity,
        0
      ),
    [deckCards]
  );

  const totalCards = useMemo(
    () => deckCards.reduce((sum, dc) => sum + dc.quantity, 0),
    [deckCards]
  );

  const selectedImageUrl =
    selectedCard?.image_name
      ? `${imageBaseUrl}/${selectedCard.image_name}`
      : null;

  /* =======================
     LOAD DATA
  ======================= */

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      if (isCreateMode) {
        setDeck({ id: "", name: "", max_cost: 100 });
        setDeckName("");

        const { data } = await supabase
          .from("cards")
          .select(
            "id, code, name, level, cost, value_top, value_right, value_bottom, value_left, image_name"
          )
          .order("level", { ascending: true });

        setCards(data ?? []);
        setDeckCards([]);
        setSelectedCard(null);
        setLoading(false);
        return;
      }

      const { data: deckData } = await supabase
        .from("decks")
        .select("id, name, max_cost")
        .eq("id", deckId)
        .single();

      if (!deckData) {
        setLoading(false);
        return;
      }

      setDeck(deckData);

      const { data: cardsData } = await supabase
        .from("cards")
        .select(
          "id, code, name, level, cost, value_top, value_right, value_bottom, value_left, image_name"
        );

      setCards(cardsData ?? []);

      const { data: deckCardsData } = await supabase
        .from("deck_cards")
        .select(
          "id, quantity, card:cards (id, name, level, cost, value_top, value_right, value_bottom, value_left, image_name)"
        )
        .eq("deck_id", deckId);

      const normalized =
        deckCardsData?.map((row: any) => ({
          ...row,
          card: Array.isArray(row.card) ? row.card[0] : row.card,
        })) ?? [];

      setDeckCards(normalized);
      if (normalized.length > 0) {
        setSelectedCard(normalized[0].card);
      }

      setLoading(false);
    };

    load();
  }, [deckId, isCreateMode]);

  /* =======================
     SORT
  ======================= */

  const sortedCards = useMemo(() => {
    const get = (c: Card) => {
      switch (sortBy) {
        case "name":
          return c.name.toLowerCase();
        case "cost":
          return c.cost;
        case "top":
          return c.value_top;
        case "right":
          return c.value_right;
        case "bottom":
          return c.value_bottom;
        case "left":
          return c.value_left;
        default:
          return c.level;
      }
    };

    return [...cards].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (get(a) < get(b)) return -dir;
      if (get(a) > get(b)) return dir;
      return 0;
    });
  }, [cards, sortBy, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const indicator = (key: SortKey) =>
    sortBy === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  /* =======================
     ACTIONS
  ======================= */

  const handleAddCard = (card: Card) => {
    if (totalCards >= 5) {
      alert("Un deck contient 5 cartes maximum.");
      return;
    }

    if (totalCost + card.cost > 100) {
      alert("Le deck ne peut pas dépasser 100 points.");
      return;
    }

    setDeckCards((prev) => {
      const existing = prev.find((dc) => dc.card.id === card.id);
      if (!existing) {
        return [...prev, { id: `local-${card.id}`, quantity: 1, card }];
      }
      return prev.map((dc) =>
        dc.card.id === card.id
          ? { ...dc, quantity: dc.quantity + 1 }
          : dc
      );
    });

    setSelectedCard(card);
  };

  const handleRemoveCard = (dc: DeckCard) => {
    setDeckCards((prev) =>
      dc.quantity <= 1
        ? prev.filter((x) => x.id !== dc.id)
        : prev.map((x) =>
            x.id === dc.id ? { ...x, quantity: x.quantity - 1 } : x
          )
    );
  };

  const handleCreateDeck = async () => {
    if (!deckName.trim()) {
      alert("Le deck doit avoir un nom.");
      return;
    }

    if (totalCards !== 5) {
      alert("Le deck doit contenir exactement 5 cartes.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Connexion requise.");
      return;
    }

    const { data: deckData, error } = await supabase
      .from("decks")
      .insert({
        name: deckName,
        max_cost: 100,
        user_id: user.id,
      })
      .select()
      .single();

    if (error || !deckData) {
      alert("Erreur lors de la création du deck.");
      return;
    }

    await supabase.from("deck_cards").insert(
      deckCards.map((dc) => ({
        deck_id: deckData.id,
        card_id: dc.card.id,
        quantity: dc.quantity,
      }))
    );

    router.push(`/decks/${deckData.id}`);
  };

  /* =======================
     RENDER
  ======================= */

  if (loading || !deck) {
    return (
      <main className="min-h-screen p-8 bg-black text-white">
        Chargement…
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-black text-white flex flex-col gap-6">
      <button
        onClick={() => router.push("/decks")}
        className="text-sm text-gray-300 underline w-fit"
      >
        ← Retour à la liste des decks
      </button>

      <div className="flex items-baseline justify-between">
        {isCreateMode ? (
          <input
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Nom du deck"
            className="text-3xl font-bold bg-transparent border-b border-gray-600 focus:outline-none"
          />
        ) : (
          <h1 className="text-3xl font-bold">{deck.name}</h1>
        )}

        <div className="text-right text-sm">
          <p>Coût : {totalCost} / 100</p>
          <p>Cartes : {totalCards} / 5</p>
        </div>
      </div>

      {isCreateMode && (
        <button
          onClick={handleCreateDeck}
          disabled={totalCards !== 5}
          className="w-fit px-4 py-2 bg-green-600 rounded disabled:opacity-50"
        >
          Créer le deck
        </button>
      )}

      <div className="flex gap-8">
        <div className="flex-1">
          <table className="w-full text-xs border border-gray-700 rounded">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="w-12 px-2 py-1 text-center cursor-pointer" onClick={() => toggleSort("level")}>Lvl{indicator("level")}</th>
                <th className="w-[260px] px-2 py-1 text-left cursor-pointer" onClick={() => toggleSort("name")}>Nom{indicator("name")}</th>
                <th className="w-16 px-2 py-1 text-center cursor-pointer" onClick={() => toggleSort("cost")}>Coût{indicator("cost")}</th>
                <th className="w-12 px-2 py-1 text-center cursor-pointer" onClick={() => toggleSort("top")}>H{indicator("top")}</th>
                <th className="w-12 px-2 py-1 text-center cursor-pointer" onClick={() => toggleSort("right")}>D{indicator("right")}</th>
                <th className="w-12 px-2 py-1 text-center cursor-pointer" onClick={() => toggleSort("bottom")}>B{indicator("bottom")}</th>
                <th className="w-12 px-2 py-1 text-center cursor-pointer" onClick={() => toggleSort("left")}>G{indicator("left")}</th>
                <th className="w-24 px-2 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {sortedCards.map((card) => (
                <tr
                  key={card.id}
                  className="border-b border-gray-800 hover:bg-gray-900 cursor-pointer"
                  onClick={() => setSelectedCard(card)}
                >
                  <td className="w-12 px-2 py-1 text-center">{card.level}</td>
                  <td className="w-[260px] px-2 py-1 text-left truncate">{card.name}</td>
                  <td className="w-16 px-2 py-1 text-center">{card.cost}</td>
                  <td className="w-12 px-2 py-1 text-center">{card.value_top}</td>
                  <td className="w-12 px-2 py-1 text-center">{card.value_right}</td>
                  <td className="w-12 px-2 py-1 text-center">{card.value_bottom}</td>
                  <td className="w-12 px-2 py-1 text-center">{card.value_left}</td>
                  <td className="w-24 px-2 py-1 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddCard(card);
                      }}
                      className="px-2 py-1 bg-blue-600 rounded text-xs"
                    >
                      Ajouter
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="w-96 sticky top-8 space-y-4">
          <div className="border border-gray-700 p-4 rounded">
            <h2 className="font-semibold mb-2">Prévisualisation</h2>
            {selectedImageUrl && <img src={selectedImageUrl} alt="" />}
          </div>

          <div className="border border-gray-700 p-4 rounded">
            <h2 className="font-semibold mb-2">Deck</h2>
            {deckCards.map((dc) => (
              <div key={dc.id} className="flex justify-between text-xs">
                <span>
                  {dc.quantity} × {dc.card.name}
                </span>
                <button
                  onClick={() => handleRemoveCard(dc)}
                  className="text-red-400"
                >
                  -1
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}