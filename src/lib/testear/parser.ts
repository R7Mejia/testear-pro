import Papa from "papaparse";
import type { Question } from "./types";
import { uid } from "./storage";

/**
 * Extract raw text from any supported file type.
 */
export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return await file.text();
  }
  if (name.endsWith(".csv")) {
    return await file.text();
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth/mammoth.browser");
    const buf = await file.arrayBuffer();
    const res = await mammoth.extractRawText({ arrayBuffer: buf });
    return res.value;
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_csv(sheet);
  }
  if (name.endsWith(".pdf")) {
    const pdfjs: any = await import("pdfjs-dist");
    // worker — use bundled worker URL
    const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url"))
      .default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    let out = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      out += content.items.map((it: any) => it.str).join(" ") + "\n";
    }
    return out;
  }
  throw new Error(`Unsupported file type: ${file.name}`);
}

/**
 * Parse extracted text into questions.
 * Strategy 1: CSV with columns prompt, optionA..D, [answer]
 * Strategy 2: numbered questions like "1. ..." with optional "A) ..." lines.
 */
export function parseQuestions(text: string, fileName: string): Question[] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const csv = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
    const rows = csv.data.filter((r) => r.length && r.some((c) => c?.trim()));
    if (!rows.length) return [];
    // Detect header
    const header = rows[0].map((c) => (c || "").toLowerCase().trim());
    const hasHeader = header.some((h) =>
      ["question", "prompt", "q", "pregunta"].includes(h),
    );
    const dataRows = hasHeader ? rows.slice(1) : rows;
    const idx = (names: string[]) =>
      hasHeader ? header.findIndex((h) => names.includes(h)) : -1;

    const qIdx = hasHeader ? Math.max(0, idx(["question", "prompt", "q", "pregunta"])) : 0;
    const aIdx = idx(["answer", "correct", "respuesta"]);
    const optIdxs = hasHeader
      ? header
          .map((h, i) => (/^(option|opt|choice|[abcdef])$/i.test(h) || /^option[a-f]$/.test(h) ? i : -1))
          .filter((i) => i >= 0)
      : Array.from({ length: rows[0].length - 1 }, (_, i) => i + 1);

    return dataRows.map((row, i) => {
      const options = optIdxs.map((i) => (row[i] || "").trim()).filter(Boolean);
      let correctIndex: number | undefined;
      if (aIdx >= 0) {
        const ans = (row[aIdx] || "").trim();
        if (/^[a-f]$/i.test(ans)) correctIndex = ans.toUpperCase().charCodeAt(0) - 65;
        else {
          const n = parseInt(ans, 10);
          if (!isNaN(n)) correctIndex = n - 1;
          else {
            const m = options.findIndex((o) => o.toLowerCase() === ans.toLowerCase());
            if (m >= 0) correctIndex = m;
          }
        }
      }
      return {
        id: uid(),
        number: i + 1,
        prompt: (row[qIdx] || "").trim(),
        options,
        correctIndex,
      };
    }).filter((q) => q.prompt);
  }

  // Numbered text parsing
  const cleaned = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n");
  // Split on lines that look like "1." "1)" "Q1." at start of line
  const blocks = cleaned.split(/\n(?=\s*(?:Q\s*)?\d{1,3}[\.\)]\s+)/i);
  const questions: Question[] = [];
  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;
    const m = block.match(/^(?:Q\s*)?(\d{1,3})[\.\)]\s+([\s\S]+)$/i);
    if (!m) continue;
    const body = m[2];
    const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
    const optionLines: string[] = [];
    const promptLines: string[] = [];
    let inOpts = false;
    for (const line of lines) {
      const optM = line.match(/^([A-Fa-f])[\.\)]\s+(.*)$/);
      if (optM) {
        inOpts = true;
        optionLines.push(optM[2]);
      } else if (inOpts) {
        // continuation of last option
        optionLines[optionLines.length - 1] += " " + line;
      } else {
        promptLines.push(line);
      }
    }
    questions.push({
      id: uid(),
      number: parseInt(m[1], 10),
      prompt: promptLines.join(" ").trim(),
      options: optionLines,
    });
  }

  // Fallback: each non-empty line is a question with no options
  if (questions.length === 0) {
    const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);
    return lines.map((l, i) => ({
      id: uid(),
      number: i + 1,
      prompt: l,
      options: [],
    }));
  }

  return questions.sort((a, b) => a.number - b.number);
}
