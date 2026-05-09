import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { storage } from "@/lib/testear/storage";
import { analyze } from "@/lib/testear/analytics";
import type { Attempt, QuestionBank } from "@/lib/testear/types";
import { Trash2, Play, BarChart3, Upload, Zap, Skull, PencilLine } from "lucide-react";

export const Route = createFileRoute("/_app/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Testear — Practice Test Simulator" },
      { name: "description", content: "Upload questionnaires, simulate exams in Easy or G.O.A.T mode, and track your readiness with deep analytics." },
    ],
  }),
});

function HomePage() {
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    Promise.all([storage.getBanks(), storage.getAttempts()])
      .then(([b, a]) => { setBanks(b); setAttempts(a); })
      .catch(() => {});
  }, [tick]);

  return (
    <div className="space-y-10">
      <section className="text-center space-y-5 pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs glass">
          <span className="size-2 rounded-full bg-primary animate-pulse" />
          Practice. Simulate. Dominate.
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
          Train like the exam <span className="neon-text">depends on it.</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Upload your questionnaire in any format. Set the answers. Drill in Easy mode for feedback,
          or face G.O.A.T mode where one wrong answer ends the run.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button asChild size="lg" className="font-semibold">
            <Link to="/upload"><Upload className="size-4 mr-2" />Upload questionnaire</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/manual"><PencilLine className="size-4 mr-2" />Build manually</Link>
          </Button>
          {banks.length > 0 && (
            <Button asChild size="lg" variant="ghost">
              <Link to="/analytics"><BarChart3 className="size-4 mr-2" />View analytics</Link>
            </Button>
          )}
        </div>
      </section>

      <section className="grid sm:grid-cols-2 gap-4">
        <ModeCard
          icon={<Zap className="size-5" />}
          title="Easy Mode"
          desc="Immediate feedback. Green for right, red for wrong. Keep going and learn as you go."
          tone="primary"
        />
        <ModeCard
          icon={<Skull className="size-5" />}
          title="G.O.A.T Mode"
          desc="One wrong answer = full restart. Build the nerves you need for the real thing."
          tone="danger"
        />
      </section>

      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-2xl font-bold">Your question banks</h2>
          <span className="text-xs text-muted-foreground">{banks.length} saved</span>
        </div>
        {banks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              No banks yet. <Link to="/upload" className="text-primary underline">Upload your first questionnaire</Link>.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {banks.map((b) => {
              const stats = analyze(b, attempts.filter((a) => a.bankId === b.id));
              return (
                <Card key={b.id} className="group hover:border-primary/50 transition">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="truncate">{b.name}</span>
                      <button
                        onClick={async () => {
                          if (confirm("Delete this bank and all its attempts?")) {
                            await storage.deleteBank(b.id);
                            setTick((t) => t + 1);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{b.questions.length} questions</span>
                      <span>{stats.totalAttempts} attempts</span>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Readiness</span>
                        <span className="text-primary font-mono">{Math.round(stats.readiness * 100)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{ width: `${Math.round(stats.readiness * 100)}%`, background: "var(--gradient-neon)", boxShadow: "var(--shadow-neon)" }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button asChild size="sm" className="flex-1">
                        <Link to="/bank/$bankId" params={{ bankId: b.id }}>
                          <Play className="size-3 mr-1" />Open
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function ModeCard({ icon, title, desc, tone }: { icon: React.ReactNode; title: string; desc: string; tone: "primary" | "danger" }) {
  return (
    <Card
      className="overflow-hidden relative"
      style={{
        boxShadow: tone === "primary" ? "var(--glow-cyan)" : "var(--shadow-danger)",
      }}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-md grid place-items-center"
            style={{
              background: tone === "primary" ? "var(--gradient-neon)" : "var(--gradient-danger)",
              color: "var(--primary-foreground)",
            }}
          >
            {icon}
          </div>
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  );
}
