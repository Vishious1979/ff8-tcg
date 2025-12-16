"use client";

import { usePathname } from "next/navigation";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Pages SANS fond FF8
  const noBackgroundPages = ["/decks"];

  const hasBackground = !noBackgroundPages.some((p) =>
    pathname.startsWith(p)
  );

  return (
    <html lang="fr">
      <body className={hasBackground ? "ff8-bg" : ""}>
        {hasBackground && <div className="ff8-overlay" />}
        <div style={{ position: "relative", zIndex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  );
}