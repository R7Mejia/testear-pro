import type { Attempt, QuestionBank } from "./types";

const BANKS_KEY = "testear.banks";
const ATTEMPTS_KEY = "testear.attempts";

// Storage limits and warnings
const STORAGE_SIZE_WARNING_KB = 4000; // 4 MB warning threshold
const STORAGE_SIZE_CRITICAL_KB = 4500; // 4.5 MB critical threshold

/**
 * Get current localStorage usage in KB for testear data
 */
function getStorageUsageKB(): number {
  if (typeof window === "undefined") return 0;
  try {
    const banks = localStorage.getItem(BANKS_KEY) || "[]";
    const attempts = localStorage.getItem(ATTEMPTS_KEY) || "[]";
    return (banks.length + attempts.length) / 1024;
  } catch {
    return 0;
  }
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch (e) {
    console.warn(`[Storage] Failed to read ${key}:`, e);
    return fallback;
  }
}

function write<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  try {
    const jsonStr = JSON.stringify(val);
    const sizeKB = jsonStr.length / 1024;

    // Warn if approaching storage limits
    if (sizeKB > STORAGE_SIZE_CRITICAL_KB) {
      console.error(
        `[Storage] CRITICAL: Item size ${sizeKB.toFixed(2)} KB exceeds critical threshold`,
      );
      throw new Error(
        "Data too large to store. Please delete some question banks to free up space.",
      );
    }

    if (sizeKB > STORAGE_SIZE_WARNING_KB) {
      console.warn(
        `[Storage] WARNING: Item size ${sizeKB.toFixed(2)} KB approaching storage limits`,
      );
    }

    localStorage.setItem(key, jsonStr);

    // Log storage usage for debugging
    const totalUsage = getStorageUsageKB();
    if (totalUsage > STORAGE_SIZE_WARNING_KB) {
      console.warn(`[Storage] Total usage: ${totalUsage.toFixed(2)} KB / ~5 MB limit`);
    }
  } catch (e) {
    if ((e as Error).name === "QuotaExceededError") {
      const error = new Error(
        "Storage quota exceeded. Please delete some question banks to make space.",
      );
      error.name = "StorageQuotaExceeded";
      console.error(`[Storage] Quota exceeded:`, e);
      throw error;
    }
    if ((e as Error).message.includes("too large to store")) {
      throw e;
    }
    console.error(`[Storage] Write failed for key ${key}:`, e);
    throw e;
  }
}

export const storage = {
  getBanks: (): QuestionBank[] => {
    const banks = read<QuestionBank[]>(BANKS_KEY, []);
    console.debug(
      `[Storage] Retrieved ${banks.length} banks (${getStorageUsageKB().toFixed(2)} KB used)`,
    );
    return banks;
  },

  saveBank: (bank: QuestionBank) => {
    try {
      console.log(`[Storage] Saving bank "${bank.name}" with ${bank.questions.length} questions`);

      const banks = storage.getBanks().filter((b) => b.id !== bank.id);
      banks.unshift(bank);

      // Validate before writing
      const bankSize = JSON.stringify(bank).length / 1024;
      console.debug(
        `[Storage] Bank size: ${bankSize.toFixed(2)} KB, Total: ${(bankSize + (banks.length - 1) * 5).toFixed(2)} KB estimated`,
      );

      write(BANKS_KEY, banks);
      console.log(`[Storage] ✓ Successfully saved bank with ID: ${bank.id}`);
    } catch (e) {
      console.error(`[Storage] Failed to save bank:`, e);
      throw e;
    }
  },

  deleteBank: (id: string) => {
    try {
      console.log(`[Storage] Deleting bank: ${id}`);
      write(
        BANKS_KEY,
        storage.getBanks().filter((b) => b.id !== id),
      );
      write(
        ATTEMPTS_KEY,
        storage.getAttempts().filter((a) => a.bankId !== id),
      );
      console.log(`[Storage] ✓ Bank deleted successfully`);
    } catch (e) {
      console.error(`[Storage] Failed to delete bank:`, e);
      throw e;
    }
  },

  getBank: (id: string) => {
    const banks = storage.getBanks();
    return banks.find((b) => b.id === id);
  },

  getAttempts: (): Attempt[] => {
    const attempts = read<Attempt[]>(ATTEMPTS_KEY, []);
    console.debug(`[Storage] Retrieved ${attempts.length} attempts`);
    return attempts;
  },

  saveAttempt: (a: Attempt) => {
    try {
      console.log(`[Storage] Saving attempt for bank: ${a.bankId}`);
      const all = storage.getAttempts();
      all.unshift(a);
      write(ATTEMPTS_KEY, all);
      console.log(`[Storage] ✓ Attempt saved with ID: ${a.id}`);
    } catch (e) {
      console.error(`[Storage] Failed to save attempt:`, e);
      throw e;
    }
  },

  attemptsForBank: (bankId: string) => {
    const attempts = storage.getAttempts().filter((a) => a.bankId === bankId);
    console.debug(`[Storage] Found ${attempts.length} attempts for bank ${bankId}`);
    return attempts;
  },

  /**
   * Get current storage usage statistics
   */
  getStorageStats: () => {
    try {
      const banks = storage.getBanks();
      const attempts = storage.getAttempts();
      const usageKB = getStorageUsageKB();

      return {
        banksCount: banks.length,
        questionsCount: banks.reduce((sum, b) => sum + b.questions.length, 0),
        attemptsCount: attempts.length,
        usageKB: Math.round(usageKB * 100) / 100,
        usagePercentage: Math.round((usageKB / 5000) * 100),
        warningLevel:
          usageKB > STORAGE_SIZE_CRITICAL_KB
            ? "critical"
            : usageKB > STORAGE_SIZE_WARNING_KB
              ? "warning"
              : "ok",
      };
    } catch {
      return null;
    }
  },
};

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
