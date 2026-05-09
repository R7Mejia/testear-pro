import { supabase } from "@/integrations/supabase/client";
import type { Attempt, QuestionBank, Question, AttemptAnswer, Mode } from "./types";

function rowToBank(r: any): QuestionBank {
  return {
    id: r.id,
    name: r.name,
    createdAt: new Date(r.created_at).getTime(),
    questions: (r.questions ?? []) as Question[],
  };
}

function rowToAttempt(r: any): Attempt {
  return {
    id: r.id,
    bankId: r.bank_id,
    mode: r.mode as Mode,
    startedAt: Number(r.started_at),
    finishedAt: Number(r.finished_at),
    completed: r.completed,
    answers: (r.answers ?? []) as AttemptAnswer[],
    score: Number(r.score),
    reachedQuestion: r.reached_question,
  };
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export const storage = {
  async getBanks(): Promise<QuestionBank[]> {
    const { data, error } = await supabase
      .from("banks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToBank);
  },

  async getBank(id: string): Promise<QuestionBank | undefined> {
    const { data, error } = await supabase.from("banks").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? rowToBank(data) : undefined;
  },

  async saveBank(bank: QuestionBank): Promise<void> {
    const userId = await currentUserId();
    const { error } = await supabase.from("banks").upsert({
      id: bank.id,
      user_id: userId,
      name: bank.name,
      questions: bank.questions as any,
      created_at: new Date(bank.createdAt).toISOString(),
    });
    if (error) throw error;
  },

  async deleteBank(id: string): Promise<void> {
    const { error } = await supabase.from("banks").delete().eq("id", id);
    if (error) throw error;
  },

  async getAttempts(): Promise<Attempt[]> {
    const { data, error } = await supabase
      .from("attempts")
      .select("*")
      .order("started_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToAttempt);
  },

  async attemptsForBank(bankId: string): Promise<Attempt[]> {
    const { data, error } = await supabase
      .from("attempts")
      .select("*")
      .eq("bank_id", bankId)
      .order("started_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(rowToAttempt);
  },

  async saveAttempt(a: Attempt): Promise<void> {
    const userId = await currentUserId();
    const { error } = await supabase.from("attempts").insert({
      id: a.id,
      user_id: userId,
      bank_id: a.bankId,
      mode: a.mode,
      started_at: a.startedAt,
      finished_at: a.finishedAt,
      completed: a.completed,
      answers: a.answers as any,
      score: a.score,
      reached_question: a.reachedQuestion,
    });
    if (error) throw error;
  },
};

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
