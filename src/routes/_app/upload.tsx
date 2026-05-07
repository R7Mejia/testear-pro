import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractText, parseQuestions } from "@/lib/testear/parser";
import { storage, uid } from "@/lib/testear/storage";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/upload")({
  component: UploadPage,
  head: () => ({
    meta: [
      { title: "Upload — Testear" },
      { name: "description", content: "Upload PDF, Word, Excel, CSV or TXT questionnaires and turn them into practice tests." },
    ],
  }),
});

function UploadPage() {
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  async function onFile(file: File) {
    setBusy(true);
    try {
      const text = await extractText(file);
      const qs = parseQuestions(text, file.name);
      if (qs.length === 0) {
        toast.error("Couldn't detect any questions in that file.");
        return;
      }
      const bank = {
        id: uid(),
        name: name || file.name.replace(/\.[^.]+$/, ""),
        createdAt: Date.now(),
        questions: qs,
      };
      storage.saveBank(bank);
      toast.success(`Imported ${qs.length} questions`);
      nav({ to: "/bank/$bankId", params: { bankId: bank.id } });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to parse file");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload questionnaire</h1>
        <p className="text-muted-foreground mt-1">PDF, DOCX, XLSX, CSV or TXT. We keep the original order intact.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bank settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AWS SAA Practice" />
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
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
                Parsing your file…
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="size-14 rounded-full grid place-items-center" style={{ background: "var(--gradient-neon)" }}>
                  <FileUp className="size-6 text-primary-foreground" />
                </div>
                <div className="font-medium">Drop a file or click to browse</div>
                <div className="text-xs text-muted-foreground">PDF · DOCX · XLSX · CSV · TXT</div>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-secondary/40">
        <CardContent className="pt-6 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">Tips for best results</p>
          <ul className="list-disc list-inside space-y-1">
            <li><span className="text-foreground">CSV/Excel:</span> use columns <code>question, optionA, optionB, optionC, optionD, answer</code> (answer = A/B/C/D or text).</li>
            <li><span className="text-foreground">PDF/Word/TXT:</span> number your questions like <code>1.</code> or <code>1)</code>, options as <code>A)</code> <code>B)</code> …</li>
            <li>You'll set the correct answers on the next screen if they aren't already known.</li>
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={() => nav({ to: "/" })}>Cancel</Button>
      </div>
    </div>
  );
}
