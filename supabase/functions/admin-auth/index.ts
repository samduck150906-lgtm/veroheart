import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildCorsHeaders } from '../_shared/cors.ts';

// Retired endpoint: keep a tombstone so existing deployments fail closed.
// All signup/confirmation must use Supabase Auth's verified email flow.
serve((req) => new Response(req.method === 'OPTIONS' ? 'ok' : JSON.stringify({
  error: 'This endpoint has been retired. Use the standard authentication flow.',
}), {
  status: req.method === 'OPTIONS' ? 200 : 410,
  headers: { ...buildCorsHeaders(req), 'Content-Type': 'application/json' },
}));
