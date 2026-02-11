/**
 * Nova agent: OpenAI chat with tools + memory. Canonical data only.
 * @see docs/AGENT_SPEC.md, docs/NOVA_LLM_DECISION.md
 */
import OpenAI from "openai";
import { config } from "../config.js";
import { db } from "../db.js";
import {
  classifyTask,
  loadMemoryBundle,
  type NovaTaskType,
} from "./memoryLoader.js";
import { selectModelForWorkflow } from "./router.js";
import {
  executeNovaTool,
  NOVA_TOOL_DEFINITIONS,
  toolGetKpi,
} from "./tools.js";

const SYSTEM_PROMPT = `You are Nova, the revenue analyst for MarketBuzz Compass. Tagline: "Your revenue analyst, I watch the numbers so you don't have to."

Rules:
- Use ONLY canonical data from the tools (get_kpi, list_merchants, get_trend, get_growth_baseline). Never guess or invent metrics.
- Cite numbers in every claim. If data is missing, say "I don't have enough data to answer that yet."
- Speak plainly, confidently, and concisely. No analyst jargon or filler.
- Structure answers: direct answer → evidence (numbers) → interpretation → next step or action.
- Never suggest admin-only actions to viewers.`;

function buildSystemMessage(memoryContext: string): string {
  if (!memoryContext.trim()) return SYSTEM_PROMPT;
  return `${SYSTEM_PROMPT}\n\n## Context (memory)\n\n${memoryContext}`;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface NovaChatOptions {
  messages: ChatMessage[];
  month?: string;
  compare_month?: string;
  app_id?: string;
  workflow?: string;
}

export interface NovaChatResult {
  message: string;
  tool_calls_used: number;
}

export async function runNovaChat(options: NovaChatOptions): Promise<NovaChatResult> {
  const { messages, month, workflow = "compass_chat_qa" } = options;

  if (!config.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const openai = new OpenAI({ apiKey: config.openaiApiKey });
  const lastUser = messages.filter((m) => m.role === "user").pop();
  const query = (lastUser?.content ?? "").trim();
  const taskType: NovaTaskType = classifyTask({
    query,
    workflow,
  });
  const memoryContext = await loadMemoryBundle(taskType);
  const systemContent = buildSystemMessage(memoryContext);

  const { model, max_tokens } = await selectModelForWorkflow(workflow);

  const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  ];

  const supabase = db.get();
  let toolCallsUsed = 0;
  const maxRounds = 6;

  for (let round = 0; round < maxRounds; round++) {
    const response = await openai.chat.completions.create({
      model,
      messages: apiMessages,
      max_tokens,
      tools: NOVA_TOOL_DEFINITIONS.length > 0 ? NOVA_TOOL_DEFINITIONS : undefined,
      tool_choice: NOVA_TOOL_DEFINITIONS.length > 0 ? "auto" : undefined,
    });

    const choice = response.choices[0];
    if (!choice?.message) {
      throw new Error("No message in OpenAI response");
    }

    const msg = choice.message;

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      toolCallsUsed += msg.tool_calls.length;
      apiMessages.push(msg);

      for (const tc of msg.tool_calls) {
        const name = tc.function?.name ?? "";
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function?.arguments ?? "{}") as Record<string, unknown>;
        } catch {
          args = {};
        }
        if (month && !args.month) args.month = month;
        if (options.compare_month && !args.compare_month) args.compare_month = options.compare_month;
        if (options.app_id && !args.app_id) args.app_id = options.app_id;

        const result = await executeNovaTool(name, args, supabase);
        apiMessages.push({
          role: "tool",
          tool_call_id: tc.id!,
          content: result,
        });
      }
      continue;
    }

    const content = msg.content ?? "";
    return { message: content.trim(), tool_calls_used: toolCallsUsed };
  }

  return {
    message: "I hit the iteration limit. Please try a shorter question.",
    tool_calls_used: toolCallsUsed,
  };
}

export interface GrowthPlanInput {
  month: string;
  growth_pct: number;
  app_id?: string;
  constraints?: Record<string, unknown>;
}

