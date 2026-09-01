import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchCheckoutSession } from "../lib/api";
import type { Territory } from "../types";

const MAX_POLLS = 15;
const POLL_INTERVAL_MS = 2000;

export default function Success() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");

  const [territory, setTerritory] = useState<Territory | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing checkout session.");
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const data = await fetchCheckoutSession(sessionId!);
        if (cancelled) return;
        setTerritory(data.territory);
        setStatus(data.status);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load territory");
      } finally {
        if (!cancelled) setAttempts((n) => n + 1);
      }
    }

    poll();
    const interval = setInterval(() => {
      setAttempts((current) => {
        if (current >= MAX_POLLS) {
          clearInterval(interval);
          return current;
        }
        poll();
        return current;
      });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId]);

  const territoryUrl = territory ? `${window.location.origin}/territory/${territory.slug}` : "";
  const shareText = territory
    ? `🚀 We just claimed the ${territory.name} territory on Startup Board.\nCheck it out: ${territoryUrl}`
    : "";

  async function handleShare() {
    if (navigator.share && territory) {
      try {
        await navigator.share({ title: "Startup Board", text: shareText, url: territoryUrl });
        return;
      } catch {
        // fall through to clipboard copy
      }
    }
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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

  const isSold = status === "sold";

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      {isSold && territory ? (
        <>
          <p className="text-4xl">🎉</p>
          <h1 className="mt-3 font-display text-3xl font-bold text-white">Territory Claimed!</h1>
          <p className="mt-2 text-slate-400">
            You now own the {territory.name} territory on Startup Board.
          </p>

          <div className="mt-8 w-full rounded-xl border border-white/10 bg-white/5 p-6 text-left">
            <div className="flex items-center gap-3">
              {territory.logoUrl && (
                <img src={territory.logoUrl} alt="Logo" className="h-12 w-12 rounded-full border border-white/20 object-cover" />
              )}
              <div>
                <p className="font-display text-lg font-bold text-white">
                  {territory.companyName || territory.ownerName}
                </p>
                {territory.websiteUrl && (
                  <a href={territory.websiteUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-400">
                    {territory.websiteUrl.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-300">{territory.ownerDescription}</p>
          </div>

          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
            <Link
              to={`/territory/${territory.slug}`}
              className="flex-1 rounded-full bg-indigo-500 px-6 py-3 font-display font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-indigo-400"
            >
              View My Territory
            </Link>
            <button
              onClick={handleShare}
              className="flex-1 rounded-full border border-white/20 px-6 py-3 font-display font-semibold text-white transition-colors hover:bg-white/10"
            >
              {copied ? "Copied!" : "Share It"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-lg font-semibold text-slate-200">Confirming your payment…</p>
          <p className="mt-2 text-sm text-slate-500">
            This usually takes a few seconds while we verify things with Stripe.
          </p>
          {attempts >= MAX_POLLS && (
            <p className="mt-4 text-sm text-amber-300">
              Still processing — refresh this page in a moment, your territory will appear once confirmed.
            </p>
          )}
        </>
      )}
    </div>
  );
}
