/**
 * LLM router: workflow → model + token caps from workflow_budgets.json.
 * @see docs/NOVA_LLM_DECISION.md, docs/workflow_budgets.json
 */
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Map spec model names to current OpenAI model IDs (update when new models ship). */
const MODEL_MAP: Record<string, string> = {
  "gpt-5-mini": "gpt-4o-mini",
  "o4-mini": "o1-mini",
  o3: "o1",
  "gpt-5.2": "gpt-4o",
};

interface WorkflowBudgets {
  version: string;
  models: {
    tier_a?: { name: string; max_total_tokens_per_call?: number };
    tier_b?: { name: string; max_total_tokens_per_call?: number };
    tier_b2?: { name: string; max_total_tokens_per_call?: number };
    tier_c?: { name: string; max_total_tokens_per_call?: number };
  };
  workflows: Record<
    string,
    {
      max_model_calls?: number;
      token_budget_total?: number;
      output_budget_total?: number;
      allowed_tiers?: string[];
      per_call_caps?: Record<string, { max_output?: number; max_total?: number }>;
      escalation_path?: string[];
    }
  >;
}

let cached: WorkflowBudgets | null = null;

async function loadBudgets(): Promise<WorkflowBudgets> {
  if (cached) return cached;
  const root = process.cwd();
  // From apps/api/src/nova or apps/api/dist/nova, ../../../../ is monorepo root
  const repoRootDocs = path.resolve(__dirname, "../../../../docs/workflow_budgets.json");
  const docPath = path.join(root, "docs", "workflow_budgets.json");
  const altPath = path.join(root, "..", "docs", "workflow_budgets.json");
  let raw: string;
  try {
    raw = await readFile(repoRootDocs, "utf-8");
  } catch {
    try {
      raw = await readFile(docPath, "utf-8");
    } catch {
      raw = await readFile(altPath, "utf-8");
    }
  }
  cached = JSON.parse(raw) as WorkflowBudgets;
  return cached;
}

function resolveModel(specName: string): string {
  return MODEL_MAP[specName] ?? specName;
}

export interface RouterResult {
  model: string;
  max_tokens: number;
  workflow: string;
}

/**
 * Select model and token cap for a workflow. Default workflow: compass_chat_qa.
 */
export async function selectModelForWorkflow(
  workflowName: string = "compass_chat_qa"
): Promise<RouterResult> {
  const budgets = await loadBudgets();
  const workflow = budgets.workflows[workflowName];
  const models = budgets.models;

  const tierA = models.tier_a?.name ?? "gpt-5-mini";
  const model = resolveModel(tierA);
  const tierConfig = models.tier_a;
  const maxFromTier = tierConfig?.max_total_tokens_per_call ?? 2000;
  const perCall = workflow?.per_call_caps?.tier_a;
  const maxTokens = Math.min(
    perCall?.max_output ?? perCall?.max_total ?? maxFromTier,
    workflow?.output_budget_total ?? 700,
    maxFromTier
  );

  return {
    model,
    max_tokens: Math.max(256, maxTokens),
    workflow: workflowName,
  };
}
