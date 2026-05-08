import Papa from "papaparse";
import type { Question } from "./types";
import { uid } from "./storage";

/**
 * Extract raw text from any supported file type.
 * For PDFs, group items into lines using their Y coordinate so questions
 * keep their line breaks instead of collapsing into one paragraph.
 */
export async function extractText(file: File): Promise<string> {
  console.log(`[Parser] Extracting: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
  const name = file.name.toLowerCase();

  if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv")) {
    return await file.text();
  }

  if (name.endsWith(".docx")) {
    // @ts-expect-error - browser build has no types
    const mammoth = await import("mammoth/mammoth.browser.js");
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
    const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    console.log(`[Parser] PDF: ${doc.numPages} pages`);

    let out = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      // Group text items by Y coordinate (transform[5]) → real lines
      const buckets = new Map<number, { x: number; str: string }[]>();
      const Y_TOL = 2;
      for (const it of content.items as any[]) {
        const y = Math.round(it.transform[5] / Y_TOL) * Y_TOL;
        if (!buckets.has(y)) buckets.set(y, []);
        buckets.get(y)!.push({ x: it.transform[4], str: it.str });
      }
      const ys = Array.from(buckets.keys()).sort((a, b) => b - a);
      for (const y of ys) {
        const line = buckets
          .get(y)!
          .sort((a, b) => a.x - b.x)
          .map((p) => p.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (line) out += line + "\n";
      }
      out += "\n";
    }
    return out;
  }

  throw new Error(`Unsupported file type: ${file.name}`);
}

/* ------------------------------------------------------------------ */
/* CSV / Excel parsing                                                 */
/* ------------------------------------------------------------------ */

function parseCSV(text: string): Question[] {
  const csv = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
  const rows = csv.data.filter((r) => r.length && r.some((c) => c?.trim()));
  if (!rows.length) return [];

  const header = rows[0].map((c) => (c || "").toLowerCase().trim());
  const hasHeader = header.some((h) => ["question", "prompt", "q", "pregunta"].includes(h));
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const idx = (names: string[]) => (hasHeader ? header.findIndex((h) => names.includes(h)) : -1);

  const qIdx = hasHeader ? Math.max(0, idx(["question", "prompt", "q", "pregunta"])) : 0;
  const aIdx = idx(["answer", "correct", "respuesta"]);
  const optIdxs = hasHeader
    ? header
        .map((h, i) =>
          /^(option|opt|choice|[abcdef])$/i.test(h) || /^option[a-f]$/.test(h) ? i : -1,
        )
        .filter((i) => i >= 0)
    : Array.from({ length: rows[0].length - 1 }, (_, i) => i + 1);

  const out: Question[] = [];
  dataRows.forEach((row, i) => {
    const prompt = (row[qIdx] || "").trim();
    if (!prompt) return;
    const options = optIdxs.map((j) => (row[j] || "").trim()).filter(Boolean);

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
    out.push({ id: uid(), number: i + 1, prompt, options, correctIndex });
  });
  console.log(`[Parser] CSV: parsed ${out.length}`);
  return out;
}

/* ------------------------------------------------------------------ */
/* Free-text parsing — works with or without newlines                  */
/* ------------------------------------------------------------------ */

// Question header anywhere in the text: "12.", "12)", "Q12.", "(12)"
const Q_HEAD = /(?:^|\s|\n)(?:Q\s*)?\(?(\d{1,3})[\.\)]\s+/gi;

// Option marker, anywhere: "A) ", "A. ", "A: ", "(A) "
const OPT_HEAD = /(?:^|\s|\n)\(?([A-Fa-f])[\.\)\:]\s+/g;

function splitByQuestionHeaders(text: string): { num: number; body: string }[] {
  const matches: { idx: number; num: number; len: number }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(Q_HEAD.source, "gi");
  while ((m = re.exec(text))) {
    const num = parseInt(m[1], 10);
    if (num >= 1 && num <= 999) {
      matches.push({ idx: m.index + m[0].indexOf(m[1]), num, len: m[0].length });
    }
  }
  if (matches.length < 2) return [];

  // Keep only mostly-monotonic numbering so stray "1." in option text doesn't break us.
  const kept: typeof matches = [];
  for (const item of matches) {
    if (!kept.length) {
      kept.push(item);
    } else {
      const prev = kept[kept.length - 1];
      if (item.num === prev.num + 1 || item.num === prev.num) kept.push(item);
      else if (item.num > prev.num && item.num - prev.num <= 3) kept.push(item);
    }
  }
  if (kept.length < 2) return [];

  const blocks: { num: number; body: string }[] = [];
  for (let i = 0; i < kept.length; i++) {
    const start = kept[i].idx;
    const end = i + 1 < kept.length ? kept[i + 1].idx : text.length;
    // Skip past the "12. " number itself
    const headRe = /^\(?\d{1,3}[\.\)]\s+/;
    const slice = text.slice(start, end).replace(headRe, "");
    blocks.push({ num: kept[i].num, body: slice.trim() });
  }
  return blocks;
}

function splitOptions(body: string): { prompt: string; options: string[] } {
  // Find all option markers and split on them
  const re = new RegExp(OPT_HEAD.source, "g");
  const hits: { idx: number; letter: string; len: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const letterIdx = m.index + m[0].indexOf(m[1]);
    hits.push({ idx: letterIdx, letter: m[1].toUpperCase(), len: m[0].length });
  }
  // Keep only A,B,C,D,E,F in order starting from A
  const expected = ["A", "B", "C", "D", "E", "F"];
  const kept: typeof hits = [];
  for (const h of hits) {
    const want = expected[kept.length];
    if (h.letter === want) kept.push(h);
  }
  if (kept.length < 2) return { prompt: body.trim(), options: [] };

  const prompt = body.slice(0, kept[0].idx).trim();
  const options: string[] = [];
  for (let i = 0; i < kept.length; i++) {
    const startAfterMarker = kept[i].idx + 1; // skip the letter
    // Skip the punctuation after the letter
    const restStart = startAfterMarker + (body.slice(startAfterMarker).match(/^[\.\)\:]\s*/)?.[0].length ?? 0);
    const end = i + 1 < kept.length ? kept[i + 1].idx : body.length;
    options.push(body.slice(restStart, end).trim());
  }
  return { prompt, options };
}

function parseAnswerKey(text: string): Map<number, number> {
  // Look for blocks like:  "1. B   2. A   3. C" or "Answer Key" trailing
  const map = new Map<number, number>();
  const tail = text.split(/answer\s*key|respuestas/i).pop();
  if (!tail) return map;
  const re = /(?:^|\s)(\d{1,3})[\.\)\:\-\s]+([A-Fa-f])\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tail))) {
    map.set(parseInt(m[1], 10), m[2].toUpperCase().charCodeAt(0) - 65);
  }
  return map;
}

export function parseQuestions(text: string, fileName: string): Question[] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return parseCSV(text);
  }

  const cleaned = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
  const answers = parseAnswerKey(cleaned);

  const blocks = splitByQuestionHeaders(cleaned);
  console.log(`[Parser] Detected ${blocks.length} numbered question blocks`);

  if (blocks.length >= 2) {
    const questions: Question[] = blocks.map((b) => {
      const { prompt, options } = splitOptions(b.body);
      return {
        id: uid(),
        number: b.num,
        prompt: prompt.replace(/\s+/g, " ").trim(),
        options: options.map((o) => o.replace(/\s+/g, " ").trim()).filter(Boolean),
        correctIndex: answers.get(b.num),
      };
    });
    return questions
      .filter((q) => q.prompt.length > 2)
      .sort((a, b) => a.number - b.number);
  }

  // Fallback: one question per non-empty line
  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 8);
  console.log(`[Parser] Fallback line-by-line: ${lines.length}`);
  return lines.map((l, i) => ({
    id: uid(),
    number: i + 1,
    prompt: l.slice(0, 500),
    options: [],
  }));
}
