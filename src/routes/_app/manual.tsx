import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { storage, uid } from "@/lib/testear/storage";
import type { Question } from "@/lib/testear/types";
import { Plus, Save, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/manual")({
  component: ManualPage,
  head: () => ({
    meta: [
      { title: "Build manually — Testear" },
      { name: "description", content: "Type or paste questions one at a time to build a custom practice bank." },
    ],
  }),
});

type Draft = {
  key: string;
  type: "mcq" | "tf" | "open";
  prompt: string;
  options: string[];
  correctIndex: number | null;
  correctText: string;
};

const blank = (type: Draft["type"] = "mcq"): Draft => ({
  key: Math.random().toString(36).slice(2),
  type,
  prompt: "",
  options: type === "mcq" ? ["", "", "", ""] : type === "tf" ? ["True", "False"] : [],
  correctIndex: null,
  correctText: "",
});

function ManualPage() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([blank()]);

  function update(i: number, patch: Partial<Draft>) {
    setDrafts((d) => d.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }
  function setType(i: number, type: Draft["type"]) {
    setDrafts((d) => d.map((q, idx) => (idx === i ? { ...blank(type), key: q.key, prompt: q.prompt } : q)));
  }
  function setOpt(i: number, oi: number, val: string) {
    setDrafts((d) =>
      d.map((q, idx) =>
        idx === i ? { ...q, options: q.options.map((o, j) => (j === oi ? val : o)) } : q,
      ),
    );
  }
  function addOption(i: number) {
    setDrafts((d) =>
      d.map((q, idx) => (idx === i && q.options.length < 6 ? { ...q, options: [...q.options, ""] } : q)),
    );
  }
  function removeOption(i: number, oi: number) {
    setDrafts((d) =>
      d.map((q, idx) =>
        idx === i
          ? {
              ...q,
              options: q.options.filter((_, j) => j !== oi),
              correctIndex:
                q.correctIndex == null
                  ? null
                  : oi === q.correctIndex
                  ? null
                  : oi < q.correctIndex
                  ? q.correctIndex - 1
                  : q.correctIndex,
            }
          : q,
      ),
    );
  }

  function save() {
    const valid: Question[] = [];
    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i];
      if (!d.prompt.trim()) continue;
      if (d.type === "open") {
        if (!d.correctText.trim()) {
          toast.error(`Question ${i + 1}: set the correct answer text.`);
          return;
        }
        valid.push({
          id: uid(),
          number: valid.length + 1,
          prompt: d.prompt.trim(),
          options: [],
          correctText: d.correctText.trim(),
        });
      } else {
        const opts = d.options.map((o) => o.trim()).filter(Boolean);
        if (opts.length < 2) {
          toast.error(`Question ${i + 1}: add at least two options.`);
          return;
        }
        if (d.correctIndex == null || d.correctIndex >= opts.length) {
          toast.error(`Question ${i + 1}: choose the correct option.`);
          return;
        }
        valid.push({
          id: uid(),
          number: valid.length + 1,
          prompt: d.prompt.trim(),
          options: opts,
          correctIndex: d.correctIndex,
        });
      }
    }
    if (!valid.length) {
      toast.error("Add at least one question with a prompt.");
      return;
    }
    const bank = {
      id: uid(),
      name: name.trim() || `Manual bank ${new Date().toLocaleDateString()}`,
      createdAt: Date.now(),
      questions: valid,
    };
    storage.saveBank(bank);
    toast.success(`Saved ${valid.length} questions`);
    nav({ to: "/bank/$bankId", params: { bankId: bank.id } });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Build manually</h1>
        <p className="text-muted-foreground mt-1">Type each question, set the options and correct answer.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bank name</CardTitle>
        </CardHeader>
        <CardContent>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My custom drill" />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {drafts.map((d, i) => (
          <Card key={d.key}>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm">
                <span className="text-primary font-mono mr-2">#{i + 1}</span>
                Question
              </CardTitle>
              <div className="flex items-center gap-2">
                <select
                  value={d.type}
                  onChange={(e) => setType(i, e.target.value as Draft["type"])}
                  className="bg-secondary text-foreground text-xs rounded px-2 py-1 border border-border"
                >
                  <option value="mcq">Multiple choice</option>
                  <option value="tf">True / False</option>
                  <option value="open">Open answer</option>
                </select>
                {drafts.length > 1 && (
                  <button
                    onClick={() => setDrafts((arr) => arr.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove question"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea
                  value={d.prompt}
                  onChange={(e) => update(i, { prompt: e.target.value })}
                  placeholder="What is...?"
                  rows={2}
                />
              </div>

              {d.type === "open" ? (
                <div className="space-y-2">
                  <Label>Correct answer</Label>
                  <Input
                    value={d.correctText}
                    onChange={(e) => update(i, { correctText: e.target.value })}
                    placeholder="Expected answer"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Options (click to mark correct)</Label>
                  {d.options.map((o, oi) => {
                    const sel = d.correctIndex === oi;
                    return (
                      <div key={oi} className="flex gap-2 items-center">
                        <button
                          type="button"
                          onClick={() => update(i, { correctIndex: oi })}
                          className={`size-8 shrink-0 rounded border grid place-items-center text-xs font-mono transition ${
                            sel ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                          }`}
                          aria-label={`Mark option ${String.fromCharCode(65 + oi)} correct`}
                        >
                          {sel ? <Check className="size-4" /> : String.fromCharCode(65 + oi)}
                        </button>
                        <Input
                          value={o}
                          onChange={(e) => setOpt(i, oi, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                          disabled={d.type === "tf"}
                        />
                        {d.type === "mcq" && d.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(i, oi)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Remove option"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {d.type === "mcq" && d.options.length < 6 && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => addOption(i)}>
                      <Plus className="size-3 mr-1" />Add option
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 sticky bottom-4">
        <Button variant="outline" onClick={() => setDrafts((d) => [...d, blank()])}>
          <Plus className="size-4 mr-2" />Add another question
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => nav({ to: "/" })}>Cancel</Button>
          <Button onClick={save}>
            <Save className="size-4 mr-2" />Save bank
          </Button>
        </div>
      </div>
    </div>
  );
}
