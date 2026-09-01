import type { Territory } from "../types";

async function handleJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string }).error ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchTerritories(): Promise<Territory[]> {
  const res = await fetch("/api/territories");
  const data = await handleJson<{ territories: Territory[] }>(res);
  return data.territories;
}

export async function fetchTerritory(slug: string): Promise<Territory> {
  const res = await fetch(`/api/territories/${encodeURIComponent(slug)}`);
  const data = await handleJson<{ territory: Territory }>(res);
  return data.territory;
}

export interface ClaimInput {
  slug: string;
  ownerName: string;
  companyName?: string;
  description: string;
  websiteUrl?: string;
  logoUrl?: string;
}

export async function createCheckout(input: ClaimInput): Promise<{ checkoutUrl: string }> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleJson(res);
}

export async function fetchCheckoutSession(
  sessionId: string
): Promise<{ territory: Territory; status: string }> {
  const res = await fetch(`/api/checkout/session/${encodeURIComponent(sessionId)}`);
  return handleJson(res);
}

export async function uploadLogo(file: File): Promise<{ logoUrl: string }> {
  const form = new FormData();
  form.append("logo", file);
  const res = await fetch("/api/uploads/logo", { method: "POST", body: form });
  return handleJson(res);
}

// --- Admin ---

export async function adminFetchTerritories(secret: string): Promise<Territory[]> {
  const res = await fetch("/api/admin/territories", {
    headers: { "x-admin-secret": secret },
  });
  const data = await handleJson<{ territories: any[] }>(res);
  return data.territories;
}

export async function adminFetchStats(secret: string) {
  const res = await fetch("/api/admin/stats", {
    headers: { "x-admin-secret": secret },
  });
  return handleJson<{
    totals: {
      total: number;
      sold: number;
      available: number;
      pending: number;
      revenuePence: number;
    };
    recentPurchases: {
      name: string;
      slug: string;
      owner_name: string | null;
      company_name: string | null;
      price_pence: number;
      purchased_at: string | null;
    }[];
  }>(res);
}

export async function adminUpdateTerritory(secret: string, id: number, patch: Record<string, unknown>) {
  const res = await fetch(`/api/admin/territories/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", "x-admin-secret": secret },
    body: JSON.stringify(patch),
  });
  return handleJson(res);
}
