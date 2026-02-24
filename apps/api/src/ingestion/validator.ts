/**
 * CSV validation — fail-fast rules per INGESTION_WORKFLOW.md
 */
import { parseCsv, type ParseResult } from "./parser.js";

const REQUIRED_COLUMNS = [
  "Charge ID",
  "Charge Date",
  "Merchant ID",
  "Merchant Name",
  "Amount",
  "Status",
];
const APP_COLUMNS = ["App Name", "App ID"];

export interface ValidationResult {
  ok: boolean;
  error?: string;
  parseResult?: ParseResult;
}

/**
 * Validate CSV: headers, then parse and check row-level validity.
 * Returns parse result if valid for use in pipeline.
 */
export function validateCsv(csvBuffer: Buffer, sourceFileId: string): ValidationResult {
  if (!csvBuffer || csvBuffer.length === 0) {
    return { ok: false, error: "File is empty" };
  }

  const csvText = csvBuffer.toString("utf8").trim();
  const lines = csvText.split("\n").filter((l) => l.trim());
  if (lines.length < 2) {
    return { ok: false, error: "File has no data rows" };
  }

  const firstLine = lines[0];
  const headers = firstLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

  const hasAppName = headers.includes("App Name");
  const hasAppId = headers.includes("App ID");
  if (!hasAppName && !hasAppId) {
    return { ok: false, error: "Missing required column: App Name or App ID" };
  }

  for (const col of REQUIRED_COLUMNS) {
    if (!headers.includes(col)) {
      return { ok: false, error: `Missing required column: ${col}` };
    }
  }

  const parseResult = parseCsv(csvBuffer, sourceFileId);

  if (parseResult.charges.length === 0) {
    return {
      ok: false,
      error: "No valid rows: Charge ID, Charge Date, and Amount must be present and parseable",
    };
  }

  const totalRows = lines.length - 1;
  const validRatio = parseResult.charges.length / totalRows;
  if (validRatio < 0.5) {
    return {
      ok: false,
      error: `Too many invalid rows: ${parseResult.charges.length} valid of ${totalRows} (need >50% parseable)`,
    };
  }

  return { ok: true, parseResult };
}
