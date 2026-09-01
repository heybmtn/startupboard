import { useEffect, useState } from "react";
import { adminFetchStats, adminFetchTerritories, adminUpdateTerritory } from "../lib/api";
import { formatPrice } from "../types";

interface AdminTerritory {
  id: number;
  name: string;
  slug: string;
  description: string;
  price_pence: number;
  colour: string;
  status: "available" | "pending" | "sold";
  owner_name: string | null;
  company_name: string | null;
  owner_description: string | null;
  website_url: string | null;
}

export default function Admin() {
  const [secret, setSecret] = useState(() => localStorage.getItem("sb_admin_secret") ?? "");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [territories, setTerritories] = useState<AdminTerritory[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminFetchStats>> | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  async function load(s: string) {
    try {
      const [t, st] = await Promise.all([adminFetchTerritories(s), adminFetchStats(s)]);
      setTerritories(t as unknown as AdminTerritory[]);
      setStats(st);
      setAuthed(true);
      setError(null);
      localStorage.setItem("sb_admin_secret", s);
    } catch (err) {
      setAuthed(false);
      setError(err instanceof Error ? err.message : "Failed to authenticate");
    }
  }

  useEffect(() => {
    if (secret) load(secret);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateLocal(id: number, patch: Partial<AdminTerritory>) {
    setTerritories((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  async function save(t: AdminTerritory) {
    setSavingId(t.id);
    try {
      await adminUpdateTerritory(secret, t.id, {
        name: t.name,
        description: t.description,
        pricePence: t.price_pence,
        colour: t.colour,
        status: t.status,
      });
      await load(secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  async function clearListing(t: AdminTerritory) {
    if (!confirm(`Remove the listing for ${t.name} and make it available again?`)) return;
    setSavingId(t.id);
    try {
      await adminUpdateTerritory(secret, t.id, { status: "available" });
      await load(secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear listing");
    } finally {
      setSavingId(null);
    }
  }

  if (!authed) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
        <h1 className="font-display text-2xl font-bold text-white">Admin</h1>
        <p className="mt-1 text-sm text-slate-400">Enter the admin secret to continue.</p>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-indigo-400"
          placeholder="Admin secret"
        />
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
        <button
          onClick={() => load(secret)}
          className="mt-4 rounded-full bg-indigo-500 px-6 py-2.5 font-display font-semibold text-white hover:bg-indigo-400"
        >
          Enter
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold text-white">Startup Board Admin</h1>

      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total revenue" value={formatPrice(stats.totals.revenuePence)} />
          <StatCard label="Territories" value={`${stats.totals.total}`} />
          <StatCard label="Sold" value={`${stats.totals.sold}`} />
          <StatCard label="Available" value={`${stats.totals.available}`} />
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">Recent purchases</h2>
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-400">
            <tr>
              <th className="px-3 py-2">Territory</th>
              <th className="px-3 py-2">Buyer</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {stats?.recentPurchases.map((p) => (
              <tr key={p.slug} className="border-t border-white/5">
                <td className="px-3 py-2 text-white">{p.name}</td>
                <td className="px-3 py-2">{p.owner_name}</td>
                <td className="px-3 py-2">{p.company_name}</td>
                <td className="px-3 py-2">{formatPrice(p.price_pence)}</td>
                <td className="px-3 py-2">
                  {p.purchased_at ? new Date(p.purchased_at).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
            {stats?.recentPurchases.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  No purchases yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 mt-10 font-display text-xl font-bold text-white">All territories</h2>
      <div className="space-y-3">
        {territories.map((t) => (
          <div key={t.id} className="grid grid-cols-1 gap-3 rounded-lg border border-white/10 p-4 sm:grid-cols-6 sm:items-center">
            <input
              value={t.name}
              onChange={(e) => updateLocal(t.id, { name: e.target.value })}
              className="rounded border border-white/10 bg-white/5 px-2 py-1.5 text-white sm:col-span-1"
            />
            <input
              value={t.description}
              onChange={(e) => updateLocal(t.id, { description: e.target.value })}
              className="rounded border border-white/10 bg-white/5 px-2 py-1.5 text-white sm:col-span-2"
            />
            <input
              type="number"
              value={t.price_pence}
              onChange={(e) => updateLocal(t.id, { price_pence: Number(e.target.value) })}
              className="rounded border border-white/10 bg-white/5 px-2 py-1.5 text-white"
            />
            <select
              value={t.status}
              onChange={(e) => updateLocal(t.id, { status: e.target.value as AdminTerritory["status"] })}
              className="rounded border border-white/10 bg-white/5 px-2 py-1.5 text-white"
            >
              <option value="available">available</option>
              <option value="pending">pending</option>
              <option value="sold">sold</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => save(t)}
                disabled={savingId === t.id}
                className="rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
              >
                Save
              </button>
              {t.status === "sold" && (
                <button
                  onClick={() => clearListing(t)}
                  disabled={savingId === t.id}
                  className="rounded-full border border-red-400/40 px-4 py-1.5 text-sm font-semibold text-red-300 hover:bg-red-500/10"
                >
                  Remove listing
                </button>
              )}
            </div>
            {t.status === "sold" && (
              <p className="text-xs text-slate-500 sm:col-span-6">
                Owned by {t.company_name || t.owner_name} — {t.owner_description}
                {t.website_url ? ` — ${t.website_url}` : ""}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
