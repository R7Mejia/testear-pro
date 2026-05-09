-- Banks table
CREATE TABLE public.banks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_banks_user ON public.banks(user_id, created_at DESC);

ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own banks" ON public.banks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own banks" ON public.banks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own banks" ON public.banks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own banks" ON public.banks FOR DELETE USING (auth.uid() = user_id);

-- Attempts table
CREATE TABLE public.attempts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_id TEXT NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  started_at BIGINT NOT NULL,
  finished_at BIGINT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  score DOUBLE PRECISION NOT NULL DEFAULT 0,
  reached_question INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attempts_user_bank ON public.attempts(user_id, bank_id, started_at DESC);

ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own attempts" ON public.attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own attempts" ON public.attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own attempts" ON public.attempts FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER banks_updated_at BEFORE UPDATE ON public.banks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();