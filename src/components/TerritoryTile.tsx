import { Link } from "react-router-dom";
import type { Territory } from "../types";
import { formatPrice } from "../types";

interface Props {
  territory: Territory;
  justClaimed?: boolean;
  variant?: "board" | "grid";
}

export default function TerritoryTile({ territory, justClaimed, variant = "board" }: Props) {
  const isSold = territory.status === "sold";
  const isPremium = territory.pricePence >= 4500;

  const content = (
    <div
      className={[
        "group relative flex h-full w-full flex-col justify-between overflow-hidden rounded-lg border p-2 text-left transition-all",
        variant === "grid" ? "min-h-[128px] p-3" : "min-h-0",
        isSold ? "border-white/20 shadow-tile" : "border-white/10 hover:border-white/40 hover:-translate-y-0.5",
        justClaimed ? "animate-claim" : "",
      ].join(" ")}
      style={{
        backgroundColor: isSold ? territory.colour : "rgba(255,255,255,0.03)",
        boxShadow: isPremium ? `0 0 0 2px ${territory.colour}` : undefined,
      }}
    >
      {isPremium && (
        <span className="absolute right-1 top-1 rounded bg-black/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300">
          Premium
        </span>
      )}
      <div>
        <p
          className={[
            "font-display font-semibold leading-tight",
            variant === "grid" ? "text-base" : "text-[11px] sm:text-xs",
            isSold ? "text-white" : "text-slate-200",
          ].join(" ")}
        >
          {territory.name}
        </p>
        {isSold && territory.companyName && (
          <p className="mt-0.5 truncate text-[10px] font-medium text-white/85">{territory.companyName}</p>
        )}
      </div>

      <div className="mt-1 flex items-end justify-between gap-1">
        <div className="flex items-center gap-1">
          {isSold && territory.logoUrl ? (
            <img
              src={territory.logoUrl}
              alt={`${territory.companyName ?? territory.ownerName ?? territory.name} logo`}
              className="h-5 w-5 rounded-full border border-white/40 bg-white object-cover"
            />
          ) : null}
          <span
            className={["text-[9px] font-bold uppercase tracking-wide", isSold ? "text-white/90" : "text-emerald-400"].join(
              " "
            )}
          >
            {isSold ? "🔴 Owned" : "🟢 Available"}
          </span>
        </div>
        <span className={["text-[11px] font-bold", isSold ? "text-white/90" : "text-slate-100"].join(" ")}>
          {isSold ? `Take: ${formatPrice(territory.nextPricePence)}` : formatPrice(territory.nextPricePence)}
        </span>
      </div>
    </div>
  );

  if (isSold) {
    return (
      <Link to={`/territory/${territory.slug}`} className="block h-full w-full">
        {content}
      </Link>
    );
  }

  return (
    <Link to={`/claim/${territory.slug}`} className="block h-full w-full">
      {content}
    </Link>
  );
}
