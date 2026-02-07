Nova LLM Decision & Model Strategy
1. Objective

Nova is the intelligence layer of MarketBuzz Compass, responsible for:

Revenue & performance analysis

Merchant insights and summaries

Multi-step reasoning across business data

Generating customer-facing explanations and recommendations

The LLM stack must prioritize:

Correctness

Deterministic behavior

Structured outputs

Controlled cost growth

2. Provider Selection

Chosen provider: OpenAI
Rationale:

Best-in-class agent tooling (function calling, structured outputs)

Dedicated reasoning models (o3, o4-mini)

Strong caching + batch economics

Mature ecosystem for production agents

Nova will not dynamically switch providers.

3. Model Portfolio (within OpenAI)

Nova uses multiple OpenAI models, each assigned to a clearly defined responsibility.

Model Roles
Model	Role	Why
GPT-5 mini	Default execution model	Best cost-to-quality for daily workloads
o4-mini	Light reasoning & validation	Cheap, structured, reasoning-oriented
o3	Deep reasoning	Reliable multi-step reasoning
GPT-5.2	High-stakes / customer-facing outputs	Highest quality, used sparingly

4. Task → Model Mapping
Tier A — Default (80–85% of traffic)

Model: GPT-5 mini

Used for:

KPI summaries

Insight narration

Data explanations

Text normalization

Extraction & classification

Draft recommendations

Reason:

Extremely cost-efficient

Good enough reasoning for most Compass insights

Tier B — Reasoning Escalation

Model: o4-mini → o3 (fallback)

Used for:

Multi-step business logic

Merchant matching & reconciliation

Trend detection across time windows

“Why did X happen?” analysis

Conflicting or incomplete data

Reason:

Explicit reasoning behavior

Better consistency than general-purpose models

Still cheaper than GPT-5.2

Tier C — High-Risk / External Output

Model: GPT-5.2

Used for:

Customer-facing explanations

Executive summaries

Compliance-sensitive insights

Final answers after multi-step agent reasoning

“One-shot, must-be-right” responses

Reason:

Highest output quality

Used sparingly due to output cost

5. Escalation Rules (Deterministic)

Nova escalates only when necessary.

Escalation triggers:

Low confidence score (< threshold)

Schema validation failure

Contradictory internal facts detected

Missing required inputs

Output flagged as customer-facing

Multi-entity reasoning depth exceeds limit

Escalation path:

GPT-5 mini
  ↓
o4-mini
  ↓
o3
  ↓
GPT-5.2


No lateral jumps. No random retries.

6. Cost Controls
Token Discipline

Hard caps on max output tokens per tier

Reasoning models used only after escalation

No unrestricted “think freely” prompts

Prompt Caching

Cached inputs:

Nova system prompt

Business rules

KPI definitions

Data schemas

Output formats

OpenAI cached input pricing reduces repeated costs significantly.

7. Batch & Async Usage

Where applicable:

Batch API used for:

Monthly insights

Historical backfills

Large merchant cohort analysis

Benefit:

~50% cost reduction on input/output tokens

Non-latency-sensitive workloads

8. Observability & Guardrails

Nova tracks:

Tokens per request

Cost per workflow

Cost per merchant

Escalation frequency

Model failure rates

Alerts triggered on:

Sudden token spikes

Unexpected Tier C usage

Repeated schema failures

9. Explicit Non-Goals

Nova will not:

Route across multiple LLM providers

Optimize purely for lowest token cost

Allow unrestricted reasoning token growth

Depend on hidden chain-of-thought outputs

10. Future Considerations

Periodic re-evaluation of OpenAI models

Potential introduction of fine-tuned lightweight models for extraction

Offline evaluation harness to benchmark model drift

Summary

Nova uses one provider (OpenAI) with clear model roles, deterministic escalation, and strict cost control.

This keeps the system:

Understandable

Auditable

Scalable

Production-safe

