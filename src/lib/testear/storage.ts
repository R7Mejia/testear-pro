import type { Attempt, QuestionBank } from "./types";

const BANKS_KEY = "testear.banks";
const ATTEMPTS_KEY = "testear.attempts";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(val));
}

export const storage = {
  getBanks: (): QuestionBank[] => read<QuestionBank[]>(BANKS_KEY, []),
  saveBank: (bank: QuestionBank) => {
    const banks = storage.getBanks().filter((b) => b.id !== bank.id);
    banks.unshift(bank);
    write(BANKS_KEY, banks);
  },
  deleteBank: (id: string) => {
    write(BANKS_KEY, storage.getBanks().filter((b) => b.id !== id));
    write(ATTEMPTS_KEY, storage.getAttempts().filter((a) => a.bankId !== id));
  },
  getBank: (id: string) => storage.getBanks().find((b) => b.id === id),
  getAttempts: (): Attempt[] => read<Attempt[]>(ATTEMPTS_KEY, []),
  saveAttempt: (a: Attempt) => {
    const all = storage.getAttempts();
    all.unshift(a);
    write(ATTEMPTS_KEY, all);
  },
  attemptsForBank: (bankId: string) =>
    storage.getAttempts().filter((a) => a.bankId === bankId),
};

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
