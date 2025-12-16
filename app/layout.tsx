"use client";

import "./globals.css";
import { useEffect, useRef, useState } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.4;
      audioRef.current.play().catch(() => {
        // autoplay bloqué → OK tant que l'utilisateur n'interagit pas
      });
    }
  }, []);

  return (
    <html lang="fr">
      <body className="bg-black text-white">
        {/* Musique persistante */}
        <audio
          ref={audioRef}
          src="/audio/ff8-theme.mp3"
          loop
        />

        {/* Bouton mute global */}
        <button
          onClick={() => {
            if (!audioRef.current) return;
            audioRef.current.muted = !audioRef.current.muted;
            setMuted(audioRef.current.muted);
          }}
          className="fixed bottom-4 right-4 z-50 bg-black/70 px-3 py-2 rounded text-sm hover:bg-black"
        >
          {muted ? "🔇 Musique OFF" : "🔊 Musique ON"}
        </button>

        {children}
      </body>
    </html>
  );
}