Nova LLM Decision Diagram (Mermaid)
flowchart TD
    A[Incoming Nova Task] --> B{Task Type?}

    %% Tier A
    B -->|Extraction / Summary / KPI Narration / Classification| TIER_A[ Tier A ]
    TIER_A --> M1[GPT-5 mini]
    M1 --> C1[$ Low Cost]
    M1 --> V1{Valid & Confident?}
    V1 -->|Yes| DONE[Return Result]
    V1 -->|No| ESC1[Escalate]

    %% Tier B
    ESC1 --> TIER_B[ Tier B – Reasoning ]
    B -->|Multi-step Logic / Trend Analysis / Conflicts| TIER_B
    TIER_B --> M2[o4-mini]
    M2 --> C2[$$ Medium Cost]
    M2 --> V2{Valid & Confident?}
    V2 -->|Yes| DONE
    V2 -->|No| M3[o3]

    M3 --> C3[$$ Medium+ Cost]
    M3 --> V3{Valid & Confident?}
    V3 -->|Yes| DONE
    V3 -->|No| ESC2[Escalate]

    %% Tier C
    ESC2 --> TIER_C[ Tier C – High Stakes ]
    B -->|Customer-facing / Executive / Compliance| TIER_C
    TIER_C --> M4[GPT-5.2]
    M4 --> C4[$$$ High Cost]
    M4 --> DONE

    %% Guardrails
    DONE --> G[Log Cost • Track Tokens • Emit Metrics]

Nova Decision Diagram (token ceilings + cost circuit breaker)
flowchart TD
    A[Incoming Nova Task] --> PRE[Pre-checks]
    PRE --> MTR[Read Metrics:\n• month_to_date_cost\n• rolling_24h_cost\n• tier_usage_rates]
    MTR --> CB{Circuit Breaker?\nmonth_to_date_cost > LIMIT\nOR rolling_24h_cost > LIMIT\nOR Tier C % > MAX}

    %% Circuit breaker behavior
    CB -->|YES| SAFE[SAFE MODE:\n- Disable Tier C\n- Prefer Tier A\n- Hard-cap output\n- Return partial + ask for missing data\n- Queue heavy jobs to Batch]
    SAFE --> LOGSAFE[Log: breaker_reason + limits_hit]
    LOGSAFE --> B

    CB -->|NO| B{Task Type?}

    %% Tier A
    B -->|Extraction / Summary / KPI Narration / Classification| TIER_A[ Tier A ]
    TIER_A --> CAPA[Token Ceilings:\nmax_input=1,500\nmax_output=800\nmax_total=2,000]
    CAPA --> M1[GPT-5 mini]
    M1 --> V1{Valid & Confident?\nSchema OK?\nNo contradictions?}
    V1 -->|Yes| DONE[Return Result]
    V1 -->|No| ESC1[Escalate]

    %% Tier B
    ESC1 --> TIER_B[ Tier B – Reasoning ]
    B -->|Multi-step Logic / Trend Analysis / Conflicts| TIER_B
    TIER_B --> CAPB[Token Ceilings:\nmax_input=3,000\nmax_output=1,200\nmax_total=4,000]
    CAPB --> M2[o4-mini]
    M2 --> V2{Valid & Confident?\nSchema OK?\nNo contradictions?}
    V2 -->|Yes| DONE
    V2 -->|No| M3[o3]

    M3 --> CAPB2[Token Ceilings:\nmax_input=4,000\nmax_output=1,800\nmax_total=6,000]
    CAPB2 --> V3{Valid & Confident?\nSchema OK?\nNo contradictions?}
    V3 -->|Yes| DONE
    V3 -->|No| ESC2[Escalate]

    %% Tier C
    ESC2 --> TIER_C[ Tier C – High Stakes ]
    B -->|Customer-facing / Executive / Compliance| TIER_C
    TIER_C --> CAPC[Token Ceilings:\nmax_input=6,000\nmax_output=2,000\nmax_total=8,000]
    CAPC --> M4[GPT-5.2]
    M4 --> DONE

    %% Logging & monitoring
    DONE --> G[Log + Monitor:\n• tokens_in/out\n• model_used\n• tier\n• cost_estimate\n• breaker_state\n• validation_outcome]
