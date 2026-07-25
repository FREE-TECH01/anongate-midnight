import { submitJoin } from '../submit-join';

export async function handler(request: Request) {
  if (request.method !== 'POST') {
    return Response.json({ ok: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json();
    const secretCode = typeof body?.secretCode === 'string' ? body.secretCode : '';
    const result = await submitJoin(secretCode);
    return Response.json(result);
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
