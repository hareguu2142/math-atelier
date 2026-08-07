import { createProblem, listProblems, updateProblem, updateProblemFavorite, updateProblemSolved } from "@/lib/store";

export async function GET(request: Request) {
  return Response.json(await listProblems(new URL(request.url).searchParams.get("q") ?? ""));
}

export async function POST(request: Request) {
  return Response.json(await createProblem(await request.json()), { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, ...input } = body;
  if ("solved" in body) {
    if (typeof id !== "string" || typeof body.solved !== "boolean") {
      return Response.json({ error: "올바른 해결 상태가 필요합니다." }, { status: 400 });
    }
    const result = await updateProblemSolved(id, body.solved);
    return result ? Response.json(result) : Response.json({ error: "문제를 찾을 수 없습니다." }, { status: 404 });
  }
  if ("favorite" in body) {
    if (typeof id !== "string" || typeof body.favorite !== "boolean") {
      return Response.json({ error: "올바른 즐겨찾기 상태가 필요합니다." }, { status: 400 });
    }
    const result = await updateProblemFavorite(id, body.favorite);
    return result ? Response.json(result) : Response.json({ error: "문제를 찾을 수 없습니다." }, { status: 404 });
  }
  const result = await updateProblem(id, input);
  return result ? Response.json(result) : Response.json({ error: "문제를 찾을 수 없습니다." }, { status: 404 });
}
