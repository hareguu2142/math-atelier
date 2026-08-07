import { createSolution, updateSolution } from "@/lib/store";

function authorized(request: Request) { return !process.env.ADMIN_KEY || request.headers.get("x-admin-key") === process.env.ADMIN_KEY; }

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "편집 키가 올바르지 않습니다." }, { status: 401 });
  const { problemId, title, contentMarkdown } = await request.json();
  const result = await createSolution(problemId, title, contentMarkdown);
  return result ? Response.json(result, { status: 201 }) : Response.json({ error: "문제를 찾을 수 없습니다." }, { status: 404 });
}

export async function PATCH(request: Request) {
  if (!authorized(request)) return Response.json({ error: "편집 키가 올바르지 않습니다." }, { status: 401 });
  const { id, title, contentMarkdown } = await request.json();
  const result = await updateSolution(id, title, contentMarkdown);
  return result ? Response.json(result) : Response.json({ error: "풀이를 찾을 수 없습니다." }, { status: 404 });
}
