"use client";

import { createClient } from "@/lib/supabase/client";
import type { LicenseType } from "@/lib/boat/questions";
import type { AnswerHistoryRecord, ExamHistoryRecord, ProgressRecord } from "@/lib/boat/storage";

export type LearningStateSnapshot = {
  licenseType: LicenseType;
  progress: ProgressRecord;
  wrongIds: number[];
  answerHistory: AnswerHistoryRecord[];
  examHistory: ExamHistoryRecord[];
  updatedAt: string;
};

let pendingSync: number | null = null;
let latestSnapshot: LearningStateSnapshot | null = null;

export async function syncLearningStateToSupabase(snapshot: LearningStateSnapshot) {
  const supabase = createClient();
  if (!supabase) {
    return { ok: false, skipped: true, reason: "SUPABASE_ENV_MISSING" };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { ok: false, skipped: true, reason: "USER_NOT_SIGNED_IN" };
  }

  const { error } = await supabase.from("blue_marina_learning_states").upsert(
    {
      user_id: userData.user.id,
      license_type: snapshot.licenseType,
      progress: snapshot.progress,
      wrong_ids: snapshot.wrongIds,
      answer_history: snapshot.answerHistory,
      exam_history: snapshot.examHistory,
      updated_at: snapshot.updatedAt
    },
    {
      onConflict: "user_id,license_type"
    }
  );

  if (error) {
    return { ok: false, skipped: false, reason: "UPSERT_FAILED", error };
  }

  return { ok: true, skipped: false };
}

export async function loadLearningStateFromSupabase(licenseType: LicenseType) {
  const supabase = createClient();
  if (!supabase) {
    return { ok: false, skipped: true, reason: "SUPABASE_ENV_MISSING", snapshot: null };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { ok: false, skipped: true, reason: "USER_NOT_SIGNED_IN", snapshot: null };
  }

  const { data, error } = await supabase
    .from("blue_marina_learning_states")
    .select("license_type, progress, wrong_ids, answer_history, exam_history, updated_at")
    .eq("user_id", userData.user.id)
    .eq("license_type", licenseType)
    .maybeSingle();

  if (error) {
    return { ok: false, skipped: false, reason: "SELECT_FAILED", error, snapshot: null };
  }

  if (!data) {
    return { ok: true, skipped: false, snapshot: null };
  }

  return {
    ok: true,
    skipped: false,
    snapshot: {
      licenseType: data.license_type as LicenseType,
      progress: data.progress as ProgressRecord,
      wrongIds: (data.wrong_ids ?? []) as number[],
      answerHistory: (data.answer_history ?? []) as AnswerHistoryRecord[],
      examHistory: (data.exam_history ?? []) as ExamHistoryRecord[],
      updatedAt: data.updated_at as string
    } satisfies LearningStateSnapshot
  };
}

export function queueLearningStateSync(snapshot: LearningStateSnapshot) {
  if (typeof window === "undefined") return;

  latestSnapshot = snapshot;

  if (pendingSync) {
    window.clearTimeout(pendingSync);
  }

  pendingSync = window.setTimeout(() => {
    const queuedSnapshot = latestSnapshot;
    pendingSync = null;

    if (!queuedSnapshot) return;

    void syncLearningStateToSupabase(queuedSnapshot).catch(() => {
      // Supabase sync is best-effort. localStorage remains the source of truth when sync fails.
    });
  }, 400);
}
