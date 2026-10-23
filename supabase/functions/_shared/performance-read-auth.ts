import { jwtVerify } from 'npm:jose@5.2.0';

/** Satellite JWT fallback only for Performance's read of session timeseries.
 * All other Open Wearables actions still require a Supabase user session.
 * The caller must also hold an active Performance application token.
 */
export async function performanceReadActor(req: Request, action: unknown, db: any): Promise<string | null> {
  if (action !== 'get-session-timeseries') return null;
  const plannerToken = req.headers.get('X-Planner-Token');
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const secret = Deno.env.get('JWT_SECRET');
  if (!plannerToken || !jwt || !secret) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plannerToken));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  const { data, error } = await db.from('external_planner_tokens').select('id').eq('token_hash', hash).eq('planner_type', 'performance').eq('is_active', true).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  try {
    const { payload } = await jwtVerify(jwt, new TextEncoder().encode(secret), { algorithms: ['HS256'], requiredClaims: ['exp', 'iat'] });
    const id = typeof payload.user_id === 'string' ? payload.user_id : payload.sub;
    return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
  } catch { return null; }
}
