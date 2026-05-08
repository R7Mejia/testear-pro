import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Upload as UploadIcon, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { extractText, parseQuestions } from "@/lib/testear/parser";
import { storage, uid } from "@/lib/testear/storage";
import type { QuestionBank } from "@/lib/testear/types";

export const Route = createFileRoute("/_app/upload")({
  component: UploadPage,
  head: () => ({
    meta: [
      { title: "Upload questionnaire — Testear" },
      { name: "description", content: "Upload PDF, Word, Excel, CSV or TXT questionnaires." },
    ],
  }),
});

function UploadPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ count: number; sample: string[] } | null>(null);

  async function onParse(f: File) {
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const text = await extractText(f);
      const questions = parseQuestions(text, f.name);
      if (!questions.length) {
        setError("No questions could be parsed. Try another format or use the manual builder.");
      } else {
        setPreview({
          count: questions.length,
          sample: questions.slice(0, 3).map((q) => `${q.number}. ${q.prompt.slice(0, 80)}`),
        });
      }
      // Stash for save
      (window as any).__pendingQuestions = questions;
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to read file");
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    const questions = (window as any).__pendingQuestions;
    if (!questions?.length || !file) return;
    const bank: QuestionBank = {
      id: uid(),
      name: name.trim() || file.name.replace(/\.[^.]+$/, ""),
      createdAt: Date.now(),
      questions,
    };
    try {
      storage.saveBank(bank);
      navigate({ to: "/bank/$bankId", params: { bankId: bank.id } });
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload questionnaire</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Supports PDF, Word (.docx), Excel (.xlsx), CSV and TXT.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Bank name (optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="e.g. Anatomy midterm 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Choose a file</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition">
            <input
              type="file"
              accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  onParse(f);
                }
              }}
            />
            <UploadIcon className="size-8 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm">
              {file ? (
                <span className="inline-flex items-center gap-2">
                  <FileText className="size-4" /> {file.name}
                </span>
              ) : (
                "Click to select a file"
              )}
            </div>
          </label>

          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Parsing…
            </div>
          )}
          {error && <div className="text-sm text-destructive">{error}</div>}
          {preview && (
            <div className="rounded-md border border-primary/40 p-3 space-y-2">
              <div className="flex items-center gap-2 text-primary text-sm font-semibold">
                <CheckCircle2 className="size-4" /> Parsed {preview.count} questions
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {preview.sample.map((s, i) => (
                  <li key={i} className="truncate">{s}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button disabled={!preview || busy} onClick={onSave} size="lg">
          Save bank & set answers
        </Button>
      </div>
    </div>
  );
}
