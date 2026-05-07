import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractText, parseQuestions } from "@/lib/testear/parser";
import { storage, uid } from "@/lib/testear/storage";
import { FileUp, Loader2, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { ManualQuestionInput } from "@/components/manual-question-input";
import type { Question, QuestionBank } from "@/lib/testear/types";

export const Route = createFileRoute("/_app/upload")({
  component: UploadPage,
  head: () => ({
    meta: [
      { title: "Upload — Testear" },
      {
        name: "description",
        content:
          "Upload PDF, Word, Excel, CSV or TXT questionnaires and turn them into practice tests.",
      },
    ],
  }),
});

function UploadPage() {
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"upload" | "manual">("upload");
  const fileRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  async function onFile(file: File) {
    setBusy(true);
    try {
      console.log(`[Upload] Starting file upload: ${file.name}`);

      const text = await extractText(file);
      console.log(`[Upload] Text extraction complete: ${text.length} characters`);

      const qs = parseQuestions(text, file.name);
      console.log(`[Upload] Questions parsed: ${qs.length} questions`);

      if (qs.length === 0) {
        toast.error("Couldn't detect any questions in that file.");
        console.warn(`[Upload] No questions detected in file`);
        return;
      }

      const bankName = name || file.name.replace(/\.[^.]+$/, "");
      const bank = {
        id: uid(),
        name: bankName,
        createdAt: Date.now(),
        questions: qs,
      };

      // Check storage stats before saving
      const stats = storage.getStorageStats();
      if (stats) {
        console.log(
          `[Upload] Storage stats - ${stats.questionsCount} total Q's, ${stats.usageKB} KB used (${stats.usagePercentage}%)`,
        );
        if (stats.warningLevel === "critical") {
          toast.error(
            `⚠️ Storage almost full (${stats.usagePercentage}%). Delete old banks to make space.`,
          );
          return;
        }
        if (stats.warningLevel === "warning") {
          toast.warning(`⚠️ Storage at ${stats.usagePercentage}%. Consider deleting old banks.`);
        }
      }

      try {
        storage.saveBank(bank);
        console.log(`[Upload] ✓ Bank saved successfully: ${bank.id}`);
        toast.success(`✓ Imported ${qs.length} questions into "${bankName}"`);
        nav({ to: "/bank/$bankId", params: { bankId: bank.id } });
      } catch (storageErr: any) {
        console.error(`[Upload] Storage error:`, storageErr);
        if (storageErr.name === "StorageQuotaExceeded") {
          toast.error("Storage quota exceeded. Delete some question banks and try again.");
        } else {
          toast.error(`Failed to save: ${storageErr.message}`);
        }
      }
    } catch (e: any) {
      console.error(`[Upload] Error during file processing:`, e);
      const errorMsg = e.message || "Failed to parse file";
      toast.error(errorMsg);
    } finally {
      setBusy(false);
    }
  }

  const handleQuestionsCreated = (questions: Question[]) => {
    const bankName = name || "Manual Questions";
    const bank: QuestionBank = {
      id: uid(),
      name: bankName,
      createdAt: Date.now(),
      questions: questions,
    };

    try {
      const stats = storage.getStorageStats();
      if (stats?.warningLevel === "critical") {
        toast.error(
          `⚠️ Storage almost full (${stats.usagePercentage}%). Delete old banks to make space.`,
        );
        return;
      }

      storage.saveBank(bank);
      toast.success(`✓ Created "${bankName}" with ${questions.length} questions`);
      nav({ to: "/bank/$bankId", params: { bankId: bank.id } });
    } catch (e: any) {
      console.error("Error saving questions:", e);
      toast.error(e.message || "Failed to save questions");
    }
  };

  if (mode === "manual") {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Create Questions</h1>
          <p className="text-muted-foreground">
            Add questions one by one with multiple choice, true/false, or open-ended options.
          </p>
        </div>

        <ManualQuestionInput
          onQuestionsCreate={handleQuestionsCreated}
          onCancel={() => setMode("upload")}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create a Questionnaire</h1>
        <p className="text-muted-foreground mt-1">
          Upload a file or create questions manually. We'll help you build your practice test.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-2 gap-4">
        <Card
          className={`cursor-pointer transition ${
            mode === "upload" ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"
          }`}
          onClick={() => setMode("upload")}
        >
          <CardContent className="pt-6 text-center space-y-3">
            <FileUp className="size-8 mx-auto text-primary" />
            <div>
              <h3 className="font-semibold">Upload File</h3>
              <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, CSV or TXT</p>
            </div>
            <Button variant={mode === "upload" ? "default" : "outline"} className="w-full">
              Upload
            </Button>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition ${
            mode === "manual" ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"
          }`}
          onClick={() => setMode("manual")}
        >
          <CardContent className="pt-6 text-center space-y-3">
            <Edit3 className="size-8 mx-auto text-primary" />
            <div>
              <h3 className="font-semibold">Create Manually</h3>
              <p className="text-xs text-muted-foreground mt-1">Type questions one by one</p>
            </div>
            <Button variant={mode === "manual" ? "default" : "outline"} className="w-full">
              Create
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bank Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Questionnaire Name (optional)</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AWS SAA Practice Exam"
            />
          </div>

          <div
            onDragOver={(e: any) => e.preventDefault()}
            onDrop={(e: any) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) onFile(f);
            }}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/60 transition glass"
          >
            {busy ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="size-8 animate-spin text-primary" />
                <div>Parsing your file…</div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="size-14 rounded-full grid place-items-center bg-gradient-to-br from-primary to-primary/60">
                  <FileUp className="size-6 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-medium">Drop a file or click to browse</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    PDF · DOCX · XLSX · CSV · TXT
                  </div>
                </div>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md"
              className="hidden"
              onChange={(e: any) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
              title="Select file"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-secondary/40">
        <CardContent className="pt-6 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">Tips for best results</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <span className="text-foreground">CSV/Excel:</span> use columns{" "}
              <code>question, optionA, optionB, optionC, optionD, answer</code> (answer = A/B/C/D or
              text).
            </li>
            <li>
              <span className="text-foreground">PDF/Word/TXT:</span> number your questions like{" "}
              <code>1.</code> or <code>1)</code>, options as <code>A)</code> <code>B)</code> …
            </li>
            <li>
              <span className="text-foreground">Multiple formats:</span> Questions separated by
              blank lines or paragraphs will be detected automatically.
            </li>
            <li>You can refine answers manually after upload if needed.</li>
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={() => nav({ to: "/" })}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
