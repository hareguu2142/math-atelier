CREATE TABLE IF NOT EXISTS problems (
  id text PRIMARY KEY,
  title text NOT NULL,
  problem_markdown text NOT NULL,
  difficulty integer NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 5),
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS solutions (
  id text PRIMARY KEY,
  problem_id text NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_markdown text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS solutions_problem_id_idx ON solutions(problem_id);

