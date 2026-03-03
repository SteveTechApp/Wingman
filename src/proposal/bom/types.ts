export type Money = { currency: "GBP" | "EUR" | "USD" | "OTHER"; value: number };

export type PriceTier = "MSRP" | "Dealer" | "Distributor";

export type BomLine = {
  id: string;
  sku: string;
  description: string;
  qty: number;

  unitCost?: Money;
  unitSell?: Money;
  tier?: PriceTier;

  category?: "Core" | "Endpoints" | "Cabling" | "Services" | "Accessories" | "Other";
  notes?: string;
};

export type ProposalMeta = {
  projectName: string;
  customer?: string;
  currency: Money["currency"];
  marginTargetPct?: number;
};

export type Proposal = {
  meta: ProposalMeta;
  lines: BomLine[];
};

export type ProposalTotals = {
  currency: Money["currency"];
  totalCost: number;
  totalSell: number;
  grossMargin: number;
  grossMarginPct: number;
};