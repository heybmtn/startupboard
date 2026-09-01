import { useMemo, useState } from "react";
import type { Territory } from "../types";
import TerritoryTile from "./TerritoryTile";

interface Props {
  territories: Territory[];
  justClaimedSlug?: string | null;
}

/**
 * Maps a territory's 0-23 `position` onto a cell on the perimeter of a 7x7
 * grid (4*7 - 4 = 24 border cells), walked clockwise from the top-left
 * corner. The interior 5x5 area is left for the board's centrepiece.
 */
function perimeterCell(position: number): { row: number; col: number } {
  if (position <= 6) return { row: 1, col: position + 1 }; // top: 0-6
  if (position <= 11) return { row: position - 7 + 2, col: 7 }; // right: 7-11
  if (position <= 18) return { row: 7, col: 7 - (position - 12) }; // bottom: 12-18
  return { row: 6 - (position - 19), col: 1 }; // left: 19-23
}

export default function Board({ territories, justClaimedSlug }: Props) {
  const [filter, setFilter] = useState<"all" | "available" | "sold">("all");

  const sorted = useMemo(() => [...territories].sort((a, b) => a.position - b.position), [territories]);
  const claimedCount = territories.filter((t) => t.status === "sold").length;

  const filtered = sorted.filter((t) => {
    if (filter === "available") return t.status === "available";
    if (filter === "sold") return t.status === "sold";
    return true;
  });

  return (
    <div>
      {/* Desktop: perimeter game-board layout */}
      <div
        className="mx-auto hidden aspect-square max-w-4xl grid-cols-7 grid-rows-7 gap-2 rounded-2xl border border-board-line bg-board-panel p-3 lg:grid"
        role="list"
        aria-label="Startup Board territories"
      >
        {sorted.map((territory) => {
          const { row, col } = perimeterCell(territory.position);
          return (
            <div key={territory.id} style={{ gridRow: row, gridColumn: col }} role="listitem">
              <TerritoryTile territory={territory} justClaimed={territory.slug === justClaimedSlug} />
            </div>
          );
        })}

        <div
          style={{ gridRow: "2 / 7", gridColumn: "2 / 7" }}
          className="flex flex-col items-center justify-center rounded-xl border border-board-line bg-board-bg/60 text-center"
        >
          <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            STARTUP BOARD
          </h1>
          <p className="mt-2 text-sm text-slate-400">Own your category.</p>
          <p className="mt-6 font-display text-lg font-semibold text-slate-200">
            {claimedCount} / {territories.length} territories claimed
          </p>
          <div className="mt-3 h-2 w-40 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{ width: `${(claimedCount / Math.max(territories.length, 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mobile / tablet: responsive card grid with filters */}
      <div className="lg:hidden">
        <div className="mb-4 flex justify-center gap-2">
          {(["all", "available", "sold"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={[
                "rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-colors",
                filter === key
                  ? "bg-white text-board-bg"
                  : "bg-white/5 text-slate-300 hover:bg-white/10",
              ].join(" ")}
            >
              {key === "sold" ? "Owned" : key}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((territory) => (
            <TerritoryTile
              key={territory.id}
              territory={territory}
              justClaimed={territory.slug === justClaimedSlug}
              variant="grid"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
