import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchTerritory } from "../lib/api";
import type { Territory } from "../types";
import { formatPrice } from "../types";

export default function TerritoryPage() {
  const { slug = "" } = useParams();
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTerritory(slug)
      .then(setTerritory)
      .catch((err) => setError(err instanceof Error ? err.message : "Territory not found"));
  }, [slug]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 text-center">
        <p className="text-lg font-semibold text-red-300">{error}</p>
        <Link to="/" className="mt-4 text-indigo-400 underline">
          Back to the board
        </Link>
      </div>
    );
  }

  if (!territory) {
    return <div className="py-24 text-center text-slate-500">Loading…</div>;
  }

  if (territory.status !== "sold") {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 text-center">
        <p className="font-display text-3xl font-bold text-white">{territory.name}</p>
        <p className="mt-3 text-emerald-400">🟢 This territory is available.</p>
        <Link
          to={`/claim/${territory.slug}`}
          className="mt-6 rounded-full bg-indigo-500 px-6 py-3 font-display font-semibold text-white hover:bg-indigo-400"
        >
          Claim it for {formatPrice(territory.nextPricePence)}
        </Link>
        <Link to="/" className="mt-4 text-sm text-slate-500 underline">
          Back to the board
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-16">
      <Link to="/" className="text-sm text-slate-400 hover:text-slate-200">
        ← Back to the board
      </Link>

      <div
        className="mt-6 overflow-hidden rounded-2xl border border-white/10"
        style={{ boxShadow: `0 0 0 3px ${territory.colour}` }}
      >
        <div className="p-8" style={{ backgroundColor: territory.colour }}>
          <p className="font-display text-sm font-bold uppercase tracking-widest text-white/80">
            {territory.name} Territory
          </p>
          <div className="mt-4 flex items-center gap-4">
            {territory.logoUrl && (
              <img
                src={territory.logoUrl}
                alt={`${territory.companyName ?? territory.ownerName} logo`}
                className="h-16 w-16 rounded-full border-2 border-white/60 bg-white object-cover"
              />
            )}
            <h1 className="font-display text-3xl font-bold text-white">
              {territory.companyName || territory.ownerName}
            </h1>
          </div>
        </div>

        <div className="space-y-4 bg-board-panel p-8">
          <p className="text-lg text-slate-200">{territory.ownerDescription}</p>

          {territory.websiteUrl && (
            <a
              href={territory.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-6 py-2.5 font-display font-semibold text-white hover:bg-indigo-400"
            >
              Visit Website
            </a>
          )}

          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-sm text-slate-400">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Date purchased</p>
              <p className="mt-1 text-slate-200">
                {territory.purchasedAt ? new Date(territory.purchasedAt).toLocaleDateString() : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Price paid</p>
              <p className="mt-1 text-slate-200">{formatPrice(territory.pricePence)}</p>
            </div>
          </div>

          <p className="border-t border-white/10 pt-4 text-xs text-slate-500">
            This territory is sponsored by {territory.companyName || territory.ownerName}.
          </p>

          <div className="border-t border-white/10 pt-4">
            <p className="text-sm text-slate-400">Think you can do better?</p>
            <Link
              to={`/claim/${territory.slug}`}
              className="mt-2 inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-2.5 font-display font-semibold text-white transition-colors hover:bg-white/10"
            >
              Take over for {formatPrice(territory.nextPricePence)}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
