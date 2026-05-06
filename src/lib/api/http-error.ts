export function httpError(code: string, status = 400) {
  return Response.json({ error: code }, { status });
}

