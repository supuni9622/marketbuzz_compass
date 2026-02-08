/**
 * Clover CSV parser — normalizes rows to charges_raw format.
 * @see docs/CLOVER_CSV_SCHEMA.md, docs/INGESTION_WORKFLOW.md
 */
import type { ChargeStatus } from "@marketbuzz/shared";
import Papa from "papaparse";

const MONTH_NAMES: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

/** Normalized charge row for charges_raw */
export interface ParsedCharge {
  charge_id: string;
  charge_date: string; // YYYY-MM-DD
  charge_month: string; // YYYY-MM-01
  merchant_id: string;
  merchant_name: string;
  app_id: string;
  app_name: string;
  amount: number;
  status_current: ChargeStatus;
  uninstall_date: string | null; // YYYY-MM-DD or null
}

function parseChargeDate(dateStr: string): { date: string; month: string } | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  const m = trimmed.match(/(\d{2})-(\w{3})-(\d{4})/);
  if (!m) return null;
  const monthNum = MONTH_NAMES[m[2]] ?? "01";
  const date = `${m[3]}-${monthNum}-${m[1]}`;
  const month = `${m[3]}-${monthNum}-01`;
  return { date, month };
}

function parseUninstallDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/(\d{2})-(\w{3})-(\d{4})/);
  if (!m) return null;
  const monthNum = MONTH_NAMES[m[2]] ?? "01";
  return `${m[3]}-${monthNum}-${m[1]}`;
}

function parseAmount(val: string): number | null {
  if (val == null || val === "") return null;
  const s = String(val).trim().replace(/,/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function mapStatus(status: string): ChargeStatus {
  const upper = String(status || "").trim().toUpperCase();
  if (upper === "REFUNDED" || upper === "REFUND") return "REFUND";
  if (["BILLED", "COLLECTED", "DEPOSITED", "ONHOLD"].includes(upper)) {
    return upper as ChargeStatus;
  }
  return "OTHER";
}

/**
 * Parse a single CSV row into a ParsedCharge or null if invalid.
 */
export function parseRow(
  row: Record<string, string>,
  headers: string[],
  sourceFileId: string
): ParsedCharge | null {
  const chargeId = String(row["Charge ID"] ?? row["charge_id"] ?? "").trim();
  if (!chargeId) return null;

  const chargeDateStr = row["Charge Date"] ?? row["charge_date"] ?? "";
  const parsedDate = parseChargeDate(chargeDateStr);
  if (!parsedDate) return null;

  const amount = parseAmount(row["Amount"] ?? row["amount"] ?? "");
  if (amount === null) return null;

  const merchantId = String(row["Merchant ID"] ?? row["merchant_id"] ?? "").trim();
  if (!merchantId) return null;

  const merchantName = String(row["Merchant Name"] ?? row["merchant_name"] ?? "").trim() || "Unknown";
  const appName = String(row["App Name"] ?? row["app_name"] ?? "").trim() || "Unknown";
  const appId = String(row["App ID"] ?? row["app_id"] ?? "").trim() || appName;

  const status = mapStatus(row["Status"] ?? row["status"] ?? "");
  const uninstallDate = parseUninstallDate(row["Uninstall Date"] ?? row["uninstall_date"] ?? "");

  return {
    charge_id: chargeId,
    charge_date: parsedDate.date,
    charge_month: parsedDate.month,
    merchant_id: merchantId,
    merchant_name: merchantName,
    app_id: appId,
    app_name: appName,
    amount,
    status_current: status,
    uninstall_date: uninstallDate,
  };
}

export interface ParseResult {
  charges: ParsedCharge[];
  monthsDetected: string[];
  headers: string[];
}

/**
 * Parse full CSV buffer into normalized charges.
 */
export function parseCsv(csvBuffer: Buffer, sourceFileId: string): ParseResult {
  const csvText = csvBuffer.toString("utf8");
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().replace(/^"|"$/g, ""),
  });

  const headers = parsed.meta.fields ?? [];
  const charges: ParsedCharge[] = [];
  const monthsSet = new Set<string>();

  for (const row of parsed.data) {
    const charge = parseRow(row, headers, sourceFileId);
    if (charge) {
      charges.push(charge);
      monthsSet.add(charge.charge_month.slice(0, 7)); // YYYY-MM
    }
  }

  const monthsDetected = Array.from(monthsSet).sort();

  return { charges, monthsDetected, headers };
}
