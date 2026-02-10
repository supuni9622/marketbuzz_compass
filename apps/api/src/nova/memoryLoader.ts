/**
 * Nova memory loader: task-based bundles from file-based memory.
 * @see docs/NOVA_MEMORY_LOADING_ALGORITHM.md, docs/MEMORY_FILE_STRUCTURE.md
 */
import { readFile } from "fs/promises";
import path from "path";
import { config } from "../config.js";

export type NovaTaskType =
  | "MONTHLY_BRIEF"
  | "GROWTH_PLAN"
  | "REVENUE_EXPLANATION"
  | "LIFECYCLE_ANALYSIS"
  | "MARKET_CONTEXT"
  | "DEFINITION_LOOKUP"
  | "GENERAL_QUERY";

/** Classify user input or trigger into a task type for bundle selection. */
export function classifyTask(input: {
  trigger?: string;
  query?: string;
  workflow?: string;
}): NovaTaskType {
  if (input.trigger === "proactive_monthly_brief") return "MONTHLY_BRIEF";
  if (input.trigger === "growth_plan" || input.workflow === "growth_plan") return "GROWTH_PLAN";

  const q = (input.query ?? "").toLowerCase();

  if (/why|change|increase|decrease|growth|decline|trend/.test(q)) return "REVENUE_EXPLANATION";
  if (/at risk|lost|churn|refund|uninstall|lifecycle/.test(q)) return "LIFECYCLE_ANALYSIS";
  if (/market|vertical|salon|retail|clover/.test(q)) return "MARKET_CONTEXT";
  if (/definition|what does|how is|define|metric/.test(q)) return "DEFINITION_LOOKUP";

  return "GENERAL_QUERY";
}

/** Bundle entries: file paths relative to memory root (no leading slash). */
const MEMORY_BUNDLES: Record<NovaTaskType, string[]> = {
  MONTHLY_BRIEF: [
    "definitions/metrics.md",
    "definitions/lifecycle.md",
    "definitions/patterns.md",
    "playbooks/retention.md",
    "playbooks/refunds.md",
    "playbooks/winback.md",
    "admin/context.md",
  ],
  GROWTH_PLAN: [
    "definitions/growth.md",
    "definitions/metrics.md",
    "definitions/patterns.md",
    "apps/sms_marketing.md",
    "apps/crm.md",
    "apps/insight_unlock.md",
  ],
  REVENUE_EXPLANATION: ["definitions/metrics.md", "definitions/patterns.md"],
  LIFECYCLE_ANALYSIS: [
    "definitions/lifecycle.md",
    "definitions/patterns.md",
    "playbooks/retention.md",
    "playbooks/winback.md",
  ],
  MARKET_CONTEXT: ["market/clover_market.md", "market/verticals.md", "admin/context.md"],
  DEFINITION_LOOKUP: ["definitions/metrics.md", "definitions/lifecycle.md"],
  GENERAL_QUERY: ["definitions/metrics.md"],
};

function getMemoryRoot(): string {
  if (config.memoryPath) return config.memoryPath;
  return path.resolve(process.cwd(), "memory");
}

/**
 * Load memory content for a task type. Reads files from memory root; missing files yield empty string.
 * Truncation to token budget can be added later.
 */
export async function loadMemoryBundle(taskType: NovaTaskType): Promise<string> {
  const root = getMemoryRoot();
  const files = MEMORY_BUNDLES[taskType] ?? MEMORY_BUNDLES.GENERAL_QUERY;
  const parts: string[] = [];

  for (const rel of files) {
    const filePath = path.join(root, rel);
    try {
      const content = await readFile(filePath, "utf-8");
      parts.push(`## ${rel}\n\n${content}`);
    } catch {
      // File missing or unreadable; skip (fail safely per spec)
    }
  }

  if (parts.length === 0) return "";
  return "# Nova memory (task: " + taskType + ")\n\n" + parts.join("\n\n---\n\n");
}
