"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { getCurrentMonth, getPreviousMonth, toApiMonth } from "@/lib/filters";

export interface FilterState {
  month: string;
  compareMonth: string;
  appId: string;
  monthApi: string;
  compareMonthApi: string;
}

export function useFilters(): FilterState {
  const searchParams = useSearchParams();
  const month = searchParams.get("month") ?? getCurrentMonth();
  const compareMonth = searchParams.get("compare") ?? getPreviousMonth(month);
  const appId = searchParams.get("app") ?? "";

  return useMemo(
    () => ({
      month,
      compareMonth,
      appId,
      monthApi: toApiMonth(month),
      compareMonthApi: toApiMonth(compareMonth),
    }),
    [month, compareMonth, appId]
  );
}