/** One row of the Lever Breakdown Table (GROWTH_PLANNING_SPEC Step 5). */
export interface LeverBreakdownRow {
  lever: string;
  expected_contribution: string;
  confidence: string;
}

/**
 * Parse Nova markdown for a Lever Breakdown Table: Lever | Expected Contribution | Confidence.
 * Returns up to 4 rows (Retention, Expansion, Win-back, Acquisition) when a matching table is found.
 */
export function parseLeverBreakdownFromMarkdown(markdown: string): LeverBreakdownRow[] | undefined {
  const lines = markdown.split(/\r?\n/).map((l) => l.trim());
  const expectedLevers = ["Retention", "Expansion", "Win-back", "Acquisition"];
  for (let i = 0; i < lines.length; i++) {
    const header = lines[i];
    if (header === undefined || !header.startsWith("|") || !header.includes("|")) continue;
    const headerCells = header.split("|").map((c) => c.trim().toLowerCase());
    const leverIdx = headerCells.findIndex((c) => c === "lever");
    const contribIdx = headerCells.findIndex(
      (c) => c.includes("expected") && c.includes("contribution")
    );
    const confIdx = headerCells.findIndex((c) => c === "confidence");
    if (leverIdx === -1 || contribIdx === -1 || confIdx === -1) continue;
    const nextLine = lines[i + 1];
    const isSeparator =
      nextLine?.startsWith("|") && /^[\s|:\-]+$/.test(nextLine);
    const dataStart = isSeparator ? i + 2 : i + 1;
    const rows: LeverBreakdownRow[] = [];
    for (let j = dataStart; j < lines.length; j++) {
      const line = lines[j];
      if (line === undefined || !line.startsWith("|")) break;
      const cells = line.split("|").map((c) => c.trim());
      if (cells.length < Math.max(leverIdx, contribIdx, confIdx) + 1) break;
      const lever = cells[leverIdx] ?? "";
      const contribution = cells[contribIdx] ?? "";
      const confidence = cells[confIdx] ?? "";
      const leverNorm = lever.toLowerCase();
      const isExpected =
        expectedLevers.some((l) => leverNorm.includes(l.toLowerCase())) ||
        leverNorm === "nra" ||
        leverNorm === "acquisition";
      if (isExpected && (contribution || confidence)) {
        rows.push({ lever, expected_contribution: contribution, confidence });
      }
      if (rows.length >= 4) break;
    }
    if (rows.length > 0) return rows;
  }
  return undefined;
}

/** Execution list item (merchant or candidate label from Nova). */
export interface ExecutionListItem {
  label: string;
}

/** NRA by plan row (plan name + required count or amount). */
export interface NraByPlanRow {
  plan: string;
  required: string;
}

/** Execution Lists (GROWTH_PLANNING_SPEC Step 5). */
export interface ExecutionLists {
  at_risk?: ExecutionListItem[];
  upgrade_candidates?: ExecutionListItem[];
  lost?: ExecutionListItem[];
  nra_by_plan?: NraByPlanRow[];
}

const EXECUTION_SECTION_HEADINGS: Record<keyof Omit<ExecutionLists, "nra_by_plan">, string[]> = {
  at_risk: ["at risk merchants to contact", "retention candidates", "at risk to contact"],
  upgrade_candidates: ["upgrade candidates", "expansion candidates"],
  lost: ["lost merchants to target", "win-back candidates", "lost to target"],
};

/**
 * Parse Nova markdown for Execution Lists: bullet lists under section headings,
 * and NRA by plan table (Plan | Required or Count).
 */
