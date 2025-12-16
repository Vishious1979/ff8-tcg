"use client";

import { usePathname } from "next/navigation";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Pages SANS fond
  const noBackgroundPages = ["/decks"];

  const hasBackground = !noBackgroundPages.some((p) =>
    pathname.startsWith(p)
  );

  return (
    <html lang="fr">
      <body
        className={`min-h-screen ${
          hasBackground ? "ff8-bg" : "bg-black"
        }`}
      >
        {children}
      </body>
    </html>
  );
}