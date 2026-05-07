import Papa from "papaparse";
import type { Question } from "./types";
import { uid } from "./storage";

/**
 * Extract raw text from any supported file type.
 */
export async function extractText(file: File): Promise<string> {
  console.log(`[Parser] Extracting text from: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
  const name = file.name.toLowerCase();

  try {
    if (name.endsWith(".txt") || name.endsWith(".md")) {
      console.log(`[Parser] Detected TXT/MD format`);
      const text = await file.text();
      console.log(`[Parser] Extracted ${text.length} characters from TXT`);
      return text;
    }

    if (name.endsWith(".csv")) {
      console.log(`[Parser] Detected CSV format`);
      const text = await file.text();
      console.log(`[Parser] Extracted ${text.length} characters from CSV`);
      return text;
    }

    if (name.endsWith(".docx")) {
      console.log(`[Parser] Detected DOCX format, loading mammoth...`);
      // @ts-expect-error - browser build has no types
      const mammoth = await import("mammoth/mammoth.browser.js");
      const buf = await file.arrayBuffer();
      const res = await mammoth.extractRawText({ arrayBuffer: buf });
      console.log(`[Parser] Extracted ${res.value.length} characters from DOCX`);
      return res.value;
    }

    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      console.log(`[Parser] Detected XLSX/XLS format, loading XLSX...`);
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      console.log(`[Parser] Extracted ${csv.length} characters from XLSX`);
      return csv;
    }

    if (name.endsWith(".pdf")) {
      console.log(`[Parser] Detected PDF format, loading PDF.js...`);
      const pdfjs: any = await import("pdfjs-dist");
      // worker — use bundled worker URL
      const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      const buf = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: buf }).promise;
      console.log(`[Parser] PDF has ${doc.numPages} pages`);

      let out = "";
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        out += content.items.map((it: any) => it.str).join(" ") + "\n";
      }
      console.log(`[Parser] Extracted ${out.length} characters from PDF`);
      return out;
    }

    const error = `Unsupported file type: ${file.name}`;
    console.error(`[Parser] ${error}`);
    throw new Error(error);
  } catch (e) {
    console.error(`[Parser] Error extracting text:`, e);
    throw e;
  }
}

/**
 * Parse extracted text into questions.
 * Strategy 1: CSV with columns prompt, optionA..D, [answer]
 * Strategy 2: numbered questions like "1. ..." with optional "A) ..." lines.
 */
export function parseQuestions(text: string, fileName: string): Question[] {
  console.log(`[Parser] Starting to parse: ${fileName}`);
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".csv") || lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    console.log(`[Parser] Detected CSV/Excel format`);
    const csv = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
    const rows = csv.data.filter((r) => r.length && r.some((c) => c?.trim()));

    console.log(
      `[Parser] CSV parsed: ${rows.length} rows, ${csv.data.length} total rows (with empty)`,
    );

    if (!rows.length) {
      console.warn(`[Parser] No rows found in CSV`);
      return [];
    }

    // Detect header
    const header = rows[0].map((c) => (c || "").toLowerCase().trim());
    const hasHeader = header.some((h) => ["question", "prompt", "q", "pregunta"].includes(h));

    console.log(`[Parser] Header detected: ${hasHeader}, ${header.join(" | ")}`);

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

    console.log(
      `[Parser] Columns - Question: ${qIdx}, Answer: ${aIdx}, Options: ${optIdxs.join(",")}`,
    );

    let skippedCount = 0;
    const questions = dataRows
      .map((row, i) => {
        const options = optIdxs.map((i) => (row[i] || "").trim()).filter(Boolean);
        const prompt = (row[qIdx] || "").trim();

        if (!prompt) {
          skippedCount++;
          if (skippedCount <= 5) {
            console.debug(`[Parser] Row ${i + 1}: Skipped (empty prompt)`);
          }
          return null;
        }

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
          prompt,
          options,
          correctIndex,
        };
      })
      .filter((q) => q !== null) as Question[];

    console.log(`[Parser] CSV: Parsed ${questions.length} questions (skipped ${skippedCount})`);
    return questions;
  }

  // Numbered text parsing - Enhanced to handle various formats
  console.log(`[Parser] Attempting numbered text format parsing`);
  const cleaned = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n");

  // Try multiple splitting patterns for robustness
  let blocks: string[] = [];

  // Pattern 1: "1." or "1)" or "Q1." at start of line
  blocks = cleaned.split(/\n(?=\s*(?:Q\s*)?\d{1,3}[\.\)]\s+)/i);
  console.log(`[Parser] Pattern 1 (numbered): Found ${blocks.length} blocks`);

  if (blocks.length <= 1) {
    // Pattern 2: Separated by double newlines (paragraph format)
    blocks = cleaned.split(/\n\n+/);
    console.log(`[Parser] Pattern 2 (paragraphs): Found ${blocks.length} blocks`);
  }

  if (blocks.length <= 1) {
    // Pattern 3: Lines starting with special question markers
    blocks = cleaned.split(/\n(?=(?:Q:|Question:|Q\d+:|#\d+:|\*\*|--|→|-\s*$))/i);
    console.log(`[Parser] Pattern 3 (markers): Found ${blocks.length} blocks`);
  }

  const questions: Question[] = [];
  let invalidBlocks = 0;
  let questionNumber = 1;

  for (const raw of blocks) {
    const block = raw.trim();
    if (!block || block.length < 3) continue;

    // Try to extract question with number
    let m = block.match(/^(?:Q\s*)?(\d{1,3})[\.\)]\s+([\s\S]+)$/i);
    let questionNum = questionNumber;
    let body = block;

    if (m) {
      questionNum = parseInt(m[1], 10);
      body = m[2];
    } else {
      // No number found, use sequence number
      questionNum = questionNumber;
      body = block;
    }

    // Split body into lines for option extraction
    const lines = body
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) continue;

    // Extract options (lines starting with A, B, C, etc.)
    const optionLines: string[] = [];
    const promptLines: string[] = [];
    let inOpts = false;

    for (const line of lines) {
      // Match options like "A) option", "A. option", "A: option", etc.
      const optM = line.match(/^([A-Fa-f])[\.\)\:]\s*(.*)$/);
      if (optM) {
        inOpts = true;
        optionLines.push(optM[2].trim());
      } else if (inOpts && line.match(/^[A-Fa-f][\.\)\:]/)) {
        // Another option marker
        optionLines.push(line.replace(/^[A-Fa-f][\.\)\:]\s*/, "").trim());
      } else if (inOpts && line && !line.match(/^[A-Fa-f][\.\)\:]/)) {
        // Continuation of previous option
        if (optionLines.length > 0) {
          optionLines[optionLines.length - 1] += " " + line;
        }
      } else if (!inOpts) {
        // This is part of the question prompt
        promptLines.push(line);
      }
    }

    const prompt = promptLines.join(" ").trim();

    if (prompt && prompt.length > 3) {
      // Filter out options that are too short (likely not real options)
      const validOptions = optionLines.filter((opt) => opt.length > 1);

      questions.push({
        id: uid(),
        number: questionNum,
        prompt,
        options: validOptions,
      });

      questionNumber = Math.max(questionNumber + 1, questionNum + 1);
    } else {
      invalidBlocks++;
      if (invalidBlocks <= 3) {
        console.debug(`[Parser] Block skipped (invalid format): "${block.substring(0, 50)}..."`);
      }
    }
  }

  if (questions.length > 0) {
    console.log(
      `[Parser] Numbered format: Parsed ${questions.length} questions (${invalidBlocks} blocks skipped)`,
    );
    return questions.sort((a, b) => a.number - b.number);
  }

  // Fallback: Split by common question patterns
  console.log(`[Parser] Trying advanced fallback patterns`);
  const fallbackBlocks = cleaned.split(/(?:^|\n)(?=[^\n]{10,})/m).filter((b) => b.trim());

  if (fallbackBlocks.length > 1) {
    const fallbackQuestions = fallbackBlocks
      .map((block, i) => {
        const trimmed = block.trim();
        // Extract first line as prompt, rest as context
        const lines = trimmed.split("\n");
        const prompt = lines[0];

        if (prompt.length > 10) {
          return {
            id: uid(),
            number: i + 1,
            prompt: prompt.substring(0, 200), // Limit prompt length
            options: [],
          };
        }
        return null;
      })
      .filter((q) => q !== null) as Question[];

    if (fallbackQuestions.length > 1) {
      console.log(`[Parser] Fallback (advanced): Parsed ${fallbackQuestions.length} questions`);
      return fallbackQuestions;
    }
  }

  // Last resort: each line is a question
  console.log(`[Parser] Trying last resort: line-by-line format`);
  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && l.length > 10); // Only lines with meaningful content

  if (lines.length === 0) {
    console.warn(`[Parser] No questions could be parsed from text`);
    return [];
  }

  const fallbackQuestions = lines.map((l, i) => ({
    id: uid(),
    number: i + 1,
    prompt: l.substring(0, 300), // Limit prompt length
    options: [],
  }));

  console.log(`[Parser] Last resort: Parsed ${fallbackQuestions.length} questions`);
  return fallbackQuestions;
}
