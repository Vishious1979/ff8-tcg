"use client";
console.log("SUPABASE URL =", process.env.NEXT_PUBLIC_SUPABASE_URL);
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      setLoading(false);
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://ff8-tcg.vercel.app/auth/callback",
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Chargement...
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-cover bg-center relative"
      style={{ backgroundImage: "url('/images/ff8-cover.jpg')" }}
    >
      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Contenu centré */}
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="text-center text-white flex flex-col gap-6 w-full max-w-md px-6">

          <h1 className="text-4xl font-bold tracking-wide drop-shadow-lg">
            FF8 – Triple Triad
          </h1>

          {!user && (
            <>
              <p className="text-gray-300">Tu n&apos;es pas connecté.</p>

              <button
                onClick={handleLogin}
                className="px-6 py-3 bg-blue-600 rounded-lg text-lg
                  hover:scale-105 hover:bg-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.8)]
                  transition-all duration-300"
              >
                Se connecter avec Google
              </button>
            </>
          )}

          {user && (
            <>
              <p className="text-sm text-gray-300">
                Connecté : {user.email}
              </p>

              <nav className="flex flex-col gap-4 mt-4">
                {[
                  { href: "/cards", label: "📘 Voir toutes les cartes" },
                  { href: "/decks", label: "🧩 Gérer mes decks" },
                  { href: "/play", label: "▶️ Lancer une partie locale" },
                  { href: "/rules", label: "📜 Règles du jeu" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-6 py-3 bg-gray-800 rounded-lg text-lg
                      hover:scale-105 hover:text-blue-400
                      hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]
                      transition-all duration-300"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <button
                onClick={handleLogout}
                className="mt-6 text-sm text-red-400 hover:text-red-300"
              >
                Déconnexion
              </button>
            </>
          )}

          <p className="text-xs text-gray-400 mt-4">
            Mode multijoueur en ligne bientôt disponible ⚡
          </p>
        </div>
      </div>
    </main>
  );
}
