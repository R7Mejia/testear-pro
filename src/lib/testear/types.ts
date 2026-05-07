export interface Question {
  id: string;
  number: number;
  prompt: string;
  options: string[]; // may be empty if free-form / open
  correctIndex?: number; // index into options
  correctText?: string; // for free-text answers
  topic?: string;
}

export interface QuestionBank {
  id: string;
  name: string;
  createdAt: number;
  questions: Question[];
}

export type Mode = "easy" | "goat";

export interface AttemptAnswer {
  questionId: string;
  chosenIndex: number | null;
  correct: boolean;
}

export interface Attempt {
  id: string;
  bankId: string;
  mode: Mode;
  startedAt: number;
  finishedAt: number;
  completed: boolean; // reached the end
  answers: AttemptAnswer[];
  score: number; // 0..1
  reachedQuestion: number; // index reached (for GOAT)
}
