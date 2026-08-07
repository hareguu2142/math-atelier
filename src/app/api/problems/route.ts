import { createProblem, listProblems, updateProblem } from "@/lib/store";

function authorized(request: Request) { return !process.env.ADMIN_KEY || request.headers.get("x-admin-key") === process.env.ADMIN_KEY; }

export async function GET(request: Request) {
  return Response.json(await listProblems(new URL(request.url).searchParams.get("q") ?? ""));
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "편집 키가 올바르지 않습니다." }, { status: 401 });
  return Response.json(await createProblem(await request.json()), { status: 201 });
}

export async function PATCH(request: Request) {
  if (!authorized(request)) return Response.json({ error: "편집 키가 올바르지 않습니다." }, { status: 401 });
  const { id, ...input } = await request.json();
  const result = await updateProblem(id, input);
  return result ? Response.json(result) : Response.json({ error: "문제를 찾을 수 없습니다." }, { status: 404 });
}

