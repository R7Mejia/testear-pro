import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { storage } from "@/lib/testear/storage";
import { analyze, exportAttemptsCSV } from "@/lib/testear/analytics";
import type { QuestionBank } from "@/lib/testear/types";
import { Download, TrendingDown, TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const search = z.object({ bank: z.string().optional() });

export const Route = createFileRoute("/_app/analytics")({
  validateSearch: (s) => search.parse(s),
  component: AnalyticsPage,
  head: () => ({ meta: [{ title: "Analytics — Testear" }] }),
});

function AnalyticsPage() {
  const { bank: bankParam } = Route.useSearch();
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(bankParam ?? null);

  useEffect(() => {
    const all = storage.getBanks();
    setBanks(all);
    if (!selectedId && all[0]) setSelectedId(all[0].id);
  }, [selectedId]);

  const bank = banks.find((b) => b.id === selectedId);
  const attempts = bank ? storage.attemptsForBank(bank.id) : [];
  const stats = useMemo(() => (bank ? analyze(bank, attempts) : null), [bank, attempts]);

  if (banks.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center text-muted-foreground">
          No banks yet. <Link to="/upload" className="text-primary underline">Upload one</Link> to start tracking.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Track readiness and improvement across attempts.</p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-input border border-border rounded-md px-3 py-2 text-sm"
          >
            {banks.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {bank && (
            <Button variant="outline" size="sm" onClick={() => exportAttemptsCSV(bank, attempts)}>
              <Download className="size-4 mr-1" />Export CSV
            </Button>
          )}
        </div>
      </div>

      {bank && stats && (
        <>
          <div className="grid sm:grid-cols-4 gap-3">
            <Stat label="Attempts" value={String(stats.totalAttempts)} />
            <Stat label="Best score" value={`${Math.round(stats.bestScore * 100)}%`} />
            <Stat label="Recent" value={`${Math.round(stats.recentScore * 100)}%`} />
            <Stat
              label="Trend"
              value={`${stats.improvementDelta >= 0 ? "+" : ""}${Math.round(stats.improvementDelta * 100)}%`}
              tone={stats.improvementDelta >= 0 ? "good" : "bad"}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Readiness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Bar value={stats.readiness} label="Readiness for the real exam" />
                <Bar value={stats.passProbability} label="Estimated pass probability" tone="cyan" />
                <p className="text-xs text-muted-foreground">
                  Calculated from your recent score (60%), best score (20%), and consistency (20%), with a small bonus for repeated attempts.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Score over time</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.scoreSeries.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">No attempts yet.</div>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer>
                      <LineChart data={stats.scoreSeries}>
                        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                        <XAxis dataKey="attempt" stroke="var(--color-muted-foreground)" fontSize={12} />
                        <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            background: "var(--color-card)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        />
                        <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="size-4 text-destructive" />Needs work
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.weakQuestions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nothing flagged yet.</div>
                ) : (
                  <ul className="space-y-2">
                    {stats.weakQuestions.map((q) => (
                      <li key={q.questionId} className="text-sm flex justify-between gap-3">
                        <span className="line-clamp-2">{q.prompt}</span>
                        <span className="font-mono text-destructive shrink-0">{Math.round(q.wrongRate * 100)}% wrong</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="size-4 text-success" />Strong areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.strongQuestions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Keep practicing.</div>
                ) : (
                  <ul className="space-y-2">
                    {stats.strongQuestions.map((q) => (
                      <li key={q.questionId} className="text-sm flex justify-between gap-3">
                        <span className="line-clamp-2">{q.prompt}</span>
                        <span className="font-mono text-success shrink-0">{Math.round(q.correctRate * 100)}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={`text-2xl font-bold font-mono ${tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : ""}`}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function Bar({ value, label, tone }: { value: number; label: string; tone?: "cyan" }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{pct}%</span>
      </div>
      <div className="h-3 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full transition-all"
          style={{
            width: `${pct}%`,
            background: tone === "cyan"
              ? "linear-gradient(90deg, oklch(0.78 0.2 200), oklch(0.78 0.25 320))"
              : "var(--gradient-neon)",
            boxShadow: tone === "cyan" ? "var(--glow-cyan)" : "var(--shadow-neon)",
          }}
        />
      </div>
    </div>
  );
}
