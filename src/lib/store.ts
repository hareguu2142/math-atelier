import { neon } from "@neondatabase/serverless";
import { seedProblems } from "./seed-data";
import type { Problem, ProblemInput, Solution } from "./types";

type MemoryStore = { problems: Problem[] };
const globals = globalThis as typeof globalThis & { mathAtelier?: MemoryStore; schemaReady?: Promise<void> };

function memory() {
  globals.mathAtelier ??= { problems: structuredClone(seedProblems) };
  return globals.mathAtelier;
}

function sqlClient() {
  return process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
}

async function ensureSchema() {
  const sql = sqlClient();
  if (!sql) return;
  globals.schemaReady ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS problems (
      id text PRIMARY KEY, title text NOT NULL, problem_markdown text NOT NULL,
      difficulty integer NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 5),
      tags text[] NOT NULL DEFAULT '{}', solved boolean NOT NULL DEFAULT false,
      favorite boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now())`;
    await sql`ALTER TABLE problems ADD COLUMN IF NOT EXISTS solved boolean NOT NULL DEFAULT false`;
    await sql`ALTER TABLE problems ADD COLUMN IF NOT EXISTS favorite boolean NOT NULL DEFAULT false`;
    await sql`CREATE TABLE IF NOT EXISTS solutions (
      id text PRIMARY KEY, problem_id text NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
      title text NOT NULL, content_markdown text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`;
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM problems`;
    if (Number(count) === 0) {
      for (const problem of seedProblems) {
        await sql`INSERT INTO problems (id,title,problem_markdown,difficulty,tags,created_at,updated_at)
          VALUES (${problem.id},${problem.title},${problem.problemMarkdown},${problem.difficulty},${problem.tags},${problem.createdAt},${problem.updatedAt})`;
        for (const solution of problem.solutions) {
          await sql`INSERT INTO solutions (id,problem_id,title,content_markdown,created_at,updated_at)
            VALUES (${solution.id},${problem.id},${solution.title},${solution.contentMarkdown},${solution.createdAt},${solution.updatedAt})`;
        }
      }
    }
  })();
  await globals.schemaReady;
}

function mapRows(problemRows: Record<string, unknown>[], solutionRows: Record<string, unknown>[]): Problem[] {
  return problemRows.map((row) => ({
    id: String(row.id), title: String(row.title), problemMarkdown: String(row.problem_markdown),
    difficulty: Number(row.difficulty), tags: (row.tags as string[]) ?? [], solved: Boolean(row.solved), favorite: Boolean(row.favorite),
    createdAt: new Date(String(row.created_at)).toISOString(), updatedAt: new Date(String(row.updated_at)).toISOString(),
    solutions: solutionRows.filter((s) => s.problem_id === row.id).map((s) => ({
      id: String(s.id), problemId: String(s.problem_id), title: String(s.title),
      contentMarkdown: String(s.content_markdown), createdAt: new Date(String(s.created_at)).toISOString(),
      updatedAt: new Date(String(s.updated_at)).toISOString(),
    })),
  }));
}

export async function listProblems(query = "") {
  const sql = sqlClient();
  if (!sql) {
    const q = query.toLocaleLowerCase("ko");
    return memory().problems.filter((p) => [p.title, p.problemMarkdown, ...p.tags, ...p.solutions.flatMap((s) => [s.title, s.contentMarkdown])].join(" ").toLocaleLowerCase("ko").includes(q));
  }
  await ensureSchema();
  const pattern = `%${query}%`;
  const problems = await sql`SELECT DISTINCT p.* FROM problems p LEFT JOIN solutions s ON s.problem_id=p.id
    WHERE ${query}='' OR p.title ILIKE ${pattern} OR p.problem_markdown ILIKE ${pattern}
      OR array_to_string(p.tags,' ') ILIKE ${pattern} OR s.title ILIKE ${pattern} OR s.content_markdown ILIKE ${pattern}
    ORDER BY p.updated_at DESC`;
  const ids = problems.map((p) => String(p.id));
  const solutions = ids.length ? await sql`SELECT * FROM solutions WHERE problem_id = ANY(${ids}) ORDER BY created_at` : [];
  return mapRows(problems, solutions);
}

export async function createProblem(input: ProblemInput) {
  const problem: Problem = { ...input, id: crypto.randomUUID(), solved: false, favorite: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), solutions: [] };
  const sql = sqlClient();
  if (!sql) { memory().problems.unshift(problem); return problem; }
  await ensureSchema();
  await sql`INSERT INTO problems (id,title,problem_markdown,difficulty,tags) VALUES (${problem.id},${problem.title},${problem.problemMarkdown},${problem.difficulty},${problem.tags})`;
  return problem;
}

export async function updateProblem(id: string, input: ProblemInput) {
  const sql = sqlClient();
  if (!sql) {
    const found = memory().problems.find((p) => p.id === id);
    if (!found) return null;
    Object.assign(found, input, { updatedAt: new Date().toISOString() }); return found;
  }
  await ensureSchema();
  const rows = await sql`UPDATE problems SET title=${input.title},problem_markdown=${input.problemMarkdown},difficulty=${input.difficulty},tags=${input.tags},updated_at=now() WHERE id=${id} RETURNING *`;
  return rows[0] ?? null;
}

export async function updateProblemSolved(id: string, solved: boolean) {
  const sql = sqlClient();
  if (!sql) {
    const found = memory().problems.find((problem) => problem.id === id);
    if (!found) return null;
    found.solved = solved;
    return { id: found.id, solved: found.solved };
  }
  await ensureSchema();
  const rows = await sql`UPDATE problems SET solved=${solved} WHERE id=${id} RETURNING id, solved`;
  return rows[0] ? { id: String(rows[0].id), solved: Boolean(rows[0].solved) } : null;
}

export async function updateProblemFavorite(id: string, favorite: boolean) {
  const sql = sqlClient();
  if (!sql) {
    const found = memory().problems.find((problem) => problem.id === id);
    if (!found) return null;
    found.favorite = favorite;
    return { id: found.id, favorite: found.favorite };
  }
  await ensureSchema();
  const rows = await sql`UPDATE problems SET favorite=${favorite} WHERE id=${id} RETURNING id, favorite`;
  return rows[0] ? { id: String(rows[0].id), favorite: Boolean(rows[0].favorite) } : null;
}

export async function createSolution(problemId: string, title: string, contentMarkdown: string) {
  const solution: Solution = { id: crypto.randomUUID(), problemId, title, contentMarkdown, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const sql = sqlClient();
  if (!sql) { const problem = memory().problems.find((p) => p.id === problemId); if (!problem) return null; problem.solutions.push(solution); return solution; }
  await ensureSchema();
  await sql`INSERT INTO solutions (id,problem_id,title,content_markdown) VALUES (${solution.id},${problemId},${title},${contentMarkdown})`;
  return solution;
}

export async function updateSolution(id: string, title: string, contentMarkdown: string) {
  const sql = sqlClient();
  if (!sql) {
    for (const problem of memory().problems) { const found = problem.solutions.find((s) => s.id === id); if (found) { Object.assign(found, { title, contentMarkdown, updatedAt: new Date().toISOString() }); return found; } }
    return null;
  }
  await ensureSchema();
  const rows = await sql`UPDATE solutions SET title=${title},content_markdown=${contentMarkdown},updated_at=now() WHERE id=${id} RETURNING *`;
  return rows[0] ?? null;
}
