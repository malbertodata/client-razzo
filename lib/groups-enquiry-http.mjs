import './load-env.mjs';

async function readRequestBody(req, { maxBytes = 32_768 } = {}) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      throw new Error('body_too_large');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Handle POST /api/groups-enquiry. Returns true if the request was handled.
 */
export async function dispatchGroupsEnquiryApi(req, res) {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  if (url.pathname !== '/api/groups-enquiry') return false;

  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
    return true;
  }

  try {
    const bodyText = await readRequestBody(req);
    const { handleGroupsEnquiryPost } = await import('../src/lib/groups-enquiry-server.ts');
    const result = await handleGroupsEnquiryPost(bodyText);
    res.writeHead(result.status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(result.json));
  } catch (err) {
    if (err instanceof Error && err.message === 'body_too_large') {
      res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'payload_too_large' }));
      return true;
    }
    console.error('groups-enquiry api error', err?.message ?? err);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'internal' }));
  }

  return true;
}
