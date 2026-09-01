import { useEffect, useRef, useState } from "react";
import { fetchTerritories } from "../lib/api";
import type { Territory } from "../types";
import Board from "../components/Board";

const POLL_MS = 15_000;

export default function Home() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [justClaimedSlug, setJustClaimedSlug] = useState<string | null>(null);
  // Keyed by purchasedAt rather than status, so a takeover of an
  // already-sold territory (status stays "sold" throughout) still triggers
  // the claim animation, not just a territory's first-ever sale.
  const prevPurchasedAt = useRef<Record<string, string | null>>({});

  async function load() {
    try {
      const data = await fetchTerritories();
      const prev = prevPurchasedAt.current;
      const newlySold = data.find(
        (t) => t.status === "sold" && t.slug in prev && prev[t.slug] !== t.purchasedAt
      );
      if (newlySold) {
        setJustClaimedSlug(newlySold.slug);
        setTimeout(() => setJustClaimedSlug(null), 1200);
      }
      prevPurchasedAt.current = Object.fromEntries(data.map((t) => [t.slug, t.purchasedAt]));
      setTerritories(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load territories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  const claimedCount = territories.filter((t) => t.status === "sold").length;

  return (
    <div className="min-h-screen bg-board-bg pb-24">
      <header className="mx-auto max-w-5xl px-4 pb-8 pt-12 text-center sm:pt-16">
        <p className="font-display text-sm font-bold uppercase tracking-[0.3em] text-indigo-400">
          Startup Board
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Own a piece of the board.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400 sm:text-lg">
          Startup Board is a public game board where startups, founders and projects compete for
          attention by owning territory.
        </p>
        <a
          href="#board"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-indigo-500 px-8 py-3 font-display font-semibold text-white shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-0.5 hover:bg-indigo-400"
        >
          Claim a Territory
        </a>
        {!loading && (
          <p className="mt-4 text-sm text-slate-500">
            {claimedCount} / {territories.length || 24} territories claimed
          </p>
        )}
      </header>

      <main id="board" className="mx-auto max-w-6xl px-4">
        {error && (
          <p className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-center text-sm text-red-300">
            {error}
          </p>
        )}
        {loading ? (
          <p className="py-24 text-center text-slate-500">Loading the board…</p>
        ) : (
          <Board territories={territories} justClaimedSlug={justClaimedSlug} />
        )}
      </main>

      <section className="mx-auto mt-20 grid max-w-4xl grid-cols-1 gap-8 px-4 text-center sm:grid-cols-4">
        {[
          "Pick your territory.",
          "Tell people what you're building.",
          "Pay once.",
          "Get seen.",
        ].map((step, i) => (
          <div key={step}>
            <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 font-display font-bold text-indigo-300">
              {i + 1}
            </div>
            <p className="text-sm font-medium text-slate-300">{step}</p>
          </div>
        ))}
      </section>

      <div className="mt-12 text-center">
        <a
          href="#board"
          className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-3 font-display font-semibold text-white transition-colors hover:bg-white/10"
        >
          Claim Your Territory
        </a>
      </div>
    </div>
  );
}
