# Next.js App Router: Fixing a Section That Won’t Show on First Load

This article documents a real debugging journey: a **Scorecards** section on a dashboard stayed blank on first load and only appeared after navigating away and back (e.g. to “Ask Nova” and return). The fix involved understanding how **`useSearchParams()`**, **Suspense**, and **Framer Motion** interact in the Next.js App Router, and then restructuring the component so the section always shows something.

---

## 1. The Symptom

- **First load:** KPI strip, Brief, and Action Center loaded and showed data or loading states. The **Scorecards** block was empty—no heading, no skeleton, no cards.
- **After navigating away and back:** Scorecards appeared and worked normally.
- So the issue was specific to one section and to the initial render; everything else and every subsequent render were fine.

---

## 2. What We Tried (And Why It Wasn’t Enough)

### 2.1 Gate queries on auth and show loading

We made the KPIs query `enabled: !authLoading` and showed a loading skeleton when `authLoading || isLoading`. We also handled the “no data” case so we never returned `null`.

**Result:** Still blank on first load. The problem wasn’t only “query disabled” or “no loading UI”; something was preventing the Scorecards tree from painting at all on the first pass.

### 2.2 Treat “query not run yet” as loading (e.g. `isPending`)

We used React Query’s `isPending` and showed the skeleton whenever we didn’t have data (so we didn’t hit `if (!data) return null`).

**Result:** Still blank. So the component was either not mounting on first load or not rendering any of its branches.

### 2.3 One Suspense for the whole dashboard

We wrapped the whole dashboard in a single `<Suspense>` with a generic fallback. The idea was that any child using `useSearchParams()` would suspend and we’d at least show that fallback.

**Result:** Still blank for Scorecards. Either the whole dashboard was deferred and we saw one big fallback (not section-specific), or the deferral didn’t trigger the fallback in the way we expected.

### 2.4 Per-section Suspense

We removed the single outer Suspense and wrapped **each** section (KpiStrip, BriefSection, Scorecards, ActionCenterTables) in its own `<Suspense>` with a section-specific fallback (e.g. “Scorecards” heading + skeleton grid for Scorecards).

**Result:** Other sections improved; Scorecards could still be blank on first load. So per-section Suspense alone didn’t fix this section.

### 2.5 Client-only mount for the dashboard

We introduced a “mounted” flag set in `useEffect` and showed a full dashboard skeleton until `mounted === true`, then rendered the real dashboard. That way any `useSearchParams()` usage only ran after client mount.

**Result:** General first-paint experience improved, but **only the Scorecards section** could still be empty on first load. So the issue was specific to how Scorecards (or its subtree) was rendering.

### 2.6 Making cards visible (no opacity 0)

We removed Framer Motion’s `initial="hidden"` (opacity 0) from the scorecard cards and rendered plain `<div>`s so the cards weren’t depending on an animation to become visible.

**Result:** Once the section *did* render with data, the cards were visible immediately. So this fixed “cards invisible on first paint” but didn’t fix “section not there at all” on first load.

---

## 3. Root Causes We Identified

Three things combined to produce the blank Scorecards area:

### 3.1 `useSearchParams()` and deferred rendering

In the App Router, **`useSearchParams()`** can cause the component (and its subtree) to be **deferred** so it isn’t rendered on the initial pass. Scorecards used **`useFilters()`**, which uses **`useSearchParams()`**, so the whole Scorecards component lived in a “deferred” path. On first load, that path might not run or might run after the first paint, so the section could be missing until a later render (e.g. after a client navigation).

### 3.2 Suspense boundary around the wrong part

The Suspense boundary was around the **entire** Scorecards component. So when Scorecards (which calls `useSearchParams()` via `useFilters()`) deferred, the boundary’s fallback should have shown—but the **heading and description** were *inside* that same component. So if the component didn’t run on first paint, you got no heading and no fallback in that slot; the “section” was simply absent.

### 3.3 Cards starting at opacity 0

When data *was* present, the cards used Framer Motion with **`initial="hidden"`** and **`variants.hidden: { opacity: 0, y: 8 }`**. If the “visible” animation didn’t run on first paint (e.g. hydration or timing), the cards stayed invisible. So even when the section rendered, it could look empty.

---

## 4. The Fix That Worked

We applied three changes together.

### 4.1 Section shell never uses `useSearchParams`

We moved the **Scorecards section shell** (the `<section>`, `<h2>`, and description paragraph) **out of** the component that uses `useFilters()` and into the **page** (or a tiny wrapper that doesn’t use any search-params hooks). So on first load we always render:

- “Scorecards” heading  
- “Last 12 months trend (sparkline). Expand for by-app breakdown.”

That shell is plain JSX with no `useSearchParams()`, so it isn’t deferred and always paints.

### 4.2 Only the grid is behind Suspense

Below the shell we render:

```tsx
<Suspense fallback={<ScorecardsGridSkeleton />}>
  <Scorecards showHeading={false} />
</Suspense>
```

- **Fallback:** A grid of six skeleton cards (no hooks). It shows as soon as the shell is there if the child suspends or isn’t ready.
- **Child:** `<Scorecards showHeading={false} />` so it only renders the grid (and loading/error states), not the heading again.

So we always see **heading + description**, and underneath either the **skeleton grid** or the **real cards**. There is no state where “Scorecards” is missing.

### 4.3 Cards visible on first paint

Inside Scorecards we:

- Stopped using **`initial="hidden"`** and staggered card variants that set **opacity: 0**.
- Rendered the cards as normal `<div>`s (or motion components with **`initial={false}`**) so they’re visible on first paint.

That way, when data loads, the section never looks “empty” because of invisible cards.

---

## 5. Takeaways

| Lesson | Application |
|--------|-------------|
| **`useSearchParams()` can defer the component** | In the App Router, any component that calls it may be deferred. Put only the part that *needs* search params behind Suspense, and keep the “shell” (heading, layout) in a component that doesn’t use it. |
| **Put the visible shell outside the deferred tree** | If the heading and description are inside the same component that uses `useSearchParams()`, the whole block can be missing on first load. Render the shell in the parent (page/layout) so something always shows. |
| **Suspense fallback should match the missing part** | Use a section-specific fallback (e.g. grid skeleton) so the layout doesn’t jump and the user sees “Scorecards” + placeholders immediately. |
| **Avoid “invisible until animation” on critical content** | For above-the-fold or key sections, don’t rely on entrance animations (e.g. opacity 0 → 1) for first paint. Use `initial={false}` or non-animated markup so content is visible as soon as it’s rendered. |
| **One fix often isn’t enough** | We needed: (1) shell outside deferred tree, (2) Suspense only around the grid, (3) no opacity-0 initial state. Any one of these alone didn’t fully fix the issue. |

---

## 6. References in This Repo

- **Page (section shell + Suspense):** `apps/web/app/page.tsx` — `ScorecardsSectionWithFallback`, and use of `ScorecardsGridSkeleton` + `<Scorecards showHeading={false} />`.
- **Scorecards component:** `apps/web/app/components/Scorecards.tsx` — `showHeading` prop, `ScorecardsGridSkeleton`, and grid rendered without `initial="hidden"` / opacity 0.
- **Filters (uses `useSearchParams()`):** `apps/web/app/hooks/useFilters.ts` — used by Scorecards, KpiStrip, BriefSection, ActionCenterTables.

This experience is a good reminder: in the App Router, **where** you use `useSearchParams()` and **what** you wrap in Suspense directly affects what appears on the first load.
