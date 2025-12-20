import "./globals.css";
import { headers } from "next/headers";

export const metadata = {
  title: "FF8 – Triple Triad",
  description: "Final Fantasy VIII Triple Triad",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  const isDeckPage = pathname.startsWith("/decks");

  return (
    <html lang="fr">
      <body
        className={
          isDeckPage
            ? "min-h-screen bg-black text-white"
            : "min-h-screen text-white bg-black"
        }
        style={
          isDeckPage
            ? undefined
            : {
                backgroundImage: "url('/images/ff8-background.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }
        }
      >
        {children}
      </body>
    </html>
  );
}