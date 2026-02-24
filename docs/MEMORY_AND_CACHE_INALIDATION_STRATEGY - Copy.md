Below is a production-grade memory cache + invalidation strategy designed specifically for Nova and your DB-backed memory registry + S3 content model.

This is not generic caching advice — it’s tailored to:

low-frequency admin changes

high trust requirements

deterministic agent behavior

minimal operational complexity

Memory Cache & Invalidation Strategy — Nova
Design goals (locked)

Correctness > speed

No stale definitions ever

Predictable invalidation

Simple mental model

Agent-safe (no hallucinated context)

Nova must never reason using outdated definitions, lifecycle rules, or playbooks.

Cache layers (3-tier model)
┌───────────────┐
│ Nova Runtime  │  ← L1 (in-process)
└───────────────┘
        ↓
┌───────────────┐
│ Redis / KV    │  ← L2 (shared)
└───────────────┘
        ↓
┌───────────────┐
│ DB + S3       │  ← Source of Truth
└───────────────┘

L1 — Nova Runtime Cache (In-process)
What lives here

Parsed markdown content

Tokenized memory chunks

Recently used bundles (e.g. “Monthly Brief bundle”)

Keyed by
memory_item_id + version


Example:

mem-def-metrics:v2
mem-playbook-retention:v3

TTL

Short-lived: 5–15 minutes

Auto-evicted on:

memory version change

task completion (optional for safety)

Why L1 exists

Avoid re-parsing markdown repeatedly

Speed up multi-step reasoning inside one request

Keep Nova responsive

Hard rule

L1 cache is never trusted alone — it must be version-validated.

L2 — Shared Cache (Redis / DynamoDB / KV)
What lives here

Approved memory content by version

Pre-tokenized chunks

Lightweight metadata

Cache entry structure
{
  "key": "memory:mem-def-metrics:v2",
  "content": "<markdown text>",
  "sha256": "abc123",
  "tokens": 812,
  "loaded_at": "2026-02-06T10:15:00Z"
}

TTL

24 hours (safe default)

Early invalidation via version bump

Why L2 exists

Share memory across Nova instances

Reduce S3 + DB reads

Cheap, simple, scalable

Source of Truth — DB + S3 (No cache assumptions)
DB is truth for:

current version pointer

approval status

metadata (tags, type, owner)

S3 is truth for:

memory content (markdown)

Nova always checks DB first to determine the current version.

Version-based invalidation (the core idea)
The golden rule

Versions invalidate caches — not time.

If a memory item’s current_version changes:

all cached versions for that item are immediately invalid

Why this works

Memory updates are rare

Admin approval is explicit

Version numbers are monotonic

No guessing, no stale reads

Invalidation flow (step-by-step)
1️⃣ Admin approves a memory draft

Backend does:

memory_items.current_version = N

write to memory_change_log

emit MemoryUpdated event

{
  "event": "MEMORY_UPDATED",
  "item_id": "mem-def-metrics",
  "new_version": 3,
  "type": "definitions"
}

2️⃣ Cache invalidation listeners
L2 cache (Redis / KV)

Delete keys:

memory:mem-def-metrics:*


OR mark old versions as stale

Nova instances (L1)

Subscribe to event bus (SNS / EventBridge / polling)

Evict any L1 entries matching item_id

3️⃣ Next Nova request

Nova checks DB → sees current_version = 3

Loads v3 from L2 or S3

Caches fresh version

Nova’s cache-safe memory load (pseudo-code)
function loadMemory(item_id):
    current_version = DB.getCurrentVersion(item_id)

    cache_key = item_id + ":" + current_version

    if L1.exists(cache_key):
        return L1.get(cache_key)

    if L2.exists(cache_key):
        content = L2.get(cache_key)
        L1.set(cache_key, content)
        return content

    content = S3.read(getS3Key(item_id, current_version))
    L2.set(cache_key, content, ttl=24h)
    L1.set(cache_key, content, ttl=10m)

    return content

Bundle-level caching (important optimization)

Instead of caching only individual files, Nova may cache resolved bundles:

bundle:MONTHLY_BRIEF:
  mem-def-metrics:v2
  mem-def-lifecycle:v3
  mem-patterns:v1
  mem-brief-2026-01:v1

Bundle cache key
bundle:<task_type>:<hash_of_versions>


If any memory version changes → hash changes → cache miss.

Draft memory handling (safe by design)
Draft rules

Draft versions are never cached in L2

Drafts may be cached only in L1 during review

Draft memory is always labeled:

“Draft — pending approval”

Nova behavior

Nova can reference drafts only when explicitly asked

Nova must never silently mix draft + active memory

Negative caching (important edge case)

If a memory item is missing:

if DB.hasNoItem(item_id):
    L2.set("missing:"+item_id, true, ttl=5m)


This avoids repeated DB hits for typos or removed items.

Cache scope by memory type (recommended defaults)
Memory Type	Cacheable	L2 TTL	Notes
Definitions	✅	24h	Version-based invalidation
Playbooks	✅	24h	Safe
Apps	✅	24h	Rare changes
Market	✅	12h	May update more often
Briefs	✅	1h	New briefs frequently
Drafts	⚠️	No	L1 only
Admin context	✅	12h Moderate change

Failure & fallback behavior
Cache unavailable

Nova reads directly from DB + S3

No functionality loss, only latency

DB unavailable

Nova must fail safe

Respond:

“I can’t verify current definitions right now.”

Partial invalidation failure

Version check still protects correctness

Worst case: extra cache misses, not stale data

Observability (you want this)

Track:

memory cache hit/miss rate (L1, L2)

invalidation events

time to load memory bundles

draft vs approved usage

Expose:

/admin/memory/cache-stats (read-only)

TL;DR mental model

Versions are truth

Caches are helpers

Invalidation is explicit

Nova never trusts time alone

This gives you:

correctness guarantees

predictable behavior

low ops burden

high trust from leadership

