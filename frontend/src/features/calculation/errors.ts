export type CalculationErrorCode =
  | "UNSUPPORTED_SCHEMA_VERSION"
  | "INVALID_CURRENCY"
  | "INVALID_PROJECT_NAME"
  | "INVALID_CLIENT"
  | "INVALID_ITEMS"
  | "INVALID_ITEM_ID"
  | "DUPLICATE_ITEM_ID"
  | "INVALID_ITEM_NAME"
  | "INVALID_ITEM_DESCRIPTION"
  | "INVALID_UNIT"
  | "INVALID_QUANTITY"
  | "INVALID_MONEY"
  | "INVALID_BASIS_POINTS"
  | "INVALID_COMMENT"
  | "UNEXPECTED_FIELD"
  | "CALCULATION_LIMIT_EXCEEDED";

export class CalculationError extends Error {
  readonly code: CalculationErrorCode;
  readonly path?: string;

  constructor(code: CalculationErrorCode, message: string, path?: string) {
    super(message);
    this.name = "CalculationError";
    this.code = code;
    this.path = path;
  }
}
