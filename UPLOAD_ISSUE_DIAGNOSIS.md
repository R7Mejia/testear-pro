# Upload Issue Diagnosis & Resolution Guide

## Issue Summary

Only 6 questions out of 100+ are being uploaded successfully. A partial fix has been implemented but is not fully resolving the issue.

## Root Cause Analysis

### 1. **PRIMARY CAUSE: localStorage Size Limitations** ⚠️ CRITICAL

**Status:** LIKELY CULPRIT

**Evidence:**

- Your app uses `localStorage` for storing question banks (see [storage.ts](src/lib/testear/storage.ts))
- localStorage has a **5-10 MB size limit** depending on the browser
- Each question object includes: `id`, `number`, `prompt`, `options[]`, `correctIndex`
- A typical question with 4 options is ~500-1000 bytes JSON
- 100+ questions = 50-100+ KB per bank
- **Multiple banks can quickly exceed the limit**

**File Location:** [src/lib/testear/storage.ts](src/lib/testear/storage.ts#L17-L33)

```typescript
// Current implementation stores entire banks in localStorage
write(BANKS_KEY, banks); // Appends new bank to array of all banks
```

**Problem:**

- Line 24: `storage.saveBank()` retrieves ALL existing banks, filters, and re-writes them all
- With multiple test banks, the total payload grows
- 6 questions = ~6-10 KB (fits fine)
- 100+ questions = 50-100+ KB (may silently fail if bank + others exceeds limit)

**Why 6 questions specifically?**

- Likely a coincidence related to file size thresholds
- Or the previous "fix" improperly handles batch limits

---

### 2. **SECONDARY CAUSE: Parser Strategy/Filtering**

**Status:** POSSIBLE

**File Location:** [src/lib/testear/parser.ts](src/lib/testear/parser.ts#L51-L142)

**Potential Issues:**

a) **CSV/Excel parsing filtering (Lines 85-92):**

```typescript
return dataRows.map(...).filter((q) => q.prompt);  // Filters empty prompts
```

- If many rows have empty prompt columns, they get silently dropped
- No error feedback to user about dropped rows

b) **Numbered text parsing (Lines 94-135):**

```typescript
const blocks = cleaned.split(/\n(?=\s*(?:Q\s*)?\d{1,3}[\.\)]\s+)/i);
```

- Regex may fail to split correctly if numbering format is inconsistent
- Returns only 6 questions if pattern matching stops working after 6

c) **Fallback strategy (Lines 137-149):**

- Only triggers if `questions.length === 0`
- Each line becomes a question (may not be intended)

---

### 3. **TERTIARY CAUSE: Error Handling (Silent Failures)**

**Status:** LIKELY

**File Location:** [src/routes/\_app/upload.tsx](src/routes/_app/upload.tsx#L30-50)

**Issue:**

```typescript
async function onFile(file: File) {
  // ... extraction and parsing
  storage.saveBank(bank); // No try/catch for storage failures
  toast.success(`Imported ${qs.length} questions`);
  // If saveBank fails (quota exceeded), user still sees success message
}
```

**Problem:**

- `localStorage.setItem()` throws `QuotaExceededError` if storage is full
- Currently no error handling for this
- User sees success toast even if storage write failed
- Questions are never actually saved

---

## Step-by-Step Troubleshooting Guide

### Step 1: Verify localStorage Usage

**Action:**

1. Open browser DevTools (F12)
2. Go to **Application → Local Storage → [your domain]**
3. Check values for:
   - `testear.banks` (all question banks)
   - `testear.attempts` (practice attempts)

**To Debug:**

```javascript
// Run in console:
const banks = JSON.parse(localStorage.getItem("testear.banks") || "[]");
console.log("Number of banks:", banks.length);
console.log("Total size (chars):", JSON.stringify(banks).length);
banks.forEach((b, i) => {
  console.log(
    `Bank ${i}: ${b.name} (${b.questions.length} Q's, ${JSON.stringify(b).length} bytes)`,
  );
});
```

---

### Step 2: Test Parser with Sample File

**Action:**
Create a test file with exactly 6 formatted questions and one with 100+. Compare results.

**For CSV format (expected headers):**

```csv
question,optionA,optionB,optionC,optionD,answer
What is 2+2?,3,4,5,6,B
What is 3+3?,5,6,7,8,B
... (continue for 100+ rows)
```

**For Numbered text format:**

```
1. First question?
A) Option A
B) Option B
C) Option C
D) Option D

2. Second question?
A) Option A
... (continue for 100+ questions)
```

**Debug Parser Output:**
Create a temporary test page or use browser console:

```javascript
// Simulate parser with your file data
import { parseQuestions } from "@/lib/testear/parser";