export function parseExecutionListsFromMarkdown(markdown: string): ExecutionLists | undefined {
  const lines = markdown.split(/\r?\n/).map((l) => l.trim());
  const out: ExecutionLists = {};

  function findSectionStart(searchPhrases: string[]): number {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === undefined) continue;
      const lower = line.toLowerCase();
      if (!lower.startsWith("##")) continue;
      const title = lower.replace(/^#+\s*/, "").trim();
      if (searchPhrases.some((p) => title.includes(p))) return i;
    }
    return -1;
  }

  function collectBulletList(startIdx: number): ExecutionListItem[] {
    const items: ExecutionListItem[] = [];
    for (let j = startIdx + 1; j < lines.length; j++) {
      const line = lines[j];
      if (line === undefined) break;
      if (line.startsWith("##")) break;
      const bulletMatch = line.match(/^[\s]*[\-\*•]\s+(.+)$/);
      if (bulletMatch) {
        const label = bulletMatch[1]?.trim() ?? "";
        if (label.length > 0) items.push({ label });
      }
    }
    return items;
  }

  for (const [key, phrases] of Object.entries(EXECUTION_SECTION_HEADINGS) as Array<[
    keyof Omit<ExecutionLists, "nra_by_plan">,
    string[],
  ]>) {
    const idx = findSectionStart(phrases);
    if (idx >= 0) {
      const list = collectBulletList(idx);
      if (list.length > 0) out[key] = list;
    }
  }

  const nraIdx = findSectionStart(["required nra by plan", "nra by plan", "acquisition by plan"]);
  if (nraIdx >= 0) {
    for (let i = nraIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line === undefined || line.startsWith("##")) break;
      if (!line.startsWith("|") || line.includes("---")) continue;
      const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 2) {
        const plan = cells[0] ?? "";
        const required = cells[1] ?? "";
        if (plan.toLowerCase() !== "plan" && plan.toLowerCase() !== "required" && plan) {
          if (!out.nra_by_plan) out.nra_by_plan = [];
          out.nra_by_plan.push({ plan, required });
        }
      }
    }
  }

  const hasAny =
    (out.at_risk?.length ?? 0) > 0 ||
    (out.upgrade_candidates?.length ?? 0) > 0 ||
    (out.lost?.length ?? 0) > 0 ||
    (out.nra_by_plan?.length ?? 0) > 0;
  return hasAny ? out : undefined;
}

export interface GrowthPlanResult {
  markdown: string;
  tool_calls_used: number;
  /** Parsed Lever Breakdown Table when present in Nova markdown. */
  lever_breakdown?: LeverBreakdownRow[];
  /** Parsed Execution Lists when present in Nova markdown. */
  execution_lists?: ExecutionLists;
}

export async function runNovaGrowthPlan(input: GrowthPlanInput): Promise<GrowthPlanResult> {
  const { month, growth_pct, app_id } = input;

  const openai = new OpenAI({ apiKey: config.openaiApiKey });
  const taskType: NovaTaskType = "GROWTH_PLAN";
  const memoryContext = await loadMemoryBundle(taskType);
  const systemContent = buildSystemMessage(memoryContext);

  const { model, max_tokens } = await selectModelForWorkflow("compass_chat_qa");

  const supabase = db.get();

  const userPrompt = `Generate a growth plan for the next month.
- Baseline month: ${month}
- Target growth: ${growth_pct}%
- App filter: ${app_id ?? "All Apps"}

Use get_growth_baseline for the baseline, then produce a structured plan with:
1. Last month gross billed baseline
2. Target revenue (baseline × (1 + growth%))
3. Gap to close
4. A Lever Breakdown Table in markdown with exactly these columns: Lever | Expected Contribution | Confidence. Include one row each for Retention, Expansion, Win-back, Acquisition (use "Acquisition" for NRA). Use dollar amounts and High/Medium/Low for confidence.
5. Execution Lists — use exactly these section headings and format:
   - ## At Risk merchants to contact — then a bullet list (- or *) of merchant names or identifiers to contact.
   - ## Upgrade candidates — then a bullet list of upgrade candidate names.
   - ## Lost merchants to target — then a bullet list of lost merchants to target for win-back.
   - ## Required NRA by plan — then a markdown table with columns: Plan | Required (e.g. "Basic" | "5" or "Pro" | "$2,000").
6. Assumptions and guardrails.
Keep it realistic; state confidence and assumptions.`;

  const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    { role: "user", content: userPrompt },
  ];

  let toolCallsUsed = 0;
  const maxRounds = 6;

  for (let round = 0; round < maxRounds; round++) {
    const response = await openai.chat.completions.create({
      model,
      messages: apiMessages,
      max_tokens,
      tools: NOVA_TOOL_DEFINITIONS,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    if (!choice?.message) throw new Error("No message in OpenAI response");
    const msg = choice.message;

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      toolCallsUsed += msg.tool_calls.length;
      apiMessages.push(msg);
      for (const tc of msg.tool_calls) {
        const name = tc.function?.name ?? "";
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function?.arguments ?? "{}") as Record<string, unknown>;
        } catch {
          args = {};
        }
        if (!args.month) args.month = month;
        if (app_id && !args.app_id) args.app_id = app_id;
        const result = await executeNovaTool(name, args, supabase);
        apiMessages.push({
          role: "tool",
          tool_call_id: tc.id!,
          content: result,
        });
      }
      continue;
    }

    const content = msg.content ?? "";
    const markdown = content.trim();
    const lever_breakdown = parseLeverBreakdownFromMarkdown(markdown);
    const execution_lists = parseExecutionListsFromMarkdown(markdown);
    return { markdown, tool_calls_used: toolCallsUsed, lever_breakdown, execution_lists };
  }

  return {
    markdown: "Unable to generate growth plan within limit. Try again.",
    tool_calls_used: toolCallsUsed,
  };
}

