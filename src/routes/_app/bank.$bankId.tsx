import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 50;
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { storage } from "@/lib/testear/storage";
import { analyze } from "@/lib/testear/analytics";
import type { Question, QuestionBank } from "@/lib/testear/types";
import { ArrowLeft, BarChart3, Check, Play, Skull, Zap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/bank/$bankId")({
  component: BankPage,
});

function BankPage() {
  const { bankId } = Route.useParams();
  const nav = useNavigate();
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [attempts, setAttempts] = useState<import("@/lib/testear/types").Attempt[]>([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([storage.getBank(bankId), storage.attemptsForBank(bankId)])
      .then(([b, a]) => {
        if (cancelled) return;
        if (!b) {
          toast.error("Bank not found");
          nav({ to: "/" });
          return;
        }
        setBank(b);
        setAttempts(a);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [bankId, nav]);

  const stats = useMemo(
    () => (bank ? analyze(bank, attempts) : null),
    [bank, attempts],
  );

  if (!bank || !stats) return null;

  const answeredCount = bank.questions.filter((q) => q.correctIndex != null || q.correctText).length;
  const ready = answeredCount === bank.questions.length && bank.questions.length > 0;

  function update(qid: string, patch: Partial<Question>) {
    if (!bank) return;
    const next = {
      ...bank,
      questions: bank.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)),
    };
    setBank(next);
    storage.saveBank(next).catch((e) => toast.error(e?.message ?? "Save failed"));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="size-3" /> All banks
          </Link>
          <h1 className="text-3xl font-bold mt-1">{bank.name}</h1>
          <p className="text-sm text-muted-foreground">
            {bank.questions.length} questions · {answeredCount} with answer set · {stats.totalAttempts} attempts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/analytics" search={{ bank: bank.id } as never}>
              <BarChart3 className="size-4 mr-2" />Analytics
            </Link>
          </Button>
          <Button
            disabled={!ready}
            variant="outline"
            onClick={() => nav({ to: "/practice/$bankId", params: { bankId: bank.id }, search: { mode: "easy" } as never })}
          >
            <Zap className="size-4 mr-2" />Easy mode
          </Button>
          <Button
            disabled={!ready}
            onClick={() => nav({ to: "/practice/$bankId", params: { bankId: bank.id }, search: { mode: "goat" } as never })}
            style={{ background: "var(--gradient-danger)", color: "var(--destructive-foreground)" }}
          >
            <Skull className="size-4 mr-2" />G.O.A.T mode
          </Button>
        </div>
      </div>

      {!ready && (
        <Card className="border-warning/40">
          <CardContent className="pt-6 text-sm">
            Set the correct answer for each question before practicing.
            <span className="ml-2 text-muted-foreground">({answeredCount}/{bank.questions.length} done)</span>
          </CardContent>
        </Card>
      )}

      {(() => {
        const totalPages = Math.max(1, Math.ceil(bank.questions.length / PAGE_SIZE));
        const safePage = Math.min(page, totalPages - 1);
        const start = safePage * PAGE_SIZE;
        const slice = bank.questions.slice(start, start + PAGE_SIZE);
        return (
          <>
            {bank.questions.length > PAGE_SIZE && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Showing {start + 1}–{Math.min(start + PAGE_SIZE, bank.questions.length)} of {bank.questions.length}</span>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                    <ChevronLeft className="size-3" />
                  </Button>
                  <span className="font-mono">{safePage + 1} / {totalPages}</span>
                  <Button size="sm" variant="ghost" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>
                    <ChevronRight className="size-3" />
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {slice.map((q) => (
                <Card key={q.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex gap-2">
                      <span className="text-primary font-mono">#{q.number}</span>
                      <span className="font-normal">{q.prompt}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {q.options.length > 0 ? (
                      <div className="grid sm:grid-cols-2 gap-2">
                        {q.options.map((opt, i) => {
                          const sel = q.correctIndex === i;
                          return (
                            <button
                              key={i}
                              onClick={() => update(q.id, { correctIndex: i })}
                              className={`text-left text-sm rounded-md px-3 py-2 border transition flex items-start gap-2 ${
                                sel
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <span className="font-mono text-xs mt-0.5">{String.fromCharCode(65 + i)}</span>
                              <span className="flex-1">{opt}</span>
                              {sel && <Check className="size-4 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <Input
                        placeholder="Type the correct answer"
                        value={q.correctText || ""}
                        onChange={(e) => update(q.id, { correctText: e.target.value })}
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            {bank.questions.length > PAGE_SIZE && (
              <div className="flex justify-center gap-2 pt-2">
                <Button size="sm" variant="outline" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                  <ChevronLeft className="size-4 mr-1" /> Prev
                </Button>
                <Button size="sm" variant="outline" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>
                  Next <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        );
      })()}

      {ready && (
        <div className="sticky bottom-4 flex justify-center">
          <div className="glass rounded-full px-5 py-3 flex gap-2 items-center shadow-lg">
            <span className="text-sm">Ready to drill.</span>
            <Button size="sm" onClick={() => nav({ to: "/practice/$bankId", params: { bankId: bank.id }, search: { mode: "easy" } as never })}>
              <Play className="size-3 mr-1" />Start
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