const testText = `... file content ...`;
const questions = parseQuestions(testText, "test.txt");
console.log(`Parsed ${questions.length} questions`);
questions.forEach((q, i) => {
  if (i < 5 || i >= questions.length - 5) {
    console.log(`Q${q.number}: ${q.prompt.substring(0, 50)}... (${q.options.length} options)`);
  }
});
```

---

### Step 3: Monitor Storage Write Operations

**Action:**
Wrap `saveBank()` with error handling and logging:

```typescript
export const storage = {
  saveBank: (bank: QuestionBank) => {
    try {
      const banks = storage.getBanks().filter((b) => b.id !== bank.id);
      banks.unshift(bank);
      const jsonStr = JSON.stringify(banks);
      const sizeKB = jsonStr.length / 1024;

      // Log size warning
      if (sizeKB > 4) {
        console.warn(`⚠️ localStorage size: ${sizeKB.toFixed(2)} KB (approaching 5MB limit)`);
      }

      write(BANKS_KEY, banks);
      console.log(`✓ Saved bank "${bank.name}" with ${bank.questions.length} questions`);
    } catch (e) {
      if ((e as Error).name === "QuotaExceededError") {
        console.error("❌ localStorage quota exceeded! Tried to save:", bank.name);
        throw new Error("Storage full. Please delete old question banks to make space.");
      }
      throw e;
    }
  },
  // ... rest of storage methods
};
```

---

### Step 4: Check File Format Consistency

**Action:**
Verify your file doesn't have:

- Mixed numbering formats (1., 1), Q1, Q1.)
- Missing option labels on some questions
- Inconsistent column structure in CSV
- Hidden characters or encoding issues

**To Debug:**

```javascript
// Check for parsing anomalies
import { extractText, parseQuestions } from '@/lib/testear/parser';

const file = /* your file */;
const text = await extractText(file);
console.log('Raw text length:', text.length);
console.log('First 500 chars:', text.substring(0, 500));

// Check line structure
const lines = text.split('\n');
console.log('Total lines:', lines.length);
console.log('First 10 lines:');
lines.slice(0, 10).forEach((l, i) => console.log(`${i}: "${l.substring(0, 60)}"`));

const qs = parseQuestions(text, 'test.csv');
console.log('Parsed questions:', qs.length);
```

---

## Recommended Solutions

### Solution 1: Add Error Handling & Logging (IMMEDIATE)

**File:** [src/lib/testear/storage.ts](src/lib/testear/storage.ts)

- ✅ Wrap `write()` operations with try/catch
- ✅ Catch `QuotaExceededError` specifically
- ✅ Log size warnings when approaching limit
- ✅ Provide user-friendly error messages

---

### Solution 2: Implement IndexedDB for Large Datasets (RECOMMENDED)

**Why:** IndexedDB supports 50+ MB per domain (browser-dependent)

**Implementation:**

```typescript
// Use IndexedDB instead of localStorage for large banks
// Libraries: idb, dexie (lightweight wrapper)
```

**Migration Path:**

- Keep localStorage for small/recent banks
- Move banks with 50+ questions to IndexedDB
- Graceful fallback if IndexedDB unavailable

---

### Solution 3: Implement Batch Processing/Compression

**Option A: Split into smaller chunks**

- Store individual questions separately
- Reference by bankId and questionId

**Option B: Compress before storing**

```typescript
import pako from "pako";
const compressed = pako.deflate(JSON.stringify(banks));
localStorage.setItem(BANKS_KEY, btoa(String.fromCharCode(...compressed)));
```

**Option C: Lazy loading**

- Store metadata (name, count) in localStorage
- Load actual questions on-demand from IndexedDB/server

---

### Solution 4: Fix Parser Filtering & Add Validation

**File:** [src/lib/testear/parser.ts](src/lib/testear/parser.ts)

- ✅ Log skipped rows in CSV parsing
- ✅ Add detailed error messages if parsing produces unexpected results
- ✅ Validate parsed questions match expected count
- ✅ Provide user feedback on filtering

---

### Solution 5: Enhance Upload UI/UX

**File:** [src/routes/\_app/upload.tsx](src/routes/_app/upload.tsx)

- ✅ Show preview of parsed questions before saving
- ✅ Display total size estimate
- ✅ Warn if bank would exceed storage limits
- ✅ Show detailed error messages (not generic "Failed to parse")

---

## Best Practices to Prevent Similar Issues

1. **Implement Proper Error Boundaries**
   - Always wrap storage operations in try/catch
   - Differentiate error types (quota, parse, validation)
   - Show specific error messages to users

2. **Size Monitoring**
   - Calculate and log storage usage regularly
   - Warn users at 70%, 85%, 95% capacity
   - Implement cleanup/archival strategies

3. **Data Persistence Strategy**
   - Use localStorage for < 100 KB
   - Use IndexedDB for 100 KB - 50 MB
   - Consider server-side storage for larger datasets
   - Implement proper sync mechanisms

4. **Testing with Real Data**
   - Test with sample files of various sizes (10, 100, 1000+ questions)
   - Test with different file formats (CSV, PDF, DOCX, etc.)
   - Test edge cases (empty columns, special characters, mixed formats)
   - Monitor storage usage during tests

5. **Transparent User Feedback**
   - Show progress during parsing
   - Display number of questions successfully parsed
   - Warn about skipped or invalid entries
   - Provide actionable error messages

6. **Logging & Monitoring**
   - Log all storage operations (read/write)
   - Track error rates and failure points
   - Monitor typical payload sizes
   - Alert on quota exceeded errors

---

## Implementation Priority

1. **URGENT:** Add error handling to storage operations
2. **HIGH:** Add logging to parser and upload flow
3. **HIGH:** Test with 100+ question files
4. **MEDIUM:** Implement IndexedDB migration
5. **LOW:** Add compression/optimization

---

## Files to Investigate/Modify

- [src/lib/testear/storage.ts](src/lib/testear/storage.ts) - Core issue
- [src/routes/\_app/upload.tsx](src/routes/_app/upload.tsx) - Error handling
- [src/lib/testear/parser.ts](src/lib/testear/parser.ts) - Parser logic
- [src/lib/error-capture.ts](src/lib/error-capture.ts) - Error logging
