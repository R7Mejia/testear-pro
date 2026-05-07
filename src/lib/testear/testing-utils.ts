/**
 * Testing utilities to diagnose upload issues
 * Use in browser console to debug the upload process
 */

import { parseQuestions, extractText } from "./parser";
import { storage } from "./storage";
import type { Question, QuestionBank } from "./types";

/**
 * Analyze current storage usage and provide recommendations
 */
export function analyzeStorage() {
  const stats = storage.getStorageStats();

  if (!stats) {
    console.log("❌ Could not retrieve storage stats");
    return;
  }

  console.group("📊 Storage Analysis");
  console.log(`Total Banks: ${stats.banksCount}`);
  console.log(`Total Questions: ${stats.questionsCount}`);
  console.log(`Total Attempts: ${stats.attemptsCount}`);
  console.log(`Usage: ${stats.usageKB} KB / ~5000 KB (${stats.usagePercentage}%)`);
  console.log(`Status: ${stats.warningLevel.toUpperCase()}`);

  if (stats.warningLevel === "critical") {
    console.warn("⚠️ CRITICAL: You are approaching storage limits. Delete old banks.");
  } else if (stats.warningLevel === "warning") {
    console.warn("⚠️ WARNING: Storage usage is getting high. Consider archiving old banks.");
  }

  const banks = storage.getBanks();
  console.log("\n📚 Bank Breakdown:");
  banks.forEach((b, i) => {
    const size = (JSON.stringify(b).length / 1024).toFixed(2);
    console.log(`${i + 1}. "${b.name}": ${b.questions.length} Q's (${size} KB)`);
  });

  console.groupEnd();
}

/**
 * Test parser with sample data
 */
export function testParser() {
  console.group("🧪 Parser Tests");

  // Test 1: CSV Format
  console.log("\n1️⃣ Testing CSV format:");
  const csvData = `question,optionA,optionB,optionC,optionD,answer
What is 2+2?,3,4,5,6,B
What is 3+3?,5,6,7,8,B
What is 1+1?,1,2,3,4,B`;

  const csvQuestions = parseQuestions(csvData, "test.csv");
  console.log(`   Parsed ${csvQuestions.length} questions from CSV`);
  csvQuestions.forEach((q) => {
    console.log(`   Q${q.number}: "${q.prompt}" (${q.options.length} options)`);
  });

  // Test 2: Numbered text format
  console.log("\n2️⃣ Testing numbered text format:");
  const textData = `1. What is the capital of France?
A) London
B) Paris
C) Berlin
D) Madrid

2. What is 2+2?
A) 3
B) 4
C) 5
D) 6`;

  const textQuestions = parseQuestions(textData, "test.txt");
  console.log(`   Parsed ${textQuestions.length} questions from text`);
  textQuestions.forEach((q) => {
    console.log(`   Q${q.number}: "${q.prompt}" (${q.options.length} options)`);
  });

  console.groupEnd();
}

/**
 * Simulate uploading a large batch of questions to test storage limits
 */
export function testLargeUpload(questionCount: number = 100) {
  console.group(`📤 Testing Large Upload (${questionCount} questions)`);

  try {
    // Generate test questions
    const questions: Question[] = Array.from({ length: questionCount }, (_, i) => ({
      id: `test-q-${i}`,
      number: i + 1,
      prompt: `Test question ${i + 1}: What is the answer to this question about testing?`,
      options: [
        `Option A for question ${i + 1}`,
        `Option B for question ${i + 1}`,
        `Option C for question ${i + 1}`,
        `Option D for question ${i + 1}`,
      ],
      correctIndex: Math.floor(Math.random() * 4),
    }));

    const testBank: QuestionBank = {
      id: `test-bank-${Date.now()}`,
      name: `Test Bank - ${questionCount}Q`,
      createdAt: Date.now(),
      questions,
    };

    console.log(`Generated test bank with ${questions.length} questions`);
    console.log(`Test bank size: ${(JSON.stringify(testBank).length / 1024).toFixed(2)} KB`);

    // Check storage before saving
    let statsBefore = storage.getStorageStats();
    console.log(
      `\nStorage BEFORE save: ${statsBefore?.usageKB} KB (${statsBefore?.usagePercentage}%)`,
    );

    // Try to save
    storage.saveBank(testBank);

    let statsAfter = storage.getStorageStats();
    console.log(`Storage AFTER save: ${statsAfter?.usageKB} KB (${statsAfter?.usagePercentage}%)`);
    console.log(
      `✓ Successfully saved test bank. Storage increased by ${((statsAfter?.usageKB ?? 0) - (statsBefore?.usageKB ?? 0)).toFixed(2)} KB`,
    );

    // Verify retrieval
    const retrieved = storage.getBank(testBank.id);
    if (retrieved && retrieved.questions.length === questionCount) {
      console.log(`✓ Retrieved bank verified: ${retrieved.questions.length} questions`);
    } else {
      console.error(
        `❌ Retrieval mismatch! Expected ${questionCount}, got ${retrieved?.questions.length ?? 0}`,
      );
    }
  } catch (e) {
    console.error(`❌ Error during test:`, e);
  }

  console.groupEnd();
}