/** Proactive monthly brief: KPIs + LLM narration, no tool loop. */
export interface ProactiveBriefInput {
  month: string;
  compare_month?: string;
  app_id?: string;
  created_by?: string;
}

export interface ProactiveBriefResult {
  month: string;
  headline_gross_billed: number | null;
  mom_delta: number | null;
  mom_delta_pct: number | null;
  brief_markdown: string;
}

export async function runNovaProactiveBrief(
  input: ProactiveBriefInput
): Promise<ProactiveBriefResult> {
  if (!config.openaiApiKey) throw new Error("OPENAI_API_KEY is not set");
  const openai = new OpenAI({ apiKey: config.openaiApiKey });
  const supabase = db.get();

  const month = input.month.replace(/^(\d{4})-(\d{2}).*/, "$1-$2-01");
  const [y, m] = month.slice(0, 7).split("-").map(Number);
  const prev = new Date(y!, m! - 2, 1);
  const compareMonth =
    input.compare_month?.replace(/^(\d{4})-(\d{2}).*/, "$1-$2-01") ??
    `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-01`;

  const memoryContext = await loadMemoryBundle("MONTHLY_BRIEF");
  const systemContent = buildSystemMessage(memoryContext);

  const kpiJson = await toolGetKpi(supabase, {
    month,
    compare_month: compareMonth,
    app_id: input.app_id,
  });
  const kpis = JSON.parse(kpiJson) as {
    month: string;
    compare_month: string;
    billed_amount: { current: number; compare: number; delta: number; delta_pct: number | null };
    active_merchants: { current: number; compare: number; delta: number; delta_pct: number | null };
    refunded_amount: { current: number; compare: number; delta: number; delta_pct: number | null };
  };

  const { model, max_tokens } = await selectModelForWorkflow("insight_summary_monthly");

  const userPrompt = `Generate the MarketBuzz Monthly Brief for ${month} (compare: ${compareMonth}).

KPI data (canonical):
${kpiJson}

Produce markdown with this structure:
1. **Headline** — Gross billed amount and MoM % change in one sentence.
2. **What changed** — Top 2–3 drivers (apps, lifecycle, refunds) with numbers.
3. **Risks & warnings** — At Risk, refund/uninstall spikes if relevant.
4. **Recommended actions** — Save At Risk, follow-up refunds, win-back Lost. Use "See who" / list links where helpful.

Cite the numbers from the KPI data. Be concise (4–8 bullets total).`;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemContent },
      { role: "user", content: userPrompt },
    ],
    max_tokens,
  });

  const content = response.choices[0]?.message?.content?.trim() ?? "";
  if (!content) throw new Error("Nova returned empty brief");

  return {
    month,
    headline_gross_billed: kpis.billed_amount?.current ?? null,
    mom_delta: kpis.billed_amount?.delta ?? null,
    mom_delta_pct: kpis.billed_amount?.delta_pct ?? null,
    brief_markdown: content,
  };
}
