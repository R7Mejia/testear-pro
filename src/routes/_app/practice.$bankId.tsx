import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { storage, uid } from "@/lib/testear/storage";
import type { Attempt, AttemptAnswer, Mode, QuestionBank } from "@/lib/testear/types";
import { Check, Skull, X, Zap } from "lucide-react";

const search = z.object({ mode: z.enum(["easy", "goat"]).default("easy") });

export const Route = createFileRoute("/_app/practice/$bankId")({
  validateSearch: (s) => search.parse(s),
  component: PracticePage,
});

function PracticePage() {
  const { bankId } = Route.useParams();
  const { mode } = Route.useSearch();
  const nav = useNavigate();
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [runId, setRunId] = useState(0); // bump to restart
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AttemptAnswer[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [textAns, setTextAns] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [done, setDone] = useState<{ attempt: Attempt; failed?: boolean } | null>(null);

  useEffect(() => {
    storage.getBank(bankId).then((b) => { if (b) setBank(b); }).catch(() => {});
  }, [bankId]);

  // reset state on runId change
  useEffect(() => {
    setIdx(0);
    setAnswers([]);
    setPicked(null);
    setTextAns("");
    setRevealed(false);
    setStartedAt(Date.now());
    setDone(null);
  }, [runId]);

  const q = bank?.questions[idx];
  const total = bank?.questions.length ?? 0;
  const progress = total ? (idx / total) * 100 : 0;
  const correctCount = useMemo(() => answers.filter((a) => a.correct).length, [answers]);

  if (!bank || !q) return null;

  function evaluate(): boolean {
    if (!q) return false;
    if (q.options.length > 0 && q.correctIndex != null) {
      return picked === q.correctIndex;
    }
    if (q.correctText) {
      return textAns.trim().toLowerCase() === q.correctText.trim().toLowerCase();
    }
    return false;
  }

  function submit() {
    if (!q) return;
    if (q.options.length > 0 && picked == null) return;
    if (q.options.length === 0 && !textAns.trim()) return;
    const ok = evaluate();
    const ans: AttemptAnswer = {
      questionId: q.id,
      chosenIndex: picked,
      correct: ok,
    };
    const nextAnswers = [...answers, ans];
    setAnswers(nextAnswers);
    setRevealed(true);

    if (mode === "goat" && !ok) {
      // fail immediately
      finalize(nextAnswers, idx, false, true);
      return;
    }
  }

  function next() {
    if (idx + 1 >= total) {
      finalize(answers, idx + 1, true, false);
    } else {
      setIdx(idx + 1);
      setPicked(null);
      setTextAns("");
      setRevealed(false);
    }
  }

  function finalize(ans: AttemptAnswer[], reached: number, completed: boolean, failed: boolean) {
    if (!bank) return;
    const score = ans.length ? ans.filter((a) => a.correct).length / bank.questions.length : 0;
    const attempt: Attempt = {
      id: uid(),
      bankId: bank.id,
      mode,
      startedAt,
      finishedAt: Date.now(),
      completed,
      answers: ans,
      score,
      reachedQuestion: reached,
    };
    storage.saveAttempt(attempt).catch(() => {});
    setDone({ attempt, failed });
  }

  if (done) {
    const pct = Math.round(done.attempt.score * 100);
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 py-10">
        <div
          className="size-24 mx-auto rounded-full grid place-items-center"
          style={{
            background: done.failed ? "var(--gradient-danger)" : "var(--gradient-neon)",
            boxShadow: done.failed ? "var(--shadow-danger)" : "var(--shadow-neon)",
          }}
        >
          {done.failed ? <Skull className="size-10" /> : <Check className="size-10" />}
        </div>
        <h1 className="text-3xl font-bold">
          {done.failed ? "G.O.A.T run terminated" : "Run complete"}
        </h1>
        <p className="text-muted-foreground">
          {done.failed
            ? `You made it to question ${done.attempt.reachedQuestion + 1} of ${total}.`
            : `You scored ${pct}% (${correctCount + (revealed && evaluate() ? 0 : 0)} / ${total}).`}
        </p>
        <div className="text-5xl font-mono neon-text">{pct}%</div>
        <div className="flex justify-center gap-2 flex-wrap">
          <Button onClick={() => setRunId((r) => r + 1)}>
            {done.failed ? "Restart" : "Run again"}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/bank/$bankId" params={{ bankId: bank.id }}>Back to bank</Link>
          </Button>
          <Button variant="ghost" onClick={() => nav({ to: "/analytics", search: { bank: bank.id } as never })}>
            View analytics
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {mode === "goat" ? (
            <span className="inline-flex items-center gap-1 text-destructive font-semibold">
              <Skull className="size-4" /> G.O.A.T MODE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-primary font-semibold">
              <Zap className="size-4" /> Easy mode
            </span>
          )}
        </div>
        <div className="text-muted-foreground font-mono">
          {idx + 1} / {total} · {correctCount} correct
        </div>
      </div>

      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full transition-all"
          style={{
            width: `${progress}%`,
            background: mode === "goat" ? "var(--gradient-danger)" : "var(--gradient-neon)",
          }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex gap-2">
            <span className="text-primary font-mono">#{q.number}</span>
            <span className="font-normal">{q.prompt}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {q.options.length > 0 ? (
            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const isPicked = picked === i;
                const isCorrect = q.correctIndex === i;
                let cls = "border-border hover:border-primary/50";
                if (revealed) {
                  if (isCorrect) cls = "border-success bg-success/10 text-success";
                  else if (isPicked) cls = "border-destructive bg-destructive/10 text-destructive";
                  else cls = "border-border opacity-60";
                } else if (isPicked) {
                  cls = "border-primary bg-primary/10";
                }
                return (
                  <button
                    key={i}
                    disabled={revealed}
                    onClick={() => setPicked(i)}
                    className={`w-full text-left rounded-md px-4 py-3 border transition flex items-start gap-3 ${cls}`}
                  >
                    <span className="font-mono text-xs mt-1">{String.fromCharCode(65 + i)}</span>
                    <span className="flex-1">{opt}</span>
                    {revealed && isCorrect && <Check className="size-4" />}
                    {revealed && isPicked && !isCorrect && <X className="size-4" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <Input
              autoFocus
              disabled={revealed}
              placeholder="Type your answer"
              value={textAns}
              onChange={(e) => setTextAns(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !revealed) submit();
              }}
            />
          )}

          {revealed && (
            <div className={`mt-4 text-sm rounded-md px-3 py-2 ${evaluate() ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              {evaluate() ? "Correct!" : (
                <>
                  Wrong answer.
                  {q.correctText && <> Expected: <strong>{q.correctText}</strong></>}
                  {q.options.length > 0 && q.correctIndex != null && (
                    <> Correct: <strong>{String.fromCharCode(65 + q.correctIndex)}</strong></>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between gap-2">
        <Button variant="ghost" asChild>
          <Link to="/bank/$bankId" params={{ bankId: bank.id }}>Quit</Link>
        </Button>
        {!revealed ? (
          <Button onClick={submit}>Submit</Button>
        ) : (
          <Button onClick={next}>{idx + 1 >= total ? "Finish" : "Next question"}</Button>
        )}
      </div>
    </div>
  );
}
