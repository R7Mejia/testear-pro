import type { Attempt, QuestionBank } from "./types";

export interface BankAnalytics {
  totalAttempts: number;
  bestScore: number;
  avgScore: number;
  recentScore: number;
  improvementDelta: number; // recent - previous avg
  passProbability: number; // 0..1
  readiness: number; // 0..1
  weakQuestions: { questionId: string; prompt: string; wrongRate: number }[];
  strongQuestions: { questionId: string; prompt: string; correctRate: number }[];
  scoreSeries: { attempt: number; score: number }[];
}

export function analyze(bank: QuestionBank, attempts: Attempt[]): BankAnalytics {
  const sorted = [...attempts].sort((a, b) => a.startedAt - b.startedAt);
  const scores = sorted.map((a) => a.score);
  const total = scores.length;
  const best = total ? Math.max(...scores) : 0;
  const avg = total ? scores.reduce((s, v) => s + v, 0) / total : 0;
  const recent = total ? scores[scores.length - 1] : 0;
  const prevAvg =
    total > 1 ? scores.slice(0, -1).reduce((s, v) => s + v, 0) / (total - 1) : recent;
  const improvementDelta = recent - prevAvg;

  // Per-question stats across all attempts
  const stats = new Map<string, { correct: number; seen: number; prompt: string }>();
  for (const q of bank.questions) {
    stats.set(q.id, { correct: 0, seen: 0, prompt: q.prompt });
  }
  for (const a of attempts) {
    for (const ans of a.answers) {
      const s = stats.get(ans.questionId);
      if (!s) continue;
      s.seen += 1;
      if (ans.correct) s.correct += 1;
    }
  }
  const seenList = Array.from(stats.entries())
    .map(([id, s]) => ({ id, ...s }))
    .filter((s) => s.seen > 0);

  const weakQuestions = seenList
    .map((s) => ({
      questionId: s.id,
      prompt: s.prompt,
      wrongRate: 1 - s.correct / s.seen,
    }))
    .filter((q) => q.wrongRate > 0)
    .sort((a, b) => b.wrongRate - a.wrongRate)
    .slice(0, 5);

  const strongQuestions = seenList
    .map((s) => ({
      questionId: s.id,
      prompt: s.prompt,
      correctRate: s.correct / s.seen,
    }))
    .filter((q) => q.correctRate > 0.6)
    .sort((a, b) => b.correctRate - a.correctRate)
    .slice(0, 5);

  // Pass probability — weighted: recent score (60%) + best (20%) + consistency (20%)
  const consistency = total > 1 ? 1 - stdev(scores) : 0.5;
  const passProbability = clamp01(
    0.6 * recent + 0.2 * best + 0.2 * consistency,
  );

  // Readiness adds attempt-volume bonus, capped
  const volumeBoost = Math.min(total / 10, 1) * 0.1;
  const readiness = clamp01(passProbability * 0.9 + volumeBoost);

  const scoreSeries = sorted.map((a, i) => ({
    attempt: i + 1,
    score: Math.round(a.score * 100),
  }));

  return {
    totalAttempts: total,
    bestScore: best,
    avgScore: avg,
    recentScore: recent,
    improvementDelta,
    passProbability,
    readiness,
    weakQuestions,
    strongQuestions,
    scoreSeries,
  };
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
function stdev(arr: number[]) {
  const m = arr.reduce((s, v) => s + v, 0) / arr.length;
  const v = arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length;
  return Math.sqrt(v);
}

export function exportAttemptsCSV(bank: QuestionBank, attempts: Attempt[]) {
  const header = ["attempt_id", "mode", "started_at", "finished_at", "completed", "score_pct", "reached_question"];
  const rows = attempts.map((a) => [
    a.id,
    a.mode,
    new Date(a.startedAt).toISOString(),
    new Date(a.finishedAt).toISOString(),
    String(a.completed),
    Math.round(a.score * 100),
    a.reachedQuestion,
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${bank.name.replace(/\s+/g, "_")}_attempts.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
