import Papa from "papaparse";
import type { Question } from "./types";
import { uid } from "./storage";

/**
 * Extract raw text from any supported file type.
 * For PDFs, uses coordinate-based grouping to preserve line structure.
 */
export async function extractText(file: File): Promise<string> {
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
    let out = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      out += (await extractPageText(page)) + "\n";
    }
    return out;
  }
  throw new Error(`Unsupported file type: ${file.name}`);
}

async function extractPageText(page: any): Promise<string> {
  const content = await page.getTextContent();
  const Y_TOL = 3;
  const lineMap = new Map<number, { str: string; x: number; w: number }[]>();
  for (const item of content.items as any[]) {
    if (!item.str) continue;
    const y = Math.round(item.transform[5] / Y_TOL) * Y_TOL;
    if (!lineMap.has(y)) lineMap.set(y, []);
    lineMap.get(y)!.push({
      str: item.str,
      x: item.transform[4],
      w: item.width || item.str.length * 5,
    });
  }
  return Array.from(lineMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, items]) => {
      items.sort((a, b) => a.x - b.x);
      let line = "";
      for (let i = 0; i < items.length; i++) {
        if (i > 0 && items[i].x - (items[i - 1].x + items[i - 1].w) > 10) line += "  ";
        line += items[i].str;
      }
      return line.trim();
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * Master question patterns. Order matters — most specific first.
 * Captures the full identifier in group 1 and the body after it.
 */
const Q_PATTERNS: RegExp[] = [
  // "1-1A1", "2-3B12" style (FCC etc.)
  /^\s*(\d+-\d+[A-Z]\d+)[\.\):\s]+(.+)$/i,
  // "1A1", "12B3"
  /^\s*(\d+[A-Z]\d+)[\.\):\s]+(.+)$/i,
  // "Q1.", "Q 1)", "Question 1:"
  /^\s*(?:question\s+|q\s*)(\d{1,4})[\.\):\s]+(.+)$/i,
  // "1." "1)" "1:"
  /^\s*(\d{1,4})[\.\):]\s+(.+)$/,
];

const OPT_RE = /^\s*\(?([A-Fa-f])[\.\)\:]\s+(.*)$/;
const ANSWER_KEY_HEADER = /\bAnswer\s*Key\b/i;
const INLINE_ANSWER_RE = /([A-Z0-9-]+):\s*([A-F])\b/g;
const TRAILING_ANSWER_RE = /^(.+?)\s+(?:Answer|Ans)[:\s]+([A-F])\s*$/i;

/**
 * Parse extracted text into questions.
 */
export function parseQuestions(text: string, fileName: string): Question[] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return parseCSV(text);
  }
  return parseStructuredText(text);
}

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
        .map((h, i) => (/^(option|opt|choice|[a-f])$/i.test(h) || /^option[a-f]$/.test(h) ? i : -1))
        .filter((i) => i >= 0)
    : Array.from({ length: rows[0].length - 1 }, (_, i) => i + 1);
  return dataRows
    .map((row, i) => {
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
      return {
        id: uid(),
        number: i + 1,
        prompt: (row[qIdx] || "").trim(),
        options,
        correctIndex,
      };
    })
    .filter((q) => q.prompt);
}

