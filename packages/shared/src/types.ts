/**
 * Shared types for MarketBuzz Compass
 * @see docs/DATA_MODEL_SPEC.md
 */

/** Charge status from Clover (normalized) */
export type ChargeStatus = "BILLED" | "COLLECTED" | "DEPOSITED" | "REFUND" | "OTHER";

/** Merchant lifecycle state */
export type LifecycleState = "Active" | "AtRisk" | "Lost";

/** Paginated response shape */
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  page_size: number;
  total_rows: number;
}

/** Pagination params */
export interface PaginationParams {
  page?: number;
  page_size?: number;
}

/** Month stored as YYYY-MM-01 */
export type MonthDate = string;
