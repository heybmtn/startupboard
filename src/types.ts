export type TerritoryStatus = "available" | "pending" | "sold";

export interface Territory {
  id: number;
  name: string;
  slug: string;
  description: string;
  pricePence: number;
  nextPricePence: number;
  colour: string;
  position: number;
  status: TerritoryStatus;
  ownerName: string | null;
  companyName: string | null;
  ownerDescription: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  purchasedAt: string | null;
}

export function formatPrice(pricePence: number): string {
  return `£${(pricePence / 100).toFixed(pricePence % 100 === 0 ? 0 : 2)}`;
}
