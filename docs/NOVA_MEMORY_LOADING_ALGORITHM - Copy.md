Nova Memory Loading Algorithm

(Pseudo-code + decision logic)

Design goals (non-negotiable)

Load only what’s needed (no global memory dump)

Definitions > History > Playbooks > Market (priority order)

Prefer approved memory only

Always be explainable

Fail safely (missing memory → say so)

High-level flow
Nova Task → Task Classification → Memory Bundle Selection
          → Memory Retrieval → Context Assembly
          → Reasoning → Output

1️⃣ Task classification (router)

Nova must classify the task first before touching memory.

function classifyTask(input):
    if input.trigger == "proactive_monthly_brief":
        return "MONTHLY_BRIEF"

    if input.trigger == "growth_plan":
        return "GROWTH_PLAN"

    if input.query contains ["why", "change", "increase", "decrease"]:
        return "REVENUE_EXPLANATION"

    if input.query contains ["at risk", "lost", "churn", "refund"]:
        return "LIFECYCLE_ANALYSIS"

    if input.query contains ["market", "vertical", "salon", "retail"]:
        return "MARKET_CONTEXT"

    if input.query contains ["definition", "what does", "how is"]:
        return "DEFINITION_LOOKUP"

    return "GENERAL_QUERY"


❗ Important
Nova must not load memory until this step is complete.

2️⃣ Memory bundle map (what to load per task)

Define explicit bundles.

MEMORY_BUNDLES = {
  MONTHLY_BRIEF: [
    DEFINITIONS.metrics,
    DEFINITIONS.lifecycle,
    DEFINITIONS.patterns,
    BRIEFS.last_2,
    PLAYBOOKS.retention,
    PLAYBOOKS.refunds,
    PLAYBOOKS.winback,
    ADMIN.context
  ],

  GROWTH_PLAN: [
    DEFINITIONS.growth,
    DEFINITIONS.pricing,
    DEFINITIONS.patterns,
    APPS.in_scope,
    BRIEFS.last_2
  ],

  REVENUE_EXPLANATION: [
    DEFINITIONS.metrics,
    DEFINITIONS.patterns,
    BRIEFS.last_1
  ],

  LIFECYCLE_ANALYSIS: [
    DEFINITIONS.lifecycle,
    DEFINITIONS.patterns,
    PLAYBOOKS.retention,
    PLAYBOOKS.winback,
    BRIEFS.last_1
  ],

  MARKET_CONTEXT: [
    MARKET.clover_market,
    MARKET.verticals,
    MARKET.updates,
    ADMIN.context
  ],

  DEFINITION_LOOKUP: [
    DEFINITIONS.metrics,
    DEFINITIONS.lifecycle
  ],

  GENERAL_QUERY: [
    DEFINITIONS.metrics,
    BRIEFS.last_1
  ]
}

3️⃣ Memory retrieval (DB-backed registry)

Nova never scans S3 blindly.
She queries the memory registry DB.

Helper functions
function fetchMemoryItems(type, tags=[], limit=null):
    return DB.query(
      SELECT * FROM memory_items
      WHERE type = type
        AND status = 'active'
        AND tags @> tags
      ORDER BY updated_at DESC
      LIMIT limit
    )

function readMemory(item_id):
    item = DB.get(memory_items where id=item_id)
    version = DB.get(memory_versions
                     where item_id=item_id
                       and version=item.current_version
                       and status='approved')
    content = S3.read(version.content_s3_key)
    return content

4️⃣ Bundle resolver (dynamic + scoped)

Some bundles depend on context, not static lists.

Example: app-scoped loading
function resolveBundle(bundle, context):
    resolved = []

    for entry in bundle:
        if entry == APPS.in_scope:
            for app in context.apps:
                resolved.append(readMemory("mem-app-" + app))
        elif entry == BRIEFS.last_2:
            resolved.extend(loadLastNBriefs(2))
        elif entry == BRIEFS.last_1:
            resolved.append(loadLastNBriefs(1))
        else:
            resolved.append(readMemory(entry))

    return resolved

5️⃣ Memory priority & truncation (token safety)

Nova must rank memory before assembling context.

Priority order

Definitions (metrics, lifecycle)

Recent briefs

Playbooks

Market context

Admin notes

function rankMemory(memory_list):
    sort memory_list by priority_weight DESC
    return memory_list

function truncateToBudget(memory_list, token_budget):
    context = []
    tokens_used = 0

    for mem in memory_list:
        if tokens_used + mem.tokens <= token_budget:
            context.append(mem)
            tokens_used += mem.tokens
        else:
            break

    return context

6️⃣ Final memory assembly
function loadMemoryForTask(task, context):
    bundle = MEMORY_BUNDLES[task]
    raw_memory = resolveBundle(bundle, context)
    ranked = rankMemory(raw_memory)
    final_memory = truncateToBudget(ranked, MAX_MEMORY_TOKENS)
    return final_memory

7️⃣ Guardrails during reasoning

Nova must enforce memory safety rules:

for each claim in response:
    if claim depends on definition:
        assert definition_loaded

    if claim references past warning:
        assert prior_brief_loaded

    if assumption used:
        assert growth_definitions_loaded


If not satisfied:

respond(
  "I don’t have enough approved context to state this confidently."
)

8️⃣ Writing new memory (draft-only)

Nova cannot modify active memory.

function writeMemoryDraft(item_id, content, note):
    assert user_role != "Viewer"

    create memory_versions row:
        item_id = item_id
        version = current_version + 1
        status = "draft"
        source = "nova_summary"
        change_note = note

    upload content to S3

    log change in memory_change_log


Nova may then suggest approval:

function proposeApproval(item_id, version):
    notify Admin UI

9️⃣ Failure modes (explicit)
Missing definition

“I can’t confidently answer this because the metric definition isn’t loaded.”

Conflicting memory

“There are two conflicting interpretations. I’ll default to the approved one.”

Draft-only memory

“This insight is based on a draft and needs admin approval.”

🔟 Why this algorithm works

Predictable

Auditable

Scales with memory size

Prevents hallucinated “facts”

Keeps Nova institutional, not improvisational

TL;DR mental model

Nova doesn’t remember everything.
She remembers the right things for the right question.