// Cloudflare Access handles login. Verify its signed assertion on every
// request, including requests for PDFs, images, and the search index.
function decode(value) {
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')),
    character => character.charCodeAt(0));
}

function json(value) {
  return JSON.parse(new TextDecoder().decode(decode(value)));
}

async function authorized(request, env) {
  const { ACCESS_TEAM, ACCESS_AUD, ACCESS_EMAIL } = env;
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || !ACCESS_AUD || !ACCESS_EMAIL || !/^[a-z0-9-]+$/.test(ACCESS_TEAM ?? '')) {
    return false;
  }

  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [header, payload, signature] = parts;
  const { alg, kid } = json(header);
  if (alg !== 'RS256' || typeof kid !== 'string') return false;

  const issuer = `https://${ACCESS_TEAM}.cloudflareaccess.com`;
  const claims = json(payload);
  const now = Date.now() / 1000;
  if (claims.iss !== issuer ||
      !Array.isArray(claims.aud) || !claims.aud.includes(ACCESS_AUD) ||
      typeof claims.email !== 'string' || claims.email.toLowerCase() !== ACCESS_EMAIL.toLowerCase() ||
      !Number.isFinite(claims.exp) || now >= claims.exp ||
      (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || now < claims.nbf))) {
    return false;
  }

  const response = await fetch(`${issuer}/cdn-cgi/access/certs`, {
    cf: { cacheEverything: true, cacheTtl: 300 },
  });
  if (!response.ok) return false;
  const { keys } = await response.json();
  const jwk = keys.find(key => key.kid === kid && key.kty === 'RSA');
  if (!jwk) return false;
  const algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
  const key = await crypto.subtle.importKey('jwk', jwk, algorithm, false, ['verify']);
  return crypto.subtle.verify(algorithm.name, key, decode(signature),
    new TextEncoder().encode(`${header}.${payload}`));
}

export default {
  async fetch(request, env) {
    const headers = { 'Cache-Control': 'private, no-store' };
    if (!await authorized(request, env).catch(() => false)) {
      return new Response('Access denied', { status: 403, headers });
    }
    const asset = await env.ASSETS.fetch(request);
    const response = new Response(asset.body, asset);
    response.headers.set('Cache-Control', headers['Cache-Control']);
    return response;
  },
};
