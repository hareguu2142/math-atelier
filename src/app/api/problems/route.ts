import { createProblem, listProblems, updateProblem } from "@/lib/store";

export async function GET(request: Request) {
  return Response.json(await listProblems(new URL(request.url).searchParams.get("q") ?? ""));
}

export async function POST(request: Request) {
  return Response.json(await createProblem(await request.json()), { status: 201 });
}

export async function PATCH(request: Request) {
  const { id, ...input } = await request.json();
  const result = await updateProblem(id, input);
  return result ? Response.json(result) : Response.json({ error: "문제를 찾을 수 없습니다." }, { status: 404 });
}
