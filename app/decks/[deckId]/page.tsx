/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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

// On garde un type souple ici pour éviter les galères de typage Supabase
type DeckCard = any;

type SortKey = "level" | "name" | "cost" | "top" | "right" | "bottom" | "left";
type SortDir = "asc" | "desc";

export default function DeckEditorPage() {
  const router = useRouter();
  const params = useParams() as { deckId?: string };
  const deckId = params.deckId as string | undefined;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [deckCards, setDeckCards] = useState<DeckCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortKey>("level");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const imageBaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL +
    "/storage/v1/object/public/card-images";

  // coût total = somme(cost * quantity)
  const totalCost = useMemo(() => {
    return deckCards.reduce(
      (sum: number, dc: DeckCard) => sum + (dc.card?.cost ?? 0) * dc.quantity,
      0
    );
  }, [deckCards]);

  const remainingPoints = useMemo(
    () => (deck ? deck.max_cost - totalCost : 0),
    [deck, totalCost]
  );

  const selectedImageUrl =
    selectedCard && selectedCard.image_name
      ? `${imageBaseUrl}/${selectedCard.image_name}`
      : null;

  // ===== CARTES FILTRÉES + TRI =====
  const filteredSortedCards = useMemo(() => {
    // 1) filtre sur points restants
    let list = cards.filter((card) =>
      remainingPoints > 0 ? card.cost <= remainingPoints : false
    );

    // 2) tri
    list = [...list].sort((a, b) => {
      const dirFactor = sortDir === "asc" ? 1 : -1;

      let va: number | string;
      let vb: number | string;

      switch (sortBy) {
        case "level":
          va = a.level;
          vb = b.level;
          break;
        case "name":
          va = a.name.toLowerCase();
          vb = b.name.toLowerCase();
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
        default:
          va = 0;
          vb = 0;
      }

      if (va < vb) return -1 * dirFactor;
      if (va > vb) return 1 * dirFactor;
      return 0;
    });

    return list;
  }, [cards, remainingPoints, sortBy, sortDir]);

  const sortIndicator = (key: SortKey) => {
    if (sortBy !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  const handleHeaderClick = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  // ===== CHARGEMENT INITIAL : deck + cartes + deck_cards =====
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      if (!deckId) {
        setErrorMsg("Deck introuvable (URL invalide).");
        setLoading(false);
        return;
      }

      // 1) charger le deck
      const { data: deckData, error: deckError } = await supabase
        .from("decks")
        .select("id, name, max_cost")
        .eq("id", deckId)
        .single();

      if (deckError || !deckData) {
        console.error(deckError);
        setErrorMsg("Deck introuvable ou accès refusé.");
        setLoading(false);
        return;
      }

      setDeck(deckData as Deck);

      // 2) cartes disponibles (avec stats + image)
      const { data: cardsData, error: cardsError } = await supabase
        .from("cards")
        .select(
          "id, code, name, level, cost, value_top, value_right, value_bottom, value_left, image_name"
        )
        .order("level", { ascending: true })
        .order("code", { ascending: true });

      if (cardsError) {
        console.error(cardsError);
        setErrorMsg("Impossible de charger les cartes.");
        setLoading(false);
        return;
      }

      const allCards = (cardsData as Card[]) ?? [];
      setCards(allCards);

      // 3) cartes du deck (avec jointure sur cards)
      const { data: deckCardsData, error: deckCardsError } = await supabase
        .from("deck_cards")
        .select(
          "id, deck_id, card_id, quantity, card:cards (id, code, name, level, cost, value_top, value_right, value_bottom, value_left, image_name)"
        )
        .eq("deck_id", deckId);

      if (deckCardsError) {
        console.error(deckCardsError);
        setErrorMsg("Impossible de charger les cartes du deck.");
        setLoading(false);
        return;
      }

      const normalized =
        (deckCardsData as DeckCard[])?.map((row: any) => ({
          ...row,
          card: Array.isArray(row.card) ? row.card[0] : row.card,
        })) ?? [];

      setDeckCards(normalized);

      if (normalized.length > 0) {
        setSelectedCard(normalized[0].card as Card);
      }

      setLoading(false);
    };

    load();
  }, [deckId]);

  // ===== AJOUT DE CARTE DANS LE DECK =====
  const handleAddCard = async (card: Card) => {
    if (!deck || !deckId) return;

    const newTotal = totalCost + card.cost;
    if (newTotal > deck.max_cost) {
      alert(
        `Tu dépasses le budget max (${deck.max_cost}). Coût actuel : ${totalCost}, carte : ${card.cost}.`
      );
      return;
    }

    setSaving(true);

    const existing = deckCards.find((dc: DeckCard) => dc.card_id === card.id);

    if (!existing) {
      const { data, error } = await supabase
        .from("deck_cards")
        .insert({
          deck_id: deckId,
          card_id: card.id,
          quantity: 1,
        })
        .select(
          "id, deck_id, card_id, quantity, card:cards (id, code, name, level, cost, value_top, value_right, value_bottom, value_left, image_name)"
        )
        .single();

      setSaving(false);

      if (error) {
        console.error(error);
        alert("Erreur lors de l'ajout de la carte.");
        return;
      }

      const row: any = data;
      const normalized = {
        ...row,
        card: Array.isArray(row.card) ? row.card[0] : row.card,
      };

      setDeckCards((prev) => [...prev, normalized]);
    } else {
      const { data, error } = await supabase
        .from("deck_cards")
        .update({ quantity: existing.quantity + 1 })
        .eq("id", existing.id)
        .select(
          "id, deck_id, card_id, quantity, card:cards (id, code, name, level, cost, value_top, value_right, value_bottom, value_left, image_name)"
        )
        .single();

      setSaving(false);

      if (error) {
        console.error(error);
        alert("Erreur lors de la mise à jour de la carte.");
        return;
      }

      const row: any = data;
      const normalized = {
        ...row,
        card: Array.isArray(row.card) ? row.card[0] : row.card,
      };

      setDeckCards((prev) =>
        prev.map((dc: DeckCard) => (dc.id === existing.id ? normalized : dc))
      );
    }
  };

  // ===== RETIRER UNE CARTE DU DECK =====
  const handleRemoveCard = async (deckCard: DeckCard) => {
    setSaving(true);

    if (deckCard.quantity <= 1) {
      const { error } = await supabase
        .from("deck_cards")
        .delete()
        .eq("id", deckCard.id);

      setSaving(false);

      if (error) {
        console.error(error);
        alert("Erreur lors de la suppression de la carte.");
        return;
      }

      setDeckCards((prev) =>
        prev.filter((dc: DeckCard) => dc.id !== deckCard.id)
      );
    } else {
      const { data, error } = await supabase
        .from("deck_cards")
        .update({ quantity: deckCard.quantity - 1 })
        .eq("id", deckCard.id)
        .select(
          "id, deck_id, card_id, quantity, card:cards (id, code, name, level, cost, value_top, value_right, value_bottom, value_left, image_name)"
        )
        .single();

      setSaving(false);

      if (error) {
        console.error(error);
        alert("Erreur lors de la mise à jour de la carte.");
        return;
      }

      const row: any = data;
      const normalized = {
        ...row,
        card: Array.isArray(row.card) ? row.card[0] : row.card,
      };

      setDeckCards((prev) =>
        prev.map((dc: DeckCard) => (dc.id === deckCard.id ? normalized : dc))
      );
    }
  };

  // ===== RENDU =====

  if (loading) {
    return (
      <main className="min-h-screen p-8 bg-black text-white">
        <p>Chargement du deck...</p>
      </main>
    );
  }

  if (!deck) {
    return (
      <main className="min-h-screen p-8 bg-black text-white">
        <p>Deck introuvable.</p>
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
        <h1 className="text-3xl font-bold">{deck.name}</h1>
        <div className="text-right text-sm">
          <p>
            Coût total :{" "}
            <span
              className={
                totalCost > deck.max_cost
                  ? "text-red-400 font-bold"
                  : "text-green-400 font-bold"
              }
            >
              {totalCost} / {deck.max_cost}
            </span>
          </p>
          <p className="text-xs text-gray-300">
            Points restants :{" "}
            <span
              className={
                remainingPoints < 0
                  ? "text-red-400 font-bold"
                  : "text-green-400 font-bold"
              }
            >
              {remainingPoints}
            </span>
          </p>
          {saving && <p className="text-xs text-gray-400">Sauvegarde...</p>}
        </div>
      </div>

      {errorMsg && <p className="text-red-400">{errorMsg}</p>}

      <div className="flex gap-8">
        {/* Cartes disponibles */}
        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-2">
            Cartes disponibles (coût ≤ points restants)
          </h2>
          <p className="text-xs text-gray-400 mb-2">
            Clique sur une ligne pour voir la carte, puis sur &quot;Ajouter&quot;
            pour l&apos;ajouter au deck. Clique sur les en-têtes pour trier.
          </p>
          <div className="max-h-[70vh] overflow-auto border border-gray-700 rounded">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  <th
                    className="py-1 text-left cursor-pointer"
                    onClick={() => handleHeaderClick("level")}
                  >
                    Lvl{sortIndicator("level")}
                  </th>
                  <th
                    className="py-1 text-left cursor-pointer"
                    onClick={() => handleHeaderClick("name")}
                  >
                    Nom{sortIndicator("name")}
                  </th>
                  <th
                    className="py-1 text-left cursor-pointer"
                    onClick={() => handleHeaderClick("cost")}
                  >
                    Coût{sortIndicator("cost")}
                  </th>
                  <th
                    className="py-1 text-left cursor-pointer"
                    onClick={() => handleHeaderClick("top")}
                  >
                    Haut{sortIndicator("top")}
                  </th>
                  <th
                    className="py-1 text-left cursor-pointer"
                    onClick={() => handleHeaderClick("right")}
                  >
                    Droite{sortIndicator("right")}
                  </th>
                  <th
                    className="py-1 text-left cursor-pointer"
                    onClick={() => handleHeaderClick("bottom")}
                  >
                    Bas{sortIndicator("bottom")}
                  </th>
                  <th
                    className="py-1 text-left cursor-pointer"
                    onClick={() => handleHeaderClick("left")}
                  >
                    Gauche{sortIndicator("left")}
                  </th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {filteredSortedCards.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-2 text-center text-gray-500"
                    >
                      Aucune carte disponible avec les points restants.
                    </td>
                  </tr>
                ) : (
                  filteredSortedCards.map((card) => (
                    <tr
                      key={card.id}
                      className="border-b border-gray-800 hover:bg-gray-900 cursor-pointer"
                      onClick={() => setSelectedCard(card)}
                    >
                      <td className="py-1">{card.level}</td>
                      <td className="py-1">{card.name}</td>
                      <td className="py-1">{card.cost}</td>
                      <td className="py-1">{card.value_top}</td>
                      <td className="py-1">{card.value_right}</td>
                      <td className="py-1">{card.value_bottom}</td>
                      <td className="py-1">{card.value_left}</td>
                      <td className="py-1 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddCard(card);
                          }}
                          disabled={saving}
                          className="px-2 py-1 text-xs rounded bg-blue-600 text-white disabled:opacity-50"
                        >
                          Ajouter
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Préview + contenu du deck */}
        <div className="w-96 space-y-4 sticky top-8 self-start">
          {/* Preview carte */}
          <div className="border border-gray-700 rounded p-4 bg-black">
            <h2 className="text-xl font-semibold mb-2">Prévisualisation</h2>

            {!selectedCard ? (
              <p className="text-sm text-gray-400">
                Sélectionne une carte dans la liste.
              </p>
            ) : (
              <div className="flex flex-col items-center">
                <p className="text-lg mb-2 font-bold">{selectedCard.name}</p>

                {selectedImageUrl && (
                  <img
                    src={selectedImageUrl}
                    alt={selectedCard.name}
                    className="w-64 h-auto rounded border border-gray-600 mb-4"
                  />
                )}

                {!selectedImageUrl && (
                  <p className="text-xs text-gray-400 mb-2">
                    Image introuvable.
                  </p>
                )}

                <div className="text-sm text-gray-300 w-full">
                  <p>
                    <strong>Niveau :</strong> {selectedCard.level}
                  </p>

                  <p className="mt-2">
                    <strong>Valeurs :</strong>
                  </p>
                  <ul className="ml-4">
                    <li>Haut : {selectedCard.value_top}</li>
                    <li>Droite : {selectedCard.value_right}</li>
                    <li>Bas : {selectedCard.value_bottom}</li>
                    <li>Gauche : {selectedCard.value_left}</li>
                  </ul>

                  <p className="mt-2">
                    <strong>Coût dans un deck :</strong> {selectedCard.cost}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Contenu du deck */}
          <div className="border border-gray-700 rounded p-4 bg-black">
            <h2 className="text-xl font-semibold mb-2">Cartes du deck</h2>
            {deckCards.length === 0 ? (
              <p className="text-sm text-gray-400">
                Aucune carte dans ce deck pour l&apos;instant.
              </p>
            ) : (
              <table className="w-full border-collapse text-xs max-h-[40vh] overflow-auto">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="py-1 text-left">x</th>
                    <th className="py-1 text-left">Nom</th>
                    <th className="py-1 text-left">Coût</th>
                    <th className="py-1 text-left">H</th>
                    <th className="py-1 text-left">D</th>
                    <th className="py-1 text-left">B</th>
                    <th className="py-1 text-left">G</th>
                    <th className="py-1" />
                  </tr>
                </thead>
                <tbody>
                  {deckCards.map((dc: DeckCard) => (
                    <tr
                      key={dc.id}
                      className="border-b border-gray-800 hover:bg-gray-900 cursor-pointer"
                      onClick={() =>
                        dc.card ? setSelectedCard(dc.card as Card) : null
                      }
                    >
                      <td className="py-1">{dc.quantity}</td>
                      <td className="py-1">{dc.card?.name}</td>
                      <td className="py-1">{dc.card?.cost}</td>
                      <td className="py-1">{dc.card?.value_top}</td>
                      <td className="py-1">{dc.card?.value_right}</td>
                      <td className="py-1">{dc.card?.value_bottom}</td>
                      <td className="py-1">{dc.card?.value_left}</td>
                      <td className="py-1 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCard(dc);
                          }}
                          disabled={saving}
                          className="px-2 py-0.5 text-xs rounded bg-red-600 text-white disabled:opacity-50"
                        >
                          -1
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="mt-4 text-sm">
              <p>
                Coût total :{" "}
                <span
                  className={
                    totalCost > deck.max_cost
                      ? "text-red-400 font-bold"
                      : "text-green-400 font-bold"
                  }
                >
                  {totalCost} / {deck.max_cost}
                </span>
              </p>
              <p>
                Points restants :{" "}
                <span
                  className={
                    remainingPoints < 0
                      ? "text-red-400 font-bold"
                      : "text-green-400 font-bold"
                  }
                >
                  {remainingPoints}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
