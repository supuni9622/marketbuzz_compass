import { z } from "zod";

/** Pagination query schema */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
});

/** Month param (YYYY-MM) */
export const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Expected YYYY-MM format");

/** App ID filter */
export const appIdSchema = z.string().optional();
