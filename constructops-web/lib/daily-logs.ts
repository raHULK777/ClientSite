"use client";

import { useEffect, useState } from "react";

import { apiMutate } from "@/lib/client-api";

import type { DailyLog } from "@/lib/api-types";

export function useDailyLogs(projectId: string) {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/core/protected/projects/${projectId}/daily-logs`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load daily logs");
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setLogs(json.data.dailyLogs ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLogs([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return { logs, loading };
}

export async function postDailyLog(projectId: string, body: unknown) {
  const result = await apiMutate<{ dailyLog: DailyLog }>(
    `/protected/projects/${projectId}/daily-logs`,
    "POST",
    body,
  );
  return result?.dailyLog ?? null;
}