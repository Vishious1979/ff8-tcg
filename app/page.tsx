"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Charger l'utilisateur au départ
  useEffect(() => {
    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error("Erreur getUser :", error.message);
      setUser(data.user ?? null);
      setLoading(false);
    };

    loadUser();

    // Écoute les changements d'état d'auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Connexion Google
const handleLogin = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    console.error("Erreur login :", error.message);
  }
};








  // Déconnexion
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Erreur logout :", error.message);
  };

  // -----------------------------
  // RENDER
  // -----------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Chargement...</p>
      </main>
    );
  }

  // -----------------------------
  // SI PAS CONNECTÉ → ÉCRAN LOGIN
  // -----------------------------
  if (!user) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-3xl font-bold">FF8 TCG – Connexion</h1>
        <p>Tu n&apos;es pas connecté.</p>

        <button
          onClick={handleLogin}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
        >
          Se connecter avec Google
        </button>
      </main>
    );
  }

  // -----------------------------
  // SI CONNECTÉ → MENU PRINCIPAL
  // -----------------------------
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center p-8 gap-8">

      <div className="flex justify-between w-full max-w-4xl">
        <p className="text-gray-300">Connecté : {user.email}</p>
        <button
          onClick={handleLogout}
          className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-500 text-sm"
        >
          Déconnexion
        </button>
      </div>

      <h1 className="text-4xl font-bold mb-4">FF8 – Triple Triad</h1>

      <nav className="flex flex-col gap-4 text-center text-lg w-full max-w-md">
        <Link
          href="/cards"
          className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700"
        >
          📘 Voir toutes les cartes
        </Link>

        <Link
          href="/decks"
          className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700"
        >
          🧩 Gérer mes decks
        </Link>

        <Link
          href="/play"
          className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700"
        >
          ▶️ Lancer une partie locale
        </Link>

        <Link
          href="/rules"
          className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700"
        >
          📜 Règles du jeu
        </Link>
      </nav>

      <p className="text-sm text-gray-400 mt-4">
        Mode en ligne multijoueur à venir ⚡
      </p>
    </main>
  );
}