/**
 * Generate a sample CSV file content for testing
 */
export function generateSampleCSV(questionCount: number = 50): string {
  const rows = ["question,optionA,optionB,optionC,optionD,answer"];

  for (let i = 1; i <= questionCount; i++) {
    rows.push(
      `"Question ${i}: What is the answer to question number ${i}?","Answer A for Q${i}","Answer B for Q${i}","Answer C for Q${i}","Answer D for Q${i}","B"`,
    );
  }

  return rows.join("\n");
}

/**
 * Debug a specific file upload (use with file input)
 * Usage: const file = document.querySelector('input[type=file]').files[0];
 *        await debugFileUpload(file);
 */
export async function debugFileUpload(file: File) {
  console.group(`🔍 Debugging File Upload: ${file.name}`);

  try {
    console.log(`📄 File: ${file.name}`);
    console.log(`📦 Size: ${(file.size / 1024).toFixed(2)} KB`);
    console.log(`🕐 Type: ${file.type}`);

    console.log("\n1️⃣ Extracting text...");
    const text = await extractText(file);
    console.log(`   ✓ Extracted ${text.length} characters`);
    console.log(`   First 200 chars: "${text.substring(0, 200)}..."`);
    console.log(`   Lines: ${text.split("\n").length}`);

    console.log("\n2️⃣ Parsing questions...");
    const questions = parseQuestions(text, file.name);
    console.log(`   ✓ Parsed ${questions.length} questions`);

    if (questions.length === 0) {
      console.error("   ❌ No questions found! Check file format and structure.");
    } else {
      console.log(`   First 3 questions:`);
      questions.slice(0, 3).forEach((q, i) => {
        console.log(
          `     ${i + 1}. "${q.prompt.substring(0, 60)}..." (${q.options.length} options)`,
        );
      });

      if (questions.length > 3) {
        console.log(`     ...`);
        const last = questions[questions.length - 1];
        console.log(
          `     ${questions.length}. "${last.prompt.substring(0, 60)}..." (${last.options.length} options)`,
        );
      }
    }

    console.log("\n3️⃣ Storage check...");
    const stats = storage.getStorageStats();
    console.log(`   Current usage: ${stats?.usageKB} KB / ~5000 KB (${stats?.usagePercentage}%)`);

    const bankSize = (
      JSON.stringify({
        id: "test",
        name: file.name,
        createdAt: Date.now(),
        questions,
      }).length / 1024
    ).toFixed(2);
    console.log(`   This bank would be: ${bankSize} KB`);

    if ((stats?.usageKB ?? 0) + parseFloat(bankSize) > 4500) {
      console.warn(`   ⚠️ WARNING: Uploading this file would exceed storage limits!`);
    }

    console.log(`\n✓ Debug complete. Ready to upload.`);
  } catch (e) {
    console.error(`❌ Error during debug:`, e);
  }

  console.groupEnd();
}

/**
 * Export storage data for backup
 */
export function exportStorageData() {
  const data = {
    banks: storage.getBanks(),
    attempts: storage.getAttempts(),
    stats: storage.getStorageStats(),
    exportedAt: new Date().toISOString(),
  };

  const json = JSON.stringify(data, null, 2);
  console.log("📤 Storage Export:");
  console.log(json);

  // Also provide download link
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  console.log(`\n💾 Download link: ${url}`);
  console.log(`Copy the link above to download your data backup.`);

  return data;
}

/**
 * Clear all storage (use with caution!)
 */
export function clearAllStorage() {
  if (
    typeof window !== "undefined" &&
    confirm("⚠️ Are you sure you want to delete ALL question banks and attempts?")
  ) {
    localStorage.removeItem("testear.banks");
    localStorage.removeItem("testear.attempts");
    console.log("✓ All storage cleared");
  }
}

/**
 * Log comprehensive diagnostics
 */
export function runDiagnostics() {
  console.group("🔧 Comprehensive Diagnostics");

  console.log("\n1️⃣ Storage Analysis:");
  analyzeStorage();

  console.log("\n2️⃣ Parser Tests:");
  testParser();

  console.log("\n3️⃣ Browser Info:");
  console.log(`User Agent: ${navigator.userAgent}`);
  console.log(`Local Storage Available: ${typeof localStorage !== "undefined"}`);
  console.log(`IndexedDB Available: ${typeof indexedDB !== "undefined"}`);

  console.log("\n✓ Diagnostics complete");
  console.groupEnd();
}

// Make functions available globally for console debugging
if (typeof window !== "undefined") {
  (window as any).testearDebug = {
    analyzeStorage,
    testParser,
    testLargeUpload,
    generateSampleCSV,
    debugFileUpload,
    exportStorageData,
    clearAllStorage,
    runDiagnostics,
  };

  console.log(
    "ℹ️ Testear debugging tools available: testearDebug.runDiagnostics(), testearDebug.analyzeStorage(), etc.",
  );
}
