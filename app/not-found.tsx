import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <section className="max-w-xl bg-black/70 p-8 rounded text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-white/80 mb-6">
          Cette page n’existe pas.
        </p>

        <Link
          href="/"
          className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          Retour à l’accueil
        </Link>
      </section>
    </main>
  );
}