function parseStructuredText(text: string): Question[] {
  // Normalize: collapse runs of whitespace within a line, but preserve line breaks
  let cleaned = text.replace(/\r/g, "").replace(/\u00A0/g, " ");
  cleaned = cleaned
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n");

  // Split off answer key section if present
  let answerKeyText = "";
  const akIdx = cleaned.search(ANSWER_KEY_HEADER);
  if (akIdx >= 0) {
    answerKeyText = cleaned.slice(akIdx);
    cleaned = cleaned.slice(0, akIdx);
  }

  // Try to split into question chunks. We scan line-by-line and start a new
  // question whenever a line begins with a recognized identifier.
  const lines = cleaned.split("\n").filter((l) => l.length > 0);

  type Raw = { id: string; lines: string[] };
  const raws: Raw[] = [];
  let current: Raw | null = null;

  function detect(line: string): { id: string; rest: string } | null {
    for (const re of Q_PATTERNS) {
      const m = line.match(re);
      if (m) return { id: m[1], rest: m[2] };
    }
    return null;
  }

  for (const line of lines) {
    const det = detect(line);
    if (det) {
      if (current) raws.push(current);
      current = { id: det.id, lines: [det.rest] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) raws.push(current);

  // If we couldn't split, attempt to detect mid-line identifiers (single
  // paragraph dump from a PDF). Walk the full text and split on identifiers.
  if (raws.length <= 1) {
    const blob = cleaned.replace(/\n+/g, " ");
    // Match common identifier patterns mid-string
    const splitRe = /\s(?=(?:\d+-\d+[A-Z]\d+|\d+[A-Z]\d+|Q\s*\d{1,4}|\d{1,4})[\.\):]?\s+[A-Z])/g;
    const parts = blob.split(splitRe).map((s) => s.trim()).filter(Boolean);
    raws.length = 0;
    for (const p of parts) {
      const det = detect(p);
      if (det) raws.push({ id: det.id, lines: [det.rest] });
    }
  }

  const answerMap = parseAnswerKey(answerKeyText);

  const questions: Question[] = raws.map((raw, i) => {
    // Split lines into prompt + options
    const optionLines: string[] = [];
    const promptLines: string[] = [];
    let inOpts = false;
    let trailingAnswer: string | undefined;

    for (let line of raw.lines) {
      // Check inline option markers like "A. text B. text C. text" on one line
      // — split them out.
      const splitOpts = splitInlineOptions(line);
      if (splitOpts) {
        inOpts = true;
        for (const o of splitOpts) optionLines.push(o);
        continue;
      }
      const om = line.match(OPT_RE);
      if (om) {
        inOpts = true;
        optionLines.push(om[2].trim());
      } else if (inOpts) {
        optionLines[optionLines.length - 1] = (optionLines[optionLines.length - 1] + " " + line).trim();
      } else {
        const ta = line.match(TRAILING_ANSWER_RE);
        if (ta) {
          promptLines.push(ta[1]);
          trailingAnswer = ta[2].toUpperCase();
        } else {
          promptLines.push(line);
        }
      }
    }

    let correctIndex: number | undefined;
    const keyAns = answerMap.get(raw.id) || trailingAnswer;
    if (keyAns && /^[A-F]$/.test(keyAns)) {
      correctIndex = keyAns.charCodeAt(0) - 65;
    }

    // Number: try to extract trailing digits, else sequential
    const numMatch = raw.id.match(/(\d+)\s*$/);
    const number = numMatch ? parseInt(numMatch[1], 10) : i + 1;

    return {
      id: uid(),
      number,
      prompt: promptLines.join(" ").replace(/\s+/g, " ").trim(),
      options: optionLines.map((o) => o.replace(/\s+/g, " ").trim()).filter(Boolean),
      correctIndex,
      topic: raw.id,
    };
  }).filter((q) => q.prompt);

  if (questions.length === 0) {
    // Last resort: each non-empty line is a question
    return lines.map((l, i) => ({
      id: uid(),
      number: i + 1,
      prompt: l,
      options: [],
    }));
  }

  // Re-number sequentially for display
  return questions.map((q, i) => ({ ...q, number: i + 1 }));
}

/**
 * Split a line like "A. foo B. bar C. baz D. qux" into option strings.
 */
function splitInlineOptions(line: string): string[] | null {
  // Need at least 2 of the patterns "A.", "B.", "C." in sequence
  const matches = Array.from(line.matchAll(/(?:^|\s)([A-F])[\.\)]\s+/g));
  if (matches.length < 2) return null;
  const opts: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = (matches[i].index ?? 0) + matches[i][0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? line.length) : line.length;
    opts.push(line.slice(start, end).trim());
  }
  return opts;
}

function parseAnswerKey(text: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!text) return map;
  let m: RegExpExecArray | null;
  INLINE_ANSWER_RE.lastIndex = 0;
  while ((m = INLINE_ANSWER_RE.exec(text)) !== null) {
    map.set(m[1], m[2].toUpperCase());
  }
  // Also match lines like "1. A" or "1) B"
  for (const line of text.split("\n")) {
    const lm = line.match(/^\s*(\d+|\d+-\d+[A-Z]\d+|\d+[A-Z]\d+)[\.\)\s:]+([A-F])\b/);
    if (lm) map.set(lm[1], lm[2].toUpperCase());
  }
  return map;
}
