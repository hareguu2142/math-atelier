import { createSolution, updateSolution } from "@/lib/store";

export async function POST(request: Request) {
  const { problemId, title, contentMarkdown } = await request.json();
  const result = await createSolution(problemId, title, contentMarkdown);
  return result ? Response.json(result, { status: 201 }) : Response.json({ error: "문제를 찾을 수 없습니다." }, { status: 404 });
}

export async function PATCH(request: Request) {
  const { id, title, contentMarkdown } = await request.json();
  const result = await updateSolution(id, title, contentMarkdown);
  return result ? Response.json(result) : Response.json({ error: "풀이를 찾을 수 없습니다." }, { status: 404 });
}
