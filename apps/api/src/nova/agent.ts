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

export interface GrowthPlanResult {
  markdown: string;
  tool_calls_used: number;
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
4. Levers: Retention, Expansion, Win-back, Acquisition (NRA) with expected contribution and assumptions.
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
    return { markdown: content.trim(), tool_calls_used: toolCallsUsed };
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
