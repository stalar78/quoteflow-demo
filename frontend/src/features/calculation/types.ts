export type QuoteCalculationInput = {
  schemaVersion: "1";
  projectName: string;
  client: QuoteClient;
  items: QuoteItem[];
  overallDiscountBasisPoints: number;
  taxBasisPoints: number;
  comment: string;
  currency: "RUB";
};

export type QuoteClient = {
  displayName: string;
  contactNote: string;
};

export type QuoteItem = {
  id: string;
  name: string;
  description: string;
  quantity: string;
  unit: string;
  unitPriceMinor: number;
  discountBasisPoints: number;
};

export type CalculationLineResult = {
  itemId: string;
  lineGrossMinor: number;
  lineDiscountMinor: number;
  lineTotalMinor: number;
};

export type CalculationResult = {
  items: CalculationLineResult[];
  subtotalMinor: number;
  overallDiscountMinor: number;
  amountAfterDiscountMinor: number;
  taxMinor: number;
  totalMinor: number;
  currency: "RUB";
  calculationVersion: "1";
};
