Problem Statement — MarketBuzz Compass
The Problem
MarketBuzz operates in the Clover App Market, serving thousands of small and medium merchants across multiple subscription-based apps. While billing data is available, reliable revenue and merchant intelligence is not.

The core challenges are:

1. Fragmented and misleading billing data
Clover only allows exporting rolling 3-month CSV snapshots.
These exports:

overlap across months

represent current charge status, not lifecycle events

do not clearly distinguish billed, collected, deposited, refunded, or uninstalled states over time

As a result:

duplicate data is unavoidable

month-by-month revenue numbers are easy to misinterpret

historical context is constantly lost

2. No trusted definition of “growth”
Different teams interpret revenue differently:

Finance looks at deposited amounts

Marketing looks at billed counts

Product looks at churn and lifecycle changes

Without a single, agreed baseline:

growth discussions are inconsistent

month-over-month comparisons are unreliable

leadership cannot confidently answer “Are we actually growing?”

3. Manual analysis does not scale
Revenue and lifecycle analysis today requires:

repeated CSV cleanup

manual deduplication

spreadsheet logic that only one or two people understand

This creates:

delays in insight

high risk of errors

dependency on individuals instead of systems

4. Dashboards show data, not understanding
Traditional dashboards:

show charts without explanation

require analytical expertise to interpret

fail to connect revenue, churn, refunds, and merchant behavior into a coherent story

Non-analyst users (product, marketing, sales, leadership) struggle to:

understand why numbers changed

identify who is at risk

know what actions to take next

5. No institutional memory
Insights are ephemeral:

each month’s analysis starts from scratch

lessons from past months are forgotten

warnings are not tracked or validated over time

There is no system that:

remembers previous trends

compares expectations to outcomes

improves reasoning month after month

6. Growth planning is disconnected from reality
Growth targets are often set as percentages without:

grounding in historical behavior

understanding renewal, churn, or upgrade dynamics

a clear plan for how the target will be achieved

This leads to:

unrealistic expectations

reactive decision-making

missed opportunities in retention and expansion

Why Existing Tools Fail
Spreadsheets, BI dashboards, and raw exports:

assume clean, event-based data (Clover provides snapshots)

require analysts to operate them

do not retain reasoning or context

cannot proactively interpret or warn

They answer “what happened”, but not:

why it happened

what it means

what should be done next

The Need
MarketBuzz needs a system that:

Ingests imperfect, overlapping billing data and makes it reliable

Establishes a single source of truth for revenue growth

Tracks merchant and revenue lifecycles over time

Preserves historical context and reasoning

Explains insights in plain language

Proactively highlights risks and opportunities

Helps plan realistic, data-backed growth

— without requiring users to be analysts or engineers.

The Solution
MarketBuzz Compass is built to solve this problem.

It is an internal revenue intelligence system that:

transforms raw Clover exports into trusted, canonical metrics

maintains institutional memory across months

interprets data through an intelligent agent (Nova)

presents insights as guided narratives, not dashboards

supports proactive analysis and growth planning

MarketBuzz Compass answers the question:

“What is actually happening to our revenue and merchants — and what should we do next?”

In One Line
MarketBuzz Compass exists because understanding revenue growth in the Clover ecosystem is harder than collecting the data — and teams need clarity, not spreadsheets.