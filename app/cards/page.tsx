/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* =======================
   TYPES
======================= */

type Card = {
  id: string;
  name: string;
  level: number;
  cost: number;
  value_top: number;
  value_right: number;
  value_bottom: number;
  value_left: number;
  image_name: string | null;
};

/* =======================
   PAGE ROOT (Suspense)
======================= */

export default function CardsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CardsPageContent />
    </Suspense>
  );
}

/* =======================
   CONTENU RÉEL
======================= */

function CardsPageContent() {
  const searchParams = useSearchParams();
  const levelFilter = searchParams.get("level");

  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ===== LOAD CARDS ===== */
  useEffect(() => {
    const loadCards = async () => {
      setLoading(true);
      setErrorMsg(null);

      let query = supabase
        .from("cards")
        .select(
          "id, name, level, cost, value_top, value_right, value_bottom, value_left, image_name"
        )
        .order("level", { ascending: true })
        .order("name", { ascending: true });

      if (levelFilter) {
        query = query.eq("level", Number(levelFilter));
      }

      const { data, error } = await query;

      if (error) {
        console.error(error);
        setErrorMsg("Impossible de charger les cartes.");
        setLoading(false);
        return;
      }

      setCards((data as Card[]) ?? []);
      setLoading(false);
    };

    loadCards();
  }, [levelFilter]);

  /* ===== SORTED ===== */
  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.name.localeCompare(b.name);
    });
  }, [cards]);

  /* ===== RENDER ===== */

  if (loading) {
    return <Loading />;
  }

  if (errorMsg) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-red-400">{errorMsg}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Cartes</h1>

      <div className="overflow-auto border border-gray-700 rounded">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-700 bg-black">
              <th className="p-2 text-left border-r border-gray-700">Lvl</th>
              <th className="p-2 text-left border-r border-gray-700">Nom</th>
              <th className="p-2 text-left border-r border-gray-700">Coût</th>
              <th className="p-2 border-r border-gray-700">H</th>
              <th className="p-2 border-r border-gray-700">D</th>
              <th className="p-2 border-r border-gray-700">B</th>
              <th className="p-2">G</th>
            </tr>
          </thead>

          <tbody>
            {sortedCards.map((card) => (
              <tr
                key={card.id}
                className="border-b border-gray-800 hover:bg-gray-900"
              >
                <td className="p-2 border-r border-gray-800">
                  {card.level}
                </td>
                <td className="p-2 border-r border-gray-800">
                  {card.name}
                </td>
                <td className="p-2 border-r border-gray-800">
                  {card.cost}
                </td>
                <td className="p-2 border-r border-gray-800 text-center">
                  {card.value_top}
                </td>
                <td className="p-2 border-r border-gray-800 text-center">
                  {card.value_right}
                </td>
                <td className="p-2 border-r border-gray-800 text-center">
                  {card.value_bottom}
                </td>
                <td className="p-2 text-center">
                  {card.value_left}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

/* =======================
   LOADING
======================= */

function Loading() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <p>Chargement des cartes…</p>
    </main>
  );
}
