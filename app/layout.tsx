import "./globals.css";
import { headers } from "next/headers";
import type { ReactNode } from "react";

export const metadata = {
  title: "FF8 – Triple Triad",
  description: "Final Fantasy VIII Triple Triad",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

